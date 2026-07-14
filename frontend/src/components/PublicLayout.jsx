import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth, hasRole } from "@/context/AuthContext";
import { Menu, X, Sparkles, Users, Award, Globe, ChevronDown, Newspaper, MessageCircle, PieChart } from "lucide-react";
import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

export function PublicLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const isActive = (p) => (p === "/" ? location.pathname === "/" : location.pathname.startsWith(p));

  const navItems = [
    { to: "/", label: "Home" },
    { to: "/search", label: "Search" },
  ];

  const aboutDropdown = [
    { to: "/about", label: "About", icon: Globe },
    { to: "/articles", label: "Articles", icon: Newspaper },
    { to: "/your-voice", label: "Your Voice", icon: MessageCircle },
    { to: "/budget-analysis", label: "Budget Analysis", icon: PieChart },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white relative">
      {/* Background orbs - soft design, clipped independently so it never affects sticky header */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl animate-pulse-slow mix-blend-multiply" />
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl animate-pulse-slow [animation-delay:1s] mix-blend-multiply" />
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl animate-pulse-slow [animation-delay:2s] mix-blend-multiply" />
      </div>

      {/* Header with soft design */}
      <header className="border-b border-slate-200 bg-white backdrop-blur-md sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 md:px-8 h-16">
          <Link to="/" className="flex items-center gap-3 group" data-testid="brand-link">
            <div className="w-8 h-8 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl grid place-items-center text-white font-black text-lg shadow-soft-emerald group-hover:scale-105 transition-transform duration-300">
              T
            </div>
            <span className="font-display font-black text-xl tracking-tight uppercase text-slate-800">
              Track<span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 bg-clip-text text-transparent">MP</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                data-testid={`nav-${n.label.toLowerCase()}`}
                className={`px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-xl transition-all duration-200 ${
                  isActive(n.to)
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-soft-emerald"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                }`}
              >
                {n.label}
              </Link>
            ))}

            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  data-testid="nav-about-dropdown"
                  className={`px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-xl transition-all duration-200 inline-flex items-center gap-1 ${
                    aboutDropdown.some((n) => isActive(n.to))
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-soft-emerald"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                  }`}
                >
                  About <ChevronDown size={14} />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="start"
                  sideOffset={8}
                  className="min-w-[200px] bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-soft-lg p-2 z-50"
                >
                  {aboutDropdown.map((n) => {
                    const Icon = n.icon;
                    return (
                      <DropdownMenu.Item key={n.to} asChild>
                        <Link
                          to={n.to}
                          data-testid={`nav-dropdown-${n.label.toLowerCase().replace(/\s+/g, "-")}`}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-100 hover:text-emerald-700 transition-colors cursor-pointer outline-none"
                        >
                          <Icon size={15} /> {n.label}
                        </Link>
                      </DropdownMenu.Item>
                    );
                  })}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>

            {user ? (
              <>
                {hasRole(user, "super_admin", "admin") && (
                  <Link
                    to="/dashboard"
                    data-testid="nav-dashboard"
                    className="px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-xl text-indigo-600 hover:bg-indigo-50 transition-all duration-200"
                  >
                    Dashboard
                  </Link>
                )}
                <button
                  data-testid="logout-btn"
                  onClick={logout}
                  className="px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all duration-200"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/signup"
                  data-testid="nav-signup"
                  className="px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-xl text-slate-600 hover:bg-slate-100 transition-all duration-200"
                >
                  Request Access
                </Link>
                <Link
                  to="/login"
                  data-testid="nav-login"
                  className="px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-soft-emerald hover:shadow-soft-lg transition-all duration-200 hover:scale-[1.02]"
                >
                  Sign In
                </Link>
              </>
            )}
          </nav>

          <button
            className="md:hidden p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all duration-200"
            onClick={() => setOpen((o) => !o)}
            data-testid="mobile-menu-toggle"
            aria-label="Menu"
          >
            {open ? <X size={20} className="text-slate-600" /> : <Menu size={20} className="text-slate-600" />}
          </button>
        </div>

        {open && (
          <div className="md:hidden border-t border-slate-200 bg-white/95 backdrop-blur-sm px-4 py-4 flex flex-col gap-2">
            {[...navItems, ...aboutDropdown].map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={`px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-200 ${
                  isActive(n.to)
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
                onClick={() => setOpen(false)}
              >
                {n.label}
              </Link>
            ))}
            {user ? (
              <>
                {hasRole(user, "super_admin", "admin") && (
                  <Link
                    to="/dashboard"
                    className="px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider text-indigo-600 hover:bg-indigo-50 transition-all duration-200"
                    onClick={() => setOpen(false)}
                  >
                    Dashboard
                  </Link>
                )}
                <button
                  onClick={() => { setOpen(false); logout(); }}
                  className="px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all duration-200"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/signup"
                  className="px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-100 transition-all duration-200"
                  onClick={() => setOpen(false)}
                >
                  Request Access
                </Link>
                <Link
                  to="/login"
                  className="px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-soft-emerald transition-all duration-200"
                  onClick={() => setOpen(false)}
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 animate-fade-slide-up relative z-10">{children}</main>

      {/* Footer with soft design */}
      <footer className="border-t border-slate-200 bg-white backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="font-display font-bold text-lg uppercase tracking-tight text-slate-800">
              Track<span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 bg-clip-text text-transparent">MP</span>
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">Public Politician Transparency Ledger</div>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <Link
              to="/contact"
              className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-indigo-600 transition-colors duration-200"
              data-testid="footer-contact-link"
            >
              Contact Us
            </Link>
            <Link
              to="/submit-update"
              className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-indigo-600 transition-colors duration-200"
              data-testid="footer-submit-update-link"
            >
              Submit an Update
            </Link>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
              © {new Date().getFullYear()} · Open Record
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
