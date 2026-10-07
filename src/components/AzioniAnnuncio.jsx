import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "../firebase";
import {
  inviaRichiestaContatto,
  inviaSegnalazione,
} from "../services/annunci";
import { MOTIVI_SEGNALAZIONE } from "../utils/helpers";

function SalvaButton({ salvato, onToggle }) {
  const [attesa, setAttesa] = useState(false);

  const click = async () => {
    setAttesa(true);
    try {
      await onToggle();
    } catch (error) {
      console.error(error);
      alert("Operazione non riuscita, riprova.");
    } finally {
      setAttesa(false);
    }
  };

  return (
    <button
      type="button"
      className={"btn btn--fav" + (salvato ? " is-attivo" : "")}
      onClick={click}
      disabled={attesa}
      aria-pressed={salvato}
    >
      {salvato ? "❤️ Salvato" : "🤍 Salva"}
    </button>
  );
}

function ContattaButton({ annuncio, tipo }) {
  const [stato, setStato] = useState("caricamento");
  const [errore, setErrore] = useState("");

  useEffect(() => {
    let attivo = true;
    const id = `${auth.currentUser.uid}_${annuncio.id}`;

    getDoc(doc(db, "contactRequests", id))
      .then((snap) => {
        if (attivo) setStato(snap.exists() ? "inviata" : "libero");
      })
      .catch(() => {
        if (attivo) setStato("libero");
      });

    return () => {
      attivo = false;
    };
  }, [annuncio.id]);

  const invia = async () => {
    setErrore("");
    setStato("invio");
    try {
      await inviaRichiestaContatto(annuncio, tipo);
      setStato("inviata");
    } catch (error) {
      console.error(error);
      setErrore("Richiesta non inviata, riprova.");
      setStato("libero");
    }
  };

  return (
    <>
      <button
        type="button"
        className="btn btn--primario"
        onClick={invia}
        disabled={stato !== "libero"}
      >
        {stato === "inviata"
          ? "✅ Richiesta inviata"
          : stato === "invio"
          ? "Invio..."
          : "📨 Contatta"}
      </button>
      {errore && <span className="alert alert--errore">{errore}</span>}
    </>
  );
}

function SegnalaModal({ annuncio, tipo, chiudi }) {
  const [motivo, setMotivo] = useState(MOTIVI_SEGNALAZIONE[0]);
  const [dettagli, setDettagli] = useState("");
  const [stato, setStato] = useState("idle");
  const [errore, setErrore] = useState("");

  const invia = async (e) => {
    e.preventDefault();
    setStato("invio");
    setErrore("");

    try {
      await inviaSegnalazione(annuncio, tipo, motivo, dettagli.trim());
      setStato("ok");
    } catch (error) {
      console.error(error);
      setErrore(
        error.code === "permission-denied"
          ? "Hai già segnalato questo annuncio."
          : "Segnalazione non inviata, riprova."
      );
      setStato("idle");
    }
  };

  return createPortal(
    <div className="modal" role="dialog" aria-modal="true" onClick={chiudi}>
      <div className="modal__box" onClick={(e) => e.stopPropagation()}>
        {stato === "ok" ? (
          <>
            <h3>Segnalazione inviata</h3>
            <p>Grazie, controlleremo l'annuncio.</p>
            <button type="button" className="btn btn--primario" onClick={chiudi}>
              Chiudi
            </button>
          </>
        ) : (
          <form onSubmit={invia}>
            <h3>🚩 Segnala annuncio</h3>

            <div className="campo">
              {MOTIVI_SEGNALAZIONE.map((m) => (
                <label key={m} className="check">
                  <input
                    type="radio"
                    name="motivo"
                    value={m}
                    checked={motivo === m}
                    onChange={() => setMotivo(m)}
                  />
                  {m}
                </label>
              ))}
            </div>

            <div className="campo">
              <label htmlFor="dettagli-segnalazione">Dettagli (facoltativo)</label>
              <textarea
                id="dettagli-segnalazione"
                value={dettagli}
                maxLength={500}
                onChange={(e) => setDettagli(e.target.value)}
              />
            </div>

            {errore && <p className="alert alert--errore">{errore}</p>}

            <div className="form-azioni">
              <button
                type="submit"
                className="btn btn--pericolo"
                disabled={stato === "invio"}
              >
                {stato === "invio" ? "Invio..." : "Invia segnalazione"}
              </button>
              <button type="button" className="btn btn--sec" onClick={chiudi}>
                Annulla
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}

function AzioniAnnuncio({ annuncio, tipo, salvato, onToggleSalva }) {
  const [segnalaAperto, setSegnalaAperto] = useState(false);

  if (annuncio.ownerId === auth.currentUser.uid) return null;

  return (
    <>
      <SalvaButton salvato={salvato} onToggle={onToggleSalva} />
      <ContattaButton annuncio={annuncio} tipo={tipo} />
      <button
        type="button"
        className="btn btn--sec"
        onClick={() => setSegnalaAperto(true)}
      >
        🚩 Segnala
      </button>

      {segnalaAperto && (
        <SegnalaModal
          annuncio={annuncio}
          tipo={tipo}
          chiudi={() => setSegnalaAperto(false)}
        />
      )}
    </>
  );
}

export default AzioniAnnuncio;