'use client'
import React, { useState, useEffect, useRef } from 'react';

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
const DETECTION_TIMEOUT = 40000; // 40 seconds

const CardDetectionApp = () => {
  // Authentication state
  const [authData, setAuthData] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  // Existing state management
  const [currentPhase, setCurrentPhase] = useState('idle');
  const [detectionActive, setDetectionActive] = useState(false);
  const [finalOcrResults, setFinalOcrResults] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [sessionId, setSessionId] = useState('');
  
  // Attempt tracking state
  const [attemptCount, setAttemptCount] = useState(0);
  const [maxAttemptsReached, setMaxAttemptsReached] = useState(false);
  const [currentOperation, setCurrentOperation] = useState('');
  
  const [validationState, setValidationState] = useState({
    physicalCard: false,
    movementState: null,
    movementMessage: '',
    validationComplete: false
  });
  
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

  // Check for authentication data on component mount
  useEffect(() => {
    const checkAuthData = async () => {
      console.log('🔍 Checking for authentication data...');
      
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session');
      const merchantId = urlParams.get('merchant_id');
      const authToken = urlParams.get('auth_token');
      const source = urlParams.get('source');
      const demo = urlParams.get('demo');
      
      // Method 1: Session-based auth (most secure)
      if (sessionId) {
        console.log('🔐 Found session ID, retrieving auth data securely...');
        try {
          const response = await fetch(`/securityscan/api/webview-entry?session=${sessionId}`);
          if (response.ok) {
            const sessionData = await response.json();
            console.log('✅ Session auth data retrieved:', {
              merchantId: sessionData.merchantId,
              authTokenLength: sessionData.authToken.length,
              authTokenPreview: sessionData.authToken.substring(0, 20) + '...'
            });
            
            const authObj = {
              merchantId: sessionData.merchantId,
              authToken: sessionData.authToken,
              timestamp: Date.now(),
              source: 'secure_session'
            };
            
            setAuthData(authObj);
            window.__WEBVIEW_AUTH__ = authObj;
            setAuthLoading(false);
            
            // Clean URL (remove session ID)
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
            return;
          } else {
            console.error('❌ Session retrieval failed:', response.status);
          }
        } catch (error) {
          console.error('❌ Session fetch error:', error);
        }
      }
      
      // Method 2: URL parameters (fallback, less secure)
      if (merchantId && authToken && authToken.length > 10) {
        console.log('✅ Auth data found from URL params');
        console.log('🔑 Credentials valid:', { 
          merchantId, 
          authTokenLength: authToken.length,
          authTokenPreview: authToken.substring(0, 20) + '...',
          source 
        });
        
        const authObj = { 
          merchantId, 
          authToken, 
          timestamp: Date.now(),
          source: source || 'url_params'
        };
        
        setAuthData(authObj);
        window.__WEBVIEW_AUTH__ = authObj;
        setAuthLoading(false);
        
        // Clean URL for security (remove tokens from address bar)
        if (!demo) {
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }
        return;
      }
      
      // Method 3: Demo mode (development only)
      if (process.env.NODE_ENV === 'development' || demo === 'true') {
        console.log('🧪 Using development/demo auth data');
        const demoAuthObj = {
          merchantId: 'MERCHANT_12345',
          authToken: 'demo_jwt_token_1234567890123456789012',
          timestamp: Date.now(),
          source: 'development_demo'
        };
        
        setAuthData(demoAuthObj);
        window.__WEBVIEW_AUTH__ = demoAuthObj;
        setAuthLoading(false);
        return;
      }
      
      // No auth data found
      console.error('❌ No authentication data found');
      console.error('Available URL params:', Array.from(urlParams.entries()));
      setAuthError('No authentication data received from Android app');
      setAuthLoading(false);
    };
    
    checkAuthData();
  }, []);

  // Initialize camera after auth is ready
  useEffect(() => {
    if (authData && !authLoading) {
      initializeCamera(videoRef)
        .then(() => {
          console.log('📷 Camera initialized successfully');
        })
        .catch((error) => {
          console.error('❌ Camera initialization failed:', error);
          setErrorMessage('Camera access failed. Please allow camera permissions.');
        });
    }
    
    return () => {
      cleanupCamera(videoRef);
    };
  }, [authData, authLoading]);

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

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold mb-2">Initializing Security Scanner...</h3>
          <p className="text-gray-600 text-sm">
            Loading authentication data from Android app
          </p>
        </div>
      </div>
    );
  }

  // Show error if no authentication data
  if (authError || !authData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">⚠️</span>
          </div>
          <h3 className="text-lg font-semibold text-red-600 mb-2">Authentication Required</h3>
          <p className="text-gray-600 text-sm mb-4">
            This page requires authentication data from the Android app.
          </p>
          
          {/* Development links */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-gray-50 p-3 rounded mb-4 text-left">
              <p className="text-xs font-semibold mb-2">Development Testing:</p>
              <div className="space-y-1">
                <a 
                  href="?demo=true" 
                  className="block text-blue-600 text-xs hover:underline"
                >
                  🧪 Use Demo Mode
                </a>
                <a 
                  href="?merchant_id=MERCHANT_12345&auth_token=test_jwt_token_1234567890123456" 
                  className="block text-blue-600 text-xs hover:underline"
                >
                  🔧 Test with URL Parameters
                </a>
              </div>
            </div>
          )}
          
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Helper function to handle detection timeout
  const startDetectionTimeout = (operation) => {
    if (detectionTimeoutRef.current) {
      clearTimeout(detectionTimeoutRef.current);
    }
    
    detectionTimeoutRef.current = setTimeout(() => {
      if (!stopRequestedRef.current && (detectionActive || isProcessing)) {
        handleDetectionFailure(`${operation} detection timeout. No detection occurred within 40 seconds.`, operation);
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

  // Countdown function
  const startCountdown = (callback) => {
    setCountdown(3);
    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          if (callback && !stopRequestedRef.current) {
            callback();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Card validation process
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
        
        // Check for validation failures
        if (apiResponse.message_state === "VALIDATION_FAILED" || 
            apiResponse.movement_state === "VALIDATION_FAILED") {
          validationComplete = true;
          clearDetectionTimeout();
          
          if (validationIntervalRef.current) {
            clearInterval(validationIntervalRef.current);
          }
          
          setIsProcessing(false);
          
          const errorMsg = apiResponse.message || 
                          (apiResponse.movement_state === "VALIDATION_FAILED" ? 
                           'Card validation failed. Please ensure you have a physical card and try again.' : 
                           'Validation failed. Please try again.');
          
          handleDetectionFailure(errorMsg, 'validation');
          return;
        }

        // Check for validation success
        if (apiResponse.message_state === "VALIDATION_PASSED" || 
            apiResponse.movement_state === "VALIDATION_PASSED") {
          validationComplete = true;
          clearDetectionTimeout();
          
          if (validationIntervalRef.current) {
            clearInterval(validationIntervalRef.current);
          }
          
          setIsProcessing(false);
          setAttemptCount(0);
          setCurrentOperation('');
          
          setTimeout(() => {
            if (!stopRequestedRef.current) {
              setCurrentPhase('ready-for-front');
            }
          }, 2000);
          return;
        }
        
        // Update validation state
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

        if (newValidationState.validationComplete && !stopRequestedRef.current) {
          validationComplete = true;
          clearDetectionTimeout();
          
          if (validationIntervalRef.current) {
            clearInterval(validationIntervalRef.current);
          }
          
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

      startDetectionTimeout('Front side');

      try {
        await captureAndSendFramesFront('front');
        
        if (!stopRequestedRef.current) {
          clearDetectionTimeout();
          setDetectionActive(false);
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
  // Add this to your page.js for testing
  const testAPIConnection = async () => {
    try {
      const { merchantId, authToken } = window.__WEBVIEW_AUTH__;
      const testUrl = `https://cardapp.hopto.org/detect/${merchantId}/${authToken}`;
      
      const formData = new FormData();
      formData.append('test', 'connection');
      
      const response = await fetch(testUrl, {
        method: 'POST',
        body: formData
      });
      
      console.log('✅ API Connection Test:', response.status);
    } catch (error) {
      console.error('❌ API Connection Test Failed:', error);
    }
  };

  // Call this when auth data is ready
  if (authData) {
    testAPIConnection();
  }
  const startBackSideDetection = async () => {
    if (maxAttemptsReached) return;
    
    setCurrentPhase('back-countdown');
    setErrorMessage('');

    startCountdown(async () => {
      if (stopRequestedRef.current) return;
      
      setCurrentPhase('back');
      setDetectionActive(true);
      stopRequestedRef.current = false;

      startDetectionTimeout('Back side');

      try {
        const finalResult = await captureAndSendFrames('back');
        
        if (!stopRequestedRef.current) {
          clearDetectionTimeout();
          setDetectionActive(false);
          
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

  const stopDetection = () => {
    console.log('🛑 Stopping detection...');
    stopRequestedRef.current = true;
    clearDetectionTimeout();
    
    setDetectionActive(false);
    setIsProcessing(false);
    setCountdown(0);
    setCurrentPhase('idle');
    
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (validationIntervalRef.current) {
      clearInterval(validationIntervalRef.current);
      validationIntervalRef.current = null;
    }
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
    
    // Reset attempt tracking completely
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

  const handleTryAgain = () => {
    setCurrentPhase('idle');
    setErrorMessage('');
    // Keep attempt count for retry
  };

  // Debug component for testing
  const DebugAuth = () => {
    if (!authData) return null;
    
    return (
      <div className="fixed top-4 left-4 bg-black bg-opacity-75 text-white p-3 rounded text-xs z-50">
        <div>Merchant: {authData.merchantId}</div>
        <div>Token: {authData.authToken.substring(0, 8)}...</div>
        <div>Time: {new Date(authData.timestamp).toLocaleTimeString()}</div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-4 px-2 sm:py-6 sm:px-4">
      <div className="max-w-4xl mx-auto">
        {/* Debug info (remove in production) */}
        <DebugAuth />
        
        {/* Header */}
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            Card Security Scanner
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            AI-powered card validation and OCR processing
          </p>
        </div>

        {/* Camera View */}
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

        {/* Control Panel */}
        <ControlPanel
          currentPhase={currentPhase}
          onStartValidation={startCardValidation}
          onStartFrontScan={startFrontSideDetection}
          onStartBackScan={startBackSideDetection}
          onStop={stopDetection}
          onReset={resetApplication}
          onTryAgain={handleTryAgain}
          onStartOver={resetApplication}
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

        {/* Status Information */}
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

// 'use client'
// import React, { useState, useEffect, useRef } from 'react';

// // Import components
// import ControlPanel from './components/ControlPanel';
// import StatusInformation from './components/StatusInfo';
// import CameraView from './components/CameraView';

// // Import utilities
// import { initializeCamera, captureFrame, cleanupCamera } from './utils/CameraUtils';
// import { sendFrameToAPI } from './utils/apiService';
// import { useDetection } from './hooks/UseDetection';

// // Constants for attempt limits and timeouts
// const MAX_ATTEMPTS = 3;
// const DETECTION_TIMEOUT = 40000; // 40 seconds

// const CardDetectionApp = () => {
//   // Authentication state
//   const [authData, setAuthData] = useState(null);
//   const [authLoading, setAuthLoading] = useState(true);
//   const [authError, setAuthError] = useState('');

//   // Existing state management
//   const [currentPhase, setCurrentPhase] = useState('idle');
//   const [detectionActive, setDetectionActive] = useState(false);
//   const [finalOcrResults, setFinalOcrResults] = useState(null);
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [countdown, setCountdown] = useState(0);
//   const [errorMessage, setErrorMessage] = useState('');
//   const [sessionId, setSessionId] = useState('');
  
//   // Attempt tracking state
//   const [attemptCount, setAttemptCount] = useState(0);
//   const [maxAttemptsReached, setMaxAttemptsReached] = useState(false);
//   const [currentOperation, setCurrentOperation] = useState('');
  
//   const [validationState, setValidationState] = useState({
//     physicalCard: false,
//     movementState: null,
//     movementMessage: '',
//     validationComplete: false
//   });
  
//   const [frontScanState, setFrontScanState] = useState({
//     framesBuffered: 0,
//     chipDetected: false,
//     bankLogoDetected: false,
//     canProceedToBack: false
//   });
  
//   // Refs
//   const videoRef = useRef(null);
//   const canvasRef = useRef(null);
//   const capturedFrames = useRef([]);
//   const countdownIntervalRef = useRef(null);
//   const validationIntervalRef = useRef(null);
//   const stopRequestedRef = useRef(false);
//   const detectionTimeoutRef = useRef(null);

//   // Check for authentication data on component mount
//   useEffect(() => {
//     const checkAuthData = () => {
//       console.log('🔍 Checking for authentication data...');
      
//       // Check URL params (from POST redirect)
//       const urlParams = new URLSearchParams(window.location.search);
//       const merchantId = urlParams.get('merchant_id');
//       const authToken = urlParams.get('auth_token');
//       const source = urlParams.get('source');
      
//       if (merchantId && authToken) {
//         console.log('✅ Auth data found from:', source || 'URL params');
//         console.log('🔑 Credentials:', { 
//           merchantId, 
//           authToken: authToken.substring(0, 10) + '...',
//           source 
//         });
        
//         const authObj = { 
//           merchantId, 
//           authToken, 
//           timestamp: Date.now(),
//           source: source || 'url_params'
//         };
        
//         setAuthData(authObj);
//         // Store globally for API calls
//         window.__WEBVIEW_AUTH__ = authObj;
//         setAuthLoading(false);
        
//         // Clean URL for security (remove tokens from address bar)
//         const cleanUrl = window.location.pathname;
//         window.history.replaceState({}, document.title, cleanUrl);
        
//         return;
//       }
      
//       // No auth data found
//       console.error('❌ No authentication data found in URL parameters');
//       setAuthError('No authentication data received from Android app');
//       setAuthLoading(false);
//     };
    
//     // Check immediately and after a short delay
//     checkAuthData();
//     const timer = setTimeout(checkAuthData, 1000);
    
//     return () => clearTimeout(timer);
//   }, []);

//   // Initialize camera after auth is ready
//   useEffect(() => {
//     if (authData && !authLoading) {
//       initializeCamera(videoRef)
//         .then(() => {
//           console.log('📷 Camera initialized successfully');
//         })
//         .catch((error) => {
//           console.error('❌ Camera initialization failed:', error);
//           setErrorMessage('Camera access failed. Please allow camera permissions.');
//         });
//     }
    
//     return () => {
//       cleanupCamera(videoRef);
//     };
//   }, [authData, authLoading]);

//   // Custom hook for detection logic
//   const { captureAndSendFramesFront, captureAndSendFrames, captureIntervalRef } = useDetection(
//     videoRef,
//     canvasRef,
//     sessionId,
//     setSessionId,
//     setIsProcessing,
//     setCurrentPhase,
//     setErrorMessage,
//     setFrontScanState,
//     stopRequestedRef
//   );

//   // Show loading state while checking authentication
//   if (authLoading) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
//         <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
//           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
//           <h3 className="text-lg font-semibold mb-2">Initializing Security Scanner...</h3>
//           <p className="text-gray-600 text-sm">
//             Loading authentication data from Android app
//           </p>
//         </div>
//       </div>
//     );
//   }

//   // Show error if no authentication data
//   if (authError || !authData) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
//         <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
//           <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
//             <span className="text-red-600 text-2xl">⚠️</span>
//           </div>
//           <h3 className="text-lg font-semibold text-red-600 mb-2">Authentication Error</h3>
//           <p className="text-gray-600 text-sm mb-4">
//             {authError || 'Failed to receive authentication data from Android app'}
//           </p>
//           <button
//             onClick={() => window.location.reload()}
//             className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm"
//           >
//             Retry
//           </button>
//         </div>
//       </div>
//     );
//   }

//   // Helper function to handle detection timeout
//   const startDetectionTimeout = (operation) => {
//     if (detectionTimeoutRef.current) {
//       clearTimeout(detectionTimeoutRef.current);
//     }
    
//     detectionTimeoutRef.current = setTimeout(() => {
//       if (!stopRequestedRef.current && (detectionActive || isProcessing)) {
//         handleDetectionFailure(`${operation} detection timeout. No detection occurred within 40 seconds.`, operation);
//       }
//     }, DETECTION_TIMEOUT);
//   };

//   // Helper function to clear detection timeout
//   const clearDetectionTimeout = () => {
//     if (detectionTimeoutRef.current) {
//       clearTimeout(detectionTimeoutRef.current);
//       detectionTimeoutRef.current = null;
//     }
//   };

//   // Helper function to handle detection failures with attempt tracking
//   const handleDetectionFailure = (message, operation) => {
//     clearDetectionTimeout();
//     stopRequestedRef.current = true;
    
//     // Clear all intervals
//     if (captureIntervalRef.current) {
//       clearInterval(captureIntervalRef.current);
//       captureIntervalRef.current = null;
//     }
    
//     if (validationIntervalRef.current) {
//       clearInterval(validationIntervalRef.current);
//       validationIntervalRef.current = null;
//     }
    
//     if (countdownIntervalRef.current) {
//       clearInterval(countdownIntervalRef.current);
//       countdownIntervalRef.current = null;
//     }
    
//     setDetectionActive(false);
//     setIsProcessing(false);
//     setCountdown(0);
    
//     const newAttemptCount = attemptCount + 1;
//     setAttemptCount(newAttemptCount);
//     setCurrentOperation(operation);
    
//     if (newAttemptCount >= MAX_ATTEMPTS) {
//       setMaxAttemptsReached(true);
//       setErrorMessage('Maximum attempts reached. Please contact support for assistance.');
//       setCurrentPhase('max-attempts-reached');
//     } else {
//       setErrorMessage(`${message} (Attempt ${newAttemptCount}/${MAX_ATTEMPTS})`);
//       setCurrentPhase('error');
//     }
//   };

//   // Countdown function
//   const startCountdown = (callback) => {
//     setCountdown(3);
//     countdownIntervalRef.current = setInterval(() => {
//       setCountdown(prev => {
//         if (prev <= 1) {
//           clearInterval(countdownIntervalRef.current);
//           if (callback && !stopRequestedRef.current) {
//             callback();
//           }
//           return 0;
//         }
//         return prev - 1;
//       });
//     }, 1000);
//   };

//   // Card validation process
//   const startCardValidation = async () => {
//     if (maxAttemptsReached) return;
    
//     setCurrentPhase('validation');
//     setErrorMessage('');
//     stopRequestedRef.current = false;
//     setValidationState({
//       physicalCard: false,
//       movementState: null,
//       movementMessage: 'Starting validation...',
//       validationComplete: false
//     });

//     const currentSessionId = `session_${Date.now()}`;
//     setSessionId(currentSessionId);

//     let frameNumber = 0;
//     let validationComplete = false;
//     const maxValidationTime = 27000;
//     const startTime = Date.now();

//     startDetectionTimeout('Validation');

//     if (!videoRef.current || videoRef.current.readyState < 2) {
//       handleDetectionFailure('Video not ready for capture', 'validation');
//       return;
//     }

//     const processValidationFrame = async () => {
//       try {
//         if (stopRequestedRef.current || validationComplete || (Date.now() - startTime) > maxValidationTime) {
//           return;
//         }

//         const frame = await captureFrame(videoRef, canvasRef);
//         if (!frame || frame.size === 0) {
//           return;
//         }

//         frameNumber++;
//         setIsProcessing(true);

//         const apiResponse = await sendFrameToAPI(frame, 'validation', currentSessionId, frameNumber);
        
//         if (stopRequestedRef.current) {
//           setIsProcessing(false);
//           return;
//         }
        
//         // Check for validation failures
//         if (apiResponse.message_state === "VALIDATION_FAILED" || 
//             apiResponse.movement_state === "VALIDATION_FAILED") {
//           validationComplete = true;
//           clearDetectionTimeout();
          
//           if (validationIntervalRef.current) {
//             clearInterval(validationIntervalRef.current);
//           }
          
//           setIsProcessing(false);
          
//           const errorMsg = apiResponse.message || 
//                           (apiResponse.movement_state === "VALIDATION_FAILED" ? 
//                            'Card validation failed. Please ensure you have a physical card and try again.' : 
//                            'Validation failed. Please try again.');
          
//           handleDetectionFailure(errorMsg, 'validation');
//           return;
//         }

//         // Check for validation success
//         if (apiResponse.message_state === "VALIDATION_PASSED" || 
//             apiResponse.movement_state === "VALIDATION_PASSED") {
//           validationComplete = true;
//           clearDetectionTimeout();
          
//           if (validationIntervalRef.current) {
//             clearInterval(validationIntervalRef.current);
//           }
          
//           setIsProcessing(false);
//           setAttemptCount(0);
//           setCurrentOperation('');
          
//           setTimeout(() => {
//             if (!stopRequestedRef.current) {
//               setCurrentPhase('ready-for-front');
//             }
//           }, 2000);
//           return;
//         }
        
//         // Update validation state
//         const newValidationState = {
//           physicalCard: apiResponse.physical_card || false,
//           movementState: apiResponse.movement_state || null,
//           movementMessage: apiResponse.movement_message || 
//                           (apiResponse.movement_state === "VALIDATION_FAILED" ? 
//                            'Validation Failed' : ''),
//           validationComplete: apiResponse.physical_card || false
//         };

//         setValidationState(newValidationState);
//         setIsProcessing(false);

//         if (newValidationState.validationComplete && !stopRequestedRef.current) {
//           validationComplete = true;
//           clearDetectionTimeout();
          
//           if (validationIntervalRef.current) {
//             clearInterval(validationIntervalRef.current);
//           }
          
//           setAttemptCount(0);
//           setCurrentOperation('');
          
//           setTimeout(() => {
//             if (!stopRequestedRef.current) {
//               setCurrentPhase('ready-for-front');
//             }
//           }, 2000);
//         }

//       } catch (error) {
//         console.error('Validation frame processing error:', error);
//         setIsProcessing(false);
//       }
//     };

//     processValidationFrame();
//     validationIntervalRef.current = setInterval(processValidationFrame, 1500);

//     setTimeout(() => {
//       if (!validationComplete && !stopRequestedRef.current) {
//         if (validationIntervalRef.current) {
//           clearInterval(validationIntervalRef.current);
//         }
//         handleDetectionFailure('Our intelligence system requires you to try again since the card scan failed', 'validation');
//       }
//     }, maxValidationTime);
//   };

//   const startFrontSideDetection = async () => {
//     if (maxAttemptsReached) return;
    
//     setFrontScanState({
//       framesBuffered: 0,
//       chipDetected: false,
//       bankLogoDetected: false,
//       canProceedToBack: false
//     });

//     setCurrentPhase('front-countdown');
//     setErrorMessage('');

//     startCountdown(async () => {
//       if (stopRequestedRef.current) return;
      
//       setCurrentPhase('front');
//       setDetectionActive(true);
//       stopRequestedRef.current = false;

//       startDetectionTimeout('Front side');

//       try {
//         await captureAndSendFramesFront('front');
        
//         if (!stopRequestedRef.current) {
//           clearDetectionTimeout();
//           setDetectionActive(false);
//           setAttemptCount(0);
//           setCurrentOperation('');
//           setCurrentPhase('ready-for-back');
//         }
        
//       } catch (error) {
//         console.error('Front side detection failed:', error);
//         setDetectionActive(false);
//         if (!stopRequestedRef.current) {
//           handleDetectionFailure(`Front side detection failed: ${error.message}`, 'front');
//         }
//       }
//     });
//   };

//   const startBackSideDetection = async () => {
//     if (maxAttemptsReached) return;
    
//     setCurrentPhase('back-countdown');
//     setErrorMessage('');

//     startCountdown(async () => {
//       if (stopRequestedRef.current) return;
      
//       setCurrentPhase('back');
//       setDetectionActive(true);
//       stopRequestedRef.current = false;

//       startDetectionTimeout('Back side');

//       try {
//         const finalResult = await captureAndSendFrames('back');
        
//         if (!stopRequestedRef.current) {
//           clearDetectionTimeout();
//           setDetectionActive(false);
          
//           console.log('🔍 Checking final result:', finalResult);
          
//           if (finalResult.encrypted_card_data && finalResult.status) {
//             console.log('🎯 Final encrypted response detected - Setting phase to final_response');
//             console.log(`Status: ${finalResult.status}, Score: ${finalResult.score}`);
//             setFinalOcrResults(finalResult);
//             setCurrentPhase('final_response');
//           } else if (finalResult.final_ocr) {
//             console.log('📋 Regular OCR results - Setting phase to results');
//             setFinalOcrResults(finalResult);
//             setCurrentPhase('results');
//           } else {
//             console.log('⚠️ No final OCR or encrypted data found');
//             setFinalOcrResults(finalResult);
//             setCurrentPhase('results');
//           }
          
//           setAttemptCount(0);
//           setCurrentOperation('');
//         }
        
//       } catch (error) {
//         console.error('Back side detection failed:', error);
//         setDetectionActive(false);
//         if (!stopRequestedRef.current) {
//           handleDetectionFailure(`Back side detection failed: ${error.message}`, 'back');
//         }
//       }
//     });
//   };

//   const stopDetection = () => {
//     console.log('🛑 Stopping detection...');
//     stopRequestedRef.current = true;
//     clearDetectionTimeout();
    
//     setDetectionActive(false);
//     setIsProcessing(false);
//     setCountdown(0);
//     setCurrentPhase('idle');
    
//     if (captureIntervalRef.current) {
//       clearInterval(captureIntervalRef.current);
//       captureIntervalRef.current = null;
//     }
//     if (countdownIntervalRef.current) {
//       clearInterval(countdownIntervalRef.current);
//       countdownIntervalRef.current = null;
//     }
//     if (validationIntervalRef.current) {
//       clearInterval(validationIntervalRef.current);
//       validationIntervalRef.current = null;
//     }
//   };

//   const resetApplication = () => {
//     stopRequestedRef.current = true;
//     clearDetectionTimeout();
    
//     setCurrentPhase('idle');
//     setDetectionActive(false);
//     setFinalOcrResults(null);
//     setIsProcessing(false);
//     setCountdown(0);
//     setErrorMessage('');
//     setSessionId('');
    
//     // Reset attempt tracking completely
//     setAttemptCount(0);
//     setMaxAttemptsReached(false);
//     setCurrentOperation('');
    
//     setValidationState({
//       physicalCard: false,
//       movementState: null,
//       movementMessage: '',
//       validationComplete: false
//     });
//     setFrontScanState({
//       framesBuffered: 0,
//       chipDetected: false,
//       bankLogoDetected: false,
//       canProceedToBack: false
//     });
//     capturedFrames.current = [];
    
//     if (captureIntervalRef.current) {
//       clearInterval(captureIntervalRef.current);
//     }
//     if (countdownIntervalRef.current) {
//       clearInterval(countdownIntervalRef.current);
//     }
//     if (validationIntervalRef.current) {
//       clearInterval(validationIntervalRef.current);
//     }
    
//     stopRequestedRef.current = false;
//   };

//   const handleTryAgain = () => {
//     setCurrentPhase('idle');
//     setErrorMessage('');
//     // Keep attempt count for retry
//   };

//   // Debug component for testing
//   const DebugAuth = () => {
//     if (!authData) return null;
    
//     return (
//       <div className="fixed top-4 left-4 bg-black bg-opacity-75 text-white p-3 rounded text-xs z-50">
//         <div>Merchant: {authData.merchantId}</div>
//         <div>Token: {authData.authToken.substring(0, 8)}...</div>
//         <div>Time: {new Date(authData.timestamp).toLocaleTimeString()}</div>
//       </div>
//     );
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-4 px-2 sm:py-6 sm:px-4">
//       <div className="max-w-4xl mx-auto">
//         {/* Debug info (remove in production) */}
//         <DebugAuth />
        
//         {/* Header */}
//         <div className="text-center mb-4 sm:mb-6">
//           <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-2">
//             Card Security Scanner
//           </h1>
//           <p className="text-gray-600 text-sm sm:text-base">
//             AI-powered card validation and OCR processing
//           </p>
//         </div>

//         {/* Camera View */}
//         <CameraView
//           videoRef={videoRef}
//           canvasRef={canvasRef}
//           currentPhase={currentPhase}
//           countdown={countdown}
//           detectionActive={detectionActive}
//           validationState={validationState}
//           frontScanState={frontScanState}
//           isProcessing={isProcessing}
//         />

//         {/* Control Panel */}
//         <ControlPanel
//           currentPhase={currentPhase}
//           onStartValidation={startCardValidation}
//           onStartFrontScan={startFrontSideDetection}
//           onStartBackScan={startBackSideDetection}
//           onStop={stopDetection}
//           onReset={resetApplication}
//           onTryAgain={handleTryAgain}
//           onStartOver={resetApplication}
//           validationState={validationState}
//           frontScanState={frontScanState}
//           countdown={countdown}
//           errorMessage={errorMessage}
//           finalOcrResults={finalOcrResults}
//           detectionActive={detectionActive}
//           isProcessing={isProcessing}
//           attemptCount={attemptCount}
//           maxAttempts={MAX_ATTEMPTS}
//           maxAttemptsReached={maxAttemptsReached}
//         />

//         {/* Status Information */}
//         <StatusInformation
//           currentPhase={currentPhase}
//           sessionId={sessionId}
//           validationState={validationState}
//           frontScanState={frontScanState}
//           detectionActive={detectionActive}
//         />
//       </div>
//     </div>
//   );
// };

// export default CardDetectionApp;