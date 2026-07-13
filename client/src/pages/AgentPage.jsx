import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { createAgoraClient, joinChannel, publishMicrophone, leaveChannel } from '../lib/agoraClient.js'
import { createRtmClient, loginAndSubscribe, leaveRtm, parseTranscription } from '../lib/rtmClient.js'
import { fetchRtcToken, startAgent, stopAgent } from '../lib/api.js'
import './AgentPage.css'

const APP_ID = import.meta.env.VITE_AGORA_APP_ID

export default function AgentPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const [status, setStatus] = useState('connecting')
  const [errorMessage, setErrorMessage] = useState(null)
  const [captions, setCaptions] = useState([])

  useEffect(() => {
    let cancelled = false
    const client = createAgoraClient()
    let micTrack = null
    let agentId = null
    let rtmClient = null

    // StrictMode runs this effect twice in dev (mount -> cleanup -> mount).
    // Because each step below is async, the outer cleanup can fire before a
    // given step has stored its handle (micTrack/agentId/rtmClient are still
    // null), so it can't tear that step down. Checking `cancelled` after every
    // await -- and tearing down whatever just completed -- stops the first
    // run's in-flight join/publish/startAgent from leaking into the channel
    // alongside the second run's, which was producing a duplicate local
    // participant and a duplicate agent (the echo).
    async function setup() {
      try {
        const uid = Math.floor(Math.random() * 100000)
        const { token } = await fetchRtcToken({ channel: sessionId, uid })
        if (cancelled) return

        client.on('user-published', async (user, mediaType) => {
          await client.subscribe(user, mediaType)
          if (mediaType === 'video' && videoRef.current) {
            user.videoTrack?.play(videoRef.current)
          }
          if (mediaType === 'audio') {
            user.audioTrack?.play()
          }
        })

        await joinChannel({ client, appId: APP_ID, channel: sessionId, token, uid })
        if (cancelled) {
          await leaveChannel(client, [])
          return
        }

        micTrack = await publishMicrophone(client)
        if (cancelled) {
          await leaveChannel(client, micTrack ? [micTrack] : [])
          micTrack = null
          return
        }

        rtmClient = createRtmClient({ appId: APP_ID, uid })
        rtmClient.addEventListener('status', (event) => {
          console.log('[RTM] status', event)
        })
        rtmClient.addEventListener('message', (event) => {
          // TEMP DEBUG: log every raw RTM message so we can see the actual
          // payload shape in devtools while diagnosing missing captions.
          console.log('[RTM] message', event)
          const parsed = parseTranscription(event.message)
          console.log('[RTM] parsed', parsed)
          if (!parsed) return
          setCaptions((prev) => [...prev, { id: `${Date.now()}-${prev.length}`, ...parsed }].slice(-6))
        })
        await loginAndSubscribe(rtmClient, { channel: sessionId, token })
        console.log('[RTM] login + subscribe done', { channel: sessionId, uid })
        // TEMP DEBUG: expose the client so we can check, from devtools after a
        // real conversation, whether the agent ever published ANYTHING to
        // this RTM channel -- independent of our own 'message' listener.
        // Run in the console:
        //   await window.__rtm.history.getMessages(window.__rtmChannel, 'MESSAGE', { messageCount: 50 })
        window.__rtm = rtmClient
        window.__rtmChannel = sessionId
        if (cancelled) {
          await leaveRtm(rtmClient, { channel: sessionId })
          rtmClient = null
          await leaveChannel(client, micTrack ? [micTrack] : [])
          micTrack = null
          return
        }

        const agentResult = await startAgent({ channel: sessionId, uid })
        if (cancelled) {
          await stopAgent({ agentId: agentResult.agentId })
          await leaveRtm(rtmClient, { channel: sessionId })
          rtmClient = null
          await leaveChannel(client, micTrack ? [micTrack] : [])
          micTrack = null
          return
        }
        agentId = agentResult.agentId
        console.log('[ConvoAI] agent_id', agentId)

        setStatus('connected')
      } catch (err) {
        console.error('Failed to start agent session', err)
        if (!cancelled) {
          setErrorMessage(err.message)
          setStatus('error')
        }
      }
    }

    setup()

    return () => {
      cancelled = true
      if (agentId) {
        stopAgent({ agentId }).catch((err) => console.error('Failed to stop agent', err))
      }
      leaveRtm(rtmClient, { channel: sessionId }).catch((err) => console.error('Failed to leave RTM', err))
      leaveChannel(client, micTrack ? [micTrack] : []).catch((err) => console.error('Failed to leave channel', err))
    }
  }, [sessionId])

  return (
    <div className="agent-page">
      <video ref={videoRef} className="agent-page__video" autoPlay playsInline />
      <img src={`${import.meta.env.BASE_URL}deltapath-logo.png`} alt="Deltapath" className="agent-page__logo" />
      <button
        type="button"
        className="agent-page__exit"
        onClick={() => navigate('/')}
      >
        終了
      </button>
      {status === 'connected' && captions.length > 0 && (
        <div className="agent-page__captions">
          {captions.map((entry) => (
            <p
              key={entry.id}
              className={`agent-page__caption agent-page__caption--${entry.role}`}
            >
              <span className="agent-page__caption-role">
                {entry.role === 'agent' ? 'アシスタント' : 'あなた'}
              </span>
              {entry.text}
            </p>
          ))}
        </div>
      )}
      {status !== 'connected' && (
        <div className="agent-page__overlay">
          {status === 'error' ? (
            <p className="agent-page__error">接続に失敗しました：{errorMessage}</p>
          ) : (
            <p className="agent-page__loading">アバターアシスタントに接続中...</p>
          )}
        </div>
      )}
    </div>
  )
}
