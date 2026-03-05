import React, { useRef, useState, useLayoutEffect } from 'react';
import './ResumeLayout.css';

/**
 * ResumeLayout
 * Renders structured resumeData JSON into a clean, fixed A4 layout
 * Supports theme switching via classes.
 * Includes auto-scaling to fit content exactly on one page.
 * 
 * @param {Object} props
 * @param {Object} props.resumeData - The parsed, structured JSON resume data
 * @param {string} props.theme - The chosen theme (e.g., 'classic', 'modern', 'minimal')
 */
const ResumeLayout = ({ resumeData, theme = 'classic' }) => {
    const pageRef = useRef(null);
    const [scaleFactor, setScaleFactor] = useState(1); // 1 = 10pt/11pt base depending on theme
    const [isScaling, setIsScaling] = useState(true);

    // Auto-scaling logic to fit single page (A4: 297mm height translates roughly to ~1122px at 96 DPI)
    useLayoutEffect(() => {
        if (!resumeData || !pageRef.current) return;

        // Reset scale before measurement
        setIsScaling(true);
        setScaleFactor(1);

        const checkScale = () => {
            const el = pageRef.current;
            if (!el) return;

            // A4 pixel approximation height (slight buffer for safety)
            const targetHeight = 1110;
            const currentHeight = el.scrollHeight;

            if (currentHeight > targetHeight) {
                // Content is too long, need to shrink typography
                const ratio = targetHeight / currentHeight;
                // clamp min scale to avoid tiny unreadable text
                const newScale = Math.max(0.7, ratio * 0.95);
                setScaleFactor(newScale);
            } else if (currentHeight < targetHeight * 0.7) {
                // Content is very short, optionally grow typography slightly (max 1.2)
                setScaleFactor(1.1);
            } else {
                // Content fits well
                setScaleFactor(1);
            }
            setIsScaling(false);
        };

        // Allow DOM to paint initial size before calculating
        requestAnimationFrame(() => {
            setTimeout(checkScale, 50);
        });

    }, [resumeData, theme]);

    if (!resumeData) {
        return (
            <div className="resume-layout-wrapper">
                <div className={`resume-layout-page theme-${theme}`} style={{ display: 'grid', placeItems: 'center', color: 'var(--color-secondary)' }}>
                    <p>No structured data available to render layout.</p>
                </div>
            </div>
        );
    }

    const { personalInfo, summary, experience, education, projects, skills } = resumeData;

    // Extract base font size based on theme to apply scale
    const basePt = theme === 'classic' ? 11 : 10;
    const dynamicFontSize = `${basePt * scaleFactor}pt`;

    return (
        <div className="resume-layout-wrapper" style={{ opacity: isScaling ? 0 : 1, transition: 'opacity 0.2s' }}>
            <div
                id="resume-pdf-container"
                ref={pageRef}
                className={`resume-layout-page theme-${theme}`}
                style={{ '--base-font-size': dynamicFontSize }}
            >

                {/* ── HEADER (Personal Info) ────────────────────────────── */}
                {personalInfo && (
                    <header className="layout-header">
                        {personalInfo.fullName && <h1>{personalInfo.fullName}</h1>}

                        <div className="contact-info">
                            {personalInfo.email && <span>{personalInfo.email}</span>}
                            {personalInfo.phone && <span>{personalInfo.phone}</span>}
                            {personalInfo.linkedin && (
                                <span>
                                    <a href={personalInfo.linkedin.startsWith('http') ? personalInfo.linkedin : `https://${personalInfo.linkedin}`} target="_blank" rel="noopener noreferrer">
                                        LinkedIn
                                    </a>
                                </span>
                            )}
                            {personalInfo.github && (
                                <span>
                                    <a href={personalInfo.github.startsWith('http') ? personalInfo.github : `https://${personalInfo.github}`} target="_blank" rel="noopener noreferrer">
                                        GitHub
                                    </a>
                                </span>
                            )}
                        </div>
                    </header>
                )}

                {/* ── SUMMARY ───────────────────────────────────────────── */}
                {summary && (
                    <section className="layout-section">
                        <h2 className="layout-section-title">Summary</h2>
                        <p style={{ margin: 0 }}>{summary}</p>
                    </section>
                )}

                {/* ── EXPERIENCE ────────────────────────────────────────── */}
                {experience && experience.length > 0 && (
                    <section className="layout-section">
                        <h2 className="layout-section-title">Experience</h2>
                        {experience.map((exp, idx) => (
                            <div key={idx} className="layout-item">
                                <div className="item-header">
                                    <div>
                                        <span className="item-title">{exp?.role || 'Untitled Role'}</span>
                                        {exp?.organization && <span className="item-subtitle">, {exp.organization}</span>}
                                    </div>
                                    <div className="item-dates">
                                        {exp?.startDate || ''} {exp?.startDate && exp?.endDate ? '–' : ''} {exp?.endDate || ''}
                                    </div>
                                </div>
                                {exp?.points && exp.points.length > 0 && (
                                    <ul className="item-points">
                                        {exp.points.map((point, pIdx) => (
                                            <li key={pIdx}>{point}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </section>
                )}

                {/* ── PROJECTS ──────────────────────────────────────────── */}
                {projects && projects.length > 0 && (
                    <section className="layout-section">
                        <h2 className="layout-section-title">Projects</h2>
                        {projects.map((proj, idx) => (
                            <div key={idx} className="layout-item">
                                <div className="item-header">
                                    <span className="item-title">
                                        {proj?.name || 'Untitled Project'}
                                        {proj?.link && (
                                            <span style={{ fontWeight: 'normal', fontSize: '10pt', marginLeft: '0.5rem' }}>
                                                (<a href={proj.link.startsWith('http') ? proj.link : `https://${proj.link}`} target="_blank" rel="noopener noreferrer">Link</a>)
                                            </span>
                                        )}
                                    </span>
                                </div>
                                {proj?.descriptionPoints && proj.descriptionPoints.length > 0 && (
                                    <ul className="item-points">
                                        {proj.descriptionPoints.map((point, pIdx) => (
                                            <li key={pIdx}>{point}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </section>
                )}

                {/* ── EDUCATION ─────────────────────────────────────────── */}
                {education && education.length > 0 && (
                    <section className="layout-section">
                        <h2 className="layout-section-title">Education</h2>
                        {education.map((edu, idx) => (
                            <div key={idx} className="layout-item">
                                <div className="item-header">
                                    <div>
                                        <span className="item-title">{edu?.degree || 'Untitled Degree'}</span>
                                        {edu?.institution && <span className="item-subtitle">, {edu.institution}</span>}
                                    </div>
                                    <div className="item-dates">
                                        {edu?.startYear || ''} {edu?.startYear && edu?.endYear ? '–' : ''} {edu?.endYear || ''}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </section>
                )}

                {/* ── SKILLS ────────────────────────────────────────────── */}
                {skills && (Object.keys(skills).some(key => skills[key] && skills[key].length > 0)) && (
                    <section className="layout-section">
                        <h2 className="layout-section-title">Skills</h2>
                        <div className="skills-grid">
                            {Object.entries(skills).map(([category, items]) => {
                                if (!items || items.length === 0) return null;
                                return (
                                    <React.Fragment key={category}>
                                        <div className="skill-category" style={{ textTransform: 'capitalize' }}>
                                            {category}
                                        </div>
                                        <div className="skill-list">
                                            {items.join(', ')}
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </section>
                )}

            </div>
        </div>
    );
};

export default ResumeLayout;
