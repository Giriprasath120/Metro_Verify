import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env
dotenv.config();

// Import route modules
import authRoutes from './routes/auth';
import instrumentsRoutes from './routes/instruments';
import verificationRoutes from './routes/verification';
import batchesRoutes from './routes/batches';
import scheduleRoutes from './routes/schedule';
import officerRoutes from './routes/officer';
import certificatesRoutes from './routes/certificates';
import complianceRoutes from './routes/compliance';
import dashboardRoutes from './routes/dashboard';
import notificationsRoutes from './routes/notifications';
import chatbotRoutes from './routes/chatbot';
import applicationsRoutes from './routes/applications';
import bulkRequestsRoutes from './routes/bulkRequests';
import lmoRoutes from './routes/lmo';
import inspectionsRoutes from './routes/inspections';
import offlineRoutes from './routes/offline';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swaggerSpec';

const app = express();
// STRICT DEFAULT: Port 4000 (never 5000)
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.raw({ type: 'audio/*', limit: '50mb' }));

// Swagger UI at /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Metro Verify API Documentation — Swagger UI',
}));

// Raw OpenAPI Spec JSON
app.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Health check endpoint
app.get(['/api/health', '/health'], (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API health check & discovery route
app.get('/api', (req, res) => {
  res.json({
    service: 'Metro Verify - Digital Legal Metrology Backend Service',
    hackathon: 'Smart India Hackathon 2026 (SIH26036)',
    status: 'ACTIVE',
    port: PORT,
    endpoints: {
      auth: 'POST /auth/login',
      applications: [
        'POST /api/applications',
        'GET /api/applications',
        'GET /api/applications/:id',
        'POST /api/applications/:id/withdraw'
      ],
      bulkRequests: [
        'POST /api/bulk-requests',
        'GET /api/bulk-requests',
        'GET /api/bulk-requests/:id'
      ],
      instruments: [
        'GET /api/instruments',
        'GET /api/instruments/:id',
        'GET /api/instruments/:id/passport',
        'POST /api/instruments'
      ],
      certificates: [
        'GET /api/certificates',
        'GET /api/certificates/:id',
        'GET /api/certificates/:id/pdf'
      ],
      batches: 'GET /batches, GET /batches/:id',
      schedule: 'POST /schedule/allocate (REAL SCORING ENGINE)',
      officer: 'POST /verifications/:id/record',
      compliance: 'GET /compliance/:ownerId/score',
      dashboard: 'GET /dashboard/:role',
      notifications: 'POST /notifications/expiry-check',
      chatbot: 'POST /chatbot/query (REAL GEMINI API)'
    }
  });
});

// Serve frontend web export if built
const distPath = path.join(__dirname, '../../dist');
app.use(express.static(distPath));

// Register API routes under /api
app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/bulk-requests', bulkRequestsRoutes);
app.use('/api/instruments', instrumentsRoutes);
app.use('/api/certificates', certificatesRoutes);
app.use('/api/lmo', lmoRoutes);
app.use('/api/inspections', inspectionsRoutes);
app.use('/api/offline', offlineRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Public verification short-link and API redirect for QR codes
app.get([
  '/verify',
  '/verify/:id',
  '/api/public/verify',
  '/api/public/verify/:token',
  '/public/verify',
  '/public/verify/:token'
], (req, res) => {
  const id = req.params.token || req.params.id || (req.query.id as string) || (req.query.token as string) || (req.query.certNo as string) || '';
  res.redirect(`/api/certificates/verify?id=${encodeURIComponent(id)}`);
});

// Register legacy / backward-compatible routes
app.use('/auth', authRoutes);
app.use('/instruments', instrumentsRoutes);
app.use('/verification-requests', verificationRoutes);
app.use('/batches', batchesRoutes);
app.use('/schedule', scheduleRoutes);
app.use('/', officerRoutes); // provides /verifications/:id/record
app.use('/certificates', certificatesRoutes);
app.use('/compliance', complianceRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/notifications', notificationsRoutes);
app.use('/chatbot', chatbotRoutes);

// Start server with graceful EADDRINUSE error handling
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(` Metro Verify Server running on http://localhost:${PORT}`);
  console.log(` SIH26036 - Legal Metrology Platform Backend`);
  console.log(` Real Slot Allocation Engine: READY`);
  console.log(` Gemini AI Chatbot: ${process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_key_here' ? 'LIVE' : 'FALLBACK MODE (No key set)'}`);
  console.log(`====================================================`);
});

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[FATAL ERROR] Port ${PORT} is already in use by another process.`);
    console.error(`Please terminate any process running on port ${PORT} or check running Node tasks.`);
    process.exit(1);
  } else {
    console.error(`\n[SERVER ERROR]`, err);
    process.exit(1);
  }
});
