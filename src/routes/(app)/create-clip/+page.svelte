<script lang="ts">
	import { navigating, page } from '$app/state';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import type { PageData } from './$types';

	type Props = {
		data: PageData;
	};
	let { data }: Props = $props();

	let paramSourceUrl = page.url.searchParams.get('sourceUrl');

	let sourceUrl = $state(paramSourceUrl ?? '');

	let isNavigating = $derived(!!navigating.to);

	let href = $derived(
		sourceUrl.length === 0 || isNavigating ? undefined : `/prepare-clip/${encodeURIComponent(sourceUrl)}`
	);

	let buttonIsDisabled = $derived(isNavigating || sourceUrl.length === 0);
</script>

<div class="flex flex-col h-full w-1/2 justify-evenly gap-4">
	<div class="flex flex-col gap-4">
		<h1 class="text-2xl font-bold text-center">Welcome to Jelly-Clipper!</h1>
		<h3 class="text-lg text-center">Create clips from your favorite movies and shows</h3>
	</div>
	<div class="flex flex-col gap-4">
		<Label class="text-sm text-slate-400">
			In <a class="text-secondary underline" target="_blank" href={data.serverAddress}>Jellyfin</a>
			click on the 3 dots on the item in the library, then "Copy Stream URL" and paste in here
		</Label>
		<Input autofocus bind:value={sourceUrl} />
		<Button data-sveltekit-preload-data="off" {href} disabled={buttonIsDisabled}>
			{#if isNavigating}
				Loading...
			{:else}
				Create Clip
			{/if}
		</Button>
	</div>
</div>
