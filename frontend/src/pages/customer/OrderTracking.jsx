import React from 'react';
import { useParams } from 'react-router-dom';
import { useOrderTracking } from '../../hooks/useOrderTracking';
import TrackingMap from '../../components/TrackingMap';

const OrderTracking = () => {
    const { orderId } = useParams();
    const { deliveryLocation, isConnected } = useOrderTracking(orderId);
    
    return (
        <div className="h-screen w-full">
            {/* Status Bar */}
            <div className="bg-white p-4 shadow-md z-10 relative">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold">Order Tracking</h2>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                        isConnected ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                    }`}>
                        {isConnected ? '🔴 Live' : '⚪ Connecting...'}
                    </span>
                </div>
                {deliveryLocation && (
                    <p className="text-sm text-gray-500">
                        Last update: {new Date().toLocaleTimeString()}
                    </p>
                )}
            </div>
            
            {/* Map */}
            <div className="h-[calc(100vh-100px)]">
                <TrackingMap 
                    deliveryLocation={deliveryLocation} 
                    orderId={orderId}
                />
            </div>
        </div>
    );
};

export default OrderTracking;