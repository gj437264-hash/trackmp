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
