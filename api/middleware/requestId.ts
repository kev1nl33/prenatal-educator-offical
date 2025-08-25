import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * 请求ID中间件
 * 为每个API请求生成唯一的请求ID，并添加到响应头中
 */

// 扩展Request接口以包含requestId
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      startTime: number;
    }
  }
}

/**
 * 生成请求ID
 */
function generateRequestId(): string {
  // 使用时间戳 + 随机字符串的组合
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  return `req_${timestamp}_${random}`;
}

/**
 * 请求ID中间件
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // 从请求头中获取现有的请求ID，或生成新的
  const requestId = req.headers['x-request-id'] as string || generateRequestId();
  
  // 将请求ID添加到请求对象中
  req.requestId = requestId;
  
  // 记录请求开始时间
  req.startTime = Date.now();
  
  // 将请求ID添加到响应头中
  res.setHeader('x-request-id', requestId);
  
  // 继续处理请求
  next();
};

/**
 * 响应时间记录中间件
 */
export const responseTimeMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // 保存原始的res.json方法
  const originalJson = res.json;
  
  // 重写res.json方法以记录响应时间
  res.json = function(body: any) {
    const duration = Date.now() - req.startTime;
    
    // 添加响应时间到响应头
    res.setHeader('x-response-time', `${duration}ms`);
    
    // 记录请求日志
    console.log(`📊 [${req.requestId}] ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
    
    // 调用原始的json方法
    return originalJson.call(this, body);
  };
  
  next();
};

export default requestIdMiddleware;