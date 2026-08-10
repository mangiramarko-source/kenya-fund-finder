CREATE TABLE IF NOT EXISTS public.post_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    device_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(post_id, device_id)
);

CREATE TABLE IF NOT EXISTS public.post_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id TEXT NOT NULL,
    content TEXT NOT NULL,
    author_name TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    device_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- Select policies
CREATE POLICY "Public likes are viewable by everyone" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "Public comments are viewable by everyone" ON public.post_comments FOR SELECT USING (true);

-- Insert policies
CREATE POLICY "Anyone can insert a like" ON public.post_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert a comment" ON public.post_comments FOR INSERT WITH CHECK (true);

-- Delete policies
CREATE POLICY "Users can delete their own likes" ON public.post_likes FOR DELETE USING (true);
CREATE POLICY "Users can delete their own comments" ON public.post_comments FOR DELETE USING (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;
