import scanAudioUrl from "@/assets/scan.mpeg";
import failedAudioUrl from "@/assets/failed.mp3";

export const playScanSound = () => {
  try {
    const audio = new Audio(scanAudioUrl);
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        console.warn("Autoplay scan sound notice:", error);
      });
    }
  } catch (err) {
    console.warn("Could not play scan sound:", err);
  }
};

export const playSuccessSound = playScanSound; // Alias untuk konsistensi

export const playErrorSound = () => {
  try {
    const audio = new Audio(failedAudioUrl);
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        console.warn("Autoplay error sound notice:", error);
      });
    }
  } catch (err) {
    console.warn("Could not play error sound:", err);
  }
};

// Auto-unlock audio saat interaksi user pertama kali di perangkat mobile / PWA
if (typeof window !== "undefined") {
  const unlockAudio = () => {
    try {
      const audio = new Audio(scanAudioUrl);
      audio.volume = 0.01;
      audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
      }).catch(() => {});
    } catch (e) {
      // silent
    }
    window.removeEventListener("click", unlockAudio);
    window.removeEventListener("touchstart", unlockAudio);
  };
  window.addEventListener("click", unlockAudio, { once: true });
  window.addEventListener("touchstart", unlockAudio, { once: true });
}

