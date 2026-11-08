import React, { useState } from 'react';
import { Lock, LogIn } from 'lucide-react';

interface AdminPrivilegeGateCardProps {
  readonly onElevate: () => Promise<void>;
}

export const AdminPrivilegeGateCard: React.FC<AdminPrivilegeGateCardProps> = ({
  onElevate,
}) => {
  const [isElevating, setIsElevating] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center min-h-[450px] p-8 text-center rounded-3xl border border-zinc-200/80 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl shadow-lg">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4 ring-1 ring-amber-500/20">
        <Lock className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold font-heading text-zinc-900 dark:text-zinc-100">
        Administrator Privilege Required
      </h2>
      <p className="mt-2 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
        The AI Question Ingestion & Anti-Hallucination Studio is restricted to Platform Administrators.
      </p>
      <button
        type="button"
        disabled={isElevating}
        onClick={async () => {
          setIsElevating(true);
          try {
            await onElevate();
          } finally {
            setIsElevating(false);
          }
        }}
        className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
      >
        <LogIn className="w-3.5 h-3.5" />
        <span>
          {isElevating
            ? 'Elevating Account...'
            : 'Elevate to Platform Administrator (Demo/Dev)'}
        </span>
      </button>
    </div>
  );
};
