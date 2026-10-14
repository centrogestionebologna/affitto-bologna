import { useState } from "react";

import { auth } from "../firebase";

const VUOTO = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  accountType: "homeSeeker",
};

const EMAIL_VALIDA = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function FormProfilo({ iniziale = {}, onSubmit, etichetta = "Salva" }) {
  // Con l'accesso Google l'email è già nota: il campo serve solo se manca
  const emailAutomatica = auth.currentUser?.email || "";

  const [f, setF] = useState(() => {
    const stato = { ...VUOTO };

    Object.keys(VUOTO).forEach((chiave) => {
      if (iniziale[chiave] !== undefined && iniziale[chiave] !== null) {
        stato[chiave] = iniziale[chiave];
      }
    });

    return stato;
  });

  const [errore, setErrore] = useState("");
  const [invio, setInvio] = useState(false);

  const campo = (chiave) => ({
    value: f[chiave],
    onChange: (e) =>
      setF((precedente) => ({
        ...precedente,
        [chiave]: e.target.value,
      })),
  });

  const invia = async (e) => {
    e.preventDefault();
    setErrore("");

    if (!f.firstName.trim()) {
      return setErrore("Inserisci il tuo nome.");
    }

    if (!f.lastName.trim()) {
      return setErrore("Inserisci il tuo cognome.");
    }

    if (!emailAutomatica && !EMAIL_VALIDA.test(f.email.trim())) {
      return setErrore("Inserisci un indirizzo email valido.");
    }

    const telefono = f.phone.trim();

    if (telefono && telefono.replace(/\D/g, "").length < 6) {
      return setErrore(
        "Il numero di telefono non sembra valido: correggilo oppure lascia il campo vuoto."
      );
    }

    setInvio(true);

    try {
      await onSubmit({
        firstName: f.firstName.trim(),
        lastName: f.lastName.trim(),
        phone: telefono,
        accountType: f.accountType,
        ...(emailAutomatica ? {} : { email: f.email.trim() }),
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

          <input
            id="pf-nome"
            type="text"
            autoComplete="given-name"
            {...campo("firstName")}
          />
        </div>

        <div className="campo">
          <label htmlFor="pf-cognome">Cognome *</label>

          <input
            id="pf-cognome"
            type="text"
            autoComplete="family-name"
            {...campo("lastName")}
          />
        </div>

        {!emailAutomatica && (
          <div className="campo">
            <label htmlFor="pf-email">Email *</label>

            <input
              id="pf-email"
              type="text"
              inputMode="email"
              autoComplete="email"
              {...campo("email")}
            />
          </div>
        )}

        <div className="campo">
          <label htmlFor="pf-tel">Telefono (facoltativo)</label>

          <input
            id="pf-tel"
            type="tel"
            autoComplete="tel"
            {...campo("phone")}
          />

          <small className="campo__nota">
            Se non lo inserisci, nelle richieste di contatto verrà mostrata
            solo la tua email, senza il numero di telefono. Potrai aggiungerlo
            o modificarlo in seguito dal tuo profilo.
          </small>
        </div>

        <div className="campo">
          <label htmlFor="pf-tipo">Cosa fai su Affitto Bologna</label>

          <select id="pf-tipo" {...campo("accountType")}>
            <option value="homeSeeker">Cerco casa</option>
            <option value="homeProvider">Offro casa</option>
            <option value="both">Entrambi</option>
          </select>
        </div>
      </div>

      <p className="tenue">
        Il cognome completo, il telefono e l’email restano privati: chi ha
        pubblicato un annuncio li vede solo se approva una tua richiesta di
        contatto. Agli altri utenti viene mostrato solamente il nome con
        l’iniziale del cognome.
      </p>

      {errore && <p className="alert alert--errore">{errore}</p>}

      <button
        type="submit"
        className="btn btn--primario btn--blocco"
        disabled={invio}
      >
        {invio ? "Salvataggio..." : etichetta}
      </button>
    </form>
  );
}

export default FormProfilo;