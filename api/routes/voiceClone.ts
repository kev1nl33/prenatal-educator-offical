import express from 'express';
import { shouldUseMockServices, isFeatureEnabled } from '../config/featureFlags.js';
import { MockServiceFactory } from '../services/mockServices.js';
import { updateServiceStats } from './dashboard.js';

const router = express.Router();

// 定义音频数据类型
interface AudioData {
  audioBytes?: string;
  audio_bytes?: string;
  audioFormat?: string;
  audio_format?: string;
  text: string;
}

// 定义训练参数类型
interface TrainParams {
  speakerName?: string;
  speaker_name?: string;
  speakerId?: string;
  speaker_id?: string;
  language?: string;
  modelType?: string;
  model_type?: string;
  source?: string;
  extraParams?: unknown;
  extra_params?: unknown;
  audios: AudioData[];
}

// 定义规范化后的参数类型
interface NormalizedTrainParams {
  speakerName: string;
  speakerId?: string;
  language: string;
  modelType: string;
  source: string;
  extraParams: unknown;
  audios: Array<{
    audioBytes: string;
    audioFormat: string;
    text: string;
  }>;
}

// 校验与规范化训练参数
function validateAndNormalizeTrainParams(body: TrainParams): { valid: boolean; errors: string[]; normalized?: NormalizedTrainParams } {
  const errors: string[] = [];

  const speakerName = body.speakerName || body.speaker_name;
  const audios = body.audios;

  if (!speakerName || typeof speakerName !== 'string') {
    errors.push('speakerName 是必填项，且必须为字符串');
  }

  if (!Array.isArray(audios) || audios.length === 0) {
    errors.push('audios 必须为非空数组');
  } else {
    for (let i = 0; i < audios.length; i++) {
      const a = audios[i];
      const audioBytes = a.audioBytes || a.audio_bytes;
      const audioFormat = a.audioFormat || a.audio_format;
      const text = a.text;
      if (!audioBytes || typeof audioBytes !== 'string') {
        errors.push(`audios[${i}].audioBytes 必须提供 Base64 字符串`);
      }
      const allowedFormats = ['wav', 'mp3', 'ogg', 'm4a', 'aac', 'pcm'];
      if (!audioFormat || typeof audioFormat !== 'string' || !allowedFormats.includes(String(audioFormat).toLowerCase())) {
        errors.push(`audios[${i}].audioFormat 必须是 ${allowedFormats.join(', ')} 之一`);
      }
      if (!text || typeof text !== 'string') {
        errors.push(`audios[${i}].text 必须为与音频对应的文本`);
      }
    }
  }

  if (errors.length > 0) return { valid: false, errors };

  const normalized = {
    speakerName,
    speakerId: body.speakerId || body.speaker_id, // 可选
    language: body.language || 'zh-CN',
    modelType: body.modelType || body.model_type || 'standard',
    source: body.source || 'app',
    extraParams: body.extraParams || body.extra_params || {},
    audios: audios.map((a: AudioData) => ({
      audioBytes: a.audioBytes || a.audio_bytes,
      audioFormat: (a.audioFormat || a.audio_format).toLowerCase(),
      text: a.text
    }))
  };

  return { valid: true, errors: [], normalized };
}

// POST /api/voice-clone/train - 启动训练
router.post('/train', async (req, res) => {
  const start = Date.now();
  let success = false;

  try {
    // 功能开关校验
    if (!isFeatureEnabled('ENABLE_VOICE_CLONE')) {
      const duration = Date.now() - start;
      updateServiceStats('voiceClone', duration, false);
      return res.status(403).json({
        success: false,
        error: '声音复刻功能未启用，请在设置中开启后再试',
        timestamp: new Date().toISOString()
      });
    }

    // 参数校验
    const { valid, errors, normalized } = validateAndNormalizeTrainParams(req.body);
    if (!valid) {
      const duration = Date.now() - start;
      updateServiceStats('voiceClone', duration, false);
      return res.status(400).json({
        success: false,
        error: '参数验证失败',
        details: errors,
        timestamp: new Date().toISOString()
      });
    }

    // Mock 服务
    if (shouldUseMockServices()) {
      const service = MockServiceFactory.getVoiceCloneService();
      const result = await service.startTraining(normalized.speakerName, normalized.audios);

      const duration = Date.now() - start;
      success = true;
      updateServiceStats('voiceClone', duration, true);
      
      // 使用success变量
      console.log('Voice clone training started successfully:', success);

      const resultObj = result as { data?: unknown };
      return res.json({
        success: true,
        data: resultObj.data,
        timestamp: new Date().toISOString()
      });
    }

    // 生产环境：暂未接入真实服务
    const duration = Date.now() - start;
    updateServiceStats('voiceClone', duration, false);
    return res.status(501).json({
      success: false,
      error: '生产环境的声音复刻服务尚未接入，请启用沙箱模式或稍后重试',
      timestamp: new Date().toISOString()
    });
  } catch (err: unknown) {
    const error = err as { message?: string };
    const duration = Date.now() - start;
    updateServiceStats('voiceClone', duration, false);
    return res.status(500).json({
      success: false,
      error: error?.message || '声音复刻服务处理失败',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/voice-clone/status/:voiceId - 获取训练状态
router.get('/status/:voiceId', async (req, res) => {
  const start = Date.now();
  try {
    const { voiceId } = req.params;
    if (!voiceId) {
      const duration = Date.now() - start;
      updateServiceStats('voiceClone', duration, false);
      return res.status(400).json({ success: false, error: 'voiceId 为必填参数' });
    }

    if (shouldUseMockServices()) {
      const service = MockServiceFactory.getVoiceCloneService();
      const result = await service.getTrainingStatus(voiceId) as { success?: boolean; error?: string; data?: unknown };
      const duration = Date.now() - start;
      updateServiceStats('voiceClone', duration, !!result.success);
      if (!result.success) {
        return res.status(404).json({ success: false, error: result.error || '未找到任务' });
      }
      return res.json({ success: true, data: result.data });
    }

    const duration = Date.now() - start;
    updateServiceStats('voiceClone', duration, false);
    return res.status(501).json({ success: false, error: '生产环境未实现' });
  } catch (err: unknown) {
    const error = err as { message?: string };
    const duration = Date.now() - start;
    updateServiceStats('voiceClone', duration, false);
    return res.status(500).json({ success: false, error: error?.message || '获取状态失败' });
  }
});

// GET /api/voice-clone/list?userId=xxx - 获取用户的复刻声音列表
router.get('/list', async (req, res) => {
  const start = Date.now();
  try {
    const userId = String(req.query.userId || 'user_001'); // 默认一个演示用户，便于沙箱模式演示
    if (shouldUseMockServices()) {
      const service = MockServiceFactory.getVoiceCloneService();
      const result = await service.listVoiceClones(userId) as { success?: boolean; data?: unknown };
      const duration = Date.now() - start;
      updateServiceStats('voiceClone', duration, !!result.success);
      return res.json({ success: true, data: result.data });
    }

    const duration = Date.now() - start;
    updateServiceStats('voiceClone', duration, false);
    return res.status(501).json({ success: false, error: '生产环境未实现' });
  } catch (err: unknown) {
    const error = err as { message?: string };
    const duration = Date.now() - start;
    updateServiceStats('voiceClone', duration, false);
    return res.status(500).json({ success: false, error: error?.message || '获取列表失败' });
  }
});

export default router;