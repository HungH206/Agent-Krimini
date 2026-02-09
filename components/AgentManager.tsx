
import React, { useState } from 'react';
import { Agent, AgentSpecialty } from '../types.ts';

interface AgentManagerProps {
  agents: Agent[];
  onDeploy: (name: string, objective: string, specialty: AgentSpecialty) => void;
  onTerminate: (id: string) => void;
  isDarkMode: boolean;
}

const AgentManager: React.FC<AgentManagerProps> = ({ agents, onDeploy, onTerminate, isDarkMode }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newObjective, setNewObjective] = useState('');
  const [newSpecialty, setNewSpecialty] = useState<AgentSpecialty>(AgentSpecialty.INCIDENTS);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName && newObjective) {
      onDeploy(newName, newObjective, newSpecialty);
      setNewName('');
      setNewObjective('');
      setIsModalOpen(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className={`text-xl font-black tracking-tight uppercase ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Agent Command Center
          </h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Active Tactical Units: {agents.length}</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
        >
          <i className="fa-solid fa-plus"></i> Deploy New Agent
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent) => (
          <div 
            key={agent.id} 
            className={`glass-morphism rounded-3xl border p-6 flex flex-col group relative overflow-hidden transition-all shadow-sm hover:shadow-xl ${
              isDarkMode ? 'border-slate-800' : 'bg-white border-slate-200 shadow-slate-200/50'
            }`}
          >
            <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl -mr-16 -mt-16 opacity-20 transition-all ${
              agent.status === 'alert' ? 'bg-red-500' : 'bg-indigo-500'
            }`}></div>
            
            <div className="flex justify-between items-start mb-5 relative z-10">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner ${
                  agent.status === 'alert' 
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                    : isDarkMode ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                }`}>
                  <i className={`fa-solid ${agent.icon}`}></i>
                </div>
                <div>
                  <h3 className={`font-black text-sm ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{agent.name}</h3>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{agent.specialty}</span>
                </div>
              </div>
              <button 
                onClick={() => onTerminate(agent.id)}
                className={`transition-colors ${isDarkMode ? 'text-slate-600 hover:text-red-400' : 'text-slate-300 hover:text-red-500'}`}
              >
                <i className="fa-solid fa-circle-xmark"></i>
              </button>
            </div>

            <div className="flex-1 space-y-5 relative z-10">
              <div>
                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">Tactical Objective</span>
                <p className={`text-[11px] leading-relaxed italic ${isDarkMode ? 'text-slate-300' : 'text-slate-600 font-medium'}`}>
                  "{agent.objective}"
                </p>
              </div>

              <div className={`rounded-2xl p-4 border transition-colors ${
                isDarkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-indigo-50/50 border-indigo-100/50'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                    agent.status === 'alert' ? 'bg-red-500' : 'bg-emerald-500'
                  }`}></div>
                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Observation Log</span>
                </div>
                <p className={`text-[10px] leading-tight font-bold ${
                  isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
                }`}>
                  {agent.lastInsight || 'Awaiting initial data sweep...'}
                </p>
              </div>
            </div>

            <div className={`mt-5 pt-5 border-t flex justify-between items-center text-[9px] font-black uppercase tracking-[0.2em] relative z-10 ${
              isDarkMode ? 'border-slate-800 text-slate-600' : 'border-slate-100 text-slate-400'
            }`}>
              <span>UPTIME: {Math.floor((Date.now() - agent.deployTime.getTime()) / 60000)}M</span>
              <span className={agent.status === 'active' ? 'text-emerald-500' : 'text-yellow-500'}>
                {agent.status}
              </span>
            </div>
          </div>
        ))}
        {agents.length === 0 && (
          <div className={`col-span-full py-24 text-center border-2 border-dashed rounded-3xl ${
            isDarkMode ? 'border-slate-800 opacity-30' : 'border-slate-200 opacity-60'
          }`}>
            <i className="fa-solid fa-user-slash text-4xl mb-4 text-slate-400"></i>
            <p className="text-sm font-black uppercase tracking-widest text-slate-400">No tactical units deployed</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[10000] flex items-center justify-center p-6">
          <form 
            onSubmit={handleSubmit} 
            className={`p-10 rounded-[2.5rem] border max-w-lg w-full shadow-2xl space-y-8 animate-in zoom-in duration-200 ${
              isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex justify-between items-center">
              <h3 className={`text-xl font-black uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Deploy Tactical Unit
              </h3>
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)} 
                className={`transition-colors ${isDarkMode ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-900'}`}
              >
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Agent Callsign</label>
                <input 
                  autoFocus
                  type="text" value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="e.g., Night Watchman"
                  className={`w-full border rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Primary Objective</label>
                <textarea 
                  value={newObjective} onChange={e => setNewObjective(e.target.value)}
                  placeholder="Monitor for unauthorized gate entry..."
                  className={`w-full border rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-28 resize-none transition-all font-bold ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Core Specialty</label>
                <div className="grid grid-cols-3 gap-3">
                  {Object.values(AgentSpecialty).map(spec => (
                    <button
                      key={spec}
                      type="button"
                      onClick={() => setNewSpecialty(spec)}
                      className={`py-3 px-1 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                        newSpecialty === spec 
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20' 
                          : isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400'
                      }`}
                    >
                      {spec}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 transition-all active:scale-[0.98]">
              INITIALIZE DEPLOYMENT
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AgentManager;
