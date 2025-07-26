/**
 * 用户认证系统
 * 提供用户注册、登录、密码验证等功能
 */

import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { eq, and } from "drizzle-orm";
import { 
  createUser, 
  getUserByUsername, 
  updateUserLastLogin,
  type User 
} from "~/lib/user-db";
import { allocateUserMailboxes } from "~/lib/mailbox-allocation";
import { APP_CONFIG } from "~/config/app";

/**
 * 密码强度验证
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!password || password.length < 8) {
    errors.push("密码长度至少8位");
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push("密码必须包含小写字母");
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push("密码必须包含大写字母");
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push("密码必须包含数字");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 用户名验证
 */
export function validateUsername(username: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!username || username.length < 3) {
    errors.push("用户名长度至少3位");
  }
  
  if (username.length > 20) {
    errors.push("用户名长度不能超过20位");
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    errors.push("用户名只能包含字母、数字、下划线和连字符");
  }
  
  // 保留用户名检查
  const reservedNames = ['admin', 'root', 'system', 'api', 'www', 'mail', 'email'];
  if (reservedNames.includes(username.toLowerCase())) {
    errors.push("该用户名为系统保留，请选择其他用户名");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 哈希密码
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12; // 增加安全性
  return await bcrypt.hash(password, saltRounds);
}

/**
 * 验证密码
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error("密码验证失败:", error);
    return false;
  }
}

/**
 * 用户注册
 */
export async function registerUser(
  db: DrizzleD1Database,
  userData: {
    username: string;
    password: string;
    confirmPassword: string;
    email: string; // 现在是必需的
  }
): Promise<{
  success: boolean;
  user?: User;
  error?: string;
}> {
  try {
    // 1. 输入验证
    const { username, password, confirmPassword, email } = userData;

    if (!username || !password || !confirmPassword || !email) {
      return { success: false, error: "所有必填字段都不能为空" };
    }
    
    if (password !== confirmPassword) {
      return { success: false, error: "密码确认不匹配" };
    }
    
    // 2. 用户名验证
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.isValid) {
      return { success: false, error: usernameValidation.errors.join(", ") };
    }
    
    // 3. 密码强度验证
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return { success: false, error: passwordValidation.errors.join(", ") };
    }
    
    // 4. 检查用户名是否已存在
    const existingUser = await getUserByUsername(db, username);
    if (existingUser) {
      return { success: false, error: "用户名已存在，请选择其他用户名" };
    }
    
    // 5. 创建用户
    const hashedPassword = await hashPassword(password);
    const user = await createUser(db, {
      username,
      passwordHash: hashedPassword,
      email,
      emailQuota: APP_CONFIG.user.defaultQuota,
      expiresAt: new Date(Date.now() + APP_CONFIG.user.defaultExpirationDays * 24 * 60 * 60 * 1000)
    });

    // 6. 分配邮箱配额
    await allocateUserMailboxes(db, user.id, user.emailQuota);
    
    console.log(`✅ 用户注册成功: ${username} (ID: ${user.id})`);
    
    return { success: true, user };
    
  } catch (error) {
    console.error("用户注册失败:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "注册失败，请稍后重试" 
    };
  }
}

/**
 * 用户登录验证
 */
export async function validateUser(
  db: DrizzleD1Database,
  username: string,
  password: string
): Promise<User | null> {
  try {
    if (!username || !password) {
      return null;
    }
    
    // 1. 查找用户
    const user = await getUserByUsername(db, username);
    if (!user) {
      console.log(`⚠️ 登录失败: 用户不存在 (${username})`);
      return null;
    }
    
    // 2. 检查用户状态
    if (!user.isActive) {
      console.log(`⚠️ 登录失败: 账号已被禁用 (${username})`);
      return null;
    }
    
    // 3. 检查账号是否过期
    if (user.expiresAt && new Date() > user.expiresAt) {
      console.log(`⚠️ 登录失败: 账号已过期 (${username})`);
      return null;
    }
    
    // 4. 验证密码
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      console.log(`⚠️ 登录失败: 密码错误 (${username})`);
      return null;
    }
    
    // 5. 更新最后登录时间
    await updateUserLastLogin(db, user.id);
    
    console.log(`✅ 用户登录成功: ${username} (ID: ${user.id})`);
    return user;
    
  } catch (error) {
    console.error("用户登录验证失败:", error);
    return null;
  }
}

/**
 * 检查用户是否存在
 */
export async function checkUserExists(
  db: DrizzleD1Database,
  username: string
): Promise<boolean> {
  try {
    const user = await getUserByUsername(db, username);
    return user !== null;
  } catch (error) {
    console.error("检查用户存在性失败:", error);
    return false;
  }
}

/**
 * 生成安全的随机token
 */
export function generateSecureToken(): string {
  return nanoid(32);
}

/**
 * 用户数据清理（移除敏感信息）
 */
export function sanitizeUser(user: User): Omit<User, 'passwordHash'> {
  const { passwordHash, ...sanitizedUser } = user;
  return sanitizedUser;
}
