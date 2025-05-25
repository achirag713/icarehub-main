namespace HospitalManagement.API.DTOs
{
    public class SendOtpRequest
    {
        public required string Email { get; set; }
        public required string Purpose { get; set; } // "registration" or "reset-password"
    }

    public class VerifyOtpRequest
    {
        public required string Email { get; set; }
        public required string Otp { get; set; }
        public required string Purpose { get; set; }
    }

    public class ResetPasswordRequest
    {
        public required string Email { get; set; }
        public required string Otp { get; set; }
        public required string NewPassword { get; set; }
    }

    public class OtpResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}
