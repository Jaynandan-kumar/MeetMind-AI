import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages"
import { fileTools } from "./tools.js"
import llm, { apiKeys, createLlmInstance } from "../utils/llm.js"
import { MessagesAnnotation, StateGraph } from "@langchain/langgraph"
import { ToolNode } from "@langchain/langgraph/prebuilt"

const system_prompt = `You are an expert coding agent inside a Cursor-like IDE.

CRITICAL RULES:
1. GREETINGS & CASUAL MESSAGES:
   - If the user sends a greeting (e.g. "hello", "hi", "hey"), asks a general question, or hasn't requested any file/code changes:
     DO NOT CALL ANY TOOLS! DO NOT CREATE OR MODIFY FILES!
     Simply respond politely in chat text (e.g. "Hello! How can I help you with your project today?").

2. EXISTING PROJECTS:
   - NEVER overwrite or rebuild an existing project from scratch unless the user explicitly asks to recreate or convert it.
   - If the project already has files, preserve them and only modify or add the specific files the user requests.

3. WHEN TO USE TOOLS:
   - Call filesystem tools ONLY when the user explicitly asks to create, modify, delete, or build something.
   - Use get_tree when the project structure is unknown to discover file/folder IDs.
   - type="folder" is a folder; type="file" is a file. NEVER call get_file with a folder ID.
   - Call get_file to read existing files before modifying them with update_file.
   - Use create_folder for new directories. Create parent directories before files inside them.
   - Use create_file for new files with name, parentId (folder ID or null for root), and full content.
   - Use update_file to modify an existing file's full content by fileId.
   - Use delete_file by fileId when deletion is explicitly requested.
   - Use update_project_description to update the project description shown on the dashboard card.

4. UI QUALITY:
   - Build modern, clean, responsive UI with professional styling. Use Unsplash URLs for images when needed.`

const max_messages = 12

const getRecentMessages = (
    messages = []
) => {
    if (messages.length <= max_messages) {
        return messages
    }

    const firstUserMessage = messages.find((message) => HumanMessage.isInstance(message))
    const recents = messages.slice(-max_messages)
    if (firstUserMessage && !recents.includes(firstUserMessage)) {
        return [
            firstUserMessage, ...recents
        ]
    }
    return recents
}

export const graph = ({
    projectId, userId
}) => {
    const tools = fileTools({ projectId, userId })

    // Robust Multi-tier candidate configs:
    // 1. minimax/minimax-m3.1-flash:free (100% Free, 1M context, no credit limit, 1024 tokens)
    // 2. nvidia/nemotron-3-super-120b-a12b:free (100% Free backup)
    // 3. openai/gpt-4o-mini (Paid ultra-fast smart fallback)
    // 4. deepseek/deepseek-chat (Paid fallback)
    const candidateConfigs = [
        ...apiKeys.map(k => ({ key: k, model: "minimax/minimax-m3.1-flash:free", maxTokens: 1024 })),
        ...apiKeys.map(k => ({ key: k, model: "nvidia/nemotron-3-super-120b-a12b:free", maxTokens: 1024 })),
        ...apiKeys.map(k => ({ key: k, model: "openai/gpt-4o-mini", maxTokens: 250 })),
        ...apiKeys.map(k => ({ key: k, model: "deepseek/deepseek-chat", maxTokens: 200 })),
    ]

    const models = candidateConfigs.length > 0
        ? candidateConfigs.map(c => ({
            name: `${c.model} (${c.key.slice(0, 14)}...)`,
            instance: createLlmInstance(c.key, c.model, c.maxTokens).bindTools(tools)
        }))
        : [{ name: "default", instance: llm.bindTools(tools) }]

    let activeKeyIndex = 0

    const agent = async (state) => {
        const allMessages = state.messages || []
        const recentMessages = getRecentMessages(allMessages)
        const messages = [
            new SystemMessage(system_prompt),
            ...recentMessages
        ]

        let response = null
        const totalAttempts = Math.max(models.length, 4)
        let delay = 1000

        for (let attempt = 1; attempt <= totalAttempts; attempt++) {
            const currentConfig = models[activeKeyIndex % models.length]
            const currentModel = currentConfig.instance

            try {
                console.log(`[AI Agent] Attempt ${attempt}/${totalAttempts} using ${currentConfig.name}...`)
                response = await currentModel.invoke(messages)
                activeKeyIndex = (activeKeyIndex + 1) % models.length
                break
            } catch (err) {
                console.warn(`[AI Agent] ${currentConfig.name} hit error: ${err?.message || err}. Failing over...`)
                activeKeyIndex = (activeKeyIndex + 1) % models.length

                const isRateOrFlightLimit =
                    err?.message?.includes("in_flight_budget_exhausted") ||
                    err?.statusCode === 402 ||
                    err?.statusCode === 429 ||
                    err?.code === 402 ||
                    err?.code === 429 ||
                    err?.message?.includes("rate limit")

                if (attempt < totalAttempts) {
                    const waitTime = isRateOrFlightLimit ? delay : 600
                    console.log(`[AI Agent] Waiting ${waitTime}ms before trying next model/key...`)
                    await new Promise(r => setTimeout(r, waitTime))
                    if (isRateOrFlightLimit) delay *= 1.5
                    continue
                }
                throw err
            }
        }

        console.log(response)

        return {
            messages: [
                response
            ]
        }
    }

    const toolNode = new ToolNode(tools)

    const shouldContinue = (state) => {
        const lastMessage = state.messages?.[state.messages.length - 1]
        if (lastMessage instanceof AIMessage && lastMessage.tool_calls?.length) {
            return "tools"
        } else {
            return "__end__"
        }
    }

    return new StateGraph(MessagesAnnotation)
        .addNode("agent", agent)
        .addNode("tools", toolNode)
        .addEdge("__start__", "agent")
        .addEdge("tools", "agent")
        .addConditionalEdges("agent", shouldContinue)
        .compile()
}
