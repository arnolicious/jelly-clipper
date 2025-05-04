<script module lang="ts">
	type Props = {
		title?: string;
		description?: string;
		confirmText?: string;
	};
</script>

<script lang="ts">
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import Button from '../ui/button/button.svelte';

	let { title, description, confirmText }: Props = $props();

	let isOpen = $state(false);
	let confirmAction: (() => Promise<void>) | null = null;

	export function withConfirmation(func: () => Promise<void>) {
		isOpen = true;
		confirmAction = func;
	}

	const onConfirm = () => {
		isOpen = false;
		confirmAction?.();
	};
</script>

<AlertDialog.Root bind:open={isOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{title ?? 'Are you absolutely sure?'}</AlertDialog.Title>
			<AlertDialog.Description>
				{description ?? 'This action cannot be undone. This will permanently delete this clip.'}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action onclick={onConfirm}>
				{#snippet child({ props })}
					<Button {...props}>
						{confirmText ?? 'Yes, delete the clip!'}
					</Button>
				{/snippet}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
