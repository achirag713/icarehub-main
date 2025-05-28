import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DoctorLayout from '../../layouts/DoctorLayout';
import { doctor } from '../../services/api';
import Button from '../../components/common/Button';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { useAuth } from '../../context/AuthContext';
import './Settings.css';

const Settings = () => {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Profile form state with only editable and display fields
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    specialization: '', // Keep for display
    licenseNumber: '', // Keep for display
    // qualifications: '', // Removed
    // experience: '',
    // bio: ''
  });
  
  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // States for UI
  const [activeTab, setActiveTab] = useState('profile');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Redirect if no user
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch doctor profile data
        const response = await doctor.getProfile();
        const profileData = response.data;

        // Initialize form with fetched data, only keeping relevant fields
        setProfileForm({
          name: profileData?.name || user?.name || '',
          email: profileData?.email || user?.email || '',
          phone: profileData?.phoneNumber || '', // Map phoneNumber from API to 'phone' state
          specialization: profileData?.specialization || '',
          licenseNumber: profileData?.licenseNumber || '',
          // Removed qualifications, experience, bio
        });
      } catch (err) {
        console.error('Error loading profile:', err);
        setError('Failed to load profile data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [user, doctor]); // Added 'doctor' to dependency array
  
  // Handle profile form changes (only for editable fields)
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    // Only update state for name, email, and phone
    if (['name',  'phone'].includes(name)) {
      setProfileForm(prev => ({
        ...prev,
        [name]: value
      }));

      if (errorMessage) {
        setErrorMessage('');
      }
    }
  };
  
  // Handle password form changes
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errorMessage) {
      setErrorMessage('');
    }
  };

  // Password validation function
  const validatePassword = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const errors = [];
    if (password.length < minLength) errors.push(`Password must be at least ${minLength} characters long`);
    if (!hasUpperCase) errors.push('Password must contain at least one uppercase letter');
    if (!hasLowerCase) errors.push('Password must contain at least one lowercase letter');
    if (!hasNumbers) errors.push('Password must contain at least one number');
    if (!hasSpecialChar) errors.push('Password must contain at least one special character');

    return errors;
  };

  // Handle profile form submission
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      setErrorMessage('');
      setSuccessMessage('');
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Prepare data to send: only editable fields
      const dataToUpdate = {
        name: profileForm.name,
        
        phoneNumber: profileForm.phone, // Map 'phone' state back to 'phoneNumber' for API
      };

      await doctor.updateProfile(dataToUpdate);
      setSuccessMessage('Profile updated successfully!');

      // Optional: Re-fetch profile data to ensure UI is in sync after save
      // This might be necessary if the backend returns slightly different data on GET than what was sent on PUT
      // loadUserData();

    } catch (err) {
      console.error('Error updating profile:', err);
      setErrorMessage('Failed to update profile. Please try again.');
    }
  };

  // Handle password form submission with enhanced validation
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    try {
      setErrorMessage('');
      setSuccessMessage('');
      
      // Basic validation
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (!passwordForm.currentPassword.trim()) {
        setErrorMessage('Current password is required');
        return;
      }

      if (!passwordForm.newPassword.trim() || !passwordForm.confirmPassword.trim()) {
        setErrorMessage('Both new password and confirmation are required');
        return;
      }

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        setErrorMessage('New passwords do not match');
        return;
      }

      if (passwordForm.currentPassword === passwordForm.newPassword) {
        setErrorMessage('New password must be different from current password');
        return;
      }

      // Password strength validation
      const passwordErrors = validatePassword(passwordForm.newPassword);
      if (passwordErrors.length > 0) {
        setErrorMessage(passwordErrors.join('\n'));
        return;
      }

      // Make API call to change password
      await doctor.changePassword(passwordForm);
      
      // Success handling
      setSuccessMessage('Password changed successfully! Please use your new password for your next login.');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      // Optional: Add a delay and redirect to login
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      console.error('Error changing password:', err);
      setErrorMessage(
        err.response?.data?.message || 
        'Failed to change password. Please ensure your current password is correct.'
      );
    }
  };

  // Early return if no user
  if (!user) {
    return null;
  }

  // Show loading state
  if (loading) {
    return (
      <DoctorLayout>
        <div className="settings-page">
          <div className="loading">Loading settings...</div>
        </div>
      </DoctorLayout>
    );
  }

  // Show error state
  if (error) {
    return (
      <DoctorLayout>
        <div className="settings-page">
          <div className="error-message">{error}</div>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </DoctorLayout>
    );
  }

  return (
    <ErrorBoundary>
      <DoctorLayout>
        <div className="settings-page">
          <h1>Account Settings</h1>
          
          {(successMessage || errorMessage) && (
            <div className={`message-container ${successMessage ? 'success' : 'error'}`}>
              <div className={successMessage ? 'success-message' : 'error-message'}>
                {successMessage || errorMessage}
              </div>
            </div>
          )}
          
          <div className="settings-container">
            <div className="settings-tabs">
              <button
                className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                <span>Profile Information</span>
              </button>
              <button
                className={`tab ${activeTab === 'password' ? 'active' : ''}`}
                onClick={() => setActiveTab('password')}
              >
                <span>Security Settings</span>
              </button>
            </div>
            
            <div className="settings-content">
              {/* Profile Information Tab */}
              {activeTab === 'profile' && (
                <div className="settings-panel">
                  <h2>Profile Information</h2>
                  <p className="panel-description">
                    Manage your personal information and professional details.
                  </p>
                  
                  <form onSubmit={handleProfileSubmit}>
                    <div className="form-grid">
                      <div className="form-group">
                        <label htmlFor="name">Full Name <span className="required"></span></label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          value={profileForm.name}
                          onChange={handleProfileChange}
                          placeholder="Dr. John Doe"
                          required
                        />
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="email">Email Address <span className="required"></span></label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={profileForm.email}
                          onChange={handleProfileChange}
                          placeholder="doctor@example.com"
                          required
                        />
                        <small className="field-note">Email address cannot be changed</small>
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="phone">Phone Number</label>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          value={profileForm.phone}
                          onChange={handleProfileChange}
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                      
                      {/* Specialization (Read-only) */}
                      <div className="form-group">
                        <label htmlFor="specialization">Specialization</label>
                        <input
                          type="text"
                          id="specialization"
                          name="specialization"
                          value={profileForm.specialization}
                          readOnly // Make read-only
                          disabled // Optional: disable the input
                          placeholder="e.g. Cardiology, Pediatrics"
                          className="read-only-input"
                        />
                      </div>

                      {/* License Number (Read-only) */}
                      <div className="form-group">
                        <label htmlFor="licenseNumber">Medical License Number</label>
                        <input
                          type="text"
                          id="licenseNumber"
                          name="licenseNumber"
                          value={profileForm.licenseNumber}
                          readOnly // Make read-only
                          disabled // Optional: disable the input
                          placeholder="MCI-12345-A"
                          className="read-only-input"
                        />
                      </div>

                      {/* Removed Qualifications, Experience, Bio */}
                      {/*
                      <div className="form-group">
                        <label htmlFor="qualifications">Qualifications</label>
                        <input
                          type="text"
                          id="qualifications"
                          name="qualifications"
                          value={profileForm.qualifications}
                          onChange={handleProfileChange}
                          placeholder="e.g. MBBS, MD, FRCS"
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="experience">Years of Experience</label>
                        <input
                          type="number"
                          id="experience"
                          name="experience"
                          value={profileForm.experience}
                          onChange={handleProfileChange}
                          min="0"
                          placeholder="0"
                        />
                      </div>

                      <div className="form-group full-width">
                        <label htmlFor="bio">Professional Bio</label>
                        <textarea
                          id="bio"
                          name="bio"
                          value={profileForm.bio}
                          onChange={handleProfileChange}
                          rows="4"
                          placeholder="Brief description of your professional background and expertise..."
                        />
                      </div>
                      */}
                    </div>
                    
                    <div className="form-actions">
                      <Button type="submit" variant="primary">
                        Save Changes
                      </Button>
                    </div>
                  </form>
                </div>
              )}
              
              {/* Password Tab */}
              {activeTab === 'password' && (
                <div className="settings-panel">
                  <h2>Security Settings</h2>
                  <p className="panel-description">
                    Ensure your account is secure by using a strong password. We recommend using a combination of letters, numbers, and special characters.
                  </p>
                  
                  <form onSubmit={handlePasswordSubmit}>
                    <div className="form-group">
                      <label htmlFor="currentPassword">Current Password <span className="required"></span></label>
                      <input
                        type="password"
                        id="currentPassword"
                        name="currentPassword"
                        value={passwordForm.currentPassword}
                        onChange={handlePasswordChange}
                        required
                        placeholder="Enter your current password"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="newPassword">New Password <span className="required"></span></label>
                      <input
                        type="password"
                        id="newPassword"
                        name="newPassword"
                        value={passwordForm.newPassword}
                        onChange={handlePasswordChange}
                        required
                        placeholder="Choose a strong password"
                      />
                      <div className="password-requirements">
                        <p>Password must contain:</p>
                        <ul>
                          <li className={passwordForm.newPassword.length >= 8 ? 'met' : ''}>
                            At least 8 characters
                          </li>
                          <li className={/[A-Z]/.test(passwordForm.newPassword) ? 'met' : ''}>
                            One uppercase letter
                          </li>
                          <li className={/[a-z]/.test(passwordForm.newPassword) ? 'met' : ''}>
                            One lowercase letter
                          </li>
                          <li className={/\d/.test(passwordForm.newPassword) ? 'met' : ''}>
                            One number
                          </li>
                          <li className={/[!@#$%^&*(),.?":{}|<>]/.test(passwordForm.newPassword) ? 'met' : ''}>
                            One special character
                          </li>
                        </ul>
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="confirmPassword">Confirm New Password <span className="required"></span></label>
                      <input
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        value={passwordForm.confirmPassword}
                        onChange={handlePasswordChange}
                        required
                        placeholder="Re-enter your new password"
                      />
                    </div>
                    
                    <div className="form-actions">
                      <Button type="submit" variant="primary">
                        Update Password
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </DoctorLayout>
    </ErrorBoundary>
  );
};

export default Settings;