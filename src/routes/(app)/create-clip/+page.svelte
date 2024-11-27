<script lang="ts">
	import { navigating, page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';

	let paramSourceUrl = $page.url.searchParams.get('sourceUrl');

	let sourceUrl = $state(paramSourceUrl ?? '');

	let isNavigating = $derived($navigating !== null);

	let href = $derived(
		sourceUrl.length === 0 || isNavigating
			? undefined
			: `/create-clip/${encodeURIComponent(sourceUrl)}`
	);

	let buttonIsDisabled = $derived(isNavigating || sourceUrl.length === 0);
</script>

<div class="flex flex-col w-1/2 justify-evenly gap-4">
	<h1 class="text-2xl font-bold text-center">Create new clip!</h1>

	<Label class="mt-4">Paste in the jellyfin url of the movie/show</Label>
	<Input autofocus bind:value={sourceUrl} />
	<Button data-sveltekit-preload-data="off" {href} disabled={buttonIsDisabled}>
		{#if isNavigating}
			Loading...
		{:else}
			Create Clip
		{/if}
	</Button>
</div>
