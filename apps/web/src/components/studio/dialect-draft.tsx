import { useId, useState } from 'react';
import type { CdomDocument } from '@aether-dom/schema';
import { checkDialectDraft } from '@/features/lore/dialect';

export function DialectDraft({ character }: { character: CdomDocument['characters'][number] }) {
  const [text, setText] = useState('');
  const noteId = useId();
  const matches = checkDialectDraft(text, character.dialect.forbiddenTerms);
  return <section className="inspector-section dialect-draft" aria-label="Dialect draft check"><h3>Dialect draft check</h3><p className="panel-note" id={noteId}>Check text against {character.name}’s forbidden terms. This draft is not saved.</p>
    <label>Draft dialogue<textarea aria-label="Dialect draft text" aria-describedby={noteId} maxLength={2000} value={text} onChange={event => setText(event.target.value)} placeholder="Try a line in this character’s voice" /></label>
    <p className={matches.length ? 'dialect-warning' : 'panel-note'} role="status">{!text ? 'Enter a line to check its vocabulary.' : matches.length ? `${matches.length} forbidden terms found.` : character.dialect.forbiddenTerms.length ? 'No forbidden terms found in this draft.' : 'No forbidden terms are defined for this character.'}</p>
    {matches.length ? <ul>{matches.map(term => <li key={term}><strong>{term}</strong><span>Evidence: <code>{character.id}</code> · dialect.forbiddenTerms</span></li>)}</ul> : null}
  </section>;
}
