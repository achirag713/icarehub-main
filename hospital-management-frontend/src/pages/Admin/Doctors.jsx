import React, { useState, useEffect } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import Button from '../../components/common/Button';
import AddEditDoctorModal from './AddEditDoctorModal';
import { admin } from '../../services/api';
import './Doctors.css';

// List of specializations
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

const AdminDoctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const response = await admin.getDoctors();
      setDoctors(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      setLoading(false);
    }
  };

  const handleAddDoctor = () => {
    setSelectedDoctor(null);
    setIsAddModalOpen(true);
  };

  const handleEditDoctor = (doctor) => {
    setSelectedDoctor(doctor);
    setIsEditModalOpen(true);
  };

  const handleRemoveDoctor = async (doctorId) => {
    if (window.confirm('Are you sure you want to remove this doctor?')) {
      try {
        await admin.deleteDoctor(doctorId);
        setDoctors(doctors.filter(doctor => doctor.id !== doctorId));
      } catch (error) {
        console.error('Error removing doctor:', error);
      }
    }
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedDoctor(null);
  };

  const handleSaveSuccess = () => {
    fetchDoctors();
  };

  const filteredDoctors = doctors.filter(doctor => {
    const matchesSearch = (doctor.username?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (doctor.specialization?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });
  const renderDoctorCard = (doctor) => (
    <div key={doctor.id} className="doctor-card">
      <div className="doctor-header">
        <div className="doctor-info">
          <h2>Dr. {doctor.username}</h2>
          <div className="doctor-specialty-badge">
            {doctor.specialization}
          </div>
        </div>
        <div className="doctor-actions">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleEditDoctor(doctor)}
          >
            Edit
          </Button>
          <Button 
            variant="danger" 
            size="sm"
            onClick={() => handleRemoveDoctor(doctor.id)}
          >
            Remove
          </Button>
        </div>
      </div>
      <div className="doctor-details">
        <p><strong>License: </strong> { doctor.licenseNumber}</p>
        <p><strong>Email: </strong> { doctor.email}</p>
        <p><strong>Phone: </strong> { doctor.phoneNumber}</p>
        <p><strong>Address: </strong> { doctor.address}</p>
      </div>
      
    </div>
  );

  return (
    <AdminLayout>
      <div className="admin-doctors">
        <div className="page-header">
          <h1>Doctors</h1>
          <Button variant="primary" onClick={handleAddDoctor}>
            Add Doctor
          </Button>
        </div>        <div className="filters">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search doctors by name or specialty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner" />
            <p>Loading doctors...</p>
          </div>        ) : filteredDoctors.length > 0 ? (
          <div className="doctors-grid">
            {filteredDoctors.map(renderDoctorCard)}
          </div>
        ) : (
          <div className="no-data-message">
            <p>No doctors found. Add a new doctor to get started.</p>
            <Button 
              variant="primary" 
              onClick={handleAddDoctor}
            >
              Add Your First Doctor
            </Button>
          </div>
        )}        <AddEditDoctorModal
          isOpen={isAddModalOpen}
          onClose={handleCloseAddModal}
          selectedDoctor={null}
          onSaveSuccess={handleSaveSuccess}
        />        <AddEditDoctorModal
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          selectedDoctor={selectedDoctor}
          onSaveSuccess={handleSaveSuccess}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminDoctors;