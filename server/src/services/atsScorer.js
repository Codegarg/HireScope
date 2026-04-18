/**
 * HireScope — Hybrid ATS Scoring Orchestrator
 * Used by: analysis.controller.js  (file-upload flow)
 *
 * finalScore = 0.7 × ruleScore + 0.3 × llmScore
 *
 * Falls back gracefully if Llama 3 / Cloudflare is unavailable.
 */

import { ruleBasedATSScore, extractExperienceYears, containsKeyword } from "../utils/atsEngine.js";
import { callLlamaEvaluator } from "./ai.service.js";
import { cleanText } from "../utils/textCleaner.util.js";
import { GENERIC_SKILLS } from "../utils/skillDictionary.util.js";

// ── Knockout Gate ─────────────────────────────────────────────────────────────
/**
 * Checks hard disqualifiers BEFORE combining scores.
 * A triggered knockout caps the final score at 30.
 */
const evaluateKnockouts = (ruleResult, llmResult, resumeText, jdText) => {
  const knockouts = [];

  // Rule-based knockouts
  if (!resumeText || resumeText.trim().length < 50) {
    knockouts.push("Resume is empty or too short to evaluate.");
  }

  if (ruleResult.matchedSkills.length === 0 && ruleResult.missingCriticalSkills.length > 0) {
    knockouts.push(`No required skills found: ${ruleResult.missingCriticalSkills.slice(0, 3).join(", ")}.`);
  }

  // Experience years knockout
  const { experienceYearsRequired, experienceYearsFound } = ruleResult;
  if (
    experienceYearsRequired !== null &&
    experienceYearsFound !== null &&
    experienceYearsFound < experienceYearsRequired - 1
  ) {
    knockouts.push(
      `Experience mismatch: JD requires ${experienceYearsRequired} year(s), resume shows ${experienceYearsFound}.`
    );
  }

  // LLM-detected knockouts
  if (llmResult?.knockouts?.length > 0) {
    llmResult.knockouts.forEach((k) => {
      if (!knockouts.includes(k)) knockouts.push(k);
    });
  }

  return knockouts;
};

// ── Risk Detection Layer ──────────────────────────────────────────────────────
const detectRisks = (ruleResult, llmResult) => {
  const risks = [];

  if (ruleResult.yearsMismatch) {
    risks.push(
      `Experience gap: ${ruleResult.experienceYearsFound} years found vs ${ruleResult.experienceYearsRequired} required.`
    );
  }

  if (ruleResult.breakdown.actionVerbScore < 2) {
    risks.push("Resume lacks strong action verbs — may score low in recruiter review.");
  }

  if (ruleResult.breakdown.semanticScore < 3) {
    risks.push("Low semantic alignment with JD — language doesn't mirror role terminology.");
  }

  if (ruleResult.breakdown.sectionScore < 5) {
    risks.push("Key sections missing — ATS parsers may fail to categorize resume properly.");
  }

  // Merge LLM risks
  if (llmResult?.risks?.length > 0) {
    llmResult.risks.forEach((r) => {
      if (!risks.includes(r)) risks.push(r);
    });
  }

  return risks;
};

// ── Main Export ───────────────────────────────────────────────────────────────
/**
 * @param {string} resumeText - Plain text of the resume
 * @param {string} jdText - Plain text of the job description
 * @param {Object} [options]
 * @param {number} [options.previousScore] - Score before Magic Improve (for delta)
 * @returns {Promise<Object>} Full hybrid ATS result
 */
export const calculateATSScore = async (resumeText, jdText, options = {}) => {
  const { previousScore = null } = options;

  const cleanResume = cleanText(resumeText);
  const cleanJD = cleanText(jdText);

  // ── Step 1: Rule-based scoring (sync, always runs) ────────────────────────
  const ruleResult = ruleBasedATSScore(cleanResume, cleanJD);
  const ruleScore = ruleResult.ruleScore;

  // ── Step 2: Llama 3 evaluation (async, fault-tolerant) ────────────────────
  let llmResult = null;
  let llmFallback = false;

  try {
    llmResult = await callLlamaEvaluator(cleanResume, cleanJD, ruleResult);
  } catch (err) {
    console.warn("[HybridATS] LLM evaluation failed, using fallback:", err.message);
    llmFallback = true;
  }

  // Determine LLM score
  const llmScore = llmResult !== null ? llmResult.score : ruleScore;
  if (llmResult === null) llmFallback = true;
  
  // ── Step 2.5: Merge AI-inferred skills into lists ─────────────────────────
  // This allows the system to analyze skills even if not explicitly typed in JD
  let finalMatched = [...ruleResult.matchedSkills];
  let finalMissing = [...ruleResult.missingSkills];
  let finalMissingCritical = [...ruleResult.missingCriticalSkills];
  
  if (llmResult?.targetSkillsAnalysis?.length > 0) {
    llmResult.targetSkillsAnalysis.forEach(item => {
        const s = item.skill.toLowerCase().trim();
        const matchedViaAI = item.evidenceInResume === true;

        // Dedup: if already matched via keywords, skip
        if (finalMatched.includes(s)) return;
        
        if (matchedViaAI) {
            finalMatched.push(s);
            // If it was in missing, remove it
            finalMissing = finalMissing.filter(m => m !== s);
            finalMissingCritical = finalMissingCritical.filter(m => m !== s);
        } else {
            // If not matched via AI AND not matched via keywords, it is missing
            if (!finalMissing.includes(s)) {
                finalMissing.push(s);
                // AI target skills are usually considered important
                if (finalMissingCritical.length < 12) finalMissingCritical.push(s);
            }
        }
    });
  }

  // ── Step 2.6: Filter Generic/Basic Skills ─────────────────────────────────
  // Hide basic skills from specific lists as requested, keeping them only for semantic overlap
  const isGeneric = (s) => GENERIC_SKILLS.includes(s.toLowerCase().trim());
  finalMatched = finalMatched.filter(s => !isGeneric(s));
  finalMissing = finalMissing.filter(s => !isGeneric(s));
  finalMissingCritical = finalMissingCritical.filter(s => !isGeneric(s));

  // ── Step 3: Combine scores ────────────────────────────────────────────────
  const combinedScore = Math.round(0.7 * ruleScore + 0.3 * llmScore);

  // ── Step 4: Knockout simulation ───────────────────────────────────────────
  const knockouts = evaluateKnockouts(ruleResult, llmResult, cleanResume, cleanJD);
  let finalScore = combinedScore;

  // Each knockout reduces the score significantly (max cap at 30 if any active)
  if (knockouts.length > 0) {
    const knockoutPenalty = Math.min(knockouts.length * 12, 40);
    finalScore = Math.min(finalScore, 100 - knockoutPenalty);
    
    // Adjusted to use hybrid lists for knockout curve
    const totalCritical = finalMissingCritical.length + finalMatched.length;
    const matchRatio = finalMatched.length / Math.max(totalCritical, 1);
    
    finalScore = Math.min(finalScore, 30 + (100 - 30) * matchRatio);
    finalScore = Math.round(Math.max(finalScore, 0));
  }

  finalScore = Math.min(Math.max(finalScore, 0), 100);

  // ── Step 5: Risk detection ────────────────────────────────────────────────
  const risks = detectRisks(ruleResult, llmResult);

  // ── Step 6: Score delta (after Magic Improve) ─────────────────────────────
  const scoreDelta =
    previousScore !== null && typeof previousScore === "number"
      ? finalScore - previousScore
      : null;

  // ── Step 7: Role alignment ────────────────────────────────────────────────
  const roleAlignment =
    llmResult?.roleAlignment ??
    Math.round((ruleResult.breakdown.experienceMatch / 15) * 100 * 0.5 +
      (ruleResult.breakdown.semanticScore / 10) * 100 * 0.5);

  // ── Step 8: Build improvement suggestions ────────────────────────────────
  const suggestions = [...(ruleResult.improvementSuggestions || [])];
  
  if (ruleResult.matchedSkills.length === 0 && ruleResult.missingSkills.length === 0) {
    suggestions.push("💡 Note: No specific technical keywords were identified in the JD. This analysis focuses on general structure and experience.");
  }
  
  if (knockouts.length > 0)
    suggestions.push("⚠ Address knockout factors first before applying.");
  if (risks.length > 0 && !suggestions.some((s) => s.includes("risk")))
    risks.forEach((r) => suggestions.push(`Risk: ${r}`));

  // ── Step 9: Compose final result ──────────────────────────────────────────
  return {
    // Core scores
    atsScore: finalScore,
    overallScore: finalScore,
    score: finalScore,
    ruleScore,
    llmScore,
    llmFallback,

    // Breakdown (8 components from rule engine)
    breakdown: ruleResult.breakdown,

    // Lists
    matchedSkills: finalMatched,
    missingSkills: finalMissing,
    missingCriticalSkills: finalMissingCritical,
    weakSections: ruleResult.weakSections,
    improvementSuggestions: suggestions.slice(0, 10),

    // Hybrid extras
    knockouts,
    risks,
    roleAlignment,
    noKeywordsInJD: finalMatched.length === 0 && finalMissing.length === 0,

    // Experience validation
    experienceYearsRequired: ruleResult.experienceYearsRequired ?? llmResult?.experienceYearsRequired ?? null,
    experienceYearsFound: ruleResult.experienceYearsFound ?? llmResult?.experienceYearsFound ?? null,
    yearsMismatch: ruleResult.yearsMismatch || llmResult?.yearsMismatch || false,

    // Delta (after Magic Improve)
    previousScore,
    scoreDelta,
    scoreDeltaLabel:
      scoreDelta === null
        ? null
        : scoreDelta > 0
          ? `+${scoreDelta} improvement after AI optimization`
          : scoreDelta === 0
            ? "No change after AI optimization"
            : `${scoreDelta} score change`,

    // LLM evaluation notes
    evaluationNotes: llmResult?.evaluationNotes || null,

    // Legacy shape (frontend compatibility — ATSAnalysis.jsx reads these)
    analysis: ruleResult.analysis,
    matchRate: ruleResult.matchRate,
    matchingKeywords: ruleResult.matchingKeywords || [],
  };
};
