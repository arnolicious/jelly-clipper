<script lang="ts">
	import type { PageData } from './$types.js';
	import SetupForm from './setup-form.svelte';

	type Props = {
		data: PageData;
	};

	let { data }: Props = $props();
</script>

<SetupForm setupForm={data.setupForm} loginForm={data.setupLoginForm} />
