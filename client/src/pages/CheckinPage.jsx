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
        <h1 className="checkin__title">三菱アバターアシスタント</h1>

        {state === 'confirmed' ? (
          <p className="checkin__message checkin__message--success">
            チェックインが完了しました。大画面でアシスタントをご確認ください
          </p>
        ) : state === 'cancelled' ? (
          <>
            <p className="checkin__message">チェックインを取り消しました</p>
            <button className="checkin__button checkin__button--primary" onClick={handleConfirm}>
              チェックインを確認
            </button>
          </>
        ) : (
          <>
            <p className="checkin__subtitle">アバターアシスタントとの対話を開始しますか？</p>
            <div className="checkin__actions">
              <button
                className="checkin__button checkin__button--primary"
                onClick={handleConfirm}
                disabled={state === 'confirming'}
              >
                チェックインを確認
              </button>
              <button
                className="checkin__button checkin__button--secondary"
                onClick={handleCancel}
                disabled={state === 'cancelling'}
              >
                チェックインを取り消す
              </button>
            </div>
          </>
        )}

        {error && <p className="checkin__error">操作に失敗しました：{error}</p>}
      </div>
    </div>
  )
}
