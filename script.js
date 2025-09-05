let subtitles = [];
let video = document.getElementById('video');
let subtitleDisplay = document.getElementById('subtitleDisplay');
let vclose = document.querySelector('.v-close');
let srtfname = document.querySelector('.srtName');
let progressBar = document.getElementById('progressBar');
let currentTimeDisplay = document.getElementById('currentTime');
let durationDisplay = document.getElementById('duration');
let searchInput = document.getElementById('searchSubtitles');
let playPauseIcon = document.getElementById('playPauseIcon');
let subStyleSetting = document.querySelector('.style-controls');
let subSizeInd = document.getElementById('fZ');
let nsubf = 0;


function openSettings() {
    if (subStyleSetting.style.display=="flex") {
        subStyleSetting.style.display="none";
    }else{
        subStyleSetting.style.display="flex";
    }
}

// Initialize the app
function init() {
    setupEventListeners();
    loadSubtitleStyle();
}

function setupEventListeners() {
    // Video event listeners
    //video.addEventListener('timeupdate', updateProgress);
    video.addEventListener('timeupdate', highlightSubtitle);
   // video.addEventListener('loadedmetadata', updateDuration);
    //video.addEventListener('play', updatePlayPauseIcon);
   // video.addEventListener('pause', updatePlayPauseIcon);
    
    // Progress bar listener
    //progressBar.addEventListener('input', seekVideo);
    
    // Search functionality
    searchInput.addEventListener('input', filterSubtitles);
    
    // Double click on subtitle display to edit current subtitle
    subtitleDisplay.addEventListener('dblclick', () => editSubtitle(null));
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Prevent pull-down refresh (mainly Chrome on Android)
    document.addEventListener('touchstart', function (e) {
        if (e.touches.length > 1) return;
        this._startY = e.touches[0].clientY;
    }, { passive: false });
    
    document.addEventListener('touchmove', function (e) {
        const y = e.touches[0].clientY;
        const deltaY = y - this._startY;
        if (window.scrollY === 0 && deltaY > 0) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // Disable back navigation
    history.pushState(null, null, location.href);
    window.addEventListener('popstate', function () {
        history.pushState(null, null, location.href);
        Swal.fire('Back navigation is disabled');
    });
    
    // File input change event
    document.getElementById('fileInput').addEventListener('change', handleSrtFileSelect);
}

function handleSrtFileSelect(event) {
    console.log('File input changed');
    const file = event.target.files[0];
    if (!file) {
        console.error('No file selected');
        return;
    }
    srtfname.textContent = file.name;
    console.log('File selected:', file.name);
    const reader = new FileReader();
    reader.onload = function(e) {
        console.log('FileReader loaded');
        subtitles = parseSRT(e.target.result);
        console.log('Subtitles parsed:', subtitles);
        renderSubtitles();
    };
    reader.onerror = function(err) {
        console.error('FileReader error:', err);
    };
    reader.readAsText(file);
}

function chooseVideo() {
    Swal.fire({
        title: 'Choose Video Source',
        html: `<button onclick='selectLocalVideo()' class='swal2-confirm swal2-styled'>Local File</button>
               <button onclick='enterVideoURL()' class='swal2-confirm swal2-styled'>URL</button>`,
        showConfirmButton: false,
        showCloseButton: true
    });
}

function selectSrt() {
    document.getElementById('fileInput').click();
}

function selectLocalVideo() {
    Swal.close();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = event => {
        const file = event.target.files[0];
        const url = URL.createObjectURL(file);
        video.src = url;
        video.load();
    };
    input.click();
}

function playM3u8(videoSrc, poster) {
    video.poster = poster;
    if (Hls.isSupported()) {
        var hls = new Hls();
        hls.loadSource(videoSrc);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, function() {
            updatePlayPauseIcon();
        });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = videoSrc;
        video.addEventListener('loadedmetadata', function() {
            updatePlayPauseIcon();
        });
    } else {
        console.log("Can't play HLS stream");
    }
}

function enterVideoURL() {
    Swal.fire({
        title: 'Enter Video URL',
        input: 'text',
        inputPlaceholder: 'https://example.com/video.mp4',
        showCancelButton: true,
        confirmButtonText: 'Load',
        didOpen: () => {
            const input = Swal.getInput();
            input.addEventListener('input', () => {
                input.value = input.value.replace('/u/', '/api/file/');
            });
        }
    }).then((result) => {
        if (result.isConfirmed && result.value) {
            if (result.value.includes("m3u8")) {
                playM3u8(result.value, "");
            } else {
                video.src = result.value;
                video.load();
            }
        }
    });
}

function parseSRT(srtText) {
    const blocks = srtText.trim().split(/\r?\n\r?\n/);
    const subtitleData = [];

    for (const block of blocks) {
        const lines = block.trim().split(/\r?\n/);
        if (lines.length >= 3) {
            const id = parseInt(lines[0]);
            const time = lines[1];
            const text = lines.slice(2).join(" ").trim();
            subtitleData.push({ id, time, text });
        } else if (lines.length === 2) {
            const id = parseInt(lines[0]);
            const time = lines[1];
            subtitleData.push({ id, time, text: "" });
        }
    }

    return subtitleData;
}

function renderSubtitles() {
    const container = document.getElementById('editorContainer');
    container.innerHTML = "";
    
    subtitles.forEach((sub, i) => {
        const times = sub.time.split(' --> ');
        const startTime = convertToSeconds(times[0]);
        const endTime = convertToSeconds(times[1]);
        
        const subElement = document.createElement('div');
        subElement.className = 'subtitle-item';
        subElement.dataset.index = i;
        
        subElement.innerHTML = `
            <div class="subtitle-time">${formatTime(startTime)} - ${formatTime(endTime)}</div>
            <div class="subtitle-text">${sub.text || '<i>No text</i>'}</div>
            <div class="subtitle-actions">
                <button class="subtitle-action-btn" onclick="editSubtitle(${i})" title="Edit">
                    <span class="material-icons">edit</span>
                </button>
                <button class="subtitle-action-btn" onclick="removeSubtitle(${i})" title="Remove">
                    <span class="material-icons">delete</span>
                </button>
                <button class="subtitle-action-btn" onclick="seekToSubtitle(${i})" title="Go to time">
                    <span class="material-icons">play_arrow</span>
                </button>
            </div>
        `;
        
        subElement.onclick = (e) => {
            if (!e.target.closest('.subtitle-actions')) {
                editSubtitle(i);
            }
        };
        
        container.appendChild(subElement);
    });
    
    // Highlight current subtitle if video is playing
    if (!video.paused) {
        highlightSubtitle();
    }
}

function filterSubtitles() {
    const searchTerm = searchInput.value.toLowerCase();
    const subtitleItems = document.querySelectorAll('.subtitle-item');
    
    subtitleItems.forEach(item => {
        const subtitleText = item.querySelector('.subtitle-text').textContent.toLowerCase();
        if (subtitleText.includes(searchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

function highlightSubtitle() {
    let currentTime = video.currentTime;
    const subtitleItems = document.querySelectorAll('.subtitle-item');
    
    subtitleItems.forEach(item => item.classList.remove('active', 'highlight'));
    subtitleDisplay.innerHTML = "";
    subtitles.forEach((sub, i) => {
        let times = sub.time.split(' --> ');
        let start = convertToSeconds(times[0]);
        let end = convertToSeconds(times[1]);
        
        if (currentTime >= start && currentTime <= end) {
            const item = document.querySelector(`.subtitle-item[data-index="${i}"]`);
            if (item) {
                item.classList.add('active');
                item.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            
            console.log(JSON.stringify(sub));
            if (sub.text) {
                subtitleDisplay.innerHTML = sub.text;
            } else {
                subtitleDisplay.innerHTML = "";
            }
            nsubf = i;
        }
    });
}

function convertToSeconds(timeString) {
    let parts = timeString.split(':');
    let seconds = parseFloat(parts[2].replace(',', '.'));
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + seconds;
}

function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

async function editSubtitle(index) {
    if (index === null) index = nsubf;
    if (index === undefined || index < 0 || index >= subtitles.length) {
        Swal.fire("Error", "No subtitle selected", "error");
        return;
    }
    
    const wasPlaying = !video.paused;
    if (wasPlaying) video.pause();
    
    const { value: formValues } = await Swal.fire({
        title: 'Edit Subtitle',
        html: `
            <div style="width: 100%; margin-bottom: 1rem;">
                <label for="timeInput" style="display: block; text-align: left; margin-bottom: 0.5rem;">Timecode</label>
                <input id="timeInput" class="swal2-input" value="${subtitles[index].time}" oninput="formatTimeInput(this)">
            </div>
            <div style="width: 100%;">
                <label for="textInput" style="display: block; text-align: left; margin-bottom: 0.5rem;">Text</label>
                <textarea id="textInput" class="swal2-textarea" style="height: 120px;">${subtitles[index].text}</textarea>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Save',
        cancelButtonText: 'Cancel',
        preConfirm: () => {
            return {
                time: document.getElementById('timeInput').value,
                text: document.getElementById('textInput').value
            };
        },
        didOpen: () => {
            // Add action buttons
            const modal = Swal.getHtmlContainer();
            const buttonsDiv = document.createElement('div');
            buttonsDiv.style = 'display: flex; gap: 0.5rem; margin-top: 1rem;';
            buttonsDiv.innerHTML = `
                <button type="button" onclick="translateText(${index})" class="swal2-confirm swal2-styled" style="background: #4cc9f0;">
                    Translate
                </button>
                <button type="button" onclick="removeSubtitle(${index})" class="swal2-confirm swal2-styled" style="background: #f94144;">
                    Remove
                </button>
                <button type="button" onclick="setCurrentTimeToSubtitle(${index})" class="swal2-confirm swal2-styled" style="background: #3a0ca3;">
                    Set to Current Time
                </button>
            `;
            modal.appendChild(buttonsDiv);
        }
    });
    
    if (formValues) {
        subtitles[index].time = formValues.time;
        subtitles[index].text = formValues.text;
        renderSubtitles();
        highlightSubtitle();
    }
    
    if (wasPlaying) video.play();
}

function setCurrentTimeToSubtitle(index) {
    const currentTime = video.currentTime;
    const duration = 5; // 5 seconds default duration
    
    subtitles[index].time = getSrtTimeRange(currentTime, duration);
    document.getElementById('timeInput').value = subtitles[index].time;
}

function formatSrtTime(seconds) {
    const ms = Math.floor((seconds % 1) * 1000);
    const totalSeconds = Math.floor(seconds);
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

function getSrtTimeRange(currentTime, duration = 5) {
    const start = formatSrtTime(currentTime);
    const end = formatSrtTime(currentTime + duration);
    return `${start} --> ${end}`;
}

async function addSubtitle() {
    const wasPlaying = !video.paused;
    if (wasPlaying) video.pause();
    
    const { value: formValues } = await Swal.fire({
        title: 'Add Subtitle',
        html: `
            <div style="width: 100%; margin-bottom: 1rem;">
                <label for="newTimeInput" style="display: block; text-align: left; margin-bottom: 0.5rem;">Timecode</label>
                <input id="newTimeInput" class="swal2-input" value="${getSrtTimeRange(video.currentTime, 5)}" oninput="formatTimeInput(this)">
            </div>
            <div style="width: 100%;">
                <label for="newTextInput" style="display: block; text-align: left; margin-bottom: 0.5rem;">Text</label>
                <textarea id="newTextInput" class="swal2-textarea" placeholder="Subtitle Text" style="height: 120px;"></textarea>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Add',
        preConfirm: () => {
            return {
                time: document.getElementById('newTimeInput').value,
                text: document.getElementById('newTextInput').value
            };
        }
    });
    
    if (formValues) {
        subtitles.push({ 
            id: subtitles.length + 1, 
            time: formValues.time, 
            text: formValues.text 
        });
        
        // Sort subtitles by start time
        subtitles.sort((a, b) => {
            const aStart = convertToSeconds(a.time.split(' --> ')[0]);
            const bStart = convertToSeconds(b.time.split(' --> ')[0]);
            return aStart - bStart;
        });
        
        // Reassign IDs
        subtitles.forEach((sub, i) => sub.id = i + 1);
        
        renderSubtitles();
    }
    
    if (wasPlaying) video.play();
}

function removeSubtitle(index) {
    Swal.fire({
        title: 'Are you sure?',
        text: 'This action cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
        if (result.isConfirmed) {
            subtitles.splice(index, 1);
            // Reassign IDs
            subtitles.forEach((sub, i) => sub.id = i + 1);
            renderSubtitles();
            Swal.fire('Deleted!', 'Your subtitle has been deleted.', 'success');
        }
    });
}

function seekToSubtitle(index) {
    const times = subtitles[index].time.split(' --> ');
    const startTime = convertToSeconds(times[0]);
    video.currentTime = startTime;
    video.play();
}

function replaceFromAll(patternStr, replacement, flags = 'g') {
    try {
        const regex = new RegExp(patternStr, flags);
        subtitles.forEach((sub, i) => {
            sub.text = sub.text.replace(regex, replacement);
        });
        renderSubtitles();
    } catch (err) {
        console.error("Invalid regex:", err.message);
        Swal.fire("Invalid Regex", err.message, "error");
    }
}

async function promptRegexReplace() {
    const { value: formValues } = await Swal.fire({
        title: 'Find and Replace',
        html:
            `<input id="patternInput" class="swal2-input" placeholder="Regex pattern (e.g., hello|hi)">` +
            `<input id="replacementInput" class="swal2-input" placeholder="Replacement text">`,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Replace All',
        preConfirm: () => {
            const pattern = document.getElementById('patternInput').value.trim();
            const replacement = document.getElementById('replacementInput').value;
            if (!pattern) {
                Swal.showValidationMessage('Pattern is required');
                return false;
            }
            return { pattern, replacement };
        }
    });

    if (formValues) {
        replaceFromAll(formValues.pattern, formValues.replacement);
        Swal.fire('Done!', 'Replacement applied to all subtitles.', 'success');
    }
}

function adjustAllTimings() {
    Swal.fire({
        title: 'Adjust All Timings',
        html: `
            <p>Shift all subtitle timings by a fixed amount:</p>
            <input type="number" id="timeAdjust" class="swal2-input" placeholder="Seconds to adjust" step="0.1">
            <select id="adjustDirection" class="swal2-input">
                <option value="add">Add time</option>
                <option value="subtract">Subtract time</option>
            </select>
        `,
        showCancelButton: true,
        confirmButtonText: 'Adjust',
        preConfirm: () => {
            const adjustValue = parseFloat(document.getElementById('timeAdjust').value);
            const direction = document.getElementById('adjustDirection').value;
            
            if (isNaN(adjustValue)) {
                Swal.showValidationMessage('Please enter a valid number');
                return false;
            }
            
            return { adjustValue, direction };
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const { adjustValue, direction } = result.value;
            
            subtitles.forEach(sub => {
                const times = sub.time.split(' --> ');
                let start = convertToSeconds(times[0]);
                let end = convertToSeconds(times[1]);
                
                if (direction === 'add') {
                    start += adjustValue;
                    end += adjustValue;
                } else {
                    start -= adjustValue;
                    end -= adjustValue;
                }
                
                // Ensure times don't go negative
                start = Math.max(0, start);
                end = Math.max(0, end);
                
                sub.time = `${formatSrtTime(start)} --> ${formatSrtTime(end)}`;
            });
            
            renderSubtitles();
            Swal.fire('Success!', 'All timings have been adjusted.', 'success');
        }
    });
}

function translateText(index) {
    Swal.fire({
        title: 'Translate Text',
        input: 'text',
        inputPlaceholder: 'Enter translated text',
        inputValue: subtitles[index].text,
        showCancelButton: true,
        confirmButtonText: 'Save Translation',
        preConfirm: (translatedText) => {
            subtitles[index].text = translatedText;
            renderSubtitles();
        }
    });
}

async function translateAll(elm) {
    elm.textContent = "Translating...";
    elm.disabled = true;
    
    try {
        const texts = subtitles.map(sub => sub.text);
        const translated = await translateFetch(texts);
        
        subtitles.forEach((sub, i) => {
            sub.text = translated[i];
        });
        
        renderSubtitles();
        elm.textContent = "Translated to Sinhala";
    } catch (error) {
        console.error("Translation error:", error);
        Swal.fire('Error', 'Translation failed. Please try again.', 'error');
        elm.textContent = "Translate to Sinhala";
        elm.disabled = false;
    }
}

async function translateFetch(array) {
    // This is a mock function - replace with your actual translation API
    console.log("Translating:", array);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock translation - replace with actual API call
    return array.map(text => `[Sinhala] ${text}`);
}

function downloadSRT() {
    Swal.fire({
        title: 'Download SRT File',
        input: 'text',
        inputPlaceholder: 'Enter file name',
        inputValue: 'subtitles',
        showCancelButton: true,
        confirmButtonText: 'Download',
        preConfirm: (fileName) => {
            if (fileName) {
                const srtContent = generateSRT();
                const blob = new Blob([srtContent], { type: 'text/plain' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `${fileName}.srt`;
                link.click();
            }
        }
    });
}

function generateSRT() {
    let srtContent = "";
    subtitles.forEach((sub, index) => {
        srtContent += `${index + 1}\n${sub.time}\n${sub.text}\n\n`;
    });
    return srtContent;
}

function updateProgress() {
    if (!isNaN(video.duration)) {
        const value = (video.currentTime / video.duration) * 100;
        progressBar.value = value;
        currentTimeDisplay.textContent = formatTime(video.currentTime);
    }
}

function updateDuration() {
    if (!isNaN(video.duration)) {
        durationDisplay.textContent = formatTime(video.duration);
    }
}

function seekVideo() {
    const seekTime = (progressBar.value / 100) * video.duration;
    video.currentTime = seekTime;
}

function togglePlayPause() {
    if (video.paused) {
        video.play();
    } else {
        video.pause();
    }
}

function updatePlayPauseIcon() {
    playPauseIcon.textContent = video.paused ? 'play_arrow' : 'pause';
}

function skipBackward() {
    video.currentTime = Math.max(0, video.currentTime - 5);
}

function skipForward() {
    video.currentTime = Math.min(video.duration, video.currentTime + 5);
}
let fullScreenBtn = document.getElementById('tgFullS');
let addSubBtn = document.getElementById('addSubV');
function toggleFullscreen() {
    const customDiv = document.querySelector('.video-player');
    if (customDiv.classList.contains('full-screen')) {
        fullScreenBtn.innerText = "fullscreen";
        addSubBtn.classList.add('hide');
        customDiv.classList.remove('full-screen');
    } else {
        fullScreenBtn.innerText ="close";
        customDiv.classList.add('full-screen');
        addSubBtn.classList.remove('hide');
    }
}

function captureScreenshot() {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const screenshotUrl = canvas.toDataURL('image/png');
    
    const container = document.getElementById('screenshotContainer');
    container.innerHTML = `
        <img src="${screenshotUrl}" alt="Screenshot">
        <div class="screenshot-actions">
            <button class="btn btn-primary" onclick="downloadScreenshot(this)">
                <span class="material-icons">download</span>
            </button>
            <button class="btn btn-secondary" onclick="closeScreenshot()">
                <span class="material-icons">close</span>
            </button>
        </div>
    `;
    container.classList.remove('hide');
}

function downloadScreenshot(btn) {
    const img = document.querySelector('#screenshotContainer img');
    const link = document.createElement('a');
    link.href = img.src;
    link.download = `screenshot-${new Date().toISOString().replace(/:/g, '-')}.png`;
    link.click();
    
    btn.innerHTML = '<span class="material-icons">check</span>';
    setTimeout(() => {
        btn.innerHTML = '<span class="material-icons">download</span>';
    }, 2000);
}

function closeScreenshot() {
    document.getElementById('screenshotContainer').classList.add('hide');
}

function updateSubtitleStyle() {
    const fontSize = document.getElementById('fontSize').value;
    const textColor = document.getElementById('textColor').value;
    const backgroundColor = document.getElementById('backgroundColor').value;
    const backgroundOpacity = document.getElementById('backgroundOpacity').value;
    
    subtitleDisplay.style.fontSize = `${fontSize}px`;
    subtitleDisplay.style.color = textColor;
    subtitleDisplay.style.backgroundColor = `${backgroundColor}${Math.round(backgroundOpacity * 2.55).toString(16).padStart(2, '0')}`;
    subtitleDisplay.style.padding = '10px';
    subtitleDisplay.style.borderRadius = '5px';
    
    subSizeInd.innerText=subtitleDisplay.style.fontSize;
    
    // Save settings to localStorage
    const styleSettings = {
        fontSize,
        textColor,
        backgroundColor,
        backgroundOpacity
    };
    localStorage.setItem('subtitleStyle', JSON.stringify(styleSettings));
}

function loadSubtitleStyle() {
    const savedSettings = localStorage.getItem('subtitleStyle');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        document.getElementById('fontSize').value = settings.fontSize;
        document.getElementById('textColor').value = settings.textColor;
        document.getElementById('backgroundColor').value = settings.backgroundColor;
        document.getElementById('backgroundOpacity').value = settings.backgroundOpacity;
        updateSubtitleStyle();
    }
}

function handleKeyboardShortcuts(e) {
    // Spacebar to play/pause
    if (e.code === 'Space' && !e.target.tagName.toLowerCase().match(/input|textarea/)) {
        e.preventDefault();
        togglePlayPause();
    }
    
    // Arrow keys for seeking
    if (e.code === 'ArrowLeft') {
        e.preventDefault();
        skipBackward();
    }
    
    if (e.code === 'ArrowRight') {
        e.preventDefault();
        skipForward();
    }
    
    // F for fullscreen
    if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
    }
    
    // M for mute
    if (e.code === 'KeyM') {
        e.preventDefault();
        video.muted = !video.muted;
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);
