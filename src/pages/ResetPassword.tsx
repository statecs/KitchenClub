import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const token = searchParams.get("token");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/update-password', { token, password });
      toast({ title: "Lösenord uppdaterat", description: "Du kan nu logga in med ditt nya lösenord." });
      navigate("/admin/login");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Något gick fel";
      toast({ title: "Fel", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-bold text-foreground text-center mb-2">Nytt lösenord</h1>
        <p className="font-body text-sm text-muted-foreground text-center mb-8">
          {token ? "Ange ditt nya lösenord nedan." : "Ogiltig återställningslänk."}
        </p>

        {token ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="font-body text-sm">Nytt lösenord</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="mt-1" />
            </div>
            <Button type="submit" disabled={loading} className="w-full font-body font-semibold">
              {loading ? "Vänta..." : "Spara lösenord"}
            </Button>
          </form>
        ) : (
          <p className="font-body text-sm text-muted-foreground text-center">
            Klicka på länken i din e-post för att återställa ditt lösenord.
          </p>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
