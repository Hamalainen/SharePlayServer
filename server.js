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
    // playlist: [],
    // currentVideo: null,
    // playerState: 8,
    // currentTime: 0
    // users: [
    //   {
    //     userName: '',
    //     socketId: '',
    //     master: true 
    //   }
    // ]
  }
]

io.on('connection', (socket) => {

  socket.on('joinroom', (res) => {
    console.log(JSON.stringify(res));
    var roomExist = false;
    socket.join(res.roomId)
    for (var room of rooms) {
      if (room.id === res.roomId) {
        roomExist = true;
        var user = {
          userName: res.userName,
          socketId: socket.id,
          master: false
        }
        room.users.push(user);
        io.in(res.roomId).emit('room', room);
        console.log(`socket ${socket.id} joined ${room.id}`);
        break;
      }
    }
    if (!roomExist) {
      var room = {
        id: res.roomId,
        playlist: [],
        currentVideo: null,
        playerState: 8,
        currentTime: 0,
        users: [
          {
            userName: res.userName,
            socketId: socket.id,
            master: true
          }
        ]
      };
      rooms.push(room);
      io.in(res.roomId).emit('room', room);
      console.log(`socket ${socket.id} created ${room.id}`);
    }

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
    for (var room of rooms) {
      if (room.id === res.roomId) {
        for (var user of room.users) {
          if (user.master) {
            room.currentVideo = res.currentVideo;
            room.currentTime = res.currentTime;
            room.playerState = res.currentState;
          }
        }
      }
    }
  });

  socket.on('addedUsername', (res) => {
    console.log('username: ' + res.userName);
    console.log('roomid: ' + res.roomId);
    for(var room of rooms){
      if(room.id == res.roomId){
        console.log('roomfound');
        if(room.users === undefined){
          continue;
        }
        for(var user of room.users){
          if(user.socketId == socket.id){
            console.log('userfound');
            user.userName = res.userName;
            io.in(res.roomId).emit('room', room);
            break;
          }
        }
        break;
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
    for (var room of rooms) {
      if (room.id === res.roomId) {
        for (var user of room.users) {
          if (user.socketId == socket.id) {
            if (res.event.data == 1) {
              // play - only mastersocket can play.
              if (user.master) {
                room.playerState = res.event.data;
                room.currentVideo = res.currentVideo;
                room.currentTime = res.currentTime;
                socket.to(res.roomId).emit('playerState', room);
              }
              else {
                io.in(res.roomId).emit('playerState', room);
              }
            }
            if (res.event.data == 2) {
              // // pause - only mastersocket can pause.
              if (user.master) {
                room.playerState = res.event.data;
                room.currentVideo = res.currentVideo;
                room.currentTime = res.currentTime;
                socket.to(res.roomId).emit('playerState', room);
              }
              else {
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
      }
    }
  });

  console.log(`Client ${socket.id} connected`);
  socket.on('disconnect', () => {
    var roomId = "";
    var userIndex = 0;

    for (var room of rooms) {
      if (room.users === undefined) {
        continue;
      }
      else {
        for (var user of room.users) {
          if (user.socketId == socket.id) {
            roomId = room.id;
            if (user.master) {
              if (room.users.length > 1) {
                // if room not empty set master to the socket at first place in room
                room.users[1].master = true;
              }
              else {
                rooms.splice(rooms.indexOf(room.id), 1);
              }
            }
            //removing user from usersarray in room
            room.users.splice(userIndex, 1);
            break;
          }
          userIndex++;
        }
      }



      io.in(roomId).emit('room', room);
      console.log(`Client ${socket.id} disconnected`);
    }
  });

  socket.on('getrooms', () => {
    socket.emit('rooms', JSON.stringify(rooms));
  });

  
});

setInterval(() => function () {

  io.emit('time', new Date().toTimeString());
}
  , 1000);
