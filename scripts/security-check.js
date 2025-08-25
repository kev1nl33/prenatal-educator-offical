#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 安全检查脚本
 * 检查代码中是否包含敏感信息，如API密钥、访问令牌等
 */

const SENSITIVE_PATTERNS = [
  // API 密钥模式
  /VOLCENGINE_ARK_API_KEY\s*=\s*['"](?!your_|\$\{)[^'"\s]+['"]/, // 火山引擎 Ark API Key
  /VOLCENGINE_TTS_ACCESS_TOKEN\s*=\s*['"](?!your_|\$\{)[^'"\s]+['"]/, // TTS Access Token
  /VOLCENGINE_APP_ID\s*=\s*['"](?!your_|\$\{)[^'"\s]+['"]/, // App ID
  
  // Supabase 密钥模式
  /SUPABASE_URL\s*=\s*['"](?!your_|\$\{)[^'"\s]+['"]/, // Supabase URL
  /SUPABASE_ANON_KEY\s*=\s*['"](?!your_|\$\{)[^'"\s]+['"]/, // Supabase Anon Key
  /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"](?!your_|\$\{)[^'"\s]+['"]/, // Supabase Service Role Key
  
  // 通用密钥模式
  /api[_-]?key\s*[=:]\s*['"](?!your_|\$\{|xxx)[a-zA-Z0-9_-]{20,}['"]/, // 通用 API Key
  /access[_-]?token\s*[=:]\s*['"](?!your_|\$\{|xxx)[a-zA-Z0-9_-]{20,}['"]/, // 访问令牌
  /secret[_-]?key\s*[=:]\s*['"](?!your_|\$\{|xxx)[a-zA-Z0-9_-]{20,}['"]/, // 密钥
  
  // 硬编码的真实密钥模式
  /sk-[a-zA-Z0-9]{48}/, // OpenAI API Key 格式
  /[a-zA-Z0-9]{32,}\.[a-zA-Z0-9]{6,}\.[a-zA-Z0-9_-]{27,}/, // JWT Token 格式
];

const EXCLUDE_PATTERNS = [
  /\.git\//,
  /node_modules\//,
  /dist\//,
  /build\//,
  /\.env\.example$/,
  /\.md$/,
  /security-check\.js$/,
  /test-results\//,
  /playwright-report\//,
];

const INCLUDE_EXTENSIONS = [
  '.js', '.ts', '.jsx', '.tsx', '.vue', '.json', '.env'
];

class SecurityChecker {
  constructor() {
    this.violations = [];
    this.checkedFiles = 0;
  }

  /**
   * 递归扫描目录
   */
  scanDirectory(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const relativePath = path.relative(process.cwd(), fullPath);
      
      // 跳过排除的路径
      if (EXCLUDE_PATTERNS.some(pattern => pattern.test(relativePath))) {
        continue;
      }
      
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        this.scanDirectory(fullPath);
      } else if (stat.isFile()) {
        const ext = path.extname(fullPath);
        if (INCLUDE_EXTENSIONS.includes(ext)) {
          this.scanFile(fullPath, relativePath);
        }
      }
    }
  }

  /**
   * 扫描单个文件
   */
  scanFile(filePath, relativePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      this.checkedFiles++;
      
      lines.forEach((line, index) => {
        SENSITIVE_PATTERNS.forEach((pattern, patternIndex) => {
          if (pattern.test(line)) {
            this.violations.push({
              file: relativePath,
              line: index + 1,
              content: line.trim(),
              pattern: patternIndex,
              severity: this.getSeverity(line)
            });
          }
        });
      });
    } catch (error) {
      console.warn(`警告: 无法读取文件 ${relativePath}: ${error.message}`);
    }
  }

  /**
   * 获取违规严重程度
   */
  getSeverity(line) {
    if (line.includes('sk-') || line.includes('eyJ')) {
      return 'HIGH';
    }
    if (line.includes('VOLCENGINE') || line.includes('SUPABASE')) {
      return 'MEDIUM';
    }
    return 'LOW';
  }

  /**
   * 检查 .env 文件是否在 .gitignore 中
   */
  checkGitignore() {
    const gitignorePath = path.join(process.cwd(), '.gitignore');
    
    if (!fs.existsSync(gitignorePath)) {
      this.violations.push({
        file: '.gitignore',
        line: 0,
        content: '缺少 .gitignore 文件',
        severity: 'HIGH',
        type: 'MISSING_GITIGNORE'
      });
      return;
    }
    
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    const envPatterns = ['.env', '*.env', '.env.*'];
    
    const hasEnvIgnore = envPatterns.some(pattern => 
      gitignoreContent.includes(pattern)
    );
    
    if (!hasEnvIgnore) {
      this.violations.push({
        file: '.gitignore',
        line: 0,
        content: '.env 文件未被忽略',
        severity: 'HIGH',
        type: 'ENV_NOT_IGNORED'
      });
    }
  }

  /**
   * 检查是否有 .env 文件被意外提交
   */
  checkCommittedEnvFiles() {
    try {
      const result = execSync('git ls-files "*.env*"', { encoding: 'utf8' });
      const envFiles = result.trim().split('\n').filter(f => f && !f.endsWith('.example'));
      
      envFiles.forEach(file => {
        this.violations.push({
          file: file,
          line: 0,
          content: '环境文件已被提交到 Git',
          severity: 'HIGH',
          type: 'ENV_COMMITTED'
        });
      });
    } catch (error) {
      // Git 命令失败，可能不在 Git 仓库中
      console.warn('警告: 无法检查 Git 状态');
    }
  }

  /**
   * 运行完整的安全检查
   */
  run() {
    console.log('🔍 开始安全检查...');
    console.log('');
    
    // 扫描代码文件
    this.scanDirectory(process.cwd());
    
    // 检查 .gitignore
    this.checkGitignore();
    
    // 检查已提交的环境文件
    this.checkCommittedEnvFiles();
    
    // 输出结果
    this.printResults();
    
    // 返回退出码
    return this.violations.length > 0 ? 1 : 0;
  }

  /**
   * 打印检查结果
   */
  printResults() {
    console.log(`📊 扫描完成: 检查了 ${this.checkedFiles} 个文件`);
    console.log('');
    
    if (this.violations.length === 0) {
      console.log('✅ 未发现安全问题');
      return;
    }
    
    console.log(`❌ 发现 ${this.violations.length} 个安全问题:`);
    console.log('');
    
    // 按严重程度分组
    const groupedViolations = this.violations.reduce((acc, violation) => {
      if (!acc[violation.severity]) {
        acc[violation.severity] = [];
      }
      acc[violation.severity].push(violation);
      return acc;
    }, {});
    
    // 输出高危问题
    if (groupedViolations.HIGH) {
      console.log('🚨 高危问题:');
      groupedViolations.HIGH.forEach(v => {
        console.log(`   ${v.file}:${v.line} - ${v.content}`);
      });
      console.log('');
    }
    
    // 输出中危问题
    if (groupedViolations.MEDIUM) {
      console.log('⚠️  中危问题:');
      groupedViolations.MEDIUM.forEach(v => {
        console.log(`   ${v.file}:${v.line} - ${v.content}`);
      });
      console.log('');
    }
    
    // 输出低危问题
    if (groupedViolations.LOW) {
      console.log('ℹ️  低危问题:');
      groupedViolations.LOW.forEach(v => {
        console.log(`   ${v.file}:${v.line} - ${v.content}`);
      });
      console.log('');
    }
    
    console.log('🔧 修复建议:');
    console.log('   1. 将所有敏感信息移动到 .env 文件中');
    console.log('   2. 确保 .env 文件已添加到 .gitignore');
    console.log('   3. 使用环境变量替换硬编码的密钥');
    console.log('   4. 检查已提交的历史记录中是否包含敏感信息');
  }
}

// 运行安全检查
if (require.main === module) {
  const checker = new SecurityChecker();
  const exitCode = checker.run();
  process.exit(exitCode);
}

module.exports = SecurityChecker;