import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ScrollText, Plus, LogOut, User as UserIcon } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center h-14 gap-6">
        <Link to="/" data-testid="nav-logo" className="flex items-center gap-2 font-display font-bold text-lg tracking-tight">
          <ScrollText className="h-5 w-5" />
          <span>TrackMP</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link data-testid="nav-feed-link" to="/feed" className="text-zinc-700 hover:text-zinc-950">Politicians</Link>
          <Link data-testid="nav-add-link" to="/politicians/new" className="text-zinc-700 hover:text-zinc-950">Add Politician</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {user && user !== false ? (
            <>
              <Button data-testid="nav-new-btn" size="sm" variant="outline" className="hidden sm:inline-flex" onClick={() => navigate("/politicians/new")}>
                <Plus className="h-4 w-4 mr-1" /> New
              </Button>
              <div className="hidden sm:flex items-center gap-2 px-2 py-1 border border-zinc-200 rounded-md">
                <UserIcon className="h-4 w-4 text-zinc-500" />
                <span data-testid="nav-user-name" className="text-sm">{user.name}</span>
              </div>
              <Button data-testid="nav-logout-btn" size="sm" variant="ghost" onClick={async () => { await logout(); navigate("/"); }}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button data-testid="nav-login-btn" size="sm" variant="ghost" onClick={() => navigate("/login")}>Login</Button>
              <Button data-testid="nav-signup-btn" size="sm" className="bg-zinc-900 hover:bg-zinc-800" onClick={() => navigate("/register")}>Sign up</Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
