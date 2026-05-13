import { NextRequest } from 'next/server';
// Professional paths using relative navigation
import connectDB from '../../../../lib/db';
import { AuthService } from '../../../../modules/auth/auth.service';
import { sendResponse } from '../../../../utils/apiResponse';

/**
 * POST: /api/auth/register
 * Handles the multi-tenant registration for a new shop and its admin user.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Establish Database Connection
    await connectDB();
    
    // 2. Extract Data from Request Body
    const body = await req.json();
    
    // 3. Process Registration via AuthService
    const result = await AuthService.registerTenant(body);
    
    // 4. Send Standardized Success Response
    // We send 'message' as the second argument
    return sendResponse(
      true, 
      'Shop and Owner registered successfully', 
      result, 
      201
    );

  } catch (error: any) {
    console.error("Registration API Error:", error);

    // 5. Send Standardized Error Response
    // We ensure error.message is passed as the 'message' parameter
    return sendResponse(
      false, 
      error.message || 'An unexpected error occurred during registration', 
      null, 
      400
    );
  }
}