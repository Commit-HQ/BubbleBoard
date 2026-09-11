<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { messages } from '$lib/i18n';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	const t = $derived(messages[data.locale]);
</script>

<svelte:head>
	<title>BubbleBoard · {t.title}</title>
	<meta name="description" content={t.description} />
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="shell">
	<header class="header">
		<a class="brand" href="/" aria-label={t.home}
			><img src={favicon} alt="" width="40" height="40" />BubbleBoard</a
		>
		<div class="header-tools">
			<span class="preview-label">{t.preview}</span>
			<form class="language-switch" method="POST" action="/language" aria-label={t.language}>
				<button
					name="locale"
					value="hr"
					lang="hr"
					aria-label="Hrvatski"
					aria-pressed={data.locale === 'hr'}>HR</button
				>
				<button
					name="locale"
					value="en"
					lang="en"
					aria-label="English"
					aria-pressed={data.locale === 'en'}>EN</button
				>
			</form>
		</div>
	</header>
	<main id="main">
		<section class="welcome" aria-labelledby="welcome-title">
			<div class="intro">
				<span class="eyebrow">{t.eyebrow}</span>
				<h1 id="welcome-title">{t.heading}<br /><span>{t.headingAccent}</span></h1>
				<p class="lead">
					{t.lead}
				</p>
				<a class="primary" href="#getting-started">{t.cta} <span aria-hidden="true">↗</span></a>
				<p class="quiet">{t.quiet}</p>
			</div>
			<div class="classroom-card">
				<div class="card-top">
					<span class="group-icon" aria-hidden="true">B</span>
					<div>
						<span class="eyebrow">{t.classroom}</span>
						<h2>{t.welcome}</h2>
					</div>
				</div>
				<div class="bubble-field" aria-hidden="true">
					<span></span><span></span><span></span><span></span><span></span>
				</div>
				<div class="card-copy">
					<h3>{t.cardHeading}<br />{t.cardAccent}</h3>
					<p>{t.cardCopy}</p>
				</div>
				<div class="card-bottom">
					<span aria-hidden="true">✦</span>
					{t.community}
				</div>
			</div>
		</section>
		<section class="getting-started" id="getting-started" aria-labelledby="setup-title">
			<div>
				<span class="eyebrow">{t.simple}</span>
				<h2 id="setup-title">{t.setupTitle}</h2>
				<p>
					{t.setupCopy}
				</p>
			</div>
			<ol class="steps">
				<li>
					<span class="step-number">01</span>
					<div>
						<h3>{t.scanTitle}</h3>
						<p>{t.scanCopy}</p>
					</div>
				</li>
				<li>
					<span class="step-number">02</span>
					<div>
						<h3>{t.pushTitle}</h3>
						<p>{t.pushCopy}</p>
					</div>
				</li>
				<li>
					<span class="step-number">03</span>
					<div>
						<h3>{t.shareTitle}</h3>
						<p>{t.shareCopy}</p>
					</div>
				</li>
			</ol>
		</section>
		<aside class="development-note">
			<strong>{t.noticeTitle}</strong>
			{t.noticeCopy}
		</aside>
	</main>
	<footer><span>BubbleBoard</span><span>{t.footer}</span></footer>
</div>
