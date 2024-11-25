<script lang="ts">
	type Props = {
		ballColor?: string;
		cubeColor?: string;
	};

	let { ballColor = '#ff3d00', cubeColor = '#fff' }: Props = $props();
</script>

<span class="loader" style="--ball-color: {ballColor}; --cube-color: {cubeColor}"></span>

<style>
	.loader {
		width: 50px;
		height: 165px;
		position: relative;
	}
	.loader::before {
		content: '';
		position: absolute;
		left: 50%;
		top: 0;
		transform: translate(-50%, 0);
		width: 16px;
		height: 16px;
		background: var(--ball-color);
		border-radius: 50%;
		animation: bounce 2s linear infinite;
	}
	.loader::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		margin: auto;
		height: 48px;
		width: 48px;
		background: var(--cube-color);
		border-radius: 4px;
		animation: rotate 2s linear infinite;
	}

	@keyframes bounce {
		0%,
		50%,
		100% {
			transform: translate(-50%, 0px);
			height: 20px;
		}
		20% {
			transform: translate(-25%, 85px);
			height: 28px;
		}
		25% {
			transform: translate(-25%, 110px);
			height: 12px;
		}
		70% {
			transform: translate(-75%, 85px);
			height: 28px;
		}
		75% {
			transform: translate(-75%, 108px);
			height: 12px;
		}
	}
	@keyframes rotate {
		0%,
		50%,
		100% {
			transform: rotate(0deg);
		}
		25% {
			transform: rotate(90deg);
		}
		75% {
			transform: rotate(-90deg);
		}
	}
</style>
