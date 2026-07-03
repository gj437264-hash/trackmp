import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth, hasRole } from "@/context/AuthContext";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export function PublicLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const isActive = (p) => (p === "/" ? location.pathname === "/" : location.pathname.startsWith(p));

  const navItems = [
    { to: "/", label: "Directory" },
    { to: "/about", label: "About" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="border-b-2 border-black bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 md:px-8 h-16">
          <Link to="/" className="flex items-center gap-3" data-testid="brand-link">
            <span className="w-8 h-8 bg-klein grid place-items-center text-white font-black text-lg">T</span>
            <span className="font-display font-black text-xl tracking-tight uppercase">
              Track<span className="text-klein">MP</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-2">
            {navItems.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                data-testid={`nav-${n.label.toLowerCase()}`}
                className={`px-4 py-2 text-sm font-bold uppercase tracking-wider border-2 ${
                  isActive(n.to) ? "border-black bg-black text-white" : "border-transparent hover:bg-surfaceAlt"
                }`}
              >
                {n.label}
              </Link>
            ))}
            {user ? (
              <>
                {hasRole(user, "super_admin", "admin") && (
                  <Link
                    to="/dashboard"
                    data-testid="nav-dashboard"
                    className="brutal-btn-secondary"
                  >
                    Dashboard
                  </Link>
                )}
                <button data-testid="logout-btn" onClick={logout} className="brutal-btn-primary">
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link to="/signup" data-testid="nav-signup" className="brutal-btn-secondary">
                  Request Access
                </Link>
                <Link to="/login" data-testid="nav-login" className="brutal-btn-primary">
                  Sign In
                </Link>
              </>
            )}
          </nav>
          <button
            className="md:hidden border-2 border-black p-2"
            onClick={() => setOpen((o) => !o)}
            data-testid="mobile-menu-toggle"
            aria-label="Menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {open && (
          <div className="md:hidden border-t-2 border-black bg-white px-4 py-4 flex flex-col gap-2">
            {navItems.map((n) => (
              <Link key={n.to} to={n.to} className="px-4 py-2 border-2 border-black" onClick={() => setOpen(false)}>
                {n.label}
              </Link>
            ))}
            {user ? (
              <>
                {hasRole(user, "super_admin", "admin") && (
                  <Link to="/dashboard" className="brutal-btn-secondary" onClick={() => setOpen(false)}>
                    Dashboard
                  </Link>
                )}
                <button onClick={() => { setOpen(false); logout(); }} className="brutal-btn-primary">
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link to="/signup" className="brutal-btn-secondary" onClick={() => setOpen(false)}>
                  Request Access
                </Link>
                <Link to="/login" className="brutal-btn-primary" onClick={() => setOpen(false)}>
                  Sign In
                </Link>
              </>
            )}
          </div>
        )}
      </header>
      <main className="flex-1 animate-fade-slide-up">{children}</main>
      <footer className="border-t-2 border-black bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="font-display font-black text-lg uppercase tracking-tight">TrackMP</div>
            <div className="label-eyebrow mt-1">Public Politician Transparency Ledger</div>
          </div>
          <div className="label-eyebrow">© {new Date().getFullYear()} · Open Record</div>
        </div>
      </footer>
    </div>
  );
}
