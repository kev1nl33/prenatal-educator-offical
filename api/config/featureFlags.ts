/**
 * 功能开关配置文件
 * 用于控制各个功能模块的启用状态
 */

export interface FeatureFlags {
  ENABLE_AUTH: boolean;        // 是否启用注册/登录
  ENABLE_PAYMENTS: boolean;    // 是否启用支付与会员升级
  ENABLE_VOICE_CLONE: boolean; // 是否启用声音复刻
  ENABLE_ANALYTICS: boolean;   // 是否启用埋点与日志上报
}

/**
 * 运行模式枚举
 */
export enum RunMode {
  MVP = 'mvp',           // MVP模式：所有功能关闭
  SANDBOX = 'sandbox',   // 沙箱模式：功能走Mock实现
  PRODUCTION = 'production' // 生产模式：功能走真实服务
}

/**
 * 运行模式配置
 */
export interface ModeConfig {
  mode: RunMode;
  featureFlags: FeatureFlags;
  useMockServices: boolean;
  description: string;
}

/**
 * 预定义的运行模式配置
 */
export const MODE_CONFIGS: Record<RunMode, ModeConfig> = {
  [RunMode.MVP]: {
    mode: RunMode.MVP,
    featureFlags: {
      ENABLE_AUTH: false,
      ENABLE_PAYMENTS: false,
      ENABLE_VOICE_CLONE: false,
      ENABLE_ANALYTICS: false,
    },
    useMockServices: false,
    description: 'MVP模式：只运行核心功能，所有高级功能关闭'
  },
  [RunMode.SANDBOX]: {
    mode: RunMode.SANDBOX,
    featureFlags: {
      ENABLE_AUTH: true,
      ENABLE_PAYMENTS: true,
      ENABLE_VOICE_CLONE: true,
      ENABLE_ANALYTICS: true,
    },
    useMockServices: true,
    description: '沙箱模式：所有功能启用，使用Mock数据进行测试'
  },
  [RunMode.PRODUCTION]: {
    mode: RunMode.PRODUCTION,
    featureFlags: {
      ENABLE_AUTH: true,
      ENABLE_PAYMENTS: true,
      ENABLE_VOICE_CLONE: true,
      ENABLE_ANALYTICS: true,
    },
    useMockServices: false,
    description: '生产模式：所有功能启用，连接真实服务'
  }
};

/**
 * 默认功能开关配置 - MVP模式：所有开关默认关闭
 */
const DEFAULT_FEATURE_FLAGS: FeatureFlags = MODE_CONFIGS[RunMode.MVP].featureFlags;

/**
 * 获取当前运行模式
 */
export function getCurrentMode(): RunMode {
  const mode = process.env.RUN_MODE as RunMode;
  return Object.values(RunMode).includes(mode) ? mode : RunMode.MVP;
}

/**
 * 获取当前模式配置
 */
export function getCurrentModeConfig(): ModeConfig {
  const currentMode = getCurrentMode();
  return MODE_CONFIGS[currentMode];
}

/**
 * 从环境变量读取功能开关配置
 * 支持通过环境变量覆盖默认值
 */
export function getFeatureFlags(): FeatureFlags {
  const modeConfig = getCurrentModeConfig();
  
  // 如果设置了运行模式，使用模式配置
  if (process.env.RUN_MODE) {
    return modeConfig.featureFlags;
  }
  
  // 否则从环境变量读取单独的开关配置
  return {
    ENABLE_AUTH: process.env.ENABLE_AUTH === 'true' || DEFAULT_FEATURE_FLAGS.ENABLE_AUTH,
    ENABLE_PAYMENTS: process.env.ENABLE_PAYMENTS === 'true' || DEFAULT_FEATURE_FLAGS.ENABLE_PAYMENTS,
    ENABLE_VOICE_CLONE: process.env.ENABLE_VOICE_CLONE === 'true' || DEFAULT_FEATURE_FLAGS.ENABLE_VOICE_CLONE,
    ENABLE_ANALYTICS: process.env.ENABLE_ANALYTICS === 'true' || DEFAULT_FEATURE_FLAGS.ENABLE_ANALYTICS,
  };
}

/**
 * 检查是否使用Mock服务
 */
export function shouldUseMockServices(): boolean {
  const modeConfig = getCurrentModeConfig();
  return modeConfig.useMockServices || process.env.USE_MOCK_SERVICES === 'true';
}

/**
 * 功能开关描述信息
 * 用于前端显示功能说明
 */
export const FEATURE_FLAG_DESCRIPTIONS = {
  ENABLE_AUTH: {
    title: '用户认证',
    description: '启用用户注册、登录功能。关闭时所有用户以游客身份使用。',
    impact: '影响：用户管理、权限控制、个人数据存储'
  },
  ENABLE_PAYMENTS: {
    title: '支付与会员',
    description: '启用付费升级、会员权益功能。关闭时所有功能免费使用。',
    impact: '影响：高级功能限制、使用次数限制、会员专属内容'
  },
  ENABLE_VOICE_CLONE: {
    title: '声音复刻',
    description: '启用个性化声音训练功能。关闭时只能使用预设音色。',
    impact: '影响：音频上传、声音训练、个性化音色库'
  },
  ENABLE_ANALYTICS: {
    title: '数据分析',
    description: '启用用户行为埋点、错误日志上报。关闭时不收集任何数据。',
    impact: '影响：使用统计、性能监控、错误追踪'
  }
};

/**
 * 检查特定功能是否启用
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  const flags = getFeatureFlags();
  return flags[feature];
}

/**
 * 设置运行模式
 */
export function setRunMode(mode: RunMode): void {
  process.env.RUN_MODE = mode;
  console.log(`🔄 运行模式已切换为: ${mode} - ${MODE_CONFIGS[mode].description}`);
}

/**
 * 获取所有可用的运行模式
 */
export function getAvailableModes(): Array<{ mode: RunMode; config: ModeConfig }> {
  return Object.entries(MODE_CONFIGS).map(([mode, config]) => ({
    mode: mode as RunMode,
    config
  }));
}

/**
 * 环境变量配置状态
 */
export interface EnvStatus {
  arkKey: boolean;
  ttsToken: boolean;
  sandbox: boolean;
}

/**
 * 检查环境变量配置状态
 */
export function checkEnvStatus(): EnvStatus {
  return {
    arkKey: !!process.env.VOLCENGINE_ARK_API_KEY && process.env.VOLCENGINE_ARK_API_KEY.trim() !== '',
    ttsToken: !!process.env.VOLCENGINE_TTS_ACCESS_TOKEN && process.env.VOLCENGINE_TTS_ACCESS_TOKEN.trim() !== '',
    sandbox: shouldUseMockServices()
  };
}

/**
 * 验证生产环境必需的环境变量
 */
export function validateRequiredEnvVars(): { valid: boolean; missing: string[] } {
  const envStatus = checkEnvStatus();
  const missing: string[] = [];
  
  // 如果不是沙箱模式，检查必需的环境变量
  if (!envStatus.sandbox) {
    if (!envStatus.arkKey) {
      missing.push('VOLCENGINE_ARK_API_KEY');
    }
    if (!envStatus.ttsToken) {
      missing.push('VOLCENGINE_TTS_ACCESS_TOKEN');
    }
  }
  
  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * 输出环境变量配置状态日志
 */
export function logEnvStatus(): void {
  const envStatus = checkEnvStatus();
  
  console.log('🔧 环境变量配置状态:');
  console.log(`   [ENV] VOLCENGINE_ARK_API_KEY: ${envStatus.arkKey ? 'set' : 'not set'}`);
  console.log(`   [ENV] VOLCENGINE_TTS_ACCESS_TOKEN: ${envStatus.ttsToken ? 'set' : 'not set'}`);
  console.log(`   [ENV] SANDBOX: ${envStatus.sandbox}`);
}

/**
 * 运行模式切换日志
 */
export function logCurrentMode(): void {
  const currentMode = getCurrentMode();
  const config = getCurrentModeConfig();
  const flags = getFeatureFlags();
  
  console.log('🚀 当前运行模式信息:');
  console.log(`   模式: ${currentMode}`);
  console.log(`   描述: ${config.description}`);
  console.log(`   Mock服务: ${config.useMockServices ? '启用' : '禁用'}`);
  console.log('   功能开关状态:');
  Object.entries(flags).forEach(([key, value]) => {
    console.log(`     ${key}: ${value ? '✅ 启用' : '❌ 禁用'}`);
  });
}

/**
 * 启动时的完整检查和日志输出
 */
export function performStartupChecks(): void {
  // 输出环境变量状态
  logEnvStatus();
  
  // 输出运行模式信息
  logCurrentMode();
  
  // 验证必需的环境变量
  const validation = validateRequiredEnvVars();
  if (!validation.valid) {
    console.error('❌ 启动失败：缺少必需的环境变量');
    console.error('   缺少的变量:', validation.missing.join(', '));
    console.error('   请在 api/.env 文件中配置这些变量，或启用 SANDBOX 模式');
    console.error('   错误码: MISSING_ENV (500)');
    process.exit(1);
  }
  
  console.log('✅ 环境变量验证通过');
}

export default DEFAULT_FEATURE_FLAGS;