import { Link } from 'react-router-dom';
import { Settings, Heart, Sparkles, Bug, BarChart3, FileText } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* 页面头部 */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Heart className="w-12 h-12 text-pink-500 mr-3" />
            <h1 className="text-4xl font-bold text-gray-800">AI胎教内容生成平台</h1>
            <Sparkles className="w-12 h-12 text-blue-500 ml-3" />
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            基于火山引擎AI服务的智能胎教解决方案，为准父母提供个性化的胎教内容生成、多音色语音合成和声音复刻服务
          </p>
        </div>

        {/* 核心功能卡片 */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">核心功能</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 内容生成 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-200">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">内容生成</h3>
            <p className="text-gray-600 mb-4">基于AI生成个性化胎教故事和科普内容</p>
            <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
              开始生成
            </button>
          </div>

          {/* 语音合成 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-200">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Heart className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">语音合成</h3>
            <p className="text-gray-600 mb-4">将文本转换为温暖的语音，支持多种音色</p>
            <button className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">
              语音合成
            </button>
          </div>

          {/* 功能开关管理 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-200">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Settings className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">功能开关管理</h3>
            <p className="text-gray-600 mb-4">控制各功能模块的启用状态，支持渐进式开发</p>
            <Link 
              to="/settings/feature-flags"
              className="block w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors text-center"
            >
              管理开关
            </Link>
          </div>
          </div>
        </div>

        {/* 学习友好系统 */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">学习友好系统</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* API 调试面板 */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-200">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <Bug className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">API 调试面板</h3>
              <p className="text-gray-600 mb-4 text-sm">可视化调试 Ark 和 TTS 接口，查看参数对照</p>
              <Link 
                to="/debug/api"
                className="block w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors text-center text-sm"
              >
                开始调试
              </Link>
            </div>

            {/* 日志展示 */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-200">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">调用日志</h3>
              <p className="text-gray-600 mb-4 text-sm">查看 API 调用记录，分析错误和性能</p>
              <Link 
                to="/debug/logs"
                className="block w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors text-center text-sm"
              >
                查看日志
              </Link>
            </div>

            {/* 数据仪表盘 */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-200">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">数据仪表盘</h3>
              <p className="text-gray-600 mb-4 text-sm">统计分析和图表可视化展示</p>
              <Link 
                to="/dashboard"
                className="block w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors text-center text-sm"
              >
                查看统计
              </Link>
            </div>

            {/* 功能开关 */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-200">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Settings className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">功能开关</h3>
              <p className="text-gray-600 mb-4 text-sm">控制功能启用状态，渐进式开发</p>
              <Link 
                to="/settings/feature-flags"
                className="block w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors text-center text-sm"
              >
                管理开关
              </Link>
            </div>
          </div>
        </div>

        {/* 底部说明 */}
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">开发模式说明</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-gray-600">MVP</span>
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">MVP 模式</h3>
              <p className="text-gray-600 text-sm">所有高级功能关闭，只运行核心功能，适合快速验证</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-blue-600">🧪</span>
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">沙箱模式</h3>
              <p className="text-gray-600 text-sm">逐步开启功能，使用Mock数据，适合学习和测试</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-green-600">🚀</span>
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">生产模式</h3>
              <p className="text-gray-600 text-sm">所有功能启用，连接真实服务，适合正式部署</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}