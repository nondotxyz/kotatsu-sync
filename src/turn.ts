import { turnApiToken, turnKeyId } from "@/storage";


export const FALLBACK_ICE_SERVERS: RTCIceServer[] = [
	{ urls: "stun:stun.l.google.com:19302" },
];


export async function fetchIceServers(): Promise<RTCIceServer[]> {
	const keyId = (await turnKeyId.getValue()).trim();
	const apiToken = (await turnApiToken.getValue()).trim();

	if (!keyId || !apiToken) {
		console.warn("[TURN] No Cloudflare credentials set — using STUN only.");
		return FALLBACK_ICE_SERVERS;
	}

	try {
		const res = await fetch(
			`https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${apiToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ ttl: 86400 }),
			},
		);

		if (!res.ok) {
			console.error(
				"[TURN] Failed to generate ICE servers:",
				res.status,
				await res.text(),
			);
			return FALLBACK_ICE_SERVERS;
		}

		const data = await res.json();
		const iceServers: RTCIceServer[] = Array.isArray(data.iceServers)
			? data.iceServers
			: [data.iceServers];

		const urls = iceServers.flatMap((s) =>
			Array.isArray(s.urls) ? s.urls : [s.urls],
		);
		console.debug("[TURN] Using Cloudflare ICE servers:", urls);
		return iceServers;
	} catch (err) {
		console.error("[TURN] Error generating ICE servers:", err);
		return FALLBACK_ICE_SERVERS;
	}
}

