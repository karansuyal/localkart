import React from 'react';
import { Star, ShoppingCart } from 'lucide-react';

const ProductCard = ({ product, onAddToCart }) => {
  // Handle both upload and unsplash images
  const imageUrl = product.images && product.images.length > 0 
    ? (typeof product.images[0] === 'string' ? product.images[0] : product.images[0].url)
    : '/images/placeholder.jpg';
  
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition">
      <div className="relative h-48 bg-gray-100">
        <img
          src={imageUrl}
          alt={product.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src = '/images/placeholder.jpg';
          }}
        />
        {/* Unsplash attribution (if image from unsplash) */}
        {product.unsplash_photographer && (
          <div className="absolute bottom-0 right-0 bg-black bg-opacity-50 px-2 py-1 text-[8px] text-white">
            📸 {product.unsplash_photographer}
          </div>
        )}
      </div>
      
      {/* Rest of product card */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-800">{product.name}</h3>
        <p className="text-lg font-bold text-green-600">₹{product.price}</p>
        <button
          onClick={() => onAddToCart(product)}
          className="mt-2 w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition"
        >
          <ShoppingCart className="w-4 h-4 inline mr-2" />
          Add to Cart
        </button>
      </div>
    </div>
  );
};

export default ProductCard;