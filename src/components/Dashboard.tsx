import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { UploadCloud, Image as ImageIcon, Copy, LogOut, Loader2, Check, ExternalLink } from 'lucide-react';

interface DashboardProps {
  onLogout: () => void;
}

interface ImageFile {
  name: string;
  url: string;
  created_at: string;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const progressWidthClasses: Record<number, string> = {
    0: 'w-[0%]',
    10: 'w-[10%]',
    20: 'w-[20%]',
    30: 'w-[30%]',
    40: 'w-[40%]',
    50: 'w-[50%]',
    60: 'w-[60%]',
    70: 'w-[70%]',
    80: 'w-[80%]',
    90: 'w-[90%]',
    100: 'w-[100%]',
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.storage.from('images').list('', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
      });
      if (error) throw error;

      const files = (data || []).filter((item: any) => item.name !== '.emptyFolderPlaceholder');
      const imagesList = files.map((file: any) => {
        const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(file.name);
        return { name: file.name, url: publicUrl, created_at: file.created_at || '' };
      });
      setImages(imagesList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      await uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (jpg, png, gif, webp)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setError(null);
    setUploading(true);
    setUploadProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => (prev >= 90 ? 90 : prev + 10));
      }, 200);

      const fileExt = file.name.split('.').pop();
      const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(uniqueFilename, file, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false,
        });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (uploadError) throw uploadError;

      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 3000);
      await fetchImages();

      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Error uploading file');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const performLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-8 px-4 h-full flex flex-col relative">
      {successToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-green-500/20 border border-green-500 text-green-400 px-6 py-3 rounded-full flex items-center gap-2 shadow-lg backdrop-blur-md">
          <Check className="w-5 h-5" />
          <span className="font-medium">Upload Successful! ✅</span>
        </div>
      )}

      <header className="flex justify-between items-center mb-12">
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 flex items-center gap-3">
          <ImageIcon className="text-purple-400" />
          SnapVault
        </h1>
        <button
          onClick={performLogout}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </header>

      <div className="mb-12">
        <div
          className={`relative border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center text-center transition-all bg-gray-900/40 backdrop-blur-sm
            ${dragActive ? 'border-purple-500 bg-purple-500/10 scale-[1.02]' : 'border-gray-700 hover:border-gray-500 hover:bg-gray-800/40'}
            ${uploading ? 'pointer-events-none opacity-80' : 'cursor-pointer'}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleChange}
            title="Upload image"
            aria-label="Upload image"
          />

          {!uploading ? (
            <>
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4 shadow-lg">
                <UploadCloud className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-medium text-white mb-2">Drag & Drop your image here</h3>
              <p className="text-gray-400 text-sm">or click to browse from your computer</p>
              <p className="text-gray-500 text-xs mt-4">Supports JPG, PNG, GIF, WEBP (Max 10MB)</p>
            </>
          ) : (
            <div className="w-full max-w-sm flex flex-col items-center">
              <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Uploading Image...</h3>
              <div className="w-full bg-gray-800 rounded-full h-2 mt-4 overflow-hidden">
                <div
                  className={`bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300 ease-out ${progressWidthClasses[uploadProgress]}`}
                />
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-900/20 border border-red-500/50 text-red-400 rounded-lg text-sm text-center">
            {error}
          </div>
        )}
      </div>

      <div className="flex-1">
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          Your Uploads
          <span className="text-sm font-normal text-gray-500 bg-gray-800 px-2 py-1 rounded-md">
            {images.length}
          </span>
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-20 bg-gray-900/20 rounded-3xl border border-gray-800 border-dashed">
            <ImageIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No images uploaded yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {images.map(image => (
              <div
                key={image.name}
                className="group relative bg-gray-900/60 rounded-2xl overflow-hidden border border-gray-800 hover:border-gray-600 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
              >
                <div className="aspect-square overflow-hidden bg-gray-800">
                  <a href={image.url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={image.url}
                      alt={image.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  </a>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-sm font-medium text-gray-200 truncate" title={image.name}>
                    {image.name.split('-').slice(2).join('-') || image.name}
                  </p>
                  <a
                    href={image.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-purple-400 hover:text-purple-300 hover:underline block truncate"
                    title={image.url}
                  >
                    {image.url}
                  </a>
                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={image.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open
                    </a>
                    <button
                      onClick={() => copyToClipboard(image.url)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
                    >
                      {copiedUrl === image.url ? (
                        <>
                          <Check className="w-4 h-4 text-green-400" />
                          <span className="text-green-400">Copied! ✓</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy Link
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
