
import { Incident, EmergencyLog, Severity, IncidentStatus } from '../types.ts';
import { CAMPUS_LOCATIONS } from '../constants.ts';

const DB_KEYS = {
  INCIDENTS: 'krimini_incidents',
  EMERGENCY_LOGS: 'krimini_emergency_logs'
};

class MockNoSQL {
  private async delay(ms: number = 100) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getIncidents(): Promise<Incident[]> {
    await this.delay();
    const stored = localStorage.getItem(DB_KEYS.INCIDENTS);
    if (!stored) {
      // Initialize with seed data if empty
      const historical = CAMPUS_LOCATIONS.map((loc, i) => ({
        id: `seed-${i}`,
        type: "Surveillance Scan",
        description: `Baseline established at ${loc.name}.`,
        timestamp: new Date(Date.now() - Math.random() * 24 * 3600000),
        location: loc.coords as [number, number],
        locationName: loc.name,
        severity: Severity.LOW,
        analysis: "Initial system scan complete.",
        status: 'confirmed' as IncidentStatus
      }));
      await this.saveIncidents(historical);
      return historical;
    }
    return JSON.parse(stored).map((i: any) => ({
      ...i,
      timestamp: new Date(i.timestamp)
    }));
  }

  async saveIncidents(incidents: Incident[]): Promise<void> {
    await this.delay();
    localStorage.setItem(DB_KEYS.INCIDENTS, JSON.stringify(incidents));
  }

  async addIncident(incident: Incident): Promise<void> {
    const current = await this.getIncidents();
    current.unshift({ ...incident, status: incident.status || 'pending' });
    await this.saveIncidents(current);
  }

  async updateIncidentStatus(id: string, status: IncidentStatus): Promise<void> {
    const current = await this.getIncidents();
    const updated = current.map(i => i.id === id ? { ...i, status } : i);
    await this.saveIncidents(updated);
  }

  async deleteIncident(id: string): Promise<void> {
    const current = await this.getIncidents();
    const updated = current.filter(i => i.id !== id);
    await this.saveIncidents(updated);
  }

  async getEmergencyLogs(): Promise<EmergencyLog[]> {
    await this.delay();
    const stored = localStorage.getItem(DB_KEYS.EMERGENCY_LOGS);
    return stored ? JSON.parse(stored).map((l: any) => ({ ...l, timestamp: new Date(l.timestamp) })) : [];
  }

  async addEmergencyLog(log: EmergencyLog): Promise<void> {
    const current = await this.getEmergencyLogs();
    current.unshift(log);
    localStorage.setItem(DB_KEYS.EMERGENCY_LOGS, JSON.stringify(current));
    
    // Also promote the SOS to a Critical Incident automatically
    const incident: Incident = {
      id: `sos-${log.id}`,
      type: "SOS TRANSMISSION",
      description: log.message,
      timestamp: log.timestamp,
      location: log.location,
      locationName: log.building || "Unknown Building",
      severity: Severity.CRITICAL,
      analysis: "User-initiated emergency broadcast. Tactical response required.",
      status: 'pending'
    };
    await this.addIncident(incident);
  }
}

export const db = new MockNoSQL();
