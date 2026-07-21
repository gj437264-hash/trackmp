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
