<script lang="ts">
	import { onMount } from 'svelte';
	import { isFormatCompatible, type AudioCodec } from '$lib/client/codec-support';
	import type { MediaFormatInfo } from '$lib/shared/MediaFormatInfo';

	type Props = {
		formatInfo: MediaFormatInfo | null;
		onCompatibilityChecked: (needsDownload: boolean) => void;
	};

	let { formatInfo, onCompatibilityChecked }: Props = $props();

	let isChecking = $state(true);
	let isCompatible = $state(false);
	let checkMessage = $state('Checking format compatibility...');

	onMount(() => {
		checkCompatibility();
	});

	function checkCompatibility() {
		if (!formatInfo) {
			// No format info available, assume we need to download
			checkMessage = 'Format information not available. Download required.';
			isCompatible = false;
			isChecking = false;
			onCompatibilityChecked(true);
			return;
		}

		if (!formatInfo.isLocalFileAvailable) {
			// File not available locally, must download
			checkMessage = 'Local file not available. Download required.';
			isCompatible = false;
			isChecking = false;
			onCompatibilityChecked(true);
			return;
		}

		// Check if browser can handle the format
		const compatible = isFormatCompatible(
			formatInfo.codec as unknown as import('$lib/client/codec-support').VideoCodec,
			formatInfo.container as unknown as import('$lib/client/codec-support').VideoContainer,
			formatInfo.audioCodec as AudioCodec | undefined
		);

		isCompatible = compatible;

		if (compatible) {
			checkMessage = `Format compatible: ${formatInfo.codec}/${formatInfo.container}${formatInfo.audioCodec ? `/${formatInfo.audioCodec}` : ''}. Using local file.`;
		} else {
			checkMessage = `Format not compatible: ${formatInfo.codec}/${formatInfo.container}${formatInfo.audioCodec ? `/${formatInfo.audioCodec}` : ''}. Download required.`;
		}

		isChecking = false;
		onCompatibilityChecked(!compatible);
	}
</script>

{#if isChecking}
	<div class="flex items-center gap-2 text-sm text-muted-foreground">
		<div class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
		<span>{checkMessage}</span>
	</div>
{:else}
	<div
		class="flex items-center gap-2 text-sm"
		class:text-green-600={isCompatible}
		class:text-yellow-600={!isCompatible}
	>
		{#if isCompatible}
			<i class="ph-bold ph-check-circle"></i>
		{:else}
			<i class="ph-bold ph-warning"></i>
		{/if}
		<span>{checkMessage}</span>
	</div>
{/if}
