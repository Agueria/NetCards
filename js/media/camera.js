// media/camera.js - camera access for card photos.
// Live preview via getUserMedia; the captured frame is drawn on a canvas, scaled down and encoded as JPEG
// so a photo costs ~100-200 KB in IndexedDB instead of several MB.
let stream = null; // the running camera stream, or null
let startId = 0;   // grows on every start and stop, so a start that finishes too late can notice it

/** getUserMedia only exists in secure contexts (https:// or localhost) and in browsers that support it. */
export function isCameraSupported() {
  return Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/**
 * Starts the rear camera (if there is one) and shows it in the given <video>.
 * Rejects if permission is denied (error.name 'NotAllowedError') or there is no camera ('NotFoundError', ...).
 */
export async function startCamera(videoEl) {
  const id = ++startId;
  // facingMode 'environment' = the back camera on phones; a laptop simply uses its webcam.
  const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
  if (id !== startId) {
    // stopCamera() was called while the browser was still asking for permission: switch the camera off again.
    newStream.getTracks().forEach((track) => track.stop());
    throw new DOMException('The camera was closed before it started', 'AbortError');
  }
  stream = newStream;
  videoEl.srcObject = stream; // a MediaStream is played through srcObject, not src
  await videoEl.play();
}

/** Stops every track so the camera light turns off. Also cancels a start that is still waiting for permission. */
export function stopCamera(videoEl) {
  startId += 1;
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }
  if (videoEl) videoEl.srcObject = null;
}

/** Grabs the current video frame as a JPEG Blob, at most maxSize pixels on the longer side. */
export function capturePhoto(videoEl, maxSize = 1024) {
  return drawToJpeg(videoEl, videoEl.videoWidth, videoEl.videoHeight, maxSize);
}

/** Reads an image file chosen by the user and returns a scaled-down JPEG Blob. */
export async function resizeImageFile(file, maxSize = 1024) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    return await drawToJpeg(img, img.naturalWidth, img.naturalHeight, maxSize);
  } finally {
    URL.revokeObjectURL(url); // the temporary URL is only needed while the image loads
  }
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read the image file'));
    img.src = url;
  });
}

/** Draws `source` (a <video> frame or an <img>) on a canvas, scaled down, and encodes it as JPEG. */
function drawToJpeg(source, width, height, maxSize) {
  if (!width || !height) return Promise.reject(new Error('No image data'));
  const scale = Math.min(1, maxSize / Math.max(width, height)); // shrink big images, never enlarge small ones
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; // JPEG has no transparency: transparent PNG areas would otherwise turn black
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the image'))),
      'image/jpeg',
      0.8, // quality: small files that are still sharp enough for diagrams
    );
  });
}
