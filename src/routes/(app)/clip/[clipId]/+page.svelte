<script lang="ts">
	import type { PageData } from './$types';
	import ClipPlayer from './clip-player.svelte';

	type Props = {
		data: PageData;
	};

	let { data }: Props = $props();
</script>

{#if !data.clip}
	<p>Loading...</p>
{:else}
	<ClipPlayer
		currentUser={data.user}
		jellyfinAddress={data.serverAddress}
		creator={data.creator}
		clip={data.clip}
	/>
{/if}
