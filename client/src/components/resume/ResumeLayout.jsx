import React from 'react';
import './ResumeLayout.css';

/**
 * ResumeLayout
 * Renders structured resumeData JSON into a clean, fixed A4 layout
 * Supports theme switching via classes.
 * 
 * @param {Object} props
 * @param {Object} props.resumeData - The parsed, structured JSON resume data
 * @param {string} props.theme - The chosen theme (e.g., 'classic', 'modern', 'minimal')
 */
const ResumeLayout = ({ resumeData, theme = 'classic' }) => {

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

    return (
        <div className="resume-layout-wrapper">
            <div id="resume-pdf-container" className={`resume-layout-page theme-${theme}`}>

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
