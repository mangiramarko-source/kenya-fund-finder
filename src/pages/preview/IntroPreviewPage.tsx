import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Smartphone,
  ExternalLink,
  RotateCcw,
  Layers,
  Sparkles,
  ArrowLeft,
  Check,
  LayoutGrid,
  Eye,
  SlidersHorizontal,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import IntroOptionLifestyle from "@/components/intro-preview/IntroOptionLifestyle";
import IntroOption1 from "@/components/intro-preview/IntroOption1";
import IntroOption2 from "@/components/intro-preview/IntroOption2";
import IntroOption3 from "@/components/intro-preview/IntroOption3";
import PainpointOptionBento from "@/components/intro-preview/PainpointOptionBento";
import PainpointOptionSlider from "@/components/intro-preview/PainpointOptionSlider";
import PainpointOptionSheet from "@/components/intro-preview/PainpointOptionSheet";
import MockFundPreviewList from "@/components/intro-preview/MockFundPreviewList";

const OPTIONS = [
  {
    id: "bento",
    path: "/preview/intro-bento",
    title: "1. Bento: Beat Inflation Hero",
    badge: "⭐ 2026 Recommended",
    desc: "In-feed bank vs CMA MMF inflation comparison bars, trust signals (CMA, Custodians), and zero annoying modal pop-up.",
    component: PainpointOptionBento,
  },
  {
    id: "slider",
    path: "/preview/intro-slider",
    title: "2. Slider: Idle Cash Simulator",
    badge: "🧮 Instant 'Aha!'",
    desc: "Interactive balance slider showing real shillings left on the table between standard bank savings and top CMA MMFs.",
    component: PainpointOptionSlider,
  },
  {
    id: "sheet",
    path: "/preview/intro-sheet",
    title: "3. Sheet: 3-Step First-Visit Drawer",
    badge: "📱 Mobile-First",
    desc: "Non-blocking slide-up card with 3 bite-sized steps: the problem, the MMF solution, and daily verified data.",
    component: PainpointOptionSheet,
  },
  {
    id: "lifestyle",
    path: "/preview/intro-lifestyle",
    title: "Lifestyle Mockup: Hand-Held App Photo",
    badge: "Photo Composite",
    desc: "Your uploaded lifestyle photo with KenyaFundFinder dark mode UI, glowing green yield curves, and interactive filter chips.",
    component: IntroOptionLifestyle,
  },
  {
    id: "1",
    path: "/preview/intro-1",
    title: "Option 1: 3D Glassmorphism Fintech",
    badge: "Modern Luxury",
    desc: "Floating 3D isometric smartphone with glowing emerald yields, currency badges, and trust indicators.",
    component: IntroOption1,
  },
  {
    id: "2",
    path: "/preview/intro-2",
    title: "Option 2: High-Density Bento Command Strip",
    badge: "Market-Forward",
    desc: "Compact modular bento layout with live top yields, CBK benchmark, and quick filter chips.",
    component: IntroOption2,
  },
  {
    id: "3",
    path: "/preview/intro-3",
    title: "Option 3: Editorial 'Beat Inflation' Spotlight",
    badge: "High-Converting",
    desc: "Aspirational Nairobi tech skyline visual with bank vs MMF return comparison bars and quick quiz CTA.",
    component: IntroOption3,
  },
];

const PRESET_DEVICES = [
  { id: "mobile-frame", name: "iPhone 15 / Pixel 8 (393px)", width: "393px" },
  { id: "mobile-large", name: "Large Phone (428px)", width: "428px" },
  { id: "full", name: "Full Width (Responsive Desktop)", width: "100%" },
];

export default function IntroPreviewPage({ initialOption }: { initialOption?: string }) {
  const { optionId } = useParams();
  const activeId = initialOption || optionId || "lifestyle";

  const [selectedDevice, setSelectedDevice] = useState(PRESET_DEVICES[0]);
  const [activeTab, setActiveTab] = useState<string>(activeId);
  const [activeFilter, setActiveFilter] = useState<string>("All");

  const CurrentIntro =
    OPTIONS.find((o) => o.id === activeTab)?.component || IntroOptionLifestyle;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-16">
      {/* Top Controller Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 md:px-6 py-3.5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/funds"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Funds</span>
            </Link>
            <div className="h-4 w-px bg-slate-700" />
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <h1 className="text-sm font-bold text-white tracking-tight">
                Mobile Intro Studio & Lifestyle Mockup
              </h1>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                Isolated Preview
              </Badge>
            </div>
          </div>

          {/* Device Width Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">Viewport:</span>
            <div className="flex rounded-lg bg-slate-800 p-0.5 border border-slate-700/80">
              {PRESET_DEVICES.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDevice(d)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                    selectedDevice.id === d.id
                      ? "bg-emerald-500 text-slate-950 shadow-sm font-bold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {d.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Concept Switcher Tabs Bar */}
      <div className="bg-slate-900/60 border-b border-slate-800 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">
              Select Concept:
            </span>
            {OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setActiveTab(opt.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 border ${
                  activeTab === opt.id
                    ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-md font-bold"
                    : "bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600"
                }`}
              >
                <span>{opt.title.split(":")[0]}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded ${
                  activeTab === opt.id ? "bg-slate-950/20 text-slate-950" : "bg-slate-700 text-slate-300"
                }`}>
                  {opt.badge}
                </span>
              </button>
            ))}
          </div>

          {/* Direct link pills to each option */}
          <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
            <span>Direct links:</span>
            <Link to="/preview/intro-lifestyle" className="hover:text-emerald-400 underline font-mono text-[11px] text-emerald-400 font-semibold">/preview/intro-lifestyle</Link>
            <span>·</span>
            <Link to="/preview/intro-1" className="hover:text-emerald-400 underline font-mono text-[11px]">/preview/intro-1</Link>
            <span>·</span>
            <Link to="/preview/intro-2" className="hover:text-emerald-400 underline font-mono text-[11px]">/preview/intro-2</Link>
            <span>·</span>
            <Link to="/preview/intro-3" className="hover:text-emerald-400 underline font-mono text-[11px]">/preview/intro-3</Link>
          </div>
        </div>
      </div>

      {/* Main Preview Stage */}
      <main className="flex-1 flex flex-col items-center justify-start p-4 md:p-8">
        {/* Concept description callout */}
        <div className="w-full max-w-xl mb-6 text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-emerald-400">
            <Check className="h-3.5 w-3.5" />
            <span>Currently Viewing: <strong>{OPTIONS.find(o => o.id === activeTab)?.title}</strong></span>
          </div>
          <p className="text-xs text-slate-400">
            {OPTIONS.find(o => o.id === activeTab)?.desc}
          </p>
        </div>

        {/* Device Frame Simulation */}
        <div
          style={{ width: selectedDevice.width }}
          className={`transition-all duration-300 ${
            selectedDevice.id !== "full"
              ? "rounded-[36px] border-[8px] border-slate-800 bg-background shadow-2xl p-4 overflow-hidden relative ring-1 ring-slate-700/50"
              : "w-full max-w-5xl rounded-2xl border border-border bg-background p-4 md:p-6"
          }`}
        >
          {/* Simulated Mobile Speaker & Island if in phone frame */}
          {selectedDevice.id !== "full" && (
            <div className="w-28 h-4 bg-slate-800 rounded-full mx-auto mb-4 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-slate-950 mr-2" />
              <div className="w-10 h-1.5 rounded-full bg-slate-900" />
            </div>
          )}

          {/* Active Intro Component */}
          <div className="space-y-4">
            <CurrentIntro
              onSelectCategory={(cat) => setActiveFilter(cat)}
              activeCategory={activeFilter}
            />

            {/* Contextual list of fund cards underneath so the user sees the real feeling */}
            <MockFundPreviewList />
          </div>
        </div>

        {/* Side-by-Side Comparison Grid at the bottom */}
        <div className="mt-14 w-full max-w-6xl space-y-6 pt-8 border-t border-slate-800">
          <div className="text-center space-y-1">
            <h3 className="text-lg font-bold text-white flex items-center justify-center gap-2">
              <LayoutGrid className="h-5 w-5 text-emerald-400" />
              Side-by-Side Comparison of All 4 Concepts
            </h3>
            <p className="text-xs text-slate-400">
              Scroll across to compare layout, visual hierarchy, and CTA placement.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-400 px-1">
                <span>⭐ Hand-Held Lifestyle Photo Mockup</span>
                <Badge variant="outline" className="text-[10px] border-emerald-500/30 bg-emerald-500/10">Photo Composite</Badge>
              </div>
              <div className="rounded-xl border border-slate-800 bg-background p-3">
                <IntroOptionLifestyle />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-400 px-1">
                <span>1. 3D Glassmorphism Fintech</span>
                <Badge variant="outline" className="text-[10px] border-emerald-500/30">Luxury 3D</Badge>
              </div>
              <div className="rounded-xl border border-slate-800 bg-background p-3">
                <IntroOption1 />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-400 px-1">
                <span>2. Bento Command Strip</span>
                <Badge variant="outline" className="text-[10px] border-emerald-500/30">Data-Dense</Badge>
              </div>
              <div className="rounded-xl border border-slate-800 bg-background p-3">
                <IntroOption2 />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-400 px-1">
                <span>3. Beat Inflation Spotlight</span>
                <Badge variant="outline" className="text-[10px] border-emerald-500/30">Editorial</Badge>
              </div>
              <div className="rounded-xl border border-slate-800 bg-background p-3">
                <IntroOption3 />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
