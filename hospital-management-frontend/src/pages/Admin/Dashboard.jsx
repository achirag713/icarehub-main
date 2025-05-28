import React, { useState, useEffect } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import { admin } from '../../services/api';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import './Dashboard.css';
// Import Chart.js components
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Register Chart.js components
ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels);

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);  const [dashboardData, setDashboardData] = useState({
    stats: {
      totalPatients: 0,
      totalDoctors: 0,
      totalAppointments: 0,
      appointmentsByStatus: {
        scheduled: 0,
        completed: 0,
        cancelled: 0
      },
      patientsByGender: {
        male: 0,
        female: 0,
        other: 0
      }
    },
    recentAppointments: [],
    recentPatients: [],
    recentDoctors: [],
    weeklyAppointments: [0, 0, 0, 0, 0, 0, 0]
  });useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [stats, appointments, patients, doctors, chartData] = await Promise.all([
          admin.getDashboardStats(),
          admin.getRecentAppointments(),
          admin.getRecentPatients(),
          admin.getRecentDoctors(),
          admin.getChartData()
        ]);

        console.log('Recent Patients Data:', patients.data);
        console.log('Chart Data:', chartData.data);
        
        // Use real data from backend for charts
        const enhancedStats = {
          ...stats.data,
          appointmentsByStatus: chartData.data.appointmentsByStatus,
          patientsByGender: chartData.data.patientsByGender
        };

        setDashboardData({
          stats: enhancedStats,
          recentAppointments: appointments.data,
          recentPatients: patients.data,
          recentDoctors: doctors.data,
          weeklyAppointments: chartData.data.appointmentsByDay
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
  // Prepare data for appointment status pie chart
  const prepareAppointmentStatusChartData = () => {
    const { appointmentsByStatus } = dashboardData.stats;
    
    return {
      labels: ['Scheduled', 'Completed', 'Cancelled'],
      datasets: [
        {
          data: [
            appointmentsByStatus.scheduled,
            appointmentsByStatus.completed, 
            appointmentsByStatus.cancelled
          ],
          backgroundColor: [
            '#4CAF50',  // Green for scheduled
            '#2196F3',  // Blue for completed
            '#FF9800',  // Orange for cancelled
          ],
          borderColor: [
            '#388E3C',
            '#1565C0',
            '#E65100',
          ],
          borderWidth: 1,
        },
      ],
    };
  };

  // Prepare data for patient gender distribution chart
  const preparePatientGenderChartData = () => {
    const { patientsByGender } = dashboardData.stats;
    
    return {
      labels: ['Male', 'Female', 'Other'],
      datasets: [
        {
          data: [
            patientsByGender.male,
            patientsByGender.female,
            patientsByGender.other
          ],
          backgroundColor: [
            '#2196F3',  // Blue for male
            '#E91E63',  // Pink for female
            '#9C27B0',  // Purple for other
          ],
          borderColor: [
            '#1565C0',
            '#C2185B',
            '#7B1FA2',
          ],
          borderWidth: 1,
        },
      ],
    };
  };
  // Options for pie charts
  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((acc, curr) => acc + curr, 0);
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      },
      datalabels: {
        display: true,
        color: '#fff',
        font: {
          weight: 'bold',
          size: 12,
        },
        formatter: (value, ctx) => {
          const total = ctx.dataset.data.reduce((acc, data) => acc + data, 0);
          const percentage = Math.round((value / total) * 100);
          return `${percentage}%`;
        }
      }
    }
  };
    // Bar chart data for appointments by day
  const appointmentsByDayData = {
    labels: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    datasets: [
      {
        label: 'Appointments',
        data: dashboardData.weeklyAppointments,
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
    ],
  };
    const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Appointments by Day',
      },
      datalabels: {
        anchor: 'end',
        align: 'top',
        formatter: (value) => value,
        font: {
          weight: 'bold'
        }
      }
    },
  };

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
        
        <div className="charts-container">
          <div className="chart-row">
            <div className="chart-card">
              <h3>Appointment Status Distribution</h3>
              <div className="chart-container">
                <Pie data={prepareAppointmentStatusChartData()} options={pieChartOptions} />
              </div>
            </div>
            
            <div className="chart-card">
              <h3>Patient Gender Distribution</h3>
              <div className="chart-container">
                <Pie data={preparePatientGenderChartData()} options={pieChartOptions} />
              </div>
            </div>
          </div>
          
          <div className="chart-row">
            <div className="chart-card wide">
              <h3>Weekly Appointment Distribution</h3>
              <div className="chart-container">
                <Bar data={appointmentsByDayData} options={barChartOptions} />
              </div>
            </div>
          </div>
        </div>        <div className="dashboard-grid">          <div className="dashboard-card">
            <div className="card-header-with-action">
              <h3>Appointments</h3>
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
              <h3>Recent Patients</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/admin/patients')}
                className="view-all-btn"
              >
                View All
              </Button>
            </div>            {dashboardData.recentPatients && dashboardData.recentPatients.length > 0 ? (
              <div className="patients-list">
                {dashboardData.recentPatients.slice(0, 1).map((patient, index) => (
                  <div key={index} className="patient-item">
                    <div className="patient-name">
                      {patient.firstName} {patient.lastName}
                    </div>
                    <div className="patient-details">
                      <span className="patient-gender">{patient.gender}</span>
                      <span className="patient-visit">{patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString() : 'No visits'}</span>
                    </div>
                  </div>
                ))}
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
