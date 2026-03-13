import React, { useState, useEffect } from 'react';

const ActivityProgressBar = ({ activity, serverTimeOffset = 0 }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!activity) return;

    const update = () => {
      const now = Date.now() + serverTimeOffset;
      const initialQty = activity.initial_quantity || 1;
      const remainingQty = activity.actions_remaining;
      const doneQty = initialQty - remainingQty;
      const timePerAction = activity.time_per_action || 3;

      let currentItemProgressPercent = 0;

      // Calculate progress of current item
      if (activity.next_action_at) {
        const endTime = new Date(activity.next_action_at).getTime();
        const timeRemaining = endTime - now;
        const totalActionTime = timePerAction * 1000;

        // Invert: 0 remaining = 100% done
        const timeDone = totalActionTime - timeRemaining;

        // Clamp between 0 and 1
        const rawProgress = Math.max(0, Math.min(1, timeDone / totalActionTime));
        currentItemProgressPercent = rawProgress;
      }

      const realTotalProgress = ((doneQty + currentItemProgressPercent) / initialQty) * 100;
      setProgress(Math.min(100, Math.max(0, realTotalProgress)));
    };

    const interval = setInterval(update, 50);
    update();

    return () => clearInterval(interval);
  }, [activity, serverTimeOffset]);

  return (
    <div style={{ marginTop: '10px', height: '6px', background: 'var(--slot-bg)', borderRadius: '3px', overflow: 'hidden' }}>
      <div style={{
        width: `${progress}%`,
        height: '100%',
        background: 'var(--accent)',
        transition: 'width 0.1s linear',
        boxShadow: '0 0 8px var(--accent-soft)'
      }}></div>
      <div style={{ fontSize: '0.6rem', textAlign: 'right', color: 'var(--text-dim)', marginTop: '2px' }}>
        {progress.toFixed(1)}%
      </div>
    </div>
  );
};

export default ActivityProgressBar;
