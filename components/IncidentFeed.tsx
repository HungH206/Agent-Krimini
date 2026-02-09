
import React from 'react';
import { Incident, Severity } from '../types.ts';

interface IncidentFeedProps {
  incidents: Incident[];
  onSelectIncident: (incident: Incident) => void;
  isDarkMode?: boolean;
}

const getSeverityClass = (sev: Severity, isDarkMode: boolean) => {
  if (isDarkMode) {
    switch (sev) {
      case Severity.CRITICAL: return 'border-red-500/50 bg-red-500/10 text-red-400';
      case Severity.HIGH: return 'border-orange-500/50 bg-orange-500/10 text-orange-400';
      default: return 'border-slate-800 bg-slate-800/30 text-slate-400';
    }
  } else {
    switch (sev) {
      case Severity.CRITICAL: return 'border-red-200 bg-red-50 text-red-700';
      case Severity.HIGH: return 'border-orange-200 bg-orange-50 text-orange-700';
      default: return 'border-slate-200 bg-white text-slate-600 shadow-sm';
    }
  }
};

const IncidentFeed: React.FC<IncidentFeedProps> = ({ incidents, onSelectIncident, isDarkMode = true }) => {
  return (
    <div className={`flex flex-col h-full border-l transition-colors duration-300 ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
      <div className={`p-4 border-b flex justify-between items-center ${isDarkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-white'}`}>
        <h2 className="font-bold flex items-center gap-2 text-xs uppercase tracking-widest opacity-70">
          <i className="fa-solid fa-bolt text-red-500"></i>
          Incident Stream
        </h2>
        <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
          {incidents.length} NODES
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {incidents.map((incident) => (
          <div 
            key={incident.id}
            onClick={() => onSelectIncident(incident)}
            className={`p-4 rounded-xl border transition-all cursor-pointer hover:border-indigo-500/50 active:scale-[0.98] ${getSeverityClass(incident.severity, isDarkMode)}`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="font-black text-[10px] uppercase tracking-wider">{incident.type}</span>
              <span className="text-[9px] font-bold opacity-60">{new Date(incident.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <p className="text-[11px] mb-2 font-bold">{incident.locationName}</p>
            <p className="text-[11px] opacity-70 italic leading-relaxed">"{incident.description}"</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default IncidentFeed;
