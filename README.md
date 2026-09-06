# اسم فامیل v5

بازنویسی کامل:
- **Frontend:** React + Vite (نه یک فایل HTML غول‌پیکر)
- **Server:** Node.js + Express + Socket.io

## ساختار

```
esm-famil/
├── frontend/          → Vercel
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── public/
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── styles.css
│       └── lib/constants.js
└── server/            → Render
    ├── package.json
    └── index.js
```

## دیپلوی فرانت (Vercel)

1. Root Directory = `frontend`
2. Build Command = `npm run build`
3. Output Directory = `dist`
4. Environment (اختیاری): `VITE_SERVER_URL=https://YOUR-RENDER-URL`

## دیپلوی سرور (Render)

1. Root Directory = `server`
2. Build = `npm install`
3. Start = `npm start`

## اصلاحات نسبت به v4

1. **هدر ثابت:** فقط ناحیه جواب‌ها اسکرول می‌شود (flex layout، نه sticky داخل اسکرول)
2. **صفحه نهایی:** `game_finished` به کل اتاق + هر socket؛ fallback ۲.۵ث روی کلاینت
3. **جواب میزبان:** ذخیره با token روی سرور + stash محلی روی کلاینت؛ اسم‌ها بدون دیکشنری سخت‌گیرانه
4. **تاریخچه:** ذخیره فوری در localStorage هنگام `game_finished`

## اجرای محلی

```bash
# سرور
cd server && npm install && npm start

# فرانت
cd frontend && npm install && npm run dev
```
