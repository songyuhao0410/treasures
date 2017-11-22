var logger = require('pomelo-logger').getLogger('bearcat-treasures', 'PlayerHandler');
var bearcat = require('bearcat');
var fs = require('fs');

var PlayerHandler = function(app) {
  this.app = app;
  this.consts = null;
  this.areaService = null;
};

/**
 * Player enter scene, and response the related information such as
 * playerInfo, areaInfo and mapData to client.
 * 
 * @param {Object} msg
 * @param {Object} session
 * @param {Function} next
 * @api public
 */
// 玩家进入场地返回一个相关信息
PlayerHandler.prototype.enterScene = function(msg, session, next) {
  // 获得一个角色
  var role = this.dataApiUtil.role().random();
  // bearcat 是网易图片管理工具
  // 获得一个图片代表玩家
  var player = bearcat.getBean('player', {
    id: msg.playerId,
    name: msg.name,
    kindId: role.id
  });
//前端ID 
  player.serverId = session.frontendId;

  if (!this.areaService.addEntity(player)) {
    logger.error("Add player to area faild! areaId : " + player.areaId);
    next(new Error('fail to add user into area'), {
      route: msg.route,
      code: this.consts.MESSAGE.ERR
    });
    return;
  }

  var r = {
    code: this.consts.MESSAGE.RES,
    data: {
      area: this.areaService.getAreaInfo(),
      playerId: player.id
    }
  };

  next(null, r);
};

/**
 * Get player's animation data.
 *
 * @param {Object} msg
 * @param {Object} session
 * @param {Function} next
 * @api public
 */
var animationData = null;
PlayerHandler.prototype.getAnimation = function(msg, session, next) {
  var path = '../../../../config/animation_json/';
  if (!animationData) {
    var dir = './config/animation_json';
    var name, reg = /\.json$/;
    animationData = {};
    fs.readdirSync(dir).forEach(function(file) {
      if (reg.test(file)) {
        name = file.replace(reg, '');
        animationData[name] = require(path + file);
      }
    });
  }
  next(null, {
    code: this.consts.MESSAGE.RES,
    data: animationData
  });
};

/**
 * Player moves. Player requests move with the given movePath.
 * Handle the request from client, and response result to client
 *
 * @param {Object} msg
 * @param {Object} session
 * @param {Function} next
 * @api public
 */
//移动
PlayerHandler.prototype.move = function(msg, session, next) {
  //  移动的目标还是?
  var endPos = msg.targetPos;
  //  获得玩家ID
  var playerId = session.get('playerId');
  //获得玩家在区域服务中的信息
  var player = this.areaService.getPlayer(playerId);
  //不存在就报错
  if (!player) {
    logger.error('Move without a valid player ! playerId : %j', playerId);
    next(new Error('invalid player:' + playerId), {
      code: this.consts.MESSAGE.ERR
    });
    return;
  }
  //获得target信息
  var target = this.areaService.getEntity(msg.target);
  //如果target 的 entity id
  player.target = target ? target.entityId : null;
  // 要移动到的为之如果超出 areaservice的大小直接报错
  if (endPos.x > this.areaService.getWidth() || endPos.y > this.areaService.getHeight()) {
    logger.warn('The path is illigle!! The path is: %j', msg.path);
    next(new Error('fail to move for illegal path'), {
      code: this.consts.MESSAGE.ERR
    });

    return;
  }
  //
  var action = bearcat.getBean('move', {
    entity: player,
    endPos: endPos,
  });

  if (this.areaService.addAction(action)) {
    next(null, {
      code: this.consts.MESSAGE.RES,
      sPos: player.getPos()
    });

    this.areaService.getChannel().pushMessage({
      route: 'onMove',
      entityId: player.entityId,
      endPos: endPos
    });
  }
};

module.exports = function(app) {
  return bearcat.getBean({
    id: "playerHandler",
    func: PlayerHandler,
    args: [{
      name: "app",
      value: app
    }],
    props: [{
      name: "areaService",
      ref: "areaService"
    }, {
      name: "dataApiUtil",
      ref: "dataApiUtil"
    }, {
      name: "consts",
      ref: "consts"
    }]
  });
};