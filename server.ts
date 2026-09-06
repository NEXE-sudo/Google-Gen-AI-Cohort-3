import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, GenerateContentParameters } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const PORT = 3000;
const app = express();

// 1. Top-Level Request Deserialization (Ordering Guarantee)
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// 2. Lazy initialization for Gemini AI SDK
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return genAIClient;
}

// 3. Resilient Model Fallback Ladder
const MODEL_FALLBACK_LADDER = [
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.7-flash",
];

async function generateContentWithFallback(
  params: Omit<GenerateContentParameters, "model">
): Promise<{ text: string; modelUsed: string }> {
  const ai = getGenAI();
  let lastError: unknown = null;

  for (const modelName of MODEL_FALLBACK_LADDER) {
    try {
      const response = await ai.models.generateContent({
        ...params,
        model: modelName,
      });

      const responseText = response.text || "";
      if (responseText) {
        return { text: responseText, modelUsed: modelName };
      }
    } catch (err: any) {
      lastError = err;
      const statusCode = err?.status || err?.statusCode || 0;
      const errorMessage = String(err?.message || "");

      // Recoverable error checks (503, 429, 404, 500, or model-not-found)
      const isRecoverable =
        [404, 429, 500, 503].includes(statusCode) ||
        errorMessage.includes("404") ||
        errorMessage.includes("429") ||
        errorMessage.includes("503") ||
        errorMessage.includes("500") ||
        errorMessage.includes("not found") ||
        errorMessage.includes("RESOURCE_EXHAUSTED") ||
        errorMessage.includes("UNAVAILABLE");

      if (isRecoverable) {
        console.warn(`[Gemini Fallback] Model ${modelName} failed (${errorMessage}). Trying next in ladder...`);
        continue;
      }

      // If non-recoverable, throw immediately
      throw err;
    }
  }

  throw lastError || new Error("All models in the resilient fallback ladder failed.");
}

// 4. API Endpoints
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    hasApiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

app.post("/api/gemini/reflect", async (req: Request, res: Response) => {
  try {
    // Defensive Payload Ingestion (Null-Safe Destructuring)
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const category = typeof body.category === "string" ? body.category.trim() : "reflection";
    const action = typeof body.action === "string" ? body.action.trim() : "converse";
    const history = Array.isArray(body.history) ? body.history : [];

    if (!prompt && action !== "summarize") {
      res.status(400).json({ error: "A valid non-empty prompt or entry is required." });
      return;
    }

    if (prompt.length > 8000) {
      res.status(400).json({ error: "Reflection entry exceeds the maximum length of 8,000 characters." });
      return;
    }

    // Build system instruction tailored to action
    let systemInstruction = `You are an insightful, empathetic, and thoughtful reflection partner and journaling mentor powered by Gemini.
The user is journaling their personal thoughts, dilemmas, work reflections, or creative ideas.
Your tone should be warm, grounded, constructive, and perceptive.
Format your responses using clean Markdown with readable paragraphs, avoiding robotic boilerplate.`;

    if (action === "brainstorm") {
      systemInstruction += `\nThe user is requesting creative brainstorming and actionable perspectives.
Help expand on their ideas, explore alternative angles, identify potential blind spots, and propose 3-5 concrete next steps or questions to contemplate.`;
    } else if (action === "summarize") {
      systemInstruction += `\nThe user wants a structured summary of their reflection session so far.
Provide:
1. **Core Theme / Essence**: 1-2 concise sentences capturing the heart of the reflection.
2. **Key Insights**: 3-4 bullet points highlighting pivotal realizations or questions.
3. **Actionable Takeaway**: A clear takeaway or constructive inquiry to carry forward.`;
    } else {
      systemInstruction += `\nEngage in a multi-turn conversational reflection. Acknowledge what the user shared, offer a reflective mirror or psychological/philosophical reframing, and gently ask 1-2 open-ended follow-up questions to help deepen their clarity.`;
    }

    // Build contents combining conversation context
    const contents: Array<{ role?: string; parts: Array<{ text: string }> }> = [];

    // Include recent history (bounded up to 10 turns to preserve tokens)
    const recentHistory = history.slice(-10);
    for (const item of recentHistory) {
      if (item && typeof item === "object") {
        const role = item.sender === "user" ? "user" : "model";
        const text = typeof item.content === "string" ? item.content : "";
        if (text) {
          contents.push({
            role,
            parts: [{ text }],
          });
        }
      }
    }

    // Add current user prompt
    if (prompt) {
      contents.push({
        role: "user",
        parts: [
          {
            text: `[Category: ${category}]\n${prompt}`,
          },
        ],
      });
    } else if (action === "summarize") {
      contents.push({
        role: "user",
        parts: [
          {
            text: "Please synthesize and summarize our entire reflection so far into a structured executive takeaway.",
          },
        ],
      });
    }

    const result = await generateContentWithFallback({
      contents: contents as any,
      config: {
        systemInstruction,
        temperature: action === "brainstorm" ? 0.85 : 0.7,
      },
    });

    res.json({
      success: true,
      text: result.text,
      modelUsed: result.modelUsed,
      action,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[API Error] /api/gemini/reflect:", error);
    res.status(500).json({
      error: error?.message || "Failed to process reflection with Gemini AI.",
      details: process.env.NODE_ENV !== "production" ? String(error) : undefined,
    });
  }
});

// 5. Mount Vite middleware for development or Static server for production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
