<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import { formatSecondsAsDuration, formatTimestamp } from '$lib/utils';
	import { formatDuration, intervalToDuration } from 'date-fns';
	import { blur, fade } from 'svelte/transition';

	type Props = {
		clipStartSecs: number;
		clipEndSecs: number;
		fullDurationSecs: number;
		currentCursorPositionSecs: number;
		isPaused: boolean;
	};

	let {
		fullDurationSecs,
		clipEndSecs = $bindable(),
		clipStartSecs = $bindable(),
		currentCursorPositionSecs,
		isPaused
	}: Props = $props();

	let timelineStart = $state(0);
	let timelineEnd = $state(fullDurationSecs);

	// Zoom level of the timeline
	// 100 = 100% of the video is visible
	let visibleDurationPercentage = $state(100);
	const ZOOM_STEP = 10;

	/**
	 * Zoom in the timeline, showing less of the video
	 * the "center" should be the middle of the highlighted range
	 */
	const onZoomIn = () => {
		if (visibleDurationPercentage <= 10) return;

		visibleDurationPercentage -= ZOOM_STEP;
		const visibleDuration = (visibleDurationPercentage / 100) * fullDurationSecs;

		const clipMidpoint = (clipStartSecs + clipEndSecs) / 2;
		timelineStart = Math.max(0, clipMidpoint - visibleDuration / 2);
		timelineEnd = Math.min(fullDurationSecs, clipMidpoint + visibleDuration / 2);

		// Adjust startTime and endTime to fit within the new visible range
		startTime = Math.max(timelineStart, clipStartSecs);
		endTime = Math.min(timelineEnd, clipEndSecs);

		timeSegments = Array.from(
			{ length: Math.ceil(visibleDuration / 10) },
			(_, i) => timelineStart + i * 10
		);
	};

	const onZoomOut = () => {
		if (visibleDurationPercentage >= 100) return;

		visibleDurationPercentage += ZOOM_STEP;
		const visibleDuration = (visibleDurationPercentage / 100) * fullDurationSecs;

		const clipMidpoint = (clipStartSecs + clipEndSecs) / 2;
		timelineStart = Math.max(0, clipMidpoint - visibleDuration / 2);
		timelineEnd = Math.min(fullDurationSecs, clipMidpoint + visibleDuration / 2);

		// Adjust startTime and endTime to fit within the new visible range
		startTime = Math.max(timelineStart, clipStartSecs);
		endTime = Math.min(timelineEnd, clipEndSecs);

		timeSegments = Array.from(
			{ length: Math.ceil(visibleDuration / 10) },
			(_, i) => timelineStart + i * 10
		);
	};

	// Generate time segments every 5 seconds
	let timeSegments = $derived.by(() => {
		const segments = [];
		for (let i = 0; i < fullDurationSecs; i += 10) {
			segments.push(i);
		}
		return segments;
	});

	let startTime = $state(0);
	let endTime = $state(Math.min(fullDurationSecs, 30)); // Default range of 30 seconds
	let draggingHandle: 'start' | 'end' | 'full' | null = $state(null);

	let timelineEl = $state<HTMLDivElement | null>(null);
	let highlightEl = $state<HTMLDivElement | null>(null);

	function onMouseDown(handle: 'start' | 'end' | 'full', event: MouseEvent) {
		draggingHandle = handle;
		event.preventDefault();
	}

	const onMouseMove = $derived((event: MouseEvent) => {
		if (!timelineEl || !draggingHandle) return;
		const rect = timelineEl.getBoundingClientRect();

		const offsetX = event.clientX - rect.left;
		const percentage = Math.min(Math.max(offsetX / rect.width, 0), 1);
		const newTime = Math.round(percentage * (timelineEnd - timelineStart) + timelineStart);

		if (draggingHandle === 'start') {
			startTime = Math.min(newTime, endTime - 1);
			clipStartSecs = startTime;
		} else if (draggingHandle === 'end') {
			endTime = Math.max(newTime, startTime + 1);
			clipEndSecs = endTime;
		} else if (draggingHandle === 'full') {
			const halfRange = (endTime - startTime) / 2;
			startTime = Math.max(timelineStart, newTime - halfRange);
			endTime = Math.min(timelineEnd, newTime + halfRange);
			clipStartSecs = startTime;
			clipEndSecs = endTime;
		}
	});

	function onTouchStart(handle: 'start' | 'end' | 'full', event: TouchEvent) {
		event.preventDefault();
		draggingHandle = handle;
	}

	const onTouchMove = $derived((event: TouchEvent) => {
		if (!timelineEl || !draggingHandle) return;
		touchIsActive = true;
		const rect = timelineEl.getBoundingClientRect();
		const touch = event.touches[0];
		const offsetX = touch.clientX - rect.left;
		const percentage = Math.min(Math.max(offsetX / rect.width, 0), 1);
		const newTime = Math.round(percentage * (timelineEnd - timelineStart) + timelineStart);

		if (draggingHandle === 'start') {
			startTime = Math.min(newTime, endTime - 1);
			clipStartSecs = startTime;
		} else if (draggingHandle === 'end') {
			endTime = Math.max(newTime, startTime + 1);
			clipEndSecs = endTime;
		} else if (draggingHandle === 'full') {
			const halfRange = (endTime - startTime) / 2;
			startTime = Math.max(timelineStart, newTime - halfRange);
			endTime = Math.min(timelineEnd, newTime + halfRange);
			clipStartSecs = startTime;
			clipEndSecs = endTime;
		}
	});

	function onTouchEnd() {
		touchIsActive = false;
		draggingHandle = null;
	}

	function onMouseUp() {
		draggingHandle = null;
	}

	let touchIsActive = $state(false);
</script>

<svelte:window
	onmouseup={onMouseUp}
	onmousemove={onMouseMove}
	ontouchend={onTouchEnd}
	ontouchmove={onTouchMove}
/>

<div class="flex gap-2 mt-2">
	<Button variant="outline" onclick={onZoomIn} disabled={visibleDurationPercentage <= 10}>
		<i class="ph-bold ph-magnifying-glass-plus text-xl"></i>
	</Button>
	<Button variant="outline" onclick={onZoomOut} disabled={visibleDurationPercentage > 90}>
		<i class="ph-bold ph-magnifying-glass-minus text-xl"></i>
	</Button>
</div>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="flex h-12 relative w-full mb-4 py-1 border-solid border rounded-lg border-primary"
	bind:this={timelineEl}
>
	<!-- Time segments -->
	{#each timeSegments as segment, index (segment)}
		<div
			class="flex-1 h-full border-r border-primary-foreground"
			class:border-r-0={index === timeSegments.length - 1}
		></div>
	{/each}

	<!-- Highlighted range -->
	<div
		class="absolute peer top-0 bottom-0 border-solid border-y-2 border-primary bg-opacity-20 bg-primary cursor-move"
		style:left={`${((startTime - timelineStart) / (timelineEnd - timelineStart)) * 100}%`}
		style:right={`${100 - ((endTime - timelineStart) / (timelineEnd - timelineStart)) * 100}%`}
		onmousedown={(event) => onMouseDown('full', event)}
		ontouchstart={(event) => onTouchStart('full', event)}
		class:isActive={touchIsActive}
	></div>

	<!-- Start handle -->
	<div
		class="top-0 bottom-0 peer rounded-s-xl bg-primary cursor-ew-resize w-4 absolute flex items-center justify-center"
		style:left={`calc(${((startTime - timelineStart) / (timelineEnd - timelineStart)) * 100}% - 1rem)`}
		onmousedown={(event) => onMouseDown('start', event)}
		ontouchstart={(event) => onTouchStart('start', event)}
	>
		<i class="text-primary-foreground ph-bold ph-dots-six-vertical"></i>
	</div>

	<!-- End handle -->
	<div
		class="top-0 bottom-0 peer rounded-e-xl bg-primary cursor-ew-resize w-4 absolute flex items-center justify-center"
		style:left={`${((endTime - timelineStart) / (timelineEnd - timelineStart)) * 100}%`}
		onmousedown={(event) => onMouseDown('end', event)}
		ontouchstart={(event) => onTouchStart('end', event)}
	>
		<i class="text-primary-foreground ph-bold ph-dots-six-vertical"></i>
	</div>

	<!-- Tooltip -->
	<div
		class="absolute z-10 -bottom-14 bg-primary text-primary-foreground text-sm py-1 px-2 rounded shadow-md opacity-0 peer-[.isActive]:opacity-100 peer-active:opacity-100 peer-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center"
		style:left={`calc(${((startTime - timelineStart) / (timelineEnd - timelineStart)) * 100}% + ${((endTime - startTime) / (timelineEnd - timelineStart)) * 50}% - 2rem)`}
	>
		<div>{formatSecondsAsDuration(endTime - startTime)}</div>
		<div>
			{formatTimestamp(startTime)} - {formatTimestamp(endTime)}
		</div>
	</div>

	<!-- Playback position indicator -->
	<div
		class="absolute top-0 bottom-0 w-[2px] bg-red-500"
		style:left={`${Math.min(Math.max((currentCursorPositionSecs - timelineStart) / (timelineEnd - timelineStart), 0), 1) * 100}%`}
	>
		{#if !isPaused}
			<div
				transition:blur={{ duration: 150 }}
				class="absolute -top-6 bg-black text-white text-xs px-2 py-1 rounded"
				style:transform="translateX(-50%)"
			>
				{new Date(currentCursorPositionSecs * 1000).toISOString().slice(14, 19)}
			</div>
		{/if}
	</div>

	<!-- Hover effect outline -->
	<div
		class="absolute top-0 bottom-0 ring-purple-500 peer-[.isActive]:ring peer-hover:ring peer-active:ring rounded-xl transition duration-100 pointer-events-none"
		style:left={`calc(${((startTime - timelineStart) / (timelineEnd - timelineStart)) * 100}% - 1rem)`}
		style:right={`calc(${100 - ((endTime - timelineStart) / (timelineEnd - timelineStart)) * 100}% - 1rem)`}
	></div>

	<!-- Display start time of the timeline, considering current zoom -->
	<div class="absolute -bottom-6 -left-3 text-secondary text-xs py-1 rounded">
		{formatTimestamp(timelineStart)}
	</div>

	<!-- Display end time of the timeline, considering current zoom -->
	<div class="absolute -bottom-6 -right-3 text-secondary text-xs py-1 rounded">
		{formatTimestamp(timelineEnd)}
	</div>
</div>
