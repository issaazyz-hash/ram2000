/**
 * 🔍 Fuzzy Search Utilities
 * خوارزمية البحث الذكي مع تطبيع النص المحسّن
 */

/**
 * تطبيع النص بشكل كامل:
 * - تحويل لأحرف صغيرة
 * - إزالة الحركات (accents)
 * - إزالة المسافات الزائدة
 * - إزالة الرموز الخاصة
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD') // تحويل إلى Unicode NFD (Normalization Form Decomposed)
    .replace(/[\u0300-\u036f]/g, '') // إزالة الحركات (diacritics)
    .replace(/\s+/g, ' ') // استبدال المسافات المتعددة بمسافة واحدة
    .replace(/[^\w\s\u0600-\u06FF]/g, '') // إزالة الرموز الخاصة (مع دعم العربية)
    .trim();
}

/**
 * حساب Levenshtein Distance بين نصين
 * المسافة = عدد التغييرات المطلوبة لتحويل نص إلى آخر
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);
  const len1 = s1.length;
  const len2 = s2.length;
  
  if (len1 === 0) return len2;
  if (len2 === 0) return len1;
  
  // إنشاء مصفوفة لحساب المسافات
  const matrix: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));
  
  // تهيئة الصف الأول والعمود الأول
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  
  // حساب المسافة
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // حذف
        matrix[i][j - 1] + 1,       // إدراج
        matrix[i - 1][j - 1] + cost // استبدال
      );
    }
  }
  
  return matrix[len1][len2];
}

/**
 * حساب نسبة التشابه بين نصين (0-1)
 * 1 = تطابق تام، 0 = لا يوجد تطابق
 */
export function similarity(str1: string, str2: string): number {
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  
  const distance = levenshteinDistance(s1, s2);
  return 1 - distance / maxLen;
}

/**
 * التحقق من وجود تطابق جزئي
 */
export function partialMatch(text: string, query: string): boolean {
  const textNormalized = normalizeText(text);
  const queryNormalized = normalizeText(query);
  return textNormalized.includes(queryNormalized);
}

/**
 * التحقق من تطابق في البداية
 */
export function startsWithMatch(text: string, query: string): boolean {
  const textNormalized = normalizeText(text);
  const queryNormalized = normalizeText(query);
  return textNormalized.startsWith(queryNormalized);
}

/**
 * حساب درجة المطابقة (0-100)
 */
export function calculateMatchScore(
  text: string,
  query: string,
  field: 'name' | 'brand' | 'category' | 'sku'
): { score: number; matchType: 'exact' | 'partial' | 'fuzzy' } {
  const textNormalized = normalizeText(text);
  const queryNormalized = normalizeText(query);
  
  if (!textNormalized || !queryNormalized) {
    return { score: 0, matchType: 'fuzzy' };
  }
  
  // تطابق تام
  if (textNormalized === queryNormalized) {
    return { score: 100, matchType: 'exact' };
  }
  
  // تطابق في البداية
  if (textNormalized.startsWith(queryNormalized)) {
    // إعطاء نقاط إضافية للحقول المهمة
    const fieldBonus = field === 'name' ? 5 : field === 'brand' ? 3 : 0;
    return { score: Math.min(100, 100 + fieldBonus), matchType: 'exact' };
  }
  
  // تطابق جزئي
  if (textNormalized.includes(queryNormalized)) {
    const sim = similarity(textNormalized, queryNormalized);
    const baseScore = 70;
    const similarityBonus = sim * 20; // حتى 20 نقطة إضافية
    const fieldBonus = field === 'name' ? 5 : field === 'brand' ? 3 : 0;
    return { 
      score: Math.min(100, baseScore + similarityBonus + fieldBonus), 
      matchType: 'partial' 
    };
  }
  
  // Fuzzy match
  const sim = similarity(textNormalized, queryNormalized);
  if (sim >= 0.8) {
    // تطابق جيد (>80%)
    const fieldBonus = field === 'name' ? 5 : field === 'brand' ? 3 : 0;
    return { 
      score: Math.min(100, 50 + (sim - 0.8) * 250 + fieldBonus), 
      matchType: 'fuzzy' 
    };
  } else if (sim >= 0.6) {
    // تطابق متوسط (60-80%)
    const fieldBonus = field === 'name' ? 3 : field === 'brand' ? 2 : 0;
    return { 
      score: Math.min(100, 20 + (sim - 0.6) * 150 + fieldBonus), 
      matchType: 'fuzzy' 
    };
  }
  
  // لا يوجد تطابق
  return { score: 0, matchType: 'fuzzy' };
}

/**
 * تنظيف نص البحث (للتوافق مع الكود القديم)
 * يستخدم normalizeText الآن
 */
export function cleanQuery(query: string): string {
  return normalizeText(query);
}
