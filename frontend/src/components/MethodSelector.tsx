import type { ExerciseMethod } from "../utils/parseSeedMethods.js";

interface Props {
  methods: ExerciseMethod[];
  selectedId: string | null;
  onSelect: (methodId: string) => void;
  onAdd: () => void;
  onEdit?: (method: ExerciseMethod) => void;
  disabled?: boolean;
  size?: "compact" | "full";
}

function MethodChip({
  method,
  active,
  disabled,
  size,
  onSelect,
  onEdit,
}: {
  method: ExerciseMethod;
  active: boolean;
  disabled?: boolean;
  size: "compact" | "full";
  onSelect: () => void;
  onEdit?: () => void;
}) {
  const sizeClass =
    size === "compact"
      ? "min-h-[32px] px-2.5 text-[11px]"
      : "min-h-[40px] px-3 text-xs uppercase tracking-widest";

  return (
    <span
      className={`inline-flex items-center rounded-lg border font-terminal transition-all ${sizeClass} ${
        active
          ? "border-matrix-green bg-matrix-green text-matrix-bg shadow-matrix-sm"
          : "border-matrix-border text-matrix-green hover:border-matrix-green"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        data-testid={`method-chip-${method.id}`}
        aria-pressed={active}
        className={`pl-2.5 pr-1 py-1.5 disabled:opacity-40 ${active ? "" : "hover:text-matrix-green"}`}
      >
        {method.label}
      </button>
      {onEdit && !method.isSeeded && (
        <button
          type="button"
          onClick={onEdit}
          disabled={disabled}
          aria-label={`Edit ${method.label}`}
          data-testid={`method-edit-${method.id}`}
          className="pr-2 pl-1 text-matrix-cyan hover:text-matrix-green disabled:opacity-40"
        >
          ⋯
        </button>
      )}
      {onEdit && method.isSeeded && (
        <button
          type="button"
          onClick={onEdit}
          disabled={disabled}
          aria-label={`Edit ${method.label}`}
          data-testid={`method-edit-${method.id}`}
          className="pr-2 pl-1 text-matrix-text-muted hover:text-matrix-cyan disabled:opacity-40"
        >
          ⋯
        </button>
      )}
    </span>
  );
}

export function MethodSelector({
  methods,
  selectedId,
  onSelect,
  onAdd,
  onEdit,
  disabled,
  size = "full",
}: Props) {
  if (methods.length === 0) {
    return (
      <div className="space-y-2" data-testid="method-selector-empty">
        <div className="text-[10px] font-terminal text-matrix-text-muted uppercase tracking-widest">Method</div>
        <button
          type="button"
          onClick={onAdd}
          disabled={disabled}
          data-testid="method-add-first"
          className="w-full min-h-[40px] rounded-lg border border-dashed border-matrix-cyan/50 text-matrix-cyan font-terminal text-xs uppercase tracking-widest hover:bg-matrix-cyan/10 disabled:opacity-40"
        >
          + Add your first method
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="method-selector">
      <div className="text-[10px] font-terminal text-matrix-text-muted uppercase tracking-widest">Method</div>
      <div className="flex flex-wrap gap-2">
        {methods.map((method) => (
          <MethodChip
            key={method.id}
            method={method}
            active={method.id === selectedId}
            disabled={disabled}
            size={size}
            onSelect={() => onSelect(method.id)}
            onEdit={onEdit ? () => onEdit(method) : undefined}
          />
        ))}
        <button
          type="button"
          onClick={onAdd}
          disabled={disabled}
          data-testid="method-add"
          className={`rounded-lg border border-dashed border-matrix-border font-terminal text-matrix-cyan hover:border-matrix-cyan hover:bg-matrix-cyan/10 disabled:opacity-40 ${
            size === "compact" ? "min-h-[32px] px-2.5 text-[11px]" : "min-h-[40px] px-3 text-xs uppercase tracking-widest"
          }`}
        >
          + Add
        </button>
      </div>
    </div>
  );
}
