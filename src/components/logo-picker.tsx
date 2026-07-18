import { useCallback, useId, useRef, useState } from "react";
import { ImagePlus, Upload, X } from "lucide-react";

type LogoPickerProps = {
  previewUrl?: string | null;
  fileName?: string | null;
  colorFallback?: string;
  initialLetter?: string;
  disabled?: boolean;
  onFileChange: (file: File | null) => void;
  onRemove?: () => void;
  showRemove?: boolean;
};

function isImageFile(file: File) {
  return file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name);
}

/**
 * Upload de logo com arrastar/soltar e colar (Ctrl+V).
 * O diálogo nativo às vezes é bloqueado por antivírus/browser embutido —
 * o drop continua funcionando nesses casos.
 */
export function LogoPicker({
  previewUrl,
  fileName,
  colorFallback,
  initialLetter = "?",
  disabled,
  onFileChange,
  onRemove,
  showRemove,
}: LogoPickerProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const applyFile = useCallback(
    (file: File | null | undefined) => {
      if (!file) return;
      if (!isImageFile(file)) {
        setHint("Envie uma imagem (PNG, JPG, WEBP, GIF ou SVG).");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setHint("A logo deve ter no máximo 2 MB.");
        return;
      }
      setHint(null);
      onFileChange(file);
    },
    [onFileChange],
  );

  return (
    <div className="flex items-start gap-4">
      <div
        className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border"
        style={{ background: previewUrl ? undefined : colorFallback }}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Logo"
            className="size-full object-cover"
          />
        ) : (
          <span className="text-xl font-bold text-white">{initialLetter}</span>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onClick={() => {
            if (disabled) return;
            inputRef.current?.click();
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!disabled) setDragging(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragging(false);
            if (disabled) return;
            applyFile(e.dataTransfer.files?.[0]);
          }}
          onPaste={(e) => {
            if (disabled) return;
            const items = Array.from(e.clipboardData?.items ?? []);
            const imageItem = items.find((item) => item.type.startsWith("image/"));
            if (!imageItem) return;
            e.preventDefault();
            applyFile(imageItem.getAsFile() ?? undefined);
          }}
          className={`relative rounded-xl border-2 border-dashed px-4 py-5 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
            disabled
              ? "cursor-not-allowed opacity-50"
              : "cursor-pointer hover:border-primary hover:bg-muted/30"
          } ${
            dragging
              ? "border-primary bg-brand-soft/60"
              : "border-muted-foreground/30"
          }`}
        >
          <Upload className="mx-auto size-6 text-primary" />
          <p className="mt-2 text-sm font-medium">
            {dragging
              ? "Solte a imagem aqui"
              : fileName || "Arraste a logo para cá"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            ou cole com Ctrl+V · ou use o campo abaixo
          </p>

          {/* Input visível — fora de label aninhado para evitar bloqueio */}
          <div
            className="relative z-10 mt-3"
            onClick={(e) => e.stopPropagation()}
          >
            <label
              htmlFor={inputId}
              className="sr-only"
            >
              Selecionar arquivo de logo
            </label>
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml,.png,.jpg,.jpeg,.webp,.gif,.svg"
              disabled={disabled}
              className="block w-full max-w-full text-sm"
              onChange={(e) => {
                applyFile(e.target.files?.[0]);
                // permite escolher o mesmo arquivo de novo
                e.target.value = "";
              }}
            />
          </div>
        </div>

        {showRemove && onRemove && (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
            onClick={onRemove}
          >
            <X className="size-3" /> Remover logo
          </button>
        )}

        {hint ? (
          <p className="text-xs text-destructive" role="alert">
            {hint}
          </p>
        ) : (
          <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <ImagePlus className="size-3" />
            PNG, JPG, WEBP, GIF ou SVG · máx. 2 MB
          </p>
        )}
      </div>
    </div>
  );
}
