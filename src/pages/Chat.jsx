import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../firebase";
import PageContainer from "../components/PageContainer";
import useUtente from "../hooks/useUtente";
import { ROOMMATES, percorsoDettaglio } from "../utils/helpers";

const COLORI = ["#1f7a8c", "#7b4fa3", "#2d7d46", "#b0356a", "#3a5fb0", "#a0701a"];

const coloreNome = (uid = "") => {
  let h = 0;
  for (let i = 0; i < uid.length; i += 1) h = (h * 31 + uid.charCodeAt(i)) >>> 0;
  return COLORI[h % COLORI.length];
};

const ora = (d) =>
  d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

function etichettaGiorno(d) {
  const oggi = new Date();
  const ieri = new Date();
  ieri.setDate(oggi.getDate() - 1);
  if (d.toDateString() === oggi.toDateString()) return "Oggi";
  if (d.toDateString() === ieri.toDateString()) return "Ieri";
  return d.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function Chat() {
  const navigate = useNavigate();
  const { profilo, isAdmin } = useUtente();
  const uid = auth.currentUser.uid;

  const [messaggi, setMessaggi] = useState([]);
  const [impostazioni, setImpostazioni] = useState({});
  const [testo, setTesto] = useState("");
  const [inviando, setInviando] = useState(false);
  const [errore, setErrore] = useState("");

  const listaRef = useRef(null);
  const staInFondo = useRef(true);

  useEffect(() => {
    const q = query(
      collection(db, "chatMessages"),
      orderBy("createdAt", "desc"),
      limit(150)
    );

    return onSnapshot(
      q,
      (snap) => {
        setMessaggi(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }))
            .reverse()
        );
        setErrore("");
      },
      (error) => {
        console.error(error);
        setErrore("Impossibile caricare la chat.");
      }
    );
  }, []);

  useEffect(() => {
    return onSnapshot(
      doc(db, "settings", "community"),
      (snap) => setImpostazioni(snap.exists() ? snap.data() : {}),
      () => setImpostazioni({})
    );
  }, []);

  useEffect(() => {
    const el = listaRef.current;
    if (el && staInFondo.current) el.scrollTop = el.scrollHeight;
  }, [messaggi]);

  const onScroll = () => {
    const el = listaRef.current;
    staInFondo.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const chatChiusa = impostazioni.chatEnabled === false && !isAdmin;
  const soloAdmin = impostazioni.chatWriteMode === "admin" && !isAdmin;
  const silenziato = Boolean(profilo?.chatMuted);
  const puoScrivere = !chatChiusa && !soloAdmin && !silenziato;

  const nomeMio = profilo
    ? `${profilo.firstName || ""} ${(profilo.lastName || "").charAt(0)}`.trim() +
      (profilo.lastName ? "." : "")
    : "Utente";

  const invia = async (e) => {
    e?.preventDefault();
    const t = testo.trim();
    if (!t || inviando) return;

    setInviando(true);
    setErrore("");
    staInFondo.current = true;

    try {
      await addDoc(collection(db, "chatMessages"), {
        type: "user",
        text: t,
        senderId: uid,
        senderName: nomeMio || "Utente",
        senderRole: profilo?.role || "user",
        createdAt: serverTimestamp(),
      });
      setTesto("");
    } catch (error) {
      console.error(error);
      setErrore("Messaggio non inviato.");
    } finally {
      setInviando(false);
    }
  };

  const elimina = async (id) => {
    if (!window.confirm("Eliminare questo messaggio?")) return;
    try {
      await deleteDoc(doc(db, "chatMessages", id));
    } catch (error) {
      console.error(error);
      setErrore("Impossibile eliminare il messaggio.");
    }
  };

  let ultimoGiorno = "";

  return (
    <PageContainer>
      <section className="chat">
        <header className="chat__testa">
          <span aria-hidden="true">💬</span>
          <h1>Chat community</h1>
        </header>

        {impostazioni.avviso && (
          <p className="chat__avviso">📌 {impostazioni.avviso}</p>
        )}

        <div className="chat__lista" ref={listaRef} onScroll={onScroll}>
          {errore && <p className="alert alert--errore">{errore}</p>}

          {messaggi.length === 0 && !errore && (
            <p className="chat__vuota">Nessun messaggio. Scrivi tu per primo!</p>
          )}

          {messaggi.map((m) => {
            const data = m.createdAt?.toDate ? m.createdAt.toDate() : new Date();
            const giorno = data.toDateString();
            const separatore =
              giorno !== ultimoGiorno ? (
                <div className="chat__giorno" key={`g-${m.id}`}>
                  {etichettaGiorno(data)}
                </div>
              ) : null;
            ultimoGiorno = giorno;

            const puoEliminare = isAdmin || m.senderId === uid;

            if (m.type === "listing") {
              return (
                <div className="chat__riga-annuncio" key={m.id}>
                  {separatore}
                  <button
                    type="button"
                    className="chat__annuncio"
                    onClick={() => navigate(percorsoDettaglio(m.listingType, m.listingId))}
                  >
                    <span className="chat__annuncio-tag">
                      {m.listingType === ROOMMATES ? "👥" : "🏠"}{" "}
                      {m.event === "reactivated" ? "Di nuovo disponibile" : "Nuovo annuncio"}
                    </span>
                    <span className="chat__annuncio-testo">{m.text}</span>
                    <time>{ora(data)}</time>
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      className="chat__elimina"
                      onClick={() => elimina(m.id)}
                      aria-label="Elimina messaggio"
                    >
                      🗑
                    </button>
                  )}
                </div>
              );
            }

            const mio = m.senderId === uid;

            return (
              <div className={"chat__riga" + (mio ? " chat__riga--mia" : "")} key={m.id}>
                {separatore}
                <div className={"msg" + (mio ? " msg--mio" : "")}>
                  {!mio && (
                    <span className="msg__nome" style={{ color: coloreNome(m.senderId) }}>
                      {m.senderName || "Utente"}
                      {m.senderRole === "admin" && <span className="msg__admin">Admin</span>}
                    </span>
                  )}
                  <span className="msg__testo">{m.text}</span>
                  <span className="msg__ora">
                    {ora(data)}
                    {puoEliminare && (
                      <button
                        type="button"
                        className="chat__elimina chat__elimina--inline"
                        onClick={() => elimina(m.id)}
                        aria-label="Elimina messaggio"
                      >
                        🗑
                      </button>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {puoScrivere ? (
          <form className="chat__input" onSubmit={invia}>
            <textarea
              rows={1}
              value={testo}
              maxLength={1000}
              placeholder="Scrivi un messaggio"
              onChange={(e) => setTesto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  invia();
                }
              }}
            />
            <button
              type="submit"
              className="chat__invia"
              disabled={!testo.trim() || inviando}
              aria-label="Invia"
            >
              ➤
            </button>
          </form>
        ) : (
          <p className="chat__nota">
            {silenziato
              ? "🔇 Sei stato silenziato dagli amministratori."
              : chatChiusa
              ? "🔒 La chat è temporaneamente chiusa."
              : "🔒 In questa chat possono scrivere solo gli amministratori."}
          </p>
        )}
      </section>
    </PageContainer>
  );
}

export default Chat;