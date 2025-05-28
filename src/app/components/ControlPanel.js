// import React from "react";
// import { Camera, CheckCircle, RotateCcw, Shield, Square, AlertTriangle, Phone } from "lucide-react";
// import DetectionResults from "./DetectionResults";

// const ControlPanel = ({
//   currentPhase,
//   onStartValidation,
//   onStartFrontScan,
//   onStartBackScan,
//   onStop,
//   onReset,
//   onTryAgain,
//   onStartOver,
//   validationState,
//   frontScanState,
//   countdown,
//   errorMessage,
//   finalOcrResults,
//   detectionActive,
//   isProcessing,
//   attemptCount = 0,
//   maxAttempts = 3,
//   maxAttemptsReached = false,
// }) => {
//   // Helper function to determine if stop button should be shown
//   const shouldShowStopButton = () => {
//     return (
//       currentPhase === "validation" ||
//       currentPhase === "front-countdown" ||
//       currentPhase === "front" ||
//       currentPhase === "back-countdown" ||
//       currentPhase === "back" ||
//       detectionActive ||
//       isProcessing
//     );
//   };

//   const renderPhaseContent = () => {
//     switch (currentPhase) {
//       case "idle":
//         return (
//           <div className="text-center">
//             <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-6 text-black">
//               Ready to Validate Card
//             </h2>
//             <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-8 max-w-2xl mx-auto px-2">
//               First, we will validate your card to ensure it is properly
//               positioned, recognized as a physical card, and that there is good
//               lighting.
//             </p>
//             <button
//               onClick={onStartValidation}
//               className="bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-10 py-3 sm:py-4 rounded-lg font-medium text-base sm:text-xl transition-colors flex items-center mx-auto"
//             >
//               <Shield className="w-4 h-4 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
//               Start Card Validation
//             </button>
//           </div>
//         );

//       case "validation":
//         return (
//           <div className="text-center">
//             <div className="w-12 h-12 sm:w-16 md:w-20 sm:h-16 md:h-20 text-blue-500 mx-auto mb-3 sm:mb-6 flex items-center justify-center">
//               <Shield className="w-full h-full" />
//             </div>
//             <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-6 text-blue-600">
//               Validating Card
//             </h2>

//             <div className="mb-6 p-3 sm:p-4 bg-blue-50 border text-black border-blue-200 rounded-lg">
//               <div className="flex justify-center items-center">
//                 <div className="flex justify-between items-center w-64">
//                   <span className="font-medium">Physical Card:</span>
//                   <span
//                     className={
//                       validationState.physicalCard
//                         ? "text-green-600"
//                         : "text-red-600"
//                     }
//                   >
//                     {validationState.physicalCard
//                       ? "✓ Detected"
//                       : "✗ Not Detected"}
//                   </span>
//                 </div>
//               </div>
//             </div>

//             {validationState.movementMessage && (
//               <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-8 max-w-2xl mx-auto px-2">
//                 {validationState.movementMessage}
//               </p>
//             )}

//             {validationState.validationComplete && (
//               <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
//                 <p className="text-green-700 font-medium">
//                   ✓ Card validation complete! Ready for front side scan.
//                 </p>
//               </div>
//             )}

//             {shouldShowStopButton() && (
//               <button
//                 onClick={onStop}
//                 className="bg-red-600 hover:bg-red-700 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-medium transition-colors flex items-center mx-auto mt-4"
//               >
//                 <Square className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
//                 Stop Validation
//               </button>
//             )}
//           </div>
//         );

//       case "ready-for-front":
//         return (
//           <div className="text-center">
//             <CheckCircle className="w-12 h-12 sm:w-16 md:w-20 sm:h-16 md:h-20 text-green-500 mx-auto mb-3 sm:mb-6" />
//             <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-6 text-green-600">
//               Validation Complete!
//             </h2>
//             <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-8 max-w-2xl mx-auto px-2">
//               Physical card detected successfully. Click the button below to
//               start scanning the front side of your card.
//             </p>
//             <button
//               onClick={onStartFrontScan}
//               className="bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-10 py-3 sm:py-4 rounded-lg font-medium text-base sm:text-xl transition-colors flex items-center mx-auto"
//             >
//               <Camera className="w-4 h-4 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
//               Start Front Side Scan
//             </button>
//           </div>
//         );

//       case "front-countdown":
//         return (
//           <div className="text-center">
//             <div className="w-12 h-12 sm:w-16 md:w-20 sm:h-16 md:h-20 text-blue-500 mx-auto mb-3 sm:mb-6 flex items-center justify-center">
//               <Camera className="w-full h-full" />
//             </div>
//             <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-6 text-blue-600">
//               Get Ready!
//             </h2>
//             <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-8 max-w-2xl mx-auto px-2">
//               Front side scanning will begin in{" "}
//               <span className="font-bold text-blue-600">{countdown}</span>{" "}
//               seconds. Make sure your card is positioned in the frame.
//             </p>

//             {shouldShowStopButton() && (
//               <button
//                 onClick={onStop}
//                 className="bg-red-600 hover:bg-red-700 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-medium transition-colors flex items-center mx-auto"
//               >
//                 <Square className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
//                 Stop Countdown
//               </button>
//             )}
//           </div>
//         );

//       case "front":
//         return (
//           <div className="text-center">
//             <div className="w-12 h-12 sm:w-16 md:w-20 sm:h-16 md:h-20 text-blue-500 mx-auto mb-3 sm:mb-6 flex items-center justify-center">
//               <Camera className="w-full h-full" />
//             </div>
//             <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-6 text-blue-600">
//               Scanning Front Side
//             </h2>
//             <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-8 max-w-2xl mx-auto px-2">
//               Please ensure the chip is clearly visible. We need both 6 frames
//               and chip detection to proceed.
//             </p>

//             {shouldShowStopButton() && (
//               <button
//                 onClick={onStop}
//                 className="bg-red-600 hover:bg-red-700 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-medium transition-colors flex items-center mx-auto"
//               >
//                 <Square className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
//                 Stop Scanning
//               </button>
//             )}
//           </div>
//         );

//       case "ready-for-back":
//         return (
//           <div className="text-center">
//             <RotateCcw className="w-12 h-12 sm:w-16 md:w-20 sm:h-16 md:h-20 text-green-500 mx-auto mb-3 sm:mb-6" />
//             <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-6 text-green-600">
//               Front Side Complete!
//             </h2>
//             <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-8 max-w-2xl mx-auto px-2">
//               Chip detected and sufficient frames captured! Please flip your
//               card to show the back side and click the button below to scan the
//               back.
//             </p>
//             <button
//               onClick={onStartBackScan}
//               className="bg-purple-600 hover:bg-purple-700 text-white px-6 sm:px-10 py-3 sm:py-4 rounded-lg font-medium text-base sm:text-xl transition-colors flex items-center mx-auto"
//             >
//               <Camera className="w-4 h-4 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
//               Start Back Side Scan
//             </button>
//           </div>
//         );

//       case "back-countdown":
//         return (
//           <div className="text-center">
//             <div className="w-12 h-12 sm:w-16 md:w-20 sm:h-16 md:h-20 text-purple-500 mx-auto mb-3 sm:mb-6 flex items-center justify-center">
//               <Camera className="w-full h-full" />
//             </div>
//             <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-6 text-purple-600">
//               Get Ready!
//             </h2>
//             <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-8 max-w-2xl mx-auto px-2">
//               Back side scanning will begin in{" "}
//               <span className="font-bold text-purple-600">{countdown}</span>{" "}
//               seconds. Make sure your card is positioned in the frame.
//             </p>

//             {shouldShowStopButton() && (
//               <button
//                 onClick={onStop}
//                 className="bg-red-600 hover:bg-red-700 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-medium transition-colors flex items-center mx-auto"
//               >
//                 <Square className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
//                 Stop Countdown
//               </button>
//             )}
//           </div>
//         );

//       case "back":
//         return (
//           <div className="text-center">
//             <div className="w-12 h-12 sm:w-16 md:w-20 sm:h-16 md:h-20 text-purple-500 mx-auto mb-3 sm:mb-6 flex items-center justify-center">
//               <Camera className="w-full h-full" />
//             </div>
//             <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-6 text-purple-600">
//               Scanning Back Side
//             </h2>
//             <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-8 max-w-2xl mx-auto px-2">
//               Please keep the card steady while we capture the back side
//               information.
//             </p>

//             {shouldShowStopButton() && (
//               <button
//                 onClick={onStop}
//                 className="bg-red-600 hover:bg-red-700 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-medium transition-colors flex items-center mx-auto"
//               >
//                 <Square className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
//                 Stop Scanning
//               </button>
//             )}
//           </div>
//         );

//       case "results":
//         return (
//           <DetectionResults
//             finalOcrResults={finalOcrResults}
//             onReset={onReset}
//           />
//         );

//       case "error":
//         return (
//           <div className="text-center">
//             <div className="w-12 h-12 sm:w-16 md:w-20 sm:h-16 md:h-20 text-red-500 mx-auto mb-3 sm:mb-6 flex items-center justify-center">
//               <AlertTriangle className="w-full h-full" />
//             </div>
//             <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-6 text-red-600">
//               Detection Failed
//             </h2>
//             <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-8 max-w-2xl mx-auto px-2">
//               {errorMessage}
//             </p>
            
//             {/* Show attempt counter */}
//             {attemptCount > 0 && attemptCount < maxAttempts && (
//               <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
//                 <p className="text-yellow-700 font-medium">
//                   Attempt {attemptCount} of {maxAttempts}
//                 </p>
//               </div>
//             )}
            
//             <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
//               {attemptCount < maxAttempts ? (
//                 <button
//                   onClick={onTryAgain}
//                   className="bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base"
//                 >
//                   Try Again ({maxAttempts - attemptCount} attempts left)
//                 </button>
//               ) : (
//                 {/* <button
//                   onClick={onStartOver}
//                   className="bg-gray-600 hover:bg-gray-700 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base"
//                 >
//                   Start Over
//                 </button> */}
//               )}
//             </div>
//           </div>
//         );

//       case "max-attempts-reached":
//         return (
//           <div className="text-center">
//             <div className="w-12 h-12 sm:w-16 md:w-20 sm:h-16 md:h-20 text-red-500 mx-auto mb-3 sm:mb-6 flex items-center justify-center">
//               <Phone className="w-full h-full" />
//             </div>
//             <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-6 text-red-600">
//               Maximum Attempts Reached
//             </h2>
//             <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-8 max-w-2xl mx-auto px-2">
//               {errorMessage}
//             </p>
            
//             <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
//               <div className="flex items-center justify-center mb-3">
//                 <Phone className="w-6 h-6 text-red-600 mr-2" />
//                 <h3 className="text-lg font-semibold text-red-700">Contact Support</h3>
//               </div>
//               <p className="text-red-700 mb-3">
//                 You have reached the maximum number of attempts ({maxAttempts}). 
//                 Please contact our support team for assistance.
//               </p>
//               <div className="text-sm text-red-600">
//                 <p>• Email:  support@lollicash.com</p>
//                 <p>• Phone: +1 6464509293</p>
//               </div>
//             </div>
            
//             <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
//               {/* <button
//                 onClick={onStartOver}
//                 className="bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base"
//               >
//                 Start New Session
//               </button> */}
//             </div>
//           </div>
//         );

        
//       default:
//         return null;
//     }
//   };

//   return (
//     <div className="bg-white rounded-lg shadow-lg p-4 sm:p-8">
//       {renderPhaseContent()}
//     </div>
//   );
// };

// export default ControlPanel;




import React from 'react';
import DetectionResults from './DetectionResults';

const ControlPanel = ({
  currentPhase,
  onStartValidation,
  onStartFrontScan,
  onStartBackScan,
  onStop,
  onReset,
  onTryAgain,
  onStartOver,
  validationState,
  frontScanState,
  countdown,
  errorMessage,
  finalOcrResults,
  detectionActive,
  isProcessing,
  attemptCount,
  maxAttempts,
  maxAttemptsReached
}) => {
  const isActive = detectionActive || isProcessing || countdown > 0;

  // Show results if detection is complete
  if (currentPhase === 'results') {
    return (
      <DetectionResults 
        finalOcrResults={finalOcrResults} 
        onReset={onReset} 
      />
    );
  }

  // Show error state with try again options
  if (currentPhase === 'error') {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
        <div className="text-center mb-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Detection Failed</h3>
            <p className="text-red-700 mb-3">{errorMessage}</p>
            
            {attemptCount < maxAttempts && (
              <div className="text-sm text-red-600">
                You have {maxAttempts - attemptCount} attempt{maxAttempts - attemptCount !== 1 ? 's' : ''} remaining.
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {!maxAttemptsReached && (
              <button
                onClick={onTryAgain}
                className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Try Again
              </button>
            )}
            
            {/* <button
              onClick={onStartOver}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Start Over
            </button> */}
            
            {/* <button
              onClick={onReset}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              New Session
            </button> */}
          </div>
        </div>
      </div>
    );
  }

  // Show max attempts reached state
  if (currentPhase === 'max-attempts-reached') {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Maximum Attempts Reached</h3>
            <p className="text-red-700 mb-3">{errorMessage}</p>
            <p className="text-red-700 mb-3 font-bold">Contact on</p>
            <p className='text-red-700  '>Email: support@lollicash.com</p>
            <p className="text-red-700 mb-3">Phone: +1 6464509293</p>
      
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {/* <button
              onClick={onReset}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Start New Session
            </button> */}
          </div>
        </div>
      </div>
    );
  }

  // Regular control panel for active phases
  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
        
        {/* Start Validation Button */}
        {currentPhase === 'idle' && (
          <button
            onClick={onStartValidation}
            disabled={isActive || maxAttemptsReached}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors w-full sm:w-auto"
          >
            {isActive ? 'Validating...' : 'Start Validation'}
          </button>
        )}

        {/* Start Front Scan Button */}
        {currentPhase === 'ready-for-front' && (
          <button
            onClick={onStartFrontScan}
            disabled={isActive || maxAttemptsReached}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors w-full sm:w-auto"
          >
            {isActive ? 'Scanning Front...' : 'Scan Front Side'}
          </button>
        )}

        {/* Start Back Scan Button */}
        {currentPhase === 'ready-for-back' && (
          <button
            onClick={onStartBackScan}
            disabled={isActive || maxAttemptsReached || !frontScanState.canProceedToBack}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors w-full sm:w-auto"
          >
            {isActive ? 'Scanning Back...' : 'Scan Back Side'}
          </button>
        )}

        {/* Stop Button - shown during active detection */}
        {isActive && !maxAttemptsReached && (
          <button
            onClick={onStop}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors w-full sm:w-auto"
          >
            Stop Detection
          </button>
        )}

        {/* Reset Button - always available except during active detection */}
        {!isActive && currentPhase !== 'idle' && (
          <button
            onClick={onReset}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg font-medium transition-colors w-full sm:w-auto"
          >
            Reset
          </button>
        )}
      </div>

      {/* Status Messages */}
      {countdown > 0 && (
        <div className="mt-4 text-center">
          <p className="text-lg font-semibold text-blue-600">
            Starting in {countdown}...
          </p>
        </div>
      )}

      {isProcessing && !countdown && (
        <div className="mt-4 text-center">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <p className="text-blue-600 font-medium">Processing frame...</p>
          </div>
        </div>
      )}

      {/* Progress Information */}
      {/* {currentPhase === 'validation' && validationState.movementMessage && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">{validationState.movementMessage}</p>
        </div>
      )} */}
{/* 
      {currentPhase === 'front' && (
        <div className="mt-4 text-center">
          <div className="text-sm text-gray-600 space-y-1">
            <p>Frames: {frontScanState.framesBuffered}/6</p>
            <p>Chip: {frontScanState.chipDetected ? '✓' : '✗'} | Bank Logo: {frontScanState.bankLogoDetected ? '✓' : '✗'}</p>
          </div>
        </div>
      )} */}

      {/* Requirements not met warning */}
      {currentPhase === 'ready-for-back' && !frontScanState.canProceedToBack && (
        <div className="mt-4 text-center">
          <p className="text-sm text-orange-600">
            Front side scan incomplete. Both chip and bank logo must be detected.
          </p>
        </div>
      )}

      {/* Attempt Counter */}
      {attemptCount > 0 && !maxAttemptsReached && (
        <div className="mt-4 text-center">
          <p className="text-sm text-orange-600">
            Attempts: {attemptCount}/{maxAttempts}
          </p>
        </div>
      )}
    </div>
  );
};

export default ControlPanel;