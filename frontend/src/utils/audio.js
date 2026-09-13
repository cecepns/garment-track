import scanAudioUrl from "@/assets/scan.mpeg";

let scanAudio = null;

export const playScanSound = () => {
  try {
    if (!scanAudio) {
      scanAudio = new Audio(scanAudioUrl);
    }
    scanAudio.currentTime = 0;
    const playPromise = scanAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        console.warn("Autoplay scan sound prevented by browser:", error);
      });
    }
  } catch (err) {
    console.warn("Could not play scan sound:", err);
  }
};
