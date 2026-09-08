import app from './src/app.js';
import { testConnection } from './src/config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, async () => {
  console.log('===========================================================');
  console.log(`🚀 Saravana Bhavan Feedback API Server running on port ${PORT}`);
  console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
  console.log(`📡 Allowed CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
  console.log('-----------------------------------------------------------');

  // Check database connectivity on boot
  const dbStatus = await testConnection();
  if (dbStatus.connected) {
    console.log(`✅ PostgreSQL Connected successfully (${dbStatus.mode})`);
  } else {
    console.log(`ℹ️  Database Status: ${dbStatus.mode}`);
    console.log(`   Configure DATABASE_URL in .env to connect to live PostgreSQL.`);
  }
  console.log('===========================================================');
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received. Closing HTTP server...');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});
