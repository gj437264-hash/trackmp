import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function EditPolitician() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/politicians/${id}`).then(({ data }) => {
      setForm({
        name: data.name, party: data.party, country: data.country || "", state: data.state,
        city: data.city || "", constituency: data.constituency, position: data.position,
        position_since: data.position_since || "",
        photo_url: data.photo_url || "", bio: data.bio || "",
      });
    }).catch(() => toast.error("Failed to load"));
  }, [id]);

  if (user === false) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
        <h2 className="font-display text-2xl font-bold">Please log in</h2>
        <Button data-testid="edit-pol-login-redirect" className="mt-6 bg-zinc-900 hover:bg-zinc-800" onClick={() => navigate("/login")}>Log in</Button>
      </div>
    );
  }
  if (!form) return <div className="max-w-7xl mx-auto px-4 py-20 text-center text-zinc-500">Loading...</div>;

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      await api.put(`/politicians/${id}`, form);
      toast.success("Updated");
      navigate(`/politicians/${id}`);
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || "Failed");
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <span className="text-xs uppercase tracking-wider font-medium text-zinc-500">Edit</span>
      <h1 className="font-display text-4xl font-bold tracking-tight mt-1">Edit politician</h1>
      <form onSubmit={submit} className="mt-8 space-y-4 border border-zinc-200 rounded-md p-6 bg-white">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label>Full name *</Label><Input data-testid="edit-pol-name" required value={form.name} onChange={update("name")} /></div>
          <div><Label>Party *</Label><Input data-testid="edit-pol-party" required value={form.party} onChange={update("party")} /></div>
          <div><Label>Position *</Label><Input data-testid="edit-pol-position" required value={form.position} onChange={update("position")} /></div>
          <div><Label>In position since</Label><Input data-testid="edit-pol-since" type="date" value={form.position_since} onChange={update("position_since")} /></div>
          <div><Label>Country *</Label><Input data-testid="edit-pol-country" required value={form.country} onChange={update("country")} /></div>
          <div><Label>State / Region *</Label><Input data-testid="edit-pol-state" required value={form.state} onChange={update("state")} /></div>
          <div><Label>City</Label><Input data-testid="edit-pol-city" value={form.city} onChange={update("city")} /></div>
          <div><Label>Constituency *</Label><Input data-testid="edit-pol-constituency" required value={form.constituency} onChange={update("constituency")} /></div>
          <div className="sm:col-span-2"><Label>Photo URL</Label><Input data-testid="edit-pol-photo" value={form.photo_url} onChange={update("photo_url")} /></div>
          <div className="sm:col-span-2"><Label>Short bio</Label><Textarea data-testid="edit-pol-bio" rows={4} value={form.bio} onChange={update("bio")} /></div>
        </div>
        {error && <div data-testid="edit-pol-error" className="text-sm text-red-700 bg-red-50 border border-red-200 p-2 rounded">{error}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <Button data-testid="edit-pol-cancel" type="button" variant="outline" onClick={() => navigate(`/politicians/${id}`)}>Cancel</Button>
          <Button data-testid="edit-pol-submit" type="submit" className="bg-zinc-900 hover:bg-zinc-800" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
