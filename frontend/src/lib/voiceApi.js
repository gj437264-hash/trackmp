import { api } from "@/lib/api";

export const voiceApi = {
  listDiscussions: () => api.get("/voice/discussions"),
  getDiscussion: (articleId) => api.get(`/voice/discussions/${articleId}`),
  postComment: (articleId, body, parentId = null) =>
    api.post(`/voice/discussions/${articleId}/comments`, {
      body,
      parent_id: parentId,
      website: "", // honeypot — must stay empty
      form_rendered_at: window.__voiceFormRenderedAt || new Date().toISOString(),
    }),
  editComment: (commentId, body) =>
    api.patch(`/voice/comments/${commentId}`, { body, website: "" }),
  reportComment: (commentId, reason) =>
    api.post(`/voice/comments/${commentId}/report`, { reason }),
};
