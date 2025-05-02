// routes/spotify.js
const express = require('express');
const router = express.Router();
const axios = require('axios');

// secret_afca9726bbc9a18f93c4378ba20a8ef587866ce1f5fbec4c66644606f26bd5762f8519ca5dafa0faf1c431085a2f4bde7feb16cfb07854403db3e8e6cc9db8d4
// Get access token (already exists)
router.get('/token', async (req, res) => {
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({ grant_type: 'client_credentials' }),
      {
        headers: {
          Authorization: `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    res.json({ access_token: response.data.access_token });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get Spotify token' });
  }
});

// 🎯 UPC-based song.link link generator
router.get('/links', async (req, res) => {
  console.log('Hitting the spotify.routes.js endpoint');
    const { upc } = req.query;
  
    if (!upc) return res.status(400).json({ message: 'UPC is required' });
  
    try {
      // Get Spotify token
      const auth = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64');
      const tokenRes = await axios.post('https://accounts.spotify.com/api/token', 'grant_type=client_credentials', {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
  
      const accessToken = tokenRes.data.access_token;
  
      // Try album search by UPC
      const searchAlbumUrl = `https://api.spotify.com/v1/search?q=upc:${upc}&type=album&limit=1`;
      const albumRes = await axios.get(searchAlbumUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
  
      let spotifyUrl = albumRes.data.albums.items?.[0]?.external_urls?.spotify;
  
      // If no album, fallback to track search
      if (!spotifyUrl) {
        const searchTrackUrl = `https://api.spotify.com/v1/search?q=upc:${upc}&type=track&limit=1`;
        const trackRes = await axios.get(searchTrackUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        spotifyUrl = trackRes.data.tracks.items?.[0]?.external_urls?.spotify;
      }
  
      if (!spotifyUrl) {
        return res.status(404).json({ message: 'No Spotify album or track found for this UPC' });
      }
  
      // Use Song.link API with Spotify URL
      const linkRes = await axios.get(`https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(spotifyUrl)}`);
      const platforms = linkRes.data.linksByPlatform || {};
  
      res.json({
        spotify: platforms.spotify?.url || '',
        apple: platforms.appleMusic?.url || '',
        youtube: platforms.youtube?.url || '',
      });
  
    } catch (err) {
      console.error('Spotify UPC Error:', err.message);
      res.status(500).json({ message: 'Internal error fetching links' });
    }
  });

  

  router.get('/links-by-track', async (req, res) => {
    const { trackName, artistName } = req.query;
  
    if (!trackName || !artistName) {
      return res.status(400).json({ message: 'trackName and artistName are required' });
    }
  
    try {
      // Step 1: Get Spotify access token
      const authString = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64');
  
      const tokenRes = await axios.post(
        'https://accounts.spotify.com/api/token',
        'grant_type=client_credentials',
        {
          headers: {
            Authorization: `Basic ${authString}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
  
      const accessToken = tokenRes.data.access_token;
  
      // Step 2: Search for track on Spotify
      const query = encodeURIComponent(`track:${trackName} artist:${artistName}`);
      const searchUrl = `https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`;
  
      const searchRes = await axios.get(searchUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
  
      const track = searchRes.data.tracks?.items?.[0];
  
      if (!track || !track.external_urls?.spotify) {
        return res.status(404).json({ message: 'Spotify track not found for this search' });
      }
  
      const spotifyUrl = track.external_urls.spotify;
  
      // Step 3: Use song.link API
      const songlinkRes = await axios.get(
        `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(spotifyUrl)}`
      );
  
      const platforms = songlinkRes.data.linksByPlatform || {};
  
      res.json({
        spotify: platforms.spotify?.url || '',
        apple: platforms.appleMusic?.url || '',
        youtube: platforms.youtube?.url || '',
        tidal: platforms.tidal?.url || '',
        boomplay: platforms.boomplay?.url || '',
      });
    } catch (err) {
      console.error('Error fetching links:', err.message);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // router.get('/auth/spotify/callback', async (req, res) => {
  //   const code = req.query.code;
  //   const redirectUri = `${process.env.BACKEND_BASE_URL}/spotify/auth/spotify/callback`;
  
  //   try {
  //     const tokenResponse = await axios.post(
  //       'https://accounts.spotify.com/api/token',
  //       qs.stringify({
  //         grant_type: 'authorization_code',
  //         code,
  //         redirect_uri: redirectUri,
  //         client_id: process.env.SPOTIFY_CLIENT_ID,
  //         client_secret: process.env.SPOTIFY_CLIENT_SECRET,
  //       }),
  //       {
  //         headers: {
  //           'Content-Type': 'application/x-www-form-urlencoded',
  //         },
  //       }
  //     );
  
  //     const { access_token, refresh_token, expires_in } = tokenResponse.data;
  
  //     const userResponse = await axios.get('https://api.spotify.com/v1/me', {
  //       headers: { Authorization: `Bearer ${access_token}` },
  //     });
  
  //     const spotifyProfile = userResponse.data;
  
  //     const isArtist = spotifyProfile.product === 'premium' || spotifyProfile.type === 'artist' || spotifyProfile.type === 'user';
  //     const isVerifiedArtist = spotifyProfile.type === 'artist'; // Check if explicitly an artist
  //     if (!isArtist) {
  //       return res.redirect(`${process.env.FRONTEND_BASE_URL}/unauthorized`);
  //     }
     
  //     const user = await User.findOneAndUpdate(
  //       { spotifyId: spotifyProfile.id },
  //       {
  //         spotifyId: spotifyProfile.id,
  //         email: spotifyProfile.email,
  //         name: spotifyProfile.display_name,
  //         image: spotifyProfile.images?.[0]?.url || '',
  //         accessToken: access_token,
  //         refreshToken: refresh_token,
  //         tokenExpiry: Date.now() + expires_in * 1000,
  //         isArtist: isVerifiedArtist,
  //       },
  //       { new: true, upsert: true }
  //     );
  //     if (isVerifiedArtist) {
  //       await sendArtistWelcomeEmail(user.email, user.name);
  //     }
  
  //     res.redirect(`${process.env.FRONTEND_BASE_URL}/dashboard?token=${access_token}`);
  //   } catch (error) {
  //     console.error('Spotify Auth Error:', error.response?.data || error.message);
  //     res.redirect(`${process.env.FRONTEND_BASE_URL}/error`);
  //   }
  // });
  

module.exports = router;

