import React, { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { ImageIcon, Video, FileText, FileArchive, LinkIcon, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { ensureUrl } from "../utils";

function AttachmentIcon({ fileType }) {
  if (fileType === "image") return <ImageIcon size={14} aria-hidden="true" />;
  if (fileType === "video") return <Video size={14} aria-hidden="true" />;
  if (fileType === "document") return <FileText size={14} aria-hidden="true" />;
  return <FileArchive size={14} aria-hidden="true" />;
}

export default function PromiseAttachments({ promise, canEdit, onUpdate }) {
  const links = promise.source_links || [];
  const files = promise.files || [];
  const [linkForm, setLinkForm] = useState({ name: "", url: "" });
  const [addingLink, setAddingLink] = useState(false);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const addLink = useCallback(async () => {
    if (!linkForm.url.trim()) return toast.error("URL is required");
    setAddingLink(true);
    try {
      const { data } = await api.post(`/promises/${promise.id}/links`, linkForm);
      onUpdate({ ...promise, source_links: [...links, data.link] });
      setLinkForm({ name: "", url: "" });
      toast.success("Link added");
    } catch {
      toast.error("Failed to add link");
    } finally {
      setAddingLink(false);
    }
  }, [linkForm, promise, onUpdate, links]);

  const removeLink = useCallback(async (linkId) => {
    if (!window.confirm("Remove this link?")) return;
    try {
      await api.delete(`/promises/${promise.id}/links/${linkId}`);
      onUpdate({ ...promise, source_links: links.filter((l) => l.id !== linkId) });
      toast.success("Link removed");
    } catch {
      toast.error("Failed to remove link");
    }
  }, [promise, onUpdate, links]);

  const uploadFile = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (fileName.trim()) formData.append("name", fileName.trim());
      const { data } = await api.post(`/promises/${promise.id}/files`, formData);
      onUpdate({ ...promise, files: [...files, data.file] });
      setFileName("");
      toast.success("File uploaded");
    } catch {
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [fileName, promise, onUpdate, files]);

  const removeFile = useCallback(async (fileId) => {
    if (!window.confirm("Remove this file?")) return;
    try {
      await api.delete(`/promises/${promise.id}/files/${fileId}`);
      onUpdate({ ...promise, files: files.filter((f) => f.id !== fileId) });
      toast.success("File removed");
    } catch {
      toast.error("Failed to remove file");
    }
  }, [promise, onUpdate, files]);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="mt-4 pt-4 border-t border-slate-200/50 space-y-4">
        {(links.length > 0 || files.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {links.map((l) => (
              <span key={l.id} className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-full pl-3 pr-1.5 py-1">
                <a href={ensureUrl(l.url)} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline max-w-[220px] truncate">
                  <LinkIcon size={11} aria-hidden="true" /> {l.name || l.url}
                </a>
                {canEdit && (
                  <button type="button" onClick={() => removeLink(l.id)} data-testid={`promise-link-remove-${l.id}`} className="hover:text-red-600 p-1 rounded-full hover:bg-red-50" aria-label="Remove link">
                    <Trash2 size={11} aria-hidden="true" />
                  </button>
                )}
              </span>
            ))}
            {files.map((f) => (
              <span key={f.id} className="inline-flex items-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold rounded-full pl-3 pr-1.5 py-1">
                <a href={ensureUrl(f.url)} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline max-w-[220px] truncate">
                  <AttachmentIcon fileType={f.file_type} /> {f.name || f.original_filename}
                </a>
                {canEdit && (
                  <button type="button" onClick={() => removeFile(f.id)} data-testid={`promise-file-remove-${f.id}`} className="hover:text-red-600 p-1 rounded-full hover:bg-red-50" aria-label="Remove file">
                    <Trash2 size={11} aria-hidden="true" />
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
        {canEdit && (
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <Label htmlFor={`link-name-${promise.id}`} className="text-slate-500 text-xs font-bold">Link name</Label>
                <Input id={`link-name-${promise.id}`} value={linkForm.name} onChange={(e) => setLinkForm({ ...linkForm, name: e.target.value })} placeholder="Optional label" className="border-slate-200 rounded-xl h-9 text-sm w-36" />
              </div>
              <div>
                <Label htmlFor={`link-url-${promise.id}`} className="text-slate-500 text-xs font-bold">Link URL</Label>
                <Input id={`link-url-${promise.id}`} value={linkForm.url} onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })} placeholder="https://..." className="border-slate-200 rounded-xl h-9 text-sm w-48" />
              </div>
              <Button size="sm" onClick={addLink} disabled={addingLink || !linkForm.url.trim()} data-testid={`promise-link-add-${promise.id}`} className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl h-9">
                Add link
              </Button>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <Label htmlFor={`file-name-${promise.id}`} className="text-slate-500 text-xs font-bold">File name</Label>
                <Input id={`file-name-${promise.id}`} value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="Optional label" className="border-slate-200 rounded-xl h-9 text-sm w-36" />
              </div>
              <Button size="sm" variant="outline" disabled={uploading} onClick={() => fileInputRef.current?.click()} data-testid={`promise-file-add-${promise.id}`} className="rounded-xl h-9">
                <Upload size={14} aria-hidden="true" /> {uploading ? "Uploading..." : "Attach file"}
              </Button>
              <input ref={fileInputRef} id={`file-input-${promise.id}`} type="file" className="hidden" onChange={uploadFile} aria-label="Upload file" />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
