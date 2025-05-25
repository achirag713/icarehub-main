import React, { useState, useEffect } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import { admin } from '../../services/api';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    stats: {
      totalPatients: 0,
      totalDoctors: 0,
      totalAppointments: 0,
    },
    recentAppointments: [],
    recentPatients: [],
    recentDoctors: []
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [stats, appointments, patients, doctors] = await Promise.all([
          admin.getDashboardStats(),
          admin.getRecentAppointments(),
          admin.getRecentPatients(),
          admin.getRecentDoctors()
        ]);

        console.log('Recent Patients Data:', patients.data); // Debug log

        setDashboardData({
          stats: stats.data,
          recentAppointments: appointments.data,
          recentPatients: patients.data,
          recentDoctors: doctors.data
        });
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Helper function to calculate age from date of birth
  

  if (loading) {
    return (
      <AdminLayout>
        <div className="dashboard-container">
          <div className="loading">Loading dashboard data...</div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="dashboard-container">
          <div className="error">{error}</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="dashboard-container">
        <div className="welcome-section">
          <h1>Welcome, {user?.username || 'Admin'}!</h1>
          <p>Here's an overview of the ICareHub</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Patients</h3>
            <div className="stat-value">{dashboardData.stats.totalPatients}</div>
          </div>
          <div className="stat-card">
            <h3>Total Doctors</h3>
            <div className="stat-value">{dashboardData.stats.totalDoctors}</div>
          </div>
          <div className="stat-card">
            <h3>Total Appointments</h3>
            <div className="stat-value">{dashboardData.stats.totalAppointments}</div>
          </div>
          
        </div>

        <div className="dashboard-grid">          <div className="dashboard-card">
            <div className="card-header-with-action">
              <h3>Latest Appointment</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/admin/appointments')}
                className="view-all-btn"
              >
                View All
              </Button>
            </div>            {dashboardData.recentAppointments && dashboardData.recentAppointments.length > 0 ? (
              <div className="latest-item">
                <div className="appointment-date">
                  {new Date(dashboardData.recentAppointments[0].date).toLocaleDateString()}
                </div>
                <div className="appointment-details">
                  <strong>Patient: {dashboardData.recentAppointments[0].patientName}</strong> 
                 
                  <strong>Doctor: Dr. {dashboardData.recentAppointments[0].doctorName}</strong> 
                  
                </div>
              </div>
            ) : (
              <p className="no-data-message">No recent appointments</p>
            )}
          </div>          <div className="dashboard-card">
            <div className="card-header-with-action">
              <h3>Latest Patient</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/admin/patients')}
                className="view-all-btn"
              >
                View All
              </Button>
            </div>            {dashboardData.recentPatients && dashboardData.recentPatients.length > 0 ? (
              <div className="latest-item">
                <div className="patient-name">
                  {dashboardData.recentPatients[0].firstName} {dashboardData.recentPatients[0].lastName}
                </div>
                <div className="patient-details">
                  <strong>Gender: {dashboardData.recentPatients[0].gender}</strong> 
                  
                  
                  <strong>Last Visit: {dashboardData.recentPatients[0].lastVisit ? new Date(dashboardData.recentPatients[0].lastVisit).toLocaleDateString() : 'N/A'}</strong> 
                </div>
              </div>
            ) : (
              <p className="no-data-message">No recent patients</p>
            )}
          </div>          <div className="dashboard-card">
            <div className="card-header-with-action">
              <h3>Latest Doctor</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/admin/doctors')}
                className="view-all-btn"
              >
                View All
              </Button>
            </div>
            {dashboardData.recentDoctors.length > 0 ? (
              <div className="latest-item">
                <div className="doctor-name">
                  Dr. {dashboardData.recentDoctors[0].firstName} {dashboardData.recentDoctors[0].lastName}
                </div>
                <div className="doctor-details">
                  <strong>Specialization:</strong> {dashboardData.recentDoctors[0].specialization}
                </div>
              </div>
            ) : (
              <p className="no-data-message">No recent doctors</p>
            )}
          </div>

          
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
