import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
	modules: ["@wxt-dev/module-vue"],
	imports: false,
	targetBrowsers: ["firefox", "chrome", "safari"],
	srcDir: "src",
	manifest: ({ browser }) => ({
		browser_specific_settings: {
			gecko: {
				id: "kotatsu-sync@nondotxyz",
				data_collection_permissions: {
					required: ["none"],
				},
			},
		},
		// "offscreen" hosts the WebRTC peer on Chromium (its service-worker
		// background has no WebRTC); Firefox doesn't need or support it.
		permissions:
			browser === "firefox" ? ["storage"] : ["storage", "offscreen"],

		// Lets the background script call Cloudflare's TURN API without CORS issues.
		host_permissions: ["https://rtc.live.cloudflare.com/*"],
	}),
	vite: ({ mode }) => ({
		plugins: [
			tailwindcss({
				optimize: true,
			}),
		],
		build: {
			sourcemap: true,
		},
	}),
	webExt: {
		disabled: Boolean(process.env.WEBEXT_DISABLED) ?? false,
	},
});
