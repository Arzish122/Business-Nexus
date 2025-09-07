import React, { createContext, useState, useContext, useEffect } from 'react';
import { User, UserRole, AuthContextType } from '../types';
import { users } from '../data/users'; // Keep for fallback
import toast from 'react-hot-toast';
import axios from 'axios';
import { API_URL } from '../config/api';

// Create Auth Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Local storage keys
const USER_STORAGE_KEY = 'business_nexus_user';
const RESET_TOKEN_KEY = 'business_nexus_reset_token';
const TOKEN_STORAGE_KEY = 'business_nexus_token';

// Auth Provider Component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Clear all authentication data
  const clearAuthData = (): void => {
    // Clear user state
    setUser(null);
    
    // Clear all possible auth-related items from localStorage
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(RESET_TOKEN_KEY);
    
    // Clear authorization header
    delete axios.defaults.headers.common['Authorization'];
  };

  // Check for stored user on initial load
  useEffect(() => {
    const fetchCurrentUser = async () => {
      // One-time cleanup: Clear any potentially corrupted auth data
      const authVersion = localStorage.getItem('auth_version');
      if (!authVersion || authVersion !== '1.0') {
        console.log('Clearing potentially corrupted authentication data...');
        clearAuthData();
        localStorage.setItem('auth_version', '1.0');
        setIsLoading(false);
        return;
      }
      
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (token) {
        try {
          // Validate token format before making request
          if (!token || token.split('.').length !== 3) {
            throw new Error('Invalid token format');
          }
          
          const response = await axios.get(`${API_URL}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          // Get user data from response
          const userData = response.data.user;
          
          // Verify user data exists
          if (!userData || (!userData.role && !userData.userType)) {
            throw new Error('Invalid user data received');
          }
          
          // Normalize user data - server returns userType but frontend expects role
          const normalizedUserData = {
            ...userData,
            role: userData.role || userData.userType
          };
          
          setUser(normalizedUserData as User);
          
          // Set axios default header for all future requests
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } catch (error: unknown) {
          console.error('Error fetching user:', error);
          // Clear auth data on error - this will force re-login
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          localStorage.removeItem(USER_STORAGE_KEY);
          // Clear axios default header
          delete axios.defaults.headers.common['Authorization'];
          // Show user-friendly message
          toast.error('Your session has expired. Please log in again.');
        }
      }
      setIsLoading(false);
    };

    fetchCurrentUser();
    
    // Set up interceptor to handle 401 responses (expired or invalid token)
    const interceptor = axios.interceptors.response.use(
      response => response,
      error => {
        if (error.response && error.response.status === 401) {
          // Auto logout on 401 Unauthorized using forceLogout
          clearAuthData();
          toast.error('Your session has expired. Please log in again.');
        }
        return Promise.reject(error);
      }
    );
    
    // Clean up interceptor on unmount
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  // Real login function that makes an API call
  const login = async (email: string, password: string, role: UserRole): Promise<void> => {
    setIsLoading(true);
    console.log('Attempting to login user:', { email });
    
    try {
      // Log the request being made
      console.log('Making login request to:', `${API_URL}/auth/login`);
      console.log('With data:', { email, password: '***', userType: role });
      
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
        userType: role
      });
      
      console.log('Login response received:', response.status);
      console.log('Login response data:', response.data);
      console.log('Checking requiresTwoFactor:', response.data.requiresTwoFactor);
      console.log('Response success:', response.data.success);
      
      // Check if 2FA is required
      if (response.data.requiresTwoFactor) {
        console.log('2FA required detected! OTP sent to email');
        console.log('TempToken received:', response.data.tempToken);
        const error = new Error('2FA verification required. Please check your email for the OTP code.') as any;
        error.tempToken = response.data.tempToken;
        console.log('Throwing 2FA error with tempToken:', error.tempToken);
        throw error;
      }
      
      const { accessToken: token, user: userData } = response.data;
      
      // Verify user data has required fields
      if (!userData || !userData.id) {
        throw new Error('Invalid user data received from server');
      }
      
      // Normalize user data - server returns userType but frontend expects role
      const normalizedUserData = {
        ...userData,
        role: userData.role || userData.userType || 'user'
      };
      
      // Store auth data with normalized user data first
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalizedUserData));
      
      // Set authorization header for future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Set user in state with normalized data
      setUser(normalizedUserData as User);
      
      toast.success('Successfully logged in!');
      
      console.log('User state set successfully:', normalizedUserData);
    } catch (error: unknown) {
      console.error('Login error:', error);
      
      // Check if this is our custom 2FA error
      if (error instanceof Error && error.message.includes('2FA verification required')) {
        console.log('Re-throwing 2FA error for LoginPage to handle');
        throw error; // Re-throw the 2FA error with tempToken intact
      }
      
      if (axios.isAxiosError(error)) {
        console.error('API Error Response:', error.response?.data);
        console.error('API Error Status:', error.response?.status);
        
        const errorMessage = error.response?.data?.message
          ? error.response.data.message
          : 'Login failed. Please check your credentials.';
        
        toast.error(errorMessage);
        throw new Error(errorMessage);
      } else {
        console.error('Non-Axios error:', error);
        toast.error('Login failed. Please check your credentials.');
        throw new Error('Login failed. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Real register function that makes an API call
  const register = async (name: string, email: string, password: string, role: UserRole): Promise<void> => {
    setIsLoading(true);
    console.log('Attempting to register user:', { name, email, role });
    
    try {
      // Split name into firstName and lastName for backend validation
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0] || '';
      let lastName = nameParts.slice(1).join(' ').trim();
      
      // Ensure both firstName and lastName meet validation requirements (min 2 chars)
      if (firstName.length < 2) {
        throw new Error('Name must be at least 2 characters long');
      }
      
      if (!lastName || lastName.length < 2) {
        lastName = 'User'; // Default fallback that meets validation
      }
      
      // Log the request being made
      console.log('Making signup request to:', `${API_URL}/auth/signup`);
      console.log('With data:', { firstName, lastName, email, password: '***', userType: role });
      
      const response = await axios.post(`${API_URL}/auth/signup`, {
        firstName,
        lastName,
        email,
        password,
        userType: role
      });
      
      console.log('Signup response received:', response.status);
      console.log('Signup response data:', response.data);
      
      const { accessToken: token, user: userData } = response.data;
      
      // Verify user data has required fields
      if (!userData || !userData.id) {
        throw new Error('Invalid user data received from server');
      }
      
      // Check if userType is present instead of role (server uses userType)
      if (!userData.userType && !userData.role) {
        throw new Error('User role information missing');
      }
      
      // Normalize user data - server returns userType but frontend expects role
      const normalizedUserData = {
        ...userData,
        role: userData.role || userData.userType
      };
      
      // Set user in state with normalized data
      setUser(normalizedUserData as User);
      
      // Store auth data with normalized user data
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalizedUserData));
      
      // Set authorization header for future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      toast.success('Account created successfully!');
    } catch (error: unknown) {
      console.error('Registration error:', error);
      
      if (axios.isAxiosError(error)) {
        console.error('API Error Response:', error.response?.data);
        console.error('API Error Status:', error.response?.status);
        
        const errorMessage = error.response?.data?.message
          ? error.response.data.message
          : 'Registration failed. Please try again.';
        
        toast.error(errorMessage);
        throw new Error(errorMessage);
      } else {
        console.error('Non-Axios error:', error);
        toast.error('Registration failed. Please try again.');
        throw new Error('Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Mock forgot password function
  const forgotPassword = async (email: string): Promise<void> => {
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if user exists
      const user = users.find(u => u.email === email);
      if (!user) {
        throw new Error('No account found with this email');
      }
      
      // Generate reset token (in a real app, this would be a secure token)
      const resetToken = Math.random().toString(36).substring(2, 15);
      localStorage.setItem(RESET_TOKEN_KEY, resetToken);
      
      // In a real app, this would send an email
      toast.success('Password reset instructions sent to your email');
    } catch (error: unknown) {
      toast.error((error as Error).message);
      throw error;
    }
  };

  // Mock reset password function
  const resetPassword = async (token: string, newPassword: string): Promise<void> => {
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify token
      const storedToken = localStorage.getItem(RESET_TOKEN_KEY);
      if (token !== storedToken) {
        throw new Error('Invalid or expired reset token');
      }
      
      // In a real app, this would update the user's password in the database
      localStorage.removeItem(RESET_TOKEN_KEY);
      toast.success('Password reset successfully');
    } catch (error: unknown) {
      toast.error((error as Error).message);
      throw error;
    }
  };

  // Logout function
  const logout = (): void => {
    clearAuthData();
    toast.success('Logged out successfully');
  };

  // Force logout and clear corrupted data
  const forceLogout = (): void => {
    clearAuthData();
    toast.error('Session expired. Please log in again.');
  };

  // Update user profile using the secure API endpoint
  const updateProfile = async (userId: string, updates: Partial<User>, extendedProfileData?: any): Promise<void> => {
    try {
      // Get token from storage
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Prepare data for API call
      const profileUpdateData = {
        ...updates,
        ...(extendedProfileData || {})
      };
      
      // Call the profile update API
      const response = await axios.put(
        `${API_URL}/profile`,
        profileUpdateData,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      // Get updated user data from response
      const updatedUser = response.data as User;
      
      // Update user in state
      setUser(updatedUser);
      
      // Update local storage
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
      
      toast.success('Profile updated successfully');
    } catch (error: unknown) {
      console.error('Profile update error:', error);
      
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.message
          ? error.response.data.message
          : 'Failed to update profile. Please try again.';
        
        toast.error(errorMessage);
        throw new Error(errorMessage);
      } else {
        toast.error('Failed to update profile. Please try again.');
        throw error;
      }
    }
  };

  // Get extended profile information
  const getExtendedProfile = async (): Promise<any> => {
    try {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!token || !user) {
        throw new Error('Not authenticated');
      }
      
      const response = await axios.get(`${API_URL}/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      return response.data.profile;
    } catch (error) {
      console.error('Error fetching extended profile:', error);
      throw error;
    }
  };
  
  // Update extended profile information
  const updateExtendedProfile = async (profileData: any): Promise<any> => {
    try {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!token || !user) {
        throw new Error('Not authenticated');
      }
      
      const response = await axios.put(`${API_URL}/profile`, profileData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      toast.success('Profile updated successfully');
      return response.data;
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
      throw error;
    }
  };

  // Update user state
  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
  };

  const value = {
    user,
    login,
    register,
    logout,
    forceLogout,
    forgotPassword,
    resetPassword,
    updateProfile,
    getExtendedProfile,
    updateExtendedProfile,
    updateUser,
    isAuthenticated: !!user,
    isLoading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook for using auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};