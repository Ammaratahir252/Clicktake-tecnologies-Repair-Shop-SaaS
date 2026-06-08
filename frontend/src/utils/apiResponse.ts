import { NextResponse } from 'next/server';

/**
 * Standardized API Response Helper
 * This ensures every API call returns the same structure: { success, message, data }
 * * @param success - Boolean indicating if the operation worked
 * @param message - A human-readable description of the result
 * @param data    - The actual data payload (optional)
 * @param status  - HTTP status code (default is 200 OK)
 */
export const sendResponse = (
  success: boolean,
  message: string,
  data: any = null,
  status: number = 200
) => {
  return NextResponse.json(
    {
      success,
      message,
      data,
    },
    { status }
  );
};