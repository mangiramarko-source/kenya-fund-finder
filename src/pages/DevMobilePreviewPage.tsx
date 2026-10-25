import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Smartphone,
  ExternalLink,
  RotateCcw,
  Sun,
  Moon,
  ArrowLeft,
  CheckCircle2,
  Layers,
  Sparkles,
  Newspaper,
  TrendingUp,
  Landmark,
  PieChart,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const PRESET_DEVICES = [
  { id: "pixel8", name: "Google Pixel 8", width: 412, height: 860, os: "Android 14" },
  { id: "galaxy", name: "Samsung Galaxy S24", width: 393, height: 852, os: "One UI / Android" },
  { id: "iphone", name: "iPhone 15 Pro", width: 393, height: 852, os: "iOS 17" },
];

const PRESET_SCREENS = [
  { path: "/news", label: "News Feed", icon: Newspaper, tab: "Tab 1" },
  { path: "/stocks", label: "NSE Stocks", icon: TrendingUp, tab: "Tab 2" },
  { path: "/funds", label: "MMFs Ranking", icon: Landmark, tab: "Tab 3" },
  { path: "/portfolio", label: "Portfolio", icon: PieChart, tab: "Tab 4" },
  { path: "/", label: "Market Overview", icon: Layers, tab: "In More" },
  { path: "/treasury", label: "T-Bills & Bonds", icon: Layers, tab: "In More" },
  { path: "/rates", label: "FX Rates", icon: Layers, tab: "In More" },
  { path: "/commodities", label: "Commodities", icon: Layers, tab: "In More" },
  { path: "/mmf-calculator", label: "MMF Calculator", icon: Layers, tab: "In More" },
];

export default function DevMobilePreviewPage() {
  const [selectedDevice, setSelectedDevice] = useState(PRESET_DEVICES[0]);
  const [currentPath, setCurrentPath] = useState("/news");
  const [iframeKey, setIframeKey] = useState(0);

  const reloadIframe = () => setIframeKey((k) => k + 1);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Controller Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Site</span>
          </Link>
          <div className="h-4 w-px bg-slate-700" />
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-emerald-400" />
            <h1 className="text-sm font-bold text-white tracking-tight">
              Android Mobile App Redesign Preview
            </h1>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
              Feature Branch
            </Badge>
          </div>
        </div>

        {/* Device Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Device:</span>
          <div className="flex rounded-lg bg-slate-800 p-0.5 border border-slate-700/80">
            {PRESET_DEVICES.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedDevice(d)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  selectedDevice.id === d.id
                    ? "bg-emerald-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {d.name}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={reloadIframe}
            className="h-7 text-xs border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reload
          </Button>

          <a
            href={currentPath}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-semibold px-2"
          >
            Open Standalone <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </header>

      {/* Main Preview Grid */}
      <div className="flex-1 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-8 p-6 lg:p-10 max-w-7xl mx-auto w-full">
        {/* Left Side: Interactive Screen Switcher & Release Notes */}
        <div className="w-full lg:w-80 shrink-0 space-y-6 order-2 lg:order-1">
          {/* Screen Picker */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Switch Screen in Frame
            </h2>
            <div className="space-y-1">
              {PRESET_SCREENS.map((s) => {
                const Icon = s.icon;
                const isSelected = currentPath === s.path;
                return (
                  <button
                    key={s.path}
                    onClick={() => setCurrentPath(s.path)}
                    className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-left text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4" />
                      <span>{s.label}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full font-bold">
                      {s.tab}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Highlights & Architecture notes */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Redesign Features
            </h3>
            <ul className="text-xs text-slate-300 space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Bottom Navigation:</strong> 5 primary destinations (News, Stocks, MMFs, Portfolio, More).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>'More' Native Bottom Sheet:</strong> Fast access to T-Bills, FX Rates, Commodities, Watchlist, Calculators.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Streamlined Top Bar:</strong> Replaced the 101px top scrolling header with a clean 56px app bar.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Ticker Retained:</strong> Ticker stays cleanly fixed right below the top bar on mobile without overlap.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>AI Cost Elimination:</strong> Kora floating button and chat deactivated via feature flag ($0 token cost).
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Center: Smartphone Chassis Mockup */}
        <div className="flex flex-col items-center order-1 lg:order-2">
          {/* Phone Bezel */}
          <div
            className="relative rounded-[48px] p-3.5 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.1)] border-[4px] border-slate-800"
            style={{
              width: `${selectedDevice.width + 28}px`,
              maxWidth: "100%",
            }}
          >
            {/* Camera Punch-hole / Dynamic Island */}
            <div className="absolute top-5 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center">
              <div className="h-4 w-4 rounded-full bg-slate-950 border border-slate-800 shadow-inner flex items-center justify-center">
                <div className="h-1.5 w-1.5 rounded-full bg-slate-900/80" />
              </div>
            </div>

            {/* Screen Inner Frame */}
            <div
              className="relative overflow-hidden rounded-[38px] bg-slate-950 flex flex-col shadow-inner"
              style={{
                width: `${selectedDevice.width}px`,
                height: `${selectedDevice.height}px`,
              }}
            >
              {/* Native Mobile Status Bar */}
              <div className="h-7 w-full bg-slate-900/90 text-slate-300 text-[11px] font-semibold flex items-center justify-between px-6 shrink-0 select-none z-20">
                <span>16:15</span>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span>5G</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Embedded Web App Viewport */}
              <iframe
                key={`${currentPath}-${iframeKey}`}
                src={currentPath}
                title="Mobile App Preview"
                className="w-full flex-1 border-0 bg-background"
                style={{
                  height: `calc(${selectedDevice.height}px - 28px)`,
                }}
              />
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-500 font-medium">
            Simulating {selectedDevice.name} ({selectedDevice.width} × {selectedDevice.height}px)
          </p>
        </div>
      </div>
    </div>
  );
}
