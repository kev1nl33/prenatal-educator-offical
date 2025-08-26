import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { ttsCacheManager } from '../utils/cacheManager.js';


const router = express.Router();

// 统计数据存储（生产环境应使用数据库）
interface APIStats {
  totalCalls: number;
  successCalls: number;
  errorCalls: number;
  totalDuration: number;
  averageDuration: number;
  errorRate: number;
  lastUpdated: string;
}

interface ServiceStats {
  ark: APIStats;
  tts: APIStats;
  voiceClone: APIStats;
  auth: APIStats;
  payment: APIStats;
  analytics: APIStats;
}

// 内存中的统计数据（生产环境应使用Redis或数据库）
const serviceStats: ServiceStats = {
  ark: {
    totalCalls: 0,
    successCalls: 0,
    errorCalls: 0,
    totalDuration: 0,
    averageDuration: 0,
    errorRate: 0,
    lastUpdated: new Date().toISOString()
  },
  tts: {
    totalCalls: 0,
    successCalls: 0,
    errorCalls: 0,
    totalDuration: 0,
    averageDuration: 0,
    errorRate: 0,
    lastUpdated: new Date().toISOString()
  },
  voiceClone: {
    totalCalls: 0,
    successCalls: 0,
    errorCalls: 0,
    totalDuration: 0,
    averageDuration: 0,
    errorRate: 0,
    lastUpdated: new Date().toISOString()
  },
  auth: {
    totalCalls: 0,
    successCalls: 0,
    errorCalls: 0,
    totalDuration: 0,
    averageDuration: 0,
    errorRate: 0,
    lastUpdated: new Date().toISOString()
  },
  payment: {
    totalCalls: 0,
    successCalls: 0,
    errorCalls: 0,
    totalDuration: 0,
    averageDuration: 0,
    errorRate: 0,
    lastUpdated: new Date().toISOString()
  },
  analytics: {
    totalCalls: 0,
    successCalls: 0,
    errorCalls: 0,
    totalDuration: 0,
    averageDuration: 0,
    errorRate: 0,
    lastUpdated: new Date().toISOString()
  }
};

/**
 * 更新服务统计数据
 */
export function updateServiceStats(
  service: keyof ServiceStats,
  duration: number,
  success: boolean
) {
  const stats = serviceStats[service];
  
  stats.totalCalls++;
  stats.totalDuration += duration;
  stats.averageDuration = stats.totalDuration / stats.totalCalls;
  
  if (success) {
    stats.successCalls++;
  } else {
    stats.errorCalls++;
  }
  
  stats.errorRate = (stats.errorCalls / stats.totalCalls) * 100;
  stats.lastUpdated = new Date().toISOString();
}

/**
 * GET /api/dashboard/overview
 * 获取总体统计概览
 */
router.get('/overview', asyncHandler(async (req, res) => {
  // 计算总体统计
  const totalStats = {
    totalCalls: 0,
    successCalls: 0,
    errorCalls: 0,
    totalDuration: 0,
    averageDuration: 0,
    errorRate: 0
  };
  
  Object.values(serviceStats).forEach(stats => {
    totalStats.totalCalls += stats.totalCalls;
    totalStats.successCalls += stats.successCalls;
    totalStats.errorCalls += stats.errorCalls;
    totalStats.totalDuration += stats.totalDuration;
  });
  
  if (totalStats.totalCalls > 0) {
    totalStats.averageDuration = totalStats.totalDuration / totalStats.totalCalls;
    totalStats.errorRate = (totalStats.errorCalls / totalStats.totalCalls) * 100;
  }
  
  // 获取TTS缓存统计
  const cacheStats = ttsCacheManager.getStats();
  
  // 计算成功率
  const successRate = totalStats.totalCalls > 0 
    ? ((totalStats.successCalls / totalStats.totalCalls) * 100).toFixed(2)
    : '0.00';
  
  res.json({
    success: true,
    data: {
      overview: {
        totalCalls: totalStats.totalCalls,
        successCalls: totalStats.successCalls,
        errorCalls: totalStats.errorCalls,
        successRate: `${successRate}%`,
        errorRate: `${totalStats.errorRate.toFixed(2)}%`,
        averageResponseTime: `${totalStats.averageDuration.toFixed(0)}ms`
      },
      cache: {
        totalEntries: cacheStats.totalItems,
        hitRate: `${cacheStats.hitRate.toFixed(2)}%`,
        totalSize: `${(cacheStats.totalSize / 1024 / 1024).toFixed(2)}MB`,
        oldestEntry: cacheStats.oldestItem,
        newestEntry: cacheStats.newestItem
      },
      performance: {
        arkResponseTime: `${serviceStats.ark.averageDuration.toFixed(0)}ms`,
        ttsResponseTime: `${serviceStats.tts.averageDuration.toFixed(0)}ms`,
        arkSuccessRate: serviceStats.ark.totalCalls > 0 
          ? `${((serviceStats.ark.successCalls / serviceStats.ark.totalCalls) * 100).toFixed(2)}%`
          : '0.00%',
        ttsSuccessRate: serviceStats.tts.totalCalls > 0 
          ? `${((serviceStats.tts.successCalls / serviceStats.tts.totalCalls) * 100).toFixed(2)}%`
          : '0.00%'
      }
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/dashboard/services
 * 获取各服务详细统计
 */
router.get('/services', asyncHandler(async (req, res) => {
  const servicesWithMetrics = Object.entries(serviceStats).map(([serviceName, stats]) => ({
    name: serviceName,
    displayName: getServiceDisplayName(serviceName),
    totalCalls: stats.totalCalls,
    successCalls: stats.successCalls,
    errorCalls: stats.errorCalls,
    successRate: stats.totalCalls > 0 
      ? `${((stats.successCalls / stats.totalCalls) * 100).toFixed(2)}%`
      : '0.00%',
    errorRate: `${stats.errorRate.toFixed(2)}%`,
    averageResponseTime: `${stats.averageDuration.toFixed(0)}ms`,
    totalDuration: `${stats.totalDuration.toFixed(0)}ms`,
    lastUpdated: stats.lastUpdated,
    status: getServiceStatus(stats)
  }));
  
  res.json({
    success: true,
    data: {
      services: servicesWithMetrics
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/dashboard/performance
 * 获取性能指标
 */
router.get('/performance', asyncHandler(async (req, res) => {
  const { timeRange = '24h' } = req.query;
  
  // 检查响应时间是否符合要求
  const arkPerformance = {
    averageResponseTime: serviceStats.ark.averageDuration,
    targetResponseTime: 10000, // 10秒
    isWithinTarget: serviceStats.ark.averageDuration <= 10000,
    status: serviceStats.ark.averageDuration <= 10000 ? 'good' : 'warning'
  };
  
  const ttsPerformance = {
    averageResponseTime: serviceStats.tts.averageDuration,
    targetResponseTime: 30000, // 30秒
    isWithinTarget: serviceStats.tts.averageDuration <= 30000,
    status: serviceStats.tts.averageDuration <= 30000 ? 'good' : 'warning'
  };
  
  // 计算端到端成功率
  const totalCalls = serviceStats.ark.totalCalls + serviceStats.tts.totalCalls;
  const totalSuccessCalls = serviceStats.ark.successCalls + serviceStats.tts.successCalls;
  const endToEndSuccessRate = totalCalls > 0 ? (totalSuccessCalls / totalCalls) * 100 : 0;
  
  res.json({
    success: true,
    data: {
      timeRange,
      endToEndSuccessRate: {
        rate: `${endToEndSuccessRate.toFixed(2)}%`,
        target: '95.00%',
        isWithinTarget: endToEndSuccessRate >= 95,
        status: endToEndSuccessRate >= 95 ? 'good' : 'warning'
      },
      arkPerformance: {
        averageResponseTime: `${arkPerformance.averageResponseTime.toFixed(0)}ms`,
        targetResponseTime: '10000ms',
        isWithinTarget: arkPerformance.isWithinTarget,
        status: arkPerformance.status
      },
      ttsPerformance: {
        averageResponseTime: `${ttsPerformance.averageResponseTime.toFixed(0)}ms`,
        targetResponseTime: '30000ms',
        isWithinTarget: ttsPerformance.isWithinTarget,
        status: ttsPerformance.status
      },
      recommendations: generatePerformanceRecommendations(arkPerformance, ttsPerformance, endToEndSuccessRate)
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * POST /api/dashboard/reset-stats
 * 重置统计数据
 */
router.post('/reset-stats', asyncHandler(async (req, res) => {
  const { service } = req.body;
  
  if (service && service in serviceStats) {
    // 重置特定服务的统计
    serviceStats[service as keyof ServiceStats] = {
      totalCalls: 0,
      successCalls: 0,
      errorCalls: 0,
      totalDuration: 0,
      averageDuration: 0,
      errorRate: 0,
      lastUpdated: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: {
        message: `${service} 服务统计已重置`,
        service
      },
      timestamp: new Date().toISOString()
    });
  } else {
    // 重置所有统计
    Object.keys(serviceStats).forEach(key => {
      serviceStats[key as keyof ServiceStats] = {
        totalCalls: 0,
        successCalls: 0,
        errorCalls: 0,
        totalDuration: 0,
        averageDuration: 0,
        errorRate: 0,
        lastUpdated: new Date().toISOString()
      };
    });
    
    res.json({
      success: true,
      data: {
        message: '所有服务统计已重置'
      },
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * GET /api/dashboard/health
 * 系统健康检查
 */
router.get('/health', asyncHandler(async (req, res) => {
  const healthChecks = {
    api: {
      status: 'healthy',
      responseTime: '< 100ms',
      uptime: process.uptime()
    },
    cache: {
      status: 'healthy',
      entries: ttsCacheManager.getStats().totalItems
    },
    performance: {
      arkResponseTime: serviceStats.ark.averageDuration,
      ttsResponseTime: serviceStats.tts.averageDuration,
      arkWithinTarget: serviceStats.ark.averageDuration <= 10000,
      ttsWithinTarget: serviceStats.tts.averageDuration <= 30000
    }
  };
  
  const overallStatus = (
    healthChecks.performance.arkWithinTarget && 
    healthChecks.performance.ttsWithinTarget
  ) ? 'healthy' : 'warning';
  
  res.json({
    success: true,
    data: {
      status: overallStatus,
      checks: healthChecks,
      timestamp: new Date().toISOString()
    }
  });
}));

// 辅助函数
function getServiceDisplayName(serviceName: string): string {
  const displayNames: Record<string, string> = {
    ark: 'Ark文本生成',
    tts: 'TTS语音合成',
    voiceClone: '声音克隆',
    auth: '用户认证',
    payment: '支付服务',
    analytics: '数据分析'
  };
  
  return displayNames[serviceName] || serviceName;
}

function getServiceStatus(stats: APIStats): string {
  if (stats.totalCalls === 0) return 'inactive';
  if (stats.errorRate > 10) return 'error';
  if (stats.errorRate > 5) return 'warning';
  return 'healthy';
}

function generatePerformanceRecommendations(
  arkPerformance: { isWithinTarget: boolean },
  ttsPerformance: { isWithinTarget: boolean },
  endToEndSuccessRate: number
): string[] {
  const recommendations: string[] = [];
  
  if (!arkPerformance.isWithinTarget) {
    recommendations.push('Ark响应时间超过10秒，建议优化模型参数或增加服务器资源');
  }
  
  if (!ttsPerformance.isWithinTarget) {
    recommendations.push('TTS响应时间超过30秒，建议检查网络连接或优化音频处理');
  }
  
  if (endToEndSuccessRate < 95) {
    recommendations.push('端到端成功率低于95%，建议检查错误日志并优化错误处理');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('系统性能良好，所有指标均在目标范围内');
  }
  
  return recommendations;
}

export default router;