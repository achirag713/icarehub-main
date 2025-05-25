import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../../services/api';
import { validatePassword } from '../../utils/validationUtils';
import OtpInput from '../../components/OtpInput';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import './Auth.css';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      
      if (!formData.email) {
        setError('Email is required');
        return;
      }

      await auth.sendOtp(formData.email, 'reset-password');
      setStep(2);
    } catch (err) {
      console.error('OTP send error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (otp) => {
    try {
      setLoading(true);
      setError('');

      formData.otp = otp;
      await auth.verifyOtp(formData.email, otp, 'reset-password');
      setStep(3);
    } catch (err) {
      console.error('OTP verification error:', err);
      setError(err.response?.data?.message || err.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');

      if (formData.newPassword !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }      if (!validatePassword(formData.newPassword)) {
        setError('Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character.');
        return;
      }

      const response = await auth.resetPassword(formData.email, formData.otp, formData.newPassword);
      
      if (response.data.success) {
        // Show success message and redirect
        setTimeout(() => {
          navigate('/signin');
        }, 2000);
      } else {
        setError(response.data.message || 'Failed to reset password. Please try again.');
      }
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepOne = () => (
    <div>
      <h3>Step 1: Enter Your Email</h3>
      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
        />
      </div>
      <button 
        type="button" 
        className="auth-button"
        onClick={handleSendOtp}
        disabled={loading}
      >
        {loading ? 'Sending OTP...' : 'Send Verification Code'}
      </button>
    </div>
  );

  const renderStepTwo = () => (
    <div>
      <h3>Step 2: Verify Your Email</h3>
      <p className="otp-step-description">Please enter the verification code sent to {formData.email}</p>
      <OtpInput length={6} onComplete={handleVerifyOtp} />
      <button 
        type="button" 
        className="auth-button-secondary"
        onClick={handleSendOtp}
        disabled={loading}
      >
        Resend Code
      </button>
    </div>
  );

  const renderStepThree = () => (
    <form onSubmit={handleResetPassword}>
      <h3>Step 3: Create New Password</h3>
      <div className="form-group">
        <label htmlFor="newPassword">New Password*</label>
        <input
          type="password"
          id="newPassword"
          name="newPassword"
          value={formData.newPassword}
          onChange={handleChange}
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="confirmPassword">Confirm New Password*</label>
        <input
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
        />
      </div>
      <button 
        type="submit" 
        className="auth-button"
        disabled={loading}
      >
        {loading ? 'Resetting Password...' : 'Reset Password'}
      </button>
    </form>
  );

  return (
    <div className="landing-page">
      <Navbar />
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-card">
            <h2>Reset Password</h2>
            {error && <div className="error-message">{error}</div>}
            
            {step === 1 && renderStepOne()}
            {step === 2 && renderStepTwo()}
            {step === 3 && renderStepThree()}

            <div className="auth-links">
              <p>
                Remember your password? <Link to="/signin">Sign In</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ForgotPassword;
