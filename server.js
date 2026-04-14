require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
// استخدام مفتاح Google Gemini من متغيرات البيئة
const GEMINI_API_KEY = process.env.GEMINI_KEY;

app.use(cors());
app.use(express.json({ limit: '4mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── CHAT WITH GOOGLE GEMINI ───
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages required' });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Google Gemini API Key is not configured (GEMINI_KEY)' });
    }

    // تحويل صيغة الرسائل لتتوافق مع Gemini 1.5
    // Gemini 1.5 format: { role: 'user' | 'model', parts: [{ text: '...' }] }
    const formattedContents = messages.map(msg => {
      const content = msg.content || (msg.parts ? msg.parts.map(p => p.text).join('') : '');
      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: content }]
      };
    });

    // استخدام Gemini 1.5 Flash - النسخة المجانية والسريعة جداً
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const body = {
      system_instruction: {
        parts: [{
          text: `أنت "Infinity Agent"، عميل ذكاء اصطناعي متقدم يعمل مع المطور حسن.
قواعد:
- أجب دائماً بالعربية إلا إذا طُلب خلاف ذلك أو الكود يتطلب الإنجليزية
- عند طلب كود: اكتبه كاملاً واحترافياً مع تعليقات
- عند طلب بحث: أعطِ معلومات شاملة ومحدّثة
- استخدم emoji لتحسين القراءة
- لا تقل "لا أستطيع"
- للكود استخدم \`\`\`language\n...\n\`\`\``
        }]
      },
      contents: formattedContents,
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7
      }
    };

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      return res.status(geminiRes.status).json({ error: data.error?.message || 'Gemini error' });
    }

    const parts = data.candidates?.[0]?.content?.parts || [];
    const text = parts.map(p => p.text || '').filter(Boolean).join('\n');

    res.json({
      text,
      sources: []
    });

  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── PROXY BROWSER ───
app.get('/api/proxy', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send('url required');

  try {
    const target = decodeURIComponent(url);
    const response = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ar,en;q=0.9'
      },
      redirect: 'follow'
    });

    const contentType = response.headers.get('content-type') || 'text/html';
    let body = await response.text();

    const base = new URL(target);
    body = body
      .replace(/<base[^>]*>/gi, '')
      .replace(/href="\/([^"]*?)"/g, `href="/api/proxy?url=${encodeURIComponent(base.origin + '/')}$1"`)
      .replace(/src="\/([^"]*?)"/g, `src="/api/proxy?url=${encodeURIComponent(base.origin + '/')}$1"`)
      .replace(/<head>/i, `<head><base href="${target}">`)
      .replace(/Content-Security-Policy[^;]*/gi, '');

    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.send(body);
  } catch (err) {
    res.status(502).send(`
      <html><body style="font-family:sans-serif;padding:30px;background:#0d0d1c;color:#aaa;text-align:center">
        <h2 style="color:#f87171">تعذّر فتح الموقع</h2>
        <p>${err.message}</p>
        <p style="font-size:12px">بعض المواقع ترفض الاستضافة المتداخلة</p>
      </body></html>
    `);
  }
});

// ─── HEALTH ───
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ─── SPA FALLBACK ───
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  ∞ Infinity Agent running → http://localhost:${PORT}\n`);
});
