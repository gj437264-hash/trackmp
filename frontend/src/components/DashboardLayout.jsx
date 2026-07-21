import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth, hasRole } from "@/context/AuthContext";
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
} from "lucide-react";

const ITEMS = [
  { to: "/dashboard", label: "Overview", icon: LayoutGrid, roles: ["super_admin", "admin"], end: true },
  { to: "/dashboard/politicians", label: "Politicians", icon: UserSquare2, roles: ["super_admin", "admin"], section: "politicians" },
  { to: "/dashboard/articles", label: "Articles", icon: Newspaper, roles: ["super_admin", "admin"], section: "articles" },
  { to: "/dashboard/community", label: "Community Desk", icon: Inbox, roles: ["super_admin", "admin"], section: "community_desk" },
  { to: "/dashboard/visitors", label: "Contributors", icon: Contact2, roles: ["super_admin", "admin"], section: "visitors" },
  { to: "/dashboard/reference", label: "Reference Data", icon: Globe2, roles: ["super_admin", "admin"], section: "reference_data" },
  { to: "/dashboard/signups", label: "Signup Queue", icon: UserPlus, roles: ["super_admin"] },
  { to: "/dashboard/admins", label: "Admins", icon: Users, roles: ["super_admin"] },
  { to: "/dashboard/audit", label: "Audit Log", icon: ScrollText, roles: ["super_admin"] },
  { to: "/dashboard/trash", label: "Trash", icon: Trash2, roles: ["super_admin"] },
];

function canSeeSection(user, section) {
  if (!section) return true;
  if (user?.role === "super_admin") return true;
  return !!user?.permissions?.[section];
}

export function DashboardLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = ITEMS.filter((i) => hasRole(user, ...i.roles) && canSeeSection(user, i.section));

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[260px_1fr] bg-white">
      <aside className="border-b md:border-b-0 md:border-r border-slate-200 bg-white/80 backdrop-blur-sm flex flex-col">
        <div className="px-6 py-6 border-b border-slate-200">
          <Link to="/" className="flex items-center gap-2" data-testid="dashboard-brand">
            <span className="w-8 h-8 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl grid place-items-center text-white font-black shadow-soft-emerald">T</span>
            <span className="font-display font-black text-lg text-slate-800">
              Track<span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 bg-clip-text text-transparent">MP</span>
            </span>
          </Link>
          <div className="mt-4">
            <div className="soft-label mb-0">Signed in as</div>
            <div className="font-bold text-sm mt-1 truncate text-slate-800" data-testid="current-user-email">{user?.email}</div>
            <div className="inline-block mt-2 px-2 py-1 text-[10px] font-bold uppercase tracking-widest bg-slate-800 text-white rounded-full">
              {user?.role?.replace("_", " ")}
            </div>
          </div>
        </div>
        <nav className="flex-1 py-2 flex flex-col">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.end}
                data-testid={`side-${it.label.toLowerCase().replace(/\s+/g, "-")}`}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-6 py-3 border-l-4 text-sm font-bold uppercase tracking-wider transition-colors duration-200 ${
                    isActive
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  }`
                }
              >
                <Icon size={16} strokeWidth={2.5} />
                {it.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-200 flex flex-col gap-2">
          <button
            onClick={() => navigate("/")}
            className="btn-soft-secondary text-xs"
            data-testid="view-public-site"
          >
            View Public Site
          </button>
          <button
            onClick={async () => { await logout(); navigate("/"); }}
            className="btn-soft-primary text-xs"
            data-testid="dashboard-logout"
          >
            <LogOut size={14} className="mr-2" />
            Sign Out
          </button>
        </div>
      </aside>
      <main className="min-w-0 animate-fade-slide-up">{children}</main>
    </div>
  );
}
