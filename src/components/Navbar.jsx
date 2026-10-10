import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { collection, onSnapshot, query, where } from "firebase/firestore";

import { auth, db } from "../firebase";
import useUtente from "../hooks/useUtente";

const VOCI = [
  { to: "/casa", icona: "🏠", label: "Casa" },
  { to: "/coinquilini", icona: "👥", label: "Coinquilini" },
  { to: "/chat", icona: "💬", label: "Chat" },
  { to: "/annunci", icona: "📋", label: "Annunci" },
  { to: "/notifiche", icona: "🔔", label: "Notifiche", badge: true },
  { to: "/profilo", icona: "👤", label: "Profilo" },
];

function Navbar() {
  const { isAdmin } = useUtente();
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

  const voci = isAdmin
    ? [...VOCI, { to: "/admin", icona: "🛡", label: "Admin" }]
    : VOCI;

  return (
    <nav
      className={"navbar" + (voci.length > 6 ? " navbar--fitta" : "")}
      aria-label="Navigazione principale"
    >
      {voci.map((v) => (
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