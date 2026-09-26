const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

// Synthesize speech in PT-BR and capture EXACT Microsoft Neural WordBoundary timestamps (100ns precision!)
async function synthesizeSpeechWithTimings(text, outputWavPath, voiceName = 'pt-BR-ThalitaMultilingualNeural', sceneIndex = 0) {
  const rawMp3Path = outputWavPath.replace(/\.wav$/, '_raw.mp3');
  const wordBoundaries = [];
  let generated = false;

  // Dynamic Scene-Aware Documentary Prosody (Hook is faster/punchier; Climax scenes have deeper weight; Loop Bridge builds momentum)
  const baseProsodyByVoice = {
    'pt-BR-ThalitaMultilingualNeural': [
      { rate: '+11%', pitch: '+1Hz' }, // Scene 1: High-retention scroll-stopping Hook
      { rate: '+7%', pitch: '-1Hz' },  // Scene 2: Engaging Setup
      { rate: '+7%', pitch: '-1Hz' },  // Scene 3: Deep Mechanism
      { rate: '+5%', pitch: '-2Hz' },  // Scene 4: Dramatic Reveal / Extreme Numbers
      { rate: '+6%', pitch: '-1Hz' },  // Scene 5: Historical Proof
      { rate: '+8%', pitch: '+0Hz' },  // Scene 6: Scientific Payoff
      { rate: '+10%', pitch: '+1Hz' }  // Scene 7: Cliffhanger Loop Bridge -> 0:00
    ],
    'en-US-AvaMultilingualNeural': [{ rate: '+7%', pitch: '+0Hz' }],
    'en-US-EmmaMultilingualNeural': [{ rate: '+8%', pitch: '+0Hz' }],
    'pt-BR-FranciscaNeural': [{ rate: '+8%', pitch: '-2Hz' }],
    'pt-BR-AntonioNeural': [{ rate: '+7%', pitch: '-1Hz' }]
  };
  const voiceCurve = baseProsodyByVoice[voiceName] || baseProsodyByVoice['pt-BR-ThalitaMultilingualNeural'];
  const prosodyOptions = voiceCurve[sceneIndex % voiceCurve.length] || { rate: '+7%', pitch: '-1Hz' };

  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3, {
      wordBoundaryEnabled: true
    });

    const { audioStream, metadataStream } = tts.toStream(text, prosodyOptions);

    if (metadataStream) {
      metadataStream.on('data', data => {
        try {
          const str = data.toString();
          const parsed = JSON.parse(str);
          if (parsed && Array.isArray(parsed.Metadata)) {
            for (const item of parsed.Metadata) {
              if (item.Type === 'WordBoundary' && item.Data) {
                const wordText = item.Data.text?.Text || '';
                const offsetSec = (item.Data.Offset || 0) / 10000000; // 100ns ticks -> seconds
                const durationSec = (item.Data.Duration || 0) / 10000000;
                if (wordText) {
                  wordBoundaries.push({
                    word: wordText,
                    offsetSec,
                    durationSec
                  });
                }
              }
            }
          }
        } catch (e) {}
      });
    }

    await new Promise((resolve, reject) => {
      const chunks = [];
      const timeout = setTimeout(() => reject(new Error('Edge TTS timeout')), 14000);
      audioStream.on('data', chunk => chunks.push(chunk));
      audioStream.on('end', () => {
        clearTimeout(timeout);
        const buf = Buffer.concat(chunks);
        if (buf.length > 500) {
          fs.writeFileSync(rawMp3Path, buf);
          resolve();
        } else {
          reject(new Error('Empty audio buffer from Edge TTS'));
        }
      });
      audioStream.on('error', err => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    if (fs.existsSync(rawMp3Path) && fs.statSync(rawMp3Path).size > 500) {
      generated = true;
    }
  } catch (err) {
    console.log(`Edge TTS fallback triggered (${err.message}), using Google TTS PT-BR...`);
  }

  if (!generated) {
    try {
      const encoded = encodeURIComponent(text.slice(0, 200));
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=pt-BR&client=tw-ob&q=${encoded}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        fs.writeFileSync(rawMp3Path, Buffer.from(arrayBuf));
        generated = true;
      }
    } catch (err2) {}
  }

  // Convert MP3 to uncompressed 44.1kHz 16-bit Stereo WAV with Studio Condenser Warmth EQ
  // (Pure EQ adds chest warmth @ 185Hz, removes 3.4kHz synthetic sheen, adds 10.5kHz mic air, with ZERO timing change!)
  if (generated) {
    execFileSync(ffmpegPath, [
      '-y', '-i', rawMp3Path,
      '-af', 'equalizer=f=185:t=q:w=1.2:g=2.2,equalizer=f=3400:t=q:w=1.8:g=-2.2,equalizer=f=10500:t=q:w=1.0:g=2.4',
      '-ar', '44100', '-ac', '2', '-c:a', 'pcm_s16le',
      outputWavPath
    ], { stdio: 'ignore' });
    try { fs.unlinkSync(rawMp3Path); } catch (e) {}
  } else {
    execFileSync(ffmpegPath, [
      '-y', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
      '-t', '4.0', '-c:a', 'pcm_s16le', outputWavPath
    ], { stdio: 'ignore' });
  }

  // Calculate sample-exact duration from WAV file size (44-byte header, 4 bytes per stereo sample at 44100Hz)
  const stat = fs.statSync(outputWavPath);
  const pcmBytes = Math.max(0, stat.size - 44);
  const exactDuration = pcmBytes / (44100 * 4);

  return {
    duration: Math.max(1.5, exactDuration),
    wordBoundaries
  };
}

// Legacy wrapper for compatibility
async function synthesizeSpeech(text, outputPath, voiceName = 'pt-BR-AntonioNeural') {
  const res = await synthesizeSpeechWithTimings(text, outputPath, voiceName);
  return res.duration;
}

function getAudioDuration(filePath) {
  if (filePath.endsWith('.wav') && fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    return Math.max(1.0, (stat.size - 44) / (44100 * 4));
  }
  return 4.0;
}

// -----------------------------------------------------------------------------
// STUDIO SFX SYNTHESIZERS (Frame-Accurate Transition Whoosh, Bass Boom, Shutter)
// -----------------------------------------------------------------------------

function injectBassBoomSFX(left, right, startSample, sampleRate, intensity = 0.85) {
  const durSamples = Math.floor(0.65 * sampleRate);
  let phase = 0;
  for (let i = 0; i < durSamples; i++) {
    const idx = startSample + i;
    if (idx < 0 || idx >= left.length) continue;

    const t = i / sampleRate;
    const freq = 34 + 101 * Math.exp(-t * 22);
    phase += (2 * Math.PI * freq) / sampleRate;

    const env = Math.exp(-t * 5.5);
    const punch = t < 0.008 ? (Math.random() * 2 - 1) * 0.55 * (1 - t / 0.008) : 0;
    const val = (Math.tanh(Math.sin(phase) * 2.2) + punch) * env * intensity;

    left[idx] += val;
    right[idx] += val;
  }
}

function injectWhooshAndShutterSFX(left, right, transitionSample, sampleRate) {
  const whooshDur = 0.32;
  const whooshSamples = Math.floor(whooshDur * sampleRate);
  const whooshStart = transitionSample - Math.floor(0.22 * sampleRate);
  let bandState = 0;

  for (let i = 0; i < whooshSamples; i++) {
    const idx = whooshStart + i;
    if (idx < 0 || idx >= left.length) continue;

    const normT = i / whooshSamples;
    const env = Math.sin(normT * Math.PI);
    const noise = Math.random() * 2 - 1;

    const alpha = 0.04 + 0.32 * env;
    bandState += alpha * (noise - bandState);

    const panL = Math.cos(normT * Math.PI * 0.5);
    const panR = Math.sin(normT * Math.PI * 0.5);

    const sample = bandState * env * 0.75;
    left[idx] += sample * panL;
    right[idx] += sample * panR;
  }

  const shutterSamples = Math.floor(0.09 * sampleRate);
  for (let i = 0; i < shutterSamples; i++) {
    const idx = transitionSample + i;
    if (idx < 0 || idx >= left.length) continue;

    const t = i / sampleRate;
    const click1 = t < 0.012 ? Math.exp(-t * 320) : 0;
    const click2 = (t >= 0.030 && t < 0.046) ? Math.exp(-(t - 0.030) * 280) * 0.85 : 0;
    const highMetallic = Math.sin(2 * Math.PI * 2800 * t) + (Math.random() * 2 - 1) * 0.9;

    const val = highMetallic * (click1 + click2) * 0.45;
    left[idx] += val;
    right[idx] += val;
  }

  injectBassBoomSFX(left, right, transitionSample, sampleRate, 0.55);
}

function injectMysteryPingSFX(left, right, pingSample, sampleRate, freq = 1108.73) {
  const durSamples = Math.floor(0.45 * sampleRate);
  for (let i = 0; i < durSamples; i++) {
    const idx = pingSample + i;
    if (idx < 0 || idx >= left.length) continue;

    const t = i / sampleRate;
    const env = Math.exp(-t * 9.5);
    const wave = Math.sin(2 * Math.PI * freq * t) * 0.7 + Math.sin(2 * Math.PI * (freq * 2) * t) * 0.3;
    const sample = wave * env * 0.22;

    left[idx] += sample * 0.8;
    right[idx] += sample * 1.1;
  }
}

function generateBackgroundMusicWav(outputPath, durationSec, mood = 'dark', sceneStartTimes = [], midCutTimes = []) {
  const sampleRate = 44100;
  const totalSamples = Math.floor((durationSec + 0.5) * sampleRate);
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  const chordSets = {
    // 🔴 DANGER (Oppenheimer / Chernobyl D-Minor Phrygian Tension)
    danger: { freqs: [146.83, 155.56, 220.00, 293.66], bpm: 144, lfoHz: 0.45, subGain: 0.40, arpMult: 2.0 },
    // 🔵 COSMIC (Interstellar C# Minor 9th Deep Space / Ocean Abyss)
    cosmic: { freqs: [138.59, 164.81, 207.65, 311.13], bpm: 126, lfoHz: 0.22, subGain: 0.34, arpMult: 2.0 },
    // 🟢 EMERALD (BBC Planet Earth F-Minor / Lydian Organic Wonder)
    emerald: { freqs: [174.61, 207.65, 261.63, 349.23], bpm: 120, lfoHz: 0.28, subGain: 0.30, arpMult: 3.0 },
    // 🟡 GOLD (Ancient History / Archaeological E-Harmonic Minor Mystery)
    gold: { freqs: [164.81, 196.00, 246.94, 311.13], bpm: 128, lfoHz: 0.30, subGain: 0.34, arpMult: 2.0 },
    dark: { freqs: [138.59, 164.81, 207.65, 277.18], bpm: 132, lfoHz: 0.25, subGain: 0.34, arpMult: 2.0 }
  };

  const preset = chordSets[mood] || chordSets.cosmic;
  const freqs = preset.freqs;
  const subFreq = freqs[0] / 4;
  const beatDur = 60 / preset.bpm;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;

    const lfo = 0.5 + 0.5 * Math.sin(2 * Math.PI * preset.lfoHz * t);
    let pad = 0;
    for (let k = 0; k < freqs.length; k++) {
      pad += Math.sin(2 * Math.PI * freqs[k] * t + Math.sin(t * (k + 1))) * 0.16;
    }

    const beatPos = (t % (beatDur * 2)) / (beatDur * 2);
    const subEnv = Math.exp(-beatPos * 4.5);
    const sub = Math.tanh(Math.sin(2 * Math.PI * subFreq * t) * 2.0) * subEnv * preset.subGain;

    const arpIdx = Math.floor(t / (beatDur / 2)) % freqs.length;
    const arpPos = (t % (beatDur / 2)) / (beatDur / 2);
    const arpEnv = Math.exp(-arpPos * 7.0);
    const arp = Math.sin(2 * Math.PI * (freqs[arpIdx] * preset.arpMult) * t) * arpEnv * 0.11;

    let masterEnv = 1.0;
    if (t < 0.25) masterEnv = t / 0.25;
    if (t > durationSec - 0.5) masterEnv = Math.max(0, (durationSec - t) / 0.5);

    left[i] = (pad * (0.7 + 0.3 * lfo) + sub + arp * 0.8) * masterEnv;
    right[i] = (pad * (1.0 - 0.3 * lfo) + sub + arp * 1.2) * masterEnv;
  }

  // 0:00 Scroll-Stopping Hook Sub-Bass Impact + Shutter
  injectWhooshAndShutterSFX(left, right, Math.floor(0.05 * sampleRate), sampleRate);
  injectBassBoomSFX(left, right, Math.floor(0.02 * sampleRate), sampleRate, 1.05);

  // Helper: Double Heartbeat ("LUB-DUB" 55Hz/68Hz) + Submarine Sonar Ping (1320Hz) for Scene 3 (~20s) & Scene 5 (~42s) Re-Hooks
  const injectHeartbeatSonarRehookSFX = (startPos) => {
    const pulses = [
      { offsetSec: 0.00, freq: 55, dur: 0.16, gain: 0.55 },
      { offsetSec: 0.22, freq: 68, dur: 0.14, gain: 0.45 },
      { offsetSec: 0.85, freq: 55, dur: 0.16, gain: 0.50 },
      { offsetSec: 1.07, freq: 68, dur: 0.14, gain: 0.40 }
    ];
    for (const p of pulses) {
      const pStart = startPos + Math.floor(p.offsetSec * sampleRate);
      const pLen = Math.floor(p.dur * sampleRate);
      for (let k = 0; k < pLen && (pStart + k) < totalSamples; k++) {
        const tau = k / sampleRate;
        const env = Math.sin(Math.PI * (k / pLen)) * Math.exp(-tau * 12);
        const thump = Math.sin(2 * Math.PI * p.freq * tau) * p.gain * env;
        left[pStart + k] += thump;
        right[pStart + k] += thump;
      }
    }
    // Submarine Sonar Alert Ping (1320Hz crystal resonance)
    const sonarStart = startPos + Math.floor(0.10 * sampleRate);
    const sonarLen = Math.floor(0.55 * sampleRate);
    for (let k = 0; k < sonarLen && (sonarStart + k) < totalSamples; k++) {
      const tau = k / sampleRate;
      const env = Math.exp(-tau * 6.5);
      const ping = Math.sin(2 * Math.PI * 1320 * tau) * 0.18 * env;
      left[sonarStart + k] += ping * 0.9;
      right[sonarStart + k] += ping * 1.1;
    }
  };

  for (let idx = 0; idx < sceneStartTimes.length; idx++) {
    const startSec = sceneStartTimes[idx];
    const samplePos = Math.floor(startSec * sampleRate);

    if (idx > 0) {
      injectWhooshAndShutterSFX(left, right, samplePos, sampleRate);
    }

    // UPGRADE #4: Anti-Drop Re-Hook Heartbeat + Sonar at Scene 3 (idx===2, ~20s) and Scene 5 (idx===4, ~42s)
    if (idx === 2 || idx === 4) {
      injectHeartbeatSonarRehookSFX(samplePos);
    }

    const pingSample = Math.floor((startSec + 1.8) * sampleRate);
    if (pingSample < totalSamples - sampleRate) {
      injectMysteryPingSFX(left, right, pingSample, sampleRate, freqs[idx % freqs.length] * 4);
    }
  }

  // Mid-Scene 3.5s Visual Cut SFX (Sub-Cut A -> Sub-Cut B whoosh + subtle low punch)
  for (const midSec of midCutTimes) {
    const midSample = Math.floor(midSec * sampleRate);
    if (midSample > sampleRate && midSample < totalSamples - sampleRate) {
      injectBassBoomSFX(left, right, midSample, sampleRate, 0.38);
      injectMysteryPingSFX(left, right, midSample, sampleRate, freqs[2] * 3);
    }
  }

  const subChunk2Size = totalSamples * 4;
  const buf = Buffer.alloc(44 + subChunk2Size);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + subChunk2Size, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(subChunk2Size, 40);

  let offset = 44;
  for (let i = 0; i < totalSamples; i++) {
    const l = Math.max(-0.98, Math.min(0.98, left[i]));
    const r = Math.max(-0.98, Math.min(0.98, right[i]));
    buf.writeInt16LE(Math.round(l * 32767), offset);
    buf.writeInt16LE(Math.round(r * 32767), offset + 2);
    offset += 4;
  }

  fs.writeFileSync(outputPath, buf);
}

module.exports = {
  synthesizeSpeech,
  synthesizeSpeechWithTimings,
  getAudioDuration,
  generateBackgroundMusicWav
};
