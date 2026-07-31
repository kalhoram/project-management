export const APP_NAME = "یادباکس"
export const APP_NAME_FULL = "یادباکس YadBox"
export const APP_DESCRIPTION = "مدیریت پروژه برای تیم‌های مدرن"

export const DEFAULT_WORKSPACE_ID = "ws-1"
export const DEFAULT_PROJECT_ID = "proj-1"

export const SIDEBAR_WIDTH = 240
export const SIDEBAR_COLLAPSED_WIDTH = 64

export const PRIORITY_COLORS = {
  highest: "#DE350B",
  high: "#FF5630",
  medium: "#FF991F",
  low: "#0052CC",
  lowest: "#6B778C",
} as const

export const STATUS_COLORS = {
  backlog: "#6B778C",
  todo: "#0052CC",
  in_progress: "#FF991F",
  in_review: "#6554C0",
  done: "#00875A",
  blocked: "#DE350B",
  cancelled: "#6B778C",
} as const

export const TASK_STATUS_LABELS: Record<string, string> = {
  backlog: "بک‌لاگ",
  todo: "انجام نشده",
  in_progress: "در حال انجام",
  in_review: "در حال بررسی",
  done: "انجام‌شده",
  blocked: "مسدود",
  cancelled: "لغو شده",
}

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  active: "فعال",
  on_hold: "متوقف",
  completed: "تکمیل شده",
  archived: "بایگانی",
  deleted: "حذف شده",
}

export const USER_STATUS_LABELS: Record<string, string> = {
  active: "فعال",
  inactive: "غیرفعال",
  invited: "دعوت‌شده",
  suspended: "معلق",
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: "پرداخت‌شده",
  pending: "در انتظار",
  failed: "ناموفق",
  refunded: "بازپرداخت‌شده",
}

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: "پیش‌نویس",
  open: "باز",
  paid: "پرداخت‌شده",
  void: "باطل",
  overdue: "سررسید گذشته",
}

export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  active: "فعال",
  cancelled: "لغو شده",
  past_due: "معوق",
  trialing: "آزمایشی",
}

export const WORKSPACE_STATUS_LABELS: Record<string, string> = {
  active: "فعال",
  trial: "آزمایشی",
  suspended: "معلق",
  archived: "بایگانی",
}

export const LOG_SEVERITY_LABELS: Record<string, string> = {
  info: "اطلاعات",
  warning: "هشدار",
  error: "خطا",
  critical: "بحرانی",
}

export const ROLE_LABELS: Record<string, string> = {
  owner: "مالک",
  admin: "مدیر",
  member: "عضو",
  guest: "مهمان",
  viewer: "بیننده",
}

export const FEATURE_FLAG_LABELS: Record<string, string> = {
  aiAssist: "دستیار هوش مصنوعی",
  advancedReports: "گزارش‌های پیشرفته",
  sso: "ورود یکپارچه (SSO)",
  betaKanban: "کانبان آزمایشی",
  exportPdf: "خروجی PDF",
}

export const PLAN_ID_LABELS: Record<string, string> = {
  "plan-free": "رایگان",
  "plan-starter": "استارتر",
  "plan-pro": "حرفه‌ای",
  "plan-enterprise": "سازمانی",
}

export const VISIBILITY_LABELS: Record<string, string> = {
  private: "خصوصی",
  team: "تیمی",
  public: "عمومی",
}

export const CALENDAR_VIEW_LABELS: Record<string, string> = {
  month: "ماه",
  week: "هفته",
  day: "روز",
}

export const TIMELINE_ZOOM_LABELS: Record<string, string> = {
  day: "روز",
  week: "هفته",
  month: "ماه",
}

export const WEEKDAY_LABELS = ["یک", "دو", "سه", "چه", "پنج", "جم", "شن"] as const

export const PRIORITY_LABELS: Record<string, string> = {
  highest: "بحرانی",
  high: "بالا",
  medium: "متوسط",
  low: "پایین",
  lowest: "خیلی پایین",
}

export const COMPANY_SIZES = [
  { value: "1-10", label: "۱ تا ۱۰ نفر" },
  { value: "11-50", label: "۱۱ تا ۵۰ نفر" },
  { value: "51-200", label: "۵۱ تا ۲۰۰ نفر" },
  { value: "201-500", label: "۲۰۱ تا ۵۰۰ نفر" },
  { value: "500+", label: "بیش از ۵۰۰ نفر" },
] as const

export const INDUSTRIES = [
  { value: "technology", label: "فناوری" },
  { value: "finance", label: "مالی" },
  { value: "healthcare", label: "سلامت" },
  { value: "education", label: "آموزش" },
  { value: "retail", label: "خرده‌فروشی" },
  { value: "other", label: "سایر" },
] as const

export const PROJECT_TEMPLATES = [
  {
    id: "kanban",
    name: "کانبان",
    description: "برد بصری برای جریان کار پیوسته",
    icon: "Columns3",
  },
  {
    id: "scrum",
    name: "اسکرام",
    description: "تحویل چابک مبتنی بر اسپرینت",
    icon: "RefreshCw",
  },
  {
    id: "marketing",
    name: "کمپین بازاریابی",
    description: "برنامه‌ریزی و پیگیری تحویل‌های کمپین",
    icon: "Megaphone",
  },
  {
    id: "roadmap",
    name: "نقشه راه محصول",
    description: "مدیریت ابتکارات و انتشارها",
    icon: "Map",
  },
  {
    id: "bugs",
    name: "پیگیری باگ",
    description: "اولویت‌بندی و رفع مشکلات",
    icon: "Bug",
  },
  {
    id: "blank",
    name: "پروژه خالی",
    description: "شروع از صفر",
    icon: "FilePlus",
  },
] as const
