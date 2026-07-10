# 🎮 بازی اسم فامیل آنلاین

بازی چند نفره اسم فامیل — هم آفلاین (روی یک گوشی) و هم آنلاین (از راه دور).

## 🚀 نسخه ۳.۰

### ویژگی‌ها
- 🌐 بازی آنلاین چند نفره (۲ تا ۸ نفر)
- 📱 بازی آفلاین (چند نفره روی یک گوشی)
- 🔐 لاگین با گوگل، اپل، یا ایمیل
- 📊 تاریخچه بازی‌ها و امتیازات
- ✏️ ویرایش امتیازات توسط میزبان بعد از هر دور
- 📤 اشتراک‌گذاری لینک و QR کد برای دعوت دوستان
- 📋 دسته‌بندی‌های پیش‌فرض + دلخواه
- ⏱️ زمان‌بندی قابل تنظیم (۳۰، ۶۰، ۹۰، ۱۲۰ ثانیه)
- 🔄 تعداد دور قابل تنظیم (۳، ۵، ۸، ۱۰ دور)
- 📱 PWA تمام صفحه — نصب روی گوشی مثل اپ
- 🔢 امتیازدهی: **۱۰** (جواب یکتا) و **۵** (جواب مشترک)

### دسته‌بندی‌های پیش‌فرض
👤 اسم | 👨‍👩‍👧‍👦 فامیل | 🏙️ شهر | 🌍 کشور | 🍲 غذا | 🍎 میوه | 🐾 حیوان | 🎨 رنگ | 🚗 ماشین | 🌸 گل

### حروف فارسی
آ ا ب پ ت ث ج چ ح خ د ذ ر ز ژ س ش ص ض ط ظ ع غ ف ق ک گ ل م ن و ه ی

---

## 📦 ساختار پروژه

### ریپازیتوری `esm-famil` (فرانت‌اند)
```
index.html    ← فایل بازی (همه چیز توی یک فایل)
README.md     ← این فایل
```
میزبانی: **Netlify** (یا GitHub Pages)

### ریپازیتوری `esm-famil-server` (بک‌اند)
```
index.js       ← سرور Socket.io
package.json   ← وابستگی‌ها
```
میزبانی: **Render.com** (رایگان)

---

## 🛠️ نصب و راه‌اندازی

### قدم ۱: سرور (Render.com)
1. برو [render.com](https://render.com) و وارد شو
2. **New → Web Service** بساز
3. ریپازیتوری `esm-famil-server` رو وصل کن
4. تنظیمات:
   - **Build Command:** `npm install`
   - **Start Command:** `node index.js`
   - **Environment:** Node
5. Deploy کن و آدرس رو کپی کن (مثلاً: `https://esm-famil-server.onrender.com`)

### قدم ۲: فرانت‌اند (Netlify)
1. برو [netlify.com](https://netlify.com) و وارد شو
2. **Add new site → Import from Git**
3. ریپازیتوری `esm-famil` رو وصل کن
4. Deploy کن

### قدم ۳: آدرس سرور رو تنظیم کن
توی `index.html` این خط رو پیدا کن:
```javascript
let SERVER_URL = 'https://esm-famil-server.onrender.com';
```
آدرس Render خودت رو بذار.

### قدم ۴: Firebase (اختیاری — برای لاگین و تاریخچه)
1. برو [console.firebase.google.com](https://console.firebase.google.com)
2. **Add Project** بساز
3. **Authentication** رو فعال کن:
   - Sign-in method → Google ✅
   - Sign-in method → Apple ✅ (نیاز به Apple Developer)
   - Sign-in method → Email/Password ✅
4. **Firestore Database** بساز
5. **Project Settings → General → Your Apps → Web App** ثبت کن
6. مقادیر config رو کپی کن و توی `index.html` بذار:
```javascript
const FIREBASE_CONFIG = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```
7. توی Firestore **Rules** رو تنظیم کن:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/games/{gameId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## ⚠️ نکات مهم
- **Render رایگان** بعد از ۱۵ دقیقه بی‌کاری sleep می‌شه → بیدار شدن ۳۰-۵۰ ثانیه طول می‌کشه
- اگه سرور sleep بود، صبر کن یا یه بار صفحه رو رفرش کن
- Firebase اختیاریه — بدون اون هم بازی کار می‌کنه (فقط لاگین و تاریخچه فعال نیست)

---

ساخته شده با ❤️
