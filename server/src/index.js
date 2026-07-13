import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import tokenRouter from './routes/token.js'
import agentRouter from './routes/agent.js'
import sessionRouter from './routes/session.js'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const clientDist = path.resolve(__dirname, '../../client/dist')

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

app.use('/api/token', tokenRouter)
app.use('/api/agent', agentRouter)
app.use('/api/session', sessionRouter)

// The client build only exists after `npm run build` — in dev, Vite's own
// server (with the /api proxy) is what the browser talks to, not this static handler.
if (fs.existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist))
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

const port = process.env.PORT || 8080
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`)
})
