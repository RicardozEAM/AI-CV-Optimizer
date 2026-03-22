import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ValidationQuestion } from "@/lib/types";

const MIN_CHARS = 50;

interface ValidationQuestionsFormProps {
  questions: ValidationQuestion[];
  onSubmit: (answers: Record<string, string>) => void;
  isSubmitting: boolean;
}

const ValidationQuestionsForm = ({ questions, onSubmit, isSubmitting }: ValidationQuestionsFormProps) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const allAnswered = questions.every((q) => (answers[q.id]?.trim().length ?? 0) >= MIN_CHARS);

  const handleSubmit = () => {
    if (allAnswered) onSubmit(answers);
  };

  return (
    <div className="mx-auto max-w-5xl mt-8 transition-all duration-700 opacity-100 translate-y-0">
      <div className="glass-card rounded-2xl p-8 shadow-sm">
        <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
          Paso 2 · Preguntas de Validación
        </h3>
        <p className="text-sm text-muted-foreground mb-8">
          Responde estas 3 preguntas para que la IA pueda recalcular tu score y generar un CV Harvard optimizado.
        </p>

        <div className="space-y-6">
          {questions.map((vq, i) => {
            const len = answers[vq.id]?.trim().length ?? 0;
            const isValid = len >= MIN_CHARS;
            return (
              <div key={vq.id} className="rounded-xl bg-secondary/60 p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground mb-1">{vq.question}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold">¿Por qué?</span> {vq.why_critical}
                    </p>
                  </div>
                </div>
                <Textarea
                  value={answers[vq.id] || ""}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [vq.id]: e.target.value }))}
                  placeholder="Escribe tu respuesta aquí (mínimo 50 caracteres)..."
                  className="mt-2 bg-background/60 border-input/50 focus:ring-primary/30 min-h-[80px] resize-none text-sm"
                  disabled={isSubmitting}
                />
                <div className="flex justify-end mt-1.5">
                  <span className={`text-[11px] tabular-nums ${isValid ? "text-success" : "text-muted-foreground"}`}>
                    {len}/{MIN_CHARS} caracteres
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col items-center gap-3">
          <Button
            disabled={!allAnswered || isSubmitting}
            onClick={handleSubmit}
            className={`h-12 px-8 rounded-xl text-base font-semibold transition-all duration-300 ${
              allAnswered && !isSubmitting
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:bg-primary/90 ring-2 ring-primary/20 animate-pulse-subtle"
                : "bg-primary text-primary-foreground opacity-60"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Recalculando y generando CV...
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                Generar CV Harvard Optimizado
              </>
            )}
          </Button>
          {!allAnswered && (
            <p className="text-xs text-muted-foreground">Responde las 3 preguntas (mín. 50 caracteres cada una)</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ValidationQuestionsForm;
