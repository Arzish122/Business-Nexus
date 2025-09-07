import React, { useState } from 'react';
import { User, Lock, Bell, Globe, Palette, CreditCard } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../config/api';

export const SettingsPage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [isToggling2FA, setIsToggling2FA] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  
  if (!user) return null;

  const handle2FAToggle = async () => {
    setIsToggling2FA(true);
    try {
      const token = localStorage.getItem('business_nexus_token');
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch(`${API_URL}/auth/2fa/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          enable: !user.twoFactorEnabled,
          otpCode: otpCode || undefined
        })
      });

      const data = await response.json();

      if (data.success) {
        if (!user.twoFactorEnabled && !otpCode) {
          // First step: OTP sent
          setShowOtpInput(true);
          toast.success(data.message);
        } else {
          // 2FA toggled successfully
          updateUser({ ...user, twoFactorEnabled: !user.twoFactorEnabled });
          setShowOtpInput(false);
          setOtpCode('');
          toast.success(data.message);
        }
      } else {
        toast.error(data.message || 'Failed to toggle 2FA');
      }
    } catch (error) {
      console.error('2FA toggle error:', error);
      toast.error('Failed to toggle 2FA. Please try again.');
    } finally {
      setIsToggling2FA(false);
    }
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account preferences and settings</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings navigation */}
        <Card className="lg:col-span-1">
          <CardBody className="p-2">
            <nav className="space-y-1">
              <button className="flex items-center w-full px-3 py-2 text-sm font-medium text-primary-700 bg-primary-50 rounded-md">
                <User size={18} className="mr-3" />
                Profile
              </button>
              
              <button className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md">
                <Lock size={18} className="mr-3" />
                Security
              </button>
              
              <button className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md">
                <Bell size={18} className="mr-3" />
                Notifications
              </button>
              
              <button className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md">
                <Globe size={18} className="mr-3" />
                Language
              </button>
              
              <button className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md">
                <Palette size={18} className="mr-3" />
                Appearance
              </button>
              
              <button className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md">
                <CreditCard size={18} className="mr-3" />
                Billing
              </button>
            </nav>
          </CardBody>
        </Card>
        
        {/* Main settings content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Profile Settings</h2>
            </CardHeader>
            <CardBody className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar
                  src={user.avatarUrl || ''}
                  alt={user.name}
                  size="xl"
                />
                
                <div>
                  <Button variant="outline" size="sm">
                    Change Photo
                  </Button>
                  <p className="mt-2 text-sm text-gray-500">
                    JPG, GIF or PNG. Max size of 800K
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Full Name"
                  defaultValue={user.name}
                />
                
                <Input
                  label="Email"
                  type="email"
                  defaultValue={user.email}
                />
                
                <Input
                  label="Role"
                  value={user.role}
                  disabled
                />
                
                <Input
                  label="Location"
                  defaultValue="San Francisco, CA"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bio
                </label>
                <textarea
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  rows={4}
                  defaultValue={user.bio}
                ></textarea>
              </div>
              
              <div className="flex justify-end gap-3">
                <Button variant="outline">Cancel</Button>
                <Button>Save Changes</Button>
              </div>
            </CardBody>
          </Card>
          
          {/* Security Settings */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Security Settings</h2>
            </CardHeader>
            <CardBody className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-4">Two-Factor Authentication</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">
                        Add an extra layer of security to your account
                      </p>
                      <Badge 
                        variant={user.twoFactorEnabled ? "success" : "error"} 
                        className="mt-1"
                      >
                        {user.twoFactorEnabled ? "Enabled" : "Not Enabled"}
                      </Badge>
                    </div>
                    <Button 
                      variant={user.twoFactorEnabled ? "primary" : "outline"}
                      onClick={handle2FAToggle}
                      isLoading={isToggling2FA}
                      disabled={isToggling2FA}
                    >
                      {user.twoFactorEnabled ? "Disable" : "Enable"}
                    </Button>
                  </div>
                  
                  {showOtpInput && (
                    <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                      <p className="text-sm text-blue-800 mb-3">
                        We've sent a verification code to your email. Please enter it below to enable 2FA.
                      </p>
                      <div className="flex gap-3">
                        <Input
                          label="Verification Code"
                          type="text"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          placeholder="Enter 6-digit code"
                          maxLength={6}
                        />
                        <div className="flex items-end">
                          <Button 
                            onClick={handle2FAToggle}
                            isLoading={isToggling2FA}
                            disabled={!otpCode || otpCode.length !== 6}
                          >
                            Verify
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Change Password</h3>
                <div className="space-y-4">
                  <Input
                    label="Current Password"
                    type="password"
                  />
                  
                  <Input
                    label="New Password"
                    type="password"
                  />
                  
                  <Input
                    label="Confirm New Password"
                    type="password"
                  />
                  
                  <div className="flex justify-end">
                    <Button>Update Password</Button>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};
