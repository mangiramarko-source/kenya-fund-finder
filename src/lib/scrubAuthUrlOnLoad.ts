// Side-effect module. Import this FIRST in main.tsx so the scrub runs before
// the Supabase client, analytics, or session recording evaluate and read the
// URL. ES module imports run in source order, so an early side-effect import
// beats the token fragment into memory before anything can record it.
import { scrubAuthTokensFromUrl } from "./authFragment";

scrubAuthTokensFromUrl();
