import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";

import { auth } from "./firebase";

import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import CercaCasa from "./pages/CercaCasa";
import CercaCoinquilini from "./pages/CercaCoinquilini";
import MieiAnnunci from "./pages/MieiAnnunci";
import Profilo from "./pages/Profilo";
import ProfiloPubblico from "./pages/ProfiloPubblico";
import DettaglioAnnuncio from "./pages/DettaglioAnnuncio";
import Preferiti from "./pages/Preferiti";
import Notifiche from "./pages/Notifiche";
import Chat from "./pages/Chat";
import AdminDashboard from "./pages/AdminDashboard";

import Navbar from "./components/Navbar";
import useUtente from "./hooks/useUtente";
import { PROPERTIES, ROOMMATES } from "./utils/helpers";

function AppAutenticata() {
  const { profilo, contatti, caricamento } = useUtente();

  if (caricamento) {
    return <p className="caricamento caricamento--pagina">Caricamento...</p>;
  }

  if (profilo?.banned) {
    return (
      <div className="login">
        <div className="login__box">
          <h1>Account sospeso</h1>
          <p>
            Il tuo account è stato sospeso dagli amministratori della community.
          </p>
          <button type="button" className="btn btn--sec btn--blocco" onClick={() => signOut(auth)}>
            Esci
          </button>
        </div>
      </div>
    );
  }

  if (!profilo?.onboardingCompleted) {
    return <Onboarding profilo={profilo} contatti={contatti} />;
  }

  return (
    <BrowserRouter>
      <header className="topbar">
        <Link to="/" className="brand">
          Affitto Bologna
        </Link>
      </header>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/casa" element={<CercaCasa />} />
        <Route path="/coinquilini" element={<CercaCoinquilini />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/annunci" element={<MieiAnnunci />} />
        <Route path="/profilo" element={<Profilo />} />
        <Route path="/utente/:id" element={<ProfiloPubblico />} />
        <Route path="/preferiti" element={<Preferiti />} />
        <Route path="/notifiche" element={<Notifiche />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route
          path="/annuncio/:id"
          element={<DettaglioAnnuncio tipo={PROPERTIES} />}
        />
        <Route
          path="/coinquilino/:id"
          element={<DettaglioAnnuncio tipo={ROOMMATES} />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Navbar />
    </BrowserRouter>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <p className="caricamento caricamento--pagina">Caricamento...</p>;
  }

  if (!user) {
    return <Login />;
  }

  return <AppAutenticata key={user.uid} />;
}

export default App;