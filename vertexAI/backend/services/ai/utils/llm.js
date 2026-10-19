import { ChatOpenRouter } from "@langchain/openrouter";

const rawKeys = process.env.OPENROUTER_API_KEYS
    ? process.env.OPENROUTER_API_KEYS.split(",").map(k => k.trim()).filter(Boolean)
    : [process.env.OPENROUTER_API_KEY].filter(Boolean);

export const apiKeys = rawKeys.length > 0 ? rawKeys : [process.env.OPENROUTER_API_KEY].filter(Boolean);

let keyCounter = 0;

export const getNextApiKey = () => {
    if (apiKeys.length === 0) return process.env.OPENROUTER_API_KEY;
    const key = apiKeys[keyCounter % apiKeys.length];
    keyCounter = (keyCounter + 1) % apiKeys.length;
    return key;
};

export const createLlmInstance = (apiKey, model = "minimax/minimax-m3.1-flash:free", maxTokens = 1024) => {
    const key = apiKey || getNextApiKey();
    return new ChatOpenRouter({
        model,
        temperature: 0,
        maxTokens,
        apiKey: key,
        openRouterApiKey: key,
    });
};

const llm = createLlmInstance(apiKeys[0]);

export default llm;
