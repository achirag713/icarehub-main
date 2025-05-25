using System.Security.Cryptography;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using System.Net.Mail;
using System.Net;

namespace HospitalManagement.API.Services
{
    public class OtpService
    {
        private readonly IMemoryCache _cache;
        private readonly IConfiguration _configuration;
        private readonly TimeSpan _otpLifetime = TimeSpan.FromMinutes(10);
        private const string OTP_PREFIX = "OTP_";
        private const string VERIFIED_PREFIX = "VERIFIED_";

        public OtpService(IMemoryCache cache, IConfiguration configuration)
        {
            _cache = cache;
            _configuration = configuration;
        }

        public string GenerateOtp()
        {
            // Generate a 6-digit OTP
            return RandomNumberGenerator.GetInt32(100000, 999999).ToString();
        }

        public async Task<bool> SendOtpAsync(string email, string purpose)
        {
            try
            {
                var otp = GenerateOtp();
                var cacheKey = $"{OTP_PREFIX}{email}_{purpose}";
                
                // Store OTP in cache with expiration
                _cache.Set(cacheKey, otp, _otpLifetime);

                // Send email
                await SendEmailAsync(email, otp, purpose);
                
                return true;
            }
            catch (Exception)
            {
                return false;
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
        }

        public bool IsOtpVerified(string email, string purpose)
        {
            var verifiedKey = $"{VERIFIED_PREFIX}{email}_{purpose}";
            return _cache.TryGetValue(verifiedKey, out bool verified) && verified;
        }

        public void ClearOtpVerification(string email, string purpose)
        {
            var verifiedKey = $"{VERIFIED_PREFIX}{email}_{purpose}";
            _cache.Remove(verifiedKey);
        }

        private async Task SendEmailAsync(string toEmail, string otp, string purpose)
        {
            var emailSettings = _configuration.GetSection("EmailSettings");
            var fromEmail = emailSettings["FromEmail"] ?? throw new Exception("FromEmail not configured");
            var fromPassword = emailSettings["FromPassword"] ?? throw new Exception("FromPassword not configured");
            var smtpHost = emailSettings["SmtpHost"] ?? throw new Exception("SmtpHost not configured");
            var smtpPortStr = emailSettings["SmtpPort"] ?? throw new Exception("SmtpPort not configured");
            
            if (!int.TryParse(smtpPortStr, out var smtpPort))
            {
                throw new Exception("Invalid SmtpPort configuration");
            }

            var subject = purpose == "registration" 
                ? "Complete Your iCareHub Registration" 
                : "Reset Your iCareHub Password";

            var body = purpose == "registration"
                ? $"Your registration OTP is: {otp}. This code will expire in 10 minutes."
                : $"Your password reset OTP is: {otp}. This code will expire in 10 minutes.";

            using var message = new MailMessage(
                from: new MailAddress(fromEmail),
                to: new MailAddress(toEmail));
            
            message.Subject = subject;
            message.Body = body;
            message.IsBodyHtml = true;

            using var client = new SmtpClient(smtpHost, smtpPort);
            client.EnableSsl = true;
            client.Credentials = new NetworkCredential(fromEmail, fromPassword);

            await client.SendMailAsync(message);
        }
    }
}
