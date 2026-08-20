# DNS and email authentication deployment record — 2026-08-20

Domain: `kenyafundfinder.com`

This document records the verified Batch 6 production state after the approved
Cloudflare changes. DNS answers were checked through the Cloudflare API and
directly against `julio.ns.cloudflare.com`.

## Service map

- Registrar: IONOS SE
- Authoritative DNS: Cloudflare (`betty.ns.cloudflare.com`, `julio.ns.cloudflare.com`)
- Website hosting: Vercel
- Inbound email: IONOS (`mx00.ionos.com`, `mx01.ionos.com`)
- Application outbound email: Resend/Amazon SES

## Deployed controls

| Control | Verified production result | Status |
| --- | --- | --- |
| DMARC | `v=DMARC1; p=none; sp=none; pct=100; rua=mailto:8e436331cf8544f0aca61dbbc89a8628@dmarc-reports.cloudflare.net,mailto:dmarcreports@lovable.dev` | Active in monitoring mode |
| TLS-RPT | `_smtp._tls` publishes `v=TLSRPTv1; rua=mailto:dmarcreports@lovable.dev` | Active |
| MTA-STS version | `_mta-sts` publishes `v=STSv1; id=2026082001` | Active |
| MTA-STS policy | `https://mta-sts.kenyafundfinder.com/.well-known/mta-sts.txt` returns HTTP 200 and `text/plain` from the dedicated Cloudflare Worker | Active in testing mode |
| CAA | Apex permits Let's Encrypt, Google Trust Services, SSL.com, and Sectigo for normal and wildcard issuance; Cloudflare's authoritative answer also includes its managed partner-CA entries | Active |
| DNSSEC | Cloudflare zone signing is enabled and publishes DNSKEY records | Pending registrar DS publication |

The MTA-STS policy is:

```text
version: STSv1
mode: testing
mx: mx00.ionos.com
mx: mx01.ionos.com
max_age: 86400
```

The dedicated Worker is `kenyafundfinder-mta-sts` and is scoped to the route
`mta-sts.kenyafundfinder.com/*`. Other paths return HTTP 404.

## Email records preserved

The change did not alter existing mail delivery or sender-authentication records:

- MX remains `mx00.ionos.com` and `mx01.ionos.com` at priority 10.
- Apex SPF remains `v=spf1 include:_spf-us.ionos.com ~all`.
- `resend._domainkey` remains present with the existing provider-controlled RSA key.
- The Resend return-path records on `send.kenyafundfinder.com` remain unchanged.

## Required IONOS DNSSEC handoff

Cloudflare generated this DS record:

```text
kenyafundfinder.com. 3600 IN DS 2371 13 2 4D9F70A6EBEFB77A5F9BD0072A298D4D6A7FE7F42893911BE4C0BFDF4DB9B294
```

IONOS must publish the DS at the registrar/parent zone using these values:

- Key tag: `2371`
- Algorithm: `13` (ECDSAP256SHA256)
- Digest type: `2` (SHA-256)
- Digest: `4D9F70A6EBEFB77A5F9BD0072A298D4D6A7FE7F42893911BE4C0BFDF4DB9B294`

Until that happens, Cloudflare correctly reports DNSSEC as `pending` and public
resolvers return no parent DS record. Keep Cloudflare DNSSEC enabled while IONOS
publishes the DS.

## Remaining monitoring and provider work

- Confirm that `dmarcreports@lovable.dev` receives and monitors TLS aggregate reports.
- Review DMARC reports before moving from `p=none` to quarantine or reject.
- Send one message through Resend and one through IONOS, then confirm aligned SPF or DKIM in the received headers.
- Ask Resend for a provider-supported 2048-bit DKIM rotation; never replace only the public DNS key.
- After the IONOS DS publication, verify the parent DS and successful DNSSEC validation from multiple public resolvers.
- Keep MTA-STS in `testing` until TLS reports confirm both IONOS MX paths are healthy.

## Verification evidence

- Cloudflare API read-back returned all intended TXT, CAA, Worker route, and proxied hostname records.
- Both authoritative Cloudflare nameservers return the new hostname and policy records.
- Direct HTTPS verification returned HTTP 200, a valid Cloudflare certificate, `text/plain; charset=utf-8`, and the expected 82-byte policy.
- Authoritative MX, SPF, and Resend DKIM answers remained unchanged.
- Cloudflare authoritative DNSKEY records are present; the public parent DS answer is currently empty as expected.
