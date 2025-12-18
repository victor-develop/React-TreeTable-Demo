# AI-Assisted Development & Deployment

This project represents a cutting-edge fusion of **Event-Sourced UI Architecture** and **Large Language Model (LLM) Orchestration**. It was designed and refined to showcase how modern web applications can be both human-usable and agent-controllable.

## 🛠 Developed in Google AI Studio

The majority of this application's logic, particularly the **Re-Act (Reasoning and Acting) Agent** loop, was developed and tested within **Google AI Studio**. 

### Why Google AI Studio?
- **Rapid Prototyping**: Leveraging the latest Gemini models (like `gemini-3-pro-preview`) allowed for immediate testing of function-calling schemas.
- **Context Injection**: The project's structure was iterated upon by providing the model with the full technical specification of the event-sourced tree, ensuring the AI agent understood exactly how to manipulate the DOM through the provided `TreeTableRef`.
- **System Instruction Tuning**: The specific personality and constraints of the "Table Manager Agent" were fine-tuned using the system instruction interface to ensure stable, multi-step reasoning.

## 🚀 Production-Ready for Vercel

While the core intelligence was born in a prompt-based environment, the architecture is strictly engineered for **Production Deployment on Vercel**.

### Deployment Architecture
- **Vite Bundling**: The project uses Vite to transpile TypeScript and JSX into highly optimized ESM bundles.
- **Tailwind CSS**: Utility-first styling ensures zero-runtime CSS overhead and perfect responsiveness across devices.
- **Environment Security**: The application is configured to pull the `API_KEY` from `process.env`. When deploying to Vercel, simply add your Gemini API Key as an Environment Variable in the Vercel Dashboard.
- **Edge Compatibility**: The use of `@google/genai` ensures that the AI interactions are handled efficiently using standard Fetch/Websocket protocols compatible with Vercel's global edge network.

## 🧠 The Re-Act Loop
The agent in this project doesn't just "chat"—it **reasons**. By using a manual history management system, we avoid common session errors and allow the agent to:
1. **Thought**: Analyze the user's natural language request.
2. **Action**: Call `getTableSnapshot()` to see the current nodes.
3. **Observation**: Read the result.
4. **Action**: Execute specific mutations (like `moveNode` or `addColumn`).
5. **Final Response**: Confirm the task is complete to the user.

---
*Developed by a Senior Frontend Engineer exploring the boundaries of AI-native software.*