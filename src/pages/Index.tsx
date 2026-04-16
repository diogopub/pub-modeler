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
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1.5 shadow-sm">
              <img src="/logo.svg" alt="PUB Logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-[1.2rem] font-bold text-[#E5E7EB] leading-tight">Modeler <span className="text-white">PUB</span></h1>
              <p className="text-[0.8rem] text-muted-foreground/80 font-medium">Imagem → Modelo 3D</p>
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
              Faça upload de uma imagem e nossa IA gera um modelo 3D com texturas
              e materiais PBR, pronto para download.
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
          <div className="grid grid-cols-1 gap-8 mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Original Image */}
              {state.originalImage && (
                <div className="rounded-2xl border border-border overflow-hidden bg-card p-4 transition-all hover:border-primary/30">
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    Entrada Original
                  </p>
                  <img
                    src={state.originalImage}
                    alt="Original"
                    className="w-full h-48 object-contain rounded-xl"
                  />
                </div>
              )}

              {/* Preview renderizado pela IA */}
              <div className={`rounded-2xl border border-border overflow-hidden bg-card p-4 transition-all lg:col-span-2 ${state.step === 'generating-3d' ? 'border-primary shadow-glow' : ''}`}>
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${state.multiViewImages.length > 0 ? 'bg-green-500' : 'bg-orange-500 animate-pulse'}`} />
                  Preview IA
                </p>
                {state.multiViewImages.length > 0 ? (
                  <div className="rounded-xl overflow-hidden bg-muted/30">
                    <img
                      src={state.multiViewImages[state.multiViewImages.length - 1]}
                      alt="Preview do modelo"
                      className="w-full h-48 object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground text-sm italic">
                    Aguardando a IA processar...
                  </div>
                )}
              </div>
            </div>

            {/* 3D Model Viewer - Bigger and more prominent */}
            <div className={`rounded-2xl border border-border overflow-hidden bg-card p-1 transition-all min-h-[500px] ${state.step === 'done' ? 'border-green-500/50' : ''}`}>
              <div className="p-4 border-b border-border flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${state.step === 'done' ? 'bg-green-500' : 'bg-primary animate-pulse'}`} />
                  Visualizador 3D
                </p>
                {state.step === 'done' && (
                  <span className="text-[10px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full font-bold">READY</span>
                )}
              </div>
              <div className="h-[450px]">
                <Suspense fallback={<div className="h-full flex items-center justify-center text-muted-foreground italic">Carregando motor 3D...</div>}>
                  <ModelViewer modelUrl={state.modelUrl} className="h-full border-0 rounded-none bg-transparent" />
                </Suspense>
              </div>
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
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { step: '1', title: 'Upload', desc: 'Envie a foto do objeto' },
              { step: '2', title: 'Geração 3D', desc: 'IA cria o modelo com texturas' },
              { step: '3', title: 'Visualização', desc: 'Explore e baixe o resultado' },
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
