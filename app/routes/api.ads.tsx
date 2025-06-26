// 方案五：广告API接口
import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/cloudflare";

interface Ad {
  id: string;
  title: string;
  description: string;
  buttonText: string;
  buttonUrl: string;
  icon?: string;
  logoUrl?: string;
  bgColor: string;
  textColor: string;
  isActive: boolean;
  priority: number;
  startDate?: string;
  endDate?: string;
  clickCount: number;
  viewCount: number;
  sponsorName?: string;
  monthlyFee?: number;
}

// GET /api/ads - 获取所有广告
// GET /api/ads?active=true - 获取活跃广告
// GET /api/ads?limit=5 - 限制数量
export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const activeOnly = url.searchParams.get("active") === "true";
  const limit = parseInt(url.searchParams.get("limit") || "10");

  try {
    // 这里应该从数据库获取数据
    // const adsManager = new AdsManager(context.env.DB);
    // const ads = activeOnly ? await adsManager.getActiveAds(limit) : await adsManager.getAllAds();

    // 模拟数据
    const mockAds: Ad[] = [
      {
        id: "xichen-cloud",
        title: "兮辰云专业服务器",
        description: "高性能云服务器，稳定可靠，价格实惠。多地域机房，BGP多线接入，7x24小时技术支持",
        buttonText: "☁️ 访问官网",
        buttonUrl: "https://idc.xicheny.com",
        logoUrl: "https://idc.xicheny.com/msg/logo2.png",
        bgColor: "bg-gradient-to-br from-blue-500 to-cyan-500",
        textColor: "text-white",
        isActive: true,
        priority: 1,
        clickCount: 156,
        viewCount: 2340,
        sponsorName: "兮辰云",
        monthlyFee: 2000
      },
      {
        id: "idea-token-pool",
        title: "IDEA Token 池",
        description: "Augment Token 获取地址，为您的 IDEA 开发提供强大的 AI 支持",
        buttonText: "🔗 访问 Token 池",
        buttonUrl: "https://augment.184772.xyz",
        icon: "🎯",
        bgColor: "bg-gradient-to-br from-orange-500 to-red-500",
        textColor: "text-white",
        isActive: true,
        priority: 2,
        clickCount: 89,
        viewCount: 1890
      },
      {
        id: "idea-plugin",
        title: "IDEA 无感换号插件",
        description: "开源 IDEA 插件，实现 Augment 账号无感切换，提升开发效率",
        buttonText: "📦 GitHub 仓库",
        buttonUrl: "https://github.com/xn030523/augment-token-idea-free.git",
        icon: "🔧",
        bgColor: "bg-gradient-to-br from-purple-500 to-indigo-500",
        textColor: "text-white",
        isActive: true,
        priority: 3,
        clickCount: 67,
        viewCount: 1456
      },
      {
        id: "sponsor-slot-1",
        title: "赞助商位置1",
        description: "优质广告位，高曝光率，精准用户群体。联系我们获取更多信息",
        buttonText: "💰 成为赞助商",
        buttonUrl: "/contact",
        icon: "💎",
        bgColor: "bg-gradient-to-br from-green-500 to-emerald-500",
        textColor: "text-white",
        isActive: false,
        priority: 4,
        clickCount: 0,
        viewCount: 0
      },
      {
        id: "sponsor-slot-2",
        title: "赞助商位置2",
        description: "黄金广告位，等待您的加入。多种合作方式，灵活定价",
        buttonText: "📞 联系合作",
        buttonUrl: "/contact",
        icon: "🌟",
        bgColor: "bg-gradient-to-br from-pink-500 to-rose-500",
        textColor: "text-white",
        isActive: false,
        priority: 5,
        clickCount: 0,
        viewCount: 0
      }
    ];

    let filteredAds = mockAds;

    // 过滤活跃广告
    if (activeOnly) {
      const now = new Date();
      filteredAds = mockAds.filter(ad => {
        if (!ad.isActive) return false;
        if (ad.startDate && new Date(ad.startDate) > now) return false;
        if (ad.endDate && new Date(ad.endDate) < now) return false;
        return true;
      });
    }

    // 排序并限制数量
    filteredAds = filteredAds
      .sort((a, b) => a.priority - b.priority)
      .slice(0, limit);

    return json({
      success: true,
      data: filteredAds,
      total: filteredAds.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Failed to fetch ads:", error);
    return json(
      { 
        success: false, 
        error: "Failed to fetch ads",
        data: [],
        total: 0
      },
      { status: 500 }
    );
  }
}

// POST /api/ads - 创建新广告
// PUT /api/ads - 更新广告
// DELETE /api/ads - 删除广告
export async function action({ request, context }: ActionFunctionArgs) {
  const method = request.method;

  try {
    switch (method) {
      case "POST": {
        const data = await request.json();
        
        // 验证必填字段
        const requiredFields = ["id", "title", "description", "buttonText", "buttonUrl", "bgColor", "textColor"];
        for (const field of requiredFields) {
          if (!data[field]) {
            return json(
              { success: false, error: `Missing required field: ${field}` },
              { status: 400 }
            );
          }
        }

        // 这里应该保存到数据库
        // const adsManager = new AdsManager(context.env.DB);
        // await adsManager.addAd(data);

        return json({
          success: true,
          message: "广告创建成功",
          data: { id: data.id }
        });
      }

      case "PUT": {
        const data = await request.json();
        
        if (!data.id) {
          return json(
            { success: false, error: "Missing ad ID" },
            { status: 400 }
          );
        }

        // 这里应该更新数据库
        // const adsManager = new AdsManager(context.env.DB);
        // await adsManager.updateAd(data.id, data);

        return json({
          success: true,
          message: "广告更新成功",
          data: { id: data.id }
        });
      }

      case "DELETE": {
        const data = await request.json();
        
        if (!data.id) {
          return json(
            { success: false, error: "Missing ad ID" },
            { status: 400 }
          );
        }

        // 这里应该从数据库删除
        // const adsManager = new AdsManager(context.env.DB);
        // await adsManager.deleteAd(data.id);

        return json({
          success: true,
          message: "广告删除成功",
          data: { id: data.id }
        });
      }

      default:
        return json(
          { success: false, error: "Method not allowed" },
          { status: 405 }
        );
    }

  } catch (error) {
    console.error("Ad operation failed:", error);
    return json(
      { 
        success: false, 
        error: "Operation failed",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// 广告统计API
export async function PATCH({ request, context }: ActionFunctionArgs) {
  try {
    const url = new URL(request.url);
    const adId = url.pathname.split('/').pop();
    const action = url.searchParams.get('action'); // 'view' or 'click'

    if (!adId || !action) {
      return json(
        { success: false, error: "Missing ad ID or action" },
        { status: 400 }
      );
    }

    if (!['view', 'click'].includes(action)) {
      return json(
        { success: false, error: "Invalid action" },
        { status: 400 }
      );
    }

    // 这里应该更新数据库统计
    // const adsManager = new AdsManager(context.env.DB);
    // if (action === 'view') {
    //   await adsManager.incrementView(adId);
    // } else {
    //   await adsManager.incrementClick(adId);
    // }

    return json({
      success: true,
      message: `${action} recorded for ad ${adId}`
    });

  } catch (error) {
    console.error("Failed to record ad interaction:", error);
    return json(
      { success: false, error: "Failed to record interaction" },
      { status: 500 }
    );
  }
}
