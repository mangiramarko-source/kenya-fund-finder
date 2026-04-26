import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installConsentScriptGuard } from "./lib/consent-guard";

// Install BEFORE React renders so any script tag that attempts to load is
// inspected against the synchronous consent gate.
installConsentScriptGuard();

createRoot(document.getElementById("root")!).render(<App />);
