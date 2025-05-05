// This file exports the handlers for NextAuth.js.
// It allows NextAuth.js to handle API requests for authentication operations
// like sign-in, sign-out, session management, etc., under the /api/auth path.

import { handlers } from '@/auth'; // Assumes auth.ts is at the root
export const { GET, POST } = handlers;

// If you need to handle specific methods differently or add edge runtime,
// you can export individual handlers:
// export const GET = handlers.GET;
// export const POST = handlers.POST;

// Optional: Specify runtime if needed (e.g., for edge compatibility with certain providers/adapters)
// export const runtime = 'edge'; // 'nodejs' (default) | 'edge'