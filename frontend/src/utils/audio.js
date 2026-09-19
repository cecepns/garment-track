import scanAudioUrl from "@/assets/scan.mpeg";
import failedAudioUrl from "@/assets/failed.mp3";

let successAudio = null;
let errorAudio = null;

export const playSuccessSound = () => {
  try {
    if (!successAudio) {
      successAudio = new Audio(scanAudioUrl);
    }
    successAudio.currentTime = 0;
    const playPromise = successAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        console.warn("Autoplay scan sound prevented by browser:", error);
      });
    }
  } catch (err) {
    console.warn("Could not play scan sound:", err);
  }
};

export const playScanSound = playSuccessSound; // Alias untuk kompatibilitas

export const playErrorSound = () => {
  try {
    if (!errorAudio) {
      errorAudio = new Audio(failedAudioUrl);
    }
    errorAudio.currentTime = 0;
    const playPromise = errorAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        console.warn("Autoplay error sound prevented by browser:", error);
      });
    }
  } catch (err) {
    console.warn("Could not play error sound:", err);
  }
};

