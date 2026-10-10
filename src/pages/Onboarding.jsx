import { useState } from "react";
import { signOut } from "firebase/auth";

import { auth } from "../firebase";
import FormProfilo from "../components/FormProfilo";
import { completaOnboarding, salvaProfilo } from "../services/annunci";

function Onboarding({ profilo, contatti }) {
  const utente = auth.currentUser;
  const [passo, setPasso] = useState("profilo");
  const [accetto, setAccetto] = useState(false);
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState("");

  const iniziale = {
    firstName:
      profilo?.firstName ?? (utente.displayName?.split(" ")[0] || ""),
    lastName:
      profilo?.lastName ??
      (utente.displayName?.split(" ").slice(1).join(" ") || ""),
    phone: contatti?.phone || "",
    birthDate: profilo?.birthDate || "",
    gender: profilo?.gender || "",
    occupation: profilo?.occupation || "",
    studyOrWork: profilo?.studyOrWork || "",
    accountType: profilo?.accountType || "homeSeeker",
    bio: profilo?.bio || "",
  };

  const continua = async (dati) => {
    await salvaProfilo(dati);
    setPasso("disclaimer");
    window.scrollTo({ top: 0 });
  };

  const conferma = async () => {
    setInvio(true);
    setErrore("");
    try {
      await completaOnboarding();
    } catch (error) {
      console.error(error);
      setErrore("Non è stato possibile completare la registrazione, riprova.");
      setInvio(false);
    }
  };

  return (
    <div className="onboarding">
      <div className="onboarding__box">
        <p className="onboarding__passo">
          Passo {passo === "profilo" ? 1 : 2} di 2
        </p>

        {passo === "profilo" ? (
          <>
            <h1>Benvenuto/a su Affitto Bologna</h1>
            <p className="tenue">
              Completa il tuo profilo per iniziare a cercare casa o coinquilini.
            </p>
            <FormProfilo
              iniziale={iniziale}
              onSubmit={continua}
              etichetta="Continua"
            />
          </>
        ) : (
          <>
            <h1>⚠️ Prima di iniziare</h1>

            <div className="disclaimer">
              <p>
                <strong>Affitto Bologna è una community di studenti e
                lavoratori.</strong> Gli annunci non sono tutti verificati.
              </p>
              <p>
                Ti invitiamo a <strong>verificare sempre</strong> gli annunci e
                le persone che incontri prima di versare denaro o firmare
                accordi, e a <strong>segnalare</strong> subito qualsiasi
                annuncio o comportamento sospetto con il pulsante 🚩 Segnala.
              </p>
              <p>
                In ogni caso, <strong>Affitto Bologna non si assume alcuna
                responsabilità</strong> per il contenuto degli annunci, per i
                rapporti tra gli utenti e per gli accordi che ne derivano.
              </p>
            </div>

            <label className="check">
              <input
                type="checkbox"
                checked={accetto}
                onChange={(e) => setAccetto(e.target.checked)}
              />
              Ho letto e compreso quanto sopra
            </label>

            {errore && <p className="alert alert--errore">{errore}</p>}

            <div className="form-azioni">
              <button
                type="button"
                className="btn btn--primario"
                onClick={conferma}
                disabled={!accetto || invio}
              >
                {invio ? "Un attimo..." : "Accetto e continua"}
              </button>
              <button
                type="button"
                className="btn btn--sec"
                onClick={() => setPasso("profilo")}
              >
                ← Indietro
              </button>
            </div>
          </>
        )}

        <button
          type="button"
          className="btn btn--sec btn--piccolo onboarding__esci"
          onClick={() => signOut(auth)}
        >
          Esci
        </button>
      </div>
    </div>
  );
}

export default Onboarding;