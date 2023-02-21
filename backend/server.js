const server = require("http").createServer();
const io = require("socket.io")(server, {
  allowEIO3: true,
  cors: {
    origin: process.env.fronturl | "http://127.0.0.1:8080",
    //origin: "https://buenosairesrawfood.com.ar/snake/front",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const {
  createGameState,
  gameLoop,
  getUpdatedVelocity,
  initGame,
} = require("./game");
const { FRAME_RATE } = require("./constants");
const { makeid } = require("./utils");

const state = {};
const clientRooms = {};

io.on(`connection`, (client) => {
  client.on(`keyDown`, handleKeyDown);
  client.on(`newGame`, handleNewGame);
  client.on(`joinGame`, handleJoinGame);

  function handleNewGame() {
    let roomName = makeid(5);
    clientRooms[client.id] = roomName;
    client.emit("gameCode", roomName);

    state[roomName] = initGame();

    client.join(roomName);
    client.number = 1;
    client.emit("init", 1);
  }

  function handleJoinGame(gameCode) {
    // const room = io.sockets.adapter.rooms.get(gameCode);
    // console.log("room", room);
    // let allUsers;

    // if (room) {
    //   allUsers = room.sockets;
    // }
    // console.log("allUsers", allUsers);
    // let numClients = 0;
    // if (allUsers) {
    //   numClients = Object.keys(allUsers).length;
    // }
    // console.log("numClients", numClients);
    // if (numClients === 0) {
    //   client.emit("unknownGame");
    //   return;
    // } else if (numClients > 1) {
    //   client.emit("tooManyPlayers");
    //   return;
    // }

    clientRooms[client.id] = gameCode;
    client.join(gameCode);
    client.number = 2;
    client.emit("init", 2);
    startGameInterval(gameCode);
  }

  function handleKeyDown(keyCode) {
    const roomName = clientRooms[client.id];

    if (!roomName) {
      return;
    }

    try {
      keyCode = parseInt(keyCode);
    } catch (e) {
      console.error(e);
    }

    const vel = getUpdatedVelocity(keyCode);

    if (vel) {
      state[roomName].players[client.number - 1].vel = vel;
    }
  }
});

function startGameInterval(roomName) {
  const intervalId = setInterval(() => {
    const winner = gameLoop(state[roomName]);
    if (!winner) {
      emitGameState(roomName, state[roomName]);
    } else {
      emitGameOver(roomName, winner);
      state[roomName] = null;
      clearInterval(intervalId);
    }
  }, 1000 / FRAME_RATE);
}

function emitGameState(roomName, state) {
  io.sockets.in(roomName).emit("gameState", JSON.stringify(state));
}

function emitGameOver(roomName, winner) {
  io.sockets.in(roomName).emit("gameOver", JSON.stringify({ winner }));
}

io.listen(process.env.PORT | 3009);
