import { Router } from 'express'
import { markScanned, confirmSession, cancelSession, setVisitorName, setLanguage, getStatus } from '../services/sessionStore.js'

const router = Router()

router.post('/:sessionId/scan', (req, res) => {
  const session = markScanned(req.params.sessionId)
  res.json({ state: session.state })
})

router.post('/:sessionId/visitor-name', (req, res) => {
  const { name } = req.body
  const session = setVisitorName(req.params.sessionId, name || '')
  res.json({ visitorName: session.visitorName })
})

router.post('/:sessionId/language', (req, res) => {
  const { language } = req.body
  const session = setLanguage(req.params.sessionId, language)
  res.json({ language: session.language })
})

router.post('/:sessionId/confirm', (req, res) => {
  const session = confirmSession(req.params.sessionId)
  res.json({ state: session.state })
})

router.post('/:sessionId/cancel', (req, res) => {
  const session = cancelSession(req.params.sessionId)
  res.json({ state: session.state })
})

router.get('/:sessionId/status', (req, res) => {
  res.json(getStatus(req.params.sessionId))
})

export default router
