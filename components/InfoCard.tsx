
import React from 'react';

interface InfoCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: React.ReactNode;
  color?: string;
}

export const InfoCard: React.FC<InfoCardProps> = ({ label, value, subValue, icon, color = "bg-white" }) => {
  return (
    <div className={`${color} p-6 rounded-2xl shadow-sm border border-slate-200 transition-all hover:shadow-md`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-500 text-sm font-medium">{label}</span>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      {subValue && <div className="text-xs text-slate-400 mt-1">{subValue}</div>}
    </div>
  );
};
