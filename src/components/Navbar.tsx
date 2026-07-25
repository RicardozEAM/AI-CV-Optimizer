import { Zap, LineChart, ScanSearch } from "lucide-react";
import { NavLink, Link } from "react-router-dom";
import RecruiterSelector from "./RecruiterSelector";

const Navbar = () => {
  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
      isActive
        ? "bg-primary/12 text-primary border border-primary/25"
        : "text-muted-foreground border border-transparent hover:text-foreground hover:bg-secondary/80"
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/75 backdrop-blur-xl">
      <div className="container flex h-14 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2.5 font-bold text-foreground group shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 transition-all duration-300 group-hover:bg-primary/15 group-hover:border-primary/40">
            <Zap className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold tracking-tight whitespace-nowrap">
            TechScreen AI <span className="text-muted-foreground">·</span>{" "}
            <span className="text-primary">TA Portal</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1.5">
          <NavLink to="/" end className={tabClass}>
            <ScanSearch className="h-4 w-4" />
            <span className="hidden sm:inline">Analizador de Perfiles</span>
            <span className="sm:hidden">Analizador</span>
          </NavLink>
          <NavLink to="/dashboard" className={tabClass}>
            <LineChart className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard ROI</span>
            <span className="sm:hidden">ROI</span>
          </NavLink>
          <div className="ml-2 hidden md:block">
            <RecruiterSelector />
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
