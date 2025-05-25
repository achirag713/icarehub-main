import React, { useState, useEffect } from 'react';
import Button from '../../components/common/Button';
import { admin } from '../../services/api';
import './AddEditDoctorModal.css';

// List of specializations (can be moved to a constants file if used elsewhere)
const specializations = [
  'Cardiology',
  'Neurology',
  'Orthopedics',
  'Pediatrics',
  'Dermatology',
  'Ophthalmology',
  'ENT',
  'Gynecology',
  'Urology',
  'Psychiatry',
  'Dentistry',
  'General Medicine'
];

const AddEditDoctorModal = ({
  isOpen,
  onClose,
  selectedDoctor,
  onSaveSuccess,
}) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phoneNumber: '',
    specialization: '',
    licenseNumber: '',
    address: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (selectedDoctor) {
        setFormData({
          username: selectedDoctor.username || '',
          email: selectedDoctor.email || '',
          phoneNumber: selectedDoctor.phoneNumber || '',
          specialization: selectedDoctor.specialization || '',
          licenseNumber: selectedDoctor.licenseNumber || '',
          address: selectedDoctor.address || '',
          password: '' // Password is not pre-filled for editing
        });
      } else {
        resetForm();
      }
      document.body.style.overflow = 'hidden'; // Prevent scrolling background
    } else {
      document.body.style.overflow = 'unset';
    }

    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, selectedDoctor, onClose]);

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      phoneNumber: '',
      specialization: '',
      licenseNumber: '',
      address: '',
      password: ''
    });
    setErrors({});
    setLoading(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    }

    if (!formData.licenseNumber.trim()) {
      newErrors.licenseNumber = 'License number is required';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    if (!formData.specialization) {
      newErrors.specialization = 'Specialization is required';
    }

    if (!selectedDoctor && !formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (!selectedDoctor && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      if (selectedDoctor) {
        // Update existing doctor
        await admin.updateDoctor(selectedDoctor.id, formData);
      } else {
        // Add new doctor
        await admin.createDoctor(formData);
      }
      onSaveSuccess(); // Notify parent component to refresh list
      onClose();
    } catch (error) {
      console.error('Error saving doctor:', error);
      // Show error in UI
      if (error.response && error.response.data) {
        setErrors({
          ...errors,
          form: error.response.data.message || 'Error saving doctor'
        });
      } else {
        setErrors({
          ...errors,
          form: 'Error connecting to server'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="add-edit-doctor-modal-overlay" onClick={handleOverlayClick}>
      <div className="add-edit-doctor-modal-content">
        <div className="add-edit-doctor-modal-header">
          <h2>{selectedDoctor ? 'Edit Doctor' : 'Add New Doctor'}</h2>
          <button className="add-edit-doctor-close-button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="add-edit-doctor-modal-body">
          <form id="doctorForm" onSubmit={handleSubmit} className="doctor-form">
            {/* Form fields here */}
            <div className="form-group">
              <label htmlFor="username">Doctor's Full Name</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className={errors.username ? 'error' : ''}
                placeholder="Anupam Mittal"
                autoFocus
              />
              {errors.username && <div className="error-message">{errors.username}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="specialization">Medical Specialty</label>
              <select
                id="specialization"
                name="specialization"
                value={formData.specialization}
                onChange={handleChange}
                className={errors.specialization ? 'error' : ''}
              >
                <option value="">Select Specialization</option>
                {specializations.map(spec => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
              {errors.specialization && <div className="error-message">{errors.specialization}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? 'error' : ''}
                placeholder="doctor@example.com"
              />
              {errors.email && <div className="error-message">{errors.email}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="phoneNumber">Contact Number</label>
              <input
                type="text"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                className={errors.phoneNumber ? 'error' : ''}
                placeholder="+91 98765-43210"
              />
              {errors.phoneNumber && <div className="error-message">{errors.phoneNumber}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="address">Professional Address</label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className={errors.address ? 'error' : ''}
                placeholder="Residential Address"
                rows="3"
              />
              {errors.address && <div className="error-message">{errors.address}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="licenseNumber">Medical License Number</label>
              <input
                type="text"
                id="licenseNumber"
                name="licenseNumber"
                value={formData.licenseNumber}
                onChange={handleChange}
                className={errors.licenseNumber ? 'error' : ''}
                placeholder="ICH-00N"
              />
              {errors.licenseNumber && <div className="error-message">{errors.licenseNumber}</div>}
            </div>

            {!selectedDoctor && (
              <div className="form-group">
                <label htmlFor="password">Account Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={errors.password ? 'error' : ''}
                  placeholder="Minimum 8 characters required"
                />
                {errors.password && <div className="error-message">{errors.password}</div>}
              </div>
            )}

            {errors.form && (
              <div className="form-group">
                <div className="error-message form-error">{errors.form}</div>
              </div>
            )}
          </form>
        </div>
        <div className="add-edit-doctor-modal-footer">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="doctorForm"
            disabled={loading}
          >
            {loading ? (selectedDoctor ? 'Saving...' : 'Creating...') : (selectedDoctor ? 'Save Changes' : 'Create Doctor')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddEditDoctorModal; 