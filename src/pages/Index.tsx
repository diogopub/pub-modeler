import { lazy, Suspense } from 'react';
import { Box, Sparkles, RotateCcw } from 'lucide-react';
import { ImageUpload } from '@/components/ImageUpload';
import { PipelineProgress } from '@/components/PipelineProgress';
import { DownloadSection } from '@/components/DownloadSection';
import { usePipeline } from '@/hooks/usePipeline';
import { Button } from '@/components/ui/button';

const ModelViewer = lazy(() => import('@/components/ModelViewer').then(m => ({ default: m.ModelViewer })));

const Index = () => {
  const {
    state,
    setModelFormat,
    reset,
    runPipeline,
  } = usePipeline();

  const isProcessing = !['idle', 'done', 'error'].includes(state.step);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="PUB Modeler Logo" className="w-10 h-10 object-contain" />
            <div>
              <h1 className="text-lg font-bold text-foreground">PUB <span className="text-gradient">Modeler</span></h1>
              <p className="text-xs text-muted-foreground">Imagem → Modelo 3D</p>
            </div>
          </div>
          {state.step !== 'idle' && (
            <Button variant="ghost" size="sm" onClick={reset} className="gap-2 text-muted-foreground hover:text-foreground">
              <RotateCcw className="w-4 h-4" />
              Recomeçar
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Hero section - only when idle */}
        {state.step === 'idle' && (
          <div className="text-center mb-12 pt-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary text-primary text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Powered by Tripo AI
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
              Transforme fotos em{' '}
              <span className="text-gradient">modelos 3D</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Faça upload de uma imagem e nossa IA remove o fundo, gera múltiplas vistas
              e cria um modelo 3D pronto para download.
            </p>
          </div>
        )}

        {/* Upload area */}
        {state.step === 'idle' && (
          <div className="max-w-lg mx-auto mb-12">
            <ImageUpload
              onImageSelected={(file) => runPipeline(file)}
              disabled={isProcessing}
            />
          </div>
        )}

        {/* Pipeline progress */}
        {state.step !== 'idle' && (
          <div className="mb-8">
            <PipelineProgress currentStep={state.step} progress={state.progress} />
          </div>
        )}

        {/* Preview grid during processing */}
        {state.step !== 'idle' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Left: images */}
            <div className="space-y-4">
              {state.originalImage && (
                <div className="rounded-2xl border border-border overflow-hidden bg-card p-4">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-3">
                    Imagem Original
                  </p>
                  <img
                    src={state.originalImage}
                    alt="Original"
                    className="w-full h-48 object-contain rounded-xl"
                  />
                </div>
              )}

              {state.noBgImage && (
                <div className="rounded-2xl border border-border overflow-hidden bg-card p-4">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-3">
                    Sem Fundo
                  </p>
                  <div className="bg-[repeating-conic-gradient(hsl(var(--muted))_0%_25%,transparent_0%_50%)] bg-[length:16px_16px] rounded-xl">
                    <img
                      src={state.noBgImage}
                      alt="Sem fundo"
                      className="w-full h-48 object-contain"
                    />
                  </div>
                </div>
              )}

              {state.multiViewImages.length > 0 && (
                <div className="rounded-2xl border border-border overflow-hidden bg-card p-4">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-3">
                    Multi-View
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {state.multiViewImages.map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt={`Vista ${i + 1}`}
                        className="w-full h-24 object-contain rounded-lg bg-muted/30"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: 3D viewer */}
            <div className="min-h-[400px]">
              <Suspense fallback={<div className="h-full rounded-2xl bg-muted/30 border border-border flex items-center justify-center text-muted-foreground">Carregando visualizador 3D...</div>}>
                <ModelViewer modelUrl={state.modelUrl} className="h-full" />
              </Suspense>
            </div>
          </div>
        )}

        {/* Download section */}
        {state.step === 'done' && (
          <div className="flex justify-center">
            <DownloadSection
              modelUrl={state.modelUrl}
              format={state.modelFormat}
              onFormatChange={setModelFormat}
            />
          </div>
        )}

        {/* Error */}
        {state.step === 'error' && (
          <div className="text-center py-8">
            <p className="text-destructive mb-4">{state.errorMessage || 'Ocorreu um erro.'}</p>
            <Button onClick={reset} variant="outline">Tentar novamente</Button>
          </div>
        )}

        {/* Pipeline info - only when idle */}
        {state.step === 'idle' && (
          <div className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { step: '1', title: 'Upload', desc: 'Envie a foto do objeto' },
              { step: '2', title: 'Remoção de Fundo', desc: 'IA isola o objeto' },
              { step: '3', title: 'Multi-View', desc: 'Gera vistas extras' },
              { step: '4', title: 'Modelo 3D', desc: 'Tripo AI gera o 3D' },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-2xl border border-border bg-card p-5 text-center hover:border-glow-primary/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-3 text-primary font-mono font-bold text-sm">
                  {item.step}
                </div>
                <h3 className="font-semibold text-foreground text-sm mb-1">{item.title}</h3>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
