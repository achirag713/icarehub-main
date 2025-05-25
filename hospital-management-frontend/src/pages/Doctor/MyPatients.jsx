import React, { useState, useEffect } from 'react';
import DoctorLayout from '../../layouts/DoctorLayout';
import Modal from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';
import { doctor } from '../../services/api';
import './MyPatients.css';

const MyPatients = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [medicalHistory, setMedicalHistory] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPatients = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await doctor.getPatients();
        console.log('Patient data:', response.data);
        setPatients(response.data || []);
      } catch (err) {
        setError('Failed to fetch patients.');
        setPatients([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, [user]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleViewPatient = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    if (patient) {
      setSelectedPatient(patient);
      // Optionally fetch medical history from API if needed
      setMedicalHistory([]);
      setActiveTab('details');
      setIsModalOpen(true);
    }
  };

  const getInitials = (name) => {
    return name
      ? name.split(' ').map(word => word[0]).join('').toUpperCase()
      : '';
  };

  const calculateAge = (dob) => {
    if (!dob) return '-';
    
    // Try different date formats
    let birthDate;
    try {
      // Handle ISO format or other common formats
      birthDate = new Date(dob);
      
      // Check if date is valid
      if (isNaN(birthDate.getTime())) {
        return '-';
      }
      
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      // Adjust age if birthday hasn't occurred yet this year
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return `${age} yrs`;
    } catch (e) {
      console.error("Error calculating age:", e);
      return '-';
    }
  };

  const filteredPatients = patients.filter(patient => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (patient.name && patient.name.toLowerCase().includes(searchLower)) ||
      (patient.email && patient.email.toLowerCase().includes(searchLower))
    );
  });

  return (
    <DoctorLayout>
      <div className="my-patients">
        <div className="page-header">
          <h1>My Patients</h1>
          <div className="search-container">
            <input
              type="text"
              placeholder="Search patients..."
              value={searchTerm}
              onChange={handleSearch}
              className="search-input"
            />
          </div>
        </div>
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner" />
          </div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : filteredPatients.length === 0 ? (
          <div className="empty-state">
            <h3>No Patients Found</h3>
            <p>Try adjusting your search criteria</p>
          </div>
        ) : (
          <div className="patients-grid">
            {filteredPatients.map(patient => (
              <div key={patient.id} className="patient-card">
                <div className="patient-header">
                  <div className="patient-avatar">
                    {getInitials(patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`)}
                  </div>
                  <div className="patient-info">
                    <h3 className="patient-name">{patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`}</h3>
                    <span className={`patient-status status-active`}>
                      Active
                    </span>
                  </div>
                </div>                <div className="patient-details">
                  <div className="detail-row">
                    <span className="detail-label">DOB:</span>
                    <span>{patient.dateOfBirth.split('T')[0]}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Gender:</span>
                    <span>{patient.gender || '-'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Phone:</span>
                    <span>{patient.phoneNumber || '-'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Email:</span>
                    <span>{patient.email || '-'}</span>
                  </div>
                </div>
                
                
              </div>
            ))}
          </div>
        )}
        
      </div>
    </DoctorLayout>
  );
};

export default MyPatients;