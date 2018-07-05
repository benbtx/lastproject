import BaseWidget = require('core/BaseWidget.class');
import Functions = require('core/Functions.module');

import GraphicsLayer = require("esri/layers/GraphicsLayer");
import Point = require("esri/geometry/Point");
import Map = require("esri/map");
import Graphic = require("esri/graphic");
import SimpleMarkerSymbol = require("esri/symbols/SimpleMarkerSymbol");
import SimpleLineSymbol = require("esri/symbols/SimpleLineSymbol");
import Color = require("esri/Color");
import Polyline = require("esri/geometry/Polyline");
import ScreenPoint = require('esri/geometry/ScreenPoint');
import LengthsParameters = require("esri/tasks/LengthsParameters");
import GeometryService = require("esri/tasks/GeometryService");
import SpatialReference = require("esri/SpatialReference");
import TextSymbol = require("esri/symbols/TextSymbol");
import SimpleFillSymbol = require("esri/symbols/SimpleFillSymbol");
import Polygon = require("esri/geometry/Polygon");
import AreasAndLengthsParameters = require("esri/tasks/AreasAndLengthsParameters");
import Circle = require("esri/geometry/Circle");
import Font = require("esri/symbols/Font");


export = MeasureTool;

class MeasureTool extends BaseWidget {
    baseClass: string = "wideget-measure-tool";

    //绘制图形的图层
    measureLayer: GraphicsLayer;
    //绘制移动图形的图层
    moveLayer: GraphicsLayer;
    //
    textLayer: GraphicsLayer;
    // //主地图的mapView
    // mapView: MapView;
    //包含地图 的主div
    mainContainer;
    //表明测量什么（距离、面积、角度？）
    measureWhat: string;
    //点、线、多边形的样式
    symbol = null;
    //是否双击
    doubleClick: Boolean = false;
    //创建包含所有绘制点的数组 
    pointDraw: Point[] = [];
    //线总长度
    Lengths = 0;
    //移动时测量总长
    LengthsMove = 0;
    //mapView 的click事件
    mapViewClickEvent;
    //是否结束绘制
    endDraw: Boolean;
    //面积
    area = 0;
    //map
    map: Map;



    startup() {
        this.onPanelInit();
    }

    //清除创建的相关对象
    destroy() {
        /*** 回收 HTML 以及 全局变量 以及对 Map 的操作***/

        this.map.enableDoubleClickZoom();

        //清除DOM对象
        this.domObj.remove();
        this.afterDestroy();
        //移除图层上的图形
        this.map.removeLayer(this.measureLayer);
        this.map.removeLayer(this.moveLayer);
        this.map.removeLayer(this.textLayer);
        //移除事件绑定
        if (this.mapViewClickEvent) {
            this.mapViewClickEvent.remove();
        }
        this.mainContainer.off("mousemove");
        this.mainContainer.off("dblclick");

    }
    onPanelInit() {
        var data = {
            lengthPngPath: Functions.concatUrl(this.root, this.config.pngs.length),
            areaPngPath: Functions.concatUrl(this.root, this.config.pngs.area),
            anglePngPath: Functions.concatUrl(this.root, this.config.pngs.angle)
        }

        //设置面板内容
        this.setHtml(_.template(this.template)(data));
        //初始化一些环境（监听图片点击事件、添加画图图层等）
        this.measureToolInit();

    }

    //测量工具的初始化
    measureToolInit() {



        // //获取地图上一些元素备用（mapViw）
        this.map = this.AppX.runtimeConfig.map;
        // this.map.isDoubleClickZoom();
        // this.map.isDoubleClickZoom=false;
        this.map.disableDoubleClickZoom();


        //获取包含地图的div 
        this.mainContainer = $(this.AppX.appConfig.mainContainer);
        // //去除点击图形的弹框
        // this.mapView.popup.destroy();
        //初始化画图的图层
        this.addLayer();
        //初始化点、线、多边形的样式
        this.symbol = this.setSymbol();
        //对测量图标点击事件的监听
        this.domObj.find(".measureTool").on("click", function (event) {

            var currentTarget = $(event.currentTarget);

            //移除图层上的图形
            this.measureLayer.clear();
            this.moveLayer.clear();
            this.textLayer.clear();
            //移除事件绑定
            if (this.mapViewClickEvent) {
                this.mapViewClickEvent.remove();
            }
            this.mainContainer.off("mousemove");
            this.mainContainer.off("dblclick");

            this.domObj.find(".measureTool.active").removeClass("active");
            currentTarget.addClass("active");

            //根据img的alt属性确定为测距、测面、测角
            this.measureWhat = currentTarget.data("type");
            //根据测面、测距、测角进行测量操作 
            this.measureOperate();

        }.bind(this));
        $(document).keydown(function (event) {
            if (event.keyCode == 27) {
                this.domObj.find(".measureTool.active").trigger("click");
            }
        }.bind(this));


    }


    addLayer() {

        var measureLayer = new GraphicsLayer();
        measureLayer.id = "measureLayer";
        this.measureLayer = measureLayer;
        var moveLayer = new GraphicsLayer();
        moveLayer.id = "moveLayer";
        this.moveLayer = moveLayer;
        var textLayer = new GraphicsLayer();
        textLayer.id = "text";
        this.textLayer = textLayer;
        this.AppX.runtimeConfig.map.addLayer(measureLayer);
        this.AppX.runtimeConfig.map.addLayer(moveLayer);
        this.AppX.runtimeConfig.map.addLayer(textLayer);
    }

    //进行测量操作
    measureOperate() {
        if (this.measureWhat == "length") {
            //移除保存的绘制点
            this.pointDraw = [];
            this.measureLength();
        } else if (this.measureWhat == "area") {
            this.pointDraw = [];
            this.measureArea();
        } else {
            this.pointDraw = [];
            this.measureAngle();
        }
    }

    //距离测量操作
    measureLength() {
        //解决回调函数作用域变化问题
        var that = this;
        /*
        测量距离时候的鼠标点击事件
        */

        this.mapViewClickEvent = this.AppX.runtimeConfig.map.on("click", function (event) {

            //双击后doubleClick值为true，无法实现移动画线
            that.doubleClick = false;
            //判断是否为上次绘制完再次点击，使得恢复为初始状态
            if (that.endDraw == true) {
                that.pointDraw = [];
                that.measureLayer.clear();
                that.moveLayer.clear();
                that.textLayer.clear();
                that.endDraw = false;
                that.Lengths = 0;//清空保存的测量结果
            }

            //获取鼠标点击的点
            var point = new Point(
                {
                    longitude: event.mapPoint.x,
                    latitude: event.mapPoint.y

                }
            );
            //将绘制的点放入保存所有绘制点的数组中
            that.pointDraw.push(point);
            //添加点图形到图层
            that.addPointToGraphiclayer(point, that.measureLayer, that.symbol.SimpleMarkerSymbol);
            //如果为起点添加起点文字
            if (that.pointDraw.length == 1) {
                that.addMeasureReult();
            }
            //绘制相应的线
            that.drawLine(that.pointDraw, true);

        });

        /*
        测量距离时候的鼠标移动事件
        */
        this.mainContainer.bind("mousemove", function (event) {
            //双击时候取消移动画线并清除移动图层图形
            if (that.doubleClick == true) {
                that.moveLayer.clear();
                return;
            }
            //清除移动图层上的图形
            if (that.moveLayer) {
                that.moveLayer.clear();
            }

            //多边形的path属性
            var path = [];

            //
            if (that.pointDraw.length > 0) {

                var mainContainer = $('#mainContainer')[0];
                //path中添加已经绘制的最后一个点
                that.setPath(that.pointDraw[that.pointDraw.length - 1].x, that.pointDraw[that.pointDraw.length - 1].y, path);
                var moveScreenPoint = new Point(event.clientX - mainContainer.offsetLeft, event.clientY - mainContainer.offsetTop, that.AppX.runtimeConfig.map.spatialReference);
                //path中添加移动的点
                var movePoint = that.AppX.runtimeConfig.map.toMap(moveScreenPoint);
                that.setPath(movePoint.x, movePoint.y, path);
                //添加线图形到移动的图层
                var polyline = new Polyline({
                    "paths": [path],
                    "spatialReference": that.AppX.runtimeConfig.map.spatialReference
                });
                that.addlineToGraphiclayer(polyline, that.moveLayer, that.symbol.SimpleLineSymbol)
                //调用geometry服务，获取移动线段总长
                that.geometryServerCall(polyline, true);
                var allLength = (that.LengthsMove + that.Lengths).toFixed(0);
                var content = "总长度：" + allLength + "米";
                //添加结果到图层
                that.addTextGraphic(content, movePoint, true)
            }
        });

        this.mainContainer.bind("dblclick", function (event) {
            //清楚移动图层的所有图形
            that.moveLayer.clear();
            //设置为双击，设置为结束画图
            if (!that.doubleClick)//wangjiao add
                that.doubleClick = true;
            else return;
            that.endDraw = true;
            var mainContainer = $('#mainContainer')[0];
            var dbClickScreenPoint = new Point(event.clientX - mainContainer.offsetLeft, event.clientY - mainContainer.offsetTop, that.AppX.runtimeConfig.map.spatialReference);
            //获取双击点的地图坐标
            var dbclickPoint = that.AppX.runtimeConfig.map.toMap(dbClickScreenPoint);
            var point = new Point(
                {

                    longitude: dbclickPoint.x,
                    latitude: dbclickPoint.y

                }
            );
            that.pointDraw.push(point);
            that.addPointToGraphiclayer(point, that.measureLayer, that.symbol.SimpleMarkerSymbol);
            that.drawLine(that.pointDraw, true);

        });

    }


    /**
    * (添加点图形到图层)
    * @method (addPointToGraphiclayer)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (要添加的点、图层及样式)
    * @return {无}
    */
    addPointToGraphiclayer(point: Point, graphicsLayer: GraphicsLayer, pointSymbol: SimpleMarkerSymbol) {
        //新建点图形
        var pointGraphic = new Graphic(point, pointSymbol);

        //添加点图形到图层
        this.measureLayer.add(pointGraphic);

    }

    /**
    * (将点数组添加到path数组中)
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    setPath(x: number, y: number, path: number[][]) {
        var point = [];
        point.push(x);
        point.push(y);
        path.push(point);
    }

    /**
    * (添加线图形到图层)
    * @method (addPointToGraphiclayer)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (要添加的线图形的path、图层及样式)
    * @return {无}
    */
    addlineToGraphiclayer(polyline: Polyline, graphicsLayer: GraphicsLayer, pointSymbol: SimpleLineSymbol) {

        var lineGraphic = new Graphic(polyline, pointSymbol);
        graphicsLayer.add(lineGraphic);
    }


    //面积测量操作
    measureArea() {
        //真实绘制的ring
        var ring = [];
        //移动图层的ring
        var ringMove = [];
        //存储第一个绘制的点
        var firstPoint = [];

        var that = this;
        this.mapViewClickEvent = this.AppX.runtimeConfig.map.on("click", function (event) {

            that.doubleClick = false;
            //清除上次绘制的多边形
            that.measureLayer.clear();
            //判断是否为上次绘制完再次点击（即可以重新进行测量操作）
            if (that.endDraw == true) {
                ring = [];
                firstPoint = [];
                that.pointDraw = [];
                that.measureLayer.clear();
                that.moveLayer.clear();
                that.textLayer.clear();
                that.endDraw = false;
            }
            //存放当前的点击点的地图X与Y坐标
            var point = [];
            //清除之前的多边形
            point.push(event.mapPoint.x);
            point.push(event.mapPoint.y);
            //多边形的ring
            ring.push(point);

            //单击的地图点对象
            var pointMap = new Point(
                {
                    longitude: event.mapPoint.x,
                    latitude: event.mapPoint.y

                }
            );
            //将绘制的点放入所有绘制点的数组中
            that.pointDraw.push(pointMap);
            //存储第一个单击点
            if (firstPoint.length < 1) {
                firstPoint.push(event.mapPoint.x);
                firstPoint.push(event.mapPoint.y);
            }
            //添加多边形到地图
            that.addPolygonToGraphiclayer(ring, that.measureLayer);



        });
        $("#mainContainer").bind("dblclick", function (event) {
            //绘制点无法形成多边形
            if (ring.length < 2) {
                return;
            }
            if (!that.doubleClick)//wangjiao add
                that.doubleClick = true;
            else return;
            //清除移动图层上的所有图形
            that.moveLayer.clear();
            //清除绘制的所有多边形
            that.measureLayer.clear();

            //表明为结束绘制
            that.endDraw = true;
            var mainContainer = $('#mainContainer')[0];
            //获取绘制结束点
            var dblclickScreenPoint = new ScreenPoint({ x: event.clientX - mainContainer.offsetLeft, y: event.clientY - mainContainer.offsetTop });
            var dbclickPoint = that.AppX.runtimeConfig.map.toMap(dblclickScreenPoint);
            var point = new Point(
                {

                    longitude: dbclickPoint.x,
                    latitude: dbclickPoint.y

                }
            );
            //添加进所有绘制点的数组中
            that.pointDraw.push(point);
            //保存最后一个点
            var lastPoint = [];
            lastPoint.push(point.x);
            lastPoint.push(point.y);
            //多边形的ring中添加最后一个的和起点
            ring.push(lastPoint);
            ring.push(firstPoint);
            //添加测量结果
            // if (ring.length > 3) {
            //     that.addPolygonToGraphiclayer(ring, that.measureLayer);
            // }
            that.addPolygonToGraphiclayer(ring, that.measureLayer);
        })
        $("#mainContainer").bind("mousemove", function (event) {
            //
            if (that.doubleClick == true) {
                return;
            }
            //清除移动图层上的图形
            if (that.moveLayer) {
                that.moveLayer.clear();
            }

            //绘制的点多于一个
            if (that.pointDraw.length > 0) {
                //移动多边形的边界的路径
                var path = [];
                //添加绘制起点
                var startPoint = [];
                startPoint.push(that.pointDraw[0].x);
                startPoint.push(that.pointDraw[0].y);
                path.push(startPoint);
                //添加绘制移动点
                var mainContainer = $('#mainContainer')[0];
                var move = [];
                var moveScreenPoint = new ScreenPoint({ x: event.clientX - mainContainer.offsetLeft, y: event.clientY - mainContainer.offsetTop });
                var movePoint = that.AppX.runtimeConfig.map.toMap(moveScreenPoint);
                move.push(movePoint.x);
                move.push(movePoint.y);
                path.push(move);
                //绘制点超过两个，即可以形成多边形
                if (that.pointDraw.length > 1) {
                    //添加绘制终点
                    var endPoint = [];
                    endPoint.push(that.pointDraw[that.pointDraw.length - 1].x);
                    endPoint.push(that.pointDraw[that.pointDraw.length - 1].y);
                    path.push(endPoint);
                }


                //新建线对象
                var polyline = new Polyline({
                    paths: [path],
                    spatialReference: that.AppX.runtimeConfig.map.spatialReference
                });
                //新建线图形
                var lineGraphic = new Graphic(polyline, that.symbol.SimpleLineSymbolOfArea);

                //将线图形添加到线图层
                that.moveLayer.add(lineGraphic);
                // //添加测量结果
                // this.geometryServerCall(polyline, false);
            }
        });
    }


    //角度测量操作
    measureAngle() {
        var that = this;
        this.mapViewClickEvent = this.AppX.runtimeConfig.map.on("click", function (event) {
            that.doubleClick = false;
            //判断是否为上次绘制完再次点击
            if (that.endDraw == true) {
                that.pointDraw = [];
                that.measureLayer.clear();
                that.moveLayer.clear();
                that.textLayer.clear();
                that.endDraw = false;
            }
            //画第三个点时单击不响应
            if (that.pointDraw.length == 2) {
                return;
            }
            //获取鼠标点击的点
            var point = new Point(
                {
                    longitude: event.mapPoint.x,
                    latitude: event.mapPoint.y

                }
            );
            //将绘制的点放入保存所有绘制点的数组中
            that.pointDraw.push(point);

            //新建点图形
            var pointGraphic = new Graphic(point, that.symbol.SimpleMarkerSymbolOfAngle);

            //添加点图形到图层
            that.measureLayer.add(pointGraphic);
            //绘制相应的线
            that.drawLine(that.pointDraw, false);

        });
        //移动监听事件
        var mainDiv = $("#mainContainer");
        mainDiv.bind("mousemove", function (event) {
            //判断是否已经结束绘制
            if (that.doubleClick == true) {
                return;
            }
            //清除移动图层上的图形
            if (that.moveLayer) {
                that.moveLayer.clear();
            }

            if (that.pointDraw.length > 0) {
                var path = [];
                var pointMap = [];
                pointMap.push(that.pointDraw[that.pointDraw.length - 1].x);
                pointMap.push(that.pointDraw[that.pointDraw.length - 1].y);
                path.push(pointMap);
            }
            if (that.pointDraw.length > 0) {
                var mainContainer = $('#mainContainer')[0];
                var moveScreenPoint = new ScreenPoint({ x: event.clientX - mainContainer.offsetLeft, y: event.clientY - mainContainer.offsetTop });
                var movePoint = that.AppX.runtimeConfig.map.toMap(moveScreenPoint);
                pointMap = [];
                pointMap.push(movePoint.x);
                pointMap.push(movePoint.y);
                path.push(pointMap);
                var polyline = new Polyline({
                    paths: [path],
                    spatialReference: that.AppX.runtimeConfig.map.spatialReference
                });
                var lineGraphic = new Graphic(polyline, that.symbol.SimpleLineSymbol);
                that.moveLayer.add(lineGraphic);
            }
        });

        //双击监听事件
        mainDiv.bind("dblclick", function (event) {

            if (that.pointDraw.length != 2) {
                return;
            }
            that.moveLayer.clear();
            that.doubleClick = true;
            that.endDraw = true;
            var mainContainer = $('#mainContainer')[0];
            var dbclickScreenPoint = new ScreenPoint({ x: event.clientX - mainContainer.offsetLeft, y: event.clientY - mainContainer.offsetTop });
            var dbclickPoint = that.AppX.runtimeConfig.map.toMap(dbclickScreenPoint);
            var point = new Point(
                {

                    longitude: dbclickPoint.x,
                    latitude: dbclickPoint.y

                }
            );
            that.pointDraw.push(point);
            var pointGraphic = new Graphic(point, that.symbol.SimpleMarkerSymbolOfAngle);
            that.measureLayer.add(pointGraphic);
            that.drawLine(that.pointDraw, false);

            //添加测量结果
            that.addAngleMeasureResult(that.pointDraw, that.pointDraw[1]);


        });

    }
    //添加多边形到图层
    addPolygonToGraphiclayer(ring, graphicsLayer: GraphicsLayer) {
        //新建多边形对象
        var polygon = new Polygon({
            rings: [ring],
            spatialReference: this.AppX.runtimeConfig.map.spatialReference

        });
        //设置样式
        var fillSymbol = this.symbol.SimpleFillSymbol;
        //新建多边形graphic对象
        var polygonGraphic = new Graphic(polygon, fillSymbol);
        //添加到图层
        graphicsLayer.add(polygonGraphic);
        //如果双击添加测量结果
        if (this.doubleClick == true) {
            this.geometryServerAreaCall(polygon);

        }
    }
    //设置点、线或多边形的样式
    setSymbol() {

        var symbol = {
            "SimpleMarkerSymbol": null,
            "SimpleLineSymbol": null,
            "SimpleFillSymbol": null,
            "SimpleLineSymbolOfArea": null,
            "SimpleMarkerSymbolOfAngle": null,
            "SimpleFillSymbolTest": null

        };
        symbol.SimpleMarkerSymbol = new SimpleMarkerSymbol(
            {
                color: new Color("#FFFFFF"),
                style: "cross",       //点样式square|diamond|circle|x
                outline: {
                    color: new Color("#FF0000"),
                    width: 1
                }
            }

        );
        symbol.SimpleMarkerSymbolOfAngle = new SimpleMarkerSymbol(
            {
                color: new Color("#FFFFFF"),
                style: "circle",  //点样式
                size: 5,         //默认为12px  
                outline: {
                    color: new Color("#FF0000"),
                    width: 1
                }
            }

        );



        symbol.SimpleMarkerSymbol.size = 10;
        symbol.SimpleLineSymbol = new SimpleLineSymbol({
            color: new Color("#0000FF"),
            style: "solid",   //线的样式 dash|dash-dot|solid等	
            width: 2
        });
        //绘制多边形移动的线样式
        symbol.SimpleLineSymbolOfArea = new SimpleLineSymbol({
            color: new Color("#FF0000"),
            style: "solid",   //线的样式 dash|dash-dot|solid等	
            width: 1
        });

        symbol.SimpleFillSymbol = new SimpleFillSymbol({
            color: new Color([0, 0, 0, 0.1]),
            outline: {
                color: new Color("#FF0000"),
                width: 1

            }
        });
        symbol.SimpleFillSymbol.style = SimpleFillSymbol.STYLE_SOLID;

        symbol.SimpleFillSymbolTest = new SimpleFillSymbol({
            color: new Color([0, 0, 0]),
            style: 'STYLE_SOLID',
            outline: {
                color: new Color("#00FF00"),
                width: 1

            }
        });
        return symbol;
    }
    drawLine(point: Point[], measureLength: boolean) {

        //判断绘制的点数量是否至少为2，少于2无法绘制线段
        if (point.length > 1) {

            //将所有点转换为path
            var path = [];
            for (var i = 0, length = point.length; i < length; i++) {

                var allPoint = [];
                allPoint.push(point[i].x, point[i].y);
                path.push(allPoint);


            }

            //新建线对象
            var polyline = new Polyline({
                paths: [path],
                spatialReference: this.AppX.runtimeConfig.map.spatialReference
            });
            this.addlineToGraphiclayer(polyline, this.measureLayer, this.symbol.SimpleLineSymbol);
            //新建线图形
            var lineGraphic = new Graphic(polyline, this.setSymbol().SimpleLineSymbol);

            //将线图形添加到线图层
            this.measureLayer.add(lineGraphic);


            //如果为测量距离，添加测量结果
            if (measureLength == true) {

                this.geometryServerCall(polyline, false);
            }
        }
    }

    geometryServerCall(polyline: Polyline, move: boolean) {
        //调取geometryService服务，以获取线的长度
        if (this.AppX.appConfig.gisResource.geometry.config.length > 0) {
            var geometryServer = new GeometryService(this.AppX.appConfig.gisResource.geometry.config[0].url);
        } else {
            this.AppX.runtimeConfig.toast.Show('获取geometryService服务出错！');
        }

        var lengthsParameters = new LengthsParameters();

        lengthsParameters.calculationType = "planar";
        lengthsParameters.geodesic = true;
        lengthsParameters.polylines = [polyline];
        lengthsParameters.lengthUnit = this.config.lengthUnit[0].number;

        var that = this;
        if (move == false) {
            //回调函数
            geometryServer.lengths(lengthsParameters).then(function (lengthsPar) {
                that.Lengths = lengthsPar.lengths[0];
                //添加测量结果
                that.addMeasureReult();


            });
        } else {
            geometryServer.lengths(lengthsParameters).then(function (lengthsPar) {
                that.LengthsMove = lengthsPar.lengths[0];


            });
        }

    }

    geometryServerAreaCall(polygon: Polygon) {
        if (this.AppX.appConfig.gisResource.geometry.config.length > 0) {
            var geometryServer = new GeometryService(this.AppX.appConfig.gisResource.geometry.config[0].url);
        } else {
            this.AppX.runtimeConfig.toast.Show('获取geometryService服务出错！')
        }

        var areasAndLengthsParameters = new AreasAndLengthsParameters();
        // areasAndLengthsParameters.polygons = [polygon];
        areasAndLengthsParameters.areaUnit = GeometryService.UNIT_SQUARE_METERS;
        areasAndLengthsParameters.lengthUnit = GeometryService.UNIT_METER;
        areasAndLengthsParameters.calculationType = "planar";

        var that = this;
        geometryServer.simplify([polygon], function (simplifiedGeometries) {
            areasAndLengthsParameters.polygons = simplifiedGeometries;
            geometryServer.areasAndLengths(areasAndLengthsParameters);
        });

        geometryServer.on("areas-and-lengths-complete", function (areasAndLengthsReault) {
            that.area = areasAndLengthsReault.result.areas[0];
            that.addAreaMeasureReult(polygon);

        });

    }
    addAreaMeasureReult(polygon: Polygon) {
        var content = "总面积：" + this.area.toFixed(2) + "平方米";
        this.addTextGraphic(content, polygon, false);
    }
    addMeasureReult() {
        //新建信息窗口元素

        if (this.pointDraw.length == 1) {

            var lastDrawPoint = this.pointDraw[0];
            this.addTextGraphic("起点", lastDrawPoint, false);
        }
        else if (this.pointDraw.length > 1 && this.doubleClick == false) {


            //获取绘制的终点
            var middleDrawPoint = this.pointDraw[this.pointDraw.length - 1];
            var content = this.Lengths.toFixed(0) + " 米";
            this.addTextGraphic(content, middleDrawPoint, false);
        } else {
            //获取绘制的终点
            var lastDrawPoint = this.pointDraw[this.pointDraw.length - 1];
            var content = "总长度: " + this.Lengths.toFixed(0) + " 米";
            this.addTextGraphic(content, lastDrawPoint, false);
            var pointGraphic = [];
            for (var i = 0, length = this.measureLayer.graphics.length; i < length; i++) {
                if (this.measureLayer.graphics[i].geometry.type == 'point') {
                    pointGraphic.push(this.measureLayer.graphics[i]);
                }
            }
            //去除总长度重叠问题

            for (var i = 0, length2 = this.textLayer.graphics.length - 1; i < length2; i++) {
                var symbol: TextSymbol = <TextSymbol>this.textLayer.graphics[this.textLayer.graphics.length - 1].symbol;
                var text = symbol.text.replace("总长度: ", "");
                var regExp = new RegExp(text);
                var currentSymbol = <TextSymbol>this.textLayer.graphics[i].symbol;
                if (regExp.test(currentSymbol.text)) {
                    this.textLayer.remove(this.textLayer.graphics[i]);
                }
            }


        }

    }
    addAngleMeasureResult(pointDraw: Point[], point: Point) {
        var screenPoint = [];
        for (var i = 0, length = pointDraw.length; i < length; i++) {
            screenPoint.push(this.AppX.runtimeConfig.map.toScreen(pointDraw[i]));
        }

        //起点到中间点的向量
        var point1 = [];
        point1.push(screenPoint[0].x - screenPoint[1].x);
        point1.push(screenPoint[0].y - screenPoint[1].y);
        //终点到中间点的向量
        var point2 = [];
        point2.push(screenPoint[2].x - screenPoint[1].x);
        point2.push(screenPoint[2].y - screenPoint[1].y);
        var result: number;
        if (point1[0] * point2[1] == point1[1] * point2[0]) {
            result = 180;
        } else {
            //两向量的点乘
            var pointMultiply = point1[0] * point2[0] + point1[1] * point2[1];
            //求出夹角的弧度
            var angle = Math.acos(pointMultiply / Math.sqrt(Math.pow(point1[0], 2) + Math.pow(point1[1], 2)) / Math.sqrt(Math.pow(point2[0], 2) + Math.pow(point2[1], 2)));
            //转换为弧度
            result = angle * 180 / Math.PI;
        }
        var content = result.toFixed(1) + "度";
        this.addTextGraphic(content, point, false)

    }
    addTextGraphic(text: string, geometry, move: Boolean) {
        var textSymbol = new TextSymbol(text);
        textSymbol.color = new Color("#ff0000");//字体颜色
        textSymbol.haloColor = new Color("white");//光环颜色
        textSymbol.haloSize = 4;                   //光环大小
        textSymbol.xoffset = 8;
        textSymbol.yoffset = 8;
        var font = new Font();
        font.setSize("7pt");
        font.setWeight(Font.WEIGHT_BOLD);
        textSymbol.setFont(font);
        var startGraphc = new Graphic(geometry, textSymbol);

        if (move == false) {
            this.textLayer.add(startGraphc);
        } else {
            this.moveLayer.add(startGraphc);
        }
    }
}