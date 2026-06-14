<script setup lang="ts">
import { onMounted, ref } from "#imports";
import { turnApiToken, turnKeyId } from "@/storage";

const keyId = ref("");
const apiToken = ref("");
const showToken = ref(false);
const saved = ref(false);

onMounted(async () => {
	keyId.value = await turnKeyId.getValue();
	apiToken.value = await turnApiToken.getValue();
});

const save = async () => {
	await turnKeyId.setValue(keyId.value.trim());
	await turnApiToken.setValue(apiToken.value.trim());

	saved.value = true;
	setTimeout(() => {
		saved.value = false;
	}, 2000);
};

const clearAll = async () => {
	keyId.value = "";
	apiToken.value = "";
	await turnKeyId.setValue("");
	await turnApiToken.setValue("");
};
</script>

<template>
	<main class="min-h-screen w-full bg-[#0b1220] p-6 text-white">
		<header class="mb-6">
			<h1 class="text-xl font-semibold">Connection Settings</h1>
			<p class="mt-1 text-sm text-white/60">
				Add your own Cloudflare TURN credentials so syncing works behind strict
				firewalls and across regions.
			</p>
		</header>

		<section
			class="mb-6 rounded-md border border-white/10 bg-white/5 p-3 text-xs text-white/60"
		>
			<p class="mb-2 font-medium text-white/80">How to get these</p>
			<ol class="list-inside list-decimal space-y-1">
				<li>
					Open the Cloudflare dashboard →
					<span class="text-white/80">Realtime</span> →
					<span class="text-white/80">TURN</span>.
				</li>
				<li>Create a TURN app (the free tier is plenty for syncing metadata).</li>
				<li>Copy the <span class="text-white/80">Turn Token ID</span> and its <span class="text-white/80">API Token</span> below.</li>
			</ol>
			<a
				href="https://dash.cloudflare.com/?to=/:account/calls"
				target="_blank"
				rel="noopener noreferrer"
				class="mt-2 inline-block text-blue-300 underline hover:text-blue-200"
			>
				Open Cloudflare dashboard
			</a>
		</section>

		<form class="flex flex-col gap-4" @submit.prevent="save">
			<label class="flex flex-col gap-1">
				<span class="text-sm font-medium text-white/80">Turn Token ID</span>
				<input
					v-model="keyId"
					type="text"
					autocomplete="off"
					spellcheck="false"
					placeholder="e.g. 0123456789abcdef..."
					class="rounded-md border border-white/10 bg-white/5 p-2 text-sm outline-none placeholder:text-white/30 focus:border-blue-400/60"
				/>
			</label>

			<label class="flex flex-col gap-1">
				<span class="text-sm font-medium text-white/80">Turn API Token</span>
				<div class="relative">
					<input
						v-model="apiToken"
						:type="showToken ? 'text' : 'password'"
						autocomplete="off"
						spellcheck="false"
						placeholder="Secret token"
						class="w-full rounded-md border border-white/10 bg-white/5 p-2 pr-16 text-sm outline-none placeholder:text-white/30 focus:border-blue-400/60"
					/>
					<button
						type="button"
						class="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer text-xs text-white/50 hover:text-white/80"
						@click="showToken = !showToken"
					>
						{{ showToken ? "Hide" : "Show" }}
					</button>
				</div>
				<span class="text-xs text-white/40">
					Stored only in your browser. Never sent anywhere except Cloudflare.
				</span>
			</label>

			<div class="mt-2 flex items-center gap-3">
				<button
					type="submit"
					class="flex-1 cursor-pointer rounded-md bg-blue-500 p-2 text-sm font-medium transition-colors hover:bg-blue-400 active:scale-[0.99]"
				>
					{{ saved ? "Saved ✓" : "Save" }}
				</button>
				<button
					type="button"
					class="cursor-pointer rounded-md border border-white/10 px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/5"
					@click="clearAll"
				>
					Clear
				</button>
			</div>
		</form>
	</main>
</template>
