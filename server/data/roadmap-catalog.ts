/**
 * Catalogue statique des roadmaps roadmap.sh intégrées.
 *
 * Source : kamranahmedse/developer-roadmap (CC BY-SA 4.0)
 * Attribution obligatoire sur tout cursus importé.
 * Cf. docs/legal/roadmap-sh-license.md — TT-03.7.1.
 *
 * Les concepts sont ordonnés : ils seront importés comme modules
 * dans cet ordre (semaine 1 → semaine N).
 */

export interface RoadmapEntry {
  id: string;
  title: string;
  category: 'frontend' | 'backend' | 'devops' | 'security' | 'ai' | 'language' | 'tool';
  sourceUrl: string;
  concepts: Array<{ title: string; url: string }>;
}

export const ROADMAP_CATALOG: RoadmapEntry[] = [
  {
    id: 'frontend',
    title: 'Frontend Developer',
    category: 'frontend',
    sourceUrl: 'https://roadmap.sh/frontend',
    concepts: [
      { title: 'Internet & HTTP', url: 'https://roadmap.sh/frontend' },
      { title: 'HTML', url: 'https://roadmap.sh/frontend' },
      { title: 'CSS', url: 'https://roadmap.sh/frontend' },
      { title: 'JavaScript', url: 'https://roadmap.sh/javascript' },
      { title: 'Version Control (Git)', url: 'https://roadmap.sh/frontend' },
      { title: 'Package Managers (npm / pnpm)', url: 'https://roadmap.sh/frontend' },
      { title: 'CSS Preprocessors (Sass)', url: 'https://roadmap.sh/frontend' },
      { title: 'Responsive Design', url: 'https://roadmap.sh/frontend' },
      { title: 'Accessibility (a11y)', url: 'https://roadmap.sh/frontend' },
      { title: 'Module Bundlers (Vite / Webpack)', url: 'https://roadmap.sh/frontend' },
      { title: 'React / Vue / Angular', url: 'https://roadmap.sh/frontend' },
      { title: 'TypeScript', url: 'https://roadmap.sh/typescript' },
      { title: 'Testing (Unit, E2E)', url: 'https://roadmap.sh/frontend' },
      { title: 'Performance & Core Web Vitals', url: 'https://roadmap.sh/frontend' },
      { title: 'Security Fundamentals', url: 'https://roadmap.sh/frontend' },
    ],
  },
  {
    id: 'backend',
    title: 'Backend Developer',
    category: 'backend',
    sourceUrl: 'https://roadmap.sh/backend',
    concepts: [
      { title: 'Internet & HTTP', url: 'https://roadmap.sh/backend' },
      { title: 'OS & General Knowledge', url: 'https://roadmap.sh/backend' },
      { title: 'Learn a Language (Python / Node.js)', url: 'https://roadmap.sh/backend' },
      { title: 'Version Control (Git)', url: 'https://roadmap.sh/backend' },
      { title: 'Relational Databases (PostgreSQL)', url: 'https://roadmap.sh/backend' },
      { title: 'APIs (REST, GraphQL)', url: 'https://roadmap.sh/backend' },
      { title: 'Caching (Redis)', url: 'https://roadmap.sh/backend' },
      { title: 'Authentication & Authorization', url: 'https://roadmap.sh/backend' },
      { title: 'Testing', url: 'https://roadmap.sh/backend' },
      { title: 'CI/CD', url: 'https://roadmap.sh/backend' },
      { title: 'Containers (Docker)', url: 'https://roadmap.sh/backend' },
      { title: 'Message Brokers (Queue)', url: 'https://roadmap.sh/backend' },
      { title: 'Search Engines (ElasticSearch)', url: 'https://roadmap.sh/backend' },
      { title: 'Scalability & Architecture', url: 'https://roadmap.sh/backend' },
      { title: 'Monitoring & Logging', url: 'https://roadmap.sh/backend' },
    ],
  },
  {
    id: 'devops',
    title: 'DevOps Engineer',
    category: 'devops',
    sourceUrl: 'https://roadmap.sh/devops',
    concepts: [
      { title: 'OS & Linux Fundamentals', url: 'https://roadmap.sh/devops' },
      { title: 'Scripting (Bash / Python)', url: 'https://roadmap.sh/devops' },
      { title: 'Networking & Security', url: 'https://roadmap.sh/devops' },
      { title: 'Version Control (Git)', url: 'https://roadmap.sh/devops' },
      { title: 'Containers (Docker)', url: 'https://roadmap.sh/devops' },
      { title: 'Container Orchestration (Kubernetes)', url: 'https://roadmap.sh/devops' },
      { title: 'CI/CD Pipelines', url: 'https://roadmap.sh/devops' },
      { title: 'Infrastructure as Code (Terraform)', url: 'https://roadmap.sh/devops' },
      { title: 'Cloud Providers (AWS / GCP / Azure)', url: 'https://roadmap.sh/devops' },
      { title: 'Monitoring & Observability', url: 'https://roadmap.sh/devops' },
      { title: 'Logs Management', url: 'https://roadmap.sh/devops' },
      { title: 'Artifact Management', url: 'https://roadmap.sh/devops' },
      { title: 'Service Mesh', url: 'https://roadmap.sh/devops' },
      { title: 'GitOps', url: 'https://roadmap.sh/devops' },
    ],
  },
  {
    id: 'cybersecurity',
    title: 'Cybersecurity Expert',
    category: 'security',
    sourceUrl: 'https://roadmap.sh/cyber-security',
    concepts: [
      { title: 'Networking Fundamentals', url: 'https://roadmap.sh/cyber-security' },
      { title: 'OS Security (Linux / Windows)', url: 'https://roadmap.sh/cyber-security' },
      { title: 'Cryptography Basics', url: 'https://roadmap.sh/cyber-security' },
      { title: 'Web Application Security (OWASP)', url: 'https://roadmap.sh/cyber-security' },
      { title: 'Penetration Testing', url: 'https://roadmap.sh/cyber-security' },
      { title: 'Vulnerability Assessment', url: 'https://roadmap.sh/cyber-security' },
      { title: 'SIEM & Log Analysis', url: 'https://roadmap.sh/cyber-security' },
      { title: 'Incident Response', url: 'https://roadmap.sh/cyber-security' },
      { title: 'Threat Intelligence', url: 'https://roadmap.sh/cyber-security' },
      { title: 'Cloud Security', url: 'https://roadmap.sh/cyber-security' },
      { title: 'Compliance & Governance (ISO 27001, GDPR)', url: 'https://roadmap.sh/cyber-security' },
      { title: 'Malware Analysis', url: 'https://roadmap.sh/cyber-security' },
    ],
  },
  {
    id: 'ai-data-scientist',
    title: 'AI & Data Science',
    category: 'ai',
    sourceUrl: 'https://roadmap.sh/ai-data-scientist',
    concepts: [
      { title: 'Programming Fundamentals (Python)', url: 'https://roadmap.sh/ai-data-scientist' },
      { title: 'Mathematics & Statistics', url: 'https://roadmap.sh/ai-data-scientist' },
      { title: 'Data Collection & Cleaning', url: 'https://roadmap.sh/ai-data-scientist' },
      { title: 'Exploratory Data Analysis (EDA)', url: 'https://roadmap.sh/ai-data-scientist' },
      { title: 'Machine Learning Fundamentals', url: 'https://roadmap.sh/ai-data-scientist' },
      { title: 'Supervised Learning Algorithms', url: 'https://roadmap.sh/ai-data-scientist' },
      { title: 'Unsupervised Learning', url: 'https://roadmap.sh/ai-data-scientist' },
      { title: 'Deep Learning & Neural Networks', url: 'https://roadmap.sh/ai-data-scientist' },
      { title: 'Natural Language Processing (NLP)', url: 'https://roadmap.sh/ai-data-scientist' },
      { title: 'Computer Vision', url: 'https://roadmap.sh/ai-data-scientist' },
      { title: 'MLOps & Model Deployment', url: 'https://roadmap.sh/ai-data-scientist' },
      { title: 'LLMs & Prompt Engineering', url: 'https://roadmap.sh/ai-data-scientist' },
    ],
  },
  {
    id: 'fullstack',
    title: 'Full Stack Developer',
    category: 'frontend',
    sourceUrl: 'https://roadmap.sh/full-stack',
    concepts: [
      { title: 'HTML, CSS & JavaScript', url: 'https://roadmap.sh/full-stack' },
      { title: 'TypeScript', url: 'https://roadmap.sh/full-stack' },
      { title: 'Frontend Framework (React / Vue)', url: 'https://roadmap.sh/full-stack' },
      { title: 'REST APIs', url: 'https://roadmap.sh/full-stack' },
      { title: 'Server-Side Language (Node.js / Python)', url: 'https://roadmap.sh/full-stack' },
      { title: 'Relational Databases (PostgreSQL)', url: 'https://roadmap.sh/full-stack' },
      { title: 'Authentication & Sessions', url: 'https://roadmap.sh/full-stack' },
      { title: 'Version Control & CI/CD', url: 'https://roadmap.sh/full-stack' },
      { title: 'Containers (Docker)', url: 'https://roadmap.sh/full-stack' },
      { title: 'Cloud & Deployment', url: 'https://roadmap.sh/full-stack' },
      { title: 'Testing (Unit, Integration, E2E)', url: 'https://roadmap.sh/full-stack' },
      { title: 'Performance & Security', url: 'https://roadmap.sh/full-stack' },
    ],
  },
  {
    id: 'react',
    title: 'React Developer',
    category: 'frontend',
    sourceUrl: 'https://roadmap.sh/react',
    concepts: [
      { title: 'JavaScript & ES6+ Fundamentals', url: 'https://roadmap.sh/react' },
      { title: 'React Basics (JSX, Components, Props)', url: 'https://roadmap.sh/react' },
      { title: 'State & Lifecycle (useState, useEffect)', url: 'https://roadmap.sh/react' },
      { title: 'Hooks (useContext, useReducer, useMemo)', url: 'https://roadmap.sh/react' },
      { title: 'Component Patterns & Composition', url: 'https://roadmap.sh/react' },
      { title: 'Routing (React Router)', url: 'https://roadmap.sh/react' },
      { title: 'State Management (Zustand / Redux)', url: 'https://roadmap.sh/react' },
      { title: 'Forms & Validation', url: 'https://roadmap.sh/react' },
      { title: 'API Integration (fetch / TanStack Query)', url: 'https://roadmap.sh/react' },
      { title: 'Testing (Vitest, Testing Library)', url: 'https://roadmap.sh/react' },
      { title: 'Performance Optimization', url: 'https://roadmap.sh/react' },
      { title: 'TypeScript with React', url: 'https://roadmap.sh/react' },
    ],
  },
  {
    id: 'nodejs',
    title: 'Node.js Developer',
    category: 'backend',
    sourceUrl: 'https://roadmap.sh/nodejs',
    concepts: [
      { title: 'JavaScript & Node.js Fundamentals', url: 'https://roadmap.sh/nodejs' },
      { title: 'Node.js Modules & npm', url: 'https://roadmap.sh/nodejs' },
      { title: 'File System & Streams', url: 'https://roadmap.sh/nodejs' },
      { title: 'HTTP & REST APIs (Express / Fastify)', url: 'https://roadmap.sh/nodejs' },
      { title: 'Authentication & Authorization', url: 'https://roadmap.sh/nodejs' },
      { title: 'Databases & ORMs (Prisma / Sequelize)', url: 'https://roadmap.sh/nodejs' },
      { title: 'Testing (Vitest / Jest)', url: 'https://roadmap.sh/nodejs' },
      { title: 'Error Handling & Logging', url: 'https://roadmap.sh/nodejs' },
      { title: 'Message Queues (Bull / Inngest)', url: 'https://roadmap.sh/nodejs' },
      { title: 'Deployment & CI/CD', url: 'https://roadmap.sh/nodejs' },
    ],
  },
  {
    id: 'python',
    title: 'Python Developer',
    category: 'language',
    sourceUrl: 'https://roadmap.sh/python',
    concepts: [
      { title: 'Python Fundamentals & Syntax', url: 'https://roadmap.sh/python' },
      { title: 'Data Types, Lists, Dicts, Sets', url: 'https://roadmap.sh/python' },
      { title: 'Functions & OOP', url: 'https://roadmap.sh/python' },
      { title: 'File I/O & Exceptions', url: 'https://roadmap.sh/python' },
      { title: 'Standard Library', url: 'https://roadmap.sh/python' },
      { title: 'Virtual Environments & pip', url: 'https://roadmap.sh/python' },
      { title: 'Testing (pytest)', url: 'https://roadmap.sh/python' },
      { title: 'Web Frameworks (FastAPI / Django)', url: 'https://roadmap.sh/python' },
      { title: 'Databases & ORMs (SQLAlchemy)', url: 'https://roadmap.sh/python' },
      { title: 'Async Programming (asyncio)', url: 'https://roadmap.sh/python' },
    ],
  },
  {
    id: 'docker',
    title: 'Docker & Containers',
    category: 'tool',
    sourceUrl: 'https://roadmap.sh/docker',
    concepts: [
      { title: 'Containers vs VMs', url: 'https://roadmap.sh/docker' },
      { title: 'Docker Installation & CLI', url: 'https://roadmap.sh/docker' },
      { title: 'Images & Dockerfile', url: 'https://roadmap.sh/docker' },
      { title: 'Building & Tagging Images', url: 'https://roadmap.sh/docker' },
      { title: 'Running Containers', url: 'https://roadmap.sh/docker' },
      { title: 'Docker Volumes & Networking', url: 'https://roadmap.sh/docker' },
      { title: 'Docker Compose', url: 'https://roadmap.sh/docker' },
      { title: 'Container Registries', url: 'https://roadmap.sh/docker' },
      { title: 'Multi-Stage Builds', url: 'https://roadmap.sh/docker' },
      { title: 'Security Best Practices', url: 'https://roadmap.sh/docker' },
    ],
  },
];

/** Attribution obligatoire à inclure dans la description du cursus (CC BY-SA 4.0). */
export const ROADMAP_ATTRIBUTION =
  'Inspiré de roadmap.sh (CC BY-SA 4.0) — https://roadmap.sh';
