import { useRef, useState } from 'react';

function EditableText({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const doneRef = useRef(false);

  const start = () => {
    doneRef.current = false;
    setDraft(value);
    setEditing(true);
  };

  const finish = (save) => {
    if (doneRef.current) return;
    doneRef.current = true;
    setEditing(false);

    const next = draft.trim();
    if (save && next && next !== value) onSave(next);
  };

  if (!editing) {
    return (
      <span
        className="editable"
        onDoubleClick={start}
        title="Double-click to edit"
      >
        {value}
      </span>
    );
  }

  return (
    <input
      className="edit-input"
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => finish(true)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') finish(true);
        if (e.key === 'Escape') finish(false);
      }}
    />
  );
}

export default EditableText;