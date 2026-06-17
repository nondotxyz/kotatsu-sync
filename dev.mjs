import { cmd } from "web-ext";
import "dotenv/config";
import { spawn } from "node:child_process";

const sourceDir = ".output/firefox-mv2-dev";

cmd.run({
	sourceDir: sourceDir,
	firefox: process.env.FIREFOX_EXEC,
	firefoxProfile: process.env.FIREFOX_HOST_PROFILE,
	keepProfileChanges: true,
});
cmd.run({
	sourceDir: sourceDir,
	firefox: process.env.FIREFOX_EXEC,
	firefoxProfile: process.env.FIREFOX_JOIN_PROFILE,
	keepProfileChanges: true,
});
