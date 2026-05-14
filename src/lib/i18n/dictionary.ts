/**
 * Centralised translation dictionary. Add new keys at the bottom of EACH
 * language object — they will fall back to the French value if the user's
 * Arabic dictionary doesn't have the key yet.
 *
 * Keep keys flat and namespaced by feature (e.g. "nav.home", "students.title")
 * to make it easy to grep + audit.
 */
export const fr = {
  // navigation
  "nav.home": "Accueil",
  "nav.classes": "Classes",
  "nav.students": "Élèves",
  "nav.homework": "Devoirs",
  "nav.canteen": "Cantine",
  "nav.schedule": "Horaires",
  "nav.payments": "Paiements",
  "nav.absences": "Absences",
  "nav.exams": "Examens",
  "nav.remedials": "Rattrapages",
  "nav.photos": "Photos",
  "nav.messages": "Messages",

  // common
  "common.create": "Créer",
  "common.cancel": "Annuler",
  "common.save": "Enregistrer",
  "common.delete": "Supprimer",
  "common.confirm": "Confirmer",
  "common.search": "Rechercher",
  "common.loading": "Chargement…",
  "common.retry": "Réessayer",
  "common.close": "Fermer",
  "common.add": "Ajouter",
  "common.edit": "Modifier",
  "common.back": "Retour",

  // greeting
  "dashboard.greeting": "Bonjour",
  "dashboard.overview": "Vue d'ensemble",
  "dashboard.preview": "Aperçu",
  "dashboard.quickAccess": "Mes accès",
  "dashboard.modules": "modules",

  // roles
  "role.super_admin": "Super admin",
  "role.director": "Direction",
  "role.parent": "Parent",
  "role.student": "Élève",

  // notifications
  "notif.title": "Notifications",
  "notif.empty": "Aucune notification.",
  "notif.recentActivity": "Activité récente",
  "notif.markAllRead": "Tout marquer comme lu",

  // auth
  "auth.signout": "Se déconnecter",
  "auth.confirmSignout": "Se déconnecter ?",
  "auth.confirmSignoutBody": "Votre session sera fermée sur cet appareil.",

  // language
  "lang.french": "Français",
  "lang.arabic": "العربية",
  "lang.label": "Langue",
} as const;

export type DictionaryKey = keyof typeof fr;
export type Dictionary = Record<DictionaryKey, string>;

export const ar: Partial<Dictionary> = {
  // navigation
  "nav.home": "الرئيسية",
  "nav.classes": "الأقسام",
  "nav.students": "التلاميذ",
  "nav.homework": "الواجبات",
  "nav.canteen": "المطعم",
  "nav.schedule": "الجدول",
  "nav.payments": "المدفوعات",
  "nav.absences": "الغيابات",
  "nav.exams": "الامتحانات",
  "nav.remedials": "حصص الاستدراك",
  "nav.photos": "الصور",
  "nav.messages": "الرسائل",

  // common
  "common.create": "إنشاء",
  "common.cancel": "إلغاء",
  "common.save": "حفظ",
  "common.delete": "حذف",
  "common.confirm": "تأكيد",
  "common.search": "بحث",
  "common.loading": "جارٍ التحميل…",
  "common.retry": "إعادة المحاولة",
  "common.close": "إغلاق",
  "common.add": "إضافة",
  "common.edit": "تعديل",
  "common.back": "رجوع",

  // greeting
  "dashboard.greeting": "مرحبا",
  "dashboard.overview": "نظرة عامة",
  "dashboard.preview": "ملخص",
  "dashboard.quickAccess": "وصول سريع",
  "dashboard.modules": "وحدات",

  // roles
  "role.super_admin": "مدير عام",
  "role.director": "إدارة",
  "role.parent": "ولي الأمر",
  "role.student": "تلميذ",

  // notifications
  "notif.title": "الإشعارات",
  "notif.empty": "لا توجد إشعارات.",
  "notif.recentActivity": "النشاط الأخير",
  "notif.markAllRead": "تعليم الكل كمقروء",

  // auth
  "auth.signout": "تسجيل الخروج",
  "auth.confirmSignout": "تسجيل الخروج ؟",
  "auth.confirmSignoutBody": "سيتم إنهاء جلستك على هذا الجهاز.",

  // language
  "lang.french": "Français",
  "lang.arabic": "العربية",
  "lang.label": "اللغة",
};

export type Locale = "fr" | "ar";

export function t(locale: Locale, key: DictionaryKey): string {
  if (locale === "ar") return ar[key] ?? fr[key];
  return fr[key];
}
