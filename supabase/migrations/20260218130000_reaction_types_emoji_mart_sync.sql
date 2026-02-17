-- ============================================================
-- Migration: Sync reaction_types with emoji-mart IDs
-- Purpose: Add emoji_mart_id column to map DB reaction codes
--          to emoji-mart picker IDs for proper matching
-- ============================================================

-- 1. Add emoji_mart_id column
ALTER TABLE reaction_types
  ADD COLUMN IF NOT EXISTS emoji_mart_id TEXT;

-- 2. Update existing reaction types with emoji-mart IDs
UPDATE reaction_types SET emoji_mart_id = '+1' WHERE code = 'thumbs_up';
UPDATE reaction_types SET emoji_mart_id = 'heart' WHERE code = 'heart';
UPDATE reaction_types SET emoji_mart_id = 'joy' WHERE code = 'laugh';
UPDATE reaction_types SET emoji_mart_id = 'open_mouth' WHERE code = 'wow';
UPDATE reaction_types SET emoji_mart_id = 'cry' WHERE code = 'sad';
UPDATE reaction_types SET emoji_mart_id = 'rage' WHERE code = 'angry';
UPDATE reaction_types SET emoji_mart_id = 'fire' WHERE code = 'fire';
UPDATE reaction_types SET emoji_mart_id = 'clap' WHERE code = 'clap';
UPDATE reaction_types SET emoji_mart_id = 'moneybag' WHERE code = 'money';
UPDATE reaction_types SET emoji_mart_id = 'white_check_mark' WHERE code = 'check';

-- 3. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_reaction_types_emoji_mart_id
  ON reaction_types(emoji_mart_id) WHERE emoji_mart_id IS NOT NULL;
