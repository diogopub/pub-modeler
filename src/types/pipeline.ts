export type PipelineStep = 'idle' | 'uploading' | 'removing-bg' | 'multi-view' | 'generating-3d' | 'done' | 'error';

export interface PipelineState {
  step: PipelineStep;
  progress: number;
  originalImage: string | null;
  noBgImage: string | null;
  multiViewImages: string[];
  modelUrl: string | null;
  modelFormat: 'glb' | 'obj' | 'fbx';
  errorMessage: string | null;
  taskId: string | null;
}

export const STEP_LABELS: Record<PipelineStep, string> = {
  idle: 'Aguardando imagem',
  uploading: 'Enviando imagem...',
  'removing-bg': 'Removendo fundo...',
  'multi-view': 'Gerando vistas...',
  'generating-3d': 'Criando modelo 3D...',
  done: 'Modelo pronto!',
  error: 'Erro no processamento',
};

export const STEPS_ORDER: PipelineStep[] = [
  'uploading',
  'removing-bg',
  'multi-view',
  'generating-3d',
  'done',
];
