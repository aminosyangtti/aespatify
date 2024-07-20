
document.addEventListener('DOMContentLoaded', async () => {

  
    let isLoggedIn;
    let intervalId;
    try {

      
         isLoggedIn = await checkLoginStatus();
         toggleLoginState(isLoggedIn)

         
            
             
        if (isLoggedIn) {
          window.electron.setPosition()
          startDataUpdates()
          clearInterval(intervalId)
          let dynamicBackground = document.getElementById('dynamic-background')
          dynamicBackground.style.backgroundColor = 'rgba(0, 0, 0, 0)';
          // dynamicBackground.style.background = 'linear-gradient(to top, #000000b2, #00000054)'
          dynamicBackground.style.background = 'linear-gradient(to top, #000000c2, #00000026)'

          
          // dynamicBackground.style.backdropFilter = `blur(0.1px)`;                
        } else {
          
          intervalId = setInterval(() => {
            location.reload();
        }, 10000);
          
        }

      
  
      document.getElementById('minimize-button').addEventListener('click', () => {
        window.electron.minimizeWindow();
      });
  
      document.getElementById('close-button').addEventListener('click', () => {
        window.electron.closeWindow();
      });


      document.getElementById('resize-window-button').addEventListener('click', function() {
        window.electron.resizeWindow()

      });

  
      document.getElementById('login-button').addEventListener('click', () => {
        // window.location.href = 'http://localhost:3001/login';
        window.electron.openExternal('http://localhost:3001/login')
        document.getElementById('login-button').innerText = "Logging in...";

        // const loginImage = document.getElementById('login-image');
        // let rotation = 0;
        // const rotateInterval = setInterval(() => {
        //   rotation += 1;
        //   loginImage.style.transform = `rotate(${rotation}deg)`;
        // }, 50);
       

        
      });

      document.getElementById('play-button').addEventListener('click', function() {

        if (isPlaying) {
          pause(); 
      } else {
          play();
          let lyricsSection = document.getElementById('lyrics');  
          updateDynamicBackground(isViewed)
          if (isViewed) { 
            lyricsSection.style.display = 'none'
            isViewed = false


          } else { 
             lyricsSection.style.display = 'flex'
            isViewed = true}
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
    
        // Calculate seek position in milliseconds
        const seekPositionMs = (percentageClicked / 100) * duration; 
    
        seek(seekPositionMs);
        console.log(formatTime(seekPositionMs))
    });
  
  

      document.getElementById('lyrics-button').addEventListener('click', function() {
        let lyricsSection = document.getElementById('lyrics');  
        if (isPlaying) {
          updateLyricsButton()

          updateDynamicBackground(isViewed)
          if (isViewed) { 
            lyricsSection.style.display = 'none'
            isViewed = false


          } else { 
             lyricsSection.style.display = 'flex'

            isViewed = true}

        }

      });



      window.electron.onWindowResize((data) => {
        console.log(`Window resized to: ${data.width} x ${data.height}`);

        const width = data.width
        const height = data.height

        const text = document.getElementById('lyrics');

        if (width >= 430 && height >= 180 && height < 280 ) {
          console.log('resizing text..')
          text.style.fontSize = '24px';
        } else if (width >= 430 && height >= 280 && width < 640 && height < 640) {
          text.style.fontSize = '28px';
          console.log('resizing text 2..')
          console.log(width, height)
        } else if (width >= 640 && height >=640 && width < 720 && height < 720 ){
          text.style.fontSize = '36px';
          console.log('resizing text 3..')

        } else {

          console.log('resizing text 48px..')
          text.style.fontSize = '48px';

        }

      });




      // window.addEventListener('load', () => {
      //   const container = document.getElementById('track-info');
      //   const textElement = document.getElementById('scrolling-text');
      //   const containerWidth = container.clientWidth;
      //   const textWidth = textElement.clientWidth;
    
      //   if (textWidth >= containerWidth) {
      //     let scrollAmount = 0;
    
      //     function scrollText() {
      //       scrollAmount -= 5; // Adjust the scroll speed as needed
      //       textElement.style.transform = `translateX(${scrollAmount}px)`;
    
      //       if (Math.abs(scrollAmount) >= textWidth) {
      //         scrollAmount = containerWidth;
      //       }
    
      //       requestAnimationFrame(scrollText);
      //     }
    
      //     scrollText();
      //   }

      //   const container2 = document.getElementById('lyrics-section');
      //   const text = document.getElementById('lyrics');
      
      //   let fontSize = parseFloat(window.getComputedStyle(text).fontSize);
      //   console.log(fontSize)
      
      //   function resizeText() {
      
      //     while (text.scrollWidth > container2.clientWidth || text.scrollHeight > container2.clientHeight) {
      //       fontSize -= 1;
      //       text.style.fontSize = fontSize + 'px';
      //       console.log('Resizing text:', fontSize);
      //       if (fontSize <= 10) {
      //         break; // Avoid font size getting too small
      //       }
      //     }
        
      
      //   }
      
       
      //   resizeText()
      // });


  
      window.electron.receive('fromMain', (data) => {
        console.log(data);

      });


    
    } catch (error) {
      console.error('Error during initialization:', error);
    }
});

  

  let isViewed = false;
  let progress;
  let isPlaying;
  let dominantColor
  let duration;

  class DurationTracker {
      constructor() {
          this._duration = 0;
      }
  
      get duration() {
          return this._duration;
      }
  
      set duration(value) {
          this._duration = value;
          this.fetchLyrics();

      }
  
      async fetchLyrics() {

        
          console.log('Duration changed to', this._duration, '. Fetching lyrics...');
          try {
            const response = await fetch('http://localhost:3001/current-lyrics');
            const data = await response.json();
            const currentSecond = Math.floor(progress / 1000);
            let lyrics = document.getElementById('lyrics')

            if (progress == this.duration) {
              lyrics.innerText = ''
            }
  
          if (isPlaying) {
              if (typeof data.lyrics === 'object') {
  
                  const lyricEntry = data.lyrics.find(entry => entry.seconds === currentSecond);

                    lyrics.innerText = `${lyricEntry.lyrics}`;
                    resizeText();
                    if (3 >= progress) {
                      lyrics.innerText = ` `;
                    }
                 
                  console.log(lyricEntry.lyrics)
              } else {
                lyrics.innerText = `No lyrics available. `;
                resizeText();
          }
          } else { 
            lyrics.innerText = ` `;}
        } catch (error) {
          
          
        }
  
      }
  }
  
  const tracker = new DurationTracker();
  

  function getBackground(imgUrl, retryCount = 3) {

      try {
        document.getElementById('app').style.backgroundImage = `url(${imgUrl})`;


      } catch (error) {
        if (retryCount > 0) {
          getBackground(imgUrl, retryCount - 1)

        }
      }

    }

  
  async function fetchTrackInfo() {
      try {
        const response = await fetch('http://localhost:3001/current-track');
        const data = await response.json();
        progress = data.progress - 200;
        duration = data.duration;
        tracker.duration = data.duration
        isPlaying = data.isPlaying;
        let title = data.title
        let artist = data.artist
        let album_cover = data.album_cover
        dominantColor = data.dominantColor
        let dynamicBackground = document.getElementById('dynamic-background');
      
        let titleText = document.getElementById('title')
        let artistText = document.getElementById('artist')
        let progressBar = document.getElementById('progress-bar')
        let playButtonBackground = document.getElementById('play-button-bg')
        
        updatePlayButton()

        if (artist && title) {
          titleText.innerText = title
          artistText.innerText = artist
          
        } else {
          titleText.innerText = 'Untitled'
          artistText.innerText = 'Unknown'
        }

        if (album_cover) {getBackground(album_cover);}

        if ( 5 >= progress / 1000 || progress == duration) {

          if (isViewed) {

     
            dynamicBackground.style.backgroundColor = `rgba(${hexToRgb(dominantColor, 0.7)}, 0.5`;

            const lyricsButton = document.getElementById('lyrics-button');
            lyricsButton.style.stroke = dominantColor
            lyricsButton.style.fill = dominantColor

            // const lyricsIcon = document.getElementById('lyrics-icon');
            // const viewState = "http://localhost:3001/images/mic_filled.png";
            // applyColorFilter(lyricsButton, dominantColor);
            // lyricsIcon.src = viewState;
          }

        }


        if (progress) {updateProgressBar(progress, duration);} 
        if (isPlaying) {
            progressBar.style.backgroundColor = `${dominantColor}80`;
            playButtonBackground.style.backgroundColor = `rgba(${hexToRgb(dominantColor, 0.9)})`; //0.5 sets 50% transparency
        
      } else {

        if (album_cover) {
          // dynamicBackground.style.background = 'linear-gradient(to top, #00000000, #00000000)';
          dynamicBackground.style.backgroundColor = `rgba(${hexToRgb(dominantColor, 0.7)}, 0.80)`;

        }
        
      }

      } catch (error) {
      }
  }
  
  // async function fetchLyrics() {
    //     try {
    //       const response = await fetch('http://localhost:3001/current-lyrics');
    //       const data = await response.json();
    //       const currentSecond = Math.floor(progress / 1000);
    //       let lyrics = document.getElementById('lyrics')

    //     if (isPlaying) {
    //         if (typeof data.lyrics === 'object') {

    //             const lyricEntry = data.lyrics.find(entry => entry.seconds === currentSecond);
    //             setTimeout(() => {
    //               lyrics.innerText = `${lyricEntry.lyrics}`;
    //            }, 500);
               
    //             console.log(lyricEntry.lyrics)
    //         } else {
    //           lyrics.innerText = `No lyrics available. `;
    //     }
    //     } else { 
    //       lyrics = ` `;}
    //   } catch (error) {
    //     // console.error('sasf', error)
        
        
    //   }

  // }
 
  function formatTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }
  function updateProgressBar(currentTime, duration) {
        const progressBar = document.getElementById('progress-bar-fill');
        const progress = document.getElementById('progress');
        const durationText = document.getElementById('duration');

        const percentage = (currentTime / duration) * 100;
        progressBar.style.width = `${percentage}%`;

        if (currentTime <= 0) {
          progress.textContent = `0:00`;
        } else {
          progress.textContent = `${formatTime(currentTime)}`;

        }

        durationText.textContent = `${formatTime(duration)}`;
        
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
  
    
  
  function updateDynamicBackground(isViewed) {
  
      const dynamicBackground = document.getElementById('dynamic-background');
      

       
      if (isViewed) {
        
        dynamicBackground.style.backdropFilter = `blur(0.7px)`;
        // dynamicBackground.style.backgroundColor = `rgba(${hexToRgb(dominantColor, 0.35)}, 0.5)`;
        dynamicBackground.style.backgroundColor = ' #00000000';
        // dynamicBackground.style.background = 'linear-gradient(to top, #000000b2, #00000054)'
        dynamicBackground.style.background = 'linear-gradient(to top, #000000c2, #00000026)'
        document.getElementById('lyrics-button').style.filter = 'none'

      } else {
        // dynamicBackground.style.background = 'linear-gradient(to top, #00000000, #00000000)'
        dynamicBackground.style.backgroundColor = `rgba(${hexToRgb(dominantColor, 0.7)}, 0.5`;
        dynamicBackground.style.backdropFilter = `blur(0.8px)`;

       
        

        
  
      }
  
  }

  function updateLyricsButton() {

    const lyricsButton = document.getElementById('lyrics-button');
    // const lyricsIcon = document.getElementById('lyrics-icon');
    // const viewState = "http://localhost:3001/images/mic_filled.png";
    // const hideState = "http://localhost:3001/images/mic_icon.png";


    if (isViewed) {
      // lyricsIcon.src = hideState;
      // lyricsButton.style.filter = 'none';
     
            lyricsButton.style.stroke = '#f5f0f0ea'
            lyricsButton.style.fill = '#f5f0f0ea'
    } else {
      // applyColorFilter(lyricsButton, dominantColor);
      // lyricsIcon.src = viewState
      lyricsButton.style.stroke = dominantColor
      lyricsButton.style.fill = dominantColor

    }
    console.log(dominantColor)
  }

  function updatePlayButton() {
  
      const playButton = document.getElementById('play-button');
      const playIcon = document.getElementById('play-icon');
      const playState = 'http://localhost:3001/images/pause_icon.png'
      const pauseState = 'http://localhost:3001/images/play_icon.png'
      playIcon.src = isPlaying ? playState : pauseState
      playButton.style.animation = 'scale 0.5s ease-in-out'
          // const currentSource = playIcon.src;
          
          // const newSource = (currentSource.includes('play_icon')) ? 'http://localhost:3001/images/pause_icon.png' : 'http://localhost:3001/images/play_icon.png';
          // playIcon.src = newSource;
          
          setTimeout(() => {
            playButton.style.animation = 'none';
        }, 500);
  }
  
  
  function startDataUpdates() {

  
      setInterval(() => {
        fetchTrackInfo();
       
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
        
        // loginContainer.classList.toggle('hidden', isLoggedIn);
        // console.log('login-container hidden class applied:', loginContainer.classList.contains('hidden'));
        
        // content.classList.toggle('hidden', !isLoggedIn);
        // console.log('content hidden class applied:', content.classList.contains('hidden'));
}


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


function hexToRgb2(hex) {
  hex = hex.replace(/^#/, '');
      
  // Convert 3-digit hex to 6-digit hex
  if (hex.length === 4) {
    hex = hex.split('').map(function (char, i) {
      return i === 0 ? char + char : i === 1 ? char + char : char + char;
    }).join('');
  }
  
  // Convert hex to RGB
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  
  return { r, g, b };

}


function getFilterValues(r, g, b) {
  let [rF, gF, bF] = [r / 255, g / 255, b / 255];

  let l = 0.2126 * rF + 0.7152 * gF + 0.0722 * bF;

  let cr = 1 - rF;
  let cg = 1 - gF;
  let cb = 1 - bF;

  let s = Math.max(rF, gF, bF) - Math.min(rF, gF, bF);
  let v = Math.max(rF, gF, bF);
  let c = v - Math.min(rF, gF, bF);

  let h = 0;
  if (c != 0) {
    if (v === rF) {
      h = (gF - bF) / c;
    } else if (v === gF) {
      h = (bF - rF) / c + 2;
    } else {
      h = (rF - gF) / c + 4;
    }
  }

  return {
    invert: 1 - l,
    sepia: s / 2,
    saturate: v,
    hueRotate: h * 60,
    brightness: l,
    contrast: c
  };
}
// Function to apply the filter
function applyColorFilter(element, hex) {
  const { r, g, b } = hexToRgb2(hex);
  console.log(hexToRgb2(hex))
  const filterValues = getFilterValues(r, g, b);
  const filter = `invert(${filterValues.invert * 100}%) sepia(${filterValues.sepia * 100}%) saturate(${filterValues.saturate * 1000}%) hue-rotate(${filterValues.hueRotate}deg) brightness(160%) contrast(140%)`;
  element.style.filter = filter;
  console.log('filter applied')
  console.log(filter)
}

  


