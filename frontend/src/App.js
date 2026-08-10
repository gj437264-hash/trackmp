import React, { lazy, Suspense } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ScrollToTop } from "@/components/ScrollToTop";
import { PageTransition } from "@/components/PageTransition";

// --- Lazy Load Public Pages ---
const HomePage = lazy(() => import("@/pages/HomePage"));
const AboutPage = lazy(() => import("@/pages/AboutPage"));
const ContactPage = lazy(() => import("@/pages/ContactPage"));
const SubmitUpdatePage = lazy(() => import("@/pages/SubmitUpdatePage"));
const ArticlesPage = lazy(() => import("@/pages/ArticlesPage"));
const ArticleDetail = lazy(() => import("@/pages/ArticleDetail"));
const YourVoicePage = lazy(() => import("@/pages/YourVoicePage"));
const BudgetAnalysisPage = lazy(() => import("@/pages/BudgetAnalysisPage"));
const PoliticianProfile = lazy(() => import("@/pages/PoliticianProfile"));
const SearchPage = lazy(() => import("@/pages/SearchPage"));
const PromiseMethodology = lazy(() => import("@/pages/PromiseMethodology"));

// --- Lazy Load Auth Pages ---
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const SignupPage = lazy(() => import("@/pages/SignupPage"));
const ThankYouPage = lazy(() => import("@/pages/ThankYouPage"));
const AcceptInvitePage = lazy(() => import("@/pages/AcceptInvitePage"));
// For multiple named exports from one file, use a promise chain mapping
const ForgotPasswordPage = lazy(() => import("@/pages/PasswordPages").then(module => ({ default: module.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import("@/pages/PasswordPages").then(module => ({ default: module.ResetPasswordPage })));

// --- Lazy Load Dashboard Pages ---
const DashboardHome = lazy(() => import("@/pages/dashboard/DashboardHome"));
const SignupQueue = lazy(() => import("@/pages/dashboard/SignupQueue"));
const Admins = lazy(() => import("@/pages/dashboard/Admins"));
const ReferenceData = lazy(() => import("@/pages/dashboard/ReferenceData"));
const PoliticiansList = lazy(() => import("@/pages/dashboard/PoliticiansList"));
const CommunityDesk = lazy(() => import("@/pages/dashboard/CommunityDesk"));
const TicketDetail = lazy(() => import("@/pages/dashboard/TicketDetail"));
const Visitors = lazy(() => import("@/pages/dashboard/Visitors"));
const Articles = lazy(() => import("@/pages/dashboard/Articles"));
const ArticleEditor = lazy(() => import("@/pages/dashboard/ArticleEditor"));
const VisitorDetail = lazy(() => import("@/pages/dashboard/VisitorDetail"));
const PoliticianForm = lazy(() => import("@/pages/dashboard/PoliticianForm"));
const VoiceModerationPage = lazy(() => import ("@/pages/dashboard/VoiceModerationPage"));
const SEOManagement = lazy(() => import("@/pages/dashboard/SEOManagement"));
const SEOEditor = lazy(() => import("@/pages/dashboard/SEOEditor"));
const AuditLog = lazy(() => import("@/pages/dashboard/AuditLog"));
const Trash = lazy(() => import("@/pages/dashboard/Trash"));
const DuplicatePoliticiansFinder = lazy(() => import("@/pages/extensions/DuplicatePoliticiansFinder"));

const ADMIN_ROLES = ["super_admin", "admin"];
const SUPER = ["super_admin"];

// Simple placeholder fallback visible only during the micro-split transition
const LoadingFallback = () => (
  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh", fontWeight: "bold" }}>
    Loading...
  </div>
);

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<LoadingFallback />}>
        <Routes location={location} key={location.pathname}>
          {/* Public */}
          <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />
          <Route path="/about" element={<PageTransition><AboutPage /></PageTransition>} />
          <Route path="/contact" element={<PageTransition><ContactPage /></PageTransition>} />
          <Route path="/submit-update" element={<PageTransition><SubmitUpdatePage /></PageTransition>} />
          <Route path="/articles" element={<PageTransition><ArticlesPage /></PageTransition>} />
          <Route path="/articles/:id" element={<PageTransition><ArticleDetail /></PageTransition>} />
          <Route path="/your-voice" element={<PageTransition><YourVoicePage /></PageTransition>} />
          <Route path="/budget-analysis" element={<PageTransition><BudgetAnalysisPage /></PageTransition>} />
          <Route path="/politicians/:id" element={<PageTransition><PoliticianProfile /></PageTransition>} />
          <Route path="/search" element={<PageTransition><SearchPage /></PageTransition>} />
          <Route path="/how-promises-are-tracked" element={<PageTransition><PromiseMethodology /></PageTransition>} />

          {/* Auth */}
          <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
          <Route path="/signup" element={<PageTransition><SignupPage /></PageTransition>} />
          <Route path="/thank-you" element={<PageTransition><ThankYouPage /></PageTransition>} />
          <Route path="/accept-invite" element={<PageTransition><AcceptInvitePage /></PageTransition>} />
          <Route path="/forgot-password" element={<PageTransition><ForgotPasswordPage /></PageTransition>} />
          <Route path="/reset-password" element={<PageTransition><ResetPasswordPage /></PageTransition>} />

          {/* Dashboard */}
          <Route path="/dashboard" element={<ProtectedRoute roles={ADMIN_ROLES}><DashboardHome /></ProtectedRoute>} />
          <Route path="/dashboard/politicians" element={<ProtectedRoute roles={ADMIN_ROLES}><PoliticiansList /></ProtectedRoute>} />
          <Route path="/dashboard/politicians/duplicates" element={<ProtectedRoute roles={ADMIN_ROLES}><DuplicatePoliticiansFinder /></ProtectedRoute>} />
          <Route path="/dashboard/voice" element={<ProtectedRoute roles={ADMIN_ROLES}><VoiceModerationPage /></ProtectedRoute>} />
          <Route path="/dashboard/community" element={<ProtectedRoute roles={ADMIN_ROLES}><CommunityDesk /></ProtectedRoute>} />
          <Route path="/dashboard/community/:id" element={<ProtectedRoute roles={ADMIN_ROLES}><TicketDetail /></ProtectedRoute>} />
          <Route path="/dashboard/visitors" element={<ProtectedRoute roles={ADMIN_ROLES}><Visitors /></ProtectedRoute>} />
          <Route path="/dashboard/articles" element={<ProtectedRoute roles={ADMIN_ROLES}><Articles /></ProtectedRoute>} />
          <Route path="/dashboard/articles/:id" element={<ProtectedRoute roles={ADMIN_ROLES}><ArticleEditor /></ProtectedRoute>} />
          <Route path="/dashboard/visitors/:id" element={<ProtectedRoute roles={ADMIN_ROLES}><VisitorDetail /></ProtectedRoute>} />
          <Route path="/dashboard/politicians/:id" element={<ProtectedRoute roles={ADMIN_ROLES}><PoliticianForm /></ProtectedRoute>} />
          <Route path="/dashboard/reference" element={<ProtectedRoute roles={ADMIN_ROLES}><ReferenceData /></ProtectedRoute>} />
          <Route path="/dashboard/seo" element={<ProtectedRoute roles={ADMIN_ROLES}><SEOManagement /></ProtectedRoute>} />
          <Route path="/dashboard/seo/:contentType/:itemId" element={<ProtectedRoute roles={ADMIN_ROLES}><SEOEditor /></ProtectedRoute>} />
          <Route path="/dashboard/signups" element={<ProtectedRoute roles={SUPER}><SignupQueue /></ProtectedRoute>} />
          <Route path="/dashboard/admins" element={<ProtectedRoute roles={SUPER}><Admins /></ProtectedRoute>} />
          <Route path="/dashboard/audit" element={<ProtectedRoute roles={SUPER}><AuditLog /></ProtectedRoute>} />
          <Route path="/dashboard/trash" element={<ProtectedRoute roles={SUPER}><Trash /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

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
        <ScrollToTop />
        <AnimatedRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
