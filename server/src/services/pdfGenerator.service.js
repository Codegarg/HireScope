import puppeteer from 'puppeteer';

/**
 * Generate a professional, one-page PDF from resume structured data using Puppeteer.
 * This guarantees 1:1 parity with the frontend InlineResumeEditor.
 *
 * @param {Object} resume - Resume document or candidate object
 * @returns {Promise<Buffer>} PDF buffer
 */
export const generateResumePDF = async (resume) => {
    return new Promise(async (resolve, reject) => {
        let browser = null;
        try {
            const content = resume.content || {};
            const title = resume.title || 'Resume';

            // Generate exact HTML structure to match InlineResumeEditor
            const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {
                        margin: 0;
                        padding: 40px 50px;
                        font-family: Helvetica, Arial, sans-serif;
                        color: #1a1a1a;
                        font-size: 11px;
                        background: white;
                        box-sizing: border-box;
                    }
                    .header { text-align: center; margin-bottom: 24px; }
                    .header-title { font-size: 22px; font-weight: bold; text-transform: uppercase; }
                    .header hr { border: none; border-top: 1px solid #333; margin: 8px 0 12px 0; }
                    .header-contact { font-size: 10px; display: flex; justify-content: center; gap: 16px; flex-wrap: wrap; }
                    .section { margin-bottom: 16px; page-break-inside: avoid; }
                    .section-title { font-size: 13px; font-weight: bold; margin-bottom: 6px; text-transform: uppercase; border-bottom: 1px solid #333; padding-bottom: 2px; }
                    .summary-text { line-height: 1.5; }
                    .item { margin-bottom: 10px; page-break-inside: avoid; }
                    .item-header { display: flex; justify-content: space-between; align-items: baseline; }
                    .item-title { font-weight: bold; }
                    .item-meta { font-style: italic; }
                    ul { margin: 4px 0 0 0; padding-left: 20px; line-height: 1.4; }
                    li { margin-bottom: 2px; }
                    .skills-cat { line-height: 1.6; }
                    .skills-cat strong { font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="header-title">${escapeHTML(content.personalInfo?.fullName || title.toUpperCase())}</div>
                    <hr />
                    <div class="header-contact">
                        ${content.personalInfo?.email ? `<a href="mailto:${escapeHTML(content.personalInfo.email)}" style="color: inherit; text-decoration: none;">${escapeHTML(content.personalInfo.email)}</a>` : ''}
                        ${content.personalInfo?.email && content.personalInfo?.phone ? `<span style="margin: 0;">|</span>` : ''}
                        ${content.personalInfo?.phone ? `<span>${escapeHTML(content.personalInfo.phone)}</span>` : ''}
                        ${(content.personalInfo?.email || content.personalInfo?.phone) && content.personalInfo?.linkedin ? `<span style="margin: 0;">|</span>` : ''}
                        ${content.personalInfo?.linkedin ? `<a href="${escapeHTML(content.personalInfo.linkedin.startsWith('http') ? content.personalInfo.linkedin : `https://${content.personalInfo.linkedin}`)}" style="color: inherit; text-decoration: none;" target="_blank">LinkedIn: ${escapeHTML(content.personalInfo.linkedin.replace(/^https?:\/\//, ''))}</a>` : ''}
                        ${(content.personalInfo?.email || content.personalInfo?.phone || content.personalInfo?.linkedin) && content.personalInfo?.github ? `<span style="margin: 0;">|</span>` : ''}
                        ${content.personalInfo?.github ? `<a href="${escapeHTML(content.personalInfo.github.startsWith('http') ? content.personalInfo.github : `https://${content.personalInfo.github}`)}" style="color: inherit; text-decoration: none;" target="_blank">GitHub: ${escapeHTML(content.personalInfo.github.replace(/^https?:\/\//, ''))}</a>` : ''}
                    </div>
                </div>

                ${content.summary ? `
                <div class="section">
                    <div class="section-title">SUMMARY</div>
                    <div class="summary-text">${escapeHTML(content.summary)}</div>
                </div>
                ` : ''}

                ${content.experience && content.experience.length > 0 ? `
                <div class="section">
                    <div class="section-title">EXPERIENCE</div>
                    ${content.experience.map(exp => `
                        <div class="item">
                            <div class="item-header">
                                <div class="item-title">${escapeHTML(exp.role)}${exp.organization ? ` @ ${escapeHTML(exp.organization)}` : ''}</div>
                                <div class="item-meta">(${escapeHTML(exp.startDate)} - ${escapeHTML(exp.endDate)})</div>
                            </div>
                            <ul>
                                ${(exp.points || []).filter(p => p.trim()).map(p => `<li>${escapeHTML(p)}</li>`).join('')}
                            </ul>
                        </div>
                    `).join('')}
                </div>
                ` : ''}

                ${content.projects && content.projects.length > 0 ? `
                <div class="section">
                    <div class="section-title">PROJECTS</div>
                    ${content.projects.map(proj => `
                        <div class="item">
                            <div class="item-header">
                                <div class="item-title">${escapeHTML(proj.name)}</div>
                                ${proj.link ? `<a href="${escapeHTML(proj.link.startsWith('http') ? proj.link : 'https://' + proj.link)}" target="_blank" style="text-decoration: none; color: #2563eb;">${escapeHTML(proj.link).toLowerCase().includes('github') ? 'GitHub' : 'Link'}</a>` : ''}
                            </div>
                            <ul>
                                ${(proj.descriptionPoints || []).filter(p => p.trim()).map(p => `<li>${escapeHTML(p)}</li>`).join('')}
                            </ul>
                        </div>
                    `).join('')}
                </div>
                ` : ''}

                ${content.skills && Object.keys(content.skills).length > 0 ? `
                <div class="section">
                    <div class="section-title">SKILLS</div>
                    ${['languages', 'core', 'frontend', 'backend', 'databases', 'cloud', 'tools'].map(cat => {
                        if (content.skills[cat] && content.skills[cat].length > 0) {
                            return `<div class="skills-cat"><strong>${escapeHTML(cat.charAt(0).toUpperCase() + cat.slice(1))}:</strong> ${escapeHTML(content.skills[cat].join(', '))}</div>`;
                        }
                        return '';
                    }).join('')}
                </div>
                ` : ''}

                ${content.education && content.education.length > 0 ? `
                <div class="section">
                    <div class="section-title">EDUCATION</div>
                    ${content.education.map(edu => `
                        <div class="item">
                            <div class="item-header">
                                <div class="item-title">${escapeHTML(edu.degree)}</div>
                                <div class="item-meta">${escapeHTML(edu.institution)} (${escapeHTML(edu.startYear)} - ${escapeHTML(edu.endYear)})</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                ` : ''}

                ${(content.certifications && content.certifications.length > 0) || (content.awards && content.awards.length > 0) ? `
                <div class="section">
                    <div class="section-title">CERTIFICATIONS & AWARDS</div>
                    <ul>
                        ${(content.certifications || []).filter(c => c.trim()).map(c => `<li>${escapeHTML(c)}</li>`).join('')}
                        ${(content.awards || []).filter(a => a.trim()).map(a => `<li>${escapeHTML(a)}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}

                ${content.spokenLanguages && content.spokenLanguages.length > 0 ? `
                <div class="section">
                    <div class="section-title">LANGUAGES</div>
                    <div>${content.spokenLanguages.map(l => escapeHTML(l)).join('  •  ')}</div>
                </div>
                ` : ''}
            </body>
            </html>
            `;

            browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });
            
            // Auto-scale to fit on one page if needed.
            // A4 page height is approx 1122px at 96dpi. If our content is taller, we scale it down.
            const contentHeight = await page.evaluate(() => document.body.scrollHeight);
            const targetHeight = 1040; // 1122 - top/bottom margins roughly
            
            let scale = 1.0;
            if (contentHeight > targetHeight) {
                scale = Math.max(0.7, targetHeight / contentHeight); // Shrink up to 70%
            } else if (contentHeight < targetHeight * 0.7) {
                scale = 1.05; // Slightly enlarge if very small
            }

            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                scale: scale,
                margin: {
                    top: '0px',
                    right: '0px',
                    bottom: '0px',
                    left: '0px'
                }
            });

            resolve(pdfBuffer);
        } catch (error) {
            console.error('PDF Generation Error:', error);
            reject(error);
        } finally {
            if (browser) {
                await browser.close().catch(console.error);
            }
        }
    });
};

function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

