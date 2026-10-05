-- Sample data for local development. Apply after schema.sql.
INSERT INTO users (id, name, email, role, skills, experience, years_experience, seniority, preferences, profile_updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Demo User', 'demo@fitwise.dev', 'user',
   '["typescript","react","next.js","node.js","postgresql","tailwind css","figma"]',
   '[{"title":"Frontend Developer","company":"Acme","start":"2021-03","end":null,"summary":"Built the customer dashboard in React and Next.js","skills":["react","typescript","next.js"]}]',
   4.5, 'mid', '{"locations":["Stockholm"],"remote_only":false}', now()),
  ('00000000-0000-0000-0000-000000000002', 'Admin', 'admin@fitwise.dev', 'admin', '[]', '[]', NULL, NULL, '{}', NULL)
ON CONFLICT (email) DO NOTHING;

INSERT INTO jobs (title, company, location, remote, employment_type, description, requirements, responsibilities, skills, seniority, min_years, salary_range, salary_min, salary_max, salary_currency, source, external_id, posted_at)
VALUES
  ('Senior Frontend Engineer', 'Northwind Labs', 'Stockholm', false, 'full_time',
   'Own the design system and the customer-facing web app.',
   '5+ years with React and TypeScript. Next.js experience. GraphQL is a plus.',
   '["Lead frontend architecture","Mentor two engineers","Ship the new onboarding flow"]',
   '[{"name":"react","required":true},{"name":"typescript","required":true},{"name":"next.js","required":true},{"name":"graphql","required":false}]',
   'senior', 5, '65–78k SEK / mo', 780000, 936000, 'SEK', 'manual', 'seed-1', now() - interval '2 days'),
  ('Full-stack Developer', 'Halcyon', 'Remote (EU)', true, 'full_time',
   'Build internal tools across a Node.js API and a React frontend.',
   '3+ years. Node.js, PostgreSQL, React. Docker and AWS nice to have.',
   '["Build APIs","Maintain the admin UI","Own database migrations"]',
   '[{"name":"node.js","required":true},{"name":"postgresql","required":true},{"name":"react","required":true},{"name":"docker","required":false},{"name":"aws","required":false}]',
   'mid', 3, '55–65k SEK / mo', 660000, 780000, 'SEK', 'manual', 'seed-2', now() - interval '5 days'),
  ('Data Engineer', 'Brightline', 'Gothenburg', false, 'full_time',
   'Design and run our data pipelines.',
   'Python, SQL, Airflow, dbt. Spark experience required.',
   '["Own ETL pipelines","Model the warehouse"]',
   '[{"name":"python","required":true},{"name":"sql","required":true},{"name":"airflow","required":true},{"name":"dbt","required":true},{"name":"spark","required":true}]',
   'mid', 3, NULL, NULL, NULL, NULL, 'manual', 'seed-3', now() - interval '1 day')
ON CONFLICT (source, external_id) DO NOTHING;

-- More sample jobs so search, ranking and the dashboard have something to show.
INSERT INTO jobs (title, company, location, remote, employment_type, description, requirements, responsibilities, skills, seniority, min_years, salary_range, salary_min, salary_max, salary_currency, source, external_id, posted_at, apply_url)
VALUES
  ('Frontend Developer', 'Kestrel', 'Stockholm', false, 'full_time',
   'Build accessible, fast interfaces for a fintech app used by 2M people.',
   'React, TypeScript and CSS. Testing with Playwright is a plus.',
   '["Ship features end to end","Improve accessibility","Own the component library"]',
   '[{"name":"react","required":true},{"name":"typescript","required":true},{"name":"css","required":true},{"name":"playwright","required":false}]',
   'mid', 3, '50–60k SEK / mo', 600000, 720000, 'SEK', 'manual', 'seed-4', now() - interval '1 day', 'https://example.com/jobs/seed-4'),
  ('Product Engineer', 'Meridian', 'Remote (Europe)', true, 'full_time',
   'Small team, big ownership: you take features from idea to production.',
   'TypeScript across the stack: Next.js, Node.js, PostgreSQL.',
   '["Talk to customers","Design and build features","Run experiments"]',
   '[{"name":"typescript","required":true},{"name":"next.js","required":true},{"name":"node.js","required":true},{"name":"postgresql","required":true}]',
   'mid', 3, '680–850k SEK / yr', 680000, 850000, 'SEK', 'manual', 'seed-5', now() - interval '3 days', 'https://example.com/jobs/seed-5'),
  ('Lead Frontend Engineer', 'Oakfield', 'Malmö', false, 'full_time',
   'Lead a team of five frontend engineers.',
   '8+ years. React, TypeScript, team leadership.',
   '["Lead and grow the team","Set technical direction"]',
   '[{"name":"react","required":true},{"name":"typescript","required":true},{"name":"leadership","required":true}]',
   'lead', 8, '80–95k SEK / mo', 960000, 1140000, 'SEK', 'manual', 'seed-6', now() - interval '4 days', 'https://example.com/jobs/seed-6'),
  ('Junior Web Developer', 'Halcyon', 'Stockholm', false, 'full_time',
   'Learn from a friendly team while building our marketing site.',
   'HTML, CSS, JavaScript. Some React.',
   '["Build landing pages","Fix bugs"]',
   '[{"name":"javascript","required":true},{"name":"css","required":true},{"name":"react","required":false}]',
   'junior', 0, '35–40k SEK / mo', 420000, 480000, 'SEK', 'manual', 'seed-7', now() - interval '6 days', 'https://example.com/jobs/seed-7'),
  ('Sales Engineer', 'Brightline', 'Stockholm', false, 'full_time',
   'Help customers understand our data platform.',
   'Technical background, SQL, great communication.',
   '["Run product demos","Support the sales team"]',
   '[{"name":"sql","required":true},{"name":"communication","required":true}]',
   'mid', 2, NULL, NULL, NULL, NULL, 'manual', 'seed-8', now() - interval '2 days', 'https://example.com/jobs/seed-8'),
  ('UX Designer', 'Northwind Labs', 'Stockholm', false, 'contract',
   'Six-month contract redesigning onboarding.',
   'Figma, user research, prototyping.',
   '["Run user interviews","Prototype new flows"]',
   '[{"name":"figma","required":true},{"name":"user research","required":true},{"name":"prototyping","required":true}]',
   'mid', 3, NULL, NULL, NULL, NULL, 'manual', 'seed-9', now() - interval '5 days', 'https://example.com/jobs/seed-9')
ON CONFLICT (source, external_id) DO NOTHING;
