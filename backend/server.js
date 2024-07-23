const fetch = require('node-fetch');
const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const Vibrant = require('node-vibrant');
const RateLimit = require('express-rate-limit');




dotenv.config();

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

const app = express();
const port = 3001;
const spotify_client_id = process.env.SPOTIFY_CLIENT_ID;
const spotify_client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirectUri = `http://localhost:${port}/callback`;
const scope = 'user-read-private user-read-email user-read-playback-state user-read-currently-playing streaming playlist-read-private';
let accessToken; 


const playRateLimiter = RateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 60 requests per windowMs
});

const lyricsRateLimiter = RateLimit({
  windowMs: 60 * 1000,
  max: 60,
})

// Apply rate limiter to all endpoints that interact with Spotify API
// app.use('/api/', rateLimiter);

// Generate a random state for OAuth
let generateRandomString = function (length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

let state = generateRandomString(16);

let auth_query_parameters = new URLSearchParams({
  response_type: "code",
  client_id: spotify_client_id,
  scope: scope,
  redirect_uri: redirectUri,
  state: state
});

const authorizeUrl = `https://accounts.spotify.com/authorize/?${auth_query_parameters.toString()}`;
console.log('Authorize URL:', authorizeUrl);

// function startServer() {
//   app.listen(port, () => {
//     console.log(`Server running at http://localhost:${port}`);
//   });
// }
app.use(express.static(path.join(__dirname, 'public')));

// app.listen(port, (err) => {
//   if (err && err.code === 'EADDRINUSE') {
//     console.error(`Port ${port} is already in use.`);
//     // Handle the error or exit gracefully
//     process.exit(1); // Exit with error
//   } else {
//     startServer();
//   }
// });



app.get('/login', (req, res) => {
  console.log('Redirecting to authorizeUrl...');
  res.redirect(authorizeUrl);
});


app.get('/callback', async (req, res) => {
  const authorizationCode = req.query.code;
  // console.log('Received authorization code:', authorizationCode);
  if (authorizationCode) {
    try {
      console.log('Authentication code Received.');
      accessToken = await getSpotifyAccessToken(authorizationCode);

      if (accessToken) {
        console.log('Access Token Obtained.');

        res.status(500).send('Successfully logged in. You may now close this window.');

      } else {
        console.log('Obtaining access token failed. Redirecting to authorizeUrl...');
        res.redirect(authorizeUrl)
      }
    } catch (error) {
      console.error('Error:', error.message);
      res.status(500).send('Error exchanging code for token');
    }
  } else {
    console.log('Receiving authentication code failed. Redirecting to authorizeUrl...');
    res.redirect.authorizeUrl
  }
});

app.get('/current-track', playRateLimiter, async (req, res) => {
  try {
    const trackInfo = await getCurrentlyPlayingTrack(accessToken);
    // console.log(trackInfo)
    res.json(trackInfo);
  } catch (error) {
    res.status(500).send('Error fetching currently playing track');
  }
});


app.get('/access-token', (req, res) => {
  // Check if accessToken is defined and valid
  if (accessToken) {
    res.json(accessToken);
  } else {
    res.status(500).send('failed to get access token');
  }
});

app.put('/pause', async (req, res) => {
  try {
    const response = await fetch('https://api.spotify.com/v1/me/player/pause', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json(); // Parse error response from Spotify
      throw new Error(`Failed to pause track: ${errorData.error.message}`);
    }

    res.sendStatus(200); // Send success status code
  } catch (error) {
    console.error('Error pausing track:', error.message);
    res.status(500).send('Error pausing track'); // Send error status code and message
  }
});

app.put('/play', async (req, res) => {
  try {
    
    const response = await fetch('https://api.spotify.com/v1/me/player/play', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    if (!response.ok) {
      const errorData = await response.json(); // Parse error response from Spotify
      throw new Error(`Failed to play track: ${errorData.error.message}`);
    }
    res.sendStatus(200); // Send success status code
  } catch (error) {
    console.error('Error playing track:', error.message);
    res.status(500).send('Error playing track'); // Send error status code and message
  }
});

app.put('/next', async (req, res) => {
  try {
    // Call Spotify API to pause the current track
    const response = await fetch('https://api.spotify.com/v1/me/player/next', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json(); // Parse error response from Spotify
      throw new Error(`Failed to play next track: ${errorData.error.message}`);
    }

    res.sendStatus(200); // Send success status code
  } catch (error) {
    console.error('Error playing next track:', error.message);
    res.status(500).send('Error playing next track'); // Send error status code and message
  }
});

app.put('/previous', async (req, res) => {
  try {

    const response = await fetch('https://api.spotify.com/v1/me/player/previous', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json(); // Parse error response from Spotify
      throw new Error(`Failed to play previous track: ${errorData.error.message}`);
    }

    res.sendStatus(200); // Send success status code
  } catch (error) {
    console.error('Error playing previous track:', error.message);
    res.status(500).send('Error playing previous track'); // Send error status code and message
  }
});


app.get('/current-lyrics', lyricsRateLimiter, async (req, res) => {

  try {
    const trackInfo = await getCurrentlyPlayingTrack(accessToken);

    if (trackInfo.title && trackInfo.artist) {
      const lyrics = await fetchSynchronizedLyrics(trackInfo.title, trackInfo.artist);
      res.json({ lyrics });
    } else {
      res.json({ lyrics: 'No lyrics available.' });
    }
  } catch (error) {
    res.json({ lyrics: 'error: no lyrics available' });
   
  }
});

async function getSpotifyAccessToken(authorizationCode) {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${spotify_client_id}:${spotify_client_secret}`).toString('base64')
    },
    body: new URLSearchParams({
      'grant_type': 'authorization_code',
      'code': authorizationCode,
      'redirect_uri': redirectUri
    })
  });
  const data = await response.json();
  return data.access_token;
}

async function getCurrentlyPlayingTrack(accessToken, retryCount = 3) {
  try {
  
    const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      timeout: 10000 // 10 seconds timeout
    });

    if (response.status === 204) {

      return { isPlaying: false, title: null, message: 'No track currently playing.'};
    }

    const data = await response.json();
    const album_cover = data.item ? data.item.album.images[0].url : null;
    const isPlaying = data.is_playing;
    const title = data.item ? data.item.name : null;
    const artist = data.item ? data.item.artists[0].name : null;
    const duration = data.item ? data.item.duration_ms : null;
    const progress = data.progress_ms;
    const palette = await Vibrant.from(album_cover).getPalette(); //gets background palette
    const dominantColor = palette.Vibrant.hex; 

    return { isPlaying, title, artist, progress, duration, album_cover, dominantColor};
  } catch (error) {
    if (retryCount > 0) {
      console.warn(`Retrying getCurrentlyPlayingTrack... attempts left: ${retryCount}`);
      return getCurrentlyPlayingTrack(accessToken, retryCount - 1);
    }
    console.error('Error getting currently playing track:', error.message || error);
    return { isPlaying: false, title: null, message: 'Failed to fetch currently playing track.' };
  }
}

app.get('/lyrics.json', lyricsRateLimiter, (req, res) => {
  res.sendFile(path.join(__dirname, 'lyrics.json'));
});

async function fetchSynchronizedLyrics(title, artist) {
  
    try {   
      let response;
      if (title === "Lackin'" && artist === "Denise Julia") {
         response = await fetch(`http://localhost:${port}/lyrics.json`);
      }
      else {

         response = await fetch(`https://api.textyl.co/api/lyrics?q=${encodeURIComponent(`${title} ${artist}`)}`);
      }
      if (!response.ok) {
        const data = await response.json();
        return data        
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching synchronized lyrics:', error);
      console.log(`https://api.textyl.co/api/lyrics?q=${encodeURIComponent(`${title} ${artist}`)}`)
      throw error;
    }
}

async function fetchPlaylists() {
  
  let allPlaylists = [];
  let next = `https://api.spotify.com/v1/me/playlists`;
  const seenIds = new Set(); 


  while (next) {
      const response = await fetch(next + '?limit=50', {
          headers: {
              'Authorization': `Bearer ${accessToken}`
          }
      });
      console.log('Fetching playlists from:', next);

      if (!response.ok) {
        throw new Error('Failed to fetch playlists');
      }

      const data = await response.json();
      console.log(data)
    for (const item of data.items) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        allPlaylists.push(item); // Add only unique items
      }
    }

    next = data.next; // Update URL for the next page
    console.log('Next URL:', next);

  }

  // console.log('All Playlists with IDs:', allPlaylists);
  return allPlaylists;
}

app.get('/playlists', async (req, res) => {
  try {
    const playlists = await fetchPlaylists();
    res.json(playlists);
  } catch (error) {
    res.status(500).send('Error fetching playlists');
  }
});





module.exports = app;

