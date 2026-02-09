import { cleanText } from "../utils/textCleaner.util.js";
import { extractSkills } from "../utils/skillExtractor.util.js";
import {
  EXPERIENCE_KEYWORDS,
  RESUME_SECTIONS
} from "../utils/skillDictionary.util.js";

const BASELINE_SKILLS = ["java", "sql", "rest api", "git"];

export const calculateATSScore = (resumeText, jdText) => {
  const cleanResume = cleanText(resumeText);
  const cleanJD = cleanText(jdText);

  // Extract skills
  let jdSkills = extractSkills(cleanJD);
  const resumeSkills = extractSkills(cleanResume);

  // 🔥 NEW: Handle vague JD (no skills mentioned)
  const hasExperienceSignals = EXPERIENCE_KEYWORDS.some(word =>
    cleanJD.includes(word)
  );

  let usingBaselineSkills = false;

  if (jdSkills.length === 0 && hasExperienceSignals) {
    jdSkills = BASELINE_SKILLS;
    usingBaselineSkills = true;
  }

  // Skill matching
  const matchedSkills = jdSkills.filter(skill =>
    resumeSkills.includes(skill)
  );

  const missingSkills = jdSkills.filter(
    skill => !resumeSkills.includes(skill)
  );

  // Skill score (60%)
  const skillScore =
    jdSkills.length === 0
      ? 0
      : Math.round((matchedSkills.length / jdSkills.length) * 100);

  // Experience score (20%)
  let experienceCount = 0;
  EXPERIENCE_KEYWORDS.forEach(word => {
    if (cleanResume.includes(word)) experienceCount++;
  });

  const experienceScore = Math.min(
    Math.round((experienceCount / EXPERIENCE_KEYWORDS.length) * 100),
    100
  );

  // Resume structure score (20%)
  let sectionCount = 0;
  RESUME_SECTIONS.forEach(section => {
    if (cleanResume.includes(section)) sectionCount++;
  });

  const structureScore = Math.round(
    (sectionCount / RESUME_SECTIONS.length) * 100
  );

  // Final ATS score
  let atsScore = Math.round(
    skillScore * 0.6 +
    experienceScore * 0.2 +
    structureScore * 0.2
  );

  // 🔥 NEW: Frequency boost (Bonus points if matched skills appear multiple times)
  let frequencyBonus = 0;
  matchedSkills.forEach(skill => {
    const occurrences = (cleanResume.match(new RegExp(`\\b${skill}\\b`, "g")) || []).length;
    if (occurrences > 2) frequencyBonus += 2; // +2 points per heavily mentioned skill
  });
  atsScore = Math.min(atsScore + frequencyBonus, 100);

  // 🔥 NEW: Cap score for vague JD
  if (usingBaselineSkills && atsScore > 50) {
    atsScore = 50;
  }

  return {
    atsScore,
    matchedSkills,
    missingSkills,
    breakdown: {
      skillScore,
      experienceScore,
      structureScore
    },
    meta: {
      vagueJDHandled: usingBaselineSkills
    }
  };
};
