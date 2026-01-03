<script>
	import { page } from '$app/state';
</script>

<div>
	<h1>Sorry, something went wrong</h1>
	<pre>{page.status}: {page.error?.message}</pre>
</div>

<style>
	div,
	div > * {
		max-width: 80vw;
	}
</style>
