import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { expect, it, vi } from 'vitest';

// Run the page's actual send function with controllable navigation and asynchronous boundaries.
// No copied implementation or browser timing is involved in these race regressions.
const page = readFileSync('src/routes/(app)/[[locale=locale]]/app/messages/+page.svelte', 'utf8');
const script = page.slice(page.indexOf('>') + 1, page.indexOf('</script>'));
const parsed = ts.createSourceFile('page.ts', script, ts.ScriptTarget.Latest, true);
const send = parsed.statements.find(
	(node): node is ts.FunctionDeclaration =>
		ts.isFunctionDeclaration(node) && node.name?.text === 'send'
)!;
function deferred() {
	let resolve!: () => void, reject!: (cause: unknown) => void;
	const promise = new Promise<void>((yes, no) => {
		resolve = yes;
		reject = no;
	});
	return { promise, resolve, reject };
}
function harness(app: object, creating = false) {
	const goto = vi.fn();
	const body = `
 let id = ${creating ? 'null' : "'A'"}, creating = ${creating}, viewVersion = 0;
 let thread = {classroom:'room', family:'family'}, classroom='', family='', subject='Subject', text='Message for A';
 let staff=true, busy=false, failure, pending;
 const t={teacher:'Teacher'}, data={locale:'en'}, errorCode=String;
 const createId=()=> 'new-A', appPath=(_locale,_page,params)=>params.id;
 ${send.getText(parsed)}
 return {send, navigate(next) { id=next; creating=false; viewVersion++; text='Draft for '+next; pending=undefined; busy=false; }, state:()=>({text,failure,busy})};`;
	return {
		...new Function(
			'app',
			'goto',
			ts.transpileModule(body, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
		)(app, goto),
		goto
	} as {
		send: () => Promise<void>;
		navigate: (id: string) => void;
		state: () => { text: string; failure?: string; busy: boolean };
		goto: typeof goto;
	};
}
it.each([false, true])(
	'keeps the original destination when navigation happens during encryption (new=%s)',
	async (creating) => {
		const sealing = deferred();
		const sendMessage = vi.fn(async () => {});
		const app = {
			myName: 'Teacher',
			sealFor: vi.fn(async (_room, _family, conversation) => {
				await sealing.promise;
				return { id: conversation, content: 'sealed-for-' + conversation };
			}),
			sendMessage
		};
		const view = harness(app, creating);
		const sending = view.send();
		view.navigate('B');
		sealing.resolve();
		await sending;
		expect(sendMessage).toHaveBeenCalledWith(
			{ id: creating ? 'new-A' : 'A', content: 'sealed-for-' + (creating ? 'new-A' : 'A') },
			creating ? undefined : 'A'
		);
		expect(view.state().text).toBe('Draft for B');
		expect(view.goto).not.toHaveBeenCalled();
	}
);
it.each([false, true])(
	'ignores a send completion after leaving and returning to the same conversation (failure=%s)',
	async (fails) => {
		const response = deferred();
		const started = deferred();
		const view = harness({
			myName: 'Teacher',
			sealFor: async () => ({ id: 'message', content: 'sealed' }),
			sendMessage: async () => {
				started.resolve();
				await response.promise;
			}
		});
		const sending = view.send();
		await started.promise;
		view.navigate('B');
		view.navigate('A');
		if (fails) response.reject(new Error('offline'));
		else response.resolve();
		await sending;
		expect(view.state()).toEqual({ text: 'Draft for A', failure: undefined, busy: false });
	}
);
