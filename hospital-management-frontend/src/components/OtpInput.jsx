import React, { useState, useRef, useEffect } from 'react';

const OtpInput = ({ length = 6, onComplete }) => {
  const [otp, setOtp] = useState(new Array(length).fill(""));
  const [timer, setTimer] = useState(60); // 60 seconds timer
  const inputs = useRef([]);
  const timerRef = useRef(null);

  // Focus on first input and start timer when component mounts
  useEffect(() => {
    if (inputs.current[0]) {
      inputs.current[0].focus();
    }
    startTimer();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startTimer = () => {
    setTimer(60);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      setTimer((prevTimer) => {
        if (prevTimer <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prevTimer - 1;
      });
    }, 1000);
  };

  const handleChange = (e, index) => {
    const value = e.target.value;
    if (isNaN(value)) return; // Only allow numbers

    const newOtp = [...otp];
    // Take only the last entered digit
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // If we have a value, move to next input
    if (value && index < length - 1) {
      inputs.current[index + 1].focus();
    }

    // Check if OTP is complete
    const otpValue = newOtp.join("");
    if (otpValue.length === length && onComplete) {
      onComplete(otpValue);
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (!otp[index]) {
        // Move to previous input if current input is empty
        if (index > 0) {
          inputs.current[index - 1].focus();
          
          // Clear the previous input
          const newOtp = [...otp];
          newOtp[index - 1] = "";
          setOtp(newOtp);
        }
      } else {
        // Clear current input
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputs.current[index - 1].focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputs.current[index + 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text");
    const pastedDigits = pastedData.slice(0, length).split("");
    
    const newOtp = [...otp];
    pastedDigits.forEach((digit, index) => {
      if (index < length && !isNaN(digit)) {
        newOtp[index] = digit;
        if (inputs.current[index]) {
          inputs.current[index].value = digit;
        }
      }
    });
    
    setOtp(newOtp);
    
    // Focus appropriate input
    const focusIndex = Math.min(length - 1, pastedDigits.length);
    inputs.current[focusIndex]?.focus();

    // Check if OTP is complete
    const otpValue = newOtp.join("");
    if (otpValue.length === length && onComplete) {
      onComplete(otpValue);
    }
  };

  const handleFocus = (e) => {
    e.target.select();
  };

  return (
    <>
      <div className="otp-input-container">
        {otp.map((digit, index) => (
          <input
            key={index}
            type="text"
            inputMode="numeric"
            maxLength={1}
            pattern="\d*"
            value={digit}
            onChange={(e) => handleChange(e, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onFocus={handleFocus}
            onPaste={index === 0 ? handlePaste : undefined}
            ref={(ref) => (inputs.current[index] = ref)}
            className="otp-input"
            aria-label={`Digit ${index + 1} of verification code`}
          />
        ))}
      </div>
      <div className="resend-timer">
        {timer > 0 ? (
          <span>Resend code in {timer}s</span>
        ) : null}
      </div>
    </>
  );
};

export default OtpInput;
