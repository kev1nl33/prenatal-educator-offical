# 常见错误对照表

本文档列出了开发和部署过程中可能遇到的常见错误及其解决方案。

## 🔧 环境配置相关错误

### 错误：`❌ 启动失败：缺少必需的环境变量`

**原因：** 缺少必需的环境变量配置

**解决方案：**
1. 确保 `.env` 文件位于 `api/` 目录下（**重要：不是根目录**）
2. 复制 `env.example` 到 `api/.env`
3. 填入真实的 API 密钥：
   ```bash
   cp env.example api/.env
   # 编辑 api/.env 文件，填入真实密钥
   ```

### 错误：`Error: listen EADDRINUSE: address already in use :::3001`

**原因：** 端口被占用

**解决方案：**
```bash
# 查找占用端口的进程
lsof -i :3001
# 杀死进程
kill -9 <PID>
# 或者修改端口
echo "PORT=3002" >> api/.env
```

### 错误：`Module not found: Can't resolve '@/...'`

**原因：** 路径别名配置问题

**解决方案：**
1. 检查 `tsconfig.json` 中的 `paths` 配置
2. 确保 `vite.config.ts` 中配置了 `@` 别名
3. 重启开发服务器

## 🏷️ SANDBOX 模式说明

### SANDBOX 模式的作用

**SANDBOX 模式**是一个安全的测试环境，用于：
- 🧪 **测试功能**：使用模拟数据测试所有功能
- 💰 **节省费用**：不消耗真实 API 额度
- 🔒 **安全开发**：避免在开发过程中意外调用生产服务
- 🚀 **快速验证**：无需等待真实 API 响应

### 如何切换 SANDBOX 模式

#### 方法1：通过环境变量
```bash
# 在 api/.env 文件中设置
RUN_MODE=sandbox          # 启用沙箱模式
USE_MOCK_SERVICES=true    # 使用模拟服务
```

#### 方法2：通过运行模式
```bash
# MVP 模式（默认）
RUN_MODE=mvp

# 沙箱模式
RUN_MODE=sandbox

# 生产模式
RUN_MODE=production
```

### 模式对比

| 模式 | 功能开关 | Mock服务 | API调用 | 适用场景 |
|------|----------|----------|---------|----------|
| MVP | 全部关闭 | 禁用 | 真实 | 核心功能验证 |
| Sandbox | 全部启用 | 启用 | 模拟 | 功能测试 |
| Production | 全部启用 | 禁用 | 真实 | 生产环境 |

## 🔑 API 密钥相关错误

### 错误：`401 Unauthorized` 或 `API密钥无效`

**原因：** API 密钥配置错误

**解决方案：**
1. 检查 `api/.env` 文件中的密钥配置：
   ```bash
   VOLCENGINE_ARK_API_KEY=your_real_ark_key
   VOLCENGINE_TTS_ACCESS_TOKEN=your_real_tts_token
   ```
2. 确保密钥没有多余的空格或换行符
3. 验证密钥是否过期或被撤销
4. 如果是测试，可以启用 SANDBOX 模式

### 错误：`403 Forbidden` 或 `权限不足`

**原因：** API 密钥权限不足

**解决方案：**
1. 检查火山引擎控制台中的 API 权限设置
2. 确保密钥有调用相应服务的权限
3. 联系管理员分配正确的权限

## 🌐 网络相关错误

### 错误：`503 Service Unavailable` 或 `上游服务不可用`

**原因：** 外部服务暂时不可用

**解决方案：**
1. 检查网络连接
2. 等待服务恢复
3. 启用 SANDBOX 模式继续开发：
   ```bash
   echo "USE_MOCK_SERVICES=true" >> api/.env
   ```

### 错误：`Request timeout` 或 `请求超时`

**原因：** 网络请求超时

**解决方案：**
1. 检查网络连接稳定性
2. 增加超时时间配置
3. 使用 SANDBOX 模式避免网络依赖

## 📦 依赖安装错误

### 错误：`npm ERR! peer dep missing`

**原因：** 缺少对等依赖

**解决方案：**
```bash
# 清理并重新安装
rm -rf node_modules package-lock.json
npm install

# 或者使用 --legacy-peer-deps
npm install --legacy-peer-deps
```

### 错误：`EACCES: permission denied`

**原因：** 权限不足

**解决方案：**
```bash
# 修复 npm 权限
sudo chown -R $(whoami) ~/.npm

# 或者使用 npx
npx create-vite@latest
```

## 🔍 调试技巧

### 1. 检查服务状态
访问健康检查接口：
```
GET http://localhost:3001/api/health
```

### 2. 查看详细日志
```bash
# 启用详细日志
echo "VERBOSE_LOGGING=true" >> api/.env
echo "DEBUG_MODE=true" >> api/.env
```

### 3. 使用调试面板
访问调试页面查看实时状态：
```
http://localhost:5173/debug/api
```

### 4. 检查环境变量
```bash
# 在 api/ 目录下检查
cat api/.env

# 检查是否正确加载
node -e "require('dotenv').config({path: './api/.env'}); console.log(process.env.VOLCENGINE_ARK_API_KEY ? 'API Key loaded' : 'API Key missing')"
```

## 🚨 紧急情况处理

### 生产环境问题
1. 立即启用 SANDBOX 模式停止真实 API 调用
2. 检查错误日志和监控数据
3. 回滚到上一个稳定版本
4. 联系技术支持

### 开发环境重置
```bash
# 完全重置开发环境
rm -rf node_modules package-lock.json
rm api/.env
cp env.example api/.env
npm install
npm run dev
```

## 📞 获取帮助

如果以上解决方案都无法解决问题，请：

1. 查看 [GitHub Issues](https://github.com/your-repo/issues)
2. 提交新的 Issue，包含：
   - 错误信息的完整截图
   - 操作系统和 Node.js 版本
   - 复现步骤
   - 相关的日志输出
3. 联系技术支持团队

---

💡 **提示：** 大部分问题都与环境配置有关，请优先检查 `api/.env` 文件的配置是否正确。