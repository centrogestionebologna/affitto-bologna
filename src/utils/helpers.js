export const ZONE = [
  "Città Universitaria",
  "Bolognina",
  "Massarenti",
  "Murri",
  "Saragozza",
];

export const TIPOLOGIE = [
  "Camera singola",
  "Camera singola con bagno privato",
  "Camera doppia",
  "Camera doppia con bagno privato",
  "Intero appartamento",
];

export const GENERI = ["Solo ragazze", "Solo ragazzi", "Indifferente"];

export const OCCUPAZIONI = [
  "Solo studenti",
  "Solo lavoratori",
  "Studenti e lavoratori",
];

export const DURATE = [
  "Solo breve termine",
  "Preferenza breve termine",
  "Indifferente",
  "Preferenza lungo termine",
  "Solo lungo termine",
];

export const MOTIVI_SEGNALAZIONE = [
  "Spam",
  "Truffa",
  "Informazioni false",
  "Contenuto offensivo",
];

export const MAX_FOTO = 5;

// Nomi delle collezioni Firestore (usati anche come "tipo" di annuncio)
export const PROPERTIES = "properties";
export const ROOMMATES = "roommateAds";

export const percorsoDettaglio = (tipo, id) =>
  tipo === ROOMMATES ? `/coinquilino/${id}` : `/annuncio/${id}`;

export const generaPublicId = () =>
  Math.floor(1000 + Math.random() * 9000);

export const secondi = (ts) => ts?.seconds ?? 0;

export const totaleMensile = (a) =>
  Number(a.monthlyPrice || 0) +
  (a.expensesExcluded ? Number(a.expensesAmount || 0) : 0);

export const FILTRI_INIZIALI = {
  testo: "",
  zona: "",
  genere: "",
  occupazione: "",
  prezzoMax: "",
  tipologia: "",
  animali: false,
  fumatori: false,
  disponibileEntro: "",
  depositoMax: "",
  ordine: "recenti",
};

const normalizza = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export function filtraEOrdina(lista, f) {
  const parole = normalizza(f.testo).trim().split(/\s+/).filter(Boolean);

  const risultato = lista.filter((a) => {
    if (parole.length) {
      const testo = [a.title, a.description, a.zone, a.subzone]
        .map(normalizza)
        .join(" ");
      if (!parole.every((p) => testo.includes(p))) return false;
    }
    if (f.zona && a.zone !== f.zona) return false;
    if (f.genere && a.genderPreference !== f.genere) return false;
    if (f.occupazione && a.occupationPreference !== f.occupazione)
      return false;
    if (f.prezzoMax !== "" && Number(a.monthlyPrice) > Number(f.prezzoMax))
      return false;
    if (f.tipologia && a.propertyType !== f.tipologia) return false;
    if (f.animali && !a.petsAllowed) return false;
    if (f.fumatori && !a.smokersAllowed) return false;
    if (
      f.disponibileEntro &&
      a.availableFrom &&
      a.availableFrom > f.disponibileEntro
    )
      return false;
    if (f.depositoMax !== "" && Number(a.deposit || 0) > Number(f.depositoMax))
      return false;
    return true;
  });

  const ordinati = [...risultato];
  switch (f.ordine) {
    case "vecchi":
      ordinati.sort((a, b) => secondi(a.createdAt) - secondi(b.createdAt));
      break;
    case "prezzo-asc":
      ordinati.sort((a, b) => a.monthlyPrice - b.monthlyPrice);
      break;
    case "prezzo-desc":
      ordinati.sort((a, b) => b.monthlyPrice - a.monthlyPrice);
      break;
    default:
      ordinati.sort((a, b) => secondi(b.createdAt) - secondi(a.createdAt));
  }
  return ordinati;
}

// Punteggio di somiglianza tra un annuncio e uno o più annunci di riferimento
export function punteggioSuggerimento(candidato, riferimenti) {
  if (!riferimenti.length) return 0;
  return Math.max(
    ...riferimenti.map((r) => {
      let s = 0;
      if (r.zone && candidato.zone === r.zone) s += 3;
      const prezzo = Number(r.monthlyPrice) || 0;
      if (
        prezzo > 0 &&
        Math.abs(Number(candidato.monthlyPrice) - prezzo) / prezzo <= 0.25
      )
        s += 2;
      if (r.genderPreference && candidato.genderPreference === r.genderPreference)
        s += 1;
      if (
        r.occupationPreference &&
        candidato.occupationPreference === r.occupationPreference
      )
        s += 1;
      return s;
    })
  );
}