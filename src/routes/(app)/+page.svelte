<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar';
	import * as Card from '$lib/components/ui/card';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import type { PageData } from './$types';

	type Props = {
		data: PageData;
	};

	let { data }: Props = $props();
	let user = $derived(data.user);
	let mediaFolders = $derived(data.mediaFolders);
</script>

<Card.Root class="h-3/4 w-3/4">
	<Card.Header class="flex flex-row gap-2 items-center">
		<Avatar.Root>
			<Avatar.Image src={user.jellyfinAvatarUrl} alt={user.jellyfinUserName} />
			<Avatar.Fallback>{user.jellyfinUserName.slice(0, 2)}</Avatar.Fallback>
		</Avatar.Root>
		<div class="flex flex-col">
			<Card.Title>
				{user.jellyfinUserName}
			</Card.Title>
			<Card.Description>
				Welcome {user.jellyfinUserName}!
			</Card.Description>
		</div>
	</Card.Header>
	<Separator class="mt-6 mb-6" />
	<Card.Content class="flex justify-center items-center">
		<div class="flex flex-col w-1/2 justify-evenly gap-2">
			<h1 class="text-2xl font-bold text-center">Create new clip!</h1>

			<Label class="mt-4">Paste in the jellyfin url of the movie/show</Label>
			<Input autofocus />
		</div>
	</Card.Content>
</Card.Root>
