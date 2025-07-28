/**
 * 测试邮箱管理API
 * 提供测试邮箱的查询、统计和管理功能
 */

import { data } from "react-router";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { createDB } from "~/lib/db";
import { getDatabase } from "~/config/app";
import { testMailboxes } from "~/db/schema";
import { eq, like, desc, asc, count } from "drizzle-orm";

// GET - 查询测试邮箱列表
export async function loader({ request, context }: LoaderFunctionArgs) {
  try {
    const env = context.cloudflare.env;
    const db = createDB(getDatabase(env));
    
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const search = url.searchParams.get("search") || "";
    const domain = url.searchParams.get("domain") || "";
    const sortBy = url.searchParams.get("sortBy") || "id";
    const sortOrder = url.searchParams.get("sortOrder") || "asc";
    
    const offset = (page - 1) * limit;
    
    // 构建查询条件
    let whereConditions = [];
    
    if (search) {
      whereConditions.push(like(testMailboxes.email, `%${search}%`));
    }
    
    if (domain) {
      whereConditions.push(eq(testMailboxes.domain, domain));
    }
    
    // 查询数据
    let query = db.select().from(testMailboxes);
    
    if (whereConditions.length > 0) {
      query = query.where(whereConditions.length === 1 ? whereConditions[0] : 
        whereConditions.reduce((acc, condition) => acc.and(condition)));
    }
    
    // 排序
    const orderBy = sortOrder === "desc" ? desc : asc;
    switch (sortBy) {
      case "email":
        query = query.orderBy(orderBy(testMailboxes.email));
        break;
      case "domain":
        query = query.orderBy(orderBy(testMailboxes.domain));
        break;
      case "copyCount":
        query = query.orderBy(orderBy(testMailboxes.copyCount));
        break;
      default:
        query = query.orderBy(orderBy(testMailboxes.id));
    }
    
    // 分页
    const mailboxes = await query.limit(limit).offset(offset);
    
    // 获取总数
    const totalCountResult = await db.select({ count: count() }).from(testMailboxes);
    const totalCount = totalCountResult[0]?.count || 0;
    
    // 获取域名统计
    const domainStats = await db
      .select({
        domain: testMailboxes.domain,
        count: count()
      })
      .from(testMailboxes)
      .groupBy(testMailboxes.domain);
    
    return data({
      success: true,
      data: {
        mailboxes,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNext: page * limit < totalCount,
          hasPrev: page > 1
        },
        stats: {
          totalCount,
          domainStats: domainStats.reduce((acc, stat) => {
            acc[stat.domain] = stat.count;
            return acc;
          }, {} as Record<string, number>)
        },
        filters: {
          search,
          domain,
          sortBy,
          sortOrder
        }
      }
    });
    
  } catch (error) {
    console.error("查询测试邮箱失败:", error);
    return data({
      success: false,
      error: "查询失败"
    }, { status: 500 });
  }
}

// POST - 更新复制次数或其他操作
export async function action({ request, context }: ActionFunctionArgs) {
  try {
    const env = context.cloudflare.env;
    const db = createDB(getDatabase(env));
    
    const formData = await request.formData();
    const action = formData.get("action") as string;
    const email = formData.get("email") as string;
    
    if (!email) {
      return data({
        success: false,
        error: "邮箱地址不能为空"
      }, { status: 400 });
    }
    
    switch (action) {
      case "incrementCopy":
        // 增加复制次数 - 先获取当前值，然后更新
        const currentMailbox = await db
          .select({ copyCount: testMailboxes.copyCount })
          .from(testMailboxes)
          .where(eq(testMailboxes.email, email))
          .limit(1);

        if (currentMailbox.length === 0) {
          return data({
            success: false,
            error: "邮箱不存在"
          }, { status: 404 });
        }

        const newCopyCount = (currentMailbox[0].copyCount || 0) + 1;

        await db
          .update(testMailboxes)
          .set({
            copyCount: newCopyCount
          })
          .where(eq(testMailboxes.email, email));

        return data({
          success: true,
          message: "复制次数已更新",
          newCopyCount: newCopyCount
        });

      case "updateRemark":
        // 更新备注
        const remark = formData.get("remark") as string;

        // 检查邮箱是否存在
        const existingMailbox = await db
          .select({ id: testMailboxes.id })
          .from(testMailboxes)
          .where(eq(testMailboxes.email, email))
          .limit(1);

        if (existingMailbox.length === 0) {
          return data({
            success: false,
            error: "邮箱不存在"
          }, { status: 404 });
        }

        // 更新备注（允许空字符串，将其转换为null）
        const remarkValue = remark && remark.trim() ? remark.trim() : null;

        await db
          .update(testMailboxes)
          .set({
            remark: remarkValue
          })
          .where(eq(testMailboxes.email, email));

        return data({
          success: true,
          message: "备注已更新",
          remark: remarkValue
        });

      default:
        return data({
          success: false,
          error: "不支持的操作"
        }, { status: 400 });
    }
    
  } catch (error) {
    console.error("操作失败:", error);
    return data({
      success: false,
      error: "操作失败"
    }, { status: 500 });
  }
}
