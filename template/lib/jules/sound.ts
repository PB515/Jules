/**
 * UI sound effects. Mobile browsers block audio until a real user gesture
 * unlocks it — every call here is fire-and-forget, so a blocked autoplay
 * never throws or surfaces to the user.
 *
 * The 6 files in public/sounds/*.mp3 are the club's own real recordings,
 * replacing the original synthesized placeholder tones.
 *
 * iOS specifically keeps a lock-screen "Now Playing" widget alive for as
 * long as it considers a page's media session active — reported live as
 * sound never fully going away after a quiz ends, only clearing once the
 * PWA itself was uninstalled. These cached <audio> elements never got an
 * explicit "this session is over" signal, so WebKit had nothing telling it
 * to retire the session. Each play now explicitly clears
 * navigator.mediaSession back to 'none' once that clip ends (or is
 * interrupted by the next one), which is the actual signal iOS looks for.
 */
export type SoundName = 'tick' | 'correct' | 'incorrect' | 'drumroll' | 'winner' | 'tier-up';

const cache = new Map<SoundName, HTMLAudioElement>();
let primed = false;

function clearMediaSession() {
  if (typeof navigator === 'undefined' || !navigator.mediaSession) return;
  navigator.mediaSession.playbackState = 'none';
  navigator.mediaSession.metadata = null;
}

function getAudio(name: SoundName): HTMLAudioElement {
  let audio = cache.get(name);
  if (!audio) {
    audio = new Audio(`/sounds/${name}.mp3`);
    audio.addEventListener('ended', clearMediaSession);
    audio.addEventListener('pause', clearMediaSession);
    cache.set(name, audio);
  }
  return audio;
}

export function playSound(name: SoundName) {
  const audio = getAudio(name);
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

/**
 * Call on the first real user tap in a flow (e.g. "Join round", "Start
 * round") to unlock audio playback for the rest of the session on mobile
 * Safari/Chrome, which otherwise block the very first programmatic play().
 */
export function primeAudio() {
  if (primed) return;
  primed = true;
  const audio = getAudio('tick');
  audio.volume = 0;
  audio
    .play()
    .then(() => {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 1;
    })
    .catch(() => {
      audio.volume = 1;
    });
}
