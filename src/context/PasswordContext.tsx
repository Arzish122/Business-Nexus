import React, { createContext, useContext } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';
import { API_URL } from '../config/api';

// Define the context type
interface PasswordContextType {
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

// Create the context
const PasswordContext = createContext<PasswordContextType | undefined>(undefined);

// Provider component
export const PasswordProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();

  // Change password function
  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    if (!isAuthenticated) {
      toast.error('You must be logged in to change your password');
      throw new Error('Authentication required');
    }

    try {
      // Get token from storage
      const token = localStorage.getItem('business_nexus_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      // Call the change password API
      await axios.put(
        `${API_URL}/profile/password`,
        { currentPassword, newPassword },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      toast.success('Password changed successfully');
    } catch (error: unknown) {
      console.error('Password change error:', error);

      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.message
          ? error.response.data.message
          : 'Failed to change password. Please try again.';

        toast.error(errorMessage);
        throw new Error(errorMessage);
      } else {
        toast.error('Failed to change password. Please try again.');
        throw error;
      }
    }
  };

  const value = {
    changePassword
  };

  return <PasswordContext.Provider value={value}>{children}</PasswordContext.Provider>;
};

// Custom hook for using password context
export const usePassword = (): PasswordContextType => {
  const context = useContext(PasswordContext);
  if (context === undefined) {
    throw new Error('usePassword must be used within a PasswordProvider');
  }
  return context;
};