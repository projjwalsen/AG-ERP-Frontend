const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

export interface PincodeValidationResult {
  valid: boolean;
  message?: string;
  data?: {
    state: string;
    district: string;
    city: string;
    pinCode: string;
  };
}

export const validateIndianPincode = async (
  pinCode: string
): Promise<PincodeValidationResult> => {
  if (!PINCODE_REGEX.test(pinCode)) {
    return {
      valid: false,
      message: "Invalid PIN code format (must be 6 digits starting with 1-9)",
    };
  }

  try {
    const response = await fetch(
      `https://api.postalpincode.in/pincode/${pinCode}`,
      {
        signal: AbortSignal.timeout(5000),
      }
    );

    const result = await response.json();
    const data = result?.[0];

    if (data?.Status !== "Success" || !data?.PostOffice?.length) {
      return {
        valid: false,
        message: "PIN code not found",
      };
    }

    const postOffice = data.PostOffice[0];

    return {
      valid: true,
      data: {
        state: postOffice.State,
        district: postOffice.District,
        city: postOffice.Name,
        pinCode: postOffice.Pincode,
      },
    };
  } catch {
    return {
      valid: false,
      message: "Unable to verify PIN code currently",
    };
  }
};
