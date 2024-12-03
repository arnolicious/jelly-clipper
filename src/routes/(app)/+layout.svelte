<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Avatar from '$lib/components/ui/avatar';
	import type { LayoutData } from './$types';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { page } from '$app/stores';

	type Props = {
		children: Snippet;
		data: LayoutData;
	};

	let { children, data }: Props = $props();
</script>

<Card.Root class="flex-1 flex flex-col h-full">
	<Card.Header class="flex flex-row gap-2 items-center justify-between relative pt-3">
		<Button
			variant="ghost"
			href="/my-clips"
			class="py-8 flex flex-row gap-2 items-center justify-between"
		>
			<Avatar.Root>
				<Avatar.Image
					src="{data.serverAddress}UserImage?UserId={data.user.jellyfinUserId}"
					alt={data.user.jellyfinUserName}
				/>
				<Avatar.Fallback>{data.user.jellyfinUserName.slice(0, 2)}</Avatar.Fallback>
			</Avatar.Root>
			<div class=" flex-col hidden md:flex">
				<Card.Title>My clips</Card.Title>
				<Card.Description>
					Welcome {data.user.jellyfinUserName}!
				</Card.Description>
			</div>
		</Button>
		<span></span>
		{#if !$page.url.pathname.includes('create-clip')}
			<Button variant="secondary" href="/" class="text-xl">
				<i class="ph-bold ph-plus"></i>
				Create new clip
			</Button>
		{/if}
	</Card.Header>
	<Separator class="mt-3" />
	<Card.Content class="flex flex-col justify-evenly items-center h-full overflow-auto">
		{@render children()}
	</Card.Content>
</Card.Root>
