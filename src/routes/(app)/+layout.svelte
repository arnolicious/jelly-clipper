<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Avatar from '$lib/components/ui/avatar';
	import type { LayoutData } from './$types';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import Button from '$lib/components/ui/button/button.svelte';

	type Props = {
		children: Snippet;
		data: LayoutData;
	};

	let { children, data }: Props = $props();
</script>

<Card.Root class="flex-1 flex flex-col h-full">
	<Card.Header class="flex flex-row gap-2 items-center justify-between relative">
		<div class="absolute left-6 flex flex-row gap-2 items-center justify-between">
			<Avatar.Root>
				<Avatar.Image
					src="{data.serverAddress}UserImage?UserId={data.user.jellyfinUserId}"
					alt={data.user.jellyfinUserName}
				/>
				<Avatar.Fallback>{data.user.jellyfinUserName.slice(0, 2)}</Avatar.Fallback>
			</Avatar.Root>
			<div class=" flex-col hidden md:flex">
				<Card.Title>
					{data.user.jellyfinUserName}
				</Card.Title>
				<Card.Description>
					Welcome {data.user.jellyfinUserName}!
				</Card.Description>
			</div>
		</div>
		<span></span>
		<Button variant="secondary" href="/" class="text-xl">🎬 Jelly-Clipper 🪼</Button>
		<span></span>
	</Card.Header>
	<Separator class="mt-6" />
	<Card.Content class="flex flex-col justify-evenly items-center h-full">
		{@render children()}
	</Card.Content>
</Card.Root>
