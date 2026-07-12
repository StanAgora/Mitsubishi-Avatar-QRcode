// Tracks a QR session's check-in state so the PC landing page knows when to
// load the agent. In-memory only — fine for a demo (single process, resets
// on restart).
//
// State machine: none -> scanned -> confirmed
//                              \-> cancelled -> (can be confirmed later)
const sessions = new Map()
const SESSION_TTL_MS = 30 * 60 * 1000

function cleanup() {
  const now = Date.now()
  for (const [id, session] of sessions) {
    if (now - session.createdAt > SESSION_TTL_MS) sessions.delete(id)
  }
}

function getOrCreate(sessionId) {
  cleanup()
  let session = sessions.get(sessionId)
  if (!session) {
    session = { createdAt: Date.now(), state: 'none', updatedAt: Date.now() }
    sessions.set(sessionId, session)
  }
  return session
}

function setState(sessionId, state) {
  const session = getOrCreate(sessionId)
  session.state = state
  session.updatedAt = Date.now()
  return session
}

export function markScanned(sessionId) {
  const session = getOrCreate(sessionId)
  if (session.state === 'none') return setState(sessionId, 'scanned')
  return session
}

export function confirmSession(sessionId) {
  return setState(sessionId, 'confirmed')
}

export function cancelSession(sessionId) {
  return setState(sessionId, 'cancelled')
}

export function getStatus(sessionId) {
  cleanup()
  const session = sessions.get(sessionId)
  return { state: session?.state ?? 'none', updatedAt: session?.updatedAt ?? null }
}
