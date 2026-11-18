// views/audioField.js - the "Voice note" section of the card editor: record with the microphone, play back, remove.
import { isRecordingSupported, startRecording, stopRecording, cancelRecording } from '../media/recorder.js';
import { el, showToast } from '../ui.js';

const MAX_SECONDS = 60; // one minute is enough to explain an answer and keeps each voice note small

/** Builds the field. Returns { element, getValue(), busyReason(), dispose() } - the shape the card editor expects. */
export function createAudioField({ audio = null, audioType = '' }) {
  let currentAudio = audio;    // Blob | null
  let currentType = audioType; // format chosen by the browser, e.g. 'audio/mp4' (Safari) or 'audio/webm;codecs=opus' (Chrome)
  let previewUrl = null;       // blob URL of the <audio> player; revoked when replaced or when the editor closes
  let state = 'idle';          // 'idle' | 'starting' (waiting for the microphone permission) | 'recording'
  let disposed = false;        // true once the editor has closed: results that arrive later are ignored
  let timerId = null;          // setInterval id of the on-screen timer
  let seconds = 0;

  const element = el('fieldset', { className: 'media-field' });
  // Static markup only (no user text), so innerHTML is safe here.
  element.innerHTML = `
    <legend>Voice note (optional, max ${MAX_SECONDS} s)</legend>
    <audio controls data-role="player" hidden></audio>
    <div class="media-actions">
      <button type="button" class="btn" data-action="record">Record</button>
      <span class="record-timer" data-role="timer" hidden>0:00</span>
      <button type="button" class="btn btn-ghost" data-action="remove" hidden>Remove voice note</button>
    </div>
    <p class="hint" data-role="unsupported" hidden>Recording is not supported in this browser.</p>`;

  const player = element.querySelector('[data-role="player"]');
  const recordButton = element.querySelector('[data-action="record"]');
  const removeButton = element.querySelector('[data-action="remove"]');
  const timer = element.querySelector('[data-role="timer"]');

  // getUserMedia and MediaRecorder need https:// (or localhost) and a modern browser.
  if (!isRecordingSupported()) {
    recordButton.hidden = true;
    element.querySelector('[data-role="unsupported"]').hidden = false;
  }

  // One button: "Record" starts the recording, the same button (now "Stop") ends it.
  recordButton.addEventListener('click', () => (state === 'recording' ? finish() : begin()));
  removeButton.addEventListener('click', () => setAudio(null, ''));
  setAudio(currentAudio, currentType);

  async function begin() {
    if (state !== 'idle') return;
    state = 'starting';
    recordButton.disabled = true; // the browser may be showing its permission prompt now
    try {
      await startRecording({ maxSeconds: MAX_SECONDS, onAutoStop: finish });
    } catch (error) {
      state = 'idle';
      recordButton.disabled = false;
      if (disposed || error.name === 'AbortError') return; // the editor closed while waiting: nothing to report
      showToast(error.name === 'NotAllowedError'
        ? 'Microphone permission was denied. You can still save the card without a voice note.'
        : 'The microphone is not available on this device.');
      return;
    }
    state = 'recording';
    recordButton.disabled = false;
    recordButton.textContent = 'Stop';
    recordButton.classList.add('recording'); // red button: the microphone is live
    seconds = 0;
    timer.textContent = '0:00';
    timer.hidden = false;
    timerId = setInterval(() => {
      seconds += 1;
      timer.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; // m:ss
    }, 1000);
  }

  // Runs for the Stop button and for the automatic stop after MAX_SECONDS.
  async function finish() {
    if (state !== 'recording') return; // Stop and the time limit can arrive together: handle only the first
    state = 'idle';
    resetButton();
    try {
      const blob = await stopRecording();
      if (disposed) return;
      if (blob.size === 0) {
        showToast('The recording was empty. Please try again.');
        return;
      }
      setAudio(blob, blob.type);
    } catch (error) {
      console.error('Stopping the recording failed:', error);
      if (!disposed) showToast('Recording failed. Please try again.');
    }
  }

  /** Back to the idle look: timer hidden, "Record" label, normal colour. */
  function resetButton() {
    clearInterval(timerId);
    timerId = null;
    timer.hidden = true;
    recordButton.textContent = 'Record';
    recordButton.classList.remove('recording');
  }

  /** Shows (or hides) the player and the Remove button for the current voice note. */
  function setAudio(blob, type) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
    currentAudio = blob;
    currentType = type;
    if (blob) {
      previewUrl = URL.createObjectURL(blob);
      player.src = previewUrl;
    } else {
      player.removeAttribute('src');
    }
    player.hidden = !blob;
    removeButton.hidden = !blob;
  }

  return {
    element,
    getValue() {
      return { audio: currentAudio, audioType: currentType };
    },
    /** Why the card cannot be saved yet, or null. Saving during a recording would silently drop it. */
    busyReason() {
      if (state === 'starting') return 'The microphone is starting. Try again in a moment.';
      if (state === 'recording') return 'Stop the recording first.';
      return null;
    },
    dispose() {
      disposed = true;
      clearInterval(timerId);
      cancelRecording(); // microphone off; also cancels a start that is still waiting for permission
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = null;
    },
  };
}
