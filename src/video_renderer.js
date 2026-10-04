const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const sharp = require('sharp');
// Strict memory protection for 512MB cloud instances (prevents OOM SIGKILL restarts)
sharp.concurrency(1);
sharp.cache(false);
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

function getAtmospherePalette(colorTheme = 'vibrant_pop') {
  const palettes = {
    vibrant_pop: {
      pillFill: '#FFE500',
      pillText: '#000000',
      accent: '#00F0FF',
      dataColor: '#00F5D4',
      glowColor: '#FF007F'
    },
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
  return palettes[colorTheme] || palettes.vibrant_pop;
}

function getTensionPhaseInfo(sceneIdx = 0, totalScenes = 7) {
  if (sceneIdx >= totalScenes - 1 && totalScenes >= 2) {
    return { label: 'CAPÍTULO FINAL • CONCLUSÃO', dotColor: '#00F0FF', borderColor: '#00F0FF' };
  }
  if (sceneIdx >= 4) {
    return { label: 'CAPÍTULO 3 • REVELAÇÃO', dotColor: '#FF007F', borderColor: '#FF007F' };
  }
  if (sceneIdx >= 2) {
    return { label: 'CAPÍTULO 2 • DESCOBERTA', dotColor: '#FFE500', borderColor: '#FFE500' };
  }
  return { label: 'CAPÍTULO 1 • O INÍCIO', dotColor: '#00F0FF', borderColor: '#00F0FF' };
}

// 3-Color Dynamic Pop Semantic Classifier (Vibrant Pop Yellow + Electric Pink + Electric Cyan)
function classifySemanticWordStyle(wordText) {
  const w = String(wordText || '').toLowerCase();
  // 🟡 POP_NUMBER: Numbers, percentages, extreme magnitudes, and dates
  if (/\d|%|km|metros|quilôm|graus|°c|bilh|milh|trilh|mil\b|tonelad|século|anos|dobro|triplo|zero|infinit/i.test(w)) {
    return { pillFill: '#FFE500', pillText: '#000000', scaleMult: 1.18, sfxType: 'gold_number' };
  }
  // 🔴 POP_ACTION: Shock, curiosity, discovery words
  if (/secret|proibid|morte|mort|derret|imposs|erro|medo|terror|explod|explos|abismo|inferno|sangue|veneno|fatal|extin|destru|jamais|nunca|choque|chocant|bizarro|assustador|perigo|maldi|mistéri|ocult|escondid|pânico|violav/i.test(w)) {
    return { pillFill: '#FF007F', pillText: '#FFFFFF', scaleMult: 1.16, sfxType: 'danger_shock' };
  }
  // 🟢 ELECTRIC CYAN DEFAULT
  return { pillFill: '#00F0FF', pillText: '#000000', scaleMult: 1.12, sfxType: null };
}

// 100% Vector Emojis (Guaranteed 100% Crisp on all OS & Cloud Linux without needing OS emoji fonts)
const VECTOR_EMOJIS = {
  skull: {
    stroke: '#FF007F',
    svg: `<path d="M 20,16 C 20,11 36,11 36,16 C 36,20 33,22 31,24 L 31,30 L 25,30 L 25,24 C 23,22 20,20 20,16 Z" fill="#FFFFFF"/>
          <circle cx="24" cy="18" r="2.5" fill="#000000"/>
          <circle cx="32" cy="18" r="2.5" fill="#000000"/>
          <rect x="26" y="27" width="1.5" height="4" fill="#000000"/>
          <rect x="29" y="27" width="1.5" height="4" fill="#000000"/>`
  },
  fire: {
    stroke: '#FF5722',
    svg: `<path d="M 28,10 C 31,17 38,21 38,28 C 38,35 32,40 25,40 C 18,40 12,35 12,28 C 12,23 17,17 21,12 C 22,18 28,20 28,16 Z" fill="#FF5722" transform="translate(2, 0) scale(0.9)"/>
          <path d="M 28,20 C 31,24 33,27 33,31 C 33,35 29,38 25,38 C 21,38 17,35 17,31 C 17,28 20,25 22,23 C 23,26 26,27 26,25 Z" fill="#FFEB3B" transform="translate(2, 0) scale(0.9)"/>`
  },
  lightning: {
    stroke: '#FFE500',
    svg: `<polygon points="30,10 16,25 24,25 20,41 38,22 28,22" fill="#FFE500" stroke="#000000" stroke-width="1.5"/>`
  },
  money: {
    stroke: '#00E676',
    svg: `<circle cx="28" cy="26" r="14" fill="#00E676" stroke="#000000" stroke-width="2"/>
          <text x="28" y="32" font-size="18" font-weight="900" text-anchor="middle" fill="#000000" font-family="Arial, sans-serif">$</text>`
  },
  warning: {
    stroke: '#FFD700',
    svg: `<polygon points="28,11 11,40 45,40" fill="#FFD700" stroke="#000000" stroke-width="2"/>
          <rect x="26.5" y="21" width="3.5" height="10" rx="1.5" fill="#000000"/>
          <circle cx="28" cy="35" r="2" fill="#000000"/>`
  },
  planet: {
    stroke: '#00F0FF',
    svg: `<circle cx="28" cy="26" r="12" fill="#00F0FF" stroke="#000000" stroke-width="1.5"/>
          <ellipse cx="28" cy="26" rx="20" ry="5.5" fill="none" stroke="#FFE500" stroke-width="2.5" transform="rotate(-20, 28, 26)"/>`
  },
  brain: {
    stroke: '#FF007F',
    svg: `<path d="M 21,17 C 16,17 13,22 15,27 C 13,30 15,35 20,36 C 21,38 24,40 28,39 L 28,16 C 25,16 23,17 21,17 Z" fill="#FF4081"/>
          <path d="M 35,17 C 40,17 43,22 41,27 C 43,30 41,35 36,36 C 35,38 32,40 28,39 L 28,16 C 31,16 33,17 35,17 Z" fill="#FF4081"/>`
  },
  time: {
    stroke: '#00F5D4',
    svg: `<polygon points="16,12 40,12 32,26 40,40 16,40 24,26" fill="none" stroke="#00F5D4" stroke-width="2.5"/>
          <polygon points="19,15 37,15 28,26" fill="#FFE500"/>
          <polygon points="21,38 35,38 28,31" fill="#FFE500"/>`
  }
};

function getEmojiBadgeForWord(wordText) {
  const w = String(wordText || '').toLowerCase();
  if (/morte|mort|fatal|veneno|perigo|destru|extin|fóssil|fossil|tóxico|toxico|radia|cemitério|esqueleto/i.test(w)) {
    return VECTOR_EMOJIS.skull;
  }
  if (/fogo|chama|queima|fervent|vulc|explos|derret|quente|calor|inferno|brasa/i.test(w)) {
    return VECTOR_EMOJIS.fire;
  }
  if (/raio|choque|relâmpago|relampago|energia|elétric|eletric|rápido|velocidade|potência|bateria/i.test(w)) {
    return VECTOR_EMOJIS.lightning;
  }
  if (/dinheiro|dólar|dolar|bilh|milh|trilh|ouro|riqueza|fortuna|valor|caro|preço|lucro|economia/i.test(w)) {
    return VECTOR_EMOJIS.money;
  }
  if (/segredo|proibido|cuidado|atenção|atencao|erro|alerta|bizarro|assustador|medo|terror/i.test(w)) {
    return VECTOR_EMOJIS.warning;
  }
  if (/planeta|espaço|espacial|universo|estrela|lua|satélite|satelite|buraco negro|abismo|fossa|oceano|mar/i.test(w)) {
    return VECTOR_EMOJIS.planet;
  }
  if (/cérebro|cerebro|mente|ideia|pensar|mistério|misterio|ciência|ciencia|descobert|estudo|pesquisa/i.test(w)) {
    return VECTOR_EMOJIS.brain;
  }
  if (/século|seculo|anos|tempo|passado|futuro|era|idade|milênio/i.test(w)) {
    return VECTOR_EMOJIS.time;
  }
  return null;
}

function renderHormoziLineVectorPaths(lineItems, centerX, baselineY, targetFontSize, maxPixelWidth = 610, palette = null, floatingBadgeY = null) {
  const cleanedItems = lineItems
    .map(item => ({
      word: cleanDisplayString(item.word).toUpperCase(),
      isHighlighted: item.isHighlighted,
      sem: classifySemanticWordStyle(item.word),
      badge: item.isHighlighted ? getEmojiBadgeForWord(item.word) : null
    }))
    .filter(item => item.word.length > 0);

  if (cleanedItems.length === 0) return '';

  let fontSize = targetFontSize;
  const computeTotalWidth = (fSize) => {
    const spaceW = fSize * 0.36;
    let total = 0;
    cleanedItems.forEach((it, idx) => {
      const wFont = it.isHighlighted ? Math.round(fSize * it.sem.scaleMult) : fSize;
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
  let floatingBadgesSvg = '';

  for (let i = 0; i < cleanedItems.length; i++) {
    const it = cleanedItems[i];
    const wordFontSize = it.isHighlighted ? Math.round(fontSize * it.sem.scaleMult) : fontSize;
    const wWidth = hormoziFont.getAdvanceWidth(it.word, wordFontSize);
    const activeBaselineY = it.isHighlighted ? Math.round(baselineY + (wordFontSize - fontSize) * 0.25) : baselineY;

    const dShadow = hormoziFont.getPath(it.word, curX + 4, activeBaselineY + 4, wordFontSize).toPathData(1);
    const dMain = hormoziFont.getPath(it.word, curX, activeBaselineY, wordFontSize).toPathData(1);

    if (it.isHighlighted) {
      const padX = Math.round(wordFontSize * 0.22);
      const pillH = Math.round(wordFontSize * 1.24);
      const pillY = Math.round(activeBaselineY - wordFontSize * 0.92);
      const pillW = Math.round(wWidth + padX * 2);
      const pillX = Math.round(curX - padX);

      pillRects += `<rect x="${pillX + 4}" y="${pillY + 5}" width="${pillW}" height="${pillH}" rx="15" fill="#000000" fill-opacity="0.88"/>`;
      pillRects += `<rect x="${pillX}" y="${pillY}" width="${pillW}" height="${pillH}" rx="15" fill="${it.sem.pillFill}" stroke="#000000" stroke-width="4"/>`;
      if (it.sem.pillText === '#FFFFFF') {
        fgPaths += `<path d="${dMain}" fill="#FFFFFF" stroke="#000000" stroke-width="4" stroke-linejoin="round"/><path d="${dMain}" fill="#FFFFFF"/>`;
      } else {
        fgPaths += `<path d="${dMain}" fill="${it.sem.pillText}" stroke="${it.sem.pillText}" stroke-width="1.5" stroke-linejoin="round"/>`;
      }

      // Contextual Alex Hormozi 2.0 Pop-In Emoji Badge
      if (it.badge) {
        const badgeCenterX = pillX + (pillW / 2);
        const badgeCenterY = floatingBadgeY !== null ? floatingBadgeY : (pillY - 30);
        floatingBadgesSvg += `
          <g transform="translate(${badgeCenterX - 28}, ${badgeCenterY - 26})">
            <circle cx="28" cy="26" r="24" fill="#000000" fill-opacity="0.92" stroke="${it.badge.stroke}" stroke-width="3.5"/>
            ${it.badge.svg}
          </g>
        `;
      }
    } else {
      shadowPaths += `<path d="${dShadow}" fill="#000000" stroke="#000000" stroke-width="14" stroke-linejoin="round" stroke-linecap="round"/>`;
      fgPaths += `<path d="${dMain}" fill="none" stroke="#000000" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/><path d="${dMain}" fill="#FFFFFF"/>`;
    }

    curX += wWidth + spaceW;
  }

  return `${pillRects}\n${shadowPaths}\n${fgPaths}\n${floatingBadgesSvg}`;
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
  'europa': 'Europa moon Jupiter NASA',
  'titã (satélite)': 'Titan moon Saturn Cassini',
  'titã': 'Titan moon Saturn Cassini',
  'tita': 'Titan moon Saturn Cassini',
  'quimera (peixe)': 'Chimaera fish deep sea shark',
  'pata de elefante (chernobyl)': 'Chernobyl nuclear power plant Elephant Foot corium',
  'pata de elefante': 'Chernobyl nuclear power plant Elephant Foot corium',
  'matusalém (árvore)': 'Pinus longaeva bristlecone pine White Mountains',
  'matusalem': 'Pinus longaeva bristlecone pine White Mountains',
  'rio fervente': 'Shanay-Timpishka boiling river thermal Amazon',
  'olho do saara': 'Richat Structure Eye of the Sahara Mauritania satellite',
  'caverna dos cristais': 'Cave of the Crystals Naica selenite Mexico',
  'relâmpago do catatumbo': 'Catatumbo lightning storm Venezuela',
  'relampago do catatumbo': 'Catatumbo lightning storm Venezuela',
  'fossa das marianas': 'Mariana Trench Challenger Deep bathyscaphe',
  'ilha da queimada grande': 'Bothrops insularis Ilha da Queimada Grande snake',
  'poço superprofundo de kola': 'Kola Superdeep Borehole borehole cap Russia',
  'poco superprofundo de kola': 'Kola Superdeep Borehole borehole cap Russia',
  'cratera de darvaza': 'Darvaza gas crater door to hell Turkmenistan',
  'porta para o inferno': 'Darvaza gas crater door to hell Turkmenistan',
  'lago natron': 'Lake Natron Tanzania red water salt',
  'tardigrada': 'Tardigrade water bear microscope',
  'urso-d’água': 'Tardigrade water bear microscope',
  'ophiocordyceps unilateralis': 'Ophiocordyceps unilateralis zombie ant fungus',
  'turritopsis dohrnii': 'Turritopsis dohrnii immortal jellyfish ocean',
  'silabário global de sementes de svalbard': 'Svalbard Global Seed Vault Arctic',
  'svalbard': 'Svalbard Global Seed Vault Arctic',
  'cofre do fim do mundo': 'Svalbard Global Seed Vault Arctic',
  'cérebro de albert einstein': 'Albert Einstein brain Thomas Harvey',
  'cerebro de albert einstein': 'Albert Einstein brain Thomas Harvey',
  'ponto nemo': 'Point Nemo oceanic pole inaccessibility spacecraft cemetery',
  'manuscrito voynich': 'Voynich manuscript illustrations parchment',
  'cachoeira de sangue': 'Blood Falls Taylor Glacier Antarctica red iron oxide',
  'aurora polar': 'Aurora borealis northern lights real photo night sky',
  'aurora boreal': 'Aurora borealis northern lights real photo night sky',
  'aurora austral': 'Aurora australis southern lights real photo night sky'
};

function getDisambiguatedTopic(raw) {
  const clean = String(raw || '').toLowerCase().trim();
  const withoutParens = clean.replace(/\s*\([^)]*\)/g, '').trim();
  const normalized = withoutParens.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [k, v] of Object.entries(SCIENTIFIC_DISAMBIGUATION_MAP)) {
    const kNorm = k.toLowerCase().replace(/\s*\([^)]*\)/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    if (kNorm === normalized || normalized.includes(kNorm) || kNorm.includes(normalized)) {
      return v;
    }
  }
  return '';
}

// 100% Theme-Accurate Scene & Topic Photo Fetcher
async function prefetchTopicPhotoUrlsForScenes(scriptData) {
  const scenes = scriptData.scenes || [];
  const fullSourceTopic = String(scriptData.sourceTopic || scriptData.title || 'Ciência').trim();
  const disambiguatedTerm = getDisambiguatedTopic(fullSourceTopic) || scriptData.wikiSearch || '';
  const rawTopic = disambiguatedTerm || fullSourceTopic.replace(/\s*\([^)]*\)/g, '').trim();

  let enTitleClean = '';
  const topicPool = [];
  const sceneSpecificPools = scenes.map(() => []);
  const seenIds = new Set();

  const addTopicPhotoCandidate = (cdnUrl, murl = '') => {
    if (!cdnUrl) return;
    const checkStr = String(murl || '').toLowerCase();
    if (/ytimg\.com|youtube\.com|youtu\.be|tiktok\.com|instagram\.com|facebook\.com|fbsbx\.com|pinterest\.|pinimg\.com|ifunny\.|9gag\.|geradordememes|ahnegao|slideshare\.|slideserve\.|scribd\.|researchgate\.|frontiersin\.org|mdpi\.com|springer\.com|elsevier\.com|brainly\.|quizlet\.|chegg\.|coursehero\.|studocu\.|meme|cartoon|charge|clipart|vector|vetor|icon|logo|flag|bandeira|coat_of_arms|brasao|map|mapa|locator|location|chart|grafico|diagram|diagrama|tabela|table|infographic|infografico|slide|apresentacao|capa|book|livro|selo|stamp|assinatura|signature|-comp-|_comp_|\.svg|\.gif|\.pdf/i.test(checkStr)) return;

    const oipMatch = cdnUrl.match(/OIP\.[a-zA-Z0-9_-]+/);
    const dedupKey = oipMatch ? oipMatch[0] : (murl || cdnUrl);
    if (seenIds.has(dedupKey)) return;
    seenIds.add(dedupKey);
    topicPool.push({ cdnUrl, murl: murl || cdnUrl });
  };

  const addScenePhotoCandidate = (sIdx, cdnUrl, murl = '') => {
    if (!cdnUrl || !sceneSpecificPools[sIdx]) return;
    const checkStr = String(murl || '').toLowerCase();
    if (/ytimg\.com|youtube\.com|youtu\.be|tiktok\.com|instagram\.com|facebook\.com|fbsbx\.com|pinterest\.|pinimg\.com|ifunny\.|9gag\.|geradordememes|ahnegao|slideshare\.|slideserve\.|scribd\.|researchgate\.|frontiersin\.org|mdpi\.com|springer\.com|elsevier\.com|brainly\.|quizlet\.|chegg\.|coursehero\.|studocu\.|meme|cartoon|charge|clipart|vector|vetor|icon|logo|flag|bandeira|coat_of_arms|brasao|map|mapa|locator|location|chart|grafico|diagram|diagrama|tabela|table|infographic|infografico|slide|apresentacao|capa|book|livro|selo|stamp|assinatura|signature|-comp-|_comp_|\.svg|\.gif|\.pdf/i.test(checkStr)) return;

    sceneSpecificPools[sIdx].push({ cdnUrl, murl: murl || cdnUrl });
  };

  // 1. Direct Wikipedia Hero Image Lookup (PT + EN) with safe 800px thumbnail to prevent 400 errors
  try {
    const ptLookupTitle = scriptData.wikiSearch || fullSourceTopic;
    const ptUrl = `https://pt.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(ptLookupTitle)}&prop=pageimages|langlinks&piprop=thumbnail&pithumbsize=800&lllang=en&redirects=1&format=json`;
    const ptRes = await fetch(ptUrl, {
      headers: { 'User-Agent': 'ShortsFactoryBot/5.0 (https://shorts-factory-ai.onrender.com; contact@shortsfactory.com)' },
      signal: AbortSignal.timeout(2000)
    });
    if (ptRes.ok) {
      const ptData = await ptRes.json();
      const page = Object.values(ptData.query?.pages || {})[0];
      if (page?.thumbnail?.source) {
        addTopicPhotoCandidate(page.thumbnail.source, page.thumbnail.source);
        if (sceneSpecificPools[0]) sceneSpecificPools[0].unshift({ cdnUrl: page.thumbnail.source, murl: page.thumbnail.source });
      }
      if (page?.langlinks?.[0]?.['*']) {
        enTitleClean = page.langlinks[0]['*'].replace(/\s*\([^)]*\)/g, '').trim();
      }
    }
  } catch (e) {}

  if (enTitleClean) {
    try {
      const enUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(enTitleClean)}&prop=pageimages&piprop=thumbnail&pithumbsize=800&redirects=1&format=json`;
      const enRes = await fetch(enUrl, {
        headers: { 'User-Agent': 'ShortsFactoryBot/5.0 (https://shorts-factory-ai.onrender.com; contact@shortsfactory.com)' },
        signal: AbortSignal.timeout(2000)
      });
      if (enRes.ok) {
        const enData = await enRes.json();
        const page = Object.values(enData.query?.pages || {})[0];
        if (page?.thumbnail?.source) {
          addTopicPhotoCandidate(page.thumbnail.source, page.thumbnail.source);
          if (sceneSpecificPools[0]) sceneSpecificPools[0].unshift({ cdnUrl: page.thumbnail.source, murl: page.thumbnail.source });
        }
      }
    } catch (e) {}
  }

  // 2. Parallel Targeted Web Image Searches:
  // - Global Topic Pool (main subject documentary shots)
  // - Scene-Specific Pools (using curated imageQuery & fallbackThemeQuery without cross-pollution)
  const uaBrowser = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
  const enQueryBase = enTitleClean || rawTopic;

  const topicSearches = [
    `${rawTopic} fotografia real HD -youtube -mapa -grafico -diagrama -meme`,
    `${enQueryBase} real documentary photography HD -youtube -map -chart`
  ];

  await Promise.allSettled([
    ...topicSearches.map(async (qStr) => {
      try {
        const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(qStr)}&qft=+filterui:imagesize-large+filterui:photo-photo&form=IRFLTR`;
        const res = await fetch(searchUrl, { headers: { 'User-Agent': uaBrowser }, signal: AbortSignal.timeout(2500) });
        if (!res.ok) return;
        const html = await res.text();
        for (const m of html.matchAll(/murl&quot;:&quot;(https?:\/\/.+?)&quot;,&quot;turl&quot;:&quot;(https?:\/\/.+?)&quot;/g)) {
          const murl = m[1];
          const turl = m[2].replace(/&amp;/g, '&');
          const smartCropCdnUrl = `${turl}&w=800&h=1422&c=7&rs=1&qlt=95`;
          addTopicPhotoCandidate(smartCropCdnUrl, murl);
        }
      } catch (e) {}
    }),
    ...scenes.map(async (sc, sIdx) => {
      const queries = [];
      const cleanSubject = enQueryBase || rawTopic;

      if (sc.imageQuery) {
        const hasSubject = sc.imageQuery.toLowerCase().includes(cleanSubject.toLowerCase().slice(0, 6)) ||
                           cleanSubject.toLowerCase().includes(sc.imageQuery.toLowerCase().slice(0, 6));
        const anchoredQuery = hasSubject ? sc.imageQuery : `${cleanSubject} ${sc.imageQuery}`;
        queries.push(`${anchoredQuery} real photo HD -youtube -map -chart`);
      }

      if (sc.fallbackThemeQuery && sc.fallbackThemeQuery !== sc.imageQuery) {
        const hasSubject = sc.fallbackThemeQuery.toLowerCase().includes(cleanSubject.toLowerCase().slice(0, 6)) ||
                           cleanSubject.toLowerCase().includes(sc.fallbackThemeQuery.toLowerCase().slice(0, 6));
        const anchoredFallback = hasSubject ? sc.fallbackThemeQuery : `${cleanSubject} ${sc.fallbackThemeQuery}`;
        queries.push(`${anchoredFallback} photo HD -youtube -map -chart`);
      }

      queries.push(`${cleanSubject} photography HD -youtube -map -chart`);

      for (const q of queries.slice(0, 2)) {
        try {
          const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(q)}&qft=+filterui:imagesize-large+filterui:photo-photo&form=IRFLTR`;
          const res = await fetch(searchUrl, { headers: { 'User-Agent': uaBrowser }, signal: AbortSignal.timeout(4500) });
          if (res.ok) {
            const html = await res.text();
            for (const m of html.matchAll(/murl&quot;:&quot;(https?:\/\/.+?)&quot;,&quot;turl&quot;:&quot;(https?:\/\/.+?)&quot;/g)) {
              const murl = m[1];
              const turl = m[2].replace(/&amp;/g, '&');
              const smartCropCdnUrl = `${turl}&w=800&h=1422&c=7&rs=1&qlt=95`;
              addScenePhotoCandidate(sIdx, smartCropCdnUrl, murl);
            }
          }
        } catch (e) {}
      }
    })
  ]);

  console.log(`📸 [Web Image Pool] "${rawTopic}": ${topicPool.length} fotos do tema + ${scenes.map((_, i) => (sceneSpecificPools[i] || []).length).join('/')} por cena encontradas!`);

  // Assign 2 distinct photos per scene (prioritizing the scene's own dedicated queries!)
  let pCursor = 0;
  const usedAcrossVideo = new Set();
  return scenes.map((_, sIdx) => {
    const sPool = sceneSpecificPools[sIdx] || [];
    const pickCandidates = (offset, isSecondShot) => {
      const urls = [];
      // 1st priority: Scene's own dedicated photo pool (Shot A takes from front, Shot B from back half)
      const poolStart = isSecondShot ? Math.floor(sPool.length / 2) : 0;
      for (let m = poolStart; m < sPool.length && urls.length < 3; m++) {
        const sp = sPool[m];
        if (sp && sp.cdnUrl && !usedAcrossVideo.has(sp.cdnUrl)) {
          usedAcrossVideo.add(sp.cdnUrl);
          urls.push(sp.cdnUrl);
        }
      }
      // If still need candidates, take remaining from sPool
      for (let m = 0; m < sPool.length && urls.length < 3; m++) {
        const sp = sPool[m];
        if (sp && sp.cdnUrl && !urls.includes(sp.cdnUrl)) {
          urls.push(sp.cdnUrl);
        }
      }
      // 2nd priority: Topic Photo Pool (photos of the exact overall topic)
      for (let k = 0; k < topicPool.length && urls.length < 4; k++) {
        const item = topicPool[(offset + k * 2) % Math.max(1, topicPool.length)];
        if (item && item.cdnUrl && !usedAcrossVideo.has(item.cdnUrl)) {
          usedAcrossVideo.add(item.cdnUrl);
          urls.push(item.cdnUrl);
        }
      }
      // Fallback: If topicPool has any photos, use them
      for (let k = 0; k < topicPool.length && urls.length < 3; k++) {
        const item = topicPool[k];
        if (item && item.cdnUrl && !urls.includes(item.cdnUrl)) {
          urls.push(item.cdnUrl);
        }
      }
      return urls.filter(Boolean);
    };
    const qA = pickCandidates(pCursor++, false);
    const qB = pickCandidates(pCursor++, true);
    return { queueA: qA, queueB: qB };
  });
}

const OVERSCAN_W = 720;
const OVERSCAN_H = 1280;
const VIDEO_FPS = 20;
const SUB_STRIP_Y = 790;
const SUB_STRIP_H = HEIGHT - SUB_STRIP_Y; // 490px bottom overlay strip

async function prepareScenePhotoZooms(urlQueue = [], colorTheme = 'cosmic', isPunchIn = false) {
  const pal = getAtmospherePalette(colorTheme);
  let bestImgBuf = null;

  for (const url of urlQueue.slice(0, 3)) {
    if (!url) continue;
    try {
      const isWiki = url.includes('wikimedia.org') || url.includes('wikipedia.org');
      const ua = isWiki
        ? 'ShortsFactoryBot/5.0 (https://shorts-factory-ai.onrender.com; contact@shortsfactory.com)'
        : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

      const res = await Promise.race([
        fetch(url, { headers: { 'User-Agent': ua } }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('Fetch timeout')), 2500))
      ]);

      if (res && res.ok) {
        const arrayBuf = await Promise.race([
          res.arrayBuffer(),
          new Promise((_, rej) => setTimeout(() => rej(new Error('Buffer timeout')), 2500))
        ]);
        const buf = Buffer.from(arrayBuf);
        if (buf.length > 3000) {
          bestImgBuf = buf;
          break; // Found valid high-quality photo buffer!
        }
      }
    } catch (e) {}
  }

  const CANVAS_W = isPunchIn ? 900 : 800;
  const CANVAS_H = isPunchIn ? 1600 : 1422;
  const zooms = isPunchIn ? [1.15, 1.18, 1.21, 1.24] : [1.00, 1.03, 1.06, 1.09];

  if (bestImgBuf) {
    try {
      const canvasBuf = await sharp(bestImgBuf)
        .resize(CANVAS_W, CANVAS_H, { fit: 'cover', position: 'center' })
        .sharpen({ sigma: isPunchIn ? 1.05 : 1.0 })
        .modulate({ brightness: isPunchIn ? 1.05 : 1.04, saturation: isPunchIn ? 1.18 : 1.15 })
        .jpeg({ quality: 82 })
        .toBuffer();

      return await Promise.all(zooms.map(async (z) => {
        const boxW = Math.round(CANVAS_W / z);
        const boxH = Math.round(CANVAS_H / z);
        const left = Math.round((CANVAS_W - boxW) / 2);
        const top = Math.round((CANVAS_H - boxH) / 2);
        return sharp(canvasBuf)
          .extract({ left, top, width: boxW, height: boxH })
          .resize(OVERSCAN_W, OVERSCAN_H)
          .jpeg({ quality: 78 })
          .toBuffer();
      }));
    } catch (e) {}
  }

  // Fallback dark studio canvas if offline
  const fallbackSvg = `<svg width="${OVERSCAN_W}" height="${OVERSCAN_H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${OVERSCAN_W}" height="${OVERSCAN_H}" fill="${pal.bgGradTop || '#111827'}"/>
  </svg>`;
  const fallbackBuf = await sharp(Buffer.from(fallbackSvg)).jpeg({ quality: 80 }).toBuffer();
  return [fallbackBuf, fallbackBuf, fallbackBuf, fallbackBuf];
}

// UPGRADE #3: Build Word-Level Active Pill Subtitle Steps inside Stationary 2-3 Word Phrases!
function buildExactTimedChunks(narrationText, wordBoundaries, sceneDurationSec) {
  const rawTokens = narrationText.trim().split(/\s+/).filter(Boolean);

  if ((!wordBoundaries || wordBoundaries.length === 0) && rawTokens.length > 0) {
    const weights = rawTokens.map(w => Math.max(2, w.replace(/[^\wÀ-ÿ]/g, '').length) + (/[,.;:!?]$/.test(w) ? 3 : 1));
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let curOffset = 0;
    wordBoundaries = rawTokens.map((w, idx) => {
      const dur = (weights[idx] / totalWeight) * sceneDurationSec;
      const wb = { word: w, offsetSec: curOffset, durationSec: dur };
      curOffset += dur;
      return wb;
    });
  }

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

    // UPGRADE #3: Group words into punchy, high-retention 2-3 word visual phrases (Hormozi / MrBeast style)
    // with power-word highlighting (Gold Numbers, Danger terms, or punch words)
    const phraseChunks = [];
    for (let c = 0; c < grouped.length; c++) {
      const phraseItems = grouped[c];
      const phraseWords = phraseItems.map(x => x.word);
      // Use accumulated duration from word boundaries for accurate timing (offsetSec alone breaks after ratio rescaling)
      const phraseStartSec = phraseItems[0].offsetSec;
      const lastItem = phraseItems[phraseItems.length - 1];
      const nextPhraseStartSec = (c < grouped.length - 1)
        ? Math.max(phraseStartSec + 0.12, grouped[c + 1][0].offsetSec)
        : Math.max(phraseStartSec + 0.12, lastItem.offsetSec + lastItem.durationSec);

      // Select the most impactful power word in the phrase to highlight (Gold Number, Danger, or punchiest word)
      let highlightIdx = 0;
      let maxScore = -1;
      for (let w = 0; w < phraseItems.length; w++) {
        const itemW = phraseItems[w].word;
        const sem = classifySemanticWordStyle(itemW);
        let score = itemW.length;
        if (sem.sfxType === 'gold_number') score += 50;
        else if (sem.sfxType === 'danger_shock') score += 40;
        else if (w === phraseItems.length - 1) score += 5;
        if (score > maxScore) {
          maxScore = score;
          highlightIdx = w;
        }
      }

      const dur = Math.max(0.12, nextPhraseStartSec - phraseStartSec);
      phraseChunks.push({
        words: phraseWords,
        activeWordIdx: highlightIdx,
        duration: dur
      });
    }

    const sumDur = phraseChunks.reduce((acc, tc) => acc + tc.duration, 0);
    if (phraseChunks.length > 0 && Math.abs(sumDur - sceneDurationSec) > 0.0001) {
      const ratio = sceneDurationSec / sumDur;
      phraseChunks.forEach(tc => { tc.duration *= ratio; });
    }

    return phraseChunks;
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


// Clean Shot A & B pre-baking: Only soft bottom vignette for high-contrast subtitles (Zero badges on screen!)
async function preparePrebakedShot(photoBuffer, palette) {
  const staticHudSvg = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bottomVignette" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#000000" stop-opacity="0.00"/>
        <stop offset="45%" stop-color="#000000" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0.65"/>
      </linearGradient>
    </defs>
    <!-- Bottom Subtitle Contrast Vignette (Keeps 100% of the upper video clean and badge-free) -->
    <rect y="780" width="${WIDTH}" height="500" fill="url(#bottomVignette)"/>
  </svg>`;

  return sharp(photoBuffer)
    .composite([{ input: Buffer.from(staticHudSvg), top: 0, left: 0 }])
    .jpeg({ quality: 80 })
    .toBuffer();
}

// Clean 720x1280 HD Frame Renderer: Composites lightweight subtitle vector paths + film flash + progress bar
// Runs in ~15ms per frame (< 1s total for whole video), rock-solid, zero memory overhead!
async function renderCaptionedFrame({
  prebakedShotBuf,
  isTransitionFlash = false,
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
  const floatingBadgeY = Math.round(baseStartY - fontSize * 0.92 - 28);

  const subtitleLinesSvg = wrappedLines.map((lineItems, lIdx) => {
    const yPos = baseStartY + lIdx * lineSpacing;
    return renderHormoziLineVectorPaths(lineItems, 360, yPos, fontSize, 600, pal, floatingBadgeY);
  }).join('\n');

  // Floating Progress Bar width
  const barMaxW = WIDTH - 56; // 664px
  const progressWidth = Math.max(14, Math.round(barMaxW * progressRatio));

  // UPGRADE #6: 0.08s Film Flash (+24% exposure pop on the first frame of each new photo cut)
  const flashOverlayRect = isTransitionFlash
    ? `<rect width="${WIDTH}" height="${HEIGHT}" fill="#FFFFFF" fill-opacity="0.24"/>`
    : '';

  // Lightweight Subtitle + Progress Bar SVG
  const frameSvg = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="progressGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#00F5D4"/>
        <stop offset="100%" stop-color="#00E676"/>
      </linearGradient>
    </defs>
    ${flashOverlayRect}
    <g>
      ${subtitleLinesSvg}
    </g>
    <!-- Floating Modern Neon Progress Bar -->
    <rect x="28" y="${HEIGHT - 22}" width="${barMaxW}" height="8" rx="4" fill="#000000" fill-opacity="0.6"/>
    <rect x="28" y="${HEIGHT - 22}" width="${progressWidth}" height="8" rx="4" fill="url(#progressGrad)"/>
    <circle cx="${Math.min(WIDTH - 28, 28 + progressWidth)}" cy="${HEIGHT - 18}" r="5.5" fill="#FFFFFF" stroke="#00F5D4" stroke-width="2"/>
  </svg>`;

  await sharp(prebakedShotBuf)
    .composite([{ input: Buffer.from(frameSvg), top: 0, left: 0 }])
    .jpeg({ quality: 78, progressive: false })
    .toFile(outputFramePath);
}

// Single-Pass Studio 4.0 Master Timeline Renderer (Rock-Solid Zero-Tremor + Ultra-Fast Concat < 14s!)
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

  const voiceName = options.voice || 'duet-yara-nicolau';
  const isDuetPodcast = (voiceName === 'duet-podcast' || voiceName === 'duet-yara-nicolau');
  const scenes = scriptData.scenes || [];
  const colorTheme = options.visualStyle === 'vibrant_pop' ? 'vibrant_pop' : (scriptData.colorTheme || 'vibrant_pop');
  const palette = getAtmospherePalette(colorTheme);

  onProgress(15, isDuetPodcast
    ? 'Dueto Dinâmico: Iniciando gravação de Francisca 👩 & Antônio 👨...'
    : 'Studio Pop: Iniciando gravação das vozes neurais e fotos reais...');

  const sceneAssets = [];
  const sceneStartTimes = [];
  let totalDuration = 0;

  // 1. Smooth Step-by-Step Neural Voice Synthesis with live progress
  const ttsResults = [];
  for (let sceneIdx = 0; sceneIdx < scenes.length; sceneIdx++) {
    const s = scenes[sceneIdx];
    const audioWavPath = path.join(tmpDir, `scene_${sceneIdx}.wav`);
    let sceneVoice = s.voice || voiceName;
    if (voiceName === 'duet-yara-nicolau' || voiceName === 'duet' || voiceName === 'duet-podcast') {
      sceneVoice = (sceneIdx % 2 === 1) ? 'pt-BR-AntonioNeural' : 'pt-BR-FranciscaNeural';
    }
    const isMale = (sceneVoice && (sceneVoice.includes('Antonio') || sceneVoice.includes('Nicolau'))) || (sceneIdx % 2 === 1);
    const speakerLabel = isMale ? 'Antônio 👨' : 'Francisca 👩';
    const pct = 18 + Math.round((sceneIdx / scenes.length) * 28);
    onProgress(pct, `Gravando voz neural (${speakerLabel}): Cena ${sceneIdx + 1}/${scenes.length}...`);
    const ttsResult = await synthesizeSpeechWithTimings(s.narration, audioWavPath, sceneVoice, sceneIdx);
    ttsResults.push({ audioWavPath, ttsResult, sceneVoice });
  }

  // 2. Fast Web Photos Prefetch
  onProgress(48, 'Buscando 14 fotos reais HD da Web...');
  const photoQueues = await prefetchTopicPhotoUrlsForScenes(scriptData);

  // 3. Ultra-fast 9:16 Photo Processing with 4 Ken Burns Progressive Zoom Slices per Shot
  onProgress(56, 'Preparando fotos 9:16 Full-Screen + Movimento Ken Burns...');
  const scenePhotoBuffers = await Promise.all(scenes.map(async (_, i) => {
    const pQ = photoQueues[i] || photoQueues[0] || { queueA: [], queueB: [] };
    const [photoBufAZooms, photoBufBZooms] = await Promise.all([
      prepareScenePhotoZooms(pQ.queueA, colorTheme, false),
      prepareScenePhotoZooms(pQ.queueB, colorTheme, true)
    ]);
    return { photoBufAZooms, photoBufBZooms };
  }));

  onProgress(66, isDuetPodcast
    ? 'Dueto Sincronizado: Mixando vozes de Francisca 👩 & Antônio 👨...'
    : 'Sincronizando 14 fotos reais HD + Movimento Ken Burns...');

  for (let i = 0; i < scenes.length; i++) {
    const { audioWavPath, ttsResult, sceneVoice } = ttsResults[i];
    const { photoBufAZooms, photoBufBZooms } = scenePhotoBuffers[i];
    const isMale = (sceneVoice && (sceneVoice.includes('Nicolau') || sceneVoice.includes('Antonio') || sceneVoice.includes('Fabio') || sceneVoice.includes('Donato'))) || (isDuetPodcast && (i % 2 === 1));
    const speakerInfo = isDuetPodcast ? {
      name: isMale ? 'Antônio' : 'Francisca',
      emoji: isMale ? '👨' : '👩',
      color: isMale ? '#00f0ff' : '#ff007f',
      role: isMale ? 'Narrador' : 'Apresentadora'
    } : null;

    sceneStartTimes.push(totalDuration);
    sceneAssets.push({
      index: i,
      narration: scenes[i].narration,
      audioWavPath,
      photoBufAZooms,
      photoBufBZooms,
      duration: ttsResult.duration,
      wordBoundaries: ttsResult.wordBoundaries,
      speakerInfo
    });
    totalDuration += ttsResult.duration;
  }

  // Standalone viral structure (natural start + impactful retention + clear CTA ending)
  sceneStartTimes.length = 0;
  const midCutTimes = [];
  totalDuration = 0;
  for (let i = 0; i < sceneAssets.length; i++) {
    sceneStartTimes.push(totalDuration);
    midCutTimes.push(totalDuration + sceneAssets[i].duration * 0.50);
    totalDuration += sceneAssets[i].duration;
  }

  onProgress(68, 'Renderizando Fotos HD 100% Nítidas + Legendas Karaokê 3 Cores + Emojis...');

  // Pre-bake Shot A and Shot B zoom slices with soft bottom vignette for high-contrast subtitles
  for (let i = 0; i < sceneAssets.length; i++) {
    const asset = sceneAssets[i];
    const [bakedShotAZooms, bakedShotBZooms] = await Promise.all([
      Promise.all(asset.photoBufAZooms.map(b => preparePrebakedShot(b, palette))),
      Promise.all(asset.photoBufBZooms.map(b => preparePrebakedShot(b, palette)))
    ]);
    asset.bakedShotAZooms = bakedShotAZooms;
    asset.bakedShotBZooms = bakedShotBZooms;
  }

  const masterFramesListPath = path.join(tmpDir, 'master_frames.txt');
  let masterConcatContent = '';
  let elapsedDuration = 0;
  let lastRenderedFramePath = null;
  const frameJobs = [];
  const wordTriggerEvents = [];

  for (let i = 0; i < sceneAssets.length; i++) {
    const asset = sceneAssets[i];
    const timedChunks = buildExactTimedChunks(asset.narration, asset.wordBoundaries, asset.duration);
    const halfIdx = Math.max(1, Math.floor(timedChunks.length / 2));
    let sceneElapsed = 0;

    for (let c = 0; c < timedChunks.length; c++) {
      const framePath = path.join(tmpDir, `frame_${i}_${c}.jpg`);
      const thisChunkDur = timedChunks[c].duration;
      const chunkStartAbsSec = elapsedDuration + sceneElapsed;
      sceneElapsed += thisChunkDur;
      const progressRatio = Math.min(1, (elapsedDuration + sceneElapsed) / totalDuration);

      // Ken Burns Progressive Micro-Zooms: smoothly pushes camera forward with each subtitle line
      const isFirstHalf = (c < halfIdx);
      let prebakedShotBuf;
      if (isFirstHalf) {
        const progressA = c / Math.max(1, halfIdx - 1);
        const zoomIdx = Math.min(3, Math.floor(progressA * 3.99));
        prebakedShotBuf = asset.bakedShotAZooms[zoomIdx];
      } else {
        const bIdx = c - halfIdx;
        const bTotal = timedChunks.length - halfIdx;
        const progressB = bIdx / Math.max(1, bTotal - 1);
        const zoomIdx = Math.min(3, Math.floor(progressB * 3.99));
        prebakedShotBuf = asset.bakedShotBZooms[zoomIdx];
      }

      // UPGRADE #6: Trigger 0.08s Film Flash on the very first frame of each new photo cut
      const isTransitionFlash = (c === 0 || c === halfIdx);

      // UPGRADE #5: Collect exact timestamp if the active word is a Gold Number or Danger Shock word
      const activeW = timedChunks[c].words[timedChunks[c].activeWordIdx] || '';
      const semStyle = classifySemanticWordStyle(activeW);
      if (semStyle.sfxType) {
        wordTriggerEvents.push({ timeSec: chunkStartAbsSec, type: semStyle.sfxType, word: activeW });
      }

      frameJobs.push({
        prebakedShotBuf,
        isTransitionFlash,
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

  // Render all 720x1280 JPEG frames in memory-protected batches (peak heap < 70MB, rock-solid < 1.5s total!)
  const BATCH_SIZE = 10;
  for (let b = 0; b < frameJobs.length; b += BATCH_SIZE) {
    await Promise.all(frameJobs.slice(b, b + BATCH_SIZE).map(job => renderCaptionedFrame(job)));
  }

  if (lastRenderedFramePath) {
    masterConcatContent += `file '${lastRenderedFramePath}'\n`;
  }
  fs.writeFileSync(masterFramesListPath, masterConcatContent, 'utf8');

  onProgress(86, 'Masterizando Vídeo 720x1280 HD + Sidechain Auto-Ducking + SFX Cinema...');

  const masterVoiceWavPath = path.join(tmpDir, 'master_voice.wav');
  const exactVoiceDur = concatenateWavFilesSampleExact(sceneAssets.map(a => a.audioWavPath), masterVoiceWavPath);

  const bgMusicWav = path.join(tmpDir, 'bgm.wav');
  genBgm(bgMusicWav, exactVoiceDur, colorTheme || scriptData.musicMood || 'cosmic', sceneStartTimes, midCutTimes, wordTriggerEvents);

  const finalFilename = `${jobId}.mp4`;
  const finalMp4Path = path.join(outDir, finalFilename);

  // Broadcast Audio Mixing with Professional Sidechain Auto-Ducking
  // BGM smoothly ducks when speech is active and swells up with whooshes and bass booms during pauses and transitions!
  const audioFadeStart = Math.max(0, exactVoiceDur - 0.40).toFixed(2);
  const ffmpegArgs = [
    '-y',
    '-f', 'concat', '-safe', '0', '-i', masterFramesListPath,
    '-i', masterVoiceWavPath,
    '-i', bgMusicWav,
    '-filter_complex',
    `[1:a]highpass=f=65,acompressor=threshold=-19dB:ratio=2.2:attack=18:release=140:makeup=1.1,volume=1.06,asplit=2[voice_main][voice_side];[2:a]highpass=f=45,equalizer=f=2500:t=q:w=1.2:g=-2.0,volume=0.32[bgm];[bgm][voice_side]sidechaincompress=threshold=0.04:ratio=4.5:attack=15:release=260:makeup=1[ducked_bgm];[voice_main][ducked_bgm]amix=inputs=2:duration=first:dropout_transition=2,afade=t=out:st=${audioFadeStart}:d=0.40[aout]`,
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

  onProgress(100, 'Short 100% Nítido Sem Tremor Finalizado!');

  return {
    ...scriptData,
    id: jobId,
    filename: finalFilename,
    url: videoUrl,
    localMp4Path: finalMp4Path,
    duration: Math.round(totalDuration),
    createdAt: new Date().toISOString()
  };
}

module.exports = {
  buildShortVideo,
  prefetchTopicPhotoUrlsForScenes
};
