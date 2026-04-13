import { Check, Loader2, Circle, AlertCircle } from 'lucide-react';
import { PipelineStep, STEPS_ORDER, STEP_LABELS } from '@/types/pipeline';

interface PipelineProgressProps {
  currentStep: PipelineStep;
  progress: number;
}

function StepIcon({ status }: { status: 'done' | 'active' | 'pending' | 'error' }) {
  if (status === 'done') return <Check className="w-4 h-4 text-primary-foreground" />;
  if (status === 'active') return <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" />;
  if (status === 'error') return <AlertCircle className="w-4 h-4 text-destructive-foreground" />;
  return <Circle className="w-3 h-3 text-muted-foreground" />;
}

function getStatus(step: PipelineStep, currentStep: PipelineStep): 'done' | 'active' | 'pending' | 'error' {
  if (currentStep === 'error') return 'error';
  const currentIdx = STEPS_ORDER.indexOf(currentStep);
  const stepIdx = STEPS_ORDER.indexOf(step);
  if (stepIdx < currentIdx) return 'done';
  if (stepIdx === currentIdx) return 'active';
  return 'pending';
}

export function PipelineProgress({ currentStep, progress }: PipelineProgressProps) {
  if (currentStep === 'idle') return null;

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        {STEPS_ORDER.map((step, i) => {
          const status = getStatus(step, currentStep);
          return (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500
                    ${status === 'done' ? 'bg-primary shadow-glow' : ''}
                    ${status === 'active' ? 'bg-primary animate-pulse-glow' : ''}
                    ${status === 'pending' ? 'bg-secondary' : ''}
                    ${status === 'error' ? 'bg-destructive' : ''}
                  `}
                >
                  <StepIcon status={status} />
                </div>
                <span className={`text-xs mt-2 text-center max-w-[80px] leading-tight ${
                  status === 'active' ? 'text-primary font-medium' :
                  status === 'done' ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {STEP_LABELS[step]}
                </span>
              </div>
              {i < STEPS_ORDER.length - 1 && (
                <div className={`flex-1 h-px mx-2 mb-6 transition-colors duration-500 ${
                  getStatus(STEPS_ORDER[i + 1], currentStep) !== 'pending'
                    ? 'bg-primary/50'
                    : 'bg-border'
                }`} />
              )}
            </div>
          );
        })}
      </div>

      {currentStep !== 'done' && (currentStep as string) !== 'idle' && currentStep !== 'error' && (
        <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${progress}%`,
              background: 'var(--gradient-primary)',
            }}
          />
        </div>
      )}
    </div>
  );
}
