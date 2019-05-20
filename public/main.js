let socket;
let socketId;
const localVideo = document.getElementById('localVideo');
const filter = document.querySelector('#filter')
let connections = [];
let inboundStream = null;
let stream_cnt=0;
let video;

var peerConnectionConfig = {
    'iceServers': [
        {'urls': 'stun:stun.services.mozilla.com'},
        {'urls': 'stun:stun.l.google.com:19302'},
    ]
};
let localStream;
//get stream 

let token;
let call_token;
if (document.location.hash === "" || document.location.hash === undefined) { 

    // create the unique token for this call 
    token =Math.round(Math.random()*10000);
    call_token = "#"+token;

    // set location.hash to the unique token for this call
    document.location.hash = token;


}else{
    call_token = document.location.hash;
}







navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {

       

        
        localVideo.srcObject = stream
        localVideo.play();
        
        
        filter.addEventListener('change', (event) => {
            currentFilter = event.target.value
            localVideo.style.filter = currentFilter
            var data={};
            data.currentFilter=currentFilter;
            data.id = socketId;
            SendFilter(data)
            event.preventDefault
        })
        
        
        
        
        
        
        
        
        socket = io()











        socket.on('signal', gotMessageFromServer);
        socket.on('connect', function(){
            socket.emit('token_number',call_token);
            socketId = socket.id;
            socket.on('user-left', function(id){
                var video = document.getElementById(`${id}`);
                video.parentElement.remove();
                // var parentDiv = video.parentElement;
                // video.parentElement.parentElement.removeChild(parentDiv);
            });
            socket.on('user-joined', function(id, count, client_socket_ids){
                console.log(id, count, client_socket_ids)
                client_socket_ids.forEach(function(client_socket_id) {
                    if(!connections[client_socket_id]){
                        connections[client_socket_id] = new RTCPeerConnection(peerConnectionConfig);
                        //if(client_socket_ids.indexOf(client_socket_id)<client_socket_ids.indexOf(client_))
                            let channel = connections[client_socket_id].createDataChannel(`chat${client_socket_id}`)
                            connections[client_socket_id].channel = channel
                            channel.onopen = function(event) {
                                console.log(`it is create peer`)
                                //channel.send('it is create peer');
                              }
                              /*channel.onmessage = function(event) {
                                var data = JSON.parse(event.data)
                                console.log(data)
                                document.getElementById(`${data.id}`).style.filter = data.currentFilter;
                                //if(connections[data.id])
                                }*/
                            
                            //Wait for their ice candidate       
                            connections[client_socket_id].onicecandidate = function(event){
                                if(event.candidate != null) {
                                    console.log('SENDING ICE');
                                    socket.emit('signal', client_socket_id, JSON.stringify({'ice': event.candidate}));
                                }
                            }
                        
                            connections[client_socket_id].ondatachannel = function(event) {
                                let channel = event.channel;
                                //connections[client_socket_id].channel = channel
                                
                                  channel.onopen = function(event) {
                                      console.log('it is receive peer')
                                  //channel.send('it is receive peer');
                                }
                                channel.onmessage = function(event) {
                                    var data = JSON.parse(event.data)
                                    console.log(data)
                                    document.getElementById(`${data.id}`).style.filter = data.currentFilter;
                                }
                                
                            }
                            
                        //Wait for their video stream
                        connections[client_socket_id].ontrack = function(event){
                            gotRemoteStream(event, client_socket_id)
                        }    
                        //Add the local video stream
                        stream.getTracks().forEach(function(track) {
                            connections[client_socket_id].addTrack(track, stream);
                          });
                          
                    }
                });

                //Create an offer to connect with your local description
                
                if(count >= 2){
                    connections[id].createOffer().then(function(description){
                        connections[id].setLocalDescription(description).then(function() {
                            // console.log(connections);
                            socket.emit('signal', id, JSON.stringify({'sdp': connections[id].localDescription}));
                        }).catch(e => console.log(e));        
                    });
                }
            });          
        })    
    })
    .catch(err => document.write(err))

function gotMessageFromServer(fromId, message) {

        //Parse the incoming signal
        var signal = JSON.parse(message)
    
        //Make sure it's not coming from yourself
        if(fromId != socketId) {
    
            if(signal.sdp){            
                connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function() {                
                    if(signal.sdp.type == 'offer') {
                        connections[fromId].createAnswer().then(function(description){
                            connections[fromId].setLocalDescription(description).then(function() {
                                socket.emit('signal', fromId, JSON.stringify({'sdp': connections[fromId].localDescription}));
                            }).catch(e => console.log(e));        
                        }).catch(e => console.log(e));
                    }else if(signal.sdp.type == 'answer'){
                       /* connections[fromId].ondatachannel = function(event) {
                            let channel = event.channel;
                            connections[fromId].channel = channel
                            
                              channel.onopen = function(event) {
                                  console.log('it is receive peer')
                              //channel.send('it is receive peer');
                            }
                            channel.onmessage = function(event) {
                                var data = JSON.parse(event.data)
                                console.log(data)
                                document.getElementById(`${data.id}`).style.filter = data.currentFilter;
                            }
                            
                        }*/
                      
                    }
                }).catch(e => console.log(e));
            }
        
            if(signal.ice) {
                connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e));
            }                
        }
}
function gotRemoteStream(event, id) {

    if(stream_cnt==0){
        video  = document.createElement('video'),
    video.setAttribute('id', id);
    div    = document.createElement('div')
    div.className = `embed-responsive embed-responsive-16by9`
    inboundStream = new MediaStream();
    video.srcObject = inboundStream;
    video.className='embed-responsive-item';
    //video.muted       = true;
    //video.playsinline = true;
    
    div.appendChild(video);      
    document.getElementById('peerVideo_list').appendChild(div);     
    video.autoplay    = true;  
    }
   

   
        if (stream_cnt<2) {
     
        inboundStream.addTrack(event.track);
        }
        
        stream_cnt++;
    
        if(stream_cnt == 2){
        stream_cnt=0;
    }
}
function SendFilter(data) {
    console.log(connections)
 let connection_ids = Object.keys(connections)
    if (connection_ids.length>0) {
        connection_ids.forEach(function(connection_id){
            if(connection_id!=socketId){
    console.log(connections[connection_id])

            connections[connection_id].channel.send(JSON.stringify(data))
            }
        })
    }
}