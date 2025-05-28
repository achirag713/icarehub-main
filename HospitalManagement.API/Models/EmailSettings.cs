using System;

namespace HospitalManagement.API.Models
{
    public class EmailSettings
    {
        public string FromEmail { get; set; }
        public string FromName { get; set; }
        public string FromPassword { get; set; } // Keep for backward compatibility
        public string SmtpHost { get; set; }     // Keep for backward compatibility
        public int SmtpPort { get; set; }        // Keep for backward compatibility
        public bool EnableSsl { get; set; }      // Keep for backward compatibility
        public string SendGridApiKey { get; set; }
    }
}
