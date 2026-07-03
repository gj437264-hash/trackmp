import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import HomePage from "@/pages/HomePage";
import AboutPage from "@/pages/AboutPage";
import PoliticianProfile from "@/pages/PoliticianProfile";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import ThankYouPage from "@/pages/ThankYouPage";
import AcceptInvitePage from "@/pages/AcceptInvitePage";
import { ForgotPasswordPage, ResetPasswordPage } from "@/pages/PasswordPages";

import DashboardHome from "@/pages/dashboard/DashboardHome";
import SignupQueue from "@/pages/dashboard/SignupQueue";
import Admins from "@/pages/dashboard/Admins";
import ReferenceData from "@/pages/dashboard/ReferenceData";
import PoliticiansList from "@/pages/dashboard/PoliticiansList";
import PoliticianForm from "@/pages/dashboard/PoliticianForm";
import AuditLog from "@/pages/dashboard/AuditLog";
import Trash from "@/pages/dashboard/Trash";

const ADMIN_ROLES = ["super_admin", "admin"];
const SUPER = ["super_admin"];

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            className:
              "!rounded-none !border-2 !border-black !shadow-brutal !font-bold !bg-white !text-black",
          }}
        />
        <Routes>
          {/* Public */}
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/politicians/:id" element={<PoliticianProfile />} />

          {/* Auth */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/thank-you" element={<ThankYouPage />} />
          <Route path="/accept-invite" element={<AcceptInvitePage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Dashboard */}
          <Route path="/dashboard" element={<ProtectedRoute roles={ADMIN_ROLES}><DashboardHome /></ProtectedRoute>} />
          <Route path="/dashboard/politicians" element={<ProtectedRoute roles={ADMIN_ROLES}><PoliticiansList /></ProtectedRoute>} />
          <Route path="/dashboard/politicians/:id" element={<ProtectedRoute roles={ADMIN_ROLES}><PoliticianForm /></ProtectedRoute>} />
          <Route path="/dashboard/reference" element={<ProtectedRoute roles={ADMIN_ROLES}><ReferenceData /></ProtectedRoute>} />
          <Route path="/dashboard/signups" element={<ProtectedRoute roles={SUPER}><SignupQueue /></ProtectedRoute>} />
          <Route path="/dashboard/admins" element={<ProtectedRoute roles={SUPER}><Admins /></ProtectedRoute>} />
          <Route path="/dashboard/audit" element={<ProtectedRoute roles={SUPER}><AuditLog /></ProtectedRoute>} />
          <Route path="/dashboard/trash" element={<ProtectedRoute roles={SUPER}><Trash /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
