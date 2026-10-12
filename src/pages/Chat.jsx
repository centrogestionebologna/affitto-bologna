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
  setDoc,
} from "firebase/firestore";

import { auth, db } from "../firebase";
import useUtente from "../hooks/useUtente";
import { ROOMMATES, percorsoDettaglio } from "../utils/helpers";
import { MenuNavigazione } from "../components/Navbar";

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
  const [messaggiFissati, setMessaggiFissati] = useState([]);
const [indiceFissato, setIndiceFissato] = useState(0);
const [menuMessaggio, setMenuMessaggio] = useState("");
  const [impostazioni, setImpostazioni] = useState({});
  const [testo, setTesto] = useState("");
  const [inviando, setInviando] = useState(false);
  const [errore, setErrore] = useState("");
  const [tastiera, setTastiera] = useState(false);

  const listaRef = useRef(null);
  const messaggiRef = useRef({});
  const staInFondo = useRef(true);
  const inputFocus = useRef(false);
  const baseline = useRef(window.innerHeight);
  const aggiornaRef = useRef(null);

  // Blocca lo scroll della pagina e segue l'area visibile (tastiera)
  useEffect(() => {
    const root = document.documentElement;
    const vv = window.visualViewport;
    root.classList.add("chat-attiva");

    const aggiorna = () => {
      const h = vv ? vv.height : window.innerHeight;
      const t = vv ? vv.offsetTop : 0;
      if (!inputFocus.current) baseline.current = Math.max(h, window.innerHeight);
      root.style.setProperty("--vvh", `${h}px`);
      root.style.setProperty("--vvt", `${t}px`);
      setTastiera(inputFocus.current && h < baseline.current - 120);
    };

    aggiornaRef.current = aggiorna;
    aggiorna();

    vv?.addEventListener("resize", aggiorna);
    vv?.addEventListener("scroll", aggiorna);
    window.addEventListener("resize", aggiorna);

    return () => {
      root.classList.remove("chat-attiva");
      root.style.removeProperty("--vvh");
      root.style.removeProperty("--vvt");
      vv?.removeEventListener("resize", aggiorna);
      vv?.removeEventListener("scroll", aggiorna);
      window.removeEventListener("resize", aggiorna);
    };
  }, []);

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

  // Quando si apre/chiude la tastiera resta visibile l'ultimo messaggio
  useEffect(() => {
    const el = listaRef.current;
    if (el && staInFondo.current) el.scrollTop = el.scrollHeight;
  }, [tastiera]);

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

const fissaMessaggio = async (messaggio) => {
  if (!isAdmin) return;

  try {
    await setDoc(doc(db, "chatPins", messaggio.id), {
      messageId: messaggio.id,
      type: messaggio.type || "user",
      text: messaggio.text || "",
      senderId: messaggio.senderId || "",
      senderName:
        messaggio.type === "listing"
          ? "Annuncio"
          : messaggio.senderName || "Utente",
      listingId: messaggio.listingId || null,
      listingType: messaggio.listingType || null,
      pinnedBy: uid,
      pinnedAt: serverTimestamp(),
    });

    setMenuMessaggio("");
  } catch (error) {
    console.error(error);
    setErrore("Impossibile fissare il messaggio.");
  }
};

const rimuoviFissato = async (messageId) => {
  if (!isAdmin) return;

  try {
    await deleteDoc(doc(db, "chatPins", messageId));
    setMenuMessaggio("");
  } catch (error) {
    console.error(error);
    setErrore("Impossibile rimuovere il messaggio fissato.");
  }
};

const messaggioGiaFissato = (messageId) =>
  messaggiFissati.some((fissato) => fissato.messageId === messageId);

const cambiaMessaggioFissato = (direzione) => {
  if (messaggiFissati.length <= 1) return;

  setIndiceFissato((indiceAttuale) => {
    return (
      indiceAttuale +
      direzione +
      messaggiFissati.length
    ) % messaggiFissati.length;
  });
};

const raggiungiMessaggio = (messageId) => {
  const elemento = messaggiRef.current[messageId];

  if (!elemento) {
    setErrore(
      "Il messaggio originale non è compreso tra gli ultimi 150 messaggi caricati."
    );
    return;
  }

  elemento.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });

  elemento.classList.add("chat__messaggio--evidenziato");

  window.setTimeout(() => {
    elemento.classList.remove("chat__messaggio--evidenziato");
  }, 1800);
};

const elimina = async (id) => {
  if (!window.confirm("Eliminare questo messaggio?")) return;

  try {
    await deleteDoc(doc(db, "chatMessages", id));

    if (isAdmin && messaggioGiaFissato(id)) {
      try {
        await deleteDoc(doc(db, "chatPins", id));
      } catch (pinError) {
        console.error(
          "Il messaggio è stato eliminato, ma non è stato possibile rimuovere il pin:",
          pinError
        );
      }
    }

    setMenuMessaggio("");
  } catch (error) {
    console.error(error);
    setErrore("Impossibile eliminare il messaggio.");
  }
};

  let ultimoGiorno = "";

useEffect(() => {
  const q = query(
    collection(db, "chatPins"),
    orderBy("pinnedAt", "desc")
  );

  return onSnapshot(
    q,
    (snap) => {
      const fissati = snap.docs.map((documento) => ({
        id: documento.id,
        ...documento.data({
          serverTimestamps: "estimate",
        }),
      }));

      setMessaggiFissati(fissati);

      setIndiceFissato((indiceAttuale) => {
        if (fissati.length === 0) return 0;
        return Math.min(indiceAttuale, fissati.length - 1);
      });
    },
    (error) => {
      console.error("Impossibile caricare i messaggi fissati:", error);
    }
  );
}, []);

  return (
    <section className={"chat" + (tastiera ? " chat--tastiera" : "")}>

      {impostazioni.avviso && (
        <p className="chat__avviso">📌 {impostazioni.avviso}</p>
      )}

{messaggiFissati.length > 0 && (
  <div className="chat-pin">
    <button
      type="button"
      className="chat-pin__contenuto"
      onClick={() =>
        raggiungiMessaggio(
          messaggiFissati[indiceFissato].messageId
        )
      }
      title="Vai al messaggio originale"
    >
      <span className="chat-pin__icona" aria-hidden="true">
        📌
      </span>

      <span className="chat-pin__testi">
        <strong className="chat-pin__autore">
          {messaggiFissati[indiceFissato].senderName ||
            "Utente"}
        </strong>

        <span className="chat-pin__anteprima">
          {messaggiFissati[indiceFissato].text ||
            "Messaggio fissato"}
        </span>
      </span>
    </button>

    <div className="chat-pin__azioni">
      {messaggiFissati.length > 1 && (
        <>
          <button
            type="button"
            className="chat-pin__freccia"
            onClick={() => cambiaMessaggioFissato(-1)}
            aria-label="Messaggio fissato precedente"
          >
            ‹
          </button>

          <span className="chat-pin__contatore">
            {indiceFissato + 1}/{messaggiFissati.length}
          </span>

          <button
            type="button"
            className="chat-pin__freccia"
            onClick={() => cambiaMessaggioFissato(1)}
            aria-label="Messaggio fissato successivo"
          >
            ›
          </button>
        </>
      )}

      {isAdmin && (
        <button
          type="button"
          className="chat-pin__rimuovi"
          onClick={() =>
            rimuoviFissato(
              messaggiFissati[indiceFissato].messageId
            )
          }
          aria-label="Rimuovi messaggio fissato"
          title="Rimuovi messaggio fissato"
        >
          ✕
        </button>
      )}
    </div>
  </div>
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
              <div
  className="chat__riga-annuncio"
  key={m.id}
  ref={(elemento) => {
    if (elemento) {
      messaggiRef.current[m.id] = elemento;
    } else {
      delete messaggiRef.current[m.id];
    }
  }}
>
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
  <div className="chat__azioni-messaggio">
    <button
      type="button"
      className={
        "chat__pin-button" +
        (messaggioGiaFissato(m.id) ? " is-attivo" : "")
      }
      onClick={() =>
        messaggioGiaFissato(m.id)
          ? rimuoviFissato(m.id)
          : fissaMessaggio(m)
      }
      aria-label={
        messaggioGiaFissato(m.id)
          ? "Rimuovi messaggio fissato"
          : "Fissa messaggio"
      }
      title={
        messaggioGiaFissato(m.id)
          ? "Rimuovi il pin"
          : "Fissa il messaggio"
      }
    >
      📌
    </button>

    <button
      type="button"
      className="chat__elimina"
      onClick={() => elimina(m.id)}
      aria-label="Elimina messaggio"
      title="Elimina messaggio"
    >
      🗑
    </button>
  </div>
)}
              </div>
            );
          }

          const mio = m.senderId === uid;

          return (
<div
  className={"chat__riga" + (mio ? " chat__riga--mia" : "")}
  key={m.id}
  ref={(elemento) => {
    if (elemento) {
      messaggiRef.current[m.id] = elemento;
    } else {
      delete messaggiRef.current[m.id];
    }
  }}
>              {separatore}
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

  {isAdmin && (
    <button
      type="button"
      className={
        "chat__pin-button chat__pin-button--inline" +
        (messaggioGiaFissato(m.id) ? " is-attivo" : "")
      }
      onClick={() =>
        messaggioGiaFissato(m.id)
          ? rimuoviFissato(m.id)
          : fissaMessaggio(m)
      }
      aria-label={
        messaggioGiaFissato(m.id)
          ? "Rimuovi messaggio fissato"
          : "Fissa messaggio"
      }
      title={
        messaggioGiaFissato(m.id)
          ? "Rimuovi il pin"
          : "Fissa il messaggio"
      }
    >
      📌
    </button>
  )}

  {puoEliminare && (
    <button
      type="button"
      className="chat__elimina chat__elimina--inline"
      onClick={() => elimina(m.id)}
      aria-label="Elimina messaggio"
      title="Elimina messaggio"
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
      aria-label="Scrivi un messaggio"
      onChange={(e) => setTesto(e.target.value)}
      onFocus={() => {
        inputFocus.current = true;
        aggiornaRef.current?.();
        window.scrollTo(0, 0);
      }}
      onBlur={() => {
        inputFocus.current = false;
        aggiornaRef.current?.();
      }}
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
      onMouseDown={(e) => e.preventDefault()}
      aria-label="Invia messaggio"
    >
      ➤
    </button>

    <MenuNavigazione className="menu-navigazione--chat" />
  </form>
) : (
  <div className="chat__input chat__input--bloccato">
    <p className="chat__nota">
      {silenziato
        ? "🔇 Sei stato silenziato dagli amministratori."
        : chatChiusa
        ? "🔒 La chat è temporaneamente chiusa."
        : "🔒 In questa chat possono scrivere solo gli amministratori."}
    </p>

    <MenuNavigazione className="menu-navigazione--chat" />
  </div>
)}
    </section>
  );
}

export default Chat;