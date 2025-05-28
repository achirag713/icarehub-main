using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using HospitalManagement.API.Data;
using HospitalManagement.API.Models;
using System.Security.Claims;
using HospitalManagement.API.DTOs;

namespace HospitalManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PatientController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public PatientController(ApplicationDbContext context)
        {
            _context = context;
        }

        // Add new endpoint to get all patients (for admin)
        [Authorize(Roles = "Admin")]
        [HttpGet]
        public async Task<IActionResult> GetAllPatients()
        {
            var patientsData = await _context.Patients
                .Include(p => p.User)
                .Include(p => p.Appointments)
                .Include(p => p.Billings)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            var result = patientsData.Select(p => new
            {
                id = p.Id,
                name = p.User.Username,
                email = p.User.Email,
                age = CalculateAge(p.DateOfBirth),
                gender = p.Gender,
                phoneNumber = p.PhoneNumber,
                address = p.Address,
                bloodGroup = p.BloodGroup,
                medicalHistory = p.MedicalHistory,
                lastVisit = p.Appointments.OrderByDescending(a => a.AppointmentDate)
                            .FirstOrDefault()?.AppointmentDate,
                bills = p.Billings.Select(b => new
                {
                    id = b.Id,
                    date = b.CreatedAt,
                    amount = b.Amount,
                    status = b.Status.ToString()
                }).ToList()
            }).ToList();

            return Ok(result);
        }

        // Add endpoint to get a specific patient by ID (for admin)
        [Authorize(Roles = "Admin")]
        [HttpGet("{id}")]
        public async Task<IActionResult> GetPatientById(int id)
        {
            var patient = await _context.Patients
                .Include(p => p.User)
                .Include(p => p.Appointments)
                .Include(p => p.Billings)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (patient == null)
            {
                return NotFound("Patient not found");
            }

            var lastVisitDate = patient.Appointments
                .OrderByDescending(a => a.AppointmentDate)
                .FirstOrDefault()?.AppointmentDate;
                
            return Ok(new
            {
                id = patient.Id,
                name = patient.User.Username,
                email = patient.User.Email,
                age = CalculateAge(patient.DateOfBirth),
                gender = patient.Gender,
                phoneNumber = patient.PhoneNumber,
                address = patient.Address,
                bloodGroup = patient.BloodGroup,
                medicalHistory = patient.MedicalHistory,
                lastVisit = lastVisitDate,
                bills = patient.Billings.Select(b => new
                {
                    id = b.Id,
                    date = b.CreatedAt,
                    amount = b.Amount,
                    status = b.Status.ToString()
                }).ToList()
            });
        }

        // Add endpoint to update a patient by ID (for admin)
        [Authorize(Roles = "Admin")]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdatePatient(int id, [FromBody] PatientUpdateDto model)
        {
            var patient = await _context.Patients
                .Include(p => p.User)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (patient == null)
            {
                return NotFound("Patient not found");
            }

            patient.User.Username = model.Name;
            patient.PhoneNumber = model.PhoneNumber;
            patient.DateOfBirth = model.DateOfBirth;
            patient.Gender = model.Gender;
            patient.Address = model.Address;
            patient.BloodGroup = model.BloodGroup;
            patient.MedicalHistory = model.MedicalHistory;
            patient.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Patient updated successfully" });
        }

        // Add endpoint to delete a patient (for admin)
        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePatient(int id)
        {
            var patient = await _context.Patients
                .Include(p => p.User)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (patient == null)
            {
                return NotFound("Patient not found");
            }

            _context.Patients.Remove(patient);
            _context.Users.Remove(patient.User);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Patient deleted successfully" });
        }

        // Helper method to calculate age
        private int CalculateAge(DateTime dateOfBirth)
        {
            var today = DateTime.Today;
            var age = today.Year - dateOfBirth.Year;
            if (dateOfBirth.Date > today.AddYears(-age)) age--;
            return age;
        }

        // Existing endpoints
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] PatientRegistrationDto model)
        {
            if (await _context.Users.AnyAsync(u => u.Email == model.Email))
            {
                return BadRequest("Email already exists");
            }

            var user = new User
            {
                Username = model.Name,
                Email = model.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(model.Password),
                Role = "Patient"
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var patient = new Patient
            {
                UserId = user.Id,
                User = user,
                PhoneNumber = model.PhoneNumber,
                DateOfBirth = model.DateOfBirth,
                Gender = model.Gender,
                Address = model.Address,
                BloodGroup = model.BloodGroup,
                MedicalHistory = model.MedicalHistory
            };

            _context.Patients.Add(patient);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Patient registration successful" });
        }

        [Authorize(Roles = "Patient")]
        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            var patient = await _context.Patients
                .Include(p => p.User)
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (patient == null)
            {
                return NotFound("Patient not found");
            }

            return Ok(new
            {
                id = patient.Id,
                name = patient.User.Username,
                email = patient.User.Email,
                phoneNumber = patient.PhoneNumber,
                dateOfBirth = patient.DateOfBirth,
                gender = patient.Gender,
                address = patient.Address,
                bloodGroup = patient.BloodGroup,
                medicalHistory = patient.MedicalHistory
            });
        }

        [Authorize(Roles = "Patient")]
        [HttpPut("profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] PatientUpdateDto model)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            var patient = await _context.Patients
                .Include(p => p.User)
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (patient == null)
            {
                return NotFound("Patient not found");
            }

            patient.User.Username = model.Name;
            patient.PhoneNumber = model.PhoneNumber;
            patient.DateOfBirth = model.DateOfBirth;
            patient.Gender = model.Gender;
            patient.Address = model.Address;
            patient.BloodGroup = model.BloodGroup;
            patient.MedicalHistory = model.MedicalHistory;
            patient.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Profile updated successfully" });
        }

        [Authorize(Roles = "Patient")]
        [HttpPut("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto model)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            var user = await _context.Users.FindAsync(userId);

            if (user == null)
                return NotFound("User not found");

            if (!BCrypt.Net.BCrypt.Verify(model.CurrentPassword, user.PasswordHash))
                return BadRequest("Current password is incorrect");

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(model.NewPassword);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Password changed successfully" });
        }

        [Authorize(Roles = "Patient")]
        [HttpDelete("account")]
        public async Task<IActionResult> DeleteAccount()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            var user = await _context.Users.FindAsync(userId);

            if (user == null)
                return NotFound("User not found");

            var patient = await _context.Patients.FirstOrDefaultAsync(p => p.UserId == userId);
            if (patient != null)
            {
                _context.Patients.Remove(patient);
            }

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Account deleted successfully" });
        }

        [Authorize(Roles = "Patient")]
        [HttpGet("notification-preferences")]
        public async Task<IActionResult> GetNotificationPreferences()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            var patient = await _context.Patients
                .Include(p => p.NotificationPreferences)
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (patient == null)
                return NotFound("Patient not found");

            if (patient.NotificationPreferences == null)
            {
                return Ok(new NotificationPreferencesDto
                {
                    AppointmentReminders = false,
                    TestResults = false,
                    PrescriptionUpdates = false,
                    BillingAlerts = false
                });
            }

            return Ok(new NotificationPreferencesDto
            {
                AppointmentReminders = patient.NotificationPreferences.AppointmentReminders,
                TestResults = patient.NotificationPreferences.TestResults,
                PrescriptionUpdates = patient.NotificationPreferences.PrescriptionUpdates,
                BillingAlerts = patient.NotificationPreferences.BillingAlerts
            });
        }

        // Add new endpoint to get chart data for patient dashboard
        [Authorize(Roles = "Patient")]
        [HttpGet("chart-data")]
        public async Task<IActionResult> GetPatientChartData()
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim))
                {
                    return Unauthorized("User ID claim not found");
                }

                var userId = int.Parse(userIdClaim);
                
                // Get the current patient
                var patient = await _context.Patients
                    .Include(p => p.User)
                    .Include(p => p.Appointments)
                    .Include(p => p.MedicalRecords)
                    .FirstOrDefaultAsync(p => p.User.Id == userId);

                if (patient == null)
                {
                    return NotFound("Patient not found");
                }

                // Get all appointments for this patient
                var allAppointments = await _context.Appointments
                    .Where(a => a.PatientId == patient.Id)
                    .ToListAsync();

                // Count appointments by status
                var pendingAppointments = allAppointments.Count(a => a.Status == AppointmentStatus.Scheduled);
                var completedAppointments = allAppointments.Count(a => a.Status == AppointmentStatus.Completed);
                var cancelledAppointments = allAppointments.Count(a => a.Status == AppointmentStatus.Cancelled);

                // Count appointments by month (last 6 months)
                var today = DateTime.Today;
                var sixMonthsAgo = today.AddMonths(-6);
                
                var appointmentsByMonth = new int[6];
                for (int i = 0; i < 6; i++)
                {
                    var monthDate = today.AddMonths(-i);
                    var startOfMonth = new DateTime(monthDate.Year, monthDate.Month, 1);
                    var endOfMonth = startOfMonth.AddMonths(1).AddDays(-1);
                    
                    appointmentsByMonth[5-i] = allAppointments.Count(a => 
                        a.AppointmentDate >= startOfMonth && 
                        a.AppointmentDate <= endOfMonth);
                }

                // Get last 6 months names for labels
                var monthNames = new string[6];
                for (int i = 0; i < 6; i++)
                {
                    monthNames[5-i] = today.AddMonths(-i).ToString("MMM");
                }

                // Get medical records count by category
                var allMedicalRecords = await _context.MedicalRecords
                    .Where(mr => mr.PatientId == patient.Id)
                    .ToListAsync();

                // Categorize medical records based on the actual fields available
                var prescriptions = allMedicalRecords.Count(mr => !string.IsNullOrEmpty(mr.Prescription));
                var labResults = allMedicalRecords.Count(mr => !string.IsNullOrEmpty(mr.LabResults));
                var diagnoses = allMedicalRecords.Count(mr => !string.IsNullOrEmpty(mr.Diagnosis));
                var otherRecords = allMedicalRecords.Count(mr => 
                    string.IsNullOrEmpty(mr.Prescription) && 
                    string.IsNullOrEmpty(mr.LabResults) && 
                    string.IsNullOrEmpty(mr.Diagnosis));

                // Get billing data for payment history
                var allBills = await _context.Bills
                    .Where(b => b.PatientId == patient.Id)
                    .OrderByDescending(b => b.BillDate)
                    .ToListAsync();

                var paidBills = allBills.Count(b => b.Status == BillStatus.Paid);
                var pendingBills = allBills.Count(b => b.Status == BillStatus.Pending);

                // Calculate total amount paid and pending
                var totalPaid = allBills.Where(b => b.Status == BillStatus.Paid).Sum(b => b.Amount);
                var totalPending = allBills.Where(b => b.Status == BillStatus.Pending).Sum(b => b.Amount);                return Ok(new
                {
                    appointmentsByStatus = new
                    {
                        scheduled = pendingAppointments,
                        completed = completedAppointments,
                        cancelled = cancelledAppointments
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [Authorize(Roles = "Patient")]
        [HttpPut("notification-preferences")]
        public async Task<IActionResult> UpdateNotificationPreferences([FromBody] NotificationPreferencesDto model)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            var patient = await _context.Patients.FirstOrDefaultAsync(p => p.UserId == userId);

            if (patient == null)
                return NotFound("Patient not found");

            patient.NotificationPreferences = new NotificationPreferences
            {
                Patient = patient,
                PatientId = patient.Id,
                AppointmentReminders = model.AppointmentReminders,
                TestResults = model.TestResults,
                PrescriptionUpdates = model.PrescriptionUpdates,
                BillingAlerts = model.BillingAlerts
            };

            await _context.SaveChangesAsync();

            return Ok(new { message = "Notification preferences updated successfully" });
        }
    }

    public class PatientRegistrationDto
    {
        public required string Name { get; set; }
        public required string Email { get; set; }
        public required string Password { get; set; }
        public required string PhoneNumber { get; set; }
        public required DateTime DateOfBirth { get; set; }
        public required string Gender { get; set; }
        public required string Address { get; set; }
        public required string BloodGroup { get; set; }
        public required string MedicalHistory { get; set; }
    }

    public class PatientUpdateDto
    {
        public required string Name { get; set; }
        public required string PhoneNumber { get; set; }
        public required DateTime DateOfBirth { get; set; }
        public required string Gender { get; set; }
        public required string Address { get; set; }
        public required string BloodGroup { get; set; }
        public required string MedicalHistory { get; set; }
    }

    public class NotificationPreferencesDto
    {
        public bool AppointmentReminders { get; set; }
        public bool TestResults { get; set; }
        public bool PrescriptionUpdates { get; set; }
        public bool BillingAlerts { get; set; }
    }
}