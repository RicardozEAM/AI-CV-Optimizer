import { ArrowRight, Search, MessageSquare, FileCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const steps = [
  {
    icon: Search,
    number: "01",
    title: "Análisis del perfil",
    description: "Sube el CV del candidato y la vacante. La IA detecta match, brechas y keywords faltantes para el rol.",
  },
  {
    icon: MessageSquare,
    number: "02",
    title: "Guía de Phone Screen",
    description: "Recibe preguntas sugeridas por la IA para validar el perfil durante la entrevista telefónica.",
  },
  {
    icon: FileCheck,
    number: "03",
    title: "CV estandarizado",
    description: "Descarga el CV en formato Harvard, listo para presentar a gerencia y clientes.",
  },
];

const StepFlowSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.2 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-16 md:py-24 border-b border-border">
      <div className="container relative">
        <div className={`text-center mb-16 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-4 py-1.5 text-xs font-medium text-primary mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Flujo del reclutador
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl text-balance">
            Cómo funciona
          </h2>
          <p className="mt-3 text-muted-foreground max-w-md mx-auto text-pretty">
            De un CV crudo a un perfil estandarizado listo para presentar, en tres pasos.
          </p>
        </div>

        <div className="mx-auto max-w-4xl grid gap-6 md:grid-cols-3">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className={`relative card-lift glass-card rounded-2xl p-8 group ${
                  visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: visible ? `${i * 120 + 200}ms` : "0ms", transition: "opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1)" }}
              >
                {/* Step number watermark */}
                <span className="text-5xl font-black absolute top-4 right-6 select-none text-secondary-foreground">
                  {step.number}
                </span>

                {/* Icon */}
                <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-secondary mb-5 transition-colors group-hover:bg-accent group-hover:border-primary/30">
                  <Icon className="h-5 w-5 text-primary" />
                </div>

                <div className="relative">
                  <h3 className="font-bold text-foreground text-lg mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground text-pretty leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Connector arrow */}
                {i < steps.length - 1 && (
                  <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors group-hover:border-primary/40 group-hover:text-primary">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default StepFlowSection;