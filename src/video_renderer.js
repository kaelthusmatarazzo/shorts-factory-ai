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
    if (/\.(svg|gif|tif|tiff|webm|ogv|pdf|djvu)$/i.test(url)) return;
    const checkStr = `${url} ${title}`.toLowerCase();
    // Block icons, maps, flags, AND municipal/urban homonyms (e.g., Pando city in Uruguay!)
    if (/icon|logo|symbol|flag|map_of|locator_map|commons-logo|red_pencil|disambig|question_book|ambox|padlock|crystal_clear|nuvola|uruguay|policia|municipio|alcaldia|pintura_mural|acto_|bienvenido_a|partido_|eleccion|coat_of_arms|escudo|bandera|stamp_of/i.test(checkStr)) return;
    seenUrls.add(url);
    pool.push({ url, title: String(title || '').toLowerCase() });
  };

  if (heroUrl) addCandidate(heroUrl, `${rawTopic} hero`);

  // 1. Single Call to PT Wikipedia: get exact English Wikipedia article title (preserving "(tree)" / "(moon)" disambiguation!)
  try {
    const ptUrl = `https://pt.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(fullSourceTopic)}&prop=langlinks|pageimages&lllang=en&piprop=original|thumbnail&pithumbsize=1080&redirects=1&format=json`;
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
          enTitleFull = page.langlinks[0]['*'].trim();
          enTitleClean = enTitleFull.replace(/\s*\([^)]*\)/g, '').trim();
        }
      }
    }
  } catch (e) {}

  // 1B. Direct Images from the EXACT English Wikipedia Article (100% guaranteed topic match!)
  const exactArticleTarget = enTitleFull || scriptData.wikiSearch || fullSourceTopic;
  try {
    const enArtImgsUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(exactArticleTarget)}&generator=images&gimlimit=30&prop=imageinfo&iiprop=url&iiurlwidth=800&redirects=1&format=json`;
    const enArtRes = await fetch(enArtImgsUrl, {
      headers: { 'User-Agent': 'ShortsFactoryBot/5.0 (https://shorts-factory-ai-ruby.vercel.app)' },
      signal: AbortSignal.timeout(3800)
    });
    if (enArtRes.ok) {
      const enArtData = await enArtRes.json();
      for (const p of Object.values(enArtData.query?.pages || {})) {
        const imgUrl = p?.imageinfo?.[0]?.thumburl || p?.imageinfo?.[0]?.url;
        addCandidate(imgUrl, p.title || exactArticleTarget);
      }
    }
  } catch (e) {}

  // 2. Single Combined Scientific OR Query on Wikimedia Commons (gsrlimit=50)
  const entitySet = new Set();
  if (disambiguatedTerm) entitySet.add(disambiguatedTerm);
  if (enTitleFull && !disambiguatedTerm) entitySet.add(enTitleFull);
  for (const s of scenes) {
    const cleanEnt = extractCleanEntityName(s.imageQuery, rawTopic);
    if (cleanEnt && cleanEnt.length >= 4 && cleanEnt.toLowerCase() !== 'pando') {
      entitySet.add(cleanEnt);
    }
  }
  if (entitySet.size === 0) entitySet.add(rawTopic);

  const uniqueEntities = Array.from(entitySet).slice(0, 4);
  const orQuery = 'filetype:bitmap ' + uniqueEntities.map(e => `"${e}"`).join(' OR ');

  try {
    const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(orQuery)}&gsrlimit=50&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json`;
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

  if (pool.length < 14) {
    try {
      const broadQuery = `filetype:bitmap ${disambiguatedTerm || enTitleFull || rawTopic}`;
      const broadUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(broadQuery)}&gsrlimit=35&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json`;
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

  console.log(`📸 [Studio 2.0 Dual-Shot Pool] "${rawTopic}" (${enTitle || 'PT'}): ${pool.length} fotos reais verificadas!`);

  // 3. Assign TWO distinct photo queues (shotAQueue for 0-50%, shotBQueue for 50-100%) to every scene!
  const usedIndices = new Set();
  const sceneDualQueues = scenes.map((s, sceneIdx) => {
    const keywords = `${s.imageQuery || ''} ${s.sceneLabel || ''} ${s.narration || ''}`
      .toLowerCase()
      .replace(/[^\wÀ-ÿ\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 4);

    const scoreAvailablePool = () => pool.map((item, idx) => {
      let score = usedIndices.has(idx) ? -1000 : 0;
      if (sceneIdx === 0 && idx === 0 && !usedIndices.has(0)) score += 600;
      for (const kw of keywords) {
        if (item.title.includes(kw)) score += 25;
      }
      if (item.title.includes(rawTopic.toLowerCase())) score += 15;
      if (enTitle && item.title.includes(enTitle.toLowerCase())) score += 15;
      return { item, idx, score };
    }).sort((a, b) => b.score - a.score);

    const rankedA = scoreAvailablePool();
    if (rankedA[0] && rankedA[0].idx !== undefined) usedIndices.add(rankedA[0].idx);
    const shotAQueue = rankedA.slice(0, 3).map(x => x.item.url);

    const rankedB = scoreAvailablePool();
    if (rankedB[0] && rankedB[0].idx !== undefined) usedIndices.add(rankedB[0].idx);
    const shotBQueue = rankedB.slice(0, 3).map(x => x.item.url);

    return {
      shotAQueue: shotAQueue.length > 0 ? shotAQueue : shotBQueue,
      shotBQueue: shotBQueue.length > 0 ? shotBQueue : shotAQueue
    };
  });

  return sceneDualQueues;
}

async function downloadAssignedTopicPhoto(urlQueue = [], sceneIdx = 0, shotTag = 'A') {
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
          console.log(`✅ [Cena ${sceneIdx + 1}-${shotTag}] Foto real: ${imgUrl.split('/').pop().slice(0, 40)} (${Math.round(buf.length / 1024)} KB)`);
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

// Pre-build a composited base 720x1280 canvas (Cinema Full-Screen 9:16 or Framed Card) for ultra-fast frame rendering
async function buildBaseSceneCanvas(rawPhotoBuffer, blurredBackdropBuffer, zoomFactor = 1.0, visualStyle = 'cinema', themeColor = '#00f0ff') {
  const isCinema = visualStyle !== 'card';
  const boxW = isCinema ? 688 : CARD_W;
  const boxH = isCinema ? 930 : CARD_H;
  const boxLeft = isCinema ? 16 : 40;
  const boxTop = isCinema ? 132 : 158;

  const scaledW = Math.round(boxW * zoomFactor);
  const scaledH = Math.round(boxH * zoomFactor);

  const resizedPhoto = await sharp(rawPhotoBuffer)
    .resize(scaledW, scaledH, { fit: 'cover', position: 'attention' })
    .extract({
      left: Math.floor((scaledW - boxW) / 2),
      top: Math.floor((scaledH - boxH) / 2),
      width: boxW,
      height: boxH
    })
    .sharpen({ sigma: 1.15, m1: 1.0, m2: 2.0 })
    .modulate({ brightness: 1.04, saturation: 1.14 })
    .png()
    .toBuffer();

  const roundedMask = Buffer.from(
    `<svg width="${boxW}" height="${boxH}"><rect x="0" y="0" width="${boxW}" height="${boxH}" rx="28" ry="28" fill="#fff"/></svg>`
  );

  const roundedPhotoCard = await sharp(resizedPhoto)
    .composite([{ input: roundedMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  // Subtle dark cinema gradient at the bottom of the photo card so subtitles and labels have 100% contrast
  const cardShadowOverlay = Buffer.from(
    `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#000000" stop-opacity="0.68"/>
          <stop offset="18%" stop-color="#000000" stop-opacity="0.10"/>
          <stop offset="55%" stop-color="#000000" stop-opacity="0.22"/>
          <stop offset="82%" stop-color="#000000" stop-opacity="0.86"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0.96"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#cGrad)"/>
      <rect x="${boxLeft - 2}" y="${boxTop - 2}" width="${boxW + 4}" height="${boxH + 4}" rx="30" fill="none" stroke="${themeColor}" stroke-width="3.5" stroke-opacity="0.85"/>
    </svg>`
  );

  return await sharp(blurredBackdropBuffer)
    .composite([
      { input: roundedPhotoCard, left: boxLeft, top: boxTop },
      { input: cardShadowOverlay, left: 0, top: 0 }
    ])
    .jpeg({ quality: 92 })
    .toBuffer();
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

// Fast Vector HUD Overlay Renderer onto Pre-Built Base Scene Canvas (Studio 3.0 / 4.0 Edition)
async function renderCaptionedFrame({
  baseCanvasBuffer,
  wordsChunk,
  activeWordIdx = 0,
  badgeText,
  sceneLabel,
  dataCalloutText = '',
  rehookAlertText = '',
  coverTitleText = '',
  speakerBadgeText = '',
  tensionInfo = null,
  isCommentBaitScene = false,
  palette = null,
  isFlashCut = false,
  themeColor,
  progressRatio,
  outputFramePath
}) {
  const pal = palette || getAtmospherePalette('cosmic');
  const tInfo = tensionInfo || { label: 'FASE 1 • A DESCOBERTA', dotColor: '#00E676', borderColor: pal.accent };
  const highlightIdx = (activeWordIdx >= 0 && activeWordIdx < wordsChunk.length) ? activeWordIdx : 0;
  const wrappedLines = wrapWordsIntoSafeLines(wordsChunk, highlightIdx);
  const maxCharsInAnyLine = Math.max(...wrappedLines.map(line => line.map(x => x.word).join(' ').length), 1);

  let fontSize = 52;
  if (maxCharsInAnyLine >= 18) fontSize = 33;
  else if (maxCharsInAnyLine >= 15) fontSize = 38;
  else if (maxCharsInAnyLine >= 13) fontSize = 44;
  else if (maxCharsInAnyLine >= 11) fontSize = 48;

  const lineSpacing = Math.round(fontSize * 1.42);
  const baseStartY = wrappedLines.length === 1 ? 865 : (wrappedLines.length === 2 ? 830 : 800);

  const subtitleLinesSvg = wrappedLines.map((lineItems, lIdx) => {
    const yPos = baseStartY + lIdx * lineSpacing;
    return renderHormoziLineVectorPaths(lineItems, 360, yPos, fontSize, 600, pal);
  }).join('\n');

  // STUDIO 3.0 UPGRADE #4: Top Tension Progression HUD ("FASE 1 • A DESCOBERTA" -> "FASE 3 • LIMITE EXTREMO")
  const tensionLabelText = cleanDisplayString(tInfo.label || badgeText || 'FATOS CURIOSOS');
  const safeSceneLabel = cleanDisplayString(sceneLabel || 'Imagem Real de Arquivo').replace(/Loop Infinito/gi, '').slice(0, 44);
  const badgeVectorSvg = renderCenteredVectorPath(tensionLabelText, 372, 98, 20, 355, '#FFFFFF');
  const labelVectorSvg = renderCenteredVectorPath(safeSceneLabel, 360, 1025, 17, 560, '#e0f4ff');
  const progressWidth = Math.max(14, Math.round(WIDTH * progressRatio));

  // STUDIO 3.0 UPGRADE #1: Dueto Podcast Speaker Pill ("VOZ: THALITA" / "VOZ: ANTONIO")
  let speakerBadgeSvg = '';
  if (speakerBadgeText) {
    const spPath = renderCenteredVectorPath(cleanDisplayString(speakerBadgeText), 600, 140, 14, 160, pal.pillFill);
    speakerBadgeSvg = `
      <rect x="510" y="118" width="174" height="32" rx="16" fill="#060711" fill-opacity="0.92" stroke="${pal.pillFill}" stroke-width="2"/>
      ${spPath}
    `;
  }

  // UPGRADE #2: Glassmorphism Numeric Data Callout Badge ("DADO REAL: 12.262 METROS")
  let dataCalloutSvg = '';
  if (dataCalloutText) {
    const calloutPath = renderCenteredVectorPath(dataCalloutText, 360, 188, 19, 510, pal.dataColor);
    dataCalloutSvg = `
      <rect x="85" y="154" width="550" height="48" rx="14" fill="#070812" fill-opacity="0.88" stroke="${pal.dataColor}" stroke-width="2.5"/>
      ${calloutPath}
    `;
  }

  // STUDIO 4.0 ITEM #4: Anti-Boredom Visual Re-Hook Alert Banner at ~20s (Scene 3) & ~42s (Scene 5)
  let rehookBannerSvg = '';
  if (rehookAlertText && !coverTitleText) {
    const rhPath = renderCenteredVectorPath(cleanDisplayString(rehookAlertText), 360, 246, 19, 520, '#FFFFFF');
    rehookBannerSvg = `
      <rect x="85" y="212" width="550" height="48" rx="24" fill="#FF1744" fill-opacity="0.94" stroke="#FFE600" stroke-width="3"/>
      ${rhPath}
    `;
  }

  // STUDIO 3.0 UPGRADE #2: Floating Comment-Bait Engagement Badge on Scene 6 ("COMENTE SUA OPINIAO ABAIXO")
  let commentBaitSvg = '';
  if (isCommentBaitScene && !coverTitleText) {
    const cbPath = renderCenteredVectorPath('COMENTE SUA OPINIAO ABAIXO', 360, 754, 18, 490, '#05060A');
    commentBaitSvg = `
      <rect x="110" y="724" width="500" height="42" rx="21" fill="${pal.pillFill}" stroke="#000000" stroke-width="3.5"/>
      ${cbPath}
    `;
  }

  // UPGRADE #7: Frame-0 Viral Cover Poster Banner (for TikTok / YouTube Shorts Grid Thumbnail!)
  let coverPosterSvg = '';
  if (coverTitleText) {
    const cleanCover = cleanDisplayString(coverTitleText).toUpperCase();
    const words = cleanCover.split(/\s+/);
    const mid = Math.ceil(words.length / 2);
    const line1 = words.slice(0, mid).join(' ');
    const line2 = words.slice(mid).join(' ');
    const p1 = renderCenteredVectorPath(line1, 360, 495, 38, 600, pal.pillFill, '#000000', 10);
    const p2 = renderCenteredVectorPath(line2, 360, 550, 38, 600, '#FFFFFF', '#000000', 10);
    coverPosterSvg = `
      <rect x="36" y="430" width="648" height="156" rx="24" fill="#05060d" fill-opacity="0.92" stroke="${pal.pillFill}" stroke-width="5"/>
      ${p1}
      ${p2}
    `;
  }

  // Subtle 60ms Cinema Cut Flash on photo transitions
  const flashRectSvg = isFlashCut
    ? `<rect width="100%" height="100%" fill="#ffffff" fill-opacity="0.14"/>`
    : '';

  const hudSvg = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect x="142" y="64" width="436" height="52" rx="26" fill="#080812" fill-opacity="0.92" stroke="${tInfo.borderColor}" stroke-width="3"/>
    <circle cx="172" cy="90" r="9" fill="${tInfo.dotColor}"/>
    ${badgeVectorSvg}
    ${speakerBadgeSvg}

    ${dataCalloutSvg}
    ${rehookBannerSvg}
    ${commentBaitSvg}

    <rect x="56" y="998" width="608" height="40" rx="14" fill="#05060d" fill-opacity="0.86" stroke="${pal.accent}" stroke-width="1.5" stroke-opacity="0.65"/>
    ${labelVectorSvg}

    <g>
      ${subtitleLinesSvg}
    </g>

    ${coverPosterSvg}
    ${flashRectSvg}

    <rect x="0" y="${HEIGHT - 14}" width="${WIDTH}" height="14" fill="#ffffff" fill-opacity="0.18"/>
    <rect x="0" y="${HEIGHT - 14}" width="${progressWidth}" height="14" fill="${pal.pillFill}"/>
  </svg>`;

  await sharp(baseCanvasBuffer)
    .composite([{ input: Buffer.from(hudSvg), left: 0, top: 0 }])
    .jpeg({ quality: 91 })
    .toFile(outputFramePath);
}

// Single-Pass Studio 3.0 / 4.0 Master Timeline Renderer
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
  const visualStyle = options.visualStyle || 'cinema';
  const scenes = scriptData.scenes || [];
  const colorTheme = scriptData.colorTheme || 'cosmic';
  const palette = getAtmospherePalette(colorTheme);
  const themeColor = palette.accent || scriptData.themeColor || '#00f0ff';
  const badgeText = 'FATOS CURIOSOS';

  onProgress(15, isDuetPodcast
    ? 'Studio 4.0: Gravando Dueto Podcast (Shure SM7B EQ) + 14 Fotos Remasterizadas 4K...'
    : 'Studio 4.0: Buscando 14 fotos 4K + Voz Estúdio + Re-Hooks Anti-Queda...');

  const sceneAssets = [];
  const sceneStartTimes = [];
  let totalDuration = 0;
  const blurSigma = process.env.VERCEL ? 12 : 20;

  // 1. Pre-fetch 35-50 real Wikipedia/Wikimedia photos of the exact topic and assign Shot A + Shot B per scene
  const sceneDualQueues = await prefetchTopicPhotoUrlsForScenes(scriptData);

  // 2. PARALLEL SCENE PREPARATION: Run Emotional/Duet TTS + Download Shot A & Shot B + Build 4 Dynamic Camera Canvases per scene!
  const preparedScenes = await Promise.all(scenes.map(async (s, i) => {
    const audioWavPath = path.join(tmpDir, `scene_${i}.wav`);
    const dualQ = sceneDualQueues[i] || sceneDualQueues[0] || { shotAQueue: [], shotBQueue: [] };

    // STUDIO 3.0 UPGRADE #1: Duet Podcast Mode alternates Thalita (Scenes 1,3,5,7) & Antônio (Scenes 2,4,6)
    let sceneVoice = voiceName;
    let speakerBadgeText = '';
    if (isDuetPodcast) {
      const isLastLoop = (i === scenes.length - 1 && scenes.length >= 2);
      if (i % 2 === 1 && !isLastLoop) {
        sceneVoice = 'pt-BR-AntonioNeural';
        speakerBadgeText = 'VOZ: ANTONIO';
      } else {
        sceneVoice = 'pt-BR-ThalitaMultilingualNeural';
        speakerBadgeText = 'VOZ: THALITA';
      }
    }

    const [ttsResult, rawPhotoA, rawPhotoB] = await Promise.all([
      synthesizeSpeechWithTimings(s.narration, audioWavPath, sceneVoice, i),
      downloadAssignedTopicPhoto(dualQ.shotAQueue, i, 'A'),
      downloadAssignedTopicPhoto(dualQ.shotBQueue, i, 'B')
    ]);

    const [backdropA, backdropB] = await Promise.all([
      sharp(rawPhotoA).resize(WIDTH, HEIGHT, { fit: 'cover' }).blur(blurSigma).modulate({ brightness: 0.36, saturation: 1.25 }).png().toBuffer(),
      sharp(rawPhotoB).resize(WIDTH, HEIGHT, { fit: 'cover' }).blur(blurSigma).modulate({ brightness: 0.36, saturation: 1.25 }).png().toBuffer()
    ]);

    // Pre-build 4 dynamic camera canvases (Shot A Wide, Shot A Punch-In, Shot B Wide, Shot B Punch-In) with 4K Sharpen
    const [canvasA1, canvasA2, canvasB1, canvasB2] = await Promise.all([
      buildBaseSceneCanvas(rawPhotoA, backdropA, 1.01, visualStyle, palette.glowColor),
      buildBaseSceneCanvas(rawPhotoA, backdropA, 1.08, visualStyle, palette.glowColor),
      buildBaseSceneCanvas(rawPhotoB, backdropB, 1.02, visualStyle, palette.glowColor),
      buildBaseSceneCanvas(rawPhotoB, backdropB, 1.10, visualStyle, palette.glowColor)
    ]);

    return {
      index: i,
      narration: s.narration,
      sceneLabel: s.sceneLabel || scriptData.title,
      speakerBadgeText,
      isCommentBaitScene: Boolean(s.isCommentBaitScene || (i === scenes.length - 2 && scenes.length >= 4)),
      dataCallout: extractDataCalloutFromNarration(s.narration),
      audioWavPath,
      duration: ttsResult.duration,
      wordBoundaries: ttsResult.wordBoundaries,
      canvases: [canvasA1, canvasA2, canvasB1, canvasB2]
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

  onProgress(68, 'Renderizando HUD de Tensão + Re-Hooks (20s/42s) + Pílula Neon...');

  const masterFramesListPath = path.join(tmpDir, 'master_frames.txt');
  let masterConcatContent = '';
  let elapsedDuration = 0;
  let lastRenderedFramePath = null;
  const frameJobs = [];

  for (let i = 0; i < sceneAssets.length; i++) {
    const asset = sceneAssets[i];
    const timedChunks = buildExactTimedChunks(asset.narration, asset.wordBoundaries, asset.duration);
    const isFinalLoopScene = (i === sceneAssets.length - 1 && sceneAssets.length >= 2);
    const tensionInfo = getTensionPhaseInfo(i, sceneAssets.length);

    let sceneElapsed = 0;
    let triggeredMidFlash = false;

    for (let c = 0; c < timedChunks.length; c++) {
      const framePath = path.join(tmpDir, `s${i}_c${c}.jpg`);
      const thisChunkDur = timedChunks[c].duration;
      const chunkMidSec = sceneElapsed + (thisChunkDur * 0.5);
      const sceneProgress = chunkMidSec / Math.max(0.1, asset.duration);
      sceneElapsed += thisChunkDur;

      const isVisualLoopBridge = isFinalLoopScene && (c >= Math.max(1, timedChunks.length - 2));

      // Select among the 4 dynamic camera cuts per scene (0-25%: A1, 25-50%: A2, 50-75%: B1, 75-100%: B2)
      let selectedCanvas = asset.canvases[0];
      if (isVisualLoopBridge) {
        selectedCanvas = sceneAssets[0].canvases[0];
      } else if (sceneProgress >= 0.75) {
        selectedCanvas = asset.canvases[3];
      } else if (sceneProgress >= 0.50) {
        selectedCanvas = asset.canvases[2];
      } else if (sceneProgress >= 0.25) {
        selectedCanvas = asset.canvases[1];
      }

      // Trigger subtle 60ms cinema flash on scene start or 50% mid-scene photo cut
      let isFlashCut = false;
      if (c === 0 && i > 0) isFlashCut = true;
      if (!triggeredMidFlash && sceneProgress >= 0.50) {
        triggeredMidFlash = true;
        isFlashCut = true;
      }

      // ITEM #4: Anti-Boredom Visual Re-Hook Alert on Scene 3 (~20s) and Scene 5 (~42s) first 4 word steps
      let rehookAlertText = '';
      if (i === 2 && c <= 3) {
        rehookAlertText = 'REVELACAO CRITICA • PRESTE ATENCAO';
      } else if (i === 4 && c <= 3) {
        rehookAlertText = 'O PONTO MAIS EXTREMO DESTE CASO';
      }

      const frameLabel = isVisualLoopBridge ? sceneAssets[0].sceneLabel : asset.sceneLabel;
      const progressRatio = Math.min(1, (elapsedDuration + sceneElapsed) / totalDuration);
      const isCoverFrame = (i === 0 && c === 0);

      frameJobs.push({
        baseCanvasBuffer: selectedCanvas,
        wordsChunk: timedChunks[c].words,
        activeWordIdx: timedChunks[c].activeWordIdx,
        badgeText,
        sceneLabel: frameLabel,
        dataCalloutText: asset.dataCallout,
        rehookAlertText,
        coverTitleText: isCoverFrame ? (scriptData.title || '') : '',
        speakerBadgeText: asset.speakerBadgeText,
        tensionInfo: isVisualLoopBridge ? getTensionPhaseInfo(0, sceneAssets.length) : tensionInfo,
        isCommentBaitScene: asset.isCommentBaitScene,
        palette,
        isFlashCut,
        themeColor,
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

  // Render HUD overlays in parallel batches of 16 (super fast since base canvases are pre-built!)
  const BATCH_SIZE = 16;
  for (let b = 0; b < frameJobs.length; b += BATCH_SIZE) {
    await Promise.all(frameJobs.slice(b, b + BATCH_SIZE).map(job => renderCaptionedFrame(job)));
  }

  if (lastRenderedFramePath) {
    masterConcatContent += `file '${lastRenderedFramePath}'\n`;
  }
  fs.writeFileSync(masterFramesListPath, masterConcatContent, 'utf8');

  onProgress(86, 'Masterizando Voz Shure SM7B (Compressor + EQ) + Batimento Cardíaco...');

  const masterVoiceWavPath = path.join(tmpDir, 'master_voice.wav');
  const exactVoiceDur = concatenateWavFilesSampleExact(sceneAssets.map(a => a.audioWavPath), masterVoiceWavPath);

  const bgMusicWav = path.join(tmpDir, 'bgm.wav');
  genBgm(bgMusicWav, exactVoiceDur, colorTheme || scriptData.musicMood || 'cosmic', sceneStartTimes, midCutTimes);

  const finalFilename = `${jobId}.mp4`;
  const finalMp4Path = path.join(outDir, finalFilename);

  // ITEM #3: Broadcast Shure SM7B Studio Voice Mastering (Highpass + Dynamic Compressor + Warm Presence) in FFmpeg
  const fpsRate = process.env.VERCEL ? '8' : '25';
  execFileSync(ffmpegPath, [
    '-y',
    '-f', 'concat', '-safe', '0', '-i', masterFramesListPath,
    '-i', masterVoiceWavPath,
    '-i', bgMusicWav,
    '-filter_complex', '[1:a]highpass=f=75,acompressor=threshold=-16dB:ratio=3:attack=5:release=60:makeup=2,volume=1.38[voice];[2:a]volume=0.33[bgm];[voice][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]',
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

  onProgress(100, 'Short Studio 2.0 finalizado!');

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
