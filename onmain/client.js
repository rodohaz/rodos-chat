// Simple client-side logic
const socket = io();

// UI
const roomIdInput = document.getElementById("roomId");
const nameInput = document.getElementById("name");
const createRoomBtn = document.getElementById("createRoom");
const joinRoomBtn = document.getElementById("joinRoom");
const createBotBtn = document.getElementById("createBot");
const avatarFile = document.getElementById("avatarFile");
const bgFile = document.getElementById("bgFile");

const lobby = document.getElementById("lobby");
const game = document.getElementById("game");
const playersDiv = document.getElementById("players");
const chatDiv = document.getElementById("chat");
const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("send");
const startTurnsBtn = document.getElementById("startTurns");
const turnIndexSpan = document.getElementById("turnIndex");

let currentRoom = null;
let mySocketId = null;
let roomState = null;
let myCharacter = {name: "", avatarDataUrl: null, expression: "neutral"};

// helper to load file as dataURL
function fileToDataUrl(file, cb){
  const reader = new FileReader();
  reader.onload = ()=> cb(reader.result);
  reader.readAsDataURL(file);
}

createRoomBtn.onclick = ()=>{
  if(avatarFile.files[0]){
    fileToDataUrl(avatarFile.files[0], (dataUrl)=>{
      socket.emit("create-room", {roomId: roomIdInput.value, name: nameInput.value, avatar: dataUrl});
      currentRoom = roomIdInput.value;
      lobby.style.display = "none"; game.style.display = "flex";
    });
  } else {
    socket.emit("create-room", {roomId: roomIdInput.value, name: nameInput.value, avatar: null});
    currentRoom = roomIdInput.value;
    lobby.style.display = "none"; game.style.display = "flex";
  }
};

joinRoomBtn.onclick = ()=>{
  if(avatarFile.files[0]){
    fileToDataUrl(avatarFile.files[0], (dataUrl)=>{
      socket.emit("join-room", {roomId: roomIdInput.value, name: nameInput.value, avatar: dataUrl});
      currentRoom = roomIdInput.value;
      lobby.style.display = "none"; game.style.display = "flex";
    });
  } else {
    socket.emit("join-room", {roomId: roomIdInput.value, name: nameInput.value, avatar: null});
    currentRoom = roomIdInput.value;
    lobby.style.display = "none"; game.style.display = "flex";
  }
};

createBotBtn.onclick = ()=>{
  const botName = prompt("Nome do bot?");
  if(!botName) return;
  socket.emit("create-bot", {roomId: roomIdInput.value, botName});
};

bgFile.onchange = (e)=>{
  if(e.target.files[0]) fileToDataUrl(e.target.files[0], dataUrl=>{
    document.getElementById("chat").style.backgroundImage = `url(${dataUrl})`;
  });
};

startTurnsBtn.onclick = ()=> {
  if(!currentRoom) return alert("Entre em uma sala primeiro");
  socket.emit("start-turn-cycle", {roomId: currentRoom});
};

sendBtn.onclick = ()=> sendMessage();
msgInput.onkeyup = (e)=> { if(e.key==="Enter") sendMessage(); };

function sendMessage(){
  const text = msgInput.value.trim();
  if(!text) return;
  // find my player id
  const me = roomState?.players?.find(p=>p.socketId===mySocketId);
  if(!me) return alert("Não encontrou seu jogador no estado da sala");
  socket.emit("player-message", {roomId: currentRoom, playerId: me.id, text});
  msgInput.value = "";
}

socket.on("connect", ()=> { mySocketId = socket.id; });

socket.on("room-update", (room)=>{
  roomState = room;
  renderPlayers(room);
});

socket.on("turn-update", ({turnIndex})=>{
  turnIndexSpan.textContent = turnIndex;
  // enable send button only if it's my turn and I'm a human player
  const me = roomState?.players?.find(p=>p.socketId===mySocketId);
  const current = roomState?.players?.[turnIndex];
  if(current && me && current.id === me.id && !current.isBot){
    sendBtn.disabled = false;
    msgInput.disabled = false;
  } else {
    sendBtn.disabled = true;
    msgInput.disabled = true;
  }
});

socket.on("chat-message", (m)=>{
  const el = document.createElement("div");
  el.className = "message";
  const p = document.createElement("div");
  // find player data
  const player = roomState?.players?.find(p=>p.id===m.from) || {name: m.from, avatarDataUrl:null};
  p.innerHTML = '<img class="avatar" src="'+(player.avatarDataUrl||'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=36 height=36><rect width=36 height=36 fill=%23ccc /></svg>')+'"/>'
               + '<strong>'+ (player.name||m.from) +'</strong>: ' + m.text;
  el.appendChild(p);
  chatDiv.appendChild(el);
  chatDiv.scrollTop = chatDiv.scrollHeight;
});

function renderPlayers(room){
  playersDiv.innerHTML = "";
  room.players.forEach((p, idx)=>{
    const d = document.createElement("div");
    d.style.display = "flex";
    d.style.alignItems = "center";
    d.style.marginBottom = "6px";
    d.innerHTML = '<img class="avatar" src="'+(p.avatarDataUrl||'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=36 height=36><rect width=36 height=36 fill=%23ccc /></svg>')+'"/>'
                + '<div><strong>'+p.name+'</strong>' + (p.isBot? ' <em>(bot)</em>':'') + '</div>';
    playersDiv.appendChild(d);
  });
  // update turn index display immediately
  turnIndexSpan.textContent = room.turnIndex ?? "-";
}
