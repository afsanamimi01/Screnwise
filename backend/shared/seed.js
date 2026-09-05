import bcrypt from "bcryptjs";
import User from "./models/User.model.js";
import Company from "./models/Company.model.js";
import Plan from "./models/Plan.model.js";
import Job from "./models/Job.model.js";
import Application from "./models/Application.model.js";
import SentEmail from "./models/SentEmail.model.js";
import AuditLog from "./models/AuditLog.model.js";
import { attachFittedCv } from "./demo/cv.js";
import { screenCv } from "./engine/index.js";

const DEMO_PASSWORD = "demo1234";
const DAY = 24 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ plans --- */

const PLANS = [
  {
    key: "basic",
    name: "Basic",
    tagline: "For single roles and small teams.",
    price: "$50",
    period: "per month",
    cta: "Start Basic",
    featured: false,
    hrSeatLimit: 2,
    order: 0,
    features: [
      { label: "Up to 150 CVs screened / month", included: true },
      { label: "Blind screening by default", included: true },
      { label: "Explainable match scores", included: true },
      { label: "2 active job openings", included: true },
      { label: "Candidate status tracking", included: true },
      { label: "Custom scoring weights", included: false },
      { label: "ATS & API integration", included: false },
    ],
  },
  {
    key: "advance",
    name: "Advance",
    tagline: "Complete hiring pipeline control.",
    price: "$200",
    period: "per month",
    cta: "Get Advance",
    featured: true,
    hrSeatLimit: 5,
    order: 1,
    features: [
      { label: "Up to 2,000 CVs screened / month", included: true },
      { label: "Unlimited job openings", included: true },
      { label: "Custom scoring weights per role", included: true },
      { label: "Shortlist collaboration & notes", included: true },
      { label: "Bias & fairness audit reports", included: true },
      { label: "ATS & API integration", included: true },
      { label: "Priority support (24h response)", included: true },
    ],
  },
  {
    key: "custom",
    name: "Custom",
    tagline: "Scaleable screening for enterprises.",
    price: "Let's talk",
    period: "tailored monthly plan",
    cta: "Contact us",
    featured: false,
    hrSeatLimit: null,
    order: 2,
    features: [
      { label: "Unlimited CV volume", included: true },
      { label: "Dedicated screening models", included: true },
      { label: "SSO, SLA & data residency options", included: true },
      { label: "Compliance & audit exports", included: true },
      { label: "Custom onboarding & training", included: true },
      { label: "Dedicated account manager", included: true },
    ],
  },
];

const SEAT_BY_PLAN = Object.fromEntries(PLANS.map((p) => [p.key, p.hrSeatLimit]));

/* -------------------------------------------------------------- companies --- */

const COMPANIES = [
  { key: "bengal", name: "Bengal Recruitment", plan: "advance", status: "active", expiresInDays: 25 },
  { key: "dhaka", name: "Dhaka Talent Partners", plan: "basic", status: "active", expiresInDays: 6 },
  // Subscription already lapsed - use it to test the super-admin "renew" action.
  { key: "padma", name: "Padma HR Solutions", plan: "basic", status: "active", expiresInDays: -6 },
  // Just registered, no plan yet - the manager lands on the plan chooser.
  { key: "chattogram", name: "Chattogram Staffing", plan: null, status: "active", expiresInDays: null },
];

/* ------------------------------------------------------------------ users --- */

const SUPER_ADMINS = [
  { key: "admin", name: "Afsana Mimi", email: "admin@screenwise.io" },
  { key: "zarif", name: "Zarif Mahmud", email: "zarif@screenwise.io" },
];

const COMPANY_USERS = [
  { key: "nusrat", name: "Nusrat Jahan", email: "nusrat@bengalrecruitment.com", role: "manager", companyKey: "bengal", active: true },
  { key: "sadia", name: "Sadia Islam", email: "sadia@bengalrecruitment.com", role: "hr", companyKey: "bengal", active: true },
  { key: "tanvir", name: "Tanvir Ahmed", email: "tanvir@bengalrecruitment.com", role: "hr", companyKey: "bengal", active: true },
  { key: "rifat", name: "Rifat Chowdhury", email: "rifat@bengalrecruitment.com", role: "hr", companyKey: "bengal", active: false },
  { key: "imran", name: "Imran Hossain", email: "imran@dhakatalent.com", role: "manager", companyKey: "dhaka", active: true },
  { key: "farhana", name: "Farhana Akter", email: "farhana@dhakatalent.com", role: "hr", companyKey: "dhaka", active: true },
  { key: "mahmud", name: "Mahmudul Hasan", email: "mahmud@padmahr.com", role: "manager", companyKey: "padma", active: true },
  { key: "sabrina", name: "Sabrina Haque", email: "sabrina@padmahr.com", role: "hr", companyKey: "padma", active: true },
  { key: "faruk", name: "Faruk Mia", email: "faruk@ctgstaffing.com", role: "manager", companyKey: "chattogram", active: true },
];

const CANDIDATES = [
  { key: "tanjil", name: "Tanjil Islam", email: "tanjil@example.com" },
  { key: "nabila", name: "Nabila Sultana", email: "nabila@example.com" },
  { key: "shovon", name: "Shovon Das", email: "shovon@example.com" },
  { key: "rumana", name: "Rumana Akter", email: "rumana@example.com" },
];

/* ------------------------------------------------------------------- jobs --- */

const JOBS = [
  {
    title: "Senior backend engineer",
    department: "Engineering",
    location: "Dhaka, Bangladesh (hybrid)",
    employmentType: "Full-time",
    description:
      "We are looking for a senior backend engineer to own our payments and identity services. You will design APIs, mentor mid-level engineers, and work closely with product to ship reliable, well-tested systems at scale.",
    requiredSkills: ["Node.js", "TypeScript", "PostgreSQL", "REST APIs", "Docker", "AWS"],
    niceToHaveSkills: ["Kubernetes", "GraphQL", "Terraform"],
    minYears: 5,
    educationLevel: "Bachelor's degree",
    certifications: ["AWS Solutions Architect"],
    hardFilters: { workPermitRequired: true, minYears: 3, mustHaveSkills: ["Node.js"] },
    weights: { skills: 45, experience: 25, education: 10, certifications: 10, keywords: 10 },
    publicApplyEnabled: true,
    status: "open",
    companyKey: "bengal",
    createdByKey: "sadia",
    applicantCount: 15,
    newSinceLastVisit: 4,
  },
  {
    title: "Product designer",
    department: "Design",
    location: "Remote (Bangladesh)",
    employmentType: "Full-time",
    description:
      "Join a small design team shaping the end-to-end experience of our hiring products. You will run discovery, prototype quickly, and partner with engineers from first sketch through launch.",
    requiredSkills: ["Figma", "Design systems", "User research", "Prototyping"],
    niceToHaveSkills: ["Motion design", "HTML/CSS"],
    minYears: 3,
    educationLevel: "Any",
    certifications: [],
    hardFilters: { workPermitRequired: false, minYears: 2, mustHaveSkills: ["Figma"] },
    weights: { skills: 40, experience: 25, education: 15, certifications: 10, keywords: 10 },
    publicApplyEnabled: true,
    status: "open",
    companyKey: "bengal",
    createdByKey: "sadia",
    applicantCount: 13,
    newSinceLastVisit: 2,
  },
  {
    title: "Frontend engineer (React)",
    department: "Engineering",
    location: "Chattogram, Bangladesh (hybrid)",
    employmentType: "Full-time",
    description:
      "Build the interfaces recruiters live in all day. You will own a slice of our React app end to end, care about accessibility and performance, and pair closely with design.",
    requiredSkills: ["React", "TypeScript", "CSS", "Testing", "REST APIs"],
    niceToHaveSkills: ["Vite", "Design systems", "GraphQL"],
    minYears: 3,
    educationLevel: "Any",
    certifications: [],
    hardFilters: { workPermitRequired: true, minYears: 2, mustHaveSkills: ["React"] },
    weights: { skills: 45, experience: 20, education: 10, certifications: 5, keywords: 20 },
    publicApplyEnabled: true,
    status: "open",
    companyKey: "bengal",
    createdByKey: "sadia",
    applicantCount: 13,
    newSinceLastVisit: 3,
  },
  {
    title: "DevOps engineer",
    department: "Platform",
    location: "Remote (Bangladesh)",
    employmentType: "Full-time",
    description:
      "Own our delivery pipeline and cloud infrastructure. You will automate everything that can be automated, keep production boring, and help teams ship safely many times a day.",
    requiredSkills: ["AWS", "Terraform", "Kubernetes", "CI/CD", "Linux", "Docker"],
    niceToHaveSkills: ["Prometheus", "Go", "Ansible"],
    minYears: 4,
    educationLevel: "Bachelor's degree",
    certifications: ["AWS Solutions Architect", "CKA"],
    hardFilters: { workPermitRequired: false, minYears: 3, mustHaveSkills: ["AWS", "Terraform"] },
    weights: { skills: 40, experience: 30, education: 5, certifications: 15, keywords: 10 },
    publicApplyEnabled: true,
    status: "open",
    companyKey: "bengal",
    createdByKey: "tanvir",
    applicantCount: 9,
    newSinceLastVisit: 1,
  },
  {
    title: "Data analyst",
    department: "Operations",
    location: "Dhaka, Bangladesh (on-site)",
    employmentType: "Contract",
    description:
      "Support the operations team with reporting, dashboards and ad-hoc analysis. You will work with SQL and Python daily and present findings to non-technical stakeholders.",
    requiredSkills: ["SQL", "Python", "Data visualisation", "Excel"],
    niceToHaveSkills: ["dbt", "Looker"],
    minYears: 2,
    educationLevel: "Bachelor's degree",
    certifications: [],
    hardFilters: { workPermitRequired: false, minYears: 1, mustHaveSkills: ["SQL"] },
    weights: { skills: 35, experience: 20, education: 20, certifications: 5, keywords: 20 },
    publicApplyEnabled: false,
    status: "open",
    companyKey: "dhaka",
    createdByKey: "farhana",
    applicantCount: 11,
    newSinceLastVisit: 0,
  },
  {
    title: "Marketing manager",
    department: "Marketing",
    location: "Dhaka, Bangladesh (on-site)",
    employmentType: "Full-time",
    description:
      "Lead demand generation for a growing B2B product. You will own the funnel from first touch to pipeline, run experiments, and manage a small team plus agency partners.",
    requiredSkills: ["B2B marketing", "SEO", "Content strategy", "Analytics", "Campaign management"],
    niceToHaveSkills: ["HubSpot", "Paid social", "Copywriting"],
    minYears: 5,
    educationLevel: "Bachelor's degree",
    certifications: [],
    hardFilters: { workPermitRequired: true, minYears: 4, mustHaveSkills: ["B2B marketing"] },
    weights: { skills: 35, experience: 35, education: 10, certifications: 5, keywords: 15 },
    publicApplyEnabled: true,
    status: "closed",
    companyKey: "dhaka",
    createdByKey: "farhana",
    applicantCount: 8,
    newSinceLastVisit: 0,
  },
  {
    title: "QA engineer",
    department: "Engineering",
    location: "Sylhet, Bangladesh (hybrid)",
    employmentType: "Full-time",
    description:
      "Own quality for a fast-moving product team. You will build automated test suites, sharpen the release process, and be the last line of defence before customers see a bug.",
    requiredSkills: ["Test automation", "Playwright", "CI/CD", "JavaScript", "API testing"],
    niceToHaveSkills: ["Performance testing", "Python"],
    minYears: 3,
    educationLevel: "Any",
    certifications: [],
    hardFilters: { workPermitRequired: true, minYears: 2, mustHaveSkills: ["Test automation"] },
    weights: { skills: 45, experience: 25, education: 5, certifications: 5, keywords: 20 },
    publicApplyEnabled: true,
    status: "open",
    companyKey: "padma",
    createdByKey: "sabrina",
    applicantCount: 6,
    newSinceLastVisit: 0,
  },
  {
    // Independent screening batch - never on the public board or the dashboard.
    title: "Sourced - Senior React (LinkedIn + Wellfound)",
    department: "",
    location: "",
    employmentType: "Full-time",
    description:
      "CVs pulled from LinkedIn Recruiter and Wellfound for the React opening, scored against the same bar as the public posting.",
    requiredSkills: ["React", "TypeScript", "CSS", "Testing", "REST APIs"],
    niceToHaveSkills: ["Vite", "GraphQL"],
    minYears: 3,
    educationLevel: "Any",
    certifications: [],
    hardFilters: { workPermitRequired: false, minYears: 2, mustHaveSkills: ["React"] },
    weights: { skills: 50, experience: 20, education: 5, certifications: 5, keywords: 20 },
    publicApplyEnabled: false,
    status: "open",
    kind: "screening",
    companyKey: "bengal",
    createdByKey: "tanvir",
    applicantCount: 8,
    newSinceLastVisit: 0,
  },

  /* ---- Bengal Recruitment - five more openings ---- */
  {
    title: "Mobile app developer (Flutter)",
    department: "Engineering",
    location: "Dhaka, Bangladesh (hybrid)",
    employmentType: "Full-time",
    description:
      "Build and ship cross-platform mobile apps for our clients. You will own features end to end in Flutter, integrate REST APIs, and keep the apps fast on low-end Android devices.",
    requiredSkills: ["Flutter", "Dart", "REST APIs", "Git", "State management"],
    niceToHaveSkills: ["Firebase", "CI/CD", "Kotlin"],
    minYears: 2,
    educationLevel: "Bachelor's degree",
    certifications: [],
    hardFilters: { workPermitRequired: false, minYears: 1, mustHaveSkills: ["Flutter"] },
    weights: { skills: 45, experience: 25, education: 10, certifications: 5, keywords: 15 },
    publicApplyEnabled: true,
    status: "open",
    companyKey: "bengal",
    createdByKey: "sadia",
    applicantCount: 9,
    newSinceLastVisit: 2,
  },
  {
    title: "HR business partner",
    department: "People",
    location: "Dhaka, Bangladesh (on-site)",
    employmentType: "Full-time",
    description:
      "Partner with department heads on hiring plans, onboarding and performance reviews. You will be the first point of contact for people matters across two client accounts.",
    requiredSkills: ["Recruitment", "Employee relations", "HR policy", "Onboarding", "MS Office"],
    niceToHaveSkills: ["HRIS", "Payroll", "Labour law"],
    minYears: 4,
    educationLevel: "Bachelor's degree",
    certifications: [],
    hardFilters: { workPermitRequired: false, minYears: 2, mustHaveSkills: ["Recruitment"] },
    weights: { skills: 35, experience: 35, education: 15, certifications: 5, keywords: 10 },
    publicApplyEnabled: true,
    status: "open",
    companyKey: "bengal",
    createdByKey: "tanvir",
    applicantCount: 7,
    newSinceLastVisit: 1,
  },
  {
    title: "Customer success manager",
    department: "Customer",
    location: "Remote (Bangladesh)",
    employmentType: "Full-time",
    description:
      "Own a portfolio of client accounts after onboarding. You will drive adoption, run quarterly reviews, and be the voice of the customer back to our product team.",
    requiredSkills: ["Account management", "Communication", "SaaS", "CRM", "Reporting"],
    niceToHaveSkills: ["Upselling", "Data analysis", "Project management"],
    minYears: 3,
    educationLevel: "Bachelor's degree",
    certifications: [],
    hardFilters: { workPermitRequired: false, minYears: 2, mustHaveSkills: ["Account management"] },
    weights: { skills: 40, experience: 30, education: 10, certifications: 5, keywords: 15 },
    publicApplyEnabled: true,
    status: "open",
    companyKey: "bengal",
    createdByKey: "sadia",
    applicantCount: 6,
    newSinceLastVisit: 0,
  },
  {
    title: "Data engineer",
    department: "Engineering",
    location: "Dhaka, Bangladesh (hybrid)",
    employmentType: "Full-time",
    description:
      "Design and maintain the data pipelines that feed our reporting and screening models. You will work with SQL, Python and cloud warehouses to keep data clean and on time.",
    requiredSkills: ["SQL", "Python", "ETL", "Data warehousing", "Airflow"],
    niceToHaveSkills: ["dbt", "Spark", "AWS"],
    minYears: 3,
    educationLevel: "Bachelor's degree",
    certifications: [],
    hardFilters: { workPermitRequired: false, minYears: 2, mustHaveSkills: ["SQL", "Python"] },
    weights: { skills: 45, experience: 25, education: 10, certifications: 5, keywords: 15 },
    publicApplyEnabled: true,
    status: "open",
    companyKey: "bengal",
    createdByKey: "tanvir",
    applicantCount: 8,
    newSinceLastVisit: 3,
  },
  {
    title: "Digital marketing executive",
    department: "Marketing",
    location: "Chattogram, Bangladesh (on-site)",
    employmentType: "Full-time",
    description:
      "Run day-to-day digital campaigns for our employer-branding services. You will manage social channels, write ad copy, and report on what is actually moving the numbers.",
    requiredSkills: ["Social media", "Google Ads", "SEO", "Content writing", "Analytics"],
    niceToHaveSkills: ["Canva", "Email marketing", "Meta Business Suite"],
    minYears: 2,
    educationLevel: "Bachelor's degree",
    certifications: [],
    hardFilters: { workPermitRequired: false, minYears: 1, mustHaveSkills: ["Social media"] },
    weights: { skills: 40, experience: 25, education: 10, certifications: 5, keywords: 20 },
    publicApplyEnabled: true,
    status: "open",
    companyKey: "bengal",
    createdByKey: "sadia",
    applicantCount: 10,
    newSinceLastVisit: 4,
  },

  /* ---- Dhaka Talent Partners - five more openings ---- */
  {
    title: "Accountant",
    department: "Finance",
    location: "Dhaka, Bangladesh (on-site)",
    employmentType: "Full-time",
    description:
      "Keep the books for the agency and two managed client payrolls. You will handle ledgers, VAT returns, and monthly closing under the finance manager.",
    requiredSkills: ["Accounting", "Tally", "MS Excel", "VAT", "Bank reconciliation"],
    niceToHaveSkills: ["QuickBooks", "Payroll", "Audit"],
    minYears: 3,
    educationLevel: "Bachelor's degree",
    certifications: ["CA (partly qualified)"],
    hardFilters: { workPermitRequired: false, minYears: 2, mustHaveSkills: ["Accounting"] },
    weights: { skills: 40, experience: 30, education: 15, certifications: 5, keywords: 10 },
    publicApplyEnabled: true,
    status: "open",
    companyKey: "dhaka",
    createdByKey: "farhana",
    applicantCount: 7,
    newSinceLastVisit: 1,
  },
  {
    title: "Sales executive",
    department: "Sales",
    location: "Dhaka, Bangladesh (on-site)",
    employmentType: "Full-time",
    description:
      "Bring new client companies onto our staffing services. You will prospect, pitch, and close retainers, working to a monthly target with a base plus commission.",
    requiredSkills: ["B2B sales", "Negotiation", "CRM", "Cold calling", "Communication"],
    niceToHaveSkills: ["Staffing industry", "LinkedIn Sales Navigator", "Presentation"],
    minYears: 2,
    educationLevel: "Bachelor's degree",
    certifications: [],
    hardFilters: { workPermitRequired: false, minYears: 1, mustHaveSkills: ["B2B sales"] },
    weights: { skills: 35, experience: 35, education: 10, certifications: 5, keywords: 15 },
    publicApplyEnabled: true,
    status: "open",
    companyKey: "dhaka",
    createdByKey: "farhana",
    applicantCount: 11,
    newSinceLastVisit: 2,
  },
  {
    title: "IT support specialist",
    department: "IT",
    location: "Sylhet, Bangladesh (on-site)",
    employmentType: "Full-time",
    description:
      "Keep the office running: laptops, network, accounts and the helpdesk queue. You will be the go-to person for anything that plugs in or logs in.",
    requiredSkills: ["Windows", "Networking", "Hardware troubleshooting", "Active Directory", "Helpdesk"],
    niceToHaveSkills: ["Linux", "Google Workspace admin", "Scripting"],
    minYears: 1,
    educationLevel: "Bachelor's degree",
    certifications: [],
    hardFilters: { workPermitRequired: false, minYears: 1, mustHaveSkills: ["Networking"] },
    weights: { skills: 45, experience: 25, education: 10, certifications: 10, keywords: 10 },
    publicApplyEnabled: true,
    status: "open",
    companyKey: "dhaka",
    createdByKey: "farhana",
    applicantCount: 5,
    newSinceLastVisit: 0,
  },
  {
    title: "Content writer",
    department: "Marketing",
    location: "Remote (Bangladesh)",
    employmentType: "Contract",
    description:
      "Write blog posts, case studies and job descriptions for our clients. You will turn rough briefs into clean, plain English that reads well and ranks.",
    requiredSkills: ["Copywriting", "SEO writing", "Editing", "Research", "English"],
    niceToHaveSkills: ["WordPress", "Bangla copywriting", "Social captions"],
    minYears: 2,
    educationLevel: "Any",
    certifications: [],
    hardFilters: { workPermitRequired: false, minYears: 1, mustHaveSkills: ["Copywriting"] },
    weights: { skills: 40, experience: 20, education: 10, certifications: 5, keywords: 25 },
    publicApplyEnabled: true,
    status: "open",
    companyKey: "dhaka",
    createdByKey: "imran",
    applicantCount: 9,
    newSinceLastVisit: 3,
  },
  {
    title: "Operations coordinator",
    department: "Operations",
    location: "Dhaka, Bangladesh (on-site)",
    employmentType: "Full-time",
    description:
      "Keep placements on track: schedule interviews, chase paperwork, and make sure candidates and clients always know the next step.",
    requiredSkills: ["Coordination", "MS Office", "Scheduling", "Communication", "Documentation"],
    niceToHaveSkills: ["ATS tools", "Vendor management", "Reporting"],
    minYears: 1,
    educationLevel: "Bachelor's degree",
    certifications: [],
    hardFilters: { workPermitRequired: false, minYears: 1, mustHaveSkills: ["Coordination"] },
    weights: { skills: 35, experience: 30, education: 15, certifications: 5, keywords: 15 },
    publicApplyEnabled: true,
    status: "open",
    companyKey: "dhaka",
    createdByKey: "farhana",
    applicantCount: 6,
    newSinceLastVisit: 1,
  },
];

/* ------------------------------------------------ applications linked to users --- */

const CANDIDATE_APPS = [
  {
    candidateKey: "tanjil",
    jobTitle: "Senior backend engineer",
    score: 81,
    status: "shortlisted",
    matchedSkills: ["Node.js", "TypeScript", "PostgreSQL", "REST APIs"],
    missingSkills: ["Docker", "AWS"],
    yearsExperience: 6,
    currentTitle: "Backend engineer",
    pastTitles: ["Software engineer"],
    educationLevel: "Bachelor's degree",
    appliedDaysAgo: 40,
  },
  {
    candidateKey: "tanjil",
    jobTitle: "Data analyst",
    score: 52,
    status: "screened",
    matchedSkills: ["SQL", "Excel"],
    missingSkills: ["Python", "Data visualisation"],
    yearsExperience: 2,
    currentTitle: "Backend engineer",
    pastTitles: [],
    educationLevel: "Bachelor's degree",
    appliedDaysAgo: 33,
  },
  {
    candidateKey: "tanjil",
    jobTitle: "Frontend engineer (React)",
    score: 88,
    status: "shortlisted",
    matchedSkills: ["React", "TypeScript", "CSS", "Testing", "REST APIs"],
    missingSkills: [],
    yearsExperience: 5,
    currentTitle: "Frontend engineer",
    pastTitles: ["Web developer"],
    educationLevel: "Bachelor's degree",
    appliedDaysAgo: 28,
  },
  {
    candidateKey: "nabila",
    jobTitle: "Product designer",
    score: 76,
    status: "shortlisted",
    matchedSkills: ["Figma", "Design systems", "Prototyping"],
    missingSkills: ["User research"],
    yearsExperience: 4,
    currentTitle: "Product designer",
    pastTitles: ["UI designer"],
    educationLevel: "Master's degree",
    appliedDaysAgo: 18,
  },
  {
    candidateKey: "nabila",
    jobTitle: "DevOps engineer",
    score: 61,
    status: "applied",
    matchedSkills: ["AWS", "Docker", "Linux"],
    missingSkills: ["Terraform", "Kubernetes", "CI/CD"],
    yearsExperience: 3,
    currentTitle: "Cloud engineer",
    pastTitles: [],
    educationLevel: "Bachelor's degree",
    appliedDaysAgo: 9,
  },
  {
    candidateKey: "shovon",
    jobTitle: "Senior backend engineer",
    score: 33,
    status: "rejected",
    matchedSkills: ["Node.js"],
    missingSkills: ["TypeScript", "PostgreSQL", "REST APIs", "Docker", "AWS"],
    yearsExperience: 2,
    currentTitle: "Junior developer",
    pastTitles: [],
    educationLevel: "Bachelor's degree",
    appliedDaysAgo: 26,
  },
  {
    candidateKey: "shovon",
    jobTitle: "Frontend engineer (React)",
    score: 58,
    status: "screened",
    matchedSkills: ["React", "CSS", "REST APIs"],
    missingSkills: ["TypeScript", "Testing"],
    yearsExperience: 3,
    currentTitle: "Frontend developer",
    pastTitles: ["Junior developer"],
    educationLevel: "Bachelor's degree",
    appliedDaysAgo: 21,
  },
  {
    candidateKey: "shovon",
    jobTitle: "Product designer",
    score: 49,
    status: "applied",
    matchedSkills: ["Figma", "Prototyping"],
    missingSkills: ["Design systems", "User research"],
    yearsExperience: 2,
    currentTitle: "Frontend developer",
    pastTitles: [],
    educationLevel: "Bachelor's degree",
    appliedDaysAgo: 7,
  },
  {
    candidateKey: "rumana",
    jobTitle: "Data analyst",
    score: 79,
    status: "shortlisted",
    matchedSkills: ["SQL", "Python", "Data visualisation", "Excel"],
    missingSkills: [],
    yearsExperience: 4,
    currentTitle: "Data analyst",
    pastTitles: ["BI analyst"],
    educationLevel: "Master's degree",
    appliedDaysAgo: 24,
  },
  {
    candidateKey: "rumana",
    jobTitle: "Marketing manager",
    score: 64,
    status: "screened",
    matchedSkills: ["Analytics", "SEO", "Content strategy"],
    missingSkills: ["B2B marketing", "Campaign management"],
    yearsExperience: 5,
    currentTitle: "Analytics lead",
    pastTitles: ["Content strategist"],
    educationLevel: "Bachelor's degree",
    appliedDaysAgo: 15,
  },
];

/* ------------------------------------------------ generated applicant pool --- */

const firstNames = [
  "Arif", "Sadia", "Tanvir", "Nusrat", "Rakib", "Farhana", "Imran", "Sabrina", "Mahin", "Tasnim",
  "Rifat", "Sumaiya", "Naimur", "Jannatul", "Fahim", "Ishrat", "Shakil", "Nabila", "Zahid", "Maliha",
  "Redwan", "Anika", "Sabbir", "Tania", "Ashraf", "Proma", "Mizanur", "Sharmin", "Hasib", "Lamia",
  "Rony", "Meherin", "Sajid", "Nawrin", "Tofael", "Ritu", "Nayeem", "Suraiya",
];
const lastNames = [
  "Islam", "Ahmed", "Hossain", "Chowdhury", "Akter", "Rahman", "Khan", "Uddin", "Sarkar", "Das",
  "Haque", "Alam", "Bhuiyan", "Mia", "Kabir", "Sultana", "Siddique", "Talukder", "Gazi", "Roy",
  "Dewan", "Mahmud", "Barua", "Sen", "Nath", "Podder", "Chakraborty", "Aziz", "Hasan", "Jahan",
  "Sikder", "Mondol", "Rashid", "Munshi", "Pramanik", "Bala", "Paul", "Molla",
];

const titlesByJobTitle = {
  "Senior backend engineer": [
    "Backend engineer", "Senior software engineer", "Platform engineer",
    "Full-stack developer", "API engineer",
  ],
  "Product designer": [
    "Product designer", "UX designer", "UI designer", "Senior product designer", "Design lead",
  ],
  "Data analyst": ["Data analyst", "BI analyst", "Operations analyst", "Reporting specialist"],
  "Frontend engineer (React)": [
    "Frontend engineer", "React developer", "UI engineer", "Web developer",
    "Senior frontend engineer",
  ],
  "DevOps engineer": [
    "DevOps engineer", "Site reliability engineer", "Platform engineer",
    "Infrastructure engineer", "Cloud engineer",
  ],
  "Marketing manager": [
    "Marketing manager", "Growth manager", "Brand manager", "Content lead",
    "Digital marketing lead",
  ],
  "QA engineer": [
    "QA engineer", "Test engineer", "SDET", "QA analyst", "Automation engineer",
  ],
  "Sourced - Senior React (LinkedIn + Wellfound)": [
    "Frontend engineer", "React developer", "Senior frontend engineer", "UI engineer",
    "Full-stack developer",
  ],
  "Mobile app developer (Flutter)": [
    "Flutter developer", "Mobile app developer", "Android developer", "Cross-platform developer",
  ],
  "HR business partner": [
    "HR business partner", "HR generalist", "People operations lead", "Talent acquisition specialist",
  ],
  "Customer success manager": [
    "Customer success manager", "Account manager", "Client relations manager", "Onboarding specialist",
  ],
  "Data engineer": [
    "Data engineer", "ETL developer", "Analytics engineer", "Data platform engineer",
  ],
  "Digital marketing executive": [
    "Digital marketing executive", "Social media executive", "Marketing associate", "SEO executive",
  ],
  "Accountant": ["Accountant", "Senior accountant", "Accounts officer", "Finance associate"],
  "Sales executive": ["Sales executive", "Business development executive", "Account executive", "Sales officer"],
  "IT support specialist": [
    "IT support specialist", "Helpdesk technician", "System support engineer", "IT executive",
  ],
  "Content writer": ["Content writer", "Copywriter", "Content executive", "SEO content writer"],
  "Operations coordinator": [
    "Operations coordinator", "Operations executive", "Recruitment coordinator", "Admin coordinator",
  ],
};

const educationLevels = ["High school", "Bachelor's degree", "Master's degree", "PhD"];

const scoreCurve = [
  94, 91, 88, 85, 82, 78, 74, 71, 68, 66, 63, 61, 58, 56, 54, 52, 49, 47, 44, 41, 38, 34, 29, 24,
];

const PIPELINE_JOBS = new Set([
  "Senior backend engineer",
  "Product designer",
  "Frontend engineer (React)",
]);

function seeded(n) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function buildBreakdown(job, score, salt) {
  const w = job.weights;
  const wobble = (k) => Math.max(0, Math.min(1, score / 100 + (seeded(salt * k) - 0.5) * 0.3));
  return [
    {
      dimension: "Skills match",
      weight: w.skills,
      scored: Math.round(w.skills * wobble(1)),
      note: "Weighted against the job's required skill list.",
    },
    {
      dimension: "Experience",
      weight: w.experience,
      scored: Math.round(w.experience * wobble(2)),
      note: `Compared against the ${job.minYears}-year requirement.`,
    },
    {
      dimension: "Education",
      weight: w.education,
      scored: Math.round(w.education * wobble(3)),
      note: `Requirement: ${job.educationLevel}.`,
    },
    {
      dimension: "Certifications",
      weight: w.certifications,
      scored: Math.round(w.certifications * wobble(4)),
      note: job.certifications.length
        ? `Looking for ${job.certifications.join(", ")}.`
        : "No certifications required for this role.",
    },
    {
      dimension: "Keyword match",
      weight: w.keywords,
      scored: Math.round(w.keywords * wobble(5)),
      note: "Terms from the job description found in the CV.",
    },
  ];
}

function generatedStatus(jobTitle, i) {
  if (PIPELINE_JOBS.has(jobTitle)) {
    if (i <= 3) return "shortlisted";
    if (i < 7) return "screened";
    if (i % 9 === 8) return "rejected";
    return "applied";
  }
  if (i < 2) return "shortlisted";
  if (i < 6) return "screened";
  if (i % 9 === 8) return "rejected";
  return "applied";
}

function buildGeneratedApplicants(jobDoc) {
  const defn = JOBS.find((j) => j.title === jobDoc.title);
  const count = defn.applicantCount;
  const titles = titlesByJobTitle[jobDoc.title] ?? ["Specialist", "Analyst", "Associate"];
  const docs = [];

  for (let i = 0; i < count; i++) {
    const salt = jobDoc.title.length * 100 + i + 1;
    const fn = firstNames[(salt * 2) % firstNames.length];
    const ln = lastNames[(salt * 3) % lastNames.length];

    const needsManualReview = i === 4 || (jobDoc.title === "DevOps engineer" && i === 6);
    const rawScore = scoreCurve[i % scoreCurve.length] - Math.round(seeded(salt) * 6);
    const score = needsManualReview ? 0 : Math.max(18, Math.min(97, rawScore));
    const matchedCount = Math.max(1, Math.round((score / 100) * jobDoc.requiredSkills.length));
    const years = Math.max(0, Math.round((score / 100) * (jobDoc.minYears + 3)));

    docs.push({
      jobId: jobDoc._id,
      name: `${fn} ${ln}`,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}.${salt}@example.com`,
      phone: `+8801${300000000 + ((salt * 137) % 600000000)}`,
      alias: `Candidate #${jobDoc.title.slice(0, 1)}${String.fromCharCode(65 + (i % 26))}${i + 1}`,
      // A screening batch has no public apply page - every CV was uploaded by HR.
      source: jobDoc.kind === "screening" || i % 3 === 0 ? "HR-uploaded" : "self-applied",
      score,
      scoreBreakdown: needsManualReview ? [] : buildBreakdown(jobDoc, score, salt),
      matchedSkills: jobDoc.requiredSkills.slice(0, matchedCount),
      missingSkills: jobDoc.requiredSkills.slice(matchedCount),
      yearsExperience: years,
      currentTitle: titles[i % titles.length],
      pastTitles: [titles[(i + 1) % titles.length], titles[(i + 2) % titles.length]],
      educationLevel: educationLevels[(salt + 1) % educationLevels.length],
      needsManualReview,
      status: generatedStatus(jobDoc.title, i),
      appliedAt: new Date(Date.now() - (60 - (i % 40)) * DAY),
      cvFileName: `${fn.toLowerCase()}-${ln.toLowerCase()}-cv.pdf`,
    });
  }
  return docs;
}

/* -------------------------------------------------------------- audit log --- */

const AUDIT_SEED = [
  { actor: "Nusrat Jahan", action: "Company registered", detail: "Bengal Recruitment - advance plan", companyKey: "bengal", daysAgo: 46 },
  { actor: "Sadia Islam", action: "Job created", detail: "Senior backend engineer", companyKey: "bengal", daysAgo: 44 },
  { actor: "Sadia Islam", action: "CVs uploaded", detail: "12 files to Senior backend engineer", companyKey: "bengal", daysAgo: 42 },
  { actor: "Sadia Islam", action: "Candidate shortlisted", detail: "3 candidate(s) on Senior backend engineer", companyKey: "bengal", daysAgo: 39 },
  { actor: "Sadia Islam", action: "Email sent", detail: "Invite to interview - 3 recipients", companyKey: "bengal", daysAgo: 38 },
  { actor: "Nusrat Jahan", action: "HR added", detail: "Tanvir Ahmed <tanvir@bengalrecruitment.com>", companyKey: "bengal", daysAgo: 36 },
  { actor: "Imran Hossain", action: "Company registered", detail: "Dhaka Talent Partners - basic plan", companyKey: "dhaka", daysAgo: 34 },
  { actor: "Farhana Akter", action: "Job created", detail: "Data analyst", companyKey: "dhaka", daysAgo: 33 },
  { actor: "Sadia Islam", action: "Job created", detail: "Frontend engineer (React)", companyKey: "bengal", daysAgo: 30 },
  { actor: "Afsana Mimi", action: "User updated", detail: "Rifat Chowdhury - hr, inactive", companyKey: null, daysAgo: 14 },
  { actor: "Farhana Akter", action: "Job updated", detail: "Marketing manager", companyKey: "dhaka", daysAgo: 8 },
  { actor: "Sadia Islam", action: "Candidate shortlisted", detail: "2 candidate(s) on Frontend engineer (React)", companyKey: "bengal", daysAgo: 3 },
  { actor: "Sadia Islam", action: "Email sent", detail: "Invite to interview - 4 recipients", companyKey: "bengal", daysAgo: 2 },
];

/* ------------------------------------------------------------ seed runner --- */

const HELPER_KEYS = ["companyKey", "createdByKey", "applicantCount"];

function stripHelperKeys(job) {
  const out = {};
  for (const [k, v] of Object.entries(job)) {
    if (!HELPER_KEYS.includes(k)) out[k] = v;
  }
  return out;
}

/**
 * @param {{ reset?: boolean }} [opts] When `reset` is true every collection is
 *   cleared first, so the DB ends up exactly matching this file.
 */
export async function seedDatabase({ reset = false } = {}) {
  if (reset) {
    await Promise.all([
      User.deleteMany({}),
      Company.deleteMany({}),
      Plan.deleteMany({}),
      Job.deleteMany({}),
      Application.deleteMany({}),
      SentEmail.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);
    console.log("Cleared users, companies, plans, jobs, applications, emails and the audit log");
  }

  await Plan.create(PLANS);

  const companyDocs = await Company.create(
    COMPANIES.map((c) => ({
      name: c.name,
      plan: c.plan,
      hrSeatLimit: c.plan ? SEAT_BY_PLAN[c.plan] : 0,
      status: c.status,
      subscriptionStartedAt: c.plan ? new Date(Date.now() - 46 * DAY) : null,
      subscriptionExpiresAt: c.plan ? new Date(Date.now() + c.expiresInDays * DAY) : null,
    })),
  );
  const companyByKey = Object.fromEntries(companyDocs.map((doc, i) => [COMPANIES[i].key, doc]));

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const superAdminDocs = await User.create(
    SUPER_ADMINS.map((u) => ({
      name: u.name,
      email: u.email,
      role: "superadmin",
      companyId: null,
      active: true,
      passwordHash,
    })),
  );
  const companyUserDocs = await User.create(
    COMPANY_USERS.map((u) => ({
      name: u.name,
      email: u.email,
      role: u.role,
      companyId: companyByKey[u.companyKey]._id,
      active: u.active,
      passwordHash,
    })),
  );
  const candidateDocs = await User.create(
    CANDIDATES.map((u) => ({
      name: u.name,
      email: u.email,
      role: "candidate",
      companyId: null,
      active: true,
      passwordHash,
    })),
  );

  const userByKey = Object.fromEntries([
    ...superAdminDocs.map((doc, i) => [SUPER_ADMINS[i].key, doc]),
    ...companyUserDocs.map((doc, i) => [COMPANY_USERS[i].key, doc]),
    ...candidateDocs.map((doc, i) => [CANDIDATES[i].key, doc]),
  ]);

  const jobDocs = await Job.create(
    JOBS.map((j) => ({
      ...stripHelperKeys(j),
      companyId: companyByKey[j.companyKey]._id,
      createdBy: userByKey[j.createdByKey]._id,
    })),
  );
  const jobByTitle = Object.fromEntries(jobDocs.map((doc) => [doc.title, doc]));

  // Anonymous applicant pool (no linked account) for every job.
  const generated = [];
  for (const jobDoc of jobDocs) generated.push(...buildGeneratedApplicants(jobDoc));
  const insertedGenerated = await Application.insertMany(generated);

  // One obvious duplicate submission on the backend role.
  const dupSource = insertedGenerated.find(
    (a) => a.jobId.toString() === jobByTitle["Senior backend engineer"]._id.toString(),
  );
  if (dupSource) {
    const dup = dupSource.toObject();
    delete dup._id;
    await Application.create({
      ...dup,
      alias: "Candidate #Bdup",
      source: "HR-uploaded",
      duplicateOf: dupSource._id,
      status: "applied",
      appliedAt: new Date(Date.now() - 20 * DAY),
    });
  }

  // Applications tied to the demo candidate accounts - a full pipeline each.
  const candidateApps = CANDIDATE_APPS.map((c, i) => {
    const job = jobByTitle[c.jobTitle];
    const user = userByKey[c.candidateKey];
    return {
      jobId: job._id,
      candidateId: user._id,
      name: user.name,
      email: user.email,
      phone: `+8801711${String(200 + i).padStart(6, "0")}`,
      alias: `Candidate #${c.jobTitle.slice(0, 1)}${user.name.split(" ").map((w) => w[0]).join("")}`,
      source: "self-applied",
      score: c.score,
      scoreBreakdown: buildBreakdown(job, c.score, 900 + i),
      matchedSkills: c.matchedSkills,
      missingSkills: c.missingSkills,
      yearsExperience: c.yearsExperience,
      currentTitle: c.currentTitle,
      pastTitles: c.pastTitles,
      educationLevel: c.educationLevel,
      needsManualReview: false,
      status: c.status,
      appliedAt: new Date(Date.now() - c.appliedDaysAgo * DAY),
      cvFileName: `${user.name.toLowerCase().replace(/\s+/g, "-")}-cv.pdf`,
    };
  });
  await Application.insertMany(candidateApps);

  // Every self-applied row gets the CV its numbers imply, then is re-scored
  // from that document - so a recruiter who shortlists one has something real
  // to open, and the breakdown can be checked against the file. HR-uploaded
  // rows are left alone: the product deliberately keeps no copy of those.
  const needCvs = await Application.find({ source: "self-applied", needsManualReview: false });
  const jobsById = new Map(jobDocs.map((j) => [j._id.toString(), j]));
  let cvCount = 0;
  for (const app of needCvs) {
    const job = jobsById.get(app.jobId.toString());
    if (!job) continue;
    const { unreadable } = await attachFittedCv(app, job, (file) => screenCv(file, job));
    if (unreadable) continue;
    await app.save();
    cvCount++;
  }

  // A couple of sent emails per job that has people past the blind stage.
  let emailCount = 0;
  for (const title of ["Senior backend engineer", "Product designer", "Frontend engineer (React)"]) {
    const job = jobByTitle[title];
    const advanced = await Application.find({
      jobId: job._id,
      status: "shortlisted",
    });
    const recipients = advanced.map((a) => a.email).filter(Boolean).slice(0, 4);
    if (!recipients.length) continue;
    await SentEmail.create({
      jobId: job._id,
      subject: `Interview invitation - ${title}`,
      body: `Hi,\n\nThank you for applying for ${title}. We'd love to talk further - could you share a few times that work for you next week?\n\nBest,\nThe hiring team`,
      template: "Invite to interview",
      recipients,
      sentAt: new Date(Date.now() - 6 * DAY),
    });
    emailCount++;
  }

  await AuditLog.insertMany(
    AUDIT_SEED.map((a) => ({
      actor: a.actor,
      action: a.action,
      detail: a.detail,
      companyId: a.companyKey ? companyByKey[a.companyKey]._id : null,
      timestamp: new Date(Date.now() - a.daysAgo * DAY),
    })),
  );

  const appTotal = await Application.countDocuments();
  console.log(
    `Seeded ${PLANS.length} plans, ${companyDocs.length} companies, ` +
      `${superAdminDocs.length + companyUserDocs.length + candidateDocs.length} users, ` +
      `${jobDocs.length} jobs, ${appTotal} applications (${cvCount} with a generated CV), ` +
      `${emailCount} sent emails, ` +
      `${AUDIT_SEED.length} audit entries. Password for every account: "${DEMO_PASSWORD}"`,
  );
}

/** Boot-time guard: only seeds a brand-new (empty) database. */
export async function seedIfEmpty() {
  const jobCount = await Job.countDocuments();
  if (jobCount > 0) {
    console.log("Seed skipped: data already present (run `npm run seed` to rebuild it)");
    return;
  }
  await seedDatabase({ reset: false });
}
