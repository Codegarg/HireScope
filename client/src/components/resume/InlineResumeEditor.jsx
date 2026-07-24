import React, { useState, useEffect } from 'react';
import { Edit3, Check, X, Plus, Trash2 } from 'lucide-react';


const inputStyle = { width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '12px', fontFamily: 'inherit', background: '#f8fafc', color: '#1e293b' };
const textareaStyle = { ...inputStyle, minHeight: '100px', resize: 'vertical' };
const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 'bold', color: '#334155' };

const CommaSeparatedInput = ({ value, onChange, label }) => {
    const [localValue, setLocalValue] = React.useState(value ? value.join(', ') : '');
    return (
        <div>
            {label && <label style={labelStyle}>{label}</label>}
            <input 
                value={localValue}
                onChange={e => {
                    setLocalValue(e.target.value);
                    onChange(e.target.value.split(',').map(s => s.trim()).filter(Boolean));
                }}
                style={inputStyle}
            />
        </div>
    );
};


const InlineResumeEditor = ({ resume, onSave }) => {
    const [content, setContent] = useState(resume?.content || {});
    const [title, setTitle] = useState(resume?.title || 'Resume');
    
    const [editingSection, setEditingSection] = useState(null); // 'title', 'summary', 'experience', etc.
    const [hoverSection, setHoverSection] = useState(null);

    useEffect(() => {
        let needsUpdate = false;
        let newContent = content;
        let newTitle = title;
        if (resume?.content && JSON.stringify(resume.content) !== JSON.stringify(content)) {
            newContent = resume.content;
            needsUpdate = true;
        }
        if (resume?.title && resume.title !== title) {
            newTitle = resume.title;
            needsUpdate = true;
        }
        
        if (needsUpdate) {
            setContent(newContent);
            setTitle(newTitle);
        }
    }, [resume]);

    const handleSave = () => {
        onSave(content, title);
        setEditingSection(null);
    };

    const handleCancel = () => {
        setContent(resume?.content || {});
        setTitle(resume?.title || 'Resume');
        setEditingSection(null);
    };

    const updateContent = (field, value) => {
        setContent(prev => ({ ...prev, [field]: value }));
    };

    const updateArrayItem = (field, index, subfield, value) => {
        setContent(prev => {
            const newArr = [...(prev[field] || [])];
            if (!newArr[index]) newArr[index] = {};
            newArr[index][subfield] = value;
            return { ...prev, [field]: newArr };
        });
    };

    const removeArrayItem = (field, index) => {
        setContent(prev => {
            const newArr = [...(prev[field] || [])];
            newArr.splice(index, 1);
            return { ...prev, [field]: newArr };
        });
    };

    const addArrayItem = (field, defaultObj) => {
        setContent(prev => {
            const newArr = [...(prev[field] || []), defaultObj];
            return { ...prev, [field]: newArr };
        });
    };

    const renderEditableBlock = ({ sectionId, label, children, isEmpty = false }) => {
        const isEditing = editingSection === sectionId;
        const isHovering = hoverSection === sectionId;

        return (
            <div 
                style={{ 
                    position: 'relative', 
                    padding: '8px', 
                    margin: '-8px', 
                    borderRadius: '4px',
                    border: isHovering && !isEditing ? '1px dashed #cbd5e1' : '1px solid transparent',
                    background: isHovering && !isEditing ? 'rgba(0,0,0,0.02)' : 'transparent',
                    transition: 'all 0.2s',
                    marginBottom: '12px',
                    minHeight: isEmpty && !isEditing ? '40px' : 'auto'
                }}
                onMouseEnter={() => setHoverSection(sectionId)}
                onMouseLeave={() => setHoverSection(null)}
            >
                {!isEditing && isHovering && (
                    <button
                        onClick={() => setEditingSection(sectionId)}
                        style={{
                            position: 'absolute', top: '8px', right: '8px',
                            background: '#2563eb', color: 'white', border: 'none',
                            borderRadius: '50%', width: '30px', height: '30px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', zIndex: 10, boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                        }}
                        title={`Edit ${label}`}
                    >
                        <Edit3 size={14} />
                    </button>
                )}
                {isEditing ? (
                    <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', position: 'relative', zIndex: 20, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                            <h4 style={{ margin: 0, color: '#1e293b', fontSize: '1.1rem' }}>Edit {label}</h4>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={handleCancel} style={{ padding: '8px 16px', background: 'transparent', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}>
                                    <X size={14} /> Cancel
                                </button>
                                <button onClick={handleSave} style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #22C08E, #2E9BD6)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                    <Check size={14} /> Save
                                </button>
                            </div>
                        </div>
                        {children}
                    </div>
                ) : (
                    isEmpty ? (
                        <div 
                            style={{ 
                                padding: '16px', textAlign: 'center', color: '#94a3b8', 
                                fontStyle: 'italic', border: '1px dashed #e2e8f0', 
                                borderRadius: '4px', cursor: 'pointer' 
                            }} 
                            onClick={() => setEditingSection(sectionId)}
                        >
                            + Add {label}
                        </div>
                    ) : (
                        children
                    )
                )}
            </div>
        );
    };

// Layout configuration (matches backend pdfGenerator)
    const MARGINS = { TOP: 40, BOTTOM: 40, LEFT: 50, RIGHT: 50 };
    
    return (
        <div style={{ 
            width: '100%', 
            maxWidth: '850px', 
            background: 'white', 
            minHeight: '1100px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
            margin: '0 auto',
            padding: `${MARGINS.TOP}px ${MARGINS.RIGHT}px ${MARGINS.BOTTOM}px ${MARGINS.LEFT}px`,
            fontFamily: 'Helvetica, Arial, sans-serif',
            color: '#1a1a1a',
            position: 'relative',
            borderRadius: '4px'
        }}>
            
            {/* Title Editing */}
            {renderEditableBlock({ 
        sectionId: "title", 
        label: "Document Title & Header", 
        isEmpty: false, 
        children: (
            <>

                {editingSection === 'title' ? (
                    <div>
                        <label style={labelStyle}>Document Title (Not printed, used for saving)</label>
                        <input value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />
                        
                        <label style={labelStyle}>Full Name</label>
                        <input value={content.personalInfo?.fullName || ''} onChange={e => updateContent('personalInfo', { ...content.personalInfo, fullName: e.target.value })} style={inputStyle} />
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label style={labelStyle}>Email</label>
                                <input value={content.personalInfo?.email || ''} onChange={e => updateContent('personalInfo', { ...content.personalInfo, email: e.target.value })} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Phone</label>
                                <input value={content.personalInfo?.phone || ''} onChange={e => updateContent('personalInfo', { ...content.personalInfo, phone: e.target.value })} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>LinkedIn</label>
                                <input value={content.personalInfo?.linkedin || ''} onChange={e => updateContent('personalInfo', { ...content.personalInfo, linkedin: e.target.value })} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>GitHub</label>
                                <input value={content.personalInfo?.github || ''} onChange={e => updateContent('personalInfo', { ...content.personalInfo, github: e.target.value })} style={inputStyle} />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                        <div style={{ fontSize: '22px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                            {content.personalInfo?.fullName || title.toUpperCase()}
                        </div>
                        <hr style={{ border: 'none', borderTop: '1px solid #333', margin: '8px 0 12px 0' }} />
                        <div style={{ fontSize: '11px', display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
                            {content.personalInfo?.email && (
                                <a href={`mailto:${content.personalInfo.email}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                                    {content.personalInfo.email}
                                </a>
                            )}
                            {content.personalInfo?.email && content.personalInfo?.phone && <span style={{ margin: '0' }}>|</span>}
                            {content.personalInfo?.phone && (
                                <span>{content.personalInfo.phone}</span>
                            )}
                            {(content.personalInfo?.email || content.personalInfo?.phone) && content.personalInfo?.linkedin && <span style={{ margin: '0' }}>|</span>}
                            {content.personalInfo?.linkedin && (
                                <a href={content.personalInfo.linkedin.startsWith('http') ? content.personalInfo.linkedin : `https://${content.personalInfo.linkedin}`} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                                    LinkedIn: {content.personalInfo.linkedin.replace(/^https?:\/\//, '')}
                                </a>
                            )}
                            {(content.personalInfo?.email || content.personalInfo?.phone || content.personalInfo?.linkedin) && content.personalInfo?.github && <span style={{ margin: '0' }}>|</span>}
                            {content.personalInfo?.github && (
                                <a href={content.personalInfo.github.startsWith('http') ? content.personalInfo.github : `https://${content.personalInfo.github}`} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                                    GitHub: {content.personalInfo.github.replace(/^https?:\/\//, '')}
                                </a>
                            )}
                        </div>
                    </div>
                )}
            
            </>
        )
    })}

            {/* Summary */}
            {renderEditableBlock({ 
            sectionId: "summary", 
            label: "Summary", 
            isEmpty: !content.summary, 
            children: (
                <>

                {editingSection === 'summary' ? (
                    <div>
                        <label style={labelStyle}>Professional Summary</label>
                        <textarea value={content.summary || ''} onChange={e => updateContent('summary', e.target.value)} style={textareaStyle} />
                    </div>
                ) : (
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase', borderBottom: '1px solid #333', paddingBottom: '2px' }}>SUMMARY</div>
                        <div style={{ fontSize: '11px', lineHeight: '1.5' }}>{content.summary}</div>
                    </div>
                )}
            
                </>
            )
        })}

            {/* Experience */}
            {renderEditableBlock({ 
            sectionId: "experience", 
            label: "Experience", 
            isEmpty: !content.experience || content.experience.length === 0, 
            children: (
                <>

                {editingSection === 'experience' ? (
                    <div>
                        {(content.experience || []).map((exp, idx) => (
                            <div key={idx} style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '16px', position: 'relative', background: '#f8fafc' }}>
                                <button onClick={() => removeArrayItem('experience', idx)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer' }}><Trash2 size={16}/></button>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div><label style={labelStyle}>Role</label><input value={exp.role || ''} onChange={e => updateArrayItem('experience', idx, 'role', e.target.value)} style={inputStyle}/></div>
                                    <div><label style={labelStyle}>Organization</label><input value={exp.organization || ''} onChange={e => updateArrayItem('experience', idx, 'organization', e.target.value)} style={inputStyle}/></div>
                                    <div><label style={labelStyle}>Start Date</label><input value={exp.startDate || ''} onChange={e => updateArrayItem('experience', idx, 'startDate', e.target.value)} style={inputStyle}/></div>
                                    <div><label style={labelStyle}>End Date</label><input value={exp.endDate || ''} onChange={e => updateArrayItem('experience', idx, 'endDate', e.target.value)} style={inputStyle}/></div>
                                </div>
                                <div>
                                    <label style={labelStyle}>Bullet Points (newline separated)</label>
                                    <textarea value={(exp.points || []).join('\n')} onChange={e => updateArrayItem('experience', idx, 'points', e.target.value.split('\n'))} style={textareaStyle}/>
                                </div>
                            </div>
                        ))}
                        <button onClick={() => addArrayItem('experience', { role: '', organization: '', startDate: '', endDate: '', points: [''] })} style={{ padding: '12px', width: '100%', border: '1px dashed var(--border)', background: 'transparent', color: '#1e293b', cursor: 'pointer', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                            <Plus size={18}/> Add Experience
                        </button>
                    </div>
                ) : (
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', textTransform: 'uppercase', borderBottom: '1px solid #333', paddingBottom: '2px' }}>EXPERIENCE</div>
                        {content.experience && content.experience.map((exp, idx) => (
                            <div key={idx} style={{ marginBottom: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                                    <div>
                                        <span style={{ fontWeight: 'bold' }}>{exp.role}</span>
                                        {exp.organization && <span style={{ fontWeight: 'bold' }}> @ {exp.organization}</span>}
                                    </div>
                                    <div style={{ fontStyle: 'italic' }}>
                                        {exp.startDate} - {exp.endDate}
                                    </div>
                                </div>
                                <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px', fontSize: '11px', lineHeight: '1.4' }}>
                                    {exp.points?.filter(p => p.trim()).map((p, pIdx) => (
                                        <li key={pIdx}>{p}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                )}
            
                </>
            )
        })}

            {/* Projects */}
            {renderEditableBlock({ 
            sectionId: "projects", 
            label: "Projects", 
            isEmpty: !content.projects || content.projects.length === 0, 
            children: (
                <>

                {editingSection === 'projects' ? (
                    <div>
                        {(content.projects || []).map((proj, idx) => (
                            <div key={idx} style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '16px', position: 'relative', background: '#f8fafc' }}>
                                <button onClick={() => removeArrayItem('projects', idx)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer' }}><Trash2 size={16}/></button>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div><label style={labelStyle}>Project Name</label><input value={proj.name || ''} onChange={e => updateArrayItem('projects', idx, 'name', e.target.value)} style={inputStyle}/></div>
                                    <div><label style={labelStyle}>Link</label><input value={proj.link || ''} onChange={e => updateArrayItem('projects', idx, 'link', e.target.value)} style={inputStyle}/></div>
                                </div>
                                <div>
                                    <label style={labelStyle}>Bullet Points (newline separated)</label>
                                    <textarea value={(proj.descriptionPoints || []).join('\n')} onChange={e => updateArrayItem('projects', idx, 'descriptionPoints', e.target.value.split('\n'))} style={textareaStyle}/>
                                </div>
                            </div>
                        ))}
                        <button onClick={() => addArrayItem('projects', { name: '', link: '', descriptionPoints: [''] })} style={{ padding: '12px', width: '100%', border: '1px dashed var(--border)', background: 'transparent', color: '#1e293b', cursor: 'pointer', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                            <Plus size={18}/> Add Project
                        </button>
                    </div>
                ) : (
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', textTransform: 'uppercase', borderBottom: '1px solid #333', paddingBottom: '2px' }}>PROJECTS</div>
                        {content.projects && content.projects.map((proj, idx) => (
                            <div key={idx} style={{ marginBottom: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', alignItems: 'baseline' }}>
                                    <div style={{ fontWeight: 'bold' }}>{proj.name}</div>
                                    {proj.link && (
                                        <a href={proj.link.startsWith('http') ? proj.link : `https://${proj.link}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: '#2563eb' }}>
                                            {proj.link.toLowerCase().includes('github') ? 'GitHub' : 'Link'}
                                        </a>
                                    )}
                                </div>
                                <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px', fontSize: '11px', lineHeight: '1.4' }}>
                                    {proj.descriptionPoints?.filter(p => p.trim()).map((p, pIdx) => (
                                        <li key={pIdx}>{p}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                )}
            
                </>
            )
        })}
            
            {/* Skills */}
            {renderEditableBlock({ 
            sectionId: "skills", 
            label: "Skills", 
            isEmpty: !content.skills || !Object.keys(content.skills).some(k => content.skills[k]?.length > 0), 
            children: (
                <>

                {editingSection === 'skills' ? (
                    <div>
                        {['languages', 'core', 'frontend', 'backend', 'databases', 'cloud', 'tools'].map(cat => (
                            <div key={cat}>
                                <CommaSeparatedInput 
                                    label={`${cat.charAt(0).toUpperCase() + cat.slice(1)} (comma separated)`}
                                    value={content.skills?.[cat] || []}
                                    onChange={newArr => updateContent('skills', { ...content.skills, [cat]: newArr })}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', textTransform: 'uppercase', borderBottom: '1px solid #333', paddingBottom: '2px' }}>SKILLS</div>
                        <div style={{ fontSize: '11px', lineHeight: '1.6' }}>
                            {['languages', 'core', 'frontend', 'backend', 'databases', 'cloud', 'tools'].map(cat => {
                                if (content.skills && content.skills[cat] && content.skills[cat].length > 0) {
                                    return (
                                        <div key={cat}>
                                            <span style={{ fontWeight: 'bold' }}>{cat.charAt(0).toUpperCase() + cat.slice(1)}:</span> {content.skills[cat].join(', ')}
                                        </div>
                                    );
                                }
                                return null;
                            })}
                        </div>
                    </div>
                )}
            
                </>
            )
        })}

            {/* Education */}
            {renderEditableBlock({ 
            sectionId: "education", 
            label: "Education", 
            isEmpty: !content.education || content.education.length === 0, 
            children: (
                <>

                {editingSection === 'education' ? (
                    <div>
                        {(content.education || []).map((edu, idx) => (
                            <div key={idx} style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '16px', position: 'relative', background: '#f8fafc' }}>
                                <button onClick={() => removeArrayItem('education', idx)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer' }}><Trash2 size={16}/></button>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div><label style={labelStyle}>Degree</label><input value={edu.degree || ''} onChange={e => updateArrayItem('education', idx, 'degree', e.target.value)} style={inputStyle}/></div>
                                    <div><label style={labelStyle}>Institution</label><input value={edu.institution || ''} onChange={e => updateArrayItem('education', idx, 'institution', e.target.value)} style={inputStyle}/></div>
                                    <div><label style={labelStyle}>Start Year</label><input value={edu.startYear || ''} onChange={e => updateArrayItem('education', idx, 'startYear', e.target.value)} style={inputStyle}/></div>
                                    <div><label style={labelStyle}>End Year</label><input value={edu.endYear || ''} onChange={e => updateArrayItem('education', idx, 'endYear', e.target.value)} style={inputStyle}/></div>
                                </div>
                            </div>
                        ))}
                        <button onClick={() => addArrayItem('education', { degree: '', institution: '', startYear: '', endYear: '' })} style={{ padding: '12px', width: '100%', border: '1px dashed var(--border)', background: 'transparent', color: '#1e293b', cursor: 'pointer', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                            <Plus size={18}/> Add Education
                        </button>
                    </div>
                ) : (
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', textTransform: 'uppercase', borderBottom: '1px solid #333', paddingBottom: '2px' }}>EDUCATION</div>
                        {content.education && content.education.map((edu, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                                <div style={{ fontWeight: 'bold' }}>{edu.degree}</div>
                                <div style={{ fontStyle: 'italic' }}>{edu.institution} ({edu.startYear} - {edu.endYear})</div>
                            </div>
                        ))}
                    </div>
                )}
            
                </>
            )
        })}
            {/* Certifications & Awards */}
            {renderEditableBlock({ 
            sectionId: "certifications", 
            label: "Certifications & Awards", 
            isEmpty: (!content.certifications || content.certifications.length === 0) && (!content.awards || content.awards.length === 0), 
            children: (
                <>

                {editingSection === 'certifications' ? (
                    <div>
                        <label style={labelStyle}>Certifications (newline separated)</label>
                        <textarea value={(content.certifications || []).join('\n')} onChange={e => updateContent('certifications', e.target.value.split('\n'))} style={textareaStyle}/>
                        <label style={labelStyle}>Awards (newline separated)</label>
                        <textarea value={(content.awards || []).join('\n')} onChange={e => updateContent('awards', e.target.value.split('\n'))} style={textareaStyle}/>
                    </div>
                ) : (
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', textTransform: 'uppercase', borderBottom: '1px solid #333', paddingBottom: '2px' }}>CERTIFICATIONS & AWARDS</div>
                        <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px', fontSize: '11px', lineHeight: '1.4' }}>
                            {content.certifications?.filter(c => c.trim()).map((c, idx) => <li key={`cert-${idx}`}>{c}</li>)}
                            {content.awards?.filter(a => a.trim()).map((a, idx) => <li key={`award-${idx}`}>{a}</li>)}
                        </ul>
                    </div>
                )}
            
                </>
            )
        })}

            {/* Languages */}
            {renderEditableBlock({ 
            sectionId: "languages", 
            label: "Languages", 
            isEmpty: !content.spokenLanguages || content.spokenLanguages.length === 0, 
            children: (
                <>

                {editingSection === 'languages' ? (
                    <div>
                        <CommaSeparatedInput 
                            label="Spoken Languages (comma separated)"
                            value={content.spokenLanguages || []}
                            onChange={newArr => updateContent('spokenLanguages', newArr)}
                        />
                    </div>
                ) : (
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', textTransform: 'uppercase', borderBottom: '1px solid #333', paddingBottom: '2px' }}>LANGUAGES</div>
                        <div style={{ fontSize: '11px' }}>{content.spokenLanguages && content.spokenLanguages.join('  •  ')}</div>
                    </div>
                )}
            
                </>
            )
        })}
        </div>
    );
};

export default InlineResumeEditor;
