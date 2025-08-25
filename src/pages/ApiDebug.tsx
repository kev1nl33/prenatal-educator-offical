import React, { useState, useEffect } from 'react';
import { Play, Code, FileText, Volume2, Mic, Activity, Server, Settings, Wifi } from 'lucide-react';

interface ParameterComparison {
  frontend: Record<string, any>;
  backend: Record<string, any>;
  volcengine: Record<string, any>;
}

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
}

const ApiDebug: React.FC = () => {
  // 健康检查和系统状态
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState(() => {
    return localStorage.getItem('api_debug_base_url') || '';
  });
  const [useCustomApiBase, setUseCustomApiBase] = useState(() => {
    return localStorage.getItem('api_debug_use_custom') === 'true';
  });

  const [arkText, setArkText] = useState('');
  const [arkResponse, setArkResponse] = useState<string>('');
  const [arkParams, setArkParams] = useState<ParameterComparison | null>(null);
  const [arkLoading, setArkLoading] = useState(false);
  const [arkCompatMode, setArkCompatMode] = useState(false); // 兼容模式：支持 text 字段自动转换

  const [ttsText, setTtsText] = useState('');
  const [voiceType, setVoiceType] = useState('zh_female_tianmeixiaomei_emo_v2_mars_bigtts');
  const [emotion, setEmotion] = useState('neutral');
  const [speed, setSpeed] = useState(0);
  const [ttsResponse, setTtsResponse] = useState<ApiResponse | null>(null);
  const [ttsParams, setTtsParams] = useState<ParameterComparison | null>(null);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string>('');

  // 声音复刻调试状态
  const [vcSpeakerName, setVcSpeakerName] = useState('');
  const [vcLanguage, setVcLanguage] = useState('zh-CN');
  const [vcModelType, setVcModelType] = useState('standard');
  const [vcSamples, setVcSamples] = useState<Array<{ file: File | null; text: string; base64: string; format: string }>>([
    { file: null, text: '', base64: '', format: '' }
  ]);
  const [vcLoading, setVcLoading] = useState(false);
  const [vcResponse, setVcResponse] = useState<ApiResponse | null>(null);
  const [vcParams, setVcParams] = useState<ParameterComparison | null>(null);
  const [currentVoiceId, setCurrentVoiceId] = useState<string>('');
  const [vcStatusLoading, setVcStatusLoading] = useState(false);
  const [vcStatus, setVcStatus] = useState<any | null>(null);
  const [vcList, setVcList] = useState<any[]>([]);

  // 引入参数映射工具
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _mappingUtils = (() => {
    try {
      // 动态引入以避免构建时报未使用警告
      // 仅用于生成参数对照展示
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const utils = require('@/utils/parameterMapping');
      return utils;
    } catch {
      return {} as any;
    }
  })();

  const camelToSnakeDeep = (input: any): any => {
    return _mappingUtils.camelToSnakeDeep ? _mappingUtils.camelToSnakeDeep(input) : input;
  };
  const generateVolcengineVoiceCloneTrainParams = (backendParams: Record<string, any>): Record<string, any> => {
    return _mappingUtils.generateVolcengineVoiceCloneTrainParams
      ? _mappingUtils.generateVolcengineVoiceCloneTrainParams(backendParams)
      : backendParams;
  };

  // 获取API基础URL
  const getApiBaseUrl = () => {
    if (useCustomApiBase && apiBaseUrl) {
      return apiBaseUrl;
    }
    return '';
  };

  // 健康检查函数
  const checkHealth = async () => {
    setHealthLoading(true);
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/health`);
      const data = await response.json();
      setHealthStatus({
        ...data,
        status: response.ok ? 'healthy' : 'unhealthy',
        lastCheck: new Date().toISOString()
      });
    } catch (error) {
      setHealthStatus({
        ok: false,
        status: 'error',
        error: (error as Error).message,
        lastCheck: new Date().toISOString()
      });
    } finally {
      setHealthLoading(false);
    }
  };

  // 保存API基础URL设置
  const saveApiBaseSettings = () => {
    localStorage.setItem('api_debug_base_url', apiBaseUrl);
    localStorage.setItem('api_debug_use_custom', useCustomApiBase.toString());
  };

  // 初始化和轮询
  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 10000); // 每10秒轮询
    return () => clearInterval(interval);
  }, [useCustomApiBase, apiBaseUrl]);

  // 保存设置
  useEffect(() => {
    saveApiBaseSettings();
  }, [apiBaseUrl, useCustomApiBase]);

  // 状态徽标组件
  const StatusBadge: React.FC<{ 
    icon: React.ReactNode; 
    label: string; 
    status: 'success' | 'warning' | 'error' | 'info'; 
    value?: string;
    loading?: boolean;
  }> = ({ icon, label, status, value, loading }) => {
    const statusColors = {
      success: 'bg-green-100 text-green-800 border-green-200',
      warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      error: 'bg-red-100 text-red-800 border-red-200',
      info: 'bg-blue-100 text-blue-800 border-blue-200'
    };

    return (
      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${statusColors[status]}`}>
        <span className="mr-2">{icon}</span>
        <span className="mr-1">{label}:</span>
        {loading ? (
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
        ) : (
          <span className="font-semibold">{value}</span>
        )}
      </div>
    );
  };

  // 获取环境状态
  const getEnvStatus = () => {
    if (!healthStatus) return { status: 'info' as const, value: 'Unknown' };
    const { env } = healthStatus;
    if (env?.arkKey && env?.ttsToken) {
      return { status: 'success' as const, value: 'Complete' };
    } else if (env?.arkKey || env?.ttsToken) {
      return { status: 'warning' as const, value: 'Partial' };
    }
    return { status: 'error' as const, value: 'Missing' };
  };

  // 获取健康状态
  const getHealthStatusInfo = () => {
    if (!healthStatus) return { status: 'info' as const, value: 'Unknown' };
    if (healthStatus.status === 'error') {
      return { status: 'error' as const, value: 'Error' };
    }
    return { status: healthStatus.ok ? 'success' as const : 'error' as const, value: healthStatus.ok ? 'Healthy' : 'Unhealthy' };
  };

  // 错误分级文案
  const getErrorMessage = (error: any, response?: Response) => {
    const status = response?.status;
    const code = error?.code || error?.error_code;
    
    // 根据状态码分类
    if (status === 400 || code === 'VALIDATION_ERROR') {
      return {
        type: 'validation',
        title: '参数验证失败',
        message: '请检查输入参数是否正确，确保所有必填字段都已填写',
        suggestion: '建议：检查文本内容、音色类型、语言设置等参数'
      };
    }
    
    if (status === 401) {
      return {
        type: 'auth',
        title: 'API密钥无效',
        message: '火山引擎API密钥验证失败',
        suggestion: '建议：检查.env文件中的VOLCENGINE_ARK_API_KEY和VOLCENGINE_TTS_ACCESS_TOKEN配置'
      };
    }
    
    if (status === 500 || code === 'MISSING_ENV') {
      return {
        type: 'config',
        title: '环境配置错误',
        message: '服务器环境变量配置缺失或无效',
        suggestion: '建议：联系管理员检查服务器环境变量配置，或启用SANDBOX模式进行测试'
      };
    }
    
    if (status === 503 || code === 'UPSTREAM_OFFLINE') {
      return {
        type: 'service',
        title: '上游服务不可用',
        message: '火山引擎服务暂时无法访问',
        suggestion: '建议：稍后重试，或检查网络连接和服务状态'
      };
    }
    
    if (status === 429) {
      return {
        type: 'rate',
        title: '请求频率过高',
        message: 'API调用频率超出限制',
        suggestion: '建议：降低请求频率，等待一段时间后重试'
      };
    }
    
    if (status >= 500) {
      return {
        type: 'server',
        title: '服务器内部错误',
        message: '服务器处理请求时发生错误',
        suggestion: '建议：稍后重试，如问题持续请联系技术支持'
      };
    }
    
    // 网络错误
    if (error?.message?.includes('fetch')) {
      return {
        type: 'network',
        title: '网络连接错误',
        message: '无法连接到API服务器',
        suggestion: '建议：检查网络连接，确认API基础URL设置正确'
      };
    }
    
    return {
      type: 'unknown',
      title: '未知错误',
      message: error?.message || '发生了未知错误',
      suggestion: '建议：查看控制台日志获取更多信息'
    };
  };

  // 错误显示组件
  const ErrorDisplay: React.FC<{ error: any; response?: Response }> = ({ error, response }) => {
    const errorInfo = getErrorMessage(error, response);
    const typeColors = {
      validation: 'border-yellow-200 bg-yellow-50',
      auth: 'border-red-200 bg-red-50',
      config: 'border-orange-200 bg-orange-50',
      service: 'border-purple-200 bg-purple-50',
      rate: 'border-blue-200 bg-blue-50',
      server: 'border-red-200 bg-red-50',
      network: 'border-gray-200 bg-gray-50',
      unknown: 'border-gray-200 bg-gray-50'
    };
    
    return (
      <div className={`border rounded-lg p-4 ${typeColors[errorInfo.type]}`}>
        <h5 className="font-semibold text-gray-800 mb-2">{errorInfo.title}</h5>
        <p className="text-gray-700 mb-2">{errorInfo.message}</p>
        <p className="text-sm text-gray-600">{errorInfo.suggestion}</p>
      </div>
    );
  };

  const handleArkDebug = async () => {
    if (!arkText.trim()) return;
    
    setArkLoading(true);
    try {
      // 构造 messages 数组
      const messages = [
        {
          role: 'system' as const,
          content: '你是一个专业的胎教故事创作助手，请根据用户输入生成温馨有趣的胎教故事。'
        },
        {
          role: 'user' as const,
          content: arkText
        }
      ];

      // 前端参数 (camelCase)
      let frontendParams: any;
      if (arkCompatMode) {
        // 兼容模式：同时显示 text 和 messages 格式
        frontendParams = {
          text: arkText,  // 兼容旧格式
          messages,       // 新格式
          model: 'doubao-seed-1-6-250615',
          temperature: 0.7,
          maxTokens: 2048,
          topP: 0.9,
          stream: false
        };
      } else {
        // 标准模式：只使用 messages
        frontendParams = {
          messages,
          model: 'doubao-seed-1-6-250615',
          temperature: 0.7,
          maxTokens: 2048,
          topP: 0.9,
          stream: false
        };
      }

      // 后端API参数（与后端接口一致，始终使用 messages）
      const backendParams = {
        messages,
        model: 'doubao-seed-1-6-250615',
        temperature: 0.7,
        maxTokens: 2048  // 后端使用 maxTokens，不是 max_tokens
      };

      // 火山引擎最终调用参数（内部转换为 max_tokens）
      const volcengineParams = {
        model: 'doubao-seed-1-6-250615',
        messages,
        temperature: 0.7,
        max_tokens: 2048,
        top_p: 0.9,
        stream: false
      };

      setArkParams({
        frontend: frontendParams,
        backend: backendParams,
        volcengine: volcengineParams
      });

      // 发送请求时使用后端API参数格式
      const baseUrl = getApiBaseUrl();
      const url = `${baseUrl}/api/ark/generate`;
      const startTime = Date.now();
      
      console.log(`🚀 [ARK] ${new Date().toISOString()} POST ${url}`);
      console.log('📤 Request Body:', JSON.stringify(backendParams, null, 2));
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(backendParams)
      });
      
      const duration = Date.now() - startTime;
      const requestId = response.headers.get('x-request-id') || 'unknown';
      
      console.log(`📊 [ARK] ${requestId} - ${response.status} - ${duration}ms`);
      console.log('📥 Response Headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const data = await response.json();
        console.log('📥 Response Data:', data);
        setArkResponse(data?.data?.content || '生成的结果内容会在这里显示...');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Response Error:', errorData);
        setArkResponse(`API调用失败 (${response.status}): ${errorData?.error || response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Request Error:', error);
      setArkResponse('调用出错: ' + (error as Error).message);
    } finally {
      setArkLoading(false);
    }
  };

  const handleTtsDebug = async () => {
    if (!ttsText.trim()) return;
    
    setTtsLoading(true);
    try {
      // 前端参数 (camelCase)
      const frontendParams = {
        text: ttsText,
        voiceType,
        emotion,
        speed
      };

      // 后端映射参数 (snake_case)
      const backendParams = {
        text: ttsText,
        voice_type: voiceType,
        emotion,
        speech_rate: speed
      };

      // 火山引擎最终调用参数
      const volcengineParams = {
        app: {
          appid: 'your_app_id'
        },
        user: {
          uid: 'user_12345'
        },
        request: {
          reqid: 'debug_' + Date.now(),
          text: ttsText,
          voice_type: voiceType,
          emotion
        },
        audio: {
          encoding: 'mp3',
          sample_rate: 24000,
          speech_rate: speed
        }
      };

      setTtsParams({
        frontend: frontendParams,
        backend: backendParams,
        volcengine: volcengineParams
      });

      // TTS API调用
      const baseUrl = getApiBaseUrl();
      const url = `${baseUrl}/api/tts/synthesize`;
      const startTime = Date.now();
      
      console.log(`🚀 [TTS] ${new Date().toISOString()} POST ${url}`);
      console.log('📤 Request Body:', JSON.stringify(frontendParams, null, 2));
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(frontendParams)
      });
      
      const duration = Date.now() - startTime;
      const requestId = response.headers.get('x-request-id') || 'unknown';
      
      console.log(`📊 [TTS] ${requestId} - ${response.status} - ${duration}ms`);
      console.log('📥 Response Headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const data = await response.json();
        console.log('📥 Response Data:', data);
        setTtsResponse({
          success: true,
          data,
          duration
        });
        const audio = data?.data?.audioUrl || data?.audio_url || data?.audioUrl;
        if (audio) {
          setAudioUrl(audio);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Response Error:', errorData);
        setTtsResponse({
          success: false,
          error: `API调用失败 (${response.status}): ${errorData?.error || response.statusText}`,
          duration
        });
      }
    } catch (error) {
      console.error('❌ Request Error:', error);
      setTtsResponse({
        success: false,
        error: '调用出错: ' + (error as Error).message,
        duration: Date.now() - startTime
      });
    } finally {
      setTtsLoading(false);
    }
  };

  // ========== 声音复刻：工具与事件处理 ==========
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // 去掉 data:*/*;base64, 前缀
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const detectAudioFormat = (file: File | null): string => {
    if (!file) return '';
    const mime = file.type.toLowerCase();
    if (mime.includes('wav')) return 'wav';
    if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3';
    if (mime.includes('ogg')) return 'ogg';
    if (mime.includes('x-m4a') || mime.includes('m4a')) return 'm4a';
    if (mime.includes('aac')) return 'aac';
    if (mime.includes('pcm')) return 'pcm';
    // 兜底：通过文件名后缀判断
    const name = file.name.toLowerCase();
    if (name.endsWith('.wav')) return 'wav';
    if (name.endsWith('.mp3')) return 'mp3';
    if (name.endsWith('.ogg')) return 'ogg';
    if (name.endsWith('.m4a')) return 'm4a';
    if (name.endsWith('.aac')) return 'aac';
    if (name.endsWith('.pcm')) return 'pcm';
    return '';
  };

  const handleSampleFileChange = async (index: number, file: File | null) => {
    const format = detectAudioFormat(file);
    let base64 = '';
    if (file) {
      try {
        base64 = await fileToBase64(file);
      } catch (e) {
        console.error('读取文件失败', e);
      }
    }
    setVcSamples((prev) => prev.map((s, i) => (i === index ? { ...s, file, base64, format } : s)));
  };

  const handleSampleTextChange = (index: number, text: string) => {
    setVcSamples((prev) => prev.map((s, i) => (i === index ? { ...s, text } : s)));
  };

  const addSample = () => {
    setVcSamples((prev) => [...prev, { file: null, text: '', base64: '', format: '' }]);
  };

  const removeSample = (index: number) => {
    setVcSamples((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVoiceCloneTrain = async () => {
    if (!vcSpeakerName.trim()) {
      alert('请填写说话人名称');
      return;
    }
    const validSamples = vcSamples.filter((s) => s.base64 && s.text && s.format);
    if (validSamples.length === 0) {
      alert('请至少上传一条音频样本并填写对应文本');
      return;
    }

    setVcLoading(true);
    setVcResponse(null);
    try {
      // 前端参数 (camelCase)
      const frontendParams = {
        speakerName: vcSpeakerName,
        language: vcLanguage,
        modelType: vcModelType,
        source: 'app',
        audios: validSamples.map((s) => ({
          audioBytes: s.base64,
          audioFormat: s.format,
          text: s.text
        }))
      };

      // 后端映射 (snake_case) - 自动深度转换
      const backendParams = camelToSnakeDeep(frontendParams);

      // 火山引擎参数示意
      const volcengineParams = generateVolcengineVoiceCloneTrainParams(backendParams);

      setVcParams({
        frontend: frontendParams,
        backend: backendParams,
        volcengine: volcengineParams
      });

      const res = await fetch('/api/voice-clone/train', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(frontendParams)
      });

      const data = await res.json();
      if (!res.ok) {
        setVcResponse({ success: false, error: data?.error || '训练启动失败' });
      } else {
        setVcResponse({ success: true, data });
        const vid = data?.data?.id || data?.data?.voiceId || '';
        if (vid) setCurrentVoiceId(vid);
      }
    } catch (e: any) {
      setVcResponse({ success: false, error: e?.message || '请求失败' });
    } finally {
      setVcLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!currentVoiceId.trim()) {
      alert('请先填写 Voice ID');
      return;
    }
    setVcStatusLoading(true);
    try {
      const res = await fetch(`/api/voice-clone/status/${encodeURIComponent(currentVoiceId)}`);
      const data = await res.json();
      if (!res.ok) {
        setVcStatus({ success: false, error: data?.error || '查询失败' });
      } else {
        setVcStatus({ success: true, data: data?.data });
      }
    } catch (e: any) {
      setVcStatus({ success: false, error: e?.message || '请求失败' });
    } finally {
      setVcStatusLoading(false);
    }
  };

  const handleFetchList = async () => {
    try {
      const res = await fetch('/api/voice-clone/list');
      const data = await res.json();
      if (!res.ok) {
        alert(data?.error || '获取列表失败');
      } else {
        setVcList(Array.isArray(data?.data) ? data.data : []);
      }
    } catch (e: any) {
      alert(e?.message || '请求失败');
    }
  };

  const ParameterTable: React.FC<{ params: ParameterComparison; title: string }> = ({ params, title }) => (
    <div className="mt-6">
      <h4 className="text-lg font-semibold mb-4 text-gray-800">{title} - 参数对照</h4>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h5 className="font-medium text-blue-800 mb-2 flex items-center">
            <Code className="w-4 h-4 mr-2" />
            前端参数 (camelCase)
          </h5>
          <pre className="text-sm text-blue-700 overflow-x-auto">
            {JSON.stringify(params.frontend, null, 2)}
          </pre>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <h5 className="font-medium text-green-800 mb-2 flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            后端映射 (snake_case)
          </h5>
          <pre className="text-sm text-green-700 overflow-x-auto">
            {JSON.stringify(params.backend, null, 2)}
          </pre>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <h5 className="font-medium text-purple-800 mb-2 flex items-center">
            <Volume2 className="w-4 h-4 mr-2" />
            火山引擎调用
          </h5>
          <pre className="text-sm text-purple-700 overflow-x-auto">
            {JSON.stringify(params.volcengine, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">API 调试面板</h1>
          <p className="text-gray-600">可视化调试 Ark 文本生成和 TTS 语音合成接口</p>
        </div>

        {/* 状态徽标区域 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex flex-wrap items-center gap-3">
              {(() => {
                const envStatus = getEnvStatus();
                return (
                  <StatusBadge
                    icon={<Settings className="w-4 h-4" />}
                    label="ENV"
                    status={envStatus.status}
                    value={envStatus.value}
                  />
                );
              })()}
              
              <StatusBadge
                icon={<Server className="w-4 h-4" />}
                label="SANDBOX"
                status={healthStatus?.sandbox ? 'warning' : 'success'}
                value={healthStatus?.sandbox ? 'ON' : 'OFF'}
              />
              
              <StatusBadge
                icon={<Wifi className="w-4 h-4" />}
                label="API_BASE"
                status={useCustomApiBase ? 'info' : 'success'}
                value={useCustomApiBase ? 'Custom' : 'Default'}
              />
              
              {(() => {
                const healthInfo = getHealthStatusInfo();
                return (
                  <StatusBadge
                    icon={<Activity className="w-4 h-4" />}
                    label="HEALTH"
                    status={healthInfo.status}
                    value={healthInfo.value}
                    loading={healthLoading}
                  />
                );
              })()}
            </div>
            
            <button
              onClick={checkHealth}
              disabled={healthLoading}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors flex items-center"
            >
              {healthLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Activity className="w-4 h-4 mr-2" />
              )}
              刷新状态
            </button>
          </div>
          
          {/* API基础URL设置 */}
          <div className="border-t pt-4">
            <div className="flex items-center space-x-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCustomApiBase}
                  onChange={(e) => setUseCustomApiBase(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  使用自定义 API 基础URL
                </span>
              </label>
              
              {useCustomApiBase && (
                <div className="flex-1">
                  <input
                    type="text"
                    value={apiBaseUrl}
                    onChange={(e) => setApiBaseUrl(e.target.value)}
                    placeholder="http://localhost:3001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              )}
            </div>
            
            {healthStatus && (
              <div className="mt-3 text-xs text-gray-500">
                最后检查: {new Date(healthStatus.lastCheck).toLocaleString()} | 
                端口: {healthStatus.port} | 
                请求ID: {healthStatus.requestId}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Ark 文本生成调试区 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
              <FileText className="w-6 h-6 mr-3 text-blue-500" />
              Ark 文本生成调试
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  输入文本
                </label>
                <textarea
                  value={arkText}
                  onChange={(e) => setArkText(e.target.value)}
                  placeholder="请输入要生成故事的主题或关键词..."
                  className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex items-center space-x-3">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={arkCompatMode}
                    onChange={(e) => setArkCompatMode(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    兼容模式（同时显示 text 和 messages 参数）
                  </span>
                </label>
              </div>
              
              <button
                onClick={handleArkDebug}
                disabled={arkLoading || !arkText.trim()}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
              >
                {arkLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                ) : (
                  <Play className="w-5 h-5 mr-2" />
                )}
                {arkLoading ? '生成中...' : '开始调试'}
              </button>
            </div>

            {arkResponse && (
              <div className="mt-6">
                <h4 className="text-lg font-semibold mb-3 text-gray-800">生成结果</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">{arkResponse}</p>
                </div>
              </div>
            )}

            {arkParams && <ParameterTable params={arkParams} title="Ark API" />}
          </div>

          {/* TTS 语音合成调试区 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
              <Volume2 className="w-6 h-6 mr-3 text-green-500" />
              TTS 语音合成调试
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  输入文本
                </label>
                <textarea
                  value={ttsText}
                  onChange={(e) => setTtsText(e.target.value)}
                  placeholder="请输入要合成语音的文本..."
                  className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    音色类型
                  </label>
                  <select
                    value={voiceType}
                    onChange={(e) => setVoiceType(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="zh_female_tianmeixiaomei_emo_v2_mars_bigtts">甜美小美</option>
                    <option value="zh_male_wennuanahu_emo_v2_mars_bigtts">温暖阿虎</option>
                    <option value="zh_female_qingxinxiaoyuan_emo_v2_mars_bigtts">清新小园</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    情感
                  </label>
                  <select
                    value={emotion}
                    onChange={(e) => setEmotion(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="neutral">中性</option>
                    <option value="happy">开心</option>
                    <option value="sad">悲伤</option>
                    <option value="angry">愤怒</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    语速 ({speed})
                  </label>
                  <input
                    type="range"
                    min="-50"
                    max="100"
                    value={speed}
                    onChange={(e) => setSpeed(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
              
              <button
                onClick={handleTtsDebug}
                disabled={ttsLoading || !ttsText.trim()}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
              >
                {ttsLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                ) : (
                  <Play className="w-5 h-5 mr-2" />
                )}
                {ttsLoading ? '合成中...' : '开始调试'}
              </button>
            </div>

            {ttsResponse && (
              <div className="mt-6">
                <h4 className="text-lg font-semibold mb-3 text-gray-800">合成结果</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  {ttsResponse.success ? (
                    <div>
                      <p className="text-green-600 mb-2">✅ 合成成功</p>
                      {ttsResponse.duration && (
                        <p className="text-sm text-gray-600 mb-3">响应时间: {Math.round(ttsResponse.duration)}ms</p>
                      )}
                      {audioUrl && (
                        <audio controls className="w-full">
                          <source src={audioUrl} type="audio/mpeg" />
                          您的浏览器不支持音频播放。
                        </audio>
                      )}
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                          查看响应数据
                        </summary>
                        <pre className="mt-2 text-xs text-gray-700 overflow-x-auto">
                          {JSON.stringify(ttsResponse.data, null, 2)}
                        </pre>
                      </details>
                    </div>
                  ) : (
                    <p className="text-red-600">❌ {ttsResponse.error}</p>
                  )}
                </div>
              </div>
            )}

            {ttsParams && <ParameterTable params={ttsParams} title="TTS API" />}
          </div>

          {/* 声音复刻调试区 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
              <Mic className="w-6 h-6 mr-3 text-orange-500" />
              声音复刻训练调试
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">说话人名称</label>
                  <input
                    value={vcSpeakerName}
                    onChange={(e) => setVcSpeakerName(e.target.value)}
                    placeholder="如：妈妈的声音"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">语言</label>
                  <select
                    value={vcLanguage}
                    onChange={(e) => setVcLanguage(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="zh-CN">中文(简体)</option>
                    <option value="zh-TW">中文(繁体)</option>
                    <option value="en-US">English</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">模型类型</label>
                  <select
                    value={vcModelType}
                    onChange={(e) => setVcModelType(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="standard">标准</option>
                    <option value="premium">高保真(示意)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">训练样本</label>
                <div className="space-y-4">
                  {vcSamples.map((s, idx) => (
                    <div key={idx} className="p-4 border rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <input
                            type="file"
                            accept="audio/*"
                            onChange={(e) => handleSampleFileChange(idx, e.target.files?.[0] || null)}
                            className="w-full"
                          />
                          {s.format && (
                            <p className="text-xs text-gray-500 mt-1">格式: {s.format}</p>
                          )}
                        </div>
                        <div>
                          <input
                            value={s.text}
                            onChange={(e) => handleSampleTextChange(idx, e.target.value)}
                            placeholder="请输入与音频对应的文本(转写)"
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex justify-between">
                        <span className="text-xs text-gray-500">{s.base64 ? '已读取音频' : '未选择音频'}</span>
                        {vcSamples.length > 1 && (
                          <button
                            onClick={() => removeSample(idx)}
                            className="text-sm text-red-600 hover:text-red-800"
                          >
                            移除此样本
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={addSample}
                    className="px-3 py-2 rounded-md text-sm bg-gray-100 hover:bg-gray-200"
                  >
                    + 添加样本
                  </button>
                </div>
              </div>

              <button
                onClick={handleVoiceCloneTrain}
                disabled={vcLoading || !vcSpeakerName.trim()}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
              >
                {vcLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                ) : (
                  <Mic className="w-5 h-5 mr-2" />
                )}
                {vcLoading ? '训练启动中...' : '开始训练'}
              </button>
            </div>

            {vcResponse && (
              <div className="mt-6">
                <h4 className="text-lg font-semibold mb-3 text-gray-800">训练响应</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  {vcResponse.success ? (
                    <div>
                      <p className="text-green-600 mb-2">✅ 请求已受理</p>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">查看响应数据</summary>
                        <pre className="mt-2 text-xs text-gray-700 overflow-x-auto">{JSON.stringify(vcResponse.data, null, 2)}</pre>
                      </details>
                    </div>
                  ) : (
                    <p className="text-red-600">❌ {vcResponse.error}</p>
                  )}
                </div>
              </div>
            )}

            <div className="mt-6 p-4 border rounded-lg">
              <h4 className="text-lg font-semibold mb-3 text-gray-800">训练状态查询</h4>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-center">
                <input
                  value={currentVoiceId}
                  onChange={(e) => setCurrentVoiceId(e.target.value)}
                  placeholder="请输入 Voice ID (训练响应会自动填入)"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <button
                  onClick={handleCheckStatus}
                  className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
                  disabled={vcStatusLoading || !currentVoiceId.trim()}
                >
                  {vcStatusLoading ? '查询中...' : '查询状态'}
                </button>
              </div>
              {vcStatus && (
                <pre className="mt-3 text-xs text-gray-700 overflow-x-auto">{JSON.stringify(vcStatus, null, 2)}</pre>
              )}
            </div>

            <div className="mt-6 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-gray-800">我的复刻声音列表</h4>
                <button onClick={handleFetchList} className="px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-sm">刷新列表</button>
              </div>
              {vcList.length === 0 ? (
                <p className="text-sm text-gray-600 mt-2">暂无数据，点击上方“刷新列表”获取。</p>
              ) : (
                <div className="mt-2">
                  <pre className="text-xs text-gray-700 overflow-x-auto">{JSON.stringify(vcList, null, 2)}</pre>
                </div>
              )}
            </div>

            {vcParams && <ParameterTable params={vcParams} title="Voice Clone Train API" />}
          </div>
        </div>
      </div>
    </div>
  );
  // 修复：补充组件函数闭合
};

  export default ApiDebug;