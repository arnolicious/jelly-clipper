<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Form from '$lib/components/ui/form/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { toast } from 'svelte-sonner';
	import { setupFormSchema, type SetupFormSchema } from './schema';
	import {
		type SuperValidated,
		type Infer,
		superForm,
		type FormResult
	} from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { goto } from '$app/navigation';
	import { fade } from 'svelte/transition';
	import type { ActionData } from './$types';
	import { loginFormSchema, type LoginFormSchema } from '../login/schema';

	type Props = {
		setupForm: SuperValidated<Infer<SetupFormSchema>>;
		loginForm: SuperValidated<Infer<LoginFormSchema>>;
	};

	let { setupForm, loginForm: setupLoginForm }: Props = $props();

	const jellyfinServerForm = superForm(setupForm, {
		validators: zod4Client(setupFormSchema),
		resetForm: false,
		onSubmit: () => toast.loading('Checking Jellyfin server...', { id: 'server-check' }),
		onResult: ({ result }) => {
			if (result.type === 'success') {
				toast.success('Jellyfin server is valid!', { id: 'server-check' });
				return;
			}
		},
		onUpdate: ({ result }) => {
			if (result.type === 'failure') {
				toast.error('Could not find Jellyfin Server at that adress', { id: 'server-check' });
			}
		},
		onError: ({ result }) => toast.error(result.error.message, { id: 'server-check' })
	});

	const loginForm = superForm(setupLoginForm, {
		validators: zod4Client(loginFormSchema),
		onSubmit: ({ formData, validators }) => {
			if ($setupMessage?.status !== 'success' || !$setupMessage.data) {
				validators(false);
				return;
			}
			formData.set('serverUrl', $setupMessage.data);
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
				return;
			}
		},
		onError: ({ result }) => toast.error(result.error.message, { id: 'login-check' })
	});

	const {
		form: setupFormData,
		enhance: setupEnhance,
		submitting: setupSubmitting,
		message: setupMessage
	} = jellyfinServerForm;

	const {
		form: setupLoginFormData,
		enhance: setupLoginEnhance,
		submitting: setupLoginSubmitting
	} = loginForm;

	let isInLoginStep = $derived($setupMessage?.status === 'success' && !!$setupMessage.data);
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Setup Jelly-Clipper</Card.Title>
		<Card.Description>
			Jelly-Clipper has not been setup yet. Please provide the Jellyfin URL to get started.
		</Card.Description>
	</Card.Header>
	<Card.Content>
		<form method="POST" action="?/setup" use:setupEnhance>
			<Form.Field form={jellyfinServerForm} name="jellyfinServerUrl">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>Jellyfin server address</Form.Label>
						<Input
							{...props}
							bind:value={$setupFormData.jellyfinServerUrl}
							disabled={isInLoginStep}
						/>
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>

			{#if !isInLoginStep}
				<Form.Button class="mt-4" disabled={$setupSubmitting}>
					{#if $setupSubmitting}
						Checking...
					{:else}
						Submit
					{/if}
				</Form.Button>
			{/if}
		</form>
		{#if isInLoginStep}
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
		{/if}
	</Card.Content>
</Card.Root>
