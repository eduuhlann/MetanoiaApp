-- ============================================
-- FIX FASE 2: FKs ainda ausentes no banco
-- Rodar no Supabase Dashboard > SQL Editor (uma única execução)
--
-- Confirmado como ausente (via PostgREST):
--   discipleship_group_members.user_id   -> profiles   (lista de membros do grupo / aceitar convite)
--   devotional_messages.user_id          -> profiles   (chat de devocional em grupo)  *nome obrigatório
--   events.author_id                     -> profiles   (página de eventos / dashboard) *nome obrigatório
--   devotional_invites.inviter_id        -> profiles
--   devotional_invites.invitee_id        -> profiles
--   devotional_journal.user_id           -> profiles
--   devotional_groups.creator_id         -> profiles
--   event_photos.user_id                 -> profiles
-- ============================================

-- 0) Validade do código de convite (5 minutos)
ALTER TABLE discipleship_groups ADD COLUMN IF NOT EXISTS invite_code_expires_at TIMESTAMPTZ;

-- 1) Limpar órfãos para as FKs poderem ser criadas
DELETE FROM devotional_messages        WHERE user_id NOT IN (SELECT id FROM profiles) OR group_id NOT IN (SELECT id FROM devotional_groups);
DELETE FROM devotional_invites         WHERE inviter_id NOT IN (SELECT id FROM profiles) OR invitee_id NOT IN (SELECT id FROM profiles) OR devotional_id NOT IN (SELECT id FROM devotionals);
DELETE FROM devotional_journal         WHERE user_id NOT IN (SELECT id FROM profiles) OR devotional_id NOT IN (SELECT id FROM devotionals);
DELETE FROM devotional_groups          WHERE creator_id NOT IN (SELECT id FROM profiles) OR devotional_id NOT IN (SELECT id FROM devotionals);
DELETE FROM events                     WHERE author_id NOT IN (SELECT id FROM profiles);
DELETE FROM event_photos               WHERE user_id NOT IN (SELECT id FROM profiles) OR event_id NOT IN (SELECT id FROM events);
DELETE FROM discipleship_group_members WHERE user_id NOT IN (SELECT id FROM profiles);

-- 2) Adicionar as FKs ausentes (idempotente, reexecutável)
DO $$
BEGIN
  -- disciple groups
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'discipleship_group_members_user_id_fkey') THEN
    ALTER TABLE discipleship_group_members ADD CONSTRAINT discipleship_group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  -- chat devocional em grupo
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'devotional_messages_user_id_fkey') THEN
    ALTER TABLE devotional_messages ADD CONSTRAINT devotional_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  -- eventos (nome exato usado por EventsPage e Dashboard)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_author_id_fkey') THEN
    ALTER TABLE events ADD CONSTRAINT events_author_id_fkey FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  -- convites de devocional
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'devotional_invites_inviter_id_fkey') THEN
    ALTER TABLE devotional_invites ADD CONSTRAINT devotional_invites_inviter_id_fkey FOREIGN KEY (inviter_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'devotional_invites_invitee_id_fkey') THEN
    ALTER TABLE devotional_invites ADD CONSTRAINT devotional_invites_invitee_id_fkey FOREIGN KEY (invitee_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  -- diário devocional
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'devotional_journal_user_id_fkey') THEN
    ALTER TABLE devotional_journal ADD CONSTRAINT devotional_journal_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  -- grupos de devocional
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'devotional_groups_creator_id_fkey') THEN
    ALTER TABLE devotional_groups ADD CONSTRAINT devotional_groups_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  -- fotos de eventos
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'event_photos_user_id_fkey') THEN
    ALTER TABLE event_photos ADD CONSTRAINT event_photos_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3) Recarregar o cache de schema do PostgREST
NOTIFY pgrst, 'reload schema';
