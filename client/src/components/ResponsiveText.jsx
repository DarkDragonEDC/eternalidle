import React, { useRef, useEffect, useState } from 'react';

const ResponsiveText = ({
    children,
    maxFontSize = 40,
    minFontSize = 12,
    className,
    style,
    color = 'var(--text-main)',
    fontWeight = 'normal',
    fontFamily = 'inherit',
    textShadow
}) => {
    const containerRef = useRef(null);
    const textRef = useRef(null);
    const [fontSize, setFontSize] = useState(maxFontSize);

    useEffect(() => {
        const adjustFontSize = () => {
            const container = containerRef.current;
            const text = textRef.current;
            if (!container || !text) return;

            // 1. Temporarily set to maxFontSize to measure the "ideal" width
            // We use a hidden clone or just sets it? Setting it directly might cause jump.
            // Better: use a large enough size for measurement (e.g. maxFontSize) then scale down.
            // Since we want to be responsive, let's try a calculation approach.

            const containerWidth = container.clientWidth;

            // We need to know how wide the text WOULD be at maxFontSize.
            // We can approximate if we know current width and current fontSize.
            // Or we can just set it. Since this happens fast/in layout, it might be ok.
            // To be safe, let's use the ratio of current scrollWidth.

            // ACTUALLY: The best way to measure "unconstrained width" is to allow it to overflow temporarily
            // But visually that's bad.

            // Let's assume linear scaling: width ~ fontSize
            // currentWidth / currentFontSize = constant (mostly)

            // So: desiredWidth (containerWidth) / newFontSize = currentScrollWidth / currentFontSize
            // newFontSize = (containerWidth * currentFontSize) / currentScrollWidth

            // BUT `scrollWidth` is integer rounded mostly.

            // Safe approach:
            // 1. Check if overflow (scrollWidth > clientWidth)
            // 2. If so, reduce.
            // 3. If not, can we grow? Yes, until maxFontSize.

            // Let's try the simple ratio approach based on current render.
            // If we are at 20px and taking 100px, and container is 200px, we can grow to 40px.
            // If we are at 40px and taking 400px, and container is 200px, we must shrink to 20px.

            const currentScrollWidth = text.scrollWidth;
            // If text is hidden or 0, skip
            if (currentScrollWidth === 0) return;

            const ratio = containerWidth / currentScrollWidth;
            let newSize = Math.floor(fontSize * ratio);

            // Constrain
            if (newSize > maxFontSize) newSize = maxFontSize;
            if (newSize < minFontSize) newSize = minFontSize;

            // Only update if difference is significant to avoid jitter
            if (Math.abs(newSize - fontSize) > 1) {
                setFontSize(newSize);
            }
        };

        // Run on mount and changes
        adjustFontSize();

        // Also run a "reset and measure" pass if children changed length significantly?
        // Actually, if children changes, the width changes, loop runs, and we adjust.
        // But if we are already small, and text becomes short, we need to grow?
        // The above logic `fontSize * ratio` allows growing!
        // Example: Font 10px, Width 50px. Container 100px. Ratio 2. New Font 20px. 
        // Correct.

        window.addEventListener('resize', adjustFontSize);
        return () => window.removeEventListener('resize', adjustFontSize);
    }, [children, maxFontSize, minFontSize, fontSize]); // depend on fontSize to re-measure after update? No, that causes loops.

    // Fix for the loop dependency:
    // We shouldn't depend on `fontSize` in the effect that sets it, unless we are very careful.
    // Better: split the measurement logic.

    // Alternative robust logic:
    // Always render an invisible span with maxFontSize to measure intended width?
    // That's the most stable way.

    return (
        <div
            ref={containerRef}
            className={className}
            style={{
                width: '100%',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textAlign: 'center',
                ...style
            }}
        >
            <span ref={textRef} style={{ visibility: 'hidden', position: 'absolute', fontSize: `${maxFontSize}px`, fontWeight, fontFamily, pointerEvents: 'none' }}>
                {children}
            </span>
            <span
                style={{
                    fontSize: `${fontSize}px`,
                    fontWeight,
                    color,
                    fontFamily,
                    textShadow,
                    transition: 'font-size 0.1s ease-out',
                    display: 'inline-block'
                }}
            >
                {children}
            </span>
        </div>
    );
};

// Wait, the robust logic implementation above is safer:
// 1. Render hidden span at MaxFontSize.
// 2. Measure hidden span width VS container width.
// 3. Set visible span fontSize based on ratio.

const ResponsiveTextFinal = ({
    children,
    maxFontSize = 40,
    minFontSize = 12,
    className,
    style,
    color = 'var(--text-main)',
    fontWeight = 'normal',
    fontFamily = 'inherit',
    textShadow
}) => {
    const containerRef = useRef(null);
    const hiddenTextRef = useRef(null);
    const [fontSize, setFontSize] = useState(maxFontSize);

    React.useLayoutEffect(() => {
        const adjust = () => {
            const container = containerRef.current;
            const hiddenText = hiddenTextRef.current;
            if (!container || !hiddenText) return;

            const containerWidth = container.clientWidth;
            const textWidth = hiddenText.scrollWidth;

            if (textWidth === 0) return;

            let newSize = maxFontSize;
            if (textWidth > containerWidth) {
                const ratio = containerWidth / textWidth;
                newSize = Math.max(minFontSize, Math.floor(maxFontSize * ratio * 0.90)); // 0.90 for extra padding safety
            }

            setFontSize(newSize);
        };

        adjust();
        window.addEventListener('resize', adjust);
        return () => window.removeEventListener('resize', adjust);
    }, [children, maxFontSize, minFontSize]);

    return (
        <div
            ref={containerRef}
            className={className}
            style={{
                width: '100%',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textAlign: 'center',
                position: 'relative',
                ...style
            }}
        >
            {/* Hidden measuring element */}
            <span
                ref={hiddenTextRef}
                style={{
                    visibility: 'hidden',
                    position: 'absolute',
                    fontSize: `${maxFontSize}px`,
                    fontWeight,
                    fontFamily,
                    whiteSpace: 'nowrap',
                    left: 0,
                    top: 0,
                    pointerEvents: 'none'
                }}
            >
                {children}
            </span>

            {/* Visible element */}
            <span
                style={{
                    fontSize: `${fontSize}px`,
                    fontWeight,
                    color,
                    fontFamily,
                    textShadow,
                    transition: 'font-size 0.1s ease-out',
                    display: 'inline-block'
                }}
            >
                {children}
            </span>
        </div>
    );
};

export default ResponsiveTextFinal;
