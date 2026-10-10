import { useState } from "react";

import { auth } from "../firebase";
import { GENERE_PERSONA, OCCUPAZIONE_PERSONA } from "../utils/helpers";

const VUOTO = {
  firstName: "",
  lastName: "",
  phone: "",
  birthDate: "",
  gender: "",
  occupation: "",
  studyOrWork: "",
  accountType: "homeSeeker",
  bio: "",
};

function FormProfilo({ iniziale = {}, onSubmit, etichetta = "Salva" }) {
  const [f, setF] = useState(() => {
    const stato = { ...VUOTO };
    Object.keys(VUOTO).forEach((k) => {
      if (iniziale[k] !== undefined && iniziale[k] !== null) stato[k] = iniziale[k];
    });
    return stato;
  });
  const [errore, setErrore] = useState("");
  const [invio, setInvio] = useState(false);

  const c = (k) => ({
    value: f[k],
    onChange: (e) => setF((p) => ({ ...p, [k]: e.target.value })),
  });

  const invia = async (e) => {
    e.preventDefault();
    setErrore("");

    if (!f.firstName.trim()) return setErrore("Inserisci il tuo nome.");
    if (!f.lastName.trim()) return setErrore("Inserisci il tuo cognome.");
    if (f.phone.replace(/\D/g, "").length < 6)
      return setErrore("Inserisci un numero di telefono valido.");
    if (!f.gender) return setErrore("Seleziona il genere.");
    if (!f.occupation) return setErrore("Indica se sei studente o lavoratore.");

    setInvio(true);
    try {
      await onSubmit({
        ...f,
        firstName: f.firstName.trim(),
        lastName: f.lastName.trim(),
        phone: f.phone.trim(),
        studyOrWork: f.studyOrWork.trim(),
        bio: f.bio.trim(),
      });
    } catch (error) {
      console.error(error);
      setErrore("Salvataggio non riuscito, riprova.");
    } finally {
      setInvio(false);
    }
  };

  return (
    <form onSubmit={invia} noValidate>
      <div className="griglia-campi">
        <div className="campo">
          <label htmlFor="pf-nome">Nome *</label>
          <input id="pf-nome" type="text" {...c("firstName")} />
        </div>

        <div className="campo">
          <label htmlFor="pf-cognome">Cognome *</label>
          <input id="pf-cognome" type="text" {...c("lastName")} />
        </div>

        <div className="campo">
          <label htmlFor="pf-email">Email</label>
          <input
            id="pf-email"
            type="text"
            value={auth.currentUser.email || ""}
            readOnly
          />
        </div>

        <div className="campo">
          <label htmlFor="pf-tel">Telefono *</label>
          <input id="pf-tel" type="tel" {...c("phone")} />
        </div>

        <div className="campo">
          <label htmlFor="pf-nascita">Data di nascita</label>
          <input id="pf-nascita" type="date" {...c("birthDate")} />
        </div>

        <div className="campo">
          <label htmlFor="pf-genere">Genere *</label>
          <select id="pf-genere" {...c("gender")}>
            <option value="">Seleziona</option>
            {GENERE_PERSONA.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </div>

        <div className="campo">
          <label htmlFor="pf-occ">Sei studente o lavoratore? *</label>
          <select id="pf-occ" {...c("occupation")}>
            <option value="">Seleziona</option>
            {OCCUPAZIONE_PERSONA.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>

        <div className="campo">
          <label htmlFor="pf-studio">Università / luogo di lavoro</label>
          <input id="pf-studio" type="text" {...c("studyOrWork")} />
        </div>

        <div className="campo">
          <label htmlFor="pf-tipo">Cosa fai su Affitto Bologna</label>
          <select id="pf-tipo" {...c("accountType")}>
            <option value="homeSeeker">Cerco casa</option>
            <option value="homeProvider">Offro casa</option>
            <option value="both">Entrambi</option>
          </select>
        </div>
      </div>

      <div className="campo">
        <label htmlFor="pf-bio">Presentazione</label>
        <textarea
          id="pf-bio"
          placeholder="Racconta chi sei in poche righe"
          maxLength={500}
          {...c("bio")}
        />
      </div>

      <p className="tenue">
        Telefono ed email restano privati: li vede solo chi approvi o chi
        approva le tue richieste.
      </p>

      {errore && <p className="alert alert--errore">{errore}</p>}

      <button type="submit" className="btn btn--primario btn--blocco" disabled={invio}>
        {invio ? "Salvataggio..." : etichetta}
      </button>
    </form>
  );
}

export default FormProfilo;