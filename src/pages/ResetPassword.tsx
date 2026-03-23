import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: "Lösenord uppdaterat", description: "Du kan nu logga in med ditt nya lösenord." });
      await supabase.auth.signOut();
      navigate("/admin/login");
    } catch (err: any) {
      toast({ title: "Fel", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-bold text-foreground text-center mb-2">Nytt lösenord</h1>
        <p className="font-body text-sm text-muted-foreground text-center mb-8">
          {ready ? "Ange ditt nya lösenord nedan." : "Väntar på verifiering..."}
        </p>

        {ready ? (
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
            Om du inte omdirigerades automatiskt, klicka på länken i din e-post igen.
          </p>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
