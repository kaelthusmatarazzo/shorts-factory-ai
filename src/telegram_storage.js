const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '..', 'data', 'telegram_config.json');
const HISTORY_FILE = path.join(__dirname, '..', 'data', 'history.json');

function loadTelegramConfig() {
  let cfg = null;
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch (e) {}

  const botToken = (cfg && cfg.botToken) || process.env.TELEGRAM_BOT_TOKEN || '8780088602:AAHyWqGDEsNNoIWR4vPLSpgeQRJfYbDusdk';
  const chatId = (cfg && cfg.chatId) || process.env.TELEGRAM_CHAT_ID || '-1004334660783';
  const enabled = (cfg && cfg.enabled !== undefined) ? cfg.enabled : true;

  return {
    botToken,
    chatId,
    enabled: Boolean(enabled && botToken && chatId),
    botUsername: (cfg && cfg.botUsername) || 'Shofacbot',
    chatTitle: (cfg && cfg.chatTitle) || 'Shorts Factory History'
  };
}

function saveTelegramConfig(cfg) {
  const dir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
}

/**
 * Send a video with full posting kit metadata directly to the Telegram group/channel
 */
async function sendVideoToTelegram(videoMeta, localFilePath = null) {
  const cfg = loadTelegramConfig();
  if (!cfg.enabled || !cfg.botToken || !cfg.chatId) {
    console.log('[Telegram] Bot não configurado ou desativado.');
    return null;
  }

  let fileBytes = null;
  let fileName = (videoMeta.filename || 'short_video.mp4');

  if (localFilePath && fs.existsSync(localFilePath)) {
    fileBytes = fs.readFileSync(localFilePath);
    fileName = path.basename(localFilePath);
  } else if (videoMeta.localMp4Path && fs.existsSync(videoMeta.localMp4Path)) {
    fileBytes = fs.readFileSync(videoMeta.localMp4Path);
    fileName = path.basename(videoMeta.localMp4Path);
  } else {
    const pubPath = path.join(__dirname, '..', 'public', (videoMeta.filename ? `videos/${videoMeta.filename}` : (videoMeta.url || '').replace(/^\/+/, '')));
    if (fs.existsSync(pubPath)) {
      fileBytes = fs.readFileSync(pubPath);
      fileName = path.basename(pubPath);
    } else if (videoMeta.url && videoMeta.url.startsWith('data:video/mp4;base64,')) {
      fileBytes = Buffer.from(videoMeta.url.replace(/^data:video\/mp4;base64,/, ''), 'base64');
    }
  }

  if (!fileBytes || fileBytes.length === 0) {
    console.error('[Telegram] Arquivo de vídeo não encontrado para envio:', fileName);
    return null;
  }

  const title = (videoMeta.title || 'Fato Curioso Impressionante').trim();
  const desc = (videoMeta.description || '').trim();
  const tags = (videoMeta.hashtags || '#curiosidades #fatoscuriosos #ciencia #misterios #vocesabia').trim();
  const duration = videoMeta.duration || 65;

  // Build video caption within Telegram's 1024 char limit
  let caption = `🎬 <b>${escapeHtml(title)}</b>\n\n`;
  if (desc) {
    const maxDesc = 550;
    const cleanDesc = desc.length > maxDesc ? desc.slice(0, maxDesc) + '...' : desc;
    caption += `🎵 <b>Descrição TikTok:</b>\n${escapeHtml(cleanDesc)}\n\n`;
  }
  caption += `🏷️ <b>5 Hashtags:</b>\n${tags}\n\n`;
  caption += `⏱️ <b>${duration}s</b> | 🔁 <b>Loop Infinito Ativo</b> | 📱 <b>9:16 HD</b>`;

  if (caption.length > 1020) {
    caption = caption.slice(0, 1016) + '...';
  }

  const blob = new Blob([fileBytes], { type: 'video/mp4' });

  const form = new FormData();
  form.append('chat_id', cfg.chatId);
  form.append('video', blob, fileName);
  form.append('caption', caption);
  form.append('parse_mode', 'HTML');
  form.append('supports_streaming', 'true');

  console.log(`[Telegram] Enviando vídeo "${fileName}" (${(fileBytes.length / (1024 * 1024)).toFixed(2)} MB)...`);

  let res = await fetch(`https://api.telegram.org/bot${cfg.botToken}/sendVideo`, {
    method: 'POST',
    body: form
  });

  let data = await res.json();
  if (!data.ok && data.error_code === 429) {
    const waitSec = (data.parameters && data.parameters.retry_after) || 20;
    console.log(`[Telegram] Rate limit atingido. Aguardando ${waitSec}s para tentar novamente...`);
    await new Promise(r => setTimeout(r, (waitSec + 1) * 1000));
    
    // Rebuild form with fresh blob
    const retryBlob = new Blob([fileBytes], { type: 'video/mp4' });
    const retryForm = new FormData();
    retryForm.append('chat_id', cfg.chatId);
    retryForm.append('video', retryBlob, fileName);
    retryForm.append('caption', caption);
    retryForm.append('parse_mode', 'HTML');
    retryForm.append('supports_streaming', 'true');

    res = await fetch(`https://api.telegram.org/bot${cfg.botToken}/sendVideo`, {
      method: 'POST',
      body: retryForm
    });
    data = await res.json();
  }

  if (!data.ok) {
    throw new Error(`Telegram API Error: ${data.description || 'Falha ao enviar vídeo'}`);
  }

  const messageId = data.result.message_id;
  const fileId = data.result.video ? data.result.video.file_id : null;
  console.log(`✅ [Telegram] Vídeo postado com sucesso! Message ID: ${messageId}`);

  // Send follow-up kit message with YouTube Shorts <=100 char variations & Pinned Comment
  try {
    let kitText = `📋 <b>KIT DE POSTAGEM RÁPIDA:</b>\n\n`;

    if (Array.isArray(videoMeta.shortOptions100) && videoMeta.shortOptions100.length > 0) {
      kitText += `🔴 <b>YouTube Shorts (Opções ≤100 Letras):</b>\n`;
      videoMeta.shortOptions100.forEach((opt, idx) => {
        const text = typeof opt === 'string' ? opt : (opt.text || '');
        const label = typeof opt === 'object' && opt.label ? opt.label : `Opção ${idx + 1}`;
        kitText += `• <i>${escapeHtml(label)} (${text.length} letras):</i>\n<code>${escapeHtml(text)}</code>\n\n`;
      });
    }

    if (videoMeta.pinnedComment) {
      kitText += `💬 <b>1º Comentário Fixado (Engajamento):</b>\n<code>${escapeHtml(videoMeta.pinnedComment)}</code>\n\n`;
    }

    if (videoMeta.loopBridge) {
      kitText += `🔁 <b>Conexão do Loop Infinito:</b>\nFinal: <i>"${escapeHtml(videoMeta.loopBridge.endText || '')}"</i>\nInício: <i>"${escapeHtml(videoMeta.loopBridge.startText || '')}"</i>`;
    }

    await fetch(`https://api.telegram.org/bot${cfg.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: cfg.chatId,
        reply_to_message_id: messageId,
        text: kitText,
        parse_mode: 'HTML'
      })
    });
  } catch (kitErr) {
    console.warn('[Telegram] Aviso ao enviar kit complementar:', kitErr.message);
  }

  return {
    ok: true,
    messageId,
    fileId,
    chatId: cfg.chatId
  };
}

/**
 * Upload and pin history.json to the Telegram chat as an offsite persistent database
 */
async function syncHistoryDatabaseToTelegram(historyData = null) {
  const cfg = loadTelegramConfig();
  if (!cfg.enabled || !cfg.botToken || !cfg.chatId) return null;

  try {
    let history = historyData;
    if (!history) {
      if (fs.existsSync(HISTORY_FILE)) {
        history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
      } else {
        history = { usedTitles: [], usedTopics: [], videos: [] };
      }
    }

    const payload = Buffer.from(JSON.stringify(history, null, 2), 'utf8');
    const blob = new Blob([payload], { type: 'application/json' });

    const totalVideos = Array.isArray(history.videos) ? history.videos.length : 0;
    const totalTopics = Array.isArray(history.usedTopics) ? history.usedTopics.length : 0;

    const form = new FormData();
    form.append('chat_id', cfg.chatId);
    form.append('document', blob, 'history.json');
    form.append('caption', `📦 <b>DATABASE DE SHORTS SINCRONIZADA</b>\n\n📊 Total de Vídeos: <b>${totalVideos}</b>\n🛡️ Temas Bloqueados Anti-Repetição: <b>${totalTopics}</b>\n🕒 Atualizado em: <code>${new Date().toLocaleString('pt-BR')}</code>\n\n<i>Esta base é lida automaticamente pelo sistema para garantir zero vídeos repetidos!</i>`);
    form.append('parse_mode', 'HTML');

    const res = await fetch(`https://api.telegram.org/bot${cfg.botToken}/sendDocument`, {
      method: 'POST',
      body: form
    });
    const data = await res.json();

    if (data.ok && data.result) {
      const docMessageId = data.result.message_id;
      // Pin message so getChat always retrieves it easily
      await fetch(`https://api.telegram.org/bot${cfg.botToken}/pinChatMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: cfg.chatId,
          message_id: docMessageId,
          disable_notification: true
        })
      });
      console.log(`✅ [Telegram] Database history.json sincronizada e fixada no grupo (msg ${docMessageId})!`);
      return true;
    }
  } catch (err) {
    console.error('[Telegram] Erro ao sincronizar database no Telegram:', err.message);
  }
  return false;
}

/**
 * Fetch and restore history database from Telegram pinned message (ensures zero repetitions across any PC/device)
 */
async function fetchHistoryDatabaseFromTelegram() {
  const cfg = loadTelegramConfig();
  if (!cfg.enabled || !cfg.botToken || !cfg.chatId) return null;

  try {
    const chatRes = await fetch(`https://api.telegram.org/bot${cfg.botToken}/getChat?chat_id=${cfg.chatId}`);
    const chatData = await chatRes.json();
    if (!chatData.ok || !chatData.result || !chatData.result.pinned_message) {
      return null;
    }

    const pinned = chatData.result.pinned_message;
    if (pinned.document && pinned.document.file_name === 'history.json') {
      const fileId = pinned.document.file_id;
      const fileRes = await fetch(`https://api.telegram.org/bot${cfg.botToken}/getFile?file_id=${fileId}`);
      const fileData = await fileRes.json();
      if (fileData.ok && fileData.result && fileData.result.file_path) {
        const downloadUrl = `https://api.telegram.org/file/bot${cfg.botToken}/${fileData.result.file_path}`;
        const contentRes = await fetch(downloadUrl);
        const downloadedHistory = await contentRes.json();
        console.log(`✅ [Telegram] Database restaurada do Telegram com sucesso (${downloadedHistory.videos?.length || 0} vídeos, ${downloadedHistory.usedTopics?.length || 0} temas)!`);
        return downloadedHistory;
      }
    }
  } catch (err) {
    console.warn('[Telegram] Não foi possível restaurar database do Telegram:', err.message);
  }
  return null;
}

/**
 * Upload all local videos that haven't been uploaded to Telegram yet
 */
async function syncAllLocalVideosToTelegram(onProgress = null) {
  const cfg = loadTelegramConfig();
  if (!cfg.enabled || !cfg.botToken || !cfg.chatId) {
    throw new Error('Telegram Bot não configurado ou desativado.');
  }

  const videosDir = path.join(__dirname, '..', 'public', 'videos');
  if (!fs.existsSync(videosDir)) return { synced: 0, total: 0 };

  const history = fs.existsSync(HISTORY_FILE)
    ? JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'))
    : { usedTitles: [], usedTopics: [], videos: [] };

  const files = fs.readdirSync(videosDir).filter(f => f.endsWith('.mp4'));
  let synced = 0;

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const fullPath = path.join(videosDir, f);

    // Check if this video is already in history and already has telegram.messageId
    let videoRecord = (history.videos || []).find(v => v.filename === f || (v.url && v.url.includes(f)));
    if (videoRecord && videoRecord.telegram && videoRecord.telegram.messageId) {
      if (onProgress) onProgress(i + 1, files.length, f, 'already_uploaded');
      continue;
    }

    if (!videoRecord) {
      videoRecord = {
        id: f.replace('.mp4', ''),
        filename: f,
        url: `/videos/${f}`,
        title: f.replace('.mp4', '').replace(/_/g, ' '),
        createdAt: fs.statSync(fullPath).birthtime.toISOString()
      };
      if (!Array.isArray(history.videos)) history.videos = [];
      history.videos.push(videoRecord);
    }

    if (onProgress) onProgress(i + 1, files.length, f, 'uploading');

    try {
      const result = await sendVideoToTelegram(videoRecord, fullPath);
      if (result && result.messageId) {
        videoRecord.telegram = {
          messageId: result.messageId,
          fileId: result.fileId,
          chatId: result.chatId,
          sentAt: new Date().toISOString()
        };
        synced++;
        // Small delay to respect Telegram rate limits
        await new Promise(r => setTimeout(r, 1200));
      }
    } catch (err) {
      console.error(`[Telegram Sync] Erro ao enviar ${f}:`, err.message);
    }
  }

  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
  await syncHistoryDatabaseToTelegram(history);

  return { synced, total: files.length };
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

module.exports = {
  loadTelegramConfig,
  saveTelegramConfig,
  sendVideoToTelegram,
  syncHistoryDatabaseToTelegram,
  fetchHistoryDatabaseFromTelegram,
  syncAllLocalVideosToTelegram
};
