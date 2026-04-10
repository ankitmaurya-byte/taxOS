import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'

import authRoutes from './routes/auth'
import entityRoutes from './routes/entities'
import filingRoutes from './routes/filings'
import deadlineRoutes from './routes/deadlines'
import documentRoutes from './routes/documents'
import approvalRoutes from './routes/approvals'
import auditRoutes from './routes/audit'
import agentRoutes from './routes/agents'
import adminRoutes from './routes/admin'
import memberRoutes from './routes/members'
import profileRoutes from './routes/profile'
import { errorHandler } from './middleware/errorHandler'
require('dotenv').config()

const app: express.Express = express()
const PORT = process.env.PORT || 3001
app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/entities', entityRoutes)
app.use('/api/filings', filingRoutes)
app.use('/api/deadlines', deadlineRoutes)
app.use('/api/documents', documentRoutes)
app.use('/api/approvals', approvalRoutes)
app.use('/api/audit', auditRoutes)
app.use('/api/agents', agentRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/members', memberRoutes)
app.use('/api/profile', profileRoutes)

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handler
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`🚀 TaxOS API running on http://localhost:${PORT}`)
})

export default app
