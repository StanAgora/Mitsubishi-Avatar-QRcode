import { Router } from 'express'
import { buildRtcAndRtmToken } from '../services/tokenService.js'

const router = Router()

router.post('/', (req, res) => {
  const { channel, uid } = req.body

  if (!channel || uid === undefined) {
    return res.status(400).json({ error: 'channel and uid are required' })
  }

  try {
    const token = buildRtcAndRtmToken({ channel, uid })
    res.json({ token, appId: process.env.AGORA_APP_ID })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
