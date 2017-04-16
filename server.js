var express = require('express');
var app = express();
var serv = require('http').Server(app);


var SOCKET_LIST = {};
var PLAYER_LIST = {};
var MISSILE_LIST = {};
var io = require('socket.io') (serv,{});

app.get('/', function(req, res){
	res.sendFile(__dirname+'/client/index.html');
});

app.get('/battleships/battleship1.png', function(req, res){
	res.sendFile(__dirname+'/client/battleships/battleship1.png');
});

app.get('/explosions/1.png', function(req, res){
	res.sendFile(__dirname+'/client/explosions/1.png');
});


app.get('/explosions/2.png', function(req, res){
	res.sendFile(__dirname+'/client/explosions/2.png');
});

app.get('/explosions/3.png', function(req, res){
	res.sendFile(__dirname+'/client/explosions/3.png');
});

app.get('/explosions/4.png', function(req, res){
	res.sendFile(__dirname+'/client/explosions/4.png');
});

app.get('/explosions/5.png', function(req, res){
	res.sendFile(__dirname+'/client/explosions/5.png');
});

app.get('/explosions/6.png', function(req, res){
	res.sendFile(__dirname+'/client/explosions/6.png');
});

app.get('/explosions/7.png', function(req, res){
	res.sendFile(__dirname+'/client/explosions/7.png');
});

app.get('/explosions/8.png', function(req, res){
	res.sendFile(__dirname+'/client/explosions/8.png');
});

app.get('/explosions/9.png', function(req, res){
	res.sendFile(__dirname+'/client/explosions/9.png');
});

app.get('/explosions/10.png', function(req, res){
	res.sendFile(__dirname+'/client/explosions/10.png');
});

app.get('/missiles/missile1.png', function(req,res){
	res.sendFile(__dirname+'/client/missiles/missile1.png');
});

app.get('/smoke/1.png', function(req,res){
	res.sendFile(__dirname+'/client/smoke/1.png');
});

app.get('/smoke/2.png', function(req,res){
	res.sendFile(__dirname+'/client/smoke/2.png');
});

app.get('/smoke/3.png', function(req,res){
	res.sendFile(__dirname+'/client/smoke/3.png');
});

app.get('/smoke/4.png', function(req,res){
	res.sendFile(__dirname+'/client/smoke/4.png');
});



app.use('/client', express.static(__dirname + '/client'));


serv.listen(2000);
console.log("Server started.");


//=====constants======
var speed = 6;
var turnSpeed = 5;
var missileSpeed = 14;
var MISSILE_DRIFT = 50;
var MISSILE_TIME_TO_LIVE = 900
var gameWidth = 1920; //X
var gameHeight = 1080;//Y
var DIST_KILL = 30; //sqrt2 x 100
var DIST_KILL_BORDER = 30;
var SAFETY_DISTANCE = 200;

var SCORE_SURVIVE_MISSILE = 100
var SCORE_MISSILE_SUCCESSFUL_HIT = 300
//====================


var Player = function(position, id, angle, nickname){
	var self = {
		x:position.x,
		y:position.y,
		id:id,
		turnAngle: 0,
		angle: angle,
		nickname: nickname,
		score: 0,
		missiles: 3
	}
	return self;
}
Player.update = function(){
	for(var i in PLAYER_LIST){
		if(PLAYER_LIST[i] == undefined) continue;
		PLAYER_LIST[i].angle+=PLAYER_LIST[i].turnAngle
		if(PLAYER_LIST[i].angle>=360){
			PLAYER_LIST[i].angle -= 360
		}else if(PLAYER_LIST[i].angle <= -360){
			PLAYER_LIST[i].angle += 360
		}
		PLAYER_LIST[i].x += -Math.cos(PLAYER_LIST[i].angle/360*Math.PI*2)*speed;
		PLAYER_LIST[i].y += -Math.sin(PLAYER_LIST[i].angle/360*Math.PI*2)*speed;
		if(PLAYER_LIST[i].x-DIST_KILL_BORDER<0 || PLAYER_LIST[i].x+DIST_KILL_BORDER>gameWidth || PLAYER_LIST[i].y-DIST_KILL_BORDER<0 || PLAYER_LIST[i].y+DIST_KILL_BORDER>gameHeight){
			var tempId = PLAYER_LIST[i].id
			Player.kill(PLAYER_LIST[i].id)
			for(var j in MISSILE_LIST){ //makes new missiles in place of the old ones and set them to a new target
				if(MISSILE_LIST[j].target == tempId){
					var uniqueId = generateMissileID();
					MISSILE_LIST[uniqueId] = Missile({x: MISSILE_LIST[j].x, y: MISSILE_LIST[j].y},uniqueId, MISSILE_LIST[j].angle, '')
					Missile.kill(MISSILE_LIST[j].id)
				}
			}
		}
	}
}
Player.kill = function(id){
// 	console.log("player "+id+" dead") 
	for(var i in SOCKET_LIST){
		SOCKET_LIST[i].emit('dead', {
			id: id, 
			x:PLAYER_LIST[id].x,
			y:PLAYER_LIST[id].y
			});
	}
	delete PLAYER_LIST[id]

}

var Missile = function(position, id, angle, owner){
	var self = {
		x: position.x,
		y: position.y,
		vX:-Math.cos((angle)/360*Math.PI*2)*missileSpeed,
		vY:-Math.sin((angle)/360*Math.PI*2)*missileSpeed,
		id: id,
		turnAngle: 0,
		angle: angle,
		previousAngle: angle,
		target: '',
		distFromTarget: 999999,
		timeToLive: MISSILE_TIME_TO_LIVE,
		owner: owner
	}
	var closestDistance = 999999
	var targetId = ''
	for(var i in PLAYER_LIST){
		if(PLAYER_LIST[i].id == owner) continue;
		euclideanDistance = Math.round(Math.sqrt(Math.pow(PLAYER_LIST[i].x-self.x,2)+Math.pow(PLAYER_LIST[i].y-self.y,2)))
		if(euclideanDistance<closestDistance){
			closestDistance = euclideanDistance
			targetId = PLAYER_LIST[i].id
		}
	}
	self.distFromTarget = closestDistance
	self.target = targetId
	return self;
}
Missile.kill = function(id){
	delete MISSILE_LIST[id]
}
Missile.update = function(){
	for(var i in MISSILE_LIST){
		if(PLAYER_LIST[MISSILE_LIST[i].target] == undefined) continue;
		MISSILE_LIST[i].timeToLive--;
		if(MISSILE_LIST[i].timeToLive < 0){
			PLAYER_LIST[MISSILE_LIST[i].target].score += SCORE_SURVIVE_MISSILE
			Missile.kill(MISSILE_LIST[i].id)
			continue;
		}
		MISSILE_LIST[i].distFromTarget = Math.sqrt(Math.pow(PLAYER_LIST[MISSILE_LIST[i].target].x-MISSILE_LIST[i].x,2)+Math.pow(PLAYER_LIST[MISSILE_LIST[i].target].y-MISSILE_LIST[i].y,2))
		
		if(MISSILE_LIST[i].distFromTarget < DIST_KILL){
			Player.kill(MISSILE_LIST[i].target)
			
			for(var j in MISSILE_LIST){ //makes new missiles in place of the old ones and set them to a new target
				if(j == i) continue;
				if(MISSILE_LIST[j].target == MISSILE_LIST[i].target){
					var uniqueId = generateMissileID();
					MISSILE_LIST[uniqueId] = Missile({x: MISSILE_LIST[j].x, y: MISSILE_LIST[j].y},uniqueId, MISSILE_LIST[j].angle,'')
					Missile.kill(MISSILE_LIST[j].id)
				}
			}
			if(!(PLAYER_LIST[MISSILE_LIST[i].owner] == undefined)){
				PLAYER_LIST[MISSILE_LIST[i].owner].score += SCORE_MISSILE_SUCCESSFUL_HIT
			}
			Missile.kill(MISSILE_LIST[i].id) //kill the missile that hit target
			continue;
		}
		MISSILE_LIST[i].previousAngle = MISSILE_LIST[i].angle
		if(MISSILE_LIST[i].x>PLAYER_LIST[MISSILE_LIST[i].target].x){
			MISSILE_LIST[i].angle = 360*Math.asin((MISSILE_LIST[i].y-PLAYER_LIST[MISSILE_LIST[i].target].y)/MISSILE_LIST[i].distFromTarget)/(2*Math.PI)
		}else{
			MISSILE_LIST[i].angle = 180-360*Math.asin((MISSILE_LIST[i].y-PLAYER_LIST[MISSILE_LIST[i].target].y)/MISSILE_LIST[i].distFromTarget)/(2*Math.PI)
		}
// 		MISSILE_LIST[i].angle += Math.random()*10 //simulates unstableness
		if(MISSILE_LIST[i].angle>=360){
			MISSILE_LIST[i].angle -= 360
		}else if(MISSILE_LIST[i].angle <= 0){
			MISSILE_LIST[i].angle += 360
		}

		MISSILE_LIST[i].vX = (MISSILE_DRIFT*MISSILE_LIST[i].vX + (-Math.cos((MISSILE_LIST[i].angle)/360*Math.PI*2)*missileSpeed))/(MISSILE_DRIFT+1);
		MISSILE_LIST[i].vY = (MISSILE_DRIFT*MISSILE_LIST[i].vY + (-Math.sin((MISSILE_LIST[i].angle)/360*Math.PI*2)*missileSpeed))/(MISSILE_DRIFT+1);
		
		MISSILE_LIST[i].x += MISSILE_LIST[i].vX;
		MISSILE_LIST[i].y += MISSILE_LIST[i].vY;
		
		if(MISSILE_LIST[i].x<0 || MISSILE_LIST[i].x>gameWidth || MISSILE_LIST[i].y<0  || MISSILE_LIST[i].y>gameHeight){
			Missile.kill(MISSILE_LIST[i].id)
		}
	}
}

function getRandomPosition(){
	return {x: Math.round(Math.random()*(gameWidth-500))+250, y: Math.round(Math.random()*(gameHeight-500))+250 };
}
function generateMissileID(){
	var d = new Date()
	return Math.floor(Math.random()*999999)+"_"+d.getMilliseconds()+"_"+d.getSeconds()+"_"+d.getDate()
}

io.sockets.on('connection', function(socket){

// 	console.log("New Client Connection");
	socket.emit('id', {id: socket.id});
	socket.emit('gameBorders', {width: gameWidth, height: gameHeight})
	
	SOCKET_LIST[socket.id] = socket;
	
	socket.on('disconnect', function(){
// 		console.log("Client disconnected");
		delete PLAYER_LIST[socket.id];
			
	
		for(var i in MISSILE_LIST){ //makes new missiles in place of the old ones and set them to a new target
			if(MISSILE_LIST[i].target == socket.id){
				var uniqueId = generateMissileID();
				MISSILE_LIST[uniqueId] = Missile({x: MISSILE_LIST[i].x, y: MISSILE_LIST[i].y},uniqueId, MISSILE_LIST[i].angle, '')
				Missile.kill(MISSILE_LIST[i].id)
			}
		}
		delete SOCKET_LIST[socket.id]; //delete socket
	});
	socket.on('fire', function(data){
		if(PLAYER_LIST[socket.id].missiles > 0){
			var uniqueId = generateMissileID();
			MISSILE_LIST[uniqueId] = Missile({x: PLAYER_LIST[socket.id].x, y: PLAYER_LIST[socket.id].y}, uniqueId, PLAYER_LIST[socket.id].angle, PLAYER_LIST[socket.id].id);
			PLAYER_LIST[socket.id].missiles--;
		}
	})
	socket.on('start', function(data){
// 		console.log("new player")
		PLAYER_LIST[socket.id] = Player(getRandomPosition(), socket.id, 90, data.nick)
		for(var i in MISSILE_LIST){
			if(PLAYER_LIST[MISSILE_LIST[i].target] == undefined){ //if theres a missile with no target
// 				console.log("reviving idle missile: id="+MISSILE_LIST[i].id+" with new target "+PLAYER_LIST[socket.id].id)
				MISSILE_LIST[i].target = PLAYER_LIST[socket.id].id
			}
		}
	});
	
	socket.on('turn', function(data){
		if(PLAYER_LIST[socket.id] == null) return;
		if(data.state == true){
			if(data.direction == 'left'){
				PLAYER_LIST[socket.id].turnAngle=-turnSpeed
			}
			else if(data.direction == 'right'){
				PLAYER_LIST[socket.id].turnAngle=turnSpeed
			}
		}else{
			PLAYER_LIST[socket.id].turnAngle = 0
		}
	});
});

setInterval(function(){
	Player.update()
	Missile.update()
	
	var pack = {
		players: {},
		missiles: {}
	}
	for(var i in PLAYER_LIST){
		pack.players[PLAYER_LIST[i].id] = {
			x: PLAYER_LIST[i].x,
			y: PLAYER_LIST[i].y,
			id: PLAYER_LIST[i].id, //player obj
			angle: PLAYER_LIST[i].angle,
			nickname: PLAYER_LIST[i].nickname,
			score: PLAYER_LIST[i].score,
			missiles: PLAYER_LIST[i].missiles
		}
	}
	for(var i in MISSILE_LIST){
		pack.missiles[MISSILE_LIST[i].id] = {
			x: MISSILE_LIST[i].x,
			y: MISSILE_LIST[i].y,
			id: MISSILE_LIST[i].id,
			angle: MISSILE_LIST[i].angle,
			target: MISSILE_LIST[i].target
		}
	}
	//send packet to everyone
	for(var i in SOCKET_LIST){
		var socket = SOCKET_LIST[i];
		socket.emit('newPositions', pack);
	}
},1000/60);

setInterval(function(){
	for(var i in PLAYER_LIST){
		if(PLAYER_LIST[i].missiles>=3) continue;
		PLAYER_LIST[i].missiles++;
	}
},10000);

setInterval(function(){
	while(Object.getOwnPropertyNames(PLAYER_LIST).length>0){
		var uniqueId = generateMissileID();
		MISSILE_LIST[uniqueId] = Missile(getRandomPosition(), uniqueId, 0, '')
		if(MISSILE_LIST[uniqueId].distFromTarget>SAFETY_DISTANCE){
			break;
		}else{
// 			console.log("remaking missile")
			delete MISSILE_LIST[uniqueId]
		}
	}
},10000);