import React from 'react';
import { Layers } from 'lucide-react';

export const PlaceholderModule: React.FC<{ title: string; description: string }> = ({
  title,
  description,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">{title}</h1>
        <p className="text-xs text-slate-400 mt-1">{description}</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
        <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4">
          <Layers className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white">{title} Architecture Ready</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
          The Phase 1 Mongoose schema, shared contracts, and API routes are defined and ready. Interactive management controls will be connected during Phase 2.
        </p>
      </div>
    </div>
  );
};
