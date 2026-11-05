import React from 'react';
import { BookOpen, Send, Award, Globe } from 'lucide-react';

interface TestPaperKpiHeaderProps {
  totalPapers: number;
  assignedCount: number;
  totalSubmissions: number;
  publicCount: number;
}

export const TestPaperKpiHeader: React.FC<TestPaperKpiHeaderProps> = ({
  totalPapers,
  assignedCount,
  totalSubmissions,
  publicCount,
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
          <BookOpen className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-slate-500 font-medium">總可見試卷</p>
          <p className="text-xl font-black text-slate-900">
            {totalPapers} <span className="text-xs font-normal text-slate-400">份</span>
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
          <Send className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-slate-500 font-medium">已指派班級任務</p>
          <p className="text-xl font-black text-indigo-700">
            {assignedCount} <span className="text-xs font-normal text-slate-400">項</span>
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
          <Award className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-slate-500 font-medium">學生已繳卷人次</p>
          <p className="text-xl font-black text-emerald-700">
            {totalSubmissions} <span className="text-xs font-normal text-slate-400">人次</span>
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
          <Globe className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-slate-500 font-medium">開放自學題庫</p>
          <p className="text-xl font-black text-purple-700">
            {publicCount} <span className="text-xs font-normal text-slate-400">份</span>
          </p>
        </div>
      </div>
    </div>
  );
};
