const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

// Clean text for natural human conversational speech (eliminates robotic unit reading, parentheses & abbreviations)
function prepareTextForHumanSpeech(rawText) {
  if (!rawText) return '';
  let s = String(rawText);

  // 1. Remove parenthesized technical/botanical/Latin names that sound robotic when read aloud
  s = s.replace(/\s*\([A-Z][a-z]+ [a-z]+[^)]*\)/g, '');
  s = s.replace(/\s*\([a-z]+ [a-z]+[^)]*\)/g, '');
  s = s.replace(/\[\d+\]/g, '');
  s = s.replace(/\[nota \d+\]/gi, '');

  // 2. Expand common scientific, metric and geographic units to natural spoken Portuguese words
  s = s.replace(/(\d+)\s*km²\b/gi, '$1 quilômetros quadrados');
  s = s.replace(/(\d+)\s*km\/h\b/gi, '$1 quilômetros por hora');
  s = s.replace(/(\d+)\s*km\b/gi, '$1 quilômetros');
  s = s.replace(/(\d+)\s*m²\b/gi, '$1 metros quadrados');
  s = s.replace(/(\d+)\s*m³\b/gi, '$1 metros cúbicos');
  s = s.replace(/(\d+)\s*cm\b/gi, '$1 centímetros');
  s = s.replace(/(\d+)\s*mm\b/gi, '$1 milímetros');
  s = s.replace(/(\d+)\s*kg\b/gi, '$1 quilos');
  s = s.replace(/(\d+)\s*t\b/gi, '$1 toneladas');
  s = s.replace(/(\d+)\s*(?:°|º)?C\b/g, '$1 graus Celsius');
  s = s.replace(/(\d+)\s*%/g, '$1 por cento');
  s = s.replace(/(\d+)\s*x\b/gi, '$1 vezes');
  s = s.replace(/(\d+)\s*h\b/gi, '$1 horas');
  s = s.replace(/(\d+)\s*min\b/gi, '$1 minutos');
  s = s.replace(/(\d+)\s*seg\b/gi, '$1 segundos');

  // 3. Make numbers sound natural for Brazilian Portuguese
  s = s.replace(/\b(\d+)\.000\.000\b/g, '$1 milhões');
  s = s.replace(/\b(\d+)\.000\b/g, '$1 mil');
  s = s.replace(/\b1\.000\b/g, 'mil');

  // 4. Clean up robotic slashes
  s = s.replace(/(\w+)\/(\w+)/g, '$1 por $2');

  // 5. Enhance breathing pauses: ensure commas exist after natural conversational interjections
  s = s.replace(/\b(Olha só|Presta atenção|Para você ter uma ideia|E o mais louco|E o mais bizarro|E sabe o que é mais chocante|E tem mais|Inacreditável|Caramba|Nossa|Sério|Pois é|Cara)\b(?!\s*[,:!?])/gi, '$1,');

  return s.replace(/\s+/g, ' ').trim();
}

function loadElevenLabsConfig() {
  const configFile = path.join(__dirname, '..', 'data', 'elevenlabs_config.json');
  if (process.env.ELEVENLABS_API_KEY) {
    return {
      apiKey: process.env.ELEVENLABS_API_KEY.trim(),
      voiceFemale: process.env.ELEVENLABS_VOICE_FEMALE || '21m00Tcm4TlvDq8ikWAM',
      voiceMale: process.env.ELEVENLABS_VOICE_MALE || 'VR6AewLTigWG4xSOukaG'
    };
  }
  if (fs.existsSync(configFile)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      if (cfg && cfg.apiKey) return cfg;
    } catch (e) {}
  }
  return { apiKey: '', voiceFemale: '', voiceMale: '' };
}

// Synthesize speech in PT-BR with dynamic human prosody and capture EXACT Microsoft Neural WordBoundary timestamps (100ns precision!)
async function synthesizeSpeechWithTimings(text, outputWavPath, voiceName = 'pt-BR-YaraNeural', sceneIndex = 0) {
  // Sanitize voiceName to guarantee a valid Edge TTS or ElevenLabs voice
  let safeVoice = voiceName || 'pt-BR-YaraNeural';
  if (safeVoice === 'duet-yara-nicolau' || safeVoice === 'duet') {
    safeVoice = (sceneIndex % 2 === 1) ? 'pt-BR-NicolauNeural' : 'pt-BR-YaraNeural';
  } else if (safeVoice === 'duet-podcast') {
    safeVoice = (sceneIndex % 2 === 1) ? 'pt-BR-AntonioNeural' : 'pt-BR-FranciscaNeural';
  } else if (!safeVoice.startsWith('pt-BR-') && !safeVoice.startsWith('en-US-') && safeVoice !== 'elevenlabs') {
    safeVoice = (sceneIndex % 2 === 1) ? 'pt-BR-NicolauNeural' : 'pt-BR-YaraNeural';
  }
  voiceName = safeVoice;

  const rawMp3Path = outputWavPath.replace(/\.wav$/, '_raw.mp3');
  let wordBoundaries = [];
  let generated = false;
  let usedEmergencyGoogle = false;

  // Modern Dynamic Prosody (+12% rate & +3Hz pitch for engaging, punchy Shorts pacing!)
  const baseProsodyByVoice = {
    'pt-BR-YaraNeural': [
      { rate: '+12%', pitch: '+3Hz' },
      { rate: '+13%', pitch: '+4Hz' },
      { rate: '+12%', pitch: '+3Hz' },
      { rate: '+14%', pitch: '+3Hz' },
      { rate: '+13%', pitch: '+4Hz' },
      { rate: '+12%', pitch: '+3Hz' },
      { rate: '+12%', pitch: '+3Hz' }
    ],
    'pt-BR-NicolauNeural': [
      { rate: '+12%', pitch: '+3Hz' },
      { rate: '+14%', pitch: '+3Hz' },
      { rate: '+12%', pitch: '+3Hz' },
      { rate: '+13%', pitch: '+4Hz' },
      { rate: '+14%', pitch: '+3Hz' },
      { rate: '+12%', pitch: '+3Hz' },
      { rate: '+12%', pitch: '+3Hz' }
    ],
    'pt-BR-BrendaNeural': [
      { rate: '+12%', pitch: '+3Hz' },
      { rate: '+14%', pitch: '+4Hz' }
    ],
    'pt-BR-DonatoNeural': [
      { rate: '+12%', pitch: '+3Hz' },
      { rate: '+13%', pitch: '+3Hz' }
    ],
    'pt-BR-ThalitaMultilingualNeural': [
      { rate: '+10%', pitch: '+2Hz' }
    ],
    'pt-BR-AntonioNeural': [
      { rate: '+10%', pitch: '+2Hz' }
    ],
    'pt-BR-FabioNeural': [{ rate: '+10%', pitch: '+2Hz' }],
    'pt-BR-FranciscaNeural': [{ rate: '+10%', pitch: '+2Hz' }],
    'en-US-AvaMultilingualNeural': [{ rate: '+10%', pitch: '+2Hz' }],
    'en-US-EmmaMultilingualNeural': [{ rate: '+10%', pitch: '+2Hz' }]
  };

  const isMale = (voiceName.includes('Nicolau') || voiceName.includes('Antonio') || voiceName.includes('Fabio') || voiceName.includes('Donato') || (voiceName.includes('male') && !voiceName.includes('female')));
  const fallbackNeuralVoice = isMale
    ? (voiceName.includes('Nicolau') ? 'pt-BR-AntonioNeural' : 'pt-BR-NicolauNeural')
    : (voiceName.includes('Yara') ? 'pt-BR-FranciscaNeural' : 'pt-BR-YaraNeural');

  const spokenText = prepareTextForHumanSpeech(text);

  // 1. Optional ElevenLabs Studio Human Voice Check
  const elevenConfig = loadElevenLabsConfig();
  const useElevenLabs = (voiceName === 'elevenlabs' || (elevenConfig.apiKey && (voiceName || '').startsWith('elevenlabs')));

  if (useElevenLabs && elevenConfig.apiKey) {
    try {
      const voiceId = (isMale ? elevenConfig.voiceMale : elevenConfig.voiceFemale) || '21m00Tcm4TlvDq8ikWAM';
      const elRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': elevenConfig.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify({
          text: spokenText,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.5, similarity_boost: 0.8 }
        }),
        signal: AbortSignal.timeout(15000)
      });
      if (elRes.ok) {
        const audioBuf = Buffer.from(await elRes.arrayBuffer());
        if (audioBuf.length > 1000) {
          fs.writeFileSync(rawMp3Path, audioBuf);
          generated = true;
          const words = spokenText.split(/\s+/).filter(Boolean);
          let currOff = 0;
          wordBoundaries = words.map(w => {
            const wDur = Math.max(0.16, (w.length / 5) * 0.28);
            const item = { word: w, offsetSec: currOff, durationSec: wDur };
            currOff += wDur + 0.04;
            return item;
          });
          console.log(`🎙️ [ElevenLabs Cena ${sceneIndex + 1}] Áudio gerado com sucesso!`);
        }
      }
    } catch (elErr) {
      console.log(`⚠️ [ElevenLabs Cena ${sceneIndex + 1}] Falha (${elErr.message}), usando Edge TTS neural...`);
    }
  }

  async function tryEdgeSynthesis(targetVoice) {
    const tts = new MsEdgeTTS();
    await Promise.race([
      tts.setMetadata(targetVoice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3, {
        wordBoundaryEnabled: true
      }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('Edge TTS metadata timeout')), 8000))
    ]);

    const voiceCurve = baseProsodyByVoice[targetVoice] || (isMale ? baseProsodyByVoice['pt-BR-NicolauNeural'] : baseProsodyByVoice['pt-BR-YaraNeural']);
    const prosodyOptions = (voiceCurve && voiceCurve[sceneIndex % voiceCurve.length]) || { rate: '+12%', pitch: '+3Hz' };
    const { audioStream, metadataStream } = tts.toStream(spokenText, prosodyOptions);
    const localWb = [];

    if (metadataStream) {
      metadataStream.on('data', data => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed && Array.isArray(parsed.Metadata)) {
            for (const item of parsed.Metadata) {
              if (item.Type === 'WordBoundary' && item.Data) {
                const wordText = item.Data.text?.Text || '';
                const offsetSec = (item.Data.Offset || 0) / 10000000;
                const durationSec = (item.Data.Duration || 0) / 10000000;
                if (wordText) {
                  localWb.push({ word: wordText, offsetSec, durationSec });
                }
              }
            }
          }
        } catch (e) {}
      });
    }

    await new Promise((resolve, reject) => {
      let settled = false;
      const chunks = [];
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error('Edge TTS stream timeout'));
      }, 12000);

      audioStream.on('data', chunk => {
        if (!settled) chunks.push(chunk);
      });
      audioStream.on('end', () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        const buf = Buffer.concat(chunks);
        if (buf.length > 500 && fs.existsSync(path.dirname(rawMp3Path))) {
          fs.writeFileSync(rawMp3Path, buf);
          resolve();
        } else {
          reject(new Error('Buffer de áudio vazio'));
        }
      });
      audioStream.on('error', err => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(err);
      });
    });

    return localWb;
  }

  // 2. Primary Neural Voice Attempt (Edge TTS)
  if (!generated) {
    const targetVoice = (voiceName === 'elevenlabs' || !voiceName.startsWith('pt-') && !voiceName.startsWith('en-'))
      ? (isMale ? 'pt-BR-NicolauNeural' : 'pt-BR-YaraNeural')
      : voiceName;
    try {
      wordBoundaries = await tryEdgeSynthesis(targetVoice);
      generated = true;
      console.log(`🎙️ [TTS Cena ${sceneIndex + 1}] Edge TTS primário OK (${targetVoice}) - ${wordBoundaries.length} palavras`);
    } catch (err1) {
      console.log(`⚠️ [TTS Cena ${sceneIndex + 1}] Primário ${targetVoice} falhou (${err1.message}). Tentando fallback neural ${fallbackNeuralVoice}...`);
      // 3. Secondary Neural Voice Fallback
      try {
        wordBoundaries = await tryEdgeSynthesis(fallbackNeuralVoice);
        generated = true;
        console.log(`🎙️ [TTS Cena ${sceneIndex + 1}] Fallback neural OK (${fallbackNeuralVoice}) - ${wordBoundaries.length} palavras`);
      } catch (err2) {
        console.log(`⚠️ [TTS Cena ${sceneIndex + 1}] Fallback neural também falhou (${err2.message}).`);
      }
    }
  }

  // 4. Emergency Fallback: Google TTS (only if both Microsoft Neural voices were unreachable)
  if (!generated || !fs.existsSync(rawMp3Path) || fs.statSync(rawMp3Path).size <= 500) {
    try {
      const encoded = encodeURIComponent(text.slice(0, 200));
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=pt-BR&client=tw-ob&q=${encoded}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        fs.writeFileSync(rawMp3Path, Buffer.from(arrayBuf));
        generated = true;
        usedEmergencyGoogle = true;
        console.log(`⚠️ [TTS Cena ${sceneIndex + 1}] Google TTS emergencial salvo`);

        // Create synthetic word boundaries so karaoke subtitles still highlight word by word
        const words = text.trim().split(/\s+/).filter(Boolean);
        const approxDur = Math.max(2.0, words.length * 0.38);
        let currOffset = 0;
        wordBoundaries = words.map(w => {
          const wDur = Math.max(0.18, (w.length / 5) * 0.32);
          const item = { word: w, offsetSec: currOffset, durationSec: wDur };
          currOffset += wDur + 0.05;
          return item;
        });
      }
    } catch (err3) {}
  }

  const { execFile } = require('child_process');
  const { promisify } = require('util');
  const execFileAsync = promisify(execFile);

  if (generated) {
    // Clean Studio Broadcast Voice Mastering (Warm chest presence, smooth clarity, zero metallic sibilance)
    const audioFilters = usedEmergencyGoogle && isMale
      ? 'asetrate=44100*0.88,atempo=1.14,highpass=f=70,volume=1.05'
      : 'highpass=f=70,equalizer=f=240:t=q:w=1.0:g=0.6,equalizer=f=3200:t=q:w=1.0:g=0.8,equalizer=f=8500:t=q:w=1.2:g=-0.8,lowpass=f=15500,volume=1.04';

    await execFileAsync(ffmpegPath, [
      '-y', '-i', rawMp3Path,
      '-af', audioFilters,
      '-ar', '44100', '-ac', '2', '-c:a', 'pcm_s16le',
      outputWavPath
    ]);
    try { fs.unlinkSync(rawMp3Path); } catch (e) {}
  } else {
    await execFileAsync(ffmpegPath, [
      '-y', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
      '-t', '4.0', '-c:a', 'pcm_s16le', outputWavPath
    ]);
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

function generateBackgroundMusicWav(outputPath, durationSec, mood = 'upbeat_pop', sceneStartTimes = [], midCutTimes = [], wordTriggerEvents = []) {
  const sampleRate = 44100;
  const totalSamples = Math.floor((durationSec + 0.5) * sampleRate);
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  const chordSets = {
    // 🟡 UPBEAT POP / VIBRANT (126 BPM, Bright Uplifting C-Major/A-Minor Pop Melodic Progression)
    upbeat_pop: { freqs: [261.63, 329.63, 392.00, 523.25], bpm: 126, lfoHz: 0.35, subGain: 0.22, arpMult: 3.0, isUpbeat: true },
    upbeat: { freqs: [261.63, 329.63, 392.00, 523.25], bpm: 126, lfoHz: 0.35, subGain: 0.22, arpMult: 3.0, isUpbeat: true },
    vibrant_pop: { freqs: [261.63, 329.63, 392.00, 523.25], bpm: 126, lfoHz: 0.35, subGain: 0.22, arpMult: 3.0, isUpbeat: true },
    // 🔴 DANGER (Oppenheimer / Chernobyl D-Minor Phrygian Tension)
    danger: { freqs: [146.83, 155.56, 220.00, 293.66], bpm: 144, lfoHz: 0.45, subGain: 0.40, arpMult: 2.0, isUpbeat: false },
    // 🔵 COSMIC (Interstellar C# Minor 9th Deep Space / Ocean Abyss)
    cosmic: { freqs: [138.59, 164.81, 207.65, 311.13], bpm: 126, lfoHz: 0.22, subGain: 0.34, arpMult: 2.0, isUpbeat: false },
    // 🟢 EMERALD (BBC Planet Earth F-Minor / Lydian Organic Wonder)
    emerald: { freqs: [174.61, 207.65, 261.63, 349.23], bpm: 120, lfoHz: 0.28, subGain: 0.30, arpMult: 3.0, isUpbeat: false },
    // 🟡 GOLD (Ancient History / Archaeological E-Harmonic Minor Mystery)
    gold: { freqs: [164.81, 196.00, 246.94, 311.13], bpm: 128, lfoHz: 0.30, subGain: 0.34, arpMult: 2.0, isUpbeat: false },
    dark: { freqs: [261.63, 329.63, 392.00, 523.25], bpm: 126, lfoHz: 0.35, subGain: 0.22, arpMult: 3.0, isUpbeat: true }
  };

  const preset = chordSets[mood] || chordSets.upbeat_pop;
  const freqs = preset.freqs;
  const beatDur = 60 / preset.bpm;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;

    const lfo = 0.5 + 0.5 * Math.sin(2 * Math.PI * preset.lfoHz * t);
    let pad = 0;
    for (let k = 0; k < freqs.length; k++) {
      pad += Math.sin(2 * Math.PI * freqs[k] * t) * 0.07;
    }

    if (preset.isUpbeat) {
      // Lively Dynamic Pop Beat: Punchy kick on 1 & 3, crisp snare/clap on 2 & 4, bright melodic synth plucks
      const beatProgress = (t % beatDur) / beatDur;
      const beatIndex = Math.floor(t / beatDur) % 4;

      let kick = 0;
      if (beatIndex === 0 || beatIndex === 2) {
        const kickEnv = Math.exp(-beatProgress * 22);
        const kickFreq = 52 + 85 * Math.exp(-beatProgress * 30);
        kick = Math.sin(2 * Math.PI * kickFreq * beatProgress * beatDur) * kickEnv * 0.32;
      }

      let snare = 0;
      if (beatIndex === 1 || beatIndex === 3) {
        const snareEnv = Math.exp(-beatProgress * 16);
        const snareNoise = (Math.random() * 2 - 1) * 0.14;
        const snareTone = Math.sin(2 * Math.PI * 190 * beatProgress * beatDur) * 0.09;
        snare = (snareNoise + snareTone) * snareEnv;
      }

      // Fast, animated melodic arpeggio
      const arpIdx = Math.floor(t / (beatDur / 4)) % freqs.length;
      const arpPos = (t % (beatDur / 4)) / (beatDur / 4);
      const arpEnv = Math.exp(-arpPos * 9.5);
      const arp = Math.sin(2 * Math.PI * freqs[arpIdx] * 2 * t) * arpEnv * 0.038;

      let masterEnv = 1.0;
      if (t < 0.25) masterEnv = t / 0.25;
      if (t > durationSec - 0.5) masterEnv = Math.max(0, (durationSec - t) / 0.5);

      left[i] = (pad * (0.7 + 0.3 * lfo) + kick + snare + arp) * masterEnv;
      right[i] = (pad * (1.0 - 0.3 * lfo) + kick + snare + arp) * masterEnv;
    } else {
      const subFreq = freqs[0] / 4;
      const beatPos = (t % (beatDur * 2)) / (beatDur * 2);
      const subEnv = Math.exp(-beatPos * 4.0);
      const sub = Math.sin(2 * Math.PI * subFreq * t) * subEnv * (preset.subGain * 0.65);

      const arpIdx = Math.floor(t / (beatDur / 2)) % freqs.length;
      const arpPos = (t % (beatDur / 2)) / (beatDur / 2);
      const arpEnv = Math.exp(-arpPos * 8.0);
      const arp = Math.sin(2 * Math.PI * freqs[arpIdx] * t) * arpEnv * 0.025;

      let masterEnv = 1.0;
      if (t < 0.25) masterEnv = t / 0.25;
      if (t > durationSec - 0.5) masterEnv = Math.max(0, (durationSec - t) / 0.5);

      left[i] = (pad * (0.7 + 0.3 * lfo) + sub + arp) * masterEnv;
      right[i] = (pad * (1.0 - 0.3 * lfo) + sub + arp) * masterEnv;
    }
  }

  // Hook Sub-Bass Impact + Shutter at 0:00
  injectWhooshAndShutterSFX(left, right, Math.floor(0.05 * sampleRate), sampleRate);
  injectBassBoomSFX(left, right, Math.floor(0.02 * sampleRate), sampleRate, 0.70);

  // Scene Transitions: Whoosh & Shutter
  for (let idx = 0; idx < sceneStartTimes.length; idx++) {
    const startSec = sceneStartTimes[idx];
    const samplePos = Math.floor(startSec * sampleRate);
    if (idx > 0) {
      injectWhooshAndShutterSFX(left, right, samplePos, sampleRate);
    }
    const pingSample = Math.floor((startSec + 1.2) * sampleRate);
    if (pingSample < totalSamples - sampleRate) {
      injectMysteryPingSFX(left, right, pingSample, sampleRate, freqs[idx % freqs.length] * 2);
    }
  }

  // Mid-Cut 3.5s Snappy Visual Transitions
  for (const midSec of midCutTimes) {
    const midSample = Math.floor(midSec * sampleRate);
    if (midSample > sampleRate && midSample < totalSamples - sampleRate) {
      injectWhooshAndShutterSFX(left, right, midSample, sampleRate);
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
  generateBackgroundMusicWav,
  prepareTextForHumanSpeech
};
