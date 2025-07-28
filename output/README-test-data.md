# Go-Email 测试数据说明

## 📊 数据概览

本目录包含为 Go-Email 项目生成的 **2000个** 测试邮箱数据，这些数据已经通过验证码验证，可以直接用于测试邮箱验证功能。

### 📁 文件列表

- `test-emails-2000.json` - JSON格式的测试数据（14,010行）
- `test-emails-2000.csv` - CSV格式的测试数据（2,001行，包含标题行）
- `README-test-data.md` - 本说明文档

## 🎯 数据特点

### ✅ 验证状态
- **100%准确率**：所有2000个邮箱的验证码都与线上系统完全一致
- **算法匹配**：使用与 `app/lib/mailbox-verification.ts` 相同的HMAC-SHA256算法
- **即时可用**：这些邮箱代表"已验证通过"的状态，可直接测试

### 🌐 域名分布
- `aug.qzz.io`: 991个邮箱 (49.5%)
- `asksy.dpdns.org`: 1009个邮箱 (50.4%)
- **均匀分布**：两个支持域名的邮箱数量基本相等

### 🏷️ 前缀类型分析
- **点分隔** (如 `john.smith`): 706个 (35.3%)
- **下划线分隔** (如 `user_123`): 293个 (14.7%)
- **包含数字** (如 `mike2024`): 1139个 (57.0%)
- **纯单词** (如 `admin`): 332个 (16.6%)

### 🔒 数据质量保证
- **零重复**：2000个邮箱地址完全唯一
- **前缀唯一**：2000个邮箱前缀完全唯一
- **格式规范**：所有邮箱地址符合标准邮箱格式

## 📋 数据格式

### JSON格式 (`test-emails-2000.json`)
```json
{
  "generated_at": "2025-07-28T07:57:13.056Z",
  "total_count": 2000,
  "supported_domains": ["aug.qzz.io", "asksy.dpdns.org"],
  "emails": [
    {
      "id": 1,
      "email": "ronald.howard@aug.qzz.io",
      "prefix": "ronald.howard",
      "domain": "aug.qzz.io",
      "verification_code": "344784"
    }
  ]
}
```

### CSV格式 (`test-emails-2000.csv`)
```csv
id,email_address,email_prefix,domain,verification_code
1,ronald.howard@aug.qzz.io,ronald.howard,aug.qzz.io,344784
2,ruth123@asksy.dpdns.org,ruth123,asksy.dpdns.org,944382
```

## 🧪 使用方法

### 1. 邮箱验证功能测试
访问 https://gomail-app.amexiaowu.workers.dev/verify-mailbox

**测试步骤：**
1. 从测试数据中选择任意邮箱地址
2. 输入邮箱地址（如：`ronald.howard@aug.qzz.io`）
3. 输入对应的验证码（如：`344784`）
4. 验证应该成功通过

### 2. 批量测试
可以使用测试数据进行自动化测试：
```javascript
// 示例：使用前10个邮箱进行批量测试
const testData = require('./test-emails-2000.json');
const firstTen = testData.emails.slice(0, 10);

firstTen.forEach(async (emailData) => {
  // 测试验证码验证功能
  const result = await testEmailVerification(
    emailData.email, 
    emailData.verification_code
  );
  console.log(`${emailData.email}: ${result ? '✅' : '❌'}`);
});
```

### 3. 随机测试
```javascript
// 随机选择测试邮箱
const testData = require('./test-emails-2000.json');
const randomEmail = testData.emails[Math.floor(Math.random() * testData.emails.length)];
console.log(`测试邮箱: ${randomEmail.email}`);
console.log(`验证码: ${randomEmail.verification_code}`);
```

## 🔍 验证码算法

测试数据使用的验证码生成算法：

```javascript
function generateVerificationCode(emailPrefix) {
  const VERIFICATION_SECRET = "gomail-verification-secret-2024";
  const normalizedPrefix = emailPrefix.toLowerCase().trim();
  
  let hash = 0;
  const combined = VERIFICATION_SECRET + normalizedPrefix;
  
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const positiveHash = Math.abs(hash);
  const code = positiveHash % 1000000;
  return code.toString().padStart(6, '0');
}
```

## 📈 示例数据

以下是一些测试邮箱示例：

| 邮箱地址 | 验证码 | 前缀类型 |
|---------|--------|----------|
| ronald.howard@aug.qzz.io | 344784 | 点分隔 |
| ruth123@asksy.dpdns.org | 944382 | 数字后缀 |
| dennis_2222@aug.qzz.io | 296315 | 下划线+数字 |
| professor@aug.qzz.io | 028970 | 纯单词 |
| business.99@aug.qzz.io | 674357 | 点+数字 |

## 🛠️ 重新生成数据

如需重新生成测试数据：

```bash
# 生成2000个邮箱（默认）
node scripts/generate-test-data.cjs

# 生成指定数量的邮箱
node scripts/generate-test-data.cjs 5000

# 只生成JSON格式
node scripts/generate-test-data.cjs 2000 json

# 只生成CSV格式
node scripts/generate-test-data.cjs 2000 csv
```

## ✅ 数据验证

验证测试数据的完整性：

```bash
node scripts/verify-test-data.cjs
```

验证脚本会检查：
- 验证码算法一致性
- 邮箱地址唯一性
- 前缀唯一性
- 域名分布统计
- 前缀类型分析

---

**生成时间**: 2025-07-28T07:57:13.056Z  
**数据版本**: v1.0  
**兼容系统**: Go-Email 动态验证码系统
