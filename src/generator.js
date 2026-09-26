const fs = require('fs');
const path = require('path');
const os = require('os');

const DATA_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), 'shorts-factory-data')
  : path.join(__dirname, '..', 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

if (!fs.existsSync(DATA_DIR)) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
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

function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const data = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
      if (Array.isArray(data.videos)) {
        data.videos = data.videos.map(normalizeMetadata);
      }
      return data;
    }
  } catch (e) {}
  return { usedTitles: [], usedTopics: [], videos: [] };
}

function saveToHistory(videoMeta) {
  const history = loadHistory();
  if (!history.usedTitles) history.usedTitles = [];
  if (!history.usedTopics) history.usedTopics = [];

  const normalized = normalizeMetadata(videoMeta);

  if (!history.usedTitles.includes(normalized.title)) {
    history.usedTitles.push(normalized.title);
  }
  if (normalized.sourceTopic && !history.usedTopics.includes(normalized.sourceTopic)) {
    history.usedTopics.push(normalized.sourceTopic);
  }
  history.videos.unshift(normalized);
  history.videos = history.videos.slice(0, 50);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
}

function rememberGeneratedScript(title, sourceTopic) {
  const history = loadHistory();
  if (!history.usedTitles) history.usedTitles = [];
  if (!history.usedTopics) history.usedTopics = [];
  if (title && !history.usedTitles.includes(title)) history.usedTitles.push(title);
  if (sourceTopic && !history.usedTopics.includes(sourceTopic)) history.usedTopics.push(sourceTopic);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
}

function clearHistory() {
  const empty = { usedTitles: [], usedTopics: [], videos: [] };
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(empty, null, 2), 'utf8');
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

// Fetch full multi-paragraph text + original image from Wikipedia PT-BR for 65s+ deep scripts
async function fetchFullWikipediaArticle(title) {
  try {
    const url = `https://pt.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages&explaintext=1&exchars=2600&piprop=original|thumbnail&pithumbsize=1080&titles=${encodeURIComponent(title)}&format=json`;
    const res = await fetch(url, { headers: { 'User-Agent': 'ShortsFactoryPro/4.0' } });
    if (res.ok) {
      const data = await res.json();
      const pages = Object.values(data.query?.pages || {});
      const p = pages[0];
      if (p && p.extract && p.extract.length > 280) {
        return {
          topic: p.title,
          extract: p.extract.replace(/==+[^=]+=+/g, ' ').replace(/\s+/g, ' ').trim(),
          wikiImage: p.original?.source || p.thumbnail?.source || null
        };
      }
    }
  } catch (e) {}
  return null;
}

async function fetchUnusedWikipediaFact(niche = 'curiosidades') {
  const history = loadHistory();
  const usedTopics = new Set([...(history.usedTopics || []), ...(history.usedTitles || [])]);

  const catList = WIKI_CATEGORIES[niche] || WIKI_CATEGORIES.curiosidades;
  const randomCat = catList[Math.floor(Math.random() * catList.length)];
  const alphabet = 'ABCDEFGHIJLMNOPQRSTUVZ';
  const randomLetter = alphabet[Math.floor(Math.random() * alphabet.length)];

  try {
    const url = `https://pt.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=${encodeURIComponent(randomCat)}&cmtype=page&cmstartsortkeyprefix=${randomLetter}&cmlimit=50&format=json`;
    const res = await fetch(url, { headers: { 'User-Agent': 'ShortsFactoryPro/4.0' } });
    const data = await res.json();
    const members = (data.query?.categorymembers || [])
      .filter(m => m.ns === 0 && !m.title.startsWith('Lista') && !usedTopics.has(m.title));

    if (members.length > 0) {
      const shuffled = members.sort(() => Math.random() - 0.5).slice(0, 6);
      for (const item of shuffled) {
        const fullArt = await fetchFullWikipediaArticle(item.title);
        if (fullArt) return fullArt;
      }
    }
  } catch (e) {
    console.log('Wikipedia category discovery notice:', e.message);
  }

  try {
    for (let attempt = 0; attempt < 4; attempt++) {
      const randRes = await fetch('https://pt.wikipedia.org/api/rest_v1/page/random/summary', {
        headers: { 'User-Agent': 'ShortsFactoryPro/4.0' }
      });
      if (randRes.ok) {
        const randData = await randRes.json();
        if (randData.title && !usedTopics.has(randData.title)) {
          const fullArt = await fetchFullWikipediaArticle(randData.title);
          if (fullArt) return fullArt;
        }
      }
    }
  } catch (e) {}

  return null;
}

// Build a 7-Scene Monetizable TikTok/Shorts Script (63s–75s, ~165-185 spoken words) WITH INFINITE LOOP!
function buildMonetizedViralScriptFromWikiFact(wikiFact, niche = 'curiosidades', durationMode = 'monetized') {
  const cleanTopic = wikiFact.topic.replace(/\s*\([^)]*\)/g, '');
  const rawSentences = wikiFact.extract
    .replace(/\([^)]*\)/g, '')
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 25 && s.length < 220);

  const titleTemplates = [
    `A Verdade Impressionante sobre ${cleanTopic} 😱`,
    `Quase Ninguém Conhece Esse Segredo de ${cleanTopic} 🧠`,
    `O Que a Ciência Descobriu Sobre ${cleanTopic} 🔬`,
    `Por Que ${cleanTopic} Intriga o Mundo Inteiro? 🌍`,
    `O Fato Mais Curioso da História Sobre ${cleanTopic} ⚡`,
    `Como ${cleanTopic} Desafia Tudo o Que Sabemos 🤯`
  ];
  const chosenTitle = titleTemplates[Math.floor(Math.random() * titleTemplates.length)];

  const s1 = rawSentences[0] || `${cleanTopic} é considerado um dos fenômenos mais extraordinários já documentados pela ciência moderna.`;
  const s2 = rawSentences[1] || `Durante décadas, pesquisadores ao redor do mundo tentaram decifrar como esse processo acontece na prática.`;
  const s3 = rawSentences[2] || `O que pouca gente imagina é que suas propriedades únicas desafiam completamente a nossa intuição.`;
  const s4 = rawSentences[3] || `Quando analisado em detalhes, esse fenômeno revela padrões que só existem em condições muito específicas da natureza.`;
  const s5 = rawSentences[4] || `Além disso, registros históricos mostram que civilizações e cientistas já observavam esses efeitos com grande espanto.`;
  const s6 = rawSentences[5] || `Hoje, tecnologias avançadas permitiram medir cada detalhe dessa estrutura com precisão milimétrica.`;

  const topicTag = '#' + cleanTopic.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  const description = `${s1}\n\nAssista até o final para descobrir todos os segredos sobre ${cleanTopic}! 😱 Você já conhecia esse fato curioso? Deixe sua opinião nos comentários! 👇`;
  const hashtags = `#fatoscuriosos #curiosidades #vocesabia #ciencia ${topicTag} #misterios #documentario #tiktokbrasil #fyp #viral #shorts`;

  // INFINITE LOOP ARCHITECTURE (8 Varied Grammatical Bridges: Final Scene -> Scene 1 at 0:00)
  const loopBridges = [
    {
      endText: 'Mas o motivo mais chocante de todos é que...',
      startText: `...quase ninguém no mundo percebe o verdadeiro segredo oculto por trás de ${cleanTopic}!`
    },
    {
      endText: 'Só que o detalhe mais assustador dessa história aparece quando você descobre que...',
      startText: `...tudo o que aprendemos sobre ${cleanTopic} esconde um fenômeno que desafia a ciência!`
    },
    {
      endText: 'Mas a pergunta que deixa até os cientistas sem dormir à noite é por que...',
      startText: `...${cleanTopic} continua sendo um dos maiores enigmas já registrados no nosso planeta!`
    },
    {
      endText: 'E o mais impressionante de tudo isso fica claro no exato instante em que vemos que...',
      startText: `...a verdadeira origem de ${cleanTopic} intriga pesquisadores do mundo inteiro há décadas!`
    },
    {
      endText: 'Porém, toda essa descoberta ganha um sentido completamente novo quando você percebe que...',
      startText: `...por trás de ${cleanTopic} existe um detalhe fascinante que poucos olhos já viram!`
    },
    {
      endText: 'Mas o que torna esse caso realmente único no universo é o fato de que...',
      startText: `...nenhum outro fenômeno conhecido se comporta exatamente como ${cleanTopic}!`
    },
    {
      endText: 'E se você reparar bem no início de tudo, vai notar imediatamente que...',
      startText: `...${cleanTopic} guarda uma revelação extraordinária logo à primeira vista!`
    },
    {
      endText: 'Mas a peça final desse quebra-cabeça só se encaixa quando entendemos que...',
      startText: `...cada detalhe sobre ${cleanTopic} muda completamente a nossa forma de ver o mundo!`
    }
  ];
  const chosenLoopBridge = loopBridges[Math.floor(Math.random() * loopBridges.length)];

  const allScenes = [
    {
      narration: `${chosenLoopBridge.startText} Olha só que impressionante: ${s1}`,
      imageQuery: `${cleanTopic}`,
      fallbackThemeQuery: `nature phenomenon discovery`,
      directImageUrl: wikiFact.wikiImage || null,
      sceneLabel: `1/7 • ${cleanTopic} (Arquivo Real)`
    },
    {
      narration: `E sabe o que deixa essa história ainda mais curiosa? Quando os pesquisadores analisam cada detalhe de perto, ${s2}`,
      imageQuery: `${cleanTopic}`,
      fallbackThemeQuery: `science research laboratory`,
      sceneLabel: `2/7 • A Descoberta Científica`
    },
    {
      narration: `Na verdade, existe um ponto específico que chamou a atenção de cientistas no mundo inteiro: ${s3}`,
      imageQuery: `${cleanTopic}`,
      fallbackThemeQuery: `microscope macro detail`,
      sceneLabel: `3/7 • O Detalhe Inexplicável`
    },
    {
      narration: `E não para por aí, viu? Repara só no que acontece quando esse fenômeno atinge suas condições mais extremas: ${s4}`,
      imageQuery: `${cleanTopic}`,
      fallbackThemeQuery: `earth geology landscape`,
      sceneLabel: `4/7 • Condições Extremas`
    },
    {
      narration: `Pra você ter uma ideia real de como tudo isso impressiona na prática ao longo do tempo, ${s5}`,
      imageQuery: `${cleanTopic}`,
      fallbackThemeQuery: `historical museum archive`,
      sceneLabel: `5/7 • Registros na História`
    },
    {
      narration: `Hoje em dia, graças aos equipamentos modernos de alta precisão, finalmente ficou comprovado que ${s6}`,
      imageQuery: `${cleanTopic}`,
      fallbackThemeQuery: `astronomy telescope technology`,
      sceneLabel: `6/7 • Revelação Moderna`
    },
    {
      narration: `Se você adora descobrir fatos curiosos reais como esse sobre ${cleanTopic}, já segue aqui o perfil para não perder o próximo vídeo! ${chosenLoopBridge.endText}`,
      imageQuery: `${cleanTopic}`,
      fallbackThemeQuery: `planet earth space cosmos`,
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

async function generateUniqueScript(requestedNiche = 'curiosidades', customTopic = '', durationMode = 'monetized') {
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
  const history = loadHistory();
  const usedTitles = Array.from(new Set(history.usedTitles || [])).slice(-25);

  const niches = ['curiosidades', 'misterios', 'historia', 'futuro', 'motivacao', 'financas'];
  const targetNiche = (requestedNiche && requestedNiche !== 'auto')
    ? requestedNiche
    : niches[Math.floor(Math.random() * niches.length)];

  let wikiFact = null;
  if (!customTopic || !customTopic.trim()) {
    wikiFact = await fetchUnusedWikipediaFact(targetNiche);
  } else {
    wikiFact = await fetchFullWikipediaArticle(customTopic.trim());
  }

  // Build 7-scene 62s+ Monetized Script with Infinite Loop directly from verified Wikipedia article + AI
  if (wikiFact) {
    const built = buildMonetizedViralScriptFromWikiFact(wikiFact, targetNiche, durationMode);
    rememberGeneratedScript(built.title, built.sourceTopic);
    return built;
  }

  const fallbackTopic = customTopic || `Fenômeno Científico #${Math.floor(Math.random() * 9000 + 1000)}`;
  const emergencyScript = buildMonetizedViralScriptFromWikiFact({
    topic: fallbackTopic,
    extract: `${fallbackTopic} é um fenômeno extraordinário estudado por cientistas ao redor do globo. Suas propriedades desafiam o senso comum e revelam como a natureza esconde segredos fascinantes. Pesquisas recentes mostraram detalhes inéditos sobre sua estrutura. Quando observado sob condições controladas, apresenta reações únicas na física moderna. Civilizações antigas já tentavam explicar esse mistério olhando para a natureza. Hoje sabemos que esse processo é fundamental para entender a evolução do planeta Terra.`
  }, targetNiche, durationMode);
  rememberGeneratedScript(emergencyScript.title, fallbackTopic);
  return emergencyScript;
}

module.exports = {
  generateUniqueScript,
  loadHistory,
  saveToHistory,
  clearHistory,
  normalizeMetadata
};
