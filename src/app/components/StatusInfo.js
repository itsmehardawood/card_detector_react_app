import React from 'react';

const StatusInformation = ({ 
  currentPhase, 
  sessionId, 
  validationState, 
  frontScanState, 
  detectionActive 
}) => {
  return (
    <div className="mt-4 sm:mt-6 bg-white rounded-lg shadow-lg p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm text-gray-600 gap-2 sm:gap-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
          <span className="font-medium">Phase: {currentPhase.replace('-', ' ').toUpperCase()}</span>
          {sessionId && (
            <span className="font-medium">Session: {sessionId.slice(-8)}</span>
          )}
          {currentPhase === 'validation' && (
            <span className="font-medium">
              Validation: {validationState.physicalCard ? 'Complete' : 'In Progress'}
            </span>
          )}
          {currentPhase === 'ready-for-front' && (
            <span className="font-medium">Ready for Front Scan</span>
          )}
          {currentPhase === 'front' && (
            <span className="font-medium">
              Front: {frontScanState.canProceedToBack ? 'Complete' : 'In Progress'}
            </span>
          )}
          {currentPhase === 'ready-for-back' && (
            <span className="font-medium">Ready for Back Scan</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${detectionActive || currentPhase === 'validation' ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
          <span className="font-medium">
            {detectionActive || currentPhase === 'validation' ? 'Processing...' : 'Ready'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default StatusInformation;