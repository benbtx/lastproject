import BaseWidget = require('core/BaseWidget.class');

import Map = require("esri/map");
import Layer = require("esri/layers/layer");
import QueryTask = require("esri/tasks/QueryTask");
import Query = require("esri/tasks/query");
import LayerInfo = require("esri/layers/LayerInfo");
import ArcGISDynamicMapServiceLayer = require("esri/layers/ArcGISDynamicMapServiceLayer");
import Point = require('esri/geometry/Point');
import GraphicsLayer = require("esri/layers/GraphicsLayer");
import Graphic = require("esri/graphic");
import PictureMarkerSymbol = require("esri/symbols/PictureMarkerSymbol");
import Color = require("esri/Color");
import SimpleMarkerSymbol = require("esri/symbols/SimpleMarkerSymbol");
import InfoTemplate = require("esri/InfoTemplate");
import SpatialReference = require('esri/SpatialReference');
import Polyline = require("esri/geometry/Polyline");
import SimpleLineSymbol = require("esri/symbols/SimpleLineSymbol");
import SimpleFillSymbol = require('esri/symbols/SimpleFillSymbol');
import Polygon = require('esri/geometry/Polygon');

declare var jscolor;
export = XJCarWatching;
class XJCarWatching extends BaseWidget {
    baseClass = "XJCarWatching";





    //今明两天的时间
    today;
    // tomorrow;
    todayHideDangerList = [];//当天上报的隐患
    untilTodayHideDangerList = [];//截至当天上报的所有隐患（未处理）
    hideDangerPopup;


    //相关图层保存
    xjPointGraphicLayer: XJGraphicLayer;
    xjLineGraphicLayer: XJGraphicLayer;
    xjRegionGraphicLayer: XJGraphicLayer;
    watchingSetting: WatchingSetting;
    //保存图形样式
    symbol;
    //系统变量
    photowall;//查看照片
    map: Map;
    workerResult;//保存查询的巡检人员信息
    index = 0;
    pathPlayerResult = null;
    setIntervalNumber;

    clockNumber;//实时刷新定时器
    playPointX = [];
    playPointY = [];
    xspan = [];
    yspan = [];
    pathindex = -1;
    animationQueue;
    pathPlayImgObj;
    relativeGraphicLayers: XJGraphicLayer;//相关图层（轨迹、巡检点等）
    /**图层模块 */
    XJGraphicLayers: XJGraphicLayer;

    userType = "";//用户类型：总公司(superadmin)，分公司管理员(companyadmin)，分公司部门管理员(departmentadmin)
    carState = {
        "noWork": ["noWork", "未上班"],
        "onWork": ["workNormal", "车巡开启"],
        "offWork": ["offWork", "车巡关闭"]
    };


    startup() {
        this.setHtml(_.template(this.template.split("$$")[0])({
            hello: this.config.hello + (/\/([a-zA-Z]+)$/g.exec(this.widgetPath)[1])
        }));
        this.map = this.AppX.runtimeConfig.map;
        this.XJCarWatchingInit();

    }

    destroy() {
        this.afterDestroy();

        this.destoryWidget();
    }



    //模块关闭时，清除相关资源
    destoryWidget() {
        //清除隐患、人员和轨迹图层
        /*图层控制 */
        this.XJGraphicLayers.removeGraphicLayer();
        this.relativeGraphicLayers.removeGraphicLayer();
        //隐藏infowindow
        this.map.infoWindow.hide();
        //清除定时器   
        if (this.setIntervalNumber != undefined) {
            clearInterval(this.setIntervalNumber);
            this.setIntervalNumber = undefined;
        }
        clearInterval(this.clockNumber);
    }

    XJCarWatchingInit() {

        //获取今天和明天的时间
        var time = new Date();
        this.today = time.getFullYear() + "/" + (time.getMonth() + 1) + "/" + time.getDate();
        //获取监控设置（轨迹点和线的样式）
        this.requestWatchingSetting();
        //设置隐患、人员点样式
        this.symbol = this.setSymbol();
        //初始化照片查看器
        this.photowall = this.AppX.runtimeConfig.photowall;
        //添加所有基础图层(车辆)到地图
        this.XJGraphicLayers = new XJGraphicLayer(this.map, this.config.baseLayerIds);
        //添加相关图层（轨迹、计划）
        this.relativeGraphicLayers = new XJGraphicLayer(this.map, this.config.relativeLayerIds);


        //判断用户类型
        this.judgeUserType();
        //根据用户初始化界面
        this.initQueryInterface();
        //初始化事件
        this.initEvent();
    }

    setTimeClock() {
        //获取截至今日的所有隐患信息（未处理），初始化表
        var requestCompanyId = AppX.appConfig.departmentid;
        var departmentid = AppX.appConfig.groupid;
        if (this.domObj.find("select.company ").length != 0) {
            requestCompanyId = this.domObj.find("select.company option:selected").val();
        }
        this.requestAllCarInfo(requestCompanyId, departmentid, this.today, this.requestAllCarInfoCallBack.bind(this));  //获取所有巡检人员信息,并添加到地图
    }

    //判断用户的类型（总公司，分公司，部门管理员）
    judgeUserType() {
        if (AppX.appConfig.groupid != null && AppX.appConfig.groupid != "") {
            this.userType = "departmentadmin";
        } else if (/00;/.test(AppX.appConfig.range)) {
            this.userType = "superadmin";
        } else {
            this.userType = "companyadmin";
        }
    }

    initQueryInterface() {
        switch (this.userType) {
            case "superadmin":
                this.domObj.find("div.workerlist").addClass("company");
                this.domObj.find("div.hidedangerlist").addClass("company");
                this.requestCompanyInfo();//初始化公司、部门、人员查询条件
                break;
            case "companyadmin":
                this.domObj.find("div.companySelect").remove();
                this.domObj.find("div.workerlist").addClass("department");
                this.domObj.find("div.hidedangerlist").addClass("department");
                this.requestAllCarInfo(AppX.appConfig.departmentid, "", this.today, this.requestAllCarInfoCallBack.bind(this));  //获取所有巡检人员信息,并添加到地图
                this.requestDepartmentInfo(AppX.appConfig.departmentid, [this.initDepartmentSelect.bind(this), this.initHideDangerDepartmentSelect.bind(this)]);
                this.initBaseLayerInfo(AppX.appConfig.departmentid);
                break;
            case "departmentadmin":
                this.domObj.find("div.companySelect").remove();
                this.domObj.find("#worker div.selector").remove();
                this.domObj.find("#hidedanger div.selector").remove();
                var groupid = AppX.appConfig.groupid;
                this.requestAllCarInfo(AppX.appConfig.departmentid, groupid, this.today, this.requestAllCarInfoCallBack.bind(this));  //获取所有巡检人员信息,并添加到地图
                // this.requestDepartmentInfo(AppX.appConfig.departmentid, [this.initDepartmentSelect.bind(this), this.initHideDangerDepartmentSelect.bind(this)]);
                this.initBaseLayerInfo(AppX.appConfig.departmentid);
                break;
        }
    }

    //初始化公司下拉列表，设置当前选中未登录账户公司，主动触发change事件
    requestCompanyInfo() {
        var config = this.config.requestCompanyInfo;
        $.ajax({
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request,
            data: {

            },
            success: function (result) {
                if (result.code !== 1) {
                    console.log(result.message);
                } else if (result.result.length === 0) {
                    console.log(config.MSG_null);
                } else {
                    var rows = result.result;
                    var html = "";
                    for (var i = 0, length = rows.length; i < length; i++) {
                        var companyId = rows[i].companyid;
                        var companyName = rows[i].company_name;
                        var itemHtml = "<option value='" + companyId + "'>" + companyName + "</option>";
                        html += itemHtml;
                    }

                    //初始化公司下拉选项
                    this.domObj.find("select.company").append(html);
                    //设置当前选中项为该登录用户公司
                    this.domObj.find("select.company option").attr("value", function (index, val) {
                        if (val === AppX.appConfig.departmentid) {
                            $(this).attr("selected", "selected")
                        }
                        return val;
                    });
                    //自动触发
                    this.domObj.find("select.company ").trigger("change");
                }
            }.bind(this),
            error: function (error) {
                console.log(config.MSG_error);
            }.bind(this),
            dataType: "json",
        });
    }

    initEvent() {
        //绑定公司下拉改变事件
        if (this.domObj.find("select.company").length != 0) {
            this.domObj.find("select.company").change(function (event) {
                //获取所选公司的巡检人员信息和隐患信息
                var requestCompanyId = this.domObj.find("select.company option:selected").val();
                //移除之前添加的数据
                //this.domObj.find(' #worker .workerlist div.item').remove();
                this.requestAllCarInfo(requestCompanyId, "", this.today, this.requestAllCarInfoCallBack.bind(this));  //获取所有巡检人员信息,并添加到地图
                //初始化所选公司下的部门信息
                this.domObj.find("select.department option").remove();
                this.requestDepartmentInfo(requestCompanyId, [this.initDepartmentSelect.bind(this)]);
                //获取所选公司基础地图的信息
                this.XJGraphicLayers.clearGraphics();
            }.bind(this));
        }
        //人员信息：部门下拉改变事件
        if (this.domObj.find("select.department").length != 0) {
            this.domObj.find("select.department").change(function () {
                var departmentId = this.domObj.find("select.department").find("option:selected").val();
                var userState = this.domObj.find("select.userstate").find("option:selected").val();
                //显示符合部门和状态条件的巡检人员
                this.displayQualifiedUser(departmentId, userState);
            }.bind(this));
        }
        //人员信息：人员状态下拉改变事件
        this.domObj.find("select.userstate").on("change", function (event) {
            var departmentId = this.domObj.find("select.department").find("option:selected").val();
            var userState = this.domObj.find("select.userstate").find("option:selected").val();
            this.displayQualifiedUser(departmentId, userState);//显示符合部门和状态条件的巡检人员
        }.bind(this));

        /*图层控制 */
        this.domObj.find("#xunjianlayer li input[type='checkbox']").bind("click", function (event) {
            var layerName = $(event.currentTarget).parent("li").attr("layername");
            var choosedState = $(event.currentTarget).parent("li").attr("choosed");
            var curentObject = $(event.currentTarget).parent("li");
            var checkboxObjec = $(this);
            this.layerControl(layerName, choosedState, curentObject, checkboxObjec);
        }.bind(this)); //图层关闭和打开
    }


    //设置隐患点，巡检人员点等的样式
    setSymbol() {
        var config = this.config.setSymbol;
        var symbol = {
            worker: {
                onWork: new PictureMarkerSymbol(this.root + config.PNGPATH_WorkerPng.onWork, 30, 30),
                offWork: new PictureMarkerSymbol(this.root + config.PNGPATH_WorkerPng.offWork, 30, 30),
                noWork: new PictureMarkerSymbol(this.root + config.PNGPATH_WorkerPng.noWork, 30, 30),
                gpsError: new PictureMarkerSymbol(this.root + config.PNGPATH_WorkerPng.gpsError, 30, 30),
                netError: new PictureMarkerSymbol(this.root + config.PNGPATH_WorkerPng.netError, 30, 30),
                gpsAndNetError: new PictureMarkerSymbol(this.root + config.PNGPATH_WorkerPng.gpsAndNetError, 30, 30),
                gpsErrorActive: new PictureMarkerSymbol(this.root + config.PNGPATH_WorkerPng.gpsErrorActive, 30, 30),
                netErrorActive: new PictureMarkerSymbol(this.root + config.PNGPATH_WorkerPng.netErrorActive, 30, 30)
            },
            checkPoint: {
                checkedPoint: new PictureMarkerSymbol(this.root + config.PNGPATH_CheckPointPng.checked, 45, 45),
                checkingPoint: new PictureMarkerSymbol(this.root + config.PNGPATH_CheckPointPng.checking, 45, 45),
                checkedPath: new SimpleLineSymbol({
                    color: new Color("#dddddd"),
                    style: "solid",   //线的样式 dash|dash-dot|solid等	
                    width: 3
                }),
                checkingPath: new SimpleLineSymbol({
                    color: new Color("#6eb1e6"),
                    width: 2,
                    style: "solid"
                })
            },
            hideDanger: {
                handled: new PictureMarkerSymbol(this.root + config.PNGPATH_HideDangerPng.handled, 30, 30),
                handling: new PictureMarkerSymbol(this.root + config.PNGPATH_HideDangerPng.handling, 30, 30),
                active: new PictureMarkerSymbol(this.root + config.PNGPATH_HideDangerPng.active, 30, 30),
            },
            pathPlayer: new PictureMarkerSymbol(this.root + config.PNGPATH_PathPlayerPng, 30, 30),
            currentPoint: new SimpleMarkerSymbol(
                {
                    color: new Color("#FF0000"),
                    size: 5,
                    // style: "STYLE_CROSS",       //点样式cross|square|diamond|circle|x
                    yoffset: -8,

                    outline: {
                        color: new Color([255, 0, 0, 0.7]),
                        width: 2
                    }
                }
            ),
            path: {
                oraginalPath: new SimpleLineSymbol({
                    color: new Color("#0000FF"),
                    style: "solid",   //线的样式 dash|dash-dot|solid等	
                    width: 1
                })
            }
        }
        symbol.currentPoint.setStyle(SimpleMarkerSymbol.STYLE_X);
        return symbol;
    }

    /*
    * 图层控制
    */

    //图层控制（显示和隐藏）
    layerControl(layerName, choosedState, curentObject, checkboxObjec) {
        var activeGraphicLayer = <GraphicsLayer>this.map.getLayer("worker_activeGraphicLayer");
        activeGraphicLayer.clear();;
        var layer = this.map.getLayer(layerName);
        if (choosedState == "yes") {
            layer.hide();
            curentObject.attr("choosed", "no");
            checkboxObjec.prop("checked", false);
        } else {
            layer.show();
            curentObject.attr("choosed", "yes");
            checkboxObjec.prop("checked", true);
        }
    }

    //获取轨迹设置信息
    requestWatchingSetting() {
        var config = this.config.requestWatchingSetting;
        var toast = this.AppX.runtimeConfig.toast;
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request,
            data: {
            },
            success: function (result) {
                if (result.code !== 1) {
                    toast.Show(config.MSG_error);
                } else if (result.result.length === 0) {
                    toast.Show(config.MSG_null);
                } else {
                    var refrshTimeSpan = result.result[0].refresh_internal * 1000;
                    var pathLineColor = result.result[0].trail_line_color;
                    var pathLineWidth = result.result[0].trail_line_width;
                    var pathPointColor = result.result[0].trail_point_color;
                    var pathPointWidth = result.result[0].trail_point_width;
                    var wokerPathColor = result.result[0].trail_person_color;
                    var carPathColor = result.result[0].trail_car_color;

                    this.watchingSetting = new WatchingSetting(refrshTimeSpan, wokerPathColor, carPathColor, pathLineColor, pathLineWidth, pathPointColor, pathPointWidth);

                    //实时刷新
                    // this.clockNumber = window.setInterval(this.setTimeClock.bind(this), refrshTimeSpan);
                }
            }.bind(this),
            error: function (error) {
                toast.Show(config.MSG_error);
            },
            dataType: "json",
        });
    }

    //获取所有车辆的实时状态信息
    requestAllCarInfo(companyId, departmentid, queryDate, callBack) {
        var config = this.config.requestAllCarInfo;
        var toast = this.AppX.runtimeConfig.toast;
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
                "range": AppX.appConfig.range
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_Query,
            data: {
                "pageindex": 1,
                "pagesize": 100000,
                "search_date": queryDate,
                "companyid": companyId,
                "deptid": departmentid
            },
            success: function (result) {
                if (result.code !== 1) {
                    toast.Show(config.MSG_Error);
                } else if (result.result.rows.length === 0) {
                    toast.Show(config.MSG_Null);
                } else {
                    console.log({ "departmentid": AppX.appConfig.departmentid, "result": result })
                    callBack(result);
                }
            },
            error: function () {
                toast.Show(config.MSG_QueryError);
            },
            dataType: "json",
        });
    }

    //获取所有车辆的实时状态信息回调函数
    requestAllCarInfoCallBack(result) {
        this.workerResult = result;
        //车辆图标添加到地图 
        this.addAllCarGraphic(result);
        //初始化车辆状态信息列表
        this.initCarList(result);

    }

    //初始化在线且有经纬度的车辆graphic
    addAllCarGraphic(result) {
        //清除原有图层图形
        var workerGraphicLayer = <GraphicsLayer>this.map.getLayer("GraphicLayer_car");
        workerGraphicLayer.clear();
        //添加车辆graphic
        var rows = result.result.rows;
        for (var i = 0, length = rows.length; i < length; i++) {
            var carNumber = rows[i].plate_number;//车牌号
            var x = 0;
            var y = 0;
            if (rows[i].lat_lng !== null && rows[i].lat_lng !== "") {
                x = rows[i].lat_lng.lng;//经度
                y = rows[i].lat_lng.lat;//纬度
            }
            var loginTime = '--';//上班时间
            var offTime = '--';//下班时间
            if (x !== 0 && y !== 0) {
                var point = new Point(x, y, this.map.spatialReference);
                var infoTemplate = new InfoTemplate({
                    title: "巡检车辆信息",
                    content: this.template.split('$$')[3]
                });
                //设置车辆点样式
                var symbol = this.symbol.worker.noWork;
                loginTime = rows[i].on_time;//上班时间
                offTime = rows[i].off_time;//下班时间
                var userstate = this.carState.noWork[1];
                if (loginTime != null) {
                    var runLog = rows[i].equip_info;//最新的运行日志
                    if (runLog.gps_type === 0) {
                        userstate = this.carState.offWork[1];
                        symbol = this.symbol.worker.offWork;
                    } else if (runLog.gps_type === 1) {
                        userstate = this.carState.onWork[1];
                        symbol = this.symbol.worker.onWork;
                    }
                }
                var graphic = new Graphic(point, symbol, "", infoTemplate);
                //设置graphic的属性值
                var name = rows[i].plate_number;  //车辆信息
                var departmentName = rows[i].depname; //所属部门
                graphic.setAttributes({
                    "Name": name,
                    "DepartmentName": departmentName,
                    "State": userstate
                });
                workerGraphicLayer.add(graphic);
            }
        }
    }

    //初始化巡检人员列表
    initCarList(result) {
        var config = this.config.initCarList;
        //移除之前添加的数据
        if (this.domObj.find(' #worker .workerlist div.item')) {
            this.domObj.find(' #worker .workerlist div.item').remove();
        }
        var rows = result.result.rows;
        var template = this.domObj.find("#worker .workerlist #workeritemtemplate").text().trim();
        var html = "";
        var onlineCount = 0;
        var totalCount = result.result.total;
        for (var i = 0, length = rows.length; i < length; i++) {
            var departmentid = rows[i].depid;
            var carid = rows[i].id;
            var name = rows[i].plate_number;
            var subName = (rows[i].plate_number.length > 7) ? rows[i].carNumber.substr(0, 7) + "..." : rows[i].plate_number;  //车牌号
            var x = 0;//经度
            var y = 0;//纬度
            if (rows[i].lat_lng !== null && rows[i].lat_lng !== "") {
                x = rows[i].lat_lng.lng;//经度
                y = rows[i].lat_lng.lat;//纬度
            }
            var onTime = rows[i].on_time;//上班时间
            var offTime = rows[i].off_time;//上班时间
            var xjapiRoot = AppX.appConfig.xjapiroot;
            var headPicture = rows[i].avatar[0];
            var oraginalAvatar = "no"
            if (headPicture !== "" && headPicture !== undefined) {
                var xjapiRoot = AppX.appConfig.xjapiroot;
                headPicture = xjapiRoot.substr(0, xjapiRoot.length - 3) + rows[i].avatar[0].thumbnail;//上传头像地址
            } else if (onTime === null || offTime !== null) {
                headPicture = config.IMG_avatarOff;//默认离线头像
                oraginalAvatar = "yes";
            } else {
                headPicture = config.IMG_avatarOn;//默认在线头像
                oraginalAvatar = "yes";
            }
            var collapseIndex = "relativeinfo" + i;
            /*
            *上班时间为null则为未上班
            *下班时间不为null则为下班
            *
            */
            var data = [];
            var userState = "";
            var imgsrc = "";
            var title = "";
            var onOffWorkTime = "";
            if (onTime === null) {
                title = name + "-" + this.carState.noWork[1];
                userState = this.carState.noWork[0];
                onOffWorkTime = "--";
            } else {
                var runLog = rows[i].equip_info;//最新的运行日志
                if (runLog.gps_type === 0) {
                    title = name + "-" + this.carState.offWork[1];
                    userState = this.carState.offWork[0];
                    onTime = onTime.split(" ")[1];
                    onTime = onTime.split(":")[0] + ":" + onTime.split(":")[1];
                    offTime = offTime.split(" ")[1];
                    offTime = offTime.split(":")[0] + ":" + offTime.split(":")[1];
                    onOffWorkTime = onTime;
                } else if (runLog.gps_type === 1) {
                    onTime = onTime.split(" ")[1];
                    onTime = onTime.split(":")[0] + ":" + onTime.split(":")[1];
                    title = name + "-" + this.carState.onWork[1];
                    userState = this.carState.onWork[0];
                    onOffWorkTime = onTime;
                    onlineCount++;
                }

            }
            data = [departmentid, userState, oraginalAvatar, headPicture, carid, userState, title, x, y, subName, collapseIndex, collapseIndex, collapseIndex, onOffWorkTime, collapseIndex, collapseIndex, collapseIndex];
            var index = 0;
            var templateReplace = template.replace(/%data/g, function () {
                return (index < data.length) ? (data[index++]) : "";
            });
            html += templateReplace;

        }
        this.domObj.find(' #worker .workerlist div.item').remove();
        this.domObj.find('#worker .workerlist').append(html);
        //初始化头部信息
        var headInfo = onlineCount + "/" + totalCount;
        this.domObj.find("#myTab a.worker span").text(headInfo);
        //巡检人员定位到地图
        this.domObj.find("#worker .workerlist a.workername").bind("click", function (event) {
            var x = parseFloat($(event.currentTarget).attr("longitude"));
            var y = parseFloat($(event.currentTarget).attr("latitude"));
            var userstate = $(event.currentTarget).attr("userstate");
            this.locateWorkerItem(x, y, userstate);
        }.bind(this));
        //查看巡检人员的日志、轨迹、巡检点等
        this.domObj.find("#worker .workerlist div.item div.relativeinfo").on("show.bs.collapse", this.workerDetailLinkClick.bind(this));
        this.domObj.find("#worker .workerlist div.item div.relativeinfo").on("hidden.bs.collapse", function (event) {
            if (this.animationQueue) {
                this.animationQueue.stop();
            }
            this.relativeGraphicLayers.clearGraphics();
        }.bind(this));
        // //主动触发过滤
        // this.domObj.find("select.department").trigger("change");

    }

    //车辆定位
    locateWorkerItem(x, y, userstate) {
        var config = this.config.locateWorkerItem;
        var activeGraphicLayer = <GraphicsLayer>this.map.getLayer("worker_activeGraphicLayer");
        //清除原有图形
        activeGraphicLayer.clear();

        if (x === 0 && y === 0) {
            this.AppX.runtimeConfig.toast.Show(config.MSG_locateerror)
        } else {
            //高亮详情点
            var point = new Point(x, y, new SpatialReference({ wkid: this.map.spatialReference.wkid }));
            var currentActiveWorkerSymbol;
            switch (userstate) {

                case "offWork": currentActiveWorkerSymbol = new PictureMarkerSymbol(this.root + config.offWork, 30, 30);
                    break;
                case "workNormal": currentActiveWorkerSymbol = new PictureMarkerSymbol(this.root + config.onWork, 30, 30);
                    break;
                case "workGpsError": currentActiveWorkerSymbol = new PictureMarkerSymbol(this.root + config.gpsError, 30, 30);
                    break;
                case "workNetError": currentActiveWorkerSymbol = new PictureMarkerSymbol(this.root + config.netError, 30, 30);
                    break;
                case "workGpsAndNetError": currentActiveWorkerSymbol = new PictureMarkerSymbol(this.root + config.gpsAndNetError, 30, 30);
                    break;
                default: currentActiveWorkerSymbol = new PictureMarkerSymbol(this.root + config.noWork, 30, 30);
                    break;

            }
            var symbol = new SimpleLineSymbol({
                "color": new Color("#ff0000"),
                "size": 40,
                "angle": -30,
                "xoffset": 0,
                "yoffset": 0,
                "type": "esriSMS",
                "style": "esriSMSCircle",
            });
            var activeGraphic = new Graphic(point, symbol);
            activeGraphicLayer.add(activeGraphic);
            this.map.centerAndZoom(point, 17);

        }
    }


    /*
    * 查看手持端工作日志
    */

    //人员详细链接点击事件
    workerDetailLinkClick(event) {

        var requestType = $(event.currentTarget).attr("requesttype");
        var carID = $(event.currentTarget).parents("div.item").find("div.head").attr("userid")
        var targetID = "#" + $(event.currentTarget).attr("id");
        if (requestType === "log") {
            if (this.animationQueue) {
                this.animationQueue.stop();
            }
            this.relativeGraphicLayers.clearGraphics();
            //清除之前的结果
            this.domObj.find(".workerlist .relativeinfo *").remove();
            if (this.domObj.find(".workerlist .collapse").hasClass("in")) {
                this.domObj.find(".workerlist .collapse.in").collapse("hide");
            }

            //获取工作日志
            this.requestWorkerLog(1, 10000, carID, this.today, targetID, this.initWorkerLog.bind(this));
        } else if (requestType === "path") {
            //清除之前的结果
            this.domObj.find(" .workerlist .relativeinfo *").remove();
            if (this.domObj.find(".workerlist .collapse").hasClass("in")) {
                this.domObj.find(".workerlist .collapse.in").collapse("hide");
            }

            if (this.animationQueue) {
                this.animationQueue.stop();
            }
            this.relativeGraphicLayers.clearGraphics();
            //获取车辆的所有轨迹
            this.requestCarAllPath(carID, this.today + " 00:00:00", this.today + " 23:59:59", this.addWorkerAllPathToMap.bind(this));
            //获取车辆分段巡检轨迹的索引
            this.requestCarSectionPathIndex(carID, this.today, targetID, this.requestCarSectionPathIndexCallBack.bind(this));
        } else if (requestType === "checkpoint") {
            //清除之前的结果
            this.domObj.find(".workerlist .relativeinfo *").remove();
            if (this.domObj.find(".workerlist .collapse").hasClass("in")) {
                this.domObj.find(".workerlist .collapse.in").collapse("hide");
            }
            if (this.animationQueue) {
                this.animationQueue.stop();
            }
            this.relativeGraphicLayers.clearGraphics();
            this.requestWorkerCheckPoint(carID, targetID);
        }


    }

    //获取巡检人工作日志
    requestWorkerLog(pageIndex, pageSize, userID, searchDate, targetID, callBack) {
        var config = this.config.requestWorkerLog;
        var toast = this.AppX.runtimeConfig.toast;
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request,
            data: {
                "pageindex": pageIndex,
                "pagesize": pageSize,
                "userid": userID,
                "search_date": searchDate
            },
            success: function (result) {
                if (result.code !== 1) {
                    toast.Show(result.message);
                } else if (result.result.rows.runlog === null || result.result.rows.runlog.length == 0) {
                    toast.Show(config.MSG_null);
                } else {
                    callBack(result, targetID);
                }

            }.bind(this),
            error: function () {
                toast.Show(config.MSG_error);
            },
            dataType: "json",
        });
    }

    //初始化日志列表
    initWorkerLog(result, targetID) {
        var config = this.config.initWorkerLog;
        var rows = result.result.rows;
        var onTime = rows.on_time != null ? rows.on_time.split(" ")[1] : "--";//上班时间
        var offTime = rows.off_time != null ? rows.off_time.split(" ")[1] : "--";//上班时间
        var runlog = rows.runlog;
        var template = $(".MapWatching .workerlist #workerlog").text().trim()
        // var ontimeIndex = 0;
        // var ontimeHtml = template.replace(/%data/g, function () {
        //     var data = [config.IMG_onwork, "上班 &nbsp &nbsp  &nbsp", onTime];
        //     return (ontimeIndex < data.length) ? (data[ontimeIndex++]) : "";
        // });
        // var offtimeIndex = 0;
        // var offtimeHtml = template.replace(/%data/g, function () {
        //     var data = [config.IMG_offwork, "下班 &nbsp &nbsp &nbsp", offTime];
        //     return (offtimeIndex < data.length) ? (data[offtimeIndex++]) : "";
        // });
        var html = "";
        for (var i = 0, length = runlog.length; i < length; i++) {
            var gpsState = runlog[i].gps_state;
            var netState = runlog[i].network_state;
            var gpsPng = "";
            if (netState == 1) {
                if (gpsState == 0) {
                    gpsState = "gps未开启";
                    gpsPng = config.IMG_gpserror;
                } else if (gpsState == 1) {
                    gpsState = "gps正常";
                    gpsPng = config.IMG_gpsnormal;
                } else if (gpsState == 2) {
                    gpsState = "gps异常";
                    gpsPng = config.IMG_gpserror;
                }
            } else {
                gpsState = "网络异常";
                gpsPng = config.IMG_gpserror;
            }
            var time = runlog[i].check_time.split(" ")[1];
            var data = [gpsPng, gpsState, time];
            var index = 0;
            var templateReplace = template.replace(/%data/g, function () {
                return (index < data.length) ? (data[index++]) : "";
            });
            html += templateReplace;
        }
        var selector = ".MapWatching .workerlist " + targetID;
        $(selector).append(html);
        //   $(selector).append(ontimeHtml + html + offtimeHtml);



    }


    /*
    * 查看单个巡检人员的计划，及完成情况
    */

    //获取巡检人巡检点
    requestWorkerCheckPoint(userid, targetID) {
        //获取巡检人员巡检计划包含今天的所有巡检计划id
        this.requestWorkerAllPlanId(userid, this.today, targetID, this.requestCheckedPoint.bind(this));


    }

    //获取巡检人员巡检计划包含今天的所有巡检计划id
    requestWorkerAllPlanId(userid, searchDate, targetID, callback) {
        var config = this.config.requestWorkerAllPlanId;
        var toast = this.AppX.runtimeConfig.toast;
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request,
            data: {
                "user_id": userid,
                "search_date": searchDate,
                "isvalid": 1

            },
            success: function (response) {

                if (response.code != 1) {
                    toast.Show(config.MSG_error);
                } else if (response.result.rows.length === 0) {
                    toast.Show(config.MSG_null);
                } else {
                    var rows = response.result.rows;
                    for (var i = 0, length = rows.length; i < length; i++) {
                        var mainPlanId = rows[i].plan_id; //巡检主计划id
                        var regionName = rows[i].region_name; //片区名
                        var beginDate = rows[i].plan_begindate.split(" ")[0]; //巡检计划开始时间
                        var endDate = rows[i].plan_enddate.split(" ")[0];//巡检计划结束时间
                        var timtSpan = beginDate.split("-")[1] + "-" + beginDate.split("-")[2] + "->" + endDate.split("-")[1] + "-" + endDate.split("-")[2];
                        var periodName = rows[i].period_name;//巡检方式
                        var deviceTypeName = rows[i].device_type_name;//巡检设备类型
                        var title = regionName + "(" + deviceTypeName + "," + periodName + "|" + timtSpan + ")";
                        var cllapseID = "collapse" + i;
                        callback(mainPlanId, title, cllapseID, targetID, this.initWorkerCheckedPointList.bind(this));
                    }
                }
            }.bind(this),
            error: function () {
                toast.Show(config.MSG_error);
            },
            dataType: "json",
        });
    }

    //获取某个计划下的巡检点
    requestCheckedPoint(mainPlanId, title, cllapseID, targetID, callBack) {
        var config = this.config.requestCheckedPoint;
        var toast = this.AppX.runtimeConfig.toast;
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request,
            data: {
                "plan_id": mainPlanId,
                "search_date": this.today,
            },
            success: function (response) {
                callBack(mainPlanId, response, title, cllapseID, targetID);
            }.bind(this),
            error: function () {
                toast.Show(config.MSG_error);
            },
            dataType: "json",
        });
    }

    //初始化巡检计划列表
    initWorkerCheckedPointList(planid, result, title, cllapseID, targetID) {
        var rows = result.result[0];
        //初始化主计划信息（片区，巡检方式，巡检日期，完成量）
        var complishPercent = (rows.percent * 100).toFixed(1) + "%";//巡检计划完成量
        var html = "";
        var template = this.domObj.find(".workerlist #workercheckpointTemplate").text().trim();
        var textOfLink = title.split("(")[0];//片区名
        var mainData = [planid, cllapseID, title, textOfLink, complishPercent, complishPercent, cllapseID];
        var mainIndex = 0;
        html = template.replace(/%data/g, function () {
            return (mainIndex < mainData.length) ? (mainData[mainIndex++]) : ""
        });
        var selector = "." + this.baseClass + ".workerlist " + targetID;
        $(selector).append(html);
        // 初始化该计划下巡检点信息(是否巡检，巡检点名，巡检时间)
        var checkPoints = rows.plan_child_points;//巡检点集合
        var itemHtml = "";
        for (var i = 0, length = checkPoints.length; i < length; i++) {
            //设备名称
            var name = checkPoints[i].name;
            if (name === "") {
                name = checkPoints[i].device_type_name;
            }
            //
            var devicePng = "";
            var checkedTime = "--";

            var state = checkPoints[i].isover;
            var geometryJson = "";//点、线、面
            geometryJson = checkPoints[i].geometry;
            var geometry;
            var symbol = undefined;
            if (/paths/.test(geometryJson)) {
                geometry = new Polyline(JSON.parse(geometryJson));
                if (state == 0) {//未检
                    devicePng = "pointChecking.png"
                    symbol = this.symbol.checkPoint.checkingPath;
                } else {//已检
                    devicePng = "pointChecked.png";
                    checkedTime = checkPoints[i].over_date.split(" ")[1];
                    symbol = this.symbol.checkPoint.checkedPath;
                }

            } else if (/rings/.test(geometry)) {
                geometry = new Polygon(JSON.parse(geometryJson));
                if (state == 0) {//未检
                    devicePng = "pointChecking.png"
                    symbol = this.symbol.checkPoint.checking;
                } else {//已检
                    devicePng = "pointChecked.png";
                    checkedTime = checkPoints[i].over_date.split(" ")[1];
                    symbol = this.symbol.checkPoint.checked;
                }

            } else {
                geometry = new Point(JSON.parse(geometryJson));
                if (state == 0) {//未检
                    devicePng = "pointChecking.png"
                    symbol = this.symbol.checkPoint.checkedPoint;
                } else {//已检
                    devicePng = "pointChecked.png";
                    checkedTime = checkPoints[i].over_date.split(" ")[1];
                    symbol = this.symbol.checkPoint.checkedPoint;
                }

            }
            var itemTemplate = template.split("<item>")[1];
            var data = [devicePng, name, name.substr(0, 10), checkedTime];
            var index = 0;
            var itemTemplateReplace = itemTemplate.replace(/%data/g, function () {
                return (index < data.length) ? (data[index++]) : "";
            });
            itemHtml += itemTemplateReplace;

            //添加巡检设备到地图
            var deviceGraphic = new Graphic(geometry, symbol);
            var checkPointGraphicLayer = <GraphicsLayer>this.map.getLayer("worker_checkPointGraphicLayer");
            checkPointGraphicLayer.add(deviceGraphic);
        }
        this.domObj.find(".workerlist .relativeinfo div." + planid + " .checkpoints").append(itemHtml);





    }



    /*
    * 查看单个巡检人员的轨迹并可以回放
    */


    //获取车辆所有轨迹，并在地图显示
    requestCarAllPath(userid, uploadtime1, uploadtime2, callBack) {
        var config = this.config.requestCarAllPath;
        var toast = this.AppX.runtimeConfig.toast;
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request,
            data: {
                "pageindex": 1,
                "pagesize": 1000000,
                "userid": userid,
                "uploadtime1": uploadtime1,
                "uploadtime2": uploadtime2


            },
            success: function (result) {
                if (result.code !== 1) {
                    toast.Show(config.MSG_error);
                } else if (result.result.rows.length === 0) {
                    return;
                } else {
                    callBack(result);
                }

            }.bind(this),
            error: function () {
                toast.Show(config.MSG_error);
            },
            dataType: "json",
        });

    }

    addWorkerAllPathToMap(result) {
        var config = this.config.addWorkerAllPathToMap;
        var allPathGraphicLayer = <GraphicsLayer>this.map.getLayer("worker_allPathGraphicLayer");
        var path = result.result.rows[0].guiji;
        var linePath: Array<any> = [];
        for (var i = 0, length = path.length; i < length; i++) {
            var pathPoint = [];
            pathPoint.push(path[i].location_longitude);
            pathPoint.push(path[i].location_latitude);
            linePath.push(pathPoint);
        }
        var polyline = new Polyline({
            "paths": [linePath],
            "spatialReference": this.map.spatialReference
        });
        var lineSymbol = new SimpleLineSymbol({
            color: new Color(this.watchingSetting._carPathColor),
            style: "solid",   //线的样式 dash|dash-dot|solid等	
            width: this.watchingSetting.pathLineWith
        });
        var lineGraphic = new Graphic(polyline, lineSymbol);
        allPathGraphicLayer.add(lineGraphic);
        var startpoint = new Point(linePath[0][0], linePath[0][1], this.map.spatialReference);
        this.map.centerAndZoom(startpoint, 18);
        //起点添加
        var startx = linePath[0][0];
        var starty = linePath[0][1];
        var startPoint = new Point(startx, starty, this.map.spatialReference);
        var startPointSymbol = new PictureMarkerSymbol(this.root + config.IMG_startpoint, 23, 23);
        var startPointGraphic = new Graphic(startPoint, startPointSymbol);
        allPathGraphicLayer.add(startPointGraphic);
        //终点添加
        var endx = linePath[linePath.length - 1][0];
        var endy = linePath[linePath.length - 1][1];
        var endPoint = new Point(endx, endy, this.map.spatialReference);
        var endPointSymbol = new PictureMarkerSymbol(this.root + config.IMG_endpoint, 23, 23);
        var endPointGraphic = new Graphic(endPoint, endPointSymbol);
        allPathGraphicLayer.add(endPointGraphic);
    }

    //获取分段轨迹索引
    requestCarSectionPathIndex(carID, search_date, targetID, callback) {
        var config = this.config.requestCarSectionPathIndex;
        var toast = this.AppX.runtimeConfig.toast;
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request,
            data: {

                "carid": carID,
                "search_date": search_date

            },
            success: function (result) {
                if (result.code !== 1) {
                    toast.Show(config.message);
                } else if (result.result === "当前用户无轨迹") {
                    toast.Show(config.MSG_null);
                    return;
                } else {
                    callback(result, carID, targetID);
                }

            }.bind(this),
            error: function () {
                toast.Show(config.MSG_error);
            },
            dataType: "json",
        });

    }

    //获取分段轨迹索引回调函数
    requestCarSectionPathIndexCallBack(result, userid, targetID) {
        //初始化巡检分段回放界面
        this.initPathPlayerInterface(result, userid, targetID);
    }


    //初始化轨迹播放界面
    initPathPlayerInterface(result, carid, targetID) {
        var totalCount = result.result.length;//分了几段
        var gpsDatas = result.result;
        var html = "";
        for (var i = 0, length = gpsDatas.length; i < length; i++) {
            var partName = gpsDatas[i].split(" ")[0];//分段名称（'第m段'）
            var timeSpan = gpsDatas[i].split(" ")[1];//时间段
            var template = this.domObj.find(".workerlist #workerpathetemplate").text().trim();
            var data = [carid, i + 1, partName, timeSpan];
            var index = 0;
            var templateReplace = template.replace(/%data/g, function () {
                return (index < data.length) ? (data[index++]) : ""
            });
            html += templateReplace;
        }
        var selector = "." + this.baseClass + " .workerlist " + targetID;
        $(selector).append(html);

        //轨迹播放绑定事件
        $(selector).find("img").bind("click", function (event) {
            var section = $(event.currentTarget).attr("section");
            var carid = $(event.currentTarget).attr("userid");
            var playState = $(event.currentTarget).attr("playstate");
            this.pathPlayImgObj = $(event.currentTarget);
            /*
            *如果未播放轨迹，在回调函数中设置点击的轨迹播放图片状态为play
            * 如果为播放轨迹，点击的轨迹播放图片状态为stop
            */
            if (playState === "stop") {
                $(selector).find("img").attr("playstate", "stop");
                $(selector).find("img").prop("src", "widgets/MapWatching/css/img/player.png");
                //请求某段轨迹
                //获取轨迹图层
                var pathShowGraphicLayer = <GraphicsLayer>this.map.getLayer("worker_pathShowGraphicLayer");
                //清除原有的轨迹点
                pathShowGraphicLayer.clear();
                var pathMoveGraphicLayer = <GraphicsLayer>this.map.getLayer("worker_pathMoveGraphicLayer");
                //清除原有的轨迹点
                pathMoveGraphicLayer.clear();
                // this.pathShowGraphicLayer.clear();
                // this.pathMoveGraphicLayer.clear();
                // this.requestWorkerSectionPath(userID, section, "2017/6/16", this.requestSectionWorkerPathCallBack.bind(this));
                this.requestWorkerSectionPath(carid, section, this.today, targetID, this.requestSectionWorkerPathCallBack.bind(this));
            } else {
                $(selector).find("img").attr("playstate", "stop");
                $(selector).find("img").attr("src", "widgets/MapWatching/css/img/player.png");
                this.animationQueue.stop();
            }
        }.bind(this))
    }


    //获取车辆分轨迹，并播放
    requestWorkerSectionPath(carid, section, searchDate, targetID, callBack) {
        var config = this.config.requestWorkerSectionPath;
        var toast = this.AppX.runtimeConfig.toast;
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request,
            data: {
                "carid": carid,
                "section": section,
                "search_date": searchDate


            },
            success: function (result) {
                if (result.code !== 1) {
                    toast.Show(config.MSG_error);
                } else if (result.result === "当前用户无轨迹") {
                    toast.Show(config.MSG_null);
                    return;
                } else {
                    callBack(result, carid, targetID);
                }

            }.bind(this),
            error: function () {
                toast.Show(config.MSG_error);
            },
            dataType: "json",
        });
    }

    //获取分段轨迹回调函数
    requestSectionWorkerPathCallBack(result, userid) {
        this.pathPlayImgObj.attr("playstate", "play");
        this.pathPlayImgObj.attr("src", "widgets/XJCarWatching/css/img/play.png");
        this.pathPlayerResult = result;
        //添加分段轨迹到地图上
        this.addSectionPathToMap(result);
        //回放轨迹
        this.playWorerPath();
    }

    //添加分段轨迹到地图
    addSectionPathToMap(result) {
        //获取轨迹图层
        var pathShowGraphicLayer = <GraphicsLayer>this.map.getLayer("worker_pathShowGraphicLayer");
        //清除原有的轨迹点
        pathShowGraphicLayer.clear();
        //设置起点、终点、轨迹线、轨迹点的样式
        // var color = new Color("#" + $('.peopleDetail input.jscolor').val());
        // var startPointSymbol = new PictureMarkerSymbol(this.root + this.config.addPathPointToMap.PNGPATH_Start, 30, 30); //轨迹起点样式
        // var endPointSymbol = new PictureMarkerSymbol(this.root + this.config.addPathPointToMap.PNGPATH_End, 30, 30); //轨迹终点样式
        var currentPoint = new SimpleMarkerSymbol(
            {
                color: new Color("#FFFFFF"),
                style: "cross",       //点样式square|diamond|circle|x
                outline: {
                    color: new Color(this.watchingSetting.pathPointColor),
                    width: 2
                },
                size: this.watchingSetting.pathPointWith
            }
        );
        var lineSymbol = new SimpleLineSymbol({
            // color: new Color("#0000FF"),
            color: new Color(this.watchingSetting.pathLineColor),
            style: "solid",   //线的样式 dash|dash-dot|solid等	
            width: this.watchingSetting.pathLineWith
        });
        //添加轨迹线
        var path = result.result.gps;
        var linePath: Array<any> = [];
        for (var i = 0, length = path.length; i < length; i++) {
            var pathPoint = [];
            pathPoint.push(path[i].location_longitude);
            pathPoint.push(path[i].location_latitude);
            linePath.push(pathPoint);
        }
        var polyline = new Polyline({
            "paths": [linePath],
            "spatialReference": this.map.spatialReference
        });
        var lineGraphic = new Graphic(polyline, lineSymbol);
        pathShowGraphicLayer.add(lineGraphic);
        //添加起点、终点、轨迹点
        var startPoint = new Point(path[0].location_longitude, path[0].location_latitude, this.map.spatialReference);//轨迹起点
        // var startGraphic = new Graphic(startPoint, startPointSymbol);
        // this.pathShowGraphicLayer.add(startGraphic);
        for (var i = 1, length = path.length; i < length - 1; i++) {
            var point = new Point(path[i].location_longitude, path[i].location_latitude, this.map.spatialReference);
            var graphic = new Graphic(point, currentPoint);
            pathShowGraphicLayer.add(graphic);
        }
        // var endPoint = new Point(path[length - 1].location_longitude, path[length - 1].location_latitude, this.map.spatialReference);  //轨迹终点
        // var endGraphic = new Graphic(endPoint, endPointSymbol);
        // this.pathShowGraphicLayer.add(endGraphic);
        this.map.centerAndZoom(startPoint, 17);
    }


    //回放轨迹
    playWorerPath() {
        this.animationQueue = new AnimationQueue(null);
        this.playPointX = [];
        this.playPointY = [];
        this.xspan = [];
        this.yspan = [];
        this.pathindex = 0;
        var info = this.pathPlayerResult.result.gps;
        for (var i = 1, length = info.length; i < length; i++) {
            var startTime = Date.now();
            var gpsTimespan = 3000;
            var latitude = info[i].location_latitude;//x
            var longitude = info[i].location_longitude;
            var startPoint = [info[i - 1].location_longitude, info[i - 1].location_latitude];
            var endPoint = [longitude, latitude];
            var xspan = endPoint[0] - startPoint[0];
            var yspan = endPoint[1] - startPoint[1];
            this.playPointX.push(startPoint[0]);
            this.playPointY.push(startPoint[1]);
            this.xspan.push(xspan);
            this.yspan.push(yspan);
            var handleFunction = this.getHandleFunction(startPoint, xspan, yspan).bind(this);
            var animation = new Animation(3000, handleFunction.bind(this), null);
            this.animationQueue.append(animation);
        }
        this.animationQueue.flush();
    }

    //轨迹回放回调函数
    getPersonalPathPlayer(event) {
        var animationQueue = new AnimationQueue(null);
        this.playPointX = [];
        this.playPointY = [];
        this.xspan = [];
        this.yspan = [];
        this.pathindex = 0;
        var info = this.pathPlayerResult.result.rows;
        for (var i = 1, length = info.length; i < length; i++) {
            var startTime = Date.now();
            var gpsTimespan = 3000;
            var latitude = info[i].location_latitude;//x
            var longitude = info[i].location_longitude;
            var startPoint = [info[i - 1].location_longitude, info[i - 1].location_latitude];
            var endPoint = [longitude, latitude];
            var xspan = endPoint[0] - startPoint[0];
            var yspan = endPoint[1] - startPoint[1];
            this.playPointX.push(startPoint[0]);
            this.playPointY.push(startPoint[1]);
            this.xspan.push(xspan);
            this.yspan.push(yspan);
            var handleFunction = this.getHandleFunction(startPoint, xspan, yspan).bind(this);
            var animation = new Animation(3000, handleFunction.bind(this), null);
            animationQueue.append(animation);
        }
        animationQueue.flush();

    }

    //返回每段的轨迹处理函数
    getHandleFunction(startPoint, xspan, yspan) {
        var handleFunction = function (p) {
            var pathMoveGraphicLayer = <GraphicsLayer>this.map.getLayer("worker_pathMoveGraphicLayer");
            var x = startPoint[0] + xspan * p;
            var y = startPoint[1] + yspan * p;
            pathMoveGraphicLayer.clear();
            var point = new Point(x, y, this.map.spatialReference);
            var graphic = new Graphic(point, this.symbol.pathPlayer);
            pathMoveGraphicLayer.add(graphic);

        }
        return handleFunction;
    }


    // /*
    // * 添加所有轨迹到地图
    // */

    // //请求所有巡检人员的轨迹
    // requestAllPath(pageindex, pagesize, uploadtime1, callBack) {
    //     var config = this.config.requestAllPath;
    //     var toast = this.AppX.runtimeConfig.toast;
    //     $.ajax({
    //         headers: {
    //             'Token': AppX.appConfig.xjxj,
    //             'departmentid': AppX.appConfig.departmentid,
    //         },
    //         type: "POST",
    //         url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_Query,
    //         data: {
    //             "pageindex": pageindex,
    //             "pagesize": pagesize,
    //             "uploadtime1": uploadtime1 + "00:00:00",
    //             "uploadtime2": uploadtime1 + "30:00:00"
    //         },
    //         success: function (result) {
    //             if (result.code !== 1) {
    //                 toast.Show(config.MSG_Error);
    //             } else if (result.result.rows.length === 0) {
    //                 toast.Show(config.MSG_Null);
    //             } else {
    //                 callBack(result);
    //             }

    //         }.bind(this),
    //         error: function () {
    //             toast.Show(config.MSG_Error);
    //         }.bind(this),
    //         dataType: "json"
    //     });
    // }

    // //获取所有巡检轨迹回调函数
    // initAllPathInfo(result) {
    //     //添加轨迹graphic到地图
    //     this.addAllPathGraphic(result);
    // }

    // //添加所有巡检轨迹到地图
    // addAllPathGraphic(result) {
    //     var rows = result.result.rows;
    //     for (var i = 0, length = rows.length; i < length; i++) {
    //         var workerPath = rows[i];
    //         if (workerPath.guiji.length !== 0) {
    //             var path = workerPath.guiji;
    //             var linePath: Array<any> = [];
    //             for (var j = 0, pathLength = path.length; j < pathLength; j++) {
    //                 var x = path[j].location_longitude;
    //                 var y = path[j].location_latitude;
    //                 //设置线的path
    //                 var pathPoint = [];
    //                 pathPoint.push(x);
    //                 pathPoint.push(y);
    //                 linePath.push(pathPoint);
    //             }
    //             var polyline = new Polyline({
    //                 "paths": [linePath],
    //                 "spatialReference": this.map.spatialReference
    //             });
    //             var lineGraphic = new Graphic(polyline, this.symbol.path.oraginalPath);
    //             var allPathGraphicLayer = <GraphicsLayer>this.map.getLayer("worker_allPathGraphicLayer");
    //             allPathGraphicLayer.add(lineGraphic);
    //             // this.pathGraphicLayer.add(lineGraphic);
    //         }
    //     }
    // }

    /*
     * 可通过部门或人员姓名进行查询。
     * 
     */

    //请求部门信息
    requestDepartmentInfo(companyId, callback: Array<any>) {
        var config = this.config.requestDepartmentInfo;
        var toast = this.AppX.runtimeConfig.toast;
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
                "range": AppX.appConfig.range
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request,
            data: {
                "pageindex": 1,
                "pagesize": 100000,
                "companyid": companyId
            },
            success: function (result) {
                if (result.code !== 1) {
                    toast.Show(config.MSG_error);
                } else if (result.result.rows.length === 0) {
                    toast.Show(config.MSG_null);
                } else {
                    for (var i = 0; i < callback.length; i++) {
                        callback[i](companyId, result);
                    }

                }

            }.bind(this),
            error: function () {
                toast.Show(config.MSG_error);
            },
            dataType: "json",
        });
    }

    //初始化人员列表中部门筛选select
    initDepartmentSelect(companyId, result) {
        var rows = result.result.rows;
        var html = "<option value='allDepartment'>所有</option>";
        var template = this.domObj.find("select.department  #departmenttemplate").text();
        for (var i = 0, length = rows.length; i < length; i++) {
            var departmentName = rows[i].name;
            var departmentId = rows[i].id;
            var data = [departmentId, departmentName];
            var index = 0;
            var replaceTemplate = template.replace(/%data/g, function () {
                return (index < data.length) ? (data[index++]) : "";
            })
            html += replaceTemplate
        }
        this.domObj.find("select.department").append(html);
        this.domObj.find("select.department").trigger("change");
    }

    //显示符合条件的人员列表
    displayQualifiedUser(departmentId, userState) {
        if (departmentId === "allDepartment" && userState === "allState") {
            this.domObj.find("div.workerlist div.item").css("display", "block")
        } else if (departmentId === "allDepartment" && userState !== "allState") {
            this.domObj.find("div.workerlist div.item").attr("userstate", function (index, val) {
                if (val === userState) {
                    $(this).css("display", "block")
                    return val;
                } else {
                    $(this).css("display", "none")
                    return val;
                }
            });
        } else if (departmentId !== "allDepartment" && userState === "allState") {
            this.domObj.find("div.workerlist div.item").attr("departmentid", function (index, val) {
                if (val === departmentId) {
                    $(this).css("display", "block")
                    return val;
                } else {
                    $(this).css("display", "none")
                    return val;
                }
            });
        } else {
            this.domObj.find("div.workerlist div.item").attr("userstate", function (index, val) {
                var itemDepartmentId = $(this).attr("departmentid");
                if (val == userState && itemDepartmentId === departmentId) {
                    $(this).css("display", "block")
                    return val;
                } else {
                    $(this).css("display", "none")
                    return val;
                }
            });
        }
    }



    //初始化隐患列表中部门筛选select
    initHideDangerDepartmentSelect(companyId, result) {
        var rows = result.result.rows;
        var html = "<option value='allDepartment'>所有</option>";
        var departmentSelectObj = this.domObj.find("select.hidedangerdepartment");
        var template = departmentSelectObj.find(" #departmenttemplate").text();
        for (var i = 0, length = rows.length; i < length; i++) {
            var departmentName = rows[i].name;
            var departmentId = rows[i].id;
            var data = [departmentId, departmentName];
            var index = 0;
            var replaceTemplate = template.replace(/%data/g, function () {
                return (index < data.length) ? (data[index++]) : "";
            })
            html += replaceTemplate
        }
        departmentSelectObj.append(html);
        // departmentSelectObj.change(function () {
        //     var departmentId = departmentSelectObj.find("option:selected").val();
        //     this.domObj.find(" select.hidedangercarNumber option").remove();
        //     this.requestUserInfo(1, 1000, departmentId, this.initUserSelect.bind(this));
        //     //显示当前部门上传的隐患
        //     this.displayHidedangerOfTheDepartment(departmentId);
        // }.bind(this));
        departmentSelectObj.trigger("change");
    }

    //显示某个部门上传的隐患
    displayHidedangerOfTheDepartment(departmentid) {
        this.domObj.find("div.hidedangerlist div.item").attr("departmentid", function (index, val) {
            if (departmentid === "allDepartment") {
                $(this).css("display", "inline-flex")
                return val;
            } else {
                if (val !== departmentid) {
                    $(this).css("display", "none")
                    return val;
                } else {
                    $(this).css("display", "inline-flex")
                    return val;
                }
            }
        })
    }

    // //请求某个部门下的巡检人员信息
    // requestUserInfo(pageIndex, pageSize, departmentId, callback) {
    //     var config = this.config.requestUserInfo;
    //     var toast = this.AppX.runtimeConfig.toast;
    //     if (departmentId === "allDepartment") {
    //         departmentId = "";
    //     }
    //     $.ajax({
    //         headers: {
    //             'Token': AppX.appConfig.xjxj,
    //             'departmentid': AppX.appConfig.departmentid,
    //         },
    //         type: "POST",
    //         url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_Request,
    //         data: {
    //             "pageindex": pageIndex,
    //             "pagesize": pageSize,
    //             "depid": departmentId
    //         },
    //         success: function (result) {
    //             if (result.code !== 1) {
    //                 toast.Show(config.MSG_Error);
    //             } else {
    //                 callback(result);

    //             }
    //         }.bind(this),
    //         error: function () {
    //             toast.Show(config.MSG_Error);
    //         },
    //         dataType: "json",
    //     });
    // }

    //请求某个部门下的巡检人员信息
    requestUserInfo(companyid, departmentId, callback) {
        var config = this.config.requestUserInfo;
        var toast = this.AppX.runtimeConfig.toast;
        if (departmentId === "allDepartment") {
            departmentId = "";
        }
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
                "range": AppX.appConfig.range
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_Request,
            data: {
                "pageindex": 1,
                "pagesize": 100000,
                "companyid": companyid,
                "depid": departmentId
            },
            success: function (result) {
                callback(result)
            }.bind(this),
            error: function () {
                toast.Show(config.MSG_error);
            },
            dataType: "json",
        });
    }

    initUserSelect(result) {
        var rows = result.result.rows;
        var html = "<option value=\"allWorker\">所有</option>";
        var userSelectObj = this.domObj.find("select.hidedangercarNumber");
        var template = userSelectObj.find("#usertemplate").text().trim();
        for (var i = 0, length = rows.length; i < length; i++) {
            var carNumber = rows[i].carNumber;
            if (carNumber != "管理员") {
                var userId = rows[i].userid;
                var data = [userId, carNumber];
                var index = 0;
                var replaceTemplate = template.replace(/%data/g, function () {
                    return (index < data.length) ? (data[index++]) : "";
                })
                html += replaceTemplate
            }
        }
        userSelectObj.append(html);

        userSelectObj.change(function () {
            var userid = userSelectObj.find("option:selected").val();
            var departmentid = this.domObj.find("select.hidedangerdepartment").find("option:selected").val();
            //显示该用户上传的隐患
            this.displayHidedangerOfUser(departmentid, userid);
        }.bind(this));
        userSelectObj.trigger("change");
    }


    //显示某个用户上传的隐患
    displayHidedangerOfUser(departmentid, userid) {
        var hidedangerlistItemObj = this.domObj.find("div.hidedangerlist div.item");
        if (userid === "allWorker") {
            hidedangerlistItemObj.attr("departmentid", function (index, val) {
                if (departmentid === "allDepartment") {
                    $(this).css("display", "inline-flex")
                    return val;
                } else {
                    if (val !== departmentid) {
                        $(this).css("display", "none")
                        return val;
                    } else {
                        $(this).css("display", "inline-flex")
                        return val;
                    }
                }

            });
        } else {
            hidedangerlistItemObj.attr("userid", function (index, val) {
                if (val !== userid) {
                    $(this).css("display", "none")
                    return val;
                } else {
                    $(this).css("display", "inline-flex")
                    return val;
                }

            })
        }
    }




    /*
     * 初始化图层管理模块
     */
    initBaseLayerInfo(companyId) {
        //添加graphic到图层
        this.addBaseLayerToLayer(companyId);
        //选择截至今天还是今天图层数据切换事件
        this.domObj.find(".pipe-layers-control input").on("click", function (event) {
            var layerId = [];
            layerId.push($(event.currentTarget).parents("li").attr('layerName'));
            var dataType = $(event.currentTarget).attr("datatype");
            this.switchLayerData(dataType, layerId);

        }.bind(this));
    }

    addBaseLayerToLayer(companyId) {
        var config = this.config.initBaseLayer;
        var headers = {
            'Token': AppX.appConfig.xjxj,
            'departmentid': AppX.appConfig.departmentid,
            "range": AppX.appConfig.range
        };

        //第三方工地图层
        var buildSiteUrl = AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_buildsite;
        var data = {
            "pageindex": 1,
            "pagesize": 100000,
            "search_date": this.today,
            "check_state": "0,2",
            "monitor_state": 1,
            "companyid": companyId
        };
        var buildSiteInfoInterface = new BackGroundInterface(buildSiteUrl, headers, data, this.requestBuildSiteInfoCallback.bind(this));
        //巡检点
        // this.xjPointGraphicLayer = new XJGraphicLayer(this.map, config.xjpoint_layerid);
        var xjPointUrl = AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_xjpoint;
        var xjpointData = {
            "pageindex": 1,
            "pagesize": 100000,
            "device_type_id": 1,
            "search_date": this.today,
            "monitor_state": 1,
            "companyid": companyId
        };
        var xjPointInfoInterface = new BackGroundInterface(xjPointUrl, headers, xjpointData, this.requestXJpointInfoCallback.bind(this));
        //巡检线
        // this.xjLineGraphicLayer = new XJGraphicLayer(this.map, config.xjline_layerid);
        var xjLineUrl = AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_xjpoint;
        var xjLineData = {
            "pageindex": 1,
            "pagesize": 100000,
            "device_type_id": 6,
            "search_date": this.today,
            "monitor_state": 1,
            "companyid": companyId
        };
        var xjLineInfoInterface = new BackGroundInterface(xjLineUrl, headers, xjLineData, this.requestXJLineInfoCallback.bind(this));
        //巡检片区
        // this.xjRegionGraphicLayer = new XJGraphicLayer(this.map, config.xjregion_layerid);
        var xjRegionUrl = AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_region;
        var xjRegionData = {
            "pageindex": 1,
            "pagesize": 100000,
            "search_date": this.today,
            "monitor_state": 1,
            "companyid": companyId

        };
        var xjRegionInfoInterface = new BackGroundInterface(xjRegionUrl, headers, xjRegionData, this.requestXJRegionInfoCallback.bind(this));

    }

    requestBuildSiteInfoCallback(result) {
        var config = this.config.requestBuildSiteInfoCallback;
        var symbol = new PictureMarkerSymbol(this.root + config.URL_symbol, 50, 50)
        var buildSiteGraphicLayer = <GraphicsLayer>this.map.getLayer("GraphicLayer_buildsite");
        var rows = result.result.rows;
        for (var i = 0, length = rows.length; i < length; i++) {
            var x = rows[i].lng;
            var y = rows[i].lat;
            var point = new Point(x, y, this.map.spatialReference);
            // var infoTemplate = new InfoTemplate({
            //     title: "巡检点信息",
            //     content: this.template.split('$$')[6]
            // });
            // var graphic = new Graphic(point, symbol, "", infoTemplate);
            var graphic = new Graphic(point, symbol);
            var creatTime = rows[i].create_time.split(" ")[0];
            graphic.setAttributes({
                "time": creatTime
            });
            buildSiteGraphicLayer.add(graphic);
        }
        //显示今天创建的工地台账
        this.domObj.find(".pipe-layers-control input.todaylayer").trigger("click");

    }

    requestXJpointInfoCallback(result) {
        var config = this.config.requestXJpointInfoCallback;
        var symbol = new PictureMarkerSymbol(this.root + config.URL_symbol, 50, 50);
        var XJpointGraphicLayer = <GraphicsLayer>this.map.getLayer("GraphicLayer_xjpoint");
        var rows = result.result.rows;
        var points = [];
        for (var i = 0, length = rows.length; i < length; i++) {
            var x = rows[i].lng;
            var y = rows[i].lat;
            var point = new Point(x, y, this.map.spatialReference);
            // var infoTemplate = new InfoTemplate({
            //     title: "巡检点信息",
            //     content: this.template.split('$$')[6]
            // });
            // var graphic = new Graphic(point, symbol, "", infoTemplate);
            var graphic = new Graphic(point, symbol);
            var creatTime = rows[i].create_time.split(" ")[0];
            graphic.setAttributes({
                "time": creatTime
            });
            XJpointGraphicLayer.add(graphic);
        }

        //显示今天添加的巡检点
        this.domObj.find(".pipe-layers-control input.todaylayer").trigger("click");
    }

    requestXJLineInfoCallback(result) {
        var config = this.config.requestXJLineInfoCallback;
        var symbol = new SimpleLineSymbol({
            color: new Color("#FF0000"),
            style: "solid",   //线的样式 dash|dash-dot|solid等	
            width: 2
        })
        var XJLineGraphicLayer = <GraphicsLayer>this.map.getLayer("GraphicLayer_xjline");
        var rows = result.result.rows;
        var polylines = [];
        for (var i = 0, length = rows.length; i < length; i++) {
            var polyline = new Polyline(JSON.parse(rows[i].geometry));
            // var infoTemplate = new InfoTemplate({
            //     title: "巡检点信息",
            //     content: this.template.split('$$')[6]
            // });
            // var graphic = new Graphic(polyline, symbol, "", infoTemplate);
            var graphic = new Graphic(polyline, symbol);
            var creatTime = rows[i].create_time.split(" ")[0];
            graphic.setAttributes({
                "time": creatTime
            });
            XJLineGraphicLayer.add(graphic);
        }
        //显示今天添加的片区
        this.domObj.find(".pipe-layers-control input.todaylayer").trigger("click");
    }

    requestXJRegionInfoCallback(result) {
        var config = this.config.requestXJRegionInfoCallback;
        var symbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASHDOT, new Color([255, 0, 0]), 2), new Color([0, 0, 0, 0.1]));
        var XJRegionGraphicLayer = <GraphicsLayer>this.map.getLayer("GraphicLayer_xjregion");
        var rows = result.result.rows;
        var polygons = [];
        for (var i = 0, length = rows.length; i < length; i++) {
            if (rows[i].geometry !== "") {
                var polygon = new Polygon(JSON.parse(rows[i].geometry));
                // var infoTemplate = new InfoTemplate({
                //     title: "巡检点信息",
                //     content: this.template.split('$$')[6]
                // });
                // var graphic = new Graphic(polygon, symbol, "", infoTemplate);
                var graphic = new Graphic(polygon, symbol);
                var creatTime = rows[i].updatetime.split(" ")[0];
                graphic.setAttributes({
                    "time": creatTime
                });
                XJRegionGraphicLayer.add(graphic);
                //添加片区名
            }


        }
        //显示今天添加的巡检片区
        this.domObj.find(".pipe-layers-control input.todaylayer").trigger("click");

    }


    switchLayerData(dataType, baseLayerIds: Array<string>) {
        if (dataType === "today") {
            // var baseLayerIds = this.config.baseLayerIds;

            for (var i = 0, length = baseLayerIds.length; i < length; i++) {
                var graphicLayer = <GraphicsLayer>this.map.getLayer(baseLayerIds[i]);
                if (baseLayerIds[i] !== "GraphicLayer_car") {
                    var graphics = graphicLayer.graphics;
                    for (var j = 0; j < graphics.length; j++) {
                        var createTime = graphics[j].attributes.time;
                        var createTimeMillSecond = new Date(createTime.split("-")[0], parseInt(createTime.split("-")[1]) - 1, createTime.split("-")[2]).getTime();
                        var nowYear = new Date().getFullYear();
                        var nowMoth = new Date().getMonth();
                        var nowDate = new Date().getDate();
                        var todayMillSecond = new Date(nowYear, nowMoth, nowDate).getTime();//毫秒数
                        if (createTimeMillSecond == todayMillSecond) {
                            graphics[j].show();
                        } else {
                            graphics[j].hide();
                        }
                    }
                }
            }

        } else if (dataType === "untiltoday") {
            for (var i = 0, length = baseLayerIds.length; i < length; i++) {
                if (baseLayerIds[i] != "GraphicLayer_car") {
                    var graphicLayer = <GraphicsLayer>this.map.getLayer(baseLayerIds[i]);
                    var graphics = graphicLayer.graphics;
                    for (var j = 0; j < graphics.length; j++) {
                        var createTime = graphics[j].attributes.time;
                        var createTimeMillSecond = new Date(createTime.split("-")[0], parseInt(createTime.split("-")[1]) - 1, createTime.split("-")[2]).getTime();
                        var tomorroMillSecond = new Date().getTime() + 24 * 60 * 60 * 1000;//毫秒数
                        if (createTimeMillSecond < tomorroMillSecond) {
                            graphics[j].show();
                        } else {
                            graphics[j].hide();
                        }
                    }
                }


            }
        }
    }

}


class Animation {
    timespan: number; //时间间隔
    progress: Function; //处理函数
    easing: Function;  // 
    constructor(timespan, process, easing) {
        this.timespan = timespan;
        this.progress = process;
        this.easing = easing || function (p) { return p };
    }
    public start(finished) {
        var startTime = Date.now();//动画开始时间
        var timeSpan = this.timespan;//时间间隔
        var next = true;
        var self = this;
        requestAnimationFrame(function step() {
            var p = (Date.now() - startTime) / timeSpan;
            var next = true;

            if (p < 1.0) {
                self.progress(self.easing(p), p);
            } else {
                if (typeof finished === 'function') {
                    next = finished() === false;
                } else {
                    next = finished === false;
                }

                if (!next) {
                    self.progress(self.easing(1.0), 1.0);
                } else {
                    startTime += timeSpan;
                    self.progress(self.easing(p), p);
                }
            }

            if (next) requestAnimationFrame(step);
        });
    }
}


class AnimationQueue {
    animation;
    state = "play";
    constructor(animation) {
        this.animation = animation || [];
    }
    public append(animation) {
        var args = [].slice.call(arguments);
        this.animation.push.apply(this.animation, args);
    }
    public flush() {
        if (this.animation.length) {
            this.play();
        } else {
            return;
        }
    }
    public play() {
        if (this.state === "play") {
            var animator = this.animation.shift();
            var that = this;
            animator.start(function () {
                if (that.animation.length) {
                    that.play();
                }
            });
        } else {
            return;
        }
    }
    public pause() {
        this.state = "pause";
    }
    public recover() {
        this.state = "play";
    }
    public stop() {
        this.animation = [];
    }
}

class BackGroundInterface {
    url: string;
    headers;
    data;
    callback;
    response;

    constructor(url, headers, data, callback?) {
        this.url = url;
        this.headers = headers;
        this.data = data;
        this.callback = callback || undefined;
        this.sendRequest();
    }

    private sendRequest() {
        $.ajax({
            headers: this.headers,
            type: "POST",
            url: this.url,
            data: this.data,
            success: function (result) {
                if (this.callback === undefined) {
                    this.response = result;
                } else {
                    this.callback(result);
                }
            }.bind(this),
            error: function () {

            },
            dataType: "json",
        });
    }

    public getResponse() {
        return this.response();
    }
}

class XJGraphicLayer {
    layerIds;
    symbol;
    geometries;
    graphicLayer;
    map: Map;
    constructor(map, layerIds) {
        this.layerIds = layerIds;
        this.map = map;
        this.addGraphicLayerToMap();
    }

    //批量按顺序添加图层到地图对象
    private addGraphicLayerToMap() {
        for (var i = 0, length = this.layerIds.length; i < length; i++) {
            //除去原有的图层
            if (this.map.getLayer(this.layerIds[i]) !== undefined) {
                var oaraginalGraphicLayer = this.map.getLayer(this.layerIds[i]);
                this.map.removeLayer(oaraginalGraphicLayer);
            }
            var graphicLayer = new GraphicsLayer();
            graphicLayer.id = this.layerIds[i];
            this.map.addLayer(graphicLayer);
            // this.graphicLayer = graphicLayer;
        }
    }

    public addGraphicsToMap(geometries, symbol) {
        this.geometries = geometries;
        this.symbol = symbol;
        for (var i = 0, length = geometries.length; i < length; i++) {
            var graphic = new Graphic(geometries[i], symbol);
            this.graphicLayer.add(graphic);
        }
    }

    //批量清除图形
    public clearGraphics() {
        for (var i = 0, length = this.layerIds.length; i < length; i++) {
            var graphicLayer = <GraphicsLayer>this.map.getLayer(this.layerIds[i]);
            if (graphicLayer !== undefined) {
                graphicLayer.clear();
            }
        }
    }

    //批量按顺序移除图层
    public removeGraphicLayer() {
        for (var i = 0, length = this.layerIds.length; i < length; i++) {
            var graphicLayer = this.map.getLayer(this.layerIds[i]);
            if (graphicLayer !== undefined) {
                this.map.removeLayer(graphicLayer);
            }
        }

    }
}


/*监控设置类 */
class WatchingSetting {
    id: string;//标识id
    refreshTimeSpan: string;//刷新间隔
    pathLineColor: string;//轨迹线颜色
    pathLineWith: string;//轨迹线宽度
    pathPointColor: string;//轨迹点颜色
    pathPointWith: string;//轨迹点宽度
    _workerPathColor: string;//人巡轨迹线颜色
    _carPathColor: string;//车巡轨迹线颜色
    constructor(refreshTimeSpan, workerPathColor, carPathColor, pathLineColor, pathLineWith, pathPointColor, pathPointWith) {
        this._workerPathColor = workerPathColor;
        this._carPathColor = workerPathColor;
        this.refreshTimeSpan = refreshTimeSpan;
        this.pathLineColor = pathLineColor;
        this.pathLineWith = pathLineWith;
        this.pathPointColor = pathPointColor;
        this.pathPointWith = pathPointWith;
    }
}

/*隐患类 */
class Hidedanger {
    //上报人员信息
    finder: string;//上报人员
    _finderId: string;//上报人员id
    departmentId: string;//上报人员部门id
    departmentName: string;//上报人员部门
    //隐患信息
    type: string;//隐患类型
    picture: string;//隐患发现图片
    minPicture: string;//隐患发现图片缩略图
    audio: string;//音频
    findNotes: string;//发现时上传的备注
    address: string;//隐患地址
    longitude: number;//经度
    latitude: number;//纬度
    findTime: string;//隐患发现时间
    //隐患处理流程信息
    handleProcess: string;//处于哪个流程
    minClearPicture: string;//隐患清除照片缩略图
    clearPicture: string;//隐患清除照片
    clearNotes: string;//处理后备注
    constructor(finder, finderId, departmentId, departmentName, type, minPicture, picture, audio, findNotes, address, longitude, latitude, findTime, handleProcess, minClearPicture, clearPicture, clearNotes) {
        this.finder = finder;
        this._finderId = finderId;
        this.departmentId = departmentId;
        this.departmentName = departmentName;
        this.type = type;
        this.minPicture = minPicture;
        this.picture = picture;
        this.audio = audio;
        this.findNotes = findNotes;
        this.address = address;
        this.longitude = longitude;
        this.latitude = latitude;
        this.findTime = findTime;
        this.handleProcess = handleProcess;
        this.clearPicture = clearPicture;
        this.minClearPicture = minClearPicture;
        this.clearNotes = clearNotes;
    }

    public getHideDangerListData() {
        //[上报人员部门，上报人，经度，纬度，标题（隐患类型-上报人），隐患类型，隐患发现时间，隐患地址，隐患地址缩写，处理流程,隐患发现图片，隐患清除照片]
        var data = [];

        var oneFindImgSrc = AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + this.picture.split(",")[0];//发现隐患图片（多张只取第一张）
        var findPictureObjArray = [];
        if (this.picture !== "") {
            var findPictureSrc = this.picture.split(",");
            var minFindPictureSrc = this.minPicture.split(",");
            for (var i = 0, length = findPictureSrc.length; i < length; i++) {
                var findPictureObj = {
                    minPitcure: "",
                    picture: ""
                }
                findPictureObj.minPitcure = AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + minFindPictureSrc[i];//隐患处理照片
                findPictureObj.picture = AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + findPictureSrc[i];//隐患处理照片
                findPictureObjArray.push(findPictureObj);
            }


        }
        var clearPictureObjArray = [];
        if (this.clearPicture !== "") {
            var clearPictureSrc = this.clearPicture.split(",");
            var minClearPictureSrc = this.clearPicture.split(",");
            for (var i = 0, length = clearPictureSrc.length; i < length; i++) {
                var clearPictureObj = {
                    minPitcure: "",
                    picture: ""
                }
                clearPictureObj.minPitcure = AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + minClearPictureSrc[i];//隐患处理照片
                clearPictureObj.picture = AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + clearPictureSrc[i];//隐患处理照片
                clearPictureObjArray.push(clearPictureObj);
            }

        }
        var aTitle = this.type + "-" + this.finder;//链接的 title属性
        var subTypeName = this.type;
        if (subTypeName.length > 10) {
            subTypeName = subTypeName.substr(0, 10) + "...";
        }
        var subFindTime = this.findTime.split(" ")[1];
        subFindTime = subFindTime.split(":")[0] + ":" + subFindTime.split(":")[1];
        var address = this.address; //隐患地址
        var subAddress = this.address;
        if (address.length > 10) {
            subAddress = address.substr(0, 10) + "...";
        }
        data = [this.departmentId, this._finderId, this.longitude, this.latitude, aTitle, subTypeName, subFindTime, this.address, subAddress, this.handleProcess, findPictureObjArray.concat(clearPictureObjArray)];
        return data;
    }

    public getHideDangePopupData() {
        //[地址，隐患类型，图片，上报人员，备注,语音，上报时间]
        var data = [];
        var pictureHtml = "无"
        if (this.picture != "") {
            var pictureSrc = this.picture.split(",");
            pictureHtml = ""
            for (var i = 0, length = pictureSrc.length; i < length; i++) {
                var pictureObj = "<li><img src='" + (AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + pictureSrc[i]) + "'/></li>";
                pictureHtml = pictureHtml + pictureObj;
            }
        }
        var audioHtml = "无音频";
        if (this.audio != "") {
            var audioSrc = this.audio.split(",");
            audioHtml = ""
            for (var i = 0, length = audioSrc.length; i < length; i++) {
                var audioObj = "<audio controls='controls' preload='auto'  src='" + (AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + audioSrc[i]) + "'/>";
                audioHtml = audioHtml + audioObj;
            }
        }
        data = [this.address, this.type, pictureHtml, this.finder, this.findNotes, audioHtml, this.findTime];
        return data;
    }





}

/*巡检主计划类 */
class XJMainPlan {
    mainPlanId: string;//主计划id
    regionName: string;  //片区名
    deviceTypeName: string;//巡检设备类型（巡检点 、巡检线、隐患点、调压箱、调压柜、阀门、阀井、低压管线、中压管线等）
    executeWorker: string;//计划执行的巡检人员
    startTime: string;//计划开始时间
    endTime: string;//计划结束时间
    accomplishPercent: string;//计划完成百分比
    createTime: string;//创建时间
    createUser: string;//创建人

}

class XJChildPlan {
    startTime;//计划开始时间
    endTime;//计划结束时间

}

/*巡检人员信息*/
class XJWorker {
    _name: string;
    _department: string;
    _x: number;
    _y: number;
    _onTime: string;
    _offTime: string;
    _avatorSrc: string;//头像地址
    _newJournal: string;//最新日志
    stateName: string;//用户状态名
    state: string;//用户状态
    constructor(name, department, x, y, onTime, offTime, avatorSrc, newJournal) {
        this._name = name;
        this._department = department;
        this._x = x;
        this._y = y;
        this._onTime = onTime;
        this._offTime = offTime;
        this._avatorSrc = avatorSrc;
        this._newJournal = newJournal;
    }


}

/*巡检车辆信息 */
class CJCar {
    _company: string;//所属公司
    _department: string;//所属部门
    _carNumber: string;//车牌号

}


