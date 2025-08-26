import { Request, Response, NextFunction } from 'express';
import { createRateLimitError } from './errorHandler.js';

/**
 * API 限流中间件
 * 防止API滥用和保护服务稳定性
 */

interface RateLimitConfig {
  windowMs: number; // 时间窗口（毫秒）
  maxRequests: number; // 最大请求数
  message?: string; // 自定义错误消息
  skipSuccessfulRequests?: boolean; // 是否跳过成功请求的计数
  skipFailedRequests?: boolean; // 是否跳过失败请求的计数
}

interface ClientInfo {
  count: number;
  resetTime: number;
  firstRequest: number;
}

class RateLimiter {
  private clients: Map<string, ClientInfo> = new Map();
  private config: RateLimitConfig;
  private cleanupInterval: NodeJS.Timeout;

  constructor(config: RateLimitConfig) {
    this.config = {
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...config
    };

    // 定期清理过期的客户端记录
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.config.windowMs);
  }

  /**
   * 获取客户端标识
   */
  private getClientId(req: Request): string {
    // 优先使用 X-Forwarded-For，然后是 X-Real-IP，最后是 req.ip
    const forwarded = req.get('X-Forwarded-For');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    const realIp = req.get('X-Real-IP');
    if (realIp) {
      return realIp;
    }
    
    return req.ip || 'unknown';
  }

  /**
   * 检查是否超过限制
   */
  private isRateLimited(clientId: string): { limited: boolean; resetTime: number; remaining: number } {
    const now = Date.now();
    const client = this.clients.get(clientId);

    if (!client) {
      // 新客户端
      this.clients.set(clientId, {
        count: 1,
        resetTime: now + this.config.windowMs,
        firstRequest: now
      });
      
      return {
        limited: false,
        resetTime: now + this.config.windowMs,
        remaining: this.config.maxRequests - 1
      };
    }

    // 检查时间窗口是否已过期
    if (now >= client.resetTime) {
      // 重置计数器
      client.count = 1;
      client.resetTime = now + this.config.windowMs;
      client.firstRequest = now;
      
      return {
        limited: false,
        resetTime: client.resetTime,
        remaining: this.config.maxRequests - 1
      };
    }

    // 增加计数
    client.count++;

    // 检查是否超过限制
    if (client.count > this.config.maxRequests) {
      return {
        limited: true,
        resetTime: client.resetTime,
        remaining: 0
      };
    }

    return {
      limited: false,
      resetTime: client.resetTime,
      remaining: this.config.maxRequests - client.count
    };
  }

  /**
   * 清理过期的客户端记录
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [clientId, client] of this.clients.entries()) {
      if (now >= client.resetTime) {
        this.clients.delete(clientId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`清理了 ${cleanedCount} 个过期的限流记录`);
    }
  }

  /**
   * 中间件函数
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const clientId = this.getClientId(req);
      const { limited, resetTime, remaining } = this.isRateLimited(clientId);

      // 设置响应头
      res.set({
        'X-RateLimit-Limit': this.config.maxRequests.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
        'X-RateLimit-Window': (this.config.windowMs / 1000).toString()
      });

      if (limited) {
        const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
        res.set('Retry-After', retryAfter.toString());

        const error = createRateLimitError(
          this.config.message || `请求过于频繁，请在 ${retryAfter} 秒后重试`
        );

        // 记录限流日志
        console.warn('API限流触发:', {
          clientId,
          url: req.url,
          method: req.method,
          userAgent: req.get('User-Agent'),
          retryAfter,
          timestamp: new Date().toISOString()
        });

        return next(error);
      }

      // 记录请求（用于监控）
      if (remaining <= 5) {
        console.warn('API限流警告:', {
          clientId,
          url: req.url,
          remaining,
          resetTime: new Date(resetTime).toISOString()
        });
      }

      next();
    };
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalClients: number;
    activeClients: number;
    topClients: Array<{ clientId: string; count: number; firstRequest: Date }>;
  } {
    const now = Date.now();
    const activeClients = Array.from(this.clients.entries())
      .filter(([, client]) => now < client.resetTime)
      .map(([clientId, client]) => ({
        clientId: clientId.substring(0, 8) + '****', // 脱敏处理
        count: client.count,
        firstRequest: new Date(client.firstRequest)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalClients: this.clients.size,
      activeClients: activeClients.length,
      topClients: activeClients
    };
  }

  /**
   * 销毁限流器
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clients.clear();
  }
}

/**
 * 预定义的限流配置
 */
export const RATE_LIMIT_CONFIGS = {
  // 全局限流：15分钟内最多1000次请求
  global: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 1000,
    message: '请求过于频繁，请稍后再试'
  },
  
  // 严格限流：1分钟内最多10次请求（用于敏感操作）
  strict: {
    windowMs: 60 * 1000,
    maxRequests: 10,
    message: '操作过于频繁，请稍后再试'
  },
  
  // 中等限流：1分钟内最多30次请求
  moderate: {
    windowMs: 60 * 1000,
    maxRequests: 30,
    message: '请求过于频繁，请稍后再试'
  },
  
  // 宽松限流：1分钟内最多100次请求
  loose: {
    windowMs: 60 * 1000,
    maxRequests: 100,
    message: '请求过于频繁，请稍后再试'
  },
  
  // TTS专用限流：1分钟内最多20次
  tts: {
    windowMs: 60 * 1000,
    maxRequests: 20,
    message: '语音合成请求过于频繁，请稍后再试'
  },
  
  // Ark专用限流：1分钟内最多15次
  ark: {
    windowMs: 60 * 1000,
    maxRequests: 15,
    message: '内容生成请求过于频繁，请稍后再试'
  },
  
  // 声音复刻限流：1小时内最多5次
  voiceClone: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 5,
    message: '声音复刻请求过于频繁，请稍后再试'
  }
};

/**
 * 创建限流器实例
 */
export const createRateLimiter = (config: RateLimitConfig): RateLimiter => {
  return new RateLimiter(config);
};

/**
 * 预定义的限流器实例
 */
export const globalLimiter = createRateLimiter(RATE_LIMIT_CONFIGS.global);
export const strictLimiter = createRateLimiter(RATE_LIMIT_CONFIGS.strict);
export const moderateLimiter = createRateLimiter(RATE_LIMIT_CONFIGS.moderate);
export const looseLimiter = createRateLimiter(RATE_LIMIT_CONFIGS.loose);
export const ttsLimiter = createRateLimiter(RATE_LIMIT_CONFIGS.tts);
export const arkLimiter = createRateLimiter(RATE_LIMIT_CONFIGS.ark);
export const voiceCloneLimiter = createRateLimiter(RATE_LIMIT_CONFIGS.voiceClone);

export { RateLimiter };
export type { RateLimitConfig };