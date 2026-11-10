"use client";
import { FormSummary } from "./form-summary";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Field, QueryStatus } from "@almacen/ui";
import { registrationFormSchema } from "../lib/form-schemas";
import { applyFieldError } from "../lib/form-errors";
import { ApiError, errorMessage, request } from "../lib/api";
import { AuthFrame, usePublicConfig } from "./access";
import { HoloZoneField } from "./holo-zone-field";
// When the service mode cannot be checked, the person is not left on a form
// that cannot work: they are sent to the sign-in page.
function useLeaveOnFailure(failed: boolean) {
  const router = useRouter();
  useEffect(() => {
    if (failed) router.replace("/acceso");
  }, [failed, router]);
}
function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle"),
    timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  async function copy() {
    let ok: boolean;
    try {
      await navigator.clipboard.writeText(code);
      ok = true;
    } catch {
      // Older or non-secure contexts: fall back to a temporary selection.
      const field = document.createElement("textarea");
      field.value = code;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      field.remove();
    }
    setCopied(ok ? "copied" : "failed");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied("idle"), 2200);
  }
  return (
    <>
      <button
        type="button"
        className="copy-code"
        data-state={copied}
        aria-label="Copiar código"
        onClick={() => void copy()}
      >
        {copied === "copied" ? (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="9" y="9" width="11" height="11" rx="3" />
            <path d="M15 9V7a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v5a3 3 0 0 0 3 3h2" />
          </svg>
        )}
        <span className="copy-code-tip" aria-hidden="true">
          {copied === "copied"
            ? "Copiado"
            : copied === "failed"
              ? "No se pudo copiar"
              : "Copiar"}
        </span>
      </button>
      <span className="visually-hidden" role="status">
        {copied === "copied"
          ? "Código copiado"
          : copied === "failed"
            ? "No se pudo copiar el código"
            : ""}
      </span>
    </>
  );
}
export function Registration() {
  const config = usePublicConfig();
  useLeaveOnFailure(config.isError);
  if (config.isPending)
    return (
      <AuthFrame
        title="Registro de empresa"
        description="Comprobando la modalidad del servicio."
      >
        <QueryStatus state="loading" />
      </AuthFrame>
    );
  if (config.isError)
    return (
      <AuthFrame
        title="Registro de empresa"
        description="No se pudo comprobar la modalidad."
      >
        <QueryStatus
          state="error"
          action={
            <Button onClick={() => void config.refetch()}>Reintentar</Button>
          }
        />
      </AuthFrame>
    );
  if (config.data.mode !== "saas")
    return (
      <AuthFrame
        title="Registro no disponible"
        description="Esta instalación local administra una sola empresa."
      >
        <Link href="/acceso">Ir al acceso</Link>
      </AuthFrame>
    );
  return <RegistrationForm />;
}
export function RegistrationForm({ local = false }: { local?: boolean }) {
  const config = usePublicConfig();
  const [result, setResult] = useState<string | null>(null),
    [failure, setFailure] = useState("");
  const form = useForm({
      resolver: zodResolver(registrationFormSchema),
      defaultValues: {
        companyName: "",
        companyCode: "",
        timeZone: "America/Lima",
        adminName: "",
        email: "",
        password: "",
      },
    }),
    errors = form.formState.errors;
  async function submit(values: {
    companyName: string;
    companyCode: string;
    timeZone: string;
    adminName: string;
    email: string;
    password: string;
  }) {
    setFailure("");
    try {
      const response = await request<{ data: { loginCompanyCode: string } }>(
        local ? "/local-setup" : "/registrations",
        {
          method: "POST",
          body: {
            company: {
              name: values.companyName,
              code: values.companyCode,
              timeZone: values.timeZone,
            },
            administrator: {
              name: values.adminName,
              email: values.email,
              password: values.password,
            },
          },
        },
      );
      form.resetField("password");
      setResult(response.data.loginCompanyCode);
    } catch (error) {
      if (
        local &&
        error instanceof ApiError &&
        error.code === "ALREADY_CONFIGURED"
      ) {
        await config.refetch();
        return;
      }
      if (
        !applyFieldError(error, form.setError, {
          COMPANY_CODE_EXISTS: "companyCode",
          INVALID_CODE: "companyCode",
          INVALID_TIME_ZONE: "timeZone",
          INVALID_EMAIL: "email",
          "field:password": "password",
        })
      )
        setFailure(errorMessage(error));
    }
  }
  if (result)
    return (
      <AuthFrame
        title={local ? "Instalación configurada" : "Empresa creada"}
        description="Guarda este código: tu equipo lo usará para iniciar sesión."
      >
        <div className="code-row">
          <p className="confirmed-code">
            <strong>{result}</strong>
          </p>
          <CopyCode code={result} />
        </div>
        <Link
          className="button"
          href={"/acceso?empresa=" + encodeURIComponent(result)}
        >
          Ir al acceso
        </Link>
      </AuthFrame>
    );
  return (
    <AuthFrame
      wide
      title={local ? "Configura esta instalación" : "Registra tu empresa"}
      description={
        local
          ? "Crea la empresa y su primer administrador. Esta instalación administra una sola empresa."
          : "Crea tu espacio de trabajo y la primera cuenta de administrador."
      }
    >
      <form
        className="form-grid"
        noValidate
        onSubmit={form.handleSubmit(submit)}
      >
        <FormSummary errors={errors} />
        <fieldset className="form-section">
          <legend>Empresa</legend>
          <Field
            label="Nombre de empresa"
            autoComplete="organization"
            required
            {...form.register("companyName")}
            error={errors.companyName?.message}
          />
          <Field
            label="Código de empresa"
            required
            spellCheck={false}
            {...form.register("companyCode")}
            error={errors.companyCode?.message}
            hint="Identificador de acceso. Hasta 64 letras, números, guion, punto o barra."
          />
          <HoloZoneField
            label="Zona horaria"
            registration={form.register("timeZone")}
            value={form.watch("timeZone")}
            onPick={(zone) =>
              form.setValue("timeZone", zone, {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
              })
            }
            error={errors.timeZone?.message}
            hint="Nombre IANA, por ejemplo America/Lima."
          />
        </fieldset>
        <fieldset className="form-section">
          <legend>Primer administrador</legend>
          <Field
            label="Nombre del administrador"
            autoComplete="name"
            required
            {...form.register("adminName")}
            error={errors.adminName?.message}
          />
          <Field
            label="Correo electrónico"
            type="email"
            autoComplete="username"
            autoCapitalize="none"
            required
            {...form.register("email")}
            error={errors.email?.message}
          />
          <Field
            label="Contraseña"
            type="password"
            autoComplete="new-password"
            required
            {...form.register("password")}
            error={errors.password?.message}
          />
        </fieldset>
        {failure ? (
          <p role="alert" className="form-error">
            {failure}
          </p>
        ) : null}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting
            ? "Creando empresa…"
            : local
              ? "Configurar instalación"
              : "Crear empresa"}
        </Button>
        <p className="auth-links">
          ¿Ya tienes una cuenta? <Link href="/acceso">Inicia sesión</Link>
        </p>
      </form>
    </AuthFrame>
  );
}

export function LocalSetup() {
  const config = usePublicConfig();
  useLeaveOnFailure(config.isError);
  if (config.isPending)
    return (
      <AuthFrame
        title="Configuración inicial"
        description="Comprobando el estado de la instalación."
      >
        <QueryStatus state="loading" />
      </AuthFrame>
    );
  if (config.isError)
    return (
      <AuthFrame
        title="Configuración inicial"
        description="No se pudo comprobar el estado."
      >
        <QueryStatus
          state="error"
          action={
            <Button onClick={() => void config.refetch()}>Reintentar</Button>
          }
        />
      </AuthFrame>
    );
  if (config.data.mode !== "local")
    return (
      <AuthFrame
        title="Configuración local no disponible"
        description="Este servicio utiliza registro de empresas SaaS."
      >
        <Link href="/acceso">Ir al acceso</Link>
      </AuthFrame>
    );
  if (!config.data.localSetupRequired)
    return (
      <AuthFrame
        title="Instalación configurada"
        description="La empresa y su administrador ya están creados. Accede con sus credenciales."
      >
        <Link className="button" href="/acceso">
          Ir al acceso
        </Link>
      </AuthFrame>
    );
  return <RegistrationForm local />;
}
