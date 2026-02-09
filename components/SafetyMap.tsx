
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Incident, Severity } from '../types.ts';

interface SafetyMapProps {
  incidents: Incident[];
  userLocation: [number, number];
  filterHours: number;
  onFilterChange: (hours: number) => void;
  isDarkMode: boolean;
}

const SafetyMap: React.FC<SafetyMapProps> = ({ incidents, userLocation, filterHours, onFilterChange, isDarkMode }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: userLocation,
      zoom: 16,
      zoomControl: false,
      attributionControl: false
    });

    layerGroupRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    setIsLoaded(true);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle Tile Switching
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    
    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }

    const tileUrl = isDarkMode 
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    tileLayerRef.current = L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(mapInstanceRef.current);
  }, [isDarkMode]);

  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(userLocation, mapInstanceRef.current.getZoom());
    }
  }, [userLocation]);

  useEffect(() => {
    if (!mapInstanceRef.current || !layerGroupRef.current) return;

    const layerGroup = layerGroupRef.current;
    layerGroup.clearLayers();

    // User Location
    L.circleMarker(userLocation, {
      radius: 8,
      fillColor: '#6366f1',
      fillOpacity: 1,
      color: isDarkMode ? '#ffffff' : '#000000',
      weight: 2,
    }).addTo(layerGroup).bindTooltip("Pivot Node", { direction: 'top' });

    incidents.forEach(inc => {
      const isUHRed = inc.severity === Severity.CRITICAL || inc.severity === Severity.HIGH;
      const color = inc.isVerifiedResource ? '#a855f7' : 
                   isUHRed ? '#C8102E' : 
                   inc.severity === Severity.MEDIUM ? '#f59e0b' : '#10b981';
      
      const marker = L.circleMarker(inc.location, {
        radius: inc.severity === Severity.CRITICAL ? 12 : 8,
        fillColor: color,
        fillOpacity: 0.8,
        color: isDarkMode ? '#020617' : '#ffffff',
        weight: 2,
      }).addTo(layerGroup);

      L.circle(inc.location, {
        radius: inc.severity === Severity.CRITICAL ? 180 : 100,
        color: color,
        weight: 1,
        opacity: 0.3,
        fillColor: color,
        fillOpacity: 0.05
      }).addTo(layerGroup);

      const popupContent = `
        <div style="min-width: 160px; font-family: sans-serif; color: ${isDarkMode ? '#fff' : '#1e293b'}">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
            <b style="color:${color}; text-transform: uppercase; font-size: 11px; letter-spacing: 1px;">${inc.type}</b>
            <span style="font-size: 9px; opacity: 0.5;">${new Date(inc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <p style="font-size: 12px; font-weight: bold; margin-bottom: 4px;">${inc.locationName}</p>
          <p style="font-size: 11px; opacity: 0.8; line-height: 1.4; margin-bottom: 8px;">${inc.description}</p>
          ${inc.uri ? `<a href="${inc.uri}" target="_blank" style="color:#6366f1; font-size: 10px; font-weight: bold; text-decoration: none;">SECURE LINK</a>` : ''}
        </div>
      `;

      marker.bindPopup(popupContent, { closeButton: false });
    });
  }, [incidents, userLocation, isLoaded, isDarkMode]);

  return (
    <div className={`h-full w-full relative overflow-hidden ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <div ref={mapContainerRef} className="h-full w-full z-0" />
      
      {/* Controls Overlay */}
      <div className="absolute top-4 right-4 z-[500] space-y-2">
        <div className={`glass-morphism p-3 rounded-xl w-48 shadow-2xl transition-all`}>
          <div className={`flex justify-between text-[10px] font-black mb-3 uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            <span>Temporal Range</span>
            <span className="text-indigo-500">{filterHours}H</span>
          </div>
          <input 
            type="range" min="1" max="48" value={filterHours} 
            onChange={(e) => onFilterChange(parseInt(e.target.value))}
            className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>

        <div className={`glass-morphism p-3 rounded-xl text-[10px] space-y-3 font-bold uppercase tracking-widest shadow-2xl ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#C8102E]"></div> 
            <span>UH Alert</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div> 
            <span>Your Pivot</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SafetyMap;
