import React, { useState } from 'react';
import { cn } from "@/lib/utils";

interface ActionItem {
  date: string;
  symbol: string;
  companyName: string;
}

interface CorporateActionCardProps {
  earnings: ActionItem[];
  dividends: ActionItem[];
}

export function CorporateActionCard({ earnings, dividends }: CorporateActionCardProps) {
  const [activeTab, setActiveTab] = useState<'earnings' | 'dividends'>('earnings');

  const items = activeTab === 'earnings' ? earnings : dividends;

  return (
    <div className="rounded-xl bg-[#1A1A1A] border border-[#2D2D2D] overflow-hidden shadow-sm my-4 text-white" onClick={(e) => e.stopPropagation()}>
      {/* Tabs */}
      <div className="flex border-b border-[#2D2D2D]">
        <button
          onClick={(e) => { e.stopPropagation(); setActiveTab('earnings'); }}
          className={cn(
            "flex-1 py-3 px-4 text-sm font-semibold transition-colors relative outline-none",
            activeTab === 'earnings' ? "text-white" : "text-gray-400 hover:text-gray-200"
          )}
        >
          Earning Release
          {activeTab === 'earnings' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
          )}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setActiveTab('dividends'); }}
          className={cn(
            "flex-1 py-3 px-4 text-sm font-semibold transition-colors relative outline-none",
            activeTab === 'dividends' ? "text-white" : "text-gray-400 hover:text-gray-200"
          )}
        >
          Ex-dividend
          {activeTab === 'dividends' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
          )}
        </button>
      </div>

      {/* List */}
      <div className="flex flex-col">
        {items.length === 0 ? (
          <div className="p-5 text-sm text-gray-400 text-center">No upcoming events.</div>
        ) : (
          items.map((item, idx) => (
            <div 
              key={idx} 
              className={cn(
                "flex items-center px-5 py-4 gap-4",
                idx !== items.length - 1 && "border-b border-[#2D2D2D]/50"
              )}
            >
              <div className="text-sm font-medium text-white w-16">{item.date}</div>
              <div className="text-sm font-bold text-yellow-500 w-12">{item.symbol}</div>
              <div className="text-sm text-gray-300 truncate">{item.companyName}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
