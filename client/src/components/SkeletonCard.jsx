import React from 'react';

/**
 * SkeletonCard — shimmer placeholder for Dashboard resume cards.
 * Use in place of a <ResumeCard /> while data is loading.
 */
const SkeletonCard = () => (
    <div className="skeleton-card">
        {/* Icon + Badge row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="skeleton-base skeleton-avatar" />
            <div className="skeleton-base skeleton-badge" />
        </div>

        {/* Title lines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1 }}>
            <div className="skeleton-base skeleton-line skeleton-line-medium" />
            <div className="skeleton-base skeleton-line skeleton-line-short" />
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'var(--border)' }} />

        {/* Action button row */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
            <div className="skeleton-base skeleton-line" style={{ flex: 1, height: '32px', borderRadius: '0.5rem' }} />
            <div className="skeleton-base skeleton-line" style={{ flex: 1, height: '32px', borderRadius: '0.5rem' }} />
        </div>
    </div>
);

/**
 * SkeletonGrid — renders N skeleton cards in the dashboard grid.
 * @param {number} count - how many cards to render (default 6)
 */
export const SkeletonGrid = ({ count = 6 }) => (
    <div className="dashboard-grid">
        {Array.from({ length: count }).map((_, i) => (
            <SkeletonCard key={i} />
        ))}
    </div>
);

export default SkeletonCard;
