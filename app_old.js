/**
 * Created by sanggyeongjo on 2016. 9. 3..
 */

var app = require('express')();
var express = require('express');
var http = require('http').Server(app);
var io = require('socketio')(http);
var assert = require('assert');

var teamList = [];
var cellInfo = [];
var colorList = [];
var teamCount = 0;
var clients = [];
var userCount = 0;
var usedColor = [];
var stacks = [];
var scoreList = [];

function cellData(c, s, t){
    this.color = c;
    this.stack = s;
    this.team = t;
    this.isCompleted = false;
}

function clientClass(ID){
    this.id = ID;
    this.team = null;
    this.tname = null;
    this.nick = newNick();
    this.point = 0;
    this.ping = true;
}

function team(teamNum, teamName, teamColor, teamMembers){
    this.num = teamNum;
    this.name = teamName;
    this.color = teamColor;
    this.members = teamMembers;
    this.member = [];
    this.score = 0;
    usedColor.push(teamColor);
}

function checkTeamName(newName){
    for (var i=0; i<teamList.length; i++){
        if(teamList[i].name == newName){
            return false;
        }
    }
    return true;
}

function checkColor(newColor){
    if(usedColor.indexOf(newColor) == -1){
        return newColor;
    }
    else
        return -1;
}

function addPoint(){
    for (var i=0; i<clients.length; i++){
        if(clients[i].team!=null){
            clients[i].point = addpnt(clients[i].point);
            io.sockets.connected[clients[i].id].emit('return userPoint',clients[i].point);
        }
    }
}

function setPing(id){
    i = findClientIndex(id);
    clients[i].ping = false;
    setTimeout(function(){clients[i].ping = true;}, 20000);
}

function addpnt(point){
    if(point<20) {point++;}
    return point;
}

function calScore(teamNum, scorePoint){
    teamList[teamNum].score += scorePoint;
    io.emit("refresh teamScore");
}

function findTeamIndex(teamNum){
    for (var i=0; i<teamList.length; i++){
        if(teamList[i].num == teamNum){
            return i;
        }
    }
}

function findByName(teamName){
    for (var i=0; i<teamList.length; i++){
        if(teamList[i].name == teamName){
            return i;
        }
    }
}

function stackEffect(cellNum, refColor){

    var leftNum = cellNum-1;
    var rightNum = cellNum+1;
    var downNum = cellNum+40;
    var upNum = cellNum-40;

    var leftSide = (cellNum%40)==1;
    var upSide = (cellNum-40)<1;
    var rightSide = (cellNum%40)==0;
    var downSide = (cellNum+40)>1600;

    if(leftSide && upSide){
        leftNum = cellNum+39;
        upNum = cellNum+1560;
        //console.log('catch1');
    }
    else if(upSide && rightSide){
        upNum = cellNum+1560;
        rightNum = cellNum-39;
        //console.log('catch2');
    }
    else if(rightSide && downSide){
        rightNum = cellNum-39;
        downNum = cellNum-1560;
        //console.log('catch3');
    }

    else if(downSide && leftSide){
        downNum = cellNum-1560;
        leftNum = cellNum+39;
        //console.log('catch4');
    }

    else if(upSide){
        upNum = cellNum+1560;
        //console.log('catch5');
    }

    else if(rightSide){
        rightNum = cellNum-39;
        //console.log('catch6');
    }

    else if(downSide){
        downNum = cellNum-1560;
        //console.log('catch7');
    }

    else if(leftSide){
        leftNum = cellNum+39;
        //console.log('catch8');
    }

    if((cellInfo[rightNum].color==refColor) && (cellInfo[downNum].color==refColor) && (cellInfo[leftNum].color==refColor) && (cellInfo[upNum].color==refColor)){
        if(!cellInfo[cellNum].isCompleted){
            cellInfo[cellNum].stack++;
            cellInfo[cellNum].isCompleted = true;
            //console.log('break one : ' + cellInfo[cellNum].stack +'/' +cellInfo[cellNum].isCompleted);//debug

        }
    }
}
for (var i=1; i<1601; i++){
    cellInfo[i] = new cellData("#AAAAAA",0,null);
    colorList[i] = "#AAAAAA";
    stacks[i] = 0;
}
//var pointTimer = setInterval(addPoint, 10000);

function newNick(){
    return 'user#'+(Math.random() + 1).toString(36).substr(6);
}

function compare(a,b) {
    if (a.score < b.score)
        return 1;
    else if (a.score > b.score)
        return -1;
    else
        return 0;
}

function findTeambyID(paramUserId) {
    for (var i=0; i<clients.length; i++){
        if(clients[i].id == paramUserId){
            return clients[i].team;
        }
    }
}

function findClientIndex(paramUserId){
    for (var i=0; i<clients.length; i++){
        if(clients[i].id == paramUserId){
            return i;
        }
    }
}

function joinTeam(paramSocket,paramTeamName){
    var targetTeam = teamList[findByName(paramTeamName)];
    targetTeam.members++;
    targetTeam.member.push(paramSocket.id);
    clients[findClientIndex(paramSocket.id)].team = targetTeam.num;
    clients[findClientIndex(paramSocket.id)].tname = targetTeam.name;
    io.sockets.connected[paramSocket.id].emit('joined',targetTeam.name,targetTeam.color,targetTeam.num);
    io.sockets.connected[paramSocket.id].emit('team score',targetTeam.score);
    paramSocket.join(targetTeam.name);
    io.to(paramTeamName).emit('team memeber changed', targetTeam.members);
}

function sortScoreBoard(){
    teamList.sort(compare);
    for(var i=0;i<teamList.length; i++){
        scoreList[i] = (teamList[i].name+'('+teamList[i].score+')');
    }
    io.emit('change score', scoreList.splice(0,20));
}

teamList.push(new team(teamCount++, 'Red', '#cd2727', 0));
teamList.push(new team(teamCount++, 'blue', '#2c2cbf', 0));
teamList.push(new team(teamCount++, 'green', '#47c347', 0));

app.get('/', function(req, res){
    res.sendfile('index.html');
});

io.on('connection', function(socket){

    clients.push(new clientClass(socket.id));

    userCount++;
    console.log(userCount+clients[userCount-1].id);
    io.sockets.connected[socket.id].emit('new user', clients[userCount-1].nick);
    io.emit('online users',userCount);
    sortScoreBoard();

    socket.on('request init', function(){
        io.sockets.connected[socket.id].emit('load colors', colorList, stacks);
        io.sockets.connected[socket.id].emit('load teams', teamList);
    });


    socket.on('change cell', function(className){
        var clt = clients[findClientIndex(socket.id)];
        var newColor = teamList[findTeamIndex(clt.team)].color;
        var teamNum = teamList[findTeamIndex(clt.team)].num;
        var cellNum = className.substr(5)*1;
        var updown = []; //1 is stack pushed, 0 is no change, -1 is stack poped

        for(var i=0; i<5; i++){
            updown[i] = 0;
        }

        var leftNum = cellNum-1;
        var rightNum = cellNum+1;
        var downNum = cellNum+40;
        var upNum = cellNum-40;

        var leftSide = (cellNum%40)==1;
        var upSide = (cellNum-40)<1;
        var rightSide = (cellNum%40)==0;
        var downSide = (cellNum+40)>1600;

        if(leftSide && upSide){
            leftNum = cellNum+39;
            upNum = cellNum+1560;
            //console.log('catch1');
        }
        else if(upSide && rightSide){
            upNum = cellNum+1560;
            rightNum = cellNum-39;
            //console.log('catch2');
        }
        else if(rightSide && downSide){
            rightNum = cellNum-39;
            downNum = cellNum-1560;
            //console.log('catch3');
        }

        else if(downSide && leftSide){
            downNum = cellNum-1560;
            leftNum = cellNum+39;
            //console.log('catch4');
        }

        else if(upSide){
            upNum = cellNum+1560;
            //console.log('catch5');
        }

        else if(rightSide){
            rightNum = cellNum-39;
            //console.log('catch6');
        }

        else if(downSide){
            downNum = cellNum-1560;
            //console.log('catch7');
        }

        else if(leftSide){
            leftNum = cellNum+39;
            //console.log('catch8');
        }


        //console.log(cellNum);

        var teamOfCell = teamList[findTeamIndex(cellInfo[cellNum].team)];
        var teamOfLCell = teamList[findTeamIndex(cellInfo[leftNum].team)];
        var teamOfRCell = teamList[findTeamIndex(cellInfo[rightNum].team)];
        var teamOfUCell = teamList[findTeamIndex(cellInfo[upNum].team)];
        var teamOfDCell = teamList[findTeamIndex(cellInfo[downNum].team)];

        if(cellInfo[cellNum].stack > 0){
            /* When cell is already colored */
            if(cellInfo[cellNum].color == newColor){
                /* If requested color is match with target cell's color  */
                cellInfo[cellNum].stack++;
                updown[0] = 1;
                teamOfCell.score++;
                clt.point--;
            }
            else{
                /* If requested color isn't matched with target cell's color
                 * Subtract 1 from target cell's stack */
                if(clt.point<1){
                    return false;
                }
                if(cellInfo[cellNum].isCompleted){
                    if(clt.point<2){
                        return false;
                    }
                    cellInfo[cellNum].stack--;
                    updown[0] = -1;
                    teamOfCell.score--;
                    clt.point -= 2;
                }
                else{
                    cellInfo[cellNum].stack--;
                    updown[0] = -1;
                    teamOfCell.score--;
                    clt.point--;
                }

                if(cellInfo[cellNum].stack == 0){
                    /* When cell's stack becomes 0, init the cell's data */
                    cellInfo[cellNum].color="#AAAAAA";
                    cellInfo[cellNum].team=null;
                    cellInfo[cellNum].isCompleted=false;

                    /* This checks around cell and change the state */
                    if(cellInfo[leftNum].isCompleted){
                        cellInfo[leftNum].isCompleted=false;
                    }
                    if(cellInfo[rightNum].isCompleted){
                        cellInfo[rightNum].isCompleted=false;
                    }
                    if(cellInfo[upNum].isCompleted){
                        cellInfo[upNum].isCompleted=false;
                    }
                    if(cellInfo[downNum].isCompleted){
                        cellInfo[downNum].isCompleted=false;
                    }
                }

            }
        }

        else{
            cellInfo[cellNum].color = newColor;
            cellInfo[cellNum].stack = 1;
            cellInfo[cellNum].team = teamNum;
            updown[0] = 1;
            teamOfCell = teamList[findTeamIndex(cellInfo[cellNum].team)];
            teamOfCell.score++;

            stackEffect(cellNum, newColor);

            clt.point--;

            if(cellInfo[leftNum].color == newColor){
                var oldstack = stacks[leftNum];
                stackEffect(leftNum, newColor);
                stacks[leftNum] = cellInfo[leftNum].stack;
                if (oldstack<stacks[leftNum]){
                    updown[1] = 1;
                    teamOfLCell.score++;

                }
            }
            if(cellInfo[rightNum].color == newColor){
                var oldstack = stacks[rightNum];
                stackEffect(rightNum, newColor);
                stacks[rightNum] = cellInfo[rightNum].stack;
                if (oldstack<stacks[rightNum]){
                    updown[2] = 1;
                    teamOfRCell.score++;
                }
            }
            if(cellInfo[upNum].color == newColor){
                var oldstack = stacks[upNum];
                stackEffect(upNum, newColor);
                stacks[upNum] = cellInfo[upNum].stack;
                if (oldstack<stacks[upNum]){
                    updown[3] = 1;
                    teamOfUCell.score++;

                }
            }
            if(cellInfo[downNum].color == newColor){
                var oldstack = stacks[downNum];
                stackEffect(downNum, newColor);
                stacks[downNum] = cellInfo[downNum].stack;
                if (oldstack<stacks[downNum]){
                    updown[4] = 1;
                    teamOfDCell.score++;
                }
            }
        }

        colorList[cellNum] = cellInfo[cellNum].color;
        stacks[cellNum] = cellInfo[cellNum].stack;

        var new_className = [];

        new_className[0] = '.'+className.substr(0,4)+'.'+cellNum;
        new_className[1] = '.'+className.substr(0,4)+'.'+leftNum;
        new_className[2] = '.'+className.substr(0,4)+'.'+rightNum;
        new_className[3] = '.'+className.substr(0,4)+'.'+upNum;
        new_className[4] = '.'+className.substr(0,4)+'.'+downNum;

        var changedStack = [cellInfo[cellNum].stack, cellInfo[leftNum].stack, cellInfo[rightNum].stack, cellInfo[upNum].stack, cellInfo[downNum].stack];
        var cellColor = [colorList[cellNum], colorList[leftNum], colorList[rightNum], colorList[upNum], colorList[downNum]];

        sortScoreBoard();

        io.emit('change cell', cellColor, new_className, changedStack, updown);
        io.sockets.connected[socket.id].emit('return userPoint', clt.point);
        io.to(teamList[findTeamIndex(teamNum)].name).emit('team score', teamList[findTeamIndex(teamNum)].score);
    });

    socket.on('newColor check',function(newColor){
        io.sockets.connected[socket.id].emit('color check result',checkColor(newColor));

    });

    socket.on('gen team', function(paramTeamNumber, paramTeamColor){
        var isGen = false;
        var teamNum;
        if(checkTeamName(paramTeamNumber)){
            teamCount++;
            teamNum = teamCount;
            teamList.push(new team(teamNum, paramTeamNumber, paramTeamColor, 1));
            isGen = true;
            joinTeam(socket,paramTeamNumber);
        }
        console.log(paramTeamNumber + ' generated');
        io.sockets.connected[socket.id].emit('gen result',isGen);
    });


    socket.on('join team', function(teamName){
        joinTeam(socket,teamName);
        io.sockets.connected[socket.id].emit('global msg', 'Welcome to C0L0R SQ@RE. If you have bug report or opinion please send me an email : info@byeolbit.com  Have a good time!', 'System');
    });

    socket.on('send team msg', function(msg){
        if (msg==''){
            return false;
        }
        var targetClient = clients[findClientIndex(socket.id)];
        msg = targetClient.nick + ':' + msg;
        io.to(targetClient.tname).emit('team msg', msg, targetClient.nick);
    });

    socket.on('send global msg', function(msg){
        if (msg==''){
            return false;
        }
        var targetClient = clients[findClientIndex(socket.id)];
        msg = targetClient.nick + ':' + msg;
        io.emit('global msg', msg, targetClient.nick);

    });

    socket.on('request ping', function(paramEvent){
        var targetClient = clients[findClientIndex(socket.id)];
        var ping = targetClient.ping;
        if(targetClient.ping == true){
            setPing(targetClient.id);
            var x = paramEvent.pageX;
            var y = paramEvent.pageY;
            var coordinateMessageId = +x+'m'+y;
            var coordinateMessagePing = +x+'p'+y;
            var str = 'Support request on x:'+x+' / y:'+y;
            var fun = '<a href="#" onclick="scrollScreen(event,'+x+','+y+');return false;">'+str+'</a>';
            io.to(targetClient.tname).emit('ping msg', fun);
            io.to(targetClient.tname).emit('send ping',coordinateMessagePing, coordinateMessageId, x, y);
        }
    });

    socket.on('disconnect', function(){
        console.log(socket.id + 'user disconnected');
        if(clients[findClientIndex(socket.id)].team != null){
            var targetTeam = teamList[findTeamIndex(findTeambyID(socket.id))];
            targetTeam.member.splice(targetTeam.member.indexOf(socket.id),1);
            targetTeam.members--;
            io.to(targetTeam.name).emit('team memeber changed', targetTeam.members);
        }
        clients.splice(findClientIndex(socket.id),1);
        userCount--;
        io.emit('online users',userCount);
    });

});

http.listen(3001, function(){
    console.log('listening on *:3001');
});
