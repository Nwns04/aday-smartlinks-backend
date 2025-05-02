const axios = require('axios');
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

async function refreshSpotifyToken(user) {
  // Check if token is still valid (with a 5-minute buffer)
  if (user.spotifyTokenExpiresAt && new Date() < new Date(user.spotifyTokenExpiresAt - 300000)) {
    return user.spotifyId;
  }
  
  // Refresh token from Spotify
  const refreshResponse = await axios.post(
    "https://accounts.spotify.com/api/token",
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: user.spotifyRefreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  const { access_token, expires_in } = refreshResponse.data;
  // Update user document
  user.spotifyId = access_token;
  user.spotifyTokenExpiresAt = new Date(Date.now() + expires_in * 1000);
  await user.save();
  return access_token;
}

module.exports = { refreshSpotifyToken };
