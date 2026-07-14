const AVATAR_COLORS = ["#C4432B", "#1F6E5C", "#D9A441", "#9E3521", "#154E42", "#B3862F"];

export function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export function getAvatarColor(name) {
  const hash = hashString(name || "?");
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function avatarDataUri(name) {
  const initials = getInitials(name);
  const color = getAvatarColor(name);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="${color}"/><text x="50%" y="50%" dy=".35em" text-anchor="middle" font-family="Georgia, serif" font-size="80" font-weight="700" fill="#FBF7F0">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
