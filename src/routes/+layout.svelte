<script lang="ts">
	import '../app.css';
	import { Toaster } from '$lib/components/ui/sonner';

	let { children } = $props();
</script>

<Toaster position="top-center" />

<div class="h-screen w-screen flex items-center justify-center p-4">
	{@render children()}
</div>
