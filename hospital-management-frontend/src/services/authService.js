import { auth } from './api';

/**
 * Enhanced authentication service to properly handle login attempts
 */
export const authService = {
  /**
   * Attempt to sign in a user
   * @param {Object} credentials - The user credentials (email and password)
   * @returns {Promise} - Promise that resolves to the authenticated user data or rejects with an error
   */
  signin: async (credentials) => {
    try {
      // Special handling for signin to prevent automatic redirects
      const response = await auth.signin(credentials);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      // Handle specific error cases
      let errorMessage = 'Failed to sign in. Please try again.';
      
      if (error.response) {
        switch (error.response.status) {
          case 400:
            errorMessage = 'Invalid email or password format.';
            break;
          case 401:
            errorMessage = 'Invalid email or password. Please check your credentials.';
            break;
          case 403:
            errorMessage = 'Your account has been locked. Please contact support.';
            break;
          case 404:
            errorMessage = 'Account not found. Please check your email.';
            break;
          case 429:
            errorMessage = 'Too many login attempts. Please try again later.';
            break;
          case 500:
            errorMessage = 'Server error. Please try again later.';
            break;
          default:
            if (error.response.data?.message) {
              errorMessage = error.response.data.message;
            }
        }
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  },
  
  // Re-export other auth methods
  signup: auth.signup,
  sendOtp: auth.sendOtp,
  verifyOtp: auth.verifyOtp,
  resetPassword: auth.resetPassword,
  forgotPassword: auth.forgotPassword
};

export default authService;
