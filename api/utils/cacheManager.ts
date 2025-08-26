import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * TTS 缓存管理器
 * 实现相同文本+参数时不重复调用TTS API的缓存策略
 */

interface CacheItem {
  key: string;
  data: unknown;
  timestamp: number;
  ttl: number; // 生存时间（秒）
  accessCount: number;
  lastAccessed: number;
}

interface TTSCacheParams {
  text: string;
  voiceType: string;
  speed?: number;
  emotion?: string;
  encoding?: string;
  sampleRate?: number;
}

class TTSCacheManager {
  private cache: Map<string, CacheItem> = new Map();
  private cacheDir: string;
  private maxCacheSize: number;
  private defaultTTL: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(options: {
    cacheDir?: string;
    maxCacheSize?: number;
    defaultTTL?: number;
  } = {}) {
    this.cacheDir = options.cacheDir || path.join(process.cwd(), 'cache', 'tts');
    this.maxCacheSize = options.maxCacheSize || 100; // 最大缓存条目数
    this.defaultTTL = options.defaultTTL || 3600; // 默认1小时过期

    // 确保缓存目录存在
    this.ensureCacheDir();

    // 启动定期清理
    this.startCleanupTimer();

    // 加载持久化缓存
    this.loadPersistedCache();
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(params: TTSCacheParams): string {
    // 标准化参数
    const normalizedParams = {
      text: params.text.trim(),
      voiceType: params.voiceType,
      speed: params.speed || 0,
      emotion: params.emotion || 'neutral',
      encoding: params.encoding || 'mp3',
      sampleRate: params.sampleRate || 24000
    };

    // 生成哈希键
    const paramString = JSON.stringify(normalizedParams, Object.keys(normalizedParams).sort());
    return crypto.createHash('md5').update(paramString).digest('hex');
  }

  /**
   * 获取缓存
   */
  async get(params: TTSCacheParams): Promise<unknown | null> {
    const key = this.generateCacheKey(params);
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // 检查是否过期
    const now = Date.now();
    if (now - item.timestamp > item.ttl * 1000) {
      this.cache.delete(key);
      this.deletePersistedFile(key);
      return null;
    }

    // 更新访问统计
    item.accessCount++;
    item.lastAccessed = now;

    console.log(`TTS缓存命中: ${key}, 访问次数: ${item.accessCount}`);
    return item.data;
  }

  /**
   * 设置缓存
   */
  async set(params: TTSCacheParams, data: unknown, ttl?: number): Promise<void> {
    const key = this.generateCacheKey(params);
    const now = Date.now();
    
    const item: CacheItem = {
      key,
      data,
      timestamp: now,
      ttl: ttl || this.defaultTTL,
      accessCount: 1,
      lastAccessed: now
    };

    // 检查缓存大小限制
    if (this.cache.size >= this.maxCacheSize) {
      this.evictLeastRecentlyUsed();
    }

    this.cache.set(key, item);
    
    // 持久化到磁盘
    await this.persistCacheItem(key, item);
    
    console.log(`TTS缓存设置: ${key}, TTL: ${item.ttl}秒`);
  }

  /**
   * 删除缓存
   */
  async delete(params: TTSCacheParams): Promise<boolean> {
    const key = this.generateCacheKey(params);
    const deleted = this.cache.delete(key);
    
    if (deleted) {
      this.deletePersistedFile(key);
      console.log(`TTS缓存删除: ${key}`);
    }
    
    return deleted;
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    this.cache.clear();
    
    // 删除所有持久化文件
    try {
      const files = fs.readdirSync(this.cacheDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          fs.unlinkSync(path.join(this.cacheDir, file));
        }
      }
      console.log('TTS缓存已清空');
    } catch (error) {
      console.error('清空缓存文件失败:', error);
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    totalItems: number;
    totalSize: number;
    hitRate: number;
    oldestItem: number;
    newestItem: number;
  } {
    const items = Array.from(this.cache.values());
    const now = Date.now();
    
    let totalAccess = 0;
    let totalHits = 0;
    let oldestTimestamp = now;
    let newestTimestamp = 0;
    
    items.forEach(item => {
      totalAccess += item.accessCount;
      if (item.accessCount > 1) {
        totalHits += item.accessCount - 1;
      }
      
      if (item.timestamp < oldestTimestamp) {
        oldestTimestamp = item.timestamp;
      }
      if (item.timestamp > newestTimestamp) {
        newestTimestamp = item.timestamp;
      }
    });
    
    return {
      totalItems: this.cache.size,
      totalSize: this.calculateCacheSize(),
      hitRate: totalAccess > 0 ? (totalHits / totalAccess) * 100 : 0,
      oldestItem: oldestTimestamp,
      newestItem: newestTimestamp
    };
  }

  /**
   * 计算缓存大小（字节）
   */
  private calculateCacheSize(): number {
    let size = 0;
    this.cache.forEach(item => {
      size += JSON.stringify(item).length;
    });
    return size;
  }

  /**
   * LRU淘汰策略
   */
  private evictLeastRecentlyUsed(): void {
    let lruKey: string | null = null;
    let lruTime = Date.now();
    
    this.cache.forEach((item, key) => {
      if (item.lastAccessed < lruTime) {
        lruTime = item.lastAccessed;
        lruKey = key;
      }
    });
    
    if (lruKey) {
      this.cache.delete(lruKey);
      this.deletePersistedFile(lruKey);
      console.log(`LRU淘汰缓存: ${lruKey}`);
    }
  }

  /**
   * 确保缓存目录存在
   */
  private ensureCacheDir(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * 持久化缓存项到磁盘
   */
  private async persistCacheItem(key: string, item: CacheItem): Promise<void> {
    try {
      const filePath = path.join(this.cacheDir, `${key}.json`);
      const data = {
        ...item,
        // 如果数据是音频文件，只存储文件路径
        data: this.serializeData(item.data)
      };
      
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`持久化缓存失败 ${key}:`, error);
    }
  }

  /**
   * 序列化数据
   */
  private serializeData(data: unknown): unknown {
    const dataObj = data as { audioBuffer?: Buffer };
    if (dataObj && typeof dataObj === 'object' && dataObj.audioBuffer) {
      // 如果是音频数据，保存到文件并返回路径
      const audioFileName = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp3`;
      const audioPath = path.join(this.cacheDir, audioFileName);
      
      try {
        fs.writeFileSync(audioPath, dataObj.audioBuffer);
        return {
          ...dataObj,
          audioBuffer: null,
          audioFilePath: audioPath
        };
      } catch (error) {
        console.error('保存音频文件失败:', error);
        return dataObj;
      }
    }
    
    return dataObj;
  }

  /**
   * 反序列化数据
   */
  private deserializeData(data: unknown): unknown {
    const dataObj = data as { audioFilePath?: string; audioBuffer?: Buffer };
    if (dataObj && dataObj.audioFilePath && fs.existsSync(dataObj.audioFilePath)) {
      try {
        const audioBuffer = fs.readFileSync(dataObj.audioFilePath);
        return {
          ...dataObj,
          audioBuffer,
          audioFilePath: undefined
        };
      } catch (error) {
        console.error('读取音频文件失败:', error);
        return dataObj;
      }
    }
    
    return dataObj;
  }

  /**
   * 加载持久化缓存
   */
  private loadPersistedCache(): void {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        return;
      }
      
      const files = fs.readdirSync(this.cacheDir);
      let loadedCount = 0;
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(this.cacheDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const item: CacheItem = JSON.parse(content);
            
            // 检查是否过期
            const now = Date.now();
            if (now - item.timestamp <= item.ttl * 1000) {
              // 反序列化数据
              item.data = this.deserializeData(item.data);
              this.cache.set(item.key, item);
              loadedCount++;
            } else {
              // 删除过期文件
              fs.unlinkSync(filePath);
            }
          } catch (error) {
            console.error(`加载缓存文件失败 ${file}:`, error);
          }
        }
      }
      
      if (loadedCount > 0) {
        console.log(`加载了 ${loadedCount} 个TTS缓存项`);
      }
    } catch (error) {
      console.error('加载持久化缓存失败:', error);
    }
  }

  /**
   * 删除持久化文件
   */
  private deletePersistedFile(key: string): void {
    try {
      const filePath = path.join(this.cacheDir, `${key}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error(`删除缓存文件失败 ${key}:`, error);
    }
  }

  /**
   * 启动定期清理定时器
   */
  private startCleanupTimer(): void {
    // 每10分钟清理一次过期缓存
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredItems();
    }, 10 * 60 * 1000);
  }

  /**
   * 清理过期缓存项
   */
  private cleanupExpiredItems(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    this.cache.forEach((item, key) => {
      if (now - item.timestamp > item.ttl * 1000) {
        this.cache.delete(key);
        this.deletePersistedFile(key);
        cleanedCount++;
      }
    });
    
    if (cleanedCount > 0) {
      console.log(`清理了 ${cleanedCount} 个过期的TTS缓存项`);
    }
  }

  /**
   * 销毁缓存管理器
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.cache.clear();
    console.log('TTS缓存管理器已销毁');
  }
}

// 创建全局缓存实例
const ttsCacheManager = new TTSCacheManager({
  cacheDir: path.join(process.cwd(), 'cache', 'tts'),
  maxCacheSize: parseInt(process.env.CACHE_MAX_SIZE || '100'),
  defaultTTL: parseInt(process.env.CACHE_TTL || '3600')
});

export { TTSCacheManager, ttsCacheManager };
export type { TTSCacheParams };