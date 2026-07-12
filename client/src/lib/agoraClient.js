import AgoraRTC from 'agora-rtc-sdk-ng'

// Centralizes the Agora RTC lifecycle so AgentPage only deals with React state.
export function createAgoraClient() {
  return AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
}

export async function joinChannel({ client, appId, channel, token, uid }) {
  return client.join(appId, channel, token || null, uid)
}

export async function publishMicrophone(client) {
  const microphoneTrack = await AgoraRTC.createMicrophoneAudioTrack()
  await client.publish([microphoneTrack])
  return microphoneTrack
}

export async function leaveChannel(client, localTracks = []) {
  localTracks.forEach((track) => {
    track.stop()
    track.close()
  })
  await client.leave()
}
