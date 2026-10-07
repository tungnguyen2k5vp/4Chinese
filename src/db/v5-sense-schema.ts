/** Additive lexical metadata; existing composite sense IDs remain stable. */
export const migrationV42Sql = `
ALTER TABLE word_senses ADD COLUMN frequency_order INTEGER;
CREATE INDEX IF NOT EXISTS idx_word_senses_frequency ON word_senses(vocabulary_id,frequency_order,sense_id);
`;

