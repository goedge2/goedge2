export const OTP_CODE_LENGTH = 6;

export function shouldAutoVerifyOTP(otpCode: string, isSubmitting: boolean): boolean {
  return !isSubmitting && otpCode.length === OTP_CODE_LENGTH;
}
