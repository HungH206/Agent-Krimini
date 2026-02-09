
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { Incident } from '../types';

interface VoiceAgentViewProps {
  incidents: Incident[];
  userLocation: [number, number];
  customDirective?: string;
}

const VoiceAgentView: React.FC<VoiceAgentViewProps> = ({ incidents, userLocation, customDirective }) => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'listening' | 'speaking'>('idle');
  const [transcriptions, setTranscriptions] = useState<{ text: string; role: 'user' | 'model' }[]>([]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // PCM Decoding Utilities
  function decode(base64: string) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }

  function encode(bytes: Uint8Array) {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  const stopSession = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();
    setIsActive(false);
    setStatus('idle');
  };

  const startSession = async () => {
    setStatus('connecting');
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    audioContextRef.current = outputCtx;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    const incidentSummary = incidents.map(i => `${i.type} at ${i.locationName} (${i.severity} severity)`).join('. ');
    const systemInstruction = `${customDirective || "You are Agent Krimini's Tactical Voice Interface."}
    Current Campus Safety Context: ${incidentSummary}. 
    User Location: Lat ${userLocation[0]}, Lng ${userLocation[1]}. 
    Speak clearly and efficiently. If a user asks about incidents, use the provided context to analyze risks. 
    Be helpful, calm, and professional like a high-end AI safety coordinator.`;

    const sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      callbacks: {
        onopen: () => {
          setIsActive(true);
          setStatus('listening');
          
          const source = inputCtx.createMediaStreamSource(stream);
          const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
          scriptProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const int16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              int16[i] = inputData[i] * 32768;
            }
            const pcmBlob = {
              data: encode(new Uint8Array(int16.buffer)),
              mimeType: 'audio/pcm;rate=16000',
            };
            sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
          };
          source.connect(scriptProcessor);
          scriptProcessor.connect(inputCtx.destination);
        },
        onmessage: async (message) => {
          if (message.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
            setStatus('speaking');
            const audioData = decode(message.serverContent.modelTurn.parts[0].inlineData.data);
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
            const audioBuffer = await decodeAudioData(audioData, outputCtx, 24000, 1);
            const source = outputCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputCtx.destination);
            source.onended = () => {
              sourcesRef.current.delete(source);
              if (sourcesRef.current.size === 0) setStatus('listening');
            };
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuffer.duration;
            sourcesRef.current.add(source);
          }

          if (message.serverContent?.inputTranscription) {
             setTranscriptions(prev => [...prev.slice(-10), { text: message.serverContent.inputTranscription.text, role: 'user' }]);
          }
          if (message.serverContent?.outputTranscription) {
             setTranscriptions(prev => [...prev.slice(-10), { text: message.serverContent.outputTranscription.text, role: 'model' }]);
          }

          if (message.serverContent?.interrupted) {
            sourcesRef.current.forEach(s => s.stop());
            sourcesRef.current.clear();
            nextStartTimeRef.current = 0;
          }
        },
        onerror: (e) => {
          console.error("Live Error", e);
          stopSession();
        },
        onclose: () => {
          setIsActive(false);
          setStatus('idle');
        }
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
        },
        systemInstruction,
        inputAudioTranscription: {},
        outputAudioTranscription: {}
      }
    });

    sessionRef.current = await sessionPromise;
  };

  useEffect(() => {
    return () => stopSession();
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 h-full items-center">
        
        {/* Visualizer Section */}
        <div className="flex flex-col items-center justify-center space-y-8">
          <div className="relative group">
            {/* Outer Glows */}
            <div className={`absolute inset-0 rounded-full blur-3xl transition-all duration-1000 ${
              status === 'speaking' ? 'bg-indigo-500/40 scale-125' : 
              status === 'listening' ? 'bg-emerald-500/30 scale-110' : 
              status === 'connecting' ? 'bg-yellow-500/20 animate-pulse' : 'bg-slate-800/20'
            }`}></div>
            
            {/* The Orb */}
            <div className={`w-64 h-64 rounded-full border-2 flex items-center justify-center relative z-10 transition-all duration-500 ${
              status === 'speaking' ? 'border-indigo-500 scale-105 shadow-[0_0_50px_rgba(99,102,241,0.5)]' : 
              status === 'listening' ? 'border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.3)]' : 
              'border-slate-800'
            }`}>
              <div className={`w-48 h-48 rounded-full flex items-center justify-center bg-slate-900 border border-slate-800 overflow-hidden relative shadow-inner`}>
                 {/* CSS Waveform Animation */}
                 {status !== 'idle' && (
                   <div className="flex items-end gap-1.5 h-20">
                     {[...Array(12)].map((_, i) => (
                       <div 
                         key={i} 
                         className={`w-2 bg-indigo-400 rounded-full transition-all duration-200 ${status === 'speaking' ? 'animate-[bounce_1s_infinite]' : 'h-2 opacity-30'}`}
                         style={{ height: status === 'speaking' ? `${Math.random() * 100}%` : '8px', animationDelay: `${i * 0.1}s` }}
                       ></div>
                     ))}
                   </div>
                 )}
                 {status === 'idle' && <i className="fa-solid fa-microphone-slash text-slate-700 text-6xl"></i>}
              </div>
            </div>

            {/* Status Indicator Badge */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 glass-morphism px-6 py-2 rounded-full border border-slate-700 z-20">
              <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                status === 'speaking' ? 'text-indigo-400' : 
                status === 'listening' ? 'text-emerald-400' : 'text-slate-500'
              }`}>
                {status === 'idle' ? 'Ready' : status === 'connecting' ? 'Calibrating...' : status}
                {status !== 'idle' && <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping"></span>}
              </span>
            </div>
          </div>

          <div className="flex gap-4">
            {!isActive ? (
              <button 
                onClick={startSession}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all flex items-center gap-3"
              >
                <i className="fa-solid fa-microphone"></i> Start Voice Link
              </button>
            ) : (
              <button 
                onClick={stopSession}
                className="bg-red-600/10 border border-red-500/50 text-red-500 hover:bg-red-600 hover:text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center gap-3"
              >
                <i className="fa-solid fa-phone-slash"></i> Terminate Link
              </button>
            )}
          </div>
        </div>

        {/* Transcription / Context Section */}
        <div className="h-full flex flex-col space-y-4">
           <div className="glass-morphism rounded-2xl border border-slate-800 p-6 flex-1 flex flex-col overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-4">
                 <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Live Transcription</h3>
                 <span className="text-[10px] text-indigo-400 font-mono">LATENCY: LOW</span>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 no-scrollbar">
                {transcriptions.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center opacity-30 px-8">
                    <p className="text-xs leading-relaxed italic">Initiate tactical voice link to begin real-time analysis...</p>
                  </div>
                ) : (
                  transcriptions.map((t, i) => (
                    <div key={i} className={`flex flex-col ${t.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <span className="text-[8px] font-bold text-slate-500 uppercase mb-1">{t.role === 'user' ? 'You' : 'Krimini'}</span>
                      <div className={`p-3 rounded-xl text-xs max-w-[90%] ${
                        t.role === 'user' ? 'bg-slate-800 text-slate-300' : 'bg-indigo-500/10 text-indigo-200 border border-indigo-500/20'
                      }`}>
                        {t.text}
                      </div>
                    </div>
                  ))
                )}
              </div>
           </div>

           <div className="glass-morphism rounded-2xl border border-slate-800 p-4 bg-slate-900/40">
              <div className="flex items-center gap-3 mb-2">
                 <i className="fa-solid fa-circle-nodes text-indigo-400 text-sm"></i>
                 <span className="text-[10px] font-bold uppercase text-slate-500">Grounding Source: Real-Time Incidents</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                The assistant uses your global tactical directive: "{customDirective?.slice(0, 50)}..."
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceAgentView;
