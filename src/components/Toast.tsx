'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}

interface ToastItemProps {
  toast: Toast;
  onClose: (id: string) => void;
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  useEffect(() => {
    if (toast.duration) {
      const timer = setTimeout(() => onClose(toast.id), toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, onClose]);

  const bgColorMap = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
    warning: 'bg-amber-50 border-amber-200',
  };

  const textColorMap = {
    success: 'text-green-800',
    error: 'text-red-800',
    info: 'text-blue-800',
    warning: 'text-amber-800',
  };

  const iconColorMap = {
    success: 'text-green-600',
    error: 'text-red-600',
    info: 'text-blue-600',
    warning: 'text-amber-600',
  };

  const IconComponent = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    warning: AlertCircle,
  }[toast.type];

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 shadow-md animate-slide-in ${bgColorMap[toast.type]}`}
      role="alert"
    >
      <IconComponent className={`h-5 w-5 flex-shrink-0 mt-0.5 ${iconColorMap[toast.type]}`} />
      <div className="flex-1">
        <h3 className={`font-semibold ${textColorMap[toast.type]}`}>{toast.title}</h3>
        {toast.message && (
          <p className={`text-sm mt-1 ${textColorMap[toast.type]} opacity-90`}>{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onClose(toast.id)}
        className={`flex-shrink-0 p-1 hover:bg-white/50 rounded transition-colors ${textColorMap[toast.type]}`}
        aria-label="Close notification"
      >
        <X size={18} />
      </button>
    </div>
  );
}

export interface ToastContextType {
  toasts: Toast[];
  showToast: (type: Toast['type'], title: string, message?: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (type: Toast['type'], title: string, message?: string, duration = 5000) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = {
      id,
      type,
      title,
      message,
      duration: duration > 0 ? duration : undefined,
    };

    setToasts((prev) => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return {
    toasts,
    showToast,
    removeToast,
  };
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed right-4 top-4 z-50 space-y-2 pointer-events-none md:right-8 md:top-8">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onClose={onRemove} />
        </div>
      ))}
    </div>
  );
}
