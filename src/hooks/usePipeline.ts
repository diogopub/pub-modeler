import { useState, useCallback, useRef } from 'react';
import { PipelineState, PipelineStep } from '@/types/pipeline';

// ── Constantes ──────────────────────────────────────────────
const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 120;

const initialState: PipelineState = {
  step: 'idle',
  progress: 0,
  originalImage: null,
  noBgImage: null,
  multiViewImages: [],
  modelUrl: null,
  modelFormat: 'glb',
  errorMessage: null,
  taskId: null,
};

// ── Helper: fetch com AbortController ───────────────────────
async function apiFetch(
  body: Record<string, unknown>,
  signal?: AbortSignal
): Promise<Response> {
  return fetch('/api/generate-3d', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
}

// ── Hook ────────────────────────────────────────────────────
export function usePipeline() {
  const [state, setState] = useState<PipelineState>(initialState);
  const abortCtrlRef = useRef<AbortController | null>(null);

  const setStep = useCallback((step: PipelineStep, progress = 0) => {
    setState(prev => ({ ...prev, step, progress, errorMessage: step === 'error' ? prev.errorMessage : null }));
  }, []);

  const setError = useCallback((message: string) => {
    setState(prev => ({ ...prev, step: 'error', errorMessage: message }));
  }, []);

  const setProgress = useCallback((progress: number) => {
    setState(prev => ({ ...prev, progress }));
  }, []);

  const reset = useCallback(() => {
    // Cancelar requests em voo
    abortCtrlRef.current?.abort();
    abortCtrlRef.current = null;

    // Limpar blob URLs para evitar vazamento de memória
    setState(prev => {
      if (prev.originalImage?.startsWith('blob:')) URL.revokeObjectURL(prev.originalImage);
      if (prev.modelUrl?.startsWith('blob:')) URL.revokeObjectURL(prev.modelUrl);
      return initialState;
    });
  }, []);

  const setModelFormat = useCallback((format: 'glb' | 'obj' | 'fbx') => {
    setState(prev => ({ ...prev, modelFormat: format }));
  }, []);

  const runPipeline = useCallback(async (file: File) => {
    // Cancelar pipeline anterior se existir
    abortCtrlRef.current?.abort();
    const controller = new AbortController();
    abortCtrlRef.current = controller;
    const { signal } = controller;

    try {
      // Step 1: Mostrar imagem original e preparar base64
      const imageUrl = URL.createObjectURL(file);
      setState(prev => ({ ...prev, originalImage: imageUrl, step: 'uploading', progress: 10 }));

      const reader = new FileReader();
      const base64Image = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      if (signal.aborted) return;

      // Step 2: Upload para Tripo
      setState(prev => ({ ...prev, progress: 20 }));

      const uploadResponse = await apiFetch({ action: 'upload', image: base64Image }, signal);
      
      if (!uploadResponse.ok) {
        const err = await uploadResponse.json();
        throw new Error(err.error || 'Erro no upload Tripo');
      }
      
      const uploadData = await uploadResponse.json();
      const fileToken = uploadData?.data?.image_token;
      if (!fileToken) throw new Error('Não recebeu file_token do Tripo');

      if (signal.aborted) return;

      // Step 3: Criar tarefa 3D (modo direto — melhor fidelidade à imagem original)
      setState(prev => ({ ...prev, step: 'generating-3d', progress: 5 }));

      const taskResponse = await apiFetch({
        action: 'create-task',
        file_token: fileToken,
        mode: 'direct',
      }, signal);
      
      if (!taskResponse.ok) {
        const err = await taskResponse.json();
        throw new Error(err.error || 'Erro ao criar tarefa 3D');
      }
      
      const taskData = await taskResponse.json();
      const taskId = taskData?.data?.task_id;
      if (!taskId) throw new Error('Não recebeu task_id do Tripo');

      setState(prev => ({ ...prev, taskId }));

      // Step 4: Polling do Modelo 3D
      for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
        if (signal.aborted) return;
        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

        const pollResponse = await apiFetch({ action: 'poll', task_id: taskId }, signal);
        
        if (!pollResponse.ok) continue;
        
        const pollData = await pollResponse.json();
        const status = pollData?.data?.status;
        const progress = pollData?.data?.progress ?? 0;

        // Tripo já envia 0–100, não precisa multiplicar
        setState(prev => ({ ...prev, progress: Math.min(Math.round(progress), 95) }));

        if (status === 'success') {
          const output = pollData?.data?.output;
          const rawUrl = output?.pbr_model || output?.model || output?.glb || output?.url;
          
          if (!rawUrl) {
            console.error('Output structure:', output);
            throw new Error('Modelo gerado mas URL (pbr_model) não encontrada');
          }

          // Buscar pelo proxy para evitar CORS
          setState(prev => ({ ...prev, progress: 98 }));
          const proxyResponse = await apiFetch({ action: 'proxy-model', url: rawUrl }, signal);

          if (!proxyResponse.ok) {
            throw new Error('Erro ao baixar modelo pelo proxy');
          }

          const blob = await proxyResponse.blob();
          const modelUrl = URL.createObjectURL(blob);

          // Usar rendered_image como preview se disponível
          const rendered = output?.rendered_image;

          setState(prev => ({
            ...prev,
            modelUrl,
            step: 'done',
            progress: 100,
            ...(rendered ? { multiViewImages: [...prev.multiViewImages, rendered] } : {}),
          }));
          return;
        }

        if (status === 'failed') {
          throw new Error('A geração do modelo 3D falhou no Tripo');
        }
      }

      throw new Error('Timeout: a geração demorou demais');

    } catch (error: any) {
      if (error.name === 'AbortError') return; // Cancelamento intencional
      console.error('Pipeline error:', error);
      setState(prev => ({
        ...prev,
        step: 'error',
        errorMessage: error.message || 'Erro desconhecido',
      }));
    }
  }, []);

  return {
    state,
    setStep,
    setError,
    setModelFormat,
    setProgress,
    reset,
    runPipeline,
  };
}
