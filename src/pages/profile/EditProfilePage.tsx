import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import { User, UserRole } from '../../types';
import { ArrowLeft, Save, Trash } from 'lucide-react';
import toast from 'react-hot-toast';

export const EditProfilePage: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [twitter, setTwitter] = useState('');
  const [instagram, setInstagram] = useState('');
  
  // Entrepreneur specific fields
  const [startupName, setStartupName] = useState('');
  const [foundedYear, setFoundedYear] = useState('');
  const [pitchSummary, setPitchSummary] = useState('');
  const [fundingNeeded, setFundingNeeded] = useState('');
  const [industry, setIndustry] = useState('');
  const [teamSize, setTeamSize] = useState('');
  
  // Investor specific fields
  const [investmentInterests, setInvestmentInterests] = useState('');
  const [investmentStage, setInvestmentStage] = useState('');
  const [portfolioCompanies, setPortfolioCompanies] = useState('');
  const [minimumInvestment, setMinimumInvestment] = useState('');
  const [maximumInvestment, setMaximumInvestment] = useState('');
  
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    // Set basic user info
    setName(user.name || '');
    setEmail(user.email || '');
    setBio(user.bio || '');
    setLocation(user.location || '');
    setWebsite(user.website || '');
    
    // Set social media links
    if (user.social) {
      setLinkedin(user.social.linkedin || '');
      setTwitter(user.social.twitter || '');
      setInstagram(user.social.instagram || '');
    }
    
    // Set role-specific fields
    if (user.role === 'entrepreneur') {
      const entrepreneurUser = user as any;
      setStartupName(entrepreneurUser.startupName || '');
      setFoundedYear(entrepreneurUser.foundedYear?.toString() || '');
      setPitchSummary(entrepreneurUser.pitchSummary || '');
      setFundingNeeded(entrepreneurUser.fundingNeeded || '');
      setIndustry(entrepreneurUser.industry || '');
      setTeamSize(entrepreneurUser.teamSize?.toString() || '');
    } else if (user.role === 'investor') {
      const investorUser = user as any;
      setInvestmentInterests(Array.isArray(investorUser.investmentInterests) ? investorUser.investmentInterests.join(', ') : '');
      setInvestmentStage(Array.isArray(investorUser.investmentStage) ? investorUser.investmentStage.join(', ') : '');
      setPortfolioCompanies(Array.isArray(investorUser.portfolioCompanies) ? investorUser.portfolioCompanies.join(', ') : '');
      setMinimumInvestment(investorUser.minimumInvestment || '');
      setMaximumInvestment(investorUser.maximumInvestment || '');
    }
  }, [user, navigate]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Prepare profile updates
      const profileUpdates: Partial<User> = {
        name,
        email,
        bio,
        ...(location ? { location } : {}),
        website,
        social: {
          linkedin,
          twitter,
          instagram
        }
      };
      
      // Add role-specific data
      if (user.role === 'entrepreneur') {
        Object.assign(profileUpdates, {
          startupName,
          foundedYear: foundedYear ? parseInt(foundedYear) : undefined,
          pitchSummary,
          fundingNeeded,
          industry,
          teamSize: teamSize ? parseInt(teamSize) : undefined
        });
      } else if (user.role === 'investor') {
        Object.assign(profileUpdates, {
          investmentInterests: investmentInterests.split(',').map(item => item.trim()).filter(Boolean),
          investmentStage: investmentStage.split(',').map(item => item.trim()).filter(Boolean),
          portfolioCompanies: portfolioCompanies.split(',').map(item => item.trim()).filter(Boolean),
          minimumInvestment,
          maximumInvestment
        });
      }
      
      // Prepare basic user updates with all necessary fields
      const userUpdates = {
        name,
        email,
        bio,
        role: user.role
      };
      
      // Update profile with all the data
      await updateProfile(user.id, userUpdates, profileUpdates);
      toast.success('Profile updated successfully');
      
      // Navigate back to profile page
      if (user.role === 'entrepreneur') {
        navigate(`/profile/entrepreneur/${user.id}`);
      } else if (user.role === 'investor') {
        navigate(`/profile/investor/${user.id}`);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!user) return null;
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="p-2"
        >
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Profile</h1>
          <p className="text-gray-600">Update your personal information</p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium text-gray-900">Basic Information</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="flex items-center gap-6">
              <Avatar
                src={user.avatarUrl}
                alt={user.name}
                size="xl"
              />
              
              <div>
                <Button variant="outline" size="sm" type="button">
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
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              
              <Input
                label="Role"
                value={user.role}
                disabled
              />
              
              <Input
                label="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
              
              <Input
                label="Website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bio
              </label>
              <textarea
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              ></textarea>
            </div>
          </CardBody>
        </Card>
        
        {/* Social Media */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium text-gray-900">Social Media</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="LinkedIn"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="https://linkedin.com/in/username"
              />
              
              <Input
                label="Twitter"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                placeholder="https://twitter.com/username"
              />
              
              <Input
                label="Instagram"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="https://instagram.com/username"
              />
            </div>
          </CardBody>
        </Card>
        
        {/* Entrepreneur-specific fields */}
        {user.role === 'entrepreneur' && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Startup Information</h2>
            </CardHeader>
            <CardBody className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Startup Name"
                  value={startupName}
                  onChange={(e) => setStartupName(e.target.value)}
                />
                
                <Input
                  label="Founded Year"
                  type="number"
                  value={foundedYear}
                  onChange={(e) => setFoundedYear(e.target.value)}
                  placeholder="e.g. 2020"
                />
                
                <Input
                  label="Industry"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. Fintech, Healthcare, etc."
                />
                
                <Input
                  label="Team Size"
                  type="number"
                  value={teamSize}
                  onChange={(e) => setTeamSize(e.target.value)}
                />
                
                <Input
                  label="Funding Needed"
                  value={fundingNeeded}
                  onChange={(e) => setFundingNeeded(e.target.value)}
                  placeholder="e.g. $500K - $1M"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pitch Summary
                </label>
                <textarea
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  rows={4}
                  value={pitchSummary}
                  onChange={(e) => setPitchSummary(e.target.value)}
                  placeholder="Brief description of your startup's value proposition"
                ></textarea>
              </div>
            </CardBody>
          </Card>
        )}
        
        {/* Investor-specific fields */}
        {user.role === 'investor' && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Investment Information</h2>
            </CardHeader>
            <CardBody className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Investment Interests
                  </label>
                  <textarea
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    rows={2}
                    value={investmentInterests}
                    onChange={(e) => setInvestmentInterests(e.target.value)}
                    placeholder="e.g. Fintech, Healthcare, AI (comma separated)"
                  ></textarea>
                  <p className="mt-1 text-xs text-gray-500">Separate interests with commas</p>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Investment Stages
                  </label>
                  <textarea
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    rows={2}
                    value={investmentStage}
                    onChange={(e) => setInvestmentStage(e.target.value)}
                    placeholder="e.g. Seed, Series A, Growth (comma separated)"
                  ></textarea>
                  <p className="mt-1 text-xs text-gray-500">Separate stages with commas</p>
                </div>
                
                <Input
                  label="Minimum Investment"
                  value={minimumInvestment}
                  onChange={(e) => setMinimumInvestment(e.target.value)}
                  placeholder="e.g. $50K"
                />
                
                <Input
                  label="Maximum Investment"
                  value={maximumInvestment}
                  onChange={(e) => setMaximumInvestment(e.target.value)}
                  placeholder="e.g. $500K"
                />
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Portfolio Companies
                  </label>
                  <textarea
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    rows={3}
                    value={portfolioCompanies}
                    onChange={(e) => setPortfolioCompanies(e.target.value)}
                    placeholder="e.g. Company A, Company B, Company C (comma separated)"
                  ></textarea>
                  <p className="mt-1 text-xs text-gray-500">Separate company names with commas</p>
                </div>
              </div>
            </CardBody>
          </Card>
        )}
        
        <div className="flex justify-end gap-3">
          <Button 
            variant="outline" 
            type="button"
            onClick={() => navigate(-1)}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            isLoading={isLoading}
            leftIcon={<Save size={18} />}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
};