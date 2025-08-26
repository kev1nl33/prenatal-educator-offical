import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle, CheckCircle, XCircle, Search, Trash2, Download } from 'lucide-react';
import { getFriendlyErrorMessage } from '../utils/parameterMapping';

interface ApiLog {
  id: string;
  timestamp: Date;
  apiName: string;
  method: string;
  url: string;
  statusCode: number;
  duration: number;
  requestSummary: string;
  responseSummary: string;
  errorMessage?: string;
  success: boolean;
}

const DebugLogs: React.FC = () => {
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ApiLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'error'>('all');
  const [apiFilter, setApiFilter] = useState<'all' | 'ark' | 'tts' | 'voice-clone'>('all');

  // 模拟日志数据
  useEffect(() => {
    const mockLogs: ApiLog[] = [
      {
        id: '1',
        timestamp: new Date(Date.now() - 1000 * 60 * 5),
        apiName: 'Ark 文本生成',
        method: 'POST',
        url: '/api/generate/story',
        statusCode: 200,
        duration: 1250,
        requestSummary: '生成胎教故事: "小兔子的冒险"',
        responseSummary: '成功生成 456 字故事',
        success: true
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 1000 * 60 * 10),
        apiName: 'TTS 语音合成',
        method: 'POST',
        url: '/api/tts/synthesize',
        statusCode: 401,
        duration: 320,
        requestSummary: '合成语音: "亲爱的宝贝，晚安"',
        responseSummary: '认证失败',
        errorMessage: '未授权，请检查 API Key',
        success: false
      },
      {
        id: '3',
        timestamp: new Date(Date.now() - 1000 * 60 * 15),
        apiName: 'TTS 语音合成',
        method: 'POST',
        url: '/api/tts/synthesize',
        statusCode: 200,
        duration: 2100,
        requestSummary: '合成语音: "今天我们来讲一个故事"',
        responseSummary: '成功生成 3.2s 音频',
        success: true
      },
      {
        id: '4',
        timestamp: new Date(Date.now() - 1000 * 60 * 20),
        apiName: '声音复刻',
        method: 'POST',
        url: '/api/voice-clone/train',
        statusCode: 429,
        duration: 150,
        requestSummary: '训练音色: "妈妈的声音"',
        responseSummary: '请求频率过高',
        errorMessage: '请求过多，请稍后再试',
        success: false
      },
      {
        id: '5',
        timestamp: new Date(Date.now() - 1000 * 60 * 25),
        apiName: 'Ark 文本生成',
        method: 'POST',
        url: '/api/generate/story',
        statusCode: 500,
        duration: 5000,
        requestSummary: '生成科普内容: "胎儿发育"',
        responseSummary: '服务器内部错误',
        errorMessage: '服务异常，请稍后重试',
        success: false
      }
    ];
    setLogs(mockLogs);
    setFilteredLogs(mockLogs);
  }, []);

  // 过滤日志
  useEffect(() => {
    let filtered = logs;

    // 搜索过滤
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.apiName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.requestSummary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.responseSummary.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 状态过滤
    if (statusFilter !== 'all') {
      filtered = filtered.filter(log => 
        statusFilter === 'success' ? log.success : !log.success
      );
    }

    // API 类型过滤
    if (apiFilter !== 'all') {
      const apiMap = {
        'ark': 'Ark 文本生成',
        'tts': 'TTS 语音合成',
        'voice-clone': '声音复刻'
      };
      filtered = filtered.filter(log => log.apiName === apiMap[apiFilter]);
    }

    setFilteredLogs(filtered);
  }, [logs, searchTerm, statusFilter, apiFilter]);

  const getStatusIcon = (success: boolean, statusCode: number) => {
    if (success) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else if (statusCode >= 400 && statusCode < 500) {
      return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    } else {
      return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusColor = (success: boolean, statusCode: number) => {
    if (success) {
      return 'bg-green-50 border-green-200';
    } else if (statusCode >= 400 && statusCode < 500) {
      return 'bg-yellow-50 border-yellow-200';
    } else {
      return 'bg-red-50 border-red-200';
    }
  };

  const formatDuration = (duration: number) => {
    if (duration < 1000) {
      return `${duration}ms`;
    } else {
      return `${(duration / 1000).toFixed(1)}s`;
    }
  };

  const clearLogs = () => {
    setLogs([]);
    setFilteredLogs([]);
  };

  const exportLogs = () => {
    const dataStr = JSON.stringify(filteredLogs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `api-logs-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">API 调用日志</h1>
          <p className="text-gray-600">实时监控和分析 API 调用情况</p>
        </div>

        {/* 过滤器和搜索 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="搜索日志..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'success' | 'error')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">所有状态</option>
              <option value="success">成功</option>
              <option value="error">错误</option>
            </select>
            
            <select
              value={apiFilter}
              onChange={(e) => setApiFilter(e.target.value as 'all' | 'ark' | 'tts' | 'voice-clone')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">所有 API</option>
              <option value="ark">Ark 文本生成</option>
              <option value="tts">TTS 语音合成</option>
              <option value="voice-clone">声音复刻</option>
            </select>
            
            <div className="flex gap-2">
              <button
                onClick={exportLogs}
                className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                导出
              </button>
              <button
                onClick={clearLogs}
                className="flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                清空
              </button>
            </div>
          </div>
          
          <div className="text-sm text-gray-600">
            显示 {filteredLogs.length} / {logs.length} 条日志
          </div>
        </div>

        {/* 日志列表 */}
        <div className="space-y-4">
          {filteredLogs.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <div className="text-gray-400 mb-4">
                <Clock className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">暂无日志记录</h3>
              <p className="text-gray-500">开始使用 API 调试功能后，日志将在这里显示</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className={`bg-white rounded-xl shadow-lg border-l-4 p-6 transition-all hover:shadow-xl ${
                  getStatusColor(log.success, log.statusCode)
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(log.success, log.statusCode)}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">{log.apiName}</h3>
                      <p className="text-sm text-gray-500">
                        {log.method} {log.url}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-2 mb-1">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDuration(log.duration)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">请求摘要</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                      {log.requestSummary}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">响应摘要</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                      {log.responseSummary}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      log.success 
                        ? 'bg-green-100 text-green-800' 
                        : log.statusCode >= 400 && log.statusCode < 500
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {log.statusCode}
                    </span>
                    {log.errorMessage && (
                      <span className="text-sm text-red-600 font-medium">
                        {log.errorMessage}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    {log.timestamp.toLocaleDateString()} {log.timestamp.toLocaleTimeString()}
                  </div>
                </div>

                {!log.success && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h5 className="text-sm font-medium text-red-800 mb-2">错误详情</h5>
                    <p className="text-sm text-red-700">
                      {getFriendlyErrorMessage(log.statusCode, log.errorMessage)}
                    </p>
                    {log.statusCode === 401 && (
                      <div className="mt-2 text-xs text-red-600">
                        💡 建议：前往设置页面检查 API Key 配置
                      </div>
                    )}
                    {log.statusCode === 429 && (
                      <div className="mt-2 text-xs text-red-600">
                        💡 建议：等待 1-2 分钟后重试，或升级 API 套餐
                      </div>
                    )}
                    {log.statusCode >= 500 && (
                      <div className="mt-2 text-xs text-red-600">
                        💡 建议：稍后重试，如问题持续请联系技术支持
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* 统计信息 */}
        {logs.length > 0 && (
          <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">统计概览</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{logs.length}</div>
                <div className="text-sm text-gray-600">总调用次数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {logs.filter(log => log.success).length}
                </div>
                <div className="text-sm text-gray-600">成功次数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {logs.filter(log => !log.success).length}
                </div>
                <div className="text-sm text-gray-600">失败次数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(logs.reduce((sum, log) => sum + log.duration, 0) / logs.length)}ms
                </div>
                <div className="text-sm text-gray-600">平均响应时间</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DebugLogs;