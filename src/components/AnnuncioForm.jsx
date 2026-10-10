import { useState } from "react";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { auth, db } from "../firebase";
import PhotoUploader from "./PhotoUploader";
import {
  notificaModificaAnnuncio,
  pubblicaInChat,
} from "../services/annunci";
import {
  DURATE,
  GENERE_PERSONA,
  GENERI,
  OCCUPAZIONE_PERSONA,
  OCCUPAZIONI,
  ROOMMATES,
  TIPOLOGIE,
  ZONE,
  generaPublicId,
} from "../utils/helpers";

const VUOTO = {
  title: "",
  description: "",
  monthlyPrice: "",
  expensesExcluded: false,
  expensesAmount: "",
  deposit: "",
  availableFrom: "",
  zone: "",
  subzone: "",
  propertyType: "Camera singola",
  genderPreference: "Indifferente",
  occupationPreference: "Studenti e lavoratori",
  durationPreference: "Indifferente",
  petsAllowed: false,
  smokersAllowed: false,
};

const OCC_PREFERENZA = {
  Studente: "Solo studenti",
  Lavoratore: "Solo lavoratori",
  "Studente lavoratore": "Studenti e lavoratori",
};

function daIniziale(a) {
  if (!a) return VUOTO;
  return {
    ...VUOTO,
    title: a.title || "",
    description: a.description || "",
    monthlyPrice: a.monthlyPrice ?? "",
    expensesExcluded: !!a.expensesExcluded,
    expensesAmount: a.expensesAmount || "",
    deposit: a.deposit || "",
    availableFrom: a.availableFrom || "",
    zone: a.zone || "",
    subzone: a.subzone || "",
    propertyType: a.propertyType || VUOTO.propertyType,
    genderPreference: a.genderPreference || VUOTO.genderPreference,
    occupationPreference: a.occupationPreference || VUOTO.occupationPreference,
    durationPreference: a.durationPreference || VUOTO.durationPreference,
    petsAllowed: !!a.petsAllowed,
    smokersAllowed: !!a.smokersAllowed,
  };
}

function Domanda({ titolo, nascosto, onNascondi, children }) {
  return (
    <div className="domanda">
      <div className="domanda__titolo">{titolo}</div>
      <div className="chips">{children}</div>
      <label className="check domanda__nascondi">
        <input
          type="checkbox"
          checked={nascosto}
          onChange={(e) => onNascondi(e.target.checked)}
        />
        🙈 Non mostrare nell'annuncio
      </label>
    </div>
  );
}

function Chip({ attivo, onClick, children }) {
  return (
    <button
      type="button"
      className={"chip" + (attivo ? " attivo" : "")}
      aria-pressed={attivo}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// tipo: "properties" | "roommateAds". roommateType: "offro" | "cerco"
function AnnuncioForm({ tipo, roommateType, iniziale, onSaved, onCancel }) {
  const modifica = Boolean(iniziale);
  const tipoCoinquilino = iniziale?.roommateType || roommateType;
  const cerco = tipo === ROOMMATES && tipoCoinquilino === "cerco";

  const [f, setF] = useState(() => daIniziale(iniziale));
  const [photos, setPhotos] = useState(() => iniziale?.photos || []);
  const [tipologie, setTipologie] = useState(() =>
    iniziale?.propertyTypes?.length
      ? iniziale.propertyTypes
      : iniziale?.propertyType && cerco
      ? [iniziale.propertyType]
      : []
  );
  const [chi, setChi] = useState(() => ({
    gender: iniziale?.selfInfo?.gender || "",
    occupation: iniziale?.selfInfo?.occupation || "",
    smoker: !!iniziale?.selfInfo?.smoker,
    pets: !!iniziale?.selfInfo?.pets,
  }));
  const [nascosti, setNascosti] = useState(() => iniziale?.hiddenFields || []);
  const [caricandoFoto, setCaricandoFoto] = useState(false);
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState("");

  const campo = (k) => ({
    value: f[k],
    onChange: (e) => setF((p) => ({ ...p, [k]: e.target.value })),
  });
  const check = (k) => ({
    checked: f[k],
    onChange: (e) => setF((p) => ({ ...p, [k]: e.target.checked })),
  });

  const nascondi = (nome, valore) =>
    setNascosti((p) =>
      valore ? [...new Set([...p, nome])] : p.filter((x) => x !== nome)
    );

  const cambiaTipologia = (t) =>
    setTipologie((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  const salva = async (e) => {
    e.preventDefault();
    setErrore("");

    if (!f.title.trim()) return setErrore("Inserisci il titolo dell'annuncio.");
    if (!f.description.trim()) return setErrore("Inserisci una descrizione.");
    if (!(Number(f.monthlyPrice) > 0))
      return setErrore(cerco ? "Inserisci il budget mensile." : "Inserisci il canone mensile.");
    if (!cerco && f.expensesExcluded && !(Number(f.expensesAmount) > 0))
      return setErrore("Inserisci l'importo delle spese.");
    if (!f.zone) return setErrore("Seleziona una zona.");
    if (cerco && tipologie.length === 0)
      return setErrore("Seleziona almeno una tipologia di alloggio cercata.");
    if (cerco && !chi.gender) return setErrore("Indica se sei una ragazza o un ragazzo.");
    if (cerco && !chi.occupation) return setErrore("Indica se sei studente o lavoratore.");
    if (!f.availableFrom) return setErrore("Inserisci la prima disponibilità.");
    if (caricandoFoto) return setErrore("Attendi la fine del caricamento delle foto.");

    const dati = {
      title: f.title.trim(),
      description: f.description.trim(),
      monthlyPrice: Number(f.monthlyPrice),
      expensesExcluded: cerco ? false : f.expensesExcluded,
      expensesAmount:
        !cerco && f.expensesExcluded ? Number(f.expensesAmount) : 0,
      deposit: cerco ? 0 : Number(f.deposit || 0),
      availableFrom: f.availableFrom,
      zone: f.zone,
      subzone: f.subzone.trim(),
      propertyType: cerco ? tipologie.join(", ") : f.propertyType,
      genderPreference: f.genderPreference,
      occupationPreference: f.occupationPreference,
      durationPreference: f.durationPreference,
      petsAllowed: f.petsAllowed,
      smokersAllowed: f.smokersAllowed,
      photos,
    };

    if (cerco) {
      dati.propertyTypes = tipologie;
      dati.selfInfo = chi;
      dati.hiddenFields = nascosti;
      // Campi usati dai filtri: se nascosti non rivelano nulla
      dati.occupationPreference = nascosti.includes("occupation")
        ? "Studenti e lavoratori"
        : OCC_PREFERENZA[chi.occupation];
      dati.petsAllowed = chi.pets && !nascosti.includes("pets");
      dati.smokersAllowed = chi.smoker && !nascosti.includes("smoker");
    }

    setInvio(true);

    try {
      if (modifica) {
        await updateDoc(doc(db, tipo, iniziale.id), dati);
        await notificaModificaAnnuncio(iniziale.id, tipo, dati.title);
      } else {
        const ref = await addDoc(collection(db, tipo), {
          ...dati,
          ...(tipo === ROOMMATES ? { roommateType: tipoCoinquilino } : {}),
          ownerId: auth.currentUser.uid,
          publicId: generaPublicId(),
          status: "active",
          verified: false,
          reportsCount: 0,
          likes: 0,
          dislikes: 0,
          createdAt: serverTimestamp(),
        });

        await pubblicaInChat(
          {
            id: ref.id,
            ...dati,
            ...(tipo === ROOMMATES ? { roommateType: tipoCoinquilino } : {}),
          },
          tipo,
          "new"
        );
      }

      onSaved(modifica ? "Annuncio aggiornato!" : "Annuncio pubblicato!");
    } catch (error) {
      console.error(error);
      setErrore("Errore nel salvataggio: " + error.message);
      setInvio(false);
    }
  };

  const titoloForm = modifica
    ? "✏️ Modifica annuncio"
    : tipo === ROOMMATES
    ? cerco
      ? "🔎 Cerco posto letto"
      : "📢 Offro posto letto"
    : "🏠 Nuovo annuncio casa";

  return (
    <form
      className={"scheda form-annuncio" + (modifica ? " scheda--modifica" : "")}
      onSubmit={salva}
      noValidate
    >
      <h3>{titoloForm}</h3>

      <div className="campo">
        <label htmlFor="a-titolo">Titolo annuncio</label>
        <input id="a-titolo" type="text" {...campo("title")} maxLength={100} />
      </div>

      <div className="campo">
        <label htmlFor="a-desc">
          {cerco ? "Presentati e racconta cosa cerchi" : "Descrizione"}
        </label>
        <textarea id="a-desc" {...campo("description")} />
      </div>

      <div className="blocco">
        <h4>Prezzo</h4>

        <div className="campo">
          <label htmlFor="a-prezzo">
            {cerco ? "Budget mensile massimo (€)" : "Canone mensile (€)"}
          </label>
          <input id="a-prezzo" type="number" min="0" {...campo("monthlyPrice")} />
        </div>

        {!cerco && (
          <>
            <label className="check">
              <input type="checkbox" {...check("expensesExcluded")} />
              Spese NON incluse
            </label>

            {f.expensesExcluded && (
              <div className="campo">
                <label htmlFor="a-spese">Importo spese (€/mese)</label>
                <input id="a-spese" type="number" min="0" {...campo("expensesAmount")} />
              </div>
            )}

            <div className="campo">
              <label htmlFor="a-deposito">Deposito cauzionale (€)</label>
              <input id="a-deposito" type="number" min="0" {...campo("deposit")} />
            </div>
          </>
        )}
      </div>

      <div className="blocco">
        <h4>{cerco ? "Cosa cerco" : "Dove e quando"}</h4>

        <div className="griglia-campi">
          <div className="campo">
            <label htmlFor="a-zona">{cerco ? "Zona preferita" : "Zona"}</label>
            <select id="a-zona" {...campo("zone")}>
              <option value="">Seleziona zona</option>
              {ZONE.map((z) => (
                <option key={z}>{z}</option>
              ))}
            </select>
          </div>

          <div className="campo">
            <label htmlFor="a-sottozona">Sottozona</label>
            <input
              id="a-sottozona"
              type="text"
              placeholder="Es. Via Zamboni"
              {...campo("subzone")}
            />
          </div>

          {!cerco && (
            <div className="campo">
              <label htmlFor="a-tipologia">Tipologia alloggio</label>
              <select id="a-tipologia" {...campo("propertyType")}>
                {TIPOLOGIE.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
          )}

          <div className="campo">
            <label htmlFor="a-data">
              {cerco ? "Cerco a partire dal" : "Prima disponibilità"}
            </label>
            <input id="a-data" type="date" {...campo("availableFrom")} />
          </div>
        </div>

        {cerco && (
          <div className="campo">
            <label>Tipologie di alloggio che mi vanno bene (scegline più di una)</label>
            <div className="chips">
              {TIPOLOGIE.map((t) => (
                <Chip
                  key={t}
                  attivo={tipologie.includes(t)}
                  onClick={() => cambiaTipologia(t)}
                >
                  {tipologie.includes(t) ? "✓ " : ""}
                  {t}
                </Chip>
              ))}
            </div>
          </div>
        )}
      </div>

      {cerco && (
        <div className="blocco">
          <h4>🙋 Chi sono</h4>
          <p className="tenue">
            Queste informazioni riguardano te e aiutano chi offre il posto
            letto. Per ognuna puoi scegliere di non mostrarla nell'annuncio.
          </p>

          <Domanda
            titolo="Sei una ragazza o un ragazzo?"
            nascosto={nascosti.includes("gender")}
            onNascondi={(v) => nascondi("gender", v)}
          >
            {GENERE_PERSONA.map((g) => (
              <Chip
                key={g}
                attivo={chi.gender === g}
                onClick={() => setChi((p) => ({ ...p, gender: g }))}
              >
                {g}
              </Chip>
            ))}
          </Domanda>

          <Domanda
            titolo="Sei studente o lavoratore?"
            nascosto={nascosti.includes("occupation")}
            onNascondi={(v) => nascondi("occupation", v)}
          >
            {OCCUPAZIONE_PERSONA.map((o) => (
              <Chip
                key={o}
                attivo={chi.occupation === o}
                onClick={() => setChi((p) => ({ ...p, occupation: o }))}
              >
                {o}
              </Chip>
            ))}
          </Domanda>

          <Domanda
            titolo="Sei fumatore/fumatrice?"
            nascosto={nascosti.includes("smoker")}
            onNascondi={(v) => nascondi("smoker", v)}
          >
            <Chip attivo={chi.smoker} onClick={() => setChi((p) => ({ ...p, smoker: true }))}>
              Sì, fumo
            </Chip>
            <Chip attivo={!chi.smoker} onClick={() => setChi((p) => ({ ...p, smoker: false }))}>
              No, non fumo
            </Chip>
          </Domanda>

          <Domanda
            titolo="Hai animali con te?"
            nascosto={nascosti.includes("pets")}
            onNascondi={(v) => nascondi("pets", v)}
          >
            <Chip attivo={chi.pets} onClick={() => setChi((p) => ({ ...p, pets: true }))}>
              Sì, ho animali
            </Chip>
            <Chip attivo={!chi.pets} onClick={() => setChi((p) => ({ ...p, pets: false }))}>
              No, nessun animale
            </Chip>
          </Domanda>
        </div>
      )}

      <div className="blocco">
        <h4>{cerco ? "Preferenze sui coinquilini" : "Preferenze"}</h4>

        <div className="griglia-campi">
          <div className="campo">
            <label htmlFor="a-genere">
              {cerco ? "Coinquilini preferiti" : "Genere richiesto"}
            </label>
            <select id="a-genere" {...campo("genderPreference")}>
              {GENERI.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </div>

          {!cerco && (
            <div className="campo">
              <label htmlFor="a-occ">Occupazione preferita</label>
              <select id="a-occ" {...campo("occupationPreference")}>
                {OCCUPAZIONI.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
          )}

          <div className="campo">
            <label htmlFor="a-durata">Durata permanenza</label>
            <select id="a-durata" {...campo("durationPreference")}>
              {DURATE.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {!cerco && (
          <>
            <label className="check">
              <input type="checkbox" {...check("petsAllowed")} />
              🐶 Animali ammessi
            </label>

            <label className="check">
              <input type="checkbox" {...check("smokersAllowed")} />
              🚬 Fumatori ammessi
            </label>
          </>
        )}
      </div>

      <div className="blocco">
        <h4>Foto (facoltative)</h4>
        <PhotoUploader
          photos={photos}
          setPhotos={setPhotos}
          onBusy={setCaricandoFoto}
        />
      </div>

      {errore && <p className="alert alert--errore">{errore}</p>}

      <div className="form-azioni">
        <button
          type="submit"
          className="btn btn--primario"
          disabled={invio || caricandoFoto}
        >
          {invio ? "Salvataggio..." : modifica ? "💾 Salva modifiche" : "Pubblica"}
        </button>

        <button type="button" className="btn btn--sec" onClick={onCancel}>
          ❌ Annulla
        </button>
      </div>
    </form>
  );
}

export default AnnuncioForm;