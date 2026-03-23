-- KitchenClub seed data
-- Run AFTER the server has started once (so initDatabase() creates the tables).
--
-- Usage:
--   mysql -h YOUR_HOST -u kitchenclub -p kitchenclub < server/seed.sql
--
-- Before running, generate a bcrypt hash for the admin password:
--   node -e "const b=require('bcryptjs'); b.hash('YOUR_PASSWORD', 12).then(console.log)"
-- Then replace the placeholder below with the output.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Admin user
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO users (id, email, password_hash, role)
VALUES (
  UUID(),
  'info@kitchenclub.se',
  '$2a$12$REPLACE_WITH_YOUR_BCRYPT_HASH',
  'admin'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Party themes
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO party_themes (
  id, emoji, name, description, long_description,
  min_age, allergy_notes, is_active, sort_order,
  includes, addons, price_text, details_text, cancellation_text
) VALUES
(
  UUID(), '🍬', 'Godisverkstad',
  'Kalaset där vi bakar och lagar eget godis, så roligt och jättegott!',
  NULL, NULL, NULL, true, 1,
  '["Godistillverkning", "Ingredienser ingår", "Förpackning att ta hem"]',
  '[]',
  '465 kr/barn',
  'Minst 12 barn · 2 timmar',
  'Gratis avbokning upp till 10 dagar före. 50 % avgift inom 10 dagar, 100 % inom 5 dagar.'
),
(
  UUID(), '🧁', 'Cupcake Fest',
  'Baka och dekorera egna cupcakes, festligt, roligt och minnesvärt.',
  NULL, NULL, NULL, true, 2,
  '["Bakning av cupcakes", "Dekorering", "Ingredienser ingår"]',
  '[]',
  '465 kr/barn',
  'Minst 12 barn · 2 timmar',
  'Gratis avbokning upp till 10 dagar före. 50 % avgift inom 10 dagar, 100 % inom 5 dagar.'
),
(
  UUID(), '🍔', 'Hamburgarkockar',
  'Laga hamburgare, pommes och smarriga tillbehör. Roligt och festligt!',
  NULL, NULL, NULL, true, 3,
  '["Hamburgertillverkning", "Pommes", "Sås & tillbehör", "Ingredienser ingår"]',
  '[]',
  '465 kr/barn',
  'Minst 12 barn · 2 timmar',
  'Gratis avbokning upp till 10 dagar före. 50 % avgift inom 10 dagar, 100 % inom 5 dagar.'
);
