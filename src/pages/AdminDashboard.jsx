import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { auth, db } from "../firebase";
import PageContainer from "../components/PageContainer";
import useUtente from "../hooks/useUtente";
import {
  PROPERTIES,
  ROOMMATES,
  percorsoDettaglio,
  secondi,
} from "../utils/helpers";

const TABS = [
  ["panoramica", "📊 Panoramica"],
  ["impostazioni", "⚙️ Impostazioni"],
  ["utenti", "👤 Utenti"],
  ["annunci", "🏠 Annunci"],
  ["segnalazioni", "🚩 Segnalazioni"],
  ["chat", "💬 Chat"],
];

const CONTATORI = [
  ["users", "👤 Utenti"],
  ["properties", "🏠 Annunci casa"],
  ["roommateAds", "👥 Annunci coinquilini"],
  ["contactRequests", "📨 Richieste di contatto"],
  ["reports", "🚩 Segnalazioni"],
  ["chatMessages", "💬 Messaggi in chat"],
];

function useRaccolta(nome, massimo = 300) {
  const [dati, setDati] = useState([]);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState("");

  const ricarica = useCallback(async () => {
    try {
      const snap = await getDocs(query(collection(db, nome), limit(massimo)));
      setDati(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setErrore("");
    } catch (error) {
      console.error(error);
      setErrore("Impossibile caricare i dati.");
    } finally {
      setCaricamento(false);
    }
  }, [nome, massimo]);

  useEffect(() => {
    ricarica();
  }, [ricarica]);

  return { dati, setDati, caricamento, errore, ricarica };
}

function Stato({ caricamento, errore, children }) {
  if (caricamento) return <p className="caricamento">Caricamento...</p>;
  if (errore) return <p className="alert alert--errore">{errore}</p>;
  return children;
}

const nomeUtente = (u) =>
  u ? `${u.firstName || ""} ${u.lastName || ""}`.trim() || "Senza nome" : "Utente sconosciuto";

/* ---------- Panoramica ---------- */
function Panoramica() {
  const [conteggi, setConteggi] = useState(null);
  const [errore, setErrore] = useState("");

  useEffect(() => {
    let attivo = true;

    Promise.all(
      CONTATORI.map(([nome]) =>
        getCountFromServer(collection(db, nome)).then((s) => s.data().count)
      )
    )
      .then((v) => attivo && setConteggi(v))
      .catch((error) => {
        console.error(error);
        if (attivo) setErrore("Impossibile calcolare le statistiche.");
      });

    return () => {
      attivo = false;
    };
  }, []);

  return (
    <Stato caricamento={!conteggi && !errore} errore={errore}>
      <div className="admin-statistiche">
        {CONTATORI.map(([nome, etichetta], i) => (
          <div className="scheda stat" key={nome}>
            <strong>{conteggi?.[i]}</strong>
            <span>{etichetta}</span>
          </div>
        ))}
      </div>
    </Stato>
  );
}

/* ---------- Impostazioni ---------- */
function Impostazioni() {
  const [imp, setImp] = useState({
    chatEnabled: true,
    chatWriteMode: "all",
    annunciInChat: true,
    avviso: "",
  });
  const [caricamento, setCaricamento] = useState(true);
  const [salvataggio, setSalvataggio] = useState(false);
  const [messaggio, setMessaggio] = useState("");
  const [errore, setErrore] = useState("");

  useEffect(() => {
    getDoc(doc(db, "settings", "community"))
      .then((snap) => {
        if (snap.exists()) setImp((p) => ({ ...p, ...snap.data() }));
      })
      .catch((error) => {
        console.error(error);
        setErrore("Impossibile caricare le impostazioni.");
      })
      .finally(() => setCaricamento(false));
  }, []);

  const salva = async () => {
    setSalvataggio(true);
    setMessaggio("");
    setErrore("");

    try {
      await setDoc(
        doc(db, "settings", "community"),
        { ...imp, updatedAt: serverTimestamp() },
        { merge: true }
      );
      setMessaggio("Impostazioni salvate.");
    } catch (error) {
      console.error(error);
      setErrore("Salvataggio non riuscito.");
    } finally {
      setSalvataggio(false);
    }
  };

  return (
    <Stato caricamento={caricamento} errore="">
      <div className="scheda">
        <h3>💬 Chat community</h3>

        <label className="check">
          <input
            type="checkbox"
            checked={imp.chatEnabled !== false}
            onChange={(e) => setImp((p) => ({ ...p, chatEnabled: e.target.checked }))}
          />
          Chat attiva (se disattivata, gli utenti non possono scrivere)
        </label>

        <div className="campo">
          <label htmlFor="imp-modo">Chi può scrivere</label>
          <select
            id="imp-modo"
            value={imp.chatWriteMode || "all"}
            onChange={(e) => setImp((p) => ({ ...p, chatWriteMode: e.target.value }))}
          >
            <option value="all">Tutti gli utenti</option>
            <option value="admin">Solo gli admin</option>
          </select>
        </div>

        <label className="check">
          <input
            type="checkbox"
            checked={imp.annunciInChat !== false}
            onChange={(e) => setImp((p) => ({ ...p, annunciInChat: e.target.checked }))}
          />
          Pubblica in chat i nuovi annunci e quelli riattivati
        </label>

        <div className="campo">
          <label htmlFor="imp-avviso">Avviso fissato in cima alla chat</label>
          <textarea
            id="imp-avviso"
            maxLength={300}
            value={imp.avviso || ""}
            onChange={(e) => setImp((p) => ({ ...p, avviso: e.target.value }))}
          />
        </div>

        {messaggio && <p className="alert alert--ok">{messaggio}</p>}
        {errore && <p className="alert alert--errore">{errore}</p>}

        <button type="button" className="btn btn--primario" onClick={salva} disabled={salvataggio}>
          {salvataggio ? "Salvataggio..." : "Salva impostazioni"}
        </button>
      </div>
    </Stato>
  );
}

/* ---------- Utenti ---------- */
function Utenti({ racc }) {
  const { dati, setDati, caricamento, errore } = racc;
  const [cerca, setCerca] = useState("");
  const io = auth.currentUser.uid;

  const aggiorna = async (u, campi) => {
    try {
      await updateDoc(doc(db, "users", u.id), campi);
      setDati((lista) => lista.map((x) => (x.id === u.id ? { ...x, ...campi } : x)));
    } catch (error) {
      console.error(error);
      alert("Operazione non riuscita.");
    }
  };

  const lista = dati
    .filter((u) => nomeUtente(u).toLowerCase().includes(cerca.toLowerCase()))
    .sort((a, b) => secondi(b.memberSince) - secondi(a.memberSince));

  return (
    <Stato caricamento={caricamento} errore={errore}>
      <input
        type="search"
        placeholder="🔍 Cerca utente per nome"
        value={cerca}
        onChange={(e) => setCerca(e.target.value)}
      />

      <p className="tenue">{lista.length} utenti</p>

      {lista.map((u) => (
        <div className="scheda admin-riga" key={u.id}>
          <div>
            <strong>{nomeUtente(u)}</strong>{" "}
            {u.role === "admin" && <span className="badge">🛡 Admin</span>}{" "}
            {u.verified && <span className="badge badge--approved">✅ Verificato</span>}{" "}
            {u.banned && <span className="badge badge--rejected">🚫 Sospeso</span>}{" "}
            {u.chatMuted && <span className="badge badge--pending">🔇 Silenziato</span>}
            <br />
            <small className="tenue">
              🚩 {u.reportsCount || 0} segnalazioni ·{" "}
              {u.occupation || "occupazione non indicata"}
              {u.onboardingCompleted ? "" : " · profilo da completare"}
            </small>
          </div>

          <div className="form-azioni">
            <button
              type="button"
              className="btn btn--sec btn--piccolo"
              onClick={() => aggiorna(u, { verified: !u.verified })}
            >
              {u.verified ? "Rimuovi verifica" : "✅ Verifica"}
            </button>

            <button
              type="button"
              className="btn btn--sec btn--piccolo"
              onClick={() => aggiorna(u, { chatMuted: !u.chatMuted })}
            >
              {u.chatMuted ? "🔊 Riattiva chat" : "🔇 Silenzia"}
            </button>

            {u.id !== io && (
              <>
                <button
                  type="button"
                  className="btn btn--sec btn--piccolo"
                  onClick={() =>
                    aggiorna(u, { role: u.role === "admin" ? "user" : "admin" })
                  }
                >
                  {u.role === "admin" ? "Togli admin" : "🛡 Rendi admin"}
                </button>

                <button
                  type="button"
                  className={"btn btn--piccolo " + (u.banned ? "btn--sec" : "btn--pericolo")}
                  onClick={() => aggiorna(u, { banned: !u.banned })}
                >
                  {u.banned ? "Riattiva account" : "🚫 Sospendi"}
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </Stato>
  );
}

/* ---------- Annunci ---------- */
function AnnunciAdmin({ utenti }) {
  const case_ = useRaccolta(PROPERTIES);
  const coinq = useRaccolta(ROOMMATES);

  const lista = [
    ...case_.dati.map((a) => ({ ...a, _tipo: PROPERTIES })),
    ...coinq.dati.map((a) => ({ ...a, _tipo: ROOMMATES })),
  ].sort((a, b) => secondi(b.createdAt) - secondi(a.createdAt));

  const aggiorna = async (a, campi) => {
    try {
      await updateDoc(doc(db, a._tipo, a.id), campi);
      const setter = a._tipo === PROPERTIES ? case_.setDati : coinq.setDati;
      setter((l) => l.map((x) => (x.id === a.id ? { ...x, ...campi } : x)));
    } catch (error) {
      console.error(error);
      alert("Operazione non riuscita.");
    }
  };

  const elimina = async (a) => {
    if (!window.confirm(`Eliminare definitivamente "${a.title}"?`)) return;
    try {
      await deleteDoc(doc(db, a._tipo, a.id));
      const setter = a._tipo === PROPERTIES ? case_.setDati : coinq.setDati;
      setter((l) => l.filter((x) => x.id !== a.id));
    } catch (error) {
      console.error(error);
      alert("Eliminazione non riuscita.");
    }
  };

  return (
    <Stato
      caricamento={case_.caricamento || coinq.caricamento}
      errore={case_.errore || coinq.errore}
    >
      <p className="tenue">{lista.length} annunci</p>

      {lista.map((a) => (
        <div className="scheda admin-riga" key={`${a._tipo}-${a.id}`}>
          <div>
            <strong>{a.title}</strong>{" "}
            <span className="badge">
              {a._tipo === ROOMMATES
                ? a.roommateType === "cerco"
                  ? "🔎 Cerco posto letto"
                  : "📢 Offro posto letto"
                : "🏠 Casa"}
            </span>
            <br />
            <small className="tenue">
              ID #{a.publicId} · di {nomeUtente(utenti[a.ownerId])} ·{" "}
              <span className={a.status === "active" ? "stato stato--attivo" : "stato stato--off"}>
                {a.status === "active" ? "ATTIVO" : "NON DISPONIBILE"}
              </span>
              {a.verified ? " · ✅ verificato" : ""}
            </small>
            <br />
            <Link to={percorsoDettaglio(a._tipo, a.id)}>Apri annuncio</Link>
          </div>

          <div className="form-azioni">
            <button
              type="button"
              className="btn btn--sec btn--piccolo"
              onClick={() => aggiorna(a, { verified: !a.verified })}
            >
              {a.verified ? "Rimuovi verifica" : "✅ Verifica"}
            </button>
            <button
              type="button"
              className="btn btn--sec btn--piccolo"
              onClick={() =>
                aggiorna(a, { status: a.status === "active" ? "inactive" : "active" })
              }
            >
              {a.status === "active" ? "🔴 Sospendi" : "🟢 Riattiva"}
            </button>
            <button
              type="button"
              className="btn btn--pericolo btn--piccolo"
              onClick={() => elimina(a)}
            >
              🗑 Elimina
            </button>
          </div>
        </div>
      ))}
    </Stato>
  );
}

/* ---------- Segnalazioni ---------- */
function Segnalazioni({ utenti }) {
  const { dati, setDati, caricamento, errore } = useRaccolta("reports");
  const [soloAperte, setSoloAperte] = useState(true);

  const lista = dati
    .filter((r) => !soloAperte || (r.status || "open") === "open")
    .sort((a, b) => secondi(b.createdAt) - secondi(a.createdAt));

  const segna = async (r, status) => {
    try {
      await updateDoc(doc(db, "reports", r.id), { status });
      setDati((l) => l.map((x) => (x.id === r.id ? { ...x, status } : x)));
    } catch (error) {
      console.error(error);
      alert("Operazione non riuscita.");
    }
  };

  const eliminaReport = async (r) => {
    try {
      await deleteDoc(doc(db, "reports", r.id));
      setDati((l) => l.filter((x) => x.id !== r.id));
    } catch (error) {
      console.error(error);
      alert("Operazione non riuscita.");
    }
  };

  const sospendiAnnuncio = async (r) => {
    try {
      await updateDoc(doc(db, r.listingType, r.listingId), { status: "inactive" });
      await segna(r, "resolved");
      alert("Annuncio sospeso e segnalazione chiusa.");
    } catch (error) {
      console.error(error);
      alert("Annuncio non trovato o operazione non riuscita.");
    }
  };

  const eliminaAnnuncio = async (r) => {
    if (!window.confirm("Eliminare definitivamente l'annuncio segnalato?")) return;
    try {
      await deleteDoc(doc(db, r.listingType, r.listingId));
      await segna(r, "resolved");
      alert("Annuncio eliminato e segnalazione chiusa.");
    } catch (error) {
      console.error(error);
      alert("Operazione non riuscita.");
    }
  };

  return (
    <Stato caricamento={caricamento} errore={errore}>
      <label className="check">
        <input
          type="checkbox"
          checked={soloAperte}
          onChange={(e) => setSoloAperte(e.target.checked)}
        />
        Mostra solo le segnalazioni aperte
      </label>

      {lista.length === 0 && <p className="tenue">Nessuna segnalazione.</p>}

      {lista.map((r) => (
        <div className="scheda" key={r.id}>
          <div className="admin-riga">
            <div>
              <strong>🚩 {r.reason}</strong>{" "}
              <span
                className={
                  "badge " + ((r.status || "open") === "open" ? "badge--pending" : "badge--approved")
                }
              >
                {(r.status || "open") === "open" ? "Aperta" : "Risolta"}
              </span>
              <br />
              <small className="tenue">
                Annuncio: {r.listingTitle || r.listingId} · segnalato da{" "}
                {nomeUtente(utenti[r.reporterId])} · proprietario{" "}
                {nomeUtente(utenti[r.ownerId])}
              </small>
              {r.details && <p className="richiesta__intro">“{r.details}”</p>}
              <Link to={percorsoDettaglio(r.listingType, r.listingId)}>Apri annuncio</Link>
            </div>
          </div>

          <div className="form-azioni">
            {(r.status || "open") === "open" ? (
              <button type="button" className="btn btn--primario btn--piccolo" onClick={() => segna(r, "resolved")}>
                ✔ Segna risolta
              </button>
            ) : (
              <button type="button" className="btn btn--sec btn--piccolo" onClick={() => segna(r, "open")}>
                Riapri
              </button>
            )}
            <button type="button" className="btn btn--sec btn--piccolo" onClick={() => sospendiAnnuncio(r)}>
              🔴 Sospendi annuncio
            </button>
            <button type="button" className="btn btn--pericolo btn--piccolo" onClick={() => eliminaAnnuncio(r)}>
              🗑 Elimina annuncio
            </button>
            <button type="button" className="btn btn--sec btn--piccolo" onClick={() => eliminaReport(r)}>
              Elimina segnalazione
            </button>
          </div>
        </div>
      ))}
    </Stato>
  );
}

/* ---------- Chat ---------- */
function ChatAdmin({ utenti }) {
  const { dati, setDati, caricamento, errore } = useRaccolta("chatMessages", 100);

  const lista = [...dati].sort((a, b) => secondi(b.createdAt) - secondi(a.createdAt));

  const elimina = async (m) => {
    try {
      await deleteDoc(doc(db, "chatMessages", m.id));
      setDati((l) => l.filter((x) => x.id !== m.id));
    } catch (error) {
      console.error(error);
      alert("Eliminazione non riuscita.");
    }
  };

  return (
    <Stato caricamento={caricamento} errore={errore}>
      <p className="tenue">Ultimi {lista.length} messaggi</p>

      {lista.map((m) => (
        <div className="scheda admin-riga" key={m.id}>
          <div>
            <small className="tenue">
              {m.type === "listing" ? "🏠 Messaggio di servizio" : nomeUtente(utenti[m.senderId])}
              {m.createdAt?.toDate ? ` · ${m.createdAt.toDate().toLocaleString("it-IT")}` : ""}
            </small>
            <br />
            {m.text}
          </div>
          <button type="button" className="btn btn--pericolo btn--piccolo" onClick={() => elimina(m)}>
            🗑 Elimina
          </button>
        </div>
      ))}
    </Stato>
  );
}

/* ---------- Pagina ---------- */
function AdminDashboard() {
  const { isAdmin, caricamento } = useUtente();
  const [tab, setTab] = useState("panoramica");
  const utentiRacc = useRaccolta("users", 500);

  const utenti = Object.fromEntries(utentiRacc.dati.map((u) => [u.id, u]));

  if (caricamento) {
    return (
      <PageContainer>
        <p className="caricamento">Caricamento...</p>
      </PageContainer>
    );
  }

  if (!isAdmin) {
    return (
      <PageContainer>
        <div className="vuoto">
          <p>🔒 Area riservata agli amministratori.</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <h1 className="titolo-pagina">🛡 Dashboard community</h1>

      <div className="tabs tabs--scroll" role="tablist">
        {TABS.map(([chiave, etichetta]) => (
          <button
            type="button"
            key={chiave}
            role="tab"
            aria-selected={tab === chiave}
            className={"tab" + (tab === chiave ? " is-attiva" : "")}
            onClick={() => setTab(chiave)}
          >
            {etichetta}
          </button>
        ))}
      </div>

      {tab === "panoramica" && <Panoramica />}
      {tab === "impostazioni" && <Impostazioni />}
      {tab === "utenti" && <Utenti racc={utentiRacc} />}
      {tab === "annunci" && <AnnunciAdmin utenti={utenti} />}
      {tab === "segnalazioni" && <Segnalazioni utenti={utenti} />}
      {tab === "chat" && <ChatAdmin utenti={utenti} />}
    </PageContainer>
  );
}

export default AdminDashboard;