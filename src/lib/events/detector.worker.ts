// Classic Vite worker: MediaPipe loads its Emscripten runtime through importScripts. Both runtime and
// model come from our origin. CPU inference keeps WebGL/DOM requirements out of the UI thread.
// No ESM imports: Vite serves a classic worker without bundling its imports during development.
type VisionRuntime = typeof import('@mediapipe/tasks-vision');
type DetectorAssets = { runtime: string; simdLoader: string; simdBinary: string; basicLoader: string; basicBinary: string; model: string };
let detector: Promise<import('@mediapipe/tasks-vision').FaceDetector> | undefined;
async function openDetector(assets: DetectorAssets) {
	const scope = self as unknown as { exports: VisionRuntime; importScripts: (path: string) => void };
	scope.exports = {} as VisionRuntime;
	scope.importScripts(assets.runtime);
	const { FaceDetector, FilesetResolver } = scope.exports;
	const simd = await FilesetResolver.isSimdSupported();
	return FaceDetector.createFromOptions({ wasmLoaderPath: simd ? assets.simdLoader : assets.basicLoader, wasmBinaryPath: simd ? assets.simdBinary : assets.basicBinary }, {
		baseOptions: { modelAssetPath: assets.model, delegate: 'CPU' },
		runningMode: 'IMAGE', minDetectionConfidence: 0.45
	});
}

self.onmessage = async (event: MessageEvent<{ image: ImageBitmap; assets: DetectorAssets }>) => {
	const image = event.data.image;
	try {
		detector ??= openDetector(event.data.assets);
		const result = (await detector).detect(image);
		const boxes = result.detections.flatMap(({ boundingBox: box }) => box ? [{ x: box.originX, y: box.originY, width: box.width, height: box.height }] : []);
		self.postMessage({ boxes });
	} catch (cause) {
		detector = undefined;
		self.postMessage({ error: true, detail: String(cause) });
	} finally {
		image.close();
	}
};
