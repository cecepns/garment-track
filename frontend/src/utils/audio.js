import scanAudioUrl from "@/assets/scan.mp3";
import failedAudioUrl from "@/assets/failed.mp3";

// Web Audio API context untuk zero-latency dan kebal terhadap gesture expiration di mobile/PWA
let audioCtx = null;
let successBuffer = null;
let errorBuffer = null;
let isAudioContextInitialized = false;

const getAudioContext = () => {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
};

// Pre-decode audio bytes langsung ke memori (PCM buffer)
const preloadAudioBuffers = async () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (!successBuffer) {
      const res = await fetch(scanAudioUrl);
      const arrayBuffer = await res.arrayBuffer();
      // Gunakan callback fallback untuk Safari versi lama
      ctx.decodeAudioData(
        arrayBuffer,
        (decoded) => {
          successBuffer = decoded;
        },
        (err) => {
          console.warn("Could not pre-decode success audio:", err);
        }
      );
    }
  } catch (err) {
    console.warn("Fetch success audio failed:", err);
  }

  try {
    if (!errorBuffer) {
      const res = await fetch(failedAudioUrl);
      const arrayBuffer = await res.arrayBuffer();
      ctx.decodeAudioData(
        arrayBuffer,
        (decoded) => {
          errorBuffer = decoded;
        },
        (err) => {
          console.warn("Could not pre-decode error audio:", err);
        }
      );
    }
  } catch (err) {
    console.warn("Fetch error audio failed:", err);
  }
};

// HTML5 Audio fallback element
let htmlSuccessAudio = null;
let htmlErrorAudio = null;

const getHtmlAudio = (type) => {
  if (typeof window === "undefined") return null;
  try {
    if (type === "success") {
      if (!htmlSuccessAudio) {
        htmlSuccessAudio = new Audio(scanAudioUrl);
        htmlSuccessAudio.preload = "auto";
      }
      return htmlSuccessAudio;
    } else {
      if (!htmlErrorAudio) {
        htmlErrorAudio = new Audio(failedAudioUrl);
        htmlErrorAudio.preload = "auto";
      }
      return htmlErrorAudio;
    }
  } catch (e) {
    return null;
  }
};

// Synthesizer Chime / Beep (Garansi 100% selalu berbunyi jika file media belum siap / dibatasi)
const playSynthBeep = (isSuccess) => {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (isSuccess) {
      // Bunyi POS scanner barcode khas (nada tinggi jernih 1760Hz -> 2349Hz)
      osc.type = "sine";
      osc.frequency.setValueAtTime(1760, now);
      osc.frequency.exponentialRampToValueAtTime(2349, now + 0.08);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } else {
      // Bunyi Error / Alert (nada rendah)
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(180, now + 0.12);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.28);
    }
  } catch (e) {
    console.warn("Synth beep fallback notice:", e);
  }
};

// Pemanasan audio context pada interaksi user (klik tombol / tap layar)
export const warmAudio = () => {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  if (!successBuffer || !errorBuffer) {
    preloadAudioBuffers();
  }
};

export const playSuccessSound = () => {
  warmAudio();
  const ctx = getAudioContext();

  // 1. Metode Utama: Web Audio API (Decoded buffer in memory, zero delay, bypass async restriction)
  if (ctx && successBuffer && ctx.state === "running") {
    try {
      const source = ctx.createBufferSource();
      source.buffer = successBuffer;
      source.connect(ctx.destination);
      source.start(0);
      return;
    } catch (err) {
      console.warn("WebAudio success play failed, trying HTML5 fallback:", err);
    }
  }

  // 2. Metode Kedua: HTML5 Audio Element
  try {
    const audio = getHtmlAudio("success") || new Audio(scanAudioUrl);
    audio.currentTime = 0;
    audio.volume = 1.0;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn("HTML5 audio play notice, triggering synth chime:", err);
        playSynthBeep(true);
      });
    }
  } catch (err) {
    playSynthBeep(true);
  }
};

export const playScanSound = playSuccessSound; // Alias untuk konsistensi

export const playErrorSound = () => {
  warmAudio();
  const ctx = getAudioContext();

  // 1. Metode Utama: Web Audio API
  if (ctx && errorBuffer && ctx.state === "running") {
    try {
      const source = ctx.createBufferSource();
      source.buffer = errorBuffer;
      source.connect(ctx.destination);
      source.start(0);
      return;
    } catch (err) {
      console.warn("WebAudio error play failed, trying HTML5 fallback:", err);
    }
  }

  // 2. Metode Kedua: HTML5 Audio Element
  try {
    const audio = getHtmlAudio("error") || new Audio(failedAudioUrl);
    audio.currentTime = 0;
    audio.volume = 1.0;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn("HTML5 audio error notice, triggering synth buzz:", err);
        playSynthBeep(false);
      });
    }
  } catch (err) {
    playSynthBeep(false);
  }
};

// Auto-unlock audio saat interaksi user pertama kali di perangkat mobile / PWA
if (typeof window !== "undefined") {
  const unlockEvents = ["click", "touchstart", "touchend", "pointerdown", "keydown"];
  const unlockAudio = () => {
    warmAudio();

    // Trigger silent mini buffer di HTML5 Audio untuk membuka blokir autoplay Safari iOS
    try {
      const audio = new Audio(scanAudioUrl);
      audio.volume = 0.001;
      audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
      }).catch(() => {});
    } catch (e) {
      // silent
    }

    unlockEvents.forEach((evt) => window.removeEventListener(evt, unlockAudio));
  };

  unlockEvents.forEach((evt) => {
    window.addEventListener(evt, unlockAudio, { passive: true, capture: true });
  });

  // Preload buffer segera saat halaman dimuat
  if (document.readyState === "complete" || document.readyState === "interactive") {
    preloadAudioBuffers();
  } else {
    window.addEventListener("DOMContentLoaded", preloadAudioBuffers);
  }
}
