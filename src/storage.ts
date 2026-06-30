import { storage } from "#imports";

/*
 * See: https://developers.cloudflare.com/realtime/turn/generate-credentials/
 * User provided Credentials
 */
export const turnKeyId = storage.defineItem<string>("local:turnKeyId", {
	fallback: "",
});

export const turnApiToken = storage.defineItem<string>("local:turnApiToken", {
	fallback: "",
});
