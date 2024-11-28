<script lang="ts">
	import { page } from '$app/stores';
	import { DateRangeField } from 'bits-ui';
	import type { PageData } from './$types';
	import ClipPlayer from './clip-player.svelte';

	type Props = {
		data: PageData;
	};

	let { data }: Props = $props();

	const clipId = $page.params.clipId;
</script>

{#if !data.clip}
	<p>Loading...</p>
{:else}
	<ClipPlayer jellyfinAddress={data.serverAddress} creator={data.creator} clip={data.clip} />
{/if}
