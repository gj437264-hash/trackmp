import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatApiErrorDetail } from "@/lib/api";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await register(email, password, name);
      navigate("/feed");
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || "Registration failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-12 bg-zinc-50">
      <div className="w-full max-w-md bg-white border border-zinc-200 rounded-md p-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Create your account</h1>
        <p className="text-zinc-600 mt-1 text-sm">Join the citizens documenting public service.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="name">Display name</Label>
            <Input data-testid="register-name-input" id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input data-testid="register-email-input" id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div>
            <Label htmlFor="password">Password (min 6 chars)</Label>
            <Input data-testid="register-password-input" id="password" type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {error && <div data-testid="register-error" className="text-sm text-red-700 bg-red-50 border border-red-200 p-2 rounded">{error}</div>}
          <Button data-testid="register-submit-btn" type="submit" className="w-full bg-zinc-900 hover:bg-zinc-800" disabled={loading}>
            {loading ? "Creating..." : "Create account"}
          </Button>
        </form>
        <div className="mt-6 text-sm text-zinc-600 text-center">
          Already have an account? <Link data-testid="register-to-login-link" to="/login" className="text-blue-600 hover:underline">Log in</Link>
        </div>
      </div>
    </div>
  );
}
