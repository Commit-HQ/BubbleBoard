// Wrangler and the local .dev.vars file, for the scripts that deploy an installation and create its secrets.

import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

const shell = process.platform === 'win32';

/** Runs Wrangler and returns what it prints. With `input`, that is its answer instead of the terminal's. */
export function wrangler(args, input) {
	return execFileSync('npx', ['wrangler', ...args], {
		input,
		encoding: 'utf8',
		stdio: [input === undefined ? 'inherit' : 'pipe', 'pipe', 'inherit'],
		shell
	});
}

/** Runs Wrangler in this terminal, where it shows its progress and can ask questions. */
export function runWrangler(args) {
	execFileSync('npx', ['wrangler', ...args], { stdio: 'inherit', shell });
}

/** Whether the deployed Worker has a secret. */
export function hasSecret(name) {
	const listed = wrangler(['secret', 'list', '--format', 'json']);
	const secrets = JSON.parse(listed.slice(listed.indexOf('['), listed.lastIndexOf(']') + 1));
	return secrets.some((secret) => secret.name === name);
}

function devVars() {
	return existsSync('.dev.vars')
		? readFileSync('.dev.vars', 'utf8').split('\n').filter(Boolean)
		: [];
}

/** Whether .dev.vars sets a variable. */
export function hasDevVar(name) {
	return devVars().some((line) => line.startsWith(`${name}=`));
}

/** Sets a variable in .dev.vars for `npm run dev`, in place of any earlier value. */
export function setDevVar(name, value) {
	const kept = devVars().filter((line) => !line.startsWith(`${name}=`));
	writeFileSync('.dev.vars', [...kept, `${name}=${value}`, ''].join('\n'), { mode: 0o600 });
	chmodSync('.dev.vars', 0o600);
	// Generated types list the variables in .dev.vars.
	wrangler(['types']);
}
