# 安全性说明

本文档说明项目的安全配置和最佳实践，确保敏感信息不会泄露到前端构建产物中。

## 🔒 环境变量安全

### 前端环境变量规则

**✅ 安全做法：**
- 前端只读取 `VITE_` 前缀的环境变量
- 所有 `VITE_` 前缀的变量都会被打包到前端构建产物中
- 前端代码中**不直接使用**任何后端密钥

**❌ 危险做法：**
```javascript
// 错误：直接在前端使用后端密钥
const apiKey = import.meta.env.VOLCENGINE_ARK_API_KEY; // 危险！
const token = process.env.VOLCENGINE_TTS_ACCESS_TOKEN; // 危险！
```

**✅ 正确做法：**
```javascript
// 正确：只使用 VITE_ 前缀的公开配置
const apiBase = import.meta.env.VITE_API_BASE_URL || '';
const appName = import.meta.env.VITE_APP_NAME || 'Prenatal Educator';
```

### 后端环境变量管理

**文件位置：** `api/.env`（**重要：不是根目录**）

**敏感变量列表：**
```bash
# 这些变量只能在后端使用，绝不能暴露到前端
VOLCENGINE_ARK_API_KEY=xxx
VOLCENGINE_TTS_ACCESS_TOKEN=xxx
JWT_SECRET=xxx
SESSION_SECRET=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
```

## 🛡️ 构建安全检查

### 自动安全验证

项目配置了以下安全措施：

1. **前端构建隔离**
   - Vite 只打包 `src/` 目录下的代码
   - `api/` 目录完全隔离，不会被前端访问
   - 环境变量通过代理转发，不直接暴露

2. **代理配置**
   ```typescript
   // vite.config.ts
   server: {
     proxy: {
       '/api': {
         target: 'http://localhost:3001', // 后端服务
         changeOrigin: true,
         secure: false
       }
     }
   }
   ```

3. **Git 保护**
   ```gitignore
   # .gitignore
   api/.env          # 后端环境变量
   .env.local        # 本地环境变量
   .env.*.local      # 特定环境的本地变量
   ```

### 手动安全检查

**检查前端构建产物：**
```bash
# 构建前端
npm run build

# 检查构建产物中是否包含敏感信息
grep -r "VOLCENGINE" dist/ || echo "✅ 无敏感密钥泄露"
grep -r "sk-" dist/ || echo "✅ 无 API 密钥泄露"
grep -r "secret" dist/ || echo "✅ 无密钥泄露"
```

**检查前端代码：**
```bash
# 搜索可能的环境变量使用
grep -r "process.env" src/ || echo "✅ 无 Node.js 环境变量使用"
grep -r "VOLCENGINE" src/ | grep -v "错误提示" || echo "✅ 无直接密钥使用"
```

## 🔐 密钥管理最佳实践

### 开发环境

1. **本地开发**
   ```bash
   # 复制示例文件
   cp env.example api/.env
   
   # 填入真实密钥（仅本地使用）
   vim api/.env
   ```

2. **团队协作**
   - 每个开发者维护自己的 `api/.env` 文件
   - 不要将真实密钥提交到版本控制
   - 使用 SANDBOX 模式进行功能开发

### 生产环境

1. **环境变量注入**
   ```bash
   # 通过环境变量注入（推荐）
   export VOLCENGINE_ARK_API_KEY="your_production_key"
   export VOLCENGINE_TTS_ACCESS_TOKEN="your_production_token"
   
   # 或通过 CI/CD 系统安全注入
   ```

2. **密钥轮换**
   - 定期更换 API 密钥
   - 监控密钥使用情况
   - 及时撤销泄露的密钥

## 🚨 安全事件响应

### 密钥泄露处理

如果发现密钥可能泄露：

1. **立即行动**
   ```bash
   # 1. 立即撤销泄露的密钥
   # 2. 生成新的密钥
   # 3. 更新生产环境配置
   # 4. 检查访问日志
   ```

2. **预防措施**
   - 启用 API 密钥的 IP 白名单
   - 设置 API 调用频率限制
   - 监控异常 API 调用

### 代码审查检查点

在代码审查时，请检查：

- [ ] 前端代码没有直接使用后端密钥
- [ ] 新增的环境变量遵循命名规范
- [ ] 敏感配置没有硬编码在代码中
- [ ] `.env` 文件没有被提交到版本控制
- [ ] 新增的 `VITE_` 变量确实需要在前端使用

## 📋 安全检查清单

### 部署前检查

- [ ] 所有敏感环境变量都在 `api/.env` 中
- [ ] 前端构建产物不包含后端密钥
- [ ] `.gitignore` 正确配置
- [ ] API 密钥权限最小化
- [ ] 启用了适当的安全头
- [ ] 配置了 CORS 策略

### 定期安全审计

- [ ] 检查 API 密钥使用情况
- [ ] 审查访问日志
- [ ] 更新依赖包到最新版本
- [ ] 运行安全扫描工具
- [ ] 验证备份和恢复流程

## 🔗 相关资源

- [火山引擎 API 安全指南](https://www.volcengine.com/docs/)
- [Vite 环境变量文档](https://vitejs.dev/guide/env-and-mode.html)
- [Node.js 安全最佳实践](https://nodejs.org/en/docs/guides/security/)
- [OWASP 安全指南](https://owasp.org/)

---

⚠️ **重要提醒：** 安全是一个持续的过程，请定期审查和更新安全配置。如有疑问，请咨询安全团队。