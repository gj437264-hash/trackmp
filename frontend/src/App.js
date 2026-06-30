import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "sonner";
import Navbar from "@/components/Navbar";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Feed from "@/pages/Feed";
import PoliticianDetail from "@/pages/PoliticianDetail";
import NewPolitician from "@/pages/NewPolitician";
import EditPolitician from "@/pages/EditPolitician";
import MyContributions from "@/pages/MyContributions";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/politicians/new" element={<NewPolitician />} />
          <Route path="/politicians/:id" element={<PoliticianDetail />} />
          <Route path="/politicians/:id/edit" element={<EditPolitician />} />
          <Route path="/me" element={<MyContributions />} />
        </Routes>
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
