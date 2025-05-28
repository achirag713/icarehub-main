using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;
using HospitalManagement.API.Services;
using HospitalManagement.API.DTOs;

namespace HospitalManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TestController : ControllerBase
    {
        private readonly IEmailService _emailService;
        private readonly OtpService _otpService;

        public TestController(IEmailService emailService, OtpService otpService)
        {
            _emailService = emailService;
            _otpService = otpService;
        }

        [HttpPost("send-test-email")]
        public async Task<IActionResult> SendTestEmail([FromBody] TestEmailRequest request)
        {
            try
            {
                var (success, errorMessage) = await _emailService.SendEmailAsync(
                    request.Email,
                    "iCareHub Test Email",
                    "<h1>Test Email from iCareHub</h1><p>This is a test email to verify your email configuration.</p>"
                );
                
                if (success)
                {
                    return Ok(new { Success = true, Message = "Test email sent successfully" });
                }
                
                return StatusCode(500, new { 
                    Success = false, 
                    Message = "Failed to send test email", 
                    Error = errorMessage 
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { 
                    Success = false, 
                    Message = "An error occurred", 
                    Error = ex.Message, 
                    InnerError = ex.InnerException?.Message 
                });
            }
        }

        [HttpPost("test-otp")]
        public async Task<IActionResult> TestOtp([FromBody] TestOtpRequest request)
        {
            try
            {
                var (success, errorMessage) = await _otpService.SendOtpAsync(request.Email, request.Purpose);
                
                if (success)
                {
                    return Ok(new OtpResponse { Success = true, Message = "OTP sent successfully" });
                }
                
                return StatusCode(500, new OtpResponse { 
                    Success = false, 
                    Message = "Failed to send OTP", 
                    DetailedMessage = errorMessage 
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { 
                    Success = false, 
                    Message = "An error occurred", 
                    Error = ex.Message 
                });
            }
        }
    }

    public class TestEmailRequest
    {
        public string Email { get; set; }
    }

    public class TestOtpRequest
    {
        public string Email { get; set; }
        public string Purpose { get; set; } = "test";
    }
}
