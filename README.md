# اسم فامیل آنلاین 🎮

یه بازی آنلاین چند نفره اسم فامیل برای آیفون و اندروید

## نحوه اجرا

### پیش‌نیازها
- Flutter SDK (آخرین نسخه پایدار)
- Firebase account و پروژه جدید

### مراحل

1. **پروژه Firebase بساز**
   - برو به [Firebase Console](https://console.firebase.google.com/)
   - پروژه جدید بساز
   - Realtime Database رو فعال کن
   - فایل‌های `google-services.json` (اندروید) و `GoogleService-Info.plist` (iOS) رو دانلود کن
   - بذارشون توی پوشه‌های مربوطه

2. **تنظیمات Firebase رو عوض کن**
   - فایل `lib/main.dart` رو باز کن
   - مقادیر `YOUR_API_KEY`, `YOUR_APP_ID` و... رو با مقادیر خودت عوض کن

3. **ریپازیتوری‌ها رو بگیر**
   ```bash
   flutter pub get
   ```

4. **اپلیکیشن رو اجرا کن**
   ```bash
   flutter run
   ```

## ساختار پروژه

```
lib/
├── main.dart                    # نقطه شروع اپ
├── models/
│   ├── category.dart            # دسته‌بندی‌ها
│   └── game_state.dart          # وضعیت بازی
├── providers/
│   ├── auth_provider.dart       # مدیریت کاربر
│   └── game_provider.dart       # مدیریت بازی
├── screens/
│   ├── home_screen.dart         # صفحه اصلی
│   ├── room_screen.dart         # اتاق بازی
│   ├── game_screen.dart         # صفحه بازی
│   ├── results_screen.dart      # نتایج
│   ├── settings_screen.dart     # تنظیمات
│   └── category_select_screen.dart  # انتخاب دسته‌بندی
└── services/
    └── database_service.dart    # ارتباط با Firebase
```

## قابلیت‌ها

✅ بازی تک‌نفره (آفلاین)
✅ ساخت اتاق آنلاین
✅ ورود به اتاق با کد
✅ تایمر شمارش معکوس
✅ ۱۰ دسته‌بندی مختلف
✅ انتخاب دسته‌بندی دلخواه
✅ امتیازدهی خودکار
✅ نتایج هر دور
✅ پشتیبانی از چند بازیکن

## قوانین بازی

- حرف انتخاب می‌شه
- هر بازیکن باید برای هر دسته‌بندی یه کلمه بنویسه
- جواب یکتا = ۲۰ امتیاز
- جواب مشترک = ۱۰ امتیاز
- بدون جواب = ۰ امتیاز

## توسعه

برای اضافه کردن قابلیت‌های بیشتر:
1. فونت‌های جدید
2. تم‌های مختلف
3. آواتار
4. لیدربورد
5. چت درون بازی
