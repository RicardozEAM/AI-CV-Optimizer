import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const steps = [
  {
    number: "01",
    title: "Diagnóstico Instantáneo",
    description: "Carga tu CV y la vacante. Nuestra IA detecta por qué los robots te descartan.",
  },
  {
    number: "02",
    title: "Preguntas de Personalización",
    description: "Respondemos 3 preguntas clave para extraer tus logros reales, sin inventar datos.",
  },
  {
    number: "03",
    title: "Tu CV Harvard Listo",
    description: "Descarga un documento blindado contra rechazos automáticos, optimizado al 100%.",
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
    <section ref={sectionRef} className="py-20 md:py-28">
      <div className="container">
        <div className={`text-center mb-16 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}>
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl text-balance">
            Cómo funciona
          </h2>
          <p className="mt-3 text-muted-foreground max-w-md mx-auto text-pretty">
            De un CV rechazado a uno aprobado por ATS en tres simples pasos
          </p>
        </div>

        <div className="mx-auto max-w-4xl grid gap-6 md:grid-cols-3">
          {steps.map((step, i) => (
            <div
              key={step.number}
              className={`relative glass-card rounded-2xl p-8 shadow-sm hover:shadow-md transition-all duration-500 group ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: visible ? `${i * 100 + 200}ms` : "0ms" }}
            >
              <span className="text-5xl font-black text-primary/10 absolute top-4 right-6">
                {step.number}
              </span>
              <div className="relative">
                <h3 className="font-bold text-foreground text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground text-pretty leading-relaxed">
                  {step.description}
                </p>
              </div>
              {i < steps.length - 1 && (
                <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ArrowRight className="h-3 w-3" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StepFlowSection;
