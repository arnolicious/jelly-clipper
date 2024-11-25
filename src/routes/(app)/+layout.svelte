<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Avatar from '$lib/components/ui/avatar';
	import type { LayoutData } from './$types';
	import Separator from '$lib/components/ui/separator/separator.svelte';

	type Props = {
		children: Snippet;
		data: LayoutData;
	};

	let { children, data }: Props = $props();
</script>

<Card.Root class="h-4/5 w-10/12 flex flex-col">
	<Card.Header class="flex flex-row gap-2 items-center">
		<Avatar.Root>
			<Avatar.Image
				src="{data.serverAddress}UserImage?UserId={data.user.jellyfinUserId}"
				alt={data.user.jellyfinUserName}
			/>
			<Avatar.Fallback>{data.user.jellyfinUserName.slice(0, 2)}</Avatar.Fallback>
		</Avatar.Root>
		<div class="flex flex-col">
			<Card.Title>
				{data.user.jellyfinUserName}
			</Card.Title>
			<Card.Description>
				Welcome {data.user.jellyfinUserName}!
			</Card.Description>
		</div>
	</Card.Header>
	<Separator class="mt-6" />
	<Card.Content class="flex flex-col justify-center items-center h-full pt-6">
		{@render children()}
	</Card.Content>
</Card.Root>
