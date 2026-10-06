import { useLocation } from "react-router-dom";
import ResearchContent from "@/components/ResearchContent";
import { RESEARCH_ARTICLES, articlePath, articleSeo } from "@/data/seoGrowthContent";
import NotFound from "./NotFound";

export default function ResearchArticlePage() {
  const { pathname } = useLocation();
  const article = RESEARCH_ARTICLES.find(a => articlePath(a) === pathname);
  return article ? <ResearchContent page={articleSeo(article)} /> : <NotFound />;
}
