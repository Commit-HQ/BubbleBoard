import type { Rect } from './editor';
import simdLoader from '../../../node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.js?url';
import simdBinary from '../../../node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.wasm?url';
import basicLoader from '../../../node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_nosimd_internal.js?url';
import basicBinary from '../../../node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_nosimd_internal.wasm?url';

/** One in-flight photo per editor. Termination cancels inference and releases WASM memory on exit. */
export class LocalFaceDetector {
	#worker?: Worker;
	#cancel?: () => void;

	detect(image: ImageBitmap): Promise<Rect[]> {
		if (this.#cancel) {
			image.close();
			return Promise.reject(new Error('Detection already running'));
		}
		let worker: Worker;
		try {
			worker = this.#worker ??= new Worker(new URL('./detector.worker.ts', import.meta.url));
		} catch (cause) {
			image.close();
			return Promise.reject(cause);
		}
		return new Promise((resolve, reject) => {
			const done = () => {
				clearTimeout(timeout);
				this.#cancel = undefined;
				worker.onmessage = null;
				worker.onerror = null;
			};
			const fail = () => {
				done();
				worker.terminate();
				this.#worker = undefined;
				reject(new Error('Face detection unavailable'));
			};
			const timeout = setTimeout(fail, 45000);
			this.#cancel = fail;
			worker.onerror = (event) => {
				if (import.meta.env.DEV) console.warn('Face detector worker:', event.message);
				fail();
			};
			worker.onmessage = (
				event: MessageEvent<{ boxes?: Rect[]; error?: boolean; detail?: string }>
			) => {
				if (event.data.error || !Array.isArray(event.data.boxes)) {
					if (import.meta.env.DEV) console.warn('Face detector:', event.data.detail);
					return fail();
				}
				done();
				resolve(event.data.boxes);
			};
			const assets = Object.fromEntries(
				Object.entries({
					runtime: '/face-detector/vision-0.10.32.js',
					simdLoader,
					simdBinary,
					basicLoader,
					basicBinary,
					model: '/models/blaze-face-short-range-v1.tflite'
				}).map(([name, path]) => [name, new URL(path, location.origin).href])
			);
			try {
				worker.postMessage({ image, assets }, [image]);
			} catch {
				image.close();
				fail();
			}
		});
	}

	close() {
		this.#cancel?.();
		this.#worker?.terminate();
		this.#worker = undefined;
	}
}
