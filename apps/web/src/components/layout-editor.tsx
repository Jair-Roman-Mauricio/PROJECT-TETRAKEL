"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Dialog, Field, QueryStatus } from "@almacen/ui";
import { request } from "../lib/api";
import {
  discardDraft,
  editElement,
  isDirty,
  openDraft,
  selectElement,
  type DraftSource,
  type LayoutDraft,
} from "../lib/layout-draft";
import { useScopeKey } from "./query-scope";
import { useSession } from "./session";
import { PageHeading } from "./shell";
export function LayoutEditorPage({ warehouseId }: { warehouseId: string }) {
  const { session } = useSession(),
    scope = useScopeKey(),
    query = useQuery({
      queryKey: [...scope, "layout", warehouseId],
      queryFn: ({ signal }) =>
        request<{ data: DraftSource }>(
          "/warehouses/" + warehouseId + "/layout",
          { signal },
        ).then((r) => r.data),
      enabled: session?.user.role === "admin",
    });
  if (session?.user.role !== "admin")
    return (
      <>
        <PageHeading title="Editor de distribución" description="" />
        <QueryStatus
          state="empty"
          title="Solo administradores"
          description="Un administrador puede editar la distribución."
        />
      </>
    );
  if (query.isPending) return <QueryStatus state="loading" />;
  if (query.isError) return <QueryStatus state="error" />;
  return <Editor key={warehouseId} saved={query.data} />;
}
function Editor({ saved }: { saved: DraftSource }) {
  // The draft opens once; later refreshes of the saved cache never replace it.
  const [draft, setDraft] = useState<LayoutDraft>(() => openDraft(saved)),
    [confirming, setConfirming] = useState(false),
    [origin, setOrigin] = useState<DraftSource>(saved),
    dirty = isDirty(draft, origin),
    selected = draft.elements.find((e) => e.id === draft.selectedId);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  return (
    <>
      <PageHeading
        title="Editor de distribución"
        description="Los cambios son un borrador hasta guardarlos."
        action={
          <Dialog
            open={confirming}
            onOpenChange={setConfirming}
            trigger={
              <Button variant="secondary" disabled={!dirty}>
                Descartar cambios
              </Button>
            }
            title="Descartar cambios"
            description="El borrador volverá a la distribución guardada."
          >
            <Button
              onClick={() => {
                setDraft(discardDraft(saved));
                setOrigin(saved);
                setConfirming(false);
              }}
            >
              Descartar
            </Button>
          </Dialog>
        }
      />
      {dirty ? <p role="status">Cambios sin guardar</p> : null}
      <ul className="editor-tree" aria-label="Elementos">
        {draft.elements.map((e) => (
          <li key={e.id}>
            <Button
              variant="ghost"
              aria-pressed={e.id === draft.selectedId}
              onClick={() => setDraft(selectElement(draft, e.id))}
            >
              {e.name}
            </Button>
          </li>
        ))}
      </ul>
      {selected ? (
        <section aria-label="Propiedades">
          <p>Elemento seleccionado: {selected.code}</p>
          <Field
            label="Nombre del elemento"
            value={selected.name}
            onChange={(event) =>
              setDraft(
                editElement(draft, selected.id, { name: event.target.value }),
              )
            }
          />
        </section>
      ) : null}
    </>
  );
}
