import { browser, defineBackground } from "#imports";
import { type BadgeState, onMessage, sendMessage } from "@/messaging";
import { PeerClient, type PeerHost } from "@/peer-client";
import { fetchIceServers } from "@/turn";
import type { Nullable } from "@/type";

/**
 * Reflects the connection state on the toolbar icon: green dot when connected,
 * red "!" on an unexpected drop, nothing when idle. Lives here because the
 * action API isn't available to the offscreen document. `browser.action` is
 * MV3 (Chromium); `browser.browserAction` is MV2 (Firefox).
 */
function setBadge(state: BadgeState) {
	const action = browser.action ?? browser.browserAction;

	if (state === "connected") {
		action.setBadgeText({ text: "●" });
		action.setBadgeBackgroundColor({ color: "#22c55e" });
		action.setTitle({ title: "Kotatsu Sync — Connected" });
	} else if (state === "alert") {
		action.setBadgeText({ text: "!" });
		action.setBadgeBackgroundColor({ color: "#ef4444" });
		action.setTitle({ title: "Kotatsu Sync — Disconnected" });
	} else {
		action.setBadgeText({ text: "" });
		action.setTitle({ title: "Kotatsu Sync" });
	}
}

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
		setBadge,
	};
}


async function ensureOffscreen() {
	const offscreen = (globalThis as any).chrome?.offscreen;
	if (!offscreen) return;

	try {
		if (await offscreen.hasDocument()) return;

		await offscreen.createDocument({
			url: "offscreen.html",
			reasons: ["WEB_RTC", "AUDIO_PLAYBACK"],
			justification: "Maintains the WebRTC connection for playback sync.",
		});
	} catch (err) {

		console.debug("[OFFSCREEN]", err);
	}
}

export default defineBackground(() => {
	const tabHost = createTabHost();

	onMessage("action:set-badge", ({ data }) => setBadge(data));

	if (import.meta.env.BROWSER === "firefox") {
		new PeerClient(tabHost);
	} else {

		onMessage("offscreen:url-sync", ({ data }) => tabHost.syncUrlToTab(data));
		onMessage("offscreen:data-in", ({ data }) => tabHost.sendDataToTab(data));
		onMessage("offscreen:get-ice-servers", () => fetchIceServers());

		ensureOffscreen();
	}
});
