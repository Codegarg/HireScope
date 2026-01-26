export const calculateATS = (resumeSkills, jdSkills) => {
  if (!jdSkills || jdSkills.length === 0) {
    return {
      atsScore: 0,
      matchedSkills: [],
      missingSkills: [],
    };
  }

  const matchedSkills = resumeSkills.filter((skill) =>
    jdSkills.includes(skill)
  );

  const missingSkills = jdSkills.filter(
    (skill) => !resumeSkills.includes(skill)
  );

  const atsScore = Math.round(
    (matchedSkills.length / jdSkills.length) * 100
  );

  return {
    atsScore,
    matchedSkills,
    missingSkills,
  };
};
