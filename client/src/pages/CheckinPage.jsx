import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { markSessionScanned, confirmSession, cancelSession } from '../lib/api.js'
import './CheckinPage.css'

export default function CheckinPage() {
  const { sessionId } = useParams()
  const [state, setState] = useState('idle')
  const [error, setError] = useState(null)

  useEffect(() => {
    markSessionScanned(sessionId).catch((err) => console.error('Failed to mark session scanned', err))
  }, [sessionId])

  async function handleConfirm() {
    setState('confirming')
    setError(null)
    try {
      await confirmSession(sessionId)
      setState('confirmed')
    } catch (err) {
      setError(err.message)
      setState('idle')
    }
  }

  async function handleCancel() {
    setState('cancelling')
    setError(null)
    try {
      await cancelSession(sessionId)
      setState('cancelled')
    } catch (err) {
      setError(err.message)
      setState('idle')
    }
  }

  return (
    <div className="checkin">
      <div className="checkin__card">
        <h1 className="checkin__title">Mitsubishi Avatar Assistant</h1>

        {state === 'confirmed' ? (
          <p className="checkin__message checkin__message--success">
            已签到，请在大屏幕上查看助手
          </p>
        ) : state === 'cancelled' ? (
          <>
            <p className="checkin__message">已取消签到</p>
            <button className="checkin__button checkin__button--primary" onClick={handleConfirm}>
              确认签到
            </button>
          </>
        ) : (
          <>
            <p className="checkin__subtitle">请确认是否开始与 Avatar 助手对话</p>
            <div className="checkin__actions">
              <button
                className="checkin__button checkin__button--primary"
                onClick={handleConfirm}
                disabled={state === 'confirming'}
              >
                确认签到
              </button>
              <button
                className="checkin__button checkin__button--secondary"
                onClick={handleCancel}
                disabled={state === 'cancelling'}
              >
                取消签到
              </button>
            </div>
          </>
        )}

        {error && <p className="checkin__error">操作失败：{error}</p>}
      </div>
    </div>
  )
}
