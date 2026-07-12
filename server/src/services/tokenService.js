import pkg from 'agora-token'

const { RtcTokenBuilder, RtcRole } = pkg

const TOKEN_TTL_SECONDS = 3600

function requireCredentials() {
  const appId = process.env.AGORA_APP_ID
  const appCertificate = process.env.AGORA_APP_CERTIFICATE

  if (!appId || !appCertificate) {
    throw new Error('AGORA_APP_ID / AGORA_APP_CERTIFICATE is not configured')
  }

  return { appId, appCertificate }
}

// RTC-only token, used for server-side participants (the conversational
// agent's audio uid and the avatar's video uid) that never need RTM login.
export function buildRtcToken({ channel, uid }) {
  const { appId, appCertificate } = requireCredentials()
  const expireAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS

  return RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    channel,
    uid,
    RtcRole.PUBLISHER,
    expireAt,
    expireAt,
  )
}

// Combined RTC + RTM token for the browser client: it joins the RTC channel
// and logs into RTM (same uid, as a string) to receive transcription events.
export function buildRtcAndRtmToken({ channel, uid }) {
  const { appId, appCertificate } = requireCredentials()
  const expireAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS

  return RtcTokenBuilder.buildTokenWithRtm(
    appId,
    appCertificate,
    channel,
    String(uid),
    RtcRole.PUBLISHER,
    expireAt,
    expireAt,
  )
}
