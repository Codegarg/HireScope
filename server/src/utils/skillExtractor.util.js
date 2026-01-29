// server/src/utils/skillExtractor.util.js

import { SKILLS } from "./skillDictionary.util.js";

export const extractSkills = (text = "") => {
  const foundSkills = new Set();

  SKILLS.forEach((skill) => {
    const pattern = new RegExp(`\\b${skill}\\b`, "i");
    if (pattern.test(text)) {
      foundSkills.add(skill);
    }
  });

  return Array.from(foundSkills);
};
