#!/usr/bin/env node

/**
 * 管理员账号初始化脚本
 * 用于在部署后初始化管理员账号
 */

const config = require("../config.cjs");

async function initAdmin() {
	console.log("🔧 正在初始化管理员账号...");

	const adminAccounts = config.admin?.accounts || [];

	if (adminAccounts.length === 0) {
		console.error("❌ 配置文件中未找到管理员账号配置");
		console.log("💡 请在 config.cjs 中配置 admin.accounts");
		process.exit(1);
	}

	console.log(`📋 找到 ${adminAccounts.length} 个管理员账号配置:`);
	adminAccounts.forEach((account, index) => {
		console.log(`  ${index + 1}. ${account.username}`);
	});

	console.log("\n🚀 请访问以下URL来完成管理员账号初始化:");
	console.log(`   https://${config.domain.website}/admin/setup`);

	console.log("\n📝 初始化完成后，您可以使用以下URL登录管理后台:");
	console.log(`   https://${config.domain.website}/admin/login`);

	console.log("\n🔐 管理员账号信息:");
	adminAccounts.forEach((account, index) => {
		console.log(`  账号 ${index + 1}:`);
		console.log(`    用户名: ${account.username}`);
		console.log(`    密码: ${account.password}`);
		console.log("");
	});

	console.log("⚠️  重要提示:");
	console.log("   1. 请妥善保管管理员账号信息");
	console.log("   2. 建议在首次登录后修改密码");
	console.log("   3. 可以在配置文件中添加更多管理员账号");
	console.log("   4. 修改配置后需要重新运行此脚本");
}

// 运行初始化
initAdmin().catch(console.error);
