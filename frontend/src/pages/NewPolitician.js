import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function NewPolitician() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", party: "", country: "", state: "", city: "", constituency: "", position: "", position_since: "", photo_url: "", bio: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (user === false) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
        <h2 className="font-display text-2xl font-bold">Please log in</h2>
        <p className="text-zinc-600 mt-2">You need an account to contribute to the ledger.</p>
        <Button data-testid="new-pol-login-redirect" className="mt-6 bg-zinc-900 hover:bg-zinc-800" onClick={() => navigate("/login")}>Log in</Button>
      </div>
    );
  }

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      const { data } = await api.post("/politicians", form);
      toast.success("Politician added");
      navigate(`/politicians/${data.id}`);
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || "Failed to create");
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <span className="text-xs uppercase tracking-wider font-medium text-zinc-500">Contribute</span>
      <h1 className="font-display text-4xl font-bold tracking-tight mt-1">Add a politician</h1>
      <p className="text-zinc-600 mt-2">Provide accurate, verifiable information. Other citizens will see and edit this record.</p>

      <form onSubmit={submit} className="mt-8 space-y-4 border border-zinc-200 rounded-md p-6 bg-white">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Full name *</Label>
            <Input data-testid="new-pol-name" id="name" required value={form.name} onChange={update("name")} placeholder="Jane Doe" />
          </div>
          <div>
            <Label htmlFor="party">Party *</Label>
            <Input data-testid="new-pol-party" id="party" required value={form.party} onChange={update("party")} placeholder="e.g. Independent" />
          </div>
          <div>
            <Label htmlFor="position">Position *</Label>
            <Input data-testid="new-pol-position" id="position" required value={form.position} onChange={update("position")} placeholder="MP, MLA, Mayor..." />
          </div>
          <div>
            <Label htmlFor="position_since">In position since</Label>
            <Input data-testid="new-pol-since" id="position_since" type="date" value={form.position_since} onChange={update("position_since")} />
          </div>
          <div>
            <Label htmlFor="country">Country *</Label>
            <Input data-testid="new-pol-country" id="country" required value={form.country} onChange={update("country")} placeholder="e.g. India" />
          </div>
          <div>
            <Label htmlFor="state">State / Region *</Label>
            <Input data-testid="new-pol-state" id="state" required value={form.state} onChange={update("state")} placeholder="e.g. California" />
          </div>
          <div>
            <Label htmlFor="city">City</Label>
            <Input data-testid="new-pol-city" id="city" value={form.city} onChange={update("city")} placeholder="e.g. Los Angeles" />
          </div>
          <div>
            <Label htmlFor="constituency">Constituency *</Label>
            <Input data-testid="new-pol-constituency" id="constituency" required value={form.constituency} onChange={update("constituency")} placeholder="e.g. District 12" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="photo_url">Photo URL</Label>
            <Input data-testid="new-pol-photo" id="photo_url" value={form.photo_url} onChange={update("photo_url")} placeholder="https://..." />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="bio">Short bio</Label>
            <Textarea data-testid="new-pol-bio" id="bio" rows={4} value={form.bio} onChange={update("bio")} placeholder="Career, key issues, background..." />
          </div>
        </div>
        {error && <div data-testid="new-pol-error" className="text-sm text-red-700 bg-red-50 border border-red-200 p-2 rounded">{error}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <Button data-testid="new-pol-cancel" type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          <Button data-testid="new-pol-submit" type="submit" className="bg-zinc-900 hover:bg-zinc-800" disabled={saving}>
            {saving ? "Saving..." : "Add politician"}
          </Button>
        </div>
      </form>
    </div>
  );
}
