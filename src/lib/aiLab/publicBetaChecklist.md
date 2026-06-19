# AI Lab — public beta checklist (planning)

Phase 10 ships the **controlled beta access gate** with default mode **admin-only**.
This document tracks future access decisions — not implemented until explicitly chosen.

## Future access modes (not in runtime yet)

| Option | Description |
|--------|-------------|
| **Admin-only** | Current default. Only users with admin role can use AI Lab. |
| **Signed-in users only** | Any authenticated KenyaFundFinder account; no anonymous access. |
| **Selected beta users** | Allowlist of emails (controlled-beta gate); admins always included. |
| **Public preview** | Broader release with nav discovery and marketing copy — separate launch decision. |

## Before widening access

- [ ] Legal/disclaimer review for target audience
- [ ] Capabilities and limits copy updated for new mode
- [ ] Support path for beta feedback
- [ ] Rate limiting / abuse considerations if public
- [ ] Manual QA on login redirect (`/admin/login` until product chooses otherwise)
- [ ] Update `AI_LAB_ACCESS_MODE` and/or allowlist in a focused deploy commit
- [ ] No LLM until explicitly scoped and safety-reviewed

## Phase 10 shipped state

- `AI_LAB_ACCESS_MODE = "admin-only"`
- `AI_LAB_BETA_ALLOWLIST = []` (empty)
- No public Navbar link
- Sidebar AI Lab link uses `canShowAiLabNav` (default ≡ admin-only)
