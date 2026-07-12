import { RTM, setParameter } from 'agora-rtm'

// We only need channel messages (transcriptions), not presence. This project's
// Presence service isn't reachable, which otherwise spams
// "Presence service not connected" errors on every subscribe.
setParameter('DISABLE_PRESENCE', true)

// Wraps the Agora RTM client used to receive the agent's live transcription
// events (user.transcription / assistant.transcription) over the same
// channel the avatar's audio/video is published to.
//
// Note: the npm package's .d.ts advertises this class as `RTMClient`, but
// the actual runtime bundle (agora-rtm.js, UMD) only exports it as `RTM`.
export function createRtmClient({ appId, uid }) {
  return new RTM(appId, String(uid))
}

export async function loginAndSubscribe(rtmClient, { channel, token }) {
  await rtmClient.login({ token })
  await rtmClient.subscribe(channel, { withPresence: false, beQuiet: true })
}

export async function leaveRtm(rtmClient, { channel }) {
  if (!rtmClient) return
  await rtmClient.unsubscribe(channel).catch(() => {})
  await rtmClient.logout().catch(() => {})
}

// Parses a raw RTM message payload and returns { role, text } for a final
// transcription chunk, or null if the message isn't a transcription event.
export function parseTranscription(message) {
  let data
  try {
    data = JSON.parse(message)
  } catch {
    return null
  }

  if (data.object === 'user.transcription' && data.final === true) {
    return { role: 'user', text: data.text }
  }
  if (data.object === 'assistant.transcription' && data.turn_status === 1) {
    return { role: 'agent', text: data.text }
  }
  return null
}
