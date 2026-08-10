import React, { useCallback, useMemo, useState, memo, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth, hasRole } from "@/context/AuthContext";
import { Menu, X, Globe, ChevronDown, Newspaper, MessageCircle, PieChart } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

// Static configurations - moved outside component
const NAV_ITEMS = [
  { to: "/", label: "Home" },
  { to: "/search", label: "Search" },
];

const ABOUT_DROPDOWN = [
  { to: "/about", label: "About", icon: Globe },
  { to: "/articles", label: "Articles", icon: Newspaper },
  { to: "/your-voice", label: "Your Voice", icon: MessageCircle },
  { to: "/budget-analysis", label: "Budget Analysis", icon: PieChart },
];

// Memoized sub-components for better performance
const Logo = memo(() => (
  <Link to="/" className="flex items-center gap-3 group" data-testid="brand-link">
    <div className="w-8 h-8 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl grid place-items-center text-white font-black text-lg shadow-soft-emerald group-hover:scale-105 transition-transform duration-300 will-change-transform">
      T
    </div>
    <span className="font-display font-black text-xl tracking-tight uppercase text-slate-800 dark:text-slate-100">
      Track<span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 bg-clip-text text-transparent">MP</span>
    </span>
  </Link>
));

Logo.displayName = 'Logo';

const NavLink = memo(({ to, label, isActive, onClick }) => {
  const active = isActive(to);
  return (
    <Link
      to={to}
      data-testid={`nav-${label.toLowerCase()}`}
      aria-current={active ? "page" : undefined}
      className={`px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-xl transition-all duration-200 ${
        active
          ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-soft-emerald"
          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100"
      }`}
      onClick={onClick}
    >
      {label}
    </Link>
  );
});

NavLink.displayName = 'NavLink';

// Optimized background orbs with reduced GPU impact
const BackgroundOrbs = memo(() => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10" aria-hidden="true">
    <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-400/10 dark:bg-emerald-400/20 rounded-full blur-3xl animate-pulse-slow mix-blend-multiply dark:mix-blend-screen will-change-transform" />
    <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-indigo-400/10 dark:bg-indigo-400/20 rounded-full blur-3xl animate-pulse-slow [animation-delay:1s] mix-blend-multiply dark:mix-blend-screen will-change-transform" />
    <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-amber-400/10 dark:bg-amber-400/20 rounded-full blur-3xl animate-pulse-slow [animation-delay:2s] mix-blend-multiply dark:mix-blend-screen will-change-transform" />
  </div>
));

BackgroundOrbs.displayName = 'BackgroundOrbs';

function PublicLayoutInner({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const menuRef = useRef(null);

  // Handle scroll for performance optimization
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 10);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const isActive = useCallback(
    (path) => path === "/" ? location.pathname === "/" : location.pathname.startsWith(path),
    [location.pathname]
  );

  const aboutActive = useMemo(
    () => ABOUT_DROPDOWN.some((item) => isActive(item.to)),
    [isActive]
  );

  const mobileNavItems = useMemo(() => [...NAV_ITEMS, ...ABOUT_DROPDOWN], []);

  const toggleOpen = useCallback(() => setOpen(prev => !prev), []);
  const closeMenu = useCallback(() => setOpen(false), []);

  const handleLogout = useCallback(() => {
    setOpen(false);
    logout();
  }, [logout]);

  // Memoized user role check
  const isAdmin = useMemo(
    () => user && hasRole(user, "super_admin", "admin"),
    [user]
  );

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 relative transition-colors duration-300">
      <BackgroundOrbs />

      <header 
        className={`border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 sticky top-0 z-40 transition-shadow duration-300 ${
          isScrolled ? 'shadow-md dark:shadow-slate-900/50' : 'shadow-sm dark:shadow-none'
        }`}
        style={{ backdropFilter: 'blur(8px)' }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 md:px-8 h-16">
          <Logo />

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                label={item.label}
                isActive={isActive}
              />
            ))}

            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  data-testid="nav-about-dropdown"
                  className={`px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-xl transition-all duration-200 inline-flex items-center gap-1 ${
                    aboutActive
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-soft-emerald"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100"
                  }`}
                  aria-haspopup="true"
                  aria-expanded={undefined}
                >
                  About <ChevronDown size={14} aria-hidden="true" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="start"
                  sideOffset={8}
                  className="min-w-[200px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl shadow-soft-lg dark:shadow-none p-2 z-50"
                  side="bottom"
                  alignOffset={-4}
                >
                  {ABOUT_DROPDOWN.map((item) => {
                    const Icon = item.icon;
                    return (
                      <DropdownMenu.Item key={item.to} asChild>
                        <Link
                          to={item.to}
                          data-testid={`nav-dropdown-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors cursor-pointer outline-none"
                        >
                          <Icon size={15} aria-hidden="true" /> {item.label}
                        </Link>
                      </DropdownMenu.Item>
                    );
                  })}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>

            {user ? (
              <>
                {isAdmin && (
                  <Link
                    to="/dashboard"
                    data-testid="nav-dashboard"
                    className="px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-all duration-200"
                  >
                    Dashboard
                  </Link>
                )}
                <button
                  data-testid="logout-btn"
                  onClick={logout}
                  className="px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-all duration-200"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/signup"
                  data-testid="nav-signup"
                  className="px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
                >
                  Request Access
                </Link>
                <Link
                  to="/login"
                  data-testid="nav-login"
                  className="px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-soft-emerald hover:shadow-soft-lg transition-all duration-200 hover:scale-[1.02] will-change-transform"
                >
                  Sign In
                </Link>
              </>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all duration-200"
            onClick={toggleOpen}
            data-testid="mobile-menu-toggle"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav-menu"
          >
            {open ? (
              <X size={20} className="text-slate-600 dark:text-slate-400" aria-hidden="true" />
            ) : (
              <Menu size={20} className="text-slate-600 dark:text-slate-400" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {open && (
          <div 
            id="mobile-nav-menu" 
            className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm px-4 py-4 flex flex-col gap-2 max-h-[calc(100vh-4rem)] overflow-y-auto"
            ref={menuRef}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation menu"
          >
            {mobileNavItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                aria-current={isActive(item.to) ? "page" : undefined}
                className={`px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-200 ${
                  isActive(item.to)
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
                onClick={closeMenu}
              >
                {item.label}
              </Link>
            ))}
            {user ? (
              <>
                {isAdmin && (
                  <Link
                    to="/dashboard"
                    className="px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-all duration-200"
                    onClick={closeMenu}
                  >
                    Dashboard
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-all duration-200 text-left"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/signup"
                  className="px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
                  onClick={closeMenu}
                >
                  Request Access
                </Link>
                <Link
                  to="/login"
                  className="px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-soft-emerald transition-all duration-200"
                  onClick={closeMenu}
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 animate-fade-slide-up relative z-10">
        {children}
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="font-display font-bold text-lg uppercase tracking-tight text-slate-800 dark:text-slate-100">
              Track<span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 bg-clip-text text-transparent">MP</span>
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1">
              Public Politician Transparency Ledger
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <Link
              to="/contact"
              className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-200"
              data-testid="footer-contact-link"
            >
              Contact Us
            </Link>
            <Link
              to="/submit-update"
              className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-200"
              data-testid="footer-submit-update-link"
            >
              Submit an Update
            </Link>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              © {new Date().getFullYear()} · Open Record
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export const PublicLayout = memo(PublicLayoutInner);
