
document.addEventListener('DOMContentLoaded', async () => {

  let isLoggedIn;
  let intervalId;
   try {
    isLoggedIn = await checkLoginStatus();               //TODO: REWRITE AUTH FLOW
    toggleLoginState(isLoggedIn)

    if (isLoggedIn) {
      window.electron.setPosition()
      startDataUpdates()
      clearInterval(intervalId)
      
      let dynamicBackground = document.getElementById('dynamic-background');
      dynamicBackground.style.backgroundColor = 'rgba(0, 0, 0, 0)';
      dynamicBackground.style.background = 'linear-gradient(to top, #000000c2, #00000026)';
    } else {
      intervalId = setInterval(() => {
        location.reload();
      }, 5000);
    }
    
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
      window.electron.openExternal('http://localhost:3001/login');
      document.getElementById('login-button').innerText = "Logging in...";        
      });

    document.getElementById('play-button').addEventListener('click', function() {
      let lyricsSection = document.getElementById('lyrics');
      if (isPlaying) {
        pause(); 
      } 
      else {
        play();
        updateDynamicBackground(); 
        if (isLyricShowing) { 
          lyricsSection.style.display = 'none';  //TO DO dont need this if came up with a fix to apply bg changes based on the play state (challenge factor: constant calls to fetch trackinfo)
          isLyricShowing = false;
        } else { 
          lyricsSection.style.display = 'flex';
          isLyricShowing = true;
        }
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
    
        // Calculate seek position in milliseconds     //TO BE FIXED: console log shows wrong time 
      const seekPositionMs = (percentageClicked / 100) * duration;
      seek(seekPositionMs);
      console.log(seekPositionMs)
      console.log(formatTime(seekPositionMs))
    });
    
    document.getElementById('lyrics-button').addEventListener('click', function() {
      let lyricsSection = document.getElementById('lyrics');  
      if (isPlaying) {
        updateLyricsButton();
        updateDynamicBackground();

        if (isLyricShowing) { // if lyrics are shown, hides it
          lyricsSection.style.display = 'none';
          isLyricShowing = false; 
        } else { 
          lyricsSection.style.display = 'flex';
          isLyricShowing = true;
        }
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









let isLyricShowing = false;
let progress;
let isPlaying;
let dominantColor;
let duration;


//*-----API SECTION-----**

async function fetchLyrics() {

      try {
        const response = await fetch('http://localhost:3001/current-lyrics');
        const data = await response.json();
        const currentSecond = progress / 1000; //converts ms to seconds
        let lyrics = document.getElementById('lyrics')

        if (progress == duration) { //when the song ends
          lyrics.innerText = ''
        }

        if (isPlaying) {
          if (typeof data.lyrics === 'object') {

            const filteredLyrics = data.lyrics.filter(entry => entry.seconds <= currentSecond); 
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
      } catch (error) { console.log(error) //not console.error cus its annoying 

        }
}
  
async function fetchTrackInfo() {
  try {
    const response = await fetch('http://localhost:3001/current-track');
    const data = await response.json();
    let title = data.title;
    let artist = data.artist;
    let album_cover = data.album_cover;

    progress = data.progress;
    duration = data.duration;
    isPlaying = data.isPlaying;
    dominantColor = data.dominantColor;
    
    
    const dynamicBackground = document.getElementById('dynamic-background');  
    const titleText = document.getElementById('title');
    const artistText = document.getElementById('artist');
    const playButtonBackground = document.getElementById('play-button-bg');
    const lyricsButton = document.getElementById('lyrics-button');

        
    updatePlayButton();

    if (artist && title) { 
      titleText.innerText = title
      artistText.innerText = artist
    } else {
      titleText.innerText = 'Untitled'
      artistText.innerText = 'Unknown Artist'
    }

    if (album_cover) {getBackground(album_cover)}

    if ( 5 >= progress / 1000 || progress == duration) { //TO DO: find a permanent fix that updates the dynamicbackground when song changes
      if (isLyricShowing) {
        dynamicBackground.style.backgroundColor = `rgba(${hexToRgb(dominantColor, 0.7)}, 0.5`; //TODO put this in a function
        lyricsButton.style.stroke = dominantColor
        lyricsButton.style.fill = dominantColor
      }
    }
    if (progress) {
      updateProgressBar(progress, duration);
    } 
    
    if (isPlaying) {
      playButtonBackground.style.backgroundColor = `rgba(${hexToRgb(dominantColor, 0.9)})`;
    } 
    else {
      if (album_cover) {
        dynamicBackground.style.backgroundColor = `rgba(${hexToRgb(dominantColor, 0.7)}, 0.80)`; //0.8 sets transparency lower value == more transparent
      } 
    }
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
  }
}

async function getAccessToken() {
  try {
    const response = await fetch('http://localhost:3001/access-token');
    const data = await response.text();
    if (data == 'failed to get access token') {
      console.log('failed to get access token');
    } else {
        // console.log('Access Token:', data);
        // console.log(typeof data)
      return data
    }
  } catch (error) {
    console.error('Error checking fetching acces token:', error);
  }
}




//*-----UPDATE INTERFACE SECTION-----**

function updateDynamicBackground() {                                           //to be rewritten: separate into two functions (apply and remove bg) so the conditions will be outside when called
  const dynamicBackground = document.getElementById('dynamic-background');                            
  if (isLyricShowing) {
    dynamicBackground.style.backdropFilter = `blur(0.7px)`;   //removes blur
    dynamicBackground.style.background = 'linear-gradient(to top, #000000c2, #00000026)'
  } else {
    dynamicBackground.style.backgroundColor = `rgba(${hexToRgb(dominantColor, 0.7)}, 0.5`;
    dynamicBackground.style.backdropFilter = `blur(0.8px)`;
  }
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
  const lyricsButton = document.getElementById('lyrics-button');

  if (isLyricShowing) {
    lyricsButton.style.stroke = '#f5f0f0ea'
    lyricsButton.style.fill = '#f5f0f0ea'
  } else {
    lyricsButton.style.stroke = dominantColor
    lyricsButton.style.fill = dominantColor
  }
}

function updatePlayButton() {
  
  const playIcon = document.getElementById('play-icon');
  const playState = 'http://localhost:3001/images/pause_icon.png'
  const pauseState = 'http://localhost:3001/images/play_icon.png'
  playIcon.src = isPlaying ? playState : pauseState
}

function updateProgressBar(currentTime, duration) {
  const progressBar = document.getElementById('progress-bar-fill');
  const progressText = document.getElementById('progress');
  const durationText = document.getElementById('duration');
  const percentage = (currentTime / duration) * 100;

  progressBar.style.width = `${percentage}%`;
  progressBar.style.backgroundColor = `${dominantColor}80`;
  
  if (currentTime <= 0) {
    progressText.textContent = `0:00`;
  } 
  else {
    progressText.textContent = `${formatTime(currentTime)}`;
  }
  durationText.textContent = `${formatTime(duration)}`;
}


//*-----INIT SECTION----**
function startDataUpdates() {
  setInterval(() => {
    fetchTrackInfo();
    fetchLyrics();
  }, 1000);
}

async function checkLoginStatus() {
  try {
    const response = await fetch('http://localhost:3001/is-logged-in');
    const data = await response.json();
    console.log('Login status:', data);
    return data;
  } catch (error) {
    console.error('Error checking login status:', error);
    return false;
  }
}

function toggleLoginState(isLoggedIn) {
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

  


