import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatApiErrorDetail } from "@/lib/api";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await login(email, password);
      navigate("/feed");
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || "Login failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-12 bg-zinc-50">
      <div className="w-full max-w-md bg-white border border-zinc-200 rounded-md p-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-zinc-600 mt-1 text-sm">Log in to add politicians, log promises, and vote.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input data-testid="login-email-input" id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input data-testid="login-password-input" id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {error && <div data-testid="login-error" className="text-sm text-red-700 bg-red-50 border border-red-200 p-2 rounded">{error}</div>}
          <Button data-testid="login-submit-btn" type="submit" className="w-full bg-zinc-900 hover:bg-zinc-800" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
        <div className="mt-6 text-sm text-zinc-600 text-center">
          New here? <Link data-testid="login-to-register-link" to="/register" className="text-blue-600 hover:underline">Create an account</Link>
        </div>
      </div>
    </div>
  );
}
