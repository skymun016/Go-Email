// 方案四：广告管理后台
import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData, useActionData, Form, useNavigation } from "@remix-run/react";
import { useState } from "react";
import { Plus, Edit, Trash2, Eye, MousePointer, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";

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

// 模拟数据加载
export async function loader({ context }: LoaderFunctionArgs) {
  // 这里应该从数据库加载数据
  const mockAds: Ad[] = [
    {
      id: "xichen-cloud",
      title: "兮辰云专业服务器",
      description: "高性能云服务器，稳定可靠，价格实惠",
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
      description: "Augment Token 获取地址",
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
      id: "sponsor-slot-1",
      title: "赞助商位置1",
      description: "优质广告位，等待赞助商",
      buttonText: "💰 成为赞助商",
      buttonUrl: "/contact",
      icon: "💎",
      bgColor: "bg-gradient-to-br from-green-500 to-emerald-500",
      textColor: "text-white",
      isActive: false,
      priority: 4,
      clickCount: 0,
      viewCount: 0
    }
  ];

  return json({ ads: mockAds });
}

// 处理表单提交
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const action = formData.get("_action");

  switch (action) {
    case "toggle":
      const id = formData.get("id") as string;
      // 这里应该更新数据库
      return json({ success: true, message: "广告状态已更新" });
      
    case "delete":
      const deleteId = formData.get("id") as string;
      // 这里应该删除数据库记录
      return json({ success: true, message: "广告已删除" });
      
    case "create":
    case "update":
      // 这里应该创建或更新数据库记录
      return json({ success: true, message: "广告已保存" });
      
    default:
      return json({ error: "未知操作" }, { status: 400 });
  }
}

export default function AdminAds() {
  const { ads } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [showForm, setShowForm] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);

  const isSubmitting = navigation.state === "submitting";

  // 计算统计数据
  const totalViews = ads.reduce((sum, ad) => sum + ad.viewCount, 0);
  const totalClicks = ads.reduce((sum, ad) => sum + ad.clickCount, 0);
  const totalRevenue = ads.reduce((sum, ad) => sum + (ad.monthlyFee || 0), 0);
  const avgCTR = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(2) : "0";

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">广告管理</h1>
          <p className="text-gray-600 mt-1">管理首页小块广告展示</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          添加广告
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Eye className="h-4 w-4 text-blue-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-gray-600">总展示量</p>
                <p className="text-2xl font-bold text-gray-900">{totalViews.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <MousePointer className="h-4 w-4 text-green-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-gray-600">总点击量</p>
                <p className="text-2xl font-bold text-gray-900">{totalClicks.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-gray-600">平均点击率</p>
                <p className="text-2xl font-bold text-gray-900">{avgCTR}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="h-4 w-4 bg-green-500 rounded-full" />
              <div className="ml-2">
                <p className="text-sm font-medium text-gray-600">月收入</p>
                <p className="text-2xl font-bold text-gray-900">¥{totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 广告列表 */}
      <Card>
        <CardHeader>
          <CardTitle>广告列表</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {ads.map((ad) => (
              <div key={ad.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* 广告预览 */}
                    <div className={`w-16 h-16 rounded-lg ${ad.bgColor} flex items-center justify-center`}>
                      {ad.logoUrl ? (
                        <img src={ad.logoUrl} alt={ad.title} className="w-10 h-10 object-contain" />
                      ) : (
                        <span className={`text-2xl ${ad.textColor}`}>{ad.icon || '📢'}</span>
                      )}
                    </div>

                    {/* 广告信息 */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{ad.title}</h3>
                        <Badge variant={ad.isActive ? "default" : "secondary"}>
                          {ad.isActive ? "激活" : "停用"}
                        </Badge>
                        {ad.sponsorName && (
                          <Badge variant="outline">赞助商: {ad.sponsorName}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{ad.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>👁️ {ad.viewCount}</span>
                        <span>🖱️ {ad.clickCount}</span>
                        <span>📊 {ad.viewCount > 0 ? ((ad.clickCount / ad.viewCount) * 100).toFixed(1) : 0}% CTR</span>
                        {ad.monthlyFee && <span>💰 ¥{ad.monthlyFee}/月</span>}
                      </div>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-2">
                    <Form method="post" className="inline">
                      <input type="hidden" name="_action" value="toggle" />
                      <input type="hidden" name="id" value={ad.id} />
                      <Button
                        type="submit"
                        variant="outline"
                        size="sm"
                        disabled={isSubmitting}
                      >
                        {ad.isActive ? "停用" : "启用"}
                      </Button>
                    </Form>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingAd(ad);
                        setShowForm(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>

                    <Form method="post" className="inline">
                      <input type="hidden" name="_action" value="delete" />
                      <input type="hidden" name="id" value={ad.id} />
                      <Button
                        type="submit"
                        variant="outline"
                        size="sm"
                        disabled={isSubmitting}
                        onClick={(e) => {
                          if (!confirm("确定要删除这个广告吗？")) {
                            e.preventDefault();
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </Form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 操作反馈 */}
      {actionData?.success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <p className="text-green-800">{actionData.message}</p>
        </div>
      )}

      {actionData?.error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{actionData.error}</p>
        </div>
      )}
    </div>
  );
}
