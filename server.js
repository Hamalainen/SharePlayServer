'use strict';

const express = require("express");
const socketIO = require('socket.io');
const path = require('path');

const PORT = process.env.PORT || 3000;
const INDEX = path.join(__dirname, 'index.html');

const server = express()
  .use((req, res) => res.sendFile(INDEX) )
  .listen(PORT, () => console.log(`Listening on ${ PORT }`));

const io = socketIO(server);

const playlists ={};

io.on('connection', (socket) => {
  let previousId;
  const safeJoin = currentId => {
      socket.leave(previousId);
      socket.join(currentId, () => console.log(`Socket ${socket.id} joined room ${currentId}`));
      previousId = currentId;
  }

  console.log(`Client ${socket.id} connected`);
  socket.on('disconnect', () => console.log(`Client ${socket.id} disconnected`));

  let playlist = ['Y128KEvu6FI' , 'YgwOBoE5X1s'];

  socket.on('getPlayList', () => {
    console.log(`client ${socket.id} requested playlist:  ${playlist}`)
    socket.emit('playlist', {
      playlist: playlist});
});




});

setInterval(() => io.emit('time', new Date().toTimeString()), 1000);
