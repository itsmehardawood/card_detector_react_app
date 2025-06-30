import React from 'react';
import DetectionResults from './DetectionResults';
import FinalResponse from './FinalResponse';

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
  
  // Show final encrypted response
  if (currentPhase === 'final_response' && finalOcrResults?.encrypted_card_data) {
    return <FinalResponse finalResponse={finalOcrResults} onReset={onReset} />;
  }

  // Show regular results
  if (currentPhase === 'results' && finalOcrResults?.final_ocr) {
    return <DetectionResults finalOcrResults={finalOcrResults} onReset={onReset} />;
  }

  // Error state with attempt tracking
  if (currentPhase === 'error') {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
        <div className="text-center">
          <div className="mb-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl sm:text-3xl">⚠️</span>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-red-600 mb-2">Detection Failed</h3>
            <p className="text-gray-700 mb-4 text-sm sm:text-base">{errorMessage}</p>
            
            {!maxAttemptsReached && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-blue-700 text-sm">
                  Attempt {attemptCount} of {maxAttempts}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {!maxAttemptsReached && (
              <button
                onClick={onTryAgain}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base"
              >
                Try Again
              </button>
            )}
            <button
              onClick={onStartOver}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base"
            >
              Start Over
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Max attempts reached
  if (currentPhase === 'max-attempts-reached') {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
        <div className="text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl sm:text-3xl">🚫</span>
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-red-600 mb-2">Maximum Attempts Reached</h3>
          <p className="text-gray-700 mb-4 text-sm sm:text-base">
            You have reached the maximum number of attempts ({maxAttempts}). 
            Please contact support for assistance.
          </p>
          <button
            onClick={onReset}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base"
          >
            Start New Session
          </button>
        </div>
      </div>
    );
  }

  // Main control panel
  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
      <div className="text-center space-y-4">
        
        {/* Phase: idle - Start Validation */}
        {currentPhase === 'idle' && (
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">
              Card Security Detection
            </h3>
            <p className="text-gray-600 mb-6 text-sm sm:text-base">
              Position your card in the camera view and start the validation process
            </p>
            <button
              onClick={onStartValidation}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-medium text-base sm:text-lg transition-colors"
            >
              {isProcessing ? 'Processing...' : 'Start Validation'}
            </button>
          </div>
        )}

        {/* Phase: validation */}
        {currentPhase === 'validation' && (
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-blue-600 mb-4">
              Physical Card Validation
            </h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-blue-800 text-sm sm:text-base mb-2">
                {validationState.movementMessage || 'Validating physical card...'}
              </p>
              {isProcessing && (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 bg-blue-600 rounded-full animate-pulse"></div>
                  <span className="text-blue-600 text-sm">Processing...</span>
                </div>
              )}
            </div>
            <button
              onClick={onStop}
              className="bg-red-600 hover:bg-red-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base"
            >
              Stop Validation
            </button>
          </div>
        )}

        {/* Phase: ready-for-front */}
        {currentPhase === 'ready-for-front' && (
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-green-600 mb-4">
              ✅ Validation Complete
            </h3>
            <p className="text-gray-600 mb-6 text-sm sm:text-base">
              Position the FRONT side of your card (with chip visible) and click to scan
            </p>
            <button
              onClick={onStartFrontScan}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-medium text-base sm:text-lg transition-colors"
            >
              Scan Front Side
            </button>
          </div>
        )}

        {/* Phase: front-countdown or front */}
        {(currentPhase === 'front-countdown' || currentPhase === 'front') && (
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-blue-600 mb-4">
              Scanning Front Side
            </h3>
            {currentPhase === 'front-countdown' && countdown > 0 && (
              <p className="text-gray-600 mb-4 text-sm sm:text-base">
                Scanning starts in {countdown} seconds...
              </p>
            )}
            {currentPhase === 'front' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center justify-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${frontScanState.chipDetected ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span>Chip</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${frontScanState.bankLogoDetected ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span>Bank Logo</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${frontScanState.framesBuffered >= 6 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span>Frames ({frontScanState.framesBuffered}/6)</span>
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={onStop}
              className="bg-red-600 hover:bg-red-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base"
            >
              Stop Scanning
            </button>
          </div>
        )}

        {/* Phase: ready-for-back */}
        {currentPhase === 'ready-for-back' && (
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-green-600 mb-4">
              ✅ Front Side Complete
            </h3>
            <p className="text-gray-600 mb-6 text-sm sm:text-base">
              Now flip to the BACK side of your card and click to scan
            </p>
            <button
              onClick={onStartBackScan}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-medium text-base sm:text-lg transition-colors"
            >
              Scan Back Side
            </button>
          </div>
        )}

        {/* Phase: back-countdown or back */}
        {(currentPhase === 'back-countdown' || currentPhase === 'back') && (
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-blue-600 mb-4">
              Scanning Back Side
            </h3>
            {currentPhase === 'back-countdown' && countdown > 0 && (
              <p className="text-gray-600 mb-4 text-sm sm:text-base">
                Scanning starts in {countdown} seconds...
              </p>
            )}
            {currentPhase === 'back' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-blue-800 text-sm sm:text-base">
                  Keep the back side of your card in view while processing...
                </p>
              </div>
            )}
            <button
              onClick={onStop}
              className="bg-red-600 hover:bg-red-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base"
            >
              Stop Scanning
            </button>
          </div>
        )}

        {/* Active detection indicator */}
        {(detectionActive || isProcessing) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 bg-yellow-500 rounded-full animate-pulse"></div>
              <span className="text-yellow-700 text-sm font-medium">
                {isProcessing ? 'Processing Frame...' : 'Detection Active'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlPanel;