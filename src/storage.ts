import { storage } from "#imports";

/**
 * Cloudflare Realtime TURN credentials, supplied by the user in the settings
 * popup. These stay in the user's own browser (local storage) and are used by
 * the background script to generate short-lived ICE servers for PeerJS.
 *
 * See: https://developers.cloudflare.com/realtime/turn/generate-credentials/
 */
export const turnKeyId = storage.defineItem<string>("local:turnKeyId", {
	fallback: "",
});

export const turnApiToken = storage.defineItem<string>("local:turnApiToken", {
	fallback: "",
});
