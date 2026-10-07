import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "../firebase";
import PageContainer from "../components/PageContainer";
import PhotoGallery from "../components/PhotoGallery";
import { ListingInfo, StatoRiga } from "../components/ListingCard.jsx";
import AzioniAnnuncio from "../components/AzioniAnnuncio";
import Suggerimenti from "../components/Suggerimenti";
import { ValutazioneSintetica } from "../components/Recensioni";
import useFavorites from "../hooks/useFavorites";
import { PROPERTIES } from "../utils/helpers";

// tipo: "properties" | "roommateAds"
function DettaglioAnnuncio({ tipo = PROPERTIES }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { favIds, toggle } = useFavorites();

  const [annuncio, setAnnuncio] = useState(null);
  const [proprietario, setProprietario] = useState(null);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState("");

  useEffect(() => {
    let attivo = true;
    setCaricamento(true);
    setErrore("");

    const carica = async () => {
      try {
        const snap = await getDoc(doc(db, tipo, id));

        if (!attivo) return;

        if (!snap.exists()) {
          setAnnuncio(null);
          return;
        }

        const dati = { id: snap.id, ...snap.data() };
        setAnnuncio(dati);

        try {
          const utente = await getDoc(doc(db, "users", dati.ownerId));
          if (attivo && utente.exists()) setProprietario(utente.data());
        } catch (error) {
          console.error(error);
        }
      } catch (error) {
        console.error(error);
        if (attivo) setErrore("Impossibile caricare l'annuncio.");
      } finally {
        if (attivo) setCaricamento(false);
      }
    };

    carica();

    return () => {
      attivo = false;
    };
  }, [id, tipo]);

  if (caricamento) {
    return (
      <PageContainer>
        <p className="caricamento">Caricamento annuncio...</p>
      </PageContainer>
    );
  }

  if (errore || !annuncio) {
    return (
      <PageContainer>
        <button type="button" className="btn btn--sec" onClick={() => navigate(-1)}>
          ← Indietro
        </button>
        <div className="vuoto">
          <p>{errore || "Questo annuncio non esiste o è stato eliminato."}</p>
        </div>
      </PageContainer>
    );
  }

  const mio = annuncio.ownerId === auth.currentUser.uid;
  const nomeProprietario = proprietario
    ? `${proprietario.firstName || ""} ${proprietario.lastName || ""}`.trim()
    : "";

  return (
    <PageContainer>
      <button type="button" className="btn btn--sec btn--piccolo" onClick={() => navigate(-1)}>
        ← Indietro
      </button>

      <div className="dettaglio">
        <PhotoGallery photos={annuncio.photos || []} alt={annuncio.title} />

        <div className="dettaglio__corpo">
          <StatoRiga a={annuncio} tipo={tipo} />
          <h1 className="titolo-pagina">{annuncio.title}</h1>

          <ListingInfo a={annuncio} tipo={tipo} />

          <div className="scheda proprietario">
            <h3>Pubblicato da</h3>
            <p>
              <Link to={`/utente/${annuncio.ownerId}`}>
                {nomeProprietario || "Utente"}
              </Link>
              {proprietario?.verified && " ✅"}
            </p>
            <p>
              <ValutazioneSintetica userId={annuncio.ownerId} />
            </p>
          </div>

          <div className="card__azioni">
            {mio ? (
              <Link to="/annunci" className="btn btn--primario">
                ✏ Gestisci il tuo annuncio
              </Link>
            ) : (
              <AzioniAnnuncio
                annuncio={annuncio}
                tipo={tipo}
                salvato={favIds.has(annuncio.id)}
                onToggleSalva={() => toggle(annuncio, tipo)}
              />
            )}
          </div>
        </div>
      </div>

      {tipo === PROPERTIES && (
        <Suggerimenti referenti={[annuncio]} esclusi={[annuncio.id]} />
      )}
    </PageContainer>
  );
}

export default DettaglioAnnuncio;