/**
 * 错误处理中间件和工具函数
 */

// 创建自定义错误类
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

// 创建验证错误
export function createValidationError(message) {
  return new AppError(message, 400);
}

// 创建通用错误
export function createError(message, statusCode = 500) {
  return new AppError(message, statusCode);
}

// 创建速率限制错误
export function createRateLimitError(message = '请求过于频繁，请稍后再试') {
  return new AppError(message, 429);
}

// 异步处理器包装函数
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// 错误处理中间件
export function errorHandler(err, req, res, next) {
  let error = { ...err };
  error.message = err.message;

  // 记录错误日志
  console.error('Error:', err);

  // 默认错误响应
  let statusCode = 500;
  let message = '服务器内部错误';

  // 处理不同类型的错误
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = '数据验证失败';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = '资源未找到';
  } else if (err.code === 11000) {
    statusCode = 400;
    message = '数据重复';
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  });
}

export default errorHandler;