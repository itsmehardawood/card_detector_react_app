"use client";
import React, { useState, useEffect, useRef } from "react";

// Import components
import ControlPanel from "./components/ControlPanel";
import StatusInformation from "./components/StatusInfo";
import CameraView from "./components/CameraView";

// Import utilities
import {
  initializeCamera,
  captureFrame,
  cleanupCamera,
  checkCameraPermissions,
  requestCameraPermissions,
  isCameraWorking,
} from "./utils/CameraUtils";
import { sendFrameToAPI } from "./utils/apiService";
import { useDetection } from "./hooks/UseDetection";
import Image from "next/image";

// Constants for attempt limits and timeouts
const MAX_ATTEMPTS = 5;
const DETECTION_TIMEOUT = 150000; // 150 seconds

const CardDetectionApp = () => {
  // Authentication state
  const [authData, setAuthData] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  const [Merchant, setMerchant] = useState(null);
  const [merchantName, setMerchantName] = useState(null);
  const [merchantLogo, setMerchantLogo] = useState(null);

  // Existing state management
  const [currentPhase, setCurrentPhase] = useState("idle");
  const [detectionActive, setDetectionActive] = useState(false);
  const [finalOcrResults, setFinalOcrResults] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [sessionId, setSessionId] = useState("");

  // Camera permission state
  const [cameraPermissionStatus, setCameraPermissionStatus] = useState("unknown");
  const [showPermissionAlert, setShowPermissionAlert] = useState(false);
  const [cameraInitialized, setCameraInitialized] = useState(false);
  const [cameraError, setCameraError] = useState("");

  // Prompt text state for positioning guidance
  const [showPromptText, setShowPromptText] = useState(false);
  const [promptText, setPromptText] = useState("");

  // Attempt tracking state
  const [attemptCount, setAttemptCount] = useState(0);
  const [maxAttemptsReached, setMaxAttemptsReached] = useState(false);
  const [currentOperation, setCurrentOperation] = useState(""); // 'front', 'back'
  const [debugInfo, setDebugInfo] = useState("");
  const [existingLogoUrl, setExistingLogoUrl] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [formData, setFormData] = useState({
    displayName: "",
    logo: null,
  });
  // Updated frontScanState to include bankLogoDetected
  const [frontScanState, setFrontScanState] = useState({
    framesBuffered: 0,
    chipDetected: false,
    bankLogoDetected: false,
    physicalCardDetected: false,
    canProceedToBack: false,
    motionProgress: null,
    showMotionPrompt: false,
    hideMotionPrompt: false,
    motionPromptTimestamp: null,
  });

  const [merchantInfo, setMerchantInfo] = useState({
    display_name: "",
    display_logo: "",
    merchant_id: "",
    loading: false,
    error: null,
  });

  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const capturedFrames = useRef([]);
  const countdownIntervalRef = useRef(null);
  const stopRequestedRef = useRef(false);
  const detectionTimeoutRef = useRef(null);
  const currentSessionRef = useRef(null);

  const fetchMerchantDisplayInfo = async (merchantId) => {
    if (!merchantId) {
      console.log("🚫 No merchantId provided to fetchMerchantDisplayInfo");
      return;
    }

    try {
      console.log("🔍 Fetching merchant display info for:", merchantId);
      setDebugInfo("Fetching existing display info...");

      const response = await fetch(
        `https://admin.cardnest.io/api/getmerchantDisplayInfo?merchantId=${encodeURIComponent(
          merchantId
        )}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("📡 GET API Response status:", response.status);

      let result;
      const contentType = response.headers.get("content-type");

      if (contentType && contentType.includes("application/json")) {
        result = await response.json();
      } else {
        const textResult = await response.text();
        console.log("Non-JSON response:", textResult);

        try {
          result = JSON.parse(textResult);
        } catch {
          result = { message: textResult };
        }
      }

      console.log("📊 GET API Response result:", result);

      // new version to make sure https

      if (response.ok && (result.status === true || result.success === true)) {
        if (result.data) {
          const { display_name, display_logo } = result.data;

          if (display_name) {
            console.log("✅ Setting merchant name:", display_name);
            setMerchantName(display_name);
          }

          if (display_logo) {
            // 🔒 Force HTTPS
            const safeLogo = display_logo.replace(/^http:\/\//i, "https://");
            console.log("✅ Setting merchant logo:", safeLogo);
            setMerchantLogo(safeLogo);
          }

          setDebugInfo("Existing data loaded successfully");
        } else {
          setDebugInfo("No existing data found");
        }
      } else {
        setDebugInfo("No existing data found or API error");
      }
    } catch (error) {
      console.error("❌ Error fetching merchant display info:", error);
      setDebugInfo(`Error fetching data: ${error.message}`);
    }
  };

  // Call fetchMerchantDisplayInfo when Merchant state is updated
  useEffect(() => {
    if (Merchant) {
      console.log("� Merchant ID available, fetching display info:", Merchant);
      fetchMerchantDisplayInfo(Merchant);
    }
  }, [Merchant]);

  // 📹 CAMERA PERMISSION HANDLER
  // Handles camera permission errors and provides user feedback
  const handleCameraPermissionError = (errorType) => {
    console.log('📹 Camera permission error:', errorType);
    setCameraInitialized(false);
    
    switch (errorType) {
      case 'PERMISSION_DENIED':
        setCameraPermissionStatus('denied');
        setCameraError('Camera permission denied. Please enable camera access and try again.');
        setShowPermissionAlert(true);
        break;
      case 'NO_CAMERA':
        setCameraError('No camera device found. Please ensure your device has a camera.');
        setShowPermissionAlert(true);
        break;
      case 'CAMERA_IN_USE':
        setCameraError('Camera is currently in use by another application. Please close other camera apps and try again.');
        setShowPermissionAlert(true);
        break;
      case 'GENERIC_ERROR':
      default:
        setCameraError('Unable to access camera. Please check permissions and try again.');
        setShowPermissionAlert(true);
        break;
    }
  };

  // 🔄 REQUEST CAMERA PERMISSIONS
  // Attempts to request camera permissions again
  const handleRequestCameraPermission = async () => {
    console.log('🔄 Requesting camera permissions...');
    setShowPermissionAlert(false);
    setCameraError('');
    
    try {
      await requestCameraPermissions(videoRef, handleCameraPermissionError);
      setCameraInitialized(true);
      setCameraPermissionStatus('granted');
      console.log('✅ Camera permissions granted and camera initialized');
    } catch (error) {
      console.error('❌ Camera permission request failed:', error);
      // Error handling is done in handleCameraPermissionError
    }
  };


  const checkCameraStatus = async () => {
  if (!cameraInitialized) return;
  
  const isWorking = isCameraWorking(videoRef);
  if (!isWorking) {
    console.log('📹 Camera stopped working, likely permission revoked');
    setCameraInitialized(false);
    setCameraPermissionStatus('prompt');
    setShowPermissionAlert(true);
    setCameraError('Camera access lost. This may happen when "Only This Time" permission expires. Please grant camera access again.');
    return;
  }

  // Additional WebView permission test
  try {
    const testStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 320, height: 240 }
    });
    testStream.getTracks().forEach(track => track.stop());
  } catch (testError) {
    if (testError.name === 'NotAllowedError') {
      console.log('📹 Permission test failed - permission expired');
      setCameraInitialized(false);
      setCameraPermissionStatus('denied');
      setShowPermissionAlert(true);
      setCameraError('Camera permission expired. Please grant camera access again.');
    }
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
      setErrorMessage(
        "Maximum attempts reached. Please contact support for assistance."
      );
      setCurrentPhase("max-attempts-reached");
    } else {
      setErrorMessage(
        `${message} (Attempt ${newAttemptCount}/${MAX_ATTEMPTS})`
      );
      setCurrentPhase("error");
    }
  };

  // Custom hook for detection logic - NOW WITH handleDetectionFailure parameter
  const {
    captureAndSendFramesFront,
    captureAndSendFrames,
    captureIntervalRef,
  } = useDetection(
    videoRef,
    canvasRef,
    sessionId,
    setSessionId,
    setIsProcessing,
    setCurrentPhase,
    setErrorMessage,
    setFrontScanState,
    stopRequestedRef,
    handleDetectionFailure // ADD THIS PARAMETER
  );

  // Check for authentication data on component mount
  useEffect(() => {
    const checkAuthData = async () => {
      console.log("🔍 Checking for authentication data...");

      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get("session");
      const merchantId = urlParams.get("merchant_id");
      const authToken = urlParams.get("auth_token");
      const source = urlParams.get("source");
      const demo = urlParams.get("demo");

      // Set merchant ID immediately when found in URL params
      if (merchantId) {
        console.log("🏪 Setting merchant ID from URL:", merchantId);
        setMerchant(merchantId);
      }

      // Method 1: Session-based auth (most secure)
      if (sessionId) {
        console.log("🔐 Found session ID, retrieving auth data securely...");
        try {
          const response = await fetch(
            `/securityscan/api/webview-entry?session=${sessionId}`
          );
          if (response.ok) {
            const sessionData = await response.json();
            console.log("✅ Session auth data retrieved:", {
              merchantId: sessionData.merchantId,
              authTokenLength: sessionData.authToken.length,
              authTokenPreview: sessionData.authToken.substring(0, 20) + "...",
            });

            const authObj = {
              merchantId: sessionData.merchantId,
              authToken: sessionData.authToken,
              timestamp: Date.now(),
              source: "secure_session",
            };

            setAuthData(authObj);
            window.__WEBVIEW_AUTH__ = authObj;
            setAuthLoading(false);

            // Set merchant from session data if not already set from URL
            if (sessionData.merchantId) {
              console.log(
                "🏪 Setting merchant ID from session:",
                sessionData.merchantId
              );
              setMerchant(sessionData.merchantId);
            }

            // Clean URL (remove session ID)
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
            return;
          } else {
            console.error("❌ Session retrieval failed:", response.status);
          }
        } catch (error) {
          console.error("❌ Session fetch error:", error);
        }
      }

      // Method 2: URL parameters (fallback, less secure)
      if (merchantId && authToken && authToken.length > 10) {
        console.log("✅ Auth data found from URL params");
        console.log("🔑 Credentials valid:", {
          merchantId,
          authTokenLength: authToken.length,
          authTokenPreview: authToken.substring(0, 20) + "...",
          source,
        });

        const authObj = {
          merchantId,
          authToken,
          timestamp: Date.now(),
          source: source || "url_params",
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
      if (process.env.NODE_ENV === "development" || demo === "true") {
        console.log("🧪 Using development/demo auth data");
        const demoMerchantId = "276581V33945Y270";
        const demoAuthObj = {
          merchantId: demoMerchantId,
          authToken: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOi8vYWRtaW4uY2FyZG5lc3QuaW8vYXBpL21lcmNoYW50c2Nhbi9nZW5lcmF0ZVRva2VuIiwiaWF0IjoxNzU5OTk2NjAxLCJleHAiOjE3NjAwMDAyMDEsIm5iZiI6MTc1OTk5NjYwMSwianRpIjoiQjlkZ0JJakM1aGpzTHJIOSIsInN1YiI6IjI3NjU4MVYzMzk0NVkyNzAiLCJwcnYiOiIyM2JkNWM4OTQ5ZjYwMGFkYjM5ZTcwMWM0MDA4NzJkYjdhNTk3NmY3Iiwic2Nhbl9pZCI6IjhlNGExZTM4LTdjZDQtNDc3NS05MzQ4LWMwMTU1NzA5ZjVhZiIsIm1lcmNoYW50X2lkIjoiMjc2NTgxVjMzOTQ1WTI3MCIsImVuY3J5cHRpb25fa2V5IjoiRWFYYWZYYzNUdHluMGpuaiIsImZlYXR1cmVzIjpudWxsfQ.iVGS3eVvonAQ39OYhgLwWg7lW3ORPCIcEt8DJMxIlCY",
            timestamp: Date.now(),
          source: "development_demo",
        };

        setAuthData(demoAuthObj);
        window.__WEBVIEW_AUTH__ = demoAuthObj;
        setAuthLoading(false);

        // Set demo merchant ID if not already set from URL
        if (!merchantId) {
          console.log("🏪 Setting demo merchant ID:", demoMerchantId);
          setMerchant(demoMerchantId);
        }

        return;
      } // No auth data found
      console.error("❌ No authentication data found");
      console.error("Available URL params:", Array.from(urlParams.entries()));
      setAuthError("No authentication data received from Android app");
      setAuthLoading(false);
    };

    checkAuthData();
  }, []);

  // Helper function to clear detection timeout
  const clearDetectionTimeout = () => {
    if (detectionTimeoutRef.current) {
      clearTimeout(detectionTimeoutRef.current);
      detectionTimeoutRef.current = null;
    }
  };

  // Helper function to handle detection timeout
  const startDetectionTimeout = (operation) => {
    if (detectionTimeoutRef.current) {
      clearTimeout(detectionTimeoutRef.current);
    }

    detectionTimeoutRef.current = setTimeout(() => {
      if (!stopRequestedRef.current && (detectionActive || isProcessing)) {
        handleDetectionFailure(
          `${operation} detection timeout. No detection occurred within 40 seconds.`,
          operation
        );
      }
    }, DETECTION_TIMEOUT);
  };

  // Initialize camera after auth is ready
  useEffect(() => {
    if (authData && !authLoading) {
      console.log('📹 Initializing camera with permission handling...');
      
      const initCamera = async () => {
        try {
          // Check permission status first
          const permissionStatus = await checkCameraPermissions();
          setCameraPermissionStatus(permissionStatus);
          
          if (permissionStatus === 'denied') {
            console.log('📹 Camera permission denied');
            handleCameraPermissionError('PERMISSION_DENIED');
            return;
          }

          // FOR WEBVIEW: Force permission test even if status seems OK
    if (permissionStatus === 'unknown' || permissionStatus === 'granted') {
      try {
        const testStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240 }
        });
        testStream.getTracks().forEach(track => track.stop());
        console.log('✅ WebView permission test passed');
      } catch (testError) {
        if (testError.name === 'NotAllowedError') {
          handleCameraPermissionError('PERMISSION_DENIED');
          return;
        }
      }
    }
          // Try to initialize camera
          await initializeCamera(videoRef, handleCameraPermissionError);
          setCameraInitialized(true);
          setCameraPermissionStatus('granted');
          console.log("✅ Camera initialized successfully");
          
          // Start periodic camera status checking (every 30 seconds)
          const checkInterval = setInterval(checkCameraStatus, 30000);
          
          return () => {
            clearInterval(checkInterval);
          };
          
        } catch (error) {
          console.error("❌ Camera initialization failed:", error);
          setCameraInitialized(false);
          
          // Don't show generic error message, let handleCameraPermissionError handle it
          if (error.message !== 'PERMISSION_DENIED' && 
              error.message !== 'NO_CAMERA' && 
              error.message !== 'CAMERA_IN_USE') {
            setErrorMessage("Camera access failed. Please check permissions and try again.");
          }
        }
      };

      initCamera();
    }

    return () => {
      cleanupCamera(videoRef);
      clearDetectionTimeout();
      setCameraInitialized(false);

      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
      }

      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [authData, authLoading]);




  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br text-black from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold mb-2">
            Please wait while card scan security begins...
          </h3>
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
          <h3 className="text-lg font-semibold text-red-600 mb-2">
            Authentication Required
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            This page requires authentication data from the Android app.
          </p>

          {/* Development links */}
          {process.env.NODE_ENV === "development" && (
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

  // Stop function to halt all active processes
  const stopDetection = () => {
    console.log("🛑 Stopping detection...");
    stopRequestedRef.current = true;
    clearDetectionTimeout();

    // Clear all intervals
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    // Reset states immediately
    setDetectionActive(false);
    setIsProcessing(false);
    setCountdown(0);
    
    // Hide prompt text when stopping
    setShowPromptText(false);

    // Return to appropriate phase based on current state
    if (currentPhase === "front-countdown" || currentPhase === "front") {
      setCurrentPhase("idle");
      setFrontScanState({
        framesBuffered: 0,
        chipDetected: false,
        bankLogoDetected: false,
        physicalCardDetected: false,
        canProceedToBack: false,
        motionProgress: null,
        showMotionPrompt: false,
        hideMotionPrompt: false,
        motionPromptTimestamp: null,
      });
    } else if (currentPhase === "back-countdown" || currentPhase === "back") {
      setCurrentPhase("ready-for-back");
    } else {
      setCurrentPhase("idle");
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

  // Start card scanning directly with front side detection
  const startCardScanning = async () => {
    console.log("🚀 startCardScanning called, maxAttemptsReached:", maxAttemptsReached, "detectionActive:", detectionActive);
    if (maxAttemptsReached || detectionActive) return;

    // 📹 CHECK CAMERA STATUS BEFORE SCANNING
    if (!cameraInitialized || !isCameraWorking(videoRef)) {
      console.log('📹 Camera not ready, requesting permissions...');
      setCameraError('Camera access is required to start scanning. Please enable camera permissions.');
      setShowPermissionAlert(true);
      return;
    }

    // Initialize session ONLY if not already set
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      currentSessionId = `session_${Date.now()}`;
      setSessionId(currentSessionId);
      console.log('🆔 Created new session ID:', currentSessionId);
    } else {
      console.log('🆔 Using existing session ID:', currentSessionId);
    }

    // Reset states and start front side detection
    setErrorMessage("");
    setAttemptCount(0);
    setCurrentOperation("");
    
    setFrontScanState({
      framesBuffered: 0,
      chipDetected: false,
      bankLogoDetected: false,
      physicalCardDetected: false,
      canProceedToBack: false,
      motionProgress: null,
      showMotionPrompt: false,
      hideMotionPrompt: false,
      motionPromptTimestamp: null,
    });

    // Show prompt text for front side positioning
    setPromptText("Position your card's front side in the camera square frame for security scan");
    setShowPromptText(true);

    // Go directly to front side detection
    setCurrentPhase("front-countdown");

    startCountdown(async () => {
      if (stopRequestedRef.current) return;

      setCurrentPhase("front");
      
      // Hide prompt text when detection starts
      setShowPromptText(false);
      setDetectionActive(true);
      stopRequestedRef.current = false;

      // Start detection timeout
      startDetectionTimeout("Front side");

      try {
        await captureAndSendFramesFront("front", currentSessionId);

        if (!stopRequestedRef.current) {
          clearDetectionTimeout();
          setDetectionActive(false);
          // Reset attempt count on successful front scan
          setAttemptCount(0);
          setCurrentOperation("");
          setCurrentPhase("ready-for-back");
        }
      } catch (error) {
        console.error("Front side detection failed:", error);
        setDetectionActive(false);
        if (!stopRequestedRef.current) {
          handleDetectionFailure(
            `Front side detection failed: ${error.message}`,
            "front"
          );
        }
      }
    });
  };

  const startFrontSideDetection = async () => {
    console.log("🚀 startFrontSideDetection called, maxAttemptsReached:", maxAttemptsReached, "detectionActive:", detectionActive);
    if (maxAttemptsReached || detectionActive) return;

    // 📹 CHECK CAMERA STATUS BEFORE SCANNING
    if (!cameraInitialized || !isCameraWorking(videoRef)) {
      console.log('📹 Camera not ready for front scanning, requesting permissions...');
      setCameraError('Camera access is required to scan the front side. Please enable camera permissions.');
      setShowPermissionAlert(true);
      return;
    }

    // Ensure we have a session ID
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      currentSessionId = `session_${Date.now()}`;
      setSessionId(currentSessionId);
      console.log('🆔 Created new session ID for front scan:', currentSessionId);
    } else {
      console.log('🆔 Using existing session ID for front scan:', currentSessionId);
    }

    setFrontScanState({
      framesBuffered: 0,
      chipDetected: false,
      bankLogoDetected: false,
      physicalCardDetected: false,
      canProceedToBack: false,
      motionProgress: null,
      showMotionPrompt: false,
      hideMotionPrompt: false,
      motionPromptTimestamp: null,
    });

    // Show prompt text for front side positioning
    setPromptText("Position your card's front side in the camera square frame showing the chip and bank logo clearly");
    setShowPromptText(true);

    setCurrentPhase("front-countdown");
    setErrorMessage("");

    startCountdown(async () => {
      if (stopRequestedRef.current) return;

      setCurrentPhase("front");
      
      // Hide prompt text when detection starts
      setShowPromptText(false);
      setDetectionActive(true);
      stopRequestedRef.current = false;

      // Start detection timeout
      startDetectionTimeout("Front side");

      try {
        await captureAndSendFramesFront("front", currentSessionId);

        if (!stopRequestedRef.current) {
          clearDetectionTimeout();
          setDetectionActive(false);
          // Reset attempt count on successful front scan
          setAttemptCount(0);
          setCurrentOperation("");
          setCurrentPhase("ready-for-back");
        }
      } catch (error) {
        console.error("Front side detection failed:", error);
        setDetectionActive(false);
        if (!stopRequestedRef.current) {
          handleDetectionFailure(
            `Front side detection failed: ${error.message}`,
            "front"
          );
        }
      }
    });
  };

  const startBackSideDetection = async () => {
    if (maxAttemptsReached) return;

    // 📹 CHECK CAMERA STATUS BEFORE SCANNING
    if (!cameraInitialized || !isCameraWorking(videoRef)) {
      console.log('📹 Camera not ready for back scanning, requesting permissions...');
      setCameraError('Camera access is required to scan the back side. Please enable camera permissions.');
      setShowPermissionAlert(true);
      return;
    }

    // Ensure we have the same session ID from front scan
    if (!sessionId) {
      console.error('❌ No session ID available for back scan! This should not happen.');
      setErrorMessage('Session error occurred. Please restart the scanning process.');
      setCurrentPhase('error');
      return;
    }
    console.log('🆔 Using session ID for back scan:', sessionId);

    // Show prompt text for back side positioning
    setPromptText("Position your card's back side in the camera square frame for security scan");
    setShowPromptText(true);

    setCurrentPhase("back-countdown");
    setErrorMessage("");

    startCountdown(async () => {
      if (stopRequestedRef.current) return;

      setCurrentPhase("back");
      
      // Hide prompt text when detection starts
      setShowPromptText(false);
      setDetectionActive(true);
      stopRequestedRef.current = false;

      startDetectionTimeout("Back side");

      try {
        const finalResult = await captureAndSendFrames("back", sessionId);

        if (!stopRequestedRef.current) {
          clearDetectionTimeout();
          setDetectionActive(false);

          console.log("🔍 Checking final result:", finalResult);

          // 🎯 PRIORITY FIX: Match the hook's success logic - status "success" OR "already_completed" is sufficient
          if (finalResult?.status === "success" || finalResult?.status === "already_completed") {
            console.log(
              "✅ SUCCESS/ALREADY_COMPLETED STATUS received in page.js - transitioning to 'results'"
            );
            console.log(`Status: ${finalResult.status}, Score: ${finalResult.score}, Complete Scan: ${finalResult.complete_scan}`);
            setFinalOcrResults(finalResult);
            setCurrentPhase("back-complete");
            setAttemptCount(0);
            setCurrentOperation("");
            
            // Show success message for 3 seconds before showing results
            setTimeout(() => {
              setCurrentPhase("results");
            }, 3000);
          } else {
            console.log(
              "⚠️ Scan result didn't meet success criteria"
            );
            handleDetectionFailure("Back scan incomplete or failed.", "back");
          }
        }
      } catch (error) {
        console.error("Back side detection failed:", error);
        setDetectionActive(false);
        if (!stopRequestedRef.current) {
          // For validation failures, handleDetectionFailure is already called in UseDetection
          // but we still need to handle other types of errors
          if (error.message === "Back validation failed") {
            console.log("🔍 Validation failure error caught - handleDetectionFailure already called with attempt counting");
            // handleDetectionFailure was already called in UseDetection hook, so just return
            return;
          }
          
          // Handle other types of detection failures
          handleDetectionFailure(
            `Back side detection failed: ${error.message}`,
            "back"
          );
        }
      }
    });
  };

  const resetApplication = () => {
    stopRequestedRef.current = true;
    clearDetectionTimeout();

    setCurrentPhase("idle");
    setDetectionActive(false);
    setFinalOcrResults(null);
    setIsProcessing(false);
    setCountdown(0);
    setErrorMessage("");
    setSessionId("");
    
    // Reset prompt text state
    setShowPromptText(false);
    setPromptText("");

    // Reset attempt tracking completely - this is for "Start New Session"
    setAttemptCount(0);
    setMaxAttemptsReached(false);
    setCurrentOperation("");

    setFrontScanState({
      framesBuffered: 0,
      chipDetected: false,
      bankLogoDetected: false,
      physicalCardDetected: false,
      canProceedToBack: false,
      motionProgress: null,
      showMotionPrompt: false,
      hideMotionPrompt: false,
      motionPromptTimestamp: null,
    });
    capturedFrames.current = [];

    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    stopRequestedRef.current = false;
  };

  // New function specifically for "Try Again" - keeps attempt count
  const handleTryAgain = () => {
    console.log("🔄 handleTryAgain called - stopping all detection processes");
    
    // CRITICAL: Stop all detection immediately
    stopRequestedRef.current = true;
    clearDetectionTimeout();

    // Clean up intervals FIRST
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    // Reset all states immediately
    setDetectionActive(false);
    setIsProcessing(false);
    setCountdown(0);
    setErrorMessage("");
    
    // Reset prompt text state
    setShowPromptText(false);
    setPromptText("");

    // For back side validation failures, reset session ID and return to idle to restart from front
    if (currentOperation === "back") {
      console.log("🔄 Back side validation failed - resetting session ID and returning to idle");
      setSessionId(""); // Reset session ID to force new session
      
      // Use setTimeout to ensure all async processes have stopped
      setTimeout(() => {
        setCurrentPhase("idle");
        stopRequestedRef.current = false; // Reset after transition
      }, 100);
      
      setFrontScanState({
        framesBuffered: 0,
        chipDetected: false,
        bankLogoDetected: false,
        physicalCardDetected: false,
        canProceedToBack: false,
        motionProgress: null,
        showMotionPrompt: false,
        hideMotionPrompt: false,
        motionPromptTimestamp: null,
      });
    } else if (currentOperation === "front") {
      setTimeout(() => {
        setCurrentPhase("idle");
        stopRequestedRef.current = false; // Reset after transition
      }, 100);
      
      setFrontScanState({
        framesBuffered: 0,
        chipDetected: false,
        bankLogoDetected: false,
        physicalCardDetected: false,
        canProceedToBack: false,
        motionProgress: null,
        showMotionPrompt: false,
        hideMotionPrompt: false,
        motionPromptTimestamp: null,
      });
    } else {
      // Default fallback - reset session ID for safety
      setSessionId("");
      setTimeout(() => {
        setCurrentPhase("idle");
        stopRequestedRef.current = false; // Reset after transition
      }, 100);
    }
  };

  const handleStartOver = () => {
    stopRequestedRef.current = true;
    clearDetectionTimeout();
    setCurrentPhase("idle");
    setErrorMessage("");
    // Reset attempt tracking when starting over
    setAttemptCount(0);
    setMaxAttemptsReached(false);
    setCurrentOperation("");
    stopRequestedRef.current = false;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-700 to-black p-4 sm:p-4">
      <div className="container mx-auto max-w-4xl">
        {/* Debug info (only shows in development) */}
        <div className="flex items-center justify-center bg-white p-2 sm:p-4 rounded-md mb-4 sm:mb-8 shadow">
          {merchantLogo && (
            <img
              // width={50}
              // height={50}
              src={merchantLogo}
              alt="Merchant Logo"
              className=" h-15 w-15 object-contain mr-3"
            />
          )}
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
            {merchantName || "Card Security Scan"}
          </h1>
        </div>

        {/* Camera Permission Alert Dialog */}
        {showPermissionAlert && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-red-600 text-3xl">📹</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Camera Access Required
                </h3>
                <p className="text-gray-600 text-sm mb-6">
                  {cameraError || "Camera permission is required to scan your card. Please enable camera access to continue."}
                </p>
                
                {cameraPermissionStatus === 'denied' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                    <p className="text-yellow-800 text-xs">
<strong>Note:</strong> If you selected &quot;Only This Time&quot; previously, you&apos;ll need to grant permission again.
                    </p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={handleRequestCameraPermission}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    Enable Camera Access
                  </button>
                  <button
                    onClick={() => setShowPermissionAlert(false)}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                
            <div className="mt-4 text-xs text-gray-500">
  {`For best experience, select "Allow" when prompted for camera permission`}
</div>

              </div>
            </div>
          </div>
        )}

        <CameraView
          videoRef={videoRef}
          canvasRef={canvasRef}
          currentPhase={currentPhase}
          countdown={countdown}
          detectionActive={detectionActive}
          frontScanState={frontScanState}
          isProcessing={isProcessing}
          showPromptText={showPromptText}
          promptText={promptText}
        />

        <ControlPanel
          currentPhase={currentPhase}
          onStartValidation={startCardScanning}
          onStartFrontScan={startFrontSideDetection}
          onStartBackScan={startBackSideDetection}
          onStop={stopDetection}
          onReset={resetApplication}
          onTryAgain={handleTryAgain}
          onStartOver={handleStartOver}
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
          frontScanState={frontScanState}
          detectionActive={detectionActive}
        />

        <footer className="text-center text-sm text-gray-400 mt-8">
          © {new Date().getFullYear()} CardNest LLC. All rights reserved.
        </footer>
      </div>
    </div>
  );
};

export default CardDetectionApp;
