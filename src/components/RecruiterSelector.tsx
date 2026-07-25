import { useEffect, useState } from "react";
import { UserCircle2 } from "lucide-react";
import { RECRUITERS, getActiveRecruiter, setActiveRecruiter } from "@/lib/recruiter";

const RecruiterSelector = () => {
  const [email, setEmail] = useState(() => getActiveRecruiter().email);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail) setEmail(detail);
    };
    window.addEventListener("recruiter-changed", handler);
    return () => window.removeEventListener("recruiter-changed", handler);
  }, []);

  return (
    <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
      <UserCircle2 className="h-4 w-4 text-primary" />
      <span className="hidden sm:inline">Reclutador:</span>
      <select
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setActiveRecruiter(e.target.value);
        }}
        className="bg-transparent text-foreground focus:outline-none cursor-pointer"
        aria-label="Reclutador activo"
      >
        {RECRUITERS.map((r) => (
          <option key={r.email} value={r.email}>
            {r.name}
          </option>
        ))}
      </select>
    </label>
  );
};

export default RecruiterSelector;
