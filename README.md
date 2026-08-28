# اسم فامیل آنلاین v4.2

## فایل‌ها
- `index.html` — فرانت کامل (تم liquid glass + اصلاحات)
- `server.js` — سرور Socket.io
- `package.json` — وابستگی‌های سرور

## اجرا
### فرانت
فایل `index.html` را روی Netlify / GitHub Pages / هر هاست استاتیک بگذارید.
آدرس سرور داخل فایل: `SERVER_URL` (پیش‌فرض Render)

### سرور
```bash
npm install
npm start
```

## تغییرات v4.2
- تم liquid glass شبیه ferdowsi.vercel.app
- رفع کرش صفحه نتایج (ready-box)
- تشخیص درست میزبان از hostId
- toast خطای سرور
- hostId در rejoin
- آمادگی بازیکن‌ها + auto next
