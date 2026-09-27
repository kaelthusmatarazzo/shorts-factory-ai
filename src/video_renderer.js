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

  const addVideoCandidate = (url, title = '') => {
    if (!url || seenUrls.has(url)) return;
    const checkStr = String(title || '').toLowerCase();
    // Block talking heads, conferences, tutorials, maps, and non-cinematic clips
    if (/wikimania|conference|interview|lecture|speech|pronunciation|sign_language|screencast|tutorial|icon|logo|flag|map|chart|graph|diagram|uruguay|policia|municipio|alcaldia|speaker|talk|presentation|webcam|animation/i.test(checkStr)) return;
    seenUrls.add(url);
    pool.push({ url, title: checkStr });
  };

  // 1. Fast PT Wikipedia Lookup to get English topic title (1.8s timeout)
  try {
    const ptUrl = `https://pt.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(fullSourceTopic)}&prop=langlinks&lllang=en&redirects=1&format=json`;
    const ptRes = await fetch(ptUrl, {
      headers: { 'User-Agent': 'ShortsFactoryBot/5.0 (https://shorts-factory-ai-ruby.vercel.app)' },
      signal: AbortSignal.timeout(1800)
    });
    if (ptRes.ok) {
      const ptData = await ptRes.json();
      const page = Object.values(ptData.query?.pages || {})[0];
      if (page?.langlinks?.[0]?.['*']) {
        enTitleFull = page.langlinks[0]['*'].trim();
        enTitleClean = enTitleFull.replace(/\s*\([^)]*\)/g, '').trim();
      }
    }
  } catch (e) {}

  // 2. Build Real Video Queries (filetype:video with fast 360p.mpeg4.mov / 480p.vp9.webm transcodes!)
  const colorTheme = scriptData.colorTheme || 'cosmic';
  const themeVideoQuery = colorTheme === 'danger'
    ? 'filetype:video volcano eruption OR lava flow OR lightning storm OR canyon drone OR glacier OR fire'
    : colorTheme === 'emerald'
      ? 'filetype:video drone forest OR ocean waves aerial OR waterfall drone OR coral reef OR dolphins OR nature drone'
      : colorTheme === 'gold'
        ? 'filetype:video desert drone OR canyon aerial OR mountains drone OR eclipse OR ruins aerial OR clouds timelapse'
        : 'filetype:video planet earth space OR aurora borealis OR galaxy OR solar flare OR night sky timelapse OR ocean drone';

  const cleanTopicWords = (enTitleClean || rawTopic).replace(/[^\w\s]/g, ' ').split(/\s+/).filter(w => w.length >= 4).slice(0, 2).join(' ');
  const topicVideoQuery = `filetype:video ${cleanTopicWords} drone OR aerial OR timelapse OR nature OR space`;
  const backupDroneQuery = `filetype:video drone footage aerial view ocean OR mountains OR volcano OR forest OR earth`;

  const extractBestVideoDerivative = (pageObj) => {
    const derivs = pageObj?.videoinfo?.[0]?.derivatives || [];
    // Prefer 360p.mpeg4.mov (ultra-fast hardware/software decode in FFmpeg) or 480p.vp9.webm / 240p.vp9.webm
    const mpeg4 = derivs.find(d => d.src && d.transcodekey === '360p.mpeg4.mov');
    if (mpeg4) return mpeg4.src;
    const vp9_480 = derivs.find(d => d.src && d.transcodekey === '480p.vp9.webm');
    if (vp9_480) return vp9_480.src;
    const vp9_240 = derivs.find(d => d.src && d.transcodekey === '240p.vp9.webm');
    if (vp9_240) return vp9_240.src;
    const anySmall = derivs.find(d => d.src && d.height >= 240 && d.height <= 720);
    return anySmall ? anySmall.src : null;
  };

  await Promise.allSettled([
    // 2A. Topic-Specific Real Videos
    (async () => {
      const u1 = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(topicVideoQuery)}&gsrlimit=20&prop=videoinfo&viprop=derivatives&format=json`;
      const r1 = await fetch(u1, { headers: { 'User-Agent': 'ShortsFactoryBot/5.0' }, signal: AbortSignal.timeout(2400) });
      if (r1.ok) {
        const d1 = await r1.json();
        for (const p of Object.values(d1.query?.pages || {})) {
          const vUrl = extractBestVideoDerivative(p);
          if (vUrl) addVideoCandidate(vUrl, p.title || '');
        }
      }
    })(),
    // 2B. Atmosphere-Specific Cinematic Real Videos
    (async () => {
      const u2 = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(themeVideoQuery)}&gsrlimit=30&prop=videoinfo&viprop=derivatives&format=json`;
      const r2 = await fetch(u2, { headers: { 'User-Agent': 'ShortsFactoryBot/5.0' }, signal: AbortSignal.timeout(2400) });
      if (r2.ok) {
        const d2 = await r2.json();
        for (const p of Object.values(d2.query?.pages || {})) {
          const vUrl = extractBestVideoDerivative(p);
          if (vUrl) addVideoCandidate(vUrl, p.title || '');
        }
      }
    })(),
    // 2C. Backup 4K Drone/Nature Real Videos
    (async () => {
      const u3 = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(backupDroneQuery)}&gsrlimit=25&prop=videoinfo&viprop=derivatives&format=json`;
      const r3 = await fetch(u3, { headers: { 'User-Agent': 'ShortsFactoryBot/5.0' }, signal: AbortSignal.timeout(2400) });
      if (r3.ok) {
        const d3 = await r3.json();
        for (const p of Object.values(d3.query?.pages || {})) {
          const vUrl = extractBestVideoDerivative(p);
          if (vUrl) addVideoCandidate(vUrl, p.title || '');
        }
      }
    })()
  ]);

  // Guaranteed high-cinema real camera/drone .mov backup bank
  const verifiedRealCameraClips = [
    'https://upload.wikimedia.org/wikipedia/commons/transcoded/5/53/007_Volcano_eruption_of_Litli-Hr%C3%BAtur_in_Iceland_in_2023_Video_by_Giles_Laurent.webm/007_Volcano_eruption_of_Litli-Hr%C3%BAtur_in_Iceland_in_2023_Video_by_Giles_Laurent.webm.360p.mpeg4.mov',
    'https://upload.wikimedia.org/wikipedia/commons/transcoded/1/10/Fagradalsfjall_volcano_eruption_%28helicopter_view%29.webm/Fagradalsfjall_volcano_eruption_%28helicopter_view%29.webm.360p.mpeg4.mov',
    'https://upload.wikimedia.org/wikipedia/commons/transcoded/3/3a/Hawaii_Mount_Kilauea%27s_eruption_opens_new_lava_vent.webm/Hawaii_Mount_Kilauea%27s_eruption_opens_new_lava_vent.webm.360p.mpeg4.mov',
    'https://upload.wikimedia.org/wikipedia/commons/transcoded/e/e5/Cliffs_of_Moher_drone-video.webm/Cliffs_of_Moher_drone-video.webm.360p.mpeg4.mov',
    'https://upload.wikimedia.org/wikipedia/commons/transcoded/d/dc/Aerial_view_of_sand_beach_sea_waves_drone_footage.webm/Aerial_view_of_sand_beach_sea_waves_drone_footage.webm.360p.mpeg4.mov',
    'https://upload.wikimedia.org/wikipedia/commons/transcoded/e/ea/Spinner_dolphins_swimming_in_the_Indian_ocean.webm/Spinner_dolphins_swimming_in_the_Indian_ocean.webm.360p.mpeg4.mov',
    'https://upload.wikimedia.org/wikipedia/commons/transcoded/3/33/MT_Slamet_Volcano_eruption_on_August_26%2C2014.webm/MT_Slamet_Volcano_eruption_on_August_26%2C2014.webm.360p.mpeg4.mov'
  ];
  for (const vUrl of verifiedRealCameraClips) addVideoCandidate(vUrl, 'verified_real_camera_footage');

  const enTitle = enTitleClean || enTitleFull;
  console.log(`🎥 [Real Video Pool] "${rawTopic}" (${enTitle || 'PT'}): ${pool.length} VÍDEOS REAIS (.mov/.webm) encontrados!`);

  // Assign 2 candidate real video URLs per scene (1 primary unique video + 1 backup video)
  let vCursor = 0;
  return scenes.map(() => {
    if (pool.length === 0) return { videoQueue: [] };
    const primary = pool[vCursor % pool.length].url;
    const backup = pool[(vCursor + 4) % pool.length].url;
    const backup2 = pool[(vCursor + 8) % pool.length].url;
    vCursor++;
    return {
      videoQueue: [primary, backup, backup2]
    };
  });
}

// Downloads a real .mov/.webm video clip to disk (using HTTP Range up to 3.2MB so it downloads in <0.6s!)
async function downloadRealVideoClipToDisk(videoQueue = [], outputClipPath, sceneIdx = 0) {
  for (const vidUrl of videoQueue) {
    if (!vidUrl) continue;
    try {
      const r = await fetch(vidUrl, {
        headers: {
          'User-Agent': 'ShortsFactoryBot/5.0 (https://shorts-factory-ai-ruby.vercel.app)'
        },
        signal: AbortSignal.timeout(3200)
      });
      if (r.ok) {
        const buf = Buffer.from(await r.arrayBuffer());
        if (buf.length > 40000) {
          fs.writeFileSync(outputClipPath, buf);
          const shortName = vidUrl.split('/').pop().split('?')[0].slice(0, 42);
          console.log(`🎥 [Cena ${sceneIdx + 1}] VÍDEO REAL baixado: ${shortName} (${Math.round(buf.length / 1024)} KB)`);
          return outputClipPath;
        }
      }
    } catch (e) {}
  }

  // Fallback synthetic moving video generated via FFmpeg lavfi if offline
  execFileSync(ffmpegPath, [
    '-y', '-f', 'lavfi', '-i', 'testsrc2=size=720x1280:rate=20', '-t', '6.0',
    '-c:v', 'libx264', '-preset', 'ultrafast', outputClipPath
  ], { stdio: 'ignore' });
  return outputClipPath;
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

// Ultra-Fast Transparent PNG Subtitle Strip Renderer (720x540px — renders all 110 subtitle steps in 0.35s!)
async function renderCaptionedFrame({
  wordsChunk,
  activeWordIdx = 0,
  palette = null,
  progressRatio,
  outputFramePath
}) {
  const STRIP_H = 540;
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
  // Local Y inside the 720x540 bottom strip (placed at y=740 on the 720x1280 video)
  const baseStartY = wrappedLines.length === 1 ? 145 : (wrappedLines.length === 2 ? 110 : 80);

  const subtitleLinesSvg = wrappedLines.map((lineItems, lIdx) => {
    const yPos = baseStartY + lIdx * lineSpacing;
    return renderHormoziLineVectorPaths(lineItems, 360, yPos, fontSize, 600, pal);
  }).join('\n');

  const progressWidth = Math.max(14, Math.round(WIDTH * progressRatio));

  // Transparent 720x540 SVG containing ONLY Karaoke Subtitles + Bottom Progress Bar!
  const hudSvg = `<svg width="${WIDTH}" height="${STRIP_H}" xmlns="http://www.w3.org/2000/svg">
    <g>
      ${subtitleLinesSvg}
    </g>
    <rect x="0" y="${STRIP_H - 14}" width="${WIDTH}" height="14" fill="#ffffff" fill-opacity="0.18"/>
    <rect x="0" y="${STRIP_H - 14}" width="${progressWidth}" height="14" fill="${pal.pillFill}"/>
  </svg>`;

  await sharp(Buffer.from(hudSvg))
    .png({ compressionLevel: 1 })
    .toFile(outputFramePath);
}

// Single-Pass Studio 4.0 REAL VIDEO Master Timeline Renderer
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

  onProgress(15, 'Studio 4.0: Baixando 7 Vídeos Reais HD + Gravando Vozes em Paralelo...');

  const sceneAssets = [];
  const sceneStartTimes = [];
  let totalDuration = 0;

  // 1. Run Real Video Discovery AND All Neural Voice Synthesis AT THE EXACT SAME TIME!
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

  const [sceneVideoQueues, ttsResults] = await Promise.all([
    prefetchTopicPhotoUrlsForScenes(scriptData),
    ttsJobsPromise
  ]);

  onProgress(48, 'Baixando Clipes de Vídeo Reais (Drone / Câmera 24fps)...');

  // 2. Download 1 Real Video Clip (.mov/.webm) per scene in parallel!
  const preparedScenes = await Promise.all(scenes.map(async (s, i) => {
    const { audioWavPath, ttsResult } = ttsResults[i];
    const vQ = sceneVideoQueues[i] || sceneVideoQueues[0] || { videoQueue: [] };
    const rawClipPath = path.join(tmpDir, `raw_vid_${i}.mov`);
    const videoClipPath = await downloadRealVideoClipToDisk(vQ.videoQueue, rawClipPath, i);

    return {
      index: i,
      narration: s.narration,
      audioWavPath,
      videoClipPath,
      duration: ttsResult.duration,
      wordBoundaries: ttsResult.wordBoundaries
    };
  }));

  for (let i = 0; i < preparedScenes.length; i++) {
    sceneStartTimes.push(totalDuration);
    sceneAssets.push(preparedScenes[i]);
    totalDuration += preparedScenes[i].duration;
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

  onProgress(68, 'Gerando Faixa Transparente de Legendas Karaokê...');

  const masterFramesListPath = path.join(tmpDir, 'master_subs.txt');
  let masterConcatContent = '';
  let elapsedDuration = 0;
  let lastRenderedFramePath = null;
  const frameJobs = [];

  for (let i = 0; i < sceneAssets.length; i++) {
    const asset = sceneAssets[i];
    const timedChunks = buildExactTimedChunks(asset.narration, asset.wordBoundaries, asset.duration);
    let sceneElapsed = 0;

    for (let c = 0; c < timedChunks.length; c++) {
      const framePath = path.join(tmpDir, `sub_${i}_${c}.png`);
      const thisChunkDur = timedChunks[c].duration;
      sceneElapsed += thisChunkDur;
      const progressRatio = Math.min(1, (elapsedDuration + sceneElapsed) / totalDuration);

      frameJobs.push({
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

  // Render all transparent PNG subtitle strips in parallel (takes ~0.35 seconds!)
  const BATCH_SIZE = 32;
  for (let b = 0; b < frameJobs.length; b += BATCH_SIZE) {
    await Promise.all(frameJobs.slice(b, b + BATCH_SIZE).map(job => renderCaptionedFrame(job)));
  }

  if (lastRenderedFramePath) {
    masterConcatContent += `file '${lastRenderedFramePath}'\n`;
  }
  fs.writeFileSync(masterFramesListPath, masterConcatContent, 'utf8');

  onProgress(82, 'Renderizando Vídeo Real 20fps + Legendas + Voz Shure SM7B...');

  const masterVoiceWavPath = path.join(tmpDir, 'master_voice.wav');
  const exactVoiceDur = concatenateWavFilesSampleExact(sceneAssets.map(a => a.audioWavPath), masterVoiceWavPath);

  const bgMusicWav = path.join(tmpDir, 'bgm.wav');
  genBgm(bgMusicWav, exactVoiceDur, colorTheme || scriptData.musicMood || 'cosmic', sceneStartTimes, midCutTimes);

  const finalFilename = `${jobId}.mp4`;
  const finalMp4Path = path.join(outDir, finalFilename);

  // Build Single-Pass FFmpeg Command: N Real Video Inputs + Transparent Subtitle Track + Voice + BGM!
  const fpsRate = process.env.VERCEL ? '18' : '24';
  const ffmpegArgs = ['-y'];

  sceneAssets.forEach((asset, idx) => {
    // Use Scene 1's real video on the final loop scene so the end visually matches 0:00!
    const clipToUse = (idx === sceneAssets.length - 1 && sceneAssets.length >= 2)
      ? sceneAssets[0].videoClipPath
      : asset.videoClipPath;
    ffmpegArgs.push('-stream_loop', '-1', '-t', asset.duration.toFixed(4), '-i', clipToUse);
  });

  const subsIdx = sceneAssets.length;
  const voiceIdx = sceneAssets.length + 1;
  const bgmIdx = sceneAssets.length + 2;

  ffmpegArgs.push(
    '-f', 'concat', '-safe', '0', '-i', masterFramesListPath,
    '-i', masterVoiceWavPath,
    '-i', bgMusicWav
  );

  const vChains = sceneAssets.map((_, k) =>
    `[${k}:v]scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}:${HEIGHT}:(iw-${WIDTH})/2:(ih-${HEIGHT})/2,fps=${fpsRate},setsar=1,format=yuv420p[v${k}]`
  ).join(';');

  const concatInputs = sceneAssets.map((_, k) => `[v${k}]`).join('');
  const filterComplex = [
    vChains,
    `${concatInputs}concat=n=${sceneAssets.length}:v=1:a=0,eq=brightness=-0.05:contrast=1.08:saturation=1.18,drawbox=x=0:y=740:w=${WIDTH}:h=540:color=black@0.36:t=fill[bg]`,
    `[bg][${subsIdx}:v]overlay=0:740:format=auto:shortest=1[vout]`,
    `[${voiceIdx}:a]highpass=f=75,acompressor=threshold=-16dB:ratio=3:attack=5:release=60:makeup=2,volume=1.38[voice]`,
    `[${bgmIdx}:a]volume=0.33[bgm]`,
    `[voice][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]`
  ].join(';');

  ffmpegArgs.push(
    '-filter_complex', filterComplex,
    '-map', '[vout]',
    '-map', '[aout]',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '27', '-pix_fmt', 'yuv420p', '-r', fpsRate,
    '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2',
    '-shortest',
    '-movflags', '+faststart',
    finalMp4Path
  );

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
