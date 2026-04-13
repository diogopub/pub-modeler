import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DownloadSectionProps {
  modelUrl: string | null;
  format: 'glb' | 'obj' | 'fbx';
  onFormatChange: (format: 'glb' | 'obj' | 'fbx') => void;
}

const formats: Array<{ value: 'glb' | 'obj' | 'fbx'; label: string }> = [
  { value: 'glb', label: 'GLB' },
  { value: 'obj', label: 'OBJ' },
  { value: 'fbx', label: 'FBX' },
];

export function DownloadSection({ modelUrl, format, onFormatChange }: DownloadSectionProps) {
  const handleDownload = () => {
    if (!modelUrl) return;
    const a = document.createElement('a');
    a.href = modelUrl;
    a.download = `model.${format}`;
    a.click();
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="flex rounded-xl overflow-hidden border border-border">
        {formats.map((f) => (
          <button
            key={f.value}
            onClick={() => onFormatChange(f.value)}
            className={`px-4 py-2 text-sm font-mono font-medium transition-all ${
              format === f.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-muted'
            }`}
          >
            .{f.label}
          </button>
        ))}
      </div>

      <Button
        onClick={handleDownload}
        disabled={!modelUrl}
        className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow"
        size="lg"
      >
        <Download className="w-4 h-4" />
        Baixar Modelo
      </Button>
    </div>
  );
}
