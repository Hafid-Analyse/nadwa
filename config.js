// =====================================================================
//  إعدادات الاتصال بـ Supabase — غيّر السطرين فقط
//  تجدهما في: Supabase ← Project Settings ← API (أو API Keys)
// =====================================================================
window.NADWA_CONFIG = {
  SUPABASE_URL: 'https://plrazbpyvyucniaxleho.supabase.co',   // Project URL
  SUPABASE_KEY: 'sb_publishable_JR4WsQS6jpjzDf6wSm9UlQ_T55KlcWB',    // Publishable key (أو anon public)

  // كل كم ثانية تتحدث القوائم
  REFRESH_ATTENDEE_SEC: 30,   // هاتف الحاضر
  REFRESH_SCREEN_SEC: 3,      // شاشة العرض
  REFRESH_MODERATOR_SEC: 3,   // لوحة المنشّط

  // الشعار الافتراضي (إن لم يُحدَّد شعار للندوة في الإعدادات)
  DEFAULT_LOGO: 'assets/istiqama-logo.svg',              // للوضع الليلي
  DEFAULT_LOGO_LIGHT: 'assets/istiqama-logo-light.svg',  // للوضع النهاري

  // يتوقف التحديث التلقائي عند الحاضر بعد هذه المدة دون أي لمسة (لتوفير الاستهلاك)
  ATTENDEE_IDLE_MIN: 5,
};
