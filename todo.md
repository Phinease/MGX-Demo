# AI Agent Coding Platform - Development Todo

## Project Overview
Building an intelligent agent frontend coding platform with chat interface, code editor, and preview functionality.

## File Structure (Max 8 files)
1. **src/types/index.ts** - TypeScript type definitions for conversations, messages, tool calls, user data
2. **src/lib/mockData.ts** - Mock conversation data library with sample agent interactions
3. **src/lib/supabase.ts** - Supabase client configuration for authentication
4. **src/components/Navigation.tsx** - Top navigation bar with MGX logo and user account section
5. **src/components/ChatPanel.tsx** - Left panel chat interface with streaming, multi-turn conversations, tool calls display
6. **src/components/CodePanel.tsx** - Right panel with tab switcher for preview/editor modes
7. **src/components/AuthModal.tsx** - Login and registration modal dialogs
8. **src/App.tsx** - Main application component integrating all parts

## Implementation Plan
- Use shadcn-ui template as base
- Implement 3-column layout (navigation + chat + code panels)
- Add streaming message simulation
- Create mock data for agent conversations with tool calls
- Integrate Supabase auth (client-side only)
- Add syntax highlighting for code editor
- Implement tab switching between preview and editor views

## Dependencies to Add
- @supabase/supabase-js (for authentication)
- react-syntax-highlighter (for code highlighting)
- lucide-react (icons, likely already in template)

Test