// app/page.js (Replace existing page.js)
'use client'
import React, { useState, useEffect } from 'react';
import { Smartphone, Monitor, Scan, Shield, CreditCard } from 'lucide-react';
import QRCode from 'react-qr-code';

// Import components
// Replace the imports section at the top of your page.js file with this:

// Import components
import ControlPanel from './components/ControlPanel';
import StatusInformation from './components/StatusInfo';
import CameraView from './components/CameraView';

// Import utilities
import { initializeCamera, captureFrame, cleanupCamera } from './utils/CameraUtils';
import { sendFrameToAPI } from './utils/apiService';
import { useDetection } from './hooks/UseDetection';


// Constants for attempt limits and timeouts
const MAX_ATTEMPTS = 3;
const DETECTION_TIMEOUT = 40000; // 17 seconds

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
    // Detect device type
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isTablet = /iPad|Android/i.test(navigator.userAgent) && window.innerWidth > 768;
    
    if (isMobile && !isTablet) {
      setDeviceType('mobile');
    } else {
      setDeviceType('desktop');
    }
  }, []);

  const validateInputs = () => {
    if (!merchantId.trim()) {
      setError('Merchant ID is required');
      return false;
    }
    if (merchantId.length < 3) {
      setError('Merchant ID must be at least 3 characters');
      return false;
    }
    if (!authToken.trim()) {
      setError('Auth Token is required');
      return false;
    }
    if (authToken.length !== 32) {
      setError('Auth Token must be exactly 32 characters');
      return false;
    }
    return true;
  };

  const handleStartScan = async () => {
    setError('');
    
    if (!validateInputs()) {
      return;
    }

    setIsLoading(true);

    try {
      // Use Next.js API route as proxy
      const response = await fetch('/api/start-scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          merchant_id: merchantId,
          auth_token: authToken,
          device_info: {
            type: deviceType,
            user_agent: navigator.userAgent,
            screen_width: window.innerWidth,
            screen_height: window.innerHeight,
            timestamp: new Date().toISOString(),
            platform: navigator.platform,
            language: navigator.language
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.device_type === 'mobile') {
        // Store session data and redirect to security scan page
        localStorage.setItem('scanSession', JSON.stringify({
          sessionId: data.session_id,
          merchantId: merchantId
        }));
        window.location.href = `/securityscan?session=${data.session_id}`;
      } else {
        // Show QR code for desktop users
        const baseUrl = window.location.origin;
        const scanUrl = `${baseUrl}/securityscan?session=${data.session_id}&merchant=${merchantId}`;
        setScanUrl(scanUrl);
        setShowQR(true);
      }

    } catch (err) {
      console.error('Start scan error:', err);
      setError(err.message || 'Failed to start scan. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
    const maxValidationTime = 27000;
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
    
    // FIXED: Check for validation failures in both message_state AND movement_state
    if (apiResponse.message_state === "VALIDATION_FAILED" || 
        apiResponse.movement_state === "VALIDATION_FAILED") {
      validationComplete = true;
      clearDetectionTimeout();
      
      if (validationIntervalRef.current) {
        clearInterval(validationIntervalRef.current);
      }
      
      setIsProcessing(false);
      
      // Use appropriate error message based on which field contains the failure
      const errorMsg = apiResponse.message || 
                      (apiResponse.movement_state === "VALIDATION_FAILED" ? 
                       'Card validation failed. Please ensure you have a physical card and try again.' : 
                       'Validation failed. Please try again.');
      
      handleDetectionFailure(errorMsg, 'validation');
      return;
    }

    // FIXED: Check for validation success in both fields
    if (apiResponse.message_state === "VALIDATION_PASSED" || 
        apiResponse.movement_state === "VALIDATION_PASSED") {
      validationComplete = true;
      clearDetectionTimeout();
      
      if (validationIntervalRef.current) {
        clearInterval(validationIntervalRef.current);
      }
      
      setIsProcessing(false);
      // Reset attempt count on successful validation
      setAttemptCount(0);
      setCurrentOperation('');
      
      setTimeout(() => {
        if (!stopRequestedRef.current) {
          setCurrentPhase('ready-for-front');
        }
      }, 2000);
      return;
    }
    
    // Update validation state - show failure message immediately if movement_state indicates failure
    const newValidationState = {
      physicalCard: apiResponse.physical_card || false,
      movementState: apiResponse.movement_state || null,
      movementMessage: apiResponse.movement_message || 
                      (apiResponse.movement_state === "VALIDATION_FAILED" ? 
                       'Validation Failed' : ''),
      validationComplete: apiResponse.physical_card || false
    };

    setValidationState(newValidationState);
    setIsProcessing(false);

    // Keep the existing logic for backward compatibility
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
    validationIntervalRef.current = setInterval(processValidationFrame, 1500);

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
          setDetectionActive(false);
          
          // CRITICAL FIX: Proper check for final encrypted response
          console.log('🔍 Checking final result:', finalResult);
          
          if (finalResult.encrypted_card_data && finalResult.status) {
            console.log('🎯 Final encrypted response detected - Setting phase to final_response');
            console.log(`Status: ${finalResult.status}, Score: ${finalResult.score}`);
            setFinalOcrResults(finalResult);
            setCurrentPhase('final_response');
          } else if (finalResult.final_ocr) {
            console.log('📋 Regular OCR results - Setting phase to results');
            setFinalOcrResults(finalResult);
            setCurrentPhase('results');
          } else {
            console.log('⚠️ No final OCR or encrypted data found');
            setFinalOcrResults(finalResult);
            setCurrentPhase('results');
          }
          
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
    setShowQR(false);
    setScanUrl('');
    setError('');
  };

  if (showQR) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <Monitor className="w-16 h-16 mx-auto mb-4 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Desktop Detected
            </h1>
            <p className="text-gray-600">
              Scan the QR code with your mobile device to start the security scan
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg border-2 border-gray-200 mb-6">
            <QRCode
              size={200}
              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              value={scanUrl}
              viewBox={`0 0 200 200`}
            />
          </div>

          <p className="text-sm text-gray-500 mb-6">
            Open your mobile camera and scan this QR code
          </p>

          <button
            onClick={handleTryAgain}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Card Security Scanner
          </h1>
          <p className="text-gray-600">
            Secure card validation and OCR processing
          </p>
        </div>

        {/* Device Type Indicator */}
        <div className="mb-6">
          <div className={`flex items-center justify-center p-3 rounded-lg ${
            deviceType === 'mobile' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-orange-50 border border-orange-200'
          }`}>
            {deviceType === 'mobile' ? (
              <>
                <Smartphone className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-green-700 font-medium">Mobile Device Detected</span>
              </>
            ) : (
              <>
                <Monitor className="w-5 h-5 text-orange-600 mr-2" />
                <span className="text-orange-700 font-medium">Desktop Device Detected</span>
              </>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={(e) => { e.preventDefault(); handleStartScan(); }} className="space-y-6">
          {/* Merchant ID */}
          <div>
            <label htmlFor="merchantId" className="block text-sm font-medium text-gray-700 mb-2">
              Merchant ID (min 3 characters)
            </label>
            <input
              type="text"
              id="merchantId"
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Enter your merchant ID"
              disabled={isLoading}
            />
          </div>

          {/* Auth Token */}
          <div>
            <label htmlFor="authToken" className="block text-sm font-medium text-gray-700 mb-2">
              Auth Token (32 characters)
            </label>
            <input
              type="password"
              id="authToken"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Enter your 32-character auth token"
              maxLength={32}
              disabled={isLoading}
            />
            <div className="mt-1 text-xs text-gray-500">
              {authToken.length}/32 characters
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <Scan className="w-5 h-5 mr-2" />
                Start Security Scan
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center text-xs text-gray-500">
            <CreditCard className="w-4 h-4 mr-1" />
            Secure card processing powered by AI
          </div>
        </div>
      </div>
    </div>
  );
};

export default StartPage;