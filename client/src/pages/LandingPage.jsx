import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { createSessionId, buildCheckinUrl } from '../lib/session.js'
import { fetchSessionStatus, markSessionScanned, confirmSession, setVisitorName } from '../lib/api.js'
import './LandingPage.css'

const POLL_INTERVAL_MS = 1500
const VISITOR_NAME_SYNC_DEBOUNCE_MS = 400

export default function LandingPage() {
  const navigate = useNavigate()
  // A fresh session id per page load keeps each scan on its own Agora channel.
  const sessionId = useMemo(() => createSessionId(), [])
  const checkinUrl = useMemo(() => buildCheckinUrl(sessionId), [sessionId])
  const [state, setState] = useState('none')
  const [visitorName, setVisitorNameInput] = useState('')
  const visitorNameSyncTimer = useRef(null)

  function handleVisitorNameChange(event) {
    const name = event.target.value
    setVisitorNameInput(name)
    clearTimeout(visitorNameSyncTimer.current)
    visitorNameSyncTimer.current = setTimeout(() => {
      setVisitorName(sessionId, name).catch((err) => console.error('Failed to sync visitor name', err))
    }, VISITOR_NAME_SYNC_DEBOUNCE_MS)
  }

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
  // scanned it and tapped "confirm check-in", without needing an actual phone.
  async function handleSimulateScan() {
    try {
      clearTimeout(visitorNameSyncTimer.current)
      await setVisitorName(sessionId, visitorName)
      await markSessionScanned(sessionId)
      await confirmSession(sessionId)
      navigate(`/session/${sessionId}`)
    } catch (err) {
      console.error('Failed to simulate scan/confirm', err)
    }
  }

  return (
    <div className="landing">
      <img src={`${import.meta.env.BASE_URL}deltapath-logo.png`} alt="Deltapath" className="landing__logo" />
      <div className="landing__card">
        <h1 className="landing__title">三菱アバターアシスタント</h1>
        <p className="landing__subtitle">QRコードをスキャンして会話を開始してください</p>
        <input
          type="text"
          className="landing__visitor-input"
          placeholder="来訪者様のお名前（任意）"
          value={visitorName}
          onChange={handleVisitorNameChange}
        />
        <div
          className="landing__qr"
          onDoubleClick={handleSimulateScan}
          title="ダブルクリックでスキャンとチェックイン確認をシミュレート"
        >
          <QRCodeSVG value={checkinUrl} size={280} level="M" />
        </div>
        {state === 'scanned' || state === 'cancelled' ? (
          <p className="landing__status landing__status--scanned">
            スキャン済みです。スマートフォンでのチェックイン確認をお待ちください...
          </p>
        ) : (
          <p className="landing__hint">上のQRコードにスマートフォンのカメラを向けてください</p>
        )}
      </div>
    </div>
  )
}
