import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { setLanguage } from '../lib/api.js'
import './LanguageSelectPage.css'

const LANGUAGES = [
  { code: 'ja', label: '日本語' },
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
  { code: 'hk', label: '香港粵語' },
]

export default function LanguageSelectPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [pending, setPending] = useState(null)
  const [error, setError] = useState(null)

  async function handleSelect(code) {
    setPending(code)
    setError(null)
    try {
      await setLanguage(sessionId, code)
      navigate(`/session/${sessionId}`)
    } catch (err) {
      setError(err.message)
      setPending(null)
    }
  }

  return (
    <div className="language-select">
      <div className="language-select__card">
        <h1 className="language-select__title">言語を選択してください</h1>
        <div className="language-select__options">
          {LANGUAGES.map(({ code, label }) => (
            <button
              key={code}
              type="button"
              className="language-select__button"
              onClick={() => handleSelect(code)}
              disabled={pending !== null}
            >
              {label}
            </button>
          ))}
        </div>
        {error && <p className="language-select__error">エラーが発生しました：{error}</p>}
      </div>
    </div>
  )
}
