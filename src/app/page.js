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

const CardDetectionApp = () => {
  // State management
  const [currentPhase, setCurrentPhase] = useState('idle');
  const [detectionActive, setDetectionActive] = useState(false);
  const [finalOcrResults, setFinalOcrResults] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [validationState, setValidationState] = useState({
    physicalCard: false,
    movementState: null,
    movementMessage: '',
    validationComplete: false
  });
  const [frontScanState, setFrontScanState] = useState({
    framesBuffered: 0,
    chipDetected: false,
    canProceedToBack: false
  });
  
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const capturedFrames = useRef([]);
  const countdownIntervalRef = useRef(null);
  const validationIntervalRef = useRef(null);
  const stopRequestedRef = useRef(false);

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
    stopRequestedRef // Pass the stop ref to the hook
  );

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
        canProceedToBack: false
      });
    } else if (currentPhase === 'back-countdown' || currentPhase === 'back') {
      setCurrentPhase('ready-for-back');
    }
  };

  // Countdown function
  const startCountdown = (onComplete) => {
    setCountdown(5);
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

  // Card validation process
  const startCardValidation = async () => {
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
    const maxValidationTime = 50000;
    const startTime = Date.now();

    if (!videoRef.current || videoRef.current.readyState < 2) {
      setErrorMessage('Video not ready for capture');
      setCurrentPhase('error');
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
          if (validationIntervalRef.current) {
            clearInterval(validationIntervalRef.current);
          }
          
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
        setErrorMessage('Card validation timeout. Please ensure your card is clearly visible and try again.');
        setCurrentPhase('error');
      }
    }, maxValidationTime);
  };

  const startFrontSideDetection = async () => {
    setFrontScanState({
      framesBuffered: 0,
      chipDetected: false,
      canProceedToBack: false
    });

    setCurrentPhase('front-countdown');
    setErrorMessage('');

    startCountdown(async () => {
      if (stopRequestedRef.current) return;
      
      setCurrentPhase('front');
      setDetectionActive(true);
      stopRequestedRef.current = false;

      try {
        await captureAndSendFramesFront('front');
        
        if (!stopRequestedRef.current) {
          setDetectionActive(false);
          setCurrentPhase('ready-for-back');
        }
        
      } catch (error) {
        console.error('Front side detection failed:', error);
        setDetectionActive(false);
        if (!stopRequestedRef.current) {
          setErrorMessage(`Front side detection failed: ${error.message}`);
          setCurrentPhase('error');
        }
      }
    });
  };

  const startBackSideDetection = async () => {
    setCurrentPhase('back-countdown');
    setErrorMessage('');

    startCountdown(async () => {
      if (stopRequestedRef.current) return;
      
      setCurrentPhase('back');
      setDetectionActive(true);
      stopRequestedRef.current = false;

      try {
        const finalResult = await captureAndSendFrames('back');
        
        if (!stopRequestedRef.current) {
          setFinalOcrResults(finalResult);
          setCurrentPhase('results');
          setDetectionActive(false);
        }
        
      } catch (error) {
        console.error('Back side detection failed:', error);
        setDetectionActive(false);
        if (!stopRequestedRef.current) {
          setErrorMessage(`Back side detection failed: ${error.message}`);
          setCurrentPhase('error');
        }
      }
    });
  };

  const resetApplication = () => {
    stopRequestedRef.current = true;
    
    setCurrentPhase('idle');
    setDetectionActive(false);
    setFinalOcrResults(null);
    setIsProcessing(false);
    setCountdown(0);
    setErrorMessage('');
    setSessionId('');
    setValidationState({
      physicalCard: false,
      movementState: null,
      movementMessage: '',
      validationComplete: false
    });
    setFrontScanState({
      framesBuffered: 0,
      chipDetected: false,
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

  const handleStartOver = () => {
    stopRequestedRef.current = true;
    setCurrentPhase('idle');
    setErrorMessage('');
    stopRequestedRef.current = false;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-700 to-black p-4 sm:p-4">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-xl bg-white p-2 sm:text-2xl lg:text-3xl mb-5 rounded-md font-bold text-center mb-4 sm:mb-8 text-gray-900">
          Card Detection System
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
          onStartOver={handleStartOver}
          validationState={validationState}
          frontScanState={frontScanState}
          countdown={countdown}
          errorMessage={errorMessage}
          finalOcrResults={finalOcrResults}
          detectionActive={detectionActive}
          isProcessing={isProcessing}
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