/**
 * When true, the assistant panel is visible but chat is disabled with a coming-soon notice.
 * Set `VITE_AI_ASSISTANT_COMING_SOON=false` in `.env` to enable live chat.
 */
export const AI_ASSISTANT_COMING_SOON = (() => {
  const raw = String(import.meta.env.VITE_AI_ASSISTANT_COMING_SOON ?? 'true').trim().toLowerCase()
  if (raw === 'false' || raw === '0' || raw === 'no') return false
  return true
})()
