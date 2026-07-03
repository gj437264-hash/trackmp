import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Trash, Edit, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function Admins() {
  const [items, setItems] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ email: "", name: "", password: "" });
  const [editForm, setEditForm] = useState({ name: "", password: "", role: "admin" });

  const load = async () => {
    const { data } = await api.get("/admin/admins");
    setItems(data.items || []);
  };
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/admins", form);
      toast.success("Admin created.");
      setShowCreate(false);
      setForm({ email: "", name: "", password: "" });
      load();
    } catch (e2) { toast.error(formatApiError(e2)); }
  };
  const doDelete = async (u) => {
    if (!window.confirm(`Delete admin ${u.email}?`)) return;
    try { await api.delete(`/admin/admins/${u.id}`); toast.success("Deleted."); load(); }
    catch (e2) { toast.error(formatApiError(e2)); }
  };
  const openEdit = (u) => {
    setEditUser(u);
    setEditForm({ name: u.name || "", password: "", role: u.role });
  };
  const saveEdit = async (e) => {
    e.preventDefault();
    try {
      const body = { name: editForm.name, role: editForm.role };
      if (editForm.password) body.password = editForm.password;
      await api.put(`/admin/admins/${editUser.id}`, body);
      toast.success("Updated.");
      setEditUser(null);
      load();
    } catch (e2) { toast.error(formatApiError(e2)); }
  };

  return (
    <DashboardLayout>
      <div className="p-6 md:p-10">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="label-eyebrow">/// Personnel</div>
            <h1 className="mt-2 font-display font-black text-4xl uppercase tracking-tighter">Admins</h1>
          </div>
          <button data-testid="create-admin-btn" onClick={() => setShowCreate(true)} className="brutal-btn-primary">
            <Plus size={16} className="mr-2" /> New Admin
          </button>
        </div>

        <div className="mt-8 border-2 border-black bg-white overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-surfaceAlt">
              <tr>
                {["Email", "Name", "Role", "Created", "Actions"].map((h) => (
                  <th key={h} className="text-left text-xs font-bold uppercase tracking-wider p-3 border-b-2 border-black">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id} className="border-b border-neutral-300" data-testid={`admin-row-${u.id}`}>
                  <td className="p-3 font-mono text-sm">{u.email}</td>
                  <td className="p-3 font-bold">{u.name || "—"}</td>
                  <td className="p-3"><span className="text-[10px] font-bold uppercase bg-black text-white px-2 py-1">{u.role.replace("_", " ")}</span></td>
                  <td className="p-3 font-mono text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="p-3">
                    {u.role !== "super_admin" ? (
                      <div className="flex gap-2">
                        <button data-testid={`edit-${u.id}`} onClick={() => openEdit(u)} className="brutal-btn-secondary text-xs px-3 py-1.5"><Edit size={12} /></button>
                        <button data-testid={`delete-${u.id}`} onClick={() => doDelete(u)} className="brutal-btn-danger text-xs px-3 py-1.5"><Trash size={12} /></button>
                      </div>
                    ) : <span className="label-eyebrow">Protected</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="brutal-card p-0 rounded-none">
            <DialogHeader className="p-6 border-b-2 border-black">
              <DialogTitle className="font-display uppercase text-2xl">Create Admin</DialogTitle>
            </DialogHeader>
            <form onSubmit={create} className="p-6 space-y-4">
              <div>
                <label className="label-eyebrow block mb-2">Email</label>
                <input data-testid="new-admin-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="brutal-input" />
              </div>
              <div>
                <label className="label-eyebrow block mb-2">Name</label>
                <input data-testid="new-admin-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="brutal-input" />
              </div>
              <div>
                <label className="label-eyebrow block mb-2">Password</label>
                <input data-testid="new-admin-password" type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="brutal-input" />
              </div>
              <DialogFooter>
                <button data-testid="save-admin" type="submit" className="brutal-btn-primary w-full">Create</button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
          <DialogContent className="brutal-card p-0 rounded-none">
            <DialogHeader className="p-6 border-b-2 border-black">
              <DialogTitle className="font-display uppercase text-2xl">Edit Admin</DialogTitle>
            </DialogHeader>
            {editUser && (
              <form onSubmit={saveEdit} className="p-6 space-y-4">
                <div className="font-mono text-sm">{editUser.email}</div>
                <div>
                  <label className="label-eyebrow block mb-2">Name</label>
                  <input required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="brutal-input" />
                </div>
                <div>
                  <label className="label-eyebrow block mb-2">New Password <span className="text-neutral-500">(optional)</span></label>
                  <input type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} className="brutal-input" />
                </div>
                <div>
                  <label className="label-eyebrow block mb-2">Role</label>
                  <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className="brutal-input">
                    <option value="admin">Admin</option>
                    <option value="user">User</option>
                  </select>
                </div>
                <button type="submit" className="brutal-btn-primary w-full">Save</button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
