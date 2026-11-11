import { createStore } from 'zustand/vanilla';
import type { CdomDocument } from '@aether-dom/schema';
import { initialSelection, reduceSelection, type SelectionAction, type StudioSelection } from './selection';

type StudioUiState = {
  selection: StudioSelection;
  dispatch: (action: SelectionAction) => void;
};

// Created per mounted document: selection is ephemeral and never serialized.
export function createStudioStore(document: CdomDocument) {
  return createStore<StudioUiState>()(set => ({
    selection: initialSelection(document),
    dispatch: action => set(state => ({ selection: reduceSelection(document, state.selection, action) })),
  }));
}
