import { Route, Routes } from "react-router-dom";
import SiteFooter from "./components/SiteFooter";
import SiteHeader from "./components/SiteHeader";
import LandingPage from "./pages/LandingPage";
import BookingPage from "./pages/BookingPage";

export default function App() {
  return (
    <div className="app-shell flex min-h-screen flex-col text-[#17231d]">
      <SiteHeader />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/book" element={<BookingPage />} />
        </Routes>
      </main>
      <SiteFooter />
    </div>
  );
}
