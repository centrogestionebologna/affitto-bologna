import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "../firebase";
import PageContainer from "../components/PageContainer";
import Recensioni from "../components/Recensioni.jsx";

function ProfiloPubblico() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [utente, setUtente] = useState(null);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState("");

  useEffect(() => {
    let attivo = true;
    setCaricamento(true);

    getDoc(doc(db, "users", id))
      .then((snap) => {
        if (!attivo) return;
        setUtente(snap.exists() ? snap.data() : null);
        setErrore("");
      })
      .catch((error) => {
        console.error(error);
        if (attivo) setErrore("Impossibile caricare il profilo.");
      })
      .finally(() => {
        if (attivo) setCaricamento(false);
      });

    return () => {
      attivo = false;
    };
  }, [id]);

  if (caricamento) {
    return (
      <PageContainer>
        <p className="caricamento">Caricamento profilo...</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <button type="button" className="btn btn--sec btn--piccolo" onClick={() => navigate(-1)}>
        ← Indietro
      </button>

      {errore || !utente ? (
        <div className="vuoto">
          <p>{errore || "Utente non trovato."}</p>
        </div>
      ) : (
        <>
          <h1 className="titolo-pagina">
            {`${utente.firstName || ""} ${utente.lastName || ""}`.trim() || "Utente"}
            {utente.verified && " ✅"}
          </h1>

          <p className="tenue">
            Membro da{" "}
            {utente.memberSince?.toDate?.().toLocaleDateString("it-IT") || "-"}
          </p>

          <Recensioni userId={id} puoiRecensire={id !== auth.currentUser.uid} />
        </>
      )}
    </PageContainer>
  );
}

export default ProfiloPubblico;