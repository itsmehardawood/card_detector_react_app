'use client'
import React, { useState, useEffect, useRef } from 'react';

// Import components
import ControlPanel from './components/ControlPanel';
import StatusInformation from './components/StatusInfo';

// Import utilities
import { initializeCamera, captureFrame, cleanupCamera } from './utils/CameraUtils';
import { sendFrameToAPI } from './utils/apiService';
import { useDetection } from './hooks/UseDetection';
import CameraView from './components/CameraView';

// Constants for attempt limits and timeouts
const MAX_ATTEMPTS = 3;
const DETECTION_TIMEOUT = 10000; // 10 seconds

const CardDetectionApp = () => {
  // State management
  const [currentPhase, setCurrentPhase] = useState('idle');
  const [detectionActive, setDetectionActive] = useState(false);
  const [finalOcrResults, setFinalOcrResults] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [sessionId, setSessionId] = useState('');
  
  // New state for attempt tracking
  const [attemptCount, setAttemptCount] = useState(0);
  const [maxAttemptsReached, setMaxAttemptsReached] = useState(false);
  const [currentOperation, setCurrentOperation] = useState(''); // 'validation', 'front', 'back'
  
  const [validationState, setValidationState] = useState({
    physicalCard: false,
    movementState: null,
    movementMessage: '',
    validationComplete: false
  });
  
  // Updated frontScanState to include bankLogoDetected
  const [frontScanState, setFrontScanState] = useState({
    framesBuffered: 0,
    chipDetected: false,
    bankLogoDetected: false,
    canProceedToBack: false
  });
  
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const capturedFrames = useRef([]);
  const countdownIntervalRef = useRef(null);
  const validationIntervalRef = useRef(null);
  const stopRequestedRef = useRef(false);
  const detectionTimeoutRef = useRef(null);

  // Custom hook for detection logic
  const { captureAndSendFramesFront, captureAndSendFrames, captureIntervalRef } = useDetection(
    videoRef,
    canvasRef,
    sessionId,
    setSessionId,
    setIsProcessing,
    setCurrentPhase,
    setErrorMessage,
    setFrontScanState,
    stopRequestedRef
  );

  // Helper function to handle detection timeout
  const startDetectionTimeout = (operation) => {
    if (detectionTimeoutRef.current) {
      clearTimeout(detectionTimeoutRef.current);
    }
    
    detectionTimeoutRef.current = setTimeout(() => {
      if (!stopRequestedRef.current && (detectionActive || isProcessing)) {
        handleDetectionFailure(`${operation} detection timeout. No detection occurred within 10 seconds.`, operation);
      }
    }, DETECTION_TIMEOUT);
  };

  // Helper function to clear detection timeout
  const clearDetectionTimeout = () => {
    if (detectionTimeoutRef.current) {
      clearTimeout(detectionTimeoutRef.current);
      detectionTimeoutRef.current = null;
    }
  };

  // Helper function to handle detection failures with attempt tracking
  const handleDetectionFailure = (message, operation) => {
    clearDetectionTimeout();
    stopRequestedRef.current = true;
    
    // Clear all intervals
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    
    if (validationIntervalRef.current) {
      clearInterval(validationIntervalRef.current);
      validationIntervalRef.current = null;
    }
    
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    
    setDetectionActive(false);
    setIsProcessing(false);
    setCountdown(0);
    
    const newAttemptCount = attemptCount + 1;
    setAttemptCount(newAttemptCount);
    setCurrentOperation(operation);
    
    if (newAttemptCount >= MAX_ATTEMPTS) {
      setMaxAttemptsReached(true);
      setErrorMessage('Maximum attempts reached. Please contact support for assistance.');
      setCurrentPhase('max-attempts-reached');
    } else {
      setErrorMessage(`${message} (Attempt ${newAttemptCount}/${MAX_ATTEMPTS})`);
      setCurrentPhase('error');
    }
  };

  // Initialize camera on component mount
  useEffect(() => {
    const setupCamera = async () => {
      try {
        await initializeCamera(videoRef);
      } catch (error) {
        alert(error.message);
      }
    };

    setupCamera();

    return () => {
      cleanupCamera(videoRef);
      clearDetectionTimeout();

      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
      }

      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }

      if (validationIntervalRef.current) {
        clearInterval(validationIntervalRef.current);
      }
    };
  }, []);

  // Stop function to halt all active processes
  const stopDetection = () => {
    stopRequestedRef.current = true;
    clearDetectionTimeout();
    
    // Clear all intervals
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    
    if (validationIntervalRef.current) {
      clearInterval(validationIntervalRef.current);
      validationIntervalRef.current = null;
    }
    
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    
    // Reset states
    setDetectionActive(false);
    setIsProcessing(false);
    setCountdown(0);
    
    // Return to appropriate phase based on current state
    if (currentPhase === 'validation') {
      setCurrentPhase('idle');
      setValidationState({
        physicalCard: false,
        movementState: null,
        movementMessage: '',
        validationComplete: false
      });
    } else if (currentPhase === 'front-countdown' || currentPhase === 'front') {
      setCurrentPhase('ready-for-front');
      setFrontScanState({
        framesBuffered: 0,
        chipDetected: false,
        bankLogoDetected: false,
        canProceedToBack: false
      });
    } else if (currentPhase === 'back-countdown' || currentPhase === 'back') {
      setCurrentPhase('ready-for-back');
    }
  };

  // Countdown function
  const startCountdown = (onComplete) => {
    setCountdown(3);
    stopRequestedRef.current = false;
    
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          if (!stopRequestedRef.current) {
            onComplete();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Card validation process with timeout handling
  const startCardValidation = async () => {
    if (maxAttemptsReached) return;
    
    setCurrentPhase('validation');
    setErrorMessage('');
    stopRequestedRef.current = false;
    setValidationState({
      physicalCard: false,
      movementState: null,
      movementMessage: 'Starting validation...',
      validationComplete: false
    });

    const currentSessionId = `session_${Date.now()}`;
    setSessionId(currentSessionId);

    let frameNumber = 0;
    let validationComplete = false;
    const maxValidationTime = 18000;
    const startTime = Date.now();

    // Start detection timeout
    startDetectionTimeout('Validation');

    if (!videoRef.current || videoRef.current.readyState < 2) {
      handleDetectionFailure('Video not ready for capture', 'validation');
      return;
    }

    const processValidationFrame = async () => {
      try {
        if (stopRequestedRef.current || validationComplete || (Date.now() - startTime) > maxValidationTime) {
          return;
        }

        const frame = await captureFrame(videoRef, canvasRef);
        if (!frame || frame.size === 0) {
          return;
        }

        frameNumber++;
        setIsProcessing(true);

        const apiResponse = await sendFrameToAPI(frame, 'validation', currentSessionId, frameNumber);
        
        if (stopRequestedRef.current) {
          setIsProcessing(false);
          return;
        }
        
        const newValidationState = {
          physicalCard: apiResponse.physical_card || false,
          movementState: apiResponse.movement_state || null,
          movementMessage: apiResponse.movement_message || '',
          validationComplete: apiResponse.physical_card || false
        };

        setValidationState(newValidationState);
        setIsProcessing(false);

        if (newValidationState.validationComplete && !stopRequestedRef.current) {
          validationComplete = true;
          clearDetectionTimeout();
          
          if (validationIntervalRef.current) {
            clearInterval(validationIntervalRef.current);
          }
          
          // Reset attempt count on successful validation
          setAttemptCount(0);
          setCurrentOperation('');
          
          setTimeout(() => {
            if (!stopRequestedRef.current) {
              setCurrentPhase('ready-for-front');
            }
          }, 2000);
        }

      } catch (error) {
        console.error('Validation frame processing error:', error);
        setIsProcessing(false);
      }
    };

    processValidationFrame();
    validationIntervalRef.current = setInterval(processValidationFrame, 1200);

    setTimeout(() => {
      if (!validationComplete && !stopRequestedRef.current) {
        if (validationIntervalRef.current) {
          clearInterval(validationIntervalRef.current);
        }
        handleDetectionFailure('Our intelligence system requires you to try again since the card scan failed', 'validation');
      }
    }, maxValidationTime);
  };

  const startFrontSideDetection = async () => {
    if (maxAttemptsReached) return;
    
    setFrontScanState({
      framesBuffered: 0,
      chipDetected: false,
      bankLogoDetected: false,
      canProceedToBack: false
    });

    setCurrentPhase('front-countdown');
    setErrorMessage('');

    startCountdown(async () => {
      if (stopRequestedRef.current) return;
      
      setCurrentPhase('front');
      setDetectionActive(true);
      stopRequestedRef.current = false;

      // Start detection timeout
      startDetectionTimeout('Front side');

      try {
        await captureAndSendFramesFront('front');
        
        if (!stopRequestedRef.current) {
          clearDetectionTimeout();
          setDetectionActive(false);
          // Reset attempt count on successful front scan
          setAttemptCount(0);
          setCurrentOperation('');
          setCurrentPhase('ready-for-back');
        }
        
      } catch (error) {
        console.error('Front side detection failed:', error);
        setDetectionActive(false);
        if (!stopRequestedRef.current) {
          handleDetectionFailure(`Front side detection failed: ${error.message}`, 'front');
        }
      }
    });
  };

  const startBackSideDetection = async () => {
    if (maxAttemptsReached) return;
    
    setCurrentPhase('back-countdown');
    setErrorMessage('');

    startCountdown(async () => {
      if (stopRequestedRef.current) return;
      
      setCurrentPhase('back');
      setDetectionActive(true);
      stopRequestedRef.current = false;

      // Start detection timeout
      startDetectionTimeout('Back side');

      try {
        const finalResult = await captureAndSendFrames('back');
        
        if (!stopRequestedRef.current) {
          clearDetectionTimeout();
          setFinalOcrResults(finalResult);
          setCurrentPhase('results');
          setDetectionActive(false);
          // Reset attempt count on successful completion
          setAttemptCount(0);
          setCurrentOperation('');
        }
        
      } catch (error) {
        console.error('Back side detection failed:', error);
        setDetectionActive(false);
        if (!stopRequestedRef.current) {
          handleDetectionFailure(`Back side detection failed: ${error.message}`, 'back');
        }
      }
    });
  };

  const resetApplication = () => {
    stopRequestedRef.current = true;
    clearDetectionTimeout();
    
    setCurrentPhase('idle');
    setDetectionActive(false);
    setFinalOcrResults(null);
    setIsProcessing(false);
    setCountdown(0);
    setErrorMessage('');
    setSessionId('');
    
    // Reset attempt tracking completely - this is for "Start New Session"
    setAttemptCount(0);
    setMaxAttemptsReached(false);
    setCurrentOperation('');
    
    setValidationState({
      physicalCard: false,
      movementState: null,
      movementMessage: '',
      validationComplete: false
    });
    setFrontScanState({
      framesBuffered: 0,
      chipDetected: false,
      bankLogoDetected: false,
      canProceedToBack: false
    });
    capturedFrames.current = [];
    
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    if (validationIntervalRef.current) {
      clearInterval(validationIntervalRef.current);
    }
    
    stopRequestedRef.current = false;
  };

  // New function specifically for "Try Again" - keeps attempt count
  const handleTryAgain = () => {
    stopRequestedRef.current = true;
    clearDetectionTimeout();
    
    // Don't reset attempt count here - keep it for tracking
    setDetectionActive(false);
    setIsProcessing(false);
    setCountdown(0);
    setErrorMessage('');
    
    // Return to the appropriate phase based on what operation failed
    if (currentOperation === 'validation') {
      setCurrentPhase('idle');
      setValidationState({
        physicalCard: false,
        movementState: null,
        movementMessage: '',
        validationComplete: false
      });
    } else if (currentOperation === 'front') {
      setCurrentPhase('ready-for-front');
      setFrontScanState({
        framesBuffered: 0,
        chipDetected: false,
        bankLogoDetected: false,
        canProceedToBack: false
      });
    } else if (currentOperation === 'back') {
      setCurrentPhase('ready-for-back');
    } else {
      // Default fallback
      setCurrentPhase('idle');
    }
    
    // Clean up intervals
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    if (validationIntervalRef.current) {
      clearInterval(validationIntervalRef.current);
    }
    
    stopRequestedRef.current = false;
  };

  const handleStartOver = () => {
    stopRequestedRef.current = true;
    clearDetectionTimeout();
    setCurrentPhase('idle');
    setErrorMessage('');
    // Reset attempt tracking when starting over
    setAttemptCount(0);
    setMaxAttemptsReached(false);
    setCurrentOperation('');
    stopRequestedRef.current = false;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-700 to-black p-4 sm:p-4">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-xl bg-white p-2 sm:text-2xl lg:text-3xl mb-5 rounded-md font-bold text-center mb-4 sm:mb-8 text-gray-900">
          Card Protection Intelligence System
        </h1>

        <CameraView
          videoRef={videoRef}
          canvasRef={canvasRef}
          currentPhase={currentPhase}
          countdown={countdown}
          detectionActive={detectionActive}
          validationState={validationState}
          frontScanState={frontScanState}
          isProcessing={isProcessing}
        />

        <ControlPanel
          currentPhase={currentPhase}
          onStartValidation={startCardValidation}
          onStartFrontScan={startFrontSideDetection}
          onStartBackScan={startBackSideDetection}
          onStop={stopDetection}
          onReset={resetApplication}
          onTryAgain={handleTryAgain}
          onStartOver={handleStartOver}
          validationState={validationState}
          frontScanState={frontScanState}
          countdown={countdown}
          errorMessage={errorMessage}
          finalOcrResults={finalOcrResults}
          detectionActive={detectionActive}
          isProcessing={isProcessing}
          attemptCount={attemptCount}
          maxAttempts={MAX_ATTEMPTS}
          maxAttemptsReached={maxAttemptsReached}
        />

        <StatusInformation
          currentPhase={currentPhase}
          sessionId={sessionId}
          validationState={validationState}
          frontScanState={frontScanState}
          detectionActive={detectionActive}
        />
      </div>
    </div>
  );
};

export default CardDetectionApp;