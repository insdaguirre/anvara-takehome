'use client';

import React, { Children, useCallback, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';

import styles from './Stepper.module.css';

type StepperProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  initialStep?: number;
  onStepChange?: (step: number) => void;
  onFinalStepCompleted?: () => void;
  stepCircleContainerClassName?: string;
  stepContainerClassName?: string;
  contentClassName?: string;
  footerClassName?: string;
  backButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
  nextButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
  backButtonText?: string;
  nextButtonText?: string;
  finalStepButtonText?: string;
  finalStepHref?: string;
  disableStepIndicators?: boolean;
  renderStepIndicator?: (args: {
    step: number;
    currentStep: number;
    onStepClick: (step: number) => void;
  }) => React.ReactNode;
};

function cx(...classNames: Array<string | undefined | false>) {
  return classNames.filter(Boolean).join(' ');
}

export default function Stepper({
  children,
  initialStep = 1,
  onStepChange = () => {},
  onFinalStepCompleted = () => {},
  stepCircleContainerClassName = '',
  stepContainerClassName = '',
  contentClassName = '',
  footerClassName = '',
  backButtonProps = {},
  nextButtonProps = {},
  backButtonText = 'Back',
  nextButtonText = 'Continue',
  finalStepButtonText,
  finalStepHref,
  disableStepIndicators = false,
  renderStepIndicator,
  className,
  ...rest
}: StepperProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [direction, setDirection] = useState(0);
  const stepsArray = Children.toArray(children);
  const totalSteps = stepsArray.length;
  const isLastStep = currentStep === totalSteps;

  const { className: backButtonClassName, ...backButtonRestProps } = backButtonProps;
  const { className: nextButtonClassName, ...nextButtonRestProps } = nextButtonProps;

  const updateStep = (newStep: number) => {
    setCurrentStep(newStep);
    onStepChange(newStep);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setDirection(-1);
      updateStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (!isLastStep) {
      setDirection(1);
      updateStep(currentStep + 1);
    }
  };

  const handleComplete = () => {
    if (finalStepHref) {
      router.push(finalStepHref);
      return;
    }
    onFinalStepCompleted();
  };

  return (
    <div className={cx(styles.stepperOuter, className)} {...rest}>
      <div
        className={cx(styles.stepCircleContainer, stepCircleContainerClassName)}
        style={{ border: '1px solid var(--color-border)' }}
      >
        <div className={cx(styles.stepIndicatorRow, stepContainerClassName)}>
          {stepsArray.map((_, index) => {
            const stepNumber = index + 1;
            const isNotLastStep = index < totalSteps - 1;
            return (
              <React.Fragment key={stepNumber}>
                {renderStepIndicator ? (
                  renderStepIndicator({
                    step: stepNumber,
                    currentStep,
                    onStepClick: (clicked) => {
                      setDirection(clicked > currentStep ? 1 : -1);
                      updateStep(clicked);
                    },
                  })
                ) : (
                  <StepIndicator
                    step={stepNumber}
                    disableStepIndicators={disableStepIndicators}
                    currentStep={currentStep}
                    onClickStep={(clicked) => {
                      setDirection(clicked > currentStep ? 1 : -1);
                      updateStep(clicked);
                    }}
                  />
                )}
                {isNotLastStep ? <StepConnector isComplete={currentStep > stepNumber} /> : null}
              </React.Fragment>
            );
          })}
        </div>

        <StepContentWrapper
          currentStep={currentStep}
          direction={direction}
          className={cx(styles.stepContentDefault, contentClassName)}
        >
          {stepsArray[currentStep - 1]}
        </StepContentWrapper>

        <div className={cx(styles.footerContainer, footerClassName)}>
          <div className={cx(styles.footerNav, currentStep !== 1 ? styles.spread : styles.end)}>
            {currentStep !== 1 ? (
              <button
                onClick={handleBack}
                className={cx(
                  styles.backButton,
                  currentStep === 1 ? styles.inactive : '',
                  backButtonClassName
                )}
                {...backButtonRestProps}
              >
                {backButtonText}
              </button>
            ) : null}
            <button
              onClick={isLastStep ? handleComplete : handleNext}
              className={cx(styles.nextButton, nextButtonClassName)}
              {...nextButtonRestProps}
            >
              {isLastStep ? (finalStepButtonText ?? nextButtonText) : nextButtonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepContentWrapper({
  currentStep,
  direction,
  children,
  className,
}: {
  currentStep: number;
  direction: number;
  children: React.ReactNode;
  className?: string;
}) {
  const [parentHeight, setParentHeight] = useState(0);
  const handleHeightReady = useCallback((height: number) => {
    setParentHeight(height);
  }, []);

  return (
    <motion.div
      className={className}
      style={{ position: 'relative', overflow: 'hidden' }}
      animate={{ height: parentHeight }}
      transition={{ type: 'spring', duration: 0.4 }}
    >
      <AnimatePresence initial={false} mode="sync" custom={direction}>
        <SlideTransition
          key={currentStep}
          direction={direction}
          onHeightReady={handleHeightReady}
        >
          {children}
        </SlideTransition>
      </AnimatePresence>
    </motion.div>
  );
}

function SlideTransition({
  children,
  direction,
  onHeightReady,
}: {
  children: React.ReactNode;
  direction: number;
  onHeightReady: (height: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (containerRef.current) {
      onHeightReady(containerRef.current.offsetHeight);
    }
  }, [children, onHeightReady]);

  return (
    <motion.div
      ref={containerRef}
      custom={direction}
      variants={stepVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.4 }}
      style={{ position: 'absolute', left: 0, right: 0, top: 0 }}
    >
      {children}
    </motion.div>
  );
}

const stepVariants = {
  enter: (dir: number) => ({
    x: dir >= 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: '0%',
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir >= 0 ? '-50%' : '50%',
    opacity: 0,
  }),
};

export function Step({ children }: { children: React.ReactNode }) {
  return <div className={styles.stepDefault}>{children}</div>;
}

function StepIndicator({
  step,
  currentStep,
  onClickStep,
  disableStepIndicators,
}: {
  step: number;
  currentStep: number;
  onClickStep: (step: number) => void;
  disableStepIndicators: boolean;
}) {
  const status = currentStep === step ? 'active' : currentStep < step ? 'inactive' : 'complete';

  const handleClick = () => {
    if (step !== currentStep && !disableStepIndicators) {
      onClickStep(step);
    }
  };

  return (
    <motion.div onClick={handleClick} className={styles.stepIndicator} animate={status} initial={false}>
      <motion.div
        variants={{
          inactive: {
            scale: 1,
            backgroundColor: 'rgba(100, 116, 139, 0.24)',
            color: 'var(--color-muted)',
          },
          active: {
            scale: 1,
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-primary)',
          },
          complete: {
            scale: 1,
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-primary)',
          },
        }}
        transition={{ duration: 0.3 }}
        className={styles.stepIndicatorInner}
      >
        {status === 'complete' ? (
          <CheckIcon className={styles.checkIcon} />
        ) : status === 'active' ? (
          <div className={styles.activeDot} />
        ) : (
          <span className={styles.stepNumber}>{step}</span>
        )}
      </motion.div>
    </motion.div>
  );
}

function StepConnector({ isComplete }: { isComplete: boolean }) {
  const lineVariants = {
    incomplete: { width: 0, backgroundColor: 'transparent' },
    complete: { width: '100%', backgroundColor: 'var(--color-primary)' },
  };

  return (
    <div className={styles.stepConnector}>
      <motion.div
        className={styles.stepConnectorInner}
        variants={lineVariants}
        initial={false}
        animate={isComplete ? 'complete' : 'incomplete'}
        transition={{ duration: 0.4 }}
      />
    </div>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <motion.path
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.1, type: 'tween', ease: 'easeOut', duration: 0.3 }}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}
