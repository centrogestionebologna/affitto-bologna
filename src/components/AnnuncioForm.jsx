import { useState } from "react";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { auth, db } from "../firebase";
import PhotoUploader from "./PhotoUploader.jsx";
import { notificaModificaAnnuncio } from "../services/annunci";
import {
  DURATE,
  GENERI,
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

// tipo: "properties" | "roommateAds". roommateType: "offro" | "cerco" (solo coinquilini)
function AnnuncioForm({ tipo, roommateType, iniziale, onSaved, onCancel }) {
  const modifica = Boolean(iniziale);
  const tipoCoinquilino = iniziale?.roommateType || roommateType;
  const cerco = tipo === ROOMMATES && tipoCoinquilino === "cerco";

  const [f, setF] = useState(() => daIniziale(iniziale));
  const [photos, setPhotos] = useState(() => iniziale?.photos || []);
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
    if (!f.propertyType) return setErrore("Seleziona una tipologia.");
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
      propertyType: f.propertyType,
      genderPreference: f.genderPreference,
      occupationPreference: f.occupationPreference,
      durationPreference: f.durationPreference,
      petsAllowed: f.petsAllowed,
      smokersAllowed: f.smokersAllowed,
      photos,
    };

    setInvio(true);

    try {
      if (modifica) {
        await updateDoc(doc(db, tipo, iniziale.id), dati);
        await notificaModificaAnnuncio(iniziale.id, tipo, dati.title);
      } else {
        await addDoc(collection(db, tipo), {
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
        <input id="a-titolo" {...campo("title")} maxLength={100} />
      </div>

      <div className="campo">
        <label htmlFor="a-desc">
          {cerco ? "Scrivi qualcosa su di te" : "Descrizione"}
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
        <h4>Dove e quando</h4>

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
              placeholder="Es. Via Zamboni"
              {...campo("subzone")}
            />
          </div>

          <div className="campo">
            <label htmlFor="a-tipologia">
              {cerco ? "Tipologia cercata" : "Tipologia alloggio"}
            </label>
            <select id="a-tipologia" {...campo("propertyType")}>
              {TIPOLOGIE.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="campo">
            <label htmlFor="a-data">
              {cerco ? "Cerco a partire dal" : "Prima disponibilità"}
            </label>
            <input id="a-data" type="date" {...campo("availableFrom")} />
          </div>
        </div>
      </div>

      <div className="blocco">
        <h4>Preferenze</h4>

        <div className="griglia-campi">
          <div className="campo">
            <label htmlFor="a-genere">Genere richiesto</label>
            <select id="a-genere" {...campo("genderPreference")}>
              {GENERI.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className="campo">
            <label htmlFor="a-occ">Occupazione preferita</label>
            <select id="a-occ" {...campo("occupationPreference")}>
              {OCCUPAZIONI.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>

          <div className="campo">
            <label htmlFor="a-durata">Durata permanenza</label>
            <select id="a-durata" {...campo("durationPreference")}>
              {DURATE.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        <label className="check">
          <input type="checkbox" {...check("petsAllowed")} />
          🐶 Animali ammessi
        </label>

        <label className="check">
          <input type="checkbox" {...check("smokersAllowed")} />
          🚬 Fumatori ammessi
        </label>
      </div>

      <div className="blocco">
        <h4>Foto</h4>
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