import { useNavigate } from "react-router-dom";

import {
  ROOMMATES,
  chiSono,
  percorsoDettaglio,
  totaleMensile,
} from "../utils/helpers";

export function StatoRiga({ a, tipo }) {
  const attivo = a.status === "active";

  return (
    <div className="stato-riga">
      <strong className={attivo ? "stato stato--attivo" : "stato stato--off"}>
        {attivo ? "ATTIVO" : "NON DISPONIBILE"}
        {" | "}
        ID #{a.publicId}
        {a.verified && " | ✅ Verificato"}
      </strong>

      {tipo === ROOMMATES && (
        <span className="badge">
          {a.roommateType === "cerco" ? "🔎 Cerco posto letto" : "📢 Offro posto letto"}
        </span>
      )}
    </div>
  );
}

// anteprima = true: solo tipologia, costi, posizione, genere (usata nelle card)
export function ListingInfo({ a, tipo, anteprima = false }) {
  const cerco = tipo === ROOMMATES && a.roommateType === "cerco";
  const tipologie = a.propertyTypes?.length
    ? a.propertyTypes.join(", ")
    : a.propertyType;
  const nuovoCerco = cerco && Boolean(a.selfInfo);
  const righeChiSono = cerco ? chiSono(a) : [];

  const prezzo = cerco ? (
    <p className="info__prezzo">
      <strong>Budget: € {a.monthlyPrice}/mese</strong>
    </p>
  ) : a.expensesExcluded ? (
    <p className="info__prezzo">
      € {a.monthlyPrice}/mese + € {a.expensesAmount} spese
      {" → "}
      <strong>Totale: € {totaleMensile(a)}/mese</strong>
    </p>
  ) : (
    <p className="info__prezzo">
      <strong>€ {a.monthlyPrice}/mese (spese incluse)</strong>
    </p>
  );

  const posizione = (
    <p>
      📍 {a.zone}
      {a.subzone ? ` • ${a.subzone}` : ""}
    </p>
  );

  const genere = (
    <p>
      {a.genderPreference === "Solo ragazze" && <>🩷 Genere: Solo ragazze</>}
      {a.genderPreference === "Solo ragazzi" && <>💙 Genere: Solo ragazzi</>}
      {a.genderPreference === "Indifferente" && <>🤍 Genere: Indifferente</>}
    </p>
  );

  const deposito = a.deposit > 0 && <p>🔒 Deposito cauzionale: € {a.deposit}</p>;

  if (anteprima) {
    return (
      <div className="info info--anteprima">
        <p>
          🏠 {cerco ? "Cerco" : "Tipologia"}: {tipologie}
        </p>
        {prezzo}
        {deposito}
        {posizione}
        {genere}
      </div>
    );
  }

  return (
    <div className="info">
      <p>
        🏠 {cerco ? "Cerco" : "Tipologia"}: {tipologie}
      </p>

      <p className="info__desc">{a.description}</p>

      {prezzo}

      {deposito}

      <p>
        📅 {cerco ? "Cerco da" : "Disponibile dal"} {a.availableFrom}
        {" • "}
        {a.durationPreference === "Indifferente"
          ? "Durata indifferente"
          : a.durationPreference}
      </p>

      {posizione}

      {genere}

      {nuovoCerco ? (
        righeChiSono.length > 0 && <p>🙋 Chi sono: {righeChiSono.join(" • ")}</p>
      ) : (
        <>
          <p>
            {a.occupationPreference === "Solo studenti" && <>🎓 Solo studenti</>}
            {a.occupationPreference === "Solo lavoratori" && <>💼 Solo lavoratori</>}
            {a.occupationPreference === "Studenti e lavoratori" && (
              <>🎓💼 Studenti e lavoratori</>
            )}
          </p>

          <p>{a.petsAllowed ? "🐶 Animali ammessi" : "🚫 Animali non ammessi"}</p>

          <p>{a.smokersAllowed ? "🚬 Fumatori ammessi" : "🚭 Non fumatori"}</p>
        </>
      )}
    </div>
  );
}

// children = pulsanti azione. Il click sulla card apre il dettaglio.
function ListingCard({ annuncio: a, tipo, compatta = false, children }) {
  const navigate = useNavigate();
  const apri = () => navigate(percorsoDettaglio(tipo, a.id));
  const foto = a.photos?.[0];

  return (
    <article
      className={"card" + (compatta ? " card--compatta" : "")}
      onClick={apri}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target === e.currentTarget) apri();
      }}
    >
      <div className="card__riga">
        {foto && (
          <div className="card__foto">
            <img src={foto} alt={a.title} loading="lazy" />
            {a.photos.length > 1 && (
              <span className="card__conteggio">📷 {a.photos.length}</span>
            )}
          </div>
        )}

        <div className="card__corpo">
          {!compatta && <StatoRiga a={a} tipo={tipo} />}
          <h3 className="card__titolo">{a.title}</h3>
          <ListingInfo a={a} tipo={tipo} anteprima />
        </div>
      </div>

      {children && (
        <div className="card__azioni" onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      )}
    </article>
  );
}

export default ListingCard;