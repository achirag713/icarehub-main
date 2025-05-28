using System;
using System.Security.Cryptography;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using System.Threading.Tasks;

namespace HospitalManagement.API.Services
{
    public class OtpService
    {
        private readonly IMemoryCache _cache;
        private readonly IEmailService _emailService;
        private readonly TimeSpan _otpLifetime = TimeSpan.FromMinutes(10);
        private const string OTP_PREFIX = "OTP_";
        private const string VERIFIED_PREFIX = "VERIFIED_";

        public OtpService(IMemoryCache cache, IEmailService emailService)
        {
            _cache = cache;
            _emailService = emailService;
        }

        public string GenerateOtp()
        {
            // Generate a 6-digit OTP
            return RandomNumberGenerator.GetInt32(100000, 999999).ToString();
        }

        public async Task<(bool Success, string ErrorMessage)> SendOtpAsync(string email, string purpose)
        {
            try
            {
                var otp = GenerateOtp();
                var cacheKey = $"{OTP_PREFIX}{email}_{purpose}";
                
                // Store OTP in cache with expiration
                _cache.Set(cacheKey, otp, _otpLifetime);

                // Prepare email content
                string subject = purpose == "registration" 
                    ? "iCareHub Registration OTP" 
                    : "iCareHub Password Reset OTP";
                
                string body = $@"
                <html>
                <head>
                    <style>
                        body {{ font-family: Arial, sans-serif; }}
                        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                        .otp-box {{ background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; }}
                        .footer {{ font-size: 12px; color: #666; margin-top: 20px; }}
                    </style>
                </head>
                <body>
                    <div class='container'>
                        <h2>Your iCareHub {purpose} OTP</h2>
                        <p>Please use the following OTP to complete your {purpose}:</p>
                        <div class='otp-box'>{otp}</div>
                        <p>This OTP is valid for 10 minutes.</p>
                        <p>If you didn't request this OTP, please ignore this email.</p>
                        <div class='footer'>
                            This is an automated message. Please do not reply to this email.
                        </div>
                    </div>
                </body>
                </html>";

                // Send email using SendGrid
                var (success, errorMessage) = await _emailService.SendEmailAsync(email, subject, body);
                
                if (!success)
                {
                    return (false, $"Failed to send OTP email: {errorMessage}");
                }
                
                return (true, null);
            }
            catch (Exception ex)
            {
                return (false, $"Error sending OTP: {ex.Message}");
            }
        }

        public bool VerifyOtp(string email, string otp, string purpose)
        {
            var otpKey = $"{OTP_PREFIX}{email}_{purpose}";
            
            if (_cache.TryGetValue(otpKey, out string? storedOtp) && storedOtp == otp)
            {
                // Remove OTP after successful verification
                _cache.Remove(otpKey);
                
                // Store verification status
                var verifiedKey = $"{VERIFIED_PREFIX}{email}_{purpose}";
                _cache.Set(verifiedKey, true, _otpLifetime);
                return true;
            }
            
            return false;
        }        public bool IsOtpVerified(string email, string purpose)
        {
            var verifiedKey = $"{VERIFIED_PREFIX}{email}_{purpose}";
            return _cache.TryGetValue(verifiedKey, out bool verified) && verified;
        }
        
        public void ClearOtpVerification(string email, string purpose)
        {
            var verifiedKey = $"{VERIFIED_PREFIX}{email}_{purpose}";
            _cache.Remove(verifiedKey);
        }
    }
}
