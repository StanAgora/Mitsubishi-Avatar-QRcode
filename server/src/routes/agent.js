import { Router } from 'express'
import { joinAgent, leaveAgent } from '../services/agentService.js'

const router = Router()

router.post('/start', async (req, res) => {
  const { channel, uid } = req.body

  if (!channel || uid === undefined) {
    return res.status(400).json({ error: 'channel and uid are required' })
  }

  try {
    const result = await joinAgent({ channel, uid })
    res.json(result)
  } catch (err) {
    console.error('Failed to start Conversational AI Agent', err.response?.data || err.message)
    res.status(500).json({ error: err.message })
  }
})

router.post('/stop', async (req, res) => {
  const { agentId } = req.body

  if (!agentId) {
    return res.status(400).json({ error: 'agentId is required' })
  }

  try {
    await leaveAgent({ agentId })
    res.json({ ok: true })
  } catch (err) {
    console.error('Failed to stop Conversational AI Agent', err.response?.data || err.message)
    res.status(500).json({ error: err.message })
  }
})

export default router
