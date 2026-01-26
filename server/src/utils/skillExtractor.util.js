// A starter, extensible skill dictionary.
// We will expand/refine this later or replace with AI.
const SKILL_DICTIONARY = [
  "javascript",
  "typescript",
  "react",
  "next.js",
  "node",
  "express",
  "mongodb",
  "sql",
  "postgres",
  "mysql",
  "html",
  "css",
  "tailwind",
  "python",
  "java",
  "c++",
  "aws",
  "docker",
  "kubernetes",
  "git",
  "github",
  "rest",
  "api",
  "graphql",
  "redis",
  "linux",
];

export const extractSkills = (text) => {
  if (!text) return [];

  const normalized = text.toLowerCase();

  const foundSkills = SKILL_DICTIONARY.filter((skill) =>
    normalized.includes(skill)
  );

  // Remove duplicates just in case
  return [...new Set(foundSkills)];
};
