<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Form from '$lib/components/ui/form/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { toast } from 'svelte-sonner';
	import {
		type SuperValidated,
		type Infer,
		superForm,
		type FormResult
	} from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { goto } from '$app/navigation';
	import { fade } from 'svelte/transition';
	import type { ActionData, PageData } from './$types';
	import { loginFormSchema, type LoginFormSchema } from '../login/schema';

	type Props = {
		data: PageData;
	};

	let { data }: Props = $props();

	const loginForm = superForm(data.loginForm, {
		validators: zodClient(loginFormSchema),
		onSubmit: () => {
			toast.loading('Logging in...', { id: 'login-check' });
		},
		onUpdate: ({ result }) => {
			if (result.type === 'failure') {
				toast.error('Could not log in with the provided credentials', { id: 'login-check' });
				return;
			}

			if (result.type === 'success') {
				const action = result.data as FormResult<ActionData>;
				toast.success(`Welcome ${action.user?.Name}`, {
					id: 'login-check',
					description: 'Successfully logged in.'
				});
				goto('/');
				console.log('goto /');
				return;
			}
		},
		onError: ({ result }) => toast.error(result.error.message, { id: 'login-check' })
	});

	const {
		form: setupLoginFormData,
		enhance: setupLoginEnhance,
		submitting: setupLoginSubmitting
	} = loginForm;
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Setup Jelly-Clipper</Card.Title>
		<Card.Description>
			Jelly-Clipper has not been setup yet. Please provide the Jellyfin URL to get started.
		</Card.Description>
	</Card.Header>
	<Card.Content>
		<form method="POST" action="?/login" use:setupLoginEnhance transition:fade>
			<Form.Field form={loginForm} name="username">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>Jellyfin Username</Form.Label>
						<Input {...props} bind:value={$setupLoginFormData.username} autofocus />
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>

			<Form.Field form={loginForm} name="password">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>Jellyfin Password</Form.Label>
						<Input {...props} bind:value={$setupLoginFormData.password} type="password" />
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>

			<Form.Button disabled={$setupLoginSubmitting}>
				{#if $setupLoginSubmitting}
					Logging in...
				{:else}
					Submit
				{/if}
			</Form.Button>
		</form>
	</Card.Content>
</Card.Root>
