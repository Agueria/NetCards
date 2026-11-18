// media/recorder.js - microphone recording for voice notes, built on MediaRecorder.
// getUserMedia gives a live microphone stream; MediaRecorder encodes it into pieces (Blobs)
// that are joined into one audio file when the recording stops.
let session = null; // { stream, recorder, chunks, timer } while a recording is running, otherwise null
let startId = 0;    // grows on every start and cancel, so a start that finishes too late can notice it

/** getUserMedia and MediaRecorder only exist in secure contexts (https:// or localhost) and in modern browsers. */
export function isRecordingSupported() {
  return Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
}

/**
 * Starts recording from the microphone. Rejects if permission is denied (error.name 'NotAllowedError'),
 * if there is no microphone ('NotFoundError') or if cancelRecording() was called while the browser was
 * still asking for permission ('AbortError'). After maxSeconds, onAutoStop is called so the screen can
 * finish exactly like a Stop click.
 */
export async function startRecording({ maxSeconds = 60, onAutoStop = null } = {}) {
  if (session) throw new Error('A recording is already running');
  const id = ++startId;
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  if (id !== startId) {
    // Cancelled while the permission prompt was open: switch the microphone off again.
    stopTracks(stream);
    throw new DOMException('The recording was cancelled before it started', 'AbortError');
  }
  try {
    const recorder = new MediaRecorder(stream); // no mimeType: Safari picks audio/mp4, Chrome audio/webm
    const chunks = []; // local to this recording, so a late piece of an older recording can never mix in
    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    });
    recorder.start();
    const timer = setTimeout(() => {
      if (onAutoStop) onAutoStop();
    }, maxSeconds * 1000);
    session = { stream, recorder, chunks, timer };
  } catch (error) {
    stopTracks(stream); // never leave the microphone on after a failure
    throw error;
  }
}

/** Stops the recording, switches the microphone off and resolves with the audio Blob. */
export function stopRecording() {
  if (!session) return Promise.reject(new Error('Not recording'));
  const { stream, recorder, chunks, timer } = session;
  session = null;
  clearTimeout(timer);
  return new Promise((resolve) => {
    const finish = () => {
      stopTracks(stream);
      // recorder.mimeType is the format the browser chose, e.g. 'audio/mp4' or 'audio/webm;codecs=opus'.
      resolve(new Blob(chunks, { type: recorder.mimeType || (chunks[0] && chunks[0].type) || 'audio/webm' }));
    };
    if (recorder.state === 'inactive') {
      finish(); // already stopped (for example the microphone was unplugged)
      return;
    }
    recorder.addEventListener('stop', finish, { once: true }); // the last piece arrives just before 'stop'
    recorder.stop();
  });
}

/** Throws away a recording (or a start still waiting for permission) and switches the microphone off. */
export function cancelRecording() {
  startId += 1; // a start that is still waiting will stop its own stream when it resumes
  if (!session) return;
  const { stream, recorder, timer } = session;
  session = null;
  clearTimeout(timer);
  if (recorder.state !== 'inactive') recorder.stop(); // its last pieces go into the dropped chunks array
  stopTracks(stream);
}

/** Ends every track of the stream; the browser's microphone indicator turns off. */
function stopTracks(stream) {
  stream.getTracks().forEach((track) => track.stop());
}
