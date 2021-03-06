var canvas = document.getElementById("canvas");
var context = canvas.getContext("2d");
var game;
var log = document.getElementById("log");
var autoplay = {on: false, delay: 1000};

var Board = function(depth, firstSymbol, symbol) {
    if(depth<2) {
        return;
    }

    this.depth = depth;
    this.symbol = symbol;
    this.connected = true;
    this.firstSymbol = firstSymbol;

    // multiplayer listeners
    var that = this;
    if(socket) {
        socket.on('move', function(msg) {
            that.playMove(msg.mark, msg.location);
        });

        socket.on('fail', function(msg) {
            alert('Error?');
            console.log(msg);
        });
    }

    this.gameStart();
};

Board.prototype = {
    reset: function() {
        this.nextMove = this.firstSymbol;
        this.gameEnd = false;
        this.locations = new Object();

        // reset canvas
        canvas.width = canvas.width;

        this.draw();
    },
    gameStart: function() {
        this.reset();
        logMessage("GAME", "Your assignment is " + this.symbol);
        if(autoplay.on) {
            this.autoplay();
        }
    },
    autoplay: function() {
        var that = this;
        window.setInterval(function() {
            var empties = new Array();
            for(var i=0;i<that.depth*that.depth;i++) {
                if(that.locations[i] === undefined)
                    empties.push(i);
            }
            that.playMove(that.symbol, empties[Math.floor(Math.random() * empties.length)]);
        }, autoplay.delay);
    },
    draw: function() {
        this.blockWidth = canvas.width / this.depth;
        this.blockHeight = canvas.height / this.depth;

        for(var x=0; x<this.depth-1; x++) {
            this.line(this.blockWidth*(x+1), 0, this.blockWidth*(x+1), canvas.height, "#000", 0.25, "butt");
        }
        for(var y=0; y<this.depth-1; y++) {
            this.line(0, this.blockHeight*(y+1), canvas.width, this.blockHeight*(y+1), "#000", 0.25, "butt");
        }
    },
    drawMove: function(mark, location) {
        location = parseInt(location);
        if(location < 0 || location > (this.depth*this.depth-1)) {
            return;
        }

        var xOffset = this.blockWidth * (location % this.depth);
        var yOffset = this.blockHeight * parseInt(location / this.depth);
        if(mark == "O") {
            // to draw an O
            var xStart = this.blockWidth / 2 + xOffset;
            var yStart = this.blockHeight / 2 + yOffset;
            var radius = this.blockHeight / 3;

            context.lineWidth = 1;

            context.beginPath();
            context.arc(xStart, yStart, radius, 0, Math.PI * 2, false);
            context.closePath();

            context.strokeStyle = "#00f";
            context.stroke();
        } else if(mark == "X") {
            // to draw an X
            var xStart = this.blockWidth / 4 + xOffset;
            var yStart = this.blockHeight / 4 + yOffset;
            var xEnd = this.blockWidth * 0.75  + xOffset;
            var yEnd = this.blockHeight * 0.75 + yOffset;

            this.line(xStart, yStart, xEnd, yEnd, "#f00", 1, "butt");
            this.line(xStart, yEnd, xEnd, yStart, "#f00", 1, "butt");
        }

        this.checkWinConditions();
    },
    playMove: function(mark, location) {
        // if the game's not done, and the location's not taken
        // TODO: move to the server to enforce turn order
        if(!this.gameEnd && this.locations[location] === undefined) {
            this.locations[location] = this.nextMove;

            game.drawMove(mark, location);
            if(this.connected && mark == this.symbol) {
                socket.emit('move', {mark:this.nextMove, location:location});
            }

            this.nextMove = this.nextMove == "X" ? "O" : "X";
        }
    },
    calculateInput: function(x, y) {
        // if we're either not connected or it's our turn
        // TODO: move to the server to enforce turn order
        if(!this.connected || this.nextMove == this.symbol) {
            var location = parseInt(x / this.blockWidth) + this.depth * parseInt(y / this.blockHeight);
            this.playMove(this.nextMove, location);
        }
    },
    line: function(x1, y1, x2, y2, color, width, cap) {
        context.strokeStyle = color;
        context.lineWidth = width;
        context.lineCap = cap;

        context.beginPath();
        context.moveTo(x1, y1);
        context.lineTo(x2, y2);
        context.closePath();

        context.stroke();
    },
    markWin: function(from, to) {
        var xFrom = this.blockWidth * (from % this.depth) + this.blockWidth / 2;
        var yFrom = this.blockHeight * parseInt(from / this.depth) + this.blockHeight / 2;
        var xTo = this.blockWidth * (to % this.depth) + this.blockWidth / 2;
        var yTo = this.blockHeight * parseInt(to / this.depth) + this.blockHeight / 2;

        this.line(xFrom, yFrom, xTo, yTo, "#000", 10, "round");

        this.gameEnd = true;

        var that = this;
        window.setTimeout(function() {
            game.reset();
        }, 5000);
    },
    checkWinConditions: function() {
        var xWin = new Array(this.depth+1).join("X");
        var oWin = new Array(this.depth+1).join("O");

        // horizontal/vertical cases
        // pass through columns, inverting the index to cover rows
        for(var c=0; c < this.depth; c++) {
            var column = "";
            var row = "";

            for(var r=0; r < this.depth; r++) {
                column += this.locations[c + r*this.depth];
                row += this.locations[r + c*this.depth];
            }

            if(column == xWin) {
                this.markWin(c,c+this.depth*(this.depth-1));
                logMessage("GAME", "X wins");
            } else if(column == oWin) {
                this.markWin(c,c+this.depth*(this.depth-1));
                logMessage("GAME", "O wins");
            } else if(row == xWin) {
                this.markWin(c*this.depth, c*this.depth+this.depth-1);
                logMessage("GAME", "X wins");
            } else if(row == oWin) {
                this.markWin(c*this.depth, c*this.depth+this.depth-1);
                logMessage("GAME", "O wins");
            }
        }
    }
};

function init() {
    if(socket) {
        socket.on('config', function(msg) {
            game = new Board(msg.depth, msg.firstSymbol, msg.symbol);
        });
        socket.emit('ready');
    }

    // translate canvas clicks to x/y coords
    canvas.addEventListener("click", function(e) {
        if (event.offsetX !== undefined && event.offsetY !== undefined) {
            game.calculateInput(event.offsetX, event.offsetY);
        } else {
            game.calculateInput(event.layerX, event.layerY);
        }
    });
}

init();

function logMessage(source, message) {
    var li = document.createElement("li");
    var span = document.createElement("span");

    span.className = "source";
    span.appendChild(document.createTextNode(source));

    li.appendChild(span);
    li.innerHTML += message;

    log.appendChild(li);
    log.scrollTop = log.scrollHeight; // better ways to do this
}
