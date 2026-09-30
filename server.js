const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { bin: cloudflaredBin } = require('cloudflared');
const { generateUniqueScript, loadHistory, saveToHistory } = require('./src/generator');
const { buildShortVideo } = require('./src/video_renderer');

const app = express();
const PORT = process.env.PORT || 3999;
const HOST = (process.env.RENDER || process.env.PORT) ? '0.0.0.0' : '127.0.0.1';

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Active background generation jobs
const jobs = new Map();
let currentTunnelUrl = null;

// Generate a brand-new unique script on demand (for instant preview / re-rolling)
app.post('/api/new-script', async (req, res) => {
  try {
    delete require.cache[require.resolve('./src/generator')];
    const { generateUniqueScript: genScript } = require('./src/generator');
    const { niche = 'curiosidades', customTopic = '', durationMode = 'monetized', excludeTopics = [] } = req.body || {};
    const scriptData = await genScript(niche, customTopic, durationMode, Array.isArray(excludeTopics) ? excludeTopics : []);
    res.json({ script: scriptData });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Erro ao gerar roteiro inédito' });
  }
});

// Start a 1-click Short generation job
app.post('/api/generate', async (req, res) => {
  const { niche = 'curiosidades', voice = 'duet-podcast', visualStyle = 'cinema', customTopic = '', durationMode = 'monetized', scriptOverride = null, excludeTopics = [] } = req.body || {};
  const safeExclude = Array.isArray(excludeTopics) ? excludeTopics : [];
  const jobId = `job_${Date.now()}`;

  jobs.set(jobId, {
    id: jobId,
    status: 'running',
    progress: 10,
    message: (voice === 'duet-podcast')
      ? 'Descobrindo fato curioso e criando roteiro Dueto Podcast (Thalita 👩 + Antônio 👨)...'
      : 'Descobrindo fato curioso inédito e criando roteiro Studio 4.0...'
  });

  // On Vercel Serverless, run synchronously inside the 60s request window so Lambda doesn't freeze before completion
  if (process.env.VERCEL) {
    try {
      const { generateUniqueScript: genScript, saveToHistory: saveHist } = require('./src/generator');
      const { buildShortVideo: buildVid } = require('./src/video_renderer');
      const scriptData = (scriptOverride && scriptOverride.title && Array.isArray(scriptOverride.scenes))
        ? scriptOverride
        : await genScript(niche, customTopic, durationMode, safeExclude);
      const videoResult = await buildVid(scriptData, { voice, visualStyle });

      // Automatic Cloudflare R2 Upload & Sync
      try {
        const { uploadVideoToR2, syncDatabaseToR2 } = require('./src/r2_storage');
        const videoFilePath = path.join(__dirname, 'public', videoResult.url.replace(/^\/+/, ''));
        if (fs.existsSync(videoFilePath)) {
          const r2Url = await uploadVideoToR2(videoFilePath, videoResult.filename);
          if (r2Url) {
            videoResult.r2Url = r2Url;
            videoResult.url = r2Url;
          }
        }
      } catch (e) {
        console.error('[R2 Vercel Upload Error]', e.message);
      }

      // Automatic Telegram Upload & Sync
      try {
        const { sendVideoToTelegram, syncHistoryDatabaseToTelegram } = require('./src/telegram_storage');
        const videoFilePath = (videoResult.localMp4Path && fs.existsSync(videoResult.localMp4Path))
          ? videoResult.localMp4Path
          : path.join(__dirname, 'public', (videoResult.filename ? `videos/${videoResult.filename}` : (videoResult.url || '').replace(/^\/+/, '')));
        const tgResult = await sendVideoToTelegram(videoResult, videoFilePath);
        if (tgResult && tgResult.messageId) {
          videoResult.telegram = tgResult;
        }
        await syncHistoryDatabaseToTelegram();
      } catch (tgErr) {
        console.error('[Telegram Vercel Error]', tgErr.message);
      }

      saveHist(videoResult, safeExclude);
      try {
        const { syncDatabaseToR2 } = require('./src/r2_storage');
        await syncDatabaseToR2();
      } catch (e) {}

      return res.json({ jobId, directResult: videoResult });
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Erro no Vercel Serverless' });
    }
  }

  res.json({ jobId });

  // Run pipeline asynchronously with fresh module code
  (async () => {
    try {
      delete require.cache[require.resolve('./src/generator')];
      delete require.cache[require.resolve('./src/video_renderer')];
      const { generateUniqueScript: genScript, saveToHistory: saveHist } = require('./src/generator');
      const { buildShortVideo: buildVid } = require('./src/video_renderer');

      const scriptData = (scriptOverride && scriptOverride.title && Array.isArray(scriptOverride.scenes))
        ? scriptOverride
        : await genScript(niche, customTopic, durationMode, safeExclude);
      jobs.set(jobId, {
        id: jobId,
        status: 'running',
        progress: 20,
        message: (voice === 'duet-podcast')
          ? `Roteiro Dueto: "${scriptData.title}". Gravando vozes de Thalita 👩 + Antônio 👨...`
          : `Roteiro inédito: "${scriptData.title}". Baixando 14 fotos reais em lote único...`
      });

      const videoResult = await buildVid(scriptData, { voice, visualStyle }, (progress, message) => {
        jobs.set(jobId, {
          id: jobId,
          status: 'running',
          progress,
          message
        });
      });

      // Automatic Cloudflare R2 Cloud Upload
      try {
        const { uploadVideoToR2, syncDatabaseToR2 } = require('./src/r2_storage');
        const videoFilePath = path.join(__dirname, 'public', videoResult.url.replace(/^\/+/, ''));
        if (fs.existsSync(videoFilePath)) {
          jobs.set(jobId, {
            id: jobId,
            status: 'running',
            progress: 92,
            message: 'Fazendo upload seguro para Cloudflare R2 (10 GB Nuvem)...'
          });
          const r2Url = await uploadVideoToR2(videoFilePath, videoResult.filename);
          if (r2Url) {
            videoResult.r2Url = r2Url;
            videoResult.url = r2Url;
          }
        }
      } catch (r2Err) {
        console.error('[R2 Upload Error]', r2Err.message);
      }

      // Automatic Telegram Upload (Unlimited Cloud & Direct Phone Access)
      try {
        const { sendVideoToTelegram, syncHistoryDatabaseToTelegram } = require('./src/telegram_storage');
        const videoFilePath = (videoResult.localMp4Path && fs.existsSync(videoResult.localMp4Path))
          ? videoResult.localMp4Path
          : path.join(__dirname, 'public', (videoResult.filename ? `videos/${videoResult.filename}` : (videoResult.url || '').replace(/^\/+/, '')));
        jobs.set(jobId, {
          id: jobId,
          status: 'running',
          progress: 96,
          message: 'Enviando vídeo para o seu Telegram (@Shofacbot)...'
        });
        const tgResult = await sendVideoToTelegram(videoResult, videoFilePath);
        if (tgResult && tgResult.messageId) {
          videoResult.telegram = tgResult;
        }
        await syncHistoryDatabaseToTelegram();
      } catch (tgErr) {
        console.error('[Telegram Upload Error]', tgErr.message);
      }

      saveHist(videoResult, safeExclude);
      try {
        const { syncDatabaseToR2 } = require('./src/r2_storage');
        await syncDatabaseToR2();
      } catch (e) {}

      try {
        const { syncHistoryDatabaseToTelegram } = require('./src/telegram_storage');
        await syncHistoryDatabaseToTelegram();
      } catch (e) {}

      jobs.set(jobId, {
        id: jobId,
        status: 'done',
        progress: 100,
        message: 'Concluído!',
        result: videoResult
      });
    } catch (err) {
      console.error('Error generating short:', err);
      jobs.set(jobId, {
        id: jobId,
        status: 'error',
        error: err.message || 'Erro interno na renderização'
      });
    }
  })();
});

app.get('/api/status/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job não encontrado' });
  }
  res.json(job);
});

// Cloudflare R2 Storage API Endpoints
app.get('/api/r2/config', (req, res) => {
  try {
    const { loadR2Config } = require('./src/r2_storage');
    const cfg = loadR2Config();
    const isConfigured = Boolean(cfg.accountId && cfg.accessKeyId && cfg.secretAccessKey);
    res.json({
      configured: isConfigured,
      accountId: cfg.accountId || '',
      bucketName: cfg.bucketName || 'shorts-videos',
      publicUrl: cfg.publicUrl || ''
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/r2/config', (req, res) => {
  try {
    const { saveR2Config, getR2Client } = require('./src/r2_storage');
    const { accountId, accessKeyId, secretAccessKey, bucketName, publicUrl } = req.body || {};
    if (!accountId || !accessKeyId || !secretAccessKey) {
      return res.status(400).json({ error: 'ACCOUNT_ID, ACCESS_KEY_ID e SECRET_ACCESS_KEY são obrigatórios.' });
    }
    const cleanConfig = {
      accountId: String(accountId).trim(),
      accessKeyId: String(accessKeyId).trim(),
      secretAccessKey: String(secretAccessKey).trim(),
      bucketName: String(bucketName || 'shorts-videos').trim(),
      publicUrl: String(publicUrl || '').trim().replace(/\/+$/, '')
    };
    saveR2Config(cleanConfig);
    const client = getR2Client(cleanConfig);
    if (!client) throw new Error('Falha ao inicializar cliente R2 com estas credenciais.');

    res.json({ ok: true, message: 'Credenciais do Cloudflare R2 salvas com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/r2/sync-all', async (req, res) => {
  try {
    const { syncAllLocalVideosToR2 } = require('./src/r2_storage');
    const result = await syncAllLocalVideosToR2();
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Telegram Storage & Anti-Repetition API Endpoints
app.get('/api/telegram/config', (req, res) => {
  try {
    const { loadTelegramConfig } = require('./src/telegram_storage');
    const cfg = loadTelegramConfig();
    res.json({
      configured: Boolean(cfg.botToken && cfg.chatId),
      enabled: Boolean(cfg.enabled),
      botUsername: cfg.botUsername || 'Shofacbot',
      chatTitle: cfg.chatTitle || 'Shorts Factory History',
      chatId: cfg.chatId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/telegram/config', (req, res) => {
  try {
    const { saveTelegramConfig, loadTelegramConfig } = require('./src/telegram_storage');
    const { botToken, chatId, enabled } = req.body || {};
    const current = loadTelegramConfig();
    const updated = {
      ...current,
      botToken: botToken !== undefined ? String(botToken).trim() : current.botToken,
      chatId: chatId !== undefined ? String(chatId).trim() : current.chatId,
      enabled: enabled !== undefined ? Boolean(enabled) : true
    };
    saveTelegramConfig(updated);
    res.json({ ok: true, config: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/telegram/sync-all', async (req, res) => {
  try {
    const { syncAllLocalVideosToTelegram } = require('./src/telegram_storage');
    const result = await syncAllLocalVideosToTelegram();
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/telegram/restore-db', async (req, res) => {
  try {
    const { fetchHistoryDatabaseFromTelegram } = require('./src/telegram_storage');
    const remoteDb = await fetchHistoryDatabaseFromTelegram();
    if (!remoteDb) {
      return res.status(404).json({ error: 'Nenhuma base encontrada fixada no Telegram' });
    }
    const historyPath = path.join(__dirname, 'data', 'history.json');
    fs.writeFileSync(historyPath, JSON.stringify(remoteDb, null, 2), 'utf8');
    delete require.cache[require.resolve('./src/generator')];
    res.json({ ok: true, totalVideos: remoteDb.videos?.length || 0, totalTopics: remoteDb.usedTopics?.length || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/history', (req, res) => {
  delete require.cache[require.resolve('./src/generator')];
  const { loadHistory: loadHist } = require('./src/generator');
  const { loadTelegramConfig } = require('./src/telegram_storage');
  const history = loadHist();
  const tgCfg = loadTelegramConfig();
  res.json({
    tunnelUrl: currentTunnelUrl,
    usedTopics: history.usedTopics || [],
    usedTitles: history.usedTitles || [],
    videos: history.videos || [],
    telegram: {
      enabled: Boolean(tgCfg.enabled),
      configured: Boolean(tgCfg.botToken && tgCfg.chatId),
      botUsername: tgCfg.botUsername || 'Shofacbot',
      chatTitle: tgCfg.chatTitle || 'Shorts Factory History'
    }
  });
});

// Start Express Server & Cloudflare Quick Tunnel for Remote Mobile Access (when not running on Vercel Serverless)
if (!process.env.VERCEL) {
  app.listen(PORT, HOST, () => {
    console.log(`\n========================================`);
    console.log(`🚀 Shorts Factory Server running on http://${HOST}:${PORT}`);
    console.log(`========================================\n`);

    if (!process.env.RENDER && !process.env.PORT) {
      startCloudflareTunnel();
    }

    // Auto-restore database from Telegram if local history is empty
    (async () => {
      try {
        const { fetchHistoryDatabaseFromTelegram } = require('./src/telegram_storage');
        const { loadHistory: loadHist } = require('./src/generator');
        const currentHist = loadHist();
        if ((!currentHist.videos || currentHist.videos.length === 0) && (!currentHist.usedTopics || currentHist.usedTopics.length === 0)) {
          const remoteDb = await fetchHistoryDatabaseFromTelegram();
          if (remoteDb) {
            const historyPath = path.join(__dirname, 'data', 'history.json');
            const dir = path.dirname(historyPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(historyPath, JSON.stringify(remoteDb, null, 2), 'utf8');
            delete require.cache[require.resolve('./src/generator')];
            console.log(`✅ [Startup] Base de dados restaurada automaticamente do Telegram (${remoteDb.usedTopics?.length || 0} temas)!`);
          }
        }
      } catch (e) {
        console.warn('[Startup] Não foi possível verificar base remota do Telegram:', e.message);
      }
    })();
  });
}

module.exports = app;

function startCloudflareTunnel() {
  try {
    console.log('Iniciando Cloudflare Tunnel para acesso externo via 4G/5G/Celular...');
    const cf = spawn(cloudflaredBin, ['tunnel', '--url', `http://127.0.0.1:${PORT}`, '--no-autoupdate'], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const handleOutput = (data) => {
      const str = data.toString();
      const match = str.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
      if (match && !currentTunnelUrl) {
        currentTunnelUrl = match[0];
        console.log(`\n🌍 LINK PÚBLICO DO CELULAR (CLOUDFLARE): ${currentTunnelUrl}\n`);
        fs.writeFileSync(path.join(__dirname, 'tunnel_url.txt'), currentTunnelUrl, 'utf8');
        saveDesktopAccessCard(currentTunnelUrl);
      }
    };

    cf.stdout.on('data', handleOutput);
    cf.stderr.on('data', handleOutput);
  } catch (err) {
    console.error('Failed to start cloudflared tunnel:', err.message);
  }
}

function saveDesktopAccessCard(url) {
  try {
    const desktopDir = path.join(process.env.USERPROFILE || 'C:\\Users\\Kaelthus Matarazzo', 'Desktop');
    const htmlPath = path.join(desktopDir, 'SHORTS_FACTORY_CELULAR.html');
    const qrApi = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(url)}`;
    const content = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Acesso Celular - Shorts Factory</title>
  <style>
    body { background:#080812; color:#fff; font-family:sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; text-align:center; }
    .box { background:#141428; padding:36px; border-radius:24px; border:1px solid #00f0ff; max-width:460px; box-shadow:0 0 40px rgba(0,240,255,0.2); }
    img { border-radius:16px; border:6px solid #fff; margin:20px 0; }
    a { display:inline-block; background:linear-gradient(135deg,#00f0ff,#7000ff); color:#fff; text-decoration:none; font-weight:bold; padding:14px 24px; border-radius:12px; margin-top:12px; word-break:break-all; }
  </style>
</head>
<body>
  <div class="box">
    <h2>📱 Acesse sua Shorts Factory no Celular</h2>
    <p style="color:#aaa;">Escaneie o QR Code com a câmera do telefone ou clique no link abaixo (funciona em qualquer 4G/5G/Wi-Fi):</p>
    <img src="${qrApi}" width="240" height="240" alt="QR Code"/>
    <br/>
    <a href="${url}" target="_blank">${url}</a>
  </div>
</body>
</html>`;
    fs.writeFileSync(htmlPath, content, 'utf8');
  } catch (e) {}
}
