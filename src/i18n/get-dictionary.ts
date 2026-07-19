import type { Locale } from "@/src/i18n/config";
import type { ModuleId, NavKey } from "@/src/lib/modules";
import type { InquiryStatus } from "@/src/lib/crm/inquiries";

export interface Dictionary {
  nav: Record<NavKey, string>;
  /** 每个模块的一句话简介，用于门户详情面板、模块卡片与落地页。 */
  modules: Record<ModuleId, { blurb: string }>;
  ui: {
    /** 进入某模块的按钮文案。 */
    enter: string;
    /** 返回 3D 门户。 */
    backToPortal: string;
    /** 语言切换标签。 */
    language: string;
    /** 该模块尚在建设中。 */
    comingSoon: string;
  };
  content: {
    /** 读懂中国列表暂无文章时的空状态。 */
    articlesEmpty: string;
    /** 文章详情页返回列表。 */
    backToList: string;
    /** AI 初翻、尚未人工校订的提示（信任透明）。 */
    aiDraftNotice: string;
  };
  catalog: {
    suppliersEmpty: string;
    backToSuppliers: string;
    verified: string;
    products: string;
    noProducts: string;
    moq: string;
    priceOnRequest: string;
    website: string;
    location: string;
    founded: string;
    employees: string;
  };
  auth: {
    signIn: string;
    signUp: string;
    email: string;
    password: string;
    displayName: string;
    noAccount: string;
    hasAccount: string;
    /** 注册后需邮箱验证时的提示。 */
    checkEmail: string;
    signOut: string;
    /** 未登录访问询盘中心时的引导文案。 */
    loginRequired: string;
    notConfigured: string;
    genericError: string;
  };
  crm: {
    myInquiries: string;
    /** 供应商收件箱分栏标题。 */
    received: string;
    sent: string;
    emptyReceived: string;
    empty: string;
    browseSuppliers: string;
    newInquiry: string;
    /** 商品卡片上的发起询盘按钮。 */
    requestQuote: string;
    product: string;
    supplier: string;
    quantity: string;
    targetPort: string;
    /** 表单里的「选填」标记。 */
    optional: string;
    buyer: string;
    message: string;
    messagePlaceholder: string;
    send: string;
    backToInquiries: string;
    /** 消息线程里标记自己发言。 */
    you: string;
    productUnavailable: string;
    /** 消息一键翻译（对方消息气泡下方）。 */
    translate: string;
    hideTranslation: string;
    translating: string;
    translationFailed: string;
    /** 译文旁的「机器翻译」标记（信任透明）。 */
    machineTranslated: string;
    /** 铁律 #3 的用户侧表达：平台不介入支付。 */
    noPayments: string;
    status: Record<InquiryStatus, string>;
  };
  moderation: {
    /** 审核后台（editor/admin 专用，不进公开导航）。 */
    title: string;
    postsQueue: string;
    suppliersQueue: string;
    approve: string;
    reject: string;
    emptyQueue: string;
  };
  intel: {
    /** 情报雷达列表标题与空状态。 */
    latest: string;
    empty: string;
  };
  community: {
    empty: string;
    backToList: string;
    writePost: string;
    postTitle: string;
    postBody: string;
    /** 提交按钮：发帖先进审核队列（community.posts 默认 status=review）。 */
    submit: string;
    submittedNotice: string;
    reviewNotice: string;
  };
  tagline: string;
}

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  es: () => import("@/src/i18n/dictionaries/es.json").then((m) => m.default as Dictionary),
  en: () => import("@/src/i18n/dictionaries/en.json").then((m) => m.default as Dictionary),
  zh: () => import("@/src/i18n/dictionaries/zh.json").then((m) => m.default as Dictionary),
};

export function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]();
}
