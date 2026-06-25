import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon, Search, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { unsplashService } from '../../services/unsplash';
import toast from 'react-hot-toast';

const AddProduct = () => {
  const [images, setImages] = useState([]);
  const [unsplashImages, setUnsplashImages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedTab, setSelectedTab] = useState('upload'); // 'upload' or 'unsplash'
  
  // ... existing state and handlers ...
  
  // Search Unsplash Images
  const handleUnsplashSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search term');
      return;
    }
    
    setSearching(true);
    try {
      const result = await unsplashService.searchProductImages(searchQuery, 10);
      setUnsplashImages(result.results);
      
      if (result.results.length === 0) {
        toast.info('No images found. Try different keywords.');
      }
    } catch (error) {
      toast.error('Failed to search images');
    } finally {
      setSearching(false);
    }
  };
  
  // Select Unsplash Image
  const selectUnsplashImage = async (photo) => {
    // Track download (Required by Unsplash)
    await unsplashService.trackDownload(photo.download_url);
    
    // Add to product images
    const newImage = {
      url: photo.url,
      unsplash_id: photo.id,
      photographer: photo.photographer,
      unsplash_url: photo.unsplash_url
    };
    
    setImages(prev => [...prev, newImage]);
    toast.success('Image added from Unsplash');
  };
  
  // ... rest of component ...
  
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Add New Product</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Image Source Tabs */}
        <div className="flex border-b">
          <button
            type="button"
            onClick={() => setSelectedTab('upload')}
            className={`px-4 py-2 font-medium ${
              selectedTab === 'upload' 
                ? 'border-b-2 border-green-600 text-green-600' 
                : 'text-gray-500'
            }`}
          >
            <Upload className="w-4 h-4 inline mr-2" />
            Upload Images
          </button>
          <button
            type="button"
            onClick={() => setSelectedTab('unsplash')}
            className={`px-4 py-2 font-medium ${
              selectedTab === 'unsplash' 
                ? 'border-b-2 border-green-600 text-green-600' 
                : 'text-gray-500'
            }`}
          >
            <Search className="w-4 h-4 inline mr-2" />
            Free Images (Unsplash)
          </button>
        </div>
        
        {/* Upload Tab */}
        {selectedTab === 'upload' && (
          <div>
            <label className="block text-sm font-medium mb-2">Upload Product Images</label>
            
            <div 
              {...getRootProps()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-green-500 transition cursor-pointer"
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Drag & drop images here, or click to select</p>
              <p className="text-xs text-gray-400 mt-1">Max 5 images • 5MB each • JPG, PNG, WebP</p>
            </div>
          </div>
        )}
        
        {/* Unsplash Tab */}
        {selectedTab === 'unsplash' && (
          <div>
            <label className="block text-sm font-medium mb-2">Search Free Images</label>
            
            <div className="flex space-x-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search product images (e.g., maggi noodles)"
                className="flex-1 border rounded-lg p-2 focus:outline-none focus:border-green-500"
                onKeyPress={(e) => e.key === 'Enter' && handleUnsplashSearch()}
              />
              <button
                type="button"
                onClick={handleUnsplashSearch}
                disabled={searching}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                {searching ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
              </button>
            </div>
            
            {/* Unsplash Results */}
            {searching ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto" />
                <p className="text-gray-500 mt-2">Searching images...</p>
              </div>
            ) : unsplashImages.length > 0 ? (
              <div>
                <p className="text-xs text-gray-500 mb-2">
                  {unsplashImages.length} images found • Click to add
                </p>
                <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                  {unsplashImages.map(photo => (
                    <div
                      key={photo.id}
                      onClick={() => selectUnsplashImage(photo)}
                      className="relative group cursor-pointer rounded-lg overflow-hidden border-2 border-transparent hover:border-green-500 transition"
                    >
                      <img 
                        src={photo.thumb} 
                        alt={photo.description || 'Product'}
                        className="w-full h-24 object-cover"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition flex items-center justify-center">
                        <span className="text-white text-xs opacity-0 group-hover:opacity-100">Add</span>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-1">
                        <p className="text-[8px] text-white truncate">📸 {photo.photographer}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-2">
                  Photos by <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" className="underline">Unsplash</a>
                </p>
              </div>
            ) : null}
          </div>
        )}
        
        {/* Selected Images Preview */}
        {images.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-2">Selected Images ({images.length})</label>
            <div className="grid grid-cols-4 gap-3">
              {images.map((img, index) => (
                <div key={index} className="relative group">
                  <img 
                    src={img.url || URL.createObjectURL(img)} 
                    alt={`Product ${index}`}
                    className="w-full h-24 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setImages(prev => prev.filter((_, i) => i !== index))}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  {img.photographer && (
                    <p className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-[8px] text-white p-1 truncate">
                      📸 {img.photographer}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Product Details */}
        {/* ... existing product form fields ... */}
        
        <button
          type="submit"
          disabled={uploading || images.length === 0}
          className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : 'Add Product'}
        </button>
      </form>
    </div>
  );
};

export default AddProduct;