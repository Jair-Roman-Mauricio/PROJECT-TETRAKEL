"use client";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import type { UseFormRegisterReturn } from "react-hook-form";
import { Field } from "@almacen/ui";

const fallback = [
  "America/Lima",
  "America/Bogota",
  "America/Mexico_City",
  "America/Santiago",
  "America/Argentina/Buenos_Aires",
  "America/Sao_Paulo",
  "Europe/Madrid",
  "UTC",
];
function allZones(): string[] {
  try {
    const list = Intl.supportedValuesOf("timeZone");
    return list.length ? list : fallback;
  } catch {
    return fallback;
  }
}
const offsets = new Map<string, string>();
function offsetOf(zone: string) {
  const known = offsets.get(zone);
  if (known !== undefined) return known;
  let text = "";
  try {
    text =
      new Intl.DateTimeFormat("en", {
        timeZone: zone,
        timeZoneName: "shortOffset",
      })
        .formatToParts(new Date())
        .find((part) => part.type === "timeZoneName")?.value ?? "";
  } catch {
    /* A zone the runtime cannot format simply has no offset label. */
  }
  offsets.set(zone, text);
  return text;
}
type Phase = "closed" | "open" | "closing";
interface Geometry {
  modal: { left: number; top: number; width: number; height: number };
  beam: {
    origin: { x: number; y: number };
    top: number;
    bottom: number;
    edge: number;
  } | null;
}

function measure(trigger: HTMLElement): Geometry {
  const rect = trigger.getBoundingClientRect(),
    vw = window.innerWidth,
    vh = window.innerHeight,
    width = Math.min(520, vw - 32),
    height = Math.min(540, vh - 64),
    split = vw >= 1000,
    // Wide screens project the hologram over the image half; narrow ones
    // centre it on the viewport.
    left = split
      ? Math.min(vw - width - 24, Math.max(vw / 2 + 24, vw * 0.75 - width / 2))
      : (vw - width) / 2,
    top = (vh - height) / 2;
  const startX = rect.right,
    startY = rect.top + rect.height / 2;
  const beam =
    split && left > startX + 48
      ? {
          origin: { x: startX, y: startY },
          top: top + 18,
          bottom: top + height - 18,
          edge: left,
        }
      : null;
  return { modal: { left, top, width, height }, beam };
}

function Beam({ beam }: { beam: NonNullable<Geometry["beam"]> }) {
  const { origin, top, bottom, edge } = beam,
    dist = edge - origin.x,
    rays = Array.from({ length: 11 }, (_, index) => {
      const t = index / 10;
      return top + (bottom - top) * t;
    }),
    cone =
      origin.x +
      "," +
      (origin.y - 5) +
      " " +
      edge +
      "," +
      top +
      " " +
      edge +
      "," +
      bottom +
      " " +
      origin.x +
      "," +
      (origin.y + 5);
  return (
    <svg
      className="holo-beam"
      aria-hidden="true"
      width="100%"
      height="100%"
      style={{ "--dist": dist + "px" } as CSSProperties}
    >
      <defs>
        <linearGradient
          id="beam-fill"
          gradientUnits="userSpaceOnUse"
          x1={origin.x}
          y1="0"
          x2={edge}
          y2="0"
        >
          <stop offset="0" stopColor="#d1fae5" stopOpacity="0.95" />
          <stop offset="0.18" stopColor="#34d399" stopOpacity="0.55" />
          <stop offset="1" stopColor="#059669" stopOpacity="0.12" />
        </linearGradient>
        <linearGradient
          id="beam-ray"
          gradientUnits="userSpaceOnUse"
          x1={origin.x}
          y1="0"
          x2={edge}
          y2="0"
        >
          <stop offset="0" stopColor="#ecfdf5" stopOpacity="0.95" />
          <stop offset="1" stopColor="#34d399" stopOpacity="0.25" />
        </linearGradient>
        <linearGradient id="beam-band" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#a7f3d0" stopOpacity="0" />
          <stop offset="0.7" stopColor="#a7f3d0" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ecfdf5" stopOpacity="0.9" />
        </linearGradient>
        <clipPath id="beam-clip">
          <polygon points={cone} />
        </clipPath>
        <filter id="beam-bloom" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>
      <polygon
        className="holo-beam-bloom"
        points={cone}
        fill="url(#beam-fill)"
        filter="url(#beam-bloom)"
      />
      <polygon points={cone} fill="url(#beam-fill)" />
      <g clipPath="url(#beam-clip)">
        {rays.map((y, index) => (
          <line
            key={index}
            className="holo-ray"
            style={{ animationDelay: index * 90 + "ms" }}
            x1={origin.x}
            y1={origin.y}
            x2={edge}
            y2={y}
            stroke="url(#beam-ray)"
            strokeWidth={index % 5 === 0 ? 1.4 : 0.8}
          />
        ))}
        {[0, 1, 2].map((index) => (
          <rect
            key={index}
            className="holo-band"
            style={{ animationDelay: index * 620 + "ms" }}
            x={origin.x}
            y="0"
            width="70"
            height="100%"
            fill="url(#beam-band)"
          />
        ))}
      </g>
      <polyline
        className="holo-edge"
        points={[
          edge + "," + top,
          origin.x + "," + (origin.y - 5),
          origin.x + "," + (origin.y + 5),
          edge + "," + bottom,
        ].join(" ")}
        fill="none"
        stroke="#a7f3d0"
        strokeWidth="1.5"
      />
      <g className="holo-emitter">
        <circle
          cx={origin.x}
          cy={origin.y}
          r="18"
          fill="#34d399"
          opacity="0.25"
        />
        <circle className="holo-ring" cx={origin.x} cy={origin.y} r="10" />
        <circle className="holo-ring r2" cx={origin.x} cy={origin.y} r="10" />
        <circle cx={origin.x} cy={origin.y} r="4.5" fill="#ecfdf5" />
      </g>
    </svg>
  );
}

export function HoloZoneField({
  label,
  hint,
  error,
  value,
  registration,
  onPick,
}: {
  label: string;
  hint?: string;
  error?: string | undefined;
  value: string;
  registration: UseFormRegisterReturn;
  onPick: (zone: string) => void;
}) {
  const trigger = useRef<HTMLInputElement | null>(null),
    search = useRef<HTMLInputElement | null>(null),
    listId = useId(),
    [phase, setPhase] = useState<Phase>("closed"),
    [query, setQuery] = useState(""),
    [active, setActive] = useState(0),
    [geometry, setGeometry] = useState<Geometry | null>(null),
    zones = useMemo(allZones, []),
    list = useMemo(() => {
      const needle = query.trim().toLowerCase().replace(/\s+/g, "_");
      return needle
        ? zones.filter((zone) => zone.toLowerCase().includes(needle))
        : zones;
    }, [zones, query]);

  function open() {
    const element = trigger.current;
    if (!element || phase === "open") return;
    setGeometry(measure(element));
    setQuery("");
    setActive(Math.max(0, zones.indexOf(value)));
    setPhase("open");
  }
  function close(restoreFocus = true) {
    if (phase !== "open") return;
    setPhase("closing");
    if (restoreFocus) trigger.current?.focus({ preventScroll: true });
  }
  function pick(zone: string) {
    onPick(zone);
    close();
  }
  useEffect(() => {
    if (phase !== "closing") return;
    const timer = window.setTimeout(() => setPhase("closed"), 240);
    return () => window.clearTimeout(timer);
  }, [phase]);
  useEffect(() => {
    if (phase !== "open") return;
    search.current?.focus({ preventScroll: true });
    const resize = () => setGeometry(measure(trigger.current as HTMLElement));
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [phase]);
  useEffect(() => {
    if (phase !== "open") return;
    document
      .getElementById(listId + "-" + active)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, phase, listId]);
  useEffect(() => {
    if (phase !== "open") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [phase]);

  function fieldKeys(event: KeyboardEvent<HTMLInputElement>) {
    if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      open();
    }
  }
  function modalKeys(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((index) =>
        Math.min(Math.max(index + step, 0), Math.max(list.length - 1, 0)),
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      const zone = list[active];
      if (zone) pick(zone);
    } else if (event.key === "Tab") {
      // Keep keyboard focus inside the dialog while it is projected.
      event.preventDefault();
      search.current?.focus();
    }
  }
  function typed(event: ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value);
    setActive(0);
  }

  return (
    <>
      <Field
        label={label}
        required
        readOnly
        spellCheck={false}
        autoComplete="off"
        aria-haspopup="dialog"
        aria-expanded={phase === "open"}
        name={registration.name}
        ref={(element: HTMLInputElement | null) => {
          trigger.current = element;
          registration.ref(element);
        }}
        onChange={(event) => void registration.onChange(event)}
        onBlur={(event) => void registration.onBlur(event)}
        onClick={open}
        onKeyDown={fieldKeys}
        error={error}
        {...(hint ? { hint } : {})}
      />
      {phase !== "closed" && geometry
        ? createPortal(
            <div
              className="holo-layer"
              data-phase={phase}
              style={
                geometry.beam
                  ? ({
                      "--ox": geometry.beam.origin.x + "px",
                      "--oy": geometry.beam.origin.y + "px",
                    } as CSSProperties)
                  : undefined
              }
            >
              <div
                className="holo-backdrop"
                aria-hidden="true"
                onMouseDown={() => close()}
              />
              {geometry.beam ? <Beam beam={geometry.beam} /> : null}
              <div
                className="holo-panel"
                role="dialog"
                aria-modal="true"
                aria-label={label}
                style={{
                  left: geometry.modal.left,
                  top: geometry.modal.top,
                  width: geometry.modal.width,
                  height: geometry.modal.height,
                }}
                onKeyDown={modalKeys}
              >
                <div className="holo-surface">
                  <div className="holo-head">
                    <span>
                      <i aria-hidden="true" /> {label}
                    </span>
                    <button
                      type="button"
                      className="holo-close"
                      aria-label="Cerrar"
                      onClick={() => close()}
                    >
                      <svg
                        viewBox="0 0 16 16"
                        width="14"
                        height="14"
                        aria-hidden="true"
                      >
                        <path d="M3 3l10 10M13 3L3 13" />
                      </svg>
                    </button>
                  </div>
                  <div className="holo-search">
                    <input
                      ref={search}
                      type="text"
                      value={query}
                      onChange={typed}
                      placeholder="Buscar país o ciudad…"
                      aria-label="Buscar zona horaria"
                      aria-controls={listId}
                      aria-activedescendant={listId + "-" + active}
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <em aria-live="polite">{list.length}</em>
                  </div>
                  <ul id={listId} role="listbox" aria-label={label}>
                    {list.map((zone, index) => (
                      <li
                        key={zone}
                        id={listId + "-" + index}
                        role="option"
                        aria-selected={zone === value}
                        data-active={index === active ? "" : undefined}
                        style={
                          {
                            "--d": Math.min(index, 9) * 32 + "ms",
                          } as CSSProperties
                        }
                        onMouseEnter={() => setActive(index)}
                        onClick={() => pick(zone)}
                      >
                        <span>{zone}</span>
                        <small>{offsetOf(zone)}</small>
                      </li>
                    ))}
                    {list.length === 0 ? (
                      <li className="holo-empty" role="presentation">
                        Sin coincidencias
                      </li>
                    ) : null}
                  </ul>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
