var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var config = require('./config');

var depth = config.depth;
var symbols = config.symbols;
var firstSymbol = config.symbols[0];

app.use(express.static('www'));

io.on('connection', function(socket){
    console.log('new connection');

    socket.on('getConfig', function() {
      console.log('getConfig recv');
      socket.emit('config', {depth: depth, firstSymbol: firstSymbol});
    });

    socket.on('ready', function() {
        if (socket.assignment == undefined) {
            if (symbols.length) {
                socket.assignment = symbols.shift();
                console.log('assigned ' + socket.assignment);
                socket.emit('assignment', {symbol: socket.assignment});
            } else {
                socket.emit('fail', {message: "no symbols left"});
            }
        }
    });

    socket.on('disconnect', function(){
        if(socket.assignment != undefined) {
            console.log('unassign (' + socket.assignment + ')');
            symbols.push(socket.assignment);
        }
        console.log('*** disconnect');
    });

    socket.on('move', function(msg){
        console.log('player: ' + msg.mark + ', location: ' + msg.location);
        socket.broadcast.emit('move', msg);
    });
});

http.listen(3000, function(){
    console.log('starting server with depth ' + depth);
    console.log('listening on *:3000');
});
