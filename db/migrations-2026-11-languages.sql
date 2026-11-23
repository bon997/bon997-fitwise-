-- Languages written as "Engelska", "Flytande engelska", "English (fluent)" … become one name
-- ("english", "swedish", …) in job and user skills, matching src/lib/ai/skills.ts normalizeSkill.
-- Safe to run more than once.
CREATE OR REPLACE FUNCTION pg_temp.fw_lang(n text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE m
    WHEN 'engelska' THEN 'english' WHEN 'svenska' THEN 'swedish' WHEN 'norska' THEN 'norwegian'
    WHEN 'danska' THEN 'danish' WHEN 'finska' THEN 'finnish' WHEN 'tyska' THEN 'german'
    WHEN 'franska' THEN 'french' WHEN 'spanska' THEN 'spanish' WHEN 'arabiska' THEN 'arabic'
    WHEN 'polska' THEN 'polish' ELSE m END
  FROM (SELECT substring(lower(trim(n)) FROM
    '^(?:(?:fluent|flytande|god|goda|mycket god|very good|good|business|professional|native|basic|grundläggande|kunskaper i|knowledge of|skriftlig|muntlig|och|and)\s+)*(english|engelska|swedish|svenska|norwegian|norska|danish|danska|finnish|finska|german|tyska|french|franska|spanish|spanska|arabic|arabiska|polish|polska)(?:\s*\(.*\)|\s+i tal och skrift|\s+in speech and writing|\s*[–:-].*)?$'
  ) AS m) x
$$;

UPDATE jobs SET skills = (
  SELECT jsonb_agg(CASE WHEN pg_temp.fw_lang(e->>'name') IS NOT NULL
                        THEN jsonb_set(e, '{name}', to_jsonb(pg_temp.fw_lang(e->>'name'))) ELSE e END)
  FROM jsonb_array_elements(skills) e)
WHERE jsonb_typeof(skills) = 'array' AND EXISTS (
  SELECT 1 FROM jsonb_array_elements(skills) e
  WHERE pg_temp.fw_lang(e->>'name') IS NOT NULL AND pg_temp.fw_lang(e->>'name') <> e->>'name');

UPDATE users SET skills = (
  SELECT jsonb_agg(DISTINCT coalesce(pg_temp.fw_lang(x), x)) FROM jsonb_array_elements_text(skills) x)
WHERE jsonb_typeof(skills) = 'array' AND EXISTS (
  SELECT 1 FROM jsonb_array_elements_text(skills) x
  WHERE pg_temp.fw_lang(x) IS NOT NULL AND pg_temp.fw_lang(x) <> x);
