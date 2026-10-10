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
import ListingCard from "../components/ListingCard";
import AnnuncioForm from "../components/AnnuncioForm";
import { decidiRichiesta, pubblicaInChat } from "../services/annunci";
import {
  PROPERTIES,
  ROOMMATES,
  percorsoDettaglio,
  secondi,
} from "../utils/helpers";

const ordina = (lista) =>
  [...lista].sort((a, b) => secondi(b.createdAt) - secondi(a.createdAt));

const ETICHETTE_STATO = {
  pending: "⏳ In attesa",
  approved: "✅ Approvata",
  rejected: "❌ Non accettata",
};

function MieiAnnunci() {
  // vista: "" | "scelta" | "casa" | "coinquilini" | "offro" | "cerco" | "modifica"
  const [vista, setVista] = useState("");
  const [modifica, setModifica] = useState(null); // { annuncio, tipo }

  const [immobili, setImmobili] = useState([]);
  const [coinquilini, setCoinquilini] = useState([]);
  const [ricevute, setRicevute] = useState([]);
  const [inviate, setInviate] = useState([]);

  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [inElaborazione, setInElaborazione] = useState("");

  const carica = useCallback(async () => {
    const uid = auth.currentUser.uid;

    try {
      const [a, b, c, d] = await Promise.all([
        getDocs(query(collection(db, PROPERTIES), where("ownerId", "==", uid))),
        getDocs(query(collection(db, ROOMMATES), where("ownerId", "==", uid))),
        getDocs(query(collection(db, "contactRequests"), where("toId", "==", uid))),
        getDocs(query(collection(db, "contactRequests"), where("fromId", "==", uid))),
      ]);

      const mappa = (snap) => snap.docs.map((x) => ({ id: x.id, ...x.data() }));

      setImmobili(ordina(mappa(a)));
      setCoinquilini(ordina(mappa(b)));
      setRicevute(ordina(mappa(c)));
      setInviate(ordina(mappa(d)));
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

  const cambiaStato = async (annuncio, tipo, nuovoStato) => {
    try {
      await updateDoc(doc(db, tipo, annuncio.id), { status: nuovoStato });
      if (nuovoStato === "active") {
        await pubblicaInChat(annuncio, tipo, "reactivated");
      }
      carica();
    } catch (error) {
      console.error(error);
      setErrore("Cambio di stato non riuscito.");
    }
  };

  const decidi = async (richiesta, approva) => {
    setInElaborazione(richiesta.id);
    try {
      await decidiRichiesta(richiesta, approva);
      setRicevute((lista) =>
        lista.map((r) =>
          r.id === richiesta.id
            ? { ...r, status: approva ? "approved" : "rejected" }
            : r
        )
      );
      setFeedback(
        approva
          ? "Richiesta approvata: ora vedi il contatto."
          : "Richiesta rifiutata."
      );
    } catch (error) {
      console.error(error);
      setErrore("Operazione non riuscita, riprova.");
    } finally {
      setInElaborazione("");
    }
  };

  const rimuoviRichiesta = async (id) => {
    try {
      await deleteDoc(doc(db, "contactRequests", id));
      setRicevute((r) => r.filter((x) => x.id !== id));
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

  const inAttesa = ricevute.filter((r) => (r.status || "pending") === "pending");

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
                onClick={() => cambiaStato(a, tipo, "inactive")}
              >
                🔴 Non disponibile
              </button>
            ) : (
              <button
                type="button"
                className="btn btn--sec"
                onClick={() => cambiaStato(a, tipo, "active")}
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
          📨 Richieste di contatto ({inAttesa.length} in attesa)
        </h2>

        {caricamento ? null : ricevute.length === 0 ? (
          <p className="tenue">Nessuna richiesta ricevuta.</p>
        ) : (
          <ul className="richieste">
            {ricevute.map((r) => {
              const stato = r.status || "pending";
              return (
                <li className="scheda richiesta" key={r.id}>
                  <div className="richiesta__corpo">
                    <strong>
                      <Link to={`/utente/${r.fromId}`}>{r.fromName || "Utente"}</Link>
                    </strong>{" "}
                    per{" "}
                    <Link to={percorsoDettaglio(r.listingType, r.listingId)}>
                      {r.listingTitle || "il tuo annuncio"}
                    </Link>{" "}
                    <span className={`badge badge--${stato}`}>
                      {ETICHETTE_STATO[stato]}
                    </span>
                    {r.intro && <p className="richiesta__intro">“{r.intro}”</p>}

                    {stato === "approved" && (
                      <p className="richiesta__contatto">
                        {r.fromPhone && (
                          <>
                            📞 <a href={`tel:${r.fromPhone}`}>{r.fromPhone}</a>
                          </>
                        )}
                        {r.fromEmail && (
                          <>
                            {r.fromPhone ? " · " : ""}✉{" "}
                            <a href={`mailto:${r.fromEmail}`}>{r.fromEmail}</a>
                          </>
                        )}
                      </p>
                    )}
                  </div>

                  <div className="form-azioni">
                    {stato === "pending" ? (
                      <>
                        <button
                          type="button"
                          className="btn btn--primario btn--piccolo"
                          disabled={inElaborazione === r.id}
                          onClick={() => decidi(r, true)}
                        >
                          ✅ Approva
                        </button>
                        <button
                          type="button"
                          className="btn btn--pericolo btn--piccolo"
                          disabled={inElaborazione === r.id}
                          onClick={() => decidi(r, false)}
                        >
                          ❌ Rifiuta
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn btn--sec btn--piccolo"
                        onClick={() => rimuoviRichiesta(r.id)}
                      >
                        Rimuovi
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="sezione">
        <h2 className="sezione__titolo">📤 Richieste inviate ({inviate.length})</h2>

        {caricamento ? null : inviate.length === 0 ? (
          <p className="tenue">Non hai ancora inviato richieste.</p>
        ) : (
          <ul className="richieste">
            {inviate.map((r) => {
              const stato = r.status || "pending";
              return (
                <li className="scheda richiesta" key={r.id}>
                  <div className="richiesta__corpo">
                    <Link to={percorsoDettaglio(r.listingType, r.listingId)}>
                      {r.listingTitle || "Annuncio"}
                    </Link>{" "}
                    <span className={`badge badge--${stato}`}>
                      {ETICHETTE_STATO[stato]}
                    </span>
                    {stato === "approved" && (
                      <p className="tenue">
                        Il proprietario ha ricevuto il tuo contatto e ti
                        scriverà o chiamerà.
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
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