import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
	modules: ["@wxt-dev/module-vue"],
	imports: false,
	targetBrowsers: ["firefox", "chrome", "safari"],
	srcDir: "src",
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
		disabled: true,
	},
});
