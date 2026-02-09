
import React, { useState, useEffect } from 'react';
import { Incident, Severity, IncidentStatus } from '../types.ts';
import { db } from '../services/db.ts';

interface RecordsViewProps {
  isDarkMode: boolean;
  onRefresh: () => void;
}

const RecordsView: React.FC<RecordsViewProps> = ({ isDarkMode, onRefresh }) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [filter, setFilter] = useState<IncidentStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const data = await db.getIncidents();
    setIncidents(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateStatus = async (id: string, status: IncidentStatus) => {
    await db.updateIncidentStatus(id, status);
    await loadData();
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Permanently delete this tactical record?")) {
      await db.deleteIncident(id);
      await loadData();
      onRefresh();
    }
  };

  const filtered = incidents.filter(i => filter === 'all' || i.status === filter);

  const getStatusBadge = (status?: IncidentStatus) => {
    switch (status) {
      case 'pending': return <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-yellow-500/20 text-yellow-500 border border-yellow-500/30">Unconfirmed</span>;
      case 'confirmed': return <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-red-500/20 text-red-500 border border-red-500/30">Active Case</span>;
      case 'resolved': return <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">Resolved</span>;
      default: return null;
    }
  };

  return (
    <div className={`flex-1 flex flex-col h-full overflow-hidden ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <div className={`px-8 py-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 ${isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-white'}`}>
        <div>
          <h2 className="text-xl font-black uppercase tracking-tighter">Tactical Alert Database</h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Incident Verification & Lifecycle Management</p>
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
          {(['all', 'pending', 'confirmed', 'resolved'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                filter === f 
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/20' 
                  : isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-500'
              }`}
            >
              {f === 'all' ? 'All Records' : f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center opacity-30 animate-pulse">
            <i className="fa-solid fa-database text-4xl mb-4"></i>
            <span className="text-xs font-black uppercase tracking-[0.3em]">Querying NoSQL Core...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-30">
            <i className="fa-solid fa-folder-open text-4xl mb-4"></i>
            <span className="text-xs font-black uppercase tracking-[0.3em]">No matching records found</span>
          </div>
        ) : (
          filtered.map(inc => (
            <div 
              key={inc.id}
              className={`p-6 rounded-[2rem] border transition-all flex flex-col md:flex-row gap-6 ${
                isDarkMode ? 'bg-slate-900/40 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    inc.severity === Severity.CRITICAL ? 'bg-red-500' : inc.severity === Severity.HIGH ? 'bg-orange-500' : 'bg-indigo-500'
                  }`}></div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">ID: {inc.id.slice(0, 12)}...</span>
                  {getStatusBadge(inc.status)}
                </div>
                
                <h3 className="font-black text-lg uppercase tracking-tight">{inc.type}</h3>
                <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest">{inc.locationName}</p>
                <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{inc.description}</p>
                
                <div className="flex items-center gap-4 text-[10px] text-slate-500 font-mono">
                  <span><i className="fa-solid fa-clock mr-1"></i> {inc.timestamp.toLocaleString()}</span>
                  <span><i className="fa-solid fa-map-pin mr-1"></i> {inc.location.join(', ')}</span>
                </div>
              </div>

              <div className="flex flex-row md:flex-col gap-2 justify-end">
                {inc.status !== 'confirmed' && inc.status !== 'resolved' && (
                  <button 
                    onClick={() => handleUpdateStatus(inc.id, 'confirmed')}
                    className="flex-1 md:flex-none px-4 py-3 rounded-xl bg-red-600/10 text-red-500 border border-red-500/20 text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all"
                  >
                    Confirm Threat
                  </button>
                )}
                {inc.status !== 'resolved' && (
                  <button 
                    onClick={() => handleUpdateStatus(inc.id, 'resolved')}
                    className="flex-1 md:flex-none px-4 py-3 rounded-xl bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all"
                  >
                    Mark Resolved
                  </button>
                )}
                <button 
                  onClick={() => handleDelete(inc.id)}
                  className="flex-1 md:flex-none px-4 py-3 rounded-xl bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-black uppercase tracking-widest hover:bg-red-900 hover:text-white transition-all"
                >
                  Purge
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RecordsView;
