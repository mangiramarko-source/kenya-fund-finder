---
name: Social Automation
description: Admin tab for AI-generated Instagram/Facebook/X posts with approval workflow, brand-safety filter, and manual posting fallback
type: feature
---
Phase 1 social content automation lives at /admin → Social tab.

Tables: social_post_templates, social_posts, social_schedules, social_accounts, social_post_analytics. All admin-only via has_role(auth.uid(),'admin'). Storage bucket: social-images (private, signed URLs).

Edge functions:
- social-generate-post — creates one row per platform, calls Lovable AI Gateway chat (gemini-2.5-flash) for caption + image prompt, image gen (gemini-2.5-flash-image), uploads to social-images, returns signed URL.
- social-regenerate-image — regenerates only the image for a post.
- social-regenerate-caption — regenerates only the caption + hashtags.

Brand-safety: forbidden phrases ("best investment", "guaranteed returns", "risk-free", "you should invest", etc.) are stripped/replaced server-side via sanitize(). Disclaimer auto-appended per platform (short for X).

Workflow: draft → in_review → approved → scheduled → posted/manually_posted. No auto-publish in Phase 1 — admin uses PublishDrawer to copy caption, download image, open the platform tab, then "Mark as manually posted". Phase 2 will wire Meta Graph + X API into social_accounts.

UTM links auto-built: ?utm_source={instagram|facebook|x}&utm_medium=social&utm_campaign={content_type}.

14 content types seeded in social_post_templates (daily_mmf_update, top_kes_mmf, top_usd_mmf, weekly_summary, fund_comparison, fund_spotlight, edu_what_is_mmf, edu_effective_yield, edu_how_to_compare, calculator_promo, diaspora_edu, new_fund_added, website_feature, finance_tip).
