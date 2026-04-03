import { Zap } from "lucide-react";

const Navbar = () => (
  <header className="sticky top-0 z-50 border-b border-border/40 bg-background/75 backdrop-blur-xl">
    <div className="container flex h-14 items-center justify-between">
      <a href="/" className="flex items-center gap-2.5 font-bold text-foreground group">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 transition-all duration-300 group-hover:bg-primary/15 group-hover:border-primary/40">
          <Zap className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-sm font-semibold tracking-tight">
          CV<span className="text-primary">Optimizer</span>
        </span>
      </a>
      <nav className="hidden md:flex items-center gap-1 text-sm text-muted-foreground">
        <a
          href="#como-funciona"
          className="px-3 py-1.5 rounded-lg hover:text-foreground hover:bg-secondary/80 transition-all duration-200"
        >
          Cómo funciona
        </a>
        <a
          href="#resultados"
          className="px-3 py-1.5 rounded-lg hover:text-foreground hover:bg-secondary/80 transition-all duration-200"
        >
          Resultados
        </a>
      </nav>
    </div>
  </header>
);

export default Navbar;
