<script lang="ts">
	let { onBack } = $props();
</script>

<div id="placeholder-container" class="placeholder-screen">
	<button id="back-to-menu-from-placeholder" class="back-btn" onclick={onBack}>
		← MENU
	</button>

	<div id="placeholder-card" class="card">
		<h1 id="placeholder-title">Under Construction</h1>
		<p id="placeholder-desc">This game will be available soon.</p>
		<div id="loading-dots" class="dots">
			<span></span>
			<span></span>
			<span></span>
		</div>
	</div>
</div>

<style>
	.placeholder-screen {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		position: relative;
	}

	.back-btn {
		position: absolute;
		top: 4vmin;
		left: 4vmin;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.6);
		padding: 1vmin 2.5vmin;
		border-radius: 1vmin;
		cursor: pointer;
		font-weight: 600;
		letter-spacing: 0.1vmin;
		transition: all 0.3s ease;
	}

	.back-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: white;
		border-color: rgba(255, 255, 255, 0.3);
	}

	.card {
		background: rgba(255, 255, 255, 0.03);
		padding: 8vmin;
		border-radius: 3vmin;
		border: 1px solid rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(20px);
		text-align: center;
		max-width: 50vmin;
	}

	h1 {
		font-size: 5vmin;
		font-weight: 800;
		margin-bottom: 2vmin;
		background: linear-gradient(to right, #6366f1, #a855f7);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	p {
		color: rgba(255, 255, 255, 0.6);
		font-size: 2.5vmin;
		margin-bottom: 4vmin;
	}

	.dots {
		display: flex;
		justify-content: center;
		gap: 1vmin;
	}

	.dots span {
		width: 1.5vmin;
		height: 1.5vmin;
		background: #a855f7;
		border-radius: 50%;
		animation: pulse 1.5s infinite ease-in-out;
	}

	.dots span:nth-child(2) { animation-delay: 0.2s; }
	.dots span:nth-child(3) { animation-delay: 0.4s; }

	@keyframes pulse {
		0%, 100% { transform: scale(0.8); opacity: 0.4; }
		50% { transform: scale(1.2); opacity: 1; }
	}
</style>
