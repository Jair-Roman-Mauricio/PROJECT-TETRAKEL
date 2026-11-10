"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Access } from "./access";
import { AuthVisual } from "./auth-visual";
import { AuthShellContext, type ShellMeta } from "./auth-shell-context";
import { Registration } from "./registration";

type Mode = "login" | "register";
type Phase = "idle" | "out" | "in";
const defaults: Record<Mode, ShellMeta> = {
  login: {
    title: "Accede a tu empresa",
    description: "Consulta el inventario y trabaja con tu equipo.",
  },
  register: {
    title: "Registra tu empresa",
    description:
      "Crea tu espacio de trabajo y la primera cuenta de administrador.",
  },
};
const OUT_MS = 620;
const reduced = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function indexFields(node: HTMLElement) {
  const fields = Array.from(node.querySelectorAll<HTMLElement>(".field"));
  node.style.setProperty("--n", String(fields.length));
  fields.forEach((field, index) => {
    field.style.setProperty("--i", String(index));
    field
      .querySelector<HTMLElement>(".control")
      ?.style.setProperty("--i", String(index));
  });
  return fields;
}

/**
 * The sign-in and registration screens share one persistent frame. When the
 * route changes, only the form is rebuilt: the old rows fold away, the new
 * ones are split off the last row and their names decode into place.
 */
export function AuthShell() {
  const pathname = usePathname(),
    target: Mode = pathname.startsWith("/registro") ? "register" : "login",
    [shown, setShown] = useState<Mode>(target),
    [phase, setPhase] = useState<Phase>("idle"),
    [morphed, setMorphed] = useState(false),
    [meta, setMeta] = useState<ShellMeta>(defaults[target]),
    panel = useRef<HTMLElement>(null),
    previous = useRef({ count: 0 }),
    context = useMemo(() => ({ setMeta }), []);

  useEffect(() => {
    if (target === shown) {
      setPhase((current) => (current === "out" ? "idle" : current));
      return;
    }
    const node = panel.current;
    if (reduced() || !node) {
      setShown(target);
      setMeta(defaults[target]);
      return;
    }
    const rows = node.querySelectorAll<HTMLElement>(
      ".field, form > .button, form > .auth-links",
    );
    rows.forEach((row, index) =>
      row.style.setProperty("--k", String(rows.length - index)),
    );
    previous.current = { count: node.querySelectorAll(".field").length };
    setPhase("out");
    const timer = window.setTimeout(() => {
      setMeta(defaults[target]);
      setShown(target);
      setMorphed(true);
      setPhase("in");
    }, OUT_MS);
    return () => window.clearTimeout(timer);
  }, [target, shown]);

  useLayoutEffect(() => {
    const node = panel.current;
    if (!node) return;
    const observer = new MutationObserver(() => indexFields(node));
    observer.observe(node, { childList: true, subtree: true });
    const fields = indexFields(node);
    if (phase !== "in") return () => observer.disconnect();
    const { count } = previous.current,
      anchor = fields[Math.min(count, fields.length) - 1] ?? fields[0];
    fields.forEach((field, index) => {
      if (anchor && index >= count)
        field.style.setProperty(
          "--from",
          Math.max(0, field.offsetTop - anchor.offsetTop) + "px",
        );
      else field.style.removeProperty("--from");
    });
    const done = window.setTimeout(
      () => setPhase("idle"),
      900 + fields.length * 110,
    );
    return () => {
      observer.disconnect();
      window.clearTimeout(done);
    };
  }, [shown, phase]);

  return (
    <AuthShellContext.Provider value={context}>
      <div className="auth-split">
        <div className="auth-main">
          <Link className="brand" href="/acceso">
            <Image
              className="brand-logo"
              src="/brand/logo-horizontal.png"
              alt="Tetrakel"
              width={756}
              height={160}
              priority
            />
          </Link>
          <main
            ref={panel}
            data-shell=""
            data-phase={phase}
            data-morphed={morphed ? "" : undefined}
            className={"auth-panel" + (shown === "register" ? " wide" : "")}
          >
            <div className="auth-heading">
              <h1>{meta.title}</h1>
              <p className="muted">{meta.description}</p>
            </div>
            {shown === "register" ? (
              <Registration key="register" />
            ) : (
              <Access key="login" />
            )}
          </main>
        </div>
        <AuthVisual />
      </div>
    </AuthShellContext.Provider>
  );
}
