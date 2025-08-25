import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, FileText, Volume2, Clock, Users, Activity, Calendar, Target } from 'lucide-react';

interface DashboardStats {
  totalStories: number;
  totalAudios: number;
  avgResponseTime: number;
  totalUsers: number;
  todayUsage: number;
  successRate: number;
}

interface ChartData {
  name: string;
  stories: number;
  audios: number;
  responseTime: number;
}

interface ApiUsageData {
  name: string;
  value: number;
  color: string;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalStories: 0,
    totalAudios: 0,
    avgResponseTime: 0,
    totalUsers: 0,
    todayUsage: 0,
    successRate: 0
  });

  const [weeklyData, setWeeklyData] = useState<ChartData[]>([]);
  const [apiUsageData, setApiUsageData] = useState<ApiUsageData[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');

  // 模拟数据加载
  useEffect(() => {
    // 模拟统计数据
    const mockStats: DashboardStats = {
      totalStories: 1247,
      totalAudios: 892,
      avgResponseTime: 1350,
      totalUsers: 156,
      todayUsage: 23,
      successRate: 94.2
    };
    setStats(mockStats);

    // 模拟周数据
    const mockWeeklyData: ChartData[] = [
      { name: '周一', stories: 45, audios: 32, responseTime: 1200 },
      { name: '周二', stories: 52, audios: 38, responseTime: 1150 },
      { name: '周三', stories: 48, audios: 35, responseTime: 1300 },
      { name: '周四', stories: 61, audios: 42, responseTime: 1250 },
      { name: '周五', stories: 55, audios: 39, responseTime: 1180 },
      { name: '周六', stories: 38, audios: 28, responseTime: 1400 },
      { name: '周日', stories: 42, audios: 31, responseTime: 1320 }
    ];
    setWeeklyData(mockWeeklyData);

    // 模拟 API 使用分布
    const mockApiUsage: ApiUsageData[] = [
      { name: 'Ark 文本生成', value: 58, color: '#3B82F6' },
      { name: 'TTS 语音合成', value: 35, color: '#10B981' },
      { name: '声音复刻', value: 7, color: '#F59E0B' }
    ];
    setApiUsageData(mockApiUsage);
  }, [timeRange]);

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: string;
    color: string;
  }> = ({ title, value, icon, trend, color }) => (
    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4" style={{ borderLeftColor: color }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {trend && (
            <p className="text-sm text-green-600 mt-1 flex items-center">
              <TrendingUp className="w-4 h-4 mr-1" />
              {trend}
            </p>
          )}
        </div>
        <div className="p-3 rounded-full" style={{ backgroundColor: color + '20' }}>
          {React.cloneElement(icon as React.ReactElement, { 
            className: 'w-6 h-6',
            style: { color }
          })}
        </div>
      </div>
    </div>
  );

  const formatResponseTime = (time: number) => {
    if (time < 1000) {
      return `${time}ms`;
    } else {
      return `${(time / 1000).toFixed(1)}s`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">数据总览仪表盘</h1>
          <p className="text-gray-600">实时监控平台使用情况和性能指标</p>
        </div>

        {/* 时间范围选择器 */}
        <div className="flex justify-end mb-6">
          <div className="bg-white rounded-lg p-1 shadow-md">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {range === '7d' ? '最近7天' : range === '30d' ? '最近30天' : '最近90天'}
              </button>
            ))}
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="已生成故事"
            value={stats.totalStories.toLocaleString()}
            icon={<FileText />}
            trend="+12% 本周"
            color="#3B82F6"
          />
          <StatCard
            title="已合成音频"
            value={stats.totalAudios.toLocaleString()}
            icon={<Volume2 />}
            trend="+8% 本周"
            color="#10B981"
          />
          <StatCard
            title="平均响应时长"
            value={formatResponseTime(stats.avgResponseTime)}
            icon={<Clock />}
            trend="-5% 本周"
            color="#F59E0B"
          />
          <StatCard
            title="活跃用户"
            value={stats.totalUsers}
            icon={<Users />}
            trend="+15% 本周"
            color="#8B5CF6"
          />
        </div>

        {/* 图表区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* 使用趋势图 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-blue-500" />
              使用趋势
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  stroke="#6b7280"
                  fontSize={12}
                />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="stories" 
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                  name="故事生成"
                />
                <Line 
                  type="monotone" 
                  dataKey="audios" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                  name="音频合成"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* API 使用分布 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Target className="w-5 h-5 mr-2 text-green-500" />
              API 使用分布
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={apiUsageData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {apiUsageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [`${value}%`, '使用占比']}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {apiUsageData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-sm text-gray-600">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-800">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 响应时间图表 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-purple-500" />
            响应时间分析
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="name" 
                stroke="#6b7280"
                fontSize={12}
              />
              <YAxis 
                stroke="#6b7280" 
                fontSize={12}
                tickFormatter={(value) => `${value}ms`}
              />
              <Tooltip 
                formatter={(value) => [`${value}ms`, '响应时间']}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Bar 
                dataKey="responseTime" 
                fill="#8B5CF6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 实时状态 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-blue-500" />
              今日使用情况
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">API 调用次数</span>
                <span className="font-semibold text-gray-800">{stats.todayUsage}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">成功率</span>
                <span className="font-semibold text-green-600">{stats.successRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${stats.successRate}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">系统状态</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Ark API</span>
                <span className="flex items-center text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  正常
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">TTS API</span>
                <span className="flex items-center text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  正常
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">声音复刻</span>
                <span className="flex items-center text-yellow-600">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                  维护中
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">快速操作</h4>
            <div className="space-y-3">
              <button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors">
                查看详细日志
              </button>
              <button className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors">
                API 调试面板
              </button>
              <button className="w-full bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded-lg transition-colors">
                功能开关管理
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;