import axios from 'axios'
import { buildRtcToken, buildRtcAndRtmToken } from './tokenService.js'
import { buildAgentProperties } from '../config/agentProfile.js'

function getAuthHeader() {
  const customerId = process.env.AGORA_CUSTOMER_ID
  const customerSecret = process.env.AGORA_CUSTOMER_SECRET
  const credentials = Buffer.from(`${customerId}:${customerSecret}`).toString('base64')
  return `Basic ${credentials}`
}

function getProjectUrl() {
  const baseUrl = process.env.AGORA_CONVO_AI_BASE_URL
  const appId = process.env.AGORA_APP_ID
  return `${baseUrl}/${appId}`
}

function randomUid(exclude = []) {
  let uid
  do {
    uid = Math.floor(100000 + Math.random() * 900000)
  } while (exclude.includes(uid))
  return uid
}

// Joins a Conversational AI Agent (TTS audio + Avatar video) into the given
// channel so it can converse with `uid` (the browser client already in the
// channel). The agent publishes audio under its own uid and the avatar
// publishes video under a second uid, both generated here.
export async function joinAgent({ channel, uid }) {
  const agentUid = randomUid([uid])
  const avatarUid = randomUid([uid, agentUid])

  // The agent logs into RTM (in addition to RTC) to publish transcriptions,
  // so its token needs RTM login privilege, not just RTC. The avatar only
  // publishes video and never touches RTM, so it stays RTC-only.
  const agentToken = buildRtcAndRtmToken({ channel, uid: agentUid })
  const avatarToken = buildRtcToken({ channel, uid: avatarUid })

  const properties = buildAgentProperties({
    channel,
    agentToken,
    agentUid,
    remoteUids: [uid],
    avatarUid,
    avatarToken,
  })

  const payload = { name: `avatar-session-${channel}`, properties }

  // TEMP DEBUG: log the exact payload sent to Agora's /join endpoint (and its
  // response) while diagnosing missing RTM transcription messages.
  console.log('[ConvoAI] POST', `${getProjectUrl()}/join`)
  console.log('[ConvoAI] payload', JSON.stringify(payload, null, 2))

  const response = await axios.post(`${getProjectUrl()}/join`, payload, {
    headers: { Authorization: getAuthHeader(), 'Content-Type': 'application/json' },
  })

  console.log('[ConvoAI] response', JSON.stringify(response.data, null, 2))
  console.log('[ConvoAI] agent_id', response.data.agent_id)

  return { agentId: response.data.agent_id, raw: response.data }
}

export async function leaveAgent({ agentId }) {
  await axios.post(
    `${getProjectUrl()}/agents/${agentId}/leave`,
    {},
    { headers: { Authorization: getAuthHeader(), 'Content-Type': 'application/json' } },
  )
}
