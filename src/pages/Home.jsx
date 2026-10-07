import { Link } from "react-router-dom";
import { signOut } from "firebase/auth";

import { auth } from "../firebase";
import PageContainer from "../components/PageContainer";

function Home() {
  return (
    <PageContainer>
      <section className="hero">
        <h1>Affitto Bologna</h1>
        <p>Trova appartamenti, stanze e coinquilini a Bologna.</p>

        <div className="azioni-rapide">
          <Link to="/casa" className="btn btn--primario">
            🔍 Cerca casa
          </Link>
          <Link to="/coinquilini" className="btn btn--primario">
            👥 Cerca coinquilini
          </Link>
          <Link to="/annunci" className="btn btn--sec">
            ➕ Pubblica annuncio
          </Link>
          <Link to="/preferiti" className="btn btn--sec">
            ❤️ I miei preferiti
          </Link>
        </div>
      </section>

      <button type="button" className="btn btn--sec btn--piccolo" onClick={() => signOut(auth)}>
        Logout
      </button>
    </PageContainer>
  );
}

export default Home;