import React, { useState, useRef } from 'react';
import { Button } from '../ui/Button';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../config/api';
import axios from 'axios';

interface TwoFactorVerificationProps {
  email: string;
  password: string;
  userType: string;
  tempToken: string;
  onVerificationSuccess: (accessToken: string, user: any) => void;
  onCancel: () => void;
}

export const TwoFactorVerification: React.FC<TwoFactorVerificationProps> = ({
  email,
  password,
  userType,
  onVerificationSuccess,
  onCancel
}) => {
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const otpCode = otp.join('');

  const handleChange = (value: string, index: number) => {
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setIsVerifying(true);
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
        otpCode,
        userType
      });

      if (response.data.success) {
        const { accessToken, user } = response.data;
        onVerificationSuccess(accessToken, user);
        toast.success('Login successful!');
      } else {
        toast.error(response.data.message || 'Verification failed');
      }
    } catch (error: any) {
      console.error('2FA verification error:', error);
      const errorMessage = error.response?.data?.message || 'Verification failed. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOTP = async () => {
    setIsResending(true);
    try {
      await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
        userType
      });
      toast.success('New verification code sent to your email');
    } catch (error: any) {
      console.error('Resend OTP error:', error);
      toast.error('Failed to resend verification code');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">N</span>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Two-Factor Authentication
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          We've sent a verification code to {email}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium text-gray-900">Enter Verification Code</h3>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div className="flex justify-between gap-2">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(e.target.value, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    className="w-12 h-14 text-center text-2xl font-bold border rounded-md focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                ))}
              </div>
              <p className="mt-2 text-sm text-gray-500 text-center">
                Enter the 6-digit code sent to your email
              </p>

              <div className="flex flex-col space-y-3 mt-4">
                <Button
                  type="submit"
                  className="w-full"
                  isLoading={isVerifying}
                  disabled={otpCode.length !== 6 || isVerifying}
                >
                  {isVerifying ? 'Verifying...' : 'Verify & Login'}
                </Button>

                <div className="flex justify-between items-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResendOTP}
                    isLoading={isResending}
                    disabled={isResending}
                    className="text-sm"
                  >
                    {isResending ? 'Sending...' : 'Resend Code'}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onCancel}
                    className="text-sm"
                  >
                    Back to Login
                  </Button>
                </div>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
