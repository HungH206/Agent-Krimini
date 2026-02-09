
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import SafetyMap from './SafetyMap.tsx';
import IncidentFeed from './IncidentFeed.tsx';
import VoiceAgentView from './VoiceAgentView.tsx';
import AgentManager from './AgentManager.tsx';
import ReasoningChatView from './ReasoningChatView.tsx';
import RecordsView from './RecordsView.tsx';
import { Incident, Severity, SafetyStatus, ChatMessage, ViewType, Agent, AgentSpecialty, EmergencyLog } from '../types.ts';
import { CAMPUS_CENTER, CAMPUS_LOCATIONS } from '../constants.ts';
import { getSafetySummary, generateEmergencyDraft } from '../services/geminiService.ts';
import { db } from '../services/db.ts';

const SafetyDashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>(ViewType.DASHBOARD);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number]>([CAMPUS_CENTER.lat, CAMPUS_CENTER.lng]);
  const [safetyStatus, setSafetyStatus] = useState<SafetyStatus | null>(null);
  const [isDbLoading, setIsDbLoading] = useState(true);
  
  // SOS State
  const [emergencyDraft, setEmergencyDraft] = useState<string | null>(null);
  const [isSOSLoading, setIsSOSLoading] = useState(false);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [sosExtraDetails, setSosExtraDetails] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('');
  
  // Config State
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [globalDirective, setGlobalDirective] = useState('You are Agent Krimini, a high-intelligence campus safety coordinator for the University of Houston. Be tactical, concise, and prioritize human life.');
  
  const [filterHours, setFilterHours] = useState<number>(24);
  const [isAgentLoading, setIsAgentLoading] = useState(false);
  
  const [agents, setAgents] = useState<Agent[]>([
    {
      id: 'default-1',
      name: 'Central Watch',
      objective: 'Oversee UH campus safety stability.',
      specialty: AgentSpecialty.INCIDENTS,
      icon: 'fa-shield-halved',
      status: 'active',
      lastInsight: 'Scanning UH sectors. Baseline established.',
      deployTime: new Date()
    }
  ]);

  useEffect(() => {
    document.body.className = isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900 light-mode';
  }, [isDarkMode]);

  // Load from NoSQL DB
  const loadDbData = useCallback(async () => {
    setIsDbLoading(true);
    const data = await db.getIncidents();
    setIncidents(data);
    setIsDbLoading(false);
  }, []);

  useEffect(() => {
    loadDbData();
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(pos => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
      }, (err) => console.warn("Location access denied."), { enableHighAccuracy: true });
    }
  }, [loadDbData]);

  const filteredIncidents = useMemo(() => {
    return incidents.filter(i => i.timestamp.getTime() > Date.now() - filterHours * 3600000);
  }, [incidents, filterHours]);

  const refreshAnalysis = useCallback(async () => {
    if (filteredIncidents.length === 0 && isDbLoading) return;
    setIsAgentLoading(true);
    const status = await getSafetySummary(filteredIncidents, userLocation);
    setSafetyStatus(status);
    setAgents(prev => prev.map(agent => ({
      ...agent,
      lastInsight: status.reasoningSteps[Math.floor(Math.random() * status.reasoningSteps.length)],
      status: status.score < 60 ? 'alert' : 'active'
    })));
    setIsAgentLoading(false);
  }, [filteredIncidents, userLocation, isDbLoading]);

  useEffect(() => { refreshAnalysis(); }, [filteredIncidents.length, refreshAnalysis]);

  const handleSOSInit = () => {
    setShowSOSModal(true);
    setEmergencyDraft(null);
    setSosExtraDetails('');
    setSelectedBuilding('');
  };

  const generateDraft = async () => {
    setIsSOSLoading(true);
    try {
      const draft = await generateEmergencyDraft(
        filteredIncidents, 
        userLocation, 
        CAMPUS_LOCATIONS, 
        sosExtraDetails, 
        globalDirective,
        selectedBuilding || undefined
      );
      setEmergencyDraft(draft);
    } catch (e) {
      const bText = selectedBuilding ? `at ${selectedBuilding}` : `at [${userLocation.join(', ')}]`;
      setEmergencyDraft(`UH SOS: EMERGENCY ${bText}. ${sosExtraDetails}. NEED IMMEDIATE ASSISTANCE.`);
    } finally {
      setIsSOSLoading(false);
    }
  };

  const transmitSOS = async () => {
    if (!emergencyDraft) return;
    
    const log: EmergencyLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date(),
      message: emergencyDraft,
      location: userLocation,
      building: selectedBuilding || "Detected Proximity",
      operatorDetails: sosExtraDetails
    };

    // Save to NoSQL DB
    await db.addEmergencyLog(log);
    
    // Refresh local state to reflect the new critical incident
    await loadDbData();
    
    alert("SOS TRANSMITTED & LOGGED TO DB:\n" + emergencyDraft);
    setShowSOSModal(false);
  };

  const renderConfigModal = () => {
    if (!showConfigModal) return null;
    return (
      <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setShowConfigModal(false)}></div>
        <div className={`p-8 rounded-[2.5rem] border max-w-lg w-full shadow-2xl space-y-8 animate-in zoom-in duration-200 relative z-10 ${
          isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <div className="flex justify-between items-center">
             <h3 className="text-xl font-black uppercase tracking-tighter">Tactical Configuration</h3>
             <button onClick={() => setShowConfigModal(false)} className="opacity-50 hover:opacity-100 transition-opacity">
               <i className="fa-solid fa-xmark text-xl"></i>
             </button>
          </div>
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Global Agent Directive (System Prompt)</label>
            <textarea 
              value={globalDirective}
              onChange={(e) => setGlobalDirective(e.target.value)}
              className={`w-full h-40 p-5 rounded-2xl border text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none resize-none ${
                isDarkMode ? 'bg-slate-950 border-slate-800 text-indigo-300' : 'bg-slate-50 border-slate-200 text-indigo-700'
              }`}
              placeholder="Enter core behavioral instructions for Agent Krimini..."
            />
            <p className="text-[10px] text-slate-500 leading-relaxed italic">
              Modifies the core reasoning across SOS logic, chat, and voice agents.
            </p>
          </div>
          <button 
            onClick={() => setShowConfigModal(false)}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all"
          >
            Apply Tactical Profile
          </button>
        </div>
      </div>
    );
  };

  const renderSOSOverlay = () => {
    if (!showSOSModal) return null;
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-red-950/90 backdrop-blur-xl alarm-overlay" onClick={() => setShowSOSModal(false)}></div>
        <div className="bg-slate-900 border-2 border-red-600 rounded-[2.5rem] p-8 max-w-xl w-full shadow-[0_0_100px_rgba(200,16,46,0.5)] relative z-10 animate-in zoom-in duration-200 overflow-hidden">
          <div className="flex flex-col space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center pulse-danger shadow-lg shadow-red-600/40">
                <i className="fa-solid fa-triangle-exclamation text-white text-xl"></i>
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tighter text-white">Emergency Protocol</h2>
                <p className="text-red-400 font-bold text-[10px] uppercase tracking-[0.3em]">NoSQL Persistence Active</p>
              </div>
            </div>

            {!emergencyDraft ? (
              <div className="space-y-6 animate-in slide-in-from-bottom-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Select Campus Building</label>
                    <select 
                      value={selectedBuilding}
                      onChange={(e) => setSelectedBuilding(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-white focus:ring-2 focus:ring-red-500 outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Auto-detect Nearest</option>
                      {CAMPUS_LOCATIONS.map(loc => (
                        <option key={loc.name} value={loc.name}>{loc.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Field Report Details</label>
                    <input 
                      autoFocus
                      type="text"
                      value={sosExtraDetails}
                      onChange={(e) => setSosExtraDetails(e.target.value)}
                      placeholder="e.g., Active threat, medical req."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <button 
                  onClick={generateDraft}
                  disabled={isSOSLoading}
                  className="w-full bg-red-600 hover:bg-red-500 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-red-600/30 transition-all flex items-center justify-center gap-3"
                >
                  {isSOSLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-bolt"></i>}
                  {isSOSLoading ? 'Synthesizing Tactical Draft...' : 'Generate SOS Transmission'}
                </button>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Review & Customize Message</label>
                  <textarea 
                    value={emergencyDraft}
                    onChange={(e) => setEmergencyDraft(e.target.value)}
                    className="w-full bg-slate-950 border-2 border-red-900/50 rounded-2xl p-6 text-sm text-red-50 font-mono h-40 focus:ring-2 focus:ring-red-500 outline-none transition-all resize-none"
                  />
                  <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase">
                    <span>Target: UHPD Command</span>
                    <span className={emergencyDraft.length > 160 ? 'text-red-500' : ''}>{emergencyDraft.length} / 160 CHARS</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setEmergencyDraft(null)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-400 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                  >
                    Back
                  </button>
                  <button 
                    onClick={transmitSOS}
                    className="bg-red-600 hover:bg-red-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-red-600/20"
                  >
                    Transmit & Store
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderNavbar = () => (
    <nav className={`h-16 border-b glass-morphism sticky top-0 z-[5000] flex items-center justify-between px-6 transition-colors duration-300 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-[#C8102E] rounded flex items-center justify-center shadow-lg shadow-red-500/20">
          <i className="fa-solid fa-user-shield text-white text-sm"></i>
        </div>
        <div>
          <h1 className="font-bold text-sm tracking-tight">Agent Krimini</h1>
          <div className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${isDbLoading ? 'bg-yellow-500 animate-spin' : safetyStatus && safetyStatus.score < 60 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`}></span>
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">UH Intelligence</span>
          </div>
        </div>
      </div>

      <div className={`flex items-center gap-1 p-1 rounded-lg border ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
        {[
          { id: ViewType.DASHBOARD, label: 'Tactical', icon: 'fa-table-columns' },
          { id: ViewType.RECORDS, label: 'Alert Logs', icon: 'fa-database' },
          { id: ViewType.COMMAND, label: 'Units', icon: 'fa-users-gear' },
          { id: ViewType.AGENT, label: 'Reasoning', icon: 'fa-brain' },
          { id: ViewType.VOICE, label: 'Voice Link', icon: 'fa-microphone-lines' },
          { id: ViewType.MAP, label: 'Map', icon: 'fa-map-location-dot' },
        ].map(view => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all ${
              activeView === view.id 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <i className={`fa-solid ${view.icon}`}></i>
            <span className="hidden md:inline">{view.label}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={() => setShowConfigModal(true)}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isDarkMode ? 'bg-slate-800 text-indigo-400 hover:bg-slate-700' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
          title="Tactical Configuration"
        >
          <i className="fa-solid fa-sliders"></i>
        </button>
        <button 
          onClick={() => setIsDarkMode(!isDarkMode)}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isDarkMode ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
        >
          <i className={`fa-solid ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
        </button>
        <button 
          onClick={handleSOSInit}
          className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all pulse-danger active:scale-95"
        >
          SOS
        </button>
      </div>
    </nav>
  );

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden font-sans transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {renderNavbar()}
      {renderSOSOverlay()}
      {renderConfigModal()}
      <div className="flex-1 flex overflow-hidden relative">
        {activeView === ViewType.DASHBOARD && (
          <div className="flex flex-1 overflow-hidden">
            <aside className={`w-80 flex flex-col border-r z-10 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="p-4">
                <div className={`p-4 rounded-xl border transition-all duration-1000 ${
                  safetyStatus?.score && safetyStatus.score < 60 
                    ? 'bg-red-500/10 border-red-500/30' 
                    : isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-100 border-slate-200'
                }`}>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Campus Risk Rating</div>
                  <div className="text-4xl font-black">{safetyStatus?.score || '--'}</div>
                  <p className={`text-[11px] mt-2 italic leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>"{safetyStatus?.summary}"</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tactical Directives</h3>
                {safetyStatus?.recommendations.map((rec, i) => (
                  <div key={i} className={`p-3 rounded-lg border flex gap-3 ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <span className="text-indigo-400 font-bold text-[10px]">{i+1}</span>
                    <p className={`text-[11px] ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{rec}</p>
                  </div>
                ))}
              </div>
            </aside>
            <div className="flex-1">
              <SafetyMap incidents={filteredIncidents} userLocation={userLocation} filterHours={filterHours} onFilterChange={setFilterHours} isDarkMode={isDarkMode} />
            </div>
            <aside className="w-80">
              <IncidentFeed incidents={filteredIncidents} onSelectIncident={inc => setUserLocation(inc.location)} isDarkMode={isDarkMode} />
            </aside>
          </div>
        )}
        {activeView === ViewType.MAP && (
          <div className="flex-1">
            <SafetyMap incidents={filteredIncidents} userLocation={userLocation} filterHours={filterHours} onFilterChange={setFilterHours} isDarkMode={isDarkMode} />
          </div>
        )}
        {activeView === ViewType.COMMAND && <AgentManager agents={agents} isDarkMode={isDarkMode} onDeploy={() => {}} onTerminate={() => {}} />}
        {activeView === ViewType.AGENT && <ReasoningChatView isDarkMode={isDarkMode} userLocation={userLocation} customDirective={globalDirective} tacticalContext={incidents} />}
        {activeView === ViewType.VOICE && <VoiceAgentView incidents={filteredIncidents} userLocation={userLocation} customDirective={globalDirective} />}
        {activeView === ViewType.RECORDS && <RecordsView isDarkMode={isDarkMode} onRefresh={loadDbData} />}
      </div>
    </div>
  );
};

export default SafetyDashboard;
