// The landing page's tour: the reel that lives with Commit's site (Commit-HQ/bubbleboard.fyi), encoded for
// the web into src/lib/assets/tour, and shown by src/lib/components/Tour.svelte. The browser takes the first
// file it can play whose screen query matches: AV1 in ten bits where it plays, which is smaller and keeps the
// reel's soft gradients smooth, then H.264, which plays everywhere; each at 1080p for dense screens wide enough
// to show it and at 720p for the rest, phones among them. src/lib/tour.test.ts checks these codecs against the files.

/** The tour's length, which its play button shows. */
export const tourSeconds = 72;

/** Screens on which 720p would be stretched: tablets and laptops with dense displays. */
export const largeScreens =
	'(min-width: 768px) and (min-resolution: 2dppx), (min-width: 1000px) and (min-resolution: 1.5dppx)';

export type TourSource = {
	/** The file's name after `tour-<locale>-`. */
	name: string;
	codec: 'av1' | 'h264';
	width: number;
	height: number;
	/** The video and audio codecs as a MIME type names them, so a browser skips a file it can't play. */
	video: string;
	audio: string;
	/** Roughly, in bits a second, for asking a browser whether it decodes the file smoothly. */
	bitrate: number;
};

export const tourSources: TourSource[] = [
	{
		name: '1080-av1',
		codec: 'av1',
		width: 1920,
		height: 1080,
		video: 'av01.0.09M.10',
		audio: 'opus',
		bitrate: 1_600_000
	},
	{
		name: '720-av1',
		codec: 'av1',
		width: 1280,
		height: 720,
		video: 'av01.0.08M.10',
		audio: 'opus',
		bitrate: 800_000
	},
	{
		name: '1080-h264',
		codec: 'h264',
		width: 1920,
		height: 1080,
		video: 'avc1.64002a',
		audio: 'mp4a.40.2',
		bitrate: 1_800_000
	},
	{
		name: '720-h264',
		codec: 'h264',
		width: 1280,
		height: 720,
		video: 'avc1.640020',
		audio: 'mp4a.40.2',
		bitrate: 900_000
	}
];

export const tourType = ({ video, audio }: TourSource) => `video/mp4; codecs="${video}, ${audio}"`;

/** The poster's widths in AVIF; WebP, for browsers without AVIF, is 1280 px wide. */
export const posterWidths = [640, 1280, 1920];
