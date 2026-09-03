# اسم فامیل v4.4 — اعتبارسنجی با دیکشنری

## دیکشنری
- پکیج `an-array-of-persian-words` (~۲۴۰هزار واژه بر پایه دهخدا)
- امتیاز فقط اگر جواب با حرف دور شروع شود و در دیکشنری باشد
- یکتا = ۱۰، مشترک = ۵
- API: `GET /api/validate?word=سیب&letter=س`
- وضعیت: `GET /api/dict-status`

## دیپلوی سرور
```
npm install
npm start
```
روی Render بعد از پوش، یک بار Manual Deploy بزن تا `npm install` پکیج دیکشنری را بگیرد.

## فرانت
فقط `index.html` را روی Netlify جایگزین کن (اعتبارسنجی زنده از طریق API سرور).
