import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { createSessionId, buildCheckinUrl } from '../lib/session.js'
import { fetchSessionStatus, markSessionScanned, confirmSession } from '../lib/api.js'
import './LandingPage.css'

const POLL_INTERVAL_MS = 1500

export default function LandingPage() {
  const navigate = useNavigate()
  // A fresh session id per page load keeps each scan on its own Agora channel.
  const sessionId = useMemo(() => createSessionId(), [])
  const checkinUrl = useMemo(() => buildCheckinUrl(sessionId), [sessionId])
  const [state, setState] = useState('none')

  useEffect(() => {
    let cancelled = false

    const interval = setInterval(async () => {
      try {
        const status = await fetchSessionStatus(sessionId)
        if (cancelled) return

        if (status.state === 'confirmed') {
          clearInterval(interval)
          navigate(`/session/${sessionId}`)
          return
        }
        setState(status.state)
      } catch (err) {
        console.error('Failed to fetch session status', err)
      }
    }, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [sessionId, navigate])

  // Dev/demo shortcut: double-clicking the QR code simulates a phone having
  // scanned it and tapped "确认签到", without needing an actual phone.
  async function handleSimulateScan() {
    try {
      await markSessionScanned(sessionId)
      await confirmSession(sessionId)
      navigate(`/session/${sessionId}`)
    } catch (err) {
      console.error('Failed to simulate scan/confirm', err)
    }
  }

  return (
    <div className="landing">
      <img src="/deltapath-logo.png" alt="Deltapath" className="landing__logo" />
      <div className="landing__card">
        <h1 className="landing__title">Mitsubishi Avatar Assistant</h1>
        <p className="landing__subtitle">Scan the QR code to start a conversation</p>
        <div
          className="landing__qr"
          onDoubleClick={handleSimulateScan}
          title="Double-click to simulate scanning + confirming check-in"
        >
          <QRCodeSVG value={checkinUrl} size={280} level="M" />
        </div>
        {state === 'scanned' || state === 'cancelled' ? (
          <p className="landing__status landing__status--scanned">
            已扫码，等待手机端确认签到...
          </p>
        ) : (
          <p className="landing__hint">Point your phone camera at the code above</p>
        )}
      </div>
    </div>
  )
}
