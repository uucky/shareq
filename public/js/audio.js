import { state } from './state.js';

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

export function playSound(type) {
  if (state.isSoundMuted && type !== 'chime') {
    return;
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const now = audioCtx.currentTime;

  if (type === 'rose') {
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gainNode1 = audioCtx.createGain();
    const gainNode2 = audioCtx.createGain();

    osc1.connect(gainNode1);
    gainNode1.connect(audioCtx.destination);
    osc2.connect(gainNode2);
    gainNode2.connect(audioCtx.destination);

    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(1760, now + 0.35);
    gainNode1.gain.setValueAtTime(0.15, now);
    gainNode1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc2.frequency.setValueAtTime(1100, now + 0.08);
    osc2.frequency.exponentialRampToValueAtTime(2200, now + 0.43);
    gainNode2.gain.setValueAtTime(0.12, now + 0.08);
    gainNode2.gain.exponentialRampToValueAtTime(0.001, now + 0.43);

    osc1.start(now);
    osc1.stop(now + 0.36);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.44);
  } else if (type === 'clap') {
    const bufferSize = audioCtx.sampleRate * 0.12;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    filter.Q.value = 3.0;

    const clapGain = audioCtx.createGain();
    clapGain.gain.setValueAtTime(0.3, now);
    clapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    noise.connect(filter);
    filter.connect(clapGain);
    clapGain.connect(audioCtx.destination);

    noise.start(now);
    noise.stop(now + 0.12);
  } else if (type === 'egg') {
    const osc = audioCtx.createOscillator();
    const filter = audioCtx.createBiquadFilter();
    const gainNode = audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(60, now + 0.2);

    filter.type = 'lowpass';
    filter.frequency.value = 250;

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    gainNode.gain.setValueAtTime(0.25, now);
    gainNode.gain.linearRampToValueAtTime(0.001, now + 0.2);

    osc.start(now);
    osc.stop(now + 0.2);
  } else if (type === 'shoe') {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.35);

    gainNode.connect(audioCtx.destination);
    osc.connect(gainNode);

    gainNode.gain.setValueAtTime(0.35, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.start(now);
    osc.stop(now + 0.35);
  } else if (type === 'chime') {
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gainNode1 = audioCtx.createGain();
    const gainNode2 = audioCtx.createGain();

    osc1.connect(gainNode1);
    gainNode1.connect(audioCtx.destination);
    osc2.connect(gainNode2);
    gainNode2.connect(audioCtx.destination);

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gainNode1.gain.setValueAtTime(0, now);
    gainNode1.gain.linearRampToValueAtTime(0.12, now + 0.05);
    gainNode1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, now + 0.1);
    gainNode2.gain.setValueAtTime(0, now + 0.1);
    gainNode2.gain.linearRampToValueAtTime(0.12, now + 0.15);
    gainNode2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc1.start(now);
    osc1.stop(now + 0.45);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.65);
  }
}
