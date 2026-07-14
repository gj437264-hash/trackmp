import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { api } from "@/lib/api";
import { useAuth, hasRole } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { Users, UserPlus, Globe2, ScrollText, Trash2, UserSquare2 } from "lucide-react";

function StatCard({ label, value, hint, testid }) {
  return (
    <div className="soft-card p-6" data-testid={testid}>
      <div className="soft-label mb-0">{label}</div>
      <div className="mt-3 font-display font-black text-4xl text-slate-800">{value}</div>
      {hint && <div className="mt-2 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

const QUICK = [
  { to: "/dashboard/politicians", label: "Manage Politicians", icon: UserSquare2, roles: ["super_admin", "admin"] },
  { to: "/dashboard/reference", label: "Reference Data", icon: Globe2, roles: ["super_admin", "admin"] },
  { to: "/dashboard/signups", label: "Signup Queue", icon: UserPlus, roles: ["super_admin"] },
  { to: "/dashboard/admins", label: "Manage Admins", icon: Users, roles: ["super_admin"] },
  { to: "/dashboard/audit", label: "Audit Log", icon: ScrollText, roles: ["super_admin"] },
  { to: "/dashboard/trash", label: "Trash", icon: Trash2, roles: ["super_admin"] },
];

export default function DashboardHome() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ politicians: 0, pending: 0, admins: 0, countries: 0 });

  useEffect(() => {
    (async () => {
      const s = { ...stats };
      const [p, c] = await Promise.all([
        api.get("/politicians").catch(() => ({ data: { items: [] } })),
        api.get("/ref/countries").catch(() => ({ data: { items: [] } })),
      ]);
      s.politicians = p.data.items?.length || 0;
      s.countries = c.data.items?.length || 0;
      if (hasRole(user, "super_admin")) {
        const [sig, ad] = await Promise.all([
          api.get("/admin/signup-requests", { params: { status: "pending" } }).catch(() => ({ data: { items: [] } })),
          api.get("/admin/admins").catch(() => ({ data: { items: [] } })),
        ]);
        s.pending = sig.data.items?.length || 0;
        s.admins = ad.data.items?.length || 0;
      }
      setStats(s);
    })();
    // eslint-disable-next-line
  }, [user]);

  const quicks = QUICK.filter((q) => hasRole(user, ...q.roles));

  return (
    <DashboardLayout>
      <div className="p-6 md:p-10">
        <div className="soft-label mb-0">/// Control Room</div>
        <h1 className="mt-2 font-display font-black text-4xl md:text-5xl text-slate-900">
          {hasRole(user, "super_admin") ? "Super Admin" : "Admin"} Dashboard
        </h1>

        <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Politicians" value={stats.politicians} testid="stat-politicians" />
          <StatCard label="Countries" value={stats.countries} testid="stat-countries" />
          {hasRole(user, "super_admin") && (
            <>
              <StatCard label="Pending Signups" value={stats.pending} testid="stat-pending" hint="Awaiting approval" />
              <StatCard label="Admins" value={stats.admins} testid="stat-admins" />
            </>
          )}
        </div>

        <h2 className="mt-12 font-display font-bold text-2xl text-slate-800">Quick Actions</h2>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quicks.map((q) => {
            const Icon = q.icon;
            return (
              <Link
                key={q.to}
                to={q.to}
                data-testid={`quick-${q.label.toLowerCase().replace(/\s+/g, "-")}`}
                className="soft-card soft-card-hover p-6 flex items-center justify-between group"
              >
                <div>
                  <div className="soft-label mb-0">Open</div>
                  <div className="font-display font-bold text-xl mt-1 text-slate-800">{q.label}</div>
                </div>
                <Icon size={28} className="text-emerald-600" />
              </Link>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
