import React from 'react';
import { CheckCircle, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

const MovementIndicator = ({ movementState, movementMessage }) => {
  const getMovementIcon = () => {
    switch(movementState) {
      case 'MOVE_UP':
        return <ArrowUp className="w-8 h-8 sm:w-12 sm:h-12 text-blue-400 animate-bounce" />;
      case 'MOVE_DOWN':
        return <ArrowDown className="w-8 h-8 sm:w-12 sm:h-12 text-blue-400 animate-bounce" />;
      case 'MOVE_LEFT':
        return <ArrowLeft className="w-8 h-8 sm:w-12 sm:h-12 text-blue-400 animate-pulse" />;
      case 'MOVE_RIGHT':
        return <ArrowRight className="w-8 h-8 sm:w-12 sm:h-12 text-blue-400 animate-pulse" />;
      default:
        return <CheckCircle className="w-8 h-8 sm:w-12 sm:h-12 text-green-400" />;
    }
  };

  return (
    <div className="absolute inset-0 bg-opacity-60 flex flex-col items-center justify-center text-white">
      <div className="bg-opacity-75 rounded-lg p-4 sm:p-8 text-center mx-2 sm:mx-4">
        <div className="mb-4">
          {getMovementIcon()}
        </div>
        <p className="text-lg sm:text-xl font-medium mb-2">Card Validation</p>
        <p className="text-sm sm:text-base text-gray-300 mb-4">
          {movementMessage || 'Position your card correctly'}
        </p>
        <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    </div>
  );
};

export default MovementIndicator;