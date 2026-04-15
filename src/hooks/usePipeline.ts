import { useState, useCallback, useRef } from 'react';
import { PipelineState, PipelineStep } from '@/types/pipeline';
import { supabase } from '@/integrations/supabase/client';

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
      // Step 1: Show original image
      const imageUrl = URL.createObjectURL(file);
      setState(prev => ({ ...prev, originalImage: imageUrl, step: 'uploading', progress: 50 }));

      // Step 2: Remove background
      setState(prev => ({ ...prev, step: 'removing-bg', progress: 10 }));

      const removeBgForm = new FormData();
      removeBgForm.append('image', file);

      const { data: removeBgData, error: removeBgError } = await supabase.functions.invoke('remove-bg', {
        body: removeBgForm,
      });

      if (removeBgError) throw new Error(`Erro ao remover fundo: ${removeBgError.message}`);
      if (abortRef.current) return;

      let noBgBlob: Blob;
      if (removeBgData instanceof Blob) {
        noBgBlob = removeBgData;
      } else if (removeBgData instanceof ArrayBuffer) {
        noBgBlob = new Blob([removeBgData], { type: 'image/png' });
      } else {
        const errorData = typeof removeBgData === 'string' ? JSON.parse(removeBgData) : removeBgData;
        if (errorData?.error) throw new Error(errorData.error);
        throw new Error('Resposta inesperada do remove-bg');
      }

      const noBgUrl = URL.createObjectURL(noBgBlob);
      setState(prev => ({ ...prev, noBgImage: noBgUrl, progress: 100 }));
      if (abortRef.current) return;

      // Step 3: Upload to Tripo
      setState(prev => ({ ...prev, step: 'multi-view', progress: 20 }));

      const noBgFile = new File([noBgBlob], 'no-bg.png', { type: 'image/png' });
      const uploadForm = new FormData();
      uploadForm.append('image', noBgFile);

      const { data: uploadData, error: uploadError } = await supabase.functions.invoke('generate-3d', {
        body: uploadForm,
        headers: { 'x-action': 'upload' },
      });

      if (uploadError) throw new Error(`Erro no upload Tripo: ${uploadError.message}`);

      const fileToken = uploadData?.data?.image_token;
      if (!fileToken) {
        console.error('Upload response:', uploadData);
        throw new Error('Não recebeu file_token do Tripo');
      }

      setState(prev => ({ ...prev, progress: 60 }));
      if (abortRef.current) return;

      // Step 4: Create 3D generation task
      setState(prev => ({ ...prev, step: 'generating-3d', progress: 5 }));

      const { data: taskData, error: taskError } = await supabase.functions.invoke('generate-3d', {
        body: { file_token: fileToken },
        headers: { 'x-action': 'create-task' },
      });

      if (taskError) throw new Error(`Erro ao criar tarefa 3D: ${taskError.message}`);

      const taskId = taskData?.data?.task_id;
      if (!taskId) {
        console.error('Task response:', taskData);
        throw new Error('Não recebeu task_id do Tripo');
      }

      setState(prev => ({ ...prev, taskId }));

      // Step 5: Poll for completion
      let attempts = 0;
      const maxAttempts = 120;

      while (attempts < maxAttempts) {
        if (abortRef.current) return;

        await new Promise(r => setTimeout(r, 5000));
        attempts++;

        const { data: pollData, error: pollError } = await supabase.functions.invoke('generate-3d', {
          body: { task_id: taskId },
          headers: { 'x-action': 'poll' },
        });

        if (pollError) {
          console.error('Poll error:', pollError);
          continue;
        }

        const status = pollData?.data?.status;
        const progress = pollData?.data?.progress || 0;

        setState(prev => ({ ...prev, progress: Math.min(Math.round(progress * 100), 95) }));

        if (status === 'success') {
          const modelUrl = pollData?.data?.output?.model;
          if (!modelUrl) throw new Error('Modelo gerado mas URL não encontrada');

          const renderedImage = pollData?.data?.output?.rendered_image;
          if (renderedImage) {
            setState(prev => ({ ...prev, multiViewImages: [renderedImage] }));
          }

          setState(prev => ({
            ...prev,
            modelUrl,
            step: 'done',
            progress: 100,
          }));
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
