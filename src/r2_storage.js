const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');

const CONFIG_FILE = path.join(__dirname, '..', 'data', 'r2_config.json');

function loadR2Config() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading r2_config.json:', e.message);
  }
  return {
    accountId: process.env.R2_ACCOUNT_ID || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucketName: process.env.R2_BUCKET_NAME || 'shorts-videos',
    publicUrl: process.env.R2_PUBLIC_URL || ''
  };
}

function saveR2Config(cfg) {
  const dir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
}

function getR2Client(cfg = null) {
  const c = cfg || loadR2Config();
  if (!c.accountId || !c.accessKeyId || !c.secretAccessKey) {
    return null;
  }
  return new S3Client({
    region: 'auto',
    endpoint: `https://${c.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: c.accessKeyId,
      secretAccessKey: c.secretAccessKey
    }
  });
}

/**
 * Upload a local MP4 video file to Cloudflare R2
 */
async function uploadVideoToR2(localFilePath, filename = null) {
  const cfg = loadR2Config();
  const client = getR2Client(cfg);
  if (!client) {
    console.log('[R2] Cloudflare R2 credentials not configured. Skipping cloud upload.');
    return null;
  }

  const baseName = filename || path.basename(localFilePath);
  const key = `videos/${baseName}`;
  const fileStream = fs.createReadStream(localFilePath);
  const fileSize = fs.statSync(localFilePath).size;

  console.log(`[R2] Uploading ${baseName} (${(fileSize / (1024 * 1024)).toFixed(2)} MB) to Cloudflare R2...`);

  const putCommand = new PutObjectCommand({
    Bucket: cfg.bucketName,
    Key: key,
    Body: fileStream,
    ContentType: 'video/mp4',
    ContentLength: fileSize
  });

  await client.send(putCommand);

  // Build clean public CDN URL
  const publicBase = (cfg.publicUrl || '').replace(/\/+$/, '');
  const r2VideoUrl = publicBase ? `${publicBase}/${key}` : `https://${cfg.bucketName}.${cfg.accountId}.r2.cloudflarestorage.com/${key}`;

  console.log(`✅ [R2] Upload complete! Public URL: ${r2VideoUrl}`);
  return r2VideoUrl;
}

/**
 * Upload history.json database to Cloudflare R2 for universal multi-device access
 */
async function syncDatabaseToR2(historyData = null) {
  const cfg = loadR2Config();
  const client = getR2Client(cfg);
  if (!client) return null;

  const dataToSync = historyData || JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'history.json'), 'utf8'));
  const payload = Buffer.from(JSON.stringify(dataToSync, null, 2), 'utf8');

  const putCommand = new PutObjectCommand({
    Bucket: cfg.bucketName,
    Key: 'data/history.json',
    Body: payload,
    ContentType: 'application/json',
    CacheControl: 'no-cache, no-store, must-revalidate'
  });

  await client.send(putCommand);
  console.log('✅ [R2] Database synced to Cloudflare R2 (data/history.json)!');
  return true;
}

/**
 * Sync all existing local videos from public/videos to R2
 */
async function syncAllLocalVideosToR2(onProgress = null) {
  const cfg = loadR2Config();
  const client = getR2Client(cfg);
  if (!client) throw new Error('Cloudflare R2 não configurado. Por favor, adicione as chaves em data/r2_config.json');

  const videosDir = path.join(__dirname, '..', 'public', 'videos');
  const historyPath = path.join(__dirname, '..', 'data', 'history.json');
  if (!fs.existsSync(videosDir)) return { synced: 0, total: 0 };

  const history = fs.existsSync(historyPath) ? JSON.parse(fs.readFileSync(historyPath, 'utf8')) : { videos: [] };
  const files = fs.readdirSync(videosDir).filter(f => f.endsWith('.mp4'));

  let synced = 0;
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const fullPath = path.join(videosDir, f);
    if (onProgress) onProgress(i + 1, files.length, f);

    try {
      // Check if already in history with r2Url
      const existing = (history.videos || []).find(v => v.filename === f);
      if (existing && existing.r2Url) {
        continue;
      }

      const r2Url = await uploadVideoToR2(fullPath, f);
      if (r2Url) {
        if (existing) {
          existing.r2Url = r2Url;
        } else {
          history.videos.push({
            id: f.replace('.mp4', ''),
            filename: f,
            url: `/videos/${f}`,
            r2Url,
            title: f.replace('.mp4', ''),
            createdAt: fs.statSync(fullPath).birthtime.toISOString()
          });
        }
        synced++;
      }
    } catch (err) {
      console.error(`[R2 Sync] Failed to upload ${f}:`, err.message);
    }
  }

  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf8');
  await syncDatabaseToR2(history);
  return { synced, total: files.length };
}

module.exports = {
  loadR2Config,
  saveR2Config,
  getR2Client,
  uploadVideoToR2,
  syncDatabaseToR2,
  syncAllLocalVideosToR2
};
