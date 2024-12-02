<script lang="ts">
	type Props = {
		onStartTimeChange: (value: number) => void;
		onEndTimeChange: (value: number) => void;
		fullDurationSecs: number;
	};

	let { onEndTimeChange, onStartTimeChange, fullDurationSecs }: Props = $props();

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
	let draggingHandle: 'start' | 'end' | null = $state(null);

	let sliderEl = $state<HTMLDivElement | null>(null);

	function onMouseDown(handle: 'start' | 'end', event: MouseEvent) {
		console.log('onMouseDown', handle);
		draggingHandle = handle;
		event.preventDefault();
	}

	const onMouseMove = $derived((event: MouseEvent) => {
		if (!sliderEl || !draggingHandle) return;
		const rect = sliderEl.getBoundingClientRect();
		const offsetX = event.clientX - rect.left;
		const percentage = Math.min(Math.max(offsetX / rect.width, 0), 1);
		const newTime = Math.round(percentage * fullDurationSecs);

		if (draggingHandle === 'start') {
			startTime = Math.min(newTime, endTime - 1);
			onStartTimeChange(startTime);
		} else if (draggingHandle === 'end') {
			endTime = Math.max(newTime, startTime + 1);
			onEndTimeChange(endTime);
		}
	});

	function onTouchStart(handle: 'start' | 'end', event: TouchEvent) {
		event.preventDefault();
		draggingHandle = handle;
	}

	const onTouchMove = $derived((event: TouchEvent) => {
		if (!sliderEl || !draggingHandle) return;
		const rect = sliderEl.getBoundingClientRect();
		const touch = event.touches[0];
		const offsetX = touch.clientX - rect.left;
		const percentage = Math.min(Math.max(offsetX / rect.width, 0), 1);
		const newTime = Math.round(percentage * fullDurationSecs);

		if (draggingHandle === 'start') {
			startTime = Math.min(newTime, endTime - 1);
			onStartTimeChange(startTime);
		} else if (draggingHandle === 'end') {
			endTime = Math.max(newTime, startTime + 1);
			onEndTimeChange(endTime);
		}
	});

	function onTouchEnd() {
		draggingHandle = null;
	}

	function onMouseUp() {
		draggingHandle = null;
	}
</script>

<svelte:window
	onmouseup={onMouseUp}
	onmousemove={onMouseMove}
	ontouchend={onTouchEnd}
	ontouchmove={onTouchMove}
/>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="flex h-12 relative w-[960px] my-4 py-1 border-solid border rounded-lg border-primary"
	bind:this={sliderEl}
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
		class="absolute peer top-0 bottom-0 border-solid border-y-2 border-primary bg-opacity-20 bg-primary"
		style:left={`${(startTime / fullDurationSecs) * 100}%`}
		style:right={`${100 - (endTime / fullDurationSecs) * 100}%`}
	></div>

	<!-- Start handle -->
	<div
		class="top-0 bottom-0 peer rounded-s-xl bg-primary cursor-ew-resize w-4 absolute flex items-center justify-center"
		style:left={`calc(${(startTime / fullDurationSecs) * 100}% - 1rem)`}
		onmousedown={(event) => onMouseDown('start', event)}
		ontouchstart={(event) => onTouchStart('start', event)}
	>
		<i class="text-primary-foreground ph-bold ph-dots-six-vertical"></i>
	</div>

	<!-- End handle -->
	<div
		class="top-0 bottom-0 peer rounded-e-xl bg-primary cursor-ew-resize w-4 absolute flex items-center justify-center"
		style:left={`${(endTime / fullDurationSecs) * 100}%`}
		onmousedown={(event) => onMouseDown('end', event)}
		ontouchstart={(event) => onTouchStart('end', event)}
	>
		<i class="text-primary-foreground ph-bold ph-dots-six-vertical"></i>
	</div>

	<!-- Tooltip -->
	<div
		class="absolute -bottom-14 bg-primary text-primary-foreground text-sm py-1 px-2 rounded shadow-md opacity-0 peer-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center"
		style:left={`calc(${(startTime / fullDurationSecs) * 100}% + ${(endTime / fullDurationSecs - startTime / fullDurationSecs) * 50}% - 2rem)`}
	>
		<div>{Math.floor(endTime - startTime)}s</div>
		<div>
			{new Date(startTime * 1000).toISOString().slice(14, 19)} - {new Date(endTime * 1000)
				.toISOString()
				.slice(14, 19)}
		</div>
	</div>

	<!-- Hover effect outline -->
	<div
		class="absolute top-0 bottom-0 ring-purple-500 peer-hover:ring peer-active:ring rounded-xl transition duration-100 pointer-events-none"
		style:left={`calc(${(startTime / fullDurationSecs) * 100}% - 1rem)`}
		style:right={`calc(${100 - (endTime / fullDurationSecs) * 100}% - 1rem)`}
	></div>
</div>
