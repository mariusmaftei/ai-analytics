import React from 'react';
import styles from './ProgressBar.module.css';

const ProgressBar = ({ current, total, currentType, color = 'green', fileType = 'document' }) => {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  
  const colorMap = {
    orange: {
      gradient: 'linear-gradient(90deg, #f97316, #fb923c)',
      shadow: 'rgba(249, 115, 22, 0.3)',
    },
    blue: {
      gradient: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
      shadow: 'rgba(59, 130, 246, 0.3)',
    },
    green: {
      gradient: 'linear-gradient(90deg, var(--primary-color), #22c55e)',
      shadow: 'rgba(34, 197, 94, 0.3)',
    },
  };

  const colorConfig = colorMap[color] || colorMap.green;

  return (
    <div className={styles.progressContainer}>
      <p>
        Analyzing {fileType}: {current}/{total}
      </p>
      {currentType && (
        <p className={styles.progressSubtext}>
          Processing {currentType}...
        </p>
      )}
      <div className={styles.progressBarWrapper}>
        <div 
          className={styles.progressBar}
          style={{ 
            width: `${percentage}%`,
            background: colorConfig.gradient,
            boxShadow: `0 0 10px ${colorConfig.shadow}`,
          }}
        />
      </div>
      <p className={styles.progressPercentage} style={{ color: colorConfig.gradient.includes('#f97316') ? '#f97316' : colorConfig.gradient.includes('#3b82f6') ? '#3b82f6' : 'var(--primary-color)' }}>
        {percentage}%
      </p>
    </div>
  );
};

export default ProgressBar;

