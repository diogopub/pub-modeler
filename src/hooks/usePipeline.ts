import { useState, useCallback, useRef } from 'react';
import { PipelineState, PipelineStep } from '@/types/pipeline';

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

export function usePipeline() {
  const [state, setState] = useState<PipelineState>(initialState);
  const abortRef = useRef(false);

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
    abortRef.current = true;
    setState(initialState);
  }, []);

  const setModelFormat = useCallback((format: 'glb' | 'obj' | 'fbx') => {
    setState(prev => ({ ...prev, modelFormat: format }));
  }, []);

  const runPipeline = useCallback(async (file: File) => {
    abortRef.current = false;

    try {
      // Diagnostic: Check Balance
      fetch('/api/generate-3d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-balance' })
      }).then(res => res.json()).then(data => {
        console.log('--- Tripo API Info ---');
        console.log('Balance Status:', JSON.stringify(data, null, 2));
      });

      // Step 1: Mostrar imagem original e preparar
      const imageUrl = URL.createObjectURL(file);
      setState(prev => ({ ...prev, originalImage: imageUrl, step: 'uploading', progress: 50 }));

      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const base64Image = await base64Promise;

      if (abortRef.current) return;

      // Step 2: Upload direto para Tripo
      setState(prev => ({ ...prev, step: 'multi-view', progress: 5 }));

      const uploadResponse = await fetch('/api/generate-3d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upload', image: base64Image })
      });
      
      if (!uploadResponse.ok) {
        const err = await uploadResponse.json();
        throw new Error(err.error || 'Erro no upload Tripo');
      }
      
      const uploadData = await uploadResponse.json();
      const fileToken = uploadData?.data?.image_token;
      if (!fileToken) throw new Error('Não recebeu file_token do Tripo');

      // Step 3: Criar tarefa de Multi-view
      setState(prev => ({ ...prev, step: 'multi-view', progress: 10 }));
      const mvTaskResponse = await fetch('/api/generate-3d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-multiview', file_token: fileToken })
      });

      if (!mvTaskResponse.ok) {
        const err = await mvTaskResponse.json();
        throw new Error(err.error || 'Erro ao criar vistas complementares');
      }

      const mvTaskData = await mvTaskResponse.json();
      const mvTaskId = mvTaskData?.data?.task_id;
      if (!mvTaskId) throw new Error('Não recebeu task_id das vistas');

      // Pooling das Multi-views
      let mvComplete = false;
      let mvAttempts = 0;
      let mvImages: string[] = [];
      
      while (!mvComplete && mvAttempts < 60) {
        if (abortRef.current) return;
        await new Promise(r => setTimeout(r, 4000));
        mvAttempts++;
        
        const pollResponse = await fetch('/api/generate-3d', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'poll', task_id: mvTaskId })
        });
        
        if (!pollResponse.ok) continue;
        const pollData = await pollResponse.json();
        const status = pollData?.data?.status;
        
        if (status === 'success') {
          mvImages = [pollData?.data?.output?.rendered_image];
          setState(prev => ({ ...prev, multiViewImages: mvImages, progress: 100 }));
          mvComplete = true;
        } else if (status === 'failed') {
          throw new Error('A geração das vistas complementares falhou no Tripo');
        }
      }

      if (!mvComplete) throw new Error('Timeout na geração das vistas');
      if (abortRef.current) return;

      // Step 4: Criar tarefa 3D a partir das Multi-views
      setState(prev => ({ ...prev, step: 'generating-3d', progress: 5 }));

      const taskResponse = await fetch('/api/generate-3d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'create-task', 
          original_task_id: mvTaskId,
          file_token: fileToken 
        })
      });
      
      if (!taskResponse.ok) {
        const err = await taskResponse.json();
        throw new Error(err.error || 'Erro ao criar tarefa 3D');
      }
      
      const taskData = await taskResponse.json();
      const taskId = taskData?.data?.task_id;
      if (!taskId) throw new Error('Não recebeu task_id do Tripo');

      setState(prev => ({ ...prev, taskId }));

      // Step 5: Pooling do Modelo 3D
      let attempts = 0;
      const maxAttempts = 120;

      while (attempts < maxAttempts) {
        if (abortRef.current) return;
        await new Promise(r => setTimeout(r, 5000));
        attempts++;

        const pollResponse = await fetch('/api/generate-3d', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'poll', task_id: taskId })
        });
        
        if (!pollResponse.ok) continue;
        
        const pollData = await pollResponse.json();
        const status = pollData?.data?.status;
        const progress = pollData?.data?.progress || 0;

        setState(prev => ({ ...prev, progress: Math.min(Math.round(progress * 100), 95) }));

        if (status === 'success') {
          const modelUrl = pollData?.data?.output?.model;
          if (!modelUrl) throw new Error('Modelo gerado mas URL não encontrada');

          setState(prev => ({ ...prev, modelUrl, step: 'done', progress: 100 }));
          return;
        }

        if (status === 'failed') {
          throw new Error('A geração do modelo 3D falhou no Tripo');
        }
      }

      throw new Error('Timeout: a geração demorou demais');

    } catch (error: any) {
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
