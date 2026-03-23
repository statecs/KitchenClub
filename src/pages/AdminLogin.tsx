import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const AdminLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({ title: "E-post skickad", description: "Kolla din inkorg för att återställa lösenordet." });
        setMode("login");
        return;
      }

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Ingen användare hittades");

      const { data: roleData } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!roleData) {
        await supabase.auth.signOut();
        throw new Error("Du har inte admin-behörighet");
      }

      navigate("/admin");
    } catch (err: any) {
      toast({
        title: mode === "signup" ? "Registrering misslyckades" : "Inloggning misslyckades",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-bold text-foreground text-center mb-2">Admin</h1>
        <p className="font-body text-sm text-muted-foreground text-center mb-8">
          {mode === "login" && "Logga in för att hantera bokningar"}
          {mode === "signup" && "Skapa ett nytt admin-konto"}
          {mode === "forgot" && "Ange din e-post för att återställa lösenordet"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="font-body text-sm">E-post</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1" />
          </div>
          {mode !== "forgot" && (
            <div>
              <Label className="font-body text-sm">Lösenord</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="mt-1" />
            </div>
          )}
          <Button type="submit" disabled={loading} className="w-full font-body font-semibold">
            {loading
              ? "Vänta..."
              : mode === "login"
              ? "Logga in"
              : mode === "signup"
              ? "Skapa konto"
              : "Skicka återställningslänk"}
          </Button>
        </form>

        <div className="mt-4 space-y-2 text-center">
          {mode === "login" && (
            <>
              <button
                onClick={() => setMode("forgot")}
                className="w-full font-body text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Glömt lösenord?
              </button>
              <button
                onClick={() => setMode("signup")}
                className="w-full font-body text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Inget konto? Registrera dig
              </button>
            </>
          )}
          {mode !== "login" && (
            <button
              onClick={() => setMode("login")}
              className="w-full font-body text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Tillbaka till inloggning
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
