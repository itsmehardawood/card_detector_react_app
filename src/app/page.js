// app/page.js (Replace existing page.js)
'use client'
import React, { useState, useEffect } from 'react';
import { Smartphone, Monitor, Scan, Shield, CreditCard } from 'lucide-react';
import QRCode from 'react-qr-code';

const StartPage = () => {
  const [merchantId, setMerchantId] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [deviceType, setDeviceType] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [scanUrl, setScanUrl] = useState('');

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