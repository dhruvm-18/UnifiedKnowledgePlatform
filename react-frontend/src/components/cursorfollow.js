import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";

const GlowingSphere = ({ position = { x: 0, y: 0 }, visible = true, leftCollapsed = false, rightCollapsed = false, isThinking = false }) => {
  // Sphere and feature dimensions
  const sphereSize = 120; // Slightly larger for better visibility
  const eyeWidth = 12; // Slightly larger eyes
  const eyeHeight = 18; // More realistic eye proportions
  const maxEyeMovement = sphereSize / 4;
  const mouthWidth = 20;
  const mouthHeight = 8;

  // State for cursor and eye tracking
  const [mousePosition, setMousePosition] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [leftEyeOffset, setLeftEyeOffset] = useState({ x: 0, y: 0 });
  const [rightEyeOffset, setRightEyeOffset] = useState({ x: 0, y: 0 });
  const [mouthOffset, setMouthOffset] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const [mouthExpression, setMouthExpression] = useState('happy'); // happy, surprised, excited, curious, thinking, neutral
  const [eyeExpression, setEyeExpression] = useState('normal'); // normal, wide, squint, curious
  const [opacity, setOpacity] = useState(0); // For fade in/out effect
  const [actualPosition, setActualPosition] = useState({ x: 0, y: 0 });
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [thinkingAnimation, setThinkingAnimation] = useState(0);
  
  // Refs for smooth animation
  const animationRef = useRef();
  const lastTimeRef = useRef(0);
  const sphereRef = useRef(null);
  const blinkTimeoutRef = useRef(null);
  const thinkingRef = useRef(null);
  const mouthStyleRef = useRef(null);

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark-mode') || 
                    document.body.classList.contains('dark-mode') ||
                    window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(isDark);
    };
    
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);

  // Thinking mode animation with debounced expression changes to prevent flickering
  useEffect(() => {
    let timeoutId;
    
    if (isThinking) {
      // Debounce the expression change to prevent rapid state updates
      timeoutId = setTimeout(() => {
      setMouthExpression('thinking');
      }, 50);
      
      const animateThinking = () => {
        setThinkingAnimation(prev => (prev + 1) % 360);
        thinkingRef.current = requestAnimationFrame(animateThinking);
      };
      
      thinkingRef.current = requestAnimationFrame(animateThinking);
      
      return () => {
        clearTimeout(timeoutId);
        if (thinkingRef.current) {
          cancelAnimationFrame(thinkingRef.current);
        }
      };
    } else {
      // Debounce the return to happy expression
      timeoutId = setTimeout(() => {
      setMouthExpression('happy');
      }, 50);
      
      if (thinkingRef.current) {
        cancelAnimationFrame(thinkingRef.current);
      }
      
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [isThinking]);

  // Calculate dynamic position based on sidebar states
  const calculateDynamicPosition = () => {
    // For absolute positioning within container, use percentage-based positioning
    let baseX = 50; // 50% of container width (center)
    let baseY = 20; // 20% of container height (above greeting)
    
    // Adjust for sidebar states (smaller adjustments for container-based positioning)
    if (leftCollapsed && rightCollapsed) {
      // Both sidebars collapsed - center of container
      baseX = 50;
    } else if (leftCollapsed) {
      // Only left sidebar collapsed - slight right shift
      baseX = 55;
    } else if (rightCollapsed) {
      // Only right sidebar collapsed - slight left shift
      baseX = 45;
    } else {
      // Both sidebars expanded - center of container
      baseX = 50;
    }
    
    return { x: baseX, y: baseY };
  };

  // Convert CSS units to pixels or percentages
  const convertToPixels = (value) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      if (value.includes('vw')) {
        return (parseFloat(value) / 100) * window.innerWidth;
      } else if (value.includes('vh')) {
        return (parseFloat(value) / 100) * window.innerHeight;
      } else if (value.includes('%')) {
        return parseFloat(value); // Return percentage as-is for absolute positioning
      } else if (value.includes('calc')) {
        // Handle calc() expressions
        const calcValue = value.replace('calc(', '').replace(')', '');
        if (calcValue.includes('100vw - 80px')) {
          return window.innerWidth - 80;
        } else if (calcValue.includes('50vw + 100px')) {
          return (window.innerWidth / 2) + 100;
        } else if (calcValue.includes('50vw - 100px')) {
          return (window.innerWidth / 2) - 100;
        }
        return 0; // fallback
      } else if (value.includes('px')) {
        return parseFloat(value);
      }
    }
    return 0;
  };

  // Update position when window resizes or sidebar states change
  useEffect(() => {
    const updatePosition = () => {
      // If position is provided as CSS units, convert them
      if (typeof position.x === 'string' || typeof position.y === 'string') {
        const convertedX = convertToPixels(position.x);
        const convertedY = convertToPixels(position.y);
        
        // If using percentages, keep them as percentages for absolute positioning
        if (typeof position.x === 'string' && position.x.includes('%')) {
          setActualPosition({
            x: convertedX, // This is now a percentage value
            y: convertedY
          });
        } else {
          setActualPosition({
            x: convertedX,
            y: convertedY
          });
        }
      } else {
        // Use dynamic calculation based on sidebar states
        const dynamicPos = calculateDynamicPosition();
        setActualPosition(dynamicPos);
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [position, leftCollapsed, rightCollapsed]);

  // Fade in/out effect
  useEffect(() => {
    if (visible) {
      setOpacity(1);
    } else {
      setOpacity(0);
    }
  }, [visible]);

  // Blinking animation
  useEffect(() => {
    if (!visible) return; // Don't blink when not visible
    
    const blink = () => {
      setIsBlinking(true);
      setTimeout(() => {
        setIsBlinking(false);
      }, 150); // Blink duration
      
      // Schedule next blink (random interval between 2-6 seconds)
      const nextBlink = 2000 + Math.random() * 4000;
      blinkTimeoutRef.current = setTimeout(blink, nextBlink);
    };
    
    // Start blinking after initial delay
    blinkTimeoutRef.current = setTimeout(blink, 1000 + Math.random() * 2000);
    
    return () => {
      if (blinkTimeoutRef.current) {
        clearTimeout(blinkTimeoutRef.current);
      }
    };
  }, [visible]);

  // Track cursor movement with improved coordinate handling
  useEffect(() => {
    if (!visible) return; // Don't track when not visible
    
    let ticking = false;
    
    const handleMouseMove = (e) => {
      if (!ticking) {
        requestAnimationFrame(() => {
          // Get the sphere's bounding rect for accurate positioning
          const sphereRect = sphereRef.current?.getBoundingClientRect();
          if (sphereRect) {
            // Calculate cursor position relative to the sphere center
            const sphereCenterX = sphereRect.left + sphereRect.width / 2;
            const sphereCenterY = sphereRect.top + sphereRect.height / 2;
            
            const relativeX = e.clientX - sphereCenterX;
            const relativeY = e.clientY - sphereCenterY;
            
            setMousePosition({ x: relativeX, y: relativeY });
            
            // Change expression based on cursor proximity and movement
            const distance = Math.sqrt(relativeX * relativeX + relativeY * relativeY);
            const speed = Math.sqrt(relativeX * relativeX + relativeY * relativeY) / 16; // Approximate speed
            
            if (!isThinking) {
              if (distance < 30) {
                // Very close - excited!
                setMouthExpression('excited');
                setEyeExpression('wide');
              } else if (distance < 80) {
                // Close - happy
                setMouthExpression('happy');
                setEyeExpression('normal');
              } else if (distance > 300) {
                // Far away - surprised/curious
                setMouthExpression('surprised');
                setEyeExpression('wide');
              } else if (speed > 15) {
                // Fast movement - excited
                setMouthExpression('excited');
                setEyeExpression('wide');
              } else {
                // Normal distance - neutral/happy
                const randomExp = Math.random();
                if (randomExp > 0.8) {
                  setMouthExpression('curious');
                  setEyeExpression('curious');
                } else if (randomExp > 0.6) {
                  setMouthExpression('neutral');
                  setEyeExpression('normal');
                } else {
                  setMouthExpression('happy');
                  setEyeExpression('normal');
                }
              }
            }
          } else {
            // Fallback to absolute coordinates
      setMousePosition({ x: e.clientX, y: e.clientY });
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [visible, isThinking]);

  // Smooth eye and mouth movement with improved animation and reduced lag
  useEffect(() => {
    if (!visible) return; // Don't animate when not visible
    
    const animateFeatures = (currentTime) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = currentTime;
      }
      
      const deltaTime = currentTime - lastTimeRef.current;
      // Improved smoothing factor calculation for more responsive movement
      const smoothingFactor = Math.min(0.15, deltaTime / 16); // Reduced from 0.2 to 0.15 for faster response
      
      // Calculate target positions for eyes and mouth
      const leftTarget = calculateEyeOffset(mousePosition, 'left');
      const rightTarget = calculateEyeOffset(mousePosition, 'right');
      const mouthTarget = calculateMouthOffset(mousePosition);
      
      // Smooth interpolation for left eye with improved responsiveness
      setLeftEyeOffset(prev => ({
        x: prev.x + (leftTarget.x - prev.x) * smoothingFactor,
        y: prev.y + (leftTarget.y - prev.y) * smoothingFactor,
      }));
      
      // Smooth interpolation for right eye with improved responsiveness
      setRightEyeOffset(prev => ({
        x: prev.x + (rightTarget.x - prev.x) * smoothingFactor,
        y: prev.y + (rightTarget.y - prev.y) * smoothingFactor,
      }));

      // Smooth interpolation for mouth with faster response
      setMouthOffset(prev => ({
        x: prev.x + (mouthTarget.x - prev.x) * (smoothingFactor * 1.2), // 20% faster than eyes
        y: prev.y + (mouthTarget.y - prev.y) * (smoothingFactor * 1.2),
      }));
      
      lastTimeRef.current = currentTime;
      animationRef.current = requestAnimationFrame(animateFeatures);
    };
    
    animationRef.current = requestAnimationFrame(animateFeatures);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [mousePosition, visible, leftEyeOffset, rightEyeOffset]); // Added eye offsets as dependencies

  // Enhanced eye offset calculation with improved responsiveness
  const calculateEyeOffset = (cursorRelative, eyeType) => {
    const dx = cursorRelative.x;
    const dy = cursorRelative.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Calculate the angle to the cursor
    const angle = Math.atan2(dy, dx);
    
    // More responsive distance scaling
    const maxDistance = 200;
    const distanceFactor = Math.min(distance / maxDistance, 1);
    
    // Calculate the movement radius with better scaling
    const movementRadius = maxEyeMovement * distanceFactor;
    
    // Add slight randomization for more natural movement
    const randomFactor = 0.98 + Math.random() * 0.04;
    
    // Calculate base offset
    let baseOffset = {
      x: Math.cos(angle) * movementRadius * randomFactor,
      y: Math.sin(angle) * movementRadius * randomFactor,
    };
    
    // Add thinking mode behavior
    if (isThinking) {
      // Eyes move in a thinking pattern - looking around more
      const thinkingTime = Date.now() / 1000;
      const thinkingOffset = Math.sin(thinkingTime * 2) * 3;
      baseOffset.x += thinkingOffset;
      baseOffset.y += Math.cos(thinkingTime * 1.5) * 2;
    } else {
      // Normal cursor following behavior
      const currentTime = Date.now();
      if (eyeType === 'left') {
        baseOffset.x += Math.sin(currentTime / 2000) * 0.3;
        baseOffset.y += Math.cos(currentTime / 2000) * 0.2;
      } else {
        baseOffset.x += Math.sin(currentTime / 2000 + 1) * 0.3;
        baseOffset.y += Math.cos(currentTime / 2000 + 1) * 0.2;
      }
    }
    
    // Clamp the movement to prevent eyes from going outside the sphere
    const clampedOffset = {
      x: Math.max(-maxEyeMovement, Math.min(maxEyeMovement, baseOffset.x)),
      y: Math.max(-maxEyeMovement, Math.min(maxEyeMovement, baseOffset.y)),
    };
    
    return clampedOffset;
  };

  // Calculate mouth offset for coordinated movement with improved realism
  const calculateMouthOffset = (cursorRelative) => {
    const dx = cursorRelative.x;
    const dy = cursorRelative.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Calculate the angle to the cursor
    const angle = Math.atan2(dy, dx);
    
    // Mouth moves more naturally with eyes - not just reduced movement
    const maxDistance = 200;
    const distanceFactor = Math.min(distance / maxDistance, 1);
    
    // Mouth movement is more subtle but follows the same direction as eyes
    const movementRadius = maxEyeMovement * 0.3 * distanceFactor; // 30% of eye movement
    
    // Calculate base offset with more natural movement
    let baseOffset = {
      x: Math.cos(angle) * movementRadius,
      y: Math.sin(angle) * movementRadius,
    };
    
    // Add micro-movements for more realistic behavior
    const currentTime = Date.now();
    const microMovementX = Math.sin(currentTime / 3000) * 0.5;
    const microMovementY = Math.cos(currentTime / 2500) * 0.3;
    
    baseOffset.x += microMovementX;
    baseOffset.y += microMovementY;
    
    // Add thinking mode behavior for mouth
    if (isThinking) {
      // Mouth moves in a more natural thinking pattern
      const thinkingTime = Date.now() / 1000;
      const thinkingOffsetX = Math.sin(thinkingTime * 1.5) * 1.5;
      const thinkingOffsetY = Math.cos(thinkingTime * 2) * 1;
      
      baseOffset.x += thinkingOffsetX;
      baseOffset.y += thinkingOffsetY;
    } else {
      // Normal mode - mouth slightly follows eye movement with delay
      const eyeInfluenceX = (leftEyeOffset.x + rightEyeOffset.x) * 0.1; // 10% influence from eyes
      const eyeInfluenceY = (leftEyeOffset.y + rightEyeOffset.y) * 0.1;
      
      baseOffset.x += eyeInfluenceX;
      baseOffset.y += eyeInfluenceY;
    }
    
    // Clamp the movement with tighter bounds for mouth
    const clampedOffset = {
      x: Math.max(-maxEyeMovement * 0.4, Math.min(maxEyeMovement * 0.4, baseOffset.x)),
      y: Math.max(-maxEyeMovement * 0.4, Math.min(maxEyeMovement * 0.4, baseOffset.y)),
    };
    
    return clampedOffset;
  };

  // Get mouth style based on expression
  const getMouthStyle = useCallback(() => {
    const baseStyle = {
      position: "absolute",
      bottom: "25%",
      left: "50%",
      transform: `translateX(-50%) translate(${mouthOffset.x}px, ${mouthOffset.y}px)`,
      background: "#ffffff",
      transition: "none", // Removed transition to eliminate lag
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: "inset 0px 1px 3px rgba(0, 0, 0, 0.2)", // Subtle depth
      willChange: "transform", // Optimize for transform changes
    };

    switch (mouthExpression) {
      case 'happy':
        return {
          ...baseStyle,
          width: `${mouthWidth}px`,
          height: `${mouthHeight}px`,
          borderRadius: "0 0 12px 12px",
          // Removed conflicting animation to prevent flickering
        };
      case 'excited':
        return {
          ...baseStyle,
          width: `${mouthWidth + 4}px`,
          height: `${mouthHeight + 4}px`,
          borderRadius: "0 0 15px 15px",
          // Removed conflicting animation to prevent flickering
        };
      case 'surprised':
        return {
          ...baseStyle,
          width: `${mouthWidth / 2}px`,
          height: `${mouthHeight * 1.8}px`,
          borderRadius: "50%",
          // Removed conflicting animation to prevent flickering
        };
      case 'curious':
        return {
          ...baseStyle,
          width: `${mouthWidth - 2}px`,
          height: `${mouthHeight / 2}px`,
          borderRadius: "0 0 8px 8px",
          // Removed conflicting animation to prevent flickering
        };
      case 'neutral':
        return {
          ...baseStyle,
          width: `${mouthWidth}px`,
          height: "3px",
          borderRadius: "2px",
          // Removed conflicting animation to prevent flickering
        };
      case 'thinking':
        return {
          ...baseStyle,
          width: `${mouthWidth}px`,
          height: `${mouthHeight}px`,
          background: 'none',
          borderRadius: 0,
          boxShadow: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
        };
      default:
        return {
          ...baseStyle,
          width: `${mouthWidth}px`,
          height: `${mouthHeight}px`,
          borderRadius: "0 0 12px 12px",
          // Removed conflicting animation to prevent flickering
        };
    }
  }, [mouthExpression, mouthOffset.x, mouthOffset.y, mouthWidth, mouthHeight]);

  // Memoized mouth style to prevent flickering
  const memoizedMouthStyle = useMemo(() => {
    return getMouthStyle();
  }, [getMouthStyle]);

  // Get accent color based on theme
  const getAccentColor = () => {
    // Try to get CSS custom property first
    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color');
    if (accentColor && accentColor.trim() !== '') {
      return accentColor.trim();
    }
    
    // Fallback colors based on theme
    if (isDarkMode) {
      return '#9b5de5'; // Purple for dark mode
    } else {
      return '#2563eb'; // Blue for light mode
    }
  };

  // Style definitions - Using absolute positioning to stay within container
  const containerStyle = {
    position: "absolute", // Changed to absolute to stay within parent container
    top: typeof actualPosition.y === 'number' && actualPosition.y <= 100 ? `${actualPosition.y}%` : `${actualPosition.y}px`,
    left: typeof actualPosition.x === 'number' && actualPosition.x <= 100 ? `${actualPosition.x}%` : `${actualPosition.x}px`,
    width: `${sphereSize}px`,
    height: `${sphereSize}px`,
    transform: "translate(-50%, -50%)",
    zIndex: 1000,
    pointerEvents: "none",
    opacity: opacity,
    transition: "opacity 0.5s ease-in-out, top 0.3s ease-in-out, left 0.3s ease-in-out",
  };

  const sphereStyle = {
    position: "relative",
    width: `${sphereSize}px`,
    height: `${sphereSize}px`,
    background: getAccentColor(),
    borderRadius: "50%",
    boxShadow: `0px 20px 25px ${getAccentColor()}40, inset -5px -5px 15px rgba(0, 0, 0, 0.5), inset 5px 5px 15px rgba(255, 255, 255, 0.1)`,
    animation: isThinking ? "thinkingFloat 2s ease-in-out infinite" : "float 3s ease-in-out infinite",
  };

  const eyeBaseStyle = {
    position: "absolute",
    width: `${eyeWidth}px`,
    height: isBlinking ? "2px" : `${eyeHeight}px`, // Blinking effect
    background: "#ffffff",
    borderRadius: "6px",
    boxShadow: "inset 0px 2px 5px rgba(0, 0, 0, 0.3)",
    willChange: "transform, height",
    transition: "height 0.1s ease, width 0.3s ease",
  };

  // Get eye style based on expression
  const getEyeStyle = (baseStyle, isLeft = true) => {
    let width = eyeWidth;
    let height = eyeHeight;
    
    if (isBlinking) {
      height = 2;
    } else {
      switch (eyeExpression) {
        case 'wide':
          width = eyeWidth + 2;
          height = eyeHeight + 3;
          break;
        case 'squint':
          width = eyeWidth - 2;
          height = eyeHeight - 4;
          break;
        case 'curious':
          width = eyeWidth + 1;
          height = eyeHeight + 1;
          break;
        default: // normal
          width = eyeWidth;
          height = eyeHeight;
      }
    }
    
    return {
      ...baseStyle,
      width: `${width}px`,
      height: `${height}px`,
    };
  };

  const leftEyeStyle = {
    ...getEyeStyle(eyeBaseStyle, true),
    top: "40%",
    left: "30%",
    transform: `translate(-50%, -50%) translate(${leftEyeOffset.x}px, ${leftEyeOffset.y}px)`,
  };

  const rightEyeStyle = {
    ...getEyeStyle(eyeBaseStyle, false),
    top: "40%",
    left: "70%",
    transform: `translate(-50%, -50%) translate(${rightEyeOffset.x}px, ${rightEyeOffset.y}px)`,
  };

  // Add CSS animations
  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = `
      @keyframes float {
        0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
        50% { transform: translate(-50%, -50%) translateY(-5px); }
      }
      
      @keyframes thinkingFloat {
        0%, 100% { transform: translate(-50%, -50%) translateY(0px) scale(1); }
        25% { transform: translate(-50%, -50%) translateY(-3px) scale(1.02); }
        50% { transform: translate(-50%, -50%) translateY(-5px) scale(1.05); }
        75% { transform: translate(-50%, -50%) translateY(-3px) scale(1.02); }
      }
      
      @keyframes thinkingPulse {
        0%, 100% { opacity: 0.7; transform: translateX(-50%) translate(${mouthOffset.x}px, ${mouthOffset.y}px) scale(1); }
        50% { opacity: 1; transform: translateX(-50%) translate(${mouthOffset.x}px, ${mouthOffset.y}px) scale(1.1); }
      }
      
      @keyframes happyGlow {
        0%, 100% { filter: brightness(1); }
        50% { filter: brightness(1.1); }
      }
      
      @keyframes excitedBounce {
        0%, 100% { transform: translateX(-50%) translate(${mouthOffset.x}px, ${mouthOffset.y}px) scale(1); }
        50% { transform: translateX(-50%) translate(${mouthOffset.x}px, ${mouthOffset.y}px) scale(1.15); }
      }
      
      @keyframes surprisedPulse {
        0%, 100% { transform: translateX(-50%) translate(${mouthOffset.x}px, ${mouthOffset.y}px) scale(1); }
        50% { transform: translateX(-50%) translate(${mouthOffset.x}px, ${mouthOffset.y}px) scale(1.2); }
      }
      
      @keyframes curiousWiggle {
        0%, 100% { transform: translateX(-50%) translate(${mouthOffset.x}px, ${mouthOffset.y}px) rotate(0deg); }
        25% { transform: translateX(-50%) translate(${mouthOffset.x}px, ${mouthOffset.y}px) rotate(-2deg); }
        75% { transform: translateX(-50%) translate(${mouthOffset.x}px, ${mouthOffset.y}px) rotate(2deg); }
      }
      
      @keyframes neutralBreath {
        0%, 100% { opacity: 0.8; }
        50% { opacity: 1; }
      }
    `;
    document.head.appendChild(styleSheet);
    
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, [mouthOffset.x, mouthOffset.y]);

  // Add a helper component for animated question marks
  const QuestionMarks = ({ isThinking }) => {
    if (!isThinking) return null;
    // Three question marks, each with a different animation delay
    return (
      <svg style={{ position: 'absolute', left: '50%', top: '-40px', transform: 'translateX(-50%)', pointerEvents: 'none', zIndex: 1100, width: 80, height: 40, overflow: 'visible' }} width="80" height="40">
        <g>
          <text x="10" y="30" fontSize="28" fill="#fff" stroke="#000" strokeWidth="1" style={{ opacity: 0.8 }}>
            ?
          </text>
          <animateTransform attributeName="transform" type="translate" from="0 0" to="0 -20" begin="0s" dur="1.2s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.8" to="0" begin="0s" dur="1.2s" repeatCount="indefinite" />
        </g>
        <g>
          <text x="35" y="20" fontSize="22" fill="#fff" stroke="#000" strokeWidth="1" style={{ opacity: 0.7 }}>
            ?
          </text>
          <animateTransform attributeName="transform" type="translate" from="0 0" to="0 -18" begin="0.4s" dur="1.2s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.7" to="0" begin="0.4s" dur="1.2s" repeatCount="indefinite" />
        </g>
        <g>
          <text x="60" y="28" fontSize="18" fill="#fff" stroke="#000" strokeWidth="1" style={{ opacity: 0.6 }}>
            ?
          </text>
          <animateTransform attributeName="transform" type="translate" from="0 0" to="0 -15" begin="0.8s" dur="1.2s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.6" to="0" begin="0.8s" dur="1.2s" repeatCount="indefinite" />
        </g>
      </svg>
    );
  };

  return (
    <div ref={sphereRef} style={containerStyle}>
      <QuestionMarks isThinking={isThinking} />
      <div style={sphereStyle}>
        <div style={leftEyeStyle}></div>
        <div style={rightEyeStyle}></div>
        {/* Render mouth based on expression */}
        {mouthExpression === 'thinking' ? (
          <svg width={mouthWidth} height={mouthHeight} style={{ position: 'absolute', bottom: '25%', left: '50%', transform: `translateX(-50%) translate(${mouthOffset.x}px, ${mouthOffset.y}px)`, zIndex: 2 }}>
            {/* Squiggle path for thinking */}
            <path d="M2,8 Q6,2 10,8 Q14,14 18,8" stroke="#fff" strokeWidth="2.5" fill="none" />
          </svg>
        ) : (
                          <div style={memoizedMouthStyle}></div>
        )}
      </div>
    </div>
  );
};

export default GlowingSphere;