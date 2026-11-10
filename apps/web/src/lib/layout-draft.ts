/** Editor draft: an in-memory copy kept apart from the saved-layout cache. */
export interface DraftElement {
  id: string;
  type: string;
  parentId: string | null;
  code: string;
  name: string;
  position: { x: string; y: string; z: string };
  dimensions: { width: string; height: string; depth: string };
  blocked: boolean;
}
export interface DraftSource {
  warehouseId: string;
  revision: string;
  elements: DraftElement[];
}
export interface LayoutDraft {
  warehouseId: string;
  baseRevision: string;
  elements: DraftElement[];
  selectedId: string | null;
}
const copy = (elements: DraftElement[]): DraftElement[] =>
  elements.map((e) => ({
    ...e,
    position: { ...e.position },
    dimensions: { ...e.dimensions },
  }));
export function openDraft(source: DraftSource): LayoutDraft {
  return {
    warehouseId: source.warehouseId,
    baseRevision: source.revision,
    elements: copy(source.elements),
    selectedId: null,
  };
}
export const discardDraft = openDraft;
export function selectElement(
  draft: LayoutDraft,
  id: string | null,
): LayoutDraft {
  return {
    ...draft,
    selectedId: id !== null && draft.elements.some((e) => e.id === id) ? id : null,
  };
}
export function editElement(
  draft: LayoutDraft,
  id: string,
  change: Partial<Pick<DraftElement, "name" | "code">>,
): LayoutDraft {
  return {
    ...draft,
    elements: draft.elements.map((e) => (e.id === id ? { ...e, ...change } : e)),
  };
}
export function isDirty(draft: LayoutDraft, source: DraftSource): boolean {
  return (
    JSON.stringify(draft.elements) !== JSON.stringify(source.elements) ||
    draft.baseRevision !== source.revision
  );
}
