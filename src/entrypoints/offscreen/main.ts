import { sendMessage } from "@/messaging";
import { PeerClient, type PeerHost } from "@/peer-client";


const host: PeerHost = {
	syncUrlToTab: (url) => sendMessage("offscreen:url-sync", url),
	sendDataToTab: (data) => sendMessage("offscreen:data-in", data),
	getIceServers: async () => {
		try {
			return await sendMessage("offscreen:get-ice-servers");
		} catch {
		
			return [{ urls: "stun:stun.l.google.com:19302" }];
		}
	},
};

new PeerClient(host);
