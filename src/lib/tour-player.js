// The landing page's tour (src/lib/components/Tour.svelte) where scripts run. Landing pages run no app code,
// so this is a small file of its own, which the component links as is; without it, the tour's button is a
// link to a copy of the video that the browser plays itself.
//
// It opens the tour in a dialog over the page and plays it, closes it from its button, the Escape key, or a
// click beside it, pausing as it does, and picks the file to play more carefully than markup can: 720p for a
// browser that asks to save data, and H.264 where AV1 would be decoded in software, which costs a phone's
// battery and can stutter, rather than in hardware.

const dialog = document.querySelector('dialog[data-tour]');
const video = dialog?.querySelector('video');
const link = document.querySelector('[data-tour-link]');
const open = document.querySelector('[data-tour-open]');

if (dialog && video && link && open) {
	// The browser chose its file when the page loaded, and chooses again from what's left when the video is
	// loaded anew, which waits for the dialog: a browser loads a video it's told to load, whatever its `preload`.
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

	link.hidden = true;
	open.hidden = false;
	open.addEventListener('click', () => {
		dialog.showModal();
		if (changed) video.load();
		changed = false;
		video.play().catch(() => {});
	});
	dialog.querySelector('[data-tour-close]')?.addEventListener('click', () => dialog.close());
	// A click on the dialog itself, not on what's in it, is on the dim page around it.
	dialog.addEventListener('click', (event) => {
		if (event.target === dialog) dialog.close();
	});
	dialog.addEventListener('close', () => video.pause());
}
