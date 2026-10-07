import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "../firebase";
import PageContainer from "../components/PageContainer";
import Filtri from "../components/Filtri.jsx";
import ListingCard from "../components/ListingCard.jsx";
import AzioniAnnuncio from "../components/AzioniAnnuncio.jsx";
import useFavorites from "../hooks/useFavorites";
import { FILTRI_INIZIALI, ROOMMATES, filtraEOrdina } from "../utils/helpers";

function CercaCoinquilini() {
  const [annunci, setAnnunci] = useState([]);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState("");
  const [tab, setTab] = useState("offro");
  const [filtri, setFiltri] = useState({ ...FILTRI_INIZIALI });

  const { favIds, toggle } = useFavorites();

  useEffect(() => {
    const carica = async () => {
      try {
        const snapshot = await getDocs(
          query(collection(db, ROOMMATES), where("status", "==", "active"))
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
    () => filtraEOrdina(annunci.filter((a) => a.roommateType === tab), filtri),
    [annunci, tab, filtri]
  );

  return (
    <PageContainer>
      <h1 className="titolo-pagina">👥 Cerca Coinquilini</h1>

      <div className="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "offro"}
          className={"tab" + (tab === "offro" ? " is-attiva" : "")}
          onClick={() => setTab("offro")}
        >
          📢 Posti letto offerti
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "cerco"}
          className={"tab" + (tab === "cerco" ? " is-attiva" : "")}
          onClick={() => setTab("cerco")}
        >
          🔎 Cercano posto letto
        </button>
      </div>

      <Filtri
        filtri={filtri}
        setFiltri={setFiltri}
        mostraDeposito={tab === "offro"}
      />

      {caricamento ? (
        <p className="caricamento">Caricamento annunci...</p>
      ) : errore ? (
        <p className="alert alert--errore">{errore}</p>
      ) : risultati.length === 0 ? (
        <div className="vuoto">
          <p>Nessun annuncio trovato in questa sezione.</p>
        </div>
      ) : (
        <div className="griglia-annunci">
          {risultati.map((a) => (
            <ListingCard key={a.id} annuncio={a} tipo={ROOMMATES}>
              <AzioniAnnuncio
                annuncio={a}
                tipo={ROOMMATES}
                salvato={favIds.has(a.id)}
                onToggleSalva={() => toggle(a, ROOMMATES)}
              />
            </ListingCard>
          ))}
        </div>
      )}
    </PageContainer>
  );
}

export default CercaCoinquilini;