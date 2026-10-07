import { useEffect, useState } from "react";
import { deleteDoc, doc, getDoc } from "firebase/firestore";

import { db } from "../firebase";
import PageContainer from "../components/PageContainer";
import ListingCard from "../components/ListingCard.jsx";
import AzioniAnnuncio from "../components/AzioniAnnuncio";
import Suggerimenti from "../components/Suggerimenti";
import useFavorites from "../hooks/useFavorites";
import { PROPERTIES, ROOMMATES, secondi } from "../utils/helpers";

function Preferiti() {
  const { favDocs, favIds, caricamento: caricandoFav, errore: erroreFav, toggle } =
    useFavorites();

  const [voci, setVoci] = useState([]);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState("");

  useEffect(() => {
    if (caricandoFav) return;
    let attivo = true;

    const carica = async () => {
      try {
        const risultati = await Promise.all(
          favDocs.map(async (fav) => {
            const collezione =
              fav.listingType === ROOMMATES ? ROOMMATES : PROPERTIES;
            const snap = await getDoc(doc(db, collezione, fav.listingId));
            return {
              fav,
              tipo: collezione,
              annuncio: snap.exists() ? { id: snap.id, ...snap.data() } : null,
            };
          })
        );

        if (!attivo) return;
        setVoci(
          risultati.sort(
            (a, b) => secondi(b.fav.createdAt) - secondi(a.fav.createdAt)
          )
        );
        setErrore("");
      } catch (error) {
        console.error(error);
        if (attivo) setErrore("Impossibile caricare i tuoi preferiti.");
      } finally {
        if (attivo) setCaricamento(false);
      }
    };

    carica();

    return () => {
      attivo = false;
    };
  }, [favDocs, caricandoFav]);

  const rimuoviOrfano = async (favId) => {
    try {
      await deleteDoc(doc(db, "favorites", favId));
    } catch (error) {
      console.error(error);
      alert("Impossibile rimuovere il preferito.");
    }
  };

  const case_ = voci.filter((v) => v.tipo === PROPERTIES);
  const coinquilini = voci.filter((v) => v.tipo === ROOMMATES);

  const renderVoce = ({ fav, tipo, annuncio }) =>
    annuncio ? (
      <ListingCard key={fav.id} annuncio={annuncio} tipo={tipo}>
        <AzioniAnnuncio
          annuncio={annuncio}
          tipo={tipo}
          salvato={favIds.has(annuncio.id)}
          onToggleSalva={() => toggle(annuncio, tipo)}
        />
      </ListingCard>
    ) : (
      <div className="card card--orfano" key={fav.id}>
        <div className="card__corpo">
          <p>Questo annuncio non è più disponibile.</p>
          <button
            type="button"
            className="btn btn--sec"
            onClick={() => rimuoviOrfano(fav.id)}
          >
            Rimuovi dai preferiti
          </button>
        </div>
      </div>
    );

  return (
    <PageContainer>
      <h1 className="titolo-pagina">❤️ I miei preferiti</h1>

      {caricamento || caricandoFav ? (
        <p className="caricamento">Caricamento preferiti...</p>
      ) : errore || erroreFav ? (
        <p className="alert alert--errore">{errore || erroreFav}</p>
      ) : voci.length === 0 ? (
        <div className="vuoto">
          <p>Non hai ancora salvato nessun annuncio.</p>
          <p className="tenue">
            Tocca 🤍 Salva su un annuncio per ritrovarlo qui.
          </p>
        </div>
      ) : (
        <>
          {case_.length > 0 && (
            <section className="sezione">
              <h2 className="sezione__titolo">🏠 Case</h2>
              <div className="griglia-annunci">{case_.map(renderVoce)}</div>
            </section>
          )}

          {coinquilini.length > 0 && (
            <section className="sezione">
              <h2 className="sezione__titolo">👥 Coinquilini</h2>
              <div className="griglia-annunci">
                {coinquilini.map(renderVoce)}
              </div>
            </section>
          )}

          <Suggerimenti
            referenti={case_.map((v) => v.annuncio).filter(Boolean)}
            esclusi={case_.map((v) => v.fav.listingId)}
          />
        </>
      )}
    </PageContainer>
  );
}

export default Preferiti;