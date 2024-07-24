
document.addEventListener('DOMContentLoaded', async () => {
  
   try {
     const intervalId = setInterval(() => {
      toggleLoginView()
        if (isLoggedIn) {
          window.electron.setPosition()
          startDataUpdates()
          clearInterval(intervalId)
        }
      }, 500);
    
    document.getElementById('minimize-button').addEventListener('click', () => {
      window.electron.minimizeWindow();
    });
  
    document.getElementById('close-button').addEventListener('click', () => {
      window.electron.closeWindow();
    });

    document.getElementById('resize-window-button').addEventListener('click', function() {
      window.electron.resizeWindow();
    });
  
    document.getElementById('login-button').addEventListener('click', () => {
      openLoginWindow()
      document.getElementById('login-button').innerText = "Logging in...";        
      });

    document.getElementById('play-button').addEventListener('click', function() {
      if (isPlaying) {
        pause(); 
      } 
      else {
        play();
      }
    });
    
    document.getElementById('next-button').addEventListener('click', () => {
      next()
    });

    document.getElementById('prev-button').addEventListener('click', () => {
      previous()

    });

    document.getElementById('progress-bar').addEventListener('click', (event) => {
      const progressBarWidth = document.getElementById('progress').clientWidth;
      const clickPositionX = event.offsetX;
      const percentageClicked = (clickPositionX / progressBarWidth) * 100;
    
        // Calculate seek position in milliseconds     //TO BE FIXED: console log shows wrong time -- also cant test without spotify premium
      const seekPositionMs = (percentageClicked / 100) * duration;
      seek(seekPositionMs);
      console.log(seekPositionMs)
      console.log(formatTime(seekPositionMs))
    });
    
    document.getElementById('lyrics-button').addEventListener('click', function() {
       
      if (isPlaying) { //if pause lyrics cant be shown
        updateLyricsButton();

        if (isShowingLyrics) { // if lyrics are shown, hides it
          lyrics.style.display = 'none';
          removeDynamicBackground();
          isShowingLyrics = false; //turns off the lyrics
        } else { 
          lyrics.style.display = 'flex';
          applyDynamicBackground();
          isShowingLyrics = true;
        }
      }
    });

    document.getElementById('playlist-button').addEventListener('click', () => {
      if (isShowingPlaylists) {
        playlist.style.display = 'none';
        console.log('off');
        playlistButton.style.stroke = '#f5f0f0ea'
        playlistButton.style.fill = '#f5f0f0ea'
        titleBar.style.backgroundColor = '#00000000'

        isShowingPlaylists = false;
      } else {
        playlist.style.display = 'flex';
        populatePlaylist();
        playlistButton.style.stroke = dominantColor
        playlistButton.style.fill = dominantColor
        titleBar.style.backgroundColor = '#141414'
        isShowingPlaylists = true;
        

      }
    });

    document.addEventListener('click', (event) => {
      if (!playlistButton.contains(event.target) && !playlist.contains(event.target)) {
          playlist.classList.add('hidden');
      }
  });
    
    window.electron.onWindowResize((data) => {
      //resizes text based on window size
      console.log(`Window resized to: ${data.width} x ${data.height}`);
      const width = data.width
      const height = data.height
      const text = document.getElementById('lyrics');
      
      if (width >= 430 && height >= 180 && height < 280 ) {
        text.style.fontSize = '24px';
      } 
      else if (width >= 430 && height >= 280 && width < 640 && height < 640) {
        text.style.fontSize = '26px';
      }
      else if (width >= 640 && height >=640 && width < 720 && height < 720 ){
        text.style.fontSize = '36px';
      }
      else {
        text.style.fontSize = '48px';
      }
    });

    window.electron.onUpdateAvailable(() => {
      console.log('Update available!');
        // Show a notification or prompt to the user
    });
      
    window.electron.onUpdateDownloaded(() => {
      console.log('Update downloaded!');
        // Optionally, prompt the user to restart the app
    });
  
    window.electron.receive('fromMain', (data) => {
      console.log(data);
    });
  } 
  catch (error) {
    console.error('Error during initialization:', error);
  }
});




let isShowingPlaylists = false
let isLoggedIn = false;
let isShowingLyrics = false;
let artist;
let title;
let album_cover;
let progress;
let isPlaying;
let dominantColor;
let duration;

const titleBar = document.getElementById('title-bar');
const playlistButton = document.getElementById('playlist-button');
const playlist = document.getElementById('playlist');
const itemListContainer = document.getElementById('item-list-container');
const lyricsButton = document.getElementById('lyrics-button');
const dynamicBackground = document.getElementById('dynamic-background'); 
const lyrics = document.getElementById('lyrics');       
const titleText = document.getElementById('title');
const artistText = document.getElementById('artist');
const playButtonBackground = document.getElementById('play-button-bg');
const playIcon = document.getElementById('play-icon');





//*-----API SECTION-----**

let cachedLyrics = 'no lyrics'
let fetchedLyrics = 'no ly'

async function fetchPlaylists() {
  try {
    const response = await fetch('http://localhost:3001/playlists');
    const data = await response.json();
    return data
  } catch (error) { console.error(error)

  }
}

async function populatePlaylist() {
  itemListContainer.innerHTML = '';

  const items = await fetchPlaylists()
  console.log(typeof items)
  console.log(items)
  items.forEach(item => {
    const itemList = document.createElement('li');
    const itemImage = document.createElement('img');
    itemList.dataset.id = item.id;
    itemList.dataset.uri = item.uri
    itemList.dataset.images = item.images
    
    itemImage.src = `${item.images[0].url}`
    itemImage.alt = item.name;

    const itemTextContainer = document.createElement('div');


    const itemText = document.createElement('span');
    const itemType = document.createElement('span');
    itemType.textContent = item.type
    itemType.style.fontSize = '10px'
    itemType.style.color = '#9e9e9e'
    itemText.textContent = item.name;
    
    itemList.appendChild(itemImage);
    itemTextContainer.appendChild(itemText);
    itemTextContainer.appendChild(itemType);

    itemList.appendChild(itemTextContainer);
    itemListContainer.appendChild(itemList);
    



    // Add click event listener to each list item
    itemList.addEventListener('click', () => {
        playPlaylist(item.id);
    });
});
}

async function playPlaylist(playlistId, deviceId = null) {
  console.log(playlistId)
  let requestBody = {
    context_uri: `spotify:playlist:${playlistId}`
};

  if (deviceId) {
      requestBody.device_id = deviceId;
  }

  try {
    const response = await fetch('https://api.spotify.com/v1/me/player/play', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${getAccessToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (response.ok) {
      console.log(`Playlist ${playlistId} is now playing.`);
    } else {
      const errorData = await response.json();
      console.error('Error playing playlist:', errorData);
      window.electron.premiumRequiredMessage();

      console.error('Status Code:', response.status);
      console.error('Response Headers:', response.headers);
    }
  } catch (error) {
    console.error('Request failed:', error);
    window.electron.premiumRequiredMessage();

  }
}

async function fetchLyrics() {
  
  const currentSecond = progress / 1000; //converts ms to seconds

  if (isPlaying) {
      try {
        const response = await fetch('http://localhost:3001/current-lyrics');
        fetchedLyrics = await response.json();
        cachedLyrics = fetchedLyrics
      } catch (error) { 
        fetchedLyrics = cachedLyrics
        }

        if (progress == duration) { //when the song ends
          lyrics.innerText = ''
        }
          if (typeof fetchedLyrics.lyrics === 'object') {

            const filteredLyrics = fetchedLyrics.lyrics.filter(entry => entry.seconds <= currentSecond); 
            const timeStamp = filteredLyrics.reduce((max, entry) => entry.seconds > max.seconds ? entry : max, { seconds: -Infinity }); //finds the closest number before the current timestamp of the song
            
            if (timeStamp.seconds !== -Infinity) {
              console.log('Current Timestamp:', timeStamp.seconds);
              console.log('Current Verse:', timeStamp.lyrics);
              lyrics.innerText = `${timeStamp.lyrics}`;
            } else {
              console.log('No entry found before the current timestamp.');
              lyrics.innerText = ` `;
            }

          } else {
            lyrics.innerText = `No lyrics available. `;
      }
      } else { 
        lyrics.innerText = ` `;}
}
  
async function fetchTrackInfo() {
  try {
    const response = await fetch('http://localhost:3001/current-track');
    const data = await response.json();
    title = data.title;
    artist = data.artist;
    album_cover = data.album_cover;
    progress = data.progress;
    duration = data.duration;
    isPlaying = data.isPlaying;
    dominantColor = data.dominantColor;
  } 
  catch (error) { 
    console.log(error) //no console.error -- it's annoying
  }
}

async function play() {
  try {
    const response = await fetch('http://localhost:3001/play', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${getAccessToken()}`
      }
    });
    if (!response.ok) {
      throw new Error('Failed to play track');
    }
    console.log('Track playing...');
  } catch (error) {
    console.error('Error playing track:', error);
    window.electron.premiumRequiredMessage();
  }
}

async function pause() {
  try {
    const response = await fetch('http://localhost:3001/pause', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${getAccessToken()}`
      }
    });
    if (!response.ok) {
      throw new Error('Failed to play previous track');
    }
    console.log('Track pausing...');
  } catch (error) {
    console.error('Error pausing track:', error);
    console.error('Error pausing track:', error.message);
    window.electron.premiumRequiredMessage();
  }
}

async function next() {
  try {
    const response = await fetch('http://localhost:3001/next', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error('Failed to play next track');
    }
    console.log('Track playing...');
  } catch (error) {
    console.error('Error playing next track:', error);
    window.electron.premiumRequiredMessage();
  }
}

async function previous() {
  try {
    const response = await fetch('http://localhost:3001/previous', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error('Failed to play previous track');
    }
    console.log('Track playing...');
  } catch (error) {
    console.error('Error playing previous track:', error);
    window.electron.premiumRequiredMessage();
  }
}

async function seek(position_ms) {
  try {
    const response = await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${position_ms}`, {
      method: 'PUT',
      headers: {
        'Authorization':`'Bearer ${getAccessToken()}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json(); // Parse error response from Spotify
      throw new Error(`Failed to change track progress: ${errorData.error.message}`);
    }
    console.log('seeking...')
  } catch (error) {
    console.error('Error seeking:', error);
    window.electron.premiumRequiredMessage();
  }
}

async function getAccessToken() {
  try {
    const response = await fetch('http://localhost:3001/access-token');
    const data = await response.json();
    if (data) {
      isLoggedIn = true
      console.log(data)
    return data
    }
    
  } catch (error) {
    console.error('Error checking fetching acces token:', error);
    isLoggedIn = false
  }
}




//*-----UPDATE INTERFACE SECTION-----**


function removeDynamicBackground() {                                           
  dynamicBackground.style.backdropFilter = `blur(0.7px)`;   //removes blur
  dynamicBackground.style.background = 'linear-gradient(to top, #000000c2, #00000026)';

}

function applyDynamicBackground() {
                    
  dynamicBackground.style.backgroundColor = `rgba(${hexToRgb(dominantColor, 0.7)}, 0.5`; //0.5 = 50% transparency lower value == more transparent
  dynamicBackground.style.backdropFilter = `blur(0.8px)`;
  lyricsButton.style.stroke = dominantColor
  lyricsButton.style.fill = dominantColor

}

function getBackground(imgUrl, retryCount = 3) {   //sets the album art as background

  
  try {
    document.getElementById('app').style.backgroundImage = `url(${imgUrl})`;
    } catch (error) {
      if (retryCount > 0) {
        getBackground(imgUrl, retryCount - 1)
      }
    }
}

function updateLyricsButton() {

  if (isShowingLyrics) {
    lyricsButton.style.stroke = '#f5f0f0ea'
    lyricsButton.style.fill = '#f5f0f0ea'
  } else {
    lyricsButton.style.stroke = dominantColor
    lyricsButton.style.fill = dominantColor
  }
}

function updateProgressBar() {
  const progressBar = document.getElementById('progress-bar-fill');
  const progressText = document.getElementById('progress');
  const durationText = document.getElementById('duration');
  if (duration && progress) {
    const percentage = (progress / duration) * 100;
    progressBar.style.width = `${percentage}%`;
    progressBar.style.width = `${percentage}%`;
    progressBar.style.backgroundColor = `${dominantColor}80`;
    progressText.textContent = `${formatTime(progress)}`;
    durationText.textContent = `${formatTime(duration)}`;
  } else {
    progressText.textContent = `${formatTime(0)}`;
    durationText.textContent = `${formatTime(0)}`;
  }
}

function updateUI() {
  
  const playState = 'http://localhost:3001/images/pause_icon.png'
  const pauseState = 'http://localhost:3001/images/play_icon.png'

  getBackground(album_cover)

  updateProgressBar();

  if (isPlaying) {
    playIcon.src = playState
    playButtonBackground.style.backgroundColor = `rgba(${hexToRgb(dominantColor, 0.9)})`;
    if (isShowingLyrics) {
      applyDynamicBackground()
    } else {
      removeDynamicBackground()
    }

    if(isShowingPlaylists) {
      playlistButton.style.fill = dominantColor
      playlistButton.style.stroke = dominantColor

    }
  } 
  else {
    playIcon.src = pauseState
    if (album_cover) {
      dynamicBackground.style.backgroundColor = `rgba(${hexToRgb(dominantColor, 0.7)}, 0.80)`; 
    } 
  }
  if (artist && title) { 
    titleText.innerText = title
    artistText.innerText = artist
  } else {
    titleText.innerText = 'Untitled'
    artistText.innerText = 'Unknown Artist'
  }    
  
}



//*-----INIT SECTION----**
function startDataUpdates() {
  setInterval(() => {
    fetchTrackInfo();
    fetchLyrics();
    updateUI();
  }, 1000);
}

async function toggleLoginView() {
  await getAccessToken()
  console.log('Toggling login state. Is logged in:', isLoggedIn);
  const loginContainer = document.getElementById('login-container');
  const content = document.getElementById('content');
  if (isLoggedIn) {
    loginContainer.style.display = 'none';
    content.style.display = 'flex';
  } else {
    loginContainer.style.display = 'flex';
    content.style.display = 'none';
  }
}

function openLoginWindow() {
  return new Promise((resolve, reject) => {
      const loginUrl = 'http://localhost:3001/login'; 
      const width = 600;
      const height = 600;
      const left = (width - 430 );
      const top = (window.innerHeight / 2);
      const features = `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes,toolbar=yes,menubar=yes,location=yes,status=yes`;

      const loginWindow = window.open(
          loginUrl,
          'Login',
          features
      );

      if (!loginWindow) {
          reject(new Error('Unable to open login window'));
          document.getElementById('login-button').innerText = "Log in";   

          return;
      }

      console.log('Login window opened:', loginWindow);

      // Polling for access token in the new window's URL
      const interval = setInterval(() => {
          try {
              const accessToken = isLoggedIn

              if (accessToken) {
                  clearInterval(interval);
                  loginWindow.close();
                  resolve(accessToken);
              }
          } catch (error) {
              // Ignore cross-origin errors until we can access the URL
              console.error('Error accessing login window URL:', error);
          }

          if (loginWindow.closed) {
              clearInterval(interval);
              reject(new Error('Login window was closed by the user'));
              document.getElementById('login-button').innerText = "Log in";   
          }
      }, 500);
  });
}


//*-----FORMAT SECTION-----*

function hexToRgb(hex, darkenFactor = 0.8) { 
  // Remove the '#' if present and parse the hexadecimal value to an integer
  const bigint = parseInt(hex.replace('#', ''), 16);
  
  // Extract the red, green, and blue components from the integer value
  let r = (bigint >> 16) & 255;  // Shift right by 16 bits and mask with 255
  let g = (bigint >> 8) & 255;   // Shift right by 8 bits and mask with 255
  let b = bigint & 255;          // Mask with 255

  // Darken each component
  r = Math.max(0, Math.floor(r * darkenFactor));
  g = Math.max(0, Math.floor(g * darkenFactor));
  b = Math.max(0, Math.floor(b * darkenFactor));

  // Return the RGB components as a string in the format "r, g, b"
  return `${r}, ${g}, ${b}`;
}

function formatTime(milliseconds) {  

  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}






// function hexToRgb2(hex) {
//   hex = hex.replace(/^#/, '');
      
//   // Convert 3-digit hex to 6-digit hex
//   if (hex.length === 4) {
//     hex = hex.split('').map(function (char, i) {
//       return i === 0 ? char + char : i === 1 ? char + char : char + char;
//     }).join('');
//   }
  
//   // Convert hex to RGB
//   const r = parseInt(hex.slice(0, 2), 16);
//   const g = parseInt(hex.slice(2, 4), 16);
//   const b = parseInt(hex.slice(4, 6), 16);
  
//   return { r, g, b };

// }


// function getFilterValues(r, g, b) {
//   let [rF, gF, bF] = [r / 255, g / 255, b / 255];

//   let l = 0.2126 * rF + 0.7152 * gF + 0.0722 * bF;

//   let cr = 1 - rF;
//   let cg = 1 - gF;
//   let cb = 1 - bF;

//   let s = Math.max(rF, gF, bF) - Math.min(rF, gF, bF);
//   let v = Math.max(rF, gF, bF);
//   let c = v - Math.min(rF, gF, bF);

//   let h = 0;
//   if (c != 0) {
//     if (v === rF) {
//       h = (gF - bF) / c;
//     } else if (v === gF) {
//       h = (bF - rF) / c + 2;
//     } else {
//       h = (rF - gF) / c + 4;
//     }
//   }

//   return {
//     invert: 1 - l,
//     sepia: s / 2,
//     saturate: v,
//     hueRotate: h * 60,
//     brightness: l,
//     contrast: c
//   };
// }
// // Function to apply the filter
// function applyColorFilter(element, hex) {
//   const { r, g, b } = hexToRgb2(hex);
//   console.log(hexToRgb2(hex))
//   const filterValues = getFilterValues(r, g, b);
//   const filter = `invert(${filterValues.invert * 100}%) sepia(${filterValues.sepia * 100}%) saturate(${filterValues.saturate * 1000}%) hue-rotate(${filterValues.hueRotate}deg) brightness(160%) contrast(140%)`;
//   element.style.filter = filter;
//   console.log('filter applied')
//   console.log(filter)
// }

  


