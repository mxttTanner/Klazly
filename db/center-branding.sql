-- Per-center branding customization for the parent PDF report.
-- The existing columns (logo_url, report_intro_text, report_footer_text,
-- report_show_summary, report_show_signatures) already let a center
-- customize a lot of the printable report; this migration adds the
-- two pieces the Branding settings page needs:
--
--   brand_color       hex string used by the PDF accent bar and
--                     section-heading underlines, plus the
--                     auto-initials circle when no logo is set.
--                     Falls back to the platform default #2563EB
--                     when null.
--
--   show_pdf_credit   toggle for the small "Created with Cổng Phụ
--                     Huynh" credit line at the bottom of the PDF.
--                     Defaults to true; centers who want a fully
--                     white-label feel can flip it off.
--
-- Idempotent.

alter table public.centers
  add column if not exists brand_color text,
  add column if not exists show_pdf_credit boolean not null default true;

-- Sanity check: brand_color must be a 7-char hex string (#RRGGBB)
-- or null. Cheaper to enforce at the DB layer than to chase bad
-- input from old settings forms.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'centers_brand_color_format_check'
  ) then
    alter table public.centers
      add constraint centers_brand_color_format_check
      check (brand_color is null or brand_color ~ '^#[0-9A-Fa-f]{6}$');
  end if;
end $$;
