# News Highlights schedule review

This is a review-only schedule definition. It does not create, alter, or enable
any `pg_cron` job. A separate production launch approval is required before the
three jobs below are created.

| Job | UTC cron | Africa/Nairobi | Request body |
| --- | --- | --- | --- |
| `news-highlights-edition-weekdays` | `0 3 * * 1-5` | 06:00 weekdays | `{}` |
| `news-highlights-delivery-weekdays` | `2,22,42 3 * * 1-5` | 06:02/06:22/06:42 weekdays | `{"category":"news_highlights","batch_size":25}` |
| `news-highlights-edition-retry` | `20 3 * * 1-5` | 06:20 weekdays | `{"retry_failed_only":true}` |

The later approved migration must call the Edge Functions with the existing
Vault-resolved `kff_project_url` and `kff_automations_secret_key` values using
the `apikey` header. It must not place any key in `cron.job.command`.

Before enabling these jobs, verify that `https://kenyafundfinder.com/market-news-highlights-hero.png`
returns the approved asset, `COMMUNICATION_SEND_MODE` is correct for the launch,
and the first controlled recipient test has passed.
