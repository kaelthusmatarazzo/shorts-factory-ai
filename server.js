const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { bin: cloudflaredBin } = require('cloudflared');
const { generateUniqueScript, loadHistory, saveToHistory } = require('./src/generator');
const { buildShortVideo } = require('./src/video_renderer');

const app = express();
const PORT = 3999;

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
  const { niche = 'curiosidades', voice = 'pt-BR-ThalitaMultilingualNeural', customTopic = '', durationMode = 'monetized', scriptOverride = null, excludeTopics = [] } = req.body || {};
  const safeExclude = Array.isArray(excludeTopics) ? excludeTopics : [];
  const jobId = `job_${Date.now()}`;

  jobs.set(jobId, {
    id: jobId,
    status: 'running',
    progress: 10,
    message: 'Descobrindo fato curioso inédito e criando roteiro >1 Minuto...'
  });

  // On Vercel Serverless, run synchronously inside the 60s request window so Lambda doesn't freeze before completion
  if (process.env.VERCEL) {
    try {
      const { generateUniqueScript: genScript, saveToHistory: saveHist } = require('./src/generator');
      const { buildShortVideo: buildVid } = require('./src/video_renderer');
      const scriptData = (scriptOverride && scriptOverride.title && Array.isArray(scriptOverride.scenes))
        ? scriptOverride
        : await genScript(niche, customTopic, durationMode, safeExclude);
      const videoResult = await buildVid(scriptData, { voice });
      saveHist(videoResult, safeExclude);
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
        message: `Roteiro inédito: "${scriptData.title}". Baixando fotos reais...`
      });

      const videoResult = await buildVid(scriptData, { voice }, (progress, message) => {
        jobs.set(jobId, {
          id: jobId,
          status: 'running',
          progress,
          message
        });
      });

      saveHist(videoResult, safeExclude);

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

app.get('/api/history', (req, res) => {
  delete require.cache[require.resolve('./src/generator')];
  const { loadHistory: loadHist } = require('./src/generator');
  const history = loadHist();
  res.json({
    tunnelUrl: currentTunnelUrl,
    usedTopics: history.usedTopics || [],
    usedTitles: history.usedTitles || [],
    videos: history.videos || []
  });
});

// Start Express Server & Cloudflare Quick Tunnel for Remote Mobile Access (when not running on Vercel Serverless)
if (!process.env.VERCEL) {
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`\n========================================`);
    console.log(`🚀 Shorts Factory Server running on http://127.0.0.1:${PORT}`);
    console.log(`========================================\n`);

    startCloudflareTunnel();
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
