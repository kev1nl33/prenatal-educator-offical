import { Request, Response, NextFunction } from 'express';

/**
 * 全局错误处理中间件
 * 提供统一的错误响应格式和用户友好的错误提示
 */

interface CustomError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

/**
 * 错误类型枚举
 */
enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  MISSING_ENV = 'MISSING_ENV',
  UPSTREAM_OFFLINE = 'UPSTREAM_OFFLINE'
}

/**
 * 用户友好的错误消息映射
 */
const ERROR_MESSAGES = {
  // HTTP状态码错误
  400: '请求参数错误，请检查输入内容',
  401: '未授权，请检查 API Key 或登录状态',
  403: '访问被拒绝，您没有执行此操作的权限',
  404: '请求的资源不存在',
  429: '请求过多，请稍后再试',
  500: '服务异常，请稍后重试',
  502: '网关错误，服务暂时不可用',
  503: '服务不可用，请稍后重试',
  504: '请求超时，请稍后重试',
  
  // 业务错误类型
  [ErrorType.VALIDATION_ERROR]: '输入数据验证失败',
  [ErrorType.AUTHENTICATION_ERROR]: '身份验证失败，请重新登录',
  [ErrorType.AUTHORIZATION_ERROR]: '权限不足，无法执行此操作',
  [ErrorType.NOT_FOUND_ERROR]: '请求的资源不存在',
  [ErrorType.RATE_LIMIT_ERROR]: '请求频率过高，请稍后再试',
  [ErrorType.EXTERNAL_API_ERROR]: '外部服务调用失败',
  [ErrorType.TIMEOUT_ERROR]: '请求超时，请稍后重试',
  [ErrorType.INTERNAL_ERROR]: '系统内部错误，请联系技术支持',
  [ErrorType.MISSING_ENV]: '环境变量配置缺失，请联系管理员',
  [ErrorType.UPSTREAM_OFFLINE]: '上游服务不可用，请稍后重试'
};

/**
 * 特定错误模式的友好提示
 */
const SPECIFIC_ERROR_PATTERNS = [
  {
    pattern: /VOLCENGINE_.*_API_KEY.*未配置/,
    message: '火山引擎 API 密钥未配置，请联系管理员'
  },
  {
    pattern: /请求超时.*\d+ms/,
    message: '网络请求超时，请检查网络连接后重试'
  },
  {
    pattern: /缓存.*失败/,
    message: '缓存服务异常，功能可能受到影响'
  },
  {
    pattern: /参数验证失败/,
    message: '输入参数不符合要求，请检查后重试'
  },
  {
    pattern: /TTS.*合成.*失败/,
    message: '语音合成服务暂时不可用，请稍后重试'
  },
  {
    pattern: /Ark.*生成.*失败/,
    message: '内容生成服务暂时不可用，请稍后重试'
  },
  {
    pattern: /数据库.*连接.*失败/,
    message: '数据服务暂时不可用，请稍后重试'
  }
];

/**
 * 获取用户友好的错误消息
 */
const getFriendlyErrorMessage = (error: CustomError): string => {
  // 检查特定错误模式
  for (const pattern of SPECIFIC_ERROR_PATTERNS) {
    if (pattern.pattern.test(error.message)) {
      return pattern.message;
    }
  }
  
  // 根据状态码返回消息
  if (error.statusCode && ERROR_MESSAGES[error.statusCode]) {
    return ERROR_MESSAGES[error.statusCode];
  }
  
  // 根据错误代码返回消息
  if (error.code && ERROR_MESSAGES[error.code]) {
    return ERROR_MESSAGES[error.code];
  }
  
  // 默认消息
  return ERROR_MESSAGES[500];
};

/**
 * 确定错误的严重程度
 */
const getErrorSeverity = (error: CustomError): 'low' | 'medium' | 'high' | 'critical' => {
  if (error.statusCode) {
    if (error.statusCode >= 500) return 'critical';
    if (error.statusCode >= 400) return 'medium';
    return 'low';
  }
  
  if (error.code) {
    switch (error.code) {
      case ErrorType.INTERNAL_ERROR:
      case ErrorType.EXTERNAL_API_ERROR:
      case ErrorType.MISSING_ENV:
      case ErrorType.UPSTREAM_OFFLINE:
        return 'critical';
      case ErrorType.AUTHENTICATION_ERROR:
      case ErrorType.AUTHORIZATION_ERROR:
        return 'high';
      case ErrorType.VALIDATION_ERROR:
      case ErrorType.RATE_LIMIT_ERROR:
        return 'medium';
      default:
        return 'low';
    }
  }
  
  return 'medium';
};

/**
 * 记录错误日志
 */
const logError = (error: CustomError, req: Request): void => {
  const severity = getErrorSeverity(error);
  const logData = {
    timestamp: new Date().toISOString(),
    severity,
    error: {
      message: error.message,
      stack: error.stack,
      statusCode: error.statusCode,
      code: error.code
    },
    request: {
      method: req.method,
      url: req.url,
      headers: {
        'user-agent': req.get('User-Agent'),
        'content-type': req.get('Content-Type'),
        'x-forwarded-for': req.get('X-Forwarded-For')
      },
      ip: req.ip,
      body: req.body ? JSON.stringify(req.body).substring(0, 1000) : undefined
    }
  };
  
  // 根据严重程度选择日志级别
  switch (severity) {
    case 'critical':
      console.error('🚨 CRITICAL ERROR:', logData);
      break;
    case 'high':
      console.error('❌ HIGH ERROR:', logData);
      break;
    case 'medium':
      console.warn('⚠️ MEDIUM ERROR:', logData);
      break;
    case 'low':
      console.info('ℹ️ LOW ERROR:', logData);
      break;
  }
};

/**
 * 生成错误响应
 */
const generateErrorResponse = (error: CustomError, req: Request) => {
  const statusCode = error.statusCode || 500;
  const friendlyMessage = getFriendlyErrorMessage(error);
  const severity = getErrorSeverity(error);
  
  const response: any = {
    success: false,
    error: friendlyMessage,
    code: statusCode,
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
  
  // 在开发环境下提供更多调试信息
  if (process.env.NODE_ENV === 'development') {
    response.debug = {
      originalMessage: error.message,
      stack: error.stack,
      severity,
      details: error.details
    };
  }
  
  // 对于验证错误，提供详细信息
  if (error.code === ErrorType.VALIDATION_ERROR && error.details) {
    response.validationErrors = error.details;
  }
  
  return { statusCode, response };
};

/**
 * 主要错误处理中间件
 */
export const errorHandler = (error: CustomError, req: Request, res: Response, next: NextFunction): void => {
  // 记录错误
  logError(error, req);
  
  // 生成响应
  const { statusCode, response } = generateErrorResponse(error, req);
  
  // 发送响应
  res.status(statusCode).json(response);
};

/**
 * 404 错误处理中间件
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  const error: CustomError = new Error(`API 端点 ${req.method} ${req.url} 不存在`);
  error.statusCode = 404;
  error.code = ErrorType.NOT_FOUND_ERROR;
  
  const { statusCode, response } = generateErrorResponse(error, req);
  res.status(statusCode).json(response);
};

/**
 * 异步错误捕获包装器
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 创建自定义错误的工具函数
 */
export const createError = (message: string, statusCode: number = 500, code?: string, details?: any): CustomError => {
  const error: CustomError = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
};

/**
 * 验证错误创建器
 */
export const createValidationError = (message: string, details?: any): CustomError => {
  return createError(message, 400, ErrorType.VALIDATION_ERROR, details);
};

/**
 * 认证错误创建器
 */
export const createAuthError = (message: string = '身份验证失败'): CustomError => {
  return createError(message, 401, ErrorType.AUTHENTICATION_ERROR);
};

/**
 * 授权错误创建器
 */
export const createAuthorizationError = (message: string = '权限不足'): CustomError => {
  return createError(message, 403, ErrorType.AUTHORIZATION_ERROR);
};

/**
 * 限流错误创建器
 */
export const createRateLimitError = (message: string = '请求过于频繁'): CustomError => {
  return createError(message, 429, ErrorType.RATE_LIMIT_ERROR);
};

/**
 * 外部API错误创建器
 */
export const createExternalApiError = (message: string, originalError?: any): CustomError => {
  const error = createError(message, 502, ErrorType.EXTERNAL_API_ERROR);
  if (originalError) {
    error.details = {
      originalMessage: originalError.message,
      originalStack: originalError.stack
    };
  }
  return error;
};

/**
 * 超时错误创建器
 */
export const createTimeoutError = (message: string = '请求超时'): CustomError => {
  return createError(message, 504, ErrorType.TIMEOUT_ERROR);
};

/**
 * 环境变量缺失错误创建器
 */
export const createMissingEnvError = (message: string = '环境变量配置缺失'): CustomError => {
  return createError(message, 500, ErrorType.MISSING_ENV);
};

/**
 * 上游服务离线错误创建器
 */
export const createUpstreamOfflineError = (message: string = '上游服务不可用'): CustomError => {
  return createError(message, 503, ErrorType.UPSTREAM_OFFLINE);
};

export { ErrorType };