import { useCallback, useState } from 'react';
import { Upload, ImageIcon } from 'lucide-react';

interface ImageUploadProps {
  onImageSelected: (file: File) => void;
  disabled?: boolean;
}

export function ImageUpload({ onImageSelected, disabled }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    setPreview(URL.createObjectURL(file));
    onImageSelected(file);
  }, [onImageSelected]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setIsDragging(false), []);

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={`
        relative rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer
        flex flex-col items-center justify-center min-h-[280px] p-8
        ${isDragging
          ? 'border-primary bg-primary/5 shadow-glow'
          : 'border-border hover:border-primary/50 hover:bg-muted/30'
        }
        ${disabled ? 'opacity-50 pointer-events-none' : ''}
      `}
      onClick={() => {
        if (disabled) return;
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) handleFile(file);
        };
        input.click();
      }}
    >
      {preview ? (
        <div className="relative w-full max-w-xs">
          <img src={preview} alt="Preview" className="rounded-xl w-full h-auto max-h-48 object-contain" />
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Clique ou arraste para trocar a imagem
          </div>
        </div>
      ) : (
        <>
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
            {isDragging ? (
              <ImageIcon className="w-8 h-8 text-primary" />
            ) : (
              <Upload className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <p className="text-foreground font-medium text-lg mb-1">
            Arraste sua imagem aqui
          </p>
          <p className="text-muted-foreground text-sm">
            ou clique para selecionar • PNG, JPG, WEBP
          </p>
        </>
      )}
    </div>
  );
}
