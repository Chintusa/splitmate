import React, { useEffect } from 'react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog / Bottom Sheet on mobile */}
      <div
        className={`relative w-full ${maxWidthClasses[maxWidth]} bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl shadow-2xl border border-surface-container-high/80 z-10 flex flex-col max-h-[90vh] overflow-hidden transform transition-all`}
      >
        {/* Header */}
        <div className="px-space-lg py-4 border-b border-surface-container-high/60 flex items-start justify-between">
          <div className="flex flex-col">
            <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">
              {title}
            </h3>
            {subtitle && (
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content body */}
        <div className="p-space-lg overflow-y-auto flex flex-col gap-4">
          {children}
        </div>

        {/* Footer actions */}
        {footer && (
          <div className="px-space-lg py-3.5 bg-surface-container-low border-t border-surface-container-high/60 flex items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
