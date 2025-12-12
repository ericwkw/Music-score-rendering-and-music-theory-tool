
import React, { useEffect, useRef } from 'react';
import abcjs from 'abcjs';

interface ScoreRendererProps {
  abcNotation: string;
  onLoad?: () => void;
}

const ScoreRenderer: React.FC<ScoreRendererProps> = ({ abcNotation, onLoad }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && abcNotation) {
      abcjs.renderAbc(containerRef.current, abcNotation, {
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
      {abcNotation ? (
         <div id="paper" ref={containerRef} className="w-full text-black"></div>
      ) : (
         <div className="text-center text-gray-400 select-none">
             <div className="text-6xl mb-4 opacity-30">🎼</div>
             <h3 className="text-xl font-bold text-gray-500">Ready to Practice?</h3>
             <p className="mt-2 text-sm text-gray-400 max-w-md mx-auto">
                Configure your settings in the panel above and click <span className="font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">Generate</span> to create a unique sight-reading exercise.
             </p>
         </div>
      )}
    </div>
  );
};

export default ScoreRenderer;
