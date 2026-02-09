
export enum Severity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum ViewType {
  DASHBOARD = 'DASHBOARD',
  AGENT = 'AGENT',
  VOICE = 'VOICE',
  MAP = 'MAP',
  FEED = 'FEED',
  COMMAND = 'COMMAND',
  RECORDS = 'RECORDS'
}

export enum AgentSpecialty {
  INCIDENTS = 'INCIDENTS',
  LOCATIONS = 'LOCATIONS',
  COMMUNICATIONS = 'COMMUNICATIONS'
}

export interface Agent {
  id: string;
  name: string;
  objective: string;
  specialty: AgentSpecialty;
  icon: string;
  status: 'active' | 'scanning' | 'alert';
  lastInsight: string;
  deployTime: Date;
}

export type IncidentStatus = 'pending' | 'confirmed' | 'resolved';

export interface Incident {
  id: string;
  type: string;
  description: string;
  timestamp: Date;
  location: [number, number]; 
  severity: Severity;
  analysis?: string;
  locationName: string;
  isVerifiedResource?: boolean;
  uri?: string;
  status?: IncidentStatus;
}

export interface EmergencyLog {
  id: string;
  timestamp: Date;
  message: string;
  location: [number, number];
  building?: string;
  operatorDetails?: string;
}

export interface SafetyStatus {
  score: number;
  summary: string;
  recommendations: string[];
  reasoningSteps: string[];
}

export interface ChatMessage {
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
  groundingLinks?: { title: string; uri: string }[];
}
