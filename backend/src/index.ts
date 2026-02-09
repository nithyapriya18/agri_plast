// Register tsconfig paths for @shared/* aliases
import 'tsconfig-paths/register';

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { planningRouter } from './routes/planning';
import { chatRouter } from './routes/chat';
import { materialsRouter } from './routes/materials';
import { usageRouter } from './routes/usage';
import { pricingRouter } from './routes/pricing';
import { settingsRouter } from './routes/settings';
import { versionsRouter } from './routes/versions';
import { zonesRouter } from './routes/zones';
import learningRouter from './routes/learning';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS Configuration - Allow frontend to access backend
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
];

// Add production frontend URL if specified
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Increase payload size limit to handle large project data and chat history
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use('/api/planning', planningRouter);
app.use('/api/chat', chatRouter);
app.use('/api/materials', materialsRouter);
app.use('/api/usage', usageRouter);
app.use('/api/pricing', pricingRouter);
app.use('/api/user_settings', settingsRouter);
app.use('/api/projects', versionsRouter);
app.use('/api/zones', zonesRouter);
app.use('/api/learning', learningRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Agriplast Backend running on http://localhost:${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
