import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

export default function SocialAnalytics() {
  const events = useQuery({
    queryKey: ["social-analytics"],
    queryFn: async () => {
      const { data } = await supabase.from("social_post_analytics").select("event, platform, content_type").limit(2000);
      return data ?? [];
    },
  });

  const countBy = (key: "event" | "platform" | "content_type") => {
    const m: Record<string, number> = {};
    for (const e of events.data ?? []) {
      const k = (e as any)[key] ?? "(unknown)";
      m[k] = (m[k] ?? 0) + 1;
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  };

  const block = (title: string, rows: [string, number][]) => (
    <Card className="p-4">
      <h3 className="font-semibold mb-3">{title}</h3>
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">No data yet.</p> : (
        <table className="w-full text-sm">
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k} className="border-b border-border last:border-0">
                <td className="py-1">{k}</td>
                <td className="py-1 text-right font-mono">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );

  return (
    <div className="grid md:grid-cols-3 gap-4">
      {block("By event", countBy("event"))}
      {block("By platform", countBy("platform"))}
      {block("By content type", countBy("content_type"))}
    </div>
  );
}
