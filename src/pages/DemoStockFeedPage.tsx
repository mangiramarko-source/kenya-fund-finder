import React, { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { DemoSocialFeed } from "@/components/feed/DemoSocialFeed";
import { useSocialFeed } from "@/hooks/useSocialFeed";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchPublishedNews, type NewsFromDB } from "@/lib/api";

export default function DemoStockFeedPage() {
  const [news, setNews] = useState<NewsFromDB[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublishedNews()
      .then((data) => {
        setNews(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const items = useSocialFeed(news, [], [], []);
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="bg-black min-h-screen text-white">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-black/90 backdrop-blur-md border-b border-[#2D2D2D] px-4 py-3 flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-gray-400 hover:text-white"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold">Simply Wall St Feed Demo</h1>
        </div>

        {/* Note about Demo */}
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-3 text-sm text-yellow-500/90">
          This is a mobile-first UI preview. Resizing to a mobile width is recommended.
        </div>

        {/* Feed Content */}
        <div className="max-w-xl mx-auto w-full">
          <DemoSocialFeed items={items} loading={loading} />
        </div>
      </div>
    </Layout>
  );
}
