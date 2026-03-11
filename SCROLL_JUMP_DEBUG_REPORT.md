# SCROLL JUMP DEBUG REPORT

تقرير تشخيص: "عندما أقوم بالسكرول إلى الأسفل، الصفحة ترجع وحدها إلى الأعلى."

---

# 1) Problem Summary

- **الوصف:** المستخدم يمرّر الصفحة للأسفل ثم تُعاد تلقائياً للأعلى (scroll jump).
- **متى تظهر حسب الكود المحتمل:** أثناء التمرير على الصفحة الرئيسية (Index) أو أي صفحة تحتوي الهيدر؛ أو بعد ثوانٍ من التحميل (مثلاً 300ms أو 1000ms أو كل 4 ثوانٍ) عند حدوث تحديث حالة في مكونات الصفحة.
- **مصدر محتمل:**
  1. **منطق السكرول في الهيدر:** استماع لحدث `scroll` وتحديث state (`isMobileHeaderVisible`) في كل تمرير → إعادة رسم متكررة قد تؤدي إلى تغيير layout (ظهور/إخفاء الهيدر) وبالتالي قفزة أو إعادة موضع التمرير.
  2. **إعادة رسم/إعادة تركيب:** تحديث state في Context (مثل SearchContext) أو بعد `invalidateQueries` في React Query يسبب إعادة رسم شجرة كبيرة؛ إذا ترافق مع تغيّر في ارتفاع المحتوى أو في ترتيب العناصر قد يُحسّ المستخدم برجوع الصفحة.
  3. **لا يوجد في الكود:** لا وُجد استدعاء صريح لـ `scrollTo(0,0)` أو `scrollIntoView` أو تغيير `scrollTop` في frontend؛ المشكلة على الأرجح غير ناتجة عن "استدعاء مباشر لتمرير للأعلى" بل عن **تأثير جانبي لإعادة الرسم أو تغيّر الـ layout**.

---

# 2) High-Risk Files

| File path | Why suspicious | Priority |
|-----------|----------------|----------|
| `frontend/src/components/Header.tsx` | يستمع لـ `scroll` ويستدعي `setIsMobileHeaderVisible` حسب `window.scrollY`؛ كل تغيير state يعيد رسم الهيدر وقد يغيّر ارتفاعه أو موضعه (sticky)، مما قد يزعزع موضع التمرير. | **High** |
| `frontend/src/contexts/SearchContext.tsx` | يستخدم `useLocation` و `useEffect` يعتمد على `location.search` وواحد آخر على `searchQuery` مع debounce 300ms؛ تحديث state (نتائج البحث، الاقتراحات) يعيد رسم كل الأطفال تحت `SearchProvider` وربما يؤثر على الصفحة الرئيسية إن كان البحث مفتوحاً أو الـ URL يتغيّر. | **High** |
| `frontend/src/App.tsx` | يستمع لـ `subcategories-updated` و `categories-updated` ويستدعي `queryClient.invalidateQueries`؛ أي مكون يستخدم هذه الاستعلامات يعيد جلب البيانات وإعادة الرسم، وقد يغيّر ارتفاع المحتوى (مثلاً FamilleSection، PromotionsSection). | **High** |
| `frontend/src/components/HeroSection.tsx` | `setInterval` كل 4 ثوانٍ يحدّث `currentImageIndex` و `isTransitioning`؛ و`setTimeout(apply, 300)` و `1000` في useEffect للـ admin؛ تحديثات state متكررة قد تسبب إعادة رسم وتغيّر ارتفاع أو layout في الـ Hero. | **Medium** |
| `frontend/src/components/PromotionsSection.tsx` | `useQuery` مع `staleTime: 0` وعدة `invalidateQueries` بعد mutations؛ إعادة جلب العروض تحدث إعادة رسم قد تغيّر ارتفاع القسم. | **Medium** |
| `frontend/src/components/home/FamilleSection.tsx` | `useLocation`, `useNavigate`, و`useEffect` يزامن `famillesState` مع `familles`؛ و`window.dispatchEvent('famillesUpdated')` قد يطلق أحداثاً في App ثم invalidateQueries. | **Medium** |
| `frontend/src/pages/Index.tsx` | ترتيب الأقسام: PromotionsSection، FamilleSection، BrandsSection، HeroSection، EauEtAdditifSection؛ أي تغيير ارتفاع أو إعادة mount لأحدها قد يبدو كـ "قفزة" للمستخدم. | **Low** |
| `frontend/src/index.css` | `html { scroll-behavior: smooth; }` — لا يسبب القفزة بذاته لكنه قد يجعل أي حدث يغيّر موضع التمرير يبدو كـ "رجوع سلس للأعلى". | **Low** |

---

# 3) Detected Scroll-Related Code

| الملف | السطر | Snippet | لماذا قد يسبب الرجوع للأعلى |
|-------|-------|---------|-----------------------------|
| `frontend/src/components/Header.tsx` | 19–50 | `const handleScroll = () => { ... const currentScrollY = window.scrollY; ... if (delta > 0) { if (isMobileHeaderVisible) setIsMobileHeaderVisible(false); } else { if (!isMobileHeaderVisible) setIsMobileHeaderVisible(true); } lastScrollY.current = currentScrollY; }; window.addEventListener("scroll", handleScroll, { passive: true });` | كل مرة يتغيّر فيها الاتجاه أو العتبة يُستدعى setState → إعادة رسم الهيدر؛ إن كان الهيدر sticky ويتغيّر ارتفاعه أو يختفي/يظهر (موبايل) يتغيّر layout الصفحة وقد "يقفز" الموضع. |
| `frontend/src/components/Header.tsx` | 25–26 | `const currentScrollY = window.scrollY;` | قراءة موضع التمرير فقط؛ المشكلة من setState المرتبط به وليس من القراءة بذاتها. |
| `frontend/src/index.css` | 944–947 | `html { scroll-behavior: smooth; }` | أي سبب آخر يغيّر الموضع (مثلاً focus أو إعادة رسم) سيظهر كتمرير "سلس" للأعلى. |
| `frontend/src/components/PromotionsSection.tsx` | 772 | `className="... overflow-x-auto ... scroll-smooth ..."` | سكرول أفقي داخل القسم فقط؛ غير مرجّح أن يسبب رجوع الصفحة العمودي للأعلى. |

**ملاحظة:** لم يُعثر على أي استدعاء لـ `window.scrollTo`, `scrollIntoView`, `document.documentElement.scrollTop`, أو `element.scrollTop = ...` في المشروع.

---

# 4) Detected Navigation / Route Change Logic

| الملف | الوصف | هل يعيد تعيين السكرول؟ |
|-------|--------|-------------------------|
| `frontend/src/App.tsx` | `BrowserRouter`, `Routes`, `Route`, `Navigate` (لـ `/admin/products` → redirect). لا يوجد مكوّن مثل `ScrollRestoration` أو "scroll to top on route change". | لا يوجد كود صريح لإعادة السكرول عند تغيّر المسار. |
| `frontend/src/contexts/SearchContext.tsx` | `useNavigate()`, `useLocation()`, `location.pathname`, `location.search`. في `setSearchQuery` و `clearSearch`: `navigate(\`${location.pathname}?${params.toString()}\`, { replace: true })`. | لا يستدعي scrollTo؛ لكن استدعاء `navigate(..., { replace: true })` يغيّر الـ URL وقد يثير إعادة رسم؛ إن كان المستخدم على الصفحة الرئيسية ويردّ البحث من الهيدر قد يتغيّر شيء في الشجرة. |
| `frontend/src/components/home/FamilleSection.tsx` | `useNavigate()`, `useLocation()` — تُستخدمان للتنقل وربما لبناء روابط. | لا يوجد كود يضبط السكرول عند تغيّر المسار. |

**الاستنتاج:** لا يوجد منطق "عند تغيّر الـ route نصلّح السكرول إلى الأعلى"؛ المشكلة على الأرجح ليست من تغيّر الـ route بحد ذاته بل من **إعادة رسم أو تغيّر محتوى** أثناء البقاء على نفس الصفحة.

---

# 5) Detected Re-render / Re-mount Risks

| النوع | الملف / الموقع | التفاصيل |
|-------|-----------------|----------|
| **Event-driven cache invalidation** | `frontend/src/App.tsx` (73–106) | `window.addEventListener('subcategories-updated' | 'categories-updated')` و `BroadcastChannel` → `queryClient.invalidateQueries(['subcategories'])` أو `['categories']`. أي مكون يستهلك هذه الاستعلامات يعيد الجلب وإعادة الرسم. |
| **useEffect مع location.search** | `frontend/src/contexts/SearchContext.tsx` (243–259) | `useEffect(..., [location.search])`: عند تغيّر query يطلق `performSearch` ويحدّث `searchQueryState` ونتائج البحث → إعادة رسم. |
| **useEffect مع searchQuery و debounce** | `frontend/src/contexts/SearchContext.tsx` (262–271) | `useEffect` يعتمد على `searchQuery` مع `setTimeout(..., 300)` ثم `performSearch` و `getSuggestions` → تحديث state متعدد → إعادة رسم. |
| **Scroll listener مع setState** | `frontend/src/components/Header.tsx` (14–51) | `useEffect(..., [isMobileHeaderVisible])`: عند كل scroll يتغيّر فيه اتجاه التمرير أو العتبة يُستدعى `setIsMobileHeaderVisible` → إعادة رسم الهيدر. |
| **setInterval في HeroSection** | `frontend/src/components/HeroSection.tsx` (152–164) | `setInterval(..., 4000)` يحدّث `setCurrentImageIndex` و `setIsTransitioning` → إعادة رسم كل 4 ثوانٍ. |
| **setTimeout في HeroSection** | `frontend/src/components/HeroSection.tsx` (115–117) | `setTimeout(apply, 300)` و `setTimeout(apply, 1000)` حيث `apply` تستدعي `setIsAdmin(...)` → إعادة رسم عند 300ms و 1000ms. |
| **لا key ديناميكي على الصفحة** | `frontend/src/App.tsx` | لا يوجد `key={location.pathname}` أو `key={...}` على `Routes` أو `Index`؛ لا إعادة mount كاملة للصفحة بسبب key. |

---

# 6) Home Page Specific Risks

- **الصفحة الرئيسية:** `frontend/src/pages/Index.tsx` — تعرض بالترتيب: `Header`, `PromotionsSection`, `FamilleSection`, `BrandsSection`, `HeroSection`, `EauEtAdditifSection`, `Footer`.
- **مكونات تعتمد على API/Query وتحدّث نفسها بعد التحميل:**
  - **PromotionsSection:** `useQuery(["promotions"], getPromotions, { staleTime: 0 })` — يمكن إعادة جلب متكرر؛ وعند نجاح mutation يُستدعى `invalidateQueries(["promotions"])` فتُحدَّث القائمة وربما يتغيّر ارتفاع القسم.
  - **FamilleSection:** يعتمد على `useFamilles` (بيانات من API) و`useQuery(["category-status"])`؛ و`useEffect` يزامن `famillesState` مع `familles`؛ وعند حفظ التغييرات يُطلق `famillesUpdated` الذي في App يسبّب `invalidateQueries` للـ categories/subcategories → إعادة رسم في أكثر من مكوّن.
  - **HeroSection:** جلب محتوى الـ hero في useEffect ثم `setInterval` للـ carousel → تحديثات دورية.
  - **EauEtAdditifSection:** `useQuery` لـ `eau_additif`, `cat3_pages`, `orders` مع `staleTime: 0` — إمكانية إعادة جلب وتحديث.
- **لا carousel/slider في Index يغيّر ارتفاع الصفحة بشكل واضح**؛ الـ carousel داخل PromotionsSection أفقي، والـ Hero له ارتفاع ثابت تقريباً. الخطر الأكبر من **تغيّر ارتفاع الأقسام عند وصول بيانات جديدة** أو **إعادة رسم الهيدر (ظهور/إخفاء على الموبايل)** مما يغيّر التخطيط الكلي ويُحسّ المستخدم أن الصفحة "رجعت للأعلى".

---

# 7) Most Likely Root Causes

1. **الهيدر وتحديث state عند كل scroll (Header.tsx)**  
   استماع لـ `scroll` واستدعاء `setIsMobileHeaderVisible` حسب `window.scrollY` يسبب إعادة رسم متكررة للهيدر. إن كان الهيدر sticky أو يتغيّر حجمه (إظهار/إخفاء على الموبايل)، تغيّر الـ layout يمكن أن يزعزع موضع التمرير أو يجعله يبدو وكأن الصفحة رجعت للأعلى.

2. **SearchContext وتحديث state عند تغيّر URL أو حقل البحث**  
   تغيّر `location.search` أو كتابة في حقل البحث (مع debounce 300ms) يطلق `performSearch` ويحدّث نتائج البحث والاقتراحات. لأن `SearchProvider` يلف كل التطبيق، تحديث state فيه يعيد رسم الشجرة؛ إن كان هناك تغيّر في ارتفاع المحتوى أو في عناصر قابلة للـ focus (مثلاً اقتراحات) قد يحدث قفزة أو رجوع ظاهري للسكرول.

3. **React Query invalidation بعد أحداث subcategories/categories**  
   عند إطلاق `subcategories-updated` أو `categories-updated` (مثلاً من FamilleSection بعد حفظ)، `App.tsx` يستدعي `invalidateQueries`؛ المكونات التي تعتمد على هذه الاستعلامات تعيد الجلب وتحديث الواجهة؛ إن تغيّر عدد أو ارتفاع العناصر (قوائم، أقسام) قد يتغيّر التخطيط ويُحسّ المستخدم برجوع الصفحة.

4. **تحديثات دورية في HeroSection (setInterval + setTimeout)**  
   كل 4 ثوانٍ تحديث صورة الـ hero، وعند 300ms و 1000ms تحديث حالة الـ admin؛ إعادة الرسم قد تغيّر layout قليلاً (مثلاً ارتفاع الصورة أو الـ overlay) وتؤثر على الموضع المحفوظ للسكرول.

5. **عدم وجود مكوّن ScrollRestoration وطريقة تعامل المتصفح مع focus**  
   لا يوجد كود يفرض "scroll to top" صراحة؛ لكن إن حدث focus لعنصر (مثلاً input في الهيدر أو في dropdown البحث) أو إعادة رسم كبير، المتصفح أحياناً يصلّح viewport لعنصر الـ focus أو للمحتوى الجديد، فيبدو كأن الصفحة رجعت للأعلى.

---

# 8) Exact Places ChatGPT Should Inspect First

1. **`frontend/src/components/Header.tsx` (حوالي السطور 14–51)**  
   منطق `handleScroll` و`setIsMobileHeaderVisible` وارتباطهما بإعادة رسم الهيدر وتغيّر الـ layout على الموبايل.

2. **`frontend/src/contexts/SearchContext.tsx` (حوالي 243–271 و 284–295)**  
   الـ useEffect التي تعتمد على `location.search` و`searchQuery` وكل استدعاء لـ `navigate(..., { replace: true })` أو تحديث نتائج البحث والاقتراحات.

3. **`frontend/src/App.tsx` (73–106)**  
   أحداث `subcategories-updated` و `categories-updated` واستدعاءات `queryClient.invalidateQueries` وأي مكون يستهلك استعلامات subcategories/categories.

4. **`frontend/src/components/HeroSection.tsx` (46–125 و 151–164)**  
   useEffect التي تستدعي `setIsAdmin` و`setTimeout(apply, 300/1000)` و`setInterval` للـ carousel.

5. **`frontend/src/index.css` (944–947)**  
   `scroll-behavior: smooth` على `html` ومدى تفاعله مع أي تغيّر لاحق في موضع التمرير.

---

# 9) Suggested Minimal Fix Directions

(بدون تنفيذ أي تعديل — اقتراحات فقط)

- **تعطيل مؤقت:** تعطيل منطق إظهار/إخفاء الهيدر على السكرول في `Header.tsx` (إزالة أو تعليق الـ useEffect الذي يضيف `scroll` listener و`setIsMobileHeaderVisible`) ثم اختبار إن كان القفز يختفي.
- **ما الذي يجب اختباره أولاً:** على الصفحة الرئيسية، التمرير للأسفل والانتظار بضع ثوانٍ؛ ثم تكرار التجربة مع فتح/إغلاق قائمة البحث أو تغيير حجم النافذة لاختبار إن كان الهيدر (موبايل) هو السبب.
- **تقليل إعادة الرسم من السكرول:** في Header، تجربة تخزين "اتجاه السكرول" أو "ظهور الهيدر" في ref بدل state حيثما أمكن، أو استخدام throttle على استدعاء setState حتى لا يُستدعى عند كل حدث scroll.
- **تقليل تأثير invalidateQueries:** مراجعة ما إذا كان إطلاق `subcategories-updated` / `categories-updated` ضرورياً فور حفظ FamilleSection؛ أو تأجيل الـ invalidation أو تقييده بالمكونات التي تحتاج فعلاً إلى تحديث.
- **إن ثبت أن السبب من SearchContext:** تقليل التحديثات التي تعيد رسم الصفحة بأكملها (مثلاً عدم تحديث نتائج البحث على الصفحة الرئيسية إلا عند الدخول لصفحة البحث)، أو عزل state الاقتراحات بحيث لا يعيد رسم المحتوى الرئيسي.

---

# 10) Quick Search Results Appendix

نتائج البحث النصية المختصرة لأهم الكلمات:

- **scrollTo:** لا توجد نتائج في `frontend/src`.
- **scrollIntoView:** لا توجد نتائج في `frontend/src`.
- **scrollTop / window.scroll:** وُجد استخدام `window.scrollY` في `frontend/src/components/Header.tsx` داخل `handleScroll` (قراءة فقط، لا تعيين).
- **useLocation:** `frontend/src/contexts/SearchContext.tsx` (استيراد واستخدام `location.search`, `location.pathname`); `frontend/src/components/home/FamilleSection.tsx` (استيراد `useLocation`).
- **useNavigate / navigate(:** `frontend/src/contexts/SearchContext.tsx` (`navigate(...)` في `setSearchQuery` و `clearSearch`); `frontend/src/components/PromotionsSection.tsx` (استيراد `useNavigate`); `frontend/src/components/home/FamilleSection.tsx` (استيراد `useNavigate`); وصفحات أخرى للتنقل.
- **key=:** وُجد `key={brand.name}` في `frontend/src/components/BrandsSection.tsx` داخل map؛ لا يوجد `key={location.pathname}` أو key ديناميكي على مستوى الصفحة أو Routes في الملفات المفحوصة.
- **location.reload:** لا توجد نتائج في `frontend/src`.
- **setInterval:** `frontend/src/components/HeroSection.tsx` — `setInterval` كل 4000ms لتحديث صورة الـ hero.
- **setTimeout:** `frontend/src/App.tsx` (لا scroll); `frontend/src/contexts/SearchContext.tsx` (debounce 300ms); `frontend/src/components/HeroSection.tsx` (300ms, 1000ms, 250ms); `frontend/src/components/PromotionsSection.tsx` (1000ms, 300ms).
- **addEventListener('scroll':** `frontend/src/components/Header.tsx` — `window.addEventListener("scroll", handleScroll, { passive: true })`.

---

*تم إنشاء التقرير دون تعديل أي كود. المسارات أعلاه نسبية من جذر المشروع الذي يحتوي على `frontend/` و `backend/` (مجلد المشروع الفعلي).*
