import { defineContentScript } from "#imports";
import { onMessage, sendMessage } from "@/messaging";
import type { Nullable } from "@/type";
import { debounce } from "@/utils";

type VideoEventMap = {
	play: {};
	pause: {};
	sync: {
		currentTime: number;
	};
};

export type VideoData = {
	[K in keyof VideoEventMap]: {
		type: "data-in";
		event: K;
	} & VideoEventMap[K];
}[keyof VideoEventMap];

export default defineContentScript({
	matches: ["*://*.kwik.cx/*"],
	allFrames: true,
	async main() {
		let syncInterval: Nullable<NodeJS.Timeout> = null;

		const videoPlayer =
			document.querySelector<HTMLVideoElement>("#kwikPlayer");

		if (!videoPlayer) return;

		let status = await sendMessage("peer:current-status");
		onMessage("peer:status-change", (msg) => {
			status = msg.data;
		});

		videoPlayer.addEventListener("play", () => {
			if (status !== "HOST") return;
			sendMessage("video:data-out", {
				type: "data-in",
				event: "play",
			});

			sendMessage("video:data-out", {
				type: "data-in",
				event: "sync",
				currentTime: videoPlayer.currentTime,
			});

			syncInterval ??= setInterval(() => {
				sendMessage("video:data-out", {
					type: "data-in",
					event: "sync",
					currentTime: videoPlayer.currentTime,
				});
			}, 2000);
		});

		videoPlayer.addEventListener("pause", () => {
			if (status !== "HOST") return;
			if (syncInterval) {
				clearInterval(syncInterval);
				syncInterval = null;
			}
			sendMessage("video:data-out", {
				type: "data-in",
				event: "pause",
			});
		});

		videoPlayer.addEventListener(
			"seeked",
			debounce(() => {
				if (status !== "HOST") return;
				sendMessage("video:data-out", {
					type: "data-in",
					event: "sync",
					currentTime: videoPlayer.currentTime,
				});
			}, 150),
		);

		onMessage("video:data-in", async (msg) => {
			const data = msg.data;
			console.log(data);

			switch (data.event) {
				case "play":
					videoPlayer.play();
					break;

				case "pause":
					videoPlayer.pause();
					break;

				case "sync":
					const delta = Math.abs(
						videoPlayer.currentTime - data.currentTime,
					);

					if (delta > 1) {
						videoPlayer.currentTime = data.currentTime;
					}
					break;
			}
		});
	},
});
