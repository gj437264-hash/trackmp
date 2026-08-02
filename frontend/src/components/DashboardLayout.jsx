import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth, hasRole } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  LayoutGrid,
  UserPlus,
  Users,
  Globe2,
  ScrollText,
  Trash2,
  LogOut,
  UserSquare2,
  Inbox,
  Contact2,
  Newspaper,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Search,
} from "lucide-react";

import { Search as SearchIcon } from "lucide-react"; // or reuse an existing icon import if you prefer, e.g. Sparkles

// NOTE ON SECURITY: the previous sanitizeString() helper HTML-escaped values
// (user.email, user.name, role, searchQuery) that are only ever rendered as
// plain JSX text (e.g. {safeName}), never via dangerouslySetInnerHTML. React
// already escapes text children by default, so the manual escaping added no
// protection and caused a display bug (e.g. "O'Brien" rendering literally as
// "O&#x27;Brien", or typing "&" in search showing as "&amp;"). This remains
// removed. If you ever render user content via dangerouslySetInnerHTML
// elsewhere, use a real sanitizer (DOMPurify) there instead of a manual regex.

// Sidebar collapse preference persists across sessions. Wrapped in try/catch
// because localStorage can throw in private-browsing / storage-restricted
// contexts, and a UI preference should never be able to crash the dashboard.
const COMPACT_STORAGE_KEY = "trackmp:sidebar-compact";

function readStoredCompact() {
  try {
    return window.localStorage.getItem(COMPACT_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function writeStoredCompact(value) {
  try {
    window.localStorage.setItem(COMPACT_STORAGE_KEY, value ? "true" : "false");
  } catch {
    // Storage unavailable — the preference just won't persist. Non-fatal.
  }
}

// `group` drives the section headers in the sidebar so related pages read as
// a unit instead of one long undifferentiated list.
const NAVIGATION_ITEMS = [
  { id: "overview", to: "/dashboard", label: "Overview", icon: LayoutGrid, roles: ["super_admin", "admin"], end: true, section: "overview", group: "Overview" },
  { id: "politicians", to: "/dashboard/politicians", label: "Politicians", icon: UserSquare2, roles: ["super_admin", "admin"], section: "politicians", group: "Content" },
  { id: "articles", to: "/dashboard/articles", label: "Articles", icon: Newspaper, roles: ["super_admin", "admin"], section: "articles", group: "Content" },
  { id: "reference", to: "/dashboard/reference", label: "Reference Data", icon: Globe2, roles: ["super_admin", "admin"], section: "reference_data", group: "Content" },
  { id: "community", to: "/dashboard/community", label: "Community Desk", icon: Inbox, roles: ["super_admin", "admin"], section: "community_desk", group: "Community" },
  { id: "voice", to: "/dashboard/voice", label: "Voice Moderation", icon: MessageCircle, roles: ["super_admin", "admin"], section: "voice", group: "Community" },
  { id: "visitors", to: "/dashboard/visitors", label: "Contributors", icon: Contact2, roles: ["super_admin", "admin"], section: "visitors", group: "Community" },
  { id: "signups", to: "/dashboard/signups", label: "Signup Queue", icon: UserPlus, roles: ["super_admin"], section: "signups", group: "Administration" },
  { id: "admins", to: "/dashboard/admins", label: "Manage Admins", icon: Users, roles: ["super_admin"], section: "admins", group: "Administration" },
  { id: "audit", to: "/dashboard/audit", label: "Audit Log", icon: ScrollText, roles: ["super_admin"], section: "audit", group: "Administration" },
  { id: "trash", to: "/dashboard/trash", label: "Trash", icon: Trash2, roles: ["super_admin"], section: "trash", group: "Administration" },
  { id: "seo", to: "/dashboard/seo", label: "SEO Management", icon: SearchIcon, roles: ["super_admin", "admin"], section: "seo_management", group: "Content" },
];

const canAccessSection = (user, section) => {
  if (!section) return true;
  if (user?.role === "super_admin") return true;
  return !!user?.permissions?.[section];
};

// Previously this component received an externally-computed `isActive` prop
// that only checked `location.pathname === item.to`. That meant a page like
// /dashboard/politicians/42 never highlighted "Politicians" in the sidebar,
// because the exact-match check failed for nested/detail routes. NavLink's
// own render-prop already implements the correct matching rules (exact when
// `end` is set, prefix match otherwise), so we now use that single source of
// truth for everything — icon color, the active bar, and aria-current —
// instead of duplicating (and getting wrong) that logic ourselves.
const NavigationLink = React.memo(({ item, onNavigate, isCompact }) => {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      end={item.end}
      data-testid={`side-${item.id}`}
      onClick={onNavigate}
      title={isCompact ? item.label : undefined}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
          isActive
            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 shadow-sm dark:shadow-none"
            : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
        } ${isCompact ? "justify-center px-2" : ""}`
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            size={isCompact ? 20 : 18}
            strokeWidth={isActive ? 2.5 : 2}
            className={`flex-shrink-0 transition-all duration-200 ${
              isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
            }`}
          />
          {!isCompact && <span className="flex-1 text-left truncate">{item.label}</span>}
          {isActive && !isCompact && (
            <span className="w-1 h-6 bg-emerald-500 rounded-full absolute right-0" aria-hidden="true" />
          )}
        </>
      )}
    </NavLink>
  );
});

NavigationLink.displayName = "NavigationLink";

const UserProfile = React.memo(({ user, onLogout, isCompact }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const email = user?.email || "";
  const name = user?.name || user?.email || "Admin";
  const roleDisplay = user?.role?.replace("_", " ") || "";
  const initial = (user?.name || email || "A").charAt(0).toUpperCase();

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const menu = (
    <div
      className={`absolute bottom-full mb-2 bg-white dark:bg-slate-900 rounded-xl shadow-lg dark:shadow-none border border-slate-200/80 dark:border-slate-800 py-2 animate-slide-up z-50 ${
        isCompact ? "left-1/2 -translate-x-1/2 min-w-[200px]" : "left-0 right-0"
      }`}
      role="menu"
    >
      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
        {isCompact && <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{name}</div>}
        {isCompact && <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{email}</div>}
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">{roleDisplay}</div>
      </div>
      <button
        onClick={() => {
          setIsOpen(false);
          onLogout();
        }}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors duration-200"
        data-testid="dropdown-logout"
        role="menuitem"
      >
        <LogOut size={16} />
        Sign Out
      </button>
    </div>
  );

  if (isCompact) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="w-full flex justify-center p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors duration-200 group"
          aria-expanded={isOpen}
          aria-haspopup="true"
          title={name}
          data-testid="user-profile-button"
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            {initial}
          </div>
        </button>
        {isOpen && menu}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors duration-200 group"
        aria-expanded={isOpen}
        aria-haspopup="true"
        data-testid="user-profile-button"
      >
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
          {initial}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{name}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{email}</div>
        </div>
        <ChevronRight size={16} className={`text-slate-400 dark:text-slate-500 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
      </button>
      {isOpen && menu}
    </div>
  );
});

UserProfile.displayName = "UserProfile";

// Slim desktop header: gives every page a consistent title/breadcrumb instead
// of content butting straight up against the browser chrome. Purely
// presentational — computed from the same nav data used for the sidebar, so
// there is exactly one place that defines page titles.
const DesktopHeaderBar = React.memo(({ activeItem }) => (
  <header className="hidden md:flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-slate-950/60 backdrop-blur-sm sticky top-0 z-30">
    <div>
      <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Dashboard</p>
      <h1 className="text-lg font-display font-bold text-slate-800 dark:text-slate-100">
        {activeItem ? activeItem.label : "Overview"}
      </h1>
    </div>
    <kbd className="hidden lg:inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 rounded-md">
      Ctrl+B toggles sidebar
    </kbd>
  </header>
));

DesktopHeaderBar.displayName = "DesktopHeaderBar";

const TopNavBar = React.memo(({ activeItem, onToggleSidebar, isSidebarOpen }) => (
  <header className="md:hidden sticky top-0 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 py-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200"
          aria-label={isSidebarOpen ? "Close menu" : "Open menu"}
          aria-expanded={isSidebarOpen}
        >
          {isSidebarOpen ? <X size={20} className="text-slate-600 dark:text-slate-400" /> : <Menu size={20} className="text-slate-600 dark:text-slate-400" />}
        </button>
        <Link to="/" className="flex items-center gap-2">
          <span className="w-8 h-8 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl grid place-items-center text-white font-black shadow-soft-emerald">T</span>
          <span className="font-display font-black text-lg text-slate-800 dark:text-slate-100">
            Track<span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 bg-clip-text text-transparent">MP</span>
          </span>
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <span className="text-xs text-slate-500 dark:text-slate-400">{activeItem ? activeItem.label : "Dashboard"}</span>
      </div>
    </div>
  </header>
));

TopNavBar.displayName = "TopNavBar";

export function DashboardLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(readStoredCompact);
  const [searchQuery, setSearchQuery] = useState("");

  const navigationItems = useMemo(
    () => NAVIGATION_ITEMS.filter((item) => hasRole(user, ...item.roles) && canAccessSection(user, item.section)),
    [user]
  );

  // Determine the active item once, from the same matching rules NavLink
  // itself uses (exact for `end` items, prefix otherwise), so the header
  // titles and sidebar highlighting can never disagree with each other.
  const activeItem = useMemo(() => {
    return (
      navigationItems.find((item) =>
        item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
      ) || null
    );
  }, [navigationItems, location.pathname]);

  const trimmedQuery = searchQuery.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    const groups = new Map();
    for (const item of navigationItems) {
      if (trimmedQuery && !item.label.toLowerCase().includes(trimmedQuery)) continue;
      if (!groups.has(item.group)) groups.set(item.group, []);
      groups.get(item.group).push(item);
    }
    return Array.from(groups.entries());
  }, [navigationItems, trimmedQuery]);

  const hasVisibleResults = filteredGroups.length > 0;

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
      window.location.href = "/";
    }
  }, [logout, navigate]);

  // A single stable handler for every nav link avoids creating a fresh
  // closure per item on every render, which previously undermined the
  // React.memo on NavigationLink.
  const handleNavigate = useCallback(() => setIsSidebarOpen(false), []);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === "b") {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsSidebarOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggleSidebar = useCallback(() => setIsSidebarOpen((prev) => !prev), []);

  const toggleCompact = useCallback(() => {
    setIsCompact((prev) => {
      const next = !prev;
      writeStoredCompact(next);
      return next;
    });
  }, []);

  const handleSearchChange = useCallback((e) => setSearchQuery(e.target.value), []);

  return (
    <div className="min-h-screen flex bg-slate-50/50 dark:bg-slate-950 transition-colors duration-300">
      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed md:sticky top-0 h-screen z-50 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800/80
          transition-all duration-300 ease-in-out
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          ${isCompact ? "w-[72px]" : "w-[280px]"}
          md:flex
        `}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className={`flex items-center ${isCompact ? "justify-center px-2" : "justify-between px-4"} py-4 border-b border-slate-200/80 dark:border-slate-800/80`}>
          {!isCompact && (
            <Link to="/" className="flex items-center gap-2" data-testid="dashboard-brand">
              <span className="w-8 h-8 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl grid place-items-center text-white font-black shadow-soft-emerald">T</span>
              <span className="font-display font-black text-lg text-slate-800 dark:text-slate-100">
                Track<span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 bg-clip-text text-transparent">MP</span>
              </span>
            </Link>
          )}
          {isCompact && (
            <span className="w-8 h-8 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl grid place-items-center text-white font-black shadow-soft-emerald">T</span>
          )}
          <button
            onClick={toggleCompact}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
            aria-label={isCompact ? "Expand sidebar" : "Collapse sidebar"}
            title={isCompact ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCompact ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <div className={`${isCompact ? "px-2" : "px-4"} py-3 border-b border-slate-200/80 dark:border-slate-800/80`}>
          <UserProfile user={user} onLogout={handleLogout} isCompact={isCompact} />
        </div>

        {!isCompact && (
          <div className="px-4 py-3 border-b border-slate-200/80 dark:border-slate-800/80">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search navigation..."
                value={searchQuery}
                onChange={handleSearchChange}
                maxLength={60}
                autoComplete="off"
                spellCheck="false"
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200"
                aria-label="Search navigation"
              />
              {/* Announces result count to screen reader users without needing a visible counter */}
              <span className="sr-only" role="status" aria-live="polite">
                {trimmedQuery
                  ? `${filteredGroups.reduce((n, [, items]) => n + items.length, 0)} matching pages`
                  : ""}
              </span>
            </div>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {!hasVisibleResults && !isCompact && (
            <p className="px-2 py-4 text-sm text-slate-400 dark:text-slate-500 text-center">
              No pages match "{searchQuery.trim()}"
            </p>
          )}
          {filteredGroups.map(([group, items]) => (
            <div key={group} className="space-y-1">
              {!isCompact && (
                <p className="px-3 pb-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {group}
                </p>
              )}
              {items.map((item) => (
                <NavigationLink key={item.id} item={item} onNavigate={handleNavigate} isCompact={isCompact} />
              ))}
            </div>
          ))}
        </nav>

        <div className={`${isCompact ? "px-2" : "px-4"} py-3 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2`}>
          {!isCompact && (
            <>
              <button
                onClick={() => navigate("/")}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors duration-200"
                data-testid="view-public-site"
              >
                <Globe2 size={16} className="text-slate-400 dark:text-slate-500" />
                View Public Site
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors duration-200"
                data-testid="dashboard-logout"
              >
                <LogOut size={16} />
                Sign Out
              </button>
              <div className="flex justify-center pt-1">
                <ThemeToggle />
              </div>
            </>
          )}
          {isCompact && (
            <>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors duration-200"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut size={20} />
              </button>
              <div className="flex justify-center">
                <ThemeToggle />
              </div>
            </>
          )}
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <TopNavBar activeItem={activeItem} onToggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
        <DesktopHeaderBar activeItem={activeItem} />
        <main className="flex-1 min-w-0" role="main">
          {children}
        </main>
      </div>
    </div>
  );
}

// CSS for scrollbar styling - Add this to your global CSS file
// .scrollbar-thin { scrollbar-width: thin; }
// .scrollbar-thumb-slate-300::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 9999px; }
// .scrollbar-thumb-slate-700::-webkit-scrollbar-thumb { background: #334155; border-radius: 9999px; }
// .scrollbar-track-transparent::-webkit-scrollbar-track { background: transparent; }
// .scrollbar-thin::-webkit-scrollbar { width: 4px; }
// .animate-slide-up { animation: slideUp 0.2s ease-out; }
// @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
