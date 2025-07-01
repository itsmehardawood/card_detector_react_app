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
  const isActive = detectionActive || isProcessing || countdown > 0;

  // Show final encrypted response (from file 1)
  if (currentPhase === 'final_response' && finalOcrResults?.encrypted_card_data) {
    return <FinalResponse finalResponse={finalOcrResults} onReset={onReset} />;
  }

  // Show regular results
  if (currentPhase === 'results' && finalOcrResults?.final_ocr) {
    return <DetectionResults finalOcrResults={finalOcrResults} onReset={onReset} />;
  }

  // Show results if detection is complete (fallback from file 2)
  if (currentPhase === 'results') {
    return (
      <DetectionResults 
        finalOcrResults={finalOcrResults} 
        onReset={onReset} 
      />
    );
  }

  // Error state with attempt tracking (enhanced from both files)
  if (currentPhase === 'error') {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
        <div className="text-center">
          <div className="mb-4">
           
            <h3 className="text-lg sm:text-xl font-semibold text-red-600 mb-2">Security Scan Detection Failed</h3>
            {/* <p className="text-gray-700 mb-4 text-sm sm:text-base">{errorMessage}</p> */}
            <p className="text-red-700 mb-3">Please ensure the card is in a clear view.</p>
            
            {!maxAttemptsReached && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-blue-700 text-sm">
                  Attempt {attemptCount} of {maxAttempts}
                </p>
                <div className="text-sm text-red-600 mt-1">
                  You have {maxAttempts - attemptCount} attempt{maxAttempts - attemptCount !== 1 ? 's' : ''} remaining.
                </div>
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

  // Max attempts reached (enhanced from both files)
  if (currentPhase === 'max-attempts-reached') {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
        <div className="text-center">
       
          <h3 className="text-lg sm:text-xl font-semibold text-red-600 mb-3">Oops! Currently, you have reached the maximum number of times you can scan.</h3>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <p className="text-red-700 font-bold">Contact customer support for assistance or Retry the scanning process</p>
          </div>
       
        </div>
      </div>
    );
  }

  // Main control panel with enhanced phase handling
  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
      <div className="text-center space-y-4">
        
        {/* Phase: idle - Start Validation */}
        {currentPhase === 'idle' && (
          <div>
       
         
            <button
              onClick={onStartValidation}
              disabled={isActive || maxAttemptsReached}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-medium text-base sm:text-lg transition-colors"
            >
              {isActive ? 'Processing...' : 'Start Card Scan'}
            </button>
          </div>
        )}

        {/* Phase: validation */}
        {currentPhase === 'validation' && (
          <div>
        
           <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 min-h-[40px]">
  {isProcessing ? (
    <div className="flex items-center justify-center space-x-2">
      <div className="w-4 h-4 bg-blue-600 rounded-full animate-pulse"></div>
      <span className="text-blue-600 text-sm">Processing...</span>
    </div>
  ) : (
    // This empty span ensures space remains but no content shows
    <span className="invisible">Processing...</span>
  )}
</div>

            <button
              onClick={onStop}
              className="bg-red-600 hover:bg-red-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base"
            >
              Stop Card Scan
            </button>
          </div>
        )}

        {/* Phase: ready-for-front */}
        {currentPhase === 'ready-for-front' && (
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-green-600 mb-4">
              Validation Complete
            </h3>
            <button
              onClick={onStartFrontScan}
              disabled={isActive || maxAttemptsReached}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-medium text-base sm:text-lg transition-colors"
            >
              {isActive ? 'Scanning Front...' : 'Scan Front Side'}
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
            {/* {currentPhase === 'front' && (
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
            )} */}
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
              Front Side Complete
            </h3>
       
            
            {/* Debug info - remove this after testing
            <div className="bg-gray-100 border rounded p-2 mb-4 text-xs">
              <p>Debug: canProceedToBack = {String(frontScanState?.canProceedToBack)}</p>
              <p>Debug: chipDetected = {String(frontScanState?.chipDetected)}</p>
              <p>Debug: bankLogoDetected = {String(frontScanState?.bankLogoDetected)}</p>
              <p>Debug: framesBuffered = {frontScanState?.framesBuffered || 0}</p>
            </div> */}
            
            <button
              onClick={onStartBackScan}
              disabled={isActive || maxAttemptsReached}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-medium text-base sm:text-lg transition-colors"
            >
              {isActive ? 'Scanning Back...' : 'Scan Back Side'}
            </button>
            
            {/* Show warning only if we have explicit false or missing requirements */}
            {frontScanState && (
              (!frontScanState.chipDetected || !frontScanState.bankLogoDetected || (frontScanState.framesBuffered < 6)) && (
                <div className="mt-4">
                  <p className="text-sm text-orange-600">
                    Requirements: Chip ✓{frontScanState.chipDetected ? ' Complete' : ' Missing'}, 
                    Logo ✓{frontScanState.bankLogoDetected ? ' Complete' : ' Missing'}, 
                    Frames ✓{frontScanState.framesBuffered >= 6 ? ' Complete' : ` ${frontScanState.framesBuffered || 0}/6`}
                  </p>
                </div>
              )
            )}
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
     
            <button
              onClick={onStop}
              className="bg-red-600 hover:bg-red-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base"
            >
              Stop Scanning
            </button>
          </div>
        )}

   
        {/* Attempt Counter */}
        {attemptCount > 0 && !maxAttemptsReached && (
          <div className="mt-4">
            <p className="text-sm text-orange-600">
              Attempts: {attemptCount}/{maxAttempts}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlPanel;