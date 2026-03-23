
ALTER TABLE public.party_themes
  ADD COLUMN includes text[] DEFAULT '{}',
  ADD COLUMN addons text[] DEFAULT '{}',
  ADD COLUMN price_text text DEFAULT '465 kr/barn',
  ADD COLUMN details_text text DEFAULT 'Minst 12 barn · 2 timmar',
  ADD COLUMN cancellation_text text DEFAULT 'Gratis avbokning upp till 10 dagar före. 50 % avgift inom 10 dagar, 100 % inom 5 dagar.';
