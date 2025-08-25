/**
 * 功能开关API路由
 * 提供功能开关的查询和更新接口
 */

import { Router, Request, Response } from 'express';
import { 
  getFeatureFlags, 
  FeatureFlags, 
  FEATURE_FLAG_DESCRIPTIONS,
  getCurrentMode,
  getCurrentModeConfig,
  getAvailableModes,
  setRunMode,
  shouldUseMockServices,
  RunMode,
  logCurrentMode
} from '../config/featureFlags.js';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

// 功能开关存储文件路径
const FEATURE_FLAGS_FILE = path.join(process.cwd(), 'data', 'feature-flags.json');

/**
 * 确保数据目录存在
 */
async function ensureDataDirectory() {
  const dataDir = path.dirname(FEATURE_FLAGS_FILE);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

/**
 * 从文件读取功能开关配置
 */
async function readFeatureFlagsFromFile(): Promise<FeatureFlags> {
  try {
    await ensureDataDirectory();
    const data = await fs.readFile(FEATURE_FLAGS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    // 文件不存在时返回默认配置
    return getFeatureFlags();
  }
}

/**
 * 将功能开关配置写入文件
 */
async function writeFeatureFlagsToFile(flags: FeatureFlags): Promise<void> {
  await ensureDataDirectory();
  await fs.writeFile(FEATURE_FLAGS_FILE, JSON.stringify(flags, null, 2));
}

/**
 * GET /api/settings/feature-flags
 * 获取当前功能开关配置
 */
router.get('/feature-flags', async (req: Request, res: Response) => {
  try {
    const flags = await readFeatureFlagsFromFile();
    
    res.json({
      success: true,
      data: {
        flags,
        descriptions: FEATURE_FLAG_DESCRIPTIONS
      }
    });
  } catch (error) {
    console.error('获取功能开关配置失败:', error);
    res.status(500).json({
      success: false,
      error: '获取功能开关配置失败'
    });
  }
});

/**
 * POST /api/settings/feature-flags
 * 更新功能开关配置
 */
router.post('/feature-flags', async (req: Request, res: Response) => {
  try {
    const { flags } = req.body;
    
    // 验证请求数据
    if (!flags || typeof flags !== 'object') {
      return res.status(400).json({
        success: false,
        error: '无效的功能开关配置数据'
      });
    }
    
    // 验证必需的字段
    const requiredFields: (keyof FeatureFlags)[] = [
      'ENABLE_AUTH',
      'ENABLE_PAYMENTS', 
      'ENABLE_VOICE_CLONE',
      'ENABLE_ANALYTICS'
    ];
    
    for (const field of requiredFields) {
      if (typeof flags[field] !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: `字段 ${field} 必须是布尔值`
        });
      }
    }
    
    // 构建新的配置对象
    const newFlags: FeatureFlags = {
      ENABLE_AUTH: flags.ENABLE_AUTH,
      ENABLE_PAYMENTS: flags.ENABLE_PAYMENTS,
      ENABLE_VOICE_CLONE: flags.ENABLE_VOICE_CLONE,
      ENABLE_ANALYTICS: flags.ENABLE_ANALYTICS
    };
    
    // 保存到文件
    await writeFeatureFlagsToFile(newFlags);
    
    res.json({
      success: true,
      data: {
        flags: newFlags,
        message: '功能开关配置已更新'
      }
    });
  } catch (error) {
    console.error('更新功能开关配置失败:', error);
    res.status(500).json({
      success: false,
      error: '更新功能开关配置失败'
    });
  }
});

/**
 * GET /api/settings/run-mode
 * 获取当前运行模式信息
 */
router.get('/run-mode', (req, res) => {
  try {
    const currentMode = getCurrentMode();
    const modeConfig = getCurrentModeConfig();
    const availableModes = getAvailableModes();
    
    res.json({
      success: true,
      data: {
        currentMode,
        config: modeConfig,
        availableModes,
        useMockServices: shouldUseMockServices()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || '获取运行模式失败',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/settings/run-mode
 * 切换运行模式
 */
router.post('/run-mode', (req, res) => {
  try {
    const { mode } = req.body;
    
    if (!mode || !Object.values(RunMode).includes(mode)) {
      return res.status(400).json({
        success: false,
        error: `无效的运行模式。可用模式: ${Object.values(RunMode).join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }
    
    // 切换运行模式
    setRunMode(mode);
    
    // 记录模式切换日志
    logCurrentMode();
    
    const newModeConfig = getCurrentModeConfig();
    
    res.json({
      success: true,
      data: {
        previousMode: getCurrentMode(),
        newMode: mode,
        config: newModeConfig,
        message: `运行模式已切换为: ${mode}`
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || '切换运行模式失败',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/settings/mock-status
 * 获取Mock服务状态
 */
router.get('/mock-status', (req, res) => {
  try {
    const useMockServices = shouldUseMockServices();
    const currentMode = getCurrentMode();
    
    res.json({
      success: true,
      data: {
        useMockServices,
        currentMode,
        mockServices: {
          ark: useMockServices,
          tts: useMockServices,
          voiceClone: useMockServices,
          auth: useMockServices,
          payment: useMockServices,
          analytics: useMockServices
        },
        description: useMockServices 
          ? 'Mock服务已启用，所有API调用将返回模拟数据'
          : 'Mock服务已禁用，API调用将连接真实服务'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || '获取Mock状态失败',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/settings/reset-to-mvp
 * 重置为MVP模式
 */
router.post('/reset-to-mvp', (req, res) => {
  try {
    setRunMode(RunMode.MVP);
    logCurrentMode();
    
    res.json({
      success: true,
      data: {
        mode: RunMode.MVP,
        config: getCurrentModeConfig(),
        message: '已重置为MVP模式，所有高级功能已关闭'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || '重置MVP模式失败',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;