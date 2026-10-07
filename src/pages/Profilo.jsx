import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { signOut } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";

import { auth, db } from "../firebase";
import PageContainer from "../components/PageContainer";
import Recensioni from "../components/Recensioni.jsx";

function Profilo() {
  const [userData, setUserData] = useState(null);
  const [phone, setPhone] = useState("");
  const [accountType, setAccountType] = useState("homeSeeker");
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState("");
  const [messaggio, setMessaggio] = useState("");
  const [salvataggio, setSalvataggio] = useState(false);

  useEffect(() => {
    const carica = async () => {
      try {
        const snap = await getDoc(doc(db, "users", auth.currentUser.uid));

        if (snap.exists()) {
          const dati = snap.data();
          setUserData(dati);
          setPhone(dati.phone || "");
          setAccountType(dati.accountType || "homeSeeker");
        } else {
          setErrore("Profilo non trovato.");
        }
      } catch (error) {
        console.error(error);
        setErrore("Impossibile caricare il profilo.");
      } finally {
        setCaricamento(false);
      }
    };

    carica();
  }, []);

  const salva = async () => {
    setSalvataggio(true);
    setMessaggio("");
    setErrore("");

    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        phone: phone.trim(),
        accountType,
      });
      setMessaggio("Profilo aggiornato.");
    } catch (error) {
      console.error(error);
      setErrore("Salvataggio non riuscito, riprova.");
    } finally {
      setSalvataggio(false);
    }
  };

  if (caricamento) {
    return (
      <PageContainer>
        <p className="caricamento">Caricamento profilo...</p>
      </PageContainer>
    );
  }

  if (!userData) {
    return (
      <PageContainer>
        <p className="alert alert--errore">{errore || "Profilo non disponibile."}</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <h1 className="titolo-pagina">👤 Profilo</h1>

      <div className="scheda">
        <p>
          <strong>Nome:</strong> {userData.firstName}
        </p>
        <p>
          <strong>Cognome:</strong> {userData.lastName}
        </p>
        <p>
          <strong>Email:</strong> {userData.email}
        </p>
        <p>
          <strong>Membro da:</strong>{" "}
          {userData.memberSince?.toDate?.().toLocaleDateString("it-IT") || "-"}
        </p>
        <p>
          <strong>Verificato:</strong>{" "}
          {userData.verified ? "✅ Verificato" : "❌ Non verificato"}
        </p>
      </div>

      <div className="scheda">
        <div className="campo">
          <label htmlFor="p-tel">Numero di telefono</label>
          <input
            id="p-tel"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="campo">
          <label htmlFor="p-tipo">Tipologia account</label>
          <select
            id="p-tipo"
            value={accountType}
            onChange={(e) => setAccountType(e.target.value)}
          >
            <option value="homeSeeker">Cerca Casa</option>
            <option value="homeProvider">Offre Casa</option>
            <option value="both">Entrambi</option>
          </select>
        </div>

        {messaggio && <p className="alert alert--ok">{messaggio}</p>}
        {errore && <p className="alert alert--errore">{errore}</p>}

        <div className="form-azioni">
          <button
            type="button"
            className="btn btn--primario"
            onClick={salva}
            disabled={salvataggio}
          >
            {salvataggio ? "Salvataggio..." : "Salva"}
          </button>
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