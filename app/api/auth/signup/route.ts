import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// Schema for signup input validation
const signupSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters long' }),
});

export async function POST(request: Request) {
  // Initialize Supabase client inside the handler to ensure env vars are loaded
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase URL or Anon Key missing for signup route.');
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  // Create Supabase client instance for this request
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  let requestBody;
  try {
    requestBody = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Validate input
  const validationResult = signupSchema.safeParse(requestBody);
  if (!validationResult.success) {
    // Combine Zod error messages for a clearer response
    const errorMessages = validationResult.error.errors.map(e => e.message).join(', ');
    return NextResponse.json({ error: `Invalid input: ${errorMessages}` }, { status: 400 });
  }

  const { email, password } = validationResult.data;

  try {
    // Attempt to sign up the user with Supabase
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      // You can add options here, like redirect URLs or metadata
      // options: {
      //   emailRedirectTo: `${request.headers.get('origin')}/auth/callback`,
      // }
    });

    if (error) {
      console.error('Supabase Signup Error:', error.message);
      // Provide a generic error or map specific Supabase errors
      // e.g., "User already registered", "Password should be stronger"
      return NextResponse.json({ error: error.message || 'Signup failed' }, { status: 400 });
    }

    // Handle cases where user might exist but confirmation is needed, etc.
    // Supabase v2 signUp returns data containing the user object if signup is successful
    // or if the user exists but is unconfirmed. Check data.user properties.
    if (data.user) {
        // Check if email confirmation is required in your Supabase settings
        // Check if email confirmation is required in your Supabase settings
        // A user identity exists once they confirm their email or if confirmation is disabled.
        const needsConfirmation = !data.user.email_confirmed_at && data.user.identities && data.user.identities.length === 0;

        if (needsConfirmation) {
             console.log(`Signup successful for ${email}, confirmation email sent.`);
             return NextResponse.json({ message: 'Signup successful. Please check your email to confirm your account.' }, { status: 201 });
        } else {
            // If email confirmation is disabled or user already confirmed
            console.log(`Signup successful and user confirmed (or confirmation disabled) for ${email}.`);
            return NextResponse.json({ message: 'Signup successful. You can now log in.' }, { status: 201 });
        }
    }
    // This 'else' corresponds to 'if (data.user)'
    // It might indicate an issue if no error was thrown but no user data is present.
    console.error('Supabase signup returned no error and no user data.');
    return NextResponse.json({ error: 'An unexpected issue occurred during signup.' }, { status: 500 });

  } catch (e) {
    console.error('Unexpected error during signup:', e);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}