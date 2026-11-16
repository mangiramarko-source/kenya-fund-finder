# Samsung Galaxy Store Submission & Reviewer Guide — Kenya Fund Finder

## 1. App Binary & Signing Summary

| Field | Value |
| :--- | :--- |
| **Application Name** | Kenya Fund Finder |
| **Short Name (Launcher)** | KFF |
| **Package ID (`applicationId`)** | `com.kenyafundfinder.app` |
| **Version Name / Code** | `1.2.0` (`versionCode: 120`) |
| **Min / Target SDK** | `minSdk 24` (Android 7.0) / `targetSdk 35` (Android 15) |
| **Release Keystore Path** | `android-twa/keystore/kff-release-key.p12` (git-ignored; credentials in `android-twa/keystore/keystore.properties`) |
| **Release SHA-256 Fingerprint** | `F5:A4:80:E5:1E:D3:AB:BE:74:86:AC:37:0F:2F:80:03:80:06:2B:C3:52:6E:58:22:5A:EA:9B:33:E7:03:91:08` |
| **Digital Asset Links URL** | `https://kenyafundfinder.com/.well-known/assetlinks.json` |
| **Privacy Policy URL** | `https://kenyafundfinder.com/privacy` |
| **Terms of Use URL** | `https://kenyafundfinder.com/terms` |
| **Account & Data Deletion URL** | `https://kenyafundfinder.com/delete-account` |
| **Support / Privacy Email** | `kenyafundfinder@outlook.com` |
| **Corporate Operator** | **Elyon Innovation LTD** (Incorporated in the Republic of Kenya) |

---

## 2. How to Generate or Update the Signed Release APK

### Option A: Automated Build via GitHub Actions (Recommended if JDK/Android SDK is not installed locally)
1. In your GitHub repository **Settings → Secrets and variables → Actions**, add:
   - `KFF_KEYSTORE_BASE64`: Output of `base64 -i android-twa/keystore/kff-release-key.p12 | tr -d '\n'`
   - `KFF_KEYSTORE_PASSWORD`: The `storePassword` value in `android-twa/keystore/keystore.properties`
2. Trigger the **Build Signed Samsung Galaxy Store TWA APK** workflow (`.github/workflows/build-android-twa.yml`) via **Actions → Run workflow**.
3. Download the `kenya-fund-finder-samsung-release` artifact containing `app-release.apk` (for Samsung Seller Portal) and `app-release.aab`.

### Option B: Local Build (With JDK 17 + Android SDK installed)
```bash
cd android-twa
gradle assembleRelease
# Signed APK output: android-twa/app/build/outputs/apk/release/app-release.apk
```

### Appending a Store-Managed Signing Fingerprint (If Samsung or Play Store Re-Signs the Binary)
If the store assigns an additional app-signing certificate, append its SHA-256 fingerprint without removing your upload key fingerprint:
```bash
node scripts/manage-assetlinks.mjs --add "AA:BB:CC:...:FF"
```

---

## 3. Copy-Paste Samsung Seller Portal Listing Metadata

### App Title (Max 50 characters)
```text
Kenya Fund Finder – MMFs, NSE Stocks & T-Bills
```

### Short Description (Max 80 characters)
```text
Compare Kenya CMA Money Market Funds, NSE share prices, CBK T-Bills, SACCOs & FX
```

### Full Description (Max 4,000 characters)
```text
Kenya Fund Finder is Kenya’s independent market intelligence and comparison platform for researching unit trusts, stocks, government securities, bank deposits, SACCOs, and foreign exchange rates in one place.

KEY FEATURES:
• 40+ CMA-Regulated Unit Trusts & Money Market Funds (KES & USD): Compare published daily yields, annual effective yields (EAR), estimated net returns after Kenya’s 15% withholding tax, management fees, minimum investment amounts, and withdrawal turnaround times.
• Nairobi Securities Exchange (NSE) Stocks: Track share prices, daily gainers and losers, trading volume, market capitalisation, P/E valuation ratios, dividend yields, and company disclosures across all NSE sectors.
• CBK Treasury Bills & Bonds: Follow weekly Central Bank of Kenya (CBK) 91-day, 182-day, and 364-day Treasury Bill auction rates, Fixed-Coupon Treasury Bonds (FXD), and tax-free Infrastructure Bonds (IFBs).
• Bank Fixed Deposits & SASRA-Regulated DT-SACCOs: Benchmark commercial bank fixed deposit rates alongside dividend and interest rebates from leading regulated Kenyan SACCOs.
• Tax-Aware Return Calculators & AI Lab: Model lump-sum and monthly contribution scenarios with automatic 15% KRA withholding tax breakdowns and plain-language educational explanations.
• Simulated Portfolio, Watchlist & Price Alerts: Track your favorite Kenyan funds, stocks, and currencies and receive custom price and yield notifications.

IMPORTANT REGULATORY & NON-LENDER DISCLOSURE:
• Operated by Elyon Innovation LTD (Republic of Kenya).
• Strictly Informational & Educational: Kenya Fund Finder is a read-only financial research and comparison directory. Nothing in this app constitutes personalized investment, financial, legal, or tax advice.
• Non-Lender & Non-Broker: This app does NOT offer, broker, or disburse personal loans, payday loans, or credit facilities. It does NOT accept deposits, hold client money, process payments, or execute stock/fund trades.
• No Regulatory Affiliation: Not affiliated with or endorsed by the Capital Markets Authority (CMA), the Nairobi Securities Exchange (NSE), the Central Bank of Kenya (CBK), SASRA, or any fund manager or bank. Always verify current terms with the licensed institution before investing.
```

### Keywords / Tags
```text
Kenya Money Market Funds, MMF Kenya, NSE Stocks Kenya, Nairobi Securities Exchange, CBK Treasury Bills, Unit Trusts Kenya, SACCO Dividends Kenya, KES Exchange Rate, Investment Calculator Kenya
```

### Category & Age Rating
- **Category:** Finance
- **Content Age Rating:** `18+` (or `Everyone` with Financial Disclaimer; Privacy Policy and Terms enforce `18+` eligibility per Section 33 of the Kenya Data Protection Act, 2019).
- **In-App Purchases / Paid Content:** Free (No In-App Purchases).

---

## 4. Store Graphic Assets Checklist

| Asset Type | Dimensions | File Location in Repo |
| :--- | :--- | :--- |
| **App Icon (High-Res)** | `512 × 512 px` PNG | [public/icon-512.png](file:///Users/markomangira/Desktop/Business/KENYAFUNDFINDER/public/icon-512.png) |
| **Adaptive / Maskable Icon** | `512 × 512 px` PNG | [public/icon-512-maskable.png](file:///Users/markomangira/Desktop/Business/KENYAFUNDFINDER/public/icon-512-maskable.png) |
| **Screenshot 1 — Market Overview** | `1080 × 1920 px` (9:16 PNG) | [public/images/store/01-market-overview.png](file:///Users/markomangira/Desktop/Business/KENYAFUNDFINDER/public/images/store/01-market-overview.png) |
| **Screenshot 2 — MMF Yields** | `1080 × 1920 px` (9:16 PNG) | [public/images/store/02-mmf-yields.png](file:///Users/markomangira/Desktop/Business/KENYAFUNDFINDER/public/images/store/02-mmf-yields.png) |
| **Screenshot 3 — NSE Stocks** | `1080 × 1920 px` (9:16 PNG) | [public/images/store/03-nse-stocks.png](file:///Users/markomangira/Desktop/Business/KENYAFUNDFINDER/public/images/store/03-nse-stocks.png) |
| **Screenshot 4 — T-Bills & SACCOs** | `1080 × 1920 px` (9:16 PNG) | [public/images/store/04-savings-tbills.png](file:///Users/markomangira/Desktop/Business/KENYAFUNDFINDER/public/images/store/04-savings-tbills.png) |
| **Screenshot 5 — Portfolio Tracker** | `1080 × 1920 px` (9:16 PNG) | [public/images/store/05-portfolio-tracker.png](file:///Users/markomangira/Desktop/Business/KENYAFUNDFINDER/public/images/store/05-portfolio-tracker.png) |
| **Screenshot 6 — Return Calculator** | `1080 × 1920 px` (9:16 PNG) | [public/images/store/06-return-calculator.png](file:///Users/markomangira/Desktop/Business/KENYAFUNDFINDER/public/images/store/06-return-calculator.png) |

---

## 5. Copy-Paste Note for Samsung Certification / Review Team

Paste the following into the **"Notes for Review Team"** box in the Samsung Seller Portal when submitting the APK:

```text
Dear Samsung Galaxy Store Review Team,

1. NATURE OF APPLICATION (READ-ONLY MARKET DATA & COMPARISON — NOT A LENDER OR BROKER):
Kenya Fund Finder (operated by Elyon Innovation LTD, incorporated in the Republic of Kenya) is strictly a read-only financial market data directory and educational calculator platform.
- The app does NOT offer personal loans, credit, banking, payment processing, custodial accounts, or securities brokerage/trade execution.
- All core market directories (Money Market Funds, NSE Stocks, CBK Treasury Bills/Bonds, Bank Fixed Deposits, FX Rates, Calculators, and Market News) are accessible without payment.

2. OFFLINE / AIRPLANE-MODE SUPPORT:
- On first launch in Airplane Mode, OfflineFirstTWALauncherActivity displays a native offline screen with a "Retry Connection" button and automatic network recovery listener.
- On subsequent offline launches, the registered Service Worker serves a self-contained offline fallback page (/offline.html).

3. PRIVACY, CROSS-BORDER DATA TRANSFERS & SELF-SERVICE ACCOUNT DELETION:
- Privacy Policy: https://kenyafundfinder.com/privacy
- Terms of Use: https://kenyafundfinder.com/terms
- Account & Data Deletion (In-App via Profile -> Danger Zone -> Delete Account, or Web): https://kenyafundfinder.com/delete-account
```
