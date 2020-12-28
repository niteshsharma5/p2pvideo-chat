// import React,{ Component } from 'react';
// import './App.css';

// class App extends Component{
//   constructor(props){
//     super(props)
//     //creating local reference to the video
//     //using createref, now DOM nodes can be used in the react-app
//     this.localVideoref=React.createRef();
//     this.remoteVideoref=React.createRef();
//   }
//   componentDidMount(){
//     //we need to instantiate a new RTC coneection b/w the peers
//     this.pc=new RTCPeerConnection(null);
//     const constraints = {video:true,audio:0}
//     const success=(stream)=>{
//       this.localVideoref.current.srcObject = stream;
//       console.log("access granted ");
//     };
//     const failure=(error)=>{
//       console.log('getUserMedia Error: ',error);
//     };
//     navigator.mediaDevices.getUserMedia(constraints)
//     .then(success)
//     .catch(failure);
//     //this is the second or the old way to get access to camera
//     // navigator.getUserMedia(constraints,success,failure);
//   }
//   render(){

//     return(
//       <div>
//         {/* The exterior set of curly braces are letting JSX know you want a JS expression. The interior set of */}
//         {/*  curly braces represent a JavaScript object, meaning you’re passing in a object to the style attribute. */}
//         <video style={
//           {
//               height:200,
//               width:"auto",
//               backgroundColor:"black",
//               margin:10,
//               borderBlockColor:"red",
//               border:"4px dotted white"

//           }
//         }
//         ref={this.localVideoref} autoPlay controls></video>
//         <video style={
//           {
//               height:200,
//               width:"auto",
//               backgroundColor:"black",
//               margin:10,
//               borderBlockColor:"red",
//               border:"4px dotted white"

//           }
//         }
//         ref={this.remoteVideoref} autoPlay controls></video>
//         <br />

// <button onClick={this.createOffer}>Request</button>
// <button onClick={this.createAnswer}>Answer</button>

// <br />
// <textarea style={{ width: 450, height:40 }} ref={ref => { this.textref = ref }} />

// {/* <br />
// <button onClick={this.setRemoteDescription}>Set Remote Desc</button>
// <button onClick={this.addCandidate}>Add Candidate</button> */}
//       </div>
//     );
//   }
// }
// export default App;














import React, { Component } from 'react';

import io from 'socket.io-client'

class App extends Component {
  constructor(props) {
    super(props)

    // https://reactjs.org/docs/refs-and-the-dom.html
    this.localVideoref = React.createRef()
    this.remoteVideoref = React.createRef()

    this.socket = null
    this.candidates = []
  }

  componentDidMount = () => {

    this.socket = io(
      '/webrtcPeer',
      {
        path: '/webrtc',
        query: {}
      }
    )

    this.socket.on('connection-success', success => {
      console.log(success)
    })

    this.socket.on('offerOrAnswer', (sdp) => {
      this.textref.value = JSON.stringify(sdp)

      // set sdp as remote description
      this.pc.setRemoteDescription(new RTCSessionDescription(sdp))
    })

    this.socket.on('candidate', (candidate) => {
      // console.log('From Peer... ', JSON.stringify(candidate))
      // this.candidates = [...this.candidates, candidate]
      this.pc.addIceCandidate(new RTCIceCandidate(candidate))
    })

    // const pc_config = null

    const pc_config = {
      "iceServers": [
        // {
        //   urls: 'stun:[STUN_IP]:[PORT]',
        //   'credentials': '[YOR CREDENTIALS]',
        //   'username': '[USERNAME]'
        // },
        {
          urls : 'stun:stun.l.google.com:19302'
        }
      ]
    }

    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection
    // create an instance of RTCPeerConnection
    this.pc = new RTCPeerConnection(pc_config)

    // triggered when a new candidate is returned
    this.pc.onicecandidate = (e) => {
      // send the candidates to the remote peer
      // see addCandidate below to be triggered on the remote peer
      if (e.candidate) {
        // console.log(JSON.stringify(e.candidate))
        this.sendToPeer('candidate', e.candidate)
      }
    }

    // triggered when there is a change in connection state
    this.pc.oniceconnectionstatechange = (e) => {
      console.log(e)
    }

    // triggered when a stream is added to pc, see below - this.pc.addStream(stream)
    this.pc.onaddstream = (e) => {
      this.remoteVideoref.current.srcObject = e.stream
    }

    // called when getUserMedia() successfully returns - see below
    // getUserMedia() returns a MediaStream object (https://developer.mozilla.org/en-US/docs/Web/API/MediaStream)
    const success = (stream) => {
      window.localStream = stream
      this.localVideoref.current.srcObject = stream
      this.pc.addStream(stream)
    }

    // called when getUserMedia() fails - see below
    const failure = (e) => {
      console.log('getUserMedia Error: ', e)
    }

    // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
    // see the above link for more constraint options
    const constraints = {
      audio: false,
      video: true,
      // video: {
      //   width: 1280,
      //   height: 720
      // },
      // video: {
      //   width: { min: 1280 },
      // }
    }

    // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
    navigator.mediaDevices.getUserMedia(constraints)
      .then(success)
      .catch(failure)
  }

  sendToPeer = (messageType, payload) => {
    this.socket.emit(messageType, {
      socketID: this.socket.id,
      payload
    })
  }

  /* ACTION METHODS FROM THE BUTTONS ON SCREEN */

  createOffer = () => {
    console.log('Offer')

    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createOffer
    // initiates the creation of SDP
    this.pc.createOffer({ offerToReceiveVideo: 1 })
      .then(sdp => {
        // console.log(JSON.stringify(sdp))

        // set offer sdp as local description
        this.pc.setLocalDescription(sdp)

        this.sendToPeer('offerOrAnswer', sdp)
    })
  }

  // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createAnswer
  // creates an SDP answer to an offer received from remote peer
  createAnswer = () => {
    console.log('Answer')
    this.pc.createAnswer({ offerToReceiveVideo: 1 })
      .then(sdp => {
        // console.log(JSON.stringify(sdp))

        // set answer sdp as local description
        this.pc.setLocalDescription(sdp)

        this.sendToPeer('offerOrAnswer', sdp)
    })
  }

  setRemoteDescription = () => {
    // retrieve and parse the SDP copied from the remote peer
    const desc = JSON.parse(this.textref.value)

    // set sdp as remote description
    this.pc.setRemoteDescription(new RTCSessionDescription(desc))
  }

  addCandidate = () => {
    // retrieve and parse the Candidate copied from the remote peer
    // const candidate = JSON.parse(this.textref.value)
    // console.log('Adding candidate:', candidate)

    // add the candidate to the peer connection
    // this.pc.addIceCandidate(new RTCIceCandidate(candidate))

    this.candidates.forEach(candidate => {
      console.log(JSON.stringify(candidate))
      this.pc.addIceCandidate(new RTCIceCandidate(candidate))
    });
  }

  render() {
    return (
      <div style={{textAlign:"center",marginTop:20}}>
        <video
          style={{
            width: 300,
            height: 300,
            margin: 12,
            backgroundColor: 'black',
            border:"4px dotted white"
          }}
          ref={ this.localVideoref }
          autoPlay>
        </video>
        <video
          style={{
            width: 300,
            height: 300,
            margin: 12,
            backgroundColor: 'black',
            border:"4px dotted white"
          }}
          ref={ this.remoteVideoref }
          autoPlay>
        </video>
        <br />
        <button onClick={this.createOffer}>SendOffer</button>
        <button onClick={this.createAnswer}>Answer</button>

        <br />
        <textarea style={{ width: 450, height:40 }} ref={ref => { this.textref = ref }} />
        <p>This is the text area that shows SDP shared to you by the other party</p>

        {/* <br />
        <button onClick={this.setRemoteDescription}>Set Remote Desc</button>
        <button onClick={this.addCandidate}>Add Candidate</button> */}
      </div>
    )
  }
}
export default App;