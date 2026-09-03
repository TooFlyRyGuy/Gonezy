import { useCallback, useEffect, useState } from 'react';

export interface UserCoords {
  lat: number;
  lng: number;
}

export type LocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';

export function useUserLocation(saved?: { lat: number | null; lng: number | null } | null) {
  const [coords, setCoords] = useState<UserCoords | null>(null);
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (saved?.lat != null && saved?.lng != null) {
      setCoords({ lat: saved.lat, lng: saved.lng });
      setStatus('granted');
    }
  }, [saved?.lat, saved?.lng]);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('unavailable');
      setError('This browser cannot share location.');
      return;
    }

    setStatus('requesting');
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus('granted');
      },
      (err) => {
        setStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable');
        setError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission was denied. Distance will stay hidden until you allow it.'
            : 'Could not read your location. Try again or check device settings.'
        );
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 5 * 60 * 1000 }
    );
  }, []);

  return { coords, status, error, requestLocation };
}
