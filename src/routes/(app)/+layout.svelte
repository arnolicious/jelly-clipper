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

<Card.Root class="h-3/4 w-3/4">
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
	<Separator class="mt-6 mb-6" />
	<Card.Content class="flex justify-center items-center">
		{@render children()}
	</Card.Content>
</Card.Root>
