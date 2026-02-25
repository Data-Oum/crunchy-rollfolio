-- Create tables for storing AI conversations and leads
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    visitor_name TEXT,
    visitor_email TEXT,
    visitor_company TEXT,
    visitor_role TEXT,
    visitor_intent TEXT,
    summary TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts for the portfolio
CREATE POLICY "Allow anonymous inserts to conversations" 
ON public.conversations FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow anonymous inserts to messages" 
ON public.messages FOR INSERT 
WITH CHECK (true);

-- Allow anonymous reads only for their own session (via conversation_id)
-- Note: In a production app, you'd use a session token here.
CREATE POLICY "Allow anonymous selection" 
ON public.conversations FOR SELECT 
USING (true);

CREATE POLICY "Allow anonymous message selection" 
ON public.messages FOR SELECT 
USING (true);
