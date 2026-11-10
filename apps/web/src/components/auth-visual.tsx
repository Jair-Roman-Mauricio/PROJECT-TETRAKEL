import Image from "next/image";
export function AuthVisual() {
  return (
    <aside className="auth-visual" aria-hidden="true">
      <Image
        className="hero-image"
        src="/brand/hero.webp"
        alt=""
        fill
        priority
        sizes="(max-width: 1000px) 0px, 55vw"
      />
      <Image
        className="hero-image hero-lit"
        src="/brand/hero.webp"
        alt=""
        fill
        sizes="(max-width: 1000px) 0px, 55vw"
      />
      <div className="headline">
        <h2>
          <span className="w1" style={{ animationDelay: "300ms" }}>
            Cada pieza,
          </span>{" "}
          <span className="w2" style={{ animationDelay: "750ms" }}>
            en su
          </span>{" "}
          <span className="w3" style={{ animationDelay: "1200ms" }}>
            lugar exacto
          </span>
        </h2>
        <strong className="glow-phrase">Ubica - Cuenta - Controla</strong>
      </div>
    </aside>
  );
}
