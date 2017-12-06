var bearcat = require('bearcat');
var pomelo = require('pomelo');

/**
 * Init app for client.
 */
var app = pomelo.createApp();

var Configure = function() {
  app.set('name', 'treasures');
// 配置服务器
  app.configure('production|development', 'gate', function() {
    app.set('connectorConfig', {
      connector: pomelo.connectors.hybridconnector
    });
  });

  app.configure('production|development', 'connector', function() {
    app.set('connectorConfig', {
      connector: pomelo.connectors.hybridconnector,
      heartbeat: 100,
      useDict: true,
      useProtobuf: true
    });
  });
// 配置area服务器
  app.configure('production|development', 'area', function() {
    var areaId = app.get('curServer').areaId;
    if (!areaId || areaId < 0) {
      throw new Error('load area config failed');
    }

    var areaService = bearcat.getBean('areaService');
    var dataApiUtil = bearcat.getBean('dataApiUtil');
    areaService.init(dataApiUtil.area().findById(areaId));
  });
}

var contextPath = require.resolve('./context.json');
// bearcat的依赖关系 牛逼啊 牛逼
// 扫描路径
bearcat.createApp([contextPath]);
// bearcat 把所有的配置包了起来
bearcat.start(function() {
  Configure();
  app.set('bearcat', bearcat);
  // start app
  app.start();
});

process.on('uncaughtException', function(err) {
  console.error(' Caught exception: ' + err.stack);
});