# Face detector

`blaze-face-short-range-v1.tflite` is Google's BlazeFace short-range float16 model, version 1, used with MediaPipe Tasks Vision 0.10.32. Apache-2.0; see `/licenses/mediapipe-apache-2.0.txt` and `/third-party-notices.txt`.

Source: https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite

SHA-256: `b4578f35940bf5a1a655214a1cce5cab13eba73c1297cd78e1a04c2380b0152f`.

The full-range model listed in Google's overview is incompatible with this Tasks FaceDetector graph (2304 output boxes versus 896 expected). The short-range model was verified in the browser. It can miss small, turned, obscured, or distant faces: manual cover placement and a whole-photo review remain mandatory. There is no identity recognition.

The model is downloaded from this installation only when the editor starts detection. Upgrades require testing the model and the pinned runtime together, including CSP and the production Workers asset server.
