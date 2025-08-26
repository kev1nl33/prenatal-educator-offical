import express from 'express';
import axios from 'axios';
import { ttsCacheManager, TTSCacheParams } from '../utils/cacheManager.js';
import { shouldUseMockServices } from '../config/featureFlags.js';
import { MockServiceFactory } from '../services/mockServices.js';
import { updateServiceStats } from './dashboard.js';

const router = express.Router();

/**
 * TTS 语音合成 API
 * 集成缓存策略和超时控制
 */

// 定义TTS参数类型
interface TTSFrontendParams {
  userId?: string;
  requestId?: string;
  text: string;
  voiceType?: string;
  encoding?: string;
  sampleRate?: number;
  speed?: number;
  volume?: number;
  emotion?: string;
}

interface TTSBackendParams {
  app: { appid: string | undefined };
  user: { uid: string };
  request: { reqid: string; text: string; voice_type: string };
  audio: { encoding: string; sample_rate: number; speech_rate: number; loudness_rate: number; emotion: string };
}

interface TTSResponse {
  success: boolean;
  data: ArrayBuffer;
  headers: unknown;
}

// 参数映射：前端 camelCase -> 后端 snake_case
const mapTTSParams = (frontendParams: TTSFrontendParams): TTSBackendParams => {
  return {
    app: {
      appid: process.env.VOLCENGINE_APP_ID
    },
    user: {
      uid: frontendParams.userId || 'anonymous_user'
    },
    request: {
      reqid: frontendParams.requestId || generateRequestId(),
      text: frontendParams.text,
      voice_type: frontendParams.voiceType || 'zh_female_tianmeixiaomei_emo_v2_mars_bigtts'
    },
    audio: {
      encoding: frontendParams.encoding || 'mp3',
      sample_rate: frontendParams.sampleRate || 24000,
      speech_rate: frontendParams.speed || 0,
      loudness_rate: frontendParams.volume || 0,
      emotion: frontendParams.emotion || 'neutral'
    }
  };
};

// 生成请求ID
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// 验证TTS参数
const validateTTSParams = (params: TTSFrontendParams): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // 必需参数检查
  if (!params.text || typeof params.text !== 'string') {
    errors.push('text 参数是必需的，且必须是字符串');
  } else if (params.text.length > 1000) {
    errors.push('text 参数长度不能超过1000个字符');
  }
  
  // 音色类型检查
  const validVoiceTypes = [
    'zh_female_tianmeixiaomei_emo_v2_mars_bigtts',
    'zh_male_jingqiangdaxiong_emo_v2_mars_bigtts',
    'zh_female_wennuan_emo_v2_mars_bigtts'
  ];
  
  if (params.voiceType && !validVoiceTypes.includes(params.voiceType)) {
    errors.push(`voiceType 必须是以下值之一: ${validVoiceTypes.join(', ')}`);
  }
  
  // 语速检查
  if (params.speed !== undefined) {
    const speed = Number(params.speed);
    if (isNaN(speed) || speed < -50 || speed > 100) {
      errors.push('speed 参数必须是 -50 到 100 之间的数字');
    }
  }
  
  // 音量检查
  if (params.volume !== undefined) {
    const volume = Number(params.volume);
    if (isNaN(volume) || volume < -50 || volume > 100) {
      errors.push('volume 参数必须是 -50 到 100 之间的数字');
    }
  }
  
  // 情感检查
  const validEmotions = ['neutral', 'happy', 'sad', 'angry', 'surprised', 'fearful'];
  if (params.emotion && !validEmotions.includes(params.emotion)) {
    errors.push(`emotion 必须是以下值之一: ${validEmotions.join(', ')}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// 调用火山引擎TTS API
const callVolcengineTTS = async (params: TTSBackendParams, timeoutMs: number = 30000): Promise<TTSResponse> => {
  const accessToken = process.env.VOLCENGINE_TTS_ACCESS_TOKEN;
  
  if (!accessToken) {
    throw new Error('VOLCENGINE_TTS_ACCESS_TOKEN 环境变量未配置');
  }
  
  const url = 'https://openspeech.bytedance.com/api/v1/tts';
  
  try {
    const response = await axios.post(url, params, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: timeoutMs,
      responseType: 'arraybuffer' // 接收二进制音频数据
    });
    
    return {
      success: true,
      data: response.data,
      headers: response.headers
    };
  } catch (error: unknown) {
    const err = error as { code?: string; response?: { status: number } };
    if (err.code === 'ECONNABORTED') {
      throw new Error(`TTS请求超时（${timeoutMs}ms）`);
    }
    
    if (err.response) {
      const statusCode = err.response.status;
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
    
    throw err;
  }
};

/**
 * POST /api/tts/synthesize
 * TTS语音合成接口
 */
router.post('/synthesize', async (req, res) => {
  const startTime = Date.now();
  let logData: {
    apiName: string;
    method: string;
    url: string;
    timestamp: string;
    requestParams: unknown;
    statusCode?: number;
    duration?: number;
    success?: boolean;
    errorMessage?: string;
    responseData?: unknown;
    requestSummary?: string;
    responseSummary?: string;
  } = {
    apiName: 'TTS合成',
    method: 'POST',
    url: '/api/tts/synthesize',
    timestamp: new Date().toISOString(),
    requestParams: req.body
  };
  
  try {
    // 参数验证
    const validation = validateTTSParams(req.body);
    if (!validation.valid) {
      const duration = Date.now() - startTime;
      logData = {
        ...logData,
        statusCode: 400,
        duration,
        success: false,
        errorMessage: validation.errors.join('; ')
      };
      
      // 记录日志
      console.log('TTS API调用日志:', logData);
      
      return res.status(400).json({
        success: false,
        error: '参数验证失败',
        details: validation.errors,
        timestamp: new Date().toISOString()
      });
    }
    
    // 检查是否使用Mock服务
    if (shouldUseMockServices()) {
      const mockTTSService = MockServiceFactory.getTTSService();
      const result = await mockTTSService.synthesize({
        text: req.body.text,
        voiceType: req.body.voiceType || 'zh_female_tianmeixiaomei_emo_v2_mars_bigtts',
        speed: req.body.speed || 0,
        emotion: req.body.emotion || 'neutral'
      });
      
      const duration = Date.now() - startTime;
      
      // 更新统计数据
      updateServiceStats('tts', duration, true);
      
      const resultObj = result as { audioUrl?: string; duration?: number };
      logData = {
        ...logData,
        statusCode: 200,
        duration,
        success: true,
        responseData: { mock: true, audioSize: resultObj.audioUrl?.length || 0 },
        requestSummary: `文本: "${req.body.text.substring(0, 50)}...", 音色: ${req.body.voiceType || 'zh_female_tianmeixiaomei_emo_v2_mars_bigtts'}`,
        responseSummary: `Mock服务, 音频大小: ${resultObj.audioUrl?.length || 0} bytes`
      };
      
      console.log('TTS API调用日志 (Mock服务):', logData);
      
      return res.json({
        success: true,
        data: {
          audioUrl: resultObj.audioUrl,
          duration: resultObj.duration,
          cached: false,
          mock: true
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // 构建缓存参数
    const cacheParams: TTSCacheParams = {
      text: req.body.text,
      voiceType: req.body.voiceType || 'zh_female_tianmeixiaomei_emo_v2_mars_bigtts',
      speed: req.body.speed || 0,
      emotion: req.body.emotion || 'neutral',
      encoding: req.body.encoding || 'mp3',
      sampleRate: req.body.sampleRate || 24000
    };
    
    // 检查缓存
    const cachedResult = await ttsCacheManager.get(cacheParams);
    if (cachedResult) {
      const cacheObj = cachedResult as { audioBuffer?: Buffer; audioUrl?: string; duration?: number };
      const duration = Date.now() - startTime;
      logData = {
        ...logData,
        statusCode: 200,
        duration,
        success: true,
        responseData: { cached: true, audioSize: cacheObj.audioBuffer?.length || 0 },
        requestSummary: `文本: "${req.body.text.substring(0, 50)}...", 音色: ${cacheParams.voiceType}`,
        responseSummary: `缓存命中, 音频大小: ${cacheObj.audioBuffer?.length || 0} bytes`
      };
      
      console.log('TTS API调用日志 (缓存命中):', logData);
      
      return res.json({
        success: true,
        data: {
          audioUrl: cacheObj.audioUrl,
          duration: cacheObj.duration,
          cached: true
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // 映射参数
    const volcengineParams = mapTTSParams(req.body);
    
    // 调用火山引擎API（30秒超时）
    const result = await callVolcengineTTS(volcengineParams, 30000);
    
    // 处理响应数据
    const audioBuffer = Buffer.from(result.data);
    const audioUrl = `data:audio/mp3;base64,${audioBuffer.toString('base64')}`;
    
    const responseData = {
      audioUrl,
      audioBuffer,
      duration: Math.floor(audioBuffer.length / 1000), // 估算时长
      cached: false
    };
    
    // 存储到缓存
    await ttsCacheManager.set(cacheParams, responseData, 3600); // 缓存1小时
    
    const duration = Date.now() - startTime;
    
    // 更新统计数据
    updateServiceStats('tts', duration, true);
    
    logData = {
      ...logData,
      statusCode: 200,
      duration,
      success: true,
      responseData: { cached: false, audioSize: audioBuffer.length },
      requestSummary: `文本: "${req.body.text.substring(0, 50)}...", 音色: ${cacheParams.voiceType}`,
      responseSummary: `新生成, 音频大小: ${audioBuffer.length} bytes, 耗时: ${duration}ms`
    };
    
    console.log('TTS API调用日志 (新生成):', logData);
    
    res.json({
      success: true,
      data: {
        audioUrl: responseData.audioUrl,
        duration: responseData.duration,
        cached: false
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error: unknown) {
    const err = error as { message?: string };
    const duration = Date.now() - startTime;
    
    // 更新统计数据
    updateServiceStats('tts', duration, false);
    
    logData = {
      ...logData,
      statusCode: 500,
      duration,
      success: false,
      errorMessage: err.message
    };
    
    console.error('TTS API调用错误:', logData);
    
    res.status(500).json({
      success: false,
      error: err.message || '服务异常，请稍后重试',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/tts/cache/stats
 * 获取TTS缓存统计信息
 */
router.get('/cache/stats', async (req, res) => {
  try {
    const stats = ttsCacheManager.getStats();
    
    res.json({
      success: true,
      data: {
        ...stats,
        cacheHitRate: `${stats.hitRate.toFixed(2)}%`,
        totalSizeMB: (stats.totalSize / 1024 / 1024).toFixed(2),
        oldestItemAge: stats.oldestItem ? Math.floor((Date.now() - stats.oldestItem) / 1000 / 60) : 0,
        newestItemAge: stats.newestItem ? Math.floor((Date.now() - stats.newestItem) / 1000 / 60) : 0
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    res.status(500).json({
      success: false,
      error: err.message || '获取缓存统计失败',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/tts/cache
 * 清空TTS缓存
 */
router.delete('/cache', async (req, res) => {
  try {
    await ttsCacheManager.clear();
    
    res.json({
      success: true,
      message: 'TTS缓存已清空',
      timestamp: new Date().toISOString()
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    res.status(500).json({
      success: false,
      error: err.message || '清空缓存失败',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/tts/voices
 * 获取可用的音色列表
 */
router.get('/voices', (req, res) => {
  // 检查是否使用Mock服务
  if (shouldUseMockServices()) {
    const mockTTSService = MockServiceFactory.getTTSService();
    const voices = mockTTSService.getVoices();
    
    return res.json({
      success: true,
      data: voices,
      mock: true,
      timestamp: new Date().toISOString()
    });
  }
  
  const voices = [
    {
      id: 'zh_female_tianmeixiaomei_emo_v2_mars_bigtts',
      name: '甜美小妹',
      gender: 'female',
      language: 'zh-CN',
      description: '甜美温柔的女声，适合胎教故事'
    },
    {
      id: 'zh_male_jingqiangdaxiong_emo_v2_mars_bigtts',
      name: '京腔大熊',
      gender: 'male',
      language: 'zh-CN',
      description: '温和稳重的男声，适合科普内容'
    },
    {
      id: 'zh_female_wennuan_emo_v2_mars_bigtts',
      name: '温暖女声',
      gender: 'female',
      language: 'zh-CN',
      description: '温暖亲切的女声，适合安抚类内容'
    }
  ];
  
  res.json({
    success: true,
    data: voices,
    timestamp: new Date().toISOString()
  });
});

export default router;