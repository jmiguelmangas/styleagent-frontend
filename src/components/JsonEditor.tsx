type JsonEditorProps = {
  value: string
  onChange: (next: string) => void
  hasError: boolean
}

export function JsonEditor({ value, onChange, hasError }: JsonEditorProps) {
  return (
    <div className="json-editor">
      <textarea
        id="style-spec"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={14}
        className={hasError ? 'invalid' : ''}
        spellCheck={false}
      />
      <p className="json-help">
        Provide valid StyleSpec JSON. The backend will validate required fields and key structure.
      </p>
    </div>
  )
}
