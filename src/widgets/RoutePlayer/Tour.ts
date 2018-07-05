import Base = require('core/Base.class');
import Functions = require('core/Functions.module');
import Map = require("esri/map");
import Deferred = require("dojo/Deferred");
import GraphicsLayer = require("esri/layers/GraphicsLayer");
import SimpleRenderer = require("esri/renderers/SimpleRenderer");
import SimpleMarkerSymbol = require("esri/symbols/SimpleMarkerSymbol");
import SimpleLineSymbol = require("esri/symbols/SimpleLineSymbol");
import TextSymbol = require("esri/symbols/TextSymbol");
import Graphic = require("esri/graphic");
import Polyline = require("esri/geometry/Polyline");
import geometryEngine = require("esri/geometry/geometryEngine");
import QueryTask = require("esri/tasks/QueryTask");
import Query = require("esri/tasks/query");
import all = require("dojo/promise/all");
import Point = require("esri/geometry/Point");
import Color = require('esri/Color');
import Font = require("esri/symbols/Font");
import TourTip = require('./TourTip');
import Multipoint = require("esri/geometry/Multipoint");
import Extent = require("esri/geometry/Extent");


export = Tour;

class Tour extends Base {
    data = null;
    map: Map = null;
    hops = null;
    tourConfig = null;
    yiGraphicsLayer = null;//异常轨迹图层
    yiStopGraphicsLayer = null;//异常轨迹图层
    hopsGraphicsLayer = null;//动画轨迹图层
    stopsGraphicsLayer = null;//点图层
    preGrahicsLayer = null;//轨迹预览图层,绘制整个轨迹
    hopAnimationDuration = null;
    loadError = null;
    animationID = null;//记录当前播放动画的ID，用于停止动画
    private _startTime = null;
    private _endTime = null;
    private _planCosttime = null;
    tip: TourTip = null;
    completeCallBack = null;
    tiptemplate: string = "<div class=\"icon-back\"><img src=\"widgets/RoutePlayer/images/people.png\"/></div>";
    tipcartemplate: string = "<div class=\"icon-back\"><img src=\"widgets/RoutePlayer/images/car.png\"/></div>";
    time_field = "gpstime";//时间字段
    xfield = "x";//x坐标字段
    yfield = "y";//y坐标字段
    timepgap = 10;//最大时间间隔
    network_field = "network";//定位类型字段 1-gps 2-基站 3-wifi
    gps_field = "gps_state";//网络状态字段 1-网络正常 0-网络异常
    gpstype_field = "gps_type";//0-人巡，1-车巡
    option: RoutePlayerOption;//轨迹样式配置项集合
    ispanning = false;//标记地图是否在平移状态
    mapEvents = [];//记录地图事件，用于释放
    /**
    * (方法说明)构造函数
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    constructor(settings: {
        map: Map,
        data: any,
        timefield: any,
        xfield: any,
        yfield: any,
        timegap: any,
        networkfield: any,
        gpsfield: any,
        option: RoutePlayerOption,
        callback: Function
    }) {
        super();
        // 使用 settings
        this.map = settings.map;
        this.data = settings.data;
        this.time_field = settings.timefield;
        this.xfield = settings.xfield;
        this.yfield = settings.yfield;
        this.completeCallBack = settings.callback;
        this.timepgap = settings.timegap;
        this.network_field = settings.networkfield;
        this.gps_field = settings.gpsfield;
        this.option = settings.option;
        this._initViewAndConfig(settings);
        this.hops = [];
        this._initMapLayers();
        this._initAnimation();
        this._initTour();
        this.tip = new TourTip({ map: this.map });
        //显示预览轨迹
        _displayWholeLine(this);
        //地图事件
        this.mapEvents.push(this.map.on("pan-start", function () { this.ispanning = true }.bind(this)));
        this.mapEvents.push(this.map.on("pan-end", function () { this.ispanning = false }.bind(this)));
    }

    /**
    * (方法说明)按计划播放动画(数据开始时间，数据结束时间，播放计划总耗时/S,播放开始进度(默认0,即从计划起始时间开始播放))
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    animateWithPlan(starttime: Date, endtime: Date, plancosttime: number, processValue: number = 0) {
        if (endtime > starttime) {
            _animateTourPlan(this, starttime, endtime, plancosttime, processValue);
            this._startTime = starttime;
            this._endTime = endtime;
            this._planCosttime = plancosttime;
        }
    }

    /**
    * (方法说明)暂停播放
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    pause() {
        window.cancelAnimationFrame(this.animationID);
    }

    /**
    * (方法说明)更新动画到指定进度的画面
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    snapTo(processValue) {
        this.pause();
        this.clearDisplay();
        _snapToFrame(this, this._startTime, this._endTime, this._planCosttime, processValue);
    }

    /**
    * (方法说明)获取轨迹状态信息
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    getStatus() {
        return {
            timgappath: this.hops[0].timgappath,//保存时间分段
            statuspath: this.hops[0].statuspath//保存异常分段
        }
    }

    /**
    * (方法说明)释放和清理
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    clear() {
        this.pause();
        this.clearDisplay();
        if (this.yiGraphicsLayer)
            this.map.removeLayer(this.yiGraphicsLayer);
        if (this.preGrahicsLayer)
            this.map.removeLayer(this.preGrahicsLayer);
        if (this.hopsGraphicsLayer)
            this.map.removeLayer(this.hopsGraphicsLayer);
        if (this.stopsGraphicsLayer)
            this.map.removeLayer(this.stopsGraphicsLayer);
        if (this.yiStopGraphicsLayer)
            this.map.removeLayer(this.yiStopGraphicsLayer);
        if (this.tip)
            this.tip.Clean();
        //移除地图事件
        this.mapEvents.forEach(event => {
            event.remove();
        })
    }
    /**
    * (方法说明)初始化播放计划
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    initPlan(starttime: Date, endtime: Date, plancosttime: number) {
        if (endtime > starttime) {
            this._startTime = starttime;
            this._endTime = endtime;
            this._planCosttime = plancosttime;
        }
    }

    clearDisplay() {
        _clearTourGraphics(this);
    }

    _initTour() {
        if (this.tourConfig.spatialReference) {
            _loadTour(this);
        } else {
            this.tourConfig.spatialReference = this.map.spatialReference;
            try {
                _loadTour(this);
            } catch (err) {
                console.error(err);
                this.loadError = err;
                return;
            }
        }
    }
    _initViewAndConfig(settings: {
        map: Map,
    }) {
        var mapView, config = {};
        mapView = settings.map
        this.map = mapView;
        this.tourConfig = readConfig(config);
    }
    _initMapLayers() {
        //按外部传入参数修改默认配图符号
        if (this.option && this.option.userlinecolor) {
            this.tourConfig.symbols.pre.setColor(Color.fromHex(this.option.userlinecolor));
        }
        if (this.option && this.option.playlinecolor) {
            this.tourConfig.symbols.tour.setColor(Color.fromHex(this.option.playlinecolor));
        }
        if (this.option && this.option.linezise) {
            this.tourConfig.symbols.tour.setWidth(this.option.linezise);
            this.tourConfig.symbols.tour.setWidth(this.option.linezise);
            this.tourConfig.symbols.yiline.setWidth(this.option.linezise);
        }
        //构建图层
        this.preGrahicsLayer = new GraphicsLayer();
        this.preGrahicsLayer.id = "preGrahicsLayer";
        this.preGrahicsLayer.renderer = new SimpleRenderer(this.tourConfig.symbols.pre);
        this.hopsGraphicsLayer = new GraphicsLayer();
        this.hopsGraphicsLayer.id = "hopsGraphicsLayer";
        this.hopsGraphicsLayer.renderer = new SimpleRenderer(this.tourConfig.symbols.tour);
        this.yiGraphicsLayer = new GraphicsLayer();
        this.yiGraphicsLayer.id = "yiGraphicsLayer";
        this.yiGraphicsLayer.renderer = new SimpleRenderer(this.tourConfig.symbols.yiline);
        this.stopsGraphicsLayer = new GraphicsLayer();
        this.stopsGraphicsLayer.id = "stopsGraphicsLayer";
        this.stopsGraphicsLayer.renderer = new SimpleRenderer({
            symbol: this.tourConfig.symbols.stops
        });
        this.yiStopGraphicsLayer = new GraphicsLayer();
        this.yiStopGraphicsLayer.id = "yiStopGraphicsLayer";
        this.yiStopGraphicsLayer.renderer = new SimpleRenderer({
            symbol: this.tourConfig.symbols.yistop
        });
    }
    _initAnimation() {
        this.hopAnimationDuration = this.tourConfig.animation.duration / (Math.max(1, this.hops.length));
    }
}

function _loadTour(tour) {
    // Make sure we're cleared up
    tour.ready = false;
    tour.extent = undefined;
    tour.loadError = undefined;
    _parseTourGPS(tour, tour.data);
    tour.ready = true;
}

function _clearTourGraphics(tour) {
    tour.hopsGraphicsLayer.clear();
    tour.yiGraphicsLayer.clear();
    tour.yiStopGraphicsLayer.clear();
    // tour.stopsGraphicsLayer.clear();
}

function showStop(stop, stopsGraphicsLayer, config) {
    var g = new Graphic(stop)
    stopsGraphicsLayer.add(g);
    stopsGraphicsLayer.add(labelForStop(g, config));
}

function labelForStop(stop, config) {
    var yOffset = stop.__label_yOffset || 0;
    var alignment = stop.__label_alignment || "center";
    var labelSymbol = new TextSymbol(stop[config.data.stopNameField], new Font(12, "STYLE_NORMAL", "VARIANT_NORMAL", "WEIGHT_NORMAL", "sans-serif"), new Color([255, 0, 0]));
    labelSymbol.horizontalAlignment = alignment;
    labelSymbol.yoffset = yOffset;
    var labelGraphic = new Graphic(stop.geometry, labelSymbol);
    return labelGraphic;
}
///
/// 默认参数配置
///
function getDefaultConfig() {
    return {
        useActualRoute: undefined,
        autoStart: false,
        autoStartDelay: 0,
        spatialReference: null,
        showPreRoute: true,//是否预先显示轨迹全图
        data: {
            stopLayerURL: null,
            stopLayerID: 1,
            stopNameField: "Name",
            stopSequenceField: "Sequence",
            trackServiceURL: null,
            trackLayerID: 3,
            trackSequenceField: "DirectionPointID",
            spatialReferenc: {
                "wkid": 4326,
                "latestWkid": 4326
            }
        },
        animation: {
            duration: 10.0,
            maxFPS: 30 // Used when generating Great Circles to estimate a sensible min distance between points.
        },
        symbols: {
            // tour: new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([130, 232, 130, 1]), 2),
            tour: new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([11, 11, 10, 1]), 2),
            pre: new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([177, 187, 190, 1]), 3),
            yiline: new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([232, 130, 130, 1]), 2),
            yistop: new SimpleMarkerSymbol("STYLE_CIRCLE", 8, new SimpleLineSymbol("STYLE_SOLID", new Color([153, 153, 153]), 1), new Color([232, 130, 130, 1])),
            stops: new SimpleMarkerSymbol("STYLE_CIRCLE", 10, new SimpleLineSymbol("STYLE_SOLID", new Color([153, 153, 153]), 1.125), new Color([194, 194, 194, 1])),
            //style: string, size: number, outline: SimpleLineSymbol, color: Color
            labels: new TextSymbol({
                color: "white",
                haloColor: "black",
                haloSize: "3px",
                xoffset: 0,
                font: {  // autocast as esri/symbols/Font
                    size: 12,
                    family: "sans-serif",
                    weight: "light"
                }
            }),
            startpoint: new SimpleMarkerSymbol(
                SimpleMarkerSymbol.STYLE_CIRCLE,
                6,
                new SimpleLineSymbol(
                    SimpleLineSymbol.STYLE_SOLID,
                    new Color([0, 0, 0]), 4
                ),
                new Color([255, 255, 255])
            ),
            endpoint: new SimpleMarkerSymbol(
                SimpleMarkerSymbol.STYLE_SQUARE,
                6,
                new SimpleLineSymbol(
                    SimpleLineSymbol.STYLE_SOLID,
                    new Color([0, 0, 0]), 4
                ),
                new Color([255, 255, 255])
            )
        },
        labelPositions: {
            offsetBelow: [],
            leftAlign: [],
            rightAlign: []
        }
    };
}

function getUrlParameterMappingForValidParams() {
    return {
        autoStart: {
            path: "autoStart",
            urlValid: true,
            mapFunc: mapBool
        },
        autoStartDelay: {
            path: "autoStartDelay",
            urlValid: true,
            mapFunc: mapInt
        },
        duration: {
            path: "animation.duration",
            urlValid: true,
            mapFunc: mapFloat
        },
        stopLayerURL: {
            path: "data.stopLayerURL",
            urlValid: true,
            value: null
        },
        stopNameField: {
            path: "data.stopNameField",
            urlValid: true
        },
        stopSequenceField: {
            path: "data.stopSequenceField",
            urlValid: true
        },

        routeResultServiceURL: {
            path: "routeResultServiceURL",
            urlValid: true,
            value: null
        },
        forceGreatCircleArcs: {
            path: "useActualRoute",
            urlValid: true,
            mapFunc: function (useArcsParamString) {
                var forceArcs = mapBool(useArcsParamString);
                if (forceArcs === undefined) {
                    forceArcs = false;
                }
                return !forceArcs;
            },
            value: null,
            defaultValue: true
        },

        tourSymbol: {
            path: "symbols.tour",
            urlValid: false
        },
        stopSymbol: {
            path: "symbols.stops",
            urlValid: false
        },
        labelSymbol: {
            path: "symbols.labels",
            urlValid: false
        },
        labelPositions: {
            path: "labelPositions",
            urlValid: false
        },
        trackServiceURL: {
            path: "data.trackServiceURL",
            value: null
        }
    };
}

function readConfig(config) {
    var validParams = getUrlParameterMappingForValidParams();
    var allowURLParameters = (typeof config.allowURLParameters === "boolean") ? config.allowURLParameters : true;
    var validURLParams = !allowURLParameters ? [] : Object.getOwnPropertyNames(validParams).filter(function (paramName) {
        return validParams[paramName].urlValid;
    });
    if (Array.isArray(config.allowURLParameters)) {
        validURLParams = validURLParams.filter(function (paramName) {
            return config.allowURLParameters.indexOf(paramName) > -1;
        });
    }
    var paramNames = Object.getOwnPropertyNames(validParams);
    for (var i = 0; i < paramNames.length; i++) {
        var paramName = paramNames[i],
            paramInfo = validParams[paramName],
            paramFromURL = (validURLParams.indexOf(paramName) > -1) ? getParameterByName(paramName) : undefined,
            paramVal = (paramFromURL !== undefined) ? paramFromURL : config[paramName];

        if (paramVal !== undefined) {
            if (typeof paramInfo.mapFunc === "function") {
                paramInfo.value = paramInfo.mapFunc(paramVal);
            } else {
                paramInfo.value = paramVal;
            }
        } else {
            if (paramInfo.hasOwnProperty("defaultValue")) {
                paramInfo.value = paramInfo.defaultValue;
            } else {
                delete validParams[paramName];
            }
        }
    }

    var mergedConfig = getDefaultConfig();

    if (validParams.routeResultServiceURL) {
        validParams.stopLayerURL = {
            path: "data.stopLayerURL",
            value: validParams.routeResultServiceURL.value + "/" + mergedConfig.data.stopLayerID,
            urlValid: true
        };
        if (!(validParams.hasOwnProperty("forceGreatCircleArcs") && validParams.forceGreatCircleArcs.value === false)) {
            validParams.trackServiceURL = {
                path: "data.trackServiceURL",
                value: validParams.routeResultServiceURL.value + "/" + mergedConfig.data.trackLayerID
            };
        }
        delete validParams.stopNameField;
        delete validParams.stopSequenceField;
    } else {
        if (validParams.forceGreatCircleArcs) {
            validParams.forceGreatCircleArcs.value = true;
        }
    }

    paramNames = Object.getOwnPropertyNames(validParams);
    for (var i = 0; i < paramNames.length; i++) {
        var paramName = paramNames[i],
            paramInfo = validParams[paramName],
            paramValue = paramInfo.value,
            targetKey = paramInfo.path.split("."),
            targetObject = mergedConfig;

        while (targetKey.length > 1) {
            targetObject = targetObject[targetKey.shift()];
        }

        targetObject[targetKey[0]] = paramValue;
    }

    fallbackToDemoConfigIfAppropriate(mergedConfig);

    return mergedConfig;
}

function fallbackToDemoConfigIfAppropriate(config) {
    if (!config.data.stopLayerURL) {
        if (config.useActualRoute !== false) {
            config.useActualRoute = true;
        } else {
            config.data.trackServiceURL = null;
        }
        config.labelPositions = {
            offsetBelow: [3, 4, 9, 13, 17, 19, 20, 23, 25, 30, 42],
            leftAlign: [1, 5, 6, 11, 15, 22, 23, 24, 27, 33, 38, 42, 44],
            rightAlign: [8, 16, 17, 18, 19, 21, 28, 30, 34, 35, 36, 37, 39, 40, 43]
        }
    }
}

function mapBool(strBool) {
    if (typeof strBool === "string") {
        return strBool == "true" ? true : (strBool == "false" ? false : undefined);
    } else if (typeof strBool === "boolean") {
        return strBool;
    }
    return undefined;
}

function mapInt(strInt) {
    var parsed = parseInt(strInt);
    if (!isNaN(parsed) && parsed > 0) {
        return parsed;
    }
    return undefined;
}

function mapFloat(strFloat) {
    var parsed = parseFloat(strFloat);
    if (!isNaN(parsed) && parsed > 0) {
        return parsed;
    }
    return undefined;
}

function getParameterByName(name) {
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        url = window.location.href,
        results = regex.exec(url);
    if (!results) return undefined;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

//wj自定义基于时间数据点的轨迹播放
function _animateTourPlan(tour: Tour, starttime, endtime, plancosttime: number, processValue: number = 0) {
    var deferred = new Deferred();
    tour.clearDisplay();
    var completedHopsLine, completedHopsGraphic, currentHopLine, currentHopGraphic, currentYiGraphic;
    window.setTimeout(function () {
        completedHopsLine = new Polyline({
            spatialReference: tour.tourConfig.spatialReference
        });
        completedHopsGraphic = new Graphic({
            geometry: completedHopsLine
        });
        currentHopLine = new Polyline({
            spatialReference: tour.tourConfig.spatialReference
        });
        currentHopGraphic = new Graphic({
            geometry: currentHopLine
        });
        tour.animationID = window.requestAnimationFrame(updateAnimation);
    }, 0);

    tour.hopAnimationDuration = plancosttime * (1 - processValue);//计划动画运行时间
    var targetHopDuration = 1000 * tour.hopAnimationDuration;
    var currentIndex = 0, frameCount = 0, totalFrameTime = 0;
    var averageFramePeriod = 1000 / 60, averageFrameDuration = 1000 / 60;
    var overallStartTime, hopEndTargetTime;
    var startPlayTime = performance.now();
    return deferred;

    function updateAnimation(timeStamp) {
        var frameStartTime = performance.now();
        //计算当前播放时间点上应该显示的数据的时间,考虑指定了初始播放进度位置
        var targetDataTime = new Date(starttime.getTime() + (endtime - starttime) * (processValue + (frameStartTime - startPlayTime) / (1000 * plancosttime)));//starttime + (frameStartTime - startPlayTime);
        if (deferred.isCanceled()) {
            deferred.reject("Tour cancelled by user.");
            return;
        }
        var currentHopInfo = tour.hops[currentIndex];

        if (overallStartTime) {
            averageFramePeriod = (frameStartTime - overallStartTime) / frameCount;
            averageFrameDuration = totalFrameTime / frameCount;
        } else {
            overallStartTime = frameStartTime;
            hopEndTargetTime = overallStartTime + targetHopDuration;
        }

        var framesRemainingInHop = (hopEndTargetTime - frameStartTime) / averageFramePeriod,
            forceCompleteOnThisFrame = framesRemainingInHop < 0.5;
        var hopTimeRemaining = hopEndTargetTime - frameStartTime;
        var uncorrectedHopProgress = 1 - (hopTimeRemaining / targetHopDuration);
        var hopProgress = forceCompleteOnThisFrame ? 1 : Math.min(1, uncorrectedHopProgress);
        var data = getSublineGPSWithGap(tour, targetDataTime);//获取当前轨迹，path间没有时间消耗，包含从轨迹原点的整条轨迹，可能包含多个path
        if (data.tourline) {
            tour.hopsGraphicsLayer.remove(currentHopGraphic);//移除当前轨迹
            currentHopGraphic = new Graphic({ geometry: data.tourline })
            tour.hopsGraphicsLayer.add(currentHopGraphic);//添加当前新轨迹
            //显示用户tip
            var pathcount = data.tourline.paths.length;
            if (pathcount == 0) return;
            var path = data.tourline.paths[pathcount - 1];
            var stopcount = path.length;
            if (stopcount == 0) return;
            var infoTemplate = data.gpstype > 0 ? tour.tipcartemplate : tour.tiptemplate;
            var position = new Point(path[stopcount - 1][0], path[stopcount - 1][1], tour.map.spatialReference);
            var mixedInfoTemplate = _.template(infoTemplate)({
            });
            if (!tour.ispanning || hopProgress == 1) {
                tour.tip.AddNew({
                    id: "tourtip",
                    title: "title",
                    content: mixedInfoTemplate,
                    point: position
                });
                tour.tip.ShowInfoWindow("id");
            }
        }
        else {
            tour.tip.ClearWindow();
        }
        if (data.yiline) {
            tour.yiGraphicsLayer.remove(currentYiGraphic);//移除当前轨迹
            currentYiGraphic = new Graphic({ geometry: data.yiline });//(data.yiline,tour.tourConfig.symbols.yiline);//({ geometry: data.yiline })
            tour.yiGraphicsLayer.add(currentYiGraphic);//添加当前新轨迹
        }
        if (data.yipoint) {
            tour.yiStopGraphicsLayer.clear();
            for (var i = 0; i < data.yipoint.length; i++) {
                var mp = new Point(data.yipoint[i]);
                var mpraphic = new Graphic(mp);//, tour.tourConfig.symbols.yistop
                tour.yiStopGraphicsLayer.add(mpraphic);
            }
        }
        if (hopProgress == 1) {
            for (var p = 0; p < data.tourline.paths.length; p++) {
                completedHopsLine.addPath(data.tourline.paths[p]);
            }
            tour.hopsGraphicsLayer.remove(currentHopGraphic);
            tour.hopsGraphicsLayer.remove(completedHopsGraphic);
            completedHopsGraphic = new Graphic({ geometry: completedHopsLine });
            tour.hopsGraphicsLayer.add(completedHopsGraphic);
            currentIndex++;
            hopEndTargetTime = performance.now() + targetHopDuration;
            if (tour.completeCallBack != null)
                tour.completeCallBack();
            deferred.progress({
                currentHop: currentIndex,
                totalHops: tour.hops.length
            });

        }

        var frameEndTime = performance.now();
        totalFrameTime += (frameEndTime - frameStartTime);
        frameCount++;
        if (currentIndex < tour.hops.length) {
            tour.animationID = window.requestAnimationFrame(updateAnimation);
        } else {
            var overallEndTime = frameEndTime;
            console.log("动画播放时间 " + (overallEndTime - overallStartTime) / 1000 + " 秒 (帧周期: " + averageFramePeriod + "ms，每帧耗时: " + averageFrameDuration + "ms)");
            deferred.resolve(null);//?
        }
    }
}

function _parseTourGPS(tour, results) {
    tour.hops = parseHopsGPS(tour, results);//将每个点的字符串型日期转换为日期类型的值，便于计算、比较
    tour.hopAnimationDuration = tour.tourConfig.animation.duration;// 一个hop /(Math.max(1, tour.hops.length));
    // var extentGeo: any = geometryEngine.union(tour.hops.map(function (hop) {
    //     return new Polyline(hop.line).getExtent();
    // }));
    // tour.extent = extentGeo.getExtent();

    tour.map.addLayers([
        tour.preGrahicsLayer,
        tour.hopsGraphicsLayer,
        tour.yiGraphicsLayer,
        tour.yiStopGraphicsLayer,
        tour.stopsGraphicsLayer
    ]);
}


/**
* (方法说明)
* @method (方法名)
* @for (所属类名)
* @param {(参数类型)} (参数名) (参数说明)
* @return {(返回值类型)} (返回值说明)
*/
function parseHopsGPS(tour: Tour, gpsFeatures) {
    var hops = [];
    var statusPath = [], preGPS, lastindex = 0, prestatus = 1;//1--在线，0--离线
    var line = [];
    ///按最大时间间隔拆分
    // for (var i = 0; i < gpsFeatures.length; i++) {
    //     var currentGPS = gpsFeatures[i];
    //     currentGPS[tour.time_field] = new Date(currentGPS[tour.time_field]);
    //     line.push([currentGPS[tour.xfield], currentGPS[tour.yfield]]);
    //     if (preGPS) {
    //         var preTime: any = preGPS[tour.time_field];
    //         var time: any = currentGPS[tour.time_field];
    //         var currentStatus = ((time - preTime) - tour.timepgap * 1000) > 0 ? 0 : 1;
    //         if (currentStatus != prestatus || i == gpsFeatures.length - 1) {
    //             var lasttop = gpsFeatures[lastindex];
    //             statusPath.push(
    //                 {
    //                     startindex: lastindex,
    //                     endindex: i == gpsFeatures.length - 1 ? i : i - 1,
    //                     status: prestatus
    //                 }
    //             );
    //             lastindex = i - 1;
    //             prestatus = currentStatus;
    //         }
    //     }
    //     preGPS = currentGPS;
    // }
    //(取消时间间隔拆分机制)
    statusPath.push(
        {
            startindex: 0,
            endindex: gpsFeatures.length - 1,
            status: 1
        }
    );
    for (var i = 0; i < gpsFeatures.length; i++) {
        var currentGPS = gpsFeatures[i];
        currentGPS[tour.time_field] = new Date(currentGPS[tour.time_field]);
        line.push([currentGPS[tour.xfield], currentGPS[tour.yfield]]);
    }
    //按isvalid拆分为点线
    var statusGPS = [];
    for (var j = 0; j < statusPath.length; j++) {
        statusGPS = statusGPS.concat(pathGPS(tour, statusPath[j]));
    }
    var newHop = {
        origin: null,
        destination: null,
        line: line,
        geodesicLine: null,
        timgappath: statusPath,//保存时间分段
        statuspath: statusGPS,//保存异常分段
        stops: gpsFeatures
    }
    hops.push(newHop);
    return hops;
}

/**
* (方法说明)按异常点拆分线段
* @method (方法名)
* @for (所属类名)
* @param {(参数类型)} (参数名) (参数说明)
* @return {(返回值类型)} (返回值说明)
*/
function pathGPS(tour: Tour, path) {
    //按异常点拆分线段
    var statusGPS = [];
    if (path.status == 1) {
        var preStop, lastindex = path.startindex;
        for (var i = path.startindex; i <= path.endindex; i++) {
            var currStop = tour.data[i];
            if (preStop) {
                if (currStop[tour.network_field] != preStop[tour.network_field] || currStop[tour.gps_field] != preStop[tour.gps_field] || i == path.endindex) {
                    var currStatus = isValid(tour, currStop);
                    var preStatus = isValid(tour, preStop);
                    statusGPS.push(
                        {
                            startindex: lastindex,
                            endindex: i == path.endindex ? i : i - 1,
                            status: path.status,
                            isvalid: i == path.endindex ? currStatus.value : preStatus.value,
                            message: i == path.endindex ? currStatus.message : preStatus.message,
                            istimegap: statusGPS.length == 0 ? 1 : 0//标记时间分段第一项
                        }
                    );
                    lastindex = i;
                }
            }
            preStop = currStop;
        }
    }
    return statusGPS;
}

/**
* (方法说明)判断指定点是否是异常点
* @method (方法名)
* @for (所属类名)
* @param {(参数类型)} (参数名) (参数说明)
* @return {(返回值类型)} (返回值说明)
*/
function isValid(tour: Tour, stop) {
    //network 1-gps 2-基站 3-wifi
    //gps_stat 1-网络正常 0-网络异常
    var value = 1, message = [];
    if (stop[tour.network_field] > 1 || stop[tour.gps_field] < 1)
        value = 0;
    if (stop[tour.network_field] == 2)
        message.push("基站定位");
    if (stop[tour.network_field] == 3)
        message.push("网络定位");
    if (stop[tour.gps_field] < 1)
        message.push("网络异常");
    return {
        value: value,
        message: message.join("_")
    }
}

/**
* (方法说明)获取指定时间前的轨迹线,考虑异常点，（有连续异常点时绘制异常线和点，只有单个异常点时，只绘制异常点，否则绘制正常线）
* @method (方法名)
* @for (所属类名)
* @param {(参数类型)} (参数名) (参数说明)
* @return {(返回值类型)} (返回值说明)
*/
function getSublineGPSWithGap(tour, datatime) {
    var targetPaths = [], gpstype = 0;
    var line = tour.hops[0].line;
    var timgappath = tour.hops[0].timgappath;
    var stops = tour.hops[0].stops;
    for (var i = 0; i < timgappath.length; i++) {
        if (timgappath[i].status) {
            if (stops[timgappath[i].endindex][tour.time_field] <= datatime) {
                targetPaths.push(line.slice(timgappath[i].startindex, timgappath[i].endindex + 1));
                gpstype = stops[timgappath[i].endindex][tour.gpstype_field];//更新终点巡检类型
            }
            else if (stops[timgappath[i].startindex][tour.time_field] <= datatime) {
                var path = [];
                for (var j = timgappath[i].startindex; j <= timgappath[i].endindex; j++) {
                    if (stops[j][tour.time_field] <= datatime) {
                        path.push([line[j][0], line[j][1]]);
                        gpstype = stops[j][tour.gpstype_field];//更新终点巡检类型
                        if (j != timgappath[i].endindex && stops[j + 1][tour.time_field] > datatime) {
                            //构建临时点
                            var targetGapRatio = (datatime - stops[j][tour.time_field]) / (stops[j + 1][tour.time_field] - stops[j][tour.time_field]);
                            var tailVertex = [
                                line[j][0] + (line[j + 1][0] - line[j][0]) * targetGapRatio,
                                line[j][1] + (line[j + 1][1] - line[j][1]) * targetGapRatio
                            ];
                            path.push(tailVertex);
                        }
                    }
                }
                targetPaths.push(path);
            }
        }
    }
    //构建异常信息
    var targetYiPaths = [];
    var targetYiPoints = [];
    var statusPath = tour.hops[0].statuspath;
    for (var k = 0; k < statusPath.length; k++) {
        if (statusPath[k].status) {
            if (statusPath[k].isvalid < 1 && statusPath[k].status) {
                if (stops[statusPath[k].endindex][tour.time_field] <= datatime) {
                    if (statusPath[k].startindex == statusPath[k].endindex)
                        targetYiPoints.push(line[statusPath[k].startindex])
                    else {
                        var poins = line.slice(statusPath[k].startindex, statusPath[k].endindex + 1);
                        targetYiPaths.push(poins);
                        targetYiPoints = targetYiPoints.concat(poins);
                    }
                } else if (stops[statusPath[k].startindex][tour.time_field] <= datatime) {
                    var path = [];
                    for (var h = statusPath[k].startindex; h <= statusPath[k].endindex; h++) {
                        if (stops[h][tour.time_field] <= datatime) {
                            path.push([line[h][0], line[h][1]]);
                            targetYiPoints.push([line[h][0], line[h][1]]);
                            if (h != statusPath[k].endindex && stops[h + 1][tour.time_field] > datatime) {
                                //构建临时点
                                var targetGapRatio = (datatime - stops[h][tour.time_field]) / (stops[h + 1][tour.time_field] - stops[h][tour.time_field]);
                                var tailVertex = [
                                    line[h][0] + (line[h + 1][0] - line[h][0]) * targetGapRatio,
                                    line[h][1] + (line[h + 1][1] - line[h][1]) * targetGapRatio
                                ];
                                path.push(tailVertex);
                            }
                        }
                    }
                    targetYiPaths.push(path);
                }
            }
        }
    }
    var subLine
    if (targetPaths.length > 0) {
        subLine = new Polyline({
            paths: targetPaths,
            spatialReference: tour.tourConfig.spatialReference
        })
    }

    var subYiLine
    if (targetYiPaths.length > 0) {
        subYiLine = new Polyline({
            paths: targetYiPaths,
            spatialReference: tour.tourConfig.spatialReference
        })
    }

    var data = {
        tourline: subLine,
        yiline: subYiLine,
        yipoint: targetYiPoints,
        gpstype: gpstype //0-人巡，1-车巡
    }
    return data;
}

/**
* (方法说明)显示指定进度的动画帧
* @method (方法名)
* @for (所属类名)
* @param {(参数类型)} (参数名) (参数说明)
* @return {(返回值类型)} (返回值说明)
*/
function _snapToFrame(tour: Tour, starttime, endtime, plancosttime: number, processValue: number) {
    var targetDataTime = new Date(starttime.getTime() + (endtime - starttime) * (processValue));//starttime + (frameStartTime - startPlayTime);
    var currentHopInfo = tour.hops[0];//wj?
    var data = getSublineGPSWithGap(tour, targetDataTime);
    tour.hopsGraphicsLayer.clear();
    tour.yiGraphicsLayer.clear();
    tour.yiStopGraphicsLayer.clear();
    //显示用户tip
    if (data.tourline) {
        var currentHopGraphic = new Graphic({ geometry: data.tourline })
        tour.hopsGraphicsLayer.add(currentHopGraphic);//添加当前新轨迹
        var pathcount = data.tourline.paths.length;
        if (pathcount == 0) return;
        var path = data.tourline.paths[pathcount - 1];
        var stopcount = path.length;
        if (stopcount == 0) return;
        var infoTemplate = data.gpstype > 0 ? tour.tipcartemplate : tour.tiptemplate;
        var position = new Point(path[stopcount - 1][0], path[stopcount - 1][1], tour.map.spatialReference);
        var mixedInfoTemplate = _.template(infoTemplate)({
        });
        tour.tip.AddNew({
            id: "tourtip",
            title: "title",
            content: mixedInfoTemplate,
            point: position
        });
        tour.tip.ShowInfoWindow("id");
    }
    else {
        tour.tip.ClearWindow();
    }
    if (data.yiline) {
        var currentYiGraphic = new Graphic({ geometry: data.yiline })
        tour.yiGraphicsLayer.add(currentYiGraphic);//添加当前新轨迹
    }
    if (data.yipoint) {
        for (var i = 0; i < data.yipoint.length; i++) {
            var mp = new Point(data.yipoint[i]);
            var mpraphic = new Graphic(mp);
            tour.yiStopGraphicsLayer.add(mpraphic);
        }
    }
}

/**
* (方法说明)显示完整轨迹
* @method (方法名)
* @for (所属类名)
* @param {(参数类型)} (参数名) (参数说明)
* @return {(返回值类型)} (返回值说明)
*/
function _displayWholeLine(tour: Tour) {
    tour.preGrahicsLayer.clear();
    tour.yiGraphicsLayer.clear();
    if (tour.hops[0].stops.length > 1) {
        var lastTime = tour.hops[0].stops[tour.hops[0].stops.length - 1][tour.time_field];
        var data = getSublineGPSWithGap(tour, lastTime);
        //添加当前新轨迹
        var tourGraphic = new Graphic({ geometry: data.tourline })
        tour.preGrahicsLayer.add(tourGraphic);
        //绘制起点和终点
        var startPoint = new Point(tour.hops[0].line[0]);
        var endPoint = new Point(tour.hops[0].line[tour.hops[0].line.length - 1]);
        var startGraphic = new Graphic(startPoint, tour.tourConfig.symbols.startpoint);
        var endGraphic = new Graphic(endPoint, tour.tourConfig.symbols.endpoint);
        tour.stopsGraphicsLayer.clear();
        tour.stopsGraphicsLayer.add(startGraphic);
        tour.stopsGraphicsLayer.add(endGraphic);
        //缩放至数据范围
        var lineExtent = data.tourline.getExtent();
        var xmin: number = lineExtent.xmin || tour.map.extent.xmin;
        var xmax: number = lineExtent.xmax || tour.map.extent.xmax;
        var ymin: number = lineExtent.ymin || tour.map.extent.ymin;
        var ymax: number = lineExtent.ymax || tour.map.extent.ymax;
        var width = xmax - xmin;
        var height = ymax - ymin;
        xmin = xmin - width / 2;
        xmax = xmax + width / 2;
        ymin = ymin - height / 2;
        ymax = ymax + height / 2;
        var resultExtent = new Extent(xmin, ymin, xmax, ymax, tour.map.spatialReference);
        tour.map.setExtent(resultExtent);
    }
}