<script lang="ts">
	import videojs from 'video.js';
	import 'video.js/dist/video-js.css';

	type Props = {
		sourceId: string;
	};

	let { sourceId }: Props = $props();
</script>

<!-- svelte-ignore a11y_media_has_caption -->
<video autoplay>
	<source src="/api/files/original/{sourceId}" type="video/mp4" />
</video>
