import { useState } from "react";

import { auth } from "../firebase";

const VUOTO = {
  firstName: "",
  lastName: "",
  phone: "",
  accountType: "homeSeeker",
};

function FormProfilo({ iniziale = {}, onSubmit, etichetta = "Salva" }) {
  const [f, setF] = useState(() => {
    const stato = { ...VUOTO };

    Object.keys(VUOTO).forEach((chiave) => {
      if (
        iniziale[chiave] !== undefined &&
        iniziale[chiave] !== null
      ) {
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

    if (f.phone.replace(/\D/g, "").length < 6) {
      return setErrore("Inserisci un numero di telefono valido.");
    }

    setInvio(true);

    try {
      await onSubmit({
        firstName: f.firstName.trim(),
        lastName: f.lastName.trim(),
        phone: f.phone.trim(),
        accountType: f.accountType,
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
          <label htmlFor="pf-nome">Nome</label>

          <input
            id="pf-nome"
            type="text"
            autoComplete="given-name"
            {...campo("firstName")}
          />
        </div>

        <div className="campo">
          <label htmlFor="pf-cognome">Cognome</label>

          <input
            id="pf-cognome"
            type="text"
            autoComplete="family-name"
            {...campo("lastName")}
          />
        </div>

        <div className="campo">
          <label htmlFor="pf-email">Email</label>

          <input
            id="pf-email"
            type="text"
            value={auth.currentUser?.email || ""}
            readOnly
          />
        </div>

        <div className="campo">
          <label htmlFor="pf-tel">Telefono</label>

          <input
            id="pf-tel"
            type="tel"
            autoComplete="tel"
            {...campo("phone")}
          />
        </div>

        <div className="campo">
          <label htmlFor="pf-tipo">
            Cosa fai su Affitto Bologna
          </label>

          <select id="pf-tipo" {...campo("accountType")}>
            <option value="homeSeeker">Cerco casa</option>
            <option value="homeProvider">Offro casa</option>
            <option value="both">Entrambi</option>
          </select>
        </div>
      </div>

      <p className="tenue">
        Il cognome completo, il telefono e l’email restano privati.
        Agli altri utenti viene mostrato solamente il nome con
        l’iniziale del cognome.
      </p>

      {errore && (
        <p className="alert alert--errore">{errore}</p>
      )}

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