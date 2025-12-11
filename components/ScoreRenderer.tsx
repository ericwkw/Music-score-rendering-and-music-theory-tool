import React, { useEffect, useRef } from 'react';

interface ScoreRendererProps {
  abcNotation: string;
  onLoad?: () => void;
}

declare global {
  interface Window {
    ABCJS: any;
  }
}

const ScoreRenderer: React.FC<ScoreRendererProps> = ({ abcNotation, onLoad }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.ABCJS && containerRef.current) {
      window.ABCJS.renderAbc(containerRef.current, abcNotation, {
        responsive: "resize",
        add_classes: true,
        staffwidth: 800, // Base width, scales with responsive
        paddingtop: 40,
        paddingbottom: 40,
        paddingleft: 20,
        paddingright: 20,
      });
      if (onLoad) onLoad();
    }
  }, [abcNotation, onLoad]);

  return (
    <div className="w-full bg-white rounded-xl shadow-2xl p-4 md:p-12 overflow-hidden flex items-center justify-center min-h-[300px]">
      <div id="paper" ref={containerRef} className="w-full text-black"></div>
    </div>
  );
};

export default ScoreRenderer;
