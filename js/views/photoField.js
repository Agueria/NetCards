// views/photoField.js - the "Photo" section of the card editor: take a photo with the camera or choose a file.
import { isCameraSupported, startCamera, stopCamera, capturePhoto, resizeImageFile } from '../media/camera.js';
import { el, showToast } from '../ui.js';

/** Builds the field. Returns { element, getValue(), busyReason(), dispose() } - the shape the card editor expects. */
export function createPhotoField({ image = null, imageSide = 'front' }) {
  let currentImage = image; // Blob | null
  let previewUrl = null;    // blob URL of the preview <img>; revoked when replaced or when the editor closes
  let resizing = false;     // true while a chosen file is being resized (a big phone photo can take a moment)

  const element = el('fieldset', { className: 'media-field' });
  // Static markup only (no user text), so innerHTML is safe here.
  element.innerHTML = `
    <legend>Photo (optional)</legend>
    <div class="media-preview" data-role="preview" hidden>
      <img alt="Card photo preview" data-role="img">
    </div>
    <div class="media-actions">
      <button type="button" class="btn" data-action="camera">Take photo</button>
      <label class="btn">Choose file
        <input type="file" accept="image/*" data-role="file" class="visually-hidden">
      </label>
      <button type="button" class="btn btn-ghost" data-action="remove" hidden>Remove photo</button>
    </div>
    <div class="media-side" data-role="side" hidden>
      Show photo on:
      <label><input type="radio" name="imageSide" value="front"> front (with the question)</label>
      <label><input type="radio" name="imageSide" value="back"> back (with the answer)</label>
    </div>`;

  const preview = element.querySelector('[data-role="preview"]');
  const img = element.querySelector('[data-role="img"]');
  const cameraButton = element.querySelector('[data-action="camera"]');
  const removeButton = element.querySelector('[data-action="remove"]');
  const fileInput = element.querySelector('[data-role="file"]');
  const sideBox = element.querySelector('[data-role="side"]');
  element.querySelector(`input[name="imageSide"][value="${imageSide}"]`).checked = true;

  // "Take photo" needs getUserMedia; "Choose file" works everywhere (on an iPhone it also offers "Take Photo").
  if (!isCameraSupported()) cameraButton.hidden = true;

  cameraButton.addEventListener('click', async () => {
    const blob = await openCameraDialog();
    if (blob) setImage(blob);
  });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    resizing = true;
    try {
      setImage(await resizeImageFile(file)); // same resizing as the camera: big photos become small JPEGs
    } catch {
      showToast('Could not read that image');
    } finally {
      resizing = false;
    }
    fileInput.value = ''; // so choosing the same file again still fires 'change'
  });

  removeButton.addEventListener('click', () => setImage(null));
  setImage(currentImage);

  /** Shows (or hides) the preview and the extra controls for the current photo. */
  function setImage(blob) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
    currentImage = blob;
    if (blob) {
      previewUrl = URL.createObjectURL(blob);
      img.src = previewUrl;
    } else {
      img.removeAttribute('src');
    }
    preview.hidden = !blob;
    removeButton.hidden = !blob;
    sideBox.hidden = !blob;
  }

  return {
    element,
    getValue() {
      const side = element.querySelector('input[name="imageSide"]:checked')?.value ?? 'front';
      return { image: currentImage, imageSide: side };
    },
    /** Why the card cannot be saved yet, or null. Saving now would silently drop the photo. */
    busyReason() {
      return resizing ? 'The photo is still being prepared. Try again in a moment.' : null;
    },
    dispose() {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = null;
    },
  };
}

/** Opens a camera dialog; resolves with a JPEG Blob, or null if the user cancels. */
function openCameraDialog() {
  return new Promise((resolve) => {
    const dialog = el('dialog', { className: 'dialog camera' });
    // playsinline + muted: an iPhone only plays the preview inline (not fullscreen) and without a tap when muted.
    dialog.innerHTML = `
      <video autoplay playsinline muted></video>
      <p class="camera-error" hidden></p>
      <div class="dialog-actions">
        <button type="button" class="btn" data-action="cancel">Cancel</button>
        <button type="button" class="btn btn-primary" data-action="capture" disabled>Capture</button>
      </div>`;
    const video = dialog.querySelector('video');
    const error = dialog.querySelector('.camera-error');
    const captureButton = dialog.querySelector('[data-action="capture"]');
    let finished = false;

    // One exit for Cancel, Capture and the Escape key: camera off, dialog removed, promise resolved - exactly once.
    function finish(blob) {
      if (finished) return;
      finished = true;
      stopCamera(video);
      if (dialog.open) dialog.close();
      dialog.remove();
      resolve(blob);
    }

    dialog.querySelector('[data-action="cancel"]').addEventListener('click', () => finish(null));
    captureButton.addEventListener('click', async () => {
      captureButton.disabled = true; // one capture per dialog
      try {
        finish(await capturePhoto(video));
      } catch {
        showToast('Could not capture the photo');
        finish(null);
      }
    });
    dialog.addEventListener('close', () => finish(null)); // the Escape key closes the dialog without a button

    document.body.append(dialog);
    dialog.showModal();
    startCamera(video)
      .then(() => { captureButton.disabled = false; }) // enable Capture only once there is a live picture
      .catch((err) => {
        if (finished) return; // the dialog was closed while the browser asked for permission
        error.hidden = false;
        error.textContent = err.name === 'NotAllowedError'
          ? 'Camera permission was denied. You can still choose a photo file.'
          : 'The camera is not available on this device.';
      });
  });
}
