// server/src/utils/skillDictionary.util.js
// Comprehensive vocabulary for the Hybrid ATS Engine

// ── Internal Technical Skills ───────────────────────────────────────────────
const TECH_SKILLS_INTERNAL = [
  // Languages
  "javascript", "typescript", "python", "java", "c++", "c#", "golang", "go",
  "rust", "swift", "kotlin", "ruby", "php", "scala", "r", "matlab", "perl",
  "bash", "shell", "powershell", "dart", "elixir", "haskell", "lua",
  "data structures", "algorithms", "dsa", "object oriented programming", "oop",
  "system design", "design patterns", "computer science",

  // Frontend
  "react", "next.js", "nextjs", "vue", "vue.js", "angular", "svelte",
  "html", "html5", "css", "css3", "sass", "scss", "less", "tailwind",
  "tailwindcss", "bootstrap", "material ui", "chakra ui", "styled components",
  "redux", "zustand", "recoil", "jotai", "webpack", "vite", "parcel", "rollup",
  "babel", "eslint", "prettier", "jest", "mocha", "chai", "cypress", "playwright", "storybook",
  "three.js", "d3.js", "d3", "webgl", "canvas", "p5.js",

  // Backend
  "node.js", "nodejs", "node", "express", "express.js", "fastify", "koa",
  "nestjs", "nest.js", "django", "flask", "fastapi", "spring", "spring boot",
  "spring mvc", "hibernate", "rails", "ruby on rails", "laravel", "symfony",
  "asp.net", ".net", "graphql", "rest api", "restful", "grpc", "websockets",
  "socket.io", "microservices", "serverless",

  // Databases
  "mongodb", "mongoose", "postgresql", "postgres", "mysql", "sqlite",
  "redis", "elasticsearch", "cassandra", "dynamodb", "firebase",
  "firestore", "supabase", "prisma", "sequelize", "typeorm", "knex",
  "neo4j", "couchdb", "mariadb", "oracle", "mssql", "sql server",

  // Cloud & DevOps
  "aws", "gcp", "azure", "cloudflare", "heroku", "vercel", "netlify",
  "digitalocean", "linode", "docker", "kubernetes", "k8s", "helm",
  "terraform", "ansible", "jenkins", "github actions", "circleci",
  "travis ci", "gitlab ci", "ci/cd", "nginx", "apache", "linux",
  "ubuntu", "centos", "debian", "unix", "ec2", "s3", "lambda",
  "cloudwatch", "iam", "vpc", "rds", "kafka", "rabbitmq", "sqs",
  "sns", "celery", "airflow", "prometheus", "grafana", "datadog",
  "splunk", "elk", "logstash", "kibana",

  // AI/ML & Data
  "machine learning", "deep learning", "nlp", "computer vision",
  "tensorflow", "pytorch", "keras", "scikit-learn", "sklearn",
  "pandas", "numpy", "scipy", "matplotlib", "seaborn", "plotly",
  "jupyter", "spark", "hadoop", "hive", "dbt", "airflow",
  "langchain", "openai", "hugging face", "transformers",
  "data engineering", "data science", "data analysis",

  // Tools & Practices
  "git", "github", "gitlab", "bitbucket", "jira", "confluence",
  "agile", "scrum", "kanban", "tdd", "bdd", "unit testing",
  "integration testing", "api testing", "postman", "swagger",
  "openapi", "figma", "zeplin", "adobe xd", "photoshop",
  "linux", "bash scripting", "regex", "cron", "oauth", "jwt",
  "ssl", "https", "security", "oauth2", "saml", "ldap",
  "blockchain", "solidity", "web3", "ethers.js",

  // Mobile
  "react native", "flutter", "ios", "android", "swift ui",
  "expo", "ionic", "cordova", "capacitor",
  "unity", "unity3d", "unreal engine", "ue4", "ue5", "game development",
  "game design", "mobile development", "native development",

  // Legacy / Enterprise
  "sql", "pl/sql", "stored procedures", "etl", "xml", "json",
  "soap", "wsdl", "hibernate", "maven", "gradle", "ant",
  "tomcat", "weblogic", "websphere", "jboss",
];

// ── Power Skills (Professional & Soft) ──────────────────────────────────────
const POWER_SKILLS = [
  // Management & Leadership
  "project management", "product management", "agile", "scrum", "kanban",
  "strategic planning", "team leadership", "stakeholder management",
  "resource allocation", "budgeting", "risk assessment", "pmp", "capm",
  "mentoring", "coaching", "recruiting", "talent acquisition",

  // Marketing & Sales
  "seo", "sem", "digital marketing", "content strategy", "social media",
  "email marketing", "google analytics", "hubsoft", "salesforce",
  "crm", "lead generation", "market research", "brand strategy",
  "copywriting", "public relations", "conversion optimization",

  // Design & UX
  "ui/ux", "user experience", "user interface", "product design",
  "wireframing", "prototyping", "figma", "adobe xd", "sketch",
  "photoshop", "illustrator", "design systems", "typography",
  "accessibility", "wcag",

  // Data & Finance
  "data analysis", "data visualization", "tableau", "power bi",
  "excel", "google sheets", "financial modeling", "accounting",
  "business intelligence", "market analysis", "forecasting",

  // Communication & Productivity
  "public speaking", "technical writing", "problem solving",
  "critical thinking", "time management", "bilingual", "multilingual",
  "conflict resolution", "negotiation", "customer success",
  "interpersonal skills", "collaborative relations", "teamwork",
  "creative thinking", "analytical skills",
];

// Combine all into the final export
export const TECH_SKILLS = [...TECH_SKILLS_INTERNAL, ...POWER_SKILLS];

// Keep old SKILLS for backward compat
export const SKILLS = TECH_SKILLS;

/**
 * Skills that are considered too generic to be highlighted as specific tags.
 * They still contribute to overall semantic scoring but are hidden from the
 * 'Matched/Missing Skills' lists in the UI.
 */
export const GENERIC_SKILLS = [
  "computer science",
  "problem solving",
  "communication skills",
  "teamwork",
  "analytical skills",
  "critical thinking",
  "technical writing",
  "interpersonal skills",
];

// ── Section Header Patterns ──────────────────────────────────────────────────
export const SECTION_HEADERS = {
  experience: [
    "experience", "work experience", "work history", "employment",
    "professional experience", "career history", "internship"
  ],
  education: [
    "education", "academic background", "academic qualifications",
    "qualifications", "certifications", "degrees"
  ],
  projects: [
    "projects", "project experience", "personal projects",
    "side projects", "portfolio", "softwares", "open source"
  ],
  skills: [
    "skills", "technical skills", "core competencies", "competencies",
    "technologies", "tech stack", "tools", "expertise",
    "technical proficiency", "programming languages"
  ],
  summary: [
    "summary", "objective", "profile", "professional summary",
    "career objective", "about me", "overview"
  ],
};

// ── Verb Lists ───────────────────────────────────────────────────────────────
export const STRONG_ACTION_VERBS = [
  "built", "engineered", "architected", "designed", "developed",
  "implemented", "deployed", "launched", "delivered", "shipped",
  "optimized", "improved", "enhanced", "accelerated", "reduced",
  "increased", "automated", "refactored", "migrated", "integrated",
  "led", "directed", "managed", "mentored", "coached", "recruited",
  "established", "founded", "created", "invented", "pioneered",
  "spearheaded", "championed", "drove", "transformed", "revolutionized",
  "scaled", "generated", "achieved", "earned", "secured", "negotiated",
  "executed", "streamlined", "consolidated", "overhauled", "restructured",
  "analyzed", "evaluated", "diagnosed", "resolved", "troubleshot",
  "debugged", "identified", "researched", "investigated",
  "published", "presented", "authored", "contributed", "collaborated",
];

export const WEAK_ACTION_VERBS = [
  "helped", "assisted", "worked on", "responsible for", "duties included",
  "involved in", "participated in", "was part of", "contributed to",
  "supported", "utilized", "used", "handled", "dealt with",
  "tried", "attempted", "was tasked with", "was assigned",
  "familiar with", "knowledge of", "exposure to",
];

// ── JD Signal Words ──────────────────────────────────────────────────────────
export const REQUIRED_SIGNAL_WORDS = [
  "required", "must have", "mandatory", "essential", "necessary",
  "you must", "candidate must", "minimum requirement", "requires",
  "at least", "experience with", "proficiency in", "expertise in",
  "strong knowledge", "solid understanding", "proven experience",
];

export const PREFERRED_SIGNAL_WORDS = [
  "preferred", "nice to have", "bonus", "advantage", "plus",
  "ideal", "desirable", "favorable", "good to have",
  "would be great", "not required but", "optional", "a plus",
  "beneficial", "welcomed",
];

// ── Legacy Exports (backward compat) ────────────────────────────────────────
export const EXPERIENCE_KEYWORDS = [
  "experience", "years", "worked", "developed", "designed",
  "implemented", "internship", "project", "led", "delivered",
  "deployed", "built", "created", "managed",
];

export const RESUME_SECTIONS = [
  "skills", "experience", "education", "projects",
];
