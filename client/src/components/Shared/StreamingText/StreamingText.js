import React, { useState, useEffect, useRef } from "react";
import styles from "./StreamingText.module.css";

const StreamingText = ({ 
  text = "", 
  isStreaming = false,
  speed = 30,
  className = "",
  showCursor = true
}) => {
  const [displayedText, setDisplayedText] = useState("");
  const animationFrameRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);
  const currentIndexRef = useRef(0);
  const previousTextRef = useRef("");

  useEffect(() => {
    if (!text) {
      setDisplayedText("");
      currentIndexRef.current = 0;
      previousTextRef.current = "";
      return;
    }

    const targetText = text;
    const previousText = previousTextRef.current;
    
    if (!isStreaming) {
      setDisplayedText(targetText);
      currentIndexRef.current = targetText.length;
      previousTextRef.current = targetText;
      return;
    }
    
    if (!previousText && targetText) {
      currentIndexRef.current = 0;
      setDisplayedText("");
    } else if (previousText && targetText.startsWith(previousText)) {
      currentIndexRef.current = Math.min(currentIndexRef.current, previousText.length);
    } else if (previousText !== targetText && previousText) {
      currentIndexRef.current = Math.min(currentIndexRef.current, targetText.length);
    }
    
    previousTextRef.current = targetText;
    
    const updateText = () => {
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateTimeRef.current;

      if (timeSinceLastUpdate >= speed) {
        const remaining = targetText.length - currentIndexRef.current;

        if (remaining > 0) {
          const baseChars = Math.max(1, Math.floor(timeSinceLastUpdate / (speed * 2)));
          let charsToReveal = Math.min(baseChars, remaining);
          
          const nextCharIndex = currentIndexRef.current + charsToReveal;
          
          if (nextCharIndex < targetText.length) {
            const nextChar = targetText[nextCharIndex];
            const isWordChar = /[a-zA-Z0-9]/.test(nextChar);
            const currentChar = targetText[nextCharIndex - 1];
            const isCurrentWordChar = /[a-zA-Z0-9]/.test(currentChar);

            if (isCurrentWordChar && isWordChar && charsToReveal < 15) {
              const nextSpace = targetText.indexOf(" ", nextCharIndex);
              const nextNewline = targetText.indexOf("\n", nextCharIndex);
              const nextBreak =
                nextSpace === -1
                  ? nextNewline
                  : nextNewline === -1
                  ? nextSpace
                  : Math.min(nextSpace, nextNewline);

              if (nextBreak !== -1 && nextBreak - currentIndexRef.current <= 20) {
                charsToReveal = nextBreak - currentIndexRef.current + 1;
              }
            }
          }

          charsToReveal = Math.min(charsToReveal, remaining);
          currentIndexRef.current += charsToReveal;
          setDisplayedText(targetText.substring(0, currentIndexRef.current));
          lastUpdateTimeRef.current = now;
        }
      }

      if (isStreaming && currentIndexRef.current < targetText.length) {
        animationFrameRef.current = requestAnimationFrame(updateText);
      } else {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      }
    };

    if (isStreaming && currentIndexRef.current < targetText.length) {
      if (!animationFrameRef.current) {
        lastUpdateTimeRef.current = Date.now();
        if (currentIndexRef.current === 0 && targetText.length > 0) {
          setDisplayedText("");
        }
        animationFrameRef.current = requestAnimationFrame(updateText);
      }
    } else if (isStreaming && currentIndexRef.current >= targetText.length && targetText.length > 0) {
      setDisplayedText(targetText);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [text, isStreaming, speed]);

  return (
    <span className={className}>
      {displayedText.split("\n").map((line, i, arr) => (
        <React.Fragment key={i}>
          {line}
          {i < arr.length - 1 && <br />}
        </React.Fragment>
      ))}
      {isStreaming && showCursor && (
        <span className={styles.cursor}>▊</span>
      )}
    </span>
  );
};

export default StreamingText;

