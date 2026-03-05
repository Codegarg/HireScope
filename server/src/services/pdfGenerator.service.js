import PDFDocument from 'pdfkit';

/**
 * Generate a professional PDF from resume content
 * @param {Object} resume - Resume object from database
 * @returns {Promise<Buffer>} PDF buffer
 */
export const generateResumePDF = async (resume) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margins: { top: 50, bottom: 50, left: 50, right: 50 }
            });

            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfBuffer = Buffer.concat(buffers);
                resolve(pdfBuffer);
            });
            doc.on('error', reject);

            // Use structured data if available, otherwise fallback to top-level fields
            const data = resume.resumeData || resume;
            const currentVersion = resume.versions && resume.versions.length > 0
                ? resume.versions[resume.versionCounter ? (resume.versions.length - 1) : 0]
                : null;

            const content = currentVersion?.content || resume.parsedText || resume.originalContent || '';

            // Header - Name and Title
            doc.fontSize(24)
                .font('Helvetica-Bold')
                .text(resume.title || 'Resume', { align: 'center' });

            doc.moveDown(0.5);

            // Personal Info Section
            if (data.personalInfo) {
                const { fullName, email, phone, linkedin, github, website } = data.personalInfo;

                if (fullName) {
                    doc.fontSize(20)
                        .font('Helvetica-Bold')
                        .text(fullName, { align: 'center' });
                    doc.moveDown(0.3);
                }

                doc.fontSize(10)
                    .font('Helvetica');

                const contactInfo = [];
                if (email) contactInfo.push(email);
                if (phone) contactInfo.push(phone);
                if (linkedin) contactInfo.push(linkedin);
                if (github) contactInfo.push(github);
                if (website) contactInfo.push(website);

                if (contactInfo.length > 0) {
                    doc.text(contactInfo.join(' | '), { align: 'center' });
                    doc.moveDown(1);
                }
            }

            // If we have structured data, format it nicely
            if (data.personalInfo?.summary) {
                addSection(doc, 'PROFESSIONAL SUMMARY', data.personalInfo.summary);
            }

            // Experience Section
            if (data.experience && data.experience.length > 0) {
                doc.fontSize(14)
                    .font('Helvetica-Bold')
                    .text('EXPERIENCE', { underline: true });
                doc.moveDown(0.5);

                data.experience.forEach(exp => {
                    doc.fontSize(12)
                        .font('Helvetica-Bold')
                        .text(exp.position || 'Position');

                    doc.fontSize(11)
                        .font('Helvetica-Oblique')
                        .text(`${exp.company || 'Company'} | ${exp.startDate || ''} - ${exp.current ? 'Present' : exp.endDate || ''}`);

                    if (exp.description) {
                        doc.fontSize(10)
                            .font('Helvetica')
                            .text(exp.description, { align: 'left' });
                    }
                    doc.moveDown(0.8);
                });
            }

            // Education Section
            if (data.education && data.education.length > 0) {
                doc.fontSize(14)
                    .font('Helvetica-Bold')
                    .text('EDUCATION', { underline: true });
                doc.moveDown(0.5);

                data.education.forEach(edu => {
                    doc.fontSize(12)
                        .font('Helvetica-Bold')
                        .text(edu.degree || 'Degree');

                    doc.fontSize(11)
                        .font('Helvetica-Oblique')
                        .text(`${edu.school || 'School'} | ${edu.startDate || ''} - ${edu.endDate || ''}`);

                    if (edu.fieldOfStudy) {
                        doc.fontSize(10)
                            .font('Helvetica')
                            .text(`Field: ${edu.fieldOfStudy}`);
                    }
                    doc.moveDown(0.8);
                });
            }

            // Skills Section
            if (data.skills) {
                doc.fontSize(14)
                    .font('Helvetica-Bold')
                    .text('SKILLS', { underline: true });
                doc.moveDown(0.5);

                if (data.skills.technical && data.skills.technical.length > 0) {
                    doc.fontSize(11)
                        .font('Helvetica-Bold')
                        .text('Technical: ');
                    doc.fontSize(10)
                        .font('Helvetica')
                        .text(data.skills.technical.join(', '));
                    doc.moveDown(0.3);
                }

                if (data.skills.soft && data.skills.soft.length > 0) {
                    doc.fontSize(11)
                        .font('Helvetica-Bold')
                        .text('Soft Skills: ');
                    doc.fontSize(10)
                        .font('Helvetica')
                        .text(data.skills.soft.join(', '));
                    doc.moveDown(0.3);
                }

                if (data.skills.tools && data.skills.tools.length > 0) {
                    doc.fontSize(11)
                        .font('Helvetica-Bold')
                        .text('Tools: ');
                    doc.fontSize(10)
                        .font('Helvetica')
                        .text(data.skills.tools.join(', '));
                }
                doc.moveDown(0.8);
            }

            // Projects Section
            if (data.projects && data.projects.length > 0) {
                doc.fontSize(14)
                    .font('Helvetica-Bold')
                    .text('PROJECTS', { underline: true });
                doc.moveDown(0.5);

                data.projects.forEach(project => {
                    doc.fontSize(12)
                        .font('Helvetica-Bold')
                        .text(project.name || 'Project');

                    if (project.description) {
                        doc.fontSize(10)
                            .font('Helvetica')
                            .text(project.description);
                    }

                    if (project.technologies && project.technologies.length > 0) {
                        doc.fontSize(9)
                            .font('Helvetica-Oblique')
                            .text(`Technologies: ${project.technologies.join(', ')}`);
                    }
                    doc.moveDown(0.8);
                });
            }

            // If content is plain text (from editor), add it as fallback
            const hasStructuredData = (data.personalInfo?.fullName || data.personalInfo?.email || data.experience?.length > 0);
            if (content && !hasStructuredData) {
                doc.fontSize(10)
                    .font('Helvetica')
                    .text(content, {
                        align: 'left',
                        lineGap: 2
                    });
            }

            // Footer
            doc.fontSize(8)
                .font('Helvetica-Oblique')
                .text(`Generated by HireScope on ${new Date().toLocaleDateString()}`, {
                    align: 'center'
                });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

function addSection(doc, title, content) {
    doc.fontSize(14)
        .font('Helvetica-Bold')
        .text(title, { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10)
        .font('Helvetica')
        .text(content);
    doc.moveDown(1);
}
