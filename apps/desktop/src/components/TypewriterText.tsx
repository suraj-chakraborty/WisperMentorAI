import React, { useState, useEffect, useRef, useCallback } from 'react';

interface TypewriterTextProps {
    text: string;
    speed?: number; // ms per character
    className?: string;
    onComplete?: () => void;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
    text,
    speed = 12,
    className,
    onComplete,
}) => {
    const [displayedText, setDisplayedText] = useState('');
    const [isComplete, setIsComplete] = useState(false);
    const rafRef = useRef<number>(0);
    const prevTextRef = useRef(text);
    const displayedLengthRef = useRef(0);
    const onCompleteRef = useRef(onComplete);

    // Keep onComplete ref fresh to avoid stale closures
    onCompleteRef.current = onComplete;

    // Reset when text changes entirely (new transcript segment)
    useEffect(() => {
        if (text !== prevTextRef.current) {
            prevTextRef.current = text;
            displayedLengthRef.current = 0;
            setDisplayedText('');
            setIsComplete(false);
        }
    }, [text]);

    // Single rAF loop — no dependency on displayedLength in deps
    useEffect(() => {
        if (isComplete) return;

        const startLength = displayedLengthRef.current;
        const startTime = performance.now();

        const animate = (now: number) => {
            const elapsed = now - startTime;
            const newLength = Math.min(
                startLength + Math.floor(elapsed / speed),
                text.length
            );

            if (newLength !== displayedLengthRef.current) {
                displayedLengthRef.current = newLength;
                setDisplayedText(text.slice(0, newLength));
            }

            if (newLength < text.length) {
                rafRef.current = requestAnimationFrame(animate);
            } else {
                setIsComplete(true);
                onCompleteRef.current?.();
            }
        };

        rafRef.current = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(rafRef.current);
        };
    }, [text, speed, isComplete]);

    return (
        <span className={className}>
            {displayedText}
            {!isComplete && <span className="typewriter-cursor">|</span>}
        </span>
    );
};
