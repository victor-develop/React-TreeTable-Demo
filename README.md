# Event-Sourced Tree Table with AI Agent

An advanced, high-performance Tree Table application built with React, featuring a robust event-sourced architecture and an integrated Gemini-powered Re-Act (Reasoning and Acting) Agent.

## 🚀 Features

### Core Table Capabilities
- **Hierarchical Data Management**: Infinite nesting support with smooth expand/collapse transitions.
- **Event-Sourced Architecture**: Every mutation (add, move, delete, update) is dispatched as a discrete event, enabling perfect undo/redo potential and a live event stream.
- **Dynamic Column Splitting**: Specialized column types like `single-select-split` and `multi-select-split` that expand into sub-columns for rapid data entry.
- **Drag-and-Drop**: Re-organize the hierarchy intuitively with real-time visual feedback for drop positions (before, after, or inside nodes).
- **Import/Export**: Full snapshot support via JSON for data portability.

### 🤖 AI Re-Act Agent
- **Iterative Reasoning**: Uses a multi-turn Re-Act loop to analyze the table state, decide on actions, and observe results.
- **Complex Orchestration**: Ask the agent to perform multi-step tasks like *"Find all tasks with a budget over 10k and move them under a new 'High Cost' folder"*.
- **Schema Management**: The agent can add, remove, or modify columns dynamically based on your natural language requests.
- **Tool-Calling Integration**: Uses the Gemini API's function-calling capabilities to interact directly with the application state.

## 🛠 Tech Stack
- **Framework**: React 19
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **AI Engine**: Google Gemini API (@google/genai)
- **Deployment**: Optimized for Vercel

## ⚙️ Getting Started

### Prerequisites
- Node.js (v18+)
- A Google Gemini API Key from [Google AI Studio](https://aistudio.google.com/)

### Environment Configuration
The application requires an environment variable for the Gemini API:
```env
API_KEY=your_gemini_api_key_here
```

## 📦 Deployment to Vercel

This project is ready for one-click deployment to Vercel.

1.  **Push to GitHub**: Push your local repository to a new GitHub repo.
2.  **Import to Vercel**: In your Vercel dashboard, click "Add New" -> "Project" and select your repository.
3.  **Set Environment Variables**:
    *   Navigate to **Settings** -> **Environment Variables**.
    *   Add a new key: `API_KEY`.
    *   Value: Your Google Gemini API Key.
4.  **Deploy**: Click "Deploy".

Vercel will automatically detect the build settings based on the `index.html` and `index.tsx` structure.

## 📁 Project Structure
- `/components`: UI components including the Tree Table, Cells, Rows, and AI Sidebar.
- `/utils`: Tree traversal and manipulation helpers.
- `types.ts`: Core type definitions for the event system and data model.
- `App.tsx`: Main application entry point and state orchestration.
- `index.html`: Base template with Tailwind and module imports.

---

Built with ❤️ by a Senior Frontend Engineer.