-- ============================================
-- FIX: chaves estrangeiras ausentes + discipleship_meetings
-- Rodar no Supabase Dashboard > SQL Editor
-- ============================================

-- 1) Limpar linhas órfãs (referenciam usuários que não existem mais)
--    para que as FKs possam ser criadas sem violação
DELETE FROM discipleship_connections WHERE leader_id NOT IN (SELECT id FROM profiles) OR disciple_id NOT IN (SELECT id FROM profiles);
DELETE FROM discipleship_invites     WHERE leader_id NOT IN (SELECT id FROM profiles);
DELETE FROM discipleship_tasks       WHERE leader_id NOT IN (SELECT id FROM profiles) OR disciple_id NOT IN (SELECT id FROM profiles);
DELETE FROM discipleship_notes       WHERE leader_id NOT IN (SELECT id FROM profiles) OR disciple_id NOT IN (SELECT id FROM profiles) OR author_id NOT IN (SELECT id FROM profiles);
DELETE FROM discipleship_groups      WHERE leader_id NOT IN (SELECT id FROM profiles);
DELETE FROM discipleship_group_members WHERE user_id NOT IN (SELECT id FROM profiles);
DELETE FROM chat_clear_history       WHERE user_id NOT IN (SELECT id FROM profiles);
DELETE FROM reading_progress         WHERE user_id NOT IN (SELECT id FROM profiles);
DELETE FROM devotionals              WHERE creator_id NOT IN (SELECT id FROM profiles);

-- 2) Adicionar as FKs ausentes (idempotente)
DO $$
BEGIN
  -- discipleship_connections
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'discipleship_connections_leader_id_fkey') THEN
    ALTER TABLE discipleship_connections ADD CONSTRAINT discipleship_connections_leader_id_fkey FOREIGN KEY (leader_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'discipleship_connections_disciple_id_fkey') THEN
    ALTER TABLE discipleship_connections ADD CONSTRAINT discipleship_connections_disciple_id_fkey FOREIGN KEY (disciple_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  -- discipleship_invites
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'discipleship_invites_leader_id_fkey') THEN
    ALTER TABLE discipleship_invites ADD CONSTRAINT discipleship_invites_leader_id_fkey FOREIGN KEY (leader_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  -- discipleship_tasks
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'discipleship_tasks_leader_id_fkey') THEN
    ALTER TABLE discipleship_tasks ADD CONSTRAINT discipleship_tasks_leader_id_fkey FOREIGN KEY (leader_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'discipleship_tasks_disciple_id_fkey') THEN
    ALTER TABLE discipleship_tasks ADD CONSTRAINT discipleship_tasks_disciple_id_fkey FOREIGN KEY (disciple_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  -- discipleship_notes
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'discipleship_notes_leader_id_fkey') THEN
    ALTER TABLE discipleship_notes ADD CONSTRAINT discipleship_notes_leader_id_fkey FOREIGN KEY (leader_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'discipleship_notes_disciple_id_fkey') THEN
    ALTER TABLE discipleship_notes ADD CONSTRAINT discipleship_notes_disciple_id_fkey FOREIGN KEY (disciple_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'discipleship_notes_author_id_fkey') THEN
    ALTER TABLE discipleship_notes ADD CONSTRAINT discipleship_notes_author_id_fkey FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  -- discipleship_groups
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'discipleship_groups_leader_id_fkey') THEN
    ALTER TABLE discipleship_groups ADD CONSTRAINT discipleship_groups_leader_id_fkey FOREIGN KEY (leader_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  -- discipleship_group_members
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'discipleship_group_members_user_id_fkey') THEN
    ALTER TABLE discipleship_group_members ADD CONSTRAINT discipleship_group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  -- chat_clear_history
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_clear_history_user_id_fkey') THEN
    ALTER TABLE chat_clear_history ADD CONSTRAINT chat_clear_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  -- reading_progress
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reading_progress_user_id_fkey') THEN
    ALTER TABLE reading_progress ADD CONSTRAINT reading_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  -- devotionals
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'devotionals_creator_id_fkey') THEN
    ALTER TABLE devotionals ADD CONSTRAINT devotionals_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3) Criar discipleship_meetings (tabela ausente)
CREATE TABLE IF NOT EXISTS discipleship_meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES discipleship_groups(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE discipleship_meetings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'discipleship_meetings' AND policyname = 'Members can view meetings') THEN
    CREATE POLICY "Members can view meetings" ON discipleship_meetings FOR SELECT
      USING (
        group_id IN (SELECT group_id FROM discipleship_group_members WHERE user_id = auth.uid())
        OR group_id IN (SELECT id FROM discipleship_groups WHERE leader_id = auth.uid())
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'discipleship_meetings' AND policyname = 'Members can create meetings') THEN
    CREATE POLICY "Members can create meetings" ON discipleship_meetings FOR INSERT
      WITH CHECK (
        group_id IN (SELECT group_id FROM discipleship_group_members WHERE user_id = auth.uid())
        OR group_id IN (SELECT id FROM discipleship_groups WHERE leader_id = auth.uid())
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'discipleship_meetings' AND policyname = 'Creators can update meetings') THEN
    CREATE POLICY "Creators can update meetings" ON discipleship_meetings FOR UPDATE
      USING (auth.uid() = creator_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'discipleship_meetings' AND policyname = 'Creators can delete meetings') THEN
    CREATE POLICY "Creators can delete meetings" ON discipleship_meetings FOR DELETE
      USING (auth.uid() = creator_id);
  END IF;
END $$;

-- 4) Recarregar o cache de schema do PostgREST
NOTIFY pgrst, 'reload schema';
