# Privacy Policy — Cổng Phụ Huynh

**Effective: 2026-05-10**
**Operator: Matthew Stadler ("the Operator"), matthewstadlers14@gmail.com**

This Privacy Policy explains what data Cổng Phụ Huynh
(https://parent-portal-nine.vercel.app, "the Service") collects, why, and
how it is handled.

## 1. Who we are

The Operator is Matthew Stadler, an individual based in Vietnam, who
designs and runs the Service. The Service is hosted on Vercel (web
hosting) and Supabase (Postgres database, authentication, file storage).
Data is stored in their US / EU data centers.

## 2. Whose data do we hold

Three groups of people have data in the Service:

- **Center admins** — name, email, role
- **Teachers** — name, email, role, lessons they record
- **Parents** — name, email, role, link to their child(ren)
- **Students** — full name, age, link to their class + parent, lesson notes
  recorded by their teacher
- **Centers** — center name, contact email/phone, logo, subscription status

The Service is **not designed for sensitive data** — do not enter health
records, ID/passport numbers, banking credentials, or anything similar.

## 3. What we do with the data

- Store it for the center to view and use, scoped per-center (Row Level
  Security ensures no center can see another center's data).
- Display it to the relevant users (admin sees their center; teachers see
  their classes; parents see their own children).
- Generate the printable PDF report when a parent requests it.
- Operate the Service: routine logging (timestamps, IP for auth), backups.

We do **not**:
- Sell or rent any data to third parties.
- Use the data for advertising.
- Train AI/ML models on it.
- Access individual data unless required to provide support or as legally
  required.

## 4. Who else can see the data

- **Vercel** processes requests as they pass through their hosting.
- **Supabase** stores the database, authentication records, and uploaded
  files (worksheets, logos).
- Both are bound by their own privacy commitments and data-protection
  agreements with the Operator.

We do not transfer data to any other third party.

## 5. How long do we keep it

- While the center's subscription is active, all data is retained.
- After the subscription is cancelled, data is retained for 30 days
  (in case the center returns or asks for export) then permanently
  deleted.
- Backups (encrypted, not directly accessible) may persist for up to 90
  days as part of routine infrastructure backups.

## 6. Your rights

You can ask the Operator to:
- **See** what data we hold about you.
- **Correct** inaccurate data — admins can usually do this themselves
  through the app; if you cannot, email us.
- **Export** your data as CSV.
- **Delete** your account and associated data.

Email matthewstadlers14@gmail.com from the email address on file. We will
respond within 14 days.

## 7. Security

- All connections to the Service use HTTPS.
- Passwords are hashed (we cannot read them; only Supabase Auth verifies
  them).
- Data isolation between centers is enforced at the database row level
  (Row Level Security), so one center's queries cannot return another
  center's rows even if exploited.
- We are a small team; we recommend each center admin still treats their
  password carefully and does not share it.

## 8. Children's data

Students are typically minors. They do not have their own accounts — only
their parent has an account on their behalf. We process student data only
to provide the Service to the center that enrolled them. Centers are
responsible for obtaining parental consent under Vietnamese law before
adding students to the Service.

## 9. Changes

We may update this Privacy Policy with reasonable notice (email or in-app
banner). Continued use of the Service after the effective date of an
update constitutes acceptance.

---

📩 Questions: matthewstadlers14@gmail.com
