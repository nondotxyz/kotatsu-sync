import { defineContentScript } from "#imports";
import { onMessage, sendMessage } from "@/messaging";

export default defineContentScript({
	matches: ["*://*.animepahe.pw/*"],
	runAt: "document_idle",
	main() {
		sendMessage("peer:tab-id");
		sendMessage("animepahe:url-change", location.href);

		window.addEventListener("hashchange", () => {
			sendMessage("animepahe:url-change", location.href);
		});

		onMessage("animepahe:url-sync", (msg) => {
			if (location.href === msg.data) {
				return;
			}

			location.href = msg.data;
		});
		setTimeout(() => {
			document.querySelector<HTMLElement>(".click-to-load")?.click();
		}, 100);
	},
});
