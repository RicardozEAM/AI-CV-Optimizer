import { PhoneCall } from "lucide-react";
import type { ValidationQuestion } from "@/lib/types";

interface PhoneScreenGuideProps {
  questions: ValidationQuestion[];
}

const PhoneScreenGuide = ({ questions }: PhoneScreenGuideProps) => {
  if (!questions || questions.length === 0) return null;

  return (
    <div className="mx-auto max-w-5xl mt-8">
      <div className="glass-card rounded-2xl p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
            <PhoneCall className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Guía de Phone Screen</h3>
            <p className="text-xs text-muted-foreground">
              Preguntas sugeridas por la IA para validar el perfil durante la entrevista telefónica
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {questions.map((q, i) => (
            <div key={q.id ?? i} className="rounded-xl bg-secondary/60 p-5 border border-border/50">
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <div className="min-w-0 space-y-1.5">
                  <p className="text-sm font-medium text-foreground leading-snug">{q.question}</p>
                  {q.context && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground/80">Objetivo:</span> {q.context}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-[11px] text-muted-foreground text-center">
          Panel de solo lectura — úsalo como guion de referencia durante la llamada con el candidato.
        </p>
      </div>
    </div>
  );
};

export default PhoneScreenGuide;
