using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using HospitalManagement.API.Data;
using HospitalManagement.API.Models;
using HospitalManagement.API.DTOs;
using System.Security.Claims;
using System.Collections.Generic;
using System;
using System.Linq;
using System.Threading.Tasks;
using HospitalManagement.API.Utilities;
using Microsoft.Extensions.Logging;

namespace HospitalManagement.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class DoctorController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<DoctorController> _logger;

        public DoctorController(ApplicationDbContext context, ILogger<DoctorController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllDoctors()
        {
            var doctors = await _context.Doctors
                .Include(d => d.User)
                .Select(d => new
                {
                    d.Id,
                    d.User.Username,
                    d.User.Email,
                    d.Specialization,
                    d.LicenseNumber,
                    d.PhoneNumber,
                    d.Address
                })
                .ToListAsync();

            return Ok(doctors);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetDoctor(int id)
        {
            var doctor = await _context.Doctors
                .Include(d => d.User)
                .FirstOrDefaultAsync(d => d.Id == id);

            if (doctor == null)
                return NotFound();

            return Ok(new
            {
                doctor.Id,
                doctor.User.Username,
                doctor.User.Email,
                doctor.Specialization,
                doctor.LicenseNumber,
                doctor.PhoneNumber,
                doctor.Address
            });
        }

        [Authorize(Roles = "Admin")]
        [HttpPost]
        public async Task<IActionResult> CreateDoctor([FromBody] CreateDoctorDto dto)
        {
            try
            {
                if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
                {
                    return BadRequest("Email already exists");
                }

                var user = new User
                {
                    Username = dto.Username,
                    Email = dto.Email,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                    Role = "Doctor"
                };

                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                var doctor = new Doctor
                {
                    UserId = user.Id,
                    User = user,
                    Specialization = dto.Specialization,
                    LicenseNumber = dto.LicenseNumber,
                    PhoneNumber = dto.PhoneNumber,
                    Address = dto.Address,
                    Schedule = new List<Schedule>()
                };

                // Add default schedules if none provided
                if (dto.Schedules == null || !dto.Schedules.Any())
                {
                    // Default schedule: Monday to Friday, 9 AM to 5 PM
                    for (DayOfWeek day = DayOfWeek.Monday; day <= DayOfWeek.Friday; day++)
                    {
                        doctor.Schedule.Add(new Schedule
                        {
                            Doctor = doctor,
                            DayOfWeek = day,
                            StartTime = new TimeSpan(9, 0, 0), // 9 AM
                            EndTime = new TimeSpan(17, 0, 0)   // 5 PM
                        });
                    }
                }
                else
                {
                    // Add custom schedules
                    foreach (var scheduleDto in dto.Schedules)
                    {
                        doctor.Schedule.Add(new Schedule
                        {
                            Doctor = doctor,
                            DayOfWeek = scheduleDto.DayOfWeek,
                            StartTime = scheduleDto.StartTime,
                            EndTime = scheduleDto.EndTime
                        });
                    }
                }

                _context.Doctors.Add(doctor);
                await _context.SaveChangesAsync();

                // Return a simplified object to avoid circular reference issues
                return CreatedAtAction(nameof(GetDoctor), new { id = doctor.Id }, new {
                    id = doctor.Id,
                    username = doctor.User.Username,
                    email = doctor.User.Email,
                    specialization = doctor.Specialization,
                    licenseNumber = doctor.LicenseNumber,
                    phoneNumber = doctor.PhoneNumber,
                    address = doctor.Address
                });
            }
            catch (Exception ex)
            {
                // Log error details
                Console.WriteLine($"Error creating doctor: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                
                // Return error details
                return StatusCode(500, new { message = "An error occurred while creating the doctor", details = ex.Message });
            }
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateDoctor(int id, [FromBody] UpdateDoctorDto dto)
        {
            var doctor = await _context.Doctors
                .Include(d => d.User)
                .FirstOrDefaultAsync(d => d.Id == id);

            if (doctor == null)
                return NotFound();

            if (doctor.User != null)
            {
                doctor.User.Username = dto.Username;
                doctor.User.Email = dto.Email;
            }

            doctor.User.Username = dto.Username;
            doctor.Specialization = dto.Specialization;
            doctor.LicenseNumber = dto.LicenseNumber;
            doctor.PhoneNumber = dto.PhoneNumber;
            doctor.Address = dto.Address;
            doctor.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new // Consider returning a DTO or a specific success message instead of the full entity
    {
        id = doctor.Id,
        username = doctor.User?.Username, // Use null-conditional operator
        email = doctor.User?.Email,       // Use null-conditional operator
        specialization = doctor.Specialization,
        licenseNumber = doctor.LicenseNumber,
        phoneNumber = doctor.PhoneNumber,
        address = doctor.Address,
        message = "Doctor updated successfully" // Added a success message
    });
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteDoctor(int id)
        {
            var doctor = await _context.Doctors
                .Include(d => d.User)
                .FirstOrDefaultAsync(d => d.Id == id);

            if (doctor == null)
                return NotFound();

            _context.Doctors.Remove(doctor);
            _context.Users.Remove(doctor.User);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpGet("specialization/{specialization?}")]
        public async Task<IActionResult> GetDoctorsBySpecialization(string specialization = null)
        {
            IQueryable<Doctor> query = _context.Doctors.Include(d => d.User);
            
            if (!string.IsNullOrWhiteSpace(specialization))
            {
                query = query.Where(d => d.Specialization.ToLower() == specialization.ToLower());
            }
            
            var doctors = await query
                .Select(d => new
                {
                    d.Id,
                    Name = d.User.Username,
                    d.User.Email,
                    d.Specialization,
                    d.LicenseNumber,
                    d.PhoneNumber,
                    d.Address
                })
                .ToListAsync();

            return Ok(doctors);
        }

        [HttpGet("profile")]
        [Authorize(Roles = "Doctor")]
        public async Task<IActionResult> GetProfile()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            var doctor = await _context.Doctors
                .Include(d => d.User)
                .FirstOrDefaultAsync(d => d.UserId == userId);

            if (doctor == null)
            {
                return NotFound("Doctor not found");
            }

            return Ok(new
            {
                id = doctor.Id,
                name = doctor.User.Username,
                email = doctor.User.Email,
                specialization = doctor.Specialization,
                licenseNumber = doctor.LicenseNumber,
                phoneNumber = doctor.PhoneNumber,
                address = doctor.Address
            });
        }

        [HttpPut("profile")]
        [Authorize(Roles = "Doctor")]
        public async Task<IActionResult> UpdateProfile([FromBody] DoctorProfileUpdateDto model)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            var doctor = await _context.Doctors
                .Include(d => d.User)
                .FirstOrDefaultAsync(d => d.UserId == userId);

            if (doctor == null)
            {
                return NotFound("Doctor not found");
            }

            // Update only allowed fields: Name, Email, Phone Number
            if (doctor.User != null)
            {
                doctor.User.Username = model.Name; // Map Name from DTO to Username in User entity
                doctor.User.Email = model.Email; // Update Email
            }

            doctor.PhoneNumber = model.PhoneNumber; // Update Phone Number directly on Doctor entity

            // Specialization, LicenseNumber, Address are NOT updated by the doctor
            // doctor.Specialization = model.Specialization; // Removed
            // doctor.LicenseNumber = model.LicenseNumber; // Removed
            // doctor.Address = model.Address; // Removed

            doctor.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Return updated profile data or a success message
            return Ok(new
            {
                id = doctor.Id,
                name = doctor.User?.Username, // Use null-conditional operator
                email = doctor.User?.Email,       // Use null-conditional operator
                specialization = doctor.Specialization, // Include for display, but not updated here
                licenseNumber = doctor.LicenseNumber,   // Include for display, but not updated here
                phoneNumber = doctor.PhoneNumber,
                address = doctor.Address, // Include for display, but not updated here
                message = "Profile updated successfully"
            });
        }
        
        [HttpGet("patients/{id}")]
[Authorize(Roles = "Doctor")]
public async Task<IActionResult> GetPatientById(int id)
{
    try
    {
        _logger.LogInformation($"GetPatientById called for patient ID: {id}");
        
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
        var doctor = await _context.Doctors.FirstOrDefaultAsync(d => d.UserId == userId);
        
        if (doctor == null)
        {
            return NotFound("Doctor not found");
        }

        // Get the patient from the database, including the User
        var patient = await _context.Patients
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.Id == id);
            
        if (patient == null)
        {
            return NotFound($"Patient with ID {id} not found");
        }
        
        // Check if this doctor has access to this patient
        bool hasAccess = await _context.Appointments
            .AnyAsync(a => a.DoctorId == doctor.Id && a.PatientId == patient.Id);
            
        if (!hasAccess)
        {
            // Also check doctor-patient relationships
            hasAccess = await _context.DoctorPatientRelationships
                .AnyAsync(dp => dp.DoctorId == doctor.Id && dp.PatientId == patient.Id);
                
            if (!hasAccess)
            {
                return Forbid();
            }
        }
        
        return Ok(new {
            id = patient.Id,
            name = patient.User.Username, // This is the key property the frontend is looking for
            email = patient.User.Email,
            phoneNumber = patient.PhoneNumber,
            gender = patient.Gender,
            dateOfBirth = patient.DateOfBirth,
            address = patient.Address,
            bloodGroup = patient.BloodGroup
        });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, $"Error in GetPatientById for patient ID: {id}");
        return StatusCode(500, "An error occurred while fetching patient details");
    }
}

        [HttpGet("patients")]
        [Authorize(Roles = "Doctor")]
        public async Task<IActionResult> GetDoctorPatients()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            var doctor = await _context.Doctors.FirstOrDefaultAsync(d => d.UserId == userId);
            
            if (doctor == null)
            {
                return NotFound("Doctor not found");
            }
            
            // Get patients from appointments
            var patientsFromAppointments = await _context.Appointments
                .Where(a => a.DoctorId == doctor.Id)
                .Select(a => a.Patient)
                .Distinct()
                .Include(p => p.User)
                .ToListAsync();
                
            // Get patients from doctor-patient relationships
            var patientsFromRelationships = await _context.DoctorPatientRelationships
                .Where(dp => dp.DoctorId == doctor.Id)
                .Include(dp => dp.Patient)
                    .ThenInclude(p => p.User)
                .Select(dp => dp.Patient)
                .ToListAsync();
                
            // Combine and deduplicate
            var allPatients = patientsFromAppointments
                .Union(patientsFromRelationships, new PatientComparer())
                .Select(p => new {
                    id = p.Id,
                    name = p.User.Username,
                    email = p.User.Email,
                    phoneNumber = p.PhoneNumber,
                    gender = p.Gender,
                    dateOfBirth = p.DateOfBirth,
                    address = p.Address,
                    bloodGroup = p.BloodGroup,
                    medicalHistory = p.MedicalHistory
                })
                .ToList();
            
            return Ok(allPatients);
        }

        [HttpGet("appointments")]
        [Authorize(Roles = "Doctor")]
        public async Task<IActionResult> GetDoctorAppointments()
        {
            try
            {
                // Get the user ID from the claims
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
                
                _logger.LogInformation($"GetDoctorAppointments called - User ID: {userId}, Role: {userRole}");

                if (string.IsNullOrEmpty(userId))
                {
                    _logger.LogWarning("User ID not found in claims");
                    return Unauthorized("User ID not found");
                }

                // Parse the user ID to an integer
                if (!int.TryParse(userId, out int parsedUserId))
                {
                    _logger.LogError($"Invalid User ID format in claims: {userId}");
                    return Unauthorized("Invalid User ID format");
                }

                // Find the doctor record
                var doctor = await _context.Doctors
                    .FirstOrDefaultAsync(d => d.UserId == parsedUserId);

                if (doctor == null)
                {
                    _logger.LogWarning($"Doctor not found for User ID: {parsedUserId}");
                    return NotFound("Doctor not found");
                }

                _logger.LogInformation($"Found doctor with ID: {doctor.Id}");

                // Get appointments for this doctor
                var appointments = await _context.Appointments
                    .Include(a => a.Patient)
                    .Where(a => a.DoctorId == doctor.Id)
                    .OrderByDescending(a => a.AppointmentDate)
                    .ToListAsync();

                _logger.LogInformation($"Found {appointments.Count} appointments for doctor {doctor.Id}");

                return Ok(appointments);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetDoctorAppointments");
                return StatusCode(500, "An error occurred while fetching appointments");
            }
        }

        [HttpGet("medical-records/{patientId}")]
        [Authorize(Roles = "Doctor")]
        public async Task<IActionResult> GetPatientMedicalRecords(int patientId)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            var doctor = await _context.Doctors.FirstOrDefaultAsync(d => d.UserId == userId);
            
            if (doctor == null)
            {
                return NotFound("Doctor not found");
            }
            
            // Check if doctor has access to this patient's records
            var hasAccess = await _context.Appointments
                .AnyAsync(a => a.DoctorId == doctor.Id && a.PatientId == patientId);
                
            if (!hasAccess)
            {
                var relationship = await _context.DoctorPatientRelationships
                    .AnyAsync(dp => dp.DoctorId == doctor.Id && dp.PatientId == patientId);
                    
                if (!relationship)
                {
                    return Forbid();
                }
            }
            
            var records = await _context.MedicalRecords
                .Where(r => r.PatientId == patientId)
                .Include(r => r.Doctor)
                    .ThenInclude(d => d.User)
                .OrderByDescending(r => r.RecordDate)
                .Select(r => new {
                    id = r.Id,
                    recordDate = r.RecordDate,
                    diagnosis = r.Diagnosis,
                    prescription = r.Prescription,
                    labResults = r.LabResults,
                    notes = r.Notes,
                    filePath = r.FilePath,
                    doctorName = r.Doctor.User.Username
                })
                .ToListAsync();
                
            return Ok(records);
        }
    }

    // Helper class for comparing patients
    public class PatientComparer : IEqualityComparer<Patient?>
    {
        public bool Equals(Patient? x, Patient? y)
        {
            if (x == null || y == null)
                return false;
            return x.Id == y.Id;
        }
        
        public int GetHashCode(Patient? obj)
        {
            if (obj == null)
                return 0;
            return obj.Id.GetHashCode();
        }
    }
}