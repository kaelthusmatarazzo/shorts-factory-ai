const fs = require('fs');
const path = require('path');

const FILES_TO_PUSH = [
  'package.json',
  'vercel.json',
  'server.js',
  'api/index.js',
  'public/index.html',
  'src/fonts/Hormozi-Black.ttf',
  'src/generator.js',
  'src/tts_and_audio.js',
  'src/video_renderer.js',
  'src/publisher.js',
  'src/github_deployer.js'
];

async function deployProjectToGitHub(githubToken, repoName = 'shorts-factory-ai') {
  const tokenFile = path.join(__dirname, '..', 'data', 'github_token.json');
  let token = String(githubToken || '').trim();
  if (!token && fs.existsSync(tokenFile)) {
    try { token = JSON.parse(fs.readFileSync(tokenFile, 'utf8')).token || ''; } catch (e) {}
  }
  if (!token) {
    throw new Error('Informe seu Personal Access Token (ghp_...) do GitHub.');
  }
  try {
    fs.writeFileSync(tokenFile, JSON.stringify({ token, repoName }, null, 2), 'utf8');
  } catch (e) {}

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'ShortsFactoryPro/4.0',
    'Content-Type': 'application/json'
  };

  // 1. Get authenticated GitHub user
  const userRes = await fetch('https://api.github.com/user', { headers });
  const userData = await userRes.json();
  if (!userRes.ok || !userData.login) {
    throw new Error(`Token do GitHub inválido (${userData.message || userRes.status})`);
  }
  const owner = userData.login;

  // 2. Create repository if it does not exist yet
  const createRes = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: repoName,
      description: 'Shorts Factory AI - Gerador Automático de Shorts & TikTok (>1 Min + Loop Infinito + Fotos Reais)',
      private: false,
      auto_init: true
    })
  });
  // Wait briefly if repo was just initialized
  if (createRes.ok) {
    await new Promise(r => setTimeout(r, 1500));
  }

  // 3. Upload each file via GitHub Contents API
  const rootDir = path.join(__dirname, '..');
  for (const relPath of FILES_TO_PUSH) {
    const absPath = path.join(rootDir, relPath);
    if (!fs.existsSync(absPath)) continue;

    const contentBase64 = fs.readFileSync(absPath).toString('base64');
    const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/${relPath}`;

    // Check if file already exists to include its SHA
    let existingSha = null;
    try {
      const checkRes = await fetch(apiUrl, { headers });
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        existingSha = checkData.sha || null;
      }
    } catch (e) {}

    const bodyObj = {
      message: `Deploy ${relPath} via Shorts Factory AI`,
      content: contentBase64
    };
    if (existingSha) bodyObj.sha = existingSha;

    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify(bodyObj)
    });

    if (!putRes.ok) {
      const errTxt = await putRes.text();
      throw new Error(`Falha ao enviar ${relPath}: ${errTxt.slice(0, 160)}`);
    }
  }

  const repoUrl = `https://github.com/${owner}/${repoName}`;
  const vercelImportUrl = `https://vercel.com/new/import?s=${encodeURIComponent(repoUrl)}`;
  const renderImportUrl = `https://dashboard.render.com/select-repo?type=web`;

  return {
    owner,
    repoName,
    repoUrl,
    vercelImportUrl,
    renderImportUrl
  };
}

module.exports = {
  deployProjectToGitHub
};
