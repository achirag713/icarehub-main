using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using SendGrid;
using SendGrid.Helpers.Mail;
using HospitalManagement.API.Models;

namespace HospitalManagement.API.Services
{
    public class EmailService : IEmailService
    {
        private readonly EmailSettings _emailSettings;
        private readonly bool _debugMode;        public EmailService(IOptions<EmailSettings> emailSettings)
        {
            _emailSettings = emailSettings.Value;
            // Set to false for production, true for testing
            _debugMode = false; // Enable actual email sending
        }

        public async Task<(bool Success, string ErrorMessage)> SendEmailAsync(string to, string subject, string htmlContent)
        {
            try
            {
                // Debug mode for local testing - bypasses actual email sending
                if (_debugMode)
                {
                    Console.WriteLine($"DEBUG MODE: Email would be sent to {to}");
                    Console.WriteLine($"DEBUG MODE: Subject: {subject}");
                    Console.WriteLine($"DEBUG MODE: Content: {htmlContent}");
                    return (true, null);
                }

                var apiKey = _emailSettings.SendGridApiKey;                // Debug logging for SendGrid settings
                Console.WriteLine($"SendGrid API Key starts with: {apiKey.Substring(0, 10)}...");
                Console.WriteLine($"Sending email from: {_emailSettings.FromEmail}");
                Console.WriteLine($"Sending to: {to}");
                
                var client = new SendGridClient(apiKey);
                
                var fromName = !string.IsNullOrEmpty(_emailSettings.FromName) 
                    ? _emailSettings.FromName 
                    : "iCareHub Support";
                
                var from = new EmailAddress(_emailSettings.FromEmail, fromName);
                var toAddress = new EmailAddress(to);
                
                var msg = MailHelper.CreateSingleEmail(
                    from, 
                    toAddress, 
                    subject, 
                    plainTextContent: StripHtmlTags(htmlContent), 
                    htmlContent: htmlContent
                );
                
                Console.WriteLine("Attempting to send email via SendGrid...");
                var response = await client.SendEmailAsync(msg);
                
                if (response.IsSuccessStatusCode)
                {
                    Console.WriteLine($"Email sent successfully to {to}");
                    return (true, null);
                }
                
                // Log more details about the failed response
                var responseBody = await response.Body.ReadAsStringAsync();
                var errorMessage = $"SendGrid error: Status {response.StatusCode}, Response: {responseBody}";
                Console.WriteLine(errorMessage);
                
                return (false, errorMessage);
            }
            catch (Exception ex)
            {
                var errorMessage = $"Email sending failed: {ex.Message}";
                if (ex.InnerException != null)
                {
                    errorMessage += $" Inner exception: {ex.InnerException.Message}";
                }
                
                Console.WriteLine(errorMessage);
                return (false, errorMessage);
            }
        }

        private string StripHtmlTags(string html)
        {
            if (string.IsNullOrEmpty(html))
            {
                return string.Empty;
            }
            
            // Simple method to remove HTML tags for plain text version
            return System.Text.RegularExpressions.Regex.Replace(html, "<[^>]*>", "");
        }
    }
}