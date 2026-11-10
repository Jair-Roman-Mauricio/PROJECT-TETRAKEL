import { describe, expect, it } from 'vitest';
import { openDraft, editElement, selectElement, discardDraft, isDirty, type DraftSource } from '../../apps/web/src/lib/layout-draft.js';

const element = (id: string, name: string) => ({ id, type: 'zone', parentId: null, code: id.toUpperCase(), name, position: { x: '0', y: '0', z: '0' }, dimensions: { width: '5', height: '3', depth: '5' }, blocked: false });
const saved: DraftSource = { warehouseId: 'w1', revision: '7', elements: [element('a', 'Zona A'), element('b', 'Zona B')] };

describe('U-UI/editor-borrador', () => {
  it('abre el borrador con la revisión base y sin cambios', () => {
    const draft = openDraft(saved);
    expect(draft.baseRevision).toBe('7');
    expect(draft.selectedId).toBeNull();
    expect(isDirty(draft, saved)).toBe(false);
  });
  it('editar no modifica la distribución persistida', () => {
    const draft = editElement(openDraft(saved), 'a', { name: 'Zona editada' });
    expect(draft.elements[0]!.name).toBe('Zona editada');
    expect(saved.elements[0]!.name).toBe('Zona A');
    expect(isDirty(draft, saved)).toBe(true);
  });
  it('seleccionar solo acepta elementos del borrador', () => {
    const draft = selectElement(openDraft(saved), 'b');
    expect(draft.selectedId).toBe('b');
    expect(selectElement(draft, 'zzz').selectedId).toBeNull();
  });
  it('descartar restaura la copia persistida y la selección', () => {
    const edited = selectElement(editElement(openDraft(saved), 'a', { name: 'X' }), 'a');
    const draft = discardDraft(saved);
    expect(draft.elements).toEqual(saved.elements);
    expect(draft.selectedId).toBeNull();
    expect(isDirty(draft, saved)).toBe(false);
    expect(edited.elements[0]!.name).toBe('X');
  });
  it('una recarga remota no reemplaza el borrador editado', () => {
    const draft = editElement(openDraft(saved), 'a', { name: 'Mío' });
    const remote: DraftSource = { ...saved, revision: '8', elements: [element('a', 'Remoto')] };
    expect(isDirty(draft, remote)).toBe(true);
    expect(draft.baseRevision).toBe('7');
    expect(draft.elements[0]!.name).toBe('Mío');
  });
});
