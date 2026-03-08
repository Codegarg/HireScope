import PDFDocument from 'pdfkit';
import { LAYOUT_CONFIG } from '../utils/resumeLayoutConstants.js';

/**
 * Generate a professional, one-page PDF from resume parsedText or structured data.
 * Matches the HTML layout logic for exact parity.
 *
 * @param {Object} resume - Resume document or candidate object
 * @returns {Promise<Buffer>} PDF buffer
 */
export const generateResumePDF = async (resume) => {
    return new Promise(async (resolve, reject) => {
        try {
            const { MARGINS, PAGE_WIDTH, PAGE_HEIGHT, FONT_SIZE, SPACING } = LAYOUT_CONFIG;
            const content = resume.parsedText || '';
            const title = resume.title || 'Resume';

            // ── Multi-pass Scaling Loop ───────────────────────────────────────
            // We start at BASE font size and decrease if it overflows 1 page.
            let currentFontSize = FONT_SIZE.BASE;
            let finalPdfBuffer = null;
            let attempts = 0;
            const maxAttempts = 5;

            while (attempts < maxAttempts) {
                const doc = new PDFDocument({
                    size: 'A4',
                    margins: {
                        top: MARGINS.TOP,
                        bottom: MARGINS.BOTTOM,
                        left: MARGINS.LEFT,
                        right: MARGINS.RIGHT
                    }
                });

                const buffers = [];
                doc.on('data', buffers.push.bind(buffers));

                // --- Rendering function ---
                const render = (d, size) => {
                    const headerSize = (size / FONT_SIZE.BASE) * FONT_SIZE.HEADER;
                    const sectionTitleSize = (size / FONT_SIZE.BASE) * FONT_SIZE.SECTION_TITLE;

                    // Header
                    d.fontSize(headerSize).font('Helvetica-Bold').text(title.toUpperCase(), { align: 'center' });
                    d.moveDown(0.5);
                    d.moveTo(MARGINS.LEFT, d.y).lineTo(PAGE_WIDTH - MARGINS.RIGHT, d.y).strokeColor('#333333').stroke();
                    d.moveDown(0.8);

                    // Body
                    // Body
                    if (resume.content) {
                        const json = resume.content;
                        d.fontSize(size).font('Helvetica').fillColor('#1a1a1a');

                        // 1. Personal Info Sub-header (if not already in title)
                        if (json.personalInfo) {
                            const pi = json.personalInfo;
                            const contactLine = [pi.email, pi.phone, pi.linkedin, pi.github].filter(Boolean).join('  |  ');
                            if (contactLine) {
                                d.fontSize(size - 1).font('Helvetica').text(contactLine, { align: 'center' });
                                d.moveDown(1);
                            }
                        }

                        // 2. Summary
                        if (json.summary) {
                            d.fontSize(sectionTitleSize).font('Helvetica-Bold').text('SUMMARY');
                            d.fontSize(size).font('Helvetica').text(json.summary, { lineGap: 2 });
                            d.moveDown(0.8);
                        }

                        // 3. Experience
                        if (json.experience && json.experience.length > 0) {
                            d.fontSize(sectionTitleSize).font('Helvetica-Bold').text('EXPERIENCE');
                            json.experience.forEach(exp => {
                                d.fontSize(size).font('Helvetica-Bold').text(`${exp.role} @ ${exp.organization}`, { continued: true });
                                d.fontSize(size - 1).font('Helvetica-Oblique').text(`  (${exp.startDate} - ${exp.endDate})`, { align: 'right' });
                                if (exp.points) {
                                    exp.points.forEach(p => {
                                        d.fontSize(size).font('Helvetica').text(`• ${p}`, { indent: 15, lineGap: 1 });
                                    });
                                }
                                d.moveDown(0.5);
                            });
                        }

                        // 4. Projects
                        if (json.projects && json.projects.length > 0) {
                            d.fontSize(sectionTitleSize).font('Helvetica-Bold').text('PROJECTS');
                            json.projects.forEach(proj => {
                                d.fontSize(size).font('Helvetica-Bold').text(proj.name, { continued: !!proj.link });
                                if (proj.link) d.fontSize(size - 1).font('Helvetica').text(` (${proj.link})`, { align: 'right' });
                                if (proj.descriptionPoints) {
                                    proj.descriptionPoints.forEach(p => {
                                        d.fontSize(size).font('Helvetica').text(`• ${p}`, { indent: 15, lineGap: 1 });
                                    });
                                }
                                d.moveDown(0.5);
                            });
                        }

                        // 5. Skills
                        if (json.skills) {
                            d.fontSize(sectionTitleSize).font('Helvetica-Bold').text('SKILLS');
                            const skillCategories = ['languages', 'core', 'frontend', 'backend', 'databases', 'cloud', 'tools'];
                            skillCategories.forEach(cat => {
                                if (json.skills[cat] && json.skills[cat].length > 0) {
                                    d.fontSize(size).font('Helvetica-Bold').text(`${cat.charAt(0).toUpperCase() + cat.slice(1)}: `, { continued: true });
                                    d.font('Helvetica').text(json.skills[cat].join(', '));
                                }
                            });
                            d.moveDown(0.8);
                        }

                        // 6. Education
                        if (json.education && json.education.length > 0) {
                            d.fontSize(sectionTitleSize).font('Helvetica-Bold').text('EDUCATION');
                            json.education.forEach(edu => {
                                d.fontSize(size).font('Helvetica-Bold').text(edu.degree, { continued: true });
                                d.fontSize(size - 1).font('Helvetica-Oblique').text(`  ${edu.institution} (${edu.startYear} - ${edu.endYear})`, { align: 'right' });
                                d.moveDown(0.3);
                            });
                            d.moveDown(0.5);
                        }

                        // 7. Certifications & Awards
                        const hasCerts = json.certifications && json.certifications.length > 0;
                        const hasAwards = json.awards && json.awards.length > 0;
                        if (hasCerts || hasAwards) {
                            d.fontSize(sectionTitleSize).font('Helvetica-Bold').text('CERTIFICATIONS & AWARDS');
                            if (hasCerts) {
                                json.certifications.forEach(c => d.fontSize(size).font('Helvetica').text(`• ${c}`, { indent: 15 }));
                            }
                            if (hasAwards) {
                                json.awards.forEach(a => d.fontSize(size).font('Helvetica').text(`• ${a}`, { indent: 15 }));
                            }
                            d.moveDown(0.8);
                        }

                        // 8. Languages
                        if (json.spokenLanguages && json.spokenLanguages.length > 0) {
                            d.fontSize(sectionTitleSize).font('Helvetica-Bold').text('LANGUAGES');
                            d.fontSize(size).font('Helvetica').text(json.spokenLanguages.join('  •  '));
                            d.moveDown(0.8);
                        }

                    } else if (content) {
                        d.fontSize(size).font('Helvetica').fillColor('#1a1a1a');
                        d.text(content, {
                            align: 'left',
                            lineGap: SPACING.LINE_GAP,
                            paragraphGap: SPACING.PARAGRAPH_GAP
                        });
                    } else {
                        d.fontSize(size).font('Helvetica-Oblique').fillColor('#888888').text('No content available.', { align: 'center' });
                    }

                    // No footer — keep resume clean and minimal
                };

                render(doc, currentFontSize);
                doc.end();

                const buffer = await new Promise((res) => {
                    doc.on('end', () => res(Buffer.concat(buffers)));
                });

                // Check for overflow (simplified: pdfkit adds pages automatically)
                // If doc has more than 1 page, we must shrink and retry.
                if (doc.bufferedPageRange().count > 1 && currentFontSize > FONT_SIZE.MIN) {
                    currentFontSize -= 0.5;
                    attempts++;
                } else if (doc.bufferedPageRange().count === 1 && currentFontSize < FONT_SIZE.MAX && attempts === 0) {
                    // If it fits very easily and we haven't shrunk yet, try growing slightly
                    // (Optional: can be skipped for predictability)
                    finalPdfBuffer = buffer;
                    break;
                } else {
                    finalPdfBuffer = buffer;
                    break;
                }
            }

            resolve(finalPdfBuffer);
        } catch (error) {
            reject(error);
        }
    });
};
