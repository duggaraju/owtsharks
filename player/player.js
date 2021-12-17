var threshold = 0.0;

function denormalize(canvas, x, y) {
    return [Math.floor(x * canvas.width), Math.floor(y * canvas.height)];
}

function updateThreshold(event) {
    document.getElementById('confidence').innerText = Number(event.target.value).toFixed(2);
    threshold = event.target.value;
}

function drawScaledRectangle(ctx, box, canvas, color, text, textcolor) {
    // normalize co-ordinates.
    const [x, y] = denormalize(canvas, box.topX , box.topY);
    const [w, h] = denormalize(canvas, box.bottomX - box.topX, box.bottomY - box.topY);
    ctx.strokeStyle = color || 'yellow';
    ctx.strokeRect(x, y, w, h);
    if (text) {
        ctx.fillStyle = textcolor || 'white';
        ctx.font = '24px serif';
        ctx.fillText(text, x, y);
    }
}

function drawInference(canvas, ctx, inference) {
    const box = inference.box;
    const text = `${inference.label}/${inference.score.toFixed(2)}`;
    drawScaledRectangle(ctx, box, canvas, 'yellow', text, 'white');    
}

function onCueChange(event) {
    const cues = event.target.activeCues;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = '3';
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'yellow';
    ctx.font = '24px serif';
    if (cues.length > 0) {
        const cue = cues[0];
        //const payload = JSON.parse(cue.text);
        drawInference(canvas, ctx, cue.json);
    } else {
        console.log(`No more active cues ${cues}`)
    }
}

function onTrackLoaded(event) {
    const seekbar = document.getElementById('seekbar');
    const video = document.getElementById('video');
    const track = event.target.track;
    console.log(`track loaded ${track.cues.length}`);
    for (var cue of track.cues) {
        const json = JSON.parse(cue.text);
        if (json.score < threshold) {
            continue;
        }
        cue.json = json;
        const marker = document.createElement('div');
        marker.setAttribute('class', 'bubbles');
        const left = (cue.startTime / video.duration) * 100 + '%';
        const width = (cue.endTime - cue.startTime)/ video.duration * 100 + '%';
        marker.style.left= left;   
        marker.style.width=width;     
        seekbar.appendChild(marker);
    }
}

function onMetadata(event) {
    const canvas = document.getElementById('canvas');    
    canvas.width = video.width;
    canvas.height = video.height;
    const track = document.createElement('track');
    track.kind = 'metadata';
    track.label = 'Detection';
    track.srclang = 'en';

    const file = video.src.replace(/\.mp4/i, '.vtt').replace(/\.mov/i, '.vtt');
    track.src = file;  
    track.addEventListener('load', onTrackLoaded); 
    video.appendChild(track);
    video.textTracks.addEventListener('addtrack', event => {
        const track = event.track;
        track.mode = 'hidden';
        track.addEventListener('cuechange', onCueChange);
        console.log(`track added label=${track.label} kind=${track.kind}`);
    });
}

function onLoadVideo() {
    const video = document.getElementById('video');
    video.innerHTML = '';
    const url = document.getElementById('url').value;
    console.log(`loading video ${url}`);
    video.src = url;
    const seekbar = document.getElementById('seekbar');
    seekbar.innerHTML = '<div id="time" class="time"></div>';
}

function onTimeUpdate() {
    const video = document.getElementById('video');
    const time = document.getElementById('time');
    const left = (video.currentTime / video.duration) * 100 + '%'; 
    time.style.left = left;
}

document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video');
    video.addEventListener('loadedmetadata', onMetadata);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('error', event => {
        console.log(`error playing ${event.target.src}`);
    });
    document.getElementById('load').addEventListener('click', onLoadVideo);

    const seekbar = document.getElementById('seekbar');
    seekbar.addEventListener('click', (event) => {
        const video = document.getElementById('video');
        const rect = event.target.getBoundingClientRect();
        const x = event.clientX - rect.left; //x position within the element.
        const time = x / rect.width * video.duration;
        video.currentTime = time;
        console.log('seekbar clicked ', event);
    })

    document.getElementById('score').addEventListener('input', updateThreshold);

});