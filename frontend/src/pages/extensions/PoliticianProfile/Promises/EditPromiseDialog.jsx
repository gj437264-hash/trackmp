import React, { useState, useEffect, useCallback } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { api } from "@/lib/api";

export default function EditPromiseDialog({ promise, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: promise.title || "",
    description: promise.description || "",
    date_made: promise.date_made || "",
    source_url: promise.source_url || "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        title: promise.title || "",
        description: promise.description || "",
        date_made: promise.date_made || "",
        source_url: promise.source_url || "",
      });
    }
  }, [open, promise]);

  const submit = useCallback(async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      await api.put(`/promises/${promise.id}`, form);
      onUpdated({ ...promise, ...form });
      setOpen(false);
      toast.success("Promise updated");
    } catch {
      toast.error("Failed to update promise");
    } finally {
      setSaving(false);
    }
  }, [form, promise, onUpdated]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          data-testid={`promise-edit-trigger-${promise.id}`}
          className="text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all duration-200"
          aria-label="Edit promise"
        >
          <Pencil size={14} aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white/95 backdrop-blur-sm border border-slate-200/50 rounded-2xl shadow-2xl max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display font-bold text-2xl text-slate-800 flex items-center gap-2">
            <Pencil className="text-indigo-500" size={22} aria-hidden="true" /> Edit Promise
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-title" className="text-slate-600 font-bold">Title *</Label>
            <Input
              id="edit-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              aria-required="true"
            />
          </div>
          <div>
            <Label htmlFor="edit-description" className="text-slate-600 font-bold">Description</Label>
            <Textarea
              id="edit-description"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-date" className="text-slate-600 font-bold">Date made</Label>
              <Input
                id="edit-date"
                type="date"
                value={form.date_made}
                onChange={(e) => setForm({ ...form, date_made: e.target.value })}
                className="border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              />
            </div>
            <div>
              <Label htmlFor="edit-source" className="text-slate-600 font-bold">Primary source URL</Label>
              <Input
                id="edit-source"
                value={form.source_url}
                onChange={(e) => setForm({ ...form, source_url: e.target.value })}
                placeholder="https://..."
                className="border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={submit}
            disabled={saving || !form.title.trim()}
            className="bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white rounded-xl px-8 py-3 font-bold transition-all duration-300"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
