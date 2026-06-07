import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import 'dotenv/config'; // Load env implicitly

// Supabase client config
// Wait, we need supabase to be dynamically configured, but we can verify it at request time.
// Since it's a backend, we can initialize it if variables are present.

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Add JSON parsing middleware
  app.use(express.json());

  // Configure multer (store in memory so we can upload it directly to Supabase)
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
  });

  // API Routes
  
  // Create a helper to get Supabase client
  const getSupabaseClient = () => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase is not properly configured. Check SUPABASE_URL and SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY");
    }
    return createClient(supabaseUrl, supabaseKey);
  };

  const ensureBucketExists = async (supabase: any) => {
    try {
      const { data } = await supabase.storage.getBucket('images');
      if (!data) {
        // Try creating the bucket
        const { error } = await supabase.storage.createBucket('images', {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
          fileSizeLimit: 10485760 // 10MB
        });
        if (error) {
          console.error("Failed to auto-create bucket:", error);
        } else {
          console.log("Auto-created 'images' bucket successfully.");
        }
      }
    } catch {
      // Ignored
    }
  };

  app.post("/api/upload", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      // Check valid file types (basic check)
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ error: "Invalid file type. Only jpg, png, gif, webp are supported." });
      }

      const supabase = getSupabaseClient();
      await ensureBucketExists(supabase);
      
      // Generate a unique filename
      const fileExt = req.file.originalname.split('.').pop();
      const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      
      // Upload to Supabase Storage in "images" bucket
      const { data, error } = await supabase
        .storage
        .from('images')
        .upload(uniqueFilename, req.file.buffer, {
          contentType: req.file.mimetype,
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        if (error.message?.includes('Bucket not found')) {
           return res.status(500).json({ error: "Storage bucket 'images' not found. Please create it in your Supabase dashboard or provide SUPABASE_SERVICE_ROLE_KEY." });
        }
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase
        .storage
        .from('images')
        .getPublicUrl(uniqueFilename);

      return res.json({ 
        url: publicUrl,
        path: data.path
      });
      
    } catch (error: any) {
      console.error("Upload error:", error);
      return res.status(500).json({ error: error.message || "Failed to upload image" });
    }
  });

  app.get("/api/images", async (req, res) => {
    try {
      const supabase = getSupabaseClient();
      await ensureBucketExists(supabase);
      
      const { data, error } = await supabase
        .storage
        .from('images')
        .list('', {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        if (error.message?.includes('Bucket not found')) {
           return res.json({ images: [] }); // If bucket is missing, return empty list gracefully
        }
        throw error;
      }
      
      // Filter out only files (not directories or metadata files)
      const files = data.filter(item => item.name !== '.emptyFolderPlaceholder');
      
      // Generate public URLs for each file
      const imagesList = files.map(file => {
        const { data: { publicUrl } } = supabase
          .storage
          .from('images')
          .getPublicUrl(file.name);
          
        return {
          name: file.name,
          url: publicUrl,
          created_at: file.created_at
        };
      });

      return res.json({ images: imagesList });
    } catch (error: any) {
      console.error("List images error:", error);
      return res.status(500).json({ error: error.message || "Failed to list images" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // In Express v4, use get('*')
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
