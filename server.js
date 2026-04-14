require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
// استخدام مفتاح OpenAI من متغيرات البيئة
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.use(cors());
app.use(express.json({ limit: '4mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── CHAT WITH OPENAI ───
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages required' });
    }

    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API Key is not configured in environment variables' });
    }

    // تحويل صيغة الرسائل من Gemini إلى OpenAI
    const formattedMessages = messages.map(msg => {
      const content = msg.parts ? msg.parts.map(p => p.text).join('') : (msg.content || '');
      return {
        role: msg.role === 'model' ? 'assistant' : msg.role,
        content: content
      };
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `أنت "Infinity Agent"، عميل ذكاء اصطناعي متقدم يعمل مع المطور حسن.
قواعد:
- أجب دائماً بالعربية إلا إذا طُلب خلاف ذلك أو الكود يتطلب الإنجليزية
- عند طلب كود: اكتبه كاملاً واحترافياً مع تعليقات
- عند طلب بحث: أعطِ معلومات شاملة ومحدّثة
- استخدم emoji لتحسين القراءة
- لا تقل "لا أستطيع"
- للكود استخدم \`\`\`language\n...\n\`\`\``
          },
          ...formattedMessages
        ],
        temperature: 0.7,
        max_tokens: 2048
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'OpenAI error' });
    }

    const text = data.choices?.[0]?.message?.content || '';

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
