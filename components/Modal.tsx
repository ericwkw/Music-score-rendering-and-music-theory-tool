
import React from 'react';
import { Theme } from '../types';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  theme: Theme;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, theme }) => {
  if (!isOpen) return null;

  const colors = theme === 'dark' ? {
    bg: 'bg-[#2a2a2a]',
    border: 'border-gray-700',
    text: 'text-white',
    closeBtn: 'bg-[#3a3a3a] text-gray-400 hover:text-white hover:bg-[#4a4a4a]',
    footerBg: 'bg-[#252525]',
    overlay: 'bg-black/70'
  } : {
    bg: 'bg-white',
    border: 'border-gray-200',
    text: 'text-gray-900',
    closeBtn: 'bg-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-200',
    footerBg: 'bg-gray-50',
    overlay: 'bg-gray-900/50'
  };

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm p-4 ${colors.overlay}`}>
      <div 
        className={`${colors.bg} w-full max-w-2xl rounded-xl shadow-2xl border ${colors.border} flex flex-col max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${colors.border}`}>
          <h2 className={`text-2xl font-bold ${colors.text} tracking-tight`}>{title}</h2>
          <button 
            onClick={onClose}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${colors.closeBtn}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className={`p-6 border-t ${colors.border} ${colors.footerBg} rounded-b-xl flex justify-end gap-3`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
