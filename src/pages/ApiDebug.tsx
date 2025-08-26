import React, { useState, useEffect } from 'react';
import { Play, Code, FileText, Volume2, Mic, Activity, Server, Settings, Wifi, Pause, Square, Download, Copy, ChevronDown, ChevronUp, Clock, CheckCircle, XCircle, Trash2, BarChart3 } from 'lucide-react';

interface ParameterComparison {
  frontend: Record<string, unknown>;
  backend: Record<string, unknown>;
  volcengine: Record<string, unknown>;
}

interface ApiResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  duration?: number;
}

interface RequestHistoryItem {
  id: string;
  timestamp: Date;
  method: string;
  url: string;
  status: number;
  duration: number;
  requestId: string;
  apiType: 'ark' | 'tts' | 'voice-clone';
  success: boolean;
}

interface VoiceCloneStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  message?: string;
}

interface VoiceCloneItem {
  id: string;
  name: string;
  language: string;
  modelType: string;
  createdAt: string;
  status: string;
}

const ApiDebug: React.FC = () => {
  // 健康检查和系统状态
  const [healthStatus, setHealthStatus] = useState<{
    ok: boolean;
    sandbox: boolean;
    env: { arkKey: boolean; ttsToken: boolean };
    port: number;
  } | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState(() => {
    return localStorage.getItem('api_debug_base_url') || '';
  });
  const [useCustomApiBase, setUseCustomApiBase] = useState(() => {
    return localStorage.getItem('api_debug_use_custom') === 'true';
  });

  // Ark 调试状态
  const [arkMode, setArkMode] = useState<'generate' | 'story'>('generate');
  const [arkText, setArkText] = useState('');
  const [arkResponse, setArkResponse] = useState<string>('');
  const [arkParams, setArkParams] = useState<ParameterComparison | null>(null);
  const [arkLoading, setArkLoading] = useState(false);
  const [arkCompatMode, setArkCompatMode] = useState(false); // 兼容模式：支持 text 字段自动转换
  
  // Story 模式状态
  const [storyTopic, setStoryTopic] = useState('');
  const [storyStyle, setStoryStyle] = useState('童话');
  const [storyLength, setStoryLength] = useState('medium');

  const [ttsText, setTtsText] = useState('');
  const [voiceType, setVoiceType] = useState('zh_female_tianmeixiaomei_emo_v2_mars_bigtts');
  const [emotion, setEmotion] = useState('neutral');
  const [speed, setSpeed] = useState(0);
  const [ttsResponse, setTtsResponse] = useState<ApiResponse | null>(null);
  const [ttsParams, setTtsParams] = useState<ParameterComparison | null>(null);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string>('');
  
  // TTS播放器状态
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
  
  // TTS请求控制
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [validationError, setValidationError] = useState<string>('');

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
  const [vcStatus, setVcStatus] = useState<VoiceCloneStatus | null>(null);
  const [vcList, setVcList] = useState<VoiceCloneItem[]>([]);

  // 请求历史记录状态
  const [requestHistory, setRequestHistory] = useState<RequestHistoryItem[]>([]);
  const [showArkHistory, setShowArkHistory] = useState(false);
  const [showTtsHistory, setShowTtsHistory] = useState(false);
  const [showVcHistory, setShowVcHistory] = useState(false);

  // 并发控制状态
  const [activeRequests, setActiveRequests] = useState<Set<string>>(new Set());
  const [requestQueue, setRequestQueue] = useState<Array<{id: string, type: string, execute: () => Promise<void>}>>([]);
  const [queuePosition, setQueuePosition] = useState<{[key: string]: number}>({});

  // 统计数据状态
  const [dailyStats, setDailyStats] = useState(() => {
    const today = new Date().toDateString();
    const saved = localStorage.getItem(`api_stats_${today}`);
    return saved ? JSON.parse(saved) : { realCalls: 0, totalDuration: 0 };
  });

  // 最大并发数
  const MAX_CONCURRENT_REQUESTS = 2;

  // 引入参数映射工具
   
  const _mappingUtils = (() => {
    try {
      // 动态引入以避免构建时报未使用警告
      // 仅用于生成参数对照展示
       
      const utils = require('@/utils/parameterMapping');
      return utils;
    } catch {
      return {};
    }
  })();

  // TTS参数验证
  const VALID_VOICE_TYPES = [
    'zh_female_tianmeixiaomei_emo_v2_mars_bigtts',
    'zh_male_wennuanahu_emo_v2_mars_bigtts',
    'zh_female_qingxinxiaoyuan_emo_v2_mars_bigtts'
  ];
  
  const VALID_EMOTIONS = ['neutral', 'happy', 'sad', 'angry'];
  
  const validateTtsParams = () => {
    if (!ttsText.trim()) {
      setValidationError('请输入要合成的文本');
      return false;
    }
    
    if (!VALID_VOICE_TYPES.includes(voiceType)) {
      setValidationError('无效的音色类型');
      return false;
    }
    
    if (!VALID_EMOTIONS.includes(emotion)) {
      setValidationError('无效的情感类型');
      return false;
    }
    
    // 语速范围限制：-50到100
    const clampedSpeed = Math.max(-50, Math.min(100, speed));
    if (clampedSpeed !== speed) {
      setSpeed(clampedSpeed);
    }
    
    setValidationError('');
    return true;
  };
  
  // 播放器控制函数
  const playAudio = () => {
    if (audioRef) {
      audioRef.play();
      setIsPlaying(true);
      setIsPaused(false);
    }
  };
  
  const pauseAudio = () => {
    if (audioRef) {
      audioRef.pause();
      setIsPlaying(false);
      setIsPaused(true);
    }
  };
  
  const stopAudio = () => {
    if (audioRef) {
      audioRef.pause();
      audioRef.currentTime = 0;
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentTime(0);
    }
  };
  
  const copyAudioLink = async () => {
    if (audioUrl) {
      try {
        await navigator.clipboard.writeText(audioUrl);
        alert('音频链接已复制到剪贴板');
      } catch (err) {
        console.error('复制失败:', err);
        alert('复制失败，请手动复制链接');
      }
    }
  };
  
  const downloadAudio = () => {
    if (audioUrl) {
      const link = document.createElement('a');
      link.href = audioUrl;
      link.download = `tts_audio_${Date.now()}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };
  
  // 清理音频资源
  const cleanupAudio = () => {
    if (audioRef) {
      audioRef.pause();
      audioRef.src = '';
    }
    setAudioUrl('');
  };

  // 并发控制函数
  const executeWithConcurrencyControl = async (requestId: string, type: string, requestFn: () => Promise<void>) => {
    // 如果当前活跃请求数小于最大并发数，直接执行
    if (activeRequests.size < MAX_CONCURRENT_REQUESTS) {
      setActiveRequests(prev => new Set([...prev, requestId]));
      try {
        await requestFn();
      } finally {
        setActiveRequests(prev => {
          const newSet = new Set(prev);
          newSet.delete(requestId);
          return newSet;
        });
        // 处理队列中的下一个请求
        processQueue();
      }
    } else {
      // 添加到队列
      setRequestQueue(prev => [...prev, { id: requestId, type, execute: requestFn }]);
      updateQueuePositions();
    }
  };

  // 处理队列
  const processQueue = () => {
    setRequestQueue(prev => {
      if (prev.length === 0 || activeRequests.size >= MAX_CONCURRENT_REQUESTS) {
        return prev;
      }
      
      const [nextRequest, ...remaining] = prev;
      
      // 执行下一个请求
      setActiveRequests(current => new Set([...current, nextRequest.id]));
      nextRequest.execute().finally(() => {
        setActiveRequests(current => {
          const newSet = new Set(current);
          newSet.delete(nextRequest.id);
          return newSet;
        });
        processQueue();
      });
      
      return remaining;
    });
    updateQueuePositions();
  };

  // 更新队列位置
  const updateQueuePositions = () => {
    setQueuePosition(prev => {
      const newPositions: {[key: string]: number} = {};
      requestQueue.forEach((req, index) => {
        newPositions[req.id] = index + 1;
      });
      return newPositions;
    });
  };

  // 更新统计数据
  const updateDailyStats = (duration: number, isRealService: boolean) => {
    if (!isRealService) return; // 只统计真实服务调用
    
    const today = new Date().toDateString();
    setDailyStats(prev => {
      const newStats = {
        calls: prev.calls + 1,
        totalDuration: prev.totalDuration + duration,
        avgDuration: 0
      };
      newStats.avgDuration = newStats.totalDuration / newStats.calls;
      
      // 保存到localStorage
      localStorage.setItem(`api_stats_${today}`, JSON.stringify(newStats));
      return newStats;
    });
  };

  // 获取按钮状态
  const getButtonStatus = (type: string) => {
    const requestId = `${type}_request`;
    return {
      isQueuing: queuePosition[requestId] > 0,
      queuePosition: queuePosition[requestId] || 0,
      isActive: activeRequests.has(requestId)
    };
  };
  
  // 取消请求
  const cancelTtsRequest = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setTtsLoading(false);
      setRetryCount(0);
    }
  };
  
  // 指数退避重试
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  const retryWithBackoff = async (fn: () => Promise<any>, maxRetries: number = 2) => {
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries) throw error;
        
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        console.log(`🔄 重试 ${i + 1}/${maxRetries}，${delay}ms 后重试...`);
        setRetryCount(i + 1);
        await sleep(delay);
      }
    }
  };

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

  // 添加请求历史记录
  const addRequestHistory = (item: Omit<RequestHistoryItem, 'id' | 'timestamp'>) => {
    const newItem: RequestHistoryItem = {
      ...item,
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };
    
    setRequestHistory(prev => {
      const updated = [newItem, ...prev];
      // 保持最多20条记录
      return updated.slice(0, 20);
    });
  };

  // 清空请求历史
  const clearRequestHistory = () => {
    setRequestHistory([]);
  };

  // 获取特定类型的请求历史
  const getHistoryByType = (type: 'ark' | 'tts' | 'voice-clone') => {
    return requestHistory.filter(item => item.apiType === type);
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
  
  // 音频播放器事件监听
  useEffect(() => {
    if (audioUrl && !audioRef) {
      const audio = new Audio(audioUrl);
      setAudioRef(audio);
      
      // 音频事件监听
      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration);
      });
      
      audio.addEventListener('timeupdate', () => {
        setCurrentTime(audio.currentTime);
      });
      
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentTime(0);
      });
      
      audio.addEventListener('error', (e) => {
        console.error('音频播放错误:', e);
        cleanupAudio();
      });
      
      return () => {
        audio.removeEventListener('loadedmetadata', () => {});
        audio.removeEventListener('timeupdate', () => {});
        audio.removeEventListener('ended', () => {});
        audio.removeEventListener('error', () => {});
      };
    }
  }, [audioUrl, audioRef]);
  
  // 清理音频资源
  useEffect(() => {
    return () => {
      if (audioRef) {
        audioRef.pause();
        audioRef.src = '';
      }
    };
  }, []);

  // 格式化时间
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // 自定义音频播放器组件
  const AudioPlayer: React.FC<{ audioUrl: string }> = ({ audioUrl }) => {
    if (!audioUrl) return null;
    
    return (
      <div className="bg-gray-50 p-4 rounded-lg border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={isPlaying ? pauseAudio : playAudio}
              className="flex items-center justify-center w-10 h-10 bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            
            <button
              onClick={stopAudio}
              className="flex items-center justify-center w-10 h-10 bg-gray-500 hover:bg-gray-600 text-white rounded-full transition-colors"
            >
              <Square className="w-4 h-4" />
            </button>
            
            <div className="text-sm text-gray-600">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={copyAudioLink}
              className="flex items-center px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
            >
              <Copy className="w-4 h-4 mr-1" />
              复制链接
            </button>
            
            <button
              onClick={downloadAudio}
              className="flex items-center px-3 py-1 text-sm bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
            >
              <Download className="w-4 h-4 mr-1" />
              下载音频
            </button>
          </div>
        </div>
        
        {/* 进度条 */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div 
            className="bg-green-500 h-2 rounded-full transition-all duration-100"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          ></div>
        </div>
        
        {/* 原生音频控件作为备用 */}
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700">
            显示原生播放器
          </summary>
          <audio controls className="w-full mt-2" src={audioUrl}>
            您的浏览器不支持音频播放。
          </audio>
        </details>
      </div>
    );
  };

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

  // 请求历史展示组件
  const RequestHistorySection: React.FC<{
    apiType: 'ark' | 'tts' | 'voice-clone';
    title: string;
    isExpanded: boolean;
    onToggle: () => void;
  }> = ({ apiType, title, isExpanded, onToggle }) => {
    const history = getHistoryByType(apiType);
    
    const getStatusIcon = (success: boolean, status: number) => {
      if (success && status >= 200 && status < 300) {
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      }
      return <XCircle className="w-4 h-4 text-red-500" />;
    };
    
    const getStatusColor = (success: boolean, status: number) => {
      if (success && status >= 200 && status < 300) {
        return 'text-green-600';
      }
      if (status >= 400 && status < 500) {
        return 'text-yellow-600';
      }
      return 'text-red-600';
    };
    
    const formatDuration = (duration: number) => {
      if (duration < 1000) {
        return `${duration}ms`;
      }
      return `${(duration / 1000).toFixed(1)}s`;
    };
    
    const formatTime = (timestamp: Date) => {
      return timestamp.toLocaleTimeString('zh-CN', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    };

    return (
      <div className="mt-4 border-t pt-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={onToggle}
            className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 mr-2" />
            ) : (
              <ChevronDown className="w-4 h-4 mr-2" />
            )}
            <Clock className="w-4 h-4 mr-2" />
            {title} 请求历史 ({history.length})
          </button>
          
          {history.length > 0 && (
            <button
              onClick={() => {
                setRequestHistory(prev => prev.filter(item => item.apiType !== apiType));
              }}
              className="text-xs text-gray-500 hover:text-red-500 transition-colors flex items-center"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              清空
            </button>
          )}
        </div>
        
        {isExpanded && (
          <div className="space-y-2">
            {history.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-4">
                暂无请求记录
              </div>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-50 rounded-lg p-3 text-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(item.success, item.status)}
                      <span className="font-medium">{item.method}</span>
                      <span className="text-gray-600">{item.url}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatTime(item.timestamp)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-4">
                      <span className={`font-medium ${getStatusColor(item.success, item.status)}`}>
                        状态: {item.status || 'Error'}
                      </span>
                      <span className="text-gray-600">
                        耗时: {formatDuration(item.duration)}
                      </span>
                      <span className="text-gray-600">
                        ID: {item.requestId}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
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
    // 验证输入
    if (arkMode === 'generate' && !arkText.trim()) return;
    if (arkMode === 'story' && !storyTopic.trim()) return;
    
    const requestId = `ark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 使用并发控制执行请求
    await executeWithConcurrencyControl(requestId, 'ark', async () => {
      setArkLoading(true);
      const startTime = Date.now();
    try {
      let frontendParams: any;
      let backendParams: any;
      let volcengineParams: any;
      let url: string;
      
      const baseUrl = getApiBaseUrl();
      
      if (arkMode === 'generate') {
        // Generate 模式：使用 messages 格式
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
        backendParams = {
          messages,
          model: 'doubao-seed-1-6-250615',
          temperature: 0.7,
          maxTokens: 2048  // 后端使用 maxTokens，不是 max_tokens
        };

        // 火山引擎最终调用参数（内部转换为 max_tokens）
        volcengineParams = {
          model: 'doubao-seed-1-6-250615',
          messages,
          temperature: 0.7,
          max_tokens: 2048,
          top_p: 0.9,
          stream: false
        };
        
        url = `${baseUrl}/api/ark/generate`;
      } else {
        // Story 模式：使用 topic, style, length 格式
        frontendParams = {
          topic: storyTopic,
          style: storyStyle,
          length: storyLength
        };
        
        backendParams = frontendParams;
        volcengineParams = frontendParams;
        
        url = `${baseUrl}/api/ark/story`;
      }

      setArkParams({
        frontend: frontendParams,
        backend: backendParams,
        volcengine: volcengineParams
      });
      
      console.log(`🚀 [ARK-${arkMode.toUpperCase()}] ${new Date().toISOString()} POST ${url}`);
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
      
      console.log(`📊 [ARK-${arkMode.toUpperCase()}] ${requestId} - ${response.status} - ${duration}ms`);
      console.log('📥 Response Headers:', Object.fromEntries(response.headers.entries()));

      // 记录请求历史
      addRequestHistory({
        method: 'POST',
        url: url.replace(getApiBaseUrl(), ''),
        status: response.status,
        duration,
        requestId,
        apiType: 'ark',
        success: response.ok
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📥 Response Data:', data);
        setArkResponse(data?.data?.content || '生成的结果内容会在这里显示...');
        
        // 更新统计数据（只有非沙箱模式才统计）
        updateDailyStats(duration, !healthStatus?.sandbox);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Response Error:', errorData);
        setArkResponse(`API调用失败 (${response.status}): ${errorData?.error || response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Request Error:', error);
      setArkResponse('调用出错: ' + (error as Error).message);
      
      // 记录错误请求历史
      addRequestHistory({
        method: 'POST',
        url: arkMode === 'generate' ? '/api/ark/generate' : '/api/ark/story',
        status: 0,
        duration: Date.now() - startTime,
        requestId: 'error',
        apiType: 'ark',
        success: false
      });
    } finally {
      setArkLoading(false);
    }
    });
  };

  const handleTtsDebug = async () => {
    // 参数验证
    if (!validateTtsParams()) {
      return;
    }
    
    const requestId = `tts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 使用并发控制执行请求
    await executeWithConcurrencyControl(requestId, 'tts', async () => {
      // 清理之前的音频
      cleanupAudio();
      
      setTtsLoading(true);
      setRetryCount(0);
      
      // 创建AbortController
      const controller = new AbortController();
      setAbortController(controller);
    
    try {
      await retryWithBackoff(async () => {
        // 前端参数 (camelCase)
        const frontendParams = {
          text: ttsText,
          voiceType,
          emotion,
          speed: Math.max(-50, Math.min(100, speed)) // 确保语速在有效范围内
        };

        // 后端映射参数 (snake_case)
        const backendParams = {
          text: ttsText,
          voice_type: voiceType,
          emotion,
          speech_rate: frontendParams.speed
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
            speech_rate: frontendParams.speed
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
          body: JSON.stringify(frontendParams),
          signal: controller.signal,
          // 20秒超时
          ...(AbortSignal.timeout && { signal: AbortSignal.timeout(20000) })
        });
        
        const duration = Date.now() - startTime;
        const requestId = response.headers.get('x-request-id') || 'unknown';
        
        console.log(`📊 [TTS] ${requestId} - ${response.status} - ${duration}ms`);
        console.log('📥 Response Headers:', Object.fromEntries(response.headers.entries()));

        // 记录请求历史
        addRequestHistory({
          method: 'POST',
          url: url.replace(getApiBaseUrl(), ''),
          status: response.status,
          duration,
          requestId,
          apiType: 'tts',
          success: response.ok
        });

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
          
          // 更新统计数据（只有非沙箱模式才统计）
          updateDailyStats(duration, !healthStatus?.sandbox);
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ Response Error:', errorData);
          
          // 对于某些错误不重试
          if (response.status === 400 || response.status === 401 || response.status === 403) {
            throw new Error(`API调用失败 (${response.status}): ${errorData?.error || response.statusText}`);
          }
          
          setTtsResponse({
            success: false,
            error: `API调用失败 (${response.status}): ${errorData?.error || response.statusText}`,
            duration
          });
          
          // 抛出错误以触发重试
          throw new Error(`HTTP ${response.status}: ${errorData?.error || response.statusText}`);
        }
      });
    } catch (error: any) {
      console.error('❌ Request Error:', error);
      
      if (error.name === 'AbortError') {
        setTtsResponse({
          success: false,
          error: '请求已取消',
          duration: 0
        });
      } else {
        const errorMessage = error.message || '调用出错';
        setTtsResponse({
          success: false,
          error: retryCount > 0 ? `${errorMessage} (已重试 ${retryCount} 次)` : errorMessage,
          duration: 0
        });
        
        // 记录错误请求历史
        addRequestHistory({
          method: 'POST',
          url: '/api/tts/synthesize',
          status: 0,
          duration: 0,
          requestId: 'error',
          apiType: 'tts',
          success: false
        });
      }
    } finally {
      setTtsLoading(false);
      setAbortController(null);
      setRetryCount(0);
    }
    });
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
    const startTime = Date.now();
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

      const url = '/api/voice-clone/train';
      
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(frontendParams)
      });

      const duration = Date.now() - startTime;
      const requestId = res.headers.get('x-request-id') || 'unknown';
      
      // 记录请求历史
      addRequestHistory({
        method: 'POST',
        url,
        status: res.status,
        duration,
        requestId,
        apiType: 'voice-clone',
        success: res.ok
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
      const errorDuration = Date.now() - startTime;
      setVcResponse({ success: false, error: e?.message || '请求失败' });
      
      // 记录错误请求历史
      addRequestHistory({
        method: 'POST',
        url: '/api/voice-clone/train',
        status: 0,
        duration: errorDuration,
        requestId: 'error',
        apiType: 'voice-clone',
        success: false
      });
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
              {/* 模式切换 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  调用模式
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="arkMode"
                      value="generate"
                      checked={arkMode === 'generate'}
                      onChange={(e) => setArkMode(e.target.value as 'generate' | 'story')}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="ml-2 text-sm text-gray-700">Generate 模式</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="arkMode"
                      value="story"
                      checked={arkMode === 'story'}
                      onChange={(e) => setArkMode(e.target.value as 'generate' | 'story')}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="ml-2 text-sm text-gray-700">Story 模式</span>
                  </label>
                </div>
              </div>
              
              {/* Generate 模式表单 */}
              {arkMode === 'generate' && (
                <>
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
                </>
              )}
              
              {/* Story 模式表单 */}
              {arkMode === 'story' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      故事主题 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={storyTopic}
                      onChange={(e) => setStoryTopic(e.target.value)}
                      placeholder="请输入故事主题，如：小兔子的冒险、海底世界..."
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        故事风格
                      </label>
                      <select
                        value={storyStyle}
                        onChange={(e) => setStoryStyle(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="童话">童话</option>
                        <option value="科普">科普</option>
                        <option value="睡前">睡前</option>
                        <option value="古诗意">古诗意</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        故事长度
                      </label>
                      <select
                        value={storyLength}
                        onChange={(e) => setStoryLength(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="short">短篇</option>
                        <option value="medium">中篇</option>
                        <option value="long">长篇</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
              
              {/* 服务状态标注 */}
              <div className="mb-3 p-3 rounded-lg border-l-4 ${
                healthStatus?.sandbox 
                  ? 'border-yellow-400 bg-yellow-50' 
                  : 'border-green-400 bg-green-50'
              }">
                <p className="text-sm font-medium ${
                  healthStatus?.sandbox ? 'text-yellow-800' : 'text-green-800'
                }">
                  本次调用：{healthStatus?.sandbox ? 'SANDBOX 模式' : '真实服务'}
                  {healthStatus?.sandbox ? ' 🧪' : ' 🚀'}
                </p>
              </div>
              
              <button
                onClick={handleArkDebug}
                disabled={arkLoading || (arkMode === 'generate' && !arkText.trim()) || (arkMode === 'story' && !storyTopic.trim())}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
              >
                {arkLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                ) : (
                  <Play className="w-5 h-5 mr-2" />
                )}
                {(() => {
                  const status = getButtonStatus('ark');
                  if (status.isQueuing) {
                    return `排队中 (第${status.queuePosition}位)`;
                  }
                  if (arkLoading) {
                    return '生成中...';
                  }
                  return `开始调试 (${arkMode === 'generate' ? 'Generate' : 'Story'})`;
                })()}
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
            
            {/* Ark 请求历史 */}
            <RequestHistorySection
              apiType="ark"
              title="Ark"
              isExpanded={showArkHistory}
              onToggle={() => setShowArkHistory(!showArkHistory)}
            />
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
              
              {/* 参数验证错误提示 */}
              {validationError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-red-600 text-sm flex items-center">
                    <XCircle className="w-4 h-4 mr-2" />
                    {validationError}
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    音色类型
                  </label>
                  <select
                    value={voiceType}
                    onChange={(e) => {
                      setVoiceType(e.target.value);
                      setValidationError(''); // 清除验证错误
                    }}
                    className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      validationError && !VALID_VOICE_TYPES.includes(voiceType) 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-300'
                    }`}
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
                    onChange={(e) => {
                      setEmotion(e.target.value);
                      setValidationError(''); // 清除验证错误
                    }}
                    className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      validationError && !VALID_EMOTIONS.includes(emotion) 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-300'
                    }`}
                  >
                    <option value="neutral">中性</option>
                    <option value="happy">开心</option>
                    <option value="sad">悲伤</option>
                    <option value="angry">愤怒</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    语速 ({speed}) <span className="text-xs text-gray-500">范围: -50 到 100</span>
                  </label>
                  <input
                    type="range"
                    min="-50"
                    max="100"
                    value={Math.max(-50, Math.min(100, speed))}
                    onChange={(e) => {
                      const newSpeed = Number(e.target.value);
                      setSpeed(newSpeed);
                      setValidationError(''); // 清除验证错误
                    }}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>慢</span>
                    <span>正常</span>
                    <span>快</span>
                  </div>
                </div>
              </div>
              
              {/* 服务状态标注 */}
              <div className="mb-3 p-3 rounded-lg border-l-4 ${
                healthStatus?.sandbox 
                  ? 'border-yellow-400 bg-yellow-50' 
                  : 'border-green-400 bg-green-50'
              }">
                <p className="text-sm font-medium ${
                  healthStatus?.sandbox ? 'text-yellow-800' : 'text-green-800'
                }">
                  本次调用：{healthStatus?.sandbox ? 'SANDBOX 模式' : '真实服务'}
                  {healthStatus?.sandbox ? ' 🧪' : ' 🚀'}
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleTtsDebug}
                  disabled={ttsLoading || !ttsText.trim()}
                  className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
                >
                  {ttsLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Play className="w-5 h-5 mr-2" />
                  )}
                  {(() => {
                    const status = getButtonStatus('tts');
                    if (status.isQueuing) {
                      return `排队中 (第${status.queuePosition}位)`;
                    }
                    if (ttsLoading) {
                      return retryCount > 0 ? `合成中... (重试 ${retryCount}/2)` : '合成中...';
                    }
                    return '开始调试';
                  })()}
                </button>
                
                {ttsLoading && (
                  <button
                    onClick={cancelTtsRequest}
                    className="px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors flex items-center"
                  >
                    <XCircle className="w-5 h-5 mr-2" />
                    取消
                  </button>
                )}
              </div>
            </div>

            {ttsResponse && (
              <div className="mt-6">
                <h4 className="text-lg font-semibold mb-3 text-gray-800">合成结果</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  {ttsResponse.success ? (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-green-600 flex items-center">
                          <CheckCircle className="w-5 h-5 mr-2" />
                          合成成功
                        </p>
                        {ttsResponse.duration && (
                          <p className="text-sm text-gray-600">响应时间: {Math.round(ttsResponse.duration)}ms</p>
                        )}
                      </div>
                      
                      {/* 自定义音频播放器 */}
                      {audioUrl && <AudioPlayer audioUrl={audioUrl} />}
                      
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                          查看响应数据
                        </summary>
                        <pre className="mt-2 text-xs text-gray-700 overflow-x-auto bg-white p-3 rounded border">
                          {JSON.stringify(ttsResponse.data, null, 2)}
                        </pre>
                      </details>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <XCircle className="w-5 h-5 mr-2 text-red-500" />
                      <p className="text-red-600">{ttsResponse.error}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {ttsParams && <ParameterTable params={ttsParams} title="TTS API" />}
            
            {/* TTS 请求历史 */}
            <RequestHistorySection
              apiType="tts"
              title="TTS"
              isExpanded={showTtsHistory}
              onToggle={() => setShowTtsHistory(!showTtsHistory)}
            />
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
            
            {/* 声音复刻 请求历史 */}
            <RequestHistorySection
              apiType="voice-clone"
              title="声音复刻"
              isExpanded={showVcHistory}
              onToggle={() => setShowVcHistory(!showVcHistory)}
            />
          </div>
        </div>
        
        {/* 全局请求历史管理 */}
        {requestHistory.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                全局请求历史 ({requestHistory.length}/20)
              </h2>
              <button
                onClick={clearRequestHistory}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                清空所有历史
              </button>
            </div>
            <div className="text-sm text-gray-600">
              记录最近 20 次 API 请求，包含请求方法、URL、状态码、耗时和请求ID等信息。
            </div>
          </div>
        )}
        
        {/* 页脚统计 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              今日调用统计
            </h2>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                当前并发: {activeRequests.size}/{MAX_CONCURRENT_REQUESTS}
              </div>
              {requestQueue.length > 0 && (
                <div className="text-sm text-orange-600">
                  排队中: {requestQueue.length}个请求
                </div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">真实服务调用</p>
                  <p className="text-2xl font-bold text-blue-800">{dailyStats.realCalls}</p>
                </div>
                <div className="text-blue-500">
                  🚀
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">平均响应时长</p>
                  <p className="text-2xl font-bold text-green-800">
                    {dailyStats.realCalls > 0 
                      ? Math.round(dailyStats.totalDuration / dailyStats.realCalls) 
                      : 0}ms
                  </p>
                </div>
                <div className="text-green-500">
                  ⚡
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">统计日期</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {new Date().toLocaleDateString('zh-CN')}
                  </p>
                </div>
                <div className="text-gray-500">
                  📅
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 text-xs text-gray-500 text-center">
            统计数据每日重置，仅统计真实服务调用（不包含SANDBOX模式）
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiDebug;