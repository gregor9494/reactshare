# ReactShare Backend MVP Plan

**Goal:** Implement the core backend functionality for the ReactShare MVP using Next.js API Routes, `next-auth` for authentication, and Supabase for the database, user authentication backend, and file storage.

**MVP Feature Scope:**

1.  **Authentication:** Email/Password signup & login.
2.  **Video Input:** Allow users to submit a source video URL (e.g., YouTube) and upload their reaction video file.
3.  **Storage:** Store user credentials (via Supabase Auth), reaction metadata (source URL, storage path), and the uploaded reaction video file.
4.  **Basic Data Retrieval:** An API endpoint for the logged-in user to fetch their list of created reactions (metadata).
5.  **(Deferred):** Video processing (combining source + reaction) and automated posting to social platforms will be deferred to keep the initial backend minimal. We will store the necessary information to enable this later.

**Technology Stack:**

*   **Framework:** Next.js (App Router, API Routes)
*   **Authentication:** `next-auth` (v5/Auth.js) integrated with Supabase Auth.
*   **Database:** Supabase PostgreSQL
*   **Storage:** Supabase Storage
*   **Deployment:** Vercel (recommended)

**Detailed Plan:**

1.  **Setup Supabase Project:**
    *   Create a new project on [supabase.com](https://supabase.com).
    *   Navigate to the Authentication section and ensure the Email provider is enabled. Note down your Supabase Project URL and `anon` key (and later the `service_role` key for server-side operations).
    *   Define the necessary database tables (see Step 5).
    *   Create a Storage bucket (e.g., `reaction-videos`) and configure access policies (see Step 6).

2.  **Install Dependencies:**
    *   Add `next-auth` and the Supabase client library to your project:
        ```bash
        pnpm add next-auth@beta @supabase/supabase-js
        # Or using npm: npm install next-auth@beta @supabase/supabase-js
        # Or using yarn: yarn add next-auth@beta @supabase/supabase-js
        ```
    *   *(Note: Using `next-auth@beta` for the latest features compatible with Next.js App Router)*

3.  **Configure `next-auth`:**
    *   Create environment variables for Supabase URL, keys, and `next-auth` secret (`.env.local`).
    *   Create `auth.config.ts` (for middleware/edge compatibility if needed) and `auth.ts` (main configuration).
    *   In `auth.ts`, configure the `CredentialsProvider` to validate email/password against Supabase Auth (`signInWithPassword`).
    *   Configure the Supabase adapter for `next-auth` (or manually handle user profile creation/updates in your Supabase DB upon signup/login).
    *   Create `middleware.ts` at the root level to protect specific routes (e.g., `/dashboard/*`, `/api/reactions/*`) using `next-auth`.

4.  **Create API Routes (in `app/api/`):**
    *   `auth/[...nextauth]/route.ts`: The standard catch-all route to handle `next-auth` operations (signin, signout, session management).
    *   `auth/signup/route.ts` (Custom Route):
        *   `POST`: Handles new user registration. Takes email/password, uses Supabase client (`signUp`), potentially sends verification email (Supabase handles this).
    *   `reactions/route.ts`:
        *   `POST`: Creates a new reaction metadata record. Requires authentication (checked via `auth()` from `next-auth`). Takes `source_video_url`, validates input. Saves metadata (user ID, source URL, initial status) to the Supabase `reactions` table. Returns the new reaction ID or object.
        *   `GET`: Fetches the list of reactions for the authenticated user. Requires authentication. Queries the Supabase `reactions` table based on `user_id`.
    *   `reactions/upload/route.ts`:
        *   `POST`: Handles the upload of the reaction video file. Requires authentication. Could either:
            *   Generate a signed upload URL for Supabase Storage, allowing the client to upload directly (preferred for simplicity and scalability).
            *   Receive the file stream/blob and upload it to Supabase Storage from the server.

5.  **Database Schema (Supabase SQL):**
    ```sql
    -- Profiles table to store public user data (optional, links to auth.users)
    CREATE TABLE profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      username TEXT UNIQUE,
      full_name TEXT,
      avatar_url TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Reactions table
    CREATE TABLE reactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      source_video_url TEXT NOT NULL,
      reaction_video_storage_path TEXT, -- Path in Supabase Storage bucket
      title TEXT,
      description TEXT, -- For later use
      status TEXT DEFAULT 'pending_upload', -- e.g., pending_upload, uploaded, processing, published, error
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Enable Row Level Security (RLS)
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

    -- Policies for profiles (example: users can view all profiles, update their own)
    CREATE POLICY "Allow public read access" ON profiles FOR SELECT USING (true);
    CREATE POLICY "Allow individual update access" ON profiles FOR UPDATE USING (auth.uid() = id);

    -- Policies for reactions (users can only manage their own reactions)
    CREATE POLICY "Allow individual read access" ON reactions FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Allow individual insert access" ON reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Allow individual update access" ON reactions FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "Allow individual delete access" ON reactions FOR DELETE USING (auth.uid() = user_id);

    -- Function to automatically update 'updated_at' timestamp
    CREATE OR REPLACE FUNCTION handle_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Trigger for reactions table
    CREATE TRIGGER on_reaction_updated
      BEFORE UPDATE ON reactions
      FOR EACH ROW
      EXECUTE PROCEDURE handle_updated_at();

    -- Trigger for profiles table
    CREATE TRIGGER on_profile_updated
      BEFORE UPDATE ON profiles
      FOR EACH ROW
      EXECUTE PROCEDURE handle_updated_at();
    ```

6.  **Storage Setup (Supabase):**
    *   Create a bucket named `reaction-videos`.
    *   Define Storage Policies (similar to RLS for database) to ensure authenticated users can only upload to paths associated with their `user_id` and read their own files. Example policy for uploads:
        ```sql
        -- Allow authenticated users to upload to a folder named after their user_id
        CREATE POLICY "Allow authenticated uploads" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'reaction-videos' AND auth.uid()::text = (storage.foldername(name))[1]);
        -- Allow authenticated users to read their own files
        CREATE POLICY "Allow authenticated reads" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'reaction-videos' AND auth.uid()::text = (storage.foldername(name))[1]);
        ```
        *(Note: This policy assumes files are stored like `user_id/filename.mp4`. Adjust the path structure and policy as needed.)*

7.  **Frontend Integration:**
    *   Wrap the application layout (`app/layout.tsx`) with `SessionProvider` from `next-auth/react`.
    *   Update Login/Signup forms (`app/login/page.tsx`, `app/signup/page.tsx`) to use `signIn` (from `next-auth/react`) or call the custom signup API route. Use `react-hook-form` for validation.
    *   Protect dashboard pages by checking session status using `useSession` or server-side checks.
    *   In the "Create Reaction" page (`app/dashboard/create/page.tsx`), add form elements for the source URL and a file input for the reaction video.
    *   On form submission:
        1.  Call the `POST /api/reactions` endpoint to create the metadata record.
        2.  If successful, get the reaction ID and either:
            *   Call `POST /api/reactions/upload` to get a signed URL.
            *   Use the signed URL to upload the file directly from the browser using `fetch` or a library like `@supabase/storage-js`.
            *   Update the reaction record status upon successful upload (might require another API call or be handled by the upload endpoint).
    *   In the Dashboard/Library (`app/dashboard/page.tsx`, `app/dashboard/library/page.tsx`), fetch reaction data from `GET /api/reactions` and display it.

**Diagram:**

```mermaid
graph TD
    subgraph Frontend (Next.js App - /Users/grzegorzgaworowski/Desktop/reactshare/reactshare/app)
        Login[app/login] -- Credentials --> API_Auth{API: /api/auth/...};
        Signup[app/signup] -- Credentials --> API_Signup(API: /api/auth/signup);
        Create[app/dashboard/create] -- Source URL --> API_Reactions_POST(API: /api/reactions POST);
        Create -- Request Signed URL --> API_Upload(API: /api/reactions/upload POST);
        Create -- Upload File w/ Signed URL --> SupabaseStorage[(Supabase Storage)];
        Dashboard[app/dashboard/library] -- Request Reactions --> API_Reactions_GET(API: /api/reactions GET);
    end

    subgraph Backend (Next.js API Routes - /Users/grzegorzgaworowski/Desktop/reactshare/reactshare/app/api)
        API_Auth -- Validate/Session --> NextAuthLib(next-auth);
        API_Signup -- Create User --> SupabaseAuth[(Supabase Auth)];
        API_Reactions_POST -- Auth Check --> NextAuthLib;
        API_Reactions_POST -- Create Metadata --> SupabaseDB[(Supabase DB)];
        API_Upload -- Auth Check --> NextAuthLib;
        API_Upload -- Generate Signed URL --> SupabaseStorage;
        API_Reactions_GET -- Auth Check --> NextAuthLib;
        API_Reactions_GET -- Fetch Data --> SupabaseDB;
    end

    subgraph External Services (Supabase)
        NextAuthLib -- Auth Ops --> SupabaseAuth;
        SupabaseDB;
        SupabaseStorage;
    end

    NextAuthLib -- Session --> Frontend;
    SupabaseDB -- Reaction Data --> API_Reactions_GET;
    SupabaseStorage -- Signed URL --> API_Upload;

    style Frontend fill:#f9f,stroke:#333,stroke-width:2px;
    style Backend fill:#ccf,stroke:#333,stroke-width:2px;
    style External Services fill:#cfc,stroke:#333,stroke-width:2px;