import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

// 日志文件路径
const LOGS_DIR = path.join(process.cwd(), 'logs');
const API_LOGS_FILE = path.join(LOGS_DIR, 'api-logs.json');
const STATS_FILE = path.join(LOGS_DIR, 'stats.json');

// 确保日志目录存在
async function ensureLogsDir() {
  try {
    await fs.access(LOGS_DIR);
  } catch {
    await fs.mkdir(LOGS_DIR, { recursive: true });
  }
}

// API 日志接口
interface ApiLog {
  id: string;
  timestamp: string;
  apiName: string;
  method: string;
  url: string;
  statusCode: number;
  duration: number;
  requestSummary: string;
  responseSummary: string;
  errorMessage?: string;
  success: boolean;
  userId?: string;
  requestParams?: unknown;
  responseData?: unknown;
}

// 统计数据接口
interface Stats {
  totalStories: number;
  totalAudios: number;
  totalVoiceClones: number;
  avgResponseTime: number;
  totalUsers: number;
  todayUsage: number;
  successRate: number;
  lastUpdated: string;
}

// 读取日志文件
async function readLogs(): Promise<ApiLog[]> {
  try {
    await ensureLogsDir();
    const data = await fs.readFile(API_LOGS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// 写入日志文件
async function writeLogs(logs: ApiLog[]): Promise<void> {
  await ensureLogsDir();
  await fs.writeFile(API_LOGS_FILE, JSON.stringify(logs, null, 2));
}

// 读取统计数据
async function readStats(): Promise<Stats> {
  try {
    await ensureLogsDir();
    const data = await fs.readFile(STATS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {
      totalStories: 0,
      totalAudios: 0,
      totalVoiceClones: 0,
      avgResponseTime: 0,
      totalUsers: 0,
      todayUsage: 0,
      successRate: 0,
      lastUpdated: new Date().toISOString()
    };
  }
}

// 写入统计数据
async function writeStats(stats: Stats): Promise<void> {
  await ensureLogsDir();
  await fs.writeFile(STATS_FILE, JSON.stringify(stats, null, 2));
}

// 更新统计数据
async function updateStats(apiName: string, success: boolean, duration: number): Promise<void> {
  const stats = await readStats();
  
  // 更新计数
  if (apiName.includes('story') || apiName.includes('generate')) {
    stats.totalStories++;
  } else if (apiName.includes('tts') || apiName.includes('synthesize')) {
    stats.totalAudios++;
  } else if (apiName.includes('voice-clone') || apiName.includes('clone')) {
    stats.totalVoiceClones++;
  }
  
  // 更新今日使用量
  const today = new Date().toDateString();
  const lastUpdated = new Date(stats.lastUpdated).toDateString();
  if (today !== lastUpdated) {
    stats.todayUsage = 1;
  } else {
    stats.todayUsage++;
  }
  
  // 更新平均响应时间
  const totalCalls = stats.totalStories + stats.totalAudios + stats.totalVoiceClones;
  if (totalCalls > 0) {
    stats.avgResponseTime = Math.round(
      (stats.avgResponseTime * (totalCalls - 1) + duration) / totalCalls
    );
  } else {
    stats.avgResponseTime = duration;
  }
  
  // 计算成功率
  const logs = await readLogs();
  const successCount = logs.filter(log => log.success).length;
  stats.successRate = logs.length > 0 ? Math.round((successCount / logs.length) * 100 * 10) / 10 : 0;
  
  stats.lastUpdated = new Date().toISOString();
  
  await writeStats(stats);
}

// GET /api/logs - 获取API调用日志
router.get('/', async (req, res) => {
  try {
    const logs = await readLogs();
    const { limit = 100, offset = 0, status, api } = req.query;
    
    let filteredLogs = logs;
    
    // 状态过滤
    if (status === 'success') {
      filteredLogs = filteredLogs.filter(log => log.success);
    } else if (status === 'error') {
      filteredLogs = filteredLogs.filter(log => !log.success);
    }
    
    // API 类型过滤
    if (api) {
      filteredLogs = filteredLogs.filter(log => 
        log.apiName.toLowerCase().includes(api.toString().toLowerCase())
      );
    }
    
    // 分页
    const startIndex = parseInt(offset.toString());
    const endIndex = startIndex + parseInt(limit.toString());
    const paginatedLogs = filteredLogs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: paginatedLogs,
      total: filteredLogs.length,
      limit: parseInt(limit.toString()),
      offset: parseInt(offset.toString())
    });
  } catch (error) {
    console.error('获取日志失败:', error);
    res.status(500).json({
      success: false,
      error: '获取日志失败'
    });
  }
});

// POST /api/logs - 记录API调用日志
router.post('/', async (req, res) => {
  try {
    const {
      apiName,
      method,
      url,
      statusCode,
      duration,
      requestSummary,
      responseSummary,
      errorMessage,
      userId,
      requestParams,
      responseData
    } = req.body;
    
    const log: ApiLog = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      apiName,
      method,
      url,
      statusCode,
      duration,
      requestSummary,
      responseSummary,
      errorMessage,
      success: statusCode >= 200 && statusCode < 300,
      userId,
      requestParams,
      responseData
    };
    
    const logs = await readLogs();
    logs.push(log);
    
    // 保留最近1000条日志
    if (logs.length > 1000) {
      logs.splice(0, logs.length - 1000);
    }
    
    await writeLogs(logs);
    
    // 更新统计数据
    await updateStats(apiName, log.success, duration);
    
    res.json({
      success: true,
      data: log
    });
  } catch (error) {
    console.error('记录日志失败:', error);
    res.status(500).json({
      success: false,
      error: '记录日志失败'
    });
  }
});

// DELETE /api/logs - 清空日志
router.delete('/', async (req, res) => {
  try {
    await writeLogs([]);
    res.json({
      success: true,
      message: '日志已清空'
    });
  } catch (error) {
    console.error('清空日志失败:', error);
    res.status(500).json({
      success: false,
      error: '清空日志失败'
    });
  }
});

// GET /api/logs/stats - 获取统计数据
router.get('/stats', async (req, res) => {
  try {
    const stats = await readStats();
    const logs = await readLogs();
    
    // 计算今日数据
    const today = new Date().toDateString();
    const todayLogs = logs.filter(log => 
      new Date(log.timestamp).toDateString() === today
    );
    
    // 计算本周数据
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const weekLogs = logs.filter(log => 
      new Date(log.timestamp) >= weekAgo
    );
    
    // 按天分组的数据
    const dailyData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toDateString();
      
      const dayLogs = logs.filter(log => 
        new Date(log.timestamp).toDateString() === dateStr
      );
      
      dailyData.push({
        date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
        stories: dayLogs.filter(log => log.apiName.includes('story') || log.apiName.includes('generate')).length,
        audios: dayLogs.filter(log => log.apiName.includes('tts') || log.apiName.includes('synthesize')).length,
        responseTime: dayLogs.length > 0 ? Math.round(dayLogs.reduce((sum, log) => sum + log.duration, 0) / dayLogs.length) : 0
      });
    }
    
    // API 使用分布
    const apiUsage = {
      stories: logs.filter(log => log.apiName.includes('story') || log.apiName.includes('generate')).length,
      audios: logs.filter(log => log.apiName.includes('tts') || log.apiName.includes('synthesize')).length,
      voiceClones: logs.filter(log => log.apiName.includes('voice-clone') || log.apiName.includes('clone')).length
    };
    
    const total = apiUsage.stories + apiUsage.audios + apiUsage.voiceClones;
    const apiDistribution = total > 0 ? [
      { name: 'Ark 文本生成', value: Math.round((apiUsage.stories / total) * 100), color: '#3B82F6' },
      { name: 'TTS 语音合成', value: Math.round((apiUsage.audios / total) * 100), color: '#10B981' },
      { name: '声音复刻', value: Math.round((apiUsage.voiceClones / total) * 100), color: '#F59E0B' }
    ] : [];
    
    res.json({
      success: true,
      data: {
        ...stats,
        todayUsage: todayLogs.length,
        weeklyData: dailyData,
        apiDistribution,
        recentLogs: logs.slice(-10).reverse()
      }
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取统计数据失败'
    });
  }
});

// GET /api/logs/export - 导出日志
router.get('/export', async (req, res) => {
  try {
    const logs = await readLogs();
    const { format = 'json' } = req.query;
    
    if (format === 'csv') {
      // CSV 格式导出
      const csvHeader = 'ID,时间戳,API名称,方法,URL,状态码,耗时(ms),请求摘要,响应摘要,是否成功,错误信息\n';
      const csvData = logs.map(log => 
        `"${log.id}","${log.timestamp}","${log.apiName}","${log.method}","${log.url}",${log.statusCode},${log.duration},"${log.requestSummary}","${log.responseSummary}",${log.success},"${log.errorMessage || ''}"`
      ).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="api-logs-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvHeader + csvData);
    } else {
      // JSON 格式导出
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="api-logs-${new Date().toISOString().split('T')[0]}.json"`);
      res.json(logs);
    }
  } catch (error) {
    console.error('导出日志失败:', error);
    res.status(500).json({
      success: false,
      error: '导出日志失败'
    });
  }
});

export default router;