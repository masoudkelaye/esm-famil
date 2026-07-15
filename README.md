# 🎮 بازی اسم فامیل آنلاین

بازی چند نفره اسم فامیل به صورت آنلاین — با طراحی مدرن، ریاکشن‌ها و امکانات میزبان.

## 🚀 نسخه ۴.۱

### ویژگی‌ها

**ورود و حساب کاربری:**
- 🔐 ورود با گوگل (Google Auth)
- 👤 ورود به عنوان مهمان (بدون نیاز به ثبت‌نام)
- 📊 ذخیره تاریخچه بازی‌ها و امتیازات (Firebase)
- 💾 ماندگاری لاگین بعد از رفرش صفحه

**بازی آنلاین:**
- 🌐 بازی چند نفره آنلاین (۲ تا ۸ نفر)
- 📤 دعوت دوستان با لینک (واتساپ، تلگرام، پیامک)
- 📱 QR کد برای دعوت سریع
- 🚪 ورود مستقیم از لینک (بدون نیاز به کد)

**امکانات میزبان:**
- ✏️ ویرایش امتیازات بعد از هر دور
- ⏭ حذف موقت بازیکن (فقط یک راند — راند بعد برمی‌گرده)
- ⏩ شروع راند بعد بدون تأیید همه
- ⚙️ تنظیم زمان، تعداد دور و دسته‌بندی‌ها

**امکانات بازیکن:**
- 🎭 ریاکشن‌ها (👍 ❤️ 😂 😡 😢 🔥) با انیمیشن شناور
- ✅ سیستم آماده‌باش برای راند بعد
- 📋 دسته‌بندی‌های پیش‌فرض + دلخواه

**فنی:**
- 📱 PWA تمام صفحه (قابل نصب روی گوشی)
- 📐 Responsive — بهینه برای موبایل، تبلت، لپ‌تاپ و مانیتور بزرگ
- 🎨 طراحی مدرن Dark Theme با انیمیشن‌های جذاب
- ✨ ذرات متحرک پس‌زمینه (Particles)
- 🔢 امتیازدهی: **۱۰** (جواب یکتا) و **۵** (جواب مشترک)
- 🔄 اتصال مجدد خودکار (Reconnection)
- 📡 Grace Period ۶۰ ثانیه‌ای هنگام قطع اتصال

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
میزبانی: **Vercel** (اتوماتیک با هر push)

### ریپازیتوری `esm-famil-server` (بک‌اند)
```
index.js       ← سرور Socket.io
package.json   ← وابستگی‌ها
```
میزبانی: **Render.com** (رایگان)

---

## 🛠️ نصب و راه‌اندازی

### قدم ۱: سرور (Render.com)
1. برو [render.com](https://render.com) و با GitHub وارد شو
2. **New → Web Service** بساز
3. ریپازیتوری `esm-famil-server` رو وصل کن
4. تنظیمات:
   - **Build Command:** `npm install`
   - **Start Command:** `node index.js`
   - **Environment:** Node
5. Deploy کن و آدرس رو کپی کن (مثلاً: `https://esm-famil-server.onrender.com`)

### قدم ۲: فرانت‌اند (Vercel)
1. برو [vercel.com](https://vercel.com) و با GitHub وارد شو
2. **Add New Project** بزن
3. ریپازیتوری `esm-famil` رو انتخاب کن
4. Framework Preset: **Other**
5. **Deploy** بزن
6. آدرس سایت آماده‌ست! (مثلاً: `https://esm-famil-chi.vercel.app`)

### قدم ۳: آدرس سرور رو تنظیم کن
توی `index.html` این خط رو پیدا کن:
```javascript
let SERVER_URL = 'https://esm-famil-server.onrender.com';
```
آدرس Render خودت رو بذار.

### قدم ۴: Firebase (برای لاگین و تاریخچه)
1. برو [console.firebase.google.com](https://console.firebase.google.com)
2. **Add Project** بساز
3. **Authentication** رو فعال کن:
   - Sign-in method → **Google** ✅
   - Sign-in method → **Anonymous** ✅ (برای ورود مهمان)
4. **Firestore Database** بساز
5. **Project Settings → General → Your Apps → Web App** ثبت کن
6. مقادیر config رو کپی کن و توی `index.html` جایگزین کن:
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
7. توی Authentication → **Settings → Authorized domains** آدرس Vercel رو اضافه کن
8. توی Firestore **Rules** رو تنظیم کن:
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

## 🔌 Socket.io Events

### کلاینت → سرور:
| Event | توضیح |
|---|---|
| `create_room` | ساخت اتاق |
| `join_room` | ورود به اتاق |
| `rejoin_room` | بازگشت بعد از قطع اتصال |
| `start_game` | شروع بازی (میزبان) |
| `submit_answers` | ثبت جواب‌ها |
| `edit_scores` | ویرایش امتیازات (میزبان) |
| `next_round` | راند بعدی (میزبان) |
| `finish_game` | پایان بازی (میزبان) |
| `skip_player` | حذف موقت بازیکن (میزبان) |
| `send_reaction` | ارسال ریاکشن |
| `player_ready` | آماده برای راند بعد |
| `leave_room` | ترک اتاق |

### سرور → کلاینت:
| Event | توضیح |
|---|---|
| `room_created` | اتاق ساخته شد |
| `room_joined` | وارد اتاق شد |
| `room_update` | بروزرسانی اتاق |
| `game_started` | بازی شروع شد |
| `new_round` | راند جدید |
| `round_results` | نتایج راند |
| `scores_updated` | امتیازات ویرایش شد |
| `game_finished` | بازی تمام شد |
| `answers_progress` | وضعیت جواب‌ها |
| `reaction_received` | ریاکشن دریافت شد |
| `ready_update` | وضعیت آماده‌باش |
| `player_skipped` | بازیکن رد شد |
| `player_disconnected` | بازیکن قطع شد |

---

## ⚠️ نکات مهم
- **Render رایگان** بعد از ۱۵ دقیقه بی‌کاری sleep می‌شه → بیدار شدن ۳۰-۵۰ ثانیه طول می‌کشه
- بازی شمارش معکوس ۵۰ ثانیه‌ای داره + دکمه تلاش مجدد
- Firebase اختیاریه — بدون اون فقط ورود مهمان فعاله
- Grace Period ۶۰ ثانیه‌ای: اگه بازیکن وسط بازی قطع بشه، ۶۰ ثانیه فرصت بازگشت داره

---

ساخته شده با ❤️
