<script lang="ts">
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import type { PageData } from './$types';

	// type Props = {
	// 	data: PageData;
	// };

	// let { data }: Props = $props();

	// https://jellyfin.domain.test/Items/:id/Download?api_key=:key
	let paramSourceUrl = $page.url.searchParams.get('sourceUrl');

	let sourceUrl = $state(paramSourceUrl ?? '');

	let href = $derived(
		sourceUrl.length === 0 ? undefined : `/create-clip/${encodeURIComponent(sourceUrl)}`
	);
</script>

<div class="flex flex-col w-1/2 justify-evenly gap-4">
	<h1 class="text-2xl font-bold text-center">Create new clip!</h1>

	<Label class="mt-4">Paste in the jellyfin url of the movie/show</Label>
	<Input autofocus bind:value={sourceUrl} />
	<Button data-sveltekit-preload-data="tap" {href} disabled={sourceUrl.length === 0}
		>Create Clip</Button
	>
</div>
