import React, { useState, useCallback } from "react";
import { Plus, Award as AwardIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { PROMISE_STATUS } from "./promiseStatus";

export default function AddPromiseDialog({ politicianId, onAdded }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", status: "pending", date_made: "", source_url: "" });

  const submit = useCallback(async () => {
    setSaving(true);
    try {
      const { data } = await api.post(`/politicians/${politicianId}/promises`, form);
      onAdded(data);
      setForm({ title: "", description: "", status: "pending", date_made: "", source_url: "" });
      setOpen(false);
      toast.success("Promise added successfully!");
    } catch {
      toast.error("Failed to add promise");
    } finally {
      setSaving(false);
    }
  }, [politicianId, form, onAdded]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 text-white font-display font-bold text-sm px-8 py-4 rounded-2xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transition-all duration-300 hover:scale-105 active:scale-95"
          data-testid="add-promise-trigger"
        >
          <Plus size={18} aria-hidden="true" /> Log Promise
        </button>
      </DialogTrigger>
      <DialogContent className="bg-white/95 backdrop-blur-sm border border-slate-200/50 rounded-2xl shadow-2xl max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display font-bold text-2xl text-slate-800 flex items-center gap-2">
            <AwardIcon className="text-indigo-500" size={24} aria-hidden="true" /> Log a Promise
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="add-title" className="text-slate-600 font-bold">Title *</Label>
            <Input
              id="add-title"
              data-testid="promise-title-input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Build 50 new schools by 2026"
              className="border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              aria-required="true"
            />
          </div>
          <div>
            <Label htmlFor="add-description" className="text-slate-600 font-bold">Description</Label>
            <Textarea
              id="add-description"
              data-testid="promise-desc-input"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="add-status" className="text-slate-600 font-bold">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger id="add-status" data-testid="promise-status-input" className="border-slate-200 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROMISE_STATUS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="add-date" className="text-slate-600 font-bold">Date made</Label>
              <Input
                id="add-date"
                data-testid="promise-date-input"
                type="date"
                value={form.date_made}
                onChange={(e) => setForm({ ...form, date_made: e.target.value })}
                className="border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="add-source" className="text-slate-600 font-bold">Source URL</Label>
            <Input
              id="add-source"
              data-testid="promise-source-input"
              value={form.source_url}
              onChange={(e) => setForm({ ...form, source_url: e.target.value })}
              placeholder="https://..."
              className="border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            data-testid="promise-submit-btn"
            onClick={submit}
            disabled={saving || !form.title}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl px-8 py-3 font-bold transition-all duration-300"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin" aria-hidden="true">⚡</span> Saving...
              </span>
            ) : (
              "Add Promise"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
