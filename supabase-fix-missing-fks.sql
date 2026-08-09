-- ============================================
-- FIX: alinhar o schema antigo do banco com o schema que o app espera
-- Rodar no Supabase Dashboard > SQL Editor (uma única execução)
--
-- O banco tinha um schema antigo:
--   discipleship_groups  -> usava created_by / cover_url / reading (sem leader_id)
--   discipleship_group_members -> sem status / role / created_at
--   discipleship_meetings -> tabela inexistente
-- As FKs (relacionamentos) também estavam ausentes.
-- ============================================

-- ============================================
-- 1) discipleship_groups: adicionar colunas do schema novo
-- ============================================
ALTER TABLE discipleship_groups ADD COLUMN IF NOT EXISTS leader_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE discipleship_groups ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE discipleship_groups ADD COLUMN IF NOT EXISTS invite_code TEXT;
ALTER TABLE discipleship_groups ADD COLUMN IF NOT EXISTS invite_code_expires_at TIMESTAMPTZ;

-- Backfill a partir do schema antigo
UPDATE discipleship_groups SET created_by = NULL WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM profiles);
UPDATE discipleship_groups SET leader_id = created_by WHERE leader_id IS NULL AND created_by IS NOT NULL;
UPDATE discipleship_groups SET avatar_url = cover_url WHERE avatar_url IS NULL AND cover_url IS NOT NULL;

-- Índice único para o invite_code (códigos não podem repetir)
CREATE UNIQUE INDEX IF NOT EXISTS discipleship_groups_invite_code_key ON discipleship_groups (invite_code);

-- ============================================
-- 2) discipleship_group_members: adicionar colunas do schema novo
-- ============================================
ALTER TABLE discipleship_group_members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'pending'));
ALTER TABLE discipleship_group_members ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member'));
ALTER TABLE discipleship_group_members ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Membros que já existiam no schema antigo: nunca houve conceito de "pendente" => ativos
UPDATE discipleship_group_members SET status = 'active' WHERE status = 'pending';

-- Líder do grupo vira admin
UPDATE discipleship_group_members m SET role = 'admin'
FROM discipleship_groups g
WHERE g.id = m.group_id AND m.user_id = g.leader_id;

-- ============================================
-- 3) Limpar linhas órfãs (referenciam usuários/grupos que não existem)
-- ============================================
DELETE FROM discipleship_connections WHERE leader_id NOT IN (SELECT id FROM profiles) OR disciple_id NOT IN (SELECT id FROM profiles);
DELETE FROM discipleship_invites     WHERE leader_id NOT IN (SELECT id FROM profiles);
DELETE FROM discipleship_tasks       WHERE leader_id NOT IN (SELECT id FROM profiles) OR disciple_id NOT IN (SELECT id FROM profiles);
DELETE FROM discipleship_notes       WHERE leader_id NOT IN (SELECT id FROM profiles) OR disciple_id NOT IN (SELECT id FROM profiles) OR author_id NOT IN (SELECT id FROM profiles);
DELETE FROM discipleship_notes       WHERE group_id IS NOT NULL AND group_id NOT IN (SELECT id FROM discipleship_groups);
DELETE FROM discipleship_group_members WHERE user_id NOT IN (SELECT id FROM profiles);
DELETE FROM discipleship_group_members WHERE group_id NOT IN (SELECT id FROM discipleship_groups);
DELETE FROM chat_clear_history       WHERE user_id NOT IN (SELECT id FROM profiles);
DELETE FROM reading_progress         WHERE user_id NOT IN (SELECT id FROM profiles);
DELETE FROM devotionals              WHERE creator_id NOT IN (SELECT id FROM profiles);

-- ============================================
-- 4) Adicionar as FKs ausentes (idempotente)
-- ============================================
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
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'discipleship_notes_group_id_fkey') THEN
    ALTER TABLE discipleship_notes ADD CONSTRAINT discipleship_notes_group_id_fkey FOREIGN KEY (group_id) REFERENCES discipleship_groups(id) ON DELETE CASCADE;
  END IF;

  -- discipleship_groups
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'discipleship_groups_leader_id_fkey') THEN
    ALTER TABLE discipleship_groups ADD CONSTRAINT discipleship_groups_leader_id_fkey FOREIGN KEY (leader_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  -- discipleship_group_members
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'discipleship_group_members_group_id_fkey') THEN
    ALTER TABLE discipleship_group_members ADD CONSTRAINT discipleship_group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES discipleship_groups(id) ON DELETE CASCADE;
  END IF;
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

-- ============================================
-- 5) Índice único para o upsert (onConflict: group_id,user_id)
-- ============================================
CREATE UNIQUE INDEX IF NOT EXISTS discipleship_group_members_group_id_user_id_key ON discipleship_group_members (group_id, user_id);

-- Garantir que o líder aparece como membro ativo/admin do próprio grupo
INSERT INTO discipleship_group_members (group_id, user_id, status, role)
SELECT g.id, g.leader_id, 'active', 'admin'
FROM discipleship_groups g
WHERE g.leader_id IS NOT NULL
ON CONFLICT (group_id, user_id) DO NOTHING;

-- ============================================
-- 6) RLS: recriar políticas de groups e group_members
--    (as políticas antigas referenciavam created_by, coluna que não existe mais no fluxo novo)
-- ============================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'discipleship_groups' LOOP
    EXECUTE format('DROP POLICY "%s" ON discipleship_groups', r.policyname);
  END LOOP;
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'discipleship_group_members' LOOP
    EXECUTE format('DROP POLICY "%s" ON discipleship_group_members', r.policyname);
  END LOOP;
END $$;

ALTER TABLE discipleship_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view groups" ON discipleship_groups FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create groups" ON discipleship_groups FOR INSERT WITH CHECK (auth.uid() = leader_id);
CREATE POLICY "Leaders can update their groups" ON discipleship_groups FOR UPDATE USING (auth.uid() = leader_id);
CREATE POLICY "Leaders can delete their groups" ON discipleship_groups FOR DELETE USING (auth.uid() = leader_id);

ALTER TABLE discipleship_group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view group members" ON discipleship_group_members FOR SELECT USING (true);
CREATE POLICY "Users can join groups themselves" ON discipleship_group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Leaders can invite members to their groups" ON discipleship_group_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM discipleship_groups
      WHERE discipleship_groups.id = group_id
      AND discipleship_groups.leader_id = auth.uid()
    )
  );
CREATE POLICY "Members can update their status" ON discipleship_group_members FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Members can leave groups" ON discipleship_group_members FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 7) Criar discipleship_meetings (tabela ausente)
-- ============================================
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

-- ============================================
-- 8) Recarregar o cache de schema do PostgREST
-- ============================================
NOTIFY pgrst, 'reload schema';
