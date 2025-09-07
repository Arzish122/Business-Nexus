import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Building2, MapPin, UserCircle, BarChart3, Briefcase, Edit3, Save, X } from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { Entrepreneur, Investor } from '../../types';
import toast from 'react-hot-toast';
import axios from 'axios';
import { API_URL } from '../../config/api';

export const MyPortfolio: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editData, setEditData] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    location: user?.location || '',
    website: user?.website || '',
    // Entrepreneur specific fields
    startupName: (user as Entrepreneur)?.startupName || '',
    pitchSummary: (user as Entrepreneur)?.pitchSummary || '',
    fundingNeeded: (user as Entrepreneur)?.fundingNeeded || '',
    industry: (user as Entrepreneur)?.industry || '',
    teamSize: (user as Entrepreneur)?.teamSize || 0,
    // Investor specific fields
    minimumInvestment: (user as Investor)?.minimumInvestment || '',
    maximumInvestment: (user as Investor)?.maximumInvestment || '',
    investmentInterests: (user as Investor)?.investmentInterests?.join(', ') || '',
    investmentStage: (user as Investor)?.investmentStage?.join(', ') || ''
  });

  if (!user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Please log in</h2>
        <p className="text-gray-600 mt-2">You need to be logged in to view your portfolio.</p>
        <Link to="/login">
          <Button variant="outline" className="mt-4">Go to Login</Button>
        </Link>
      </div>
    );
  }

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset edit data to original values
    setEditData({
      name: user?.name || '',
      bio: user?.bio || '',
      location: user?.location || '',
      website: user?.website || '',
      startupName: (user as Entrepreneur)?.startupName || '',
      pitchSummary: (user as Entrepreneur)?.pitchSummary || '',
      fundingNeeded: (user as Entrepreneur)?.fundingNeeded || '',
      industry: (user as Entrepreneur)?.industry || '',
      teamSize: (user as Entrepreneur)?.teamSize || 0,
      minimumInvestment: (user as Investor)?.minimumInvestment || '',
      maximumInvestment: (user as Investor)?.maximumInvestment || '',
      investmentInterests: (user as Investor)?.investmentInterests?.join(', ') || '',
      investmentStage: (user as Investor)?.investmentStage?.join(', ') || ''
    });
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const updatePayload: any = {
        name: editData.name,
        bio: editData.bio,
        location: editData.location,
        website: editData.website,
        role: user.role // Add role field for backend processing
      };

      // Add role-specific fields
      if (user.role === 'entrepreneur') {
        updatePayload.startupName = editData.startupName;
        updatePayload.pitchSummary = editData.pitchSummary;
        updatePayload.fundingNeeded = editData.fundingNeeded;
        updatePayload.industry = editData.industry;
        updatePayload.teamSize = parseInt(editData.teamSize.toString()) || 0;
      } else if (user.role === 'investor') {
        updatePayload.minimumInvestment = editData.minimumInvestment;
        updatePayload.maximumInvestment = editData.maximumInvestment;
        updatePayload.investmentInterests = editData.investmentInterests.split(',').map(s => s.trim()).filter(s => s);
        updatePayload.investmentStage = editData.investmentStage.split(',').map(s => s.trim()).filter(s => s);
      }

      const response = await axios.put(`${API_URL}/profile`, updatePayload);
      
      // Backend returns user object directly, not wrapped in success object
      if (response.data && response.data._id) {
        // Update user in context with the returned user data
        const updatedUser = { 
          ...user, 
          ...response.data,
          id: response.data._id // Ensure id field is set correctly
        };
        updateUser(updatedUser);
        
        setIsEditing(false);
        toast.success('Profile updated successfully!');
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Profile header */}
      <Card>
        <CardBody className="sm:flex sm:items-start sm:justify-between p-6">
          <div className="sm:flex sm:space-x-6">
            <Avatar
              src={user.avatarUrl || ''}
              alt={user.name}
              size="xl"
              status={user.isOnline ? 'online' : 'offline'}
              className="mx-auto sm:mx-0"
            />
            
            <div className="mt-4 sm:mt-0 text-center sm:text-left flex-1">
              {isEditing ? (
                <div className="space-y-3">
                  <Input
                    label="Name"
                    value={editData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    fullWidth
                  />
                  <Input
                    label="Location"
                    value={editData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    fullWidth
                  />
                  <Input
                    label="Website"
                    value={editData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    fullWidth
                  />
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
                  <p className="text-gray-600 flex items-center justify-center sm:justify-start mt-1">
                    <Building2 size={16} className="mr-1" />
                    {user.role === 'entrepreneur' ? 'Entrepreneur' : 'Investor'}
                    {user.role === 'investor' && (user as Investor).totalInvestments && 
                      ` • ${(user as Investor).totalInvestments} investments`
                    }
                  </p>
                  
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-3">
                    {user.location && (
                      <Badge variant="primary">
                        <MapPin size={14} className="mr-1" />
                        {user.location}
                      </Badge>
                    )}
                    {user.role === 'entrepreneur' && (user as Entrepreneur).industry && (
                      <Badge variant="secondary" size="sm">{(user as Entrepreneur).industry}</Badge>
                    )}
                    {user.role === 'investor' && (user as Investor).investmentStage?.map((stage, index) => (
                      <Badge key={index} variant="secondary" size="sm">{stage}</Badge>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className="mt-6 sm:mt-0 flex flex-col sm:flex-row gap-2 justify-center sm:justify-end">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  leftIcon={<X size={18} />}
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  leftIcon={<Save size={18} />}
                  onClick={handleSave}
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                leftIcon={<Edit3 size={18} />}
                onClick={handleEdit}
              >
                Edit Profile
              </Button>
            )}
          </div>
        </CardBody>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - left side */}
        <div className="lg:col-span-2 space-y-6">
          {/* About */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">About</h2>
            </CardHeader>
            <CardBody>
              {isEditing ? (
                <textarea
                  className="w-full p-3 border border-gray-300 rounded-md resize-none"
                  rows={4}
                  value={editData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder="Tell us about yourself..."
                />
              ) : (
                <p className="text-gray-700">{user.bio || 'No bio available.'}</p>
              )}
            </CardBody>
          </Card>
          
          {/* Role-specific content */}
          {user.role === 'entrepreneur' && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-medium text-gray-900">Startup Information</h2>
              </CardHeader>
              <CardBody>
                {isEditing ? (
                  <div className="space-y-4">
                    <Input
                      label="Startup Name"
                      value={editData.startupName}
                      onChange={(e) => handleInputChange('startupName', e.target.value)}
                      fullWidth
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pitch Summary</label>
                      <textarea
                        className="w-full p-3 border border-gray-300 rounded-md resize-none"
                        rows={3}
                        value={editData.pitchSummary}
                        onChange={(e) => handleInputChange('pitchSummary', e.target.value)}
                        placeholder="Describe your startup..."
                      />
                    </div>
                    <Input
                      label="Funding Needed"
                      value={editData.fundingNeeded}
                      onChange={(e) => handleInputChange('fundingNeeded', e.target.value)}
                      fullWidth
                    />
                    <Input
                      label="Industry"
                      value={editData.industry}
                      onChange={(e) => handleInputChange('industry', e.target.value)}
                      fullWidth
                    />
                    <Input
                      label="Team Size"
                      type="number"
                      value={editData.teamSize}
                      onChange={(e) => handleInputChange('teamSize', parseInt(e.target.value) || 0)}
                      fullWidth
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(user as Entrepreneur).startupName && (
                      <div>
                        <span className="text-sm text-gray-500">Startup Name</span>
                        <p className="text-lg font-semibold text-gray-900">{(user as Entrepreneur).startupName}</p>
                      </div>
                    )}
                    {(user as Entrepreneur).pitchSummary && (
                      <div>
                        <span className="text-sm text-gray-500">Pitch Summary</span>
                        <p className="text-gray-700">{(user as Entrepreneur).pitchSummary}</p>
                      </div>
                    )}
                    {(user as Entrepreneur).fundingNeeded && (
                      <div>
                        <span className="text-sm text-gray-500">Funding Needed</span>
                        <p className="text-lg font-semibold text-gray-900">{(user as Entrepreneur).fundingNeeded}</p>
                      </div>
                    )}
                    {(user as Entrepreneur).teamSize && (
                      <div>
                        <span className="text-sm text-gray-500">Team Size</span>
                        <p className="text-md font-medium text-gray-900">{(user as Entrepreneur).teamSize} people</p>
                      </div>
                    )}
                  </div>
                )}
              </CardBody>
            </Card>
          )}
          
          {user.role === 'investor' && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-medium text-gray-900">Investment Information</h2>
              </CardHeader>
              <CardBody>
                {isEditing ? (
                  <div className="space-y-4">
                    <Input
                      label="Minimum Investment"
                      value={editData.minimumInvestment}
                      onChange={(e) => handleInputChange('minimumInvestment', e.target.value)}
                      fullWidth
                    />
                    <Input
                      label="Maximum Investment"
                      value={editData.maximumInvestment}
                      onChange={(e) => handleInputChange('maximumInvestment', e.target.value)}
                      fullWidth
                    />
                    <Input
                      label="Investment Interests (comma-separated)"
                      value={editData.investmentInterests}
                      onChange={(e) => handleInputChange('investmentInterests', e.target.value)}
                      fullWidth
                      placeholder="e.g. FinTech, SaaS, AI/ML"
                    />
                    <Input
                      label="Investment Stages (comma-separated)"
                      value={editData.investmentStage}
                      onChange={(e) => handleInputChange('investmentStage', e.target.value)}
                      fullWidth
                      placeholder="e.g. Seed, Series A, Series B"
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(user as Investor).minimumInvestment && (user as Investor).maximumInvestment && (
                      <div>
                        <span className="text-sm text-gray-500">Investment Range</span>
                        <p className="text-lg font-semibold text-gray-900">
                          {(user as Investor).minimumInvestment} - {(user as Investor).maximumInvestment}
                        </p>
                      </div>
                    )}
                    {(user as Investor).investmentInterests && (user as Investor).investmentInterests.length > 0 && (
                      <div>
                        <span className="text-sm text-gray-500">Investment Interests</span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {(user as Investor).investmentInterests.map((interest, index) => (
                            <Badge key={index} variant="primary" size="md">{interest}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {(user as Investor).investmentStage && (user as Investor).investmentStage.length > 0 && (
                      <div>
                        <span className="text-sm text-gray-500">Investment Stages</span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {(user as Investor).investmentStage.map((stage, index) => (
                            <Badge key={index} variant="secondary" size="md">{stage}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </div>
        
        {/* Sidebar - right side */}
        <div className="space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Contact Information</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-500">Email</span>
                  <p className="text-md font-medium text-gray-900">{user.email}</p>
                </div>
                {user.website && (
                  <div>
                    <span className="text-sm text-gray-500">Website</span>
                    <p className="text-md font-medium text-gray-900">
                      <a href={user.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-500">
                        {user.website}
                      </a>
                    </p>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
          
          {/* Account Information */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Account Information</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-500">Account Type</span>
                  <p className="text-md font-medium text-gray-900 capitalize">{user.role}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Member Since</span>
                  <p className="text-md font-medium text-gray-900">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Status</span>
                  <p className="text-md font-medium text-gray-900">
                    <Badge variant={user.isOnline ? 'success' : 'gray'} size="sm">
                      {user.isOnline ? 'Online' : 'Offline'}
                    </Badge>
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};