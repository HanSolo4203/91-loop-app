# Setup Client Logos Storage Bucket

## Manual Setup Required

Since the Supabase connection is in read-only mode, you need to manually create the storage bucket in your Supabase dashboard.

### Steps to Create the Bucket:

1. **Go to your Supabase Dashboard**
   - Navigate to your project at [supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your project

2. **Go to Storage**
   - In the left sidebar, click on "Storage"

3. **Create New Bucket**
   - Click "New bucket" button
   - Fill in the details:
     - **Name**: `client-logos`
     - **Public bucket**: ✅ Check this box (makes images publicly accessible)
     - **File size limit**: `5242880` (5MB in bytes)
     - **Allowed MIME types**: 
       ```
       image/jpeg,image/jpg,image/png,image/webp,image/svg+xml
       ```

4. **Save the Bucket**
   - Click "Create bucket"

### Storage Policies (Optional but Recommended)

After creating the bucket, you can add policies to control access:

1. **Go to Storage > Policies**
2. **Add Policy for client-logos bucket**

**Policy for SELECT (read access):**
```sql
CREATE POLICY "Public read access for client logos" ON storage.objects
FOR SELECT USING (bucket_id = 'client-logos');
```

**Policy for INSERT (upload access):**
```sql
CREATE POLICY "Authenticated users can upload client logos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'client-logos' 
  AND auth.role() = 'authenticated'
);
```

**Policy for UPDATE (update access):**
```sql
CREATE POLICY "Authenticated users can update client logos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'client-logos' 
  AND auth.role() = 'authenticated'
);
```

**Policy for DELETE (delete access):**
```sql
CREATE POLICY "Authenticated users can delete client logos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'client-logos' 
  AND auth.role() = 'authenticated'
);
```

### Testing the Setup

After creating the bucket, you can test the upload functionality:

1. Go to Settings > Clients
2. Add or edit a client
3. Upload a logo image
4. The image should now be stored in the `client-logos` bucket
5. Check the Reports page to see if logos appear next to client names

### Troubleshooting

If logos don't appear on the reports page:

1. **Check the browser console** for any errors
2. **Verify the bucket exists** in Supabase Storage
3. **Check the upload API** by testing at `/api/upload`
4. **Ensure the bucket is public** so images can be accessed
5. **Check the database** to ensure `logo_url` values are being saved correctly

### File Structure

Uploaded files will be stored as:
```
client-logos/
└── logos/
    ├── 1703123456789_abc123def456.jpg
    ├── 1703123456790_xyz789uvw012.png
    └── ...
```

The public URL format will be:
```
https://your-project-ref.supabase.co/storage/v1/object/public/client-logos/logos/filename.jpg
```
