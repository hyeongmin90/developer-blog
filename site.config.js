const CONFIG = {
  // profile setting (required)
  profile: {
    name: "hyeongmin90",
    image: "",
    role: "Backend & AI Engineer",
    bio: "Java와 Python 기반의 백엔드 개발과 Python을 활용한 AI/LLM 시스템 개발을 하고 있습니다.",
    email: "nsby9000@gmail.com",
    linkedin: "",
    github: "hyeongmin90",
    instagram: "",
  },
  projects: [
    {
      name: "Vantage",
      href: "https://hyeongmin.dev",
    },
  ],
  // blog setting (required)
  blog: {
    title: "Developer Log",
    description: "백엔드 개발, 시스템 설계, RAG와 AI 에이전트 개발 기록",
    scheme: "dark", // 'light' | 'dark' | 'system'
  },

  // CONFIG configration (required)
  link: process.env.NEXT_PUBLIC_SITE_URL || "https://developer-blog-rho-indol.vercel.app",
  since: 2026, // If leave this empty, current year will be used.
  lang: "ko-KR", // ['en-US', 'zh-CN', 'zh-HK', 'zh-TW', 'ja-JP', 'es-ES', 'ko-KR']
  ogImageGenerateURL: "https://og-image-korean.vercel.app", // The link to generate OG image, don't end with a slash

  // notion configuration (required)
  notionConfig: {
    pageId: process.env.NOTION_PAGE_ID,
  },

  // plugin configuration (optional)
  googleAnalytics: {
    enable: false,
    config: {
      measurementId: process.env.NEXT_PUBLIC_GOOGLE_MEASUREMENT_ID || "",
    },
  },
  googleSearchConsole: {
    enable: false,
    config: {
      siteVerification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "",
    },
  },
  naverSearchAdvisor: {
    enable: false,
    config: {
      siteVerification: process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION || "",
    },
  },
  utterances: {
    enable: false,
    config: {
      repo: process.env.NEXT_PUBLIC_UTTERANCES_REPO || "",
      "issue-term": "og:title",
      label: "💬 Utterances",
    },
  },
  cusdis: {
    enable: false,
    config: {
      host: "https://cusdis.com",
      appid: "", // Embed Code -> data-app-id value
    },
  },
  isProd: process.env.VERCEL_ENV === "production", // distinguish between development and production environment (ref: https://vercel.com/docs/environment-variables#system-environment-variables)
  revalidateTime: 300, // revalidate time for [slug], index
}

module.exports = { CONFIG }
