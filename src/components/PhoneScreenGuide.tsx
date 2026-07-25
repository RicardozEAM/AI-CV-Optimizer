import { PhoneCall, Loader2, Sparkles } from "lucide-react";
import { useState, useMemo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { ValidationQuestion } from "@/lib/types";

interface PhoneScreenGuideProps {
  questions: ValidationQuestion[];
  /** When provided, the guide becomes editable and shows a submit button. */
  onSubmitAnswers?: (answers: Record<string, string>) => void;
  isSubmitting?: boolean;
  /** When true, the answers are locked (already sent). */
  locked?: boolean;
  submittedAnswers?: Record<string, string> | null;
}

const MIN_CHARS = 20;

const PhoneScreenGuide = ({
  questions,
  onSubmitAnswers,
  isSubmitting = false,
  locked = false,
  submittedAnswers = null,
}: PhoneScreenGuideProps) => {
  const [answers, setAnswers] = useState<Record<string, string>>(() => submittedAnswers ?? {});

  const editable = Boolean(onSubmitAnswers) && !locked;

  const canSubmit = useMemo(() => {
    if (!editable) return false;
    return questions.every((q) => (answers[String(q.id)] ?? "").trim().length >= MIN_CHARS);
  }, [answers, questions, editable]);

  if (!questions || questions.length === 0) return null;

  const handleChange = (id: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [String(id)]: value }));
  };

  const handleSubmit = () => {
    if (!onSubmitAnswers || !canSubmit) return;
    onSubmitAnswers(answers);
  };

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
              {editable
                ? "Registra las respuestas del candidato para enriquecer el CV Harvard y mejorar el score."
                : locked
                ? "Respuestas registradas — se usaron para generar el CV Harvard."
                : "Preguntas sugeridas por la IA para validar el perfil durante la entrevista telefónica"}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {questions.map((q, i) => {
            const value = answers[String(q.id)] ?? "";
            const remaining = Math.max(0, MIN_CHARS - value.trim().length);
            return (
              <div key={q.id ?? i} className="rounded-xl bg-secondary/60 p-5 border border-border/50">
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div className="min-w-0 space-y-1.5 flex-1">
                    <p className="text-sm font-medium text-foreground leading-snug">{q.question}</p>
                    {q.context && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground/80">Objetivo:</span> {q.context}
                      </p>
                    )}

                    {editable ? (
                      <div className="pt-2">
                        <Textarea
                          value={value}
                          onChange={(e) => handleChange(q.id, e.target.value)}
                          placeholder="Registra aquí la respuesta del candidato..."
                          rows={3}
                          className="text-sm"
                          disabled={isSubmitting}
                        />
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {remaining > 0
                            ? `Faltan ${remaining} caracteres para habilitar el envío.`
                            : "Respuesta lista."}
                        </p>
                      </div>
                    ) : locked && submittedAnswers?.[String(q.id)] ? (
                      <div className="mt-2 rounded-lg border border-border/40 bg-background/60 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-primary/70 mb-1">
                          Respuesta del candidato
                        </p>
                        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                          {submittedAnswers[String(q.id)]}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {editable ? (
          <div className="mt-6 flex flex-col items-center gap-2">
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              size="lg"
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generando CV Harvard...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generar CV Harvard con respuestas
                </>
              )}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">
              Las respuestas se sumarán al análisis para mejorar el score y enriquecer el CV estandarizado.
            </p>
          </div>
        ) : (
          <p className="mt-6 text-[11px] text-muted-foreground text-center">
            {locked
              ? "Guía cerrada — el CV Harvard se generó con estas respuestas."
              : "Panel de solo lectura — úsalo como guion de referencia durante la llamada con el candidato."}
          </p>
        )}
      </div>
    </div>
  );
};

export default PhoneScreenGuide;
