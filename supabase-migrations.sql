-- ============================================
-- Metanoia App - Supabase Migrations
-- Execute este arquivo no SQL Editor do Supabase
-- ============================================

-- 1. Adicionar colunas na tabela profiles
-- ============================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member'
  CHECK (role IN ('leader', 'member'));

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- 2. Criar tabela events
-- ============================================
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. RLS para events
-- ============================================
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view events"
  ON events FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert events"
  ON events FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can delete own events"
  ON events FOR DELETE
  USING (auth.uid() = author_id);

ALTER PUBLICATION supabase_realtime ADD TABLE events;

-- 4. Criar tabela devotionals (atualizada)
-- ============================================
CREATE TABLE IF NOT EXISTS devotionals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  book TEXT,
  theme TEXT,
  is_group BOOLEAN DEFAULT false,
  duration_days INTEGER DEFAULT 1,
  daily_readings JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Adicionar colunas na tabela devotionals se não existirem
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='devotionals' AND column_name='duration_days') THEN
    ALTER TABLE devotionals ADD COLUMN duration_days INTEGER DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='devotionals' AND column_name='daily_readings') THEN
    ALTER TABLE devotionals ADD COLUMN daily_readings JSONB;
  END IF;
END $$;

-- 5. Criar tabela devotional_invites
-- ============================================
CREATE TABLE IF NOT EXISTS devotional_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  devotional_id UUID REFERENCES devotionals(id) ON DELETE CASCADE,
  inviter_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  invitee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. RLS para devotionals
-- ============================================
ALTER TABLE devotionals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own devotionals and group ones"
  ON devotionals FOR SELECT
  USING (
    auth.uid() = creator_id
    OR is_group = true
  );

CREATE POLICY "Authenticated users can insert devotionals"
  ON devotionals FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can delete own devotionals"
  ON devotionals FOR DELETE
  USING (auth.uid() = creator_id);

CREATE POLICY "Creators can update own devotionals"
  ON devotionals FOR UPDATE
  USING (auth.uid() = creator_id);

-- 7. RLS para devotional_invites
-- ============================================
ALTER TABLE devotional_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invites they sent or received"
  ON devotional_invites FOR SELECT
  USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

CREATE POLICY "Inviters can insert invites"
  ON devotional_invites FOR INSERT
  WITH CHECK (auth.uid() = inviter_id);

CREATE POLICY "Invitees can update their invite status"
  ON devotional_invites FOR UPDATE
  USING (auth.uid() = invitee_id);

CREATE POLICY "Inviters can delete pending invites"
  ON devotional_invites FOR DELETE
  USING (auth.uid() = inviter_id);

-- 8. Criar tabela devotional_groups
-- ============================================
CREATE TABLE IF NOT EXISTS devotional_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  devotional_id UUID REFERENCES devotionals(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE devotional_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view groups"
  ON devotional_groups FOR SELECT
  USING (
    auth.uid() = creator_id
    OR devotional_id IN (
      SELECT devotional_id FROM devotional_invites
      WHERE invitee_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "Creators can insert groups"
  ON devotional_groups FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update own groups"
  ON devotional_groups FOR UPDATE
  USING (auth.uid() = creator_id);

-- 9. Criar tabela devotional_messages (chat)
-- ============================================
CREATE TABLE IF NOT EXISTS devotional_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES devotional_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE devotional_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view messages"
  ON devotional_messages FOR SELECT
  USING (
    group_id IN (
      SELECT dg.id FROM devotional_groups dg
      WHERE dg.creator_id = auth.uid()
      OR dg.devotional_id IN (
        SELECT devotional_id FROM devotional_invites
        WHERE invitee_id = auth.uid() AND status = 'accepted'
      )
    )
  );

CREATE POLICY "Members can insert messages"
  ON devotional_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND group_id IN (
      SELECT dg.id FROM devotional_groups dg
      WHERE dg.creator_id = auth.uid()
      OR dg.devotional_id IN (
        SELECT devotional_id FROM devotional_invites
        WHERE invitee_id = auth.uid() AND status = 'accepted'
      )
    )
  );

-- 10. Habilitar realtime para chat
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE devotional_messages;

-- 11. Criar storage bucket para fotos de grupo
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('devotional-photos', 'devotional-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view devotional photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'devotional-photos');

CREATE POLICY "Authenticated users can upload devotional photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'devotional-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own devotional photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'devotional-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own devotional photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'devotional-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 12. Storage bucket para banners (2048x1152)
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('banners', 'banners', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view banners"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'banners');

CREATE POLICY "Authenticated users can upload banners"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'banners' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own banners"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'banners' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own banners"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'banners' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 13. Storage bucket para avatares
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own avatars"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own avatars"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
