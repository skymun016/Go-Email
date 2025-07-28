import {
	type RouteConfig,
	index,
	route,
	layout,
} from "@react-router/dev/routes";

export default [
	// 独立页面路由（不使用布局）
	route("/verify-mailbox", "routes/verify-mailbox.tsx"),

	layout("routes/layout.tsx", [
		index("routes/home.tsx"),

		// 用户认证路由
		route("/login", "routes/login.tsx"),
		route("/register", "routes/register.tsx"),
		route("/logout", "routes/logout.ts"),

		// 用户Dashboard路由
		route("/dashboard", "routes/dashboard.tsx"),
		route("/mailbox/:id", "routes/mailbox.$id.tsx"),

		// 其他页面路由
		route("/about", "routes/about.tsx"),
		route("/api-docs", "routes/api-docs.tsx"),
		route("/privacy", "routes/privacy.tsx"),
		route("/terms", "routes/terms.tsx"),
		route("/faq", "routes/faq.tsx"),
		route("/contact", "routes/contact.tsx"),
		route("/mail/:id", "routes/mail.$id.tsx"),
	]),

	// 独立页面路由（不使用布局）
	route("/attachment/:id", "routes/attachment.$id.tsx"),
	// 测试邮箱管理页面（无导航栏）
	route("/test-mailboxes-db", "routes/test-mailboxes-db.tsx"),

	// 管理员路由
	route("/admin", "routes/admin.ts"),
	route("/admin-login", "routes/admin-login.tsx"),
	route("/admin/dashboard", "routes/admin.dashboard.tsx"),
	route("/admin/import-test-mailboxes", "routes/admin.import-test-mailboxes.tsx"),
	route("/admin/users", "routes/admin.users.tsx"),
	route("/admin/users/batch", "routes/admin.users.batch.tsx"),
	route("/admin/users/:id", "routes/admin.users.$id.tsx"),
	route("/admin/users/:id/edit", "routes/admin.users.$id.edit.tsx"),
	route("/admin/users/:id/assign-mailbox", "routes/admin.users.$id.assign-mailbox.tsx"),
	route("/admin/mailboxes", "routes/admin.mailboxes.tsx"),
	route("/admin/mailboxes/batch", "routes/admin.mailboxes.batch.tsx"),
	route("/admin/mailboxes/create", "routes/admin.mailboxes.create.tsx"),
	route("/admin/mailboxes/:id/manage", "routes/admin.mailboxes.$id.manage.tsx"),
	route("/admin/emails", "routes/admin.emails.basic.tsx"),
	route("/admin/emails/:id", "routes/admin.emails.$id.tsx"),
	route("/admin/tokens", "routes/admin.tokens.tsx"),
	route("/admin/settings", "routes/admin.settings.tsx"),
	route("/admin/logout", "routes/admin.logout.ts"),

	// 外部API路由
	route("/api/external/mailbox", "routes/api.external.mailbox.ts"),
	route("/api/external/emails/:email", "routes/api.external.emails.$email.ts"),
	route("/api/external/email/:id", "routes/api.external.email.$id.ts"),
	route("/api/external/attachment/:id", "routes/api.external.attachment.$id.ts"),

	// 测试邮箱API路由
	route("/api/test-mailboxes", "routes/api.test-mailboxes.ts"),

	route("/sitemap.xml", "routes/sitemap[.]xml.tsx"),
	route("/robots.txt", "routes/robots[.]txt.tsx"),
	route("/site.webmanifest", "routes/site[.]webmanifest.tsx"),
	// 捕获所有未匹配的路径，自动跳转到首页
	route("*", "routes/$.ts"),
] satisfies RouteConfig;
