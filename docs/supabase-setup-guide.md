# Supabase Setup Guide for ReactShare

## Problem
You're getting a `TypeError: fetch failed` error when trying to access social accounts because your current Supabase project doesn't exist or is inaccessible.

## Solution Steps

### 1. Create a New Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click "New Project"
4. Choose your organization
5. Enter project details:
   - **Name**: `reactshare` (or any name you prefer)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose the region closest to you
6. Click "Create new project"
7. Wait for the project to be created (this takes a few minutes)

### 2. Get Your Project Credentials

1. Once the project is ready, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (starts with `https://`)
   - **anon/public key** (starts with `eyJ`)
   - **service_role key** (starts with `eyJ`)

### 3. Update Environment Variables

1. Open your `.env.local` file
2. Replace the placeholder values with your actual Supabase credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 4. Set Up Database Tables

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy the entire contents of `scripts/setup-database.sql`
4. Paste it into the SQL editor
5. Click "Run" to execute the script

This will create all the necessary tables:
- `social_accounts`
- `social_shares`
- `youtube_playlists`
- `youtube_playlist_videos`
- `folders`

### 5. Configure Authentication (Optional)

If you want to use Supabase Auth instead of NextAuth:

1. Go to **Authentication** → **Settings**
2. Configure your site URL: `http://localhost:3000`
3. Add redirect URLs if needed

### 6. Test the Connection

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000/dashboard/social`
3. The error should be resolved, and you should see an empty social accounts page

### 7. Enable Row Level Security (RLS)

The setup script automatically enables RLS and creates basic policies. You can review and modify these in:
**Authentication** → **Policies**

## Troubleshooting

### Still getting connection errors?
- Double-check your environment variables
- Ensure there are no extra spaces or quotes
- Restart your development server after changing `.env.local`

### Table not found errors?
- Make sure you ran the complete `setup-database.sql` script
- Check the **Table Editor** in Supabase to verify tables exist

### Permission errors?
- Check that RLS policies are correctly set up
- Verify your user is authenticated properly

## Next Steps

Once your database is set up:

1. **Test social account connections**: Try connecting a YouTube account
2. **Verify data persistence**: Check that accounts are saved in the database
3. **Test other features**: Try creating reactions, scheduling posts, etc.

## Important Notes

- Keep your `service_role` key secret - never commit it to version control
- The `anon` key is safe to use in client-side code
- Consider setting up environment-specific projects (dev, staging, prod)

## Database Schema Overview

The setup creates these main tables:

- **social_accounts**: Stores OAuth tokens and account info
- **social_shares**: Tracks scheduled and published posts
- **youtube_playlists**: YouTube playlist management
- **youtube_playlist_videos**: Videos within playlists
- **folders**: File organization system

All tables include:
- UUID primary keys
- User-based row-level security
- Automatic timestamp updates
- Proper foreign key relationships