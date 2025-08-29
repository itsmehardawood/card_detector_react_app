// "use client";
// import React, { useState, useEffect, useRef } from "react";

// // Import components
// import ControlPanel from "./components/ControlPanel";
// import StatusInformation from "./components/StatusInfo";
// import CameraView from "./components/CameraView";

// // Import utilities
// import {
//   initializeCamera,
//   captureFrame,
//   cleanupCamera,
// } from "./utils/CameraUtils";
// import { sendFrameToAPI } from "./utils/apiService";
// import { useDetection } from "./hooks/UseDetection";

// // Constants for attempt limits and timeouts
// const MAX_ATTEMPTS = 5;
// const DETECTION_TIMEOUT = 40000; // 40 seconds

// const CardDetectionApp = () => {
//   // Authentication state
//   const [authData, setAuthData] = useState(null);
//   const [authLoading, setAuthLoading] = useState(true);
//   const [authError, setAuthError] = useState("");

//   // Existing state management
//   const [currentPhase, setCurrentPhase] = useState("idle");
//   const [detectionActive, setDetectionActive] = useState(false);
//   const [finalOcrResults, setFinalOcrResults] = useState(null);
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [countdown, setCountdown] = useState(0);
//   const [errorMessage, setErrorMessage] = useState("");
//   const [sessionId, setSessionId] = useState("");

//   // Attempt tracking state
//   const [attemptCount, setAttemptCount] = useState(0);
//   const [maxAttemptsReached, setMaxAttemptsReached] = useState(false);
//   const [currentOperation, setCurrentOperation] = useState(""); // 'validation', 'front', 'back'

//   const [validationState, setValidationState] = useState({
//     physicalCard: false,
//     movementState: null,
//     movementMessage: "",
//     validationComplete: false,
//   });

//   // Updated frontScanState to include bankLogoDetected
//   const [frontScanState, setFrontScanState] = useState({
//     framesBuffered: 0,
//     chipDetected: false,
//     bankLogoDetected: false,
//     canProceedToBack: false,
//   });

//   // Refs
//   const videoRef = useRef(null);
//   const canvasRef = useRef(null);
//   const capturedFrames = useRef([]);
//   const countdownIntervalRef = useRef(null);
//   const validationIntervalRef = useRef(null);
//   const stopRequestedRef = useRef(false);
//   const detectionTimeoutRef = useRef(null);

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
//       setErrorMessage(
//         "Maximum attempts reached. Please contact support for assistance."
//       );
//       setCurrentPhase("max-attempts-reached");
//     } else {
//       setErrorMessage(
//         `${message} (Attempt ${newAttemptCount}/${MAX_ATTEMPTS})`
//       );
//       setCurrentPhase("error");
//     }
//   };

//   // Custom hook for detection logic - NOW WITH handleDetectionFailure parameter
//   const {
//     captureAndSendFramesFront,
//     captureAndSendFrames,
//     captureIntervalRef,
//   } = useDetection(
//     videoRef,
//     canvasRef,
//     sessionId,
//     setSessionId,
//     setIsProcessing,
//     setCurrentPhase,
//     setErrorMessage,
//     setFrontScanState,
//     stopRequestedRef,
//     handleDetectionFailure // ADD THIS PARAMETER
//   );

//   // Check for authentication data on component mount
//   useEffect(() => {
//     const checkAuthData = async () => {
//       console.log("🔍 Checking for authentication data...");

//       const urlParams = new URLSearchParams(window.location.search);
//       const sessionId = urlParams.get("session");
//       const merchantId = urlParams.get("merchant_id");
//       const authToken = urlParams.get("auth_token");
//       const source = urlParams.get("source");
//       const demo = urlParams.get("demo");

//       // Method 1: Session-based auth (most secure)
//       if (sessionId) {
//         console.log("🔐 Found session ID, retrieving auth data securely...");
//         try {
//           const response = await fetch(
//             `/securityscan/api/webview-entry?session=${sessionId}`
//           );
//           if (response.ok) {
//             const sessionData = await response.json();
//             console.log("✅ Session auth data retrieved:", {
//               merchantId: sessionData.merchantId,
//               authTokenLength: sessionData.authToken.length,
//               authTokenPreview: sessionData.authToken.substring(0, 20) + "...",
//             });

//             const authObj = {
//               merchantId: sessionData.merchantId,
//               authToken: sessionData.authToken,
//               timestamp: Date.now(),
//               source: "secure_session",
//             };

//             setAuthData(authObj);
//             window.__WEBVIEW_AUTH__ = authObj;
//             setAuthLoading(false);

//             // Clean URL (remove session ID)
//             const cleanUrl = window.location.pathname;
//             window.history.replaceState({}, document.title, cleanUrl);
//             return;
//           } else {
//             console.error("❌ Session retrieval failed:", response.status);
//           }
//         } catch (error) {
//           console.error("❌ Session fetch error:", error);
//         }
//       }

//       // Method 2: URL parameters (fallback, less secure)
//       if (merchantId && authToken && authToken.length > 10) {
//         console.log("✅ Auth data found from URL params");
//         console.log("🔑 Credentials valid:", {
//           merchantId,
//           authTokenLength: authToken.length,
//           authTokenPreview: authToken.substring(0, 20) + "...",
//           source,
//         });

//         const authObj = {
//           merchantId,
//           authToken,
//           timestamp: Date.now(),
//           source: source || "url_params",
//         };

//         setAuthData(authObj);
//         window.__WEBVIEW_AUTH__ = authObj;
//         setAuthLoading(false);

//         // Clean URL for security (remove tokens from address bar)
//         if (!demo) {
//           const cleanUrl = window.location.pathname;
//           window.history.replaceState({}, document.title, cleanUrl);
//         }
//         return;
//       }

//       // Method 3: Demo mode (development only)
//       if (process.env.NODE_ENV === "development" || demo === "true") {
//         console.log("🧪 Using development/demo auth data");
//         const demoAuthObj = {
//           merchantId: "mer000084",
//           authToken: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOi8vYWRtaW4uY2FyZG5lc3QuaW8vYXBpL3NjYW4vdG9rZW4iLCJpYXQiOjE3NTYxOTI0MTksImV4cCI6MTc1NjE5NjAxOSwibmJmIjoxNzU2MTkyNDE5LCJqdGkiOiJUd2tWQndmdkd5SWxlT2FrIiwic3ViIjoibWVyMDAwMDg0IiwicHJ2IjoiMjNiZDVjODk0OWY2MDBhZGIzOWU3MDFjNDAwODcyZGI3YTU5NzZmNyIsInNjYW5faWQiOiJiMDllNzI0OC1kOTdiLTRiMjQtYjc2My01OTIyOGIxMjU4ZWYiLCJtZXJjaGFudF9pZCI6Im1lcjAwMDA4NCIsIm1lcmNoYW50X2NvbnRhY3QiOiIzMDIwNDQ3MDMwIiwiaXNNb2JpbGUiOiJ3ZWIiLCJlbmNyeXB0aW9uX2tleSI6Ikhaczdrb1MyMzMxRkQ4SHgifQ.8CAgCB-hYogcYVZg-90FXeohQC3tvdXhwR56N9a6RNM",
//           timestamp: Date.now(),
//           source: "development_demo",
//         };

//         setAuthData(demoAuthObj);
//         window.__WEBVIEW_AUTH__ = demoAuthObj;
//         setAuthLoading(false);
//         return;
//       }

//       // No auth data found
//       console.error("❌ No authentication data found");
//       console.error("Available URL params:", Array.from(urlParams.entries()));
//       setAuthError("No authentication data received from Android app");
//       setAuthLoading(false);
//     };

//     checkAuthData();
//   }, []);

//   // Helper function to clear detection timeout
//   const clearDetectionTimeout = () => {
//     if (detectionTimeoutRef.current) {
//       clearTimeout(detectionTimeoutRef.current);
//       detectionTimeoutRef.current = null;
//     }
//   };

//   // Helper function to handle detection timeout
//   const startDetectionTimeout = (operation) => {
//     if (detectionTimeoutRef.current) {
//       clearTimeout(detectionTimeoutRef.current);
//     }

//     detectionTimeoutRef.current = setTimeout(() => {
//       if (!stopRequestedRef.current && (detectionActive || isProcessing)) {
//         handleDetectionFailure(
//           `${operation} detection timeout. No detection occurred within 40 seconds.`,
//           operation
//         );
//       }
//     }, DETECTION_TIMEOUT);
//   };

//   // Initialize camera after auth is ready
//   useEffect(() => {
//     if (authData && !authLoading) {
//       initializeCamera(videoRef)
//         .then(() => {
//           console.log("📷 Camera initialized successfully");
//         })
//         .catch((error) => {
//           console.error("❌ Camera initialization failed:", error);
//           setErrorMessage(
//             "Camera access failed. Please allow camera permissions."
//           );
//         });
//     }

//     return () => {
//       cleanupCamera(videoRef);
//       clearDetectionTimeout();

//       if (captureIntervalRef.current) {
//         clearInterval(captureIntervalRef.current);
//       }

//       if (countdownIntervalRef.current) {
//         clearInterval(countdownIntervalRef.current);
//       }

//       if (validationIntervalRef.current) {
//         clearInterval(validationIntervalRef.current);
//       }
//     };
//   }, [authData, authLoading]);

//   // Test API Connection function
//   const testAPIConnection = async () => {
//     if (!authData) return;

//     try {
//       const { merchantId, authToken } = authData;

//       // Skip API test for demo mode to avoid 422 errors
//       if (authData.source === "development_demo") {
//         console.log("🧪 Skipping API test for demo mode");
//         return;
//       }

//       const testUrl = `https://cardapp.hopto.org/detect/${merchantId}/${authToken}`;

//       const formData = new FormData();
//       formData.append("test", "connection");

//       const response = await fetch(testUrl, {
//         method: "POST",
//         body: formData,
//       });

//       console.log("✅ API Connection Test:", response.status);
//     } catch (error) {
//       console.error("❌ API Connection Test Failed:", error);
//     }
//   };

//   // Call API test when auth data is ready
//   useEffect(() => {
//     if (authData) {
//       testAPIConnection();
//     }
//   }, [authData]);

//   // Show loading state while checking authentication
//   if (authLoading) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br text-black from-blue-50 to-indigo-100 flex items-center justify-center p-4">
//         <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
//           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
//           <h3 className="text-lg font-semibold mb-2">
//             Please wait while card scan security begins...
//           </h3>
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
//           <h3 className="text-lg font-semibold text-red-600 mb-2">
//             Authentication Required
//           </h3>
//           <p className="text-gray-600 text-sm mb-4">
//             This page requires authentication data from the Android app.
//           </p>

//           {/* Development links */}
//           {process.env.NODE_ENV === "development" && (
//             <div className="bg-gray-50 p-3 rounded mb-4 text-left">
//               <p className="text-xs font-semibold mb-2">Development Testing:</p>
//               <div className="space-y-1">
//                 <a
//                   href="?demo=true"
//                   className="block text-blue-600 text-xs hover:underline"
//                 >
//                   🧪 Use Demo Mode
//                 </a>
//                 <a
//                   href="?merchant_id=MERCHANT_12345&auth_token=test_jwt_token_1234567890123456"
//                   className="block text-blue-600 text-xs hover:underline"
//                 >
//                   🔧 Test with URL Parameters
//                 </a>
//               </div>
//             </div>
//           )}

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

//   // Stop function to halt all active processes
//   const stopDetection = () => {
//     console.log("🛑 Stopping detection...");
//     stopRequestedRef.current = true;
//     clearDetectionTimeout();

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

//     // Reset states
//     setDetectionActive(false);
//     setIsProcessing(false);
//     setCountdown(0);

//     // Return to appropriate phase based on current state
//     if (currentPhase === "validation") {
//       setCurrentPhase("idle");
//       setValidationState({
//         physicalCard: false,
//         movementState: null,
//         movementMessage: "",
//         validationComplete: false,
//       });
//     } else if (currentPhase === "front-countdown" || currentPhase === "front") {
//       setCurrentPhase("ready-for-front");
//       setFrontScanState({
//         framesBuffered: 0,
//         chipDetected: false,
//         bankLogoDetected: false,
//         canProceedToBack: false,
//       });
//     } else if (currentPhase === "back-countdown" || currentPhase === "back") {
//       setCurrentPhase("ready-for-back");
//     }
//   };

//   // Countdown function
//   const startCountdown = (onComplete) => {
//     setCountdown(3);
//     stopRequestedRef.current = false;

//     countdownIntervalRef.current = setInterval(() => {
//       setCountdown((prev) => {
//         if (prev <= 1) {
//           clearInterval(countdownIntervalRef.current);
//           if (!stopRequestedRef.current) {
//             onComplete();
//           }
//           return 0;
//         }
//         return prev - 1;
//       });
//     }, 1000);
//   };

//   // Card validation process with timeout handling
//   const startCardValidation = async () => {
//     if (maxAttemptsReached) return;

//     setCurrentPhase("validation");
//     setDetectionActive(true); // THIS IS CRITICAL!
//     setErrorMessage("");
//     stopRequestedRef.current = false;
//     setValidationState({
//       physicalCard: false,
//       movementState: null,
//       movementMessage: "Starting validation...",
//       validationComplete: false,
//     });

//     const currentSessionId = `session_${Date.now()}`;
//     setSessionId(currentSessionId);

//     let frameNumber = 0;
//     let validationComplete = false;
//     const maxValidationTime = 27000;
//     const startTime = Date.now();

//     // Start detection timeout
//     startDetectionTimeout("Validation");

//     if (!videoRef.current || videoRef.current.readyState < 2) {
//       handleDetectionFailure("Video not ready for capture", "validation");
//       return;
//     }

//     const processValidationFrame = async () => {
//       try {
//         if (
//           stopRequestedRef.current ||
//           validationComplete ||
//           Date.now() - startTime > maxValidationTime
//         ) {
//           return;
//         }

//         const frame = await captureFrame(videoRef, canvasRef);
//         if (!frame || frame.size === 0) {
//           return;
//         }

//         frameNumber++;
//         setIsProcessing(true);

//         const apiResponse = await sendFrameToAPI(
//           frame,
//           "validation",
//           currentSessionId,
//           frameNumber
//         );

//         if (stopRequestedRef.current) {
//           setIsProcessing(false);
//           return;
//         }

//         // FIXED: Check for validation failures in both message_state AND movement_state
//         if (
//           apiResponse.message_state === "VALIDATION_FAILED" ||
//           apiResponse.movement_state === "VALIDATION_FAILED"
//         ) {
//           validationComplete = true;
//           clearDetectionTimeout();

//           if (validationIntervalRef.current) {
//             clearInterval(validationIntervalRef.current);
//           }

//           setIsProcessing(false);

//           // Use appropriate error message based on which field contains the failure
//           const errorMsg =
//             apiResponse.message ||
//             (apiResponse.movement_state === "VALIDATION_FAILED"
//               ? "Card validation failed. Please ensure you have a physical card and try again."
//               : "Validation failed. Please try again.");

//           handleDetectionFailure(errorMsg, "validation");
//           return;
//         }

//         // FIXED: Check for validation success in both fields
//         if (
//           apiResponse.message_state === "VALIDATION_PASSED" ||
//           apiResponse.movement_state === "VALIDATION_PASSED"
//         ) {
//           validationComplete = true;
//           clearDetectionTimeout();

//           if (validationIntervalRef.current) {
//             clearInterval(validationIntervalRef.current);
//           }

//           setIsProcessing(false);
//             setDetectionActive(false); // ADD THIS LINE!

//           // Reset attempt count on successful validation
//           setAttemptCount(0);
//           setCurrentOperation("");

//           setTimeout(() => {
//             if (!stopRequestedRef.current) {
//               setCurrentPhase("ready-for-front");
//             }
//           }, 2000);
//           return;
//         }

//         // Update validation state - show failure message immediately if movement_state indicates failure
//         const newValidationState = {
//           physicalCard: apiResponse.physical_card || false,
//           movementState: apiResponse.movement_state || null,
//           movementMessage:
//             apiResponse.movement_message ||
//             (apiResponse.movement_state === "VALIDATION_FAILED"
//               ? "Validation Failed"
//               : ""),
//           validationComplete: apiResponse.physical_card || false,
//         };

//         setValidationState(newValidationState);
//         setIsProcessing(false);

//         // Keep the existing logic for backward compatibility
//         if (
//           newValidationState.validationComplete &&
//           !stopRequestedRef.current
//         ) {
//           validationComplete = true;
//           clearDetectionTimeout();

//           if (validationIntervalRef.current) {
//             clearInterval(validationIntervalRef.current);
//           }
//             setDetectionActive(false); // ADD THIS LINE!


//           // Reset attempt count on successful validation
//           setAttemptCount(0);
//           setCurrentOperation("");

//           setTimeout(() => {
//             if (!stopRequestedRef.current) {
//               setCurrentPhase("ready-for-front");
//             }
//           }, 2000);
//         }
//       } catch (error) {
//         console.error("Validation frame processing error:", error);
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
//         handleDetectionFailure(
//           "Our intelligence system requires you to try again since the card scan failed",
//           "validation"
//         );
//       }
//     }, maxValidationTime);
//   };

//   const startFrontSideDetection = async () => {
//     if (maxAttemptsReached) return;

//     setFrontScanState({
//       framesBuffered: 0,
//       chipDetected: false,
//       bankLogoDetected: false,
//       canProceedToBack: false,
//     });

//     setCurrentPhase("front-countdown");
//     setErrorMessage("");

//     startCountdown(async () => {
//       if (stopRequestedRef.current) return;

//       setCurrentPhase("front");
//       setDetectionActive(true);
//       stopRequestedRef.current = false;

//       // Start detection timeout
//       startDetectionTimeout("Front side");

//       try {
//         await captureAndSendFramesFront("front");

//         if (!stopRequestedRef.current) {
//           clearDetectionTimeout();
//           setDetectionActive(false);
//           // Reset attempt count on successful front scan
//           setAttemptCount(0);
//           setCurrentOperation("");
//           setCurrentPhase("ready-for-back");
//         }
//       } catch (error) {
//         console.error("Front side detection failed:", error);
//         setDetectionActive(false);
//         if (!stopRequestedRef.current) {
//           handleDetectionFailure(
//             `Front side detection failed: ${error.message}`,
//             "front"
//           );
//         }
//       }
//     });
//   };

//   // const startBackSideDetection = async () => {
//   //   if (maxAttemptsReached) return;

//   //   setCurrentPhase("back-countdown");
//   //   setErrorMessage("");

//   //   startCountdown(async () => {
//   //     if (stopRequestedRef.current) return;

//   //     setCurrentPhase("back");
//   //     setDetectionActive(true);
//   //     stopRequestedRef.current = false;

//   //     // Start detection timeout
//   //     startDetectionTimeout("Back side");

//   //     try {
//   //       const finalResult = await captureAndSendFrames("back");

//   //       if (!stopRequestedRef.current) {
//   //         clearDetectionTimeout();
//   //         setDetectionActive(false);

//   //         console.log("🔍 Checking final result:", finalResult);

//   //         if (finalResult.encrypted_card_data && finalResult.status) {
//   //           console.log(
//   //             "🎯 Final encrypted response detected - Setting phase to final_response"
//   //           );
//   //           console.log(
//   //             `Status: ${finalResult.status}, Score: ${finalResult.score}`
//   //           );
//   //           setFinalOcrResults(finalResult);
//   //           setCurrentPhase("final_response");
//   //         } else if (finalResult.final_ocr) {
//   //           console.log("📋 Regular OCR results - Setting phase to results");
//   //           setFinalOcrResults(finalResult);
//   //           setCurrentPhase("results");
//   //         } else {
//   //           console.log("⚠️ No final OCR or encrypted data found");
//   //           setFinalOcrResults(finalResult);
//   //           setCurrentPhase("results");
//   //         }

//   //         // Reset attempt count on successful completion
//   //         setAttemptCount(0);
//   //         setCurrentOperation("");
//   //       }
//   //     } catch (error) {
//   //       console.error("Back side detection failed:", error);
//   //       setDetectionActive(false);
//   //       if (!stopRequestedRef.current) {
//   //         handleDetectionFailure(
//   //           `Back side detection failed: ${error.message}`,
//   //           "back"
//   //         );
//   //       }
//   //     }
//   //   });
//   // };


// const startBackSideDetection = async () => {
//   if (maxAttemptsReached) return;

//   setCurrentPhase("back-countdown");
//   setErrorMessage("");

//   startCountdown(async () => {
//     if (stopRequestedRef.current) return;

//     setCurrentPhase("back");
//     setDetectionActive(true);
//     stopRequestedRef.current = false;

//     startDetectionTimeout("Back side");

//     try {
//       const finalResult = await captureAndSendFrames("back");

//       if (!stopRequestedRef.current) {
//         clearDetectionTimeout();
//         setDetectionActive(false);

//         console.log("🔍 Checking final result:", finalResult);

//         if (finalResult?.status === "success" && finalResult?.complete_scan === true) {
//           console.log("✅ Valid back-side scan received, transitioning to 'results'");
//           setFinalOcrResults(finalResult);
//           setCurrentPhase("results");
//           setAttemptCount(0);
//           setCurrentOperation("");
//         } else {
//           console.log("⚠️ Scan result didn't meet success + complete_scan criteria");
//           handleDetectionFailure("Back scan incomplete or failed.", "back");
//         }
//       }
//     } catch (error) {
//       console.error("Back side detection failed:", error);
//       setDetectionActive(false);
//       if (!stopRequestedRef.current) {
//         handleDetectionFailure(`Back side detection failed: ${error.message}`, "back");
//       }
//     }
//   });
// };


//   const resetApplication = () => {
//     stopRequestedRef.current = true;
//     clearDetectionTimeout();

//     setCurrentPhase("idle");
//     setDetectionActive(false);
//     setFinalOcrResults(null);
//     setIsProcessing(false);
//     setCountdown(0);
//     setErrorMessage("");
//     setSessionId("");

//     // Reset attempt tracking completely - this is for "Start New Session"
//     setAttemptCount(0);
//     setMaxAttemptsReached(false);
//     setCurrentOperation("");

//     setValidationState({
//       physicalCard: false,
//       movementState: null,
//       movementMessage: "",
//       validationComplete: false,
//     });
//     setFrontScanState({
//       framesBuffered: 0,
//       chipDetected: false,
//       bankLogoDetected: false,
//       canProceedToBack: false,
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

//   // New function specifically for "Try Again" - keeps attempt count
//   const handleTryAgain = () => {
//     stopRequestedRef.current = true;
//     clearDetectionTimeout();

//     // Don't reset attempt count here - keep it for tracking
//     setDetectionActive(false);
//     setIsProcessing(false);
//     setCountdown(0);
//     setErrorMessage("");

//     // Return to the appropriate phase based on what operation failed
//     if (currentOperation === "validation") {
//       setCurrentPhase("idle");
//       setValidationState({
//         physicalCard: false,
//         movementState: null,
//         movementMessage: "",
//         validationComplete: false,
//       });
//     } else if (currentOperation === "front") {
//       setCurrentPhase("ready-for-front");
//       setFrontScanState({
//         framesBuffered: 0,
//         chipDetected: false,
//         bankLogoDetected: false,
//         canProceedToBack: false,
//       });
//     } else if (currentOperation === "back") {
//       setCurrentPhase("ready-for-back");
//     } else {
//       // Default fallback
//       setCurrentPhase("idle");
//     }

//     // Clean up intervals
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

//   const handleStartOver = () => {
//     stopRequestedRef.current = true;
//     clearDetectionTimeout();
//     setCurrentPhase("idle");
//     setErrorMessage("");
//     // Reset attempt tracking when starting over
//     setAttemptCount(0);
//     setMaxAttemptsReached(false);
//     setCurrentOperation("");
//     stopRequestedRef.current = false;
//   };

//   // Debug component for testing (only shows in development)
//   const DebugAuth = () => {
//     if (!authData || process.env.NODE_ENV === "production") return null;

//     return (
//       <div className="fixed top-4 left-4 bg-black bg-opacity-75 text-white p-3 rounded text-xs z-50">
//         <div>Merchant: {authData.merchantId}</div>
//         <div>Token: {authData.authToken.substring(0, 8)}...</div>
//         <div>Source: {authData.source}</div>
//         <div>Time: {new Date(authData.timestamp).toLocaleTimeString()}</div>
//       </div>
//     );
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-700 to-black p-4 sm:p-4">
//       <div className="container mx-auto max-w-4xl">
//         {/* Debug info (only shows in development) */}
//         {/* <DebugAuth /> */}

//         <h1 className="text-xl bg-white p-2 sm:text-2xl lg:text-3xl  rounded-md font-bold text-center mb-4 sm:mb-8 text-gray-900">
//           Card Security Scan
//         </h1>

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

//         <ControlPanel
//           currentPhase={currentPhase}
//           onStartValidation={startCardValidation}
//           onStartFrontScan={startFrontSideDetection}
//           onStartBackScan={startBackSideDetection}
//           onStop={stopDetection}
//           onReset={resetApplication}
//           onTryAgain={handleTryAgain}
//           onStartOver={handleStartOver}
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

//         <StatusInformation
//           currentPhase={currentPhase}
//           sessionId={sessionId}
//           validationState={validationState}
//           frontScanState={frontScanState}
//           detectionActive={detectionActive}
//         />

//         <footer className="text-center text-sm text-gray-400 mt-8">
//           © {new Date().getFullYear()} CardNest LLC. All rights reserved.
//         </footer>
//       </div>
//     </div>
//   );
// };

// export default CardDetectionApp;







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
} from "./utils/CameraUtils";
import { sendFrameToAPI } from "./utils/apiService";
import { useDetection } from "./hooks/UseDetection";
import Image from "next/image";

// Constants for attempt limits and timeouts
const MAX_ATTEMPTS = 5;
const DETECTION_TIMEOUT = 40000; // 40 seconds

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
  

  // Attempt tracking state
  const [attemptCount, setAttemptCount] = useState(0);
  const [maxAttemptsReached, setMaxAttemptsReached] = useState(false);
  const [currentOperation, setCurrentOperation] = useState(""); // 'validation', 'front', 'back'
  const [debugInfo, setDebugInfo] = useState("");
  const [existingLogoUrl, setExistingLogoUrl] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [validationState, setValidationState] = useState({
    physicalCard: false,
    movementState: null,
    movementMessage: "",
    validationComplete: false,
  });
const [formData, setFormData] = useState({
  displayName: '',
  logo: null,
}); 
  // Updated frontScanState to include bankLogoDetected
  const [frontScanState, setFrontScanState] = useState({
    framesBuffered: 0,
    chipDetected: false,
    bankLogoDetected: false,
    canProceedToBack: false,
  });

  const [merchantInfo, setMerchantInfo] = useState(
    {
      display_name: '',
      display_logo: '',
      merchant_id: '',
      loading: false,
      error: null
    }
  );


  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const capturedFrames = useRef([]);
  const countdownIntervalRef = useRef(null);
  const validationIntervalRef = useRef(null);
  const stopRequestedRef = useRef(false);
  const detectionTimeoutRef = useRef(null);

  const fetchMerchantDisplayInfo = async (merchantId) => {
    if (!merchantId) {
      console.log('🚫 No merchantId provided to fetchMerchantDisplayInfo');
      return;
    }
       
    try {
      console.log('🔍 Fetching merchant display info for:', merchantId);
      setDebugInfo('Fetching existing display info...');

      const response = await fetch(
        `https://admin.cardnest.io/api/getmerchantDisplayInfo?merchantId=${encodeURIComponent(merchantId)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('📡 GET API Response status:', response.status);

      let result;
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        const textResult = await response.text();
        console.log('Non-JSON response:', textResult);

        try {
          result = JSON.parse(textResult);
        } catch {
          result = { message: textResult };
        }
      }

      console.log('📊 GET API Response result:', result);

      if (response.ok && (result.status === true || result.success === true)) {
        if (result.data) {
          const { display_name, display_logo } = result.data;

          if (display_name) {
            console.log('✅ Setting merchant name:', display_name);
            setMerchantName(display_name);
          }

          if (display_logo) {
            console.log('✅ Setting merchant logo:', display_logo);
            setMerchantLogo(display_logo);
          }

          setDebugInfo('Existing data loaded successfully');
        } else {
          setDebugInfo('No existing data found');
        }
      } else {
        setDebugInfo('No existing data found or API error');
      }





      // new

//       if (response.ok && (result.status === true || result.success === true)) {
//   if (result.data) {
//     const { display_name, display_logo } = result.data;

//     if (display_name) {
//       console.log('✅ Setting merchant name:', display_name);
//       setMerchantName(display_name);
//     }

//     if (display_logo) {
//       // 🔒 Force HTTPS
//       const safeLogo = display_logo.replace(/^http:\/\//i, "https://");
//       console.log('✅ Setting merchant logo:', safeLogo);
//       setMerchantLogo(safeLogo);
//     }

//     setDebugInfo('Existing data loaded successfully');
//   } else {
//     setDebugInfo('No existing data found');
//   }
// } else {
//   setDebugInfo('No existing data found or API error');
// }






    } catch (error) {
      console.error('❌ Error fetching merchant display info:', error);
      setDebugInfo(`Error fetching data: ${error.message}`);
    }
  };

  // Call fetchMerchantDisplayInfo when Merchant state is updated
  useEffect(() => {
    if (Merchant) {
      console.log('� Merchant ID available, fetching display info:', Merchant);
      fetchMerchantDisplayInfo(Merchant);
    }
  }, [Merchant])



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
              console.log("🏪 Setting merchant ID from session:", sessionData.merchantId);
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
          const demoMerchantId = "G5536942984B2978";
          const demoAuthObj = {
            merchantId: demoMerchantId,
            authToken: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOi8vYWRtaW4uY2FyZG5lc3QuaW8vYXBpL21lcmNoYW50c2Nhbi9nZW5lcmF0ZVRva2VuIiwiaWF0IjoxNzU2MzY1NTU4LCJleHAiOjE3NTYzNjkxNTgsIm5iZiI6MTc1NjM2NTU1OCwianRpIjoiNXZ3WlRTUndmbnowYjNzSyIsInN1YiI6Ikc1NTM2OTQyOTg0QjI5NzgiLCJwcnYiOiIyM2JkNWM4OTQ5ZjYwMGFkYjM5ZTcwMWM0MDA4NzJkYjdhNTk3NmY3Iiwic2Nhbl9pZCI6IjNhYTM0NDEwLTM4Y2UtNGNhNC1iZjg4LTNhMmVmMzNhN2YyZSIsIm1lcmNoYW50X2lkIjoiRzU1MzY5NDI5ODRCMjk3OCIsImVuY3J5cHRpb25fa2V5IjoiN3czdklOcDFDcVhOME5nNyIsImZlYXR1cmVzIjpudWxsfQ.4ynheHJuGaWKQM3Ares8IJWPxs7Rtz89UjhwTe7HDbs",
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
        }      // No auth data found
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
      initializeCamera(videoRef)
        .then(() => {
          console.log("📷 Camera initialized successfully");
        })
        .catch((error) => {
          console.error("❌ Camera initialization failed:", error);
          setErrorMessage(
            "Camera access failed. Please allow camera permissions."
          );
        });
    }

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
  }, [authData, authLoading]);

  // Test API Connection function
  const testAPIConnection = async () => {
    if (!authData) return;

    try {
      const { merchantId, authToken } = authData;

      // Skip API test for demo mode to avoid 422 errors
      if (authData.source === "development_demo") {
        console.log("🧪 Skipping API test for demo mode");
        return;
      }

      const testUrl = `https://cardapp.hopto.org/detect/${merchantId}/${authToken}`;

      const formData = new FormData();
      formData.append("test", "connection");

      const response = await fetch(testUrl, {
        method: "POST",
        body: formData,
      });

      console.log("✅ API Connection Test:", response.status);
    } catch (error) {
      console.error("❌ API Connection Test Failed:", error);
    }
  };

  // Call API test when auth data is ready
  useEffect(() => {
    if (authData) {
      testAPIConnection();
    }
  }, [authData]);

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
    if (currentPhase === "validation") {
      setCurrentPhase("idle");
      setValidationState({
        physicalCard: false,
        movementState: null,
        movementMessage: "",
        validationComplete: false,
      });
    } else if (currentPhase === "front-countdown" || currentPhase === "front") {
      setCurrentPhase("ready-for-front");
      setFrontScanState({
        framesBuffered: 0,
        chipDetected: false,
        bankLogoDetected: false,
        canProceedToBack: false,
      });
    } else if (currentPhase === "back-countdown" || currentPhase === "back") {
      setCurrentPhase("ready-for-back");
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

    setCurrentPhase("validation");
    setDetectionActive(true); // THIS IS CRITICAL!
    setErrorMessage("");
    stopRequestedRef.current = false;
    setValidationState({
      physicalCard: false,
      movementState: null,
      movementMessage: "Starting validation...",
      validationComplete: false,
    });

    const currentSessionId = `session_${Date.now()}`;
    setSessionId(currentSessionId);

    let frameNumber = 0;
    let validationComplete = false;
    const maxValidationTime = 27000;
    const startTime = Date.now();

    // Start detection timeout
    startDetectionTimeout("Validation");

    if (!videoRef.current || videoRef.current.readyState < 2) {
      handleDetectionFailure("Video not ready for capture", "validation");
      return;
    }

    const processValidationFrame = async () => {
      try {
        if (
          stopRequestedRef.current ||
          validationComplete ||
          Date.now() - startTime > maxValidationTime
        ) {
          return;
        }

        const frame = await captureFrame(videoRef, canvasRef);
        if (!frame || frame.size === 0) {
          return;
        }

        frameNumber++;
        setIsProcessing(true);

        const apiResponse = await sendFrameToAPI(
          frame,
          "validation",
          currentSessionId,
          frameNumber
        );

        if (stopRequestedRef.current) {
          setIsProcessing(false);
          return;
        }

        // FIXED: Check for validation failures in both message_state AND movement_state
        if (
          apiResponse.message_state === "VALIDATION_FAILED" ||
          apiResponse.movement_state === "VALIDATION_FAILED"
        ) {
          validationComplete = true;
          clearDetectionTimeout();

          if (validationIntervalRef.current) {
            clearInterval(validationIntervalRef.current);
          }

          setIsProcessing(false);

          // Use appropriate error message based on which field contains the failure
          const errorMsg =
            apiResponse.message ||
            (apiResponse.movement_state === "VALIDATION_FAILED"
              ? "Card validation failed. Please ensure you have a physical card and try again."
              : "Validation failed. Please try again.");

          handleDetectionFailure(errorMsg, "validation");
          return;
        }

        // FIXED: Check for validation success in both fields
        if (
          apiResponse.message_state === "VALIDATION_PASSED" ||
          apiResponse.movement_state === "VALIDATION_PASSED"
        ) {
          validationComplete = true;
          clearDetectionTimeout();

          if (validationIntervalRef.current) {
            clearInterval(validationIntervalRef.current);
          }

          setIsProcessing(false);
            setDetectionActive(false); // ADD THIS LINE!

          // Reset attempt count on successful validation
          setAttemptCount(0);
          setCurrentOperation("");

          setTimeout(() => {
            if (!stopRequestedRef.current) {
              setCurrentPhase("ready-for-front");
            }
          }, 2000);
          return;
        }

        // Update validation state - show failure message immediately if movement_state indicates failure
        const newValidationState = {
          physicalCard: apiResponse.physical_card || false,
          movementState: apiResponse.movement_state || null,
          movementMessage:
            apiResponse.movement_message ||
            (apiResponse.movement_state === "VALIDATION_FAILED"
              ? "Validation Failed"
              : ""),
          validationComplete: apiResponse.physical_card || false,
        };

        setValidationState(newValidationState);
        setIsProcessing(false);

        // Keep the existing logic for backward compatibility
        if (
          newValidationState.validationComplete &&
          !stopRequestedRef.current
        ) {
          validationComplete = true;
          clearDetectionTimeout();

          if (validationIntervalRef.current) {
            clearInterval(validationIntervalRef.current);
          }
            setDetectionActive(false); // ADD THIS LINE!


          // Reset attempt count on successful validation
          setAttemptCount(0);
          setCurrentOperation("");

          setTimeout(() => {
            if (!stopRequestedRef.current) {
              setCurrentPhase("ready-for-front");
            }
          }, 2000);
        }
      } catch (error) {
        console.error("Validation frame processing error:", error);
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
        handleDetectionFailure(
          "Our intelligence system requires you to try again since the card scan failed",
          "validation"
        );
      }
    }, maxValidationTime);
  };

  const startFrontSideDetection = async () => {
    if (maxAttemptsReached) return;

    setFrontScanState({
      framesBuffered: 0,
      chipDetected: false,
      bankLogoDetected: false,
      canProceedToBack: false,
    });

    setCurrentPhase("front-countdown");
    setErrorMessage("");

    startCountdown(async () => {
      if (stopRequestedRef.current) return;

      setCurrentPhase("front");
      setDetectionActive(true);
      stopRequestedRef.current = false;

      // Start detection timeout
      startDetectionTimeout("Front side");

      try {
        await captureAndSendFramesFront("front");

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

  // const startBackSideDetection = async () => {
  //   if (maxAttemptsReached) return;

  //   setCurrentPhase("back-countdown");
  //   setErrorMessage("");

  //   startCountdown(async () => {
  //     if (stopRequestedRef.current) return;

  //     setCurrentPhase("back");
  //     setDetectionActive(true);
  //     stopRequestedRef.current = false;

  //     // Start detection timeout
  //     startDetectionTimeout("Back side");

  //     try {
  //       const finalResult = await captureAndSendFrames("back");

  //       if (!stopRequestedRef.current) {
  //         clearDetectionTimeout();
  //         setDetectionActive(false);

  //         console.log("🔍 Checking final result:", finalResult);

  //         if (finalResult.encrypted_card_data && finalResult.status) {
  //           console.log(
  //             "🎯 Final encrypted response detected - Setting phase to final_response"
  //           );
  //           console.log(
  //             `Status: ${finalResult.status}, Score: ${finalResult.score}`
  //           );
  //           setFinalOcrResults(finalResult);
  //           setCurrentPhase("final_response");
  //         } else if (finalResult.final_ocr) {
  //           console.log("📋 Regular OCR results - Setting phase to results");
  //           setFinalOcrResults(finalResult);
  //           setCurrentPhase("results");
  //         } else {
  //           console.log("⚠️ No final OCR or encrypted data found");
  //           setFinalOcrResults(finalResult);
  //           setCurrentPhase("results");
  //         }

  //         // Reset attempt count on successful completion
  //         setAttemptCount(0);
  //         setCurrentOperation("");
  //       }
  //     } catch (error) {
  //       console.error("Back side detection failed:", error);
  //       setDetectionActive(false);
  //       if (!stopRequestedRef.current) {
  //         handleDetectionFailure(
  //           `Back side detection failed: ${error.message}`,
  //           "back"
  //         );
  //       }
  //     }
  //   });
  // };


const startBackSideDetection = async () => {
  if (maxAttemptsReached) return;

  setCurrentPhase("back-countdown");
  setErrorMessage("");

  startCountdown(async () => {
    if (stopRequestedRef.current) return;

    setCurrentPhase("back");
    setDetectionActive(true);
    stopRequestedRef.current = false;

    startDetectionTimeout("Back side");

    try {
      const finalResult = await captureAndSendFrames("back");

      if (!stopRequestedRef.current) {
        clearDetectionTimeout();
        setDetectionActive(false);

        console.log("🔍 Checking final result:", finalResult);

        if (finalResult?.status === "success" && finalResult?.complete_scan === true) {
          console.log("✅ Valid back-side scan received, transitioning to 'results'");
          setFinalOcrResults(finalResult);
          setCurrentPhase("results");
          setAttemptCount(0);
          setCurrentOperation("");
        } else {
          console.log("⚠️ Scan result didn't meet success + complete_scan criteria");
          handleDetectionFailure("Back scan incomplete or failed.", "back");
        }
      }
    } catch (error) {
      console.error("Back side detection failed:", error);
      setDetectionActive(false);
      if (!stopRequestedRef.current) {
        handleDetectionFailure(`Back side detection failed: ${error.message}`, "back");
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

    // Reset attempt tracking completely - this is for "Start New Session"
    setAttemptCount(0);
    setMaxAttemptsReached(false);
    setCurrentOperation("");

    setValidationState({
      physicalCard: false,
      movementState: null,
      movementMessage: "",
      validationComplete: false,
    });
    setFrontScanState({
      framesBuffered: 0,
      chipDetected: false,
      bankLogoDetected: false,
      canProceedToBack: false,
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
    setErrorMessage("");

    // Return to the appropriate phase based on what operation failed
    if (currentOperation === "validation") {
      setCurrentPhase("idle");
      setValidationState({
        physicalCard: false,
        movementState: null,
        movementMessage: "",
        validationComplete: false,
      });
    } else if (currentOperation === "front") {
      setCurrentPhase("ready-for-front");
      setFrontScanState({
        framesBuffered: 0,
        chipDetected: false,
        bankLogoDetected: false,
        canProceedToBack: false,
      });
    } else if (currentOperation === "back") {
      setCurrentPhase("ready-for-back");
    } else {
      // Default fallback
      setCurrentPhase("idle");
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
    setCurrentPhase("idle");
    setErrorMessage("");
    // Reset attempt tracking when starting over
    setAttemptCount(0);
    setMaxAttemptsReached(false);
    setCurrentOperation("");
    stopRequestedRef.current = false;
  };

  // Debug component for testing (only shows in development)
  const DebugAuth = () => {
    if (!authData || process.env.NODE_ENV === "production") return null;

    return (
      <div className="fixed top-4 left-4 bg-black bg-opacity-75 text-white p-3 rounded text-xs z-50">
        <div>Merchant: {authData.merchantId}</div>
        <div>Token: {authData.authToken.substring(0, 8)}...</div>
        <div>Source: {authData.source}</div>
        <div>Time: {new Date(authData.timestamp).toLocaleTimeString()}</div>
      </div>
    );
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

        <footer className="text-center text-sm text-gray-400 mt-8">
          © {new Date().getFullYear()} CardNest LLC. All rights reserved.
        </footer>
      </div>
    </div>
  );
};

export default CardDetectionApp;
