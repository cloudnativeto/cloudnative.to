// 控制地图控件的城市切换
function cloudNativeBaiduMap(mapData){

  var map = new BMap.Map("baidu-map-container");
  
  // 设置可滚动      
  map.enableScrollWheelZoom(true);

  var pointArray = new Array();

  // 当点击地图城市之后，切换城市介绍信息
  function switchToCity(e){
   var p = e.target;
   var scrollTo = document.getElementById(p.getTitle()).offsetTop - 111
   document.getElementById("city_list").scrollTop=scrollTo;
  }

  //将所有的城市打点在地图上
  for(var i=0;i<mapData.length;i++){
    var data = mapData[i];
    var point = new BMap.Point(data.longitude, data.latitude);
    var marker = new BMap.Marker(point);
    var label = new BMap.Label(data.title, {offset:new BMap.Size(-10,20)});
    marker.setLabel(label);
    console.log(data.code);
    marker.setTitle(data.code);
    marker.addEventListener("click",switchToCity);

    map.addOverlay(marker);

    pointArray[i] = point;
  }

  //设置所有点都在可现实范围内
  map.setViewport(pointArray);

}
