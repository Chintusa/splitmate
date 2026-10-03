import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingProps {
  fullScreen?: boolean;
  message?: string;
}

export const Loading: React.FC<LoadingProps> = ({ fullScreen = false, message = 'Loading...' }) => {
  if (fullScreen) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-200">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mb-4" />
        <p className="text-sm font-medium text-slate-400">{message}</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8 text-slate-400">
      <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mr-3" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};
