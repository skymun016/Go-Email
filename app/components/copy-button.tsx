import type { VariantProps } from "class-variance-authority";
import { CheckIcon, CopyIcon, XIcon } from "lucide-react";
import { useState } from "react";

import { Button, type buttonVariants } from "~/components/ui/button";

interface CopyButtonProps extends VariantProps<typeof buttonVariants> {
	text: string;
	className?: string;
}

export function CopyButton({ text, ...props }: CopyButtonProps) {
	const icons = {
		idle: <CopyIcon />,
		success: <CheckIcon className="text-green-500" />,
		error: <XIcon className="text-red-500" />,
	};
	const texts = {
		idle: "复制地址",
		success: "复制成功",
		error: "复制失败",
	};
	const [icon, setIcon] = useState<keyof typeof icons>("idle");

	// 复制到剪贴板的函数
	const copyToClipboard = async (text: string) => {
		try {
			// 方法1: 使用现代 Clipboard API (需要 HTTPS)
			if (navigator.clipboard && window.isSecureContext) {
				await navigator.clipboard.writeText(text);
				return true;
			}

			// 方法2: 使用传统的 execCommand 方法 (兼容性更好)
			const textArea = document.createElement('textarea');
			textArea.value = text;
			textArea.style.position = 'fixed';
			textArea.style.left = '-999999px';
			textArea.style.top = '-999999px';
			document.body.appendChild(textArea);
			textArea.focus();
			textArea.select();

			const successful = document.execCommand('copy');
			document.body.removeChild(textArea);

			if (successful) {
				return true;
			}

			// 方法3: 使用 Selection API
			if (window.getSelection) {
				const selection = window.getSelection();
				const range = document.createRange();
				const span = document.createElement('span');
				span.textContent = text;
				span.style.position = 'fixed';
				span.style.left = '-999999px';
				document.body.appendChild(span);

				range.selectNode(span);
				selection?.removeAllRanges();
				selection?.addRange(range);

				const successful = document.execCommand('copy');
				document.body.removeChild(span);
				selection?.removeAllRanges();

				return successful;
			}

			return false;
		} catch (err) {
			console.error('复制失败:', err);
			return false;
		}
	};

	return (
		<Button
			variant="outline"
			onClick={async () => {
				// 确保在客户端环境中运行
				if (typeof window === 'undefined') {
					setIcon("error");
					setTimeout(() => {
						setIcon("idle");
					}, 2000);
					return;
				}

				const success = await copyToClipboard(text);

				if (success) {
					setIcon("success");
				} else {
					setIcon("error");
				}

				setTimeout(() => {
					setIcon("idle");
				}, 2000);
			}}
			{...props}
		>
			{icons[icon]}
			<span>{texts[icon]}</span>
		</Button>
	);
}
