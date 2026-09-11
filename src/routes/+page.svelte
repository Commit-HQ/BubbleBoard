<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
</script>

<svelte:head>
	<title>BubbleBoard · A little closer to their day</title>
	<meta
		name="description"
		content="A simple space for kindergarten updates, photos, and conversations. BubbleBoard is currently in development."
	/>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="shell">
	<header class="header">
		<a class="brand" href="/" aria-label="BubbleBoard home"
			><img src={favicon} alt="" width="40" height="40" />BubbleBoard</a
		>
		<span class="preview-label">Early preview</span>
	</header>
	<main id="main">
		<section class="welcome" aria-labelledby="welcome-title">
			<div class="intro">
				<span class="eyebrow">LITTLE MOMENTS. SHARED TOGETHER.</span>
				<h1 id="welcome-title">A little closer<br />to <span>their day.</span></h1>
				<p class="lead">
					The news, the discoveries, the little things that made them smile. A place for your
					kindergarten to keep you in the loop.
				</p>
				<a class="primary" href="#getting-started"
					>Meet your classroom space <span aria-hidden="true">↗</span></a
				>
				<p class="quiet">Made for families. Inspired by the Bubbles.</p>
			</div>
			<div class="classroom-card">
				<div class="card-top">
					<span class="group-icon" aria-hidden="true">B</span>
					<div>
						<span class="eyebrow">YOUR CLASSROOM SPACE</span>
						<h2>Welcome, Bubbles.</h2>
					</div>
				</div>
				<div class="bubble-field" aria-hidden="true">
					<span></span><span></span><span></span><span></span><span></span>
				</div>
				<div class="card-copy">
					<h3>Big days.<br />Little updates.</h3>
					<p>A calmer way to stay connected to kindergarten life.</p>
				</div>
				<div class="card-bottom">
					<span aria-hidden="true">✦</span> A small space for your classroom community.
				</div>
			</div>
		</section>
		<section class="getting-started" id="getting-started" aria-labelledby="setup-title">
			<div>
				<span class="eyebrow">SIMPLE FROM THE START</span>
				<h2 id="setup-title">One card. Your classroom.</h2>
				<p>
					When BubbleBoard is ready, your teacher will give you a family QR card to get started.
				</p>
			</div>
			<ol class="steps">
				<li>
					<span class="step-number">01</span>
					<div>
						<h3>Scan your family card</h3>
						<p>No username or password to remember.</p>
					</div>
				</li>
				<li>
					<span class="step-number">02</span>
					<div>
						<h3>Turn on notifications</h3>
						<p>Hear when there’s something new to see.</p>
					</div>
				</li>
				<li>
					<span class="step-number">03</span>
					<div>
						<h3>Share in their day</h3>
						<p>Updates, photos, and a direct line to teachers.</p>
					</div>
				</li>
			</ol>
		</section>
		<aside class="development-note">
			<strong>We’re just getting started.</strong> This is a design preview. Classroom access, notifications,
			messaging, and photo sharing are not available yet. Please don’t enter personal information.
		</aside>
	</main>
	<footer><span>BubbleBoard</span><span>A little community. A lot of care.</span></footer>
</div>
