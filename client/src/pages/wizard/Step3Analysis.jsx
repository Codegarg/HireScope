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
            <ATSAnalysis
                analysis={data.atsResult}
                resumeName={data.file?.name || data.fileName || "Stored Resume"}
                jdName={data.jdFile?.name || "Target JD"}
            />

            {/* Inline Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem', maxWidth: '800px', margin: '3rem auto 0' }}>
                <button onClick={onBack} className="ghost-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ArrowLeft size={18} /> Back
                </button>
                <button
                    onClick={onNext}
                    disabled={!data.atsResult}
                    className="glow-btn"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 2rem', opacity: !data.atsResult ? 0.5 : 1 }}
                >
                    Next Step <ArrowRight size={18} />
                </button>
            </div>
        </div>
    );
};

export default Step3Analysis;
