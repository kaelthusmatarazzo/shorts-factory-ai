const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const sharp = require('sharp');
const opentype = require('opentype.js');

const WIDTH = 720;
const HEIGHT = 1280;
const CARD_W = 640;
const CARD_H = 480;

// Load bundled Hormozi-Black.ttf (Arial Black) once so SVG text is converted into pure <path d="..." /> vector curves!
// This guarantees 100% identical, razor-sharp Portuguese subtitles on Vercel Linux without needing OS system fonts!
const FONT_FILE = path.join(__dirname, 'fonts', 'Hormozi-Black.ttf');
const fontRawBuf = fs.readFileSync(FONT_FILE);
const hormoziFont = opentype.parse(fontRawBuf.buffer.slice(fontRawBuf.byteOffset, fontRawBuf.byteOffset + fontRawBuf.byteLength));

function cleanDisplayString(str) {
  return String(str || '')
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/•/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function renderCenteredVectorPath(rawText, centerX, baselineY, targetFontSize, maxPixelWidth, fill, stroke = null, strokeWidth = 0) {
  const text = cleanDisplayString(rawText);
  if (!text) return '';
  let fontSize = targetFontSize;
  const measured = hormoziFont.getAdvanceWidth(text, fontSize);
  if (measured > maxPixelWidth && measured > 0) {
    fontSize = Math.max(12, Math.floor(fontSize * (maxPixelWidth / measured)));
  }
  const actualW = hormoziFont.getAdvanceWidth(text, fontSize);
  const startX = centerX - (actualW / 2);
  const d = hormoziFont.getPath(text, startX, baselineY, fontSize).toPathData(1);
  if (stroke && strokeWidth > 0) {
    return `<path d="${d}" fill="#000000" stroke="#000000" stroke-width="${strokeWidth}" stroke-linejoin="round" stroke-linecap="round"/><path d="${d}" fill="${fill}"/>`;
  }
  return `<path d="${d}" fill="${fill}"/>`;
}

function getAtmospherePalette(colorTheme = 'cosmic') {
  const palettes = {
    danger: {
      pillFill: '#FF2A54',
      pillText: '#FFFFFF',
      accent: '#FF4081',
      dataColor: '#FFE600',
      glowColor: '#FF1744'
    },
    emerald: {
      pillFill: '#00E676',
      pillText: '#05060A',
      accent: '#00E676',
      dataColor: '#FFE600',
      glowColor: '#00C853'
    },
    gold: {
      pillFill: '#FFD700',
      pillText: '#05060A',
      accent: '#FFD700',
      dataColor: '#00E676',
      glowColor: '#FFB300'
    },
    cosmic: {
      pillFill: '#FFE600',
      pillText: '#05060A',
      accent: '#00F0FF',
      dataColor: '#FFE600',
      glowColor: '#00E5FF'
    }
  };
  return palettes[colorTheme] || palettes.cosmic;
}

function getTensionPhaseInfo(sceneIdx = 0, totalScenes = 7) {
  if (sceneIdx >= totalScenes - 1 && totalScenes >= 2) {
    return { label: 'CONEXAO INFINITA', dotColor: '#00F0FF', borderColor: '#00F0FF' };
  }
  if (sceneIdx >= 4) {
    return { label: 'FASE 3 • LIMITE EXTREMO', dotColor: '#FF2A54', borderColor: '#FF2A54' };
  }
  if (sceneIdx >= 2) {
    return { label: 'FASE 2 • DADOS REAIS', dotColor: '#FFD700', borderColor: '#FFD700' };
  }
  return { label: 'FASE 1 • A DESCOBERTA', dotColor: '#00E676', borderColor: '#00E676' };
}

function renderHormoziLineVectorPaths(lineItems, centerX, baselineY, targetFontSize, maxPixelWidth = 610, palette = null) {
  const pal = palette || getAtmospherePalette('cosmic');
  const cleanedItems = lineItems
    .map(item => ({ word: cleanDisplayString(item.word).toUpperCase(), isHighlighted: item.isHighlighted }))
    .filter(item => item.word.length > 0);

  if (cleanedItems.length === 0) return '';

  let fontSize = targetFontSize;
  const computeTotalWidth = (fSize) => {
    const spaceW = fSize * 0.36;
    let total = 0;
    cleanedItems.forEach((it, idx) => {
      const wFont = it.isHighlighted ? Math.round(fSize * 1.15) : fSize;
      total += hormoziFont.getAdvanceWidth(it.word, wFont);
      if (idx < cleanedItems.length - 1) total += spaceW;
    });
    return total;
  };

  let totalWidth = computeTotalWidth(fontSize);
  if (totalWidth > maxPixelWidth && totalWidth > 0) {
    fontSize = Math.max(24, Math.floor(fontSize * (maxPixelWidth / totalWidth)));
    totalWidth = computeTotalWidth(fontSize);
  }

  const spaceW = fontSize * 0.36;
  let curX = centerX - (totalWidth / 2);
  let pillRects = '';
  let shadowPaths = '';
  let fgPaths = '';

  for (let i = 0; i < cleanedItems.length; i++) {
    const it = cleanedItems[i];
    // IMPROVEMENT #3: 15% Elastic Pop-Zoom on the exact active word being spoken!
    const wordFontSize = it.isHighlighted ? Math.round(fontSize * 1.15) : fontSize;
    const wWidth = hormoziFont.getAdvanceWidth(it.word, wordFontSize);
    const activeBaselineY = it.isHighlighted ? Math.round(baselineY + (wordFontSize - fontSize) * 0.25) : baselineY;

    const dShadow = hormoziFont.getPath(it.word, curX + 4, activeBaselineY + 4, wordFontSize).toPathData(1);
    const dMain = hormoziFont.getPath(it.word, curX, activeBaselineY, wordFontSize).toPathData(1);

    if (it.isHighlighted) {
      const padX = Math.round(wordFontSize * 0.22);
      const pillH = Math.round(wordFontSize * 1.22);
      const pillY = Math.round(activeBaselineY - wordFontSize * 0.91);
      const pillW = Math.round(wWidth + padX * 2);
      const pillX = Math.round(curX - padX);

      pillRects += `<rect x="${pillX + 4}" y="${pillY + 5}" width="${pillW}" height="${pillH}" rx="15" fill="#000000" fill-opacity="0.85"/>`;
      pillRects += `<rect x="${pillX}" y="${pillY}" width="${pillW}" height="${pillH}" rx="15" fill="${pal.pillFill}" stroke="#000000" stroke-width="4"/>`;
      fgPaths += `<path d="${dMain}" fill="${pal.pillText}" stroke="${pal.pillText}" stroke-width="1.5" stroke-linejoin="round"/>`;
    } else {
      shadowPaths += `<path d="${dShadow}" fill="#000000" stroke="#000000" stroke-width="14" stroke-linejoin="round" stroke-linecap="round"/>`;
      fgPaths += `<path d="${dMain}" fill="none" stroke="#000000" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/><path d="${dMain}" fill="#FFFFFF"/>`;
    }

    curX += wWidth + spaceW;
  }

  return `${pillRects}\n${shadowPaths}\n${fgPaths}`;
}

// IMPROVEMENT #2: Smart Magnitude Ranker — always selects the biggest/most shocking number in the narration!
function extractDataCalloutFromNarration(narrationText = '') {
  const txt = String(narrationText || '');
  const rx = /(\b(?:\d[\d.,]*|um|uma|dois|duas|três|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|quatorze|quinze|dezesseis|dezessete|dezoito|dezenove|vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa|cem|duzentos|trezentos|quatrocentos|quinhentos|seiscentos|setecentos|oitocentos|novecentos|mil)(?:\s+e\s+(?:um|uma|dois|duas|três|quatro|cinco|seis|sete|oito|nove|vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa|duzentos|trezentos|quatrocentos|quinhentos|seiscentos|setecentos|oitocentos))?\s*(?:mil|milhões|bilhões)?\s*(?:de\s+)?(?:metros|quilômetros|km²|km\/h|km|graus(?:\s*celsius)?|°c|toneladas|quilos|kg|anos|séculos|atmosferas|roentgens|raios|cobras|árvores|troncos|sementes|andares|soldados|engrenagens|páginas|dias|minutos|segundos|vezes|por cento|%))/gi;
  const matches = Array.from(txt.matchAll(rx)).map(m => m[1].trim());
  if (matches.length === 0) return '';

  let best = matches[0];
  let bestScore = -1;
  for (const cand of matches) {
    const low = cand.toLowerCase();
    let sc = cand.length;
    if (/bilh/.test(low)) sc += 600;
    if (/milh/.test(low)) sc += 500;
    if (/\bmil\b|\d{4,}|\d+\.\d{3}/.test(low)) sc += 400;
    if (/oitenta|setenta|sessenta|cinquenta|quarenta|cem|duzentos|trezentos|quatrocentos|quinhentos|seiscentos|setecentos|oitocentos|novecentos/.test(low)) sc += 220;
    if (/toneladas|graus|°c|metros|quilômetros|km|roentgens|atmosferas|cobras|sementes|troncos|andares|raios/.test(low)) sc += 190;
    if (/^(?:um|uma|dois|duas|três|quatro|cinco|seis|sete|oito|nove|dez|quinze|vinte|trinta)\s+anos$/i.test(low)) sc -= 180;
    if (sc > bestScore) {
      bestScore = sc;
      best = cand;
    }
  }
  return `DADO REAL: ${best.toUpperCase().slice(0, 28)}`;
}

// Scientific Disambiguation Dictionary for Homonymous Wikipedia Topics (Prevents City/Country Homonym Photos!)
const SCIENTIFIC_DISAMBIGUATION_MAP = {
  'pando (árvore)': 'Populus tremuloides Pando tree Fishlake Utah',
  'pando': 'Populus tremuloides Pando tree Fishlake Utah',
  'europa (satélite)': 'Europa moon Jupiter NASA',
  'titã (satélite)': 'Titan moon Saturn Cassini',
  'quimera (peixe)': 'Chimaera fish deep sea shark',
  'pata de elefante (chernobyl)': 'Chernobyl nuclear power plant reactor',
  'matusalém (árvore)': 'Pinus longaeva bristlecone pine White Mountains',
  'rio fervente': 'Shanay-Timpishka boiling river thermal',
  'olho do saara': 'Richat Structure Mauritania satellite',
  'caverna dos cristais': 'Cave of the Crystals Naica selenite',
  'relâmpago do catatumbo': 'Catatumbo lightning storm Venezuela',
  'fossa das marianas': 'Mariana Trench Challenger Deep bathyscaphe',
  'ilha da queimada grande': 'Bothrops insularis Ilha da Queimada Grande',
  'poço superprofundo de kola': 'Kola Superdeep Borehole Russia'
};

// Extract clean proper/scientific noun from scene imageQuery without generic English filler words
function extractCleanEntityName(rawQuery, sourceTopic) {
  const stopWords = /\b(photo|photography|science|nature|microscope|closeup|extreme|environment|history|world|research|technology|planet|earth|mystery|zombie|ant|snake|tree|coast|ocean|island|fire|night|daytime|desert|red|water|volcano|crust|mineral|lake|bird|moss|droplet|tun|state|electron|protein|shield|molecular|asteroid|impact|dinosaur|extinction|gas|vents|flames|mining|turquoise|acid|crater|miners|carrying|baskets|giant|crystals|scientists|cooling|suits|human|lungs|alveoli|medical|illustration|underground|flooded|cavern|spores|mandible|macro|rainforest|canopy|sunlight|leaf|biting|vein|fruiting|body|head|bolts|storm|cloud|mountains|clouds|cumulonimbus|anvil|atmosphere|ozone|space|white|bark|trunks|root|system|forest|aerial|autumn|gold|ancient|mountain|snow|golden|leaves|gear|fragment|x-ray|tomography|gears|reconstruction|model|solar|eclipse|astronomy|pages|botanical|text|script|plants|astronomical|diagram|rare|book|library|subglacial|sheet|radar|sea|ice|brine|iron|oxide|extremophile|bacteria|deep|abyssal|zone|fish|creature|bioluminescence|exploration|submarine|fishing|trawler|net|uranus|and|nasa|carbon|atom|diamond|structure|rough|uncut|diamonds|laser|planetary|core|portrait|historical|lecturing|brain|anatomy|glass|slides|mirror|hexagonal|cacti|stars|reflection|observation|satellite|orbit|lithium|evaporation|ponds|map|bathyscaphe|snailfish|hydrothermal|vent|floor|submersible|rock|needles|limestone|karst|pinnacles|suspension|bridge|lemur|canyon|below|beach|jungle|shipwreck|coral|reef|navy|guard|helicopter|low|tide|bay|of|bengal|sunset|nuclear|power|plant|sarcophagus|control|room|reactor|geiger|counter|radiation|dosimeter|abandoned|city|new|safe|confinement|arch|radioactive|sample|warriors|horses|chariots|warrior|face|mausoleum|first|mound|liquid|mercury|metal|droplets|museum|pit)\b/gi;
  const cleaned = String(rawQuery || '')
    .replace(stopWords, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length >= 4) return cleaned;
  return String(sourceTopic || '').replace(/\s*\([^)]*\)/g, '').trim();
}

// IMPROVEMENT #1: Scientific Disambiguated Batch Photo Fetcher (Zero Homonyms!)
async function prefetchTopicPhotoUrlsForScenes(scriptData) {
  const scenes = scriptData.scenes || [];
  const fullSourceTopic = String(scriptData.sourceTopic || scriptData.title || 'Ciência').trim();
  const topicLower = fullSourceTopic.toLowerCase();
  const disambiguatedTerm = SCIENTIFIC_DISAMBIGUATION_MAP[topicLower]
    || SCIENTIFIC_DISAMBIGUATION_MAP[topicLower.replace(/\s*\([^)]*\)/g, '').trim()]
    || scriptData.wikiSearch
    || '';
  const rawTopic = disambiguatedTerm || fullSourceTopic.replace(/\s*\([^)]*\)/g, '').trim();

  let enTitleFull = '';
  let enTitleClean = '';
  let heroUrl = scriptData.scenes?.[0]?.directImageUrl || null;
  const pool = [];
  const seenUrls = new Set();

  const addCandidate = (url, title = '') => {
    if (!url || seenUrls.has(url)) return;
    if (/\.svg|\.gif|\.tif|\.pdf|\.ogg|\.ogv|\.webm/i.test(url)) return;
    const checkStr = String(title || '').toLowerCase();
    if (/logo|icon|flag|coat_of_arms|signature|map|locator|diagram|chart|graph|symbol|stamp|medal|portrait_placeholder|commons-logo|wikidata/i.test(checkStr)) return;
    seenUrls.add(url);
    pool.push({ url, title: checkStr });
  };

  if (heroUrl) addCandidate(heroUrl, fullSourceTopic);

  // 1. Fast PT Wikipedia Lookup -> English title + PT Thumbnail
  try {
    const ptUrl = `https://pt.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(fullSourceTopic)}&prop=pageimages|langlinks&piprop=thumbnail&pithumbsize=1000&lllang=en&redirects=1&format=json`;
    const ptRes = await fetch(ptUrl, {
      headers: { 'User-Agent': 'ShortsFactoryBot/5.0 (https://shorts-factory-ai-ruby.vercel.app)' },
      signal: AbortSignal.timeout(2200)
    });
    if (ptRes.ok) {
      const ptData = await ptRes.json();
      const page = Object.values(ptData.query?.pages || {})[0];
      if (page?.thumbnail?.source) addCandidate(page.thumbnail.source, page.title || fullSourceTopic);
      if (page?.langlinks?.[0]?.['*']) {
        enTitleFull = page.langlinks[0]['*'].trim();
        enTitleClean = enTitleFull.replace(/\s*\([^)]*\)/g, '').trim();
      }
    }
  } catch (e) {}

  // 2. Parallel English Wikipedia Article Images + Wikimedia Commons Topic Photos
  const searchTopic = enTitleClean || fullSourceTopic || rawTopic;
  await Promise.allSettled([
    (async () => {
      if (!enTitleFull) return;
      const enUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=images&titles=${encodeURIComponent(enTitleFull)}&gimlimit=25&prop=imageinfo&iiprop=url&iiurlwidth=1000&format=json`;
      const enRes = await fetch(enUrl, { headers: { 'User-Agent': 'ShortsFactoryBot/5.0' }, signal: AbortSignal.timeout(2400) });
      if (enRes.ok) {
        const enData = await enRes.json();
        for (const p of Object.values(enData.query?.pages || {})) {
          const ii = p.imageinfo?.[0];
          if (ii?.thumburl || ii?.url) addCandidate(ii.thumburl || ii.url, p.title || '');
        }
      }
    })(),
    (async () => {
      const q = `filetype:bitmap ${searchTopic}`;
      const cUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(q)}&gsrlimit=30&prop=imageinfo&iiprop=url&iiurlwidth=1000&format=json`;
      const cRes = await fetch(cUrl, { headers: { 'User-Agent': 'ShortsFactoryBot/5.0' }, signal: AbortSignal.timeout(2400) });
      if (cRes.ok) {
        const cData = await cRes.json();
        for (const p of Object.values(cData.query?.pages || {})) {
          const ii = p.imageinfo?.[0];
          if (ii?.thumburl || ii?.url) addCandidate(ii.thumburl || ii.url, p.title || '');
        }
      }
    })()
  ]);

  const curatedFallbacks = [
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1080&q=80',
    'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1080&q=80',
    'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1080&q=80',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1080&q=80',
    'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1080&q=80',
    'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=1080&q=80'
  ];
  for (const fb of curatedFallbacks) addCandidate(fb, 'fallback_cinema');

  console.log(`📸 [Photo Pool] "${rawTopic}" (${enTitleClean || 'PT'}): ${pool.length} fotos reais HD encontradas!`);

  // Assign 2 distinct real photos per scene (Photo A for 1st half, Photo B for 2nd half)
  let pCursor = 0;
  return scenes.map((_, sIdx) => {
    const qA = [
      pool[pCursor % pool.length]?.url,
      pool[(pCursor + 3) % pool.length]?.url,
      curatedFallbacks[sIdx % curatedFallbacks.length]
    ].filter(Boolean);
    pCursor++;
    const qB = [
      pool[pCursor % pool.length]?.url,
      pool[(pCursor + 3) % pool.length]?.url,
      curatedFallbacks[(sIdx + 2) % curatedFallbacks.length]
    ].filter(Boolean);
    pCursor++;
    return { queueA: qA, queueB: qB };
  });
}

// Downloads a real photo and creates a SINGLE rock-steady 720x1280 HD background buffer (ZERO shaking!)
async function prepareScenePhotoBuffer(urlQueue = [], colorTheme = 'cosmic') {
  const pal = getAtmospherePalette(colorTheme);
  let rawImgBuf = null;

  for (const url of urlQueue) {
    if (!url) continue;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'ShortsFactoryBot/5.0 (https://shorts-factory-ai-ruby.vercel.app)' },
        signal: AbortSignal.timeout(2400)
      });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 8000) {
          rawImgBuf = buf;
          break;
        }
      }
    } catch (e) {}
  }

  // Subtle dark gradient at the bottom so the Karaoke Subtitles pop with 100% contrast
  const vignetteSvg = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#000000" stop-opacity="0.12"/>
        <stop offset="55%" stop-color="#000000" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="#04060c" stop-opacity="0.78"/>
      </linearGradient>
    </defs>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bgGrad)"/>
  </svg>`;

  if (rawImgBuf) {
    try {
      return await sharp(rawImgBuf)
        .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'attention' })
        .modulate({ brightness: 0.96, saturation: 1.15 })
        .composite([{ input: Buffer.from(vignetteSvg), top: 0, left: 0 }])
        .jpeg({ quality: 84 })
        .toBuffer();
    } catch (e) {}
  }

  // Fallback dark studio canvas if offline
  const fallbackSvg = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${WIDTH}" height="${HEIGHT}" fill="${pal.bgGradTop}"/>
  </svg>`;
  return sharp(Buffer.from(fallbackSvg)).jpeg({ quality: 82 }).toBuffer();
}

// UPGRADE #3: Build Word-Level Active Pill Subtitle Steps inside Stationary 2-3 Word Phrases!
function buildExactTimedChunks(narrationText, wordBoundaries, sceneDurationSec) {
  const rawTokens = narrationText.trim().split(/\s+/).filter(Boolean);

  if (wordBoundaries && wordBoundaries.length > 0) {
    const enriched = wordBoundaries.map((wb, i) => {
      const candidateRaw = rawTokens[i] || wb.word;
      const punctMatch = candidateRaw.match(/[,.;:!?]+$/);
      const displayWord = punctMatch && !wb.word.endsWith(punctMatch[0])
        ? wb.word + punctMatch[0]
        : wb.word;
      return {
        word: displayWord,
        offsetSec: wb.offsetSec,
        durationSec: wb.durationSec
      };
    });

    // Group into tight 2-3 word visual phrases (max 16 chars per phrase)
    const grouped = [];
    let current = [];
    let currentChars = 0;

    for (let i = 0; i < enriched.length; i++) {
      const item = enriched[i];
      const wLen = item.word.replace(/[^\wÀ-ÿ]/g, '').length;

      if (current.length > 0 && (current.length >= 3 || currentChars + wLen > 16 || wLen >= 11)) {
        grouped.push(current);
        current = [];
        currentChars = 0;
      }

      current.push(item);
      currentChars += wLen;

      if (/[,.;:!?]$/.test(item.word) || wLen >= 11) {
        grouped.push(current);
        current = [];
        currentChars = 0;
      }
    }
    if (current.length > 0) grouped.push(current);

    // Create Word-by-Word Active Pill sub-steps for each phrase so the Neon Pill jumps across each spoken word!
    const wordStepChunks = [];
    for (let c = 0; c < grouped.length; c++) {
      const phraseItems = grouped[c];
      const phraseWords = phraseItems.map(x => x.word);
      const phraseStartSec = c === 0 ? 0.0 : phraseItems[0].offsetSec;
      const nextPhraseStartSec = (c < grouped.length - 1)
        ? Math.max(phraseStartSec + 0.09, grouped[c + 1][0].offsetSec)
        : sceneDurationSec;

      for (let wIdx = 0; wIdx < phraseItems.length; wIdx++) {
        const wStart = (c === 0 && wIdx === 0) ? 0.0 : phraseItems[wIdx].offsetSec;
        const wEnd = (wIdx < phraseItems.length - 1)
          ? Math.max(wStart + 0.06, phraseItems[wIdx + 1].offsetSec)
          : Math.max(wStart + 0.06, nextPhraseStartSec);

        wordStepChunks.push({
          words: phraseWords,
          activeWordIdx: wIdx,
          duration: Math.max(0.06, wEnd - wStart)
        });
      }
    }

    const sumDur = wordStepChunks.reduce((acc, tc) => acc + tc.duration, 0);
    if (wordStepChunks.length > 0 && Math.abs(sumDur - sceneDurationSec) > 0.0001) {
      const ratio = sceneDurationSec / sumDur;
      wordStepChunks.forEach(tc => { tc.duration *= ratio; });
    }

    return wordStepChunks;
  }

  const fallbackWords = rawTokens.length > 0 ? rawTokens : ['...'];
  const chunks = [];
  for (let i = 0; i < fallbackWords.length; i += 2) {
    chunks.push(fallbackWords.slice(i, i + 2));
  }
  const eachDur = sceneDurationSec / Math.max(1, chunks.length);
  return chunks.map(w => ({ words: w, activeWordIdx: 0, duration: eachDur }));
}

function wrapWordsIntoSafeLines(wordsChunk, highlightIdx) {
  const lines = [];
  let curLine = [];
  let curLen = 0;

  wordsChunk.forEach((w, idx) => {
    const cleanLen = w.length;
    if (curLine.length > 0 && (curLine.length >= 2 || curLen + 1 + cleanLen > 12)) {
      lines.push(curLine);
      curLine = [];
      curLen = 0;
    }
    curLine.push({ word: w, isHighlighted: idx === highlightIdx });
    curLen += (curLen > 0 ? 1 : 0) + cleanLen;
  });

  if (curLine.length > 0) lines.push(curLine);
  return lines;
}

function concatenateWavFilesSampleExact(wavPaths, outputMasterWavPath) {
  const pcmBuffers = [];
  let totalPcmBytes = 0;

  for (const p of wavPaths) {
    const buf = fs.readFileSync(p);
    const pcm = buf.subarray(44);
    pcmBuffers.push(pcm);
    totalPcmBytes += pcm.length;
  }

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + totalPcmBytes, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(2, 22);
  header.writeUInt32LE(44100, 24);
  header.writeUInt32LE(44100 * 4, 28);
  header.writeUInt16LE(4, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(totalPcmBytes, 40);

  fs.writeFileSync(outputMasterWavPath, Buffer.concat([header, ...pcmBuffers]));
  return totalPcmBytes / (44100 * 4);
}

function trimSceneWavForSeamlessLoop(asset, mode) {
  if (!asset || !asset.wordBoundaries || asset.wordBoundaries.length === 0) return;

  const buf = fs.readFileSync(asset.audioWavPath);
  if (buf.length <= 44) return;
  const pcm = buf.subarray(44);
  const bytesPerFrame = 4;
  const sampleRate = 44100;

  let startByte = 0;
  let endByte = pcm.length;
  let trimStartSec = 0;

  if (mode === 'start') {
    const firstWb = asset.wordBoundaries[0];
    trimStartSec = Math.max(0, firstWb.offsetSec - 0.025);
    const startFrame = Math.floor(trimStartSec * sampleRate);
    startByte = Math.min(pcm.length - bytesPerFrame, startFrame * bytesPerFrame);
    trimStartSec = (startByte / bytesPerFrame) / sampleRate;
  } else if (mode === 'end') {
    const lastWb = asset.wordBoundaries[asset.wordBoundaries.length - 1];
    const speechEndSec = lastWb.offsetSec + lastWb.durationSec + 0.035;
    const endFrame = Math.ceil(speechEndSec * sampleRate);
    endByte = Math.min(pcm.length, Math.max(bytesPerFrame * 4410, endFrame * bytesPerFrame));
  }

  if (startByte === 0 && endByte === pcm.length) return;

  const slicedPcm = pcm.subarray(startByte, endByte);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + slicedPcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(2, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * bytesPerFrame, 28);
  header.writeUInt16LE(bytesPerFrame, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(slicedPcm.length, 40);

  fs.writeFileSync(asset.audioWavPath, Buffer.concat([header, slicedPcm]));
  asset.duration = slicedPcm.length / (sampleRate * bytesPerFrame);

  if (mode === 'start' && trimStartSec > 0) {
    asset.wordBoundaries = asset.wordBoundaries.map(wb => ({
      ...wb,
      offsetSec: Math.max(0, wb.offsetSec - trimStartSec)
    }));
  }
}

// Clean 720x1280 HD Frame Renderer: Real Topic Photo + Hormozi Karaoke Subtitles ONLY (zero extra text badges, zero shaking!)
async function renderCaptionedFrame({
  photoBuffer,
  wordsChunk,
  activeWordIdx = 0,
  palette = null,
  progressRatio,
  outputFramePath
}) {
  const pal = palette || getAtmospherePalette('cosmic');
  const highlightIdx = (activeWordIdx >= 0 && activeWordIdx < wordsChunk.length) ? activeWordIdx : 0;
  const wrappedLines = wrapWordsIntoSafeLines(wordsChunk, highlightIdx);
  const maxCharsInAnyLine = Math.max(...wrappedLines.map(line => line.map(x => x.word).join(' ').length), 1);

  let fontSize = 52;
  if (maxCharsInAnyLine >= 18) fontSize = 33;
  else if (maxCharsInAnyLine >= 15) fontSize = 38;
  else if (maxCharsInAnyLine >= 13) fontSize = 44;
  else if (maxCharsInAnyLine >= 11) fontSize = 48;

  const lineSpacing = Math.round(fontSize * 1.42);
  const baseStartY = wrappedLines.length === 1 ? 885 : (wrappedLines.length === 2 ? 850 : 820);

  const subtitleLinesSvg = wrappedLines.map((lineItems, lIdx) => {
    const yPos = baseStartY + lIdx * lineSpacing;
    return renderHormoziLineVectorPaths(lineItems, 360, yPos, fontSize, 600, pal);
  }).join('\n');

  const progressWidth = Math.max(14, Math.round(WIDTH * progressRatio));

  // Clean HUD SVG containing ONLY Karaoke Subtitles + Bottom Progress Bar!
  const hudSvg = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <g>
      ${subtitleLinesSvg}
    </g>
    <rect x="0" y="${HEIGHT - 14}" width="${WIDTH}" height="14" fill="#ffffff" fill-opacity="0.18"/>
    <rect x="0" y="${HEIGHT - 14}" width="${progressWidth}" height="14" fill="${pal.pillFill}"/>
  </svg>`;

  await sharp(photoBuffer)
    .composite([{ input: Buffer.from(hudSvg), top: 0, left: 0 }])
    .jpeg({ quality: 84 })
    .toFile(outputFramePath);
}

// Single-Pass Studio 4.0 Master Timeline Renderer (14 Real Photos HD + Clean Karaoke Subtitles — finishes in ~10s!)
async function buildShortVideo(scriptData, options = {}, onProgress = () => {}) {
  const os = require('os');
  const jobId = `short_${Date.now()}`;
  const outDir = process.env.VERCEL
    ? path.join(os.tmpdir(), 'shorts-factory-videos')
    : path.join(__dirname, '..', 'public', 'videos');
  const tmpDir = process.env.VERCEL
    ? path.join(os.tmpdir(), jobId)
    : path.join(__dirname, '..', 'tmp', jobId);

  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(tmpDir, { recursive: true });

  delete require.cache[require.resolve('./tts_and_audio')];
  const { synthesizeSpeechWithTimings, generateBackgroundMusicWav: genBgm } = require('./tts_and_audio');

  const voiceName = options.voice || 'pt-BR-ThalitaMultilingualNeural';
  const isDuetPodcast = (voiceName === 'duet-podcast');
  const scenes = scriptData.scenes || [];
  const colorTheme = scriptData.colorTheme || 'cosmic';
  const palette = getAtmospherePalette(colorTheme);

  onProgress(15, 'Studio 4.0: Baixando 14 Fotos Reais HD + Gravando Vozes Simultaneamente...');

  const sceneAssets = [];
  const sceneStartTimes = [];
  let totalDuration = 0;

  // 1. Run ALL Neural Voice Synthesis AND 14 Real Photo Downloads AT THE EXACT SAME TIME!
  const ttsJobsPromise = Promise.all(scenes.map(async (s, i) => {
    const audioWavPath = path.join(tmpDir, `scene_${i}.wav`);
    let sceneVoice = voiceName;
    if (isDuetPodcast) {
      const isLastLoop = (i === scenes.length - 1 && scenes.length >= 2);
      sceneVoice = (i % 2 === 1 && !isLastLoop)
        ? 'pt-BR-AntonioNeural'
        : 'pt-BR-ThalitaMultilingualNeural';
    }
    const ttsResult = await synthesizeSpeechWithTimings(s.narration, audioWavPath, sceneVoice, i);
    return { audioWavPath, ttsResult };
  }));

  const photosPreparePromise = (async () => {
    const photoQueues = await prefetchTopicPhotoUrlsForScenes(scriptData);
    return Promise.all(scenes.map(async (_, i) => {
      const pQ = photoQueues[i] || photoQueues[0] || { queueA: [], queueB: [] };
      const [photoBufA, photoBufB] = await Promise.all([
        prepareScenePhotoBuffer(pQ.queueA, colorTheme),
        prepareScenePhotoBuffer(pQ.queueB, colorTheme)
      ]);
      return { photoBufA, photoBufB };
    }));
  })();

  const [ttsResults, scenePhotoBuffers] = await Promise.all([
    ttsJobsPromise,
    photosPreparePromise
  ]);

  onProgress(52, 'Sincronizando 14 Fotos Reais HD com as Vozes...');

  for (let i = 0; i < scenes.length; i++) {
    const { audioWavPath, ttsResult } = ttsResults[i];
    const { photoBufA, photoBufB } = scenePhotoBuffers[i];
    sceneStartTimes.push(totalDuration);
    sceneAssets.push({
      index: i,
      narration: scenes[i].narration,
      audioWavPath,
      photoBufA,
      photoBufB,
      duration: ttsResult.duration,
      wordBoundaries: ttsResult.wordBoundaries
    });
    totalDuration += ttsResult.duration;
  }

  // SEAMLESS INFINITE LOOP (ACOUSTIC ZERO-GAP TRIM):
  if (sceneAssets.length >= 2) {
    trimSceneWavForSeamlessLoop(sceneAssets[0], 'start');
    trimSceneWavForSeamlessLoop(sceneAssets[sceneAssets.length - 1], 'end');
  }

  sceneStartTimes.length = 0;
  const midCutTimes = [];
  totalDuration = 0;
  for (let i = 0; i < sceneAssets.length; i++) {
    sceneStartTimes.push(totalDuration);
    midCutTimes.push(totalDuration + sceneAssets[i].duration * 0.50);
    totalDuration += sceneAssets[i].duration;
  }

  onProgress(68, 'Renderizando Quadros 720x1280 HD + Legendas Karaokê...');

  const masterFramesListPath = path.join(tmpDir, 'master_frames.txt');
  let masterConcatContent = '';
  let elapsedDuration = 0;
  let lastRenderedFramePath = null;
  const frameJobs = [];

  for (let i = 0; i < sceneAssets.length; i++) {
    const asset = sceneAssets[i];
    const timedChunks = buildExactTimedChunks(asset.narration, asset.wordBoundaries, asset.duration);
    const halfIdx = Math.max(1, Math.floor(timedChunks.length / 2));
    let sceneElapsed = 0;

    // On the final loop scene, use Scene 1's Photo A in the 2nd half so the visual loop to 0:00 is seamless!
    const isLastScene = (i === sceneAssets.length - 1 && sceneAssets.length >= 2);
    const secondHalfBuf = isLastScene ? sceneAssets[0].photoBufA : asset.photoBufB;

    for (let c = 0; c < timedChunks.length; c++) {
      const framePath = path.join(tmpDir, `frame_${i}_${c}.jpg`);
      const thisChunkDur = timedChunks[c].duration;
      sceneElapsed += thisChunkDur;
      const progressRatio = Math.min(1, (elapsedDuration + sceneElapsed) / totalDuration);

      const photoBuffer = (c < halfIdx) ? asset.photoBufA : secondHalfBuf;

      frameJobs.push({
        photoBuffer,
        wordsChunk: timedChunks[c].words,
        activeWordIdx: timedChunks[c].activeWordIdx,
        palette,
        progressRatio,
        outputFramePath: framePath
      });

      const safeFramePath = framePath.replace(/\\/g, '/');
      masterConcatContent += `file '${safeFramePath}'\n`;
      masterConcatContent += `duration ${thisChunkDur.toFixed(4)}\n`;
      lastRenderedFramePath = safeFramePath;
    }

    elapsedDuration += asset.duration;
  }

  // Render all 720x1280 JPEG frames in parallel batches
  const BATCH_SIZE = 28;
  for (let b = 0; b < frameJobs.length; b += BATCH_SIZE) {
    await Promise.all(frameJobs.slice(b, b + BATCH_SIZE).map(job => renderCaptionedFrame(job)));
  }

  if (lastRenderedFramePath) {
    masterConcatContent += `file '${lastRenderedFramePath}'\n`;
  }
  fs.writeFileSync(masterFramesListPath, masterConcatContent, 'utf8');

  onProgress(86, 'Masterizando Vídeo 720x1280 HD + Voz Shure SM7B...');

  const masterVoiceWavPath = path.join(tmpDir, 'master_voice.wav');
  const exactVoiceDur = concatenateWavFilesSampleExact(sceneAssets.map(a => a.audioWavPath), masterVoiceWavPath);

  const bgMusicWav = path.join(tmpDir, 'bgm.wav');
  genBgm(bgMusicWav, exactVoiceDur, colorTheme || scriptData.musicMood || 'cosmic', sceneStartTimes, midCutTimes);

  const finalFilename = `${jobId}.mp4`;
  const finalMp4Path = path.join(outDir, finalFilename);

  const ffmpegArgs = [
    '-y',
    '-f', 'concat', '-safe', '0', '-i', masterFramesListPath,
    '-i', masterVoiceWavPath,
    '-i', bgMusicWav,
    '-filter_complex',
    '[1:a]highpass=f=75,acompressor=threshold=-16dB:ratio=3:attack=5:release=60:makeup=2,volume=1.38[voice];[2:a]volume=0.33[bgm];[voice][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]',
    '-map', '0:v',
    '-map', '[aout]',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'stillimage', '-crf', '24', '-pix_fmt', 'yuv420p', '-fps_mode', 'vfr',
    '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2',
    '-shortest',
    '-movflags', '+faststart',
    finalMp4Path
  ];

  execFileSync(ffmpegPath, ffmpegArgs, { stdio: 'ignore' });

  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch (e) {}

  let videoUrl = `/videos/${finalFilename}`;
  if (process.env.VERCEL && fs.existsSync(finalMp4Path)) {
    const b64 = fs.readFileSync(finalMp4Path).toString('base64');
    videoUrl = `data:video/mp4;base64,${b64}`;
  }

  onProgress(100, 'Short com Vídeos Reais HD finalizado!');

  return {
    id: jobId,
    filename: finalFilename,
    url: videoUrl,
    duration: Math.round(totalDuration),
    createdAt: new Date().toISOString(),
    ...scriptData
  };
}

module.exports = {
  buildShortVideo
};
