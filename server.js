'use strict';

const express = require("express");
const socketIO = require('socket.io');
const path = require('path');

const PORT = process.env.PORT || 3000;
// const PORT = 3000;
const INDEX = path.join(__dirname, 'index.html');

const server = express()
  .use((req, res) => res.sendFile(INDEX))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

const io = socketIO(server);

let rooms = [
  {
    // id: '',
    // roomName: 'room1',
    // master: null,
    // playlist: [],
    // currentVideo: null,
    // playerState: 8,
    // currentTime: 0
  }
]

io.on('connection', (socket) => {

  socket.on('joinroom', (roomId) => {
    var roomExist = false;
    socket.join(roomId)
    for (var room of rooms) {
      if (room.id === roomId) {
        roomExist = true;
        io.in(roomId).emit('room', room);
        console.log(`socket ${socket.id} joined ${room.id}`);
        break;
      }
    }
    if (!roomExist) {
      var room = {
        id: roomId,
        master: socket.id,
        playlist: [],
        currentVideo: null,
        playerState: 8,
        currentTime: 0
      };
      rooms.push(room);
      io.in(roomId).emit('room', room);
      console.log(`socket ${socket.id} created ${room.id}`);
    }

    // console.log(socket.rooms);

    // console.log(Object.keys(io.sockets.sockets));
  });

  socket.on('requestRoom', (roomId) => {
    io.in(roomId).emit('room', room);
  })

  socket.on('removedFromPlaylist', (res) => {
    for (var room of rooms) {
      if (room.id === res.roomId) {
        room.playlist.splice(room.playlist.indexOf(res.video.id), 1);
        console.log('removed: ' + res.video.id + 'from roomid: ' + room.id);
        break;
      }
    }
    socket.to(res.roomId).emit('removed', res.video);
  });

  socket.on('realTime', (res) => {
    for(var room of rooms){
      if(room.id === res.roomId){
        if(room.master === socket.id){
          room.currentVideo = res.currentVideo;
          room.currentTime = res.currentTime;
        }
      }
    }
  });

  socket.on('addedToPlaylist', (res) => {
    for (var room of rooms) {
      if (room.id === res.roomId) {
        if (!room.playlist.includes(res.video.id)) {
          console.log('added: ' + res.video.id);
          room.playlist.push(res.video.id);
          break;
        }
      }
    }
    socket.to(res.roomId).emit('added', res.video);
  });

  socket.on('play', (res) => {
    for (var room of rooms) {
      if (room.id === res.roomId) {
        room.currentVideo = res.video;
        break;
      }
    }

    socket.to(res.roomId).emit('playing', res.video);
  });

  socket.on('playerEvent', (res) => {
    console.log('playerevent: ' + res.event.data);
    for (var room of rooms) {
      if (room.id === res.roomId) {
        console.log('room.id: ' + room.id);
        if (res.event.data == 1) {
          // play - only mastersocket can play.
          if (room.master == socket.id) {
            console.log('master play');
            room.playerState = res.event.data;
            room.currentVideo = res.currentVideo;
            room.currentTime = res.currentTime;
            socket.to(res.roomId).emit('playerState', room);
          }
          else {
            console.log('peasant play');
            io.in(res.roomId).emit('playerState', room);
          }
        }
        if (res.event.data == 2) {
          // // pause - only mastersocket can pause.
          if (room.master == socket.id) {
            console.log('master pause');
            room.playerState = res.event.data;
            room.currentVideo = res.currentVideo;
            room.currentTime = res.currentTime;
            socket.to(res.roomId).emit('playerState', room);
          }
          else {
            console.log('peasant pause');
            io.in(res.roomId).emit('playerState', room);
          }
        }
        if (res.event.data == 3) {
          // someone is buffering - pause all others
          room.playerState = res.event.data;
          room.currentVideo = res.currentVideo;
          room.currentTime = res.currentTime;
          socket.to(res.roomId).emit('playerState', room);
        }
      }
    }
  });

  console.log(`Client ${socket.id} connected`);
  socket.on('disconnect', () => {

    for(var room of rooms){
      if(room.master === socket.id){
        io.of('/').in(room.id).clients(function (error, clients) {
          if (error) throw error;
          let userlist = clients;
          if(userlist.length != 0){
            room.master = userlist[0];
          }
          else{
            rooms.splice(rooms.indexOf(room.id), 1);
          }
        });
      }
    }
    console.log(`Client ${socket.id} disconnected`);
  });

  socket.on('getrooms',() => {
    socket.emit('rooms', JSON.stringify(rooms));
  });
});

setInterval(() => 
io.emit('time', new Date().toTimeString())
, 1000);
