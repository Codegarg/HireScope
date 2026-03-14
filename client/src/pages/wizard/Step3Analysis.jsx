import React, { useEffect } from 'react';
import ATSAnalysis from '../../components/ATSAnalysis';
import { ArrowRight, ArrowLeft } from 'lucide-react';

const Step3Analysis = ({ data, updateData, setNextDisabled, onNext, onBack }) => {
    useEffect(() => {
        // They can proceed to optimize as long as we have results
        setNextDisabled(!data.atsResult);
    }, [data.atsResult, setNextDisabled]);

    if (!data.atsResult) {
        return (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                No analysis data found. Please go back and run the analysis.
            </div>
        );
    }

    return (
        <div style={{ width: '100%', animation: 'fadeIn 0.4s ease' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.2fr)', gap: '2rem', alignItems: 'start' }}>
                <ATSAnalysis
                    analysis={data.atsResult}
                    resumeName={data.file?.name || data.fileName || "Stored Resume"}
                    jdName={data.jdFile?.name || "Target JD"}
                />

                <div style={{
                    background: 'white',
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
                    border: '1px solid var(--border)',
                    height: '750px',
                    position: 'sticky',
                    top: '2rem'
                }}>
                    {data._id ? (
                        <iframe
                            src={`http://localhost:5000/api/resumes/${data._id}/file?token=${localStorage.getItem('token')}`}
                            width="100%"
                            height="100%"
                            style={{ border: 'none' }}
                            title="Original Resume PDF"
                        />
                    ) : (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                            PDF Preview Not Available
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Step3Analysis;
