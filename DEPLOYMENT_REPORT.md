# تقرير النشر والإصلاح (Deployment Report)

## الملفات التي عُدّلت

| الملف | التعديل |
|-------|---------|
| `backend/.env` | تعيين `PORT=3000`, `NODE_ENV=production`, `HOST=0.0.0.0`, `CORS_ORIGIN=http://187.124.20.147:4173` مع الإبقاء على إعدادات DB |
| `frontend/.env.production` | `VITE_API_BASE_URL=http://187.124.20.147:3000` (يُحوّل تلقائياً إلى …/api) |
| `frontend/src/utils/apiConfig.ts` | توحيد منطق قاعدة الـ API: دالة `ensureApiSuffix`، قراءة `VITE_API_BASE_URL`، إضافة `/api` عند الحاجة، fallback `/api` |
| `DEBUG_BEFORE_FIX.md` | (جديد) تشخيص قبل الإصلاح |
| `start-production.sh` | (جديد) سكربت تشغيل إنتاج: pm2 للـ backend، بناء frontend، serve على 4173 |
| `health-check.sh` | (جديد) فحص المنفذ 3000 ووجود POST /api/auth/login ووجود frontend/dist |

## سبب المشكلة

1. **CORS:** في الإنتاج كان `CORS_ORIGIN` مضبوطاً على localhost فقط، فالمتصفح يرفض استجابة طلبات من `http://187.124.20.147:4173` → **Failed to fetch**.
2. **عنوان API:** `frontend/.env.production` كان يشير إلى IP قديم (`69.169.108.182`)، فطلبات Login والـ API تذهب لعنوان خاطئ أو غير متاح.
3. **NODE_ENV:** الـ backend كان يعمل كـ development فمنطق CORS والسماح بالأصول لم يكن مطابقاً لبيئة السيرفر.

## ما الذي تم إصلاحه

- ضبط **backend/.env** للإنتاج مع `CORS_ORIGIN=http://187.124.20.147:4173` حتى يسمح الـ backend بطلبات الواجهة على المنفذ 4173.
- ضبط **frontend/.env.production** لاستخدام `VITE_API_BASE_URL=http://187.124.20.147:3000` بحيث تكون كل طلبات الـ API (بما فيها Login) إلى السيرفر الحالي.
- توحيد **apiConfig.ts** لضمان أن أي قيمة لـ `VITE_API_BASE_URL` (مع أو بدون `/api`) تُحوّل إلى base URL تنتهي بـ `/api` دون تكرار.
- إضافة سكربت **start-production.sh** لتشغيل الـ backend بـ pm2 وبناء الـ frontend وتشغيل serve على 4173.
- إضافة **health-check.sh** للتحقق من المنفذ 3000 ووجود endpoint تسجيل الدخول ووجود مجلد `dist`.

---

## القيم النهائية المهمة

| البند | القيمة |
|-------|--------|
| **Frontend URL** | http://187.124.20.147:4173 |
| **Backend URL** | http://187.124.20.147:3000 |
| **API Base** | http://187.124.20.147:3000/api |
| **Login endpoint** | POST http://187.124.20.147:3000/api/auth/login |
| **CORS allowed origin** | http://187.124.20.147:4173 |

---

## أوامر التشغيل النهائية

```bash
# من جذر المشروع (المجلد الذي فيه backend/ و frontend/)

# تشغيل كامل إنتاج (backend + build frontend + serve على 4173)
chmod +x start-production.sh
./start-production.sh

# أو يدوياً:
cd backend && npm install && pm2 delete backend || true && pm2 start server.js --name backend
cd ../frontend && npm install && npm run build
cd frontend && pm2 start npx --name frontend -- serve -s dist -l 4173
```

---

## أوامر الفحص النهائية

```bash
# فحص صحة الخدمات ووجود البناء
chmod +x health-check.sh
./health-check.sh

# فحص الـ backend مباشرة
curl -s http://127.0.0.1:3000/health

# فحص endpoint تسجيل الدخول (يتوقع 400/401 عند إرسال بيانات غير صحيحة)
curl -s -X POST http://127.0.0.1:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'
```

---

## ملاحظات

- تأكد أن منفذ **3000** و **4173** مفتوحان في الجدار الناري على السيرفر إن لزم.
- إذا غيّرت عنوان أو منفذ الواجهة، حدّث `CORS_ORIGIN` في `backend/.env` و `VITE_API_BASE_URL` في `frontend/.env.production` ثم أعد بناء الـ frontend (`npm run build`).
