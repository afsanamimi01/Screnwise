import bcrypt from "bcryptjs";
import User from "./models/User.model.js";
import Job from "./models/Job.model.js";

const DEMO_PASSWORD = "demo1234";

export async function seedIfEmpty() {
  const jobCount = await Job.countDocuments();
  if (jobCount > 0) {
    console.log("Seed skipped: data already present");
    return;
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const users = await User.create([
    { name: "Afsana Mimi", email: "admin@screenwise.io", role: "admin", active: true, passwordHash },
    { name: "Nadia Rahman", email: "nadia@screenwise.io", role: "hr", active: true, passwordHash },
    { name: "Tomal", email: "tomal@screenwise.io", role: "hr", active: true, passwordHash },
    { name: "Priya Nair", email: "priya@screenwise.io", role: "manager", active: true, passwordHash },
    { name: "Jordan Blake", email: "jordan@example.com", role: "candidate", active: true, passwordHash },
    { name: "Marc Dubois", email: "marc@screenwise.io", role: "hr", active: false, passwordHash },
  ]);
  const [, hr1, hr2, manager] = users;

  await Job.create([
    {
      title: "Senior backend engineer",
      department: "Engineering",
      location: "Berlin, Germany (hybrid)",
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
      createdBy: hr1._id,
      managerIds: [manager._id],
    },
    {
      title: "Product designer",
      department: "Design",
      location: "Remote (EU)",
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
      createdBy: hr1._id,
      managerIds: [manager._id],
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
      createdBy: hr2._id,
      managerIds: [],
    },
  ]);

  console.log(`Seeded 5 demo users and 3 demo jobs (password for all: "${DEMO_PASSWORD}")`);
}
