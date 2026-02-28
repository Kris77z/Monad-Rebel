import { useState, useEffect, useRef } from 'react';

/**
 * Typewriter effect hook: reveals text character by character.
 * Only triggers animation when `text` changes to a new non-empty value.
 * Returns the currently visible substring.
 */
export function useTypewriter(text: string | undefined, speedMs = 25): string {
    const [displayed, setDisplayed] = useState(text ?? '');
    const prevText = useRef(text);

    useEffect(() => {
        if (text === prevText.current) return;
        prevText.current = text;
        if (!text) { setDisplayed(''); return; }

        setDisplayed('');
        let i = 0;
        const timer = setInterval(() => {
            i += 1;
            setDisplayed(text.slice(0, i));
            if (i >= text.length) clearInterval(timer);
        }, speedMs);
        return () => clearInterval(timer);
    }, [text, speedMs]);

    return displayed;
}
