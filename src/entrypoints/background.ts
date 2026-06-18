import { browser, defineBackground } from "#imports";
import { onMessage, sendMessage } from "@/messaging";
import { turnApiToken, turnKeyId } from "@/storage";
import type { Nullable } from "@/type";
import { DataConnection, Peer } from "peerjs";
import type { VideoData } from "./kwik.content";

// Used when the user hasn't configured Cloudflare TURN credentials. STUN alone
// works for most home connections, but fails behind strict firewalls / CGNAT.
const FALLBACK_ICE_SERVERS: RTCIceServer[] = [
	{ urls: "stun:stun.l.google.com:19302" },
];

/**
 * Generates short-lived ICE servers from the user's own Cloudflare TURN app.
 * Falls back to plain STUN if no credentials are set or the request fails, so
 * the extension still works for easy-NAT users instead of breaking entirely.
 */
async function fetchIceServers(): Promise<RTCIceServer[]> {
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
		// Cloudflare returns a single iceServers object; PeerJS expects an array.
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

interface MessageObject {
	type: string;
	[key: string]: any;
}
type MessageCallback<T extends MessageObject = MessageObject> = (
	message: T,
) => void;

export default defineBackground(() => {
	class PeerClient {
		public peer: Nullable<Peer> = null;
		public connection: Nullable<DataConnection> = null;
		public status: "HOST" | "JOIN" | "UNKNOWN" = "UNKNOWN";

		public animepaheTab: Nullable<number> = null;

		constructor() {
			this.createPeerClient();
			this.setupMessagingChannel();
			this.setupExtraListeners();
		}

		get peerId() {
			return this.peer?.id ?? "";
		}

		get connectionStatus() {
			return this.connection?.open ?? false;
		}

		private send(message: MessageObject) {
			if (!this.connection?.open) return;

			console.debug("[PEER OUT]", message);
			this.connection.send(message);
		}

		private setupMessagingChannel() {
			onMessage("peer:id", () => this.peerId);
			onMessage("peer:connection-status", () => this.connectionStatus);
			onMessage("peer:current-status", () => this.status);

			onMessage("peer:join", ({ data }) => {
				this.joinHostClient(data);
				return this.connectionStatus;
			});

			onMessage("peer:tab-id", (msg) => {
				if (this.animepaheTab) return;
				this.animepaheTab = msg.sender.tab?.id ?? null;
			});

			onMessage("animepahe:url-change", (msg) => {
				if (this.status !== "HOST") return;

				this.send({
					type: "url-sync",
					url: msg.data,
				});
			});

			onMessage("video:data-out", (msg) => {
				this.send(msg.data);
			});

			onMessage("peer:disconnect", () => {
				this.cleanupConnection();
				this.cleanupPeer();
			});

			onMessage("peer:refresh-id", async () => {
				await this.createPeerClient();
				return this.peerId;
			});
		}

		private setupExtraListeners() {
			// Extra listeners for animepahe synchronization
			browser.tabs.onRemoved.addListener((tabId) => {
				if (tabId === this.animepaheTab) {
					this.animepaheTab = null;
				}
			});

			browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
				if (
					tabId === this.animepaheTab &&
					tab.url &&
					!tab.url.includes("animepahe")
				) {
					this.animepaheTab = null;
				}
			});
		}

		private cleanupConnection() {
			this.connection?.close();
			this.connection = null;
		}

		private cleanupPeer() {
			this.cleanupConnection();
			this.peer?.destroy();
			this.peer = null;
		}

		private async createPeerClient() {
			this.cleanupPeer();

			const iceServers = await fetchIceServers();

			// When TURN is configured, force relay so ICE uses the stable
			// relay↔relay path instead of gambling on a flaky direct/symmetric-NAT
			// path that drops mid-session. Without creds, fall back to normal
			// behaviour (STUN/direct) so credential-less users still connect.
			const hasTurn = iceServers.some((server) => {
				const urls = Array.isArray(server.urls)
					? server.urls
					: [server.urls];
				return urls.some(
					(url) => url.startsWith("turn:") || url.startsWith("turns:"),
				);
			});

			const peer = new Peer({
				config: {
					iceServers,
					iceTransportPolicy: hasTurn ? "relay" : "all",
				},
			});

			this.peer = peer;
			this.setupPeerEvents(peer);

			await new Promise<void>((resolve, reject) => {
				peer.once("open", () => resolve());
				peer.once("error", reject);
			});
		}

		private setupPeerEvents(peer: Peer) {
			peer.on("close", () => {
				console.log("[PEER CLOSED]");
			});

			peer.on("connection", (connection) => {
				console.log("Incoming connection");

				this.status = "HOST";
				sendMessage("peer:status-change", this.status);

				this.attachConnection(connection);
			});
		}

		public joinHostClient(hostId: string) {
			const connection = this.peer?.connect(hostId);

			if (!connection) {
				throw new Error("Failed to create connection");
			}

			this.status = "JOIN";
			sendMessage("peer:status-change", this.status);
			this.attachConnection(connection);
		}

		private attachConnection(connection: DataConnection) {
			this.cleanupConnection();

			this.connection = connection;

			connection.on("open", () => {
				console.log("[CONNECTION OPENED]");

				// Diagnostics: log ICE state changes and, on each, which candidate
				// pair is actually in use (relay = TURN, host/srflx = direct).
				const pc = connection.peerConnection;
				pc?.addEventListener("iceconnectionstatechange", async () => {
					const state = pc.iceConnectionState;
					console.debug("[ICE STATE]", state);

					try {
						const stats = await pc.getStats();
						stats.forEach((report: any) => {
							if (report.type === "candidate-pair" && report.selected) {
								const local: any = stats.get(report.localCandidateId);
								const remote: any = stats.get(report.remoteCandidateId);
								console.debug("[ICE PAIR]", state, {
									local: local?.candidateType,
									remote: remote?.candidateType,
									protocol: local?.protocol,
								});
							}
						});
					} catch {
						// getStats can throw if the connection is already torn down.
					}
				});

				sendMessage("peer:connection-change", this.connectionStatus);
			});

			connection.on("close", () => {
				console.log("[CONNECTION CLOSED]");
				this.cleanupConnection();
				sendMessage("peer:connection-change", this.connectionStatus);
			});

			connection.on("error", console.error);

			connection.on("data", (data) => {
				const message = data as MessageObject;

				console.debug("[PEER IN]", message);

				this.handler[message.type]?.(message);
			});
		}

		private handler: Record<string, MessageCallback> = {
			"url-sync": async (message) => {
				if (!this.animepaheTab) return;

				await sendMessage(
					"animepahe:url-sync",
					message.url,
					this.animepaheTab,
				);
			},
			"data-in": async (message) => {
				if (!this.animepaheTab) return;
				sendMessage(
					"video:data-in",
					message as VideoData,
					this.animepaheTab,
				);
			},
		};
	}

	new PeerClient();
});
