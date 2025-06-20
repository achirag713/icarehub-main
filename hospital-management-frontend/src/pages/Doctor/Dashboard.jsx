import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DoctorLayout from "../../layouts/DoctorLayout";
import { FaUserInjured, FaCalendarCheck } from "react-icons/fa";
import { formatDate } from "../../utils/dateUtils";
import { useAuth } from "../../context/AuthContext";
import { doctor } from "../../services/api";
import { useLoading } from "../../context/LoadingContext";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Doughnut } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import "./Dashboard.css";

// Register Chart.js components
ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels);

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showLoading, hideLoading } = useLoading();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    appointments: [],
    patients: [],
    recentMedicalRecords: [],
  });

  useEffect(() => {
    console.log(
      "Dashboard: Current user data from useAuth (initial or change):",
      user
    );
  }, [user]);

  useEffect(() => {
    console.log("Dashboard: Current user data from useAuth:", user);
    // Call the fetchDashboardData function defined above
    fetchDashboardData();
  }, [user, showLoading, hideLoading, doctor]); // Added 'doctor' to dependency array

  // Fetch dashboard data function
  const fetchDashboardData = async () => {
    try {
      showLoading();
      setLoading(true);
      console.log("Dashboard: Fetching appointments and patients data...");
      console.log("Dashboard: Current user:", user);

      // Fetch appointments and patients in parallel
      const [appointmentsResponse, patientsResponse] = await Promise.all([
        doctor.getAppointments(),
        doctor.getPatients(),
      ]);

      console.log(
        "Dashboard: Raw appointments response:",
        appointmentsResponse
      );
      console.log("Dashboard: Raw patients response:", patientsResponse);

      // Enhanced data normalization for appointments with better debugging
      let appointments = [];
      if (appointmentsResponse && appointmentsResponse.data) {
        if (Array.isArray(appointmentsResponse.data)) {
          appointments = appointmentsResponse.data.map((appointment) => {
            // Debug each appointment to see its structure
            console.log(
              "Processing appointment object structure:",
              appointment
            );

            // Ensure each appointment has proper patient information with nested property checks
            const patient = appointment.patient || {};
            const patientUser = patient.user || {};

            // Create a comprehensive patientName with multiple fallbacks
            const patientName =
              appointment.patientName ||
              patient.name ||
              patientUser.username ||
              patientUser.name ||
              (patient.firstName && patient.lastName
                ? `${patient.firstName} ${patient.lastName}`
                : null) ||
              (patient.firstName ? patient.firstName : null) ||
              (patient.lastName ? patient.lastName : null) ||
              "Unknown Patient";

            // Better handling of date and time formatting
            let displayTime = null;
            if (appointment.displayTime) {
              displayTime = appointment.displayTime;
            } else if (appointment.time) {
              displayTime = appointment.time;
            } else if (appointment.appointmentDate) {
              try {
                displayTime = new Date(
                  appointment.appointmentDate
                ).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                });
              } catch (e) {
                console.error("Error formatting appointment time:", e);
                displayTime = "N/A";
              }
            }

            return {
              ...appointment,
              patientName: patientName,
              displayTime: displayTime,
              // Ensure date field exists for filtering
              date:
                appointment.date ||
                appointment.appointmentDate ||
                new Date().toISOString(),
            };
          });
        } else {
          console.error(
            "Dashboard: Appointments data is not an array:",
            appointmentsResponse.data
          );
        }
      }

      // Enhanced data normalization for patients with better debugging
      let patients = [];
      if (patientsResponse && patientsResponse.data) {
        if (Array.isArray(patientsResponse.data)) {
          patients = patientsResponse.data.map((patient) => {
            // Debug each patient to see its structure
            console.log("Processing patient object structure:", patient);

            const patientUser = patient.user || {};

            // Create a comprehensive patient name with multiple fallbacks
            const patientName =
              patient.name ||
              patientUser.username ||
              patientUser.name ||
              (patient.firstName && patient.lastName
                ? `${patient.firstName} ${patient.lastName}`
                : null) ||
              (patient.firstName ? patient.firstName : null) ||
              (patient.lastName ? patient.lastName : null) ||
              "Unknown Patient";

            return {
              ...patient,
              name: patientName,
              email: patient.email || patientUser.email || "No email provided",
            };
          });
        } else {
          console.error(
            "Dashboard: Patients data is not an array:",
            patientsResponse.data
          );
        }
      }

      // Debug logs for normalized data
      console.log("Dashboard: Normalized appointments data:", appointments);
      console.log("Dashboard: Normalized patients data:", patients);

      // Get recent medical records for the first few patients
      const recentRecords = await Promise.all(
        patients.slice(0, 5).map(async (patient) => {
          if (!patient.id) {
            console.warn(
              "Dashboard: Skipping medical records fetch for patient with no ID:",
              patient
            );
            return null;
          }
          try {
            const recordsResponse = await doctor.getMedicalRecords(patient.id);
            console.log(
              `Dashboard: Medical records for patient ${patient.id}:`,
              recordsResponse.data
            );

            // Normalize medical records to ensure patient names are present
            if (Array.isArray(recordsResponse.data)) {
              return recordsResponse.data.map((record) => ({
                ...record,
                patientName:
                  record.patientName || patient.name || "Unknown Patient",
              }));
            }
            return recordsResponse.data;
          } catch (err) {
            if (err?.response?.status === 404) {
              console.log(
                `Dashboard: No medical records found for patient ${patient.id}`
              );
              return null;
            }
            console.error(
              `Dashboard: Error fetching medical records for patient ${patient.id}:`,
              err
            );
            return null; // Don't throw, just return null to continue with other patients
          }
        })
      );

      // Flatten the array of arrays from recentRecords
      const flattenedRecentRecords = recentRecords.filter(Boolean).flat();
      console.log(
        "Dashboard: Flattened recent medical records:",
        flattenedRecentRecords
      );

      setDashboardData({
        appointments: appointments,
        patients: patients,
        recentMedicalRecords: flattenedRecentRecords,
      });
      setError(null);
    } catch (err) {
      console.error("Dashboard: Error fetching dashboard data:", err);
      setError("Failed to load dashboard data. " + (err.message || ""));
    } finally {
      setLoading(false);
      hideLoading();
    }
  };

  const handleViewAppointmentDetails = (appointmentId) => {
    // Navigate to the appointments page, potentially with a state or query param
    // to highlight or open details for a specific appointment if that functionality exists.
    // For now, just navigate to the main appointments page.
    navigate("/doctor/appointments");
  };

  const handleViewAllAppointments = () => {
    navigate("/doctor/appointments");
  };

  const handleViewPatientDetails = (patientId) => {
    // Navigate to the specific patient details page if available, otherwise to the patient list
    navigate("/doctor/my-patients"); // Assuming my-patients list view is the destination
  };

  const handleViewAllPatients = () => {
    navigate("/doctor/my-patients");
  };

  const handleViewMedicalRecordDetails = (recordId) => {
    // Assuming a medical record detail page exists or records are viewed in a modal on the records page
    navigate(`/doctor/medical-records`); // Navigate to the medical records list page
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (window.confirm("Are you sure you want to cancel this appointment?")) {
      try {
        // Use the actual API call to cancel appointment
        await doctor.cancelAppointment(appointmentId);

        // After successful cancellation, re-fetch dashboard data to update the list
        // A more optimized approach would be to update state locally if the API returns the updated appointment
        fetchDashboardData();
      } catch (error) {
        console.error("Dashboard: Error canceling appointment:", error);
        // TODO: Add proper error handling in UI
      }
    }
  };

  if (loading) {
    return (
      <DoctorLayout>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      </DoctorLayout>
    );
  }

  if (error) {
    return (
      <DoctorLayout>
        <div className="error-container">
          <p>{error}</p>
        </div>
      </DoctorLayout>
    );
  }

  return (
    <DoctorLayout>
      <div className="doctor-dashboard">
        <div className="welcome-section">
          <div className="welcome-content">
            {/* Display doctor's name from user object with null checks and fallbacks */}
            <h1>
              Welcome, Dr.{" "}
              {user?.username ||
                user?.doctor?.user?.username ||
                user?.name ||
                user?.doctor?.name ||
                "Doctor"}
              !
            </h1>
            <p>
              Here's an overview of your practice for{" "}
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>

            {/* Quick stats for the doctor */}
            <div className="quick-stats">
              <div className="stat-item">
                <div className="stat-icon">
                  <FaCalendarCheck />
                </div>
                <div className="stat-info">
                  <span className="stat-value">
                    {dashboardData.appointments?.filter((appointment) => {
                      if (!appointment.date) return false;
                      try {
                        const appointmentDate = new Date(appointment.date);
                        const today = new Date();
                        return (
                          appointmentDate.getFullYear() === today.getFullYear() &&
                          appointmentDate.getMonth() === today.getMonth() &&
                          appointmentDate.getDate() === today.getDate() &&
                          appointment.status === 0 // Only show scheduled appointments (status 0)
                        );
                      } catch (e) {
                        return false;
                      }
                    }).length || 0}
                  </span>
                  <span className="stat-label">Today's Scheduled Appointments</span>
                </div>
              </div>

              <div className="stat-item">
                <div className="stat-icon">
                  <FaUserInjured />
                </div>
                <div className="stat-info">
                  <span className="stat-value">
                    {dashboardData.patients?.length || 0}
                  </span>
                  <span className="stat-label">Patients Total</span>
                </div>
              </div>

              <div className="stat-item">
                <div className="stat-icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                  </svg>
                </div>
                <div className="stat-info">
                  <span className="stat-value">
                    {dashboardData.recentMedicalRecords?.length || 0}
                  </span>
                  <span className="stat-label">Recent Records</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-grid">
          {/* Today's Appointments */}
          <div className="dashboard-card">
            <h3>
              <FaCalendarCheck style={{ marginRight: "10px" }} />
              Today's Appointments
            </h3>
            {/* Check if appointments array exists and has items before mapping */}
            {dashboardData.appointments &&
            dashboardData.appointments.length > 0 ? (
              (() => {
                // Filter today's appointments
                const todayAppointments = dashboardData.appointments
                  .filter((appointment) => {
                    // Try to get a valid date from either appointmentDate or date field
                    const dateToUse = appointment.appointmentDate || appointment.date;
                    
                    if (!dateToUse) {
                      console.warn(
                        "Dashboard: Skipping appointment due to missing date:",
                        appointment
                      );
                      return false;
                    }

                    try {
                      const appointmentDate = new Date(dateToUse);
                      const today = new Date();

                      // Compare year, month, and day only, and check for scheduled status (0)
                      return (
                        appointmentDate.getFullYear() === today.getFullYear() &&
                        appointmentDate.getMonth() === today.getMonth() &&
                        appointmentDate.getDate() === today.getDate() &&
                        appointment.status === 0 // Only show scheduled appointments
                      );
                    } catch (e) {
                      console.error(
                        "Dashboard: Error parsing appointment date:",
                        dateToUse,
                        e
                      );
                      return false; // Filter out appointments with invalid dates
                    }
                  })
                  // Sort appointments by display time or appointment date
                  .sort((a, b) => {
                    const timeA = a.displayTime || a.time || new Date(a.appointmentDate).toLocaleTimeString();
                    const timeB = b.displayTime || b.time || new Date(b.appointmentDate).toLocaleTimeString();
                    return timeA.localeCompare(timeB);
                  });

                if (todayAppointments.length > 0) {
                  return (
                    <>
                      <div className="appointment-count-badge">
                        {todayAppointments.length} appointment
                        {todayAppointments.length !== 1 ? "s" : ""} today
                      </div>
                      <ul className="appointment-list">
                        {todayAppointments.map((appointment) => {
                          // Format the patient name with comprehensive fallbacks
                          const patientName =
                            appointment.patientName ||
                            (appointment.patient?.user?.username) ||
                            (appointment.patient?.user?.name) ||
                            (appointment.patient?.name) ||
                            `${appointment.patient?.firstName || ""} ${
                              appointment.patient?.lastName || ""
                            }`.trim() ||
                            "Unknown Patient";

                          // Format time display with proper fallbacks
                          const timeDisplay = 
                            appointment.displayTime ||
                            appointment.time ||
                            (appointment.appointmentDate
                              ? new Date(appointment.appointmentDate).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                })
                              : "N/A");

                          return (
                            <li
                              key={appointment.id}
                              className="appointment-item"
                            >
                              <div className="appointment-info">
                                <strong>Patient:</strong> {patientName}
                                <br />
                                <strong>Date:</strong>{" "}
                                {new Date(appointment.appointmentDate || appointment.date).toLocaleDateString()}
                                <br />
                                <strong>Time:</strong> {timeDisplay}
                                <br />
                                <strong>Purpose:</strong>{" "}
                                {appointment.purpose ||
                                  appointment.reason ||
                                  "Consultation"}
                              </div>
                              
                            </li>
                          );
                        })}
                      </ul>
                      <button
                        className="btn-view-all"
                        onClick={handleViewAllAppointments}
                      >
                        View All Appointments
                      </button>
                    </>
                  );
                }

                return (
                  <div className="empty-state">
                    <div className="empty-state-icon">📅</div>
                    <p className="empty-state-message">
                      No appointments scheduled for today
                    </p>
                    <p className="empty-state-submessage">
                      Your schedule is clear
                    </p>
                  </div>
                );
              })()
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">📅</div>
                <p className="empty-state-message">No appointments scheduled</p>
                <p className="empty-state-submessage">Your calendar is empty</p>
              </div>
            )}
          </div>

          {/* Recent Patients */}
          <div className="dashboard-card">
            <h3>
              <FaUserInjured style={{ marginRight: "10px" }} />
              Recent Patients
            </h3>
            {/* Check if patients array exists and has items before mapping */}
            {dashboardData.patients && dashboardData.patients.length > 0 ? (
              <>
                <ul className="patient-list">
                  {dashboardData.patients.slice(0, 1).map((patient) => {
                    // Debug the patient object structure
                    console.log("Patient object structure:", patient);

                    // Create a comprehensive patient name from various possible properties
                    const patientName =
                      patient.name ||
                      patient.patientName ||
                      (patient.user && patient.user.username
                        ? patient.user.username
                        : null) ||
                      (patient.user && patient.user.name
                        ? patient.user.name
                        : null) ||
                      `${patient.firstName || ""}${
                        patient.firstName ? " " : ""
                      }${patient.lastName || ""}`.trim() ||
                      "Unknown Patient";

                    // Format patient email with fallback
                    const patientEmail =
                      patient.email ||
                      (patient.user ? patient.user.email : null) ||
                      "No email provided";

                    return (
                      <li key={patient.id} className="patient-item">
                        
                          
                            <ul>
                              <li>
                              <strong>Name:</strong> {patientName}
                              </li>
                              <li>
                                <strong>Email:</strong>    {patientEmail}
                              </li>
                            </ul>
                            
                          
                        
                      </li>
                    );
                  })}
                </ul>
                <button
                  className="btn-view-all"
                  onClick={handleViewAllPatients}
                >
                  View All Patients
                </button>
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">👤</div>
                <p className="empty-state-message">No recent patients</p>
                <p className="empty-state-submessage">
                  Your patient list is empty
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </DoctorLayout>
  );
};

export default DoctorDashboard;
