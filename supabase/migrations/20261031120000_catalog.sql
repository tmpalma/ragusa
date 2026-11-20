-- A1 catalog schema.
-- One table per src/data/index.ts export, plus ammunition and tools.
-- `data` is the full mechanical object. Narrow columns exist only for filters and foreign keys.
-- Anon and authenticated may read. They may not insert, update, or delete.

create table public.books (
  key text primary key,
  data jsonb not null
);

create table public.classes (
  key text primary key,
  data jsonb not null,
  srd boolean not null,
  book text not null references public.books (key)
);

create table public.feats (
  key text primary key,
  data jsonb not null,
  srd boolean not null,
  book text not null references public.books (key)
);

create table public.alignments (
  key text primary key,
  data jsonb not null,
  srd boolean not null,
  book text not null references public.books (key)
);

create table public.subclasses (
  key text primary key,
  data jsonb not null,
  srd boolean not null,
  book text not null references public.books (key),
  class_key text not null references public.classes (key)
);

create table public.class_spell_lists (
  class_key text primary key references public.classes (key),
  data jsonb not null
);

create table public.spells (
  key text primary key,
  data jsonb not null,
  srd boolean not null,
  book text not null references public.books (key)
);

create table public.species (
  key text primary key,
  data jsonb not null,
  srd boolean not null,
  book text not null references public.books (key)
);

create table public.backgrounds (
  key text primary key,
  data jsonb not null,
  srd boolean not null,
  book text not null references public.books (key),
  feat_key text references public.feats (key)
);

create table public.deities (
  key text primary key,
  data jsonb not null,
  srd boolean not null,
  book text not null references public.books (key),
  alignment_key text references public.alignments (key)
);

create table public.beasts (
  key text primary key,
  data jsonb not null,
  srd boolean not null,
  book text not null references public.books (key)
);

create table public.conditions (
  key text primary key,
  data jsonb not null,
  srd boolean not null,
  book text not null references public.books (key)
);

create table public.weapons (
  key text primary key,
  data jsonb not null,
  srd boolean not null,
  book text not null references public.books (key)
);

create table public.armor (
  key text primary key,
  data jsonb not null,
  srd boolean not null,
  book text not null references public.books (key)
);

create table public.languages (
  key text primary key,
  data jsonb not null,
  srd boolean not null,
  book text not null references public.books (key)
);

create table public.magic_items (
  key text primary key,
  data jsonb not null,
  srd boolean not null,
  book text not null references public.books (key)
);

create table public.generic_variants (
  key text primary key,
  data jsonb not null,
  srd boolean not null,
  book text not null references public.books (key)
);

create table public.adventuring_gear (
  key text primary key,
  data jsonb not null,
  srd boolean not null,
  book text not null references public.books (key)
);

-- Keyed maps. AmmunitionPackStats and ToolData have no book or srd.
create table public.ammunition (
  key text primary key,
  data jsonb not null
);

create table public.tools (
  key text primary key,
  data jsonb not null
);

create table public.catalog_strings (
  entity_type text not null,
  entity_key text not null,
  field text not null,
  locale text not null,
  text text not null,
  primary key (entity_type, entity_key, field, locale)
);

do $policies$
declare
  catalog_table text;
begin
  foreach catalog_table in array array[
    'books',
    'classes',
    'feats',
    'alignments',
    'subclasses',
    'class_spell_lists',
    'spells',
    'species',
    'backgrounds',
    'deities',
    'beasts',
    'conditions',
    'weapons',
    'armor',
    'languages',
    'magic_items',
    'generic_variants',
    'adventuring_gear',
    'ammunition',
    'tools',
    'catalog_strings'
  ]
  loop
    execute format('alter table public.%I enable row level security', catalog_table);
    execute format(
      'revoke all on table public.%I from public, anon, authenticated',
      catalog_table
    );
    execute format(
      'grant select on table public.%I to anon, authenticated, service_role',
      catalog_table
    );
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true)',
      catalog_table || '_select',
      catalog_table
    );
  end loop;
end
$policies$;

-- Seed runs as the service role, which bypasses row level security but still needs writes.
grant insert, update, delete on table
  public.books,
  public.classes,
  public.feats,
  public.alignments,
  public.subclasses,
  public.class_spell_lists,
  public.spells,
  public.species,
  public.backgrounds,
  public.deities,
  public.beasts,
  public.conditions,
  public.weapons,
  public.armor,
  public.languages,
  public.magic_items,
  public.generic_variants,
  public.adventuring_gear,
  public.ammunition,
  public.tools,
  public.catalog_strings
to service_role;

create function public.get_catalog()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $fn$
  select jsonb_build_object(
    'classes',
      (select coalesce(jsonb_agg(data order by key), '[]'::jsonb) from classes),
    'subclasses',
      (select coalesce(jsonb_agg(data order by key), '[]'::jsonb) from subclasses),
    'classSpellLists',
      (select coalesce(jsonb_object_agg(class_key, data order by class_key), '{}'::jsonb) from class_spell_lists),
    'spells',
      (select coalesce(jsonb_agg(data order by key), '[]'::jsonb) from spells),
    'species',
      (select coalesce(jsonb_agg(data order by key), '[]'::jsonb) from species),
    'backgrounds',
      (select coalesce(jsonb_agg(data order by key), '[]'::jsonb) from backgrounds),
    'deities',
      (select coalesce(jsonb_agg(data order by key), '[]'::jsonb) from deities),
    'beasts',
      (select coalesce(jsonb_agg(data order by key), '[]'::jsonb) from beasts),
    'conditions',
      (select coalesce(jsonb_agg(data order by key), '[]'::jsonb) from conditions),
    'books',
      (select coalesce(jsonb_agg(data order by key), '[]'::jsonb) from books),
    'feats',
      (select coalesce(jsonb_agg(data order by key), '[]'::jsonb) from feats),
    'weapons',
      (select coalesce(jsonb_agg(data order by key), '[]'::jsonb) from weapons),
    'armor',
      (select coalesce(jsonb_agg(data order by key), '[]'::jsonb) from armor),
    'alignments',
      (select coalesce(jsonb_agg(data order by key), '[]'::jsonb) from alignments),
    'languages',
      (select coalesce(jsonb_agg(data order by key), '[]'::jsonb) from languages),
    'magicItems',
      (select coalesce(jsonb_agg(data order by key), '[]'::jsonb) from magic_items),
    'genericVariants',
      (select coalesce(jsonb_agg(data order by key), '[]'::jsonb) from generic_variants),
    'adventuringGear',
      (select coalesce(jsonb_agg(data order by key), '[]'::jsonb) from adventuring_gear),
    'ammunitionStats',
      (select coalesce(jsonb_object_agg(key, data order by key), '{}'::jsonb) from ammunition),
    'toolStats',
      (select coalesce(jsonb_object_agg(key, data order by key), '{}'::jsonb) from tools),
    'catalogStrings',
      (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'entity_type', entity_type,
              'entity_key', entity_key,
              'field', field,
              'locale', locale,
              'text', text
            )
            order by entity_type, entity_key, field, locale
          ),
          '[]'::jsonb
        )
        from catalog_strings
      )
  );
$fn$;

revoke all on function public.get_catalog() from public;
grant execute on function public.get_catalog() to anon, authenticated, service_role;
