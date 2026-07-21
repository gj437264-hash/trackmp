#!/usr/bin/env bash
# Scaffolds the shared image-upload helper + a reusable React component.
# Creates NEW files only -- never touches your existing pages.
# Run from: /opt/trackmp/frontend

set -euo pipefail

SRC_DIR="src"
LIB_DIR="$SRC_DIR/lib"
COMPONENTS_DIR="$SRC_DIR/components"

mkdir -p "$LIB_DIR" "$COMPONENTS_DIR"

if [ -f "$LIB_DIR/images.js" ]; then
  echo "SKIP: $LIB_DIR/images.js already exists — not overwriting."
else
  cat > "$LIB_DIR/images.js" <<'EOF'
// Shared helper for the /api/images router. Uses your existing login
// session (httponly cookie) -- no separate API key needed.
const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

/**
 * @param {File} file
 * @param {string} context - profile_photo | product_image | blog_cover |
 *                            listing_photo | generic (must match backend
 *                            IMAGE_UPLOAD_CONTEXTS)
 */
export async function uploadImage(file, context, { quality } = {}) {
  const form = new FormData();
  form.append("file", file);

  const params = new URLSearchParams({ context });
  if (quality) params.set("quality", quality);

  const res = await fetch(`${API_BASE}/api/images/upload?${params}`, {
    method: "POST",
    credentials: "include",
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Upload failed (${res.status})`);
  }
  return res.json(); // { file_id, url, status, ... }
}

export function imageUrl(fileId) {
  return `${API_BASE}/api/images/${fileId}`;
}

export async function deleteImage(fileId) {
  const res = await fetch(`${API_BASE}/api/images/${fileId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Delete failed (${res.status})`);
  return res.json();
}

export async function listMyImages(context) {
  const qs = context ? `?context=${encodeURIComponent(context)}` : "";
  const res = await fetch(`${API_BASE}/api/images${qs}`, { credentials: "include" });
  if (!res.ok) throw new Error(`List failed (${res.status})`);
  return res.json();
}
EOF
  echo "CREATED: $LIB_DIR/images.js"
fi

if [ -f "$COMPONENTS_DIR/ImageUploader.jsx" ]; then
  echo "SKIP: $COMPONENTS_DIR/ImageUploader.jsx already exists — not overwriting."
else
  cat > "$COMPONENTS_DIR/ImageUploader.jsx" <<'EOF'
import { useState, useRef } from "react";
import { uploadImage, imageUrl } from "../lib/images";

/**
 * Drop-in image uploader. Usage:
 *
 *   <ImageUploader context="profile_photo" onUploaded={(fileId) => ...} />
 *
 * Props:
 *   context      - required, must match a backend IMAGE_UPLOAD_CONTEXTS value
 *   onUploaded   - called with (fileId, fullResult) once upload starts
 *   initialUrl   - existing image url to show before any new upload
 *   label        - button text
 */
export default function ImageUploader({ context, onUploaded, initialUrl, label = "Upload image" }) {
  const [preview, setPreview] = useState(initialUrl || null);
  const [status, setStatus] = useState("idle"); // idle | uploading | error
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef(null);

  async function handleChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus("uploading");
    setErrorMsg("");
    setPreview(URL.createObjectURL(file)); // instant local preview

    try {
      const result = await uploadImage(file, context);
      setPreview(imageUrl(result.file_id));
      setStatus("idle");
      onUploaded?.(result.file_id, result);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message || "Upload failed");
    }
  }

  return (
    <div className="image-uploader">
      {preview && (
        <img
          src={preview}
          alt="preview"
          style={{ maxWidth: 200, maxHeight: 200, display: "block", marginBottom: 8 }}
        />
      )}
      <button type="button" onClick={() => inputRef.current?.click()} disabled={status === "uploading"}>
        {status === "uploading" ? "Uploading..." : label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleChange}
        style={{ display: "none" }}
      />
      {status === "error" && <p style={{ color: "red" }}>{errorMsg}</p>}
    </div>
  );
}
EOF
  echo "CREATED: $COMPONENTS_DIR/ImageUploader.jsx"
fi

echo ""
echo "Done. Nothing under src/pages was touched."
echo "Next: tell me which page(s) to wire this into and share their current"
echo "upload-related code so I can make a precise, non-breaking edit."
