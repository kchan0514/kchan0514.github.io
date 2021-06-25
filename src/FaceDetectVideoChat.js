import React from 'react';
import {
  Button,
  Grid,
  Dialog,
  IconButton,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';
import io from 'socket.io-client';
import Like from './Like';
import Drawer from './CustomDrawer';
//import * as faceapi from './dist/face-api.js';
import * as faceapi from 'face-api.js';


const localVideo = document.getElementById('video');
const remoteVideo = document.getElementById('remote_video');
let localStream = null;
let peerConnection = null;

let duplicateCanvas = document.getElementById('duplicate_canvas');
let ctxDuplicate = duplicateCanvas.getContext('2d');
let animationId = null;
let duplicateStream = null;
let capturedVideo = document.getElementById('captured_video');

let isHappy = false;

/*
async function startVideo(){
 
  try {
    const constraints = { audio: false, video: {} };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
  } catch (error) {
    console.error(error);
  }


  navigator.getUserMedia(
    { video: true, audio: false },
    async stream => {
      this.onVideoStop();
      this.video.srcObject = stream;
      await this.video.play();
      if (Object.keys(this.state.peers).length > 0) {
        this.sendCall();
      }
      return this.video;
    },
    err => {
      console.log(err);
    }
  );
};
*/

// getUserMediaでカメラ、マイクにアクセス
async function startVideo(video) {
  try{
      localStream = await navigator.mediaDevices.getUserMedia({video: true, audio: false});
      //await playVideo(video,localStream);
      video.srcObject = localStream;
  } catch(err){
      console.error('mediaDevice.getUserMedia() error:', err);
  }
}

// Videoの再生を開始する
async function playVideo(element, stream) {
  element.srcObject = stream;
  try {
      await element.play();
  } catch(error) {
      console.log('error auto play:' + error);
  }
}

async function loadModels(){
  await Promise.all([
    //faceapi.nets.tinyFaceDetector.loadFromUri(`${gitPagesPath}/js/lib/models`),
    //faceapi.nets.faceExpressionNet.loadFromUri(`${gitPagesPath}/js/lib/models`)

    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.faceExpressionNet.loadFromUri('/models')

    //await faceapi.nets.faceRecognitionNet.loadFromDisk("/models"),
    //await faceapi.nets.faceLandmark68Net.loadFromDisk("/models")


    //faceapi.nets.t
    //faceapi.nets.faceExpressionNet.loadFromUri('/models')
    
    //faceapi.nets.tinyFaceDetector.loadFromUri('https://github.com/engabesi/face-nicolas/blob/master/docs/js/lib/models/tiny_face_detector_model-weights_manifest.json'),
    //faceapi.nets.faceExpressionNet.loadFromUri('https://github.com/engabesi/face-nicolas/blob/master/docs/js/lib/models/face_expression_model-weights_manifest.json')
  ]);
};

function createImageElm(path){
  const image = new Image();
  image.src = path;
  return image;
};

function drawCanvas() {
  // --- draw video ---
  drawVideoToDuplicateCanvas();


  const image = createImageElm('./images/happyicon.png')
      

        
            //canvas.getContext("2d").drawImage(image, x, y, width, height);
            if(isHappy == true){
  ctxDuplicate.drawImage(image,  0, 0, 100, 100);
            }

  // --- mask with snapshot --
  //drawMaskToCanvas();

  //const video = document.getElementById('local_video');
  //drawVideoToCanvas(video, duplicateCanvas, ctxDuplicate);


  // --- keep animation ---
  animationId = window.requestAnimationFrame(drawCanvas);
}

function drawVideoToDuplicateCanvas() {
  drawVideoToCanvas(localVideo, duplicateCanvas, ctxDuplicate);
}

function drawVideoToCanvas(video, canvas, ctx) {
  const srcLeft = 0;
  const srcTop = 0;
  const srcWidth = video.videoWidth;
  const srcHeight = video.videoHeight;
  const destCanvasLeft = 0;
  const destCanvasTop = 0;
  const destCanvasWidth = canvas.width;
  const destCanvasHeight = canvas.height;

  ctx.drawImage(video, srcLeft, srcTop, srcWidth, srcHeight,
    destCanvasLeft, destCanvasTop, destCanvasWidth , destCanvasHeight
  );
}

function drawMaskToCanvas() {
  /*
  if (maskOutsideRadio.checked) {
    //drawMaskOutsideToCanvas();
  }
  else {
    //drawMaskInsideToCanvas();
  }
  */
}

function drawMaskInsideToCanvas() {
  /*
  if ( (maskSrcWidth < 1) || (maskDestWidth < 1) ) {
    return;
  }
  */
  /*
  ctxDuplicate.drawImage(snapshotCanvas, maskSrcLeft, maskSrcTop, maskSrcWidth, maskSrcHeight,
    maskDestLeft, maskDestTop, maskDestWidth , maskDestHeight
  );
  */
}

const createExpressionImageMap = async function (){
  const map = new Map();
  // TODO: add Image
  map.set("neutral", createImageElm(`./images/cage_neutral.png`));
  map.set("happy", createImageElm(`./images/cage_happy.png`));
  map.set("sad", createImageElm(`./images/cage_neutral.png`));
  map.set("angry", createImageElm(`./images/cage_angry.png`));
  map.set("fearful", createImageElm(`./images/cage_neutral.png`));
  map.set("disgusted", createImageElm(`./images/cage_neutral.png`)
  );
  map.set("surprised",createImageElm(`./images/cage_neutral.png`)
  );
  return map;
};
class FaceDetectVideoChat extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      room: props.roomName,
      myVideo: null,
      peers: {},
      count: 0,
      socketId: '',
      videoStyle: videoStyle,
      fullScreenId: '',
      error: '',
    };

    this.onReceiveSdp = this.onReceiveSdp.bind(this);
    this.onReceiveCall = this.onReceiveCall.bind(this);
    this.onReceiveCandidate = this.onReceiveCandidate.bind(this);
    this.onReceiveLeave = this.onReceiveLeave.bind(this);
    this.onReceiveFullScreen = this.onReceiveFullScreen.bind(this);
    this.onOffer = this.onOffer.bind(this);
    this.onAnswer = this.onAnswer.bind(this);
    this.onAddStream = this.onAddStream.bind(this);
    this.onRemoveStream = this.onRemoveStream.bind(this);
    this.onIceCandidate = this.onIceCandidate.bind(this);
    this.makeOffer = this.makeOffer.bind(this);
    this.makeAnswer = this.makeAnswer.bind(this);
    this.sendCall = this.sendCall.bind(this);
    this.sendSdp = this.sendSdp.bind(this);
    this.sendIceCandidate = this.sendIceCandidate.bind(this);
    this.onDisconnect = this.onDisconnect.bind(this);
    this.onVideoStart = this.onVideoStartOriginal.bind(this);
    this.onVideoStop = this.onVideoStop.bind(this);
    this.onVideoMute = this.onVideoMute.bind(this);
    this.onFullScreen = this.onFullScreen.bind(this);
    this.isFullScreen = this.isFullScreen.bind(this);
    this.setError = this.setError.bind(this);
    this.videos = {};
    this.senders = {};

  
    this.socket = io('localhost:9090');
    //this.socket = io('39.111.143.168:9090');
    this.socket.on('RECEIVE_CONNECTED', data => {
      console.log('socket.io connected. id=' + data.id);
      this.setState({ socketId: data.id });
      this.socket.emit('SEND_ENTER', this.state.room);
    });
    this.socket.on('RECEIVE_SDP', this.onReceiveSdp);
    this.socket.on('RECEIVE_CALL', this.onReceiveCall);
    this.socket.on('RECEIVE_CANDIDATE', this.onReceiveCandidate);
    this.socket.on('RECEIVE_LEAVE', this.onReceiveLeave);
    this.socket.on('RECEIVE_FULLSCREEN', this.onReceiveFullScreen);

    this.imageMap = createExpressionImageMap();
  }

  componentWillUnmount() {
    this.onClickBye();
  }

  onReceiveSdp(sdp) {
    console.log('receive sdp :' + sdp.type);
    switch (sdp.type) {
      case 'offer':
        this.onOffer(sdp);
        break;
      case 'answer':
        this.onAnswer(sdp);
        break;
      default:
        console.log('unkown sdp...');
        break;
    }
  }

  onReceiveLeave(data) {
    console.log('receive leave from :' + data.id);
    this.onDisconnect(data.id);
  }

  onReceiveFullScreen(data) {
    console.log('receive full screen from :' + data.id);
    const id = data.id;
    if (this.isFullScreen(id)) {
      this.setState({ fullScreenId: '' });
    } else {
      this.setState({ fullScreenId: id });
    }
  }

  async onReceiveCall(data) {
    console.log('receive call. from:' + data.id);
    await this.makeOffer(data.id);
  }

  onReceiveCandidate(ice) {
    console.log('receive candidate:' + ice.id);
    const peer = this.state.peers[ice.id];
    if (!peer) return;

    const candidate = new RTCIceCandidate(ice);
    console.log(candidate);
    peer.addIceCandidate(candidate);
  }

  async onOffer(sdp) {
    console.log('receive sdp offer from:' + sdp.id);

    const peer = this.state.peers[sdp.id] || this.prepareNewConnection(sdp.id);
    if (this.senders[sdp.id]) {
      this.senders[sdp.id].forEach(sender => {
        peer.removeTrack(sender);
      });
    }
    this.senders[sdp.id] = [];
    const canvas = document.createElement('canvas');
    //duplicateCanvas.captureStream(30);
    //const stream = this.video.srcObject || canvas.captureStream(10);
    const stream = duplicateCanvas.captureStream(10);
    stream.getTracks().forEach(track => {
      this.senders[sdp.id].push(peer.addTrack(track, stream));
    });
    console.log(peer);
    if (!this.state.peers[sdp.id]) {
      console.log('add peer :' + sdp.id);
      this.state.peers[sdp.id] = peer;
      await this.setState({ peers: this.state.peers });
    }

    const offer = new RTCSessionDescription(sdp);
    await peer.setRemoteDescription(offer);
    this.makeAnswer(sdp.id);
  }

  async onAnswer(sdp) {
    console.log('receive sdp answer from:' + sdp.id);
    const peer = this.state.peers[sdp.id];
    if (!peer) return;
    const answer = new RTCSessionDescription(sdp);
    await peer.setRemoteDescription(answer);
  }

  async onAddStream(id, stream) {
    console.log('onAddStream:' + id + ', stream.id:' + stream.id);
    const video = this.videos[id];
    console.log(id);
    console.log(video);
    try {
      if (video) {
        video.pause();
        video.srcObject = stream;
        await video.play();
      }
    } catch (e) {
      console.log(e);
    }
  }

  onRemoveStream(id) {
    console.log('onRemoveStream:' + id);
  }

  onIceCandidate(id, icecandidate) {
    console.log('onIceCandidate:' + id);
    if (icecandidate) {
      // Trickle ICE
      this.sendIceCandidate(id, icecandidate);
    } else {
      // Vanilla ICE
      console.log('empty ice event');
    }
  }

  async makeOffer(id) {
    const peer = this.state.peers[id] || this.prepareNewConnection(id);
    console.log(peer);
    if (this.senders[id]) {
      this.senders[id].forEach(sender => {
        peer.removeTrack(sender);
      });
    }
    this.senders[id] = [];
    const canvas = document.createElement('canvas');
    const stream = this.video.srcObject || canvas.captureStream(10);
    stream.getTracks().forEach(track => {
      this.senders[id].push(peer.addTrack(track, stream));
    });
    if (!this.state.peers[id]) {
      this.state.peers[id] = peer;
      await this.setState({ peers: this.state.peers });
    }

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    this.sendSdp(id, peer.localDescription);
  }

  async makeAnswer(id) {
    const peer = this.state.peers[id];
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    this.sendSdp(id, peer.localDescription);
  }

  sendCall() {
    console.log('sending CALL');
    if (Object.keys(this.state.peers).length === 0) {
      this.socket.emit('SEND_ENTER', this.state.room);
      return;
    }
    this.socket.emit('SEND_CALL');
  }

  sendIceCandidate(id, iceCandidate) {
    if (!this.state.peers[id]) return;
    console.log('sending CANDIDATE=' + iceCandidate);
    this.socket.emit('SEND_CANDIDATE', { target: id, ice: iceCandidate });
  }

  sendSdp(id, sdp) {
    console.log('sending SDP:' + sdp.type + ', to:' + id);
    this.socket.emit('SEND_SDP', { target: id, sdp: sdp });
  }

  prepareNewConnection(id) {
    console.log('establish connection to:' + id);
    const config = { iceServers: [] };
    const peer = new RTCPeerConnection(config);
    peer.ontrack = event => {
      this.onAddStream(id, event.streams[0]);
    };
    peer.onremovestream = event => {
      this.onRemoveStream(id);
    };
    peer.onicecandidate = event => {
      this.onIceCandidate(id, event.candidate);
    };
    peer.oniceconnectionstatechange = event => {
      if (peer.iceConnectionState === 'disconnected') {
        console.log('state disconnected to: ' + id);
        this.onDisconnect(id);
      }
    };
    peer.onnegotiationneeded = event => {
      console.log('onnegotiationneeded');
    };
    peer.onconnectionstatechange = event => {
      console.log('onconnectionstatechange: ' + peer.connectionState);
    };

    return peer;
  }

  onDisconnect(id) {
    // 全体から切断
    const peer = this.state.peers[id];
    if (peer) {
      peer.close();
      delete this.state.peers[id];
      delete this.senders[id];
      this.setState({ peers: this.state.peers });
    }
  }

  

   async startConvert() {
    // -- convert video with canvas ---
    if (ctxDuplicate) {
      ctxDuplicate = null;
    }
    ctxDuplicate = duplicateCanvas.getContext('2d');
    animationId = window.requestAnimationFrame(drawCanvas);
    
    duplicateStream = duplicateCanvas.captureStream(30);
    playVideo(capturedVideo, duplicateStream);
    capturedVideo.volume = 0;

    //setLocalStream(duplicateStream);

    //if (useFaceDetector()) {
     // startFaceDetectInterval();
   // }

   // updateButtons();
  }

  async onVideoStartOriginal() {
    if (!navigator.getUserMedia) {
      this.setError('webカメラ機能は本端末では非対応となります。');
      return;
    }
    // webカメラ

  console.log('on originalY');
  //const localVideo = document.querySelector("local_video");
  const localVideo = document.querySelector("video");
  const imageMap = createExpressionImageMap();
  await loadModels();
  //const localVideo = document.getElementById('local_video');
  await startVideo(localVideo);

  if (ctxDuplicate) {
    ctxDuplicate = null;
  }
  ctxDuplicate = duplicateCanvas.getContext('2d');
  animationId = window.requestAnimationFrame(drawCanvas);

  
  //const video = document.getElementById('local_video');
  //drawVideoToCanvas(video, duplicateCanvas, ctxDuplicate);

  console.log('get ready');
  localVideo.addEventListener("play", () => {
    console.log('event play');
    const canvas = faceapi.createCanvasFromMedia(localVideo);
    document.body.append(canvas);
    const displaySize = { width: localVideo.width, height: localVideo.height };
    
    faceapi.matchDimensions(canvas, displaySize);
    const tinyFaceDetectorOption = {
      // default 416
      inputSize: 224,
      // default 0.5
      scoreThreshold: 0.5
    };
    setInterval(async () => {
      const results = await faceapi
        .detectAllFaces(
          localVideo,
          new faceapi.TinyFaceDetectorOptions(tinyFaceDetectorOption)
        )
        .withFaceExpressions();
      if (results.length <= 0) return;
      const resizedResults = faceapi.resizeResults(results, displaySize);
      console.log("result:"+results)
      canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
      resizedResults.forEach(result => {
        const expression = result.expressions.asSortedArray()[0].expression;
        //const image = imageMap.get(expression);
        //const image = createImageElm(`../public/images/cage_neutral.png`)
        const image = createImageElm('./images/happyicon.png')
        const detection = result.detection;
        const marginVal = 0.4;
        const width = detection.box.width;
        const height = detection.box.height * (1.0 + marginVal);
        const x = detection.box.x;
        const y = detection.box.y - detection.box.height * marginVal;
         
        console.log("x:"+x+ " expression:"+expression)

        if(expression == "happy"){
            //canvas.getContext("2d").drawImage(image, x, y, width, height);
            //ctxDuplicate.drawImage(image, x, y, width, height);
            isHappy = true;
        }
        else
        {
          isHappy = false;
        }
        //ctxDuplicate.drawImage(image, x, y, width, height);
        //canvas.getContext("2d").beginPath();
        //canvas.getContext("2d").arc(50, 50, 50, 0, 2 * Math.PI);
        //canvas.getContext("2d").stroke();

      });
    }, 100);
  });

  /*

    console.log('on video start');
    navigator.getUserMedia(
      { video: true, audio: false },
      async stream => {
        this.onVideoStop();
        this.video.srcObject = stream;
        this.video.onloadedmetadata = function() {

        };

        await this.video.play();
        //console.log('on video play');

        console.log('event play');
      const canvas = faceapi.createCanvasFromMedia(this.video);
     // document.body.append(canvas);
      document.createElement('canvas');
      const displaySize = { width: this.video.width, height: this.video.height };
      //const displaySize = { width: 1000, height: 500 };
      faceapi.matchDimensions(canvas, displaySize);
      const tinyFaceDetectorOption = {
        // default 416
        inputSize: 224,
        // default 0.5
        scoreThreshold: 0.5
      };
      setInterval(async () => {
        const results = await faceapi
          .detectAllFaces(
            this.video,
            new faceapi.TinyFaceDetectorOptions(tinyFaceDetectorOption)
          )
          .withFaceExpressions();
        if (results.length <= 0) return;
        const resizedResults = faceapi.resizeResults(results, displaySize);
        canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
        resizedResults.forEach(result => {
          const expression = result.expressions.asSortedArray()[0].expression;
          const image = imageMap.get(expression);
  
          const detection = result.detection;
          const marginVal = 0.4;
          const width = detection.box.width;
          const height = detection.box.height * (1.0 + marginVal);
          const x = detection.box.x;
          const y = detection.box.y - detection.box.height * marginVal;
  
          canvas.getContext("2d").drawImage(image, x, y, width, height);
        });
      }, 100);


        if (Object.keys(this.state.peers).length > 0) {
          this.sendCall();
        }
      },
      err => {
        console.log(err);
      }
    );

    const loadModels = async () => {
      await Promise.all([
        //faceapi.nets.tinyFaceDetector.loadFromUri(`${gitPagesPath}/js/lib/models`),
        //faceapi.nets.faceExpressionNet.loadFromUri(`${gitPagesPath}/js/lib/models`)

        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceExpressionNet.loadFromUri('/models')

        //await faceapi.nets.faceRecognitionNet.loadFromDisk("/models"),
        //await faceapi.nets.faceLandmark68Net.loadFromDisk("/models")


        //faceapi.nets.t
        //faceapi.nets.faceExpressionNet.loadFromUri('/models')
        
        //faceapi.nets.tinyFaceDetector.loadFromUri('https://github.com/engabesi/face-nicolas/blob/master/docs/js/lib/models/tiny_face_detector_model-weights_manifest.json'),
        //faceapi.nets.faceExpressionNet.loadFromUri('https://github.com/engabesi/face-nicolas/blob/master/docs/js/lib/models/face_expression_model-weights_manifest.json')
      ]);
    };

    const createImageElm = path => {
      const image = new Image();
      image.src = path;
      return image;
    };
    

    const createExpressionImageMap = () => {
      const map = new Map();
      // TODO: add Image
      map.set("neutral", createImageElm(`${gitPagesPath}/images/cage_neutral.png`));
      map.set("happy", createImageElm(`${gitPagesPath}/images/cage_happy.png`));
      map.set("sad", createImageElm(`${gitPagesPath}/images/cage_neutral.png`));
      map.set("angry", createImageElm(`${gitPagesPath}/images/cage_angry.png`));
      map.set("fearful", createImageElm(`${gitPagesPath}/images/cage_neutral.png`));
      map.set(
        "disgusted",
        createImageElm(`${gitPagesPath}/images/cage_neutral.png`)
      );
      map.set(
        "surprised",
        createImageElm(`${gitPagesPath}/images/cage_neutral.png`)
      );
      return map;
    };

  　//async () => {
    //const video = document.querySelector("video");
    
    const imageMap = createExpressionImageMap();
    console.log('before model loaded');

    console.log(faceapi.nets)
    await loadModels();
    console.log('model loaded');
        
    //await startVideo(video);
    
    /*
    this.video.addEventListener("loadeddata", () => {
      console.log('event loadeddata');
      const canvas = faceapi.createCanvasFromMedia(this.video);
      document.body.append(canvas);
      //const displaySize = { width: this.video.width, height: this.video.height };
      
      const displaySize = { width: 1000, height: 500 };
      faceapi.matchDimensions(canvas, displaySize);
      const tinyFaceDetectorOption = {
        // default 416
        inputSize: 224,
        // default 0.5
        scoreThreshold: 0.5
      };
      setInterval(async () => {
        const results = await faceapi
          .detectAllFaces(
            this.video,
            new faceapi.TinyFaceDetectorOptions(tinyFaceDetectorOption)
          )
          .withFaceExpressions();
        if (results.length <= 0) return;
        const resizedResults = faceapi.resizeResults(results, displaySize);
        canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
        resizedResults.forEach(result => {
          const expression = result.expressions.asSortedArray()[0].expression;
          const image = imageMap.get(expression);
  
          const detection = result.detection;
          const marginVal = 0.4;
          const width = detection.box.width;
          const height = detection.box.height * (1.0 + marginVal);
          const x = detection.box.x;
          const y = detection.box.y - detection.box.height * marginVal;
  
          canvas.getContext("2d").drawImage(image, x, y, width, height);
        });
      }, 100);
      
    });
    */

/*
    this.video.addEventListener(" play", () => {
      console.log('event play');
      const canvas = faceapi.createCanvasFromMedia(this.video);
      document.body.append(canvas);
      const displaySize = { width: this.video.width, height: this.video.height };
      //const displaySize = { width: 1000, height: 500 };
      faceapi.matchDimensions(canvas, displaySize);
      const tinyFaceDetectorOption = {
        // default 416
        inputSize: 224,
        // default 0.5
        scoreThreshold: 0.5
      };
      setInterval(async () => {
        const results = await faceapi
          .detectAllFaces(
            this.video,
            new faceapi.TinyFaceDetectorOptions(tinyFaceDetectorOption)
          )
          .withFaceExpressions();
        if (results.length <= 0) return;
        const resizedResults = faceapi.resizeResults(results, displaySize);
        canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
        resizedResults.forEach(result => {
          const expression = result.expressions.asSortedArray()[0].expression;
          const image = imageMap.get(expression);
  
          const detection = result.detection;
          const marginVal = 0.4;
          const width = detection.box.width;
          const height = detection.box.height * (1.0 + marginVal);
          const x = detection.box.x;
          const y = detection.box.y - detection.box.height * marginVal;
  
          canvas.getContext("2d").drawImage(image, x, y, width, height);
        });
      }, 100);
    });
    //})(;
    */

    //const videoEl = $('#inputVideo').get(0)

    //if(this.video.paused || this.video.ended || !isFaceDetectionModelLoaded())
    //  return setTimeout(() => onPlay())

    /*
    const loadModels = async () => {
         await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(`/js/lib/models`)
        ]);
     };

    const options = getFaceDetectorOptions()

    const ts = Date.now()

    const result = await faceapi.detectSingleFace(this.video, options).withFaceExpressions()

    updateTimeStats(Date.now() - ts)

    if (result) {
      //const canvas = $('#overlay').get(0)
      const canvas = document.createElement('canvas');
      const dims = faceapi.matchDimensions(canvas, videoEl, true)

      const resizedResult = faceapi.resizeResults(result, dims)
      const minConfidence = 0.05
      if (withBoxes) {
        faceapi.draw.drawDetections(canvas, resizedResult)
      }
      faceapi.draw.drawFaceExpressions(canvas, resizedResult, minConfidence)
    }

    setTimeout(() => onPlay())
    */
   

  }

  async onVideoStart() {
    if (!navigator.getUserMedia) {
      this.setError('webカメラ機能は本端末では非対応となります。');
      return;
    }
    // webカメラ
    navigator.getUserMedia(
      { video: true, audio: false },
      async stream => {
        this.onVideoStop();
        this.video.srcObject = stream;
        await this.video.play();
        if (Object.keys(this.state.peers).length > 0) {
          this.sendCall();
        }
      },
      err => {
        console.log(err);
      }
    );

    this.startConvert();
  }

  onVideoStop() {
    // 事前にmuteしておく
    this.onVideoMute();
    // 映像停止
    let stream = this.video.srcObject;
    if (!stream) return;
    const tracks = stream.getTracks();

    tracks.forEach(track => track.stop());
    stream = null;
  }


  onVideoMute() {
    if (this.video.srcObject) {
      const videoTrack = this.video.srcObject.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
    }
  }

  onFullScreen(element) {
    this.socket.emit('SEND_FULLSCREEN', {});
  }

  isFullScreen(id) {
    return this.state.fullScreenId === id;
  }

  setError(message) {
    this.setState({
      error: message,
    });
  }
/*
  (async () => {
  const video = document.querySelector("video");
  const imageMap = createExpressionImageMap();
  await loadModels();
  await startVideo(video);
  video.addEventListener("play", () => {
    const canvas = faceapi.createCanvasFromMedia(video);
    document.body.append(canvas);
    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);
    const tinyFaceDetectorOption = {
      // default 416
      inputSize: 224,
      // default 0.5
      scoreThreshold: 0.5
    };
    setInterval(async () => {
      const results = await faceapi
        .detectAllFaces(
          video,
          new faceapi.TinyFaceDetectorOptions(tinyFaceDetectorOption)
        )
        .withFaceExpressions();
      if (results.length <= 0) return;
      const resizedResults = faceapi.resizeResults(results, displaySize);
      canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
      resizedResults.forEach(result => {
        const expression = result.expressions.asSortedArray()[0].expression;
        const image = imageMap.get(expression);

        const detection = result.detection;
        const marginVal = 0.4;
        const width = detection.box.width;
        const height = detection.box.height * (1.0 + marginVal);
        const x = detection.box.x;
        const y = detection.box.y - detection.box.height * marginVal;

        canvas.getContext("2d").drawImage(image, x, y, width, height);
      });
    }, 100);
  });
})();
*/

  render() {
    return (
      <>
        <Dialog
          open={this.state.error !== ''}
          onClose={() => this.setError('')}
        >
          <DialogTitle>非対応機能です</DialogTitle>
          <DialogContent>
            <DialogContentText>{this.state.error}</DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button color="secondary" onClick={() => this.setError('')}>
              OK
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog
          maxWidth="xl"
          fullScreen
          open={this.state.fullScreenId !== ''}
          onClose={this.onFullScreen}
        >
          <Like socket={this.socket}>
            <video
              style={fullScreenStyle}
              autoPlay="1"
              playsInline
              ref={video => {
                const fullScreen =
                  this.videos[this.state.fullScreenId] || this.video;
                if (video && fullScreen) {
                  video.srcObject = fullScreen.srcObject;
                }
              }}
            />
          </Like>
          <IconButton
            style={closeButtonStyle}
            color="primary"
            onClick={this.onFullScreen}
          >
            <CloseIcon />
          </IconButton>
        </Dialog>
        <div style={{ flexGrow: '1', padding: '1rem' }}>
          <Grid container spacing={4} justify="center" alignItems="flex-start">
            <Grid item md={4} sm={6} xs={12}>
              <video
                id={this.state.socketId}
                style={videoStyle}
                autoPlay="1"
                playsInline
                ref={video => {
                  this.video = video;
                }}
              />
            </Grid>
            {Object.keys(this.state.peers).map(key => {
              return (
                <Grid item md={4} sm={6} xs={12} key={key}>
                  <video
                    id={key}
                    key={key}
                    style={videoStyle}
                    autoPlay="1"
                    playsInline
                    ref={video => {
                      this.videos[key] = video;
                    }}
                  />
                </Grid>
              );
            })}
          </Grid>
          <Drawer
           
            onCameraStart={this.onVideoStartOriginal}
            onVideoStop={this.onVideoStop}
            onMute={this.onVideoMute}
            onFullScreen={this.onFullScreen}
          />
        </div>
      </>
    );
  }
}

const videoStyle = {
  alignSelf: 'center',
  width: '100%',
  background: 'black',
};

const closeButtonStyle = {
  position: 'absolute',
  right: '1rem',
  top: '1rem',
  background: 'rgba(204, 204, 204, 0.21)',
};

const fullScreenStyle = {
  width: '100%',
  height: '100%',
  background: 'black',
};

const gitPagesPath = "/face-nicolas";

export default FaceDetectVideoChat;
