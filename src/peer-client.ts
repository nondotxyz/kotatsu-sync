import { onMessage, sendMessage } from "@/messaging";
import type { Nullable } from "@/type";
import { DataConnection, Peer } from "peerjs";
import type { VideoData } from "./entrypoints/kwik.content";

interface MessageObject {
	type: string;
	[key: string]: any;
}
type MessageCallback<T extends MessageObject = MessageObject> = (
	message: T,
) => void;

function hasTurnServer(iceServers: RTCIceServer[]): boolean {
	return iceServers.some((server) => {
		const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
		return urls.some(
			(url) => url.startsWith("turn:") || url.startsWith("turns:"),
		);
	});
}


export interface PeerHost {
	syncUrlToTab(url: string): void;
	sendDataToTab(data: VideoData): void;

	getIceServers(): Promise<RTCIceServer[]>;
}


export class PeerClient {
	public peer: Nullable<Peer> = null;
	public connection: Nullable<DataConnection> = null;
	public status: "HOST" | "JOIN" | "UNKNOWN" = "UNKNOWN";

	constructor(private host: PeerHost) {
		this.createPeerClient().catch((err) =>
			console.error("[PEER] Failed to initialise peer:", err),
		);
		this.setupMessagingChannel();
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

		const iceServers = await this.host.getIceServers();

		const peer = new Peer({
			config: {
				iceServers,
				iceTransportPolicy: hasTurnServer(iceServers) ? "relay" : "all",
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
		"url-sync": (message) => {
			this.host.syncUrlToTab(message.url);
		},
		"data-in": (message) => {
			this.host.sendDataToTab(message as VideoData);
		},
	};
}
