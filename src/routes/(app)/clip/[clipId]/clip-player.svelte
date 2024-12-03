<script lang="ts">
	import type { MediaPlayerElement } from 'vidstack/elements';
	import type { Clip, User } from '$lib/types';
	import 'vidstack/bundle';
	import * as Card from '$lib/components/ui/card';
	import * as Avatar from '$lib/components/ui/avatar';

	type Props = {
		clip: Clip;
		creator: User;
		jellyfinAddress: string;
	};
	let player: MediaPlayerElement | null = $state(null);

	let { clip, creator, jellyfinAddress }: Props = $props();
</script>

<Card.Root>
	<Card.Header class="flex flex-row gap-2 items-center">
		<Avatar.Root>
			<Avatar.Image
				src="{jellyfinAddress}UserImage?UserId={creator.jellyfinUserId}"
				alt={creator.jellyfinUserName}
			/>
			<Avatar.Fallback>{creator.jellyfinUserName.slice(0, 2)}</Avatar.Fallback>
		</Avatar.Root>
		<div class="flex flex-col">
			<Card.Title>
				{clip.title}
			</Card.Title>
			<Card.Description>
				{creator.jellyfinUserName} -
				{clip.sourceTitle}
			</Card.Description>
		</div>
	</Card.Header>
	<Card.Content>
		<div class="flex flex-col w-full h-full max-h-[540px] max-w-[960px]">
			<media-player
				poster="/api/thumb/{clip.id}"
				posterLoad="eager"
				bind:this={player}
				title={clip?.title}
				streamType="on-demand"
				load="eager"
				autoPlay
				loop
			>
				<media-poster class="vds-poster" src="/api/thumb/{clip.id}"></media-poster>
				<media-provider>
					<source src="/videos/clips/{clip.id}.mp4" type="video/mp4" />
				</media-provider>
				<media-video-layout></media-video-layout>
			</media-player>
		</div>
	</Card.Content>
</Card.Root>
