import { openai as openaiProvider } from "@ai-sdk/openai";

export { openaiProvider as openai };

export const textModel = openaiProvider("gpt-4o-mini");
export const imageModel = openaiProvider("dall-e-3");
export const audioModel = openaiProvider("whisper-1");

export * from "ai";
export * from "./lib";
