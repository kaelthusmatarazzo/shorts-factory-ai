const fs = require('fs');
const path = require('path');
const os = require('os');

const ACCOUNTS_FILE = process.env.VERCEL
  ? path.join(os.tmpdir(), 'shorts-factory-data', 'accounts.json')
  : path.join(__dirname, '..', 'data', 'accounts.json');

function loadAccountsConfig() {
  try {
    if (fs.existsSync(ACCOUNTS_FILE)) {
      return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
    }
  } catch (e) {}
  return {
    youtube: {
      clientId: '',
      clientSecret: '',
      refreshToken: '',
      accessToken: '',
      privacyStatus: 'public'
    },
    tiktok: {
      accessToken: '',
      openId: '',
      privacyLevel: 'PUBLIC_TO_EVERYONE'
    }
  };
}

function saveAccountsConfig(newConfig) {
  const dir = path.dirname(ACCOUNTS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const current = loadAccountsConfig();
  const merged = {
    youtube: { ...current.youtube, ...(newConfig.youtube || {}) },
    tiktok: { ...current.tiktok, ...(newConfig.tiktok || {}) }
  };
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(merged, null, 2), 'utf8');
  return merged;
}

// Refresh Google OAuth2 Access Token using Refresh Token
async function getYouTubeAccessToken(ytConfig) {
  if (ytConfig.clientId && ytConfig.clientSecret && ytConfig.refreshToken) {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: ytConfig.clientId.trim(),
        client_secret: ytConfig.clientSecret.trim(),
        refresh_token: ytConfig.refreshToken.trim(),
        grant_type: 'refresh_token'
      })
    });
    const data = await res.json();
    if (!res.ok || !data.access_token) {
      throw new Error(data.error_description || data.error || 'Falha ao renovar Access Token do YouTube');
    }
    return data.access_token;
  }
  if (ytConfig.accessToken && ytConfig.accessToken.trim()) {
    return ytConfig.accessToken.trim();
  }
  throw new Error('Configure suas credenciais do YouTube (Access Token ou Client ID + Refresh Token) no painel "🔗 Conectar Contas"');
}

// 1-Click Automatic Upload to YouTube Shorts via Official YouTube Data API v3 (Resumable Upload)
async function publishToYouTubeShorts(videoData) {
  const config = loadAccountsConfig();
  const yt = config.youtube || {};
  const accessToken = await getYouTubeAccessToken(yt);

  const videoPath = path.join(__dirname, '..', 'public', 'videos', videoData.filename);
  if (!fs.existsSync(videoPath)) {
    throw new Error(`Arquivo de vídeo não encontrado: ${videoData.filename}`);
  }

  const videoBuffer = fs.readFileSync(videoPath);
  const rawTitle = (videoData.title || 'Fato Curioso Impressionante').trim();
  const shortTitle = rawTitle.includes('#Shorts')
    ? rawTitle.slice(0, 100)
    : `${rawTitle.slice(0, 91)} #Shorts`;

  const descriptionText = `${videoData.description || ''}\n\n${videoData.hashtags || '#fatoscuriosos #curiosidades #shorts'}`.trim();
  const tagList = (videoData.hashtags || '')
    .match(/#[\wÀ-ÿ]+/g)
    ?.map(t => t.replace(/^#/, ''))
    .slice(0, 15) || ['fatoscuriosos', 'curiosidades', 'shorts', 'ciencia'];

  const metadata = {
    snippet: {
      title: shortTitle,
      description: descriptionText,
      tags: tagList,
      categoryId: '27', // Education
      defaultLanguage: 'pt-BR',
      defaultAudioLanguage: 'pt-BR'
    },
    status: {
      privacyStatus: yt.privacyStatus || 'public',
      selfDeclaredMadeForKids: false
    }
  };

  // Step 1: Initiate Resumable Upload Session
  const initRes = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Length': String(videoBuffer.length),
      'X-Upload-Content-Type': 'video/mp4'
    },
    body: JSON.stringify(metadata)
  });

  if (!initRes.ok) {
    const errText = await initRes.text();
    throw new Error(`Erro na API do YouTube (${initRes.status}): ${errText.slice(0, 220)}`);
  }

  const uploadUrl = initRes.headers.get('location');
  if (!uploadUrl) {
    throw new Error('YouTube API não retornou URL de upload resumível.');
  }

  // Step 2: Upload MP4 Binary Stream
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(videoBuffer.length)
    },
    body: videoBuffer
  });

  const uploaded = await uploadRes.json();
  if (!uploadRes.ok || !uploaded.id) {
    throw new Error(`Falha no envio do MP4 ao YouTube: ${JSON.stringify(uploaded).slice(0, 200)}`);
  }

  return {
    platform: 'youtube',
    videoId: uploaded.id,
    url: `https://youtube.com/shorts/${uploaded.id}`,
    title: shortTitle
  };
}

// 1-Click Automatic Upload to TikTok via Official TikTok Content Posting API v2 (Direct Post)
async function publishToTikTok(videoData) {
  const config = loadAccountsConfig();
  const tk = config.tiktok || {};
  const accessToken = (tk.accessToken || '').trim();

  if (!accessToken) {
    throw new Error('Configure seu Access Token da API do TikTok no painel "🔗 Conectar Contas"');
  }

  const videoPath = path.join(__dirname, '..', 'public', 'videos', videoData.filename);
  if (!fs.existsSync(videoPath)) {
    throw new Error(`Arquivo de vídeo não encontrado: ${videoData.filename}`);
  }

  const videoBuffer = fs.readFileSync(videoPath);
  // TikTok combines caption + hashtags in the post title field (up to 2200 chars)
  const fullCaption = `${videoData.title || ''}\n\n${videoData.description || ''}\n\n${videoData.hashtags || ''}`.trim().slice(0, 2100);

  // Step 1: Initialize Direct Video Post on TikTok API v2
  const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8'
    },
    body: JSON.stringify({
      post_info: {
        title: fullCaption,
        privacy_level: tk.privacyLevel || 'PUBLIC_TO_EVERYONE',
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false
      },
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: videoBuffer.length,
        chunk_size: videoBuffer.length,
        total_chunk_count: 1
      }
    })
  });

  const initData = await initRes.json();
  if (!initRes.ok || initData.error?.code !== 'ok') {
    const msg = initData.error?.message || JSON.stringify(initData).slice(0, 200);
    throw new Error(`Erro na API do TikTok: ${msg}`);
  }

  const uploadUrl = initData.data?.upload_url;
  const publishId = initData.data?.publish_id;
  if (!uploadUrl) {
    throw new Error('TikTok API não retornou upload_url.');
  }

  // Step 2: PUT binary MP4 chunk to TikTok Upload Server
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(videoBuffer.length),
      'Content-Range': `bytes 0-${videoBuffer.length - 1}/${videoBuffer.length}`
    },
    body: videoBuffer
  });

  if (!putRes.ok) {
    throw new Error(`Falha no envio do arquivo MP4 ao TikTok (HTTP ${putRes.status})`);
  }

  return {
    platform: 'tiktok',
    publishId,
    title: fullCaption.slice(0, 80) + '...'
  };
}

module.exports = {
  loadAccountsConfig,
  saveAccountsConfig,
  publishToYouTubeShorts,
  publishToTikTok
};
