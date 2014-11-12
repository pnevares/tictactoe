var canvas = document.getElementById("canvas");
var context = canvas.getContext("2d");

var Board = function(depth) {
    if(depth<2) {
        return;
    }

    this.depth = depth;
    this.nextMove = "X";
    this.gameEnd = false;
    this.locations = new Array(depth);
    this.connected = false;

    // multiplayer listeners
    var that = this;
    if(socket) {
        socket.on('move', function(msg) {
            that.playMove(msg.mark, msg.location);
        });

        socket.on('assignment', function(msg) {
            that.connect(msg.symbol);
        });

        socket.on('fail', function(msg) {
            alert('Error?');
            console.log(msg);
        });

        socket.emit('ready');
    }
};

Board.prototype = {
    reset: function() {
        this.nextMove = "X";
        this.gameEnd = false;
        this.locations = new Array(this.depth);

        // reset canvas
        canvas.width = canvas.width;

        this.draw();
    },
    connect: function(symbol) {
        if(symbol == "X" || symbol == "O") {
            this.connected = true;
            this.symbol = symbol;
        }
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
        if(this.locations[location] === undefined) {
            this.locations[location] = this.nextMove;

            game.drawMove(mark, location);
            if(this.connected && mark == this.symbol) {
                socket.emit('move', {mark:this.nextMove, location:location});
            }

            this.nextMove = this.nextMove == "X" ? "O" : "X";
        }
    },
    calculateInput: function(x, y) {
        // if the game's not done, and we're either not connected or it's our turn
        if(!this.gameEnd && (!this.connected || this.nextMove == this.symbol)) {
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
                console.log("X wins");
            } else if(column == oWin) {
                this.markWin(c,c+this.depth*(this.depth-1));
                console.log("O wins");
            } else if(row == xWin) {
                this.markWin(c*this.depth, c*this.depth+this.depth-1);
                console.log("X wins");
            } else if(row == oWin) {
                this.markWin(c*this.depth, c*this.depth+this.depth-1);
                console.log("O wins");
            }
        }
    }
};

var game = new Board(3);

game.draw();

// translate canvas clicks to x/y coords
canvas.addEventListener("click", function(e) {
    if (event.offsetX !== undefined && event.offsetY !== undefined) {
        game.calculateInput(event.offsetX, event.offsetY);
    } else {
        game.calculateInput(event.layerX, event.layerY);
    }
});

function grid() {
    context.beginPath();
    for(var x=0; x<=canvas.width; x+=20) {
        context.moveTo(x, 0);
        context.lineTo(x, canvas.height);
    }

    for(var y=0; y<=canvas.height; y+=20) {
        context.moveTo(0, y);
        context.lineTo(canvas.width, y);
    }

    context.strokeStyle = "#ccc";
    context.stroke();
}

// grid();