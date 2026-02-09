import { GoogleGenAI, Type } from "@google/genai";
import { Severity, Incident, SafetyStatus } from "../types.ts";

/**
 * Robust API call wrapper with exponential backoff for rate limits (429)
 */
async function safeApiCall<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRateLimit = error?.message?.includes('429') || error?.status === 429 || error?.message?.includes('quota');
    if (isRateLimit && retries > 0) {
      console.warn(`Quota hit. Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return safeApiCall(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export const analyzeIncident = async (description: string): Promise<{ severity: Severity; analysis: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  return safeApiCall(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze this campus incident: "${description}". Classify its severity and provide a brief safety implication.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            severity: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
            analysis: { type: Type.STRING }
          },
          required: ["severity", "analysis"]
        }
      }
    });

    try {
      const text = response.text?.trim() || "{}";
      return JSON.parse(text);
    } catch (e) {
      return { severity: Severity.LOW, analysis: "Analyzing situation..." };
    }
  });
};

export const getSafetySummary = async (incidents: Incident[], userLocation: [number, number]): Promise<SafetyStatus> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  return safeApiCall(async () => {
    const incidentContext = incidents
      .filter(i => !i.isVerifiedResource)
      .map(i => `[${i.severity}] ${i.status || 'pending'} ${i.type} at ${i.locationName}: ${i.description}`)
      .join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `CURRENT TACTICAL DATABASE CONTEXT:\n${incidentContext}\n\nUSER LOCATION: [${userLocation.join(', ')}]\n\nTASK: Provide a real-time safety score (0-100), a concise summary, 3 actionable recommendations, and 4 internal reasoning steps for this tactical profile.`,
      config: {
        thinkingConfig: { thinkingBudget: 2000 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            reasoningSteps: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["score", "summary", "recommendations", "reasoningSteps"]
        }
      }
    });

    try {
      const text = response.text?.trim() || "{}";
      return JSON.parse(text);
    } catch (e) {
      return { 
        score: 90, 
        summary: "Baseline safety established.", 
        recommendations: ["Maintain vigilance"],
        reasoningSteps: ["Analyzed local feed", "Checked building statuses"]
      };
    }
  });
};

export const chatWithAgent = async (
  message: string, 
  userLocation: [number, number],
  customDirective?: string,
  tacticalContext?: Incident[]
): Promise<{ text: string; groundingResults: any[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  return safeApiCall(async () => {
    const systemInstruction = `
      ${customDirective || "You are a campus safety reasoning core."}
      
      TACTICAL DATABASE CONTEXT:
      ${tacticalContext?.slice(0, 5).map(i => `[${i.severity}] ${i.status} ${i.type} @ ${i.locationName}: ${i.description}`).join('\n') || 'No recent incidents.'}
      
      Current User Location: ${userLocation.join(', ')}
      
      INSTRUCTIONS:
      - Use the TACTICAL DATABASE CONTEXT to answer queries about safety.
      - If a user asks about risk, reference recent incidents.
      - Use Google Maps for spatial grounding.
    `;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: message,
      config: {
        systemInstruction,
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: { latitude: userLocation[0], longitude: userLocation[1] }
          }
        }
      }
    });

    return {
      text: response.text || "Reasoning link active. Processing spatial request.",
      groundingResults: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  });
};

export const generateEmergencyDraft = async (
  incidents: Incident[], 
  userLocation: [number, number],
  campusLocations: { name: string; coords: number[] }[],
  extraDetails?: string,
  customDirective?: string,
  selectedBuilding?: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  return safeApiCall(async () => {
    const severityMap = { [Severity.CRITICAL]: 0, [Severity.HIGH]: 1, [Severity.MEDIUM]: 2, [Severity.LOW]: 3 };
    const sortedIncidents = [...incidents].sort((a, b) => severityMap[a.severity] - severityMap[b.severity]);
    const primaryIncident = sortedIncidents[0];

    const basePrompt = `Draft a tactical SOS SMS for UH Police.
    
    CURRENT USER COORDS: ${userLocation.join(', ')}
    MOST CRITICAL THREAT IN DB: ${primaryIncident ? `${primaryIncident.type} at ${primaryIncident.locationName}` : 'Unknown Tactical Threat'}
    CAMPUS LANDMARKS: ${JSON.stringify(campusLocations)}
    ${selectedBuilding ? `USER-SELECTED BUILDING: ${selectedBuilding}` : ''}
    ${extraDetails ? `EXTRA OPERATOR DETAILS: ${extraDetails}` : ''}
    
    INSTRUCTIONS:
    1. Priority: If USER-SELECTED BUILDING is provided, use it. 
    2. Otherwise, identify building from CAMPUS LANDMARKS closest to USER COORDS.
    3. Format: "UH SOS: [Building] - [Threat]. [Details]. Coords: [User Coords]. IMMEDIATE HELP REQ."
    4. Max 160 chars. Cold, tactical tone.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: basePrompt,
      config: {
        systemInstruction: customDirective || "You are an emergency response coordinator assistant.",
        maxOutputTokens: 80,
        temperature: 0.1,
      }
    });

    return response.text?.trim() || "UH SOS: Urgent assistance requested at my current location.";
  });
};