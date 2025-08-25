import { test, expect } from '@playwright/test';

/**
 * 主要工作流程 E2E 测试
 * 测试流程：生成 → 合成 → 播放 → 截图
 */
test.describe('AI胎教平台主要工作流程', () => {
  test.beforeEach(async ({ page }) => {
    // 访问首页
    await page.goto('/');
    
    // 等待页面加载完成
    await page.waitForLoadState('networkidle');
  });

  test('完整工作流程：内容生成 → 语音合成 → 音频播放', async ({ page }) => {
    // 步骤1：导航到内容生成页面
    await test.step('导航到内容生成页面', async () => {
      await page.click('text=内容生成');
      await page.waitForURL('**/generate');
      await expect(page.locator('h1')).toContainText('内容生成');
    });

    // 步骤2：生成故事内容
    await test.step('生成故事内容', async () => {
      // 输入故事主题
      const storyInput = page.locator('textarea[placeholder*="输入故事主题"]');
      await storyInput.fill('小兔子的冒险故事');
      
      // 点击生成按钮
      await page.click('button:has-text("生成故事")');
      
      // 等待生成完成（最多10秒）
      await page.waitForSelector('.story-result', { timeout: 10000 });
      
      // 验证故事内容已生成
      const storyContent = page.locator('.story-result');
      await expect(storyContent).toBeVisible();
      await expect(storyContent).not.toBeEmpty();
      
      // 截图：故事生成结果
      await page.screenshot({ 
        path: 'test-results/story-generation.png',
        fullPage: true 
      });
    });

    // 步骤3：导航到语音合成页面
    await test.step('导航到语音合成页面', async () => {
      await page.click('text=语音合成');
      await page.waitForURL('**/tts');
      await expect(page.locator('h1')).toContainText('语音合成');
    });

    // 步骤4：配置语音合成参数
    await test.step('配置语音合成参数', async () => {
      // 输入要合成的文本
      const textInput = page.locator('textarea[placeholder*="输入要合成的文本"]');
      await textInput.fill('亲爱的宝贝，让我们一起听一个美妙的故事吧。');
      
      // 选择音色
      await page.selectOption('select[name="voiceType"]', 'zh_female_tianmeixiaomei_emo_v2_mars_bigtts');
      
      // 调整语速
      await page.locator('input[name="speed"]').fill('0');
      
      // 选择情感
      await page.selectOption('select[name="emotion"]', 'happy');
      
      // 截图：语音合成配置
      await page.screenshot({ 
        path: 'test-results/tts-configuration.png',
        fullPage: true 
      });
    });

    // 步骤5：执行语音合成
    await test.step('执行语音合成', async () => {
      // 点击合成按钮
      await page.click('button:has-text("开始合成")');
      
      // 等待合成完成（最多30秒）
      await page.waitForSelector('.audio-player', { timeout: 30000 });
      
      // 验证音频播放器出现
      const audioPlayer = page.locator('.audio-player');
      await expect(audioPlayer).toBeVisible();
      
      // 截图：语音合成结果
      await page.screenshot({ 
        path: 'test-results/tts-result.png',
        fullPage: true 
      });
    });

    // 步骤6：播放音频
    await test.step('播放音频', async () => {
      // 点击播放按钮
      const playButton = page.locator('button[aria-label="播放"]');
      await playButton.click();
      
      // 等待音频开始播放
      await page.waitForTimeout(2000);
      
      // 验证播放状态
      const pauseButton = page.locator('button[aria-label="暂停"]');
      await expect(pauseButton).toBeVisible();
      
      // 截图：音频播放状态
      await page.screenshot({ 
        path: 'test-results/audio-playing.png',
        fullPage: true 
      });
      
      // 暂停播放
      await pauseButton.click();
    });

    // 步骤7：验证历史记录
    await test.step('验证历史记录', async () => {
      // 导航到历史记录页面
      await page.click('text=历史记录');
      await page.waitForURL('**/history');
      
      // 验证记录存在
      const historyItems = page.locator('.history-item');
      await expect(historyItems.first()).toBeVisible();
      
      // 截图：历史记录
      await page.screenshot({ 
        path: 'test-results/history-records.png',
        fullPage: true 
      });
    });
  });

  test('功能开关管理测试', async ({ page }) => {
    // 导航到功能开关页面
    await page.goto('/settings/feature-flags');
    
    // 验证页面标题
    await expect(page.locator('h1')).toContainText('功能开关管理');
    
    // 测试开关切换
    const authToggle = page.locator('[data-testid="toggle-ENABLE_AUTH"]');
    await authToggle.click();
    
    // 验证开关状态变化
    await expect(authToggle).toHaveAttribute('aria-checked', 'true');
    
    // 截图：功能开关页面
    await page.screenshot({ 
      path: 'test-results/feature-flags.png',
      fullPage: true 
    });
  });

  test('API调试面板测试', async ({ page }) => {
    // 导航到API调试页面
    await page.goto('/debug/api');
    
    // 验证页面标题
    await expect(page.locator('h1')).toContainText('API调试面板');
    
    // 测试Ark调试区
    await test.step('测试Ark文本生成调试', async () => {
      const arkInput = page.locator('textarea[placeholder*="输入要生成的内容"]');
      await arkInput.fill('生成一个关于小熊的故事');
      
      await page.click('button:has-text("开始调试")');
      
      // 等待参数对照表显示
      await page.waitForSelector('.parameter-comparison', { timeout: 5000 });
      
      // 截图：Ark调试结果
      await page.screenshot({ 
        path: 'test-results/ark-debug.png',
        fullPage: true 
      });
    });
  });

  test('日志系统测试', async ({ page }) => {
    // 导航到日志页面
    await page.goto('/debug/logs');
    
    // 验证页面标题
    await expect(page.locator('h1')).toContainText('调用日志');
    
    // 验证日志列表
    const logItems = page.locator('.log-item');
    
    // 如果有日志记录，验证其结构
    if (await logItems.count() > 0) {
      await expect(logItems.first()).toBeVisible();
      
      // 验证日志包含必要信息
      await expect(logItems.first()).toContainText(/\d{4}-\d{2}-\d{2}/);
    }
    
    // 截图：日志页面
    await page.screenshot({ 
      path: 'test-results/debug-logs.png',
      fullPage: true 
    });
  });

  test('数据仪表盘测试', async ({ page }) => {
    // 导航到仪表盘页面
    await page.goto('/dashboard');
    
    // 验证页面标题
    await expect(page.locator('h1')).toContainText('数据总览');
    
    // 验证统计卡片
    const statsCards = page.locator('.stats-card');
    await expect(statsCards).toHaveCount(3);
    
    // 验证图表存在
    const charts = page.locator('.recharts-wrapper');
    await expect(charts.first()).toBeVisible();
    
    // 截图：仪表盘
    await page.screenshot({ 
      path: 'test-results/dashboard.png',
      fullPage: true 
    });
  });

  test('响应时间性能测试', async ({ page }) => {
    // 测试页面加载性能
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // 验证页面加载时间 ≤ 3秒
    expect(loadTime).toBeLessThan(3000);
    
    console.log(`页面加载时间: ${loadTime}ms`);
  });

  test('错误处理测试', async ({ page }) => {
    // 模拟网络错误
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });
    
    await page.goto('/debug/api');
    
    // 尝试调用API
    await page.fill('textarea[placeholder*="输入要生成的内容"]', '测试错误处理');
    await page.click('button:has-text("开始调试")');
    
    // 验证错误提示显示
    await expect(page.locator('.error-message')).toContainText('服务异常，请稍后重试');
    
    // 截图：错误处理
    await page.screenshot({ 
      path: 'test-results/error-handling.png',
      fullPage: true 
    });
  });
});