import { useState } from "react";
import { Link } from "react-router-dom";
import { signOut } from "firebase/auth";

import { auth } from "../firebase";
import PageContainer from "../components/PageContainer";
import FormProfilo from "../components/FormProfilo";
import Recensioni from "../components/Recensioni";
import useUtente from "../hooks/useUtente";
import { salvaProfilo } from "../services/annunci";

function Profilo() {
  const { profilo, contatti, caricamento } = useUtente();
  const [messaggio, setMessaggio] = useState("");

  const salva = async (dati) => {
    await salvaProfilo(dati);
    setMessaggio("Profilo aggiornato.");
  };

  if (caricamento) {
    return (
      <PageContainer>
        <p className="caricamento">Caricamento profilo...</p>
      </PageContainer>
    );
  }

  if (!profilo) {
    return (
      <PageContainer>
        <p className="alert alert--errore">Profilo non disponibile.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <h1 className="titolo-pagina">👤 Profilo</h1>

      <div className="scheda">
        <p>
          <strong>Membro da:</strong>{" "}
          {profilo.memberSince?.toDate?.().toLocaleDateString("it-IT") || "-"}
        </p>
        <p>
          <strong>Verificato:</strong>{" "}
          {profilo.verified ? "✅ Verificato" : "❌ Non verificato"}
        </p>
        <p>
          <strong>Segnalazioni ricevute:</strong> {profilo.reportsCount || 0}
        </p>
      </div>

      <div className="scheda">
        <FormProfilo
          iniziale={{ ...profilo, phone: contatti?.phone || "" }}
          onSubmit={salva}
          etichetta="Salva profilo"
        />
        {messaggio && <p className="alert alert--ok">{messaggio}</p>}

        <div className="form-azioni">
          <Link to="/preferiti" className="btn btn--sec">
            ❤️ I miei preferiti
          </Link>
          <button type="button" className="btn btn--sec" onClick={() => signOut(auth)}>
            Logout
          </button>
        </div>
      </div>

      <Recensioni userId={auth.currentUser.uid} puoiRecensire={false} />
    </PageContainer>
  );
}

export default Profilo;