import { useState } from "react";
import { Shield, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface PaymentModalProps {
  open: boolean;
  projectedScore: number;
  onClose: () => void;
  onPaymentSuccess: () => void;
}

const PaymentModal = ({ open, projectedScore, onClose, onPaymentSuccess }: PaymentModalProps) => {
  const [isPaying, setIsPaying] = useState(false);

  const handlePay = async () => {
    setIsPaying(true);
    // Simulate payment processing
    await new Promise((r) => setTimeout(r, 1800));
    setIsPaying(false);
    onPaymentSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !isPaying) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-xl font-bold">¡Tu CV Blindado está listo!</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-muted-foreground text-pretty">
            Hemos integrado tus logros y optimizado el formato para superar los filtros ATS.
            El score proyectado es de <span className="font-bold text-primary">{projectedScore}%</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 rounded-xl bg-secondary/60 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            Formato Harvard certificado
          </div>
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            Keywords integradas orgánicamente
          </div>
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            Viñetas con métricas de impacto
          </div>
        </div>

        <Button
          onClick={handlePay}
          disabled={isPaying}
          className="mt-5 w-full h-12 rounded-xl text-base font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 hover:bg-primary/90 active:scale-[0.97] transition-all"
        >
          {isPaying ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Procesando pago...
            </>
          ) : (
            "Desbloquear y Descargar por S/ 5.00"
          )}
        </Button>

        <p className="text-center text-[11px] text-muted-foreground mt-1">
          Pago seguro · Acceso inmediato al CV optimizado
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;
