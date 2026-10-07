import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "../firebase";
import PageContainer from "../components/PageContainer";
import Filtri from "../components/Filtri";
import ListingCard from "../components/ListingCard.jsx";
import AzioniAnnuncio from "../components/AzioniAnnuncio";
import Suggerimenti from "../components/Suggerimenti";
import useFavorites from "../hooks/useFavorites";
import { FILTRI_INIZIALI, PROPERTIES, filtraEOrdina } from "../utils/helpers";

function CercaCasa() {
  const [annunci, setAnnunci] = useState([]);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState("");
  const [filtri, setFiltri] = useState({ ...FILTRI_INIZIALI });

  const { favIds, toggle } = useFavorites();

  useEffect(() => {
    const carica = async () => {
      try {
        const snapshot = await getDocs(
          query(collection(db, PROPERTIES), where("status", "==", "active"))
        );
        setAnnunci(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error(error);
        setErrore("Impossibile caricare gli annunci. Riprova tra poco.");
      } finally {
        setCaricamento(false);
      }
    };

    carica();
  }, []);

  const risultati = useMemo(
    () => filtraEOrdina(annunci, filtri),
    [annunci, filtri]
  );

  // Riferimenti per i suggerimenti: preferiti + criteri di ricerca attivi
  const riferimenti = [
    ...annunci.filter((a) => favIds.has(a.id)),
    ...(filtri.zona || filtri.prezzoMax || filtri.genere || filtri.occupazione
      ? [
          {
            zone: filtri.zona,
            monthlyPrice: Number(filtri.prezzoMax) || 0,
            genderPreference: filtri.genere,
            occupationPreference: filtri.occupazione,
          },
        ]
      : []),
  ];

  return (
    <PageContainer>
      <h1 className="titolo-pagina">🔍 Cerca Casa</h1>

      <Filtri filtri={filtri} setFiltri={setFiltri} />

      {caricamento ? (
        <p className="caricamento">Caricamento annunci...</p>
      ) : errore ? (
        <p className="alert alert--errore">{errore}</p>
      ) : risultati.length === 0 ? (
        <div className="vuoto">
          <p>
            {annunci.length === 0
              ? "Nessun annuncio disponibile."
              : "Nessun annuncio corrisponde ai filtri scelti."}
          </p>
          {annunci.length > 0 && (
            <button
              type="button"
              className="btn btn--sec"
              onClick={() => setFiltri({ ...FILTRI_INIZIALI })}
            >
              Azzera filtri
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="tenue">
            {risultati.length}{" "}
            {risultati.length === 1 ? "annuncio" : "annunci"}
          </p>

          <div className="griglia-annunci">
            {risultati.map((a) => (
              <ListingCard key={a.id} annuncio={a} tipo={PROPERTIES}>
                <AzioniAnnuncio
                  annuncio={a}
                  tipo={PROPERTIES}
                  salvato={favIds.has(a.id)}
                  onToggleSalva={() => toggle(a, PROPERTIES)}
                />
              </ListingCard>
            ))}
          </div>
        </>
      )}

      {!caricamento && (
        <Suggerimenti
          referenti={riferimenti}
          catalogo={annunci}
          esclusi={risultati.map((a) => a.id)}
        />
      )}
    </PageContainer>
  );
}

export default CercaCasa;