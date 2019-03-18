'use strict';

const express = require("express");
const socketIO = require('socket.io');
const path = require('path');

const PORT = process.env.PORT || 3000;
const INDEX = path.join(__dirname, 'index.html');

const server = express()
  .use((req, res) => res.sendFile(INDEX))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

const io = socketIO(server);

let room = {
  master: null,
  playlist: [],
  currentVideo: null,
  playerState: 8
};

io.on('connection', (socket) => {
  room.master = socket.id;
  let previousId;
  const safeJoin = currentId => {
    socket.leave(previousId);
    socket.join(currentId, () => console.log(`Socket ${socket.id} joined room ${currentId}`));
    previousId = currentId;
  }

  socket.on('removedFromPlaylist', (video) => {
    room.playlist.splice(room.playlist.indexOf(video.id), 1);
    console.log('removed: ' + video.id);
    socket.broadcast.emit('removed', video);

  });

  socket.on('addedToPlaylist', (video) => {
    if (!room.playlist.includes(video.id)) {
      console.log('added: ' + video.id);
      room.playlist.push(video.id);

      socket.broadcast.emit('added', video);
    }
  });

  socket.on('play', (video) => {
    room.currentVideo = video;
    socket.broadcast.emit('playing', video);
  });

  socket.on('playerEvent', (event) => {
    setTimeout(function(){
      room.playerState = event;
      socket.broadcast.emit('playerState', event);
    }, 2000);
    });
  


  socket.emit('room', room);

  console.log(`Client ${socket.id} connected`);
  socket.on('disconnect', () => console.log(`Client ${socket.id} disconnected`));
});

setInterval(() => io.emit('time', new Date().toTimeString()), 1000);
