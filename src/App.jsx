import { useState } from "react";
import { PRODUCTS } from "./data/products.js";
import { FONTS_CSS } from "./styles/fonts.js";
import NavBar from "./components/NavBar.jsx";
import Footer from "./components/Footer.jsx";
import HomePage from "./pages/HomePage.jsx";
import DiscoverPage from "./pages/DiscoverPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import ComparePage from "./pages/ComparePage.jsx";
import MySkinPage from "./pages/MySkinPage.jsx";
import AskPage from "./pages/AskPage.jsx";
import AboutPage from "./pages/AboutPage.jsx";
import QuizPage from "./pages/QuizPage.jsx";
import QuizSummaryPage from "./pages/QuizSummaryPage.jsx";
import SupabaseTestPage from "./pages/SupabaseTestPage.jsx";

// TEMPORARY — remove this check and SupabaseTestPage.jsx once Supabase
// connectivity has been confirmed. Visiting /?supabase-test=1 bypasses the
// normal app entirely so this never affects any real page or nav item.
const IS_SUPABASE_TEST =
  typeof window !== "undefined" && new URLSearchParams(window.location.search).has("supabase-test");

export default function SkinScoutApp() {
  const [view, setView] = useState("home");
  const [selectedId, setSelectedId] = useState(null);
  const [compareIds, setCompareIds] = useState([]);
  const [skinProfile, setSkinProfile] = useState({});

  if (IS_SUPABASE_TEST) return <SupabaseTestPage />;

  const onView = (id) => { setSelectedId(id); setView("profile"); window.scrollTo(0, 0); };
  const onCompare = (id, forceRemove) => {
    setCompareIds((cur) => {
      if (cur.includes(id) || forceRemove) return cur.filter((x) => x !== id);
      if (cur.length >= 2) return [cur[1], id];
      return [...cur, id];
    });
  };

  const selectedProduct = PRODUCTS.find((p) => p.id === selectedId);

  return (
    <div className="ss-root">
      <style>{FONTS_CSS}</style>
      <NavBar view={view} setView={setView} compareCount={compareIds.length} />
      {view === "home" && <HomePage setView={setView} onCompare={onCompare} compareIds={compareIds} onView={onView} />}
      {view === "discover" && <DiscoverPage onView={onView} onCompare={onCompare} compareIds={compareIds} />}
      {view === "profile" && <ProfilePage product={selectedProduct} setView={setView} onCompare={onCompare} compareIds={compareIds} />}
      {view === "compare" && <ComparePage compareIds={compareIds} setCompareId={onCompare} skinProfile={skinProfile} />}
      {view === "myskin" && <MySkinPage skinProfile={skinProfile} setSkinProfile={setSkinProfile} />}
      {view === "ask" && <AskPage skinProfile={skinProfile} />}
      {view === "about" && <AboutPage />}
      {view === "quiz" && <QuizPage setView={setView} />}
      {view === "quiz-summary" && <QuizSummaryPage setView={setView} />}
      <Footer />
    </div>
  );
}
