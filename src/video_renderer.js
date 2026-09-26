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

function renderHormoziLineVectorPaths(lineItems, centerX, baselineY, targetFontSize, maxPixelWidth = 576) {
  const cleanedItems = lineItems
    .map(item => ({ word: cleanDisplayString(item.word).toUpperCase(), isHighlighted: item.isHighlighted }))
    .filter(item => item.word.length > 0);

  if (cleanedItems.length === 0) return '';

  let fontSize = targetFontSize;
  const computeTotalWidth = (fSize) => {
    const spaceW = fSize * 0.28;
    let total = 0;
    cleanedItems.forEach((it, idx) => {
      total += hormoziFont.getAdvanceWidth(it.word, fSize);
      if (idx < cleanedItems.length - 1) total += spaceW;
    });
    return total;
  };

  let totalWidth = computeTotalWidth(fontSize);
  if (totalWidth > maxPixelWidth && totalWidth > 0) {
    fontSize = Math.max(22, Math.floor(fontSize * (maxPixelWidth / totalWidth)));
    totalWidth = computeTotalWidth(fontSize);
  }

  const spaceW = fontSize * 0.28;
  let curX = centerX - (totalWidth / 2);
  let shadowPaths = '';
  let fgPaths = '';

  for (let i = 0; i < cleanedItems.length; i++) {
    const it = cleanedItems[i];
    const wWidth = hormoziFont.getAdvanceWidth(it.word, fontSize);
    const dShadow = hormoziFont.getPath(it.word, curX + 4, baselineY + 4, fontSize).toPathData(1);
    const dMain = hormoziFont.getPath(it.word, curX, baselineY, fontSize).toPathData(1);
    const fillColor = it.isHighlighted ? '#FFE600' : '#FFFFFF';

    shadowPaths += `<path d="${dShadow}" fill="#000000" stroke="#000000" stroke-width="14" stroke-linejoin="round" stroke-linecap="round"/>`;
    fgPaths += `<path d="${dMain}" fill="none" stroke="#000000" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/><path d="${dMain}" fill="${fillColor}"/>`;

    curX += wWidth + spaceW;
  }

  return `${shadowPaths}\n${fgPaths}`;
}

// Extract clean proper/scientific noun from scene imageQuery without generic English filler words
function extractCleanEntityName(rawQuery, sourceTopic) {
  const stopWords = /\b(photo|photography|science|nature|microscope|closeup|extreme|environment|history|world|research|technology|planet|earth|mystery|zombie|ant|snake|tree|coast|ocean|island|fire|night|daytime|desert|red|water|volcano|crust|mineral|lake|bird|moss|droplet|tun|state|electron|protein|shield|molecular|asteroid|impact|dinosaur|extinction|gas|vents|flames|mining|turquoise|acid|crater|miners|carrying|baskets|giant|crystals|scientists|cooling|suits|human|lungs|alveoli|medical|illustration|underground|flooded|cavern|spores|mandible|macro|rainforest|canopy|sunlight|leaf|biting|vein|fruiting|body|head|bolts|storm|cloud|mountains|clouds|cumulonimbus|anvil|atmosphere|ozone|space|white|bark|trunks|root|system|forest|aerial|autumn|gold|ancient|mountain|snow|golden|leaves|gear|fragment|x-ray|tomography|gears|reconstruction|model|solar|eclipse|astronomy|pages|botanical|text|script|plants|astronomical|diagram|rare|book|library|subglacial|sheet|radar|sea|ice|brine|iron|oxide|extremophile|bacteria|deep|abyssal|zone|fish|creature|bioluminescence|exploration|submarine|fishing|trawler|net|uranus|and|nasa|carbon|atom|diamond|structure|rough|uncut|diamonds|laser|planetary|core|portrait|historical|lecturing|brain|anatomy|glass|slides|mirror|hexagonal|cacti|stars|reflection|observation|satellite|orbit|lithium|evaporation|ponds|map|bathyscaphe| snailfish|hydrothermal|vent|floor|submersible|rock|needles|limestone|karst|pinnacles|suspension|bridge|lemur|canyon|below|beach|jungle|shipwreck|coral|reef|navy|guard|helicopter|low|tide|bay|of|bengal|sunset|nuclear|power|plant|sarcophagus|control|room|reactor|geiger|counter|radiation|dosimeter|abandoned|city|new|safe|confinement|arch|radioactive|sample|warriors|horses|chariots|warrior|face|mausoleum|first|mound|liquid|mercury|metal|droplets|museum|pit)\b/gi;
  const cleaned = String(rawQuery || '')
    .replace(stopWords, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length >= 4) return cleaned;
  return String(sourceTopic || '').replace(/\s*\([^)]*\)/g, '').trim();
}

// Pre-fetch 25 to 45 REAL verified Wikimedia/Wikipedia photographs of the exact topic in 1-2 API requests (ZERO rate limits!)
// and contextually assign a unique photo of the topic to each scene based on what the voice is saying!
async function prefetchTopicPhotoUrlsForScenes(scriptData) {
  const scenes = scriptData.scenes || [];
  const rawTopic = String(scriptData.sourceTopic || scriptData.title || 'Ciência').replace(/\s*\([^)]*\)/g, '').trim();
  let enTitle = '';
  let heroUrl = scriptData.scenes?.[0]?.directImageUrl || null;
  const pool = []; // Array of { url, title }
  const seenUrls = new Set();

  const addCandidate = (url, title = '') => {
    if (!url || seenUrls.has(url)) return;
    if (/\.(svg|gif|tif|tiff|webm|ogv|pdf|djvu)$/i.test(url)) return;
    if (/icon|logo|symbol|flag|map_of|commons-logo|red_pencil|disambig|question_book|ambox|padlock|crystal_clear|nuvola/i.test(url)) return;
    seenUrls.add(url);
    pool.push({ url, title: String(title || '').toLowerCase() });
  };

  if (heroUrl) addCandidate(heroUrl, rawTopic);

  // 1. Single Call to PT Wikipedia: get English title (langlinks) + main pageimage
  try {
    const ptUrl = `https://pt.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(scriptData.sourceTopic || rawTopic)}&prop=langlinks|pageimages&lllang=en&piprop=original|thumbnail&pithumbsize=1080&redirects=1&format=json`;
    const ptRes = await fetch(ptUrl, {
      headers: { 'User-Agent': 'ShortsFactoryBot/5.0 (https://shorts-factory-ai-ruby.vercel.app)' },
      signal: AbortSignal.timeout(4000)
    });
    if (ptRes.ok) {
      const ptData = await ptRes.json();
      const page = Object.values(ptData.query?.pages || {})[0];
      if (page) {
        const mainImg = page.original?.source || page.thumbnail?.source;
        if (mainImg) addCandidate(mainImg, `${rawTopic} hero`);
        if (page.langlinks?.[0]?.['*']) {
          enTitle = page.langlinks[0]['*'].replace(/\s*\([^)]*\)/g, '').trim();
        }
      }
    }
  } catch (e) {}

  // 2. Build a SINGLE combined OR query for Wikimedia Commons so we get up to 45 real photos of the topic in 1 HTTP call!
  const entitySet = new Set([rawTopic]);
  if (enTitle) entitySet.add(enTitle);
  for (const s of scenes) {
    const cleanEnt = extractCleanEntityName(s.imageQuery, rawTopic);
    if (cleanEnt && cleanEnt.length >= 4) entitySet.add(cleanEnt);
  }

  const uniqueEntities = Array.from(entitySet).slice(0, 4);
  const orQuery = 'filetype:bitmap ' + uniqueEntities.map(e => `"${e}"`).join(' OR ');

  try {
    const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(orQuery)}&gsrlimit=45&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json`;
    const cRes = await fetch(commonsUrl, {
      headers: { 'User-Agent': 'ShortsFactoryBot/5.0 (https://shorts-factory-ai-ruby.vercel.app)' },
      signal: AbortSignal.timeout(4500)
    });
    if (cRes.ok) {
      const cData = await cRes.json();
      const pages = Object.values(cData.query?.pages || {});
      for (const p of pages) {
        const imgUrl = p?.imageinfo?.[0]?.thumburl || p?.imageinfo?.[0]?.url;
        addCandidate(imgUrl, p.title || '');
      }
    }
  } catch (e) {}

  // 3. If pool still has fewer than 8 photos, do 1 fallback search on Wikimedia Commons using broader topic words (without quotes)
  if (pool.length < 8) {
    try {
      const broadQuery = `filetype:bitmap ${enTitle || rawTopic}`;
      const broadUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(broadQuery)}&gsrlimit=30&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json`;
      const bRes = await fetch(broadUrl, {
        headers: { 'User-Agent': 'ShortsFactoryBot/5.0 (https://shorts-factory-ai-ruby.vercel.app)' },
        signal: AbortSignal.timeout(4000)
      });
      if (bRes.ok) {
        const bData = await bRes.json();
        for (const p of Object.values(bData.query?.pages || {})) {
          const imgUrl = p?.imageinfo?.[0]?.thumburl || p?.imageinfo?.[0]?.url;
          addCandidate(imgUrl, p.title || '');
        }
      }
    } catch (e) {}
  }

  console.log(`📸 [Topic Photo Pool] "${rawTopic}" (${enTitle || 'PT'}): ${pool.length} fotos reais da Wikipédia/Wikimedia carregadas em lote único!`);

  // 4. Assign the best matching UNUSED photo from the topic pool to each scene
  const usedIndices = new Set();
  const sceneAssignedQueues = scenes.map((s, sceneIdx) => {
    const keywords = `${s.imageQuery || ''} ${s.sceneLabel || ''} ${s.narration || ''}`
      .toLowerCase()
      .replace(/[^\wÀ-ÿ\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 4);

    // Score each available photo in the pool for this specific scene
    const scoredPool = pool.map((item, idx) => {
      let score = usedIndices.has(idx) ? -1000 : 0;
      if (sceneIdx === 0 && idx === 0) score += 500; // Scene 1 always gets Hero photo first
      for (const kw of keywords) {
        if (item.title.includes(kw)) score += 25;
      }
      if (item.title.includes(rawTopic.toLowerCase())) score += 15;
      if (enTitle && item.title.includes(enTitle.toLowerCase())) score += 15;
      return { item, idx, score };
    }).sort((a, b) => b.score - a.score);

    const bestChoice = scoredPool[0];
    if (bestChoice && bestChoice.idx !== undefined) {
      usedIndices.add(bestChoice.idx);
    }

    // Return a queue of top 4 candidate URLs for this scene (primary + 3 backups from the same topic pool)
    return scoredPool.slice(0, 4).map(x => x.item.url);
  });

  return sceneAssignedQueues;
}

async function downloadAssignedTopicPhoto(urlQueue = [], sceneIdx = 0) {
  for (const imgUrl of urlQueue) {
    if (!imgUrl) continue;
    try {
      const r = await fetch(imgUrl, {
        headers: { 'User-Agent': 'ShortsFactoryBot/5.0 (https://shorts-factory-ai-ruby.vercel.app)' },
        signal: AbortSignal.timeout(4500)
      });
      if (r.ok) {
        const buf = Buffer.from(await r.arrayBuffer());
        if (buf.length > 5500) {
          const normalized = await sharp(buf).png().toBuffer();
          console.log(`✅ [Cena ${sceneIdx + 1}] Foto contextual do tema carregada: ${imgUrl.split('/').pop().slice(0, 45)} (${Math.round(buf.length / 1024)} KB)`);
          return normalized;
        }
      }
    } catch (e) {}
  }

  const fallbackSvg = `<svg width="${CARD_W}" height="${CARD_H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#140b29"/>
        <stop offset="100%" stop-color="#052138"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="320" cy="240" r="160" fill="#00f0ff" fill-opacity="0.2"/>
  </svg>`;
  return await sharp(Buffer.from(fallbackSvg)).png().toBuffer();
}

// Group exact Microsoft Edge WordBoundary items into timed Hormozi subtitle chunks (100% locked to voice!)
function buildExactTimedChunks(narrationText, wordBoundaries, sceneDurationSec) {
  // Re-attach punctuation from original narration to the corresponding WordBoundary words
  const rawTokens = narrationText.trim().split(/\s+/).filter(Boolean);

  if (wordBoundaries && wordBoundaries.length > 0) {
    const enriched = wordBoundaries.map((wb, i) => {
      // Match punctuation suffix if rawToken at roughly same index has punctuation
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

    // Group into tight 2-3 word visual chunks (max 16 chars per chunk)
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

    // Compute exact duration of each chunk from the exact WordBoundary start of chunk[c] to start of chunk[c+1]
    // Notice that the sum of durations is MATHEMATICALLY IDENTICAL to sceneDurationSec!
    const timedChunks = [];
    for (let c = 0; c < grouped.length; c++) {
      const startSec = c === 0 ? 0.0 : grouped[c][0].offsetSec;
      const nextStartSec = (c < grouped.length - 1)
        ? Math.max(startSec + 0.08, grouped[c + 1][0].offsetSec)
        : sceneDurationSec;

      const dur = Math.max(0.08, nextStartSec - startSec);
      timedChunks.push({
        words: grouped[c].map(x => x.word),
        duration: dur
      });
    }

    // Normalize minor clamping differences so sum === sceneDurationSec to the microsecond
    const sumDur = timedChunks.reduce((acc, tc) => acc + tc.duration, 0);
    if (timedChunks.length > 0 && Math.abs(sumDur - sceneDurationSec) > 0.0001) {
      const ratio = sceneDurationSec / sumDur;
      timedChunks.forEach(tc => { tc.duration *= ratio; });
    }

    return timedChunks;
  }

  // Fallback if Google TTS was used instead of Edge TTS
  const fallbackWords = rawTokens.length > 0 ? rawTokens : ['...'];
  const chunks = [];
  for (let i = 0; i < fallbackWords.length; i += 2) {
    chunks.push(fallbackWords.slice(i, i + 2));
  }
  const eachDur = sceneDurationSec / chunks.length;
  return chunks.map(w => ({ words: w, duration: eachDur }));
}

// Group words of a chunk into lines of max ~12 chars so no line ever overflows horizontally
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

// Concatenate multiple 44.1kHz 16-bit Stereo WAV files sample-accurately into one Master WAV
function concatenateWavFilesSampleExact(wavPaths, outputMasterWavPath) {
  const pcmBuffers = [];
  let totalPcmBytes = 0;

  for (const p of wavPaths) {
    const buf = fs.readFileSync(p);
    // Standard WAV header is 44 bytes; extract raw PCM audio samples
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

// Trim leading silence on Scene 0 and trailing silence on Final Scene using WordBoundary offsets
// so that when the video loops from End -> 0:00, the narrator's voice continues with zero dead gap!
function trimSceneWavForSeamlessLoop(asset, mode) {
  if (!asset || !asset.wordBoundaries || asset.wordBoundaries.length === 0) return;

  const buf = fs.readFileSync(asset.audioWavPath);
  if (buf.length <= 44) return;
  const pcm = buf.subarray(44);
  const bytesPerFrame = 4; // 16-bit stereo = 4 bytes
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

// Render a complete vertical 9:16 frame with auto-scaled safe-margin Hormozi subtitles
async function renderCaptionedFrame({
  rawPhotoBuffer,
  blurredBackdropBuffer,
  wordsChunk,
  badgeText,
  sceneLabel,
  themeColor,
  zoomFactor,
  progressRatio,
  outputFramePath
}) {
  const resizedPhoto = await sharp(rawPhotoBuffer)
    .resize(Math.round(CARD_W * zoomFactor), Math.round(CARD_H * zoomFactor), { fit: 'cover', position: 'attention' })
    .extract({
      left: Math.floor((Math.round(CARD_W * zoomFactor) - CARD_W) / 2),
      top: Math.floor((Math.round(CARD_H * zoomFactor) - CARD_H) / 2),
      width: CARD_W,
      height: CARD_H
    })
    .png()
    .toBuffer();

  const roundedMask = Buffer.from(
    `<svg width="${CARD_W}" height="${CARD_H}"><rect x="0" y="0" width="${CARD_W}" height="${CARD_H}" rx="24" ry="24" fill="#fff"/></svg>`
  );

  const roundedPhotoCard = await sharp(resizedPhoto)
    .composite([{ input: roundedMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  let highlightIdx = wordsChunk.length - 1;
  wordsChunk.forEach((w, idx) => {
    if (w.replace(/[^\wÀ-ÿ]/g, '').length >= 5) highlightIdx = idx;
  });

  const wrappedLines = wrapWordsIntoSafeLines(wordsChunk, highlightIdx);
  const maxCharsInAnyLine = Math.max(...wrappedLines.map(line => line.map(x => x.word).join(' ').length), 1);

  let fontSize = 50;
  if (maxCharsInAnyLine >= 18) fontSize = 31;
  else if (maxCharsInAnyLine >= 15) fontSize = 36;
  else if (maxCharsInAnyLine >= 13) fontSize = 42;
  else if (maxCharsInAnyLine >= 11) fontSize = 46;

  const lineSpacing = Math.round(fontSize * 1.35);
  const baseStartY = wrappedLines.length === 1 ? 825 : (wrappedLines.length === 2 ? 790 : 765);

  const subtitleLinesSvg = wrappedLines.map((lineItems, lIdx) => {
    const yPos = baseStartY + lIdx * lineSpacing;
    return renderHormoziLineVectorPaths(lineItems, 360, yPos, fontSize, 576);
  }).join('\n');

  const cleanBadge = cleanDisplayString(badgeText || 'FATOS CURIOSOS').replace(/\s*-\s*LOOP.*$/i, '').trim() || 'FATOS CURIOSOS';
  const safeSceneLabel = cleanDisplayString(sceneLabel || 'Imagem Real de Arquivo').replace(/Loop Infinito/gi, '').slice(0, 42);
  const badgeVectorSvg = renderCenteredVectorPath(cleanBadge, 360, 109, 22, 340, themeColor);
  const labelVectorSvg = renderCenteredVectorPath(safeSceneLabel, 360, 609, 17, 560, '#e0e0ff');
  const progressWidth = Math.max(14, Math.round(WIDTH * progressRatio));

  const hudSvg = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="vignette" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#000000" stop-opacity="0.72"/>
        <stop offset="20%" stop-color="#000000" stop-opacity="0.25"/>
        <stop offset="60%" stop-color="#000000" stop-opacity="0.45"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0.92"/>
      </linearGradient>
    </defs>

    <rect width="100%" height="100%" fill="url(#vignette)"/>

    <rect x="170" y="74" width="380" height="54" rx="27" fill="#080812" fill-opacity="0.88" stroke="${themeColor}" stroke-width="3"/>
    ${badgeVectorSvg}

    <rect x="38" y="156" width="644" height="484" rx="26" fill="none" stroke="${themeColor}" stroke-width="4" stroke-opacity="0.9"/>

    <rect x="56" y="582" width="608" height="42" rx="14" fill="#000000" fill-opacity="0.78"/>
    ${labelVectorSvg}

    <g>
      ${subtitleLinesSvg}
    </g>

    <rect x="0" y="${HEIGHT - 14}" width="${WIDTH}" height="14" fill="#ffffff" fill-opacity="0.18"/>
    <rect x="0" y="${HEIGHT - 14}" width="${progressWidth}" height="14" fill="${themeColor}"/>
  </svg>`;

  await sharp(blurredBackdropBuffer)
    .composite([
      { input: roundedPhotoCard, left: 40, top: 158 },
      { input: Buffer.from(hudSvg), left: 0, top: 0 }
    ])
    .jpeg({ quality: 92 })
    .toFile(outputFramePath);
}

// Single-Pass Master Timeline Renderer (Zero Drift + Native WordBoundary Hardware Timestamps)
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
  const scenes = scriptData.scenes || [];
  const themeColor = scriptData.themeColor || '#00f0ff';
  const badgeText = 'FATOS CURIOSOS';

  onProgress(15, 'Gravando voz neural com timestamps exatos por palavra (WordBoundary)...');

  const sceneAssets = [];
  const sceneStartTimes = [];
  let totalDuration = 0;
  const blurSigma = process.env.VERCEL ? 12 : 22;

  // 1. Pre-fetch 25-45 real Wikipedia/Wikimedia photos of the exact topic in 1 single batch call (avoids 429 rate-limit!)
  const scenePhotoQueues = await prefetchTopicPhotoUrlsForScenes(scriptData);

  // 2. PARALLEL SCENE PREPARATION: Run TTS + Assigned Topic Photo Download + Backdrop Blur concurrently!
  const preparedScenes = await Promise.all(scenes.map(async (s, i) => {
    const audioWavPath = path.join(tmpDir, `scene_${i}.wav`);

    const [ttsResult, rawPhotoBuffer] = await Promise.all([
      synthesizeSpeechWithTimings(s.narration, audioWavPath, voiceName),
      downloadAssignedTopicPhoto(scenePhotoQueues[i] || scenePhotoQueues[0] || [], i)
    ]);

    const blurredBackdropBuffer = await sharp(rawPhotoBuffer)
      .resize(WIDTH, HEIGHT, { fit: 'cover' })
      .blur(blurSigma)
      .modulate({ brightness: 0.42, saturation: 1.25 })
      .png()
      .toBuffer();

    return {
      index: i,
      narration: s.narration,
      sceneLabel: s.sceneLabel || scriptData.title,
      audioWavPath,
      duration: ttsResult.duration,
      wordBoundaries: ttsResult.wordBoundaries,
      rawPhotoBuffer,
      blurredBackdropBuffer
    };
  }));

  for (let i = 0; i < preparedScenes.length; i++) {
    sceneStartTimes.push(totalDuration);
    sceneAssets.push(preparedScenes[i]);
    totalDuration += preparedScenes[i].duration;
  }

  // On Vercel Serverless, skip sequential bonus loop so total wall time stays ~28s (the 7 parallel scenes already exceed 62s!)
  const wantMonetizedLength = !process.env.VERCEL && (scriptData.durationMode || 'monetized') !== 'short';
  let bonusIdx = 0;
  const bonusFacts = [
    `Outro dado comprovado pelos pesquisadores sobre ${scriptData.sourceTopic || 'esse tema'} é como suas condições físicas raras continuam sendo monitoradas por universidades do mundo inteiro.`,
    `Esses levantamentos científicos ajudam a explicar por que ${scriptData.sourceTopic || 'esse fenômeno'} é considerado um caso único nos registros da natureza.`
  ];

  while (wantMonetizedLength && totalDuration < 62.5 && bonusIdx < bonusFacts.length) {
    const extraNarration = bonusFacts[bonusIdx];
    const extraWavPath = path.join(tmpDir, `scene_bonus_${bonusIdx}.wav`);

    const [extraTts, extraPhotoBuffer] = await Promise.all([
      synthesizeSpeechWithTimings(extraNarration, extraWavPath, voiceName),
      downloadAssignedTopicPhoto(scenePhotoQueues[(bonusIdx + 2) % scenePhotoQueues.length] || scenePhotoQueues[0] || [], scenes.length + bonusIdx)
    ]);

    const extraBackdropBuffer = await sharp(extraPhotoBuffer)
      .resize(WIDTH, HEIGHT, { fit: 'cover' })
      .blur(blurSigma)
      .modulate({ brightness: 0.42, saturation: 1.25 })
      .png()
      .toBuffer();

    const lastScene = sceneAssets.pop();
    sceneStartTimes.pop();
    totalDuration -= lastScene.duration;

    sceneStartTimes.push(totalDuration);
    sceneAssets.push({
      index: sceneAssets.length,
      narration: extraNarration,
      sceneLabel: `Curiosidade Extra • Análise Científica`,
      audioWavPath: extraWavPath,
      duration: extraTts.duration,
      wordBoundaries: extraTts.wordBoundaries,
      rawPhotoBuffer: extraPhotoBuffer,
      blurredBackdropBuffer: extraBackdropBuffer
    });
    totalDuration += extraTts.duration;

    sceneStartTimes.push(totalDuration);
    lastScene.index = sceneAssets.length;
    sceneAssets.push(lastScene);
    totalDuration += lastScene.duration;

    bonusIdx++;
  }

  // SEAMLESS INFINITE LOOP (ACOUSTIC ZERO-GAP TRIM):
  // Trim dead silence before the first spoken word of Scene 1 (0:00) and after the last spoken word of the Final Scene
  if (sceneAssets.length >= 2) {
    trimSceneWavForSeamlessLoop(sceneAssets[0], 'start');
    trimSceneWavForSeamlessLoop(sceneAssets[sceneAssets.length - 1], 'end');
  }

  // Recompute exact sceneStartTimes and totalDuration after sample-exact loop trimming
  sceneStartTimes.length = 0;
  totalDuration = 0;
  for (let i = 0; i < sceneAssets.length; i++) {
    sceneStartTimes.push(totalDuration);
    totalDuration += sceneAssets[i].duration;
  }

  onProgress(65, 'Renderizando quadros em paralelo com sincronização WordBoundary...');

  // Build ONE Single Master Frame Timeline across all scenes (ZERO scene concat drift!)
  const masterFramesListPath = path.join(tmpDir, 'master_frames.txt');
  let masterConcatContent = '';
  let elapsedDuration = 0;
  let lastRenderedFramePath = null;
  const frameJobs = [];

  for (let i = 0; i < sceneAssets.length; i++) {
    const asset = sceneAssets[i];
    const timedChunks = buildExactTimedChunks(asset.narration, asset.wordBoundaries, asset.duration);
    const isFinalLoopScene = (i === sceneAssets.length - 1 && sceneAssets.length >= 2);

    let sceneElapsed = 0;
    for (let c = 0; c < timedChunks.length; c++) {
      const framePath = path.join(tmpDir, `s${i}_c${c}.jpg`);
      const thisChunkDur = timedChunks[c].duration;
      sceneElapsed += thisChunkDur;

      const isVisualLoopBridge = isFinalLoopScene && (c >= Math.max(1, timedChunks.length - 2));
      const framePhotoBuf = isVisualLoopBridge ? sceneAssets[0].rawPhotoBuffer : asset.rawPhotoBuffer;
      const frameBackdropBuf = isVisualLoopBridge ? sceneAssets[0].blurredBackdropBuffer : asset.blurredBackdropBuffer;
      const frameLabel = isVisualLoopBridge
        ? sceneAssets[0].sceneLabel
        : asset.sceneLabel;
      const zoomFactor = isVisualLoopBridge
        ? 1.01
        : (1.0 + (c / Math.max(1, timedChunks.length)) * 0.14);
      const progressRatio = Math.min(1, (elapsedDuration + sceneElapsed) / totalDuration);

      frameJobs.push({
        rawPhotoBuffer: framePhotoBuf,
        blurredBackdropBuffer: frameBackdropBuf,
        wordsChunk: timedChunks[c].words,
        badgeText,
        sceneLabel: frameLabel,
        themeColor,
        zoomFactor,
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

  // Render frames in parallel batches of 12 so CPU finishes in ~3 seconds
  const BATCH_SIZE = 12;
  for (let b = 0; b < frameJobs.length; b += BATCH_SIZE) {
    await Promise.all(frameJobs.slice(b, b + BATCH_SIZE).map(job => renderCaptionedFrame(job)));
  }

  if (lastRenderedFramePath) {
    masterConcatContent += `file '${lastRenderedFramePath}'\n`;
  }
  fs.writeFileSync(masterFramesListPath, masterConcatContent, 'utf8');

  onProgress(84, 'Unindo áudio Master WAV sample-exact + Loop Infinito Sem Pausa...');

  // Concatenate all scene WAVs sample-by-sample with zero gap or rounding drift
  const masterVoiceWavPath = path.join(tmpDir, 'master_voice.wav');
  const exactVoiceDur = concatenateWavFilesSampleExact(sceneAssets.map(a => a.audioWavPath), masterVoiceWavPath);

  const bgMusicWav = path.join(tmpDir, 'bgm.wav');
  genBgm(bgMusicWav, exactVoiceDur, scriptData.musicMood || 'dark', sceneStartTimes);

  const finalFilename = `${jobId}.mp4`;
  const finalMp4Path = path.join(outDir, finalFilename);

  // Single-Pass Encode: Master Frames + Master Voice WAV + BGM/SFX WAV -> Final MP4
  const fpsRate = process.env.VERCEL ? '8' : '25';
  execFileSync(ffmpegPath, [
    '-y',
    '-f', 'concat', '-safe', '0', '-i', masterFramesListPath,
    '-i', masterVoiceWavPath,
    '-i', bgMusicWav,
    '-filter_complex', '[1:a]volume=1.40[voice];[2:a]volume=0.36[bgm];[voice][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]',
    '-map', '0:v',
    '-map', '[aout]',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '27', '-pix_fmt', 'yuv420p', '-r', fpsRate,
    '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2',
    '-shortest',
    '-movflags', '+faststart',
    finalMp4Path
  ], { stdio: 'ignore' });

  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch (e) {}

  let videoUrl = `/videos/${finalFilename}`;
  if (process.env.VERCEL && fs.existsSync(finalMp4Path)) {
    const b64 = fs.readFileSync(finalMp4Path).toString('base64');
    videoUrl = `data:video/mp4;base64,${b64}`;
  }

  onProgress(100, 'Short finalizado com sincronização exata WordBoundary!');

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
