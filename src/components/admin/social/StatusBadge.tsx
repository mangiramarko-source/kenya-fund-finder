import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL } from "@/lib/social/contentTypes";

const COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  in_review: "bg-yellow-500/20 text-yellow-400",
  approved: "bg-blue-500/20 text-blue-400",
  scheduled: "bg-purple-500/20 text-purple-400",
  posted: "bg-green-500/20 text-green-400",
  manually_posted: "bg-green-500/20 text-green-400",
  failed: "bg-red-500/20 text-red-400",
  cancelled: "bg-muted text-muted-foreground line-through",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={`${COLORS[status] ?? ""} border-0`}>
      {STATUS_LABEL[status] ?? status}
    </Badge>
  );
}
