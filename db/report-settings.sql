-- Per-center customisation for the printable parent report. Centers can:
--   * add a short intro paragraph below the report title
--   * add a footer note (eg. confidentiality, inquiries)
--   * hide the 30-day summary card on print
--   * hide the signature block (some centers only email reports)
--   * relabel the two signature lines (eg. "Director" / "Class teacher" /
--     "Parent / Guardian")
-- Run after schema.sql.

alter table public.centers
  add column if not exists report_intro_text text,
  add column if not exists report_footer_text text,
  add column if not exists report_show_summary boolean not null default true,
  add column if not exists report_show_signatures boolean not null default true,
  add column if not exists report_signature_label_left text,
  add column if not exists report_signature_label_right text;
