import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

export const useOrderTracking = (orderId) => {
    const [deliveryLocation, setDeliveryLocation] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef(null);
    
    useEffect(() => {
        if (!orderId) return;
        
        // Connect to WebSocket
        const socket = io(import.meta.env.VITE_WS_URL, {
            path: '/ws',
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
        });
        
        socketRef.current = socket;
        
        socket.on('connect', () => {
            console.log('WebSocket connected');
            setIsConnected(true);
            
            // Join room for this order
            socket.emit('join_order_room', { order_id: orderId });
        });
        
        socket.on('location_update', (data) => {
            setDeliveryLocation(data);
        });
        
        socket.on('disconnect', () => {
            setIsConnected(false);
        });
        
        return () => {
            socket.disconnect();
        };
    }, [orderId]);
    
    return { deliveryLocation, isConnected };
};