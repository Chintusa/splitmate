import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

export type AlertType = 'info' | 'success' | 'warning' | 'error';

export interface AlertOptions {
  title?: string;
  message: string;
  type?: AlertType;
  buttonText?: string;
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  type?: AlertType;
}

export interface ToastItem {
  id: string;
  message: string;
  type: AlertType;
}

interface AlertContextValue {
  alert: (options: AlertOptions | string) => Promise<void>;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  toast: {
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
  };
}

const AlertContext = createContext<AlertContextValue | null>(null);

export const useAlert = (): AlertContextValue => {
  const ctx = useContext(AlertContext);
  if (!ctx) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return ctx;
};

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Alert / Confirm state
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    mode: 'alert' | 'confirm';
    title: string;
    message: string;
    type: AlertType;
    confirmText: string;
    cancelText: string;
    danger: boolean;
  }>({
    isOpen: false,
    mode: 'alert',
    title: '',
    message: '',
    type: 'info',
    confirmText: 'OK',
    cancelText: 'Cancel',
    danger: false,
  });

  const resolverRef = useRef<((value: any) => void) | null>(null);

  // Toast state
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: AlertType, duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const toast = {
    success: (message: string, duration?: number) => addToast(message, 'success', duration),
    error: (message: string, duration?: number) => addToast(message, 'error', duration),
    info: (message: string, duration?: number) => addToast(message, 'info', duration),
    warning: (message: string, duration?: number) => addToast(message, 'warning', duration),
  };

  const alert = useCallback((options: AlertOptions | string): Promise<void> => {
    return new Promise((resolve) => {
      const isString = typeof options === 'string';
      const title = isString ? 'Notice' : (options.title || 'Notice');
      const message = isString ? options : options.message;
      const type = isString ? 'info' : (options.type || 'info');
      const buttonText = isString ? 'Got it' : (options.buttonText || 'Got it');

      resolverRef.current = () => {
        setDialogState((prev) => ({ ...prev, isOpen: false }));
        resolve();
      };

      setDialogState({
        isOpen: true,
        mode: 'alert',
        title,
        message,
        type,
        confirmText: buttonText,
        cancelText: '',
        danger: type === 'error',
      });
    });
  }, []);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolverRef.current = (confirmed: boolean) => {
        setDialogState((prev) => ({ ...prev, isOpen: false }));
        resolve(confirmed);
      };

      setDialogState({
        isOpen: true,
        mode: 'confirm',
        title: options.title || 'Confirm Action',
        message: options.message,
        type: options.type || (options.danger ? 'error' : 'info'),
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        danger: !!options.danger,
      });
    });
  }, []);

  const handleConfirm = () => {
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
  };

  const handleCancel = () => {
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
  };

  const getTypeStyles = (type: AlertType, danger: boolean) => {
    if (danger || type === 'error') {
      return {
        iconBg: 'bg-red-50 text-red-600 border border-red-200',
        iconName: 'warning',
        btnBg: 'bg-red-600 hover:bg-red-700 text-white shadow-sm',
      };
    }
    if (type === 'success') {
      return {
        iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
        iconName: 'check_circle',
        btnBg: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm',
      };
    }
    if (type === 'warning') {
      return {
        iconBg: 'bg-amber-50 text-amber-600 border border-amber-200',
        iconName: 'priority_high',
        btnBg: 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm',
      };
    }
    return {
      iconBg: 'bg-primary/10 text-primary border border-primary/20',
      iconName: 'info',
      btnBg: 'bg-primary-container hover:bg-primary text-on-primary shadow-sm',
    };
  };

  const typeStyles = getTypeStyles(dialogState.type, dialogState.danger);

  return (
    <AlertContext.Provider value={{ alert, confirm, toast }}>
      {children}

      {/* Modern In-App Dialog / Confirm Modal */}
      {dialogState.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop with smooth blur */}
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm animate-modal-backdrop transition-opacity"
            onClick={dialogState.mode === 'alert' ? handleConfirm : handleCancel}
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container-high/80 p-6 z-10 flex flex-col gap-4 animate-modal-content">
            <div className="flex items-start gap-4">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${typeStyles.iconBg}`}
              >
                <span className="material-symbols-outlined text-[24px]">
                  {typeStyles.iconName}
                </span>
              </div>
              <div className="flex flex-col gap-1 min-w-0 flex-1 pt-0.5">
                <h3 className="font-headline-md text-headline-md text-on-surface font-semibold tracking-tight">
                  {dialogState.title}
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                  {dialogState.message}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-surface-container-high/60 mt-1">
              {dialogState.mode === 'confirm' && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 rounded-lg font-label-md text-label-md font-medium text-on-surface hover:bg-surface-container transition-colors"
                >
                  {dialogState.cancelText}
                </button>
              )}
              <button
                type="button"
                autoFocus
                onClick={handleConfirm}
                className={`px-5 py-2 rounded-lg font-label-md text-label-md font-semibold transition-all ${typeStyles.btnBg}`}
              >
                {dialogState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating In-App Toast Notifications */}
      {toasts.length > 0 && (
        <div className="fixed top-5 right-5 z-[99999] flex flex-col gap-2.5 max-w-sm pointer-events-none">
          {toasts.map((t) => {
            const isError = t.type === 'error';
            const isSuccess = t.type === 'success';
            const isWarning = t.type === 'warning';

            return (
              <div
                key={t.id}
                className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-md animate-modal-content transition-all ${
                  isError
                    ? 'bg-red-950/90 text-red-100 border-red-800'
                    : isSuccess
                    ? 'bg-emerald-950/90 text-emerald-100 border-emerald-800'
                    : isWarning
                    ? 'bg-amber-950/90 text-amber-100 border-amber-800'
                    : 'bg-slate-900/90 text-white border-slate-700'
                }`}
              >
                <span className="material-symbols-outlined text-[20px] shrink-0">
                  {isError ? 'error' : isSuccess ? 'check_circle' : isWarning ? 'warning' : 'info'}
                </span>
                <span className="font-body-sm text-body-sm font-medium flex-1">
                  {t.message}
                </span>
                <button
                  type="button"
                  onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
                  className="opacity-70 hover:opacity-100 transition-opacity text-current"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </AlertContext.Provider>
  );
};
