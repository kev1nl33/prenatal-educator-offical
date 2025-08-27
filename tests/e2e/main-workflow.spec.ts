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

  test('完整工作流程：API调试 → 功能开关 → 数据仪表盘', async ({ page }) => {
    // 步骤1：导航到API调试页面
    await test.step('导航到API调试页面', async () => {
      await page.goto('/debug/api');
      await expect(page.locator('h1')).toContainText('API调试面板');
    });

    // 步骤2：测试Ark调试功能
    await test.step('测试Ark调试功能', async () => {
      // 输入测试内容
      const arkInput = page.locator('textarea').first();
      await arkInput.fill('生成一个关于小兔子的故事');
      
      // 点击调试按钮
      await page.click('button:has-text("开始调试")');
      
      // 等待响应（最多10秒）
      await page.waitForTimeout(3000);
      
      // 截图：Ark调试结果
      await page.screenshot({ 
        path: 'test-results/ark-debug.png',
        fullPage: true 
      });
    });

    // 步骤3：导航到功能开关页面
    await test.step('导航到功能开关页面', async () => {
      await page.goto('/settings/feature-flags');
      await expect(page.locator('h1')).toContainText('功能开关管理');
    });

    // 步骤4：测试功能开关切换
    await test.step('测试功能开关切换', async () => {
      // 测试开关切换
      const authToggle = page.locator('[data-testid="toggle-ENABLE_AUTH"]');
      if (await authToggle.isVisible()) {
        await authToggle.click();
        // 验证开关状态变化
        await expect(authToggle).toHaveAttribute('aria-checked', 'true');
      }
      
      // 截图：功能开关页面
      await page.screenshot({ 
        path: 'test-results/feature-flags.png',
        fullPage: true 
      });
    });

    // 步骤5：导航到数据仪表盘
    await test.step('导航到数据仪表盘', async () => {
      await page.goto('/dashboard');
      await expect(page.locator('h1')).toContainText('数据仪表盘');
      
      // 截图：数据仪表盘
      await page.screenshot({ 
        path: 'test-results/dashboard.png',
        fullPage: true 
      });
    });

    // 步骤6：验证页面导航
    await test.step('验证页面导航', async () => {
      // 返回首页
      await page.goto('/');
      await expect(page.locator('h1')).toBeVisible();
      
      // 截图：首页
      await page.screenshot({ 
        path: 'test-results/homepage.png',
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
      const arkInput = page.locator('textarea').first();
      await arkInput.fill('生成一个关于小熊的故事');
      
      await page.click('button:has-text("开始调试")');
      
      // 等待响应
      await page.waitForTimeout(3000);
      
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