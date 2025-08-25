/**
 * 功能开关管理页面
 * 提供可视化的功能开关控制界面
 */

import React, { useState, useEffect } from 'react';
import Toggle from '../components/Toggle';
import { Settings, Shield, CreditCard, Mic, BarChart3 } from 'lucide-react';

interface FeatureFlags {
  ENABLE_AUTH: boolean;
  ENABLE_PAYMENTS: boolean;
  ENABLE_VOICE_CLONE: boolean;
  ENABLE_ANALYTICS: boolean;
}

interface FeatureFlagDescription {
  title: string;
  description: string;
  impact: string;
}

interface FeatureFlagsResponse {
  success: boolean;
  data: {
    flags: FeatureFlags;
    descriptions: Record<keyof FeatureFlags, FeatureFlagDescription>;
  };
}

const FeatureFlagsPage: React.FC = () => {
  const [flags, setFlags] = useState<FeatureFlags>({
    ENABLE_AUTH: false,
    ENABLE_PAYMENTS: false,
    ENABLE_VOICE_CLONE: false,
    ENABLE_ANALYTICS: false,
  });
  
  const [descriptions, setDescriptions] = useState<Record<keyof FeatureFlags, FeatureFlagDescription>>({} as any);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // 功能开关图标映射
  const flagIcons = {
    ENABLE_AUTH: Shield,
    ENABLE_PAYMENTS: CreditCard,
    ENABLE_VOICE_CLONE: Mic,
    ENABLE_ANALYTICS: BarChart3,
  };

  // 加载功能开关配置
  const loadFeatureFlags = async () => {
    try {
      const response = await fetch('/api/settings/feature-flags');
      const data: FeatureFlagsResponse = await response.json();
      
      if (data.success) {
        setFlags(data.data.flags);
        setDescriptions(data.data.descriptions);
      } else {
        setMessage('加载功能开关配置失败');
      }
    } catch (error) {
      console.error('加载功能开关配置失败:', error);
      setMessage('加载功能开关配置失败');
    } finally {
      setLoading(false);
    }
  };

  // 保存功能开关配置
  const saveFeatureFlags = async (newFlags: FeatureFlags) => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings/feature-flags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ flags: newFlags }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage('功能开关配置已保存');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(data.error || '保存失败');
      }
    } catch (error) {
      console.error('保存功能开关配置失败:', error);
      setMessage('保存功能开关配置失败');
    } finally {
      setSaving(false);
    }
  };

  // 处理开关变化
  const handleToggleChange = (flagKey: keyof FeatureFlags, value: boolean) => {
    const newFlags = { ...flags, [flagKey]: value };
    setFlags(newFlags);
    saveFeatureFlags(newFlags);
  };

  useEffect(() => {
    loadFeatureFlags();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* 页面头部 */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Settings className="w-8 h-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-800">功能开关管理</h1>
          </div>
          <p className="text-gray-600 text-lg">
            控制各个功能模块的启用状态，支持渐进式功能开发和测试
          </p>
        </div>

        {/* 消息提示 */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes('失败') || message.includes('错误') 
              ? 'bg-red-100 text-red-700 border border-red-200' 
              : 'bg-green-100 text-green-700 border border-green-200'
          }`}>
            {message}
          </div>
        )}

        {/* 功能开关列表 */}
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          {Object.entries(flags).map(([flagKey, flagValue]) => {
            const key = flagKey as keyof FeatureFlags;
            const description = descriptions[key];
            const IconComponent = flagIcons[key];
            
            if (!description) return null;

            return (
              <div
                key={flagKey}
                className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className={`p-3 rounded-lg mr-4 ${
                      flagValue ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-1">
                        {description.title}
                      </h3>
                      <div className="flex items-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          flagValue 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {flagValue ? '已启用' : '已禁用'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Toggle
                    id={flagKey}
                    checked={flagValue}
                    onChange={(value) => handleToggleChange(key, value)}
                    disabled={saving}
                    size="lg"
                  />
                </div>
                
                <div className="space-y-3">
                  <p className="text-gray-600 leading-relaxed">
                    {description.description}
                  </p>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">影响范围：</span>
                      {description.impact.replace('影响：', '')}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 底部说明 */}
        <div className="mt-8 bg-blue-50 rounded-xl p-6 border border-blue-100">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">使用说明</h3>
          <div className="space-y-2 text-blue-700">
            <p>• <strong>MVP 模式：</strong>所有开关默认关闭，提供最小可用功能</p>
            <p>• <strong>沙箱模式：</strong>可逐个开启功能，使用 Mock 数据进行测试</p>
            <p>• <strong>生产模式：</strong>开关开启时连接真实服务</p>
            <p>• 配置会实时保存，刷新页面后保持当前状态</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeatureFlagsPage;