// The landing page's tour (src/lib/components/Tour.svelte) where scripts run. Landing pages run no app code,
// so this is a small file of its own, which the component links as is; without it the video still plays,
// with the browser's own controls.
//
// It puts the page's play button in place of those controls until the video starts, and picks the file to
// play more carefully than markup can: 720p for a browser that asks to save data, and H.264 where AV1 would
// be decoded in software, which costs a phone's battery and can stutter, rather than in hardware.

for (const tour of document.querySelectorAll('[data-tour]')) {
	const video = tour.querySelector('video');
	const button = tour.querySelector('button');
	if (!video || !button) continue;

	// The browser chose its file when the page loaded, and chooses again from what's left when the video is
	// loaded anew, which waits for play: a browser loads a video it's told to load, whatever its `preload`.
	let changed = false;
	const drop = (source) => {
		source.remove();
		changed = true;
	};

	if (navigator.connection?.saveData) video.querySelectorAll('source[media]').forEach(drop);

	// Some browsers play AV1 only in software and H.264 not at all, such as Firefox on Linux without the
	// system's codecs, and there AV1 stays.
	const h264 = video.querySelector('source[data-codec="h264"]');
	if (navigator.mediaCapabilities && h264 && video.canPlayType(h264.type)) {
		for (const source of video.querySelectorAll('source[data-codec="av1"]')) {
			navigator.mediaCapabilities
				.decodingInfo({
					type: 'file',
					video: {
						contentType: `video/mp4; codecs="${source.dataset.video}"`,
						width: Number(source.dataset.width),
						height: Number(source.dataset.height),
						bitrate: Number(source.dataset.bitrate),
						framerate: 60
					}
				})
				.then((info) => {
					if (info.supported && !info.powerEfficient) drop(source);
				})
				// A browser that can't say keeps the file, and skips it if it can't play it.
				.catch(() => {});
		}
	}

	video.controls = false;
	button.hidden = false;
	const reveal = () => {
		button.hidden = true;
		video.controls = true;
	};
	// Played another way, such as from the browser's menu for the video.
	video.addEventListener('play', reveal, { once: true });
	button.addEventListener('click', () => {
		reveal();
		video.focus({ preventScroll: true });
		if (changed) video.load();
		video.play().catch(() => {});
	});
}
