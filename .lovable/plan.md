
# Social Content Automation — Phase 1

A new "Social" tab in `/admin` that lets you generate, review, schedule, and manually publish Instagram / Facebook / X posts about KenyaFundFinder data. No live API posting yet — Phase 1 is generate → approve → schedule → copy caption + download image → mark as posted. Phase 2 (Meta + X auto-posting) is deferred.

## What you get

1. **Dashboard** – counts for Draft / Review / Approved / Scheduled / Posted / Failed / Manually Posted, recent posts, next 7 days schedule.
2. **Create Post** – pick a content type, pick funds (or auto-pull top KES/USD MMFs from live `funds` table), generate captions + image with AI, edit, save as draft.
3. **Queue / Approval** – list with status filters; Approve, Reject, Edit, Reschedule, Delete, Duplicate to another platform.
4. **Scheduler** – calendar + list view; one-time or recurring (daily/weekly/monthly); default weekly plan pre-seeded (Mon MMF update … Sun website promo).
5. **Templates** – the named templates A–E plus all 14 content types, editable prompt + caption skeleton.
6. **Accounts** – stub UI showing "Manual posting mode (Phase 1)". Connect buttons disabled with a "Coming in Phase 2" note. No tokens stored yet.
7. **Manual publish drawer** – Copy caption, copy hashtags, download image (1080×1080 / 1200×630 / 1200×675), "Open Instagram/Facebook/X" deep links, "Mark as manually posted" button.
8. **Analytics** – counts by status / platform / content type / template; placeholder for click data (UTM links are generated, click tracking deferred).

## Content generation

- All captions, hashtags, image headline/subtext, CTA, and disclaimer are produced by an edge function calling **Lovable AI Gateway** (`google/gemini-2.5-flash` default; `gemini-2.5-pro` for weekly summary).
- System prompt enforces the brand voice and the **forbidden phrases list** ("best investment", "guaranteed returns", "risk-free", "you should invest", etc.) plus the **safer wording list**.
- Server-side post-generation regex guard rejects/strips any forbidden phrase before saving.
- Disclaimer auto-appended per platform (short version for X).
- UTM link auto-appended: `?utm_source={instagram|facebook|x}&utm_medium=social&utm_campaign={content_type}`.

## Image cards

- Generated via Lovable AI Gateway image endpoint (`google/gemini-2.5-flash-image` default; `gemini-3-pro-image-preview` opt-in for hero cards).
- Prompt scaffolded from brand rules: dark navy / white background, green accent, clean finance dashboard look, KenyaFundFinder + kenyafundfinder.com, headline, subtext, optional 3-row mini-table of fund/yield/date, disclaimer line.
- Three sizes per post: 1080×1080 (IG), 1200×630 (FB), 1200×675 (X). Stored in a new `social-images` storage bucket, public read.
- Regenerate button per post / per platform.

## Data source

Funds come live from existing `funds` table (already serves the site). On generate, the edge function pulls:
- Top N by `annual_yield` filtered by `yield_unit` ('%' for general, 'KES'/'USD' for currency-specific MMF posts), where `fund_type = 'money_market'` and `is_published = true`.
- Snapshot of (fund name, manager, annual_yield, daily_yield, yield_unit, fact_sheet_date, minimum_investment) is **frozen into the post row** at generation time so reposts use the same numbers shown on the image.
- A simple "Import funds" admin sub-page accepts CSV paste for ad-hoc posts not tied to live data.

## Workflow & statuses

`draft → in_review → approved → scheduled → posted` plus `failed`, `manually_posted`, `cancelled`. Transitions are explicit buttons; the scheduler does **not** auto-advance in Phase 1 (it just shows "Due now — publish manually" when scheduled_at ≤ now). A pg_cron-driven auto-publish stub is **not** built in Phase 1 per your choice.

## Security

- New tab gated by existing `useAuth().isAdmin` (same pattern as the rest of `/admin`).
- All new tables: RLS on, `service_role` full access, `authenticated` access only via `has_role(auth.uid(),'admin')`. No `anon` grants.
- Edge functions validate the JWT and require admin role (same `parseJwtClaims` pattern already used in `enrich-article`).
- LOVABLE_API_KEY stays server-only.

## Database (new tables)

```text
social_post_templates    id, key, name, content_type, platform_defaults jsonb,
                         system_prompt, caption_skeleton, image_prompt,
                         hashtags_default text[], enabled

social_posts             id, template_id, content_type, platform (ig|fb|x),
                         status, caption, hashtags text[], image_headline,
                         image_subtext, cta, disclaimer, utm_url,
                         image_url, image_size, source_data jsonb,
                         fund_ids uuid[], fund_names text[], yield_values jsonb,
                         data_as_of date, scheduled_at, posted_at,
                         error_message, created_by, created_at, updated_at

social_schedules         id, post_id nullable, template_id nullable, platform,
                         cadence (one_time|daily|weekly|monthly),
                         day_of_week, time_of_day, next_run_at, enabled

social_accounts          id, platform, handle, display_name,
                         connection_status (manual|connected|error),
                         meta jsonb  -- Phase 2 will store tokens here

social_post_analytics    id, post_id, event (generated|approved|scheduled|
                         posted|failed|manual_posted|clicked),
                         platform, content_type, occurred_at, meta jsonb
```

`social_imported_fund_data` reuses `source_data jsonb` on `social_posts` to keep things simple — separate table only if you later want shared imports.

## Edge functions (new)

- `social-generate-post` — input: `{ content_type, platform[], fund_ids?, custom_data? }`. Pulls live fund data, calls AI Gateway for captions per platform + image prompt, generates images via image endpoint, uploads to `social-images` bucket, inserts a `social_posts` row per platform in `draft`.
- `social-regenerate-image` — regenerate image only.
- `social-regenerate-caption` — regenerate caption for one platform.

(No auto-post function in Phase 1.)

## Files touched / added

```text
supabase/migrations/<ts>_social_automation.sql      (tables, RLS, grants, seed templates)
supabase/functions/social-generate-post/index.ts
supabase/functions/social-regenerate-image/index.ts
supabase/functions/social-regenerate-caption/index.ts

src/pages/admin/social/SocialDashboard.tsx
src/pages/admin/social/SocialCreatePost.tsx
src/pages/admin/social/SocialQueue.tsx
src/pages/admin/social/SocialScheduler.tsx
src/pages/admin/social/SocialTemplates.tsx
src/pages/admin/social/SocialAccounts.tsx
src/pages/admin/social/SocialAnalytics.tsx
src/pages/admin/social/SocialIndex.tsx           (inner tabs)

src/components/admin/social/PostCard.tsx
src/components/admin/social/PublishDrawer.tsx
src/components/admin/social/ImagePreview.tsx
src/components/admin/social/FundPicker.tsx
src/components/admin/social/StatusBadge.tsx
src/lib/social/brandGuards.ts                    (forbidden / safe phrase enforcement)
src/lib/social/utm.ts
src/lib/social/contentTypes.ts                   (the 14 types + defaults)

src/pages/AdminPage.tsx                          (add "Social" tab)
mem://features/social-automation                 (new memory entry + index update)
```

## Out of scope (Phase 2)

- Meta Graph API (IG/FB) and X API token storage + auto-publish worker
- Click tracking pipeline (UTM links are generated now, but no aggregation)
- Cross-post analytics from Meta/X
- Multi-account per platform

When you're ready for Phase 2 we wire `social_accounts` to OAuth, add a `social-publish` edge function + pg_cron tick, and flip the manual-publish drawer into "Publish now" / auto-publish-on-schedule.
