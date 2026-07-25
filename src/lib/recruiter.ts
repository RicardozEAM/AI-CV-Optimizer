export interface Recruiter {
  name: string;
  email: string;
}

export const RECRUITERS: Recruiter[] = [
  { name: "Ricardo Aguero", email: "ricardo.aguero@techscreen.ai" },
  { name: "Lorena Diaz", email: "lorena.diaz@techscreen.ai" },
  { name: "Tania Rojas", email: "tania.rojas@techscreen.ai" },
  { name: "Angel Ramos", email: "angel.ramos@techscreen.ai" },
];

const STORAGE_KEY = "techscreen.activeRecruiterEmail";

export function getActiveRecruiter(): Recruiter {
  if (typeof window === "undefined") return RECRUITERS[0];
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return RECRUITERS.find((r) => r.email === stored) ?? RECRUITERS[0];
}

export function setActiveRecruiter(email: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, email);
  window.dispatchEvent(new CustomEvent("recruiter-changed", { detail: email }));
}
