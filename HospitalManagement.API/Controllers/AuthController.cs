using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HospitalManagement.API.Data;
using HospitalManagement.API.Models;
using HospitalManagement.API.Services;
using HospitalManagement.API.DTOs;
using System.Security.Claims;
using System.Text;
using System.Collections.Generic;
using HospitalManagement.API.Utilities;

namespace HospitalManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly JwtService _jwtService;
        private readonly IConfiguration _configuration;
        private readonly OtpService _otpService;

        public AuthController(
            ApplicationDbContext context, 
            JwtService jwtService, 
            IConfiguration configuration,
            OtpService otpService)
        {
            _context = context;
            _jwtService = jwtService;
            _configuration = configuration;
            _otpService = otpService;
        }

        [HttpPost("signin")]
        public async Task<IActionResult> Login([FromBody] LoginDto model)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == model.Email);

            if (user == null || !BCrypt.Net.BCrypt.Verify(model.Password, user.PasswordHash))
            {
                return Unauthorized("Invalid email or password");
            }

            var token = _jwtService.GenerateToken(user);

            return Ok(new AuthResponseDto
            {
                Token = token,
                User = new UserDto
                {
                    Id = user.Id,
                    Username = user.Username,
                    Email = user.Email,
                    Role = user.Role
                }
            });
        }

        [HttpPost("signup")]
        public async Task<IActionResult> RegisterPatient([FromBody] RegisterPatientDto model)
        {
            // First check if OTP was verified for this email
            if (!_otpService.IsOtpVerified(model.Email, "registration"))
            {
                return BadRequest(new { message = "Email verification required. Please verify your email first." });
            }

            // Check if email already exists
            if (await _context.Users.AnyAsync(u => u.Email == model.Email))
            {
                _otpService.ClearOtpVerification(model.Email, "registration");
                return BadRequest("Email is already registered");
            }

            // Create user
            var user = new User
            {
                Username = model.Name,
                Email = model.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(model.Password),
                Role = "Patient",
                CreatedAt = TimeUtility.NowIst()
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Parse date of birth
            if (!DateTime.TryParse(model.DateOfBirth, out DateTime dateOfBirth))
            {
                return BadRequest(new { errors = new { DateOfBirth = new[] { "Invalid date format" } } });
            }

            // Create patient
            var patient = new Patient
            {
                User = user,
                UserId = user.Id,
                PhoneNumber = model.PhoneNumber,
                DateOfBirth = dateOfBirth,
                Gender = model.Gender,
                Address = model.Address,
                BloodGroup = model.BloodGroup ?? "Unknown",
                MedicalHistory = model.MedicalHistory ?? "None"
            };

            _context.Patients.Add(patient);
            await _context.SaveChangesAsync();

            // Create notification preferences with default values
            var notificationPreferences = new NotificationPreferences
            {
                Patient = patient,
                PatientId = patient.Id,
                AppointmentReminders = true,
                TestResults = true,
                PrescriptionUpdates = true,
                BillingAlerts = true
            };

            _context.NotificationPreferences.Add(notificationPreferences);
            await _context.SaveChangesAsync();

            // Clear OTP verification now that registration is complete
            _otpService.ClearOtpVerification(model.Email, "registration");

            // Generate JWT token
            var token = _jwtService.GenerateToken(user);

            return Ok(new AuthResponseDto
            {
                Token = token,
                User = new UserDto
                {
                    Id = user.Id,
                    Username = user.Username,
                    Email = user.Email,
                    Role = user.Role
                }
            });
        }

        [HttpPost("register-doctor")]
        public async Task<IActionResult> RegisterDoctor([FromBody] RegisterDoctorDto model)
        {
            // This endpoint would typically be admin-only in a real application
            
            // Check if email already exists
            if (await _context.Users.AnyAsync(u => u.Email == model.Email))
            {
                return BadRequest("Email is already registered");
            }

            // Create user
            var user = new User
            {
                Username = model.Name,
                Email = model.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(model.Password),
                Role = "Doctor",
                CreatedAt = TimeUtility.NowIst()
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Create doctor
            var doctor = new Doctor
            {
                User = user,
                UserId = user.Id,
                Specialization = model.Specialization,
                LicenseNumber = "LIC-" + Guid.NewGuid().ToString().Substring(0, 8), // Generate a temporary license number
                PhoneNumber = model.Phone,
                Address = "Default Address", // Add default address as it's required
                Schedule = new List<Schedule>() // Initialize empty schedule list
            };

            _context.Doctors.Add(doctor);
            await _context.SaveChangesAsync();

            // Generate JWT token
            var token = _jwtService.GenerateToken(user);

            return Ok(new AuthResponseDto
            {
                Token = token,
                User = new UserDto
                {
                    Id = user.Id,
                    Username = user.Username,
                    Email = user.Email,
                    Role = user.Role
                }
            });
        }

        [HttpPost("send-otp")]
        public async Task<IActionResult> SendOtp([FromBody] SendOtpRequest request)
        {
            if (request.Purpose == "registration")
            {
                // Check if email is already registered
                var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
                if (existingUser != null)
                {
                    return BadRequest(new OtpResponse { Success = false, Message = "Email is already registered" });
                }
            }
            else if (request.Purpose == "reset-password")
            {
                // For reset password, verify that the user exists
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
                if (user == null)
                {
                    // Don't reveal that the user doesn't exist
                    return Ok(new OtpResponse { Success = true, Message = "If your email is registered, you will receive an OTP" });
                }
            }

            var success = await _otpService.SendOtpAsync(request.Email, request.Purpose);
            
            if (!success)
            {
                return StatusCode(500, new OtpResponse { Success = false, Message = "Failed to send OTP" });
            }

            return Ok(new OtpResponse { Success = true, Message = "OTP sent successfully" });
        }

        [HttpPost("verify-otp")]
        public IActionResult VerifyOtp([FromBody] VerifyOtpRequest request)
        {
            var isValid = _otpService.VerifyOtp(request.Email, request.Otp, request.Purpose);
            
            if (!isValid)
            {
                return BadRequest(new OtpResponse { Success = false, Message = "Invalid or expired OTP" });
            }

            return Ok(new OtpResponse { Success = true, Message = "OTP verified successfully" });
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            // Verify OTP first
            if (!_otpService.IsOtpVerified(request.Email, "reset-password"))
            {
                return BadRequest(new OtpResponse { Success = false, Message = "Invalid or expired OTP" });
            }

            // Find user
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
            if (user == null)
            {
                _otpService.ClearOtpVerification(request.Email, "reset-password");
                return BadRequest(new OtpResponse { Success = false, Message = "User not found" });
            }

            // Update password
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            user.UpdatedAt = TimeUtility.NowIst();

            await _context.SaveChangesAsync();

            // Clear OTP verification
            _otpService.ClearOtpVerification(request.Email, "reset-password");

            return Ok(new OtpResponse { Success = true, Message = "Password reset successful" });
        }
    }
}