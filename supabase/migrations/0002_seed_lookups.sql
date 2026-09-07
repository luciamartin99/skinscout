-- SkinScout — seed data for controlled lookup tables
--
-- Values below are chosen to match the current frontend constants exactly
-- (see src/data/products.js: SKIN_TYPES, CONCERNS, CATEGORIES), so nothing
-- about the UI needs to change when these tables come online. cosmetic_functions
-- is new vocabulary (the frontend has no direct equivalent yet) chosen so that
-- every concern/skin-type/stat currently shown in the UI has at least one
-- ingredient function that could plausibly drive it, once a rule engine is
-- built on top of ingredient_functions. It also includes 'fragrance', which
-- the future ingredient-tagging rule can use instead of hardcoded string
-- matching to support the fragrance_free evidence logic in 0001.
--
-- All inserts are idempotent (on conflict do nothing, keyed by the unique
-- `key` column), so this migration is safe to re-run.

-- ---------------------------------------------------------------------------
-- product_categories — matches src/data/products.js CATEGORIES
-- ---------------------------------------------------------------------------
insert into product_categories (key, label, sort_order) values
  ('cleanser',   'Cleanser',    1),
  ('serum',      'Serum',       2),
  ('moisturiser','Moisturiser', 3),
  ('sunscreen',  'Sunscreen',   4)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- skin_types — matches src/data/products.js SKIN_TYPES
-- ---------------------------------------------------------------------------
insert into skin_types (key, label) values
  ('dry',         'Dry'),
  ('oily',        'Oily'),
  ('combination', 'Combination'),
  ('sensitive',   'Sensitive'),
  ('normal',      'Normal')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- concerns — matches src/data/products.js CONCERNS
-- ---------------------------------------------------------------------------
insert into concerns (key, label) values
  ('acne',           'Acne'),
  ('dehydration',    'Dehydration'),
  ('pigmentation',   'Pigmentation'),
  ('ageing',         'Ageing'),
  ('redness',        'Redness'),
  ('barrier_repair', 'Barrier repair')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- cosmetic_functions — ingredient-level functional tags. New vocabulary (no
-- direct frontend equivalent), chosen to cover every concern/skin-type/stat
-- currently in the UI, so ingredient_functions can eventually drive
-- product_skin_type_fit / product_concern_fit for all of them.
-- ---------------------------------------------------------------------------
insert into cosmetic_functions (key, label, description) values
  ('hydrating',     'Hydrating',      'Draws or holds water in the skin (e.g. humectants like hyaluronic acid, glycerin). Feeds the Dehydration concern and hydration stat.'),
  ('emollient',     'Emollient',      'Softens/smooths and reduces water loss by sealing the skin surface (e.g. squalane, fatty esters). Feeds Dry skin-type suitability.'),
  ('oil_control',   'Oil control',    'Regulates sebum/shine (e.g. niacinamide, zinc PCA). Feeds Oily skin-type suitability and the Acne concern.'),
  ('exfoliating',   'Exfoliating',    'Chemically or physically removes dead surface cells (e.g. salicylic acid, AHAs). Feeds the Acne concern.'),
  ('brightening',   'Brightening',    'Targets uneven tone/pigmentation (e.g. vitamin C, tranexamic acid). Feeds the Pigmentation concern and brightening stat.'),
  ('anti_ageing',   'Anti-ageing',    'Targets fine lines/texture/firmness (e.g. retinoids, peptides). Feeds the Ageing concern and antiAgeing stat.'),
  ('soothing',      'Soothing',       'Calms visible redness/reactivity (e.g. centella asiatica, panthenol, bisabolol). Feeds Sensitive skin-type suitability, the Redness concern and sensitivity stat.'),
  ('barrier_repair','Barrier repair', 'Rebuilds/reinforces the skin barrier (e.g. ceramides, cholesterol, fatty acids). Feeds the Barrier repair concern.'),
  ('antioxidant',   'Antioxidant',    'Neutralises free-radical damage, often alongside brightening or anti-ageing ingredients (e.g. vitamin E, ferulic acid).'),
  ('uv_filter',      'UV filter',      'Absorbs or reflects UV radiation (e.g. zinc oxide, octocrylene). Defines sunscreen products.'),
  ('preservative',   'Preservative',   'Prevents microbial growth in the formula (e.g. phenoxyethanol). Functional, not a skin-benefit claim.'),
  ('fragrance',      'Fragrance',      'Perfuming ingredient (e.g. parfum, limonene, linalool). Used by the fragrance-free evidence rule in product_attributes — presence here means fragrance_free must be false, not inferred true from its absence elsewhere.')
on conflict (key) do nothing;
