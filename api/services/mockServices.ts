/**
 * Mock 服务实现
 * 用于沙箱模式下的功能测试
 */

import { Request, Response } from 'express';

/**
 * Mock 用户数据
 */
const MOCK_USERS = [
  {
    id: 'user_001',
    email: 'demo@example.com',
    name: '演示用户',
    plan: 'premium',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'user_002',
    email: 'test@example.com',
    name: '测试用户',
    plan: 'free',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=test',
    createdAt: '2024-01-02T00:00:00Z'
  }
];

/**
 * Mock 内容历史数据
 */
const MOCK_CONTENT_HISTORY = [
  {
    id: 'content_001',
    userId: 'user_001',
    type: 'story',
    title: '小兔子的冒险',
    content: '从前有一只可爱的小兔子，它住在森林深处的一个温馨小屋里...',
    audioUrl: 'data:audio/mp3;base64,mock_audio_data_1',
    duration: 120,
    createdAt: '2024-01-15T10:30:00Z'
  },
  {
    id: 'content_002',
    userId: 'user_001',
    type: 'knowledge',
    title: '胎儿听觉发育',
    content: '在怀孕20周左右，胎儿的听觉系统开始发育，可以感受到外界的声音...',
    audioUrl: 'data:audio/mp3;base64,mock_audio_data_2',
    duration: 180,
    createdAt: '2024-01-14T15:20:00Z'
  }
];

/**
 * Mock 声音复刻数据
 */
const MOCK_VOICE_CLONES = [
  {
    id: 'voice_001',
    userId: 'user_001',
    speakerName: '妈妈的声音',
    speakerId: 'speaker_mom_001',
    status: 'completed',
    progress: 100,
    trainingDuration: 300,
    createdAt: '2024-01-10T09:00:00Z',
    completedAt: '2024-01-10T09:05:00Z'
  },
  {
    id: 'voice_002',
    userId: 'user_001',
    speakerName: '爸爸的声音',
    speakerId: 'speaker_dad_001',
    status: 'training',
    progress: 75,
    trainingDuration: 240,
    createdAt: '2024-01-15T14:30:00Z'
  }
];

/**
 * Mock 支付订单数据
 */
const MOCK_PAYMENT_ORDERS = [
  {
    id: 'order_001',
    userId: 'user_001',
    planId: 'premium_monthly',
    planName: '高级版月付',
    amount: 29.99,
    currency: 'CNY',
    status: 'completed',
    paymentMethod: 'alipay',
    createdAt: '2024-01-01T12:00:00Z',
    paidAt: '2024-01-01T12:01:30Z'
  }
];

/**
 * Mock 分析数据
 */
const MOCK_ANALYTICS_DATA = {
  totalUsers: 1250,
  activeUsers: 890,
  totalStories: 3420,
  totalAudios: 2890,
  averageResponseTime: 1250,
  successRate: 98.5,
  errorRate: 1.5,
  dailyStats: [
    { date: '2024-01-15', stories: 45, audios: 38, users: 23 },
    { date: '2024-01-14', stories: 52, audios: 41, users: 28 },
    { date: '2024-01-13', stories: 38, audios: 35, users: 19 },
    { date: '2024-01-12', stories: 41, audios: 39, users: 25 },
    { date: '2024-01-11', stories: 47, audios: 42, users: 31 }
  ]
};

/**
 * 生成随机延迟（模拟网络请求）
 */
const randomDelay = (min: number = 500, max: number = 2000): Promise<void> => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
};

/**
 * 生成随机ID
 */
const generateId = (prefix: string = 'mock'): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Mock Ark服务
 */
export class MockArkService {
  static async generate(params: { messages: any[]; model?: string; temperature?: number; maxTokens?: number }): Promise<any> {
    await randomDelay(1000, 3000);
    
    const responses = [
      '这是一个模拟的AI生成内容。在实际应用中，这里会调用真实的AI服务来生成相应的内容。',
      '模拟AI响应：根据您的输入，我为您生成了这段内容。这只是一个演示，实际使用时会连接到真实的AI服务。',
      '这是Mock服务生成的示例内容。在生产环境中，这里会返回真实AI模型的生成结果。'
    ];
    
    const content = responses[Math.floor(Math.random() * responses.length)];
    
    return {
      content,
      usage: {
        prompt_tokens: 50,
        completion_tokens: content.length,
        total_tokens: 50 + content.length
      }
    };
  }
  
  static async generateStory(params: { theme: string; style?: string; length?: string }): Promise<any> {
    await randomDelay(1000, 3000);
    
    const { theme, style, length } = params;
    const stories = [
      `从前有一只可爱的${theme}，它住在一个神奇的地方。每天，它都会遇到新的朋友和有趣的冒险。`,
      `在一个美丽的森林里，住着一个关于${theme}的温馨故事。这个故事充满了爱、友谊和成长。`,
      `很久很久以前，有一个关于${theme}的传说。这个传说教会我们勇敢、善良和智慧的重要性。`
    ];
    
    const randomStory = stories[Math.floor(Math.random() * stories.length)];
    
    return {
      success: true,
      data: {
        id: generateId('story'),
        content: randomStory + ' 这是一个充满爱与温暖的胎教故事，希望宝宝能够感受到父母的关爱。',
        theme,
        style: style || '温馨治愈',
        length: length || 'medium',
        wordCount: randomStory.length + 50,
        usage: {
          prompt_tokens: 50,
          completion_tokens: 100,
          total_tokens: 150
        }
      }
    };
  }
  
  static async generateKnowledge(params: { topic: string; gestationalWeek?: number }): Promise<any> {
    await randomDelay(800, 2000);
    
    const { topic, gestationalWeek } = params;
    const knowledge = [
      `关于${topic}的科普知识：这是一个重要的胎教概念，有助于胎儿的健康发育。`,
      `${topic}在胎教中扮演着重要角色，科学研究表明它对胎儿的认知发展有积极影响。`,
      `了解${topic}可以帮助准父母更好地进行胎教，为宝宝的未来发展奠定良好基础。`
    ];
    
    const randomKnowledge = knowledge[Math.floor(Math.random() * knowledge.length)];
    const weekInfo = gestationalWeek ? `在怀孕第${gestationalWeek}周，` : '';
    
    return {
      success: true,
      data: {
        id: generateId('knowledge'),
        content: weekInfo + randomKnowledge + ' 建议准父母在日常生活中多加注意和实践。',
        topic,
        week: gestationalWeek || null,
        length: randomKnowledge.length + 30,
        usage: {
          prompt_tokens: 40,
          completion_tokens: 80,
          total_tokens: 120
        }
      }
    };
  }
}

/**
 * Mock TTS 语音合成服务
 */
export class MockTTSService {
  static async synthesize(params: { text: string; voiceType: string; speed?: number; emotion?: string }): Promise<any> {
    await randomDelay(2000, 5000);
    
    // 模拟音频生成
    const audioData = `mock_audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const audioUrl = `data:audio/mp3;base64,${Buffer.from(audioData).toString('base64')}`;
    
    return {
      success: true,
      data: {
        audioUrl,
        duration: Math.floor(params.text.length / 3), // 估算时长
        voiceType: params.voiceType,
        options: { speed: params.speed, emotion: params.emotion },
        cached: false,
        size: params.text.length * 100 // 估算文件大小
      }
    };
  }
  
  static getVoices(): any {
    return {
      success: true,
      data: [
        {
          id: 'mock_voice_female_1',
          name: 'Mock 甜美女声',
          gender: 'female',
          language: 'zh-CN',
          description: 'Mock 模式下的甜美女声'
        },
        {
          id: 'mock_voice_male_1',
          name: 'Mock 温和男声',
          gender: 'male',
          language: 'zh-CN',
          description: 'Mock 模式下的温和男声'
        }
      ]
    };
  }
}

/**
 * Mock 声音复刻服务
 */
export class MockVoiceCloneService {
  static async startTraining(speakerName: string, audioFiles: any[]): Promise<any> {
    await randomDelay(1000, 2000);
    
    const voiceClone = {
      id: generateId('voice'),
      speakerName,
      speakerId: generateId('speaker'),
      status: 'training',
      progress: 0,
      estimatedDuration: 300, // 5分钟
      createdAt: new Date().toISOString()
    };
    
    // 模拟训练进度更新
    setTimeout(() => {
      voiceClone.progress = 25;
    }, 30000); // 30秒后25%
    
    setTimeout(() => {
      voiceClone.progress = 50;
    }, 60000); // 1分钟后50%
    
    setTimeout(() => {
      voiceClone.progress = 75;
    }, 120000); // 2分钟后75%
    
    setTimeout(() => {
      voiceClone.progress = 100;
      voiceClone.status = 'completed';
    }, 180000); // 3分钟后完成
    
    return {
      success: true,
      data: voiceClone
    };
  }
  
  static async getTrainingStatus(voiceId: string): Promise<any> {
    await randomDelay(200, 500);
    
    const mockVoice = MOCK_VOICE_CLONES.find(v => v.id === voiceId);
    
    if (!mockVoice) {
      return {
        success: false,
        error: '声音复刻任务不存在'
      };
    }
    
    return {
      success: true,
      data: mockVoice
    };
  }
  
  static async listVoiceClones(userId: string): Promise<any> {
    await randomDelay(300, 800);
    
    const userVoices = MOCK_VOICE_CLONES.filter(v => v.userId === userId);
    
    return {
      success: true,
      data: userVoices
    };
  }
}

/**
 * Mock 用户认证服务
 */
export class MockAuthService {
  static async login(email: string, password: string): Promise<any> {
    await randomDelay(500, 1500);
    
    const user = MOCK_USERS.find(u => u.email === email);
    
    if (!user) {
      return {
        success: false,
        error: '用户不存在'
      };
    }
    
    // Mock 密码验证（在真实环境中绝不能这样做）
    if (password !== 'demo123') {
      return {
        success: false,
        error: '密码错误'
      };
    }
    
    return {
      success: true,
      data: {
        user,
        token: `mock_token_${Date.now()}`,
        expiresIn: 3600
      }
    };
  }
  
  static async register(userData: any): Promise<any> {
    await randomDelay(800, 2000);
    
    const newUser = {
      id: generateId('user'),
      ...userData,
      plan: 'free',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.name}`,
      createdAt: new Date().toISOString()
    };
    
    MOCK_USERS.push(newUser);
    
    return {
      success: true,
      data: {
        user: newUser,
        token: `mock_token_${Date.now()}`,
        expiresIn: 3600
      }
    };
  }
  
  static async getUserProfile(userId: string): Promise<any> {
    await randomDelay(200, 600);
    
    const user = MOCK_USERS.find(u => u.id === userId);
    
    if (!user) {
      return {
        success: false,
        error: '用户不存在'
      };
    }
    
    return {
      success: true,
      data: user
    };
  }
}

/**
 * Mock 支付服务
 */
export class MockPaymentService {
  static async createOrder(userId: string, planId: string): Promise<any> {
    await randomDelay(1000, 2000);
    
    const plans = {
      'premium_monthly': { name: '高级版月付', amount: 29.99 },
      'premium_yearly': { name: '高级版年付', amount: 299.99 }
    };
    
    const plan = plans[planId];
    if (!plan) {
      return {
        success: false,
        error: '套餐不存在'
      };
    }
    
    const order = {
      id: generateId('order'),
      userId,
      planId,
      planName: plan.name,
      amount: plan.amount,
      currency: 'CNY',
      status: 'pending',
      paymentUrl: `https://mock-payment.example.com/pay/${generateId('pay')}`,
      createdAt: new Date().toISOString()
    };
    
    return {
      success: true,
      data: order
    };
  }
  
  static async getOrderStatus(orderId: string): Promise<any> {
    await randomDelay(300, 800);
    
    // 模拟随机支付结果
    const isSuccess = Math.random() > 0.2; // 80% 成功率
    
    return {
      success: true,
      data: {
        orderId,
        status: isSuccess ? 'completed' : 'failed',
        paidAt: isSuccess ? new Date().toISOString() : null,
        failureReason: isSuccess ? null : '支付超时'
      }
    };
  }
}

/**
 * Mock 分析服务
 */
export class MockAnalyticsService {
  static async trackEvent(event: string, properties: any): Promise<any> {
    await randomDelay(100, 300);
    
    console.log(`📊 Mock Analytics - Event: ${event}`, properties);
    
    return {
      success: true,
      data: {
        eventId: generateId('event'),
        tracked: true
      }
    };
  }
  
  static async getStats(timeRange: string = '7d'): Promise<any> {
    await randomDelay(500, 1200);
    
    return {
      success: true,
      data: MOCK_ANALYTICS_DATA
    };
  }
}

/**
 * Mock 服务工厂
 */
export class MockServiceFactory {
  static getArkService() {
    return MockArkService;
  }
  
  static getTTSService() {
    return MockTTSService;
  }
  
  static getVoiceCloneService() {
    return MockVoiceCloneService;
  }
  
  static getAuthService() {
    return MockAuthService;
  }
  
  static getPaymentService() {
    return MockPaymentService;
  }
  
  static getAnalyticsService() {
    return MockAnalyticsService;
  }
}

/**
 * Mock 中间件
 * 在响应头中添加 Mock 标识
 */
export const mockMiddleware = (req: Request, res: Response, next: any) => {
  res.setHeader('X-Mock-Mode', 'true');
  res.setHeader('X-Mock-Timestamp', new Date().toISOString());
  next();
};

export default MockServiceFactory;