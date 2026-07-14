// Deterministic per-thread anonymous ID. Salts a persistent local session ID
// with the thread ID so the same visitor keeps one identity within a thread,
// but gets a completely different one on another thread/article.

function getSessionId() {
  let sid = localStorage.getItem("_voice_sid");
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("_voice_sid", sid);
  }
  return sid;
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getAnonId(threadId) {
  const sid = getSessionId();
  const hash = hashString(`${sid}::${threadId}`);
  return hash.toString(16).padStart(6, "0").slice(0, 6);
}

export function getAnonLabel(threadId) {
  return `Anon#${getAnonId(threadId)}`;
}
