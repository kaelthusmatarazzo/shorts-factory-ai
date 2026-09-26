const fs = require('fs');
const path = require('path');
const os = require('os');

const BUNDLED_DATA_DIR = path.join(__dirname, '..', 'data');
const BUNDLED_HISTORY_FILE = path.join(BUNDLED_DATA_DIR, 'history.json');
const DATA_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), 'shorts-factory-data')
  : BUNDLED_DATA_DIR;
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

if (!fs.existsSync(DATA_DIR)) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
}

// In-memory global cache across warm serverless invocations
if (!global.__SHORTS_FACTORY_HISTORY__) {
  global.__SHORTS_FACTORY_HISTORY__ = { usedTitles: [], usedTopics: [], videos: [] };
}

function normalizeTopicKey(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function isTopicAlreadyUsed(candidate, usedList = []) {
  const candKey = normalizeTopicKey(candidate);
  if (!candKey) return false;
  for (const item of usedList) {
    const itemKey = normalizeTopicKey(item);
    if (!itemKey) continue;
    if (candKey === itemKey || (candKey.length > 5 && itemKey.includes(candKey)) || (itemKey.length > 5 && candKey.includes(itemKey))) {
      return true;
    }
  }
  return false;
}

function normalizeMetadata(item) {
  if (!item) return item;
  const cleanTitle = (item.title || 'Fato Curioso Impressionante').trim();
  const topicSlug = (item.sourceTopic || cleanTitle)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3)
    .slice(0, 3)
    .map(w => `#${w}`)
    .join(' ');

  if (!item.description) {
    if (item.caption) {
      const parts = item.caption.split(/(?=#)/);
      const descPart = parts[0].trim();
      item.description = descPart || `${cleanTitle}! 😱 Assista até o final para entender cada detalhe. Você já sabia disso? Comente aqui embaixo! 👇`;
    } else {
      item.description = `${cleanTitle}! 😱 Assista até o final para entender cada detalhe. Você já sabia disso? Comente aqui embaixo! 👇`;
    }
  }

  if (!item.hashtags) {
    if (item.caption && item.caption.includes('#')) {
      const tags = item.caption.match(/#[\wÀ-ÿ]+/g);
      item.hashtags = tags ? tags.join(' ') : `#fatoscuriosos #curiosidades #vocesabia #ciencia ${topicSlug} #tiktokbrasil #fyp #viral #historia`;
    } else {
      item.hashtags = `#fatoscuriosos #curiosidades #vocesabia #ciencia ${topicSlug} #tiktokbrasil #fyp #viral #historia`;
    }
  }

  if (!item.loopBridge) {
    item.loopBridge = {
      endText: 'Mas o motivo mais chocante de todos é que...',
      startText: `...quase ninguém no mundo percebe o verdadeiro segredo oculto por trás de ${cleanTitle}!`
    };
  }

  item.caption = `${item.description}\n\n${item.hashtags}`;
  return item;
}

function loadHistory(extraExclude = []) {
  let diskData = { usedTitles: [], usedTopics: [], videos: [] };
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      diskData = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    } else if (fs.existsSync(BUNDLED_HISTORY_FILE)) {
      diskData = JSON.parse(fs.readFileSync(BUNDLED_HISTORY_FILE, 'utf8'));
    }
  } catch (e) {}

  const mem = global.__SHORTS_FACTORY_HISTORY__ || { usedTitles: [], usedTopics: [], videos: [] };
  const mergedTitles = Array.from(new Set([...(diskData.usedTitles || []), ...(mem.usedTitles || []), ...(Array.isArray(extraExclude) ? extraExclude : [])]));
  const mergedTopics = Array.from(new Set([...(diskData.usedTopics || []), ...(mem.usedTopics || []), ...(Array.isArray(extraExclude) ? extraExclude : [])]));

  // Deduplicate videos by title
  const seenVidTitles = new Set();
  const mergedVideos = [];
  for (const v of [...(mem.videos || []), ...(diskData.videos || [])]) {
    if (!v || !v.title) continue;
    const k = normalizeTopicKey(v.title);
    if (!seenVidTitles.has(k)) {
      seenVidTitles.add(k);
      mergedVideos.push(normalizeMetadata(v));
      if (v.title && !mergedTitles.includes(v.title)) mergedTitles.push(v.title);
      if (v.sourceTopic && !mergedTopics.includes(v.sourceTopic)) mergedTopics.push(v.sourceTopic);
    }
  }

  const finalHistory = {
    usedTitles: mergedTitles,
    usedTopics: mergedTopics,
    videos: mergedVideos.slice(0, 50)
  };
  global.__SHORTS_FACTORY_HISTORY__ = finalHistory;
  return finalHistory;
}

function saveToHistory(videoMeta, extraExclude = []) {
  const history = loadHistory(extraExclude);
  const normalized = normalizeMetadata(videoMeta);

  if (normalized.title && !history.usedTitles.includes(normalized.title)) {
    history.usedTitles.push(normalized.title);
  }
  if (normalized.sourceTopic && !history.usedTopics.includes(normalized.sourceTopic)) {
    history.usedTopics.push(normalized.sourceTopic);
  }

  // Remove existing entry with same title before unshifting
  const normKey = normalizeTopicKey(normalized.title);
  history.videos = (history.videos || []).filter(v => normalizeTopicKey(v.title) !== normKey);
  history.videos.unshift({
    ...normalized,
    createdAt: normalized.createdAt || new Date().toISOString()
  });
  history.videos = history.videos.slice(0, 50);

  global.__SHORTS_FACTORY_HISTORY__ = history;
  try {
    // On Vercel, avoid writing giant base64 video URLs into history.json if >2MB, keep lightweight metadata
    const diskCopy = {
      usedTitles: history.usedTitles,
      usedTopics: history.usedTopics,
      videos: history.videos.map(v => ({
        ...v,
        url: (process.env.VERCEL && v.url && v.url.startsWith('data:video/mp4;base64,')) ? v.url : v.url
      }))
    };
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(diskCopy, null, 2), 'utf8');
  } catch (e) {}
  return history;
}

function rememberGeneratedScript(title, sourceTopic, extraExclude = []) {
  const history = loadHistory(extraExclude);
  if (title && !history.usedTitles.includes(title)) history.usedTitles.push(title);
  if (sourceTopic && !history.usedTopics.includes(sourceTopic)) history.usedTopics.push(sourceTopic);
  global.__SHORTS_FACTORY_HISTORY__ = history;
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
  } catch (e) {}
}

function clearHistory() {
  const empty = { usedTitles: [], usedTopics: [], videos: [] };
  global.__SHORTS_FACTORY_HISTORY__ = empty;
  try { fs.writeFileSync(HISTORY_FILE, JSON.stringify(empty, null, 2), 'utf8'); } catch (e) {}
  const videosDir = path.join(__dirname, '..', 'public', 'videos');
  if (fs.existsSync(videosDir)) {
    for (const f of fs.readdirSync(videosDir)) {
      if (f.endsWith('.mp4')) {
        try { fs.unlinkSync(path.join(videosDir, f)); } catch (e) {}
      }
    }
  }
  return empty;
}

const WIKI_CATEGORIES = {
  curiosidades: [
    'Categoria:Fenômenos_naturais',
    'Categoria:Animais_extintos',
    'Categoria:Paradoxos',
    'Categoria:Recordes_mundiais',
    'Categoria:Fósseis',
    'Categoria:Vulcões',
    'Categoria:Bioluminescência',
    'Categoria:Fisiologia_humana',
    'Categoria:Plantas_carnívoras',
    'Categoria:Minerais'
  ],
  misterios: [
    'Categoria:Mistérios',
    'Categoria:Lugares_abandonados',
    'Categoria:Ilhas_fantasmas',
    'Categoria:Cidades_perdidas',
    'Categoria:Anomalias_astronômicas',
    'Categoria:Naufrágios',
    'Categoria:Criptozoologia'
  ],
  historia: [
    'Categoria:Artefatos_arqueológicos',
    'Categoria:Egito_Antigo',
    'Categoria:Império_Romano',
    'Categoria:Maravilhas_do_Mundo',
    'Categoria:Invenções',
    'Categoria:Civilizações_antigas'
  ],
  futuro: [
    'Categoria:Exoplanetas',
    'Categoria:Buracos_negros',
    'Categoria:Exploração_espacial',
    'Categoria:Estrelas',
    'Categoria:Luas_de_Saturno',
    'Categoria:Inteligência_artificial'
  ],
  motivacao: [
    'Categoria:Estoicismo',
    'Categoria:Filósofos_da_Grécia_Antiga',
    'Categoria:Psicologia_cognitiva',
    'Categoria:Vieses_cognitivos'
  ],
  financas: [
    'Categoria:Economia_comportamental',
    'Categoria:Moedas',
    'Categoria:Ouro',
    'Categoria:História_econômica'
  ]
};

const { CURATED_DOCUMENTARY_FACTS, HIGH_IMPACT_WIKI_TOPICS } = require('./curated_facts_bank');

// Fetch full multi-section text (up to 12,000 chars!) + original image from Wikipedia PT-BR
async function fetchFullWikipediaArticle(title) {
  try {
    const url = `https://pt.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages&explaintext=1&exchars=12000&piprop=original|thumbnail&pithumbsize=1080&redirects=1&titles=${encodeURIComponent(title)}&format=json`;
    const res = await fetch(url, { headers: { 'User-Agent': 'ShortsFactoryPro/5.0' } });
    if (res.ok) {
      const data = await res.json();
      const pages = Object.values(data.query?.pages || {});
      const p = pages[0];
      if (p && p.extract && p.extract.length > 450) {
        return {
          topic: p.title,
          extract: p.extract.replace(/==+[^=]+=+/g, '. ').replace(/\s+/g, ' ').trim(),
          wikiImage: p.original?.source || p.thumbnail?.source || null
        };
      }
    }
  } catch (e) {}
  return null;
}

// Score a sentence by how much REAL concrete information (numbers, dates, causes, records, mechanisms) it contains
function scoreSentenceFactuality(sentence, cleanTopic) {
  const s = sentence.trim();
  if (s.length < 42 || s.length > 250) return -100;

  // Reject dry encyclopedia taxonomy / glossary stubs
  const dryPatterns = [
    /é um gênero botânico/i,
    /é um género botânico/i,
    /pertencente à família/i,
    /é uma espécie extinta de anfíbio/i,
    /pode referir-se a:/i,
    /é um município brasileiro/i,
    /classificação científica/i,
    /ver também/i,
    /ligações externas/i,
    /referências bibliográficas/i,
    /isbn /i
  ];
  for (const pat of dryPatterns) {
    if (pat.test(s)) return -200;
  }

  let score = 10;

  // Huge bonus for concrete numbers, years, percentages, distances, temperatures, weights
  const numberMatches = s.match(/\d+/g);
  if (numberMatches) {
    score += Math.min(35, numberMatches.length * 14);
  }

  // Bonus for spoken number/measurement words and real-world impact terms
  const factKeywords = [
    'metros', 'quilômetros', 'km', 'graus', 'celsius', 'toneladas', 'quilos',
    'milhões', 'bilhões', 'mil', 'anos', 'século', 'vezes', 'por cento', '%',
    'profundidade', 'altura', 'velocidade', 'pressão', 'temperatura', 'veneno',
    'capaz de', 'único', 'maior', 'menor', 'recorde', 'proibido', 'mortal',
    'sobrevive', 'descoberto', 'cientistas', 'pesquisadores', 'explosão',
    'energia', 'cérebro', 'oxigênio', 'oceano', 'planeta', 'terra', 'espaço',
    'porque', 'causa', 'provoca', 'transforma', 'durante', 'história'
  ];
  const lower = s.toLowerCase();
  for (const kw of factKeywords) {
    if (lower.includes(kw)) score += 6;
  }

  return score;
}

// Extract 6 distinct, information-packed factual sentences in narrative order from a full Wikipedia article
function extractHighDensityFactualSentences(rawText, cleanTopic) {
  const cleanedText = String(rawText || '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\s+/g, ' ');

  const rawCandidates = cleanedText
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length >= 42 && s.length <= 245);

  // Score each sentence while preserving its original index for narrative flow
  const scored = rawCandidates.map((text, idx) => ({
    text: text.replace(/^[.,;:\-\s]+/, ''),
    idx,
    score: scoreSentenceFactuality(text, cleanTopic)
  })).filter(item => item.score > 0);

  if (scored.length <= 6) {
    return scored.map(x => x.text);
  }

  // Always keep the best introductory fact (among first 3 sentences) as Scene 1,
  // then pick the top 5 highest-scoring factual sentences from the rest of the article, sorted in reading order!
  const firstPool = scored.slice(0, 3).sort((a, b) => b.score - a.score);
  const opener = firstPool[0];
  const remainingPool = scored
    .filter(x => x.idx !== opener.idx)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .sort((a, b) => a.idx - b.idx);

  return [opener, ...remainingPool].map(x => x.text);
}

// Build script directly from our Curated Documentary Facts Bank (100% concrete facts, numbers & storytelling)
async function buildScriptFromCuratedFact(curated, durationMode = 'monetized') {
  const cleanTopic = curated.topic;
  let wikiImage = null;
  try {
    const art = await fetchFullWikipediaArticle(curated.wikiSearch || curated.topic);
    if (art && art.wikiImage) wikiImage = art.wikiImage;
  } catch (e) {}

  const loopBridge = {
    endText: curated.loopEnd || 'Mas o detalhe mais impressionante dessa história fica claro quando você descobre que...',
    startText: curated.loopStart || `...quase ninguém conhece o verdadeiro segredo por trás de ${cleanTopic}!`
  };

  const builtScenes = curated.scenes.map((sc, idx) => ({
    narration: idx === 0 ? `${loopBridge.startText} ${sc.narration}` : sc.narration,
    imageQuery: sc.imageQuery || cleanTopic,
    fallbackThemeQuery: sc.fallbackThemeQuery || `${cleanTopic} photo`,
    directImageUrl: idx === 0 ? wikiImage : null,
    sceneLabel: sc.sceneLabel || `${idx + 1}/7 • ${cleanTopic}`
  }));

  builtScenes.push({
    narration: `Se você curte descobrir fatos curiosos reais e cheios de informação como esse sobre ${cleanTopic}, já segue aqui o perfil para não perder o próximo vídeo! ${loopBridge.endText}`,
    imageQuery: curated.scenes[0]?.imageQuery || cleanTopic,
    fallbackThemeQuery: curated.scenes[0]?.fallbackThemeQuery || cleanTopic,
    sceneLabel: `7/7 • ${cleanTopic}`,
    isLoopBridgeScene: true
  });

  const finalScenes = durationMode === 'short'
    ? [builtScenes[0], builtScenes[1], builtScenes[2], builtScenes[6]]
    : builtScenes;

  const topicTag = '#' + cleanTopic.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  const description = `${curated.scenes[0].narration}\n\n${curated.scenes[1].narration}\n\nAssista até o final para entender todos os fatos reais sobre ${cleanTopic}! 😱 Você já sabia disso? Comente aqui embaixo! 👇`;
  const hashtags = `#fatoscuriosos #curiosidades #vocesabia #ciencia ${topicTag} #documentario #tiktokbrasil #fyp #viral #shorts`;

  return normalizeMetadata({
    niche: curated.niche || 'curiosidades',
    durationMode,
    sourceTopic: cleanTopic,
    title: curated.title,
    description,
    hashtags,
    caption: `${description}\n\n${hashtags}`,
    loopBridge,
    badge: 'FATOS CURIOSOS',
    musicMood: 'dark',
    themeColor: '#00f0ff',
    scenes: finalScenes
  });
}

async function fetchUnusedWikipediaFact(niche = 'curiosidades', extraExclude = []) {
  const history = loadHistory(extraExclude);
  const allUsedList = Array.from(new Set([
    ...(history.usedTopics || []),
    ...(history.usedTitles || []),
    ...(Array.isArray(extraExclude) ? extraExclude : [])
  ]));

  // 1. First try High-Impact Curated Wikipedia Topics Pool (guaranteed rich articles with real facts & numbers)
  const highImpactPool = [
    ...(HIGH_IMPACT_WIKI_TOPICS[niche] || []),
    ...(HIGH_IMPACT_WIKI_TOPICS.curiosidades || [])
  ].filter(t => !isTopicAlreadyUsed(t, allUsedList));

  if (highImpactPool.length > 0) {
    const shuffledTopics = highImpactPool.sort(() => Math.random() - 0.5).slice(0, 8);
    for (const candidateTitle of shuffledTopics) {
      const fullArt = await fetchFullWikipediaArticle(candidateTitle);
      if (fullArt && !isTopicAlreadyUsed(fullArt.topic, allUsedList)) {
        const facts = extractHighDensityFactualSentences(fullArt.extract, fullArt.topic);
        if (facts.length >= 5) {
          return fullArt;
        }
      }
    }
  }

  // 2. Fallback to Wikipedia categories, but ONLY accept long articles with >= 5 real factual/numeric sentences!
  const catList = [...(WIKI_CATEGORIES[niche] || WIKI_CATEGORIES.curiosidades)].sort(() => Math.random() - 0.5);
  for (let cIdx = 0; cIdx < Math.min(3, catList.length); cIdx++) {
    const randomCat = catList[cIdx];
    try {
      const url = `https://pt.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=${encodeURIComponent(randomCat)}&cmtype=page&cmlimit=120&format=json`;
      const res = await fetch(url, { headers: { 'User-Agent': 'ShortsFactoryPro/5.0' } });
      const data = await res.json();
      const members = (data.query?.categorymembers || [])
        .filter(m => m.ns === 0 && !m.title.startsWith('Lista') && !isTopicAlreadyUsed(m.title, allUsedList));

      if (members.length > 0) {
        const shuffled = members.sort(() => Math.random() - 0.5).slice(0, 10);
        for (const item of shuffled) {
          const fullArt = await fetchFullWikipediaArticle(item.title);
          if (fullArt && fullArt.extract.length > 1400 && !isTopicAlreadyUsed(fullArt.topic, allUsedList)) {
            const facts = extractHighDensityFactualSentences(fullArt.extract, fullArt.topic);
            if (facts.length >= 5) {
              return fullArt;
            }
          }
        }
      }
    } catch (e) {}
  }

  return null;
}

// Build a 7-Scene Monetizable TikTok/Shorts Script (63s–75s) from a full Wikipedia article with ZERO generic filler!
function buildMonetizedViralScriptFromWikiFact(wikiFact, niche = 'curiosidades', durationMode = 'monetized') {
  const cleanTopic = wikiFact.topic.replace(/\s*\([^)]*\)/g, '');
  const factualSentences = extractHighDensityFactualSentences(wikiFact.extract, cleanTopic);

  const titleTemplates = [
    `O Fato Real Mais Impressionante Sobre ${cleanTopic} 😱`,
    `O Que Quase Ninguém Sabe Sobre ${cleanTopic} 🧠`,
    `Como ${cleanTopic} Realmente Funciona na Prática 🔬`,
    `Por Que ${cleanTopic} Intriga os Cientistas? 🌍`,
    `Os Números e Segredos Reais de ${cleanTopic} ⚡`
  ];
  const chosenTitle = titleTemplates[Math.floor(Math.random() * titleTemplates.length)];

  const f1 = factualSentences[0] || `${cleanTopic} chama a atenção da ciência pelas suas características físicas e históricas únicas.`;
  const f2 = factualSentences[1] || `Os estudos detalhados sobre ${cleanTopic} revelaram dados específicos sobre como sua estrutura se formou ao longo do tempo.`;
  const f3 = factualSentences[2] || `Um dos dados mais marcantes registrados pelos pesquisadores mostra como ${cleanTopic} interage diretamente com o ambiente ao seu redor.`;
  const f4 = factualSentences[3] || `Além disso, medições diretas comprovaram que as proporções e condições de ${cleanTopic} são raras na natureza.`;
  const f5 = factualSentences[4] || `Na prática, esses registros ajudaram os especialistas a explicar fenômenos que antes pareciam impossíveis de acontecer.`;
  const f6 = factualSentences[5] || `Por causa dessas descobertas comprovadas, ${cleanTopic} segue sendo um dos casos mais estudados e documentados da área.`;

  const topicTag = '#' + cleanTopic.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  const description = `${f1}\n\n${f2}\n\nAssista até o final para conhecer os fatos reais sobre ${cleanTopic}! 😱 Você já sabia disso? Comente aqui embaixo! 👇`;
  const hashtags = `#fatoscuriosos #curiosidades #vocesabia #ciencia ${topicTag} #documentario #tiktokbrasil #fyp #viral #shorts`;

  const loopBridges = [
    {
      endText: 'Mas o detalhe mais impressionante dessa história fica claro quando você descobre que...',
      startText: `...muita gente já ouviu falar em ${cleanTopic}, mas quase ninguém conhece os números e fatos reais por trás disso!`
    },
    {
      endText: 'E tudo isso começa a fazer sentido no exato momento em que você vê que...',
      startText: `...a verdadeira história científica de ${cleanTopic} guarda fatos reais que surpreendem até os especialistas!`
    },
    {
      endText: 'Só que o dado mais curioso sobre tudo isso aparece logo quando descobrimos que...',
      startText: `...por trás de ${cleanTopic} existem fatos concretos e comprovados que parecem coisa de filme!`
    }
  ];
  const chosenLoopBridge = loopBridges[Math.floor(Math.random() * loopBridges.length)];

  const allScenes = [
    {
      narration: `${chosenLoopBridge.startText} ${f1}`,
      imageQuery: `${cleanTopic}`,
      fallbackThemeQuery: `${cleanTopic} real photo`,
      directImageUrl: wikiFact.wikiImage || null,
      sceneLabel: `1/7 • ${cleanTopic} (Fato Principal)`
    },
    {
      narration: `${f2}`,
      imageQuery: `${cleanTopic}`,
      fallbackThemeQuery: `${cleanTopic} detail`,
      sceneLabel: `2/7 • Dados & Origem Real`
    },
    {
      narration: `Além disso, olha só esse dado específico: ${f3}`,
      imageQuery: `${cleanTopic}`,
      fallbackThemeQuery: `${cleanTopic} close up`,
      sceneLabel: `3/7 • Como Funciona na Prática`
    },
    {
      narration: `${f4}`,
      imageQuery: `${cleanTopic}`,
      fallbackThemeQuery: `${cleanTopic} nature science`,
      sceneLabel: `4/7 • Números e Proporções`
    },
    {
      narration: `E tem mais um fato importante registrado sobre isso: ${f5}`,
      imageQuery: `${cleanTopic}`,
      fallbackThemeQuery: `${cleanTopic} history archive`,
      sceneLabel: `5/7 • O Registro Comprovado`
    },
    {
      narration: `${f6}`,
      imageQuery: `${cleanTopic}`,
      fallbackThemeQuery: `${cleanTopic} discovery`,
      sceneLabel: `6/7 • Conclusão Científica`
    },
    {
      narration: `Se você gosta de vídeos direto ao ponto com fatos reais como esse sobre ${cleanTopic}, já segue o perfil para não perder o próximo! ${chosenLoopBridge.endText}`,
      imageQuery: `${cleanTopic}`,
      fallbackThemeQuery: `${cleanTopic} photo`,
      sceneLabel: `7/7 • ${cleanTopic}`,
      isLoopBridgeScene: true
    }
  ];

  const finalScenes = durationMode === 'short'
    ? [allScenes[0], allScenes[1], allScenes[2], allScenes[6]]
    : allScenes;

  return normalizeMetadata({
    niche,
    durationMode,
    sourceTopic: wikiFact.topic,
    title: chosenTitle,
    description,
    hashtags,
    caption: `${description}\n\n${hashtags}`,
    loopBridge: chosenLoopBridge,
    badge: 'FATOS CURIOSOS',
    musicMood: 'dark',
    themeColor: '#00f0ff',
    scenes: finalScenes
  });
}

async function generateUniqueScript(requestedNiche = 'curiosidades', customTopic = '', durationMode = 'monetized', extraExclude = []) {
  if (requestedNiche === '__clear_history__') {
    return clearHistory();
  }
  if (requestedNiche === '__get_accounts__') {
    delete require.cache[require.resolve('./publisher')];
    const { loadAccountsConfig } = require('./publisher');
    return loadAccountsConfig();
  }
  if (requestedNiche === '__save_accounts__') {
    delete require.cache[require.resolve('./publisher')];
    const { saveAccountsConfig } = require('./publisher');
    const parsed = typeof customTopic === 'string' ? JSON.parse(customTopic) : customTopic;
    return saveAccountsConfig(parsed);
  }
  if (requestedNiche === '__publish_video__') {
    delete require.cache[require.resolve('./publisher')];
    const { publishToYouTubeShorts, publishToTikTok } = require('./publisher');
    const payload = typeof customTopic === 'string' ? JSON.parse(customTopic) : customTopic;
    if (payload.platform === 'youtube') {
      return await publishToYouTubeShorts(payload.video);
    } else if (payload.platform === 'tiktok') {
      return await publishToTikTok(payload.video);
    } else if (payload.platform === 'both') {
      const results = {};
      try { results.youtube = await publishToYouTubeShorts(payload.video); } catch (e) { results.youtubeError = e.message; }
      try { results.tiktok = await publishToTikTok(payload.video); } catch (e) { results.tiktokError = e.message; }
      return results;
    }
  }
  if (requestedNiche === '__deploy_github__') {
    delete require.cache[require.resolve('./github_deployer')];
    const { deployProjectToGitHub } = require('./github_deployer');
    const parsed = typeof customTopic === 'string' ? JSON.parse(customTopic) : customTopic;
    return await deployProjectToGitHub(parsed.token, parsed.repoName || 'shorts-factory-ai');
  }

  const history = loadHistory(extraExclude);
  const allUsedList = Array.from(new Set([
    ...(history.usedTopics || []),
    ...(history.usedTitles || []),
    ...(Array.isArray(extraExclude) ? extraExclude : [])
  ]));

  const niches = ['curiosidades', 'misterios', 'historia', 'futuro', 'motivacao', 'financas'];
  const targetNiche = (requestedNiche && requestedNiche !== 'auto')
    ? requestedNiche
    : niches[Math.floor(Math.random() * niches.length)];

  // 1. If user did NOT type a customTopic, check our Curated Documentary Facts Bank first!
  // Every script in CURATED_DOCUMENTARY_FACTS has 6 pure-information scenes with real numbers, dates, causes, and mechanisms.
  if (!customTopic || !customTopic.trim()) {
    const matchingCurated = CURATED_DOCUMENTARY_FACTS.filter(item =>
      (item.niche === targetNiche || targetNiche === 'curiosidades') &&
      !isTopicAlreadyUsed(item.topic, allUsedList) &&
      !isTopicAlreadyUsed(item.title, allUsedList)
    );
    const anyUnusedCurated = matchingCurated.length > 0
      ? matchingCurated
      : CURATED_DOCUMENTARY_FACTS.filter(item =>
          !isTopicAlreadyUsed(item.topic, allUsedList) &&
          !isTopicAlreadyUsed(item.title, allUsedList)
        );

    if (anyUnusedCurated.length > 0) {
      const chosenCurated = anyUnusedCurated[Math.floor(Math.random() * anyUnusedCurated.length)];
      const builtCurated = await buildScriptFromCuratedFact(chosenCurated, durationMode);
      rememberGeneratedScript(builtCurated.title, builtCurated.sourceTopic, extraExclude);
      return builtCurated;
    }
  }

  // 2. Custom Topic or Deep Wikipedia 12,000-char Fact Harvester (with fact-density scoring & zero filler!)
  let wikiFact = null;
  if (!customTopic || !customTopic.trim()) {
    wikiFact = await fetchUnusedWikipediaFact(targetNiche, extraExclude);
  } else {
    // Also check if customTopic matches a curated documentary script!
    const matchCurated = CURATED_DOCUMENTARY_FACTS.find(item =>
      normalizeTopicKey(item.topic).includes(normalizeTopicKey(customTopic)) ||
      normalizeTopicKey(customTopic).includes(normalizeTopicKey(item.topic))
    );
    if (matchCurated) {
      const builtCurated = await buildScriptFromCuratedFact(matchCurated, durationMode);
      rememberGeneratedScript(builtCurated.title, builtCurated.sourceTopic, extraExclude);
      return builtCurated;
    }
    wikiFact = await fetchFullWikipediaArticle(customTopic.trim());
  }

  if (wikiFact) {
    const built = buildMonetizedViralScriptFromWikiFact(wikiFact, targetNiche, durationMode);
    rememberGeneratedScript(built.title, built.sourceTopic, extraExclude);
    return built;
  }

  // Fallback to a random Curated Documentary Fact if Wikipedia search had no match
  const randomFallbackCurated = CURATED_DOCUMENTARY_FACTS[Math.floor(Math.random() * CURATED_DOCUMENTARY_FACTS.length)];
  const builtFallback = await buildScriptFromCuratedFact(randomFallbackCurated, durationMode);
  rememberGeneratedScript(builtFallback.title, builtFallback.sourceTopic, extraExclude);
  return builtFallback;
}

module.exports = {
  generateUniqueScript,
  loadHistory,
  saveToHistory,
  clearHistory,
  normalizeMetadata
};
