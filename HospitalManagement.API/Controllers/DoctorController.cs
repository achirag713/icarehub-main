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

        private async Task<int> GetUserIdFromClaims()
        {
            var userIdValue = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdValue))
            {
                throw new UnauthorizedAccessException("User ID not found");
            }

            if (!int.TryParse(userIdValue, out int userId))
            {
                throw new UnauthorizedAccessException("Invalid User ID format");
            }

            // Do some async validation to make this properly async
            var userExists = await _context.Users.AnyAsync(u => u.Id == userId);
            if (!userExists)
            {
                throw new UnauthorizedAccessException("User not found");
            }

            return userId;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllDoctors()
        {
            var doctors = await _context.Doctors
                .Include(d => d.User)
                .Select(d => new {
                    d.Id,
                    Username = d.User != null ? d.User.Username : "Unknown",
                    Email = d.User != null ? d.User.Email : string.Empty,
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

            if (doctor == null || doctor.User == null)
                return NotFound();

            return Ok(new {
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
                            StartTime = new TimeSpan(9, 0, 0),
                            EndTime = new TimeSpan(17, 0, 0)
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

                return CreatedAtAction(nameof(GetDoctor), new { id = doctor.Id }, new {
                    id = doctor.Id,
                    username = user.Username,
                    email = user.Email,
                    specialization = doctor.Specialization,
                    licenseNumber = doctor.LicenseNumber,
                    phoneNumber = doctor.PhoneNumber,
                    address = doctor.Address
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating doctor");
                return StatusCode(500, new { message = "An error occurred while creating the doctor", details = ex.Message });
            }
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateDoctor(int id, [FromBody] UpdateDoctorDto dto)
        {
            try
            {
                var doctor = await _context.Doctors
                    .Include(d => d.User)
                    .FirstOrDefaultAsync(d => d.Id == id);

                if (doctor == null || doctor.User == null)
                    return NotFound();

                // Update user fields
                doctor.User.Username = dto.Username;
                doctor.User.Email = dto.Email;

                // Update doctor fields
                doctor.Specialization = dto.Specialization;
                doctor.LicenseNumber = dto.LicenseNumber;
                doctor.PhoneNumber = dto.PhoneNumber;
                doctor.Address = dto.Address;
                doctor.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                return Ok(new {
                    id = doctor.Id,
                    username = doctor.User.Username,
                    email = doctor.User.Email,
                    specialization = doctor.Specialization,
                    licenseNumber = doctor.LicenseNumber,
                    phoneNumber = doctor.PhoneNumber,
                    address = doctor.Address,
                    message = "Doctor updated successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating doctor");
                return StatusCode(500, "An error occurred while updating the doctor");
            }
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteDoctor(int id)
        {
            var doctor = await _context.Doctors
                .Include(d => d.User)
                .FirstOrDefaultAsync(d => d.Id == id);

            if (doctor == null || doctor.User == null)
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
                    Name = d.User != null ? d.User.Username : "Unknown",
                    Email = d.User != null ? d.User.Email : string.Empty,
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
            try
            {
                int userId = await GetUserIdFromClaims();
                var doctor = await _context.Doctors
                    .Include(d => d.User)
                    .FirstOrDefaultAsync(d => d.UserId == userId);

                if (doctor == null || doctor.User == null)
                {
                    return NotFound("Doctor not found");
                }

                return Ok(new {
                    id = doctor.Id,
                    name = doctor.User.Username,
                    email = doctor.User.Email,
                    specialization = doctor.Specialization,
                    licenseNumber = doctor.LicenseNumber,
                    phoneNumber = doctor.PhoneNumber,
                    address = doctor.Address
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(ex.Message);
            }
        }

        [HttpPut("profile")]
        [Authorize(Roles = "Doctor")]
        public async Task<IActionResult> UpdateProfile([FromBody] DoctorProfileUpdateDto model)
        {
            try
            {
                int userId = await GetUserIdFromClaims();
                var doctor = await _context.Doctors
                    .Include(d => d.User)
                    .FirstOrDefaultAsync(d => d.UserId == userId);

                if (doctor == null || doctor.User == null)
                {
                    return NotFound("Doctor not found");
                }

                // Update only allowed fields
                doctor.User.Username = model.Name;
                doctor.User.Email = model.Email;
                doctor.PhoneNumber = model.PhoneNumber;
                doctor.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                return Ok(new {
                    id = doctor.Id,
                    name = doctor.User.Username,
                    email = doctor.User.Email,
                    specialization = doctor.Specialization,
                    licenseNumber = doctor.LicenseNumber,
                    phoneNumber = doctor.PhoneNumber,
                    address = doctor.Address,
                    message = "Profile updated successfully"
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating doctor profile");
                return StatusCode(500, "An error occurred while updating the profile");
            }
        }
        
        [HttpGet("patients/{id}")]
[Authorize(Roles = "Doctor")]
public async Task<IActionResult> GetPatientById(int id)
{
    try
    {
        _logger.LogInformation($"GetPatientById called for patient ID: {id}");
        
        var userId = await GetUserIdFromClaims();
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
            name = patient.User?.Username ?? "Unknown Patient", // Handle possible null User
            email = patient.User?.Email ?? string.Empty,
            phoneNumber = patient.PhoneNumber ?? string.Empty,
            gender = patient.Gender ?? string.Empty,
            dateOfBirth = patient.DateOfBirth,
            address = patient.Address ?? string.Empty,
            bloodGroup = patient.BloodGroup ?? string.Empty
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
            try 
            {
                int userId = await GetUserIdFromClaims();
                var doctor = await _context.Doctors.FirstOrDefaultAsync(d => d.UserId == userId);
                
                if (doctor == null)
                {
                    return NotFound("Doctor not found");
                }
                
                var appointments = await _context.Appointments
                    .Where(a => a.DoctorId == doctor.Id)
                    .Include(a => a.Patient)
                        .ThenInclude(p => p.User)
                    .ToListAsync();

                var relationships = await _context.DoctorPatientRelationships
                    .Where(dp => dp.DoctorId == doctor.Id)
                    .Include(dp => dp.Patient)
                        .ThenInclude(p => p.User)
                    .ToListAsync();
                    
                // Process the data in memory where we can safely handle nulls
                var patientsFromAppointments = appointments
                    .Where(a => a.Patient != null && a.Patient.User != null)
                    .Select(a => a.Patient)
                    .Distinct();
                    
                var patientsFromRelationships = relationships
                    .Where(r => r.Patient != null && r.Patient.User != null)
                    .Select(r => r.Patient)
                    .Distinct();

                // Combine and process all patients
                var allPatients = patientsFromAppointments
                    .Union(patientsFromRelationships, new PatientComparer())
                    .Select(p => new {
                        id = p!.Id, // We know p is not null due to the Where clause above
                        name = p.User!.Username ?? "Unknown Patient", // We know User is not null
                        email = p.User.Email ?? string.Empty,
                        phoneNumber = p.PhoneNumber ?? string.Empty,
                        gender = p.Gender ?? string.Empty,
                        dateOfBirth = p.DateOfBirth,
                        address = p.Address ?? string.Empty,
                        bloodGroup = p.BloodGroup ?? string.Empty,
                        medicalHistory = p.MedicalHistory ?? string.Empty
                    })
                    .ToList();
                
                return Ok(allPatients);
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized("Invalid user authentication");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetDoctorPatients");
                return StatusCode(500, "An error occurred while fetching patients");
            }
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

                // Get appointments for this doctor with full patient details
                var appointments = await _context.Appointments
                    .Where(a => a.DoctorId == doctor.Id)
                    .Include(a => a.Patient)
                        .ThenInclude(p => p!.User)
                    .Include(a => a.Doctor)
                        .ThenInclude(d => d!.User)
                    .Select(a => new {
                        Id = a.Id,
                        AppointmentDate = a.AppointmentDate,
                        DisplayTime = string.IsNullOrEmpty(a.DisplayTime) ? a.AppointmentDate.ToString("h:mm tt") : a.DisplayTime,
                        Status = (int)a.Status,
                        Reason = string.IsNullOrEmpty(a.Reason) ? string.Empty : a.Reason,
                        PatientId = a.PatientId,
                        PatientName = (a.Patient != null && a.Patient.User != null) 
                    ? string.IsNullOrEmpty(a.Patient.User.Username) ? "Unknown Patient" : a.Patient.User.Username 
                    : "Unknown Patient",
                PatientEmail = (a.Patient != null && a.Patient.User != null) 
                    ? string.IsNullOrEmpty(a.Patient.User.Email) ? string.Empty : a.Patient.User.Email 
                    : string.Empty,
                PatientPhone = (a.Patient != null) 
                    ? string.IsNullOrEmpty(a.Patient.PhoneNumber) ? string.Empty : a.Patient.PhoneNumber 
                    : string.Empty,
                Notes = string.IsNullOrEmpty(a.Notes) ? string.Empty : a.Notes,
                Doctor = new {
                    Id = a.Doctor != null ? a.Doctor.Id : doctor.Id,
                    Name = (a.Doctor != null && a.Doctor.User != null)
                        ? string.IsNullOrEmpty(a.Doctor.User.Username) ? "Unknown Doctor" : a.Doctor.User.Username
                        : "Unknown Doctor",
                    Specialization = a.Doctor != null 
                        ? string.IsNullOrEmpty(a.Doctor.Specialization) ? string.Empty : a.Doctor.Specialization 
                        : string.Empty
                }
            })
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
            try
            {
                int userId = await GetUserIdFromClaims();
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
                    .ToListAsync();

                // Process records in memory where we can safely handle nulls
                var processedRecords = records.Select(r => new {
                    id = r.Id,
                    recordDate = r.RecordDate,
                    diagnosis = r.Diagnosis ?? string.Empty,
                    prescription = r.Prescription ?? string.Empty,
                    labResults = r.LabResults ?? string.Empty,
                    notes = r.Notes ?? string.Empty,
                    filePath = r.FilePath ?? string.Empty,
                    doctorName = (r.Doctor?.User?.Username) ?? "Unknown Doctor"
                }).ToList();
                    
                return Ok(processedRecords);
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized("Invalid user authentication");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting medical records for patient {PatientId}", patientId);
                return StatusCode(500, "An error occurred while fetching medical records");
            }
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