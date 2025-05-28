import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PatientLayout from '../../layouts/PatientLayout';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/dateUtils';
import { patient } from '../../services/api';
import './Dashboard.css';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Register Chart.js components
ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels);

const PatientDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [patientProfile, setPatientProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [bills, setBills] = useState([]);
  const [healthUpdates, setHealthUpdates] = useState([]);
  const [nextAppointment, setNextAppointment] = useState(null);
  const [error, setError] = useState(null);  const [chartData, setChartData] = useState({
    appointmentsByStatus: { scheduled: 0, completed: 0, cancelled: 0 },
    appointmentHistory: { labels: [], data: [] }
  });

  // Helper function to extract doctor name from various object structures
  const getDoctorName = (doctorObj) => {
    // If it's already a string, just return it
    if (typeof doctorObj === 'string') {
      return doctorObj;
    }

    // If it's null or undefined, return a default name
    if (!doctorObj) {
      return 'Doctor';
    }

    // If it's an object, try to extract name from various possible structures
    if (typeof doctorObj === 'object') {
      // Check for direct name, username, or firstName/lastName properties
      if (doctorObj.name) {
        return doctorObj.name;
      }
      if (doctorObj.username) {
        return doctorObj.username;
      }
      if (doctorObj.firstName || doctorObj.lastName) {
        return `${doctorObj.firstName || ''} ${doctorObj.lastName || ''}`.trim();
      }
      // Check for nested user object with name property
      if (doctorObj.user && typeof doctorObj.user === 'object') {
        if (doctorObj.user.name) {
          return doctorObj.user.name;
        }
        if (doctorObj.user.username) {
          return doctorObj.user.username;
        }
        if (doctorObj.user.firstName || doctorObj.user.lastName) {
          return `${doctorObj.user.firstName || ''} ${doctorObj.user.lastName || ''}`.trim();
        }
      }
    }

    // Default fallback - just return "Doctor" instead of using IDs
    return 'Doctor';
  };

  // Helper function to extract specialty from various object structures
  const getSpecialty = (doctorObj, appointmentObj) => {
    // First check if specialty is directly on the appointment
    if (appointmentObj && appointmentObj.specialty) {
      return appointmentObj.specialty;
    }

    // If it's a string, we don't have specialty info
    if (typeof doctorObj === 'string') {
      return 'Specialist';
    }

    // If it's an object, look for specialization/specialty
    if (doctorObj && typeof doctorObj === 'object') {
      if (doctorObj.specialization) {
        return doctorObj.specialization;
      }
      if (doctorObj.specialty) {
        return doctorObj.specialty;
      }
      // Check for nested user object
      if (doctorObj.user && typeof doctorObj.user === 'object') {
        if (doctorObj.user.specialization) {
          return doctorObj.user.specialization;
        }
        if (doctorObj.user.specialty) {
          return doctorObj.user.specialty;
        }
      }
    }

    // Default fallback
    return 'Specialist';
  };

  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch patient profile first
        const profileResponse = await patient.getProfile();
        setPatientProfile(profileResponse.data);

        // Fetch all other data in parallel
        const [appointmentsRes, medicalRecordsRes, billsRes, chartDataRes] = await Promise.all([
          patient.getAppointments(),
          patient.getMedicalRecords(),
          patient.getBills(),
          patient.getChartData()
        ]);        // Set chart data for appointment status if available from backend
        if (chartDataRes && chartDataRes.data && chartDataRes.data.appointmentsByStatus) {
          setChartData(prevState => ({
            ...prevState,
            appointmentsByStatus: chartDataRes.data.appointmentsByStatus
          }));
          console.log('Chart data loaded:', chartDataRes.data);
        } else {
          // Generate appointment status data from the appointments list if API doesn't provide it
          const appointmentsByStatus = { scheduled: 0, completed: 0, cancelled: 0 };
          
          if (Array.isArray(appointmentsRes.data)) {
            appointmentsRes.data.forEach(appointment => {
              const statusStr = String(appointment.status).toLowerCase();
              if (statusStr === 'scheduled' || statusStr === '0') {
                appointmentsByStatus.scheduled++;
              } else if (statusStr === 'completed' || statusStr === '1') {
                appointmentsByStatus.completed++;
              } else if (statusStr === 'cancelled' || statusStr === '2') {
                appointmentsByStatus.cancelled++;
              }
            });
          }
          
          setChartData(prevState => ({
            ...prevState,
            appointmentsByStatus
          }));
        }

        // Debug appointmentsRes
        console.log('==================== DASHBOARD DOCTOR INFORMATION ====================');
        console.log('Appointments from API:', appointmentsRes.data);

        // Add detailed doctor debugging
        if (Array.isArray(appointmentsRes.data)) {
          appointmentsRes.data.forEach((apt, index) => {
            console.log(`Appointment ${index} - Doctor Info:`);
            if (apt.doctor && typeof apt.doctor === 'object') {
              console.log('Doctor Object:', apt.doctor);
              console.log('Doctor Name:', apt.doctor.name);
              console.log('Doctor Specialization:', apt.doctor.specialization);
            } else {
              console.log('Doctor (non-object):', apt.doctor);
            }
            console.log('---------------------------------');
          });
        }
        console.log('====================================================================');

        // Set appointments and find next appointment
        const appointmentsData = appointmentsRes.data;

        // Ensure appointment times are properly handled
        if (Array.isArray(appointmentsData)) {
          appointmentsData.forEach((apt, index) => {
            console.log(`Appointment ${index}:`, apt);
            console.log(`  Doctor:`, apt.doctor);
            console.log(`  Specialty:`, apt.specialty);

            // Use displayTime as primary source of time information
            if (apt.displayTime) {
              apt.time = apt.displayTime;
              console.log(`  Using displayTime: ${apt.displayTime}`);
            }
            // Final fallback: Use the date object's time
            else if (!apt.time && (apt.date || apt.appointmentDate)) {
              const dateString = apt.date || apt.appointmentDate;
              const aptDate = new Date(dateString);
              if (!isNaN(aptDate.getTime())) {
                apt.time = aptDate.toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                });
                console.log(`  Fallback time from date: ${apt.time}`);
              }
            }
          });
        }

        // Update the useEffect where the next appointment is set (around line 177)
        setAppointments(appointmentsData);
        if (appointmentsData.length > 0) {
          // Get current date/time for filtering out past appointments
          const now = new Date();

          // Get all scheduled appointments regardless of date first
          const scheduledAppointments = appointmentsData.filter(apt => {
            // Filter by status (only scheduled/0)
            const isScheduled = String(apt.status).toLowerCase() === 'scheduled' || String(apt.status) === '0';
            return isScheduled;
          });

          console.log('All scheduled appointments:', scheduledAppointments);
          
          // Try to get future appointments, but don't exclude all if date parsing fails
          const futureScheduledAppointments = scheduledAppointments.filter(apt => {
            try {
              // Try to parse date in multiple formats
              let aptDate;
              
              // First try with both date and time
              aptDate = new Date(apt.date + ' ' + (apt.displayTime || apt.time || '00:00'));
              
              // If that fails, try just the date
              if (isNaN(aptDate.getTime())) {
                aptDate = new Date(apt.date);
              }
              
              // If that still fails, assume it's valid (don't exclude it)
              if (isNaN(aptDate.getTime())) {
                console.log(`Could not parse date for appointment: ${apt.id}, date: ${apt.date}, time: ${apt.displayTime || apt.time}`);
                return true; // Include it anyway rather than filtering it out
              }
              
              return aptDate >= now;
            } catch (error) {
              console.error('Error parsing appointment date:', error);
              return true; // Include it if there's an error rather than filtering it out
            }
          });

          console.log('Future scheduled appointments:', futureScheduledAppointments);

          // Sort by nearest date/time - with improved error handling
          const sortedFutureAppointments = [...futureScheduledAppointments].sort((a, b) => {
            try {
              // Try parsing dates in multiple formats
              let dateA, dateB;
              
              // Try with both date and time
              dateA = new Date(a.date + ' ' + (a.displayTime || a.time || '00:00'));
              dateB = new Date(b.date + ' ' + (b.displayTime || b.time || '00:00'));
              
              // If parsing fails, try with just date
              if (isNaN(dateA.getTime())) {
                dateA = new Date(a.date);
              }
              if (isNaN(dateB.getTime())) {
                dateB = new Date(b.date);
              }
              
              // If still invalid, use current date (to avoid sorting errors)
              if (isNaN(dateA.getTime())) dateA = new Date();
              if (isNaN(dateB.getTime())) dateB = new Date();
              
              return dateA - dateB;
            } catch (error) {
              console.error('Error sorting appointments:', error);
              return 0; // Keep original order if there's an error
            }
          });

          // First try to set the next appointment to the nearest future one
          // If no future appointments are available, use any scheduled appointment
          if (sortedFutureAppointments.length > 0) {
            setNextAppointment(sortedFutureAppointments[0]);
          } else if (scheduledAppointments.length > 0) {
            console.log('No future appointments found, using any scheduled appointment');
            // Sort all scheduled appointments
            const sortedScheduled = [...scheduledAppointments].sort((a, b) => {
              try {
                let dateA = new Date(a.date);
                let dateB = new Date(b.date);
                
                if (isNaN(dateA.getTime())) dateA = new Date();
                if (isNaN(dateB.getTime())) dateB = new Date();
                
                return dateA - dateB;
              } catch (error) {
                return 0;
              }
            });
            setNextAppointment(sortedScheduled[0]);
          } else {
            // No scheduled appointments at all
            setNextAppointment(null);
          }
        }

        // Set medical records
        setMedicalRecords(medicalRecordsRes.data);

        // Set bills
        setBills(billsRes.data);

        // Set health updates from medical records
        const healthUpdatesData = medicalRecordsRes.data
          .filter(record => record.type === 'health_update')
          .map(record => ({
            id: record.id,
            title: record.title,
            value: record.value,
            date: record.createdAt,
            status: record.status
          }));
        setHealthUpdates(healthUpdatesData);

        // Set chart data
        const appointmentsByStatus = { scheduled: 0, completed: 0, cancelled: 0 };
        const appointmentHistory = { labels: [], data: [] };
        const medicalRecordTypes = { prescriptions: 0, labResults: 0, diagnoses: 0, other: 0 };
        const billingStatus = { paid: 0, pending: 0, totalPaid: 0, totalPending: 0 };

        // Process appointments for chart data
        appointmentsRes.data.forEach(appointment => {
          // Appointment status count
          const statusStr = String(appointment.status).toLowerCase();
          if (statusStr === 'scheduled' || statusStr === '0') {
            appointmentsByStatus.scheduled = (appointmentsByStatus.scheduled || 0) + 1;
          } else if (statusStr === 'completed' || statusStr === '1') {
            appointmentsByStatus.completed = (appointmentsByStatus.completed || 0) + 1;
          } else if (statusStr === 'cancelled' || statusStr === '2') {
            appointmentsByStatus.cancelled = (appointmentsByStatus.cancelled || 0) + 1;
          }

          // Appointment history for line chart
          const appointmentDate = appointment.date.split('T')[0]; // Get date part only
          const existingDateIndex = appointmentHistory.labels.indexOf(appointmentDate);
          if (existingDateIndex === -1) {
            // New date entry
            appointmentHistory.labels.push(appointmentDate);
            appointmentHistory.data.push(1);
          } else {
            // Existing date entry, increment the count
            appointmentHistory.data[existingDateIndex] += 1;
          }
        });

        // Process medical records for chart data
        medicalRecordsRes.data.forEach(record => {
          // Medical record type count
          if (record.type === 'prescription') {
            medicalRecordTypes.prescriptions += 1;
          } else if (record.type === 'lab_result') {
            medicalRecordTypes.labResults += 1;
          } else if (record.type === 'diagnosis') {
            medicalRecordTypes.diagnoses += 1;
          } else {
            medicalRecordTypes.other += 1;
          }
        });

        // Process bills for chart data
        billsRes.data.forEach(bill => {
          // Billing status count
          if (bill.status === 'paid') {
            billingStatus.paid += 1;
            billingStatus.totalPaid += bill.amount;
          } else if (bill.status === 'pending') {
            billingStatus.pending += 1;
            billingStatus.totalPending += bill.amount;
          }
        });

        // Update chart data state
        setChartData({
          appointmentsByStatus,
          appointmentHistory,
          medicalRecordTypes,
          billingStatus
        });

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchPatientData();
  }, []);

  useEffect(() => {
    // Debug: Test the doctor name extraction function with various data structures
    const testDoctorNameExtraction = () => {
      const testCases = [
        { case: "String", doctor: "Dr. Smith" },
        { case: "Object with name", doctor: { name: "Dr. Johnson" } },
        { case: "Object with username", doctor: { username: "DrJones" } },
        { case: "Object with firstName/lastName", doctor: { firstName: "Jane", lastName: "Doe" } },
        { case: "Nested user object", doctor: { user: { name: "Dr. Wilson" } } },
        { case: "Nested user with firstName", doctor: { user: { firstName: "Robert", lastName: "Brown" } } },
        { case: "Only ID", doctor: { id: 123 } },
        { case: "Null", doctor: null },
        { case: "Empty object", doctor: {} }
      ];

      console.log("===== DOCTOR NAME EXTRACTION TEST =====");
      testCases.forEach(test => {
        console.log(`Case: ${test.case}`);
        console.log(`  Input:`, test.doctor);
        console.log(`  Output: "${getDoctorName(test.doctor)}"`);
      });
      console.log("======================================");
    };

    // Run test in development only
    if (process.env.NODE_ENV === 'development') {
      testDoctorNameExtraction();
    }
  }, []);

  const handleReschedule = (appointmentId) => {
    navigate(`/patient/book-appointments?reschedule=${appointmentId}`);
  };

  const handleCancel = async (appointmentId) => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      try {
        await patient.cancelAppointment(appointmentId);
        // Refresh appointments after cancellation
        const response = await patient.getAppointments();

        // Updated appointments data
        const appointmentsData = response.data;
        setAppointments(appointmentsData);

        // Update next appointment
        if (appointmentsData.length > 0) {
          // Filter to only scheduled appointments first
          const scheduledAppointments = appointmentsData.filter(apt => {
            const statusStr = String(apt.status).toLowerCase();
            return statusStr === 'scheduled' || statusStr === '0';
          });

          if (scheduledAppointments.length > 0) {
            // Sort scheduled appointments by nearest date
            // Update the handleCancel function's appointment sorting (around line 332-342)
            const sortedScheduled = [...scheduledAppointments].sort((a, b) => {
              try {
                // Combine date and time for more accurate sorting
                const dateStrA = a.date + ' ' + (a.displayTime || a.time || '00:00');
                const dateStrB = b.date + ' ' + (b.displayTime || b.time || '00:00');

                // Use 'let' instead of 'const' to allow reassignment
                let dateA = new Date(dateStrA);
                let dateB = new Date(dateStrB);

                // If parsing fails, fall back to just date
                if (isNaN(dateA.getTime())) {
                  dateA = new Date(a.date);
                }
                if (isNaN(dateB.getTime())) {
                  dateB = new Date(b.date);
                }

                return dateA - dateB;
              } catch (e) {
                // If there's any error, use simple date comparison
                return new Date(a.date) - new Date(b.date);
              }
            });
            setNextAppointment(sortedScheduled[0]);
          } else {
            // If no scheduled appointments, show the nearest one of any type
            // Update the second sort function that handles all appointments
            const sortedAll = [...appointmentsData].sort((a, b) => {
              try {
                // Combine date and time for more accurate sorting
                const dateStrA = a.date + ' ' + (a.displayTime || a.time || '00:00');
                const dateStrB = b.date + ' ' + (b.displayTime || b.time || '00:00');

                // Use 'let' instead of 'const' to allow reassignment
                let dateA = new Date(dateStrA);
                let dateB = new Date(dateStrB);

                // If parsing fails, fall back to just date
                if (isNaN(dateA.getTime())) {
                  dateA = new Date(a.date);
                }
                if (isNaN(dateB.getTime())) {
                  dateB = new Date(b.date);
                }

                return dateA - dateB;
              } catch (e) {
               
                return new Date(a.date) - new Date(b.date);
              }
            });
            setNextAppointment(sortedAll[0]);
          }
        } else {
          setNextAppointment(null);
        }
      } catch (error) {
        console.error('Error canceling appointment:', error);
        alert('Failed to cancel appointment. Please try again.');
      }
    }
  };

  // Function to get display status text
  const getStatusDisplayText = (status) => {
    if (!status && status !== 0) return 'Scheduled';

    const statusStr = String(status).toLowerCase();

    switch (statusStr) {
      case 'scheduled':
      case '0':
        return 'Scheduled';
      case 'completed':
      case '1':
        return 'Completed';
      case 'cancelled':
      case '2':
        return 'Cancelled';
      default:
        return 'Scheduled';
    }
  };

  // Function to get status badge class
  const getStatusBadgeClass = (status) => {
    // Safely handle undefined or null status
    if (!status && status !== 0) return 'status-scheduled';

    // Make sure status is a string
    const statusStr = String(status).toLowerCase();

    switch (statusStr) {
      case 'scheduled':
      case '0':
        return 'status-scheduled';
      case 'completed':
      case '1':
        return 'status-completed';
      case 'cancelled':
      case '2':
        return 'status-cancelled';
      default:
        return 'status-scheduled';
    }
  };
  // Chart preparation functions
  const prepareAppointmentStatusChart = () => {
    return {
      labels: ['Scheduled', 'Completed', 'Cancelled'],
      datasets: [
        {
          data: [
            chartData.appointmentsByStatus.scheduled,
            chartData.appointmentsByStatus.completed,
            chartData.appointmentsByStatus.cancelled
          ],
          backgroundColor: ['#4CAF50', '#2196F3', '#F44336'],
          borderColor: ['#388E3C', '#1976D2', '#D32F2F'],
          borderWidth: 1,
        },
      ],
    };
  };

  const prepareAppointmentHistoryChart = () => {
    // Create arrays for days of the week
    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const appointmentCounts = Array(7).fill(0); // Initialize with zeros
    
    // Count appointments for each day
    if (appointments && appointments.length > 0) {
      appointments.forEach(appointment => {
        try {
          const aptDate = new Date(appointment.date);
          if (!isNaN(aptDate.getTime())) {
            // Get day of week (0 = Sunday, so we'll adjust to make Monday = 0)
            let dayOfWeek = aptDate.getDay(); // 0-6
            dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to 0-6 where 0 is Monday
            appointmentCounts[dayOfWeek]++;
          }
        } catch (error) {
          console.error('Error parsing appointment date:', error);
        }
      });
    }

    return {
      labels: weekdays,
      datasets: [
        {
          label: 'Appointments',
          data: appointmentCounts,
          backgroundColor: '#42A5F5',
          borderColor: '#1976D2',
          borderWidth: 1,
        },
      ],
    };
  };

  // Chart options
  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
        }
      },
      datalabels: {
        formatter: (value, context) => {
          const sum = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
          if (sum === 0) return '';
          const percentage = Math.round((value / sum) * 100);
          return percentage > 5 ? `${percentage}%` : '';
        },
        color: '#fff',
        font: {
          weight: 'bold',
          size: 12
        }
      }
    },
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      datalabels: {
        formatter: (value) => {
          return value > 0 ? value : '';
        },
        color: '#333',
        anchor: 'end',
        align: 'top',
        font: {
          size: 11,
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          precision: 0
        }
      }
    }
  };

  // Helper function to check if an appointment is cancelled
  const isAppointmentCancelled = (status) => {
    if (!status && status !== 0) return false;
    const statusStr = String(status).toLowerCase();
    return statusStr === 'cancelled' || statusStr === '2';
  };

  // Helper function to check if an appointment is completed
  const isAppointmentCompleted = (status) => {
    if (!status && status !== 0) return false;
    const statusStr = String(status).toLowerCase();
    return statusStr === 'completed' || statusStr === '1';
  };

  // Helper function to check if an appointment is scheduled
  const isAppointmentScheduled = (status) => {
    if (!status && status !== 0) return true; // Default to scheduled
    const statusStr = String(status).toLowerCase();
    return statusStr === 'scheduled' || statusStr === '0';
  };

  if (loading) {
    return (
      <PatientLayout>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      </PatientLayout>
    );
  }

  // Determine the name to display
  const displayName = (() => {
    // If patient profile is loaded and has a name, use it
    if (patientProfile && patientProfile.name) {
      return patientProfile.name;
    }
    // Otherwise use the name from auth context if available
    if (user?.name) {
      return user.name;
    }
    // Fall back to username if name is not available
    if (user?.username) {
      return user.username;
    }
    // Default fallback
    return 'Patient';
  })();

  return (
    <PatientLayout>
      <div className="patient-dashboard">
        <div className="welcome-section">
          <h1>Welcome, {displayName}</h1>
          <p>Your health dashboard - {formatDate(new Date())}</p>
        </div>

        <div className="dashboard-summary">
          {/* Upcoming Appointments Card */}
          <div className="summary-card">
            <div className="card-header">
              <h2>Upcoming Appointments</h2>
              <Link to="/patient/my-bookings" className="view-all-btn">View All</Link>
            </div>              <div className="card-content">
              {appointments.length > 0 ? (
                <ul className="summary-list">
                  {appointments
                    .filter(apt => {
                      // Show only scheduled appointments in the summary
                      const statusStr = String(apt.status).toLowerCase();
                      return statusStr === 'scheduled' || statusStr === '0';
                    })
                    .sort((a, b) => {
                      // Sort by nearest date and time with improved error handling
                      try {
                        // Try parsing dates in multiple formats
                        let dateA, dateB;
                        
                        // Try with both date and time
                        dateA = new Date(a.date + ' ' + (a.displayTime || a.time || '00:00'));
                        dateB = new Date(b.date + ' ' + (b.displayTime || b.time || '00:00'));
                        
                        // If parsing fails, try with just date
                        if (isNaN(dateA.getTime())) {
                          dateA = new Date(a.date);
                        }
                        if (isNaN(dateB.getTime())) {
                          dateB = new Date(b.date);
                        }
                        
                        // If still invalid, use current date (to avoid sorting errors)
                        if (isNaN(dateA.getTime())) dateA = new Date();
                        if (isNaN(dateB.getTime())) dateB = new Date();
                        
                        return dateA - dateB;
                      } catch (error) {
                        console.error('Error sorting appointments in summary:', error);
                        return 0; // Keep original order if there's an error
                      }
                    })
                    .slice(0, 1)
                    .map((appointment) => (
                      <li key={appointment.id} className="summary-item">
                        <div className="item-icon appointment-icon">📅</div>
                        <div className="item-details">
                          <h3>Dr. {getDoctorName(appointment.doctor)}</h3>
                          <p>{getSpecialty(appointment.doctor, appointment)}</p>
                          <p>{formatDate(appointment.date)}</p>
                        </div>
                        <div className={`item-status ${getStatusBadgeClass(appointment.status)}`}>
                          {getStatusDisplayText(appointment.status)}
                        </div>
                      </li>
                    ))}
                </ul>
              ) : (
                <div className="no-data">
                  <p>No upcoming appointments.</p>
                </div>
              )}
            </div>
          </div>

          {/* Medical Records Card */}
          <div className="summary-card">
            <div className="card-header">
              <h2>Medical Records</h2>
              <Link to="/patient/medical-records" className="view-all-btn">View All</Link>
            </div>
            <div className="card-content">
              {medicalRecords.length > 0 ? (
                <ul className="summary-list">
                  {medicalRecords.slice(0, 1).map((record) => (
                    <li key={record.id} className="summary-item">
                      <div className="item-icon record-icon">📋</div>
                      <div className="item-details">
                        <h3>{record.title || 'Medical Record'}</h3>
                        <p>Dr. {getDoctorName(record.doctor)}</p>
                        <p>{record.recordDate.split('T')[0]}</p>
                        
                      </div>
                      <div className="item-status">{record.type || 'Record'}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="no-data">
                  <p>No medical records available.</p>
                </div>
              )}
            </div>
          </div>

          {/* Outstanding Bills Card */}
          <div className="summary-card">
            <div className="card-header">
              <h2>All Invoices</h2>
              <Link to="/patient/billings" className="view-all-btn">View All</Link>
            </div>
            <div className="card-content">
              {bills.length > 0 ? (
                <ul className="summary-list">
                  {bills.slice(0, 1).map((bill) => (
                    <li key={bill.id} className="summary-item">
                      <div className="item-icon bill-icon">💳</div>
                      <div className="item-details">
                        <h3>{bill.service}</h3>
                        <p>Date: {formatDate(bill.dueDate)}</p>
                        <p>Rs. {bill.amount.toFixed(2)}</p>
                      </div>
                      <div className="item-status">Paid</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="no-data">
                  <p>No outstanding bills.</p>
                </div>
              )}
            </div>
          </div>
        </div>          {/* Chart Section */}
        

        <div className="detail-cards">          {/* Next Appointment Card */}
          <div className="detail-card next-appointment">
            <div className="card-header">
              <h2>Next Appointment</h2>
              {nextAppointment && (
                <div className={`appointment-status-badge ${getStatusBadgeClass(nextAppointment.status)}`}>
                  {getStatusDisplayText(nextAppointment.status)}
                </div>
              )}
            </div>
            <div className="card-content">
              {nextAppointment ? (
                <div className="appointment-details">
                  <div className="appointment-card-content">
                    <div className="doctor-profile">
                      
                      <div className="doctor-info">
                        <h3>Dr. {getDoctorName(nextAppointment.doctor)}</h3>
                        <p className="specialty">{getSpecialty(nextAppointment.doctor, nextAppointment)}</p>
                      </div>
                    </div>
                    
                    <div className="appointment-divider"></div>
                    
                    <div className="appointment-time">
                      <div className="date-time">
                        <div className="date-icon">📅</div>
                        <div className="date-details">
                          <p className="label">Date</p>
                          <p className="value">{formatDate(nextAppointment.date)}</p>
                        </div>
                      </div>
                      <div className="date-time">
                        <div className="time-icon">⏰</div>
                        <div className="time-details">
                          <p className="label">Time</p>
                          <p className="value">{nextAppointment.displayTime || nextAppointment.time}</p>
                        </div>
                      </div>
                    </div>
                    
                    {nextAppointment.notes && (
                      <div className="appointment-notes">
                        <div className="notes-icon">📝</div>
                        <p>{nextAppointment.notes}</p>
                      </div>
                    )}
                    
                    
                    
                    {isAppointmentScheduled(nextAppointment.status) && (
                      <div className="appointment-actions">
                        <button
                          className="btn btn-outline"
                          onClick={() => handleReschedule(nextAppointment.id)}
                        >
                           Reschedule
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => handleCancel(nextAppointment.id)}
                        >
                           Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="no-data">
                  <div className="no-appointment-icon">📆</div>
                  <p>No upcoming appointments scheduled.</p>
                  <Link to="/patient/book-appointments" className="btn btn-primary">
                    <span>➕</span> Book an Appointment
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Recent Health Updates Card */}
          <div className="detail-card health-updates">
            <div className="card-header">
              <h2>Recent Health Updates</h2>
            </div>
            <div className="card-content">
              {healthUpdates.length > 0 ? (
                <ul className="health-metrics">
                  {healthUpdates.map((update) => (
                    <li key={update.id} className="health-metric-item">
                      <div className="metric-title">{update.title}</div>
                      <div className="metric-value">{update.value}</div>
                      <div className={`metric-status ${update.status.toLowerCase()}`}>
                        {update.status}
                      </div>
                      <div className="metric-date">{formatDate(update.date)}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="no-data">
                  <p>No recent health updates available.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PatientLayout>
  );
};

export default PatientDashboard;
