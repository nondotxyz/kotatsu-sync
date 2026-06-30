import { browser, defineBackground } from "#imports";
import { onMessage, sendMessage } from "@/messaging";
import { PeerClient, type PeerHost } from "@/peer-client";
import { fetchIceServers } from "@/turn";
import type { Nullable } from "@/type";


function createTabHost(): PeerHost {
	let animepaheTab: Nullable<number> = null;

	onMessage("peer:tab-id", (msg) => {
		if (animepaheTab) return;
		animepaheTab = msg.sender.tab?.id ?? null;
	});

	browser.tabs.onRemoved.addListener((tabId) => {
		if (tabId === animepaheTab) {
			animepaheTab = null;
		}
	});

	browser.tabs.onUpdated.addListener((tabId, _changeInfo, tab) => {
		if (
			tabId === animepaheTab &&
			tab.url &&
			!tab.url.includes("animepahe")
		) {
			animepaheTab = null;
		}
	});

	return {
		syncUrlToTab(url) {
			if (!animepaheTab) return;
			sendMessage("animepahe:url-sync", url, animepaheTab);
		},
		sendDataToTab(data) {
			if (!animepaheTab) return;
			sendMessage("video:data-in", data, animepaheTab);
		},
		getIceServers: fetchIceServers,
	};
}


async function ensureOffscreen() {
	const offscreen = (globalThis as any).chrome?.offscreen;
	if (!offscreen) return;

	try {
		if (await offscreen.hasDocument()) return;

		await offscreen.createDocument({
			url: "offscreen.html",
			reasons: ["WEB_RTC"],
			justification: "Maintains the WebRTC connection for playback sync.",
		});
	} catch (err) {

		console.debug("[OFFSCREEN]", err);
	}
}

export default defineBackground(() => {
	const tabHost = createTabHost();

	if (import.meta.env.BROWSER === "firefox") {
		new PeerClient(tabHost);
	} else {

		onMessage("offscreen:url-sync", ({ data }) => tabHost.syncUrlToTab(data));
		onMessage("offscreen:data-in", ({ data }) => tabHost.sendDataToTab(data));
		onMessage("offscreen:get-ice-servers", () => fetchIceServers());

		ensureOffscreen();
	}
});
