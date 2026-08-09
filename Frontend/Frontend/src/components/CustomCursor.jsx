import React, { useEffect, useState } from 'react';

export default function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updateCursorPosition = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', updateCursorPosition);
    
    // Fallback if elements with cursor: pointer still show it
    const handleMouseOver = (e) => {
      if(window.getComputedStyle(e.target).cursor === 'pointer') {
          // can add specific styling here if needed
      }
    };
    
    return () => window.removeEventListener('mousemove', updateCursorPosition);
  }, []);

  return (
    <>
      <div 
        className="custom-cursor" 
        style={{ left: `${position.x}px`, top: `${position.y}px` }} 
      />
      <div 
        className="custom-cursor-trail" 
        style={{ left: `${position.x}px`, top: `${position.y}px` }} 
      />
    </>
  );
}
