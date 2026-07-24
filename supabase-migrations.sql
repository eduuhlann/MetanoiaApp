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

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS birth_date DATE;

-- 1.1 RLS para profiles (permitir leitura de todos os perfis)
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can view all profiles' AND tablename = 'profiles'
  ) THEN
    CREATE POLICY "Authenticated users can view all profiles"
      ON profiles FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile' AND tablename = 'profiles'
  ) THEN
    CREATE POLICY "Users can update own profile"
      ON profiles FOR UPDATE
      USING (auth.uid() = id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own profile' AND tablename = 'profiles'
  ) THEN
    CREATE POLICY "Users can insert own profile"
      ON profiles FOR INSERT
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

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

-- ============================================
-- 14. Discipleship Tables
-- ============================================

-- 14.1 discipleship_connections
CREATE TABLE IF NOT EXISTS discipleship_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  leader_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  disciple_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(leader_id, disciple_id)
);

ALTER TABLE discipleship_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their connections"
  ON discipleship_connections FOR SELECT
  USING (auth.uid() = leader_id OR auth.uid() = disciple_id);

CREATE POLICY "Users can create connections"
  ON discipleship_connections FOR INSERT
  WITH CHECK (auth.uid() = leader_id OR auth.uid() = disciple_id);

CREATE POLICY "Users can update their connections"
  ON discipleship_connections FOR UPDATE
  USING (auth.uid() = leader_id OR auth.uid() = disciple_id);

-- 14.2 discipleship_invites
CREATE TABLE IF NOT EXISTS discipleship_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  leader_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE discipleship_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read invite codes"
  ON discipleship_invites FOR SELECT
  USING (true);

CREATE POLICY "Leaders can manage their invites"
  ON discipleship_invites FOR INSERT
  WITH CHECK (auth.uid() = leader_id);

CREATE POLICY "Leaders can update their invites"
  ON discipleship_invites FOR UPDATE
  USING (auth.uid() = leader_id);

CREATE POLICY "Leaders can delete their invites"
  ON discipleship_invites FOR DELETE
  USING (auth.uid() = leader_id);

-- 14.3 discipleship_tasks
CREATE TABLE IF NOT EXISTS discipleship_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  leader_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  disciple_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'other' CHECK (type IN ('chapter', 'plan', 'reading', 'other')),
  target_id TEXT,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE discipleship_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tasks"
  ON discipleship_tasks FOR SELECT
  USING (auth.uid() = leader_id OR auth.uid() = disciple_id);

CREATE POLICY "Leaders can create tasks"
  ON discipleship_tasks FOR INSERT
  WITH CHECK (auth.uid() = leader_id);

CREATE POLICY "Users can update their tasks"
  ON discipleship_tasks FOR UPDATE
  USING (auth.uid() = leader_id OR auth.uid() = disciple_id);

-- 14.4 discipleship_notes
CREATE TABLE IF NOT EXISTS discipleship_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  leader_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  disciple_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  group_id UUID,
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

ALTER TABLE discipleship_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view notes they are involved in"
  ON discipleship_notes FOR SELECT
  USING (
    auth.uid() = leader_id
    OR auth.uid() = disciple_id
    OR auth.uid() = author_id
  );

CREATE POLICY "Users can insert notes"
  ON discipleship_notes FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their notes"
  ON discipleship_notes FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their notes"
  ON discipleship_notes FOR DELETE
  USING (auth.uid() = author_id);

ALTER PUBLICATION supabase_realtime ADD TABLE discipleship_notes;

-- 14.5 discipleship_groups
CREATE TABLE IF NOT EXISTS discipleship_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  leader_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE discipleship_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view groups"
  ON discipleship_groups FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create groups"
  ON discipleship_groups FOR INSERT
  WITH CHECK (auth.uid() = leader_id);

CREATE POLICY "Leaders can update their groups"
  ON discipleship_groups FOR UPDATE
  USING (auth.uid() = leader_id);

CREATE POLICY "Leaders can delete their groups"
  ON discipleship_groups FOR DELETE
  USING (auth.uid() = leader_id);

-- 14.6 discipleship_group_members
CREATE TABLE IF NOT EXISTS discipleship_group_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES discipleship_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'pending')),
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE discipleship_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view group members"
  ON discipleship_group_members FOR SELECT
  USING (true);

CREATE POLICY "Users can join groups themselves"
  ON discipleship_group_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Leaders can invite members to their groups"
  ON discipleship_group_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM discipleship_groups
      WHERE discipleship_groups.id = group_id
      AND discipleship_groups.leader_id = auth.uid()
    )
  );

CREATE POLICY "Members can update their status"
  ON discipleship_group_members FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Members can leave groups"
  ON discipleship_group_members FOR DELETE
  USING (auth.uid() = user_id);

-- 14.7 chat_clear_history
CREATE TABLE IF NOT EXISTS chat_clear_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  group_id UUID,
  partner_id UUID,
  cleared_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE chat_clear_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their clear history"
  ON chat_clear_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert clear history"
  ON chat_clear_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their clear history"
  ON chat_clear_history FOR DELETE
  USING (auth.uid() = user_id);

-- 14.8 reading_progress
CREATE TABLE IF NOT EXISTS reading_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  book_abbrev TEXT NOT NULL,
  chapter_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, book_abbrev, chapter_number)
);

ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reading progress"
  ON reading_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reading progress"
  ON reading_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reading progress"
  ON reading_progress FOR DELETE
  USING (auth.uid() = user_id);

-- 14.9 Storage bucket for discipleship files
INSERT INTO storage.buckets (id, name, public) VALUES ('discipleship_files', 'discipleship_files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view discipleship files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'discipleship_files');

CREATE POLICY "Authenticated users can upload discipleship files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'discipleship_files' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own discipleship files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'discipleship_files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own discipleship files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'discipleship_files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 15.1 Add updated_at to discipleship_notes (run if table already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'discipleship_notes' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE discipleship_notes ADD COLUMN updated_at TIMESTAMPTZ;
  END IF;
END $$;

-- ============================================
-- 16. Event Photos
-- ============================================
CREATE TABLE IF NOT EXISTS event_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE event_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view event photos"
  ON event_photos FOR SELECT USING (true);

CREATE POLICY "Authenticated users can upload event photos"
  ON event_photos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own event photos"
  ON event_photos FOR DELETE
  USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE event_photos;

INSERT INTO storage.buckets (id, name, public) VALUES ('event-photos', 'event-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view event photos storage"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-photos');

CREATE POLICY "Authenticated users can upload event photos storage"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'event-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete own event photos storage"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'event-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- 17. Devotional scheduled_for + Journal
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'devotionals' AND column_name = 'scheduled_for'
  ) THEN
    ALTER TABLE devotionals ADD COLUMN scheduled_for TIMESTAMPTZ;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS devotional_journal (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  devotional_id UUID REFERENCES devotionals(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  reflection TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, devotional_id, day_number)
);

ALTER TABLE devotional_journal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own journal entries"
  ON devotional_journal FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own journal entries"
  ON devotional_journal FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journal entries"
  ON devotional_journal FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own journal entries"
  ON devotional_journal FOR DELETE
  USING (auth.uid() = user_id);

