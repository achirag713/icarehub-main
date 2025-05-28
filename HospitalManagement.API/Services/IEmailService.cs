using System;
using System.Threading.Tasks;

namespace HospitalManagement.API.Services
{
    public interface IEmailService
    {
        Task<(bool Success, string ErrorMessage)> SendEmailAsync(string to, string subject, string htmlContent);
    }
}
