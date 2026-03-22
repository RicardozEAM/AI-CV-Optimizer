import { Zap } from "lucide-react";

const Navbar = () => (
  <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
    <div className="container flex h-14 items-center justify-between">
      <a href="/" className="flex items-center gap-2 font-bold text-foreground">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Zap className="h-4 w-4 text-primary-foreground" />
        </div>
        CVOptimizer
      </a>
      <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
        <a href="#como-funciona" className="hover:text-foreground transition-colors">Cómo funciona</a>
        <a href="#resultados" className="hover:text-foreground transition-colors">Resultados</a>
      </nav>
    </div>
  </header>
);

export default Navbar;
