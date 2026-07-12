/*
 *  These procedures use Agora Video Call SDK for Web to enable local and remote
 *  users to join and leave a Video Call channel managed by Agora Platform.
 */

/*
 *  Create an {@link https://docs.agora.io/en/Video/API%20Reference/web_ng/interfaces/iagorartcclient.html|AgoraRTCClient} instance.
 *
 * @param {string} mode - The {@link https://docs.agora.io/en/Voice/API%20Reference/web_ng/interfaces/clientconfig.html#mode| streaming algorithm} used by Agora SDK.
 * @param  {string} codec - The {@link https://docs.agora.io/en/Voice/API%20Reference/web_ng/interfaces/clientconfig.html#codec| client codec} used by the browser.
 */
var client;

/*
 * Clear the video and audio tracks used by `client` on initiation.
 */
var localTracks = {
  videoTrack: null,
  audioTrack: null
};

/*
 * On initiation no users are connected.
 */
var remoteUsers = {};

/*
 * RTM related variables
 */
var rtmClient = null;
var rtmChannel = null;

/*
 * Agent ID 用于停止Agent
 */
var agentId = null;

/*
 * On initiation. `client` is not attached to any project or channel for any specific user.
 */
var options = {
  appid: "e9e1a555ca5846deb3b4e427dc563581",
  channel: "Singapore" + Math.floor(1000 + Math.random() * 9000),
  uid: 6002,
  token: null
};

// 视频配置文件数组已删除，使用默认480p_1配置
AgoraRTC.onAutoplayFailed = () => {
  alert("click to start autoplay!");
};
AgoraRTC.onMicrophoneChanged = async changedDevice => {
  // When plugging in a device, switch to a device that is newly plugged in.
  if (changedDevice.state === "ACTIVE") {
    localTracks.audioTrack.setDevice(changedDevice.device.deviceId);
    // Switch to an existing device when the current device is unplugged.
  } else if (changedDevice.device.label === localTracks.audioTrack.getTrackLabel()) {
    const oldMicrophones = await AgoraRTC.getMicrophones();
    oldMicrophones[0] && localTracks.audioTrack.setDevice(oldMicrophones[0].deviceId);
  }
};
AgoraRTC.onCameraChanged = async changedDevice => {
  // When plugging in a device, switch to a device that is newly plugged in.
  if (changedDevice.state === "ACTIVE") {
    localTracks.videoTrack.setDevice(changedDevice.device.deviceId);
    // Switch to an existing device when the current device is unplugged.
  } else if (changedDevice.device.label === localTracks.videoTrack.getTrackLabel()) {
    const oldCameras = await AgoraRTC.getCameras();
    oldCameras[0] && localTracks.videoTrack.setDevice(oldCameras[0].deviceId);
  }
};
// 设备管理相关函数已删除，使用默认配置

/*
 * RTM相关函数
 */
async function initRTM() {
  try {
    const { RTM } = AgoraRTM;
    rtmClient = new RTM(options.appid, options.uid.toString());
    
    // 添加事件监听器
    rtmClient.addEventListener("message", event => {
      handleRTMMessage(event.publisher, event.message);
    });
    
    rtmClient.addEventListener("presence", event => {
      if (event.eventType === "SNAPSHOT") {
        showRTMMessage("INFO", "Agent joined the channel");
      } else {
        showRTMMessage("Agent States: ", event.stateChanged.state);
      }
    });
    
    // rtmClient.addEventListener("status", event => {
    //   showRTMMessage("INFO", "Connection status: " + event.state);
    // });
    
    // 登录RTM
    await rtmClient.login({ token: options.token });
    console.log("RTM login success");
    
    // 订阅频道
    rtmChannel = await rtmClient.subscribe(options.channel);
    console.log("RTM subscribe success rtmUid: ", options.uid.toString()  );
    
  } catch (error) {
    console.error("RTM init error:", error);
  }
}

async function leaveRTM() {
  try {
    if (rtmChannel) {
      await rtmClient.unsubscribe(options.channel);
      rtmChannel = null;
    }
    if (rtmClient) {
      await rtmClient.logout();
      rtmClient = null;
    }
    console.log("RTM leave success");
  } catch (error) {
    console.error("RTM leave error:", error);
  }
}

async function sendRTMMessage(message) {
  try {
    if (rtmClient && rtmChannel) {
      const payload = { type: "text", message: message };
      const publishMessage = JSON.stringify(payload);
      const publishOptions = { channelType: 'MESSAGE',customType: "user.transcription"};
      await rtmClient.publish(options.channel, publishMessage, publishOptions);
      showRTMMessage(options.uid.toString(), publishMessage);
    }
  } catch (error) {
    console.error("Send RTM message error:", error);
  }
}

function handleRTMMessage(publisher, message) {
  try {
    // 尝试解析JSON消息
    const messageData = JSON.parse(message);
    
    // 检查是否是 user.transcription 消息且 final 为 true
    if (messageData.object === "user.transcription" && messageData.final === true) {
      console.log(`${messageData.object}: ${messageData.text}`);
      showRTMMessage("User", `${messageData.text}`);
    }
    // 检查是否是 assistant.transcription 消息且 turn_status 为 1
    else if (messageData.object === "assistant.transcription" && messageData.turn_status === 1) {
      console.log(`${messageData.object}: ${messageData.text}`);
      showRTMMessage("Agent", `${messageData.text}`);
    } else {
      // 其他消息正常显示
      //showRTMMessage(publisher, message);
    }
  } catch (error) {
    // 如果不是JSON格式，按原方式处理
    //showRTMMessage(publisher, message);
  }
}

function showRTMMessage(user, message) {
  const messagesContainer = document.getElementById("rtm-messages");
  const messageElement = document.createElement("div");
  messageElement.innerHTML = `<strong>${user}:</strong> ${message}`;
  messageElement.style.marginBottom = "5px";
  messagesContainer.appendChild(messageElement);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 显示成功Toast
function showSuccessToast() {
  const toast = document.getElementById("success-toast");
  toast.classList.add("show");
  
  // 5秒后自动隐藏
  setTimeout(() => {
    toast.classList.remove("show");
  }, 5000);
}

/*
 * When this page is called with parameters in the URL, this procedure
 * attempts to join a Video Call channel using those parameters.
 */
// 获取Token的函数
async function fetchToken() {
  try {
    const response = await fetch('https://token.stantest.top:8082/fetch_agora_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uid: options.uid.toString(),
        channel: options.channel
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.token;
    } else {
      console.error('Failed to fetch token:', response.status);
      return null;
    }
  } catch (error) {
    console.error('Error fetching token:', error);
    return null;
  }
}

$(() => {
  // 页面初始化时获取token
  fetchToken().then(token => {
    if (token) {
      options.token = token;
      console.log('Token fetched successfully');
    } else {
      console.log('Failed to fetch token, will join without token');
    }
  });
  
  // 使用预设的选项值，不再需要从URL参数获取
  var urlParams = new URL(location.href).searchParams;
  if (urlParams.get("appid") && urlParams.get("channel")) {
    options.appid = urlParams.get("appid");
    options.channel = urlParams.get("channel");
    options.token = urlParams.get("token");
    options.uid = urlParams.get("uid");
    $("#join-form").submit();
  }
  
  // RTM消息发送事件监听器
  $("#rtm-send-button").click(function() {
    const message = $("#rtm-message-input").val().trim();
    if (message) {
      sendRTMMessage(message);
      $("#rtm-message-input").val("");
    }
  });
  
  // 回车键发送消息
  $("#rtm-message-input").keypress(function(e) {
    if (e.which === 13) { // Enter键
      const message = $(this).val().trim();
      if (message) {
        sendRTMMessage(message);
        $(this).val("");
      }
    }
  });
});


var API_URL = "https://token.stantest.top/start-agent-singapore";
var STOP_API_URL = "https://token.stantest.top/stop-agent";

async function startAgentViaBackend() {
  try {
    console.log(`正在请求后端启动 Agent，频道: ${options.channel}`);
    console.log(`API 地址: ${API_URL}`);
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channel: options.channel
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Agent 启动成功:', result);
    
    // 保存 agent_id 以便后续停止 Agent
    if (result.success && result.data && result.data.agent_id) {
      agentId = result.data.agent_id;
      console.log('已保存 Agent ID:', agentId);
    }
    
    return result;
  } catch (error) {
    console.error('启动 Agent 失败:', error);
    throw error;
  }
}

async function stopAgentViaBackend() {
  if (!agentId) {
    console.warn('没有保存的 Agent ID，无法停止 Agent');
    return;
  }
  
  try {
    console.log(`正在请求后端停止 Agent，Agent ID: ${agentId}`);
    console.log(`API 地址: ${STOP_API_URL}`);
    
    const response = await fetch(STOP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agent_id: agentId
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Agent 停止成功:', result);
    return result;
  } catch (error) {
    console.error('停止 Agent 失败:', error);
    // 即使停止失败也继续执行离开流程
  }
}


/*
 * When a user clicks Join or Leave in the HTML form, this procedure gathers the information
 * entered in the form and calls join asynchronously. The UI is updated to match the options entered
 * by the user.
 */
$("#join").click(async function (e) {
  e.preventDefault();
  $("#join").attr("disabled", true);
  try {
    client = AgoraRTC.createClient({
      mode: "rtc",
      codec: "vp8"
    });

    console.log('步骤 1: 请求后端启动 AI Agent...');
    await startAgentViaBackend();
    console.log('AI Agent 已启动');

    // 使用预设的选项值
    await join();
    // 显示成功Toast
    showSuccessToast();
  } catch (error) {
    console.error(error);
  } finally {
    $("#leave").attr("disabled", false);
  }
});

/*
 * Called when a user clicks Leave in order to exit a channel.
 */
$("#leave").click(function (e) {
  leave();
});
// 高级设置相关代码已删除

/*
 * Join a channel, then create local video and audio tracks and publish them to the channel.
 */
async function join() {
  // Add an event listener to play remote tracks when remote user publishes.
  client.on("user-published", handleUserPublished);
  client.on("user-unpublished", handleUserUnpublished);
  // Join the channel.
  options.uid = await client.join(options.appid, options.channel, options.token || null, options.uid || null);
  if (!localTracks.audioTrack) {
    localTracks.audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
      encoderConfig: "music_standard"
    });
  }
  if (!localTracks.videoTrack) {
    localTracks.videoTrack = await AgoraRTC.createCameraVideoTrack({
      encoderConfig: "480p_1"
    });
  }

  // Play the local video track to the local browser and update the UI with the user ID.
  localTracks.videoTrack.play("local-player");
  $("#local-player-name").text(`localVideo(${options.uid})`);
  $("#joined-setup").css("display", "flex");

  // Publish the local video and audio tracks to the channel.
  await client.publish(Object.values(localTracks));
  console.log("publish success");
  
  // 初始化RTM
  await initRTM();
}

/*
 * Stop all local and remote tracks then leave the channel.
 */
async function leave() {
  // 先停止 Agent
  console.log('步骤 1: 停止 AI Agent...');
  await stopAgentViaBackend();
  console.log('AI Agent 已停止');
  
  for (trackName in localTracks) {
    var track = localTracks[trackName];
    if (track) {
      track.stop();
      track.close();
      localTracks[trackName] = undefined;
    }
  }

  // Remove remote users and player views.
  remoteUsers = {};
  $("#remote-playerlist").html("");

  // leave the channel
  await client.leave();
  
  // 离开RTM频道
  await leaveRTM();
  
  $("#local-player-name").text("");
  $("#join").attr("disabled", false);
  $("#leave").attr("disabled", true);
  $("#joined-setup").css("display", "none");
  console.log("client leaves channel success");
  
  // 清空 agentId
  agentId = null;
}

/*
 * Add the local use to a remote channel.
 *
 * @param  {IAgoraRTCRemoteUser} user - The {@link  https://docs.agora.io/en/Voice/API%20Reference/web_ng/interfaces/iagorartcremoteuser.html| remote user} to add.
 * @param {trackMediaType - The {@link https://docs.agora.io/en/Voice/API%20Reference/web_ng/interfaces/itrack.html#trackmediatype | media type} to add.
 */
async function subscribe(user, mediaType) {
  const uid = user.uid;
  // subscribe to a remote user
  await client.subscribe(user, mediaType);
  console.log("subscribe success");
  if (mediaType === "video") {
    const player = $(`
      <div id="player-wrapper-${uid}">
        <p class="player-name">remoteUser(${uid})</p>
        <div id="player-${uid}" class="remote-player"></div>
      </div>
    `);
    $("#remote-playerlist").append(player);
    user.videoTrack.play(`player-${uid}`);
  }
  if (mediaType === "audio") {
    user.audioTrack.play();
  }
}

/*
 * Add a user who has subscribed to the live channel to the local interface.
 *
 * @param  {IAgoraRTCRemoteUser} user - The {@link  https://docs.agora.io/en/Voice/API%20Reference/web_ng/interfaces/iagorartcremoteuser.html| remote user} to add.
 * @param {trackMediaType - The {@link https://docs.agora.io/en/Voice/API%20Reference/web_ng/interfaces/itrack.html#trackmediatype | media type} to add.
 */
function handleUserPublished(user, mediaType) {
  const id = user.uid;
  remoteUsers[id] = user;
  subscribe(user, mediaType);
}

/*
 * Remove the user specified from the channel in the local interface.
 *
 * @param  {string} user - The {@link  https://docs.agora.io/en/Voice/API%20Reference/web_ng/interfaces/iagorartcremoteuser.html| remote user} to remove.
 */
function handleUserUnpublished(user, mediaType) {
  if (mediaType === "video") {
    const id = user.uid;
    delete remoteUsers[id];
    $(`#player-wrapper-${id}`).remove();
  }
}
// getCodec函数已删除，使用默认vp8编解码器
