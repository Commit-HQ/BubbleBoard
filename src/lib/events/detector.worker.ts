// Classic Vite worker: MediaPipe loads its Emscripten runtime through importScripts. Both runtime and
// model come from our origin. CPU inference keeps WebGL/DOM requirements out of the UI thread.
// No ESM imports: Vite serves a classic worker without bundling its imports during development.
type VisionRuntime = typeof import('@mediapipe/tasks-vision');
type DetectorAssets = {
	runtime: string;
	simdLoader: string;
	simdBinary: string;
	basicLoader: string;
	basicBinary: string;
	model: string;
};
let detector: Promise<import('@mediapipe/tasks-vision').FaceDetector> | undefined;
async function openDetector(assets: DetectorAssets) {
	const scope = self as unknown as {
		exports: VisionRuntime;
		importScripts: (path: string) => void;
	};
	scope.exports = {} as VisionRuntime;
	scope.importScripts(assets.runtime);
	const { FaceDetector, FilesetResolver } = scope.exports;
	const simd = await FilesetResolver.isSimdSupported();
	return FaceDetector.createFromOptions(
		{
			wasmLoaderPath: simd ? assets.simdLoader : assets.basicLoader,
			wasmBinaryPath: simd ? assets.simdBinary : assets.basicBinary
		},
		{
			baseOptions: { modelAssetPath: assets.model, delegate: 'CPU' },
			runningMode: 'IMAGE',
			minDetectionConfidence: 0.5
		}
	);
}

self.onmessage = async (event: MessageEvent<{ image: ImageBitmap; assets: DetectorAssets }>) => {
	const image = event.data.image;
	try {
		detector ??= openDetector(event.data.assets);
		const model = await detector;
		type Box = { x: number; y: number; width: number; height: number; score: number };
		const candidates: Box[] = [];
		// Full image plus overlapping tiles: tiny group-photo faces reach the 128px model at a useful scale.
		// Four orientations also cover children lying down or playing upside down.
		const crops = [{ x: 0, y: 0, width: image.width, height: image.height }];
		if (Math.min(image.width, image.height) >= 400) {
			const w = Math.ceil(image.width / 2),
				h = Math.ceil(image.height / 2);
			for (const y of [0, Math.floor((image.height - h) / 2), image.height - h])
				for (const x of [0, Math.floor((image.width - w) / 2), image.width - w])
					crops.push({ x, y, width: w, height: h });
		}
		for (const crop of crops)
			for (const angle of [0, 90, 180, 270]) {
				const scale = Math.min(1, 960 / Math.max(crop.width, crop.height));
				const w = Math.round(crop.width * scale),
					h = Math.round(crop.height * scale);
				const canvas = new OffscreenCanvas(angle % 180 ? h : w, angle % 180 ? w : h);
				const ctx = canvas.getContext('2d')!;
				ctx.translate(canvas.width / 2, canvas.height / 2);
				ctx.rotate((angle * Math.PI) / 180);
				ctx.scale(w / crop.width, h / crop.height);
				ctx.translate(-crop.width / 2, -crop.height / 2);
				ctx.drawImage(
					image,
					crop.x,
					crop.y,
					crop.width,
					crop.height,
					0,
					0,
					crop.width,
					crop.height
				);
				const inverse = ctx.getTransform().inverse();
				const input = await createImageBitmap(canvas);
				try {
					for (const detection of model.detect(input).detections) {
						const b = detection.boundingBox;
						if (!b) continue;
						const corners = [
							[b.originX, b.originY],
							[b.originX + b.width, b.originY],
							[b.originX, b.originY + b.height],
							[b.originX + b.width, b.originY + b.height]
						].map(([x, y]) => new DOMPoint(x, y).matrixTransform(inverse));
						const x = Math.max(0, Math.min(...corners.map((p) => p.x)) + crop.x),
							y = Math.max(0, Math.min(...corners.map((p) => p.y)) + crop.y);
						const right = Math.min(image.width, Math.max(...corners.map((p) => p.x)) + crop.x),
							bottom = Math.min(image.height, Math.max(...corners.map((p) => p.y)) + crop.y);
						if (right > x && bottom > y)
							candidates.push({
								x,
								y,
								width: right - x,
								height: bottom - y,
								score: detection.categories[0]?.score ?? 0
							});
					}
				} finally {
					input.close();
				}
			}
		const boxes: Box[] = [];
		for (const candidate of candidates.sort((a, b) => b.score - a.score)) {
			if (
				boxes.some((b) => {
					const intersection =
						Math.max(
							0,
							Math.min(b.x + b.width, candidate.x + candidate.width) - Math.max(b.x, candidate.x)
						) *
						Math.max(
							0,
							Math.min(b.y + b.height, candidate.y + candidate.height) - Math.max(b.y, candidate.y)
						);
					return (
						intersection / Math.min(b.width * b.height, candidate.width * candidate.height) >
							0.65 ||
						intersection /
							(b.width * b.height + candidate.width * candidate.height - intersection) >
							0.35
					);
				})
			)
				continue;
			boxes.push(candidate);
		}
		self.postMessage({ boxes });
	} catch (cause) {
		detector = undefined;
		self.postMessage({ error: true, detail: String(cause) });
	} finally {
		image.close();
	}
};
