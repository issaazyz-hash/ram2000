# تشخيص سريع قبل الإصلاح

## ما تم فحصه

| العنصر | النتيجة |
|--------|---------|
| **Backend entrypoint** | `backend/server.js` |
| **منفذ Backend** | من `config/app.js` → `process.env.PORT`، الافتراضي **3000** |
| **ملف Login في Frontend** | `frontend/src/pages/Login.tsx` |
| **ملف مساعد API base URL** | `frontend/src/utils/apiConfig.ts` (`getApiBaseUrl`) + `frontend/src/config/api.ts` (يعتمد عليه) |
| **Frontend يستخدم** | **fetch** في Login و database.ts؛ **axios** في `services/api.ts` (كلاهما يعتمد على `getApiBaseUrl()`) |

## أين الخلل

1. **Backend .env:** كان مضبوطًا للتطوير (`NODE_ENV=development`, `CORS_ORIGIN=localhost:8080,5173`). في الإنتاج على السيرفر 187.124.20.147 لا يسمح CORS بأصل الواجهة (4173) فيُرفض الطلب → **Failed to fetch**.
2. **Frontend .env.production:** كان يحتوي IP قديم (`69.169.108.182:3000`) بدل عنوان السيرفر الحالي، فطلبات الـ API تذهب لعنوان خاطئ أو غير متاح.
3. **تضارب:** الواجهة على `http://187.124.20.147:4173` والـ API على `:3000`؛ بدون `CORS_ORIGIN=http://187.124.20.147:4173` المتصفح يمنع الاستجابة.

## سبب Failed to fetch

- **CORS:** في production الـ backend يسمح فقط بالأصول المذكورة في `CORS_ORIGIN`. عدم تضمين `http://187.124.20.147:4173` يؤدي لرفض preflight/request من المتصفح → Failed to fetch.
- **عنوان API خاطئ:** إن كان البناء استخدم `.env.production` القديم، الطلبات تذهب لـ 69.169.108.182 بدل 187.124.20.147.

## الملفات التي ستُعدّل

| الملف | التعديل |
|-------|---------|
| `backend/.env` | تعيين PORT=3000, NODE_ENV=production, HOST=0.0.0.0, CORS_ORIGIN=http://187.124.20.147:4173 مع الحفاظ على DB_* وغيرها |
| `frontend/.env.production` | VITE_API_BASE_URL=http://187.124.20.147:3000 |
| `frontend/src/utils/apiConfig.ts` | توحيد وتنظيف منطق إضافة /api (المنطق الحالي صحيح، تحسين بسيط فقط) |
| `start-production.sh` (جديد) | سكربت تشغيل إنتاج: pm2 backend + build frontend + serve على 4173 |
| `health-check.sh` (جديد) | فحص المنفذ 3000 و /api/auth/login ووجود dist |
| `DEPLOYMENT_REPORT.md` (جديد) | تقرير نهائي بعد الإصلاح |

ملاحظة: Login و backend auth route و CORS logic كانت صحيحة؛ التعديل فقط على القيم في .env والـ production env.
