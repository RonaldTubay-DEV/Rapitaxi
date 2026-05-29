import React, { useEffect, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';

const ToastHost = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToast = (event) => {
      const toast = event.detail;
      setToasts((current) => [...current, toast]);
      setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== toast.id));
      }, 3500);
    };

    window.addEventListener('rapitaxi-toast', handleToast);
    return () => window.removeEventListener('rapitaxi-toast', handleToast);
  }, []);

  const dismissToast = (id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  return (
    <div className="fixed right-4 top-4 z-[70] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3 sm:right-6 sm:top-6">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-start gap-3 rounded-2xl border border-green-200 bg-white p-4 text-slate-800 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-200"
        >
          <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-slate-900">Accion realizada</p>
            <p className="mt-0.5 text-sm font-medium leading-snug text-slate-600">{toast.message}</p>
          </div>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastHost;
