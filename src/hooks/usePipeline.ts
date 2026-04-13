import { useState, useCallback } from 'react';
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

// This hook manages pipeline state. 
// Actual API calls will be done via your Vercel backend.
export function usePipeline() {
  const [state, setState] = useState<PipelineState>(initialState);

  const setStep = useCallback((step: PipelineStep, progress = 0) => {
    setState(prev => ({ ...prev, step, progress, errorMessage: step === 'error' ? prev.errorMessage : null }));
  }, []);

  const setError = useCallback((message: string) => {
    setState(prev => ({ ...prev, step: 'error', errorMessage: message }));
  }, []);

  const setOriginalImage = useCallback((url: string) => {
    setState(prev => ({ ...prev, originalImage: url }));
  }, []);

  const setNoBgImage = useCallback((url: string) => {
    setState(prev => ({ ...prev, noBgImage: url }));
  }, []);

  const setMultiViewImages = useCallback((urls: string[]) => {
    setState(prev => ({ ...prev, multiViewImages: urls }));
  }, []);

  const setModelUrl = useCallback((url: string) => {
    setState(prev => ({ ...prev, modelUrl: url }));
  }, []);

  const setModelFormat = useCallback((format: 'glb' | 'obj' | 'fbx') => {
    setState(prev => ({ ...prev, modelFormat: format }));
  }, []);

  const setTaskId = useCallback((id: string) => {
    setState(prev => ({ ...prev, taskId: id }));
  }, []);

  const setProgress = useCallback((progress: number) => {
    setState(prev => ({ ...prev, progress }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  // Simulated pipeline for demo purposes
  const runDemoPipeline = useCallback(async (file: File) => {
    const imageUrl = URL.createObjectURL(file);
    setOriginalImage(imageUrl);

    // Step 1: Upload
    setStep('uploading', 10);
    await new Promise(r => setTimeout(r, 1000));
    setProgress(100);

    // Step 2: Remove BG
    setStep('removing-bg', 0);
    await new Promise(r => setTimeout(r, 2000));
    setNoBgImage(imageUrl); // In real app, this would be the processed image
    setProgress(100);

    // Step 3: Multi-view
    setStep('multi-view', 0);
    await new Promise(r => setTimeout(r, 2500));
    setMultiViewImages([imageUrl, imageUrl, imageUrl]);
    setProgress(100);

    // Step 4: Generate 3D
    setStep('generating-3d', 0);
    for (let i = 0; i <= 100; i += 5) {
      await new Promise(r => setTimeout(r, 200));
      setProgress(i);
    }

    // Done (no real model in demo)
    setStep('done', 100);
  }, [setStep, setProgress, setOriginalImage, setNoBgImage, setMultiViewImages]);

  return {
    state,
    setStep,
    setError,
    setOriginalImage,
    setNoBgImage,
    setMultiViewImages,
    setModelUrl,
    setModelFormat,
    setTaskId,
    setProgress,
    reset,
    runDemoPipeline,
  };
}
