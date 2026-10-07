import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { collection, onSnapshot, query, where } from "firebase/firestore";

import { auth, db } from "../firebase";

const VOCI = [
  { to: "/casa", icona: "🏠", label: "Casa" },
  { to: "/coinquilini", icona: "👥", label: "Coinquilini" },
  { to: "/preferiti", icona: "❤️", label: "Preferiti" },
  { to: "/annunci", icona: "📋", label: "Annunci" },
  { to: "/notifiche", icona: "🔔", label: "Notifiche", badge: true },
  { to: "/profilo", icona: "👤", label: "Profilo" },
];

function Navbar() {
  const [nonLette, setNonLette] = useState(0);

  useEffect(() => {
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", auth.currentUser.uid),
      where("read", "==", false)
    );

    return onSnapshot(
      q,
      (snap) => setNonLette(snap.size),
      () => setNonLette(0)
    );
  }, []);

  return (
    <nav className="navbar" aria-label="Navigazione principale">
      {VOCI.map((v) => (
        <NavLink
          key={v.to}
          to={v.to}
          className={({ isActive }) =>
            "navbar__voce" + (isActive ? " attiva" : "")
          }
        >
          <span className="navbar__icona">
            {v.icona}
            {v.badge && nonLette > 0 && (
              <span className="navbar__badge">
                {nonLette > 9 ? "9+" : nonLette}
              </span>
            )}
          </span>
          {v.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default Navbar;