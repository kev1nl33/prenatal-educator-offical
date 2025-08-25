/**
 * 参数映射工具函数
 * 用于在前端 camelCase 和后端 snake_case 之间进行转换
 */

// 将 camelCase 转换为 snake_case
export function camelToSnake(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = value;
  }
  
  return result;
}

// 将 snake_case 转换为 camelCase
export function snakeToCamel(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = value;
  }
  
  return result;
}

// TTS 参数映射配置
export const TTS_PARAMETER_MAPPING = {
  // 前端 camelCase -> 后端 snake_case
  frontend_to_backend: {
    voiceType: 'voice_type',
    speed: 'speech_rate',
    emotion: 'emotion',
    text: 'text'
  },
  // 后端 snake_case -> 前端 camelCase
  backend_to_frontend: {
    voice_type: 'voiceType',
    speech_rate: 'speed',
    emotion: 'emotion',
    text: 'text'
  }
};

// Ark 参数映射配置
export const ARK_PARAMETER_MAPPING = {
  frontend_to_backend: {
    maxTokens: 'max_tokens',
    topP: 'top_p',
    temperature: 'temperature',
    text: 'text',
    model: 'model'
  },
  backend_to_frontend: {
    max_tokens: 'maxTokens',
    top_p: 'topP',
    temperature: 'temperature',
    text: 'text',
    model: 'model'
  }
};

// 映射前端参数到后端参数
export function mapFrontendToBackend(
  frontendParams: Record<string, any>,
  mapping: Record<string, string>
): Record<string, any> {
  const backendParams: Record<string, any> = {};
  
  for (const [frontendKey, value] of Object.entries(frontendParams)) {
    const backendKey = mapping[frontendKey] || frontendKey;
    backendParams[backendKey] = value;
  }
  
  return backendParams;
}

// 映射后端参数到前端参数
export function mapBackendToFrontend(
  backendParams: Record<string, any>,
  mapping: Record<string, string>
): Record<string, any> {
  const frontendParams: Record<string, any> = {};
  
  for (const [backendKey, value] of Object.entries(backendParams)) {
    const frontendKey = mapping[backendKey] || backendKey;
    frontendParams[frontendKey] = value;
  }
  
  return frontendParams;
}

// 生成 TTS 火山引擎调用参数
export function generateVolcengineTTSParams(
  backendParams: Record<string, any>,
  appId: string = 'your_app_id',
  userId: string = 'user_12345'
): Record<string, any> {
  return {
    app: {
      appid: appId
    },
    user: {
      uid: userId
    },
    request: {
      reqid: `debug_${Date.now()}`,
      text: backendParams.text,
      voice_type: backendParams.voice_type,
      emotion: backendParams.emotion || 'neutral'
    },
    audio: {
      encoding: 'mp3',
      sample_rate: 24000,
      speech_rate: backendParams.speech_rate || 0,
      loudness_rate: 0
    }
  };
}

// 生成 Ark 火山引擎调用参数
export function generateVolcengineArkParams(
  backendParams: Record<string, any>,
  systemPrompt: string = '你是一个专业的胎教故事创作助手，请根据用户输入生成温馨有趣的胎教故事。'
): Record<string, any> {
  return {
    model: backendParams.model || 'doubao-seed-1-6-250615',
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: backendParams.text
      }
    ],
    temperature: backendParams.temperature || 0.7,
    max_tokens: backendParams.max_tokens || 2048,
    top_p: backendParams.top_p || 0.9,
    stream: false
  };
}

// 参数对比结果接口
export interface ParameterComparison {
  frontend: Record<string, any>;
  backend: Record<string, any>;
  volcengine: Record<string, any>;
}

// 生成完整的参数对比
export function generateParameterComparison(
  frontendParams: Record<string, any>,
  apiType: 'tts' | 'ark',
  options?: {
    appId?: string;
    userId?: string;
    systemPrompt?: string;
  }
): ParameterComparison {
  const mapping = apiType === 'tts' ? TTS_PARAMETER_MAPPING : ARK_PARAMETER_MAPPING;
  const backendParams = mapFrontendToBackend(frontendParams, mapping.frontend_to_backend);
  
  let volcengineParams: Record<string, any>;
  
  if (apiType === 'tts') {
    volcengineParams = generateVolcengineTTSParams(
      backendParams,
      options?.appId,
      options?.userId
    );
  } else {
    volcengineParams = generateVolcengineArkParams(
      backendParams,
      options?.systemPrompt
    );
  }
  
  return {
    frontend: frontendParams,
    backend: backendParams,
    volcengine: volcengineParams
  };
}

// 错误状态码映射
export const ERROR_MESSAGE_MAPPING: Record<number, string> = {
  400: '请求参数错误，请检查输入内容',
  401: '未授权，请检查 API Key',
  403: '访问被拒绝，请检查权限设置',
  404: '接口不存在，请检查请求路径',
  429: '请求过多，请稍后再试',
  500: '服务器内部错误，请稍后重试',
  502: '网关错误，请稍后重试',
  503: '服务不可用，请稍后重试',
  504: '请求超时，请稍后重试'
};

// 获取用户友好的错误信息
export function getFriendlyErrorMessage(statusCode: number, defaultMessage?: string): string {
  return ERROR_MESSAGE_MAPPING[statusCode] || defaultMessage || '未知错误，请联系技术支持';
}

// 递归地将 camelCase 转换为 snake_case（支持嵌套对象与数组）
export function camelToSnakeDeep(input: any): any {
  if (Array.isArray(input)) {
    return input.map((item) => camelToSnakeDeep(item));
  }
  if (input && typeof input === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(input)) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      result[snakeKey] = camelToSnakeDeep(value);
    }
    return result;
  }
  return input;
}

// 生成 声音复刻（训练） 的火山引擎调用参数（示意）
export function generateVolcengineVoiceCloneTrainParams(
  backendParams: Record<string, any>
): Record<string, any> {
  const audios = Array.isArray(backendParams.audios) ? backendParams.audios : [];
  return {
    task: 'voice_clone_train',
    dataset: audios.map((a: any, idx: number) => ({
      id: `sample_${idx + 1}`,
      audio_base64: a.audio_bytes, // Base64 音频
      audio_format: a.audio_format, // wav/mp3/...
      transcript: a.text
    })),
    config: {
      speaker_name: backendParams.speaker_name,
      speaker_id: backendParams.speaker_id || undefined,
      language: backendParams.language || 'zh-CN',
      model_type: backendParams.model_type || 'standard',
      source: backendParams.source || 'app',
      extra_params: backendParams.extra_params || {}
    }
  };
}