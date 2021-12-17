import ffmpeg from 'fluent-ffmpeg'
import ffmpegpath from 'ffmpeg-static';
/// required modules
import { ServerResponse, IncomingMessage, createServer } from 'http';
import yargs, { env, number } from 'yargs';
import https from 'https';
import http from 'http';
import fs from 'fs';
import url from 'url';
import path from 'path';

const coginitive_services_key = '9514978b7518411db99c73c084774b27';
const cognitive_services_endpoint = 'https://sharkvision-prediction.cognitiveservices.azure.com/customvision/v3.0/Prediction/dcf36092-884e-4e35-994c-259d39833b76/detect/iterations/OWTShark8/image';
const port = 8080;
const frame_rate = 3; // number of frames per second to analyze.
const confidence_threshold = 0.0;
const ffmpeg_path = 'C:\\tools\\ffmpeg\\bin\\ffmpeg';

const argv = yargs(process.argv.slice(2))
  .option('input', {
    alias: 'i',
    description: 'The input file to process',
    type: 'string',
    demandOption: true
  })
  .option('output', {
    alias: 'o',
    description: 'The output file to generate',
    type: 'string',
    demandOption: true
  })
  .option('endpoint', {
    alias: 'e',
    description: 'The endpoint for inferencing',
    type: 'string',
    demandOption: false
  })
  .option('token', {
    alias: 't',
    description: 'The token for inferencing',
    type: 'string',
    demandOption: false
  })
  .help()
  .alias('help', 'h')
  .parseSync();

console.log(argv);
const endpoint_url = new URL(argv.endpoint || cognitive_services_endpoint);

const output = fs.createWriteStream(argv.output);
output.write('WEBVTT\n\n');

type Prediction = {
  score: number,
  label: string,
  box: {
    topX: number,
    topY: number,
    bottomX: number,
    bottomY: number
  }
}

type Result = {
  boxes: Prediction[]
}

function toVTTString(time: number) {
  const seconds = time % 60;
  time = time / 60;
  const minutes = Math.floor(time % 60).toString().padStart(2, '0');
  time = time / 60;
  const hours = Math.floor(time);
  return `${hours}:${minutes}:${seconds.toFixed(3).padStart(6, '0')}`;
}

function processResponse(data: Buffer, start: string, end: string) {
  const result = JSON.parse(data.toString()) as Result;
  if (result.boxes && result.boxes.length > 0) {
    const boxes = result.boxes.sort((a,b) => b.score - a.score);
    if (boxes.length > 0) {
      const json = JSON.stringify(boxes[0]);
      output.write(`${start} --> ${end}\n`)
      output.write(`${json}\n\n`);  
    }
  }
}


function sendImage(name: string, data: Buffer, callback: () => void) {
  const pts = parseInt(name);
  const start = toVTTString(pts / frame_rate);
  const end = toVTTString((pts + 1) / frame_rate);

  const options = {
    protocol: endpoint_url.protocol,
    hostname: endpoint_url.host,
    port: endpoint_url.port || endpoint_url.protocol === 'https' ? 443 : 80,
    path: endpoint_url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      //      'Prediction-Key': coginitive_services_key,
      'Authorization': `Bearer ${argv.token}`,
      'Content-Length': data.length
    }
  }

  const req = http.request(options, res => {
    const statusCode = res.statusCode;
    const data: Buffer[] = [];
    console.log(`statusCode: ${statusCode}`);
    res.on('data', d => {
      data.push(d);
    });
    res.on('end', () => {
      const response = Buffer.concat(data);
      if (statusCode === 200) {
        processResponse(response, start, end);
      } else {
        console.log('request failed ', statusCode, response.toString());
      }
      callback();
    })
  });

  req.on('error', error => {
    console.error(error);
    callback();
  })

  req.write(data);
  req.end();
}

/// create server and define handling of supported requests
function request_listener(req: IncomingMessage, res: ServerResponse) {
  if (req.method == 'POST') { // check for POST method, ignore others
    const parsed = url.parse(req.url!);
    const name = path.parse(parsed.pathname!).name;

    console.log(`POST ${req.url}`, name);

    const body: Buffer[] = [];
    req.on('data', data => {
      body.push(data);
    });

    req.on('end', () => {
      const data = Buffer.concat(body);
      const start = parseInt(name) / frame_rate;
      const end = (start + 1) / frame_rate;
      sendImage(name, data, () => {
        res.statusCode = 201;
        res.end();
      });
    });

  } else {
    console.log(`Unhandled request method ${req.method}.`)
  }
}

// create the servers
const server = createServer(request_listener);
server.listen(port);
console.log(`Listening for requests on port: ${port}`);

console.info(`ffmpeg path is ${ffmpegpath}`);
ffmpeg.setFfmpegPath(ffmpeg_path);
const command = ffmpeg({
  logger: console
});

command
  .input(argv.input)
  //.inputOptions('-re')
  .inputOption('-readrate', '1.0')
  .noAudio()
  .output(`http://localhost:${port}/%05d.png`)
  .outputOption(
    '-r', frame_rate.toString(),
    '-frame_pts', '1',
    '-protocol_opts', 'multiple_requests=1'
  );

command.on('start', (c) => {
  console.log(`Running command: ${c}`);
})

command.on('error', (err, stdout, stderr) => {
  console.log('On error', err, stdout, stderr);
})

command.on('end', () => {
  console.log('processing complete. exiting.')
  output.end();
  process.exit();
});

console.log(`Starting ffmpeg ${command}`);
command.run();
process.on('SIGTERM', () => {
  console.info('Got SIGTERM. Graceful shutdown start', new Date().toISOString())
  // start graceul shutdown here
  command.removeAllListeners('error');
  command.kill('SIGTERM');
  output.end();
  server.close((err) => {
    console.log('shutdown the server', err);
    process.exit();
  })
});
