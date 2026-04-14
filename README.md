# ∞ Infinity Agent

AI Agent مثل Manus — سيرفر حقيقي + بحث حقيقي + متصفح مدمج.

## نشر على Railway (الأسهل — دقيقتين)

1. روح على https://railway.app وسجّل دخول بـ GitHub
2. اضغط "New Project" → "Deploy from GitHub repo"
3. ارفع هذا المجلد على GitHub أولاً (أو اسحب وأفلت)
4. بعد الرفع، في Railway → Variables أضف:
   ```
   GEMINI_KEY=AIzaSy...مفتاحك...
   ```
5. اضغط Deploy — سيعطيك رابط مثل: https://infinity-agent.up.railway.app

## نشر على Vercel

1. ثبّت Vercel CLI: npm i -g vercel
2. في مجلد المشروع: vercel
3. أضف Environment Variable: GEMINI_KEY=...
4. سيعطيك رابط .vercel.app

## تشغيل محلي

```bash
npm install
echo "GEMINI_KEY=AIzaSy..." > .env
npm start
# افتح http://localhost:3000
```

## المميزات
- ✅ بحث ويب حقيقي عبر Gemini Google Search
- ✅ متصفح مدمج يعمل عبر السيرفر (بدون CORS)
- ✅ سجل خطوات التنفيذ
- ✅ حفظ المحادثات السابقة
- ✅ نسخ الكود بزر واحد
- ✅ مصادر البحث قابلة للنقر
