// ============================================
// RMA FINANCE TELEGRAM BOT - WEBHOOK VERSION
// RENDER.COM DEPLOYMENT
// ============================================

const express = require('express');
const app = express();
const axios = require('axios');

// ========== CONFIG ==========
const BOT_TOKEN = "8811324859:AAEZ4I5Yxhxbts9fYhgCYwcNlXdCDOCI8AU";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const GAS_WEB_APP = "https://script.google.com/macros/s/AKfycbzuTXp6unIdfjlTgbIAo_Q31sMMq_YVyu2c5eOpCdF7MONObEvCARud0HJKGFLNpCi7vQ/userweb"; // ⬅️ Replace with your GAS web app URL
const PORT = process.env.PORT || 3000;

// ========== MIDDLEWARE ==========
app.use(express.json());

// ========== HEALTH CHECK ==========
app.get('/', (req, res) => {
  res.json({ 
    status: "RMA Finance Telegram Bot Active ✅",
    version: "3.0 WEBHOOK",
    timestamp: new Date().toISOString()
  });
});

// ========== WEBHOOK ENDPOINT ==========
app.post(`/webhook/${BOT_TOKEN}`, async (req, res) => {
  try {
    const update = req.body;
    
    // Fast response to Telegram (200 OK)
    res.json({ status: "ok" });
    
    // Process update asynchronously
    processUpdate(update).catch(err => console.error("Update error:", err));
    
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(200).json({ status: "error" });
  }
});

// ========== UPDATE PROCESSOR ==========
async function processUpdate(update) {
  try {
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    } else if (update.message) {
      await handleMessage(update.message);
    }
  } catch (error) {
    console.error("Process update error:", error);
  }
}

// ========== CALLBACK HANDLER ==========
async function handleCallbackQuery(cb) {
  const chatId = cb.message.chat.id;
  const data = cb.data;
  const msgId = cb.message.message_id;
  
  console.log(`Callback: ${chatId} | ${data}`);
  
  // Answer callback
  await answerCallback(cb.id);
  
  // Forward to GAS for processing
  try {
    await axios.post(GAS_WEB_APP, {
      type: "callback",
      chatId: chatId,
      data: data,
      msgId: msgId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("GAS callback forward error:", error.message);
    // Fallback: send error message
    await sendMessage(chatId, "❌ Processing error. Please try again.");
  }
}

// ========== MESSAGE HANDLER ==========
async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();
  const firstName = msg.from?.first_name || "User";
  
  if (!text) return;
  
  console.log(`Message: ${chatId} | ${text.substring(0, 50)}`);
  
  // Forward to GAS for processing
  try {
    await axios.post(GAS_WEB_APP, {
      type: "message",
      chatId: chatId,
      text: text,
      firstName: firstName,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("GAS message forward error:", error.message);
    // Fallback: send error message
    await sendMessage(chatId, "❌ Processing error. Please try again.");
  }
}

// ========== TELEGRAM API FUNCTIONS ==========
async function sendMessage(chatId, text, keyboard = null) {
  try {
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: "HTML",
      disable_web_page_preview: true
    };
    
    if (keyboard && keyboard.length > 0) {
      payload.reply_markup = { inline_keyboard: keyboard };
    }
    
    await axios.post(`${TELEGRAM_API}/sendMessage`, payload);
  } catch (error) {
    console.error("Send message error:", error.message);
  }
}

async function deleteMessage(chatId, msgId) {
  try {
    await axios.post(`${TELEGRAM_API}/deleteMessage`, {
      chat_id: chatId,
      message_id: msgId
    });
  } catch (error) {
    console.error("Delete message error:", error.message);
  }
}

async function answerCallback(cbId, text = null) {
  try {
    const payload = { callback_query_id: cbId };
    if (text) payload.text = text;
    
    await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, payload);
  } catch (error) {
    console.error("Answer callback error:", error.message);
  }
}

// ========== WEBHOOK SETUP ==========
app.post('/setup-webhook', async (req, res) => {
  try {
    const webhookUrl = `${process.env.RENDER_EXTERNAL_URL}/webhook/${BOT_TOKEN}`;
    
    // Remove old webhook
    await axios.post(`${TELEGRAM_API}/setWebhook`, {
      url: "",
      drop_pending_updates: true
    });
    
    // Set new webhook
    const response = await axios.post(`${TELEGRAM_API}/setWebhook`, {
      url: webhookUrl,
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: false
    });
    
    res.json({
      status: "Webhook setup successful ✅",
      url: webhookUrl,
      telegram_response: response.data
    });
    
    console.log(`✅ Webhook set to: ${webhookUrl}`);
    
  } catch (error) {
    console.error("Setup error:", error.message);
    res.status(500).json({
      status: "Setup failed ❌",
      error: error.message
    });
  }
});

// ========== BOT INFO ==========
app.get('/bot-info', async (req, res) => {
  try {
    const response = await axios.get(`${TELEGRAM_API}/getMe`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== WEBHOOK INFO ==========
app.get('/webhook-info', async (req, res) => {
  try {
    const response = await axios.get(`${TELEGRAM_API}/getWebhookInfo`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== 404 HANDLER ==========
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ========== SERVER START ==========
app.listen(PORT, () => {
  console.log(`🚀 Telegram Bot Server running on port ${PORT}`);
  console.log(`📍 Webhook URL: https://your-render-url.onrender.com/webhook/${BOT_TOKEN}`);
  console.log(`⚡ GAS Integration: ${GAS_WEB_APP}`);
});
