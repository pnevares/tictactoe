var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var assignments = ["X", "O"];

app.use(express.static('www'));

io.on('connection', function(socket){
    console.log('connect');

    socket.on('ready', function() {
        if(socket.assignment == undefined && assignments.length) {
            socket.assignment = assignments.shift(0,1);
            console.log('assignment (' + socket.assignment + ')');
            socket.emit('assignment', {symbol:socket.assignment});
        } else if(socket.assignment == undefined) {
            socket.emit('fail', {message: "no assignments left"});
        }
    });

    socket.on('disconnect', function(){
        if(socket.assignment != undefined) {
            console.log('unassign (' + socket.assignment + ')');
            assignments.push(socket.assignment);
        }
        console.log('*** disconnect');
    });

    socket.on('move', function(msg){
        console.log('player: ' + msg.mark + ', location: ' + msg.location);
        socket.broadcast.emit('move', msg);
    });
});

http.listen(3000, function(){
    console.log('listening on *:3000');
});