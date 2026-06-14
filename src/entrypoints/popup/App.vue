<script setup lang="ts">
import { browser, onMounted, ref } from "#imports";
import subaruImage from "@/assets/subaru_host_phone.jpg";
import usamiImage from "@/assets/usami_join_phone.jpg";
import { onMessage, sendMessage } from "@/messaging";

const PAGE_COUNT = 2;

const currentPage = ref(0);

const connectionStatus = ref(false);

const peerId = ref("");
const hostPeerId = ref("");

const movePage = (direction: 1 | -1) => {
	currentPage.value = (currentPage.value + direction + PAGE_COUNT) % PAGE_COUNT;
};

const refresh = async () => {
	peerId.value = await sendMessage("peer:refresh-id");
};

const openSettings = async () => {
	try {
		await browser.windows.create({
			url: browser.runtime.getURL("/settings.html"),
			type: "popup",
			width: 460,
			height: 680,
		});
	} catch (err) {
		console.error(err);
	}
};

const copy = async () => {
	try {
		await navigator.clipboard.writeText(peerId.value);
	} catch (err) {
		console.error(err);
	}
};

const paste = async () => {
	try {
		hostPeerId.value = await navigator.clipboard.readText();
	} catch (err) {
		console.error(err);
	}
};

const join = () => {
	if (!hostPeerId.value.trim()) return;
	sendMessage("peer:join", hostPeerId.value);
};

const disconnect = () => {
	sendMessage("peer:disconnect");
	peerId.value = "UNKNOWN";
	connectionStatus.value = false;
};

const initialize = async () => {
	peerId.value = await sendMessage("peer:id");
	connectionStatus.value = await sendMessage("peer:connection-status");
};

onMounted(async () => {
	await initialize();

	onMessage("peer:connection-change", (msg) => {
		connectionStatus.value = msg.data;
	});
});
</script>

<template>
	<div class="relative w-full max-w-90 overflow-hidden">
		<section
			id="handlebars"
			class="absolute top-4 left-1/2 z-50 flex w-full -translate-x-1/2 items-center justify-center gap-2 px-4 text-white"
		>
			<button
				class="flex h-10 items-center justify-center rounded-sm backdrop-blur-md transition-opacity hover:opacity-80"
				@click="movePage(-1)"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="2em"
					height="2em"
					viewBox="0 0 24 24"
				>
					<path
						fill="currentColor"
						d="m13.15 16.15l-3.625-3.625q-.125-.125-.175-.25T9.3 12t.05-.275t.175-.25L13.15 7.85q.075-.075.163-.112T13.5 7.7q.2 0 .35.138T14 8.2v7.6q0 .225-.15.363t-.35.137q-.05 0-.35-.15"
					/>
				</svg>
			</button>

			<div
				class="flex h-10 grow items-center justify-center rounded-sm backdrop-blur-md transition-all"
				:class="connectionStatus ? 'bg-green-500/40' : 'bg-red-500/40'"
			>
				<div class="flex items-center gap-2">
					<div
						class="size-2 rounded-full"
						:class="connectionStatus ? 'bg-green-300' : 'bg-red-300'"
					/>

					<span>
						{{ connectionStatus ? "Connected" : "Disconnected" }}
					</span>
				</div>
			</div>

			<div
				class="hover:opcaity-80 flex h-10 cursor-pointer items-center justify-center rounded-sm bg-red-500/40 px-2 backdrop-blur-md transition-opacity hover:bg-red-500/90"
				@click="disconnect"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="2em"
					height="2em"
					viewBox="0 0 24 24"
				>
					<path d="M0 0h24v24H0z" fill="none" />
					<path
						fill="currentColor"
						d="M10.5 21q-.425 0-.712-.288T9.5 20v-2l-2.925-2.925q-.275-.275-.425-.637T6 13.675V9q0-.6.275-1.125t.8-.8v2.8L2.1 4.9q-.275-.275-.275-.7t.275-.7t.7-.275t.7.275l17 17q.275.275.275.7t-.275.7t-.7.275t-.7-.275l-4.25-4.25l-.35.35v2q0 .425-.287.713T13.5 21zm6.65-6.7L8 5.15V4q0-.425.288-.712T9 3t.713.288T10 4v3h4V4q0-.425.288-.712T15 3t.713.288T16 4v4l-1-1h1q.825 0 1.413.588T18 9v3.625q0 .4-.15.763t-.425.637z"
					/>
				</svg>
			</div>

			<button
				class="flex h-10 items-center justify-center rounded-sm backdrop-blur-md transition-opacity hover:opacity-80"
				@click="movePage(1)"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="2em"
					height="2em"
					viewBox="0 0 24 24"
				>
					<path
						fill="currentColor"
						d="M10.5 16.3q-.2 0-.35-.137T10 15.8V8.2q0-.225.15-.362t.35-.138q.05 0 .35.15l3.625 3.625q.125.125.175.25t.05.275t-.05.275t-.175.25L10.85 16.15q-.075.075-.162.113t-.188.037"
					/>
				</svg>
			</button>
		</section>

		<div class="absolute top-18 left-1/2 z-50 flex -translate-x-1/2 gap-2">
			<div
				v-for="page in 2"
				:key="page"
				class="h-1 rounded-full transition-all duration-300"
				:class="currentPage === page - 1 ? 'w-8 bg-white' : 'w-2 bg-white/40'"
			/>
		</div>

		<div
			class="flex transition-transform duration-500 ease-out"
			:style="{
				transform: `translateX(-${currentPage * 100}%)`,
			}"
		>
			<section class="relative h-150 min-w-full">
				<img :src="subaruImage" class="relative h-150 min-w-full object-cover" />

				<div
					class="absolute inset-0 bg-linear-to-t from-blue-900/40 via-black/20 to-transparent"
				/>

				<section class="absolute bottom-0 flex w-full flex-col gap-2 p-4 pb-8">
					<div class="flex w-full items-center gap-2">
						<span class="text-white/80">Currently</span>

						<span
							class="rounded-md bg-blue-500 px-2 py-1"
							:class="connectionStatus && currentPage === 0 ? 'animate-pulse' : ''"
						>
							Hosting
						</span>

						<button
							class="ml-auto flex size-9 cursor-pointer items-center justify-center rounded-sm text-white/80 backdrop-blur-md transition-opacity hover:opacity-80"
							title="Settings"
							@click="openSettings"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="1.5em"
								height="1.5em"
								viewBox="0 0 24 24"
							>
								<path
									fill="currentColor"
									d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5s3.5 1.57 3.5 3.5s-1.57 3.5-3.5 3.5"
								/>
							</svg>
						</button>
					</div>

					<div
						class="min-w-0 cursor-pointer truncate rounded-sm p-2 text-white/80 backdrop-blur-md transition-opacity hover:opacity-80 active:opacity-60"
						@click="copy"
					>
						{{ peerId || "Generating peer ID..." }}
					</div>
					<div class="text-xs text-white/80">Click to copy</div>

					<button
						class="active:Scale-[0.98] flex w-full cursor-pointer items-center justify-center rounded-md bg-blue-500/40 p-2 font-medium transition-all hover:bg-blue-400"
						@click="refresh"
					>
						Refresh ID
					</button>
				</section>
			</section>

			<section class="relative h-150 min-w-full">
				<img :src="usamiImage" class="relative h-150 min-w-full object-cover" />

				<div
					class="absolute inset-0 bg-linear-to-t from-pink-900/10 via-black/20 to-transparent"
				/>

				<section class="absolute bottom-0 flex w-full flex-col gap-2 p-4 pb-8">
					<div class="inline-flex items-center gap-2">
						<span class="text-white/80">Currently</span>

						<span
							class="rounded-md bg-pink-500 px-2 py-1"
							:class="connectionStatus && currentPage === 1 ? 'animate-pulse' : ''"
						>
							Joining
						</span>
					</div>

					<input
						v-model="hostPeerId"
						class="rounded-sm p-2 text-white/80 backdrop-blur-md outline-none placeholder:text-white/50"
						placeholder="Paste peer ID"
						@click="paste"
					/>

					<button
						class="flex w-full items-center justify-center rounded-md p-2 font-medium transition-all"
						:class="
							hostPeerId?.trim()
								? 'cursor-pointer bg-pink-500 hover:bg-pink-400 active:scale-[0.98]'
								: 'cursor-not-allowed bg-pink-500/40'
						"
						:disabled="!hostPeerId?.trim()"
						@click="join"
					>
						Join Host
					</button>
				</section>
			</section>
		</div>
	</div>
</template>
