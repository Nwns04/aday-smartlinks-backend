// src/utils/getGeoLocation.js
export const getGeoLocation = async () => {
    try {
      const res = await fetch("https://ipapi.co/json/");
      const data = await res.json();
      return data;
    } catch (err) {
      console.error("Failed to fetch geolocation", err);
      return null;
    }
  };
  