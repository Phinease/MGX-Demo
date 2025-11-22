-- ============================================
-- MGX Demo - Supabase Database Updates
-- ============================================
-- This file contains SQL updates for conversation state persistence
-- Run these commands in your Supabase SQL Editor
-- ============================================

-- Create conversation_state table to persist workspace state
CREATE TABLE IF NOT EXISTS conversation_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    
    -- Project initialization state
    project_initialized BOOLEAN DEFAULT FALSE,
    project_path TEXT,
    project_name TEXT,
    
    -- Preview state
    preview_url TEXT,
    preview_process_id TEXT,
    preview_port INTEGER,
    preview_is_running BOOLEAN DEFAULT FALSE,
    
    -- Editor state
    editor_folder_path TEXT,
    editor_selected_file TEXT,
    
    -- Coding preview state (file being written)
    coding_file_path TEXT,
    coding_file_content TEXT,
    coding_is_active BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure one state per conversation
    CONSTRAINT unique_conversation_state UNIQUE (conversation_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversation_state_conversation_id ON conversation_state(conversation_id);

-- Enable Row Level Security
ALTER TABLE conversation_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversation_state
CREATE POLICY "Users can view state for their conversations"
    ON conversation_state FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = conversation_state.conversation_id
            AND conversations.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create state for their conversations"
    ON conversation_state FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = conversation_state.conversation_id
            AND conversations.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update state for their conversations"
    ON conversation_state FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = conversation_state.conversation_id
            AND conversations.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = conversation_state.conversation_id
            AND conversations.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete state for their conversations"
    ON conversation_state FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = conversation_state.conversation_id
            AND conversations.user_id = auth.uid()
        )
    );

-- Auto-update trigger for updated_at
CREATE TRIGGER update_conversation_state_updated_at
    BEFORE UPDATE ON conversation_state
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Verification Queries (Optional)
-- ============================================
-- Run these to verify the setup:
-- 
-- SELECT * FROM conversation_state;
-- 
-- Check if RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables 
-- WHERE schemaname = 'public' AND tablename = 'conversation_state';

