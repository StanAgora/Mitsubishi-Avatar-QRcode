export function createSessionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

// The QR code sends the phone to the check-in page, not the agent page —
// the agent's avatar is loaded on the PC that displayed the QR code.
export function buildCheckinUrl(sessionId) {
  return `${window.location.origin}/checkin/${sessionId}`
}
