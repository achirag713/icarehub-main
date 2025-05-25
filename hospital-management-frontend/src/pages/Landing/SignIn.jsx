import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLoading } from '../../context/LoadingContext';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import './Auth.css';

const SignIn = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showLoading, hideLoading } = useLoading();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    showLoading();
    try {
      const response = await auth.signin(formData);
      const { token, user } = response.data;
      
      // Store token in localStorage
      localStorage.setItem('token', token);
      
      // Update auth context
      login(user);
      
      // Redirect based on user role (case-insensitive)
      switch ((user.role || '').toLowerCase()) {
        case 'admin':
          navigate('/admin/dashboard', { replace: true });
          break;
        case 'doctor':
          navigate('/doctor/dashboard', { replace: true });
          break;
        case 'patient':
          navigate('/patient/dashboard', { replace: true });
          break;
        default:
          navigate('/patient/dashboard', { replace: true }); // fallback for unknown or missing role
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
      hideLoading();
    }
  };

  return (
    <div className="landing-page">
      <Navbar />
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-card">
            <h2>Sign In</h2>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleSubmit}>
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
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
              <button 
                type="submit" 
                className="auth-button"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
            <div className="auth-links">
              <Link to="/forgot-password" className="forgot-password">Forgot Password?</Link>
              <p>
                Don't have an account? <Link to="/signup">Sign Up</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default SignIn;
