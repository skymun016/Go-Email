import randomName from "@scaleway/random-name";
import { customAlphabet } from "nanoid";
import { APP_CONFIG } from "~/config/app";

export function generateRandomEmail() {
	const name = randomName();
	const random = customAlphabet("0123456789", 4)();
	return `${name}-${random}@${APP_CONFIG.cloudflare.email.domain}`;
}
