const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

async function requestJson(path, options) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`${path} failed: ${res.status} ${body}`)
  }
  return res.json()
}

export function fetchRtcToken({ channel, uid }) {
  return requestJson('/token', {
    method: 'POST',
    body: JSON.stringify({ channel, uid }),
  })
}

export function startAgent({ channel, uid }) {
  return requestJson('/agent/start', {
    method: 'POST',
    body: JSON.stringify({ channel, uid }),
  })
}

export function stopAgent({ agentId }) {
  return requestJson('/agent/stop', {
    method: 'POST',
    body: JSON.stringify({ agentId }),
  })
}

export function markSessionScanned(sessionId) {
  return requestJson(`/session/${sessionId}/scan`, { method: 'POST' })
}

export function confirmSession(sessionId) {
  return requestJson(`/session/${sessionId}/confirm`, { method: 'POST' })
}

export function cancelSession(sessionId) {
  return requestJson(`/session/${sessionId}/cancel`, { method: 'POST' })
}

export function fetchSessionStatus(sessionId) {
  return requestJson(`/session/${sessionId}/status`)
}
