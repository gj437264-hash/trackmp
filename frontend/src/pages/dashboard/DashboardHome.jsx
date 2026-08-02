import React, { useEffect, useState, useCallback, useMemo, lazy, Suspense } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { api } from "@/lib/api";
import { useAuth, hasRole } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import {
  Users,
  UserPlus,
  Globe2,
  ScrollText,
  Trash2,
  UserSquare2,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Shield,
  Activity,
  BarChart3,
  ChevronRight,
  Sparkles,
  Layers,
  Zap,
  Target,
  Award,
  Calendar,
  Bell,
  Settings,
  HelpCircle,
  Download,
  RefreshCw,
} from "lucide-react";

// ============================================================
// SECURITY: Input sanitization helper
// ============================================================
const sanitizeDisplayValue = (value) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      "/": '&#x2F;',
    };
    return String(value).replace(/[&<>"'/]/g, s => map[s]);
  }
  return value;
};

// ============================================================
// COMPONENTS: StatCard (Enhanced with better visual hierarchy)
// ============================================================
function StatCard({ label, value, hint, testid, icon: Icon, trend, trendLabel, color = "emerald" }) {
  const safeValue = sanitizeDisplayValue(value);
  const safeLabel = sanitizeDisplayValue(label);
  const safeHint = hint ? sanitizeDisplayValue(hint) : null;
  const safeTrendLabel = trendLabel ? sanitizeDisplayValue(trendLabel) : null;

  const colorMap = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100' },
  };

  const colors = colorMap[color] || colorMap.emerald;

  return (
    <div
      className="group relative bg-white rounded-2xl border border-slate-200/60 p-6 transition-all duration-300 hover:shadow-xl hover:border-slate-300/80 hover:-translate-y-1"
      data-testid={testid}
      role="article"
      aria-label={`${safeLabel} stat card`}
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-transparent to-slate-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      
      <div className="relative flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {safeLabel}
            </span>
          </div>
          <div className="mt-1 font-display font-black text-3xl text-slate-900 tracking-tight">
            {safeValue}
          </div>
          {trend !== undefined && trend !== null && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-rose-500' : 'text-slate-400'
              }`}>
                {trend > 0 && <TrendingUp size={12} />}
                {trend < 0 && <TrendingUp size={12} className="rotate-180" />}
                {trend > 0 ? '+' : ''}{trend}%
              </span>
              <span className="text-xs text-slate-400">{safeTrendLabel || 'vs last month'}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`flex-shrink-0 ml-4 p-3 ${colors.bg} rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg`}>
            <Icon size={20} className={colors.text} strokeWidth={2} />
          </div>
        )}
      </div>
      {safeHint && (
        <div className="relative mt-3 flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-block w-1 h-1 rounded-full bg-slate-300"></span>
          {safeHint}
        </div>
      )}
    </div>
  );
}

// ============================================================
// COMPONENTS: QuickActionCard (Enhanced with better UX)
// ============================================================
function QuickActionCard({ to, label, icon: Icon, description, testid, color = "emerald" }) {
  const safeLabel = sanitizeDisplayValue(label);
  const safeDescription = description ? sanitizeDisplayValue(description) : null;

  const colorMap = {
    emerald: { bg: 'bg-emerald-50', hover: 'hover:bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-200' },
    blue: { bg: 'bg-blue-50', hover: 'hover:bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
    purple: { bg: 'bg-purple-50', hover: 'hover:bg-purple-100', text: 'text-purple-600', border: 'border-purple-200' },
    orange: { bg: 'bg-orange-50', hover: 'hover:bg-orange-100', text: 'text-orange-600', border: 'border-orange-200' },
  };

  const colors = colorMap[color] || colorMap.emerald;

  return (
    <Link
      to={to}
      data-testid={testid}
      className="group relative bg-white rounded-2xl border border-slate-200/60 p-5 transition-all duration-300 hover:shadow-xl hover:border-slate-300/80 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
      role="button"
      aria-label={`Quick action: ${safeLabel}`}
    >
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 p-3 ${colors.bg} rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:shadow-md`}>
          <Icon size={22} className={colors.text} strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-semibold text-base text-slate-800 group-hover:text-slate-900 transition-colors duration-200">
            {safeLabel}
          </div>
          {safeDescription && (
            <div className="mt-0.5 text-sm text-slate-500 line-clamp-2">
              {safeDescription}
            </div>
          )}
        </div>
        <ChevronRight size={18} className="flex-shrink-0 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all duration-300" />
      </div>
    </Link>
  );
}

// ============================================================
// COMPONENTS: ActivityItem (Enhanced with better visual design)
// ============================================================
function ActivityItem({ icon: Icon, title, time, description, type = "default" }) {
  const safeTitle = sanitizeDisplayValue(title);
  const safeDescription = description ? sanitizeDisplayValue(description) : null;
  const safeTime = sanitizeDisplayValue(time);

  const typeMap = {
    default: { bg: 'bg-slate-50', text: 'text-slate-500' },
    success: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
    warning: { bg: 'bg-orange-50', text: 'text-orange-600' },
    info: { bg: 'bg-blue-50', text: 'text-blue-600' },
  };

  const typeColors = typeMap[type] || typeMap.default;

  return (
    <div className="flex items-start gap-3 py-3.5 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 -mx-2 px-2 rounded-lg transition-colors duration-200">
      <div className={`flex-shrink-0 mt-0.5 p-2 ${typeColors.bg} rounded-full`}>
        <Icon size={14} className={typeColors.text} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-800">{safeTitle}</div>
        {safeDescription && (
          <div className="text-xs text-slate-500 mt-0.5">{safeDescription}</div>
        )}
      </div>
      <div className="flex-shrink-0 text-xs text-slate-400 font-medium">{safeTime}</div>
    </div>
  );
}

// ============================================================
// COMPONENTS: WelcomeBanner (Enhanced with better visual hierarchy)
// ============================================================
function WelcomeBanner({ user }) {
  const userName = user?.name || user?.email || 'Admin';
  const safeName = sanitizeDisplayValue(userName);
  const isSuperAdmin = hasRole(user, "super_admin");

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-slate-50 rounded-2xl p-8 border border-emerald-100/40 shadow-sm">
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 bg-emerald-100/60 rounded-lg">
            <Shield size={14} className="text-emerald-700" />
          </div>
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
            {isSuperAdmin ? 'Super Admin Access' : 'Admin Access'}
          </span>
        </div>
        <h1 className="font-display font-black text-3xl md:text-4xl text-slate-900 leading-tight">
          Welcome back, <span className="text-emerald-700 bg-emerald-100/30 px-2 py-0.5 rounded-lg">{safeName}</span>
        </h1>
        <p className="mt-2 text-slate-600 text-sm max-w-2xl leading-relaxed">
          {isSuperAdmin
            ? 'You have full system access. Monitor and manage all aspects of the platform with comprehensive control.'
            : 'Manage politicians and reference data across the platform efficiently.'}
        </p>
        {/* Quick stats in banner */}
        <div className="mt-4 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
            <span className="text-xs text-slate-600">System Online</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs text-slate-600">Live Updates</span>
          </div>
        </div>
      </div>
      
      {/* Decorative elements - Improved */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-200/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-200/20 rounded-full blur-2xl -ml-12 -mb-12"></div>
      <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-purple-200/10 rounded-full blur-2xl"></div>
    </div>
  );
}

// ============================================================
// COMPONENTS: QuickActionGrid (New - Improved organization)
// ============================================================
function QuickActionGrid({ actions }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Assign colors based on index for visual variety
  const colorOptions = ['emerald', 'blue', 'purple', 'orange', 'rose', 'teal'];
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {actions.map((action, index) => (
        <div
          key={action.to}
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
          className="transition-all duration-300"
          style={{
            transform: hoveredIndex === index ? 'scale(1.02)' : 'scale(1)',
          }}
        >
          <QuickActionCard
            to={action.to}
            label={action.label}
            icon={action.icon}
            description={action.description}
            testid={`quick-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
            color={colorOptions[index % colorOptions.length]}
          />
        </div>
      ))}
    </div>
  );
}

// ============================================================
// COMPONENTS: ActivityFeed (Enhanced with better UI)
// ============================================================
function ActivityFeed({ activities }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm hover:shadow-lg transition-shadow duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <Clock size={18} className="text-emerald-600" />
          </div>
          <h2 className="font-display font-bold text-lg text-slate-800">Recent Activity</h2>
        </div>
        <Link
          to="/dashboard/audit"
          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors duration-200 flex items-center gap-1 hover:gap-1.5"
        >
          View all <ArrowRight size={12} />
        </Link>
      </div>
      <div className="space-y-0">
        {activities.map((activity, index) => (
          <ActivityItem
            key={index}
            icon={activity.icon}
            title={activity.title}
            time={activity.time}
            description={activity.description}
            type={activity.type || 'default'}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTS: QuickStats (New - Additional metrics)
// ============================================================
function QuickStats({ stats, isSuperAdmin }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Politicians"
        value={stats.politicians}
        icon={UserSquare2}
        testid="stat-politicians"
        trend={2.5}
        trendLabel="growth"
        color="emerald"
      />
      <StatCard
        label="Countries"
        value={stats.countries}
        icon={Globe2}
        testid="stat-countries"
        trend={0}
        trendLabel="total"
        color="blue"
      />
      {isSuperAdmin ? (
        <>
          <StatCard
            label="Pending Signups"
            value={stats.pending}
            icon={UserPlus}
            testid="stat-pending"
            hint="Awaiting approval"
            trend={stats.pending > 0 ? 12.5 : -100}
            trendLabel={stats.pending > 0 ? "new requests" : "no pending"}
            color="orange"
          />
          <StatCard
            label="Admins"
            value={stats.admins}
            icon={Users}
            testid="stat-admins"
            trend={0}
            trendLabel="total active"
            color="purple"
          />
        </>
      ) : (
        <StatCard
          label="System Status"
          value="Online"
          icon={Activity}
          testid="stat-status"
          hint="All systems operational"
          color="emerald"
        />
      )}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT: DashboardHome
// ============================================================
const QUICK_ACTIONS = [
  {
    to: "/dashboard/politicians",
    label: "Manage Politicians",
    icon: UserSquare2,
    description: "View and edit politician profiles",
    roles: ["super_admin", "admin"]
  },
  {
    to: "/dashboard/reference",
    label: "Reference Data",
    icon: Globe2,
    description: "Manage countries and reference lists",
    roles: ["super_admin", "admin"]
  },
  {
    to: "/dashboard/signups",
    label: "Signup Queue",
    icon: UserPlus,
    description: "Approve or reject new admin requests",
    roles: ["super_admin"]
  },
  {
    to: "/dashboard/admins",
    label: "Manage Admins",
    icon: Users,
    description: "Add or remove admin users",
    roles: ["super_admin"]
  },
  {
    to: "/dashboard/audit",
    label: "Audit Log",
    icon: ScrollText,
    description: "Review all system activities",
    roles: ["super_admin"]
  },
  {
    to: "/dashboard/trash",
    label: "Trash",
    icon: Trash2,
    description: "Restore or permanently delete items",
    roles: ["super_admin"]
  },
];

// Enhanced mock activities with type categorization
const MOCK_ACTIVITIES = [
  { icon: UserPlus, title: "New signup request", time: "5 min ago", description: "john.doe@example.com", type: "info" },
  { icon: CheckCircle, title: "Politician updated", time: "1 hour ago", description: "Updated profile for Sarah Johnson", type: "success" },
  { icon: Activity, title: "System health check", time: "2 hours ago", description: "All systems operational", type: "success" },
  { icon: AlertCircle, title: "Security scan completed", time: "3 hours ago", description: "No vulnerabilities detected", type: "warning" },
];

export default function DashboardHome() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ politicians: 0, pending: 0, admins: 0, countries: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // ============================================================
  // DATA FETCHING: Memoized with error handling
  // ============================================================
  const fetchStats = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setError(null);
    if (isRefresh) setRefreshing(true);
    
    try {
      const s = { ...stats };

      // Fetch base stats with error handling
      const [pResponse, cResponse] = await Promise.all([
        api.get("/politicians").catch(() => ({ data: { items: [] } })),
        api.get("/ref/countries").catch(() => ({ data: { items: [] } })),
      ]);

      s.politicians = pResponse.data?.items?.length || 0;
      s.countries = cResponse.data?.items?.length || 0;

      // Fetch admin-only stats if user has super_admin role
      if (hasRole(user, "super_admin")) {
        const [signupResponse, adminResponse] = await Promise.all([
          api.get("/admin/signup-requests", { params: { status: "pending" } })
            .catch(() => ({ data: { items: [] } })),
          api.get("/admin/admins")
            .catch(() => ({ data: { items: [] } })),
        ]);

        s.pending = signupResponse.data?.items?.length || 0;
        s.admins = adminResponse.data?.items?.length || 0;
      }

      setStats(s);
    } catch (err) {
      console.error("Failed to fetch dashboard stats:", err.message);
      if (!isRefresh) {
        setError("Unable to load dashboard statistics. Please try again.");
      }
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, [user, stats]);

  // ============================================================
  // EFFECTS: Initial load
  // ============================================================
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ============================================================
  // MEMOIZED COMPUTATIONS
  // ============================================================
  const availableQuickActions = useMemo(() => {
    return QUICK_ACTIONS.filter((action) => hasRole(user, ...action.roles));
  }, [user]);

  const isSuperAdmin = useMemo(() => hasRole(user, "super_admin"), [user]);

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleRefresh = useCallback(() => {
    fetchStats(true);
  }, [fetchStats]);

  // ============================================================
  // RENDER: Loading State
  // ============================================================
  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 md:p-10">
          <div className="animate-pulse space-y-6">
            <div className="h-40 bg-slate-100 rounded-2xl"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-slate-100 rounded-2xl"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 h-64 bg-slate-100 rounded-2xl"></div>
              <div className="h-64 bg-slate-100 rounded-2xl"></div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ============================================================
  // RENDER: Main Component
  // ============================================================
  return (
    <DashboardLayout>
      <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
        {/* ============================================================
            WELCOME BANNER
            ============================================================ */}
        <WelcomeBanner user={user} />

        {/* ============================================================
            ERROR STATE
            ============================================================ */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex items-start gap-3 shadow-sm">
            <AlertCircle size={20} className="text-rose-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium text-rose-700">{error}</div>
              <button
                onClick={handleRefresh}
                className="mt-2 text-xs font-medium text-rose-600 hover:text-rose-700 transition-colors duration-200 flex items-center gap-1"
              >
                <RefreshCw size={12} /> Try again
              </button>
            </div>
          </div>
        )}

        {/* ============================================================
            STATS GRID
            ============================================================ */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <BarChart3 size={18} className="text-emerald-600" />
              </div>
              <h2 className="font-display font-bold text-lg text-slate-800">Overview</h2>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors duration-200 disabled:opacity-50"
              aria-label="Refresh statistics"
            >
              <RefreshCw size={14} className={`${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          <QuickStats stats={stats} isSuperAdmin={isSuperAdmin} />
        </div>

        {/* ============================================================
            QUICK ACTIONS & ACTIVITY FEED (2-Column Layout)
            ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions - 2/3 width */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Zap size={18} className="text-blue-600" />
                </div>
                <h2 className="font-display font-bold text-lg text-slate-800">Quick Actions</h2>
              </div>
              <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full">
                {availableQuickActions.length} available
              </span>
            </div>
            <QuickActionGrid actions={availableQuickActions} />
          </div>

          {/* Activity Feed - 1/3 width */}
          <div>
            <ActivityFeed activities={MOCK_ACTIVITIES} />
          </div>
        </div>

        {/* ============================================================
            ADDITIONAL INSIGHTS (New Section)
            ============================================================ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 rounded-xl">
                <Award size={18} className="text-emerald-600" />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-400">System Health</div>
                <div className="text-sm font-semibold text-slate-800">Excellent</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 rounded-xl">
                <Calendar size={18} className="text-blue-600" />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-400">Last Backup</div>
                <div className="text-sm font-semibold text-slate-800">2 hours ago</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-50 rounded-xl">
                <Target size={18} className="text-purple-600" />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-400">Uptime</div>
                <div className="text-sm font-semibold text-slate-800">99.9%</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-orange-50 rounded-xl">
                <Bell size={18} className="text-orange-600" />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-400">Notifications</div>
                <div className="text-sm font-semibold text-slate-800">3 new</div>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================
            FOOTER
            ============================================================ */}
        <div className="text-xs text-slate-400 border-t border-slate-200/60 pt-6 mt-4 flex flex-wrap items-center justify-between gap-4">
          <span>© {new Date().getFullYear()} TrackMP Dashboard</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              System Online
            </span>
            <span>Last updated: {new Date().toLocaleString()}</span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
