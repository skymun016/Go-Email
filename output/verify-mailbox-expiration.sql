
-- 验证邮箱过期时间更新情况
-- 执行时间: 2025-07-28T08:33:41.769Z

-- 1. 检查总体更新情况
SELECT 
  COUNT(*) as total_mailboxes,
  COUNT(CASE WHEN expires_at > datetime('now') THEN 1 END) as active_mailboxes,
  COUNT(CASE WHEN expires_at <= datetime('now') THEN 1 END) as expired_mailboxes,
  MIN(expires_at) as earliest_expiry,
  MAX(expires_at) as latest_expiry
FROM mailboxes 
WHERE email LIKE '%@aug.qzz.io' OR email LIKE '%@asksy.dpdns.org';

-- 2. 按域名统计
SELECT 
  CASE 
    WHEN email LIKE '%@aug.qzz.io' THEN 'aug.qzz.io'
    WHEN email LIKE '%@asksy.dpdns.org' THEN 'asksy.dpdns.org'
    ELSE 'other'
  END as domain,
  COUNT(*) as total_count,
  COUNT(CASE WHEN expires_at > datetime('now') THEN 1 END) as active_count,
  MIN(expires_at) as min_expiry,
  MAX(expires_at) as max_expiry
FROM mailboxes 
WHERE email LIKE '%@aug.qzz.io' OR email LIKE '%@asksy.dpdns.org'
GROUP BY domain;

-- 3. 检查过期时间分布
SELECT 
  DATE(expires_at) as expiry_date,
  COUNT(*) as mailbox_count
FROM mailboxes 
WHERE email LIKE '%@aug.qzz.io' OR email LIKE '%@asksy.dpdns.org'
GROUP BY DATE(expires_at)
ORDER BY expiry_date;

-- 4. 随机抽样检查
SELECT 
  email,
  created_at,
  expires_at,
  CASE 
    WHEN expires_at > datetime('now') THEN 'ACTIVE'
    ELSE 'EXPIRED'
  END as status,
  ROUND((julianday(expires_at) - julianday('now')) * 24, 2) as hours_until_expiry
FROM mailboxes 
WHERE email LIKE '%@aug.qzz.io' OR email LIKE '%@asksy.dpdns.org'
ORDER BY RANDOM()
LIMIT 10;
