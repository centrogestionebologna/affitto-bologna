import { useEffect, useRef, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

import { db } from "../firebase";

const VOCI = [
  { icona: "💬", label: "Chat" },
  { icona: "🏠", label: "Casa" },
  { icona: "👥", label: "Coinquilini" },
  { icona: "📋", label: "I miei annunci" },
  { icona: "🔔", label: "Notifiche" },
  { icona: "👤", label: "Profilo" },
];

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

// Messaggi di esempio, usati solo se la chat reale non è leggibile o è vuota
const ADESSO = new Date();
const DEMO = [
  {
    id: "demo-1",
    type: "user",
    text: "Ciao a tutti! C'è ancora la stanza in zona Bolognina?",
    senderName: "Giulia R.",
    senderId: "demo-1",
    data: ADESSO,
  },
  {
    id: "demo-2",
    type: "listing",
    event: "new",
    listingType: "properties",
    text: "Camera singola • € 450/mese • Città Universitaria",
    data: ADESSO,
  },
  {
    id: "demo-3",
    type: "user",
    text: "Sì, è libera da novembre. Ti scrivo in privato!",
    senderName: "Marco T.",
    senderId: "demo-2",
    data: ADESSO,
  },
  {
    id: "demo-4",
    type: "listing",
    event: "reactivated",
    listingType: "roommateAds",
    text: "Cerco posto letto • budget € 400 • Murri",
    data: ADESSO,
  },
];

function leggiMessaggio(documento) {
  const x = documento.data({ serverTimestamps: "estimate" });
  return {
    id: documento.id,
    type: x.type || "user",
    text: x.text || "",
    senderName: x.senderName || "Utente",
    senderId: x.senderId || "",
    senderRole: x.senderRole || "user",
    event: x.event || "new",
    listingType: x.listingType || "properties",
    data: x.createdAt?.toDate ? x.createdAt.toDate() : new Date(),
  };
}

function MenuOspite({ onSblocca }) {
  const [aperto, setAperto] = useState(false);
  const contenitoreRef = useRef(null);

  useEffect(() => {
    if (!aperto) return undefined;

    const chiudiFuori = (event) => {
      if (
        contenitoreRef.current &&
        !contenitoreRef.current.contains(event.target)
      ) {
        setAperto(false);
      }
    };

    const chiudiConEsc = (event) => {
      if (event.key === "Escape") setAperto(false);
    };

    document.addEventListener("pointerdown", chiudiFuori);
    document.addEventListener("keydown", chiudiConEsc);

    return () => {
      document.removeEventListener("pointerdown", chiudiFuori);
      document.removeEventListener("keydown", chiudiConEsc);
    };
  }, [aperto]);

  return (
    <div
      ref={contenitoreRef}
      className="menu-navigazione menu-navigazione--ospite"
    >
      {aperto && (
        <div
          className="menu-navigazione__pannello"
          role="menu"
          aria-label="Menu: accesso richiesto"
        >
          {VOCI.map((voce) => (
            <button
              type="button"
              key={voce.label}
              role="menuitem"
              className="menu-navigazione__voce menu-navigazione__voce--ospite"
              onClick={() => {
                setAperto(false);
                onSblocca();
              }}
            >
              <span className="menu-navigazione__icona" aria-hidden="true">
                {voce.icona}
              </span>

              <span className="menu-navigazione__etichetta">{voce.label}</span>

              <span className="pillola-blocco">🔒 accedi per sbloccare</span>
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        className={`menu-navigazione__bottone${aperto ? " is-aperto" : ""}`}
        onClick={() => setAperto((valore) => !valore)}
        aria-label={aperto ? "Chiudi menu" : "Apri menu"}
        aria-expanded={aperto}
      >
        <span className="menu-navigazione__barre" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>
    </div>
  );
}

function AnteprimaChat({ onAccedi, caricamento = false, errore = "" }) {
  const [messaggi, setMessaggi] = useState(null);
  const [fissati, setFissati] = useState([]);
  const [logoOk, setLogoOk] = useState(true);
  const [pulsa, setPulsa] = useState(false);

  const listaRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const annullaMessaggi = onSnapshot(
      query(
        collection(db, "chatMessages"),
        orderBy("createdAt", "desc"),
        limit(30)
      ),
      (snap) => setMessaggi(snap.docs.map(leggiMessaggio).reverse()),
      (error) => {
        console.error("Anteprima chat non disponibile:", error);
        setMessaggi([]);
      }
    );

    const annullaFissati = onSnapshot(
      query(
        collection(db, "chatPins"),
        orderBy("pinnedAt", "desc"),
        limit(5)
      ),
      (snap) =>
        setFissati(
          snap.docs.map((d) => ({
            id: d.id,
            senderName: d.data().senderName || "Utente",
            text: d.data().text || "Messaggio fissato",
          }))
        ),
      (error) => console.error("Messaggi fissati non disponibili:", error)
    );

    return () => {
      annullaMessaggi();
      annullaFissati();
    };
  }, []);

  useEffect(() => {
    const el = listaRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messaggi]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const evidenzia = () => {
    setPulsa(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setPulsa(false), 1000);
  };

  const lista = messaggi && messaggi.length > 0 ? messaggi : DEMO;
  let ultimoGiorno = "";

  return (
    <div className="anteprima">
      <header className="topbar">
        <span className="brand">Affitto Bologna</span>
      </header>

      <div className="anteprima__chat">
        <div className="anteprima__contenuto" aria-hidden="true">
          {fissati.length > 0 && (
            <div className="chat-pin">
              <div className="chat-pin__contenuto">
                <span className="chat-pin__icona">📌</span>
                <span className="chat-pin__testi">
                  <strong className="chat-pin__autore">
                    {fissati[0].senderName}
                  </strong>
                  <span className="chat-pin__anteprima">{fissati[0].text}</span>
                </span>
              </div>
            </div>
          )}

          <div className="chat__lista" ref={listaRef}>
            {lista.map((m) => {
              const giorno = m.data.toDateString();
              const separatore =
                giorno !== ultimoGiorno ? (
                  <div className="chat__giorno" key={`g-${m.id}`}>
                    {etichettaGiorno(m.data)}
                  </div>
                ) : null;
              ultimoGiorno = giorno;

              if (m.type === "listing") {
                return (
                  <div className="chat__riga-annuncio" key={m.id}>
                    {separatore}
                    <div className="chat__annuncio">
                      <span className="chat__annuncio-tag">
                        {m.listingType === "roommateAds" ? "👥" : "🏠"}{" "}
                        {m.event === "reactivated"
                          ? "Di nuovo disponibile"
                          : "Nuovo annuncio"}
                      </span>
                      <span className="chat__annuncio-testo">{m.text}</span>
                      <time>{ora(m.data)}</time>
                    </div>
                  </div>
                );
              }

              return (
                <div className="chat__riga" key={m.id}>
                  {separatore}
                  <div className="msg">
                    <span
                      className="msg__nome"
                      style={{ color: coloreNome(m.senderId) }}
                    >
                      {m.senderName}
                      {m.senderRole === "admin" && (
                        <span className="msg__admin">Admin</span>
                      )}
                    </span>
                    <span className="msg__testo">{m.text}</span>
                    <span className="msg__ora">{ora(m.data)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="anteprima__velo" />

        <section className="gruppo-sheet" aria-label="Accesso alla community">
          <div className="gruppo-sheet__logo">
            {logoOk ? (
              <img
                src="/logo.png"
                alt="Affitto Bologna"
                onError={() => setLogoOk(false)}
              />
            ) : (
              <span aria-hidden="true">🏠</span>
            )}
          </div>

          <h2 className="gruppo-sheet__titolo">AFFITTO BOLOGNA</h2>
          <p className="gruppo-sheet__sotto">
            Community di studenti e lavoratori · Bologna
          </p>
          <p className="gruppo-sheet__info">
            Accedi per leggere tutta la chat, cercare casa e coinquilini e
            pubblicare i tuoi annunci.
          </p>

          {errore && (
            <p className="gruppo-sheet__errore" role="alert">
              {errore}
            </p>
          )}

          <button
            type="button"
            className={
              "gruppo-sheet__bottone" +
              (pulsa ? " gruppo-sheet__bottone--pulsa" : "")
            }
            onClick={onAccedi}
            disabled={caricamento}
          >
            {caricamento ? "Accesso in corso..." : "Accedi con Google"}
          </button>
        </section>
      </div>

      <div className="chat__input anteprima__bar">
        <button
          type="button"
          className="anteprima__finto"
          onClick={evidenzia}
        >
          <span aria-hidden="true">🔒</span>
          <span>Accedi per scrivere</span>
        </button>

        <button
          type="button"
          className="chat__invia"
          disabled
          aria-label="Invia: accesso richiesto"
        >
          ➤
        </button>

        <MenuOspite onSblocca={evidenzia} />
      </div>
    </div>
  );
}

export default AnteprimaChat;