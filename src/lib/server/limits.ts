import * as privateEnv from '$env/static/private';
import type { StorageLimits } from './storage';

// What this installation may keep in R2, and upload and download each month: STORAGE_* in .env, read at
// build time (see .env.example). The defaults stay a tenth below R2's free allowance of 10 GB stored, a
// million uploads (Class A operations), and ten million downloads (Class B operations) a month. A namespace
// import lets a missing variable take its default instead of failing the bundler with a missing export, and
// reading each variable by its name keeps the rest of the build's environment out of the bundle.

type Settings = {
	STORAGE_LIMIT_GB?: string;
	STORAGE_UPLOADS_PER_MONTH?: string;
	STORAGE_DOWNLOADS_PER_MONTH?: string;
};

/** A setting's number, or its default when it isn't set. Anything else fails the build. */
function setting(
	name: keyof Settings,
	value: string | undefined,
	fallback: number,
	pattern = /^\d+$/
) {
	if (!value) return fallback;
	if (!pattern.test(value)) {
		throw new Error(`${name} must be a number, such as ${fallback}, or 0 (see .env.example).`);
	}
	return Number(value);
}

export const storageLimits: StorageLimits = {
	// A gigabyte counted as a billion bytes, a little less than R2 may count.
	bytes: Math.floor(
		setting('STORAGE_LIMIT_GB', (privateEnv as Settings).STORAGE_LIMIT_GB, 9, /^\d+(\.\d+)?$/) * 1e9
	),
	uploads: setting(
		'STORAGE_UPLOADS_PER_MONTH',
		(privateEnv as Settings).STORAGE_UPLOADS_PER_MONTH,
		900_000
	),
	downloads: setting(
		'STORAGE_DOWNLOADS_PER_MONTH',
		(privateEnv as Settings).STORAGE_DOWNLOADS_PER_MONTH,
		9_000_000
	)
};
