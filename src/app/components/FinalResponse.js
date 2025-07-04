import React, { useState } from 'react';

const FinalResponse = ({ finalResponse, onReset }) => {
  const [showEncryptedData, setShowEncryptedData] = useState(false);

  if (!finalResponse || !finalResponse.encrypted_card_data) {
    return null;
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'partial_success':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'failed':
        return 'bg-red-100 border-red-300 text-red-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return '';
      case 'partial_success':
        return '';
      case 'failed':
        return '';
      default:
        return '';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy to clipboard');
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6 text-gray-800">
        Card Processing Complete
      </h2>

      {/* Status Summary */}
      <div className={`rounded-lg border-2 p-4 mb-6 ${getStatusColor(finalResponse.status)}`}>
        <div className="flex items-center justify-center">
          <div className="flex items-center justify-center space-x-3">
            
              <h3 className="text-lg   font-semibold capitalize">
                {finalResponse.status.replace('_', ' ')}
              </h3>
              {/* <p className="text-sm opacity-75">
                Processing completed with {finalResponse.status === 'success' ? 'excellent' : 
                                        finalResponse.status === 'partial_success' ? 'acceptable' : 'insufficient'} results
              </p> */}
            
          </div>
       
        </div>
      </div>

      {/* Merchant Information */}
      {/* <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-3">Session Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex justify-between">
            <span className="font-medium text-blue-700">Merchant ID:</span>
            <span className="text-blue-900 font-mono">{finalResponse.merchant_id}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-blue-700">Processing Status:</span>
            <span className="text-blue-900 capitalize">{finalResponse.status.replace('_', ' ')}</span>
          </div>
        </div>
      </div> */}

      {/* Encrypted Data Section */}
      {/* <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-800">🔒 Encrypted Card Data</h3>
          <button
            onClick={() => setShowEncryptedData(!showEncryptedData)}
            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm transition-colors"
          >
            {showEncryptedData ? 'Hide' : 'Show'} Data
          </button>
        </div>
        
        <div className="bg-gray-100 rounded p-3 mb-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="font-medium text-gray-600">Algorithm:</span>
              <span className="text-gray-800 ml-1">AES-256-Fernet</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Format:</span>
              <span className="text-gray-800 ml-1">Base64 URL-Safe</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Size:</span>
              <span className="text-gray-800 ml-1">{finalResponse.encrypted_card_data.length} bytes</span>
            </div>
          </div>
        </div>

        {showEncryptedData && (
          <div className="bg-black rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-400 text-xs font-mono">Encrypted Payload:</span>
              <button
                onClick={() => copyToClipboard(finalResponse.encrypted_card_data)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
              >
                Copy
              </button>
            </div>
            <pre className="text-green-400 text-xs font-mono break-all whitespace-pre-wrap max-h-40 overflow-y-auto">
              {finalResponse.encrypted_card_data}
            </pre>
          </div>
        )}
      </div> */}

      {/* Security Notice */}
      {/* <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-2">
          <span className="text-yellow-600 text-lg">🔐</span>
          <div className="text-sm text-yellow-800">
            <p className="font-medium mb-1">Security Notice</p>
            <p>
              Card data has been securely encrypted using AES-256-Fernet encryption with your merchant-specific key. 
              This encrypted data can only be decrypted using your private encryption key.
            </p>
          </div>
        </div>
      </div> */}

      {/* Actions */}
      <div className="text-center space-y-3">
        {/* <button
          onClick={onReset}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Process Another Card
        </button> */}
        
        <div className="text-xs text-gray-500">
          Session completed with end-to-end encryption
        </div>
      </div>
    </div>
  );
};

export default FinalResponse;