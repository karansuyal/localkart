import api from './api';

export const unsplashService = {
  /**
   * Search product images
   * @param {string} query - Product search term
   * @param {number} perPage - Number of results
   * @returns {Promise} Array of image objects
   */
  searchProductImages: async (query, perPage = 10) => {
    try {
      const response = await api.get('/unsplash/search', {
        params: { query, per_page: perPage }
      });
      return response.data;
    } catch (error) {
      console.error('Unsplash search error:', error);
      throw error;
    }
  },
  
  /**
   * Get single photo details
   */
  getPhoto: async (photoId) => {
    try {
      const response = await api.get(`/unsplash/photo/${photoId}`);
      return response.data;
    } catch (error) {
      console.error('Get photo error:', error);
      throw error;
    }
  },
  
  /**
   * Track download (Required by Unsplash)
   */
  trackDownload: async (downloadUrl) => {
    try {
      await api.post('/unsplash/download/track', { download_url: downloadUrl });
    } catch (error) {
      console.error('Track download error:', error);
    }
  }
};