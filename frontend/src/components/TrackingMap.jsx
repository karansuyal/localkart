import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const TrackingMap = ({ deliveryLocation, orderId }) => {
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const [map, setMap] = useState(null);
    
    // Default position (if no location)
    const defaultPosition = [28.6139, 77.2090]; // Delhi
    
    // Animate marker movement
    useEffect(() => {
        if (map && deliveryLocation && markerRef.current) {
            const { lat, lng } = deliveryLocation;
            markerRef.current.setLatLng([lat, lng]);
            
            // Smooth pan to new location
            map.panTo([lat, lng], { animate: true, duration: 0.5 });
        }
    }, [deliveryLocation, map]);
    
    return (
        <MapContainer
            center={defaultPosition}
            zoom={14}
            style={{ height: '100%', width: '100%' }}
            ref={setMap}
        >
            {/* Free OSM Tiles */}
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Delivery Marker */}
            <Marker 
                position={deliveryLocation ? [deliveryLocation.lat, deliveryLocation.lng] : defaultPosition}
                ref={markerRef}
            >
                <Popup>Delivery Partner</Popup>
            </Marker>
        </MapContainer>
    );
};

export default TrackingMap;