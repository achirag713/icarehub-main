import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import OtpInput from '../../components/OtpInput';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import './Auth.css';

const SignUp = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    bloodGroup: '',
    medicalHistory: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSendOtp = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Validate email
      if (!formData.email) {
        setError('Email is required');
        return;
      }

      await auth.sendOtp(formData.email, 'registration');
      setStep(2); // Move to OTP verification step
    } catch (err) {
      console.error('OTP send error:', err);
      setError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (otp) => {
    try {
      setLoading(true);
      setError('');

      await auth.verifyOtp(formData.email, otp, 'registration');
      setStep(3); // Move to final registration step
    } catch (err) {
      console.error('OTP verification error:', err);
      setError(err.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate phone number (10 digits)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(formData.phoneNumber)) {
      setError('Phone number must be exactly 10 digits.');
      return;
    }

    setLoading(true);

    // Create payload matching the expected RegisterPatientDto format
    const patientData = {
      name: formData.name,
      email: formData.email,
      password: formData.password,
      phoneNumber: formData.phoneNumber,
      dateOfBirth: formData.dateOfBirth,
      gender: formData.gender,
      address: formData.address,
      bloodGroup: formData.bloodGroup || null,
      medicalHistory: formData.medicalHistory || null
    };

    try {
      await auth.signup(patientData);
      setSuccess('Account created successfully! Please sign in with your credentials.');
      
      // Wait 2 seconds before redirecting
      setTimeout(() => {
        navigate('/signin');
      }, 2000);
    } catch (err) {
      console.error('Signup error:', err);
      setError(err.response?.data?.message || 'Failed to sign up. Please try again.');
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
        {loading ? 'Sending OTP...' : 'Continue with Email Verification'}
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
    <form onSubmit={handleSubmit}>
      <h3>Step 3: Complete Registration</h3>
      
      <div className="form-group">
        <label htmlFor="name">Full Name</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="phoneNumber">Phone Number</label>
        <input
          type="tel"
          id="phoneNumber"
          name="phoneNumber"
          value={formData.phoneNumber}
          onChange={handleChange}
          required
          placeholder="10-digit phone number"
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="dateOfBirth">Date of Birth</label>
        <input
          type="date"
          id="dateOfBirth"
          name="dateOfBirth"
          value={formData.dateOfBirth}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="gender">Gender</label>
        <select
          id="gender"
          name="gender"
          value={formData.gender}
          onChange={handleChange}
          required
        >
          <option value="">Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="address">Address</label>
        <input
          type="text"
          id="address"
          name="address"
          value={formData.address}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="bloodGroup">Blood Group</label>
        <select
          id="bloodGroup"
          name="bloodGroup"
          value={formData.bloodGroup}
          onChange={handleChange}
        >
          <option value="">Select Blood Group</option>
          <option value="A+">A+</option>
          <option value="A-">A-</option>
          <option value="B+">B+</option>
          <option value="B-">B-</option>
          <option value="AB+">AB+</option>
          <option value="AB-">AB-</option>
          <option value="O+">O+</option>
          <option value="O-">O-</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="medicalHistory">Medical History</label>
        <textarea
          id="medicalHistory"
          name="medicalHistory"
          value={formData.medicalHistory}
          onChange={handleChange}
          rows="3"
        ></textarea>
      </div>
      
      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          type="password"
          id="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          required
        />        <div className="password-requirements">
          <ul>
            <li className={formData.password.length >= 8 ? 'met' : ''}>
              At least 8 characters
            </li>
            <li className={/[A-Z]/.test(formData.password) ? 'met' : ''}>
              One uppercase letter
            </li>
            <li className={/[a-z]/.test(formData.password) ? 'met' : ''}>
              One lowercase letter
            </li>
            <li className={/\d/.test(formData.password) ? 'met' : ''}>
              One number
            </li>
            <li className={/[!@#$%^&*(),.?":{}|<>]/.test(formData.password) ? 'met' : ''}>
              One special character
            </li>
          </ul>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="confirmPassword">Confirm Password</label>
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
        {loading ? 'Creating Account...' : 'Create Account'}
      </button>
    </form>
  );

  return (
    <div className="landing-page">
      <Navbar />
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-card">
            <h2>Create Patient Account</h2>
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            {step === 1 && renderStepOne()}
            {step === 2 && renderStepTwo()}
            {step === 3 && renderStepThree()}
            <div className="auth-links">
              <p>
                Already have an account? <Link to="/signin">Sign In</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default SignUp;