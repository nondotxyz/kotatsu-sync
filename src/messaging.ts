import { defineExtensionMessaging } from "@webext-core/messaging";
import type { VideoData } from "./entrypoints/kwik.content";

interface ProtocolMap {
	"peer:id": () => string;
	"peer:connection-status": () => boolean;
	"peer:connection-change": (status: boolean) => void;
	"peer:join": (hostPeerId: string) => boolean;
	"peer:current-status": () => string;
	"peer:status-change": (status: string) => void;
	"peer:tab-id": () => void;
	"peer:disconnect": () => void;
	"peer:refresh-id": () => string;

	"animepahe:url-change": (url: string) => void;
	"animepahe:url-sync": (url: string) => void;

	"video:data-out": (data: VideoData) => void;
	"video:data-in": (data: VideoData) => void;
}

export const { sendMessage, onMessage } =
	defineExtensionMessaging<ProtocolMap>();
