/**
 * This is a API server
 */

import express, { type Request, type Response, type NextFunction }  from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import featureFlagsRoutes from './routes/featureFlags.js';
import logsRoutes from './routes/logs.js';
import ttsRoutes from './routes/tts.js';
import arkRoutes from './routes/ark.js';
import dashboardRoutes from './routes/dashboard.js';
import voiceCloneRoutes from './routes/voiceClone.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { globalLimiter, ttsLimiter, arkLimiter, voiceCloneLimiter } from './middleware/rateLimiter.js';
import { requestIdMiddleware, responseTimeMiddleware } from './middleware/requestId.js';
import { mockMiddleware } from './services/mockServices.js';
import { shouldUseMockServices, performStartupChecks, checkEnvStatus } from './config/featureFlags.js';

// for esm mode
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// load env
dotenv.config({ path: path.join(__dirname, '.env') });


const app: express.Application = express();

// 请求ID和响应时间中间件（必须在最前面）
app.use(requestIdMiddleware);
app.use(responseTimeMiddleware);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 全局限流
app.use(globalLimiter.middleware());

// Mock服务中间件（在沙箱模式下启用）
if (shouldUseMockServices()) {
  app.use(mockMiddleware);
  console.log('🎭 Mock服务已启用');
}

// 启动时检查环境变量和运行模式
performStartupChecks();

/**
 * API Routes
 */
app.use('/api/auth', authRoutes);
app.use('/api/settings', featureFlagsRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/tts', ttsLimiter.middleware(), ttsRoutes);
app.use('/api/ark', arkLimiter.middleware(), arkRoutes);
app.use('/api/voice-clone', voiceCloneLimiter.middleware(), voiceCloneRoutes);

/**
 * health
 */
app.get('/api/health', (req: Request, res: Response, next: NextFunction): void => {
  const envStatus = checkEnvStatus();
  const port = process.env.PORT || 3001;
  
  res.status(200).json({
    ok: true,
    sandbox: envStatus.sandbox,
    env: {
      arkKey: envStatus.arkKey,
      ttsToken: envStatus.ttsToken
    },
    port: parseInt(port.toString(), 10),
    timestamp: new Date().toISOString(),
    requestId: req.requestId
  });
});

/**
 * 404 handler
 */
app.use(notFoundHandler);

/**
 * Global error handler middleware
 */
app.use(errorHandler);

export default app;