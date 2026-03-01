import { Link } from "react-router-dom";
import { Lock, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuthGateProps {
  title?: string;
  description?: string;
}

const AuthGate = ({
  title = "Sign up to unlock full access",
  description = "Create a free account to view detailed fund information, use the investment calculator, and read full news articles.",
}: AuthGateProps) => {
  return (
    <div className="relative rounded-2xl border-2 border-dashed border-accent/30 bg-gradient-to-b from-accent/5 to-transparent p-8 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
        <Lock className="h-7 w-7 text-accent" />
      </div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">{description}</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full px-8">
          <Link to="/auth">
            <TrendingUp className="mr-2 h-4 w-4" /> Sign Up Free
          </Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full px-8">
          <Link to="/auth">Already have an account? Sign In</Link>
        </Button>
      </div>
    </div>
  );
};

export default AuthGate;
