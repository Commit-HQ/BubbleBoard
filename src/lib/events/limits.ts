import * as publicEnv from '$env/static/public';

// How much of an event a teacher may prepare, set at build time in `.env` (see `.env.example`). The editor in
// the browser and the route that publishes hold to the same numbers, so these are PUBLIC_ variables, which the
// build writes into both. A namespace import lets a missing variable take its default instead of failing the
// bundler with a missing export. What an installation may keep in R2 altogether is set separately
// (src/lib/server/limits.ts): these caps bound one event, not the month's bill.

type Settings = {
	PUBLIC_EVENT_PHOTOS?: string;
	PUBLIC_EVENT_PHOTO_MB?: string;
};

/** A setting's number, within what phones and the free storage allowance can carry, or its default. */
function setting(name: keyof Settings, fallback: number, most: number) {
	const value = (publicEnv as Settings)[name];
	if (!value) return fallback;
	const number = /^\d+$/.test(value) ? Number(value) : NaN;
	if (!(number >= 1 && number <= most)) {
		throw new Error(
			`${name} must be a whole number between 1 and ${most}, such as ${fallback} (see .env.example).`
		);
	}
	return number;
}

/** How many photos one event may hold, which the server holds a publication to as well. */
export const maxEventPhotos = setting('PUBLIC_EVENT_PHOTOS', 30, 60);

/** The largest photo a teacher may choose, before this device prepares a smaller one for the event. */
export const maxEventPhotoBytes = setting('PUBLIC_EVENT_PHOTO_MB', 10, 50) * 1024 * 1024;

/**
 * The most a whole prepared gallery may take, in memory while it's being prepared and in storage afterwards.
 * A photo is packaged losslessly, so that a cover can never bleed into the pixels beside it, which leaves
 * around 5 MB for a photo of the size the editor works at: the room a gallery needs follows how many photos
 * it may hold, with enough left over for a detailed one.
 */
export const maxEventBytes = maxEventPhotos * 8 * 1024 * 1024;
