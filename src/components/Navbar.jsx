import { useEffect, useRef, useState } from "react";
import {
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { auth, db } from "../firebase";
import useUtente from "../hooks/useUtente";

const VOCI = [
  { to: "/chat", icona: "💬", label: "Chat" },
  { to: "/casa", icona: "🏠", label: "Casa" },
  { to: "/coinquilini", icona: "👥", label: "Coinquilini" },
  { to: "/annunci", icona: "📋", label: "Annunci" },
  { to: "/notifiche", icona: "🔔", label: "Notifiche" },
  { to: "/profilo", icona: "👤", label: "Profilo" },
];

function useNotificheNonLette() {
  const [nonLette, setNonLette] = useState(0);

  useEffect(() => {
    const utente = auth.currentUser;

    if (!utente) {
      setNonLette(0);
      return undefined;
    }

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", utente.uid),
      where("read", "==", false)
    );

    return onSnapshot(
      q,
      (snap) => setNonLette(snap.size),
      (error) => {
        console.error("Impossibile leggere le notifiche:", error);
        setNonLette(0);
      }
    );
  }, []);

  return nonLette;
}

export function MenuNavigazione({ className = "" }) {
  const { isAdmin } = useUtente();
  const nonLette = useNotificheNonLette();
  const [aperto, setAperto] = useState(false);
  const contenitoreRef = useRef(null);

  const voci = isAdmin
    ? [...VOCI, { to: "/admin", icona: "🛡", label: "Admin" }]
    : VOCI;

  useEffect(() => {
    if (!aperto) return undefined;

    const chiudiFuori = (event) => {
      if (
        contenitoreRef.current &&
        !contenitoreRef.current.contains(event.target)
      ) {
        setAperto(false);
      }
    };

    const chiudiConEsc = (event) => {
      if (event.key === "Escape") {
        setAperto(false);
      }
    };

    document.addEventListener("pointerdown", chiudiFuori);
    document.addEventListener("keydown", chiudiConEsc);

    return () => {
      document.removeEventListener("pointerdown", chiudiFuori);
      document.removeEventListener("keydown", chiudiConEsc);
    };
  }, [aperto]);

  return (
    <div
      ref={contenitoreRef}
      className={`menu-navigazione ${className}`.trim()}
    >
      {aperto && (
        <nav
          className="menu-navigazione__pannello"
          aria-label="Navigazione principale"
        >
          {voci.map((voce) => (
            <NavLink
              key={voce.to}
              to={voce.to}
              className={({ isActive }) =>
                `menu-navigazione__voce${isActive ? " attiva" : ""}`
              }
              onClick={() => setAperto(false)}
            >
              <span
                className="menu-navigazione__icona"
                aria-hidden="true"
              >
                {voce.icona}
              </span>

              <span>{voce.label}</span>
            </NavLink>
          ))}
        </nav>
      )}

      <button
        type="button"
        className={`menu-navigazione__bottone${
          aperto ? " is-aperto" : ""
        }`}
        onClick={() => setAperto((valore) => !valore)}
        aria-label={
          aperto
            ? "Chiudi menu di navigazione"
            : "Apri menu di navigazione"
        }
        aria-expanded={aperto}
      >
        <span className="menu-navigazione__barre" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>

        {nonLette > 0 && (
          <span
            className="menu-navigazione__badge"
            aria-label={`${nonLette} notifiche non lette`}
          >
            {nonLette > 99 ? "99+" : nonLette}
          </span>
        )}
      </button>
    </div>
  );
}

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();

  // Nella chat la barra viene generata direttamente da Chat.jsx,
  // perché contiene anche il vero campo per inviare i messaggi.
  if (location.pathname === "/chat") {
    return null;
  }

  return (
    <div className="barra-chat-globale">
      <button
        type="button"
        className="barra-chat-globale__apri"
        onClick={() => navigate("/chat")}
        aria-label="Apri la chat"
      >
        <span aria-hidden="true">💬</span>
        <span>Clicca qui per scrivere nella chat</span>
      </button>

      <MenuNavigazione />
    </div>
  );
}

export default Navbar;