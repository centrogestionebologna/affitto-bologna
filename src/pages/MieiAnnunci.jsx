import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";

import { auth, db } from "../firebase";
import PageContainer from "../components/PageContainer";
import ListingCard from "../components/ListingCard.jsx";
import AnnuncioForm from "../components/AnnuncioForm";
import {
  PROPERTIES,
  ROOMMATES,
  percorsoDettaglio,
  secondi,
} from "../utils/helpers";

const ordina = (lista) =>
  [...lista].sort((a, b) => secondi(b.createdAt) - secondi(a.createdAt));

function MieiAnnunci() {
  // vista: "" | "scelta" | "casa" | "coinquilini" | "offro" | "cerco" | "modifica"
  const [vista, setVista] = useState("");
  const [modifica, setModifica] = useState(null); // { annuncio, tipo }

  const [immobili, setImmobili] = useState([]);
  const [coinquilini, setCoinquilini] = useState([]);
  const [richieste, setRichieste] = useState([]);

  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState("");
  const [feedback, setFeedback] = useState("");

  const carica = useCallback(async () => {
    const uid = auth.currentUser.uid;

    try {
      const [a, b, c] = await Promise.all([
        getDocs(query(collection(db, PROPERTIES), where("ownerId", "==", uid))),
        getDocs(query(collection(db, ROOMMATES), where("ownerId", "==", uid))),
        getDocs(query(collection(db, "contactRequests"), where("toId", "==", uid))),
      ]);

      const mappa = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      setImmobili(ordina(mappa(a)));
      setCoinquilini(ordina(mappa(b)));
      setRichieste(ordina(mappa(c)));
      setErrore("");
    } catch (error) {
      console.error(error);
      setErrore("Impossibile caricare i tuoi annunci. Riprova tra poco.");
    } finally {
      setCaricamento(false);
    }
  }, []);

  useEffect(() => {
    carica();
  }, [carica]);

  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(""), 4000);
    return () => clearTimeout(t);
  }, [feedback]);

  const chiudiForm = () => {
    setVista("");
    setModifica(null);
  };

  const salvato = (messaggio) => {
    chiudiForm();
    setFeedback(messaggio);
    carica();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const elimina = async (id, tipo) => {
    if (!window.confirm("Sei sicuro di voler eliminare questo annuncio?")) return;

    try {
      await deleteDoc(doc(db, tipo, id));
      setFeedback("Annuncio eliminato.");
      carica();
    } catch (error) {
      console.error(error);
      setErrore("Eliminazione non riuscita.");
    }
  };

  const cambiaStato = async (id, tipo, nuovoStato) => {
    try {
      await updateDoc(doc(db, tipo, id), { status: nuovoStato });
      carica();
    } catch (error) {
      console.error(error);
      setErrore("Cambio di stato non riuscito.");
    }
  };

  const rimuoviRichiesta = async (id) => {
    try {
      await deleteDoc(doc(db, "contactRequests", id));
      setRichieste((r) => r.filter((x) => x.id !== id));
    } catch (error) {
      console.error(error);
      setErrore("Impossibile rimuovere la richiesta.");
    }
  };

  const avviaModifica = (annuncio, tipo) => {
    setModifica({ annuncio, tipo });
    setVista("modifica");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderLista = (lista, tipo) =>
    lista.length === 0 ? (
      <p className="tenue">Nessun annuncio pubblicato.</p>
    ) : (
      <div className="griglia-annunci">
        {lista.map((a) => (
          <ListingCard key={a.id} annuncio={a} tipo={tipo}>
            <button
              type="button"
              className="btn btn--sec"
              onClick={() => avviaModifica(a, tipo)}
            >
              ✏ Modifica
            </button>

            {a.status === "active" ? (
              <button
                type="button"
                className="btn btn--sec"
                onClick={() => cambiaStato(a.id, tipo, "inactive")}
              >
                🔴 Non disponibile
              </button>
            ) : (
              <button
                type="button"
                className="btn btn--sec"
                onClick={() => cambiaStato(a.id, tipo, "active")}
              >
                🟢 Disponibile
              </button>
            )}

            <button
              type="button"
              className="btn btn--pericolo"
              onClick={() => elimina(a.id, tipo)}
            >
              🗑 Elimina
            </button>
          </ListingCard>
        ))}
      </div>
    );

  return (
    <PageContainer>
      <h1 className="titolo-pagina">📋 I Miei Annunci</h1>

      {feedback && <p className="alert alert--ok">{feedback}</p>}
      {errore && <p className="alert alert--errore">{errore}</p>}

      {!vista && (
        <button
          type="button"
          className="btn btn--primario"
          onClick={() => setVista("scelta")}
        >
          ➕ Nuovo Annuncio
        </button>
      )}

      {vista === "scelta" && (
        <div className="scheda">
          <h3>Che tipo di annuncio vuoi pubblicare?</h3>
          <div className="form-azioni">
            <button type="button" className="btn btn--primario" onClick={() => setVista("casa")}>
              🏠 Casa / Appartamento
            </button>
            <button type="button" className="btn btn--primario" onClick={() => setVista("coinquilini")}>
              👥 Coinquilini
            </button>
            <button type="button" className="btn btn--sec" onClick={chiudiForm}>
              Annulla
            </button>
          </div>
        </div>
      )}

      {vista === "coinquilini" && (
        <div className="scheda">
          <h3>👥 Annuncio Coinquilini</h3>
          <div className="form-azioni">
            <button type="button" className="btn btn--primario" onClick={() => setVista("offro")}>
              📢 Offro posto letto
            </button>
            <button type="button" className="btn btn--primario" onClick={() => setVista("cerco")}>
              🔎 Cerco posto letto
            </button>
            <button type="button" className="btn btn--sec" onClick={chiudiForm}>
              Annulla
            </button>
          </div>
        </div>
      )}

      {vista === "casa" && (
        <AnnuncioForm
          key="nuovo-casa"
          tipo={PROPERTIES}
          onSaved={salvato}
          onCancel={chiudiForm}
        />
      )}

      {(vista === "offro" || vista === "cerco") && (
        <AnnuncioForm
          key={`nuovo-${vista}`}
          tipo={ROOMMATES}
          roommateType={vista}
          onSaved={salvato}
          onCancel={chiudiForm}
        />
      )}

      {vista === "modifica" && modifica && (
        <AnnuncioForm
          key={modifica.annuncio.id}
          tipo={modifica.tipo}
          iniziale={modifica.annuncio}
          onSaved={salvato}
          onCancel={chiudiForm}
        />
      )}

      <section className="sezione">
        <h2 className="sezione__titolo">
          📨 Richieste di contatto ({richieste.length})
        </h2>

        {caricamento ? null : richieste.length === 0 ? (
          <p className="tenue">Nessuna richiesta ricevuta.</p>
        ) : (
          <ul className="richieste">
            {richieste.map((r) => (
              <li className="scheda richiesta" key={r.id}>
                <div>
                  <strong>
                    <Link to={`/utente/${r.fromId}`}>{r.fromName || "Utente"}</Link>
                  </strong>{" "}
                  è interessato a{" "}
                  <Link to={percorsoDettaglio(r.listingType, r.listingId)}>
                    {r.listingTitle || "il tuo annuncio"}
                  </Link>
                  <br />
                  {r.fromEmail && (
                    <a href={`mailto:${r.fromEmail}`}>✉ {r.fromEmail}</a>
                  )}
                  {r.createdAt?.toDate && (
                    <small className="tenue">
                      {" · "}
                      {r.createdAt.toDate().toLocaleDateString("it-IT")}
                    </small>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn--sec btn--piccolo"
                  onClick={() => rimuoviRichiesta(r.id)}
                >
                  Rimuovi
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {caricamento ? (
        <p className="caricamento">Caricamento annunci...</p>
      ) : (
        <>
          <section className="sezione">
            <h2 className="sezione__titolo">🏠 Annunci Immobili</h2>
            {renderLista(immobili, PROPERTIES)}
          </section>

          <section className="sezione">
            <h2 className="sezione__titolo">👥 Annunci Coinquilini</h2>
            {renderLista(coinquilini, ROOMMATES)}
          </section>
        </>
      )}
    </PageContainer>
  );
}

export default MieiAnnunci;