/**
 * UI sound effects. Mobile browsers block audio until a real user gesture
 * unlocks it, and the actual files may not exist yet (the club supplies real
 * recordings separately) — every call here is fire-and-forget, so a missing
 * file or a blocked autoplay never throws or surfaces to the user.
 */
export type SoundName = 'tick' | 'correct' | 'incorrect' | 'drumroll' | 'winner' | 'tier-up';

const cache = new Map<SoundName, HTMLAudioElement>();
let primed = false;

function getAudio(name: SoundName): HTMLAudioElement {
  let audio = cache.get(name);
  if (!audio) {
    audio = new Audio(`/sounds/${name}.mp3`);
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
