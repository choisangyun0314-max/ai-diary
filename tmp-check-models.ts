import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = "AIzaSyBXV5tvdxmt9NQ6nYKSM22wRqY8w1MFjEM";
const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
  try {
    const models = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    // We can't actually list models easily with just the SDK without iterate through a list command which might not be in the base SDK helpers
    // But we can try a few.
    console.log("Checking gemini-1.5-flash...");
    const result = await models.generateContent("test");
    console.log("Success with gemini-1.5-flash");
  } catch (e) {
    console.error("Failed with gemini-1.5-flash:", e);
  }
}

listModels();
