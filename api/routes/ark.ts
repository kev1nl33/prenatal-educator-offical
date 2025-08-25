import express, { Request, Response } from 'express';
import { createError, createValidationError } from '../middleware/errorHandler.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { shouldUseMockServices } from '../config/featureFlags.js';
import { MockServiceFactory } from '../services/mockServices.js';
import { updateServiceStats } from './dashboard.js';
import axios from 'axios';

const router = express.Router();

/**
 * Ark 文本生成 API
 * 集成超时控制和错误处理
 */

// 验证Ark参数
const validateArkParams = (params: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // 检查messages参数
  if (!params.messages || !Array.isArray(params.messages)) {
    errors.push('messages 参数是必需的，且必须是数组');
  } else {
    // 检查每个message的格式
    params.messages.forEach((message: any, index: number) => {
      if (!message.role || !['system', 'user', 'assistant'].includes(message.role)) {
        errors.push(`messages[${index}].role 必须是 'system', 'user' 或 'assistant'`);
      }
      
      if (!message.content || typeof message.content !== 'string') {
        errors.push(`messages[${index}].content 必须是非空字符串`);
      }
    });
    
    if (params.messages.length === 0) {
      errors.push('messages 数组不能为空');
    }
  }
  
  // 检查model参数
  if (!params.model || typeof params.model !== 'string') {
    errors.push('model 参数是必需的，且必须是字符串');
  }
  
  // 检查可选参数
  if (params.temperature !== undefined) {
    const temp = Number(params.temperature);
    if (isNaN(temp) || temp < 0 || temp > 1) {
      errors.push('temperature 参数必须是 0 到 1 之间的数字');
    }
  }
  
  if (params.max_tokens !== undefined) {
    const maxTokens = Number(params.max_tokens);
    if (isNaN(maxTokens) || maxTokens < 1 || maxTokens > 4096) {
      errors.push('max_tokens 参数必须是 1 到 4096 之间的整数');
    }
  }
  
  if (params.top_p !== undefined) {
    const topP = Number(params.top_p);
    if (isNaN(topP) || topP < 0 || topP > 1) {
      errors.push('top_p 参数必须是 0 到 1 之间的数字');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// 调用火山引擎Ark API
const callVolcengineArk = async (params: any, timeoutMs: number = 10000): Promise<any> => {
  const apiKey = process.env.VOLCENGINE_ARK_API_KEY;
  
  if (!apiKey) {
    throw new Error('VOLCENGINE_ARK_API_KEY 环境变量未配置');
  }
  
  const url = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
  
  // 构建请求参数
  const requestParams = {
    model: params.model || 'doubao-seed-1-6-250615',
    messages: params.messages,
    temperature: params.temperature || 0.7,
    max_tokens: params.max_tokens || 2048,
    top_p: params.top_p || 0.9,
    stream: params.stream || false
  };
  
  try {
    const response = await axios.post(url, requestParams, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: timeoutMs
    });
    
    return response.data;
  } catch (error: any) {
    if (error.code === 'ECONNABORTED') {
      throw new Error(`Ark请求超时（${timeoutMs}ms）`);
    }
    
    if (error.response) {
      const statusCode = error.response.status;
      let message = '服务异常，请稍后重试';
      
      switch (statusCode) {
        case 401:
          message = '未授权，请检查 API Key';
          break;
        case 429:
          message = '请求过多，请稍后再试';
          break;
        case 400:
          message = '请求参数错误';
          break;
      }
      
      throw new Error(`${message} (状态码: ${statusCode})`);
    }
    
    throw error;
  }
};

/**
 * POST /generate
 * 通用文本生成接口
 */
router.post('/generate', asyncHandler(async (req: Request, res: Response) => {
  const { messages, model = 'ep-20241230140956-8xqzm', temperature = 0.7, maxTokens = 1000 } = req.body;
  
  // 参数验证
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw createValidationError('messages参数是必需的，且必须是非空数组');
  }
  
  // 验证messages格式
  for (const message of messages) {
    if (!message.role || !message.content) {
      throw createValidationError('每个message必须包含role和content字段');
    }
    if (!['system', 'user', 'assistant'].includes(message.role)) {
      throw createValidationError('message.role必须是system、user或assistant之一');
    }
  }
  
  // 检查是否使用Mock服务
  if (shouldUseMockServices()) {
    const startTime = Date.now();
    const mockArkService = MockServiceFactory.getArkService();
    const result = await mockArkService.generate({
      messages,
      model,
      temperature,
      maxTokens
    });
    
    const duration = Date.now() - startTime;
    // 更新统计数据
    updateServiceStats('ark', duration, true);
    
    return res.json({
      success: true,
      data: {
        content: result.content,
        model,
        usage: result.usage,
        mock: true
      },
      timestamp: new Date().toISOString()
    });
  }
  
  try {
    const startTime = Date.now();
    const result = await callVolcengineArk({
      messages,
      model,
      temperature,
      max_tokens: maxTokens
    });
    
    const duration = Date.now() - startTime;
    // 更新统计数据
    updateServiceStats('ark', duration, true);
    
    res.json({
      success: true,
      data: {
        content: result.content,
        model,
        usage: result.usage
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    const duration = Date.now() - (req as any).startTime || 0;
    // 更新统计数据
    updateServiceStats('ark', duration, false);
    throw createError(error.message || 'Ark生成失败', error.statusCode || 500);
  }
}));

/**
 * POST /api/ark/story
 * 生成胎教故事
 */
router.post('/story', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { theme, style, length } = req.body;
    
    if (!theme || typeof theme !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'theme 参数是必需的',
        timestamp: new Date().toISOString()
      });
    }
    
    // 构建故事生成的messages
    const messages = [
      {
        role: 'system',
        content: `你是一个专业的胎教故事创作者。请根据用户提供的主题创作一个温馨、积极、适合胎教的故事。

要求：
1. 故事内容积极正面，充满爱与温暖
2. 语言简洁优美，适合朗读
3. 情节简单易懂，富有想象力
4. 长度适中，大约${length || '300-500'}字
5. 风格：${style || '温馨治愈'}

请直接输出故事内容，不需要额外的说明。`
      },
      {
        role: 'user',
        content: `请创作一个关于"${theme}"的胎教故事。`
      }
    ];
    
    const arkParams = {
      model: 'doubao-seed-1-6-250615',
      messages,
      temperature: 0.8,
      max_tokens: 1000,
      top_p: 0.9
    };
    
    // 调用Ark API
    const result = await callVolcengineArk(arkParams, 10000);
    const story = result.choices?.[0]?.message?.content || '';
    
    const duration = Date.now() - startTime;
    // 更新统计数据
    updateServiceStats('ark', duration, true);
    
    console.log('故事生成日志:', {
      apiName: '胎教故事生成',
      theme,
      style,
      length,
      storyLength: story.length,
      duration,
      success: true
    });
    
    res.json({
      success: true,
      data: {
        story,
        theme,
        style: style || '温馨治愈',
        length: story.length,
        usage: result.usage
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    // 更新统计数据
    updateServiceStats('ark', duration, false);
    
    console.error('故事生成错误:', {
      error: error.message,
      duration,
      success: false
    });
    
    res.status(500).json({
      success: false,
      error: error.message || '故事生成失败，请稍后重试',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /knowledge
 * 生成胎教知识内容
 */
router.post('/knowledge', asyncHandler(async (req: Request, res: Response) => {
  const { topic, gestationalWeek } = req.body;
  
  // 参数验证
  if (!topic || typeof topic !== 'string') {
    throw createValidationError('topic参数是必需的，且必须是字符串');
  }
  
  if (gestationalWeek && (typeof gestationalWeek !== 'number' || gestationalWeek < 1 || gestationalWeek > 42)) {
    throw createValidationError('gestationalWeek必须是1-42之间的数字');
  }
  
  // 检查是否使用Mock服务
  if (shouldUseMockServices()) {
    const startTime = Date.now();
    const mockArkService = MockServiceFactory.getArkService();
    const result = await mockArkService.generateKnowledge({
      topic,
      gestationalWeek
    });
    
    const duration = Date.now() - startTime;
    // 更新统计数据
    updateServiceStats('ark', duration, true);
    
    return res.json({
      success: true,
      data: {
        content: result.content,
        topic,
        gestationalWeek,
        wordCount: result.content.length,
        mock: true
      },
      timestamp: new Date().toISOString()
    });
  }
  
  const systemPrompt = `你是一个专业的妇产科医生和胎教专家。请根据用户提供的主题和孕周，生成科学准确的胎教知识内容。

要求：
1. 内容科学准确，基于医学证据
2. 语言通俗易懂，适合孕妇理解
3. 提供实用的建议和指导
4. 避免引起焦虑，保持积极正面的语调
5. 如果涉及医疗建议，请提醒咨询专业医生

请直接输出知识内容，不需要额外的说明。`;
  
  const weekInfo = gestationalWeek ? `当前孕周：${gestationalWeek}周` : '';
  const userPrompt = `请提供关于"${topic}"的胎教知识。${weekInfo}`;
  
  try {
    const startTime = Date.now();
    const result = await callVolcengineArk({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: 'ep-20241230140956-8xqzm',
      temperature: 0.3,
      max_tokens: 800
    });
    
    const duration = Date.now() - startTime;
    // 更新统计数据
    updateServiceStats('ark', duration, true);
    
    res.json({
      success: true,
      data: {
        content: result.content,
        topic,
        gestationalWeek,
        wordCount: result.content.length,
        usage: result.usage
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    const duration = Date.now() - (req as any).startTime || 0;
    // 更新统计数据
    updateServiceStats('ark', duration, false);
    throw createError(error.message || '知识内容生成失败', error.statusCode || 500);
  }
}));

/**
 * GET /api/ark/models
 * 获取可用的模型列表
 */
router.get('/models', (req, res) => {
  const models = [
    {
      id: 'doubao-seed-1-6-250615',
      name: '豆包种子模型',
      description: '适合创意写作和故事生成',
      maxTokens: 4096,
      recommended: true
    },
    {
      id: 'doubao-pro-4k',
      name: '豆包专业版',
      description: '适合专业内容生成和分析',
      maxTokens: 4096,
      recommended: false
    }
  ];
  
  res.json({
    success: true,
    data: models,
    timestamp: new Date().toISOString()
  });
});

export default router;