const fs = require('fs');
const path = require('path');
const os = require('os');
const { loadHistory } = require('./generator');

const BUNDLED_DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), 'shorts-factory-data')
  : BUNDLED_DATA_DIR;
const YT_CONFIG_FILE = path.join(DATA_DIR, 'youtube_channel.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

const STOPWORDS = new Set([
  'para', 'com', 'mais', 'como', 'onde', 'quando', 'sobre', 'esse', 'essa', 'este', 'esta',
  'todo', 'toda', 'todos', 'todas', 'voce', 'sabia', 'qual', 'porque', 'pelo', 'pela',
  'pelos', 'pelas', 'numa', 'num', 'dele', 'dela', 'deles', 'delas', 'isso', 'aquilo',
  'shorts', 'short', 'video', 'fato', 'fatos', 'curiosidade', 'curiosidades', 'segredo', 'misterio',
  'descubra', 'veja', 'olha', 'revelado', 'inacreditavel'
]);

function cleanYouTubeTitle(rawText) {
  if (!rawText) return '';
  return String(rawText)
    .replace(/,\s*[\d.,\s]+(?:mil|milhões|visualizações|views|reproduzir Short|play Short).*$/i, '')
    .replace(/#[\wÀ-ÿ]+/g, '')
    .replace(/[#@]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTopicKeywords(cleanTitle) {
  if (!cleanTitle) return [];
  // Strip common hook openers
  const simplified = cleanTitle
    .replace(/^(você sabia que|voce sabia que|por que|porque|qual é|qual e|como seria|o que aconteceria se|o segredo de|o mistério de|o misterio de|descubra|veja|isso é|esse é|essa é)\s+/i, '')
    .replace(/\s*\?.*$/, '')
    .trim();

  const words = simplified
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 4 && !STOPWORDS.has(w));

  const candidates = [];
  if (simplified.length >= 5) {
    candidates.push(simplified);
  }
  if (words.length >= 2) {
    candidates.push(words.slice(0, 3).join(' '));
  }
  if (words.length >= 1) {
    // Add individual significant long keywords (e.g. chernobyl, titanic, pompeia)
    for (const w of words) {
      if (w.length >= 6 && !candidates.includes(w)) {
        candidates.push(w);
      }
    }
  }
  return candidates;
}

function normalizeChannelInput(input) {
  let str = String(input || '').trim();
  if (!str) return null;

  if (str.startsWith('http://') || str.startsWith('https://')) {
    str = str.replace(/\/+$/, '');
    if (!str.endsWith('/shorts')) {
      str += '/shorts';
    }
    return str;
  }

  // Handle @handle or plain handle
  const handle = str.startsWith('@') ? str : `@${str}`;
  return `https://www.youtube.com/${handle}/shorts`;
}

function loadStoredYouTubeConfig() {
  try {
    if (fs.existsSync(YT_CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(YT_CONFIG_FILE, 'utf8'));
    }
    const bundled = path.join(BUNDLED_DATA_DIR, 'youtube_channel.json');
    if (fs.existsSync(bundled)) {
      return JSON.parse(fs.readFileSync(bundled, 'utf8'));
    }
  } catch (e) {}
  return null;
}

function saveYouTubeConfig(cfg) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(YT_CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
    if (DATA_DIR !== BUNDLED_DATA_DIR) {
      const bundled = path.join(BUNDLED_DATA_DIR, 'youtube_channel.json');
      fs.writeFileSync(bundled, JSON.stringify(cfg, null, 2), 'utf8');
    }
  } catch (e) {}
}

async function fetchChannelShorts(channelInput, maxPages = 5) {
  const url = normalizeChannelInput(channelInput);
  if (!url) {
    throw new Error('Informe o @handle ou link do seu canal do YouTube (ex: @SeuCanal)');
  }

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
    }
  });

  if (!res.ok) {
    throw new Error(`Canal não encontrado ou indisponível no YouTube (HTTP ${res.status}). Verifique se o @handle está correto.`);
  }

  const html = await res.text();
  const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
  const clientVersionMatch = html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/);
  const apiKey = apiKeyMatch ? apiKeyMatch[1] : null;
  const clientVersion = clientVersionMatch ? clientVersionMatch[1] : '2.20261002.01.00';

  const m = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/s) || html.match(/ytInitialData\s*=\s*({.+?});/s);
  if (!m) {
    throw new Error('Não foi possível ler os dados do YouTube. Tente novamente em alguns instantes.');
  }

  const d = JSON.parse(m[1]);
  const header = d.header?.pageHeaderRenderer?.pageTitle?.text ||
                 d.header?.c4TabbedHeaderRenderer?.title ||
                 d.metadata?.channelMetadataRenderer?.title ||
                 'Canal YouTube';

  const tabs = d.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
  const shortsTab = tabs.find(t => t.tabRenderer?.selected || t.tabRenderer?.title === 'Shorts');
  const items = shortsTab?.tabRenderer?.content?.richGridRenderer?.contents || [];

  const foundShorts = [];
  const seenIds = new Set();
  let continuationToken = null;

  for (const item of items) {
    if (item.continuationItemRenderer) {
      continuationToken = item.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;
      continue;
    }
    const lockup = item.richItemRenderer?.content?.shortsLockupViewModel;
    if (lockup) {
      const entityId = lockup.entityId || '';
      const videoId = entityId.replace(/^shorts-shelf-item-/, '');
      const rawTitle = lockup.overlayMetadata?.primaryText?.content || lockup.accessibilityText || '';
      const cleanTitle = cleanYouTubeTitle(rawTitle);
      if (videoId && !seenIds.has(videoId) && cleanTitle) {
        seenIds.add(videoId);
        foundShorts.push({
          videoId,
          rawTitle,
          cleanTitle,
          topics: extractTopicKeywords(cleanTitle)
        });
      }
    }
  }

  // Paginate with Innertube if continuationToken exists
  let pages = 1;
  while (continuationToken && apiKey && pages < maxPages && foundShorts.length < 300) {
    pages++;
    try {
      const postRes = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: 'WEB',
              clientVersion: clientVersion
            }
          },
          continuation: continuationToken
        })
      });
      if (!postRes.ok) break;
      const postData = await postRes.json();
      continuationToken = null;
      const actions = postData.onResponseReceivedActions || [];
      for (const act of actions) {
        const contItems = act.appendContinuationItemsAction?.continuationItems || [];
        for (const cItem of contItems) {
          if (cItem.continuationItemRenderer) {
            continuationToken = cItem.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;
            continue;
          }
          const lockup = cItem.richItemRenderer?.content?.shortsLockupViewModel;
          if (lockup) {
            const entityId = lockup.entityId || '';
            const videoId = entityId.replace(/^shorts-shelf-item-/, '');
            const rawTitle = lockup.overlayMetadata?.primaryText?.content || lockup.accessibilityText || '';
            const cleanTitle = cleanYouTubeTitle(rawTitle);
            if (videoId && !seenIds.has(videoId) && cleanTitle) {
              seenIds.add(videoId);
              foundShorts.push({
                videoId,
                rawTitle,
                cleanTitle,
                topics: extractTopicKeywords(cleanTitle)
              });
            }
          }
        }
      }
    } catch (e) {
      break;
    }
  }

  return {
    channelTitle: header,
    channelUrl: url,
    totalFound: foundShorts.length,
    shorts: foundShorts
  };
}

async function syncYouTubeChannelShorts(channelInput, maxPages = 5) {
  const result = await fetchChannelShorts(channelInput, maxPages);
  const history = loadHistory();

  let newTitlesAdded = 0;
  let newTopicsAdded = 0;

  for (const s of result.shorts) {
    if (s.cleanTitle && !history.usedTitles.includes(s.cleanTitle)) {
      history.usedTitles.push(s.cleanTitle);
      newTitlesAdded++;
    }
    if (s.rawTitle && s.rawTitle !== s.cleanTitle && !history.usedTitles.includes(s.rawTitle)) {
      history.usedTitles.push(s.rawTitle);
    }
    for (const t of (s.topics || [])) {
      if (t && !history.usedTopics.includes(t)) {
        history.usedTopics.push(t);
        newTopicsAdded++;
      }
    }
  }

  global.__SHORTS_FACTORY_HISTORY__ = history;
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
    if (DATA_DIR !== BUNDLED_DATA_DIR) {
      const bundledHist = path.join(BUNDLED_DATA_DIR, 'history.json');
      fs.writeFileSync(bundledHist, JSON.stringify(history, null, 2), 'utf8');
    }
  } catch (e) {}

  // Save channel config
  const channelCfg = {
    channelInput: String(channelInput).trim(),
    channelTitle: result.channelTitle,
    channelUrl: result.channelUrl,
    lastSyncedAt: new Date().toISOString(),
    syncedShortsCount: result.totalFound,
    recentSample: result.shorts.slice(0, 10).map(s => s.cleanTitle)
  };
  saveYouTubeConfig(channelCfg);

  // Auto-sync updated history to Telegram Cloud Storage
  try {
    const { syncHistoryDatabaseToTelegram } = require('./telegram_storage');
    await syncHistoryDatabaseToTelegram();
  } catch (e) {}

  return {
    ok: true,
    channelTitle: result.channelTitle,
    channelUrl: result.channelUrl,
    totalFound: result.totalFound,
    newTitlesAdded,
    newTopicsAdded,
    totalProtectedTitles: history.usedTitles.length,
    totalProtectedTopics: history.usedTopics.length,
    recentSample: result.shorts.slice(0, 8).map(s => s.cleanTitle)
  };
}

module.exports = {
  fetchChannelShorts,
  syncYouTubeChannelShorts,
  loadStoredYouTubeConfig,
  cleanYouTubeTitle,
  extractTopicKeywords
};
