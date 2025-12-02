const DEFAULT_DESIRED_ACCURACY = 50; // meters
const DEFAULT_IMPROVEMENT_TIMEOUT = 7000; // milliseconds

function normalizePosition(position) {
  const { latitude, longitude, accuracy } = position.coords;
  return {
    latitude: Number(latitude.toFixed ? latitude.toFixed(6) : latitude),
    longitude: Number(longitude.toFixed ? longitude.toFixed(6) : longitude),
    accuracy: Number.isFinite(accuracy) ? Number(accuracy.toFixed(2)) : undefined,
    capturedAt: new Date(position.timestamp || Date.now()).toISOString(),
    source: 'browser',
  };
}

function handleGeolocationError(error, reject) {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      reject(new Error('Location permission denied. Please allow access to proceed.'));
      break;
    case error.POSITION_UNAVAILABLE:
      reject(new Error('Location information is unavailable.'));
      break;
    case error.TIMEOUT:
      reject(new Error('Unable to retrieve location (timeout).'));
      break;
    default:
      reject(new Error('Failed to retrieve location.'));
  }
}

export async function requestCurrentLocation(options = {}) {
  if (typeof window === 'undefined' || !('geolocation' in navigator)) {
    throw new Error('Location services are not supported on this device.');
  }

  const {
    desiredAccuracy = DEFAULT_DESIRED_ACCURACY,
    improvementTimeout = DEFAULT_IMPROVEMENT_TIMEOUT,
    ...geoOverrides
  } = options;

  const geoOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
    ...geoOverrides,
  };

  const desiredAccuracyNumber = Number.isFinite(desiredAccuracy) ? desiredAccuracy : DEFAULT_DESIRED_ACCURACY;

  return new Promise((resolve, reject) => {
    let bestPosition = null;
    let watchId = null;
    let improvementTimer = null;

    const cleanup = () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
      if (improvementTimer) {
        clearTimeout(improvementTimer);
        improvementTimer = null;
      }
    };

    const finish = (position) => {
      cleanup();
      resolve(normalizePosition(position));
    };

    const considerPosition = (position) => {
      const accuracy = position?.coords?.accuracy ?? Number.POSITIVE_INFINITY;

      if (!bestPosition || accuracy < (bestPosition.coords?.accuracy ?? Number.POSITIVE_INFINITY)) {
        bestPosition = position;
      }

      if (accuracy <= desiredAccuracyNumber) {
        finish(position);
      }
    };

    const startWatchForImprovement = () => {
      if (watchId !== null) return;
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          considerPosition(position);
        },
        (error) => {
          console.warn('watchPosition error', error);
          if (bestPosition) {
            finish(bestPosition);
          } else {
            cleanup();
            handleGeolocationError(error, reject);
          }
        },
        geoOptions,
      );

      improvementTimer = setTimeout(() => {
        if (bestPosition) {
          finish(bestPosition);
        } else {
          cleanup();
          reject(new Error('Unable to obtain a precise location.'));
        }
      }, improvementTimeout);
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        considerPosition(position);
        if (position?.coords?.accuracy <= desiredAccuracyNumber) {
          finish(position);
        } else {
          startWatchForImprovement();
        }
      },
      (error) => {
        if (error.code === error.POSITION_UNAVAILABLE || error.code === error.TIMEOUT) {
          // Attempt to watch for a better fix even when initial attempt fails
          startWatchForImprovement();
          if (!improvementTimer) {
            improvementTimer = setTimeout(() => {
              if (bestPosition) {
                finish(bestPosition);
              } else {
                cleanup();
                handleGeolocationError(error, reject);
              }
            }, improvementTimeout);
          }
        } else {
          handleGeolocationError(error, reject);
        }
      },
      geoOptions,
    );
  });
}

export async function enrichLocationWithAddress(location) {
  if (!location || typeof location !== 'object') {
    return location;
  }

  const { latitude, longitude } = location;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return location;
  }

  const searchParams = new URLSearchParams({
    format: 'jsonv2',
    lat: String(latitude),
    lon: String(longitude),
  });

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${searchParams.toString()}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'HRMSAttendanceClient/1.0 (https://scalecapacity.com)',
      },
    });

    if (!response.ok) {
      throw new Error(`Reverse geocoding failed with status ${response.status}`);
    }

    const data = await response.json();
    const address = data?.address || {};

    const normalizedAddress = {
      label: data?.display_name || undefined,
      road: address.road || address.street || undefined,
      city: address.city || address.town || address.village || undefined,
      state: address.state || undefined,
      postcode: address.postcode || undefined,
      country: address.country || undefined,
    };

    return {
      ...location,
      address: normalizedAddress,
    };
  } catch (err) {
    console.warn('Failed to enrich location with address', err);
    return location;
  }
}
