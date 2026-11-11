import { createStore } from 'zustand/vanilla';
import type { CdomDocument } from '@aether-dom/schema';
import { initialSelection, reduceSelection, type SelectionAction, type StudioSelection } from './selection';

type StudioUiState = {
  selection: StudioSelection;
  dispatch: (action: SelectionAction, document: CdomDocument) => void;
};

// Created per mounted document: selection is ephemeral and never serialized.
export function createStudioStore(document: CdomDocument) {
  const selection = initialSelection(document);
  return createStore<StudioUiState>()(set => ({
    selection,
    dispatch: (action, currentDocument) => set(state => ({ selection: reduceSelection(currentDocument, state.selection, action) })),
  }));
}
