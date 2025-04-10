var AppProcess=(function(){
    var peers_connection_ids=[];
    var peers_connection=[];
    var serverProcess;
    var remote_aud_stream=[];
    var remote_vid_stream=[];
    var local_div;
    var audio;
    var isAudioMute=true;
    var rtp_aud_senders=[];
    var video_states={
        None:0,
        Camera:1,
        ScreenShare:2
    }
    var rtp_vid_senders=[];
    var videoCamTrack;
    var video_st=video_states.None;
    async function _init( SDP_function,my_connid){
        serverProcess=SDP_function;
        my_connection_id=my_connid;
        eventProcess();
        local_div=document.getElementById("localVideoPlayer");
    }
    function eventProcess(){
        $("#miceMuteUnmute").on("click",async function() {
            if(!audio){
                await loadAudio();
            }
            if(!audio){
                    alert("permission not given");
                    return;
            }
            if(isAudioMute){
                audio.enabled=true;
                $("#miceMuteUnmute").html("<span class='material-icons' style='width: 100%;'>mic_on</span>");
                updateMediaSenders(audio,rtp_aud_senders);
            }else{
                audio.enabled=false;
                $("#miceMuteUnmute").html("<span class='material-icons' style='width: 100%;'>mic_off</span>");;
                removeMediaSenders(audio,rtp_aud_senders);
            }
            isAudioMute=!isAudioMute;
        });
        $("#videoCamOnOff").on("click",async function(){
            if(video_st==video_states.Camera){
                await videoProcess(video_states.None);
            }else{
                await videoProcess(video_states.Camera);
            }
        
            
        })
        $("#btnScreenShare").on("click",async function(){
            if(video_st==video_states.ScreenShare){
                await videoProcess(video_states.None);
            }else{
                await videoProcess(video_states.ScreenShare);
            }
        
            
        })
    }
    async function loadAudio() {
        try{
            var astream=await navigator.mediaDevices.getUserMedia({
                video:false,
                audio:true
            });
            audio=astream.getAudioTracks()[0];
            audio.enabled=false;
        }catch(e){
            console.log(e);
        }
        
    }
    function connection_status(connection){
        if(connection &&(connection.connectionState=="new"||connection.connectionState=="connecting"||connection.connectionState=="connected"))
    {return true;}else{
        return false;
    }}
    async function updateMediaSenders(track,rtp_senders) {
        for (var con_id in peers_connection_ids){
            if(connection_status(peers_connection[con_id])){
                if(rtp_senders[con_id]&& rtp_senders[con_id].track){
                    rtp_senders[con_id].replaceTrack(track);
                }else{
                    rtp_senders[con_id]=peers_connection[con_id].addTrack(track); 
                }
            }
        }
    }
    function removeMediaSenders(rtp_senders){
        for (var con_id in peers_connection_ids){
            if(rtp_senders[con_id] && connection_status(peers_connection[con_id])){
                peers_connection[con_id].removeTrack(rtp_senders[con_id]);
                rtp_senders[con_id]=null;
            }
        }
    }
    function removeVideoStream(rtp_vid_senders){
        if(videoCamTrack){
            videoCamTrack.stop();
            videoCamTrack=null;
            local_div.srcObject=null;
            removeMediaSenders(rtp_vid_senders);
        }
    }
    // Fix for the videoProcess function in AppProcess

async function videoProcess(newVideoState) {
    if(newVideoState==video_states.None){
        $("#videoCamOnOff").html("<span class='material-icons' style='width: 100%;'>videocam_off</span>");
        // Fix 3: Ensure "Present Now" text remains visible when camera is off
        $("#btnScreenShare").html("<span class='material-icons' style='width: 100%;'>present_to_all</span><div>Present Now</div>");
        video_st=newVideoState;
        removeVideoStream(rtp_vid_senders);
        return;
    }
    
    if(newVideoState==video_states.Camera){
        $("#videoCamOnOff").html("<span class='material-icons' style='width: 100%;'>videocam_on</span>");
    }
    
    try{
        var vstream=null;
        if(newVideoState==video_states.Camera){
           
           vstream= await navigator.mediaDevices.getUserMedia({
                video:{
                    width:1920,
                    height:1680
                },audio:false
            });
        }else if(newVideoState==video_states.ScreenShare){
           vstream= await navigator.mediaDevices.getDisplayMedia({
                video:{
                    width:1920,
                    height:1680
                },audio:false
            });
            vstream.oninactive =(e)=>{
                removeVideoStream(rtp_vid_senders);
                // Fix 1 & 2: Maintain proper alignment with text-center class and ensure "Present Now" text is visible
                $("#btnScreenShare").html("<span class='material-icons' style='width: 100%;'>present_to_all</span><div>Present Now</div>");
            }
        } 
        
        if(vstream && vstream.getVideoTracks().length>0){
            videoCamTrack=vstream.getVideoTracks()[0];
            if(videoCamTrack){
                local_div.srcObject=new MediaStream([videoCamTrack]);
                updateMediaSenders(videoCamTrack,rtp_vid_senders);
            }
        }
    }catch(e){
        console.log(e);
        return;
    }
    
    video_st=newVideoState; 
    if(newVideoState==video_states.Camera){
        $("#videoCamOnOff").html("<span class='material-icons' style='width: 100%;'>videocam</span>");
        // Fix 1 & 3: Ensure "Present Now" text is visible and properly aligned
        $("#btnScreenShare").html("<span class='material-icons' style='width: 100%;'>present_to_all</span><div>Present Now</div>");
    }
    else if(newVideoState==video_states.ScreenShare){
        $("#videoCamOnOff").html("<span class='material-icons' style='width: 100%;'>videocam_off</span>");
        // Fix 1 & 2: Apply text-success class correctly to both span and div elements
        $("#btnScreenShare").html("<span class='material-icons text-success' style='width: 100%;'>present_to_all</span><div class='text-success'>Stop Present Now</div>");
    }
}
    const iceConfiguration = {
        iceServers: [
          {
            urls: "stun:stun.l.google.com:19302",
          },
          {
            urls: "stun:stun1.l.google.com:19302",
          },
          {
            urls: "stun:stun2.l.google.com:19302",
          },
          {
            urls: "stun:stun3.l.google.com:19302",
          },
          {
            urls: "stun:stun4.l.google.com:19302",
          },
        ],
      };
async function setConnection(connid){
    var connection=new RTCPeerConnection(iceConfiguration);
    connection.onnegotiationneeded=async function(event){
        await setOffer(connid);
    };
    connection.onicecandidate=function(event){
        if (event.candidate){
            serverProcess(JSON.stringify({icecandidate: event.candidate}),connid);
        }
    };
    connection.ontrack=function(event){
        if(!remote_vid_stream[connid]){
            remote_vid_stream[connid]=new MediaStream();
        }
        if(!remote_aud_stream[connid]){
            remote_aud_stream[connid]=new MediaStream();
        }
        if(event.track.kind =="video"){
            remote_vid_stream[connid].getVideoTracks().forEach((t)=>remote_vid_stream[connid].removeTrack(t));
            remote_vid_stream[connid].addTrack(event.track);
            var remoteVideoPlayer=document.getElementById("v_"+connid);
            remoteVideoPlayer.srcObject=null;
            remoteVideoPlayer.srcObject=remote_vid_stream[connid];
            remoteVideoPlayer.load();

        }
        else if(event.track.kind =="audio"){
            remote_aud_stream[connid].getAudioTracks().forEach((t)=>remote_aud_stream[connid].removeTrack(t));
            remote_aud_stream[connid].addTrack(event.track);
            var remoteAudioPlayer=document.getElementById("a_"+connid);
            remoteAudioPlayer.srcObject=null;
            remoteAudioPlayer.srcObject=remote_aud_stream[connid];
            remoteAudioPlayer.load();

        }
    }
    peers_connection_ids[connid]=connid;
    peers_connection[connid]=connection;
    if(video_st==video_states.Camera||video_st==video_states.ScreenShare){
        if(videoCamTrack){
    updateMediaSenders(videoCamTrack,rtp_vid_senders);
    }}
    return connection; 
}
async function setOffer(connid){
    var connection=peers_connection[connid];
    var offer = await connection.createOffer();
    await connection.setLocalDescription(offer);
    serverProcess(JSON.stringify({offer:connection.localDescription}),connid)
}

async function SDPProcess(message,from_connid){
    message=JSON.parse(message);
    if(message.answer){
        await peers_connection[from_connid].setRemoteDescription(new RTCSessionDescription(message.answer));
    }else if(message.offer){
        if(!peers_connection[from_connid]){
            await setConnection(from_connid);
        }
        await peers_connection[from_connid].setRemoteDescription(new RTCSessionDescription(message.offer));
        var answer=await peers_connection[from_connid].createAnswer();
        await peers_connection[from_connid].setLocalDescription(answer);
        serverProcess(JSON.stringify({answer:answer}),from_connid);}
        else if(message.icecandidate){
            if(!peers_connection[from_connid]){
                await setConnection(from_connid);
            }
            try{
                await peers_connection[from_connid].addIceCandidate(message.icecandidate);

            }catch(e){
                console.log(e); 
            }
        }
    }
    async function closeConnection(connid) {
        peers_connection_ids[connid]=null;
        if(peers_connection_ids[connid]){
            peers_connection[connid].close();
            peers_connection[connid]=null;
        }
        if(remote_aud_stream[connid]){
            remote_aud_stream[connid].getTracks().forEach((t)=>{
                if(t.stop) t.stop();
            })
            remote_aud_stream[connid]=null;
        }
        if(remote_vid_stream[connid]){
            remote_vid_stream[connid].getTracks().forEach((t)=>{
                if(t.stop) t.stop();
            })
            remote_vid_stream[connid]=null;
        }

    }
    
    return{
        setNewConnection:async function(connId){
            await setConnection(connId);
        },
        init:async function(SDP_function,my_connid){
           await  _init(SDP_function, my_connid);
        },
        processClientFunc:async function(data,from_connid){
           await  SDPProcess(data,from_connid);
        },
        closeConnectionCall:async function(connId){
           await closeConnection(connId);},

    };
})();
    
    
    
    
    
    
    
    
    
    
    
    var MyApp =(function(){
    var socket=null;
    var user_id="";
    var meetingid="";
    function init(uid,mid){
        user_id=uid;
        meeting_id=mid
        $("#meetingContainer").show();
        $("#me h2").text(user_id+"(Me)");
        document.title=user_id;
        event_process_for_signalling_server();
        eventHandling();
    }
    
    function event_process_for_signalling_server(){
        socket=io.connect();

        var SDP_function=function(data,to_connid){
            socket.emit("SDPProcess",{
                message:data,
                to_connid:to_connid
            })
        }
        socket.on("connect",()=>{
            if(socket.connected){
                AppProcess.init(SDP_function,socket.id);
                if(user_id!="" && meeting_id!=""){
                    socket.emit('userconnect',{
                        displayName: user_id,
                        meetingid:meeting_id
                    })
                }
            }
        });
        socket.on("inform_other_about_disconnected_user", function(data){
            console.log("User disconnected: ", data.connId);
            // First remove the user element
            $("#" + data.connId).remove();
            $(".participant-count").text(data.uNumber);
            $("#participant_"+data.connId+"").remove();
            // Then close the connection
            AppProcess.closeConnectionCall(data.connId);
        });
        socket.on("inform_others_about_me",function(data){
            addUser(data.other_user_id,data.connId,data.userNumber);
            AppProcess.setNewConnection(data.connId);
        });
        socket.on("inform_me_about_other_user",function(other_users){
            var userNumber=other_users.length+1;
            if(other_users){
                for(var i=0;i<other_users.length;i++){
                    addUser(other_users[i].user_id,other_users[i].connectionId,userNumber);
                    AppProcess.setNewConnection(other_users[i].connectionId);}}
            
        });
        socket.on("SDPProcess", async function(data){
            await AppProcess.processClientFunc(data.message,data.from_connid);
        })
        socket.on("showChatMessage",function(data){
            var time= new Date();
            var lTime=time.toLocaleString("en-US",{
                hour:"numeric",
                minute:"numeric",
                hour12:true
            })
            var div=$("<div>").html("<span class='font-weight-bold mr-3' style='color:black'>"+data.from+"</span>"+lTime+"</br>"+data.message);
            $("#messages").append(div);
        });
        socket.on("showFileMessage",function(data){
            var time= new Date();
            var lTime=time.toLocaleString("en-US",{
                hour:"numeric",
                minute:"numeric",
                hour12:true
            })
            var attachFileAreaForOther=document.querySelector(".show-attach-file");
            attachFileAreaForOther.innerHTML+="<div class='left-align' style='display:flex; align-items:center;'><img src='./assests/images/other.jpg' style='height:40px;width:40px;' class='caller-image circle'><div style='font-weight:600;margin:0 5px;'>"+data.username+"</div>:<div><a style='color:#0077bff;' href='"+data.filePath+"'download>"+data.fileName+"</a></div><d/div><br/>";
        });
    }
    function eventHandling(){
        $("#btnsend").on("click",function(){
            var msgData=$("#msgbox").val();
            socket.emit("sendMessage",msgData);
            var time= new Date();
            var lTime=time.toLocaleString("en-US",{
                hour:"numeric",
                minute:"numeric",
                hour12:true
            })
            var div=$("<div>").html("<span class='font-weight-bold mr-3' style='color:black'>"+user_id+"</span>"+lTime+"</br>"+msgData);
            $("#messages").append(div);
            $("#msgbox").val("");
        });
        var url=window.location.href;
        $(".meeting_url").text(url);

        $("#divUsers").on("dblclick","video",function(){
            this.requestFullscreen();
        })
    }


    function addUser(other_user_id,connId,userNum){
        var newDivId=$("#otherTemplate").clone();
        newDivId= newDivId.attr("id",connId).addClass("other");
        newDivId.find("h2").text(other_user_id);
        newDivId.find("video").attr("id","v_"+connId);
        newDivId.find("audio").attr("id","a_"+connId);
        newDivId.show();
        $("#divUsers").append(newDivId);
        $(".in-call-wrap-up").append('<div class="in-call-wrap d-flex justify-content-between align-items-center mb-3 " id="participant_'+connId+'"> <div class="participant-img-name-wrap display-center cursor-pointer"> <div class="participant-img"> <img src="./assests/images/other.jpg" class=" border border-secondary" style="height:40px;width: 40px;border-radius: 50%;"> </div> <div class="participant-name ml-2">'+other_user_id+'</div> </div> <div class="participant-img-action-wrap display-center"> <div class="participant-action-dot display-center m3-2 cursor-pointer"> <span class="material-icons">more_vert</span> </div> <div class="participant-action-pin display-center m3-2 cursor-pointer"> <span class="material-icons">push_pin</span> </div> </div> </div>')
   $(".participant-count").text(userNum); }
    $(document).on("click",".people-heading",function(){
        $(".chat-show-wrap").hide(300);
        $(".in-call-wrap-up").show(300);
        $(".people-heading").addClass("active");
        $(".chat-heading").removeClass("active");
    })
    $(document).on("click",".chat-heading",function(){
        $(".chat-show-wrap").show(300);
        $(".in-call-wrap-up").hide(300);
        $(".chat-heading").addClass("active");
        $(".people-heading").removeClass("active");
    })
    $(document).on("click",".meeting-heading-cross",function(){
       $(".g-right-details-wrap").hide(300);
    })
    $(document).on("click",".top-left-chat-wrap",function(){
        $(".g-right-details-wrap").show(300);
        $(".in-call-wrap-up").hide(300);
        $(".chat-show-wrap").show(300);
        $(".chat-heading").addClass("active");
        $(".people-heading").removeClass("active");
     });
     $(document).on("click",".top-left-participant-wrap",function(){
        $(".g-right-details-wrap").show(300);
        $(".in-call-wrap-up").show(300);
        $(".chat-show-wrap").hide(300);
        $(".people-heading").addClass("active");
        $(".chat-heading").removeClass("active");
     });
     $(document).on("click",".end-call-wrap",function(){
       $(".top-box-show").css({
        display:"block"
       }).html('<div class="top-box align-vertical-middle profile-dialogue-show" style="text-align:center;color:white;"> <h1 class="mt-2">Leave Meeting</h1><hr> <div class="call-leave-cancel-action d-flex justify-content-center align-items-center w-100"> <a href="/action.html"><button class="call-leave-action btn btn-danger mr-5">Leave </button></a> <button class="call-cancel-action btn btn-secondary">Cancel</button> </div> </div>');
     });
    
     
  
     $(document).on("click",".call-cancel-action",function(){
        $(".top-box-show").html('');
     })

    $(document).on("click",".copy_info",function(){
        var temp=$("<input>");
        $("body").append(temp);
        temp.val($(".meeting_url").text()).select();
        document.execCommand("copy");
        temp.remove();
        $(".link-conf").show();
        setTimeout(function(){
            $(".link-conf").hide();},3000);
        })
    $(document).on("click",".meeting-details-button",function(){
        $(".g-details").slideToggle(300);
    });
    var base_url=window.location.origin;
    $(document).on("change", ".custom-file-input", function () {
        var fileName = $(".custom-file-input").val().split("\\").pop();
        $(".custom-file-input").next(".custom-file-label").text(fileName);
    });
    
    $(document).on("click",".share-attach",function(e){
    e.preventDefault();
    var att_img=$("#customFile").prop('files')[0];
    var formData= new FormData();
    formData.append("zipfile",att_img);
    formData.append("meeting_id",meeting_id);
    formData.append('username',user_id);
    console.log(formData);
    $.ajax({
        url:base_url+"/attaching",
        type:"POST",
        data:formData,
        contentType:false,
        processData:false,
        success:function(response){
            console.log(response);
        },
        error:function(response){
            console.log(error);
        },
    });
    var attachFileArea=document.querySelector(".show-attach-file");
    var attachFileName=$("#customFile").val().split("\\").pop();
    var attachFilePath="public/attachment/"+meeting_id+"/"+attachFileName;
    attachFileArea.innerHTML+="<div class='left-align' style='display:flex; align-items:center;'><img src='./assests/images/other.jpg' style='height:40px;width:40px;' class='caller-image circle'><div style='font-weight:600;margin:0 5px;'>"+user_id+"</div>:<div><a style='color:#0077bff;' href='"+attachFilePath+"'download>"+attachFileName+"</a></div><d/div><br/>";
    $("label.custom-file-label").text("");
    socket.emit("fileTransferToOther",{
        username:user_id,
        meetingid:meeting_id,
        filePath:attachFilePath,
        fileName:attachFileName,
    });
    });
  
    $(document).on("click",".g-details-heading-attachment",function(){
        $(".g-details-heading-show").hide();
        $(".g-details-heading-show-attachment").show();
        $(".g-details-heading-attachment").addClass("active");
        $(".g-details-heading-detail").removeClass("active");
    })

    $(document).on("click",".g-details-heading-detail",function(){
        $(".g-details-heading-show-attachment").hide();
        $(".g-details-heading-show").show();
        $(".g-details-heading-detail").addClass("active");
        $(".g-details-heading-attachment").removeClass("active");
    })

    $(document).on("click", ".option-icon", function() {
        $(".recording-show").toggle(300);
    });
    
    $(document).on("click", ".start-record", function() {
        $(".start-record").removeClass().addClass("stop-record btn-danger text-dark").text("Stop Recording");
        startRecording();
    });
    
    $(document).on("click", ".stop-record", function() {
        if (mediaRecorder && mediaRecorder.state === "recording") {
            $(".stop-record").removeClass().addClass("start-record btn-danger text-dark").text("Start Recording");
            mediaRecorder.stop();
        } else {
            alert("No active recording to stop.");
        }
    });
    
    var mediaRecorder;
    var chunks = [];
    
    async function captureScreen(mediaConstraints = { video: true }) {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia(mediaConstraints);
            return screenStream;
        } catch (err) {
            console.error("Screen capture failed:", err);
            alert("Screen capture permission denied or not supported.");
            throw err;
        }
    }
    
    async function captureAudio(mediaConstraints = { audio: true }) {
        try {
            const audioStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
            return audioStream;
        } catch (err) {
            console.error("Audio capture failed:", err);
            alert("Audio capture permission denied or not supported.");
            throw err;
        }
    }
    
    async function startRecording() {
        try {
            const screenStream = await captureScreen();
            const audioStream = await captureAudio();
    
            // Correct way to merge tracks into a single stream
            const combinedStream = new MediaStream([
                ...screenStream.getTracks(),
                ...audioStream.getTracks()
            ]);
    
            mediaRecorder = new MediaRecorder(combinedStream);
            mediaRecorder.start();
    
            mediaRecorder.ondataavailable = function(e) {
                chunks.push(e.data);
            };
    
            mediaRecorder.onstop = function() {
                const clipName = prompt("Enter a name for your recording:");
                combinedStream.getTracks().forEach((track) => track.stop());
    
                const blob = new Blob(chunks, { type: "video/webm" });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.style.display = "none";
                a.href = url;
                a.download = (clipName || "recording") + ".webm";
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                }, 100);
            };
        } catch (err) {
            console.error("Error starting recording:", err);
            alert("Failed to start recording. Please check permissions.");
        }
    }
    
    return {
        _init: function(uid,mid){
            init(uid,mid);
        },
    };
})();
