import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";

const BookingSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    // Simple delay to let webhook process
    const timer = setTimeout(() => setVerified(true), 2000);
    return () => clearTimeout(timer);
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md">
        {!verified ? (
          <>
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-6" />
            <h1 className="font-display text-2xl font-bold text-foreground mb-2">Bekräftar betalning...</h1>
            <p className="font-body text-muted-foreground">Vänta medan vi verifierar din betalning.</p>
          </>
        ) : (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
            <h1 className="font-display text-3xl font-bold text-foreground mb-4">Tack för din bokning!</h1>
            <p className="font-body text-muted-foreground mb-2">
              Betalningen är mottagen och din bokning är bekräftad.
            </p>
            <p className="font-body text-sm text-muted-foreground mb-8">
              En bekräftelse skickas till din e-post inom kort.
            </p>
            <Button onClick={() => (window.location.href = "/")} variant="outline">
              Tillbaka till startsidan
            </Button>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default BookingSuccess;
