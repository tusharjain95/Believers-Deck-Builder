import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT) || 3000;

// Body parser with 50mb limit for screenshots/PDFs
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize GoogleGenAI SDK with required telemetry User-Agent
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export interface TargetFieldDef {
  key: string;
  name: string;
  group: string;
  formats: string[];
}

export interface SmartEntryRequestBody {
  pastedText?: string;
  files?: Array<{
    name: string;
    mimeType: string;
    dataBase64: string; // Base64 data without data: URL prefix
  }>;
  targetFields: TargetFieldDef[];
  hasVacantList?: boolean;
}

// Smart Entry API endpoint
app.post('/api/smart-entry', async (req, res) => {
  try {
    const { pastedText, files = [], targetFields = [], hasVacantList = true } = req.body as SmartEntryRequestBody;

    if (!pastedText?.trim() && files.length === 0) {
      return res.status(400).json({ error: 'Please provide pasted text, a screenshot, or a PDF report to extract.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured in the server environment.' });
    }

    // Build JSON Schema properties for Gemini
    const properties: Record<string, any> = {};

    for (const field of targetFields) {
      properties[field.key] = {
        type: Type.OBJECT,
        description: `Extracted numeric value and source snippet for ${field.name} (${field.key}). Null if not explicitly stated.`,
        properties: {
          value: {
            type: Type.STRING,
            description: `Extracted value or plain number in Indian rupees (e.g. "734492", "12000000", "85", "12"). Return "null" or empty string if not explicitly stated.`,
          },
          sourceSnippet: {
            type: Type.STRING,
            description: `Short exact text or label snippet from the source where this value was found. Return "null" or empty if not found.`,
          },
        },
      };
    }

    if (hasVacantList) {
      properties['#vacant'] = {
        type: Type.ARRAY,
        description: `List of open or vacant business categories explicitly mentioned for visitor invite/recruitment.`,
        items: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
              description: `Business category name (e.g. 'Chartered Accountant', 'Interior Designer', 'Caterer').`,
            },
            sourceSnippet: {
              type: Type.STRING,
              description: `Exact snippet where this vacant category was mentioned.`,
            },
          },
        },
      };
    }

    // Assemble multimodal parts
    const parts: any[] = [];

    // Attach any files (images or PDFs)
    for (const f of files) {
      if (f.dataBase64) {
        // Strip data: prefix if present
        let cleanBase64 = f.dataBase64;
        if (cleanBase64.includes('base64,')) {
          cleanBase64 = cleanBase64.split('base64,')[1];
        }
        parts.push({
          inlineData: {
            mimeType: f.mimeType || 'image/png',
            data: cleanBase64,
          },
        });
      }
    }

    // Build system instruction and user prompt
    const fieldDescriptions = targetFields.map(
      (f) => `- "${f.key}" (${f.name}, group: ${f.group})`
    ).join('\n');

    const promptText = `
You are an expert data extraction assistant for BNI (Business Network International) weekly chapter presentation decks.
Analyze the provided text, screenshots, and/or PDF reports (e.g., Vice President's WhatsApp weekly summary, BNI Connect PALMS report, chapter statistics).

EXTRACT THE FOLLOWING TARGET METRICS:
${fieldDescriptions}
${hasVacantList ? '- "#vacant": Any open/vacant business categories mentioned for visitor invitations.' : ''}

STRICT INSTRUCTIONS:
1. Extract ONLY values that are explicitly stated in the source text, screenshots, or documents.
2. If a value is NOT explicitly stated, set "value": null and "sourceSnippet": null.
3. NEVER guess, estimate, invent, or calculate unstated numbers.
4. For amounts in Indian Rupees (INR), extract the plain numeric value (e.g., "7.34 lakh" or "7.34L" = 734492 or 734000; "1.2 Cr" or "1.2 Crore" = 12000000; "50,000" = 50000).
5. For percentages (e.g., "85%"), extract the number (e.g., "85").
6. For each extracted value, provide the short "sourceSnippet" quoting the exact snippet or label from the source.
7. Return strictly valid JSON adhering to the provided responseSchema.

${pastedText?.trim() ? `PASTED TEXT CONTENT:\n\"\"\"\n${pastedText.trim()}\n\"\"\"` : ''}
`.trim();

    parts.push({ text: promptText });

    // Try calling Gemini with temperature 0 and responseSchema, with retry on transient 503/429
    const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest'];
    let lastError: any = null;
    let responseText = '';

    for (const modelName of candidateModels) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: { parts },
            config: {
              temperature: 0,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties,
              },
            },
          });
          responseText = response.text?.trim() || '{}';
          lastError = null;
          break;
        } catch (err: any) {
          lastError = err;
          // If transient high demand error, wait briefly before next attempt
          const msg = String(err?.message || '');
          if (msg.includes('503') || msg.includes('high demand') || msg.includes('429')) {
            await new Promise((r) => setTimeout(r, 1200));
            continue;
          }
          break; // Non-transient error, move to next model
        }
      }
      if (!lastError) break;
    }

    if (lastError) {
      throw lastError;
    }

    let parsedJson: Record<string, any> = {};

    try {
      parsedJson = JSON.parse(responseText);
    } catch (parseErr) {
      console.error('Failed to parse Gemini response as JSON:', responseText);
      return res.status(500).json({
        error: 'Gemini returned an invalid response structure. Please try again.',
        raw: responseText,
      });
    }

    return res.json({
      success: true,
      extracted: parsedJson,
    });
  } catch (err: any) {
    console.error('Smart Entry Gemini extraction error:', err);
    let userMsg = 'Failed to extract data using Gemini AI. Please try again.';
    try {
      if (err?.message) {
        if (err.message.startsWith('{')) {
          const parsedErr = JSON.parse(err.message);
          userMsg = parsedErr?.error?.message || err.message;
        } else {
          userMsg = err.message;
        }
      }
    } catch {
      userMsg = err?.message || userMsg;
    }

    return res.status(500).json({
      error: userMsg,
    });
  }
});

// Vite middleware for development or static serving for production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
} else {
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${port}`);
});
