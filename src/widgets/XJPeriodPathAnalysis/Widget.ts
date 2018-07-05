import BaseWidget = require('core/BaseWidget.class');
import Functions = require('core/Functions.module');

import Map = require("esri/map");
import GraphicsLayer = require("esri/layers/GraphicsLayer");
import PictureMarkerSymbol = require("esri/symbols/PictureMarkerSymbol");
import DetailPanel = require('widgets/DetailPanel/Widget');
import Color = require("esri/Color");
import SimpleMarkerSymbol = require("esri/symbols/SimpleMarkerSymbol");
import SimpleLineSymbol = require("esri/symbols/SimpleLineSymbol");
import Point = require('esri/geometry/Point');
import Polyline = require("esri/geometry/Polyline");
import Graphic = require("esri/graphic");
import InfoTemplate = require("esri/InfoTemplate");
import Polygon = require('esri/geometry/Polygon');
import graphicsUtils = require('esri/graphicsUtils');
import Extent = require("esri/geometry/Extent");



export = XJPeriodPathAnalysis;

class XJPeriodPathAnalysis extends BaseWidget {
    baseClass = "widget-XJPeriodPathAnalysis";


    userType = " ";//用户类型：总公司(superadmin)，分公司管理员(companyadmin)，分公司部门管理员(departmentadmin)
    map: Map;
    symbol = undefined;//点、线的样式
    pathResult;
    resultPanelObj;//数据面板Obj
    requestHeader;//请求数据的头部
    requestData;//请求数据的data
    watchingSetting: WatchingSetting;//轨迹点和线的配置项信息
    pathAnalysisLayers: XJGraphicLayer;
    queryData = {
        "userid": "",
        "date": "",
        "startTime": "",
        "endTime": ""
    };//查询参数

    pathPlayImgObj;//播放轨迹的img obj



    startup() {


        var html = _.template(this.template.split("$$")[0])();
        this.setHtml(html);
        this.XJPeriodPathAnalysisInit();
    }
    destroy() {
        this.domObj.remove();
        this.afterDestroy();
        this.destroyWidget();
    }


    //关闭模块时回收资源
    destroyWidget() {
        this.pathAnalysisLayers.removeGraphicLayer();
        this.AppX.runtimeConfig.routeplayer.Hide();
    }
    //回到初始状态
    backToInit() {

    }

    //
    XJPeriodPathAnalysisInit() {
        //获取配置项信息
        this.requestWatchingSetting();
        this.map = this.AppX.runtimeConfig.map;
        //判断用户类型
        this.judgeUserType();
        //初始化查询界面
        this.initInterface();
        //添加界面的数据（如公司、部门、人员），查询日期
        this.initBaseData();
        //绑定相应事件（公司和部门下拉改变事件）
        this.initEvent();
        //绑定查询事件
        this.domObj.find(" button.query").bind("click", this.queryClick.bind(this));
        //初始化基础图形，用于显示轨迹和计划
        this.pathAnalysisLayers = new XJGraphicLayer(this.map, this.config.baseLayerIds);
        // //设置轨迹点和线的样式
        // this.symbol = this.setSymbol();


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

    //初始化查询界面,绑定查询事件
    initInterface() {
        switch (this.userType) {
            case "superadmin":
                break;
            case "companyadmin":
                this.domObj.find("div.company").css("display", "none");
                break;
            case "departmentadmin":
                this.domObj.find("div.company").css("display", "none");
                this.domObj.find("div.department").css("display", "none");
                break;
        }

    }


    //初始化基础数据（公司、部门、人员），日期控件
    initBaseData() {
        switch (this.userType) {
            case "superadmin":
                //初始化公司列表
                this.requestCompanyInfo();
                this.requestDepartment(this.AppX.appConfig.departmentid, this.initDepartmentList.bind(this));
                this.requestUserInfo(1, 10000, this.AppX.appConfig.groupid, this.AppX.appConfig.departmentid, this.initUserList.bind(this));
                break;
            case "companyadmin":
                this.requestDepartment(this.AppX.appConfig.groupid, this.initDepartmentList.bind(this));
                this.requestUserInfo(1, 10000, this.AppX.appConfig.groupid, this.AppX.appConfig.departmentid, this.initUserList.bind(this));
                break;
            case "departmentadmin":
                this.requestUserInfo(1, 10000, this.AppX.appConfig.groupid, this.AppX.appConfig.departmentid, this.initUserList.bind(this));
                break;
        }
        //初始化日期控件
        this.dateWeightInit();
    }

    //获取公司信息并设置为当前登录公司
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
                        var itemHtml = "<option companyid='" + companyId + "'>" + companyName + "</option>";
                        html += itemHtml;
                    }

                    //初始化公司下拉选项
                    this.domObj.find("select.company").append(html);
                    //设置选择的为当前公司
                    this.domObj.find("select.company option").attr("companyid", function (index, val) {
                        if (val === AppX.appConfig.departmentid) {
                            $(this).attr("selected", "selected")
                        }
                        return val;
                    });
                }
            }.bind(this),
            error: function (error) {
                console.log(config.MSG_error);
            }.bind(this),
            dataType: "json",
        });
    }


    //请求部门信息
    requestDepartment(companyId, callback: Function) {
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
                "pagesize": 1000000,
                "companyid": companyId
            },
            success: function (result) {
                if (result.code !== 1) {
                    toast.Show(config.MSG_error);
                } else if (result.result.rows.length === 0) {
                    toast.Show(config.MSG_null);
                } else {
                    callback(result, companyId);
                }

            }.bind(this),
            error: function () {
                toast.Show(config.MSG_error);
            },
            dataType: "json",
        });
    }


    //初始化部门列表
    initDepartmentList(result, companyId) {
        var rows = result.result.rows;
        var html = "<option value='allDepartment'>全部</option>";
        var template = this.domObj.find("#departmentList").text();
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
    }

    //请求巡检人员信息
    requestUserInfo(pageindex, pagesize, departmentId, companyId, callback) {
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
                "companyid": companyId,
                "depid": departmentId,
                "pageindex": pageindex,
                "pagesize": pagesize,

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

    //初始化巡检人员列表
    initUserList(result) {
        var config = this.config.initUserList;
        var rows = result.result.rows;
        var html = "";
        var template = this.domObj.find(" #userList").text().trim();
        for (var i = 0, length = rows.length; i < length; i++) {
            var userName = rows[i].username;
            var userId = rows[i].userid;
            var data = [userId, userName];
            var index = 0;
            var replaceTemplate = template.replace(/%data/g, function () {
                return (index < data.length) ? (data[index++]) : "";
            })
            html += replaceTemplate
        }
        this.domObj.find(" select.userName").append(html);
    }


    //初始化日期控件
    dateWeightInit() {
        //jquery 日期控件初始化
        this.domObj.find("input.startTime").jeDate({
            format: 'YYYY-MM-DD ', //日期格式  
            isinitVal: true,
            // maxDate: $.nowDate(0),
            hmsSetVal: { hh: "7", mm: "00", ss: "00" },
            choosefun: function (elem, val) {
                this.startDate = val;
            }.bind(this)
        })
        this.domObj.find("input.endTime").jeDate({
            format: 'YYYY-MM-DD ', //日期格式  
            // maxDate: $.nowDate(0),
            isinitVal: true,
            // initAddVal: [-2, "hh"],
            hmsSetVal: { hh: 23, mm: 59, ss: 59 },
            choosefun: function (elem, val) {
                this.endDate = val;
            }.bind(this)
        })

    }


    //
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

                }
            }.bind(this),
            error: function (error) {
                toast.Show(config.MSG_error);
            },
            dataType: "json",
        });
    }
    /*
    *初始化轨迹查询界面
    *1. 初始化人员选择界面
    *2. 初始化时间段选择界面
    */





    initEvent() {
        //绑定公司下拉改变事件
        this.domObj.find("select.company").change(function (this) {
            this.domObj.find("select.department option").remove();
            this.domObj.find("select.userName option").remove();
            var companyId = this.AppX.appConfig.departmentid;
            if (this.domObj.find("select.company option:selected").length !== 0) {
                companyId = this.domObj.find("select.company option:selected").attr("companyid")
            }
            this.requestDepartment(companyId, this.initDepartmentList.bind(this));
            this.requestUserInfo(1, 10000, this.AppX.appConfig.groupid, companyId, this.initUserList.bind(this));
        }.bind(this));
        //部门 select change事件
        this.domObj.find("select.department").change(function () {
            this.domObj.find("select.userName option").remove();
            var companyId = this.domObj.find("select.company option:selected").attr("companyid");
            var departmentId = this.domObj.find("select.department").find("option:selected").val();
            this.requestUserInfo(0, 0, departmentId, companyId, this.initUserList.bind(this));
        }.bind(this));
    }


    /*
     * 设置轨迹分析点、线以及高亮点，巡检计划点的样式
     */

    //设置轨迹点和线的样式
    setSymbol() {
        var config = this.config.setSymbol;
        var symbol = {
            startPointSymbol: undefined,
            endPointSymbol: undefined,
            checkPointSymbol: undefined,
            pointSymbol: undefined,
            carLineSymbol: undefined,
            lineSymbol: undefined,
            highlightLineSymbol: undefined,
            highlightPointSymbol: undefined,
            planCheckedPointSymbol: undefined,
            planCheckingPointSymbol: undefined,
            planCheckedLineSymbol: undefined,//已检线样式
            planCheckingLineSymbol: undefined//未检线样式

        }
        //轨迹起点样式
        symbol.startPointSymbol = new PictureMarkerSymbol(this.root + config.IMG_startpoint, 23, 23);
        //轨迹终点样式
        symbol.endPointSymbol = new PictureMarkerSymbol(this.root + config.IMG_endpoint, 23, 23);
        //轨迹终点样式
        symbol.checkPointSymbol = new PictureMarkerSymbol(this.root + config.IMG_checkpoint, 23, 23);
        //点的样式
        symbol.pointSymbol = new SimpleMarkerSymbol(
            {
                color: new Color("#FFFFFF"),
                style: "cross",       //点样式square|diamond|circle|x
                outline: {
                    color: new Color("#FF0000"),
                    width: 1
                },
                size: 5
            }
        );
        //人巡线的样式
        symbol.lineSymbol = new SimpleLineSymbol({
            color: new Color("#0000FF"),
            style: "solid",   //线的样式 dash|dash-dot|solid等	
            width: 1
        });
        //车巡线的样式
        symbol.carLineSymbol = new SimpleLineSymbol({
            color: new Color("#00FFcc"),
            style: "solid",   //线的样式 dash|dash-dot|solid等	
            width: 2
        });
        //高亮巡检点的样式
        symbol.highlightPointSymbol = new SimpleMarkerSymbol(
            {
                color: new Color("#00FF00"),
                style: "cross",       //点样式square|diamond|circle|x
                outline: {
                    color: new Color("#00FF00"),
                    width: 1
                },
                size: 7
            }
        );
        //高亮线的样式
        symbol.highlightLineSymbol = new SimpleLineSymbol({
            color: new Color("#00FF00"),
            style: "solid",   //线的样式 dash|dash-dot|solid等	
            width: 1
        });
        //计划已检点样式
        symbol.planCheckedPointSymbol = new PictureMarkerSymbol(this.root + config.PNGPATH_CheckedPointPng, 45, 45);
        //计划未检点样式
        symbol.planCheckingPointSymbol = new PictureMarkerSymbol(this.root + config.PNGPATH_CheckingPointPng, 45, 45);
        //计划已检线样式
        symbol.planCheckedLineSymbol = new SimpleLineSymbol({
            color: new Color("#6eb1e6"),
            style: "solid",   //线的样式 dash|dash-dot|solid等	
            width: 3
        });
        //计划未检线样式
        symbol.planCheckingLineSymbol = new SimpleLineSymbol({
            color: new Color("#ff0000"),
            width: 3,
            style: "solid"
        })

        return symbol;
    }



    /*
    *按人员和时间段进行轨迹分析
    *
    */
    //查询点击事件
    queryClick(event) {
        this.getQueryParms();
        this.domObj.css("display", "none");
        var html = _.template(this.template.split("$$")[1])();
        this.setHtml(html);

        //绑定返回事件
        $(".XJPeriodPathAnalysis-result .backup").on("click", function (event) {
            $(".XJPeriodPathAnalysis-result").remove();
            this.domObj.css("display", "block");
            //清除数据
            this.AppX.runtimeConfig.routeplayer.Hide();
            ;

        }.bind(this));

        //获取轨迹分析结果
        this.requestWorkerSectionPathIndex(this.queryData.userid, this.queryData.startTime, this.queryData.endTime, function (planSections: Array<any>, userid) {
            this.initAllPathList(planSections, userid);
        }.bind(this));
        //获取周期内的计划
        this.requestWorkerAllPlanId(this.queryData.userid, this.queryData.startTime, this.queryData.endTime, function (mainPlanInfos) {
            //添加计划列表
            $(".XJPeriodPathAnalysis-result .allPlan *").remove();
            this.addAllPlanList(mainPlanInfos);
            //添加计划图形
        }.bind(this));

    }

    //获取查询需要的参数，并检查合法性
    getQueryParms() {
        var queryParms: Array<any> = [];
        this.queryData.userid = this.domObj.find("select.userName").find("option:selected").val();
        this.queryData.date = this.domObj.find("input.date").val();
        this.queryData.startTime = this.domObj.find("input.startTime").val();
        this.queryData.endTime = this.domObj.find(" input.endTime").val();
    }

    //获取轨迹分析结果
    requestPathAnalysisResult(pageindex, pagesize, workerId, startTime, endTime, callback) {
        var config = this.config.requestPathAnalysisResult;
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
                "pagesize": pagesize,
                "pageindex": pageindex,
                "userid": workerId,
                "uploadtime1": startTime,
                "uploadtime2": endTime
            },
            success: function (result) {
                this.domObj.find(" button.query").prop("disabled", "");
                this.domObj.find("button.query").text("查询");
                if (result.code !== 1) {
                    toast.Show(config.MSG_error);
                } else if (result.result.rows[0].guiji.length === 0) {
                    if (result.result.pagesize < 1000) {
                        toast.Show(config.MSG_null);
                    }

                } else {
                    var pathAnalysisResults = [];
                    var guiji = result.result.rows[0].guiji;
                    for (var i = 0, length = guiji.length; i < length; i++) {
                        var pathAnalysisResult = {
                            "totalDistance": result.result.total_distance,//总距离
                            "totalTimeSpend": result.result.time_consume,//总耗时
                            "averageSpeed": result.result.average,//平均速度
                            "pointInfo": {
                                "x": guiji[i].location_longitude, //轨迹点经度
                                "y": guiji[i].location_latitude,//轨迹点纬度
                                "checkTime": guiji[i].check_time,//轨迹点手机检测时间
                                "timeSpan": guiji[i].gps_timespan,//距离上一个点耗时
                                "distance": guiji[i].distance == null ? 0 : guiji[i].distance,//距离上一个点距离
                                "speed": guiji[i].gps_speed,//速度
                                "star": guiji[i].gps_star,//卫星颗数
                                "precision": guiji[i].gps_precision,//精度
                                "gpsType": guiji[i].gps_type//人巡、车巡
                            },
                            "total": result.result.total,
                            "pageSize": result.result.pagesize,
                            "pageIndex": result.result.pageindex,
                        }
                        pathAnalysisResults.push(pathAnalysisResult);
                    }
                    callback(pathAnalysisResults);
                    if (this.pageSize < 100000) {
                        //添加巡检人员需巡检的巡检点到地图
                        var checkPointGraphicLayer = <GraphicsLayer>this.map.getLayer("checkPointGraphicLayer");
                        checkPointGraphicLayer.clear();
                        this.requestWorkerCheckPoint(this.queryData.userid, this.queryData.startTime.split(" ")[0], this.queryData.endTime.split(" ")[0]);
                    }

                }

            }.bind(this),
            error: function () {
                toast.Show(config.MSG_error);
                this.domObj.find(" button.query").prop("disabled", "");
                this.domObj.find(" button.query").text("查询");
            },
            dataType: "json",
        });
    }


    //添加轨迹到地图
    addPathToMap(pathAnalysisResults: Array<any>) {
        //清除原有的图形
        var analysisPathGraphicLayer = <GraphicsLayer>this.map.getLayer("analysisPathGraphicLayer");
        analysisPathGraphicLayer.clear();
        //


        //时间段的起点、终点轨迹添加
        var firstPointInfo = pathAnalysisResults[0].pointInfo;
        var firstStartPoint = new Point(firstPointInfo.x, firstPointInfo.y, this.map.spatialReference);
        var firstStartPointGraphic = new Graphic(firstStartPoint, this.symbol.startPointSymbol);
        analysisPathGraphicLayer.add(firstStartPointGraphic);

        var endPointInfo = pathAnalysisResults[pathAnalysisResults.length - 1].pointInfo;
        var endStartPoint = new Point(endPointInfo.x, endPointInfo.y, this.map.spatialReference);
        var endStartPointGraphic = new Graphic(endStartPoint, this.symbol.endPointSymbol);
        analysisPathGraphicLayer.add(endStartPointGraphic);
        var pointRegExp = new RegExp(firstPointInfo.checkTime.split(" ")[0]);
        for (var i = 1, length = pathAnalysisResults.length; i < length; i++) {
            var pointInfo = pathAnalysisResults[i].pointInfo;
            var prePointInfo = pathAnalysisResults[i - 1].pointInfo;
            if (pointRegExp.test(pointInfo.checkTime)) {
                var point = new Point(pointInfo.x, pointInfo.y, this.map.spatialReference);
                var infoTemplate = new InfoTemplate({
                    title: "距离前一个轨迹点的信息",
                    content: this.template.split('$$')[2]
                });
                var graphic = new Graphic(point, this.symbol.pointSymbol, "", infoTemplate);
                graphic.setAttributes({
                    "distance": pointInfo.distance + "m",
                    "time": pointInfo.checkTime,
                    "timespan": pointInfo.timeSpan + "s",
                    "speed": pointInfo.speed + "m/s",
                    "star": pointInfo.star + "个",
                    "precision": pointInfo.precision
                });
                analysisPathGraphicLayer.add(graphic);
            } else {
                pointRegExp = new RegExp(pointInfo.checkTime.split(" ")[0]);
                //终点添加
                var endx = prePointInfo.x;
                var endy = prePointInfo.y;
                var endPoint = new Point(endx, endy, this.map.spatialReference);
                var endPointGraphic = new Graphic(endPoint, this.symbol.endPointSymbol);
                analysisPathGraphicLayer.add(endPointGraphic);
                //起点添加
                var startx = pointInfo.x;
                var starty = pointInfo.y;
                var startPoint = new Point(startx, starty, this.map.spatialReference);
                var startPointGraphic = new Graphic(startPoint, this.symbol.startPointSymbol);
                analysisPathGraphicLayer.add(startPointGraphic);

            }
        }


        //处理轨迹线

        var allPolyline = [];
        var linePath: Array<any> = [];    //设置线的path
        var symbol = undefined;  //线的样式
        var lineRegExp = new RegExp(firstPointInfo.checkTime.split(" ")[0]);
        for (var j = 0, length = pathAnalysisResults.length; j < length; j++) {
            var pathPoint = [];
            var pointInfo = pathAnalysisResults[j].pointInfo;
            if (j > 0) {
                var prePointInfo = pathAnalysisResults[j - 1].pointInfo;
            }
            if (j == 0 || pointInfo.gpsType == prePointInfo.gpsType && lineRegExp.test(pointInfo.checkTime)) {
                pathPoint.push(pointInfo.x);
                pathPoint.push(pointInfo.y);
                linePath.push(pathPoint);
                //处理最后一段
                if (j == pathAnalysisResults.length - 1) {
                    switch (prePointInfo.gpsType) {
                        case 0:
                            symbol = this.symbol.lineSymbol;
                            break;
                        case 1:
                            symbol = this.symbol.carLineSymbol;
                            break;

                    }
                    //添加线
                    var polyline = new Polyline({
                        "paths": [linePath],
                        "spatialReference": this.map.spatialReference
                    });
                    var lineGraphic = new Graphic(polyline, symbol);
                    analysisPathGraphicLayer.add(lineGraphic);
                    allPolyline.push(polyline);
                }
            } else {
                if (!lineRegExp.test(pointInfo.checkTime)) {
                    lineRegExp = new RegExp(pointInfo.checkTime.split(" ")[0]);
                }
                switch (prePointInfo.gpsType) {
                    case 0:
                        symbol = this.symbol.lineSymbol;
                        break;
                    case 1:
                        symbol = this.symbol.carLineSymbol;
                        break;

                }
                //添加线
                var polyline = new Polyline({
                    "paths": [linePath],
                    "spatialReference": this.map.spatialReference
                });
                var lineGraphic = new Graphic(polyline, symbol);
                analysisPathGraphicLayer.add(lineGraphic);

                //
                pathPoint = [];
                linePath = [];
                pathPoint.push(pointInfo.x);
                pathPoint.push(pointInfo.y);
                linePath.push(pathPoint);
                allPolyline.push(polyline);
            }
        }

        //定位到轨迹范围
        var xmin: number = 0;
        var xmax: number = 0;
        var ymin: number = 0;
        var ymax: number = 0;
        for (var i = 0, allPolylinelength = allPolyline.length; i < allPolylinelength; i++) {
            var extent = allPolyline[i].getExtent();
            console.log(extent);
            if (i == 0) {
                xmin = extent.xmin;
                xmax = extent.xmax;
                ymin = extent.ymin;
                ymax = extent.ymax;
            } else {
                if (extent.xmin < xmin) {
                    xmin = extent.xmin;
                }
                if (extent.xmax > xmax) {
                    xmax = extent.xmax;
                }
                if (extent.ymin < ymin) {
                    ymin = extent.ymin;
                }
                if (extent.ymax > ymax) {
                    ymax = extent.ymax;
                }
            }

        }
        var width = xmax - xmin;
        var height = ymax - ymin;
        xmin = xmin - width / 2;
        xmax = xmax + width / 2;
        ymin = ymin - height / 2;
        ymax = ymax + height / 2;
        var resultExtent = new Extent(xmin, ymin, xmax, ymax, this.map.spatialReference);
        this.map.setExtent(resultExtent);

    }





    /*
   * 查看单个巡检人员的计划，及完成情况，用于和巡检轨迹对比
   */



    //获取巡检人员巡检计划包含今天的所有巡检计划id
    requestWorkerAllPlanId(userid, startTime, endTime, callback) {
        var config = this.config.requestWorkerAllPlanId;
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
                "user_id": userid,
                "plan_begindate": startTime,
                "plan_enddate": endTime,
                "plan_state": "1,2,3,4,5"//2：正在执行，3：已完成，4：超时未完成，5：申请转移

            },
            success: function (response) {

                if (response.code != 1) {
                    console.log(config.MSG_error);
                    return;
                } else if (response.result.length === 0) {
                    console.log(config.MSG_null);
                    return;
                } else {
                    var rows = response.result.rows;
                    var planInfos = []
                    for (var i = 0, length = rows.length; i < length; i++) {
                        var planInfo = {
                            "childPlanId": rows[i].child_plan_id, //巡检主计划id
                            "regionName": rows[i].region_name,//片区名
                            "beginDate": rows[i].plan_begindate.split(" ")[0], //巡检计划开始时间
                            "endDate": rows[i].plan_enddate.split(" ")[0],//巡检计划结束时间
                            "periodName": rows[i].period_name,//巡检方式
                            "deviceTypeName": rows[i].device_type_name,//巡检设备类型
                            "type": rows[i].type,//巡检类型
                            "percent": rows[i].percent,//计划完成量   
                        }
                        planInfos.push(planInfo);
                    }
                    callback(planInfos);
                }
            }.bind(this),
            error: function () {
                toast.Show(config.MSG_error);
            },
            dataType: "json",
        });
    }

    //添加所有计划列表
    addAllPlanList(planInfos: Array<any>) {
        for (var i = 0, length = planInfos.length; i < length; i++) {
            var timtSpan = planInfos[i].beginDate.split("-")[1] + "-" + planInfos[i].beginDate.split("-")[2] + "->" + planInfos[i].endDate.split("-")[1] + "-" + planInfos[i].endDate.split("-")[2];//巡检周期
            var type = "";//巡检方式
            if (planInfos[i].type == 0) {
                type = "人巡";
            } else if (planInfos[i].type == 1) {
                type = "车巡";
            }
            //初始化主计划信息（片区，巡检方式，巡检日期，完成量）
            var html = "";
            var template = this.template.split("$$")[2];

            var textOfLink = planInfos[i].deviceTypeName + "(" + timtSpan + ")";
            var subTitle = planInfos[i].deviceTypeName + "(" + type + "," + planInfos[i].regionName + "," + planInfos[i].periodName + ")";
            var cllapseTarget = "mainplan" + planInfos[i].childPlanId;
            var complishPercent = (planInfos[i].percent * 100).toFixed(1) + "%";//巡检计划完成量
            var mainData = [planInfos[i].childPlanId, cllapseTarget, subTitle, textOfLink, complishPercent, complishPercent, cllapseTarget];

            var mainIndex = 0;
            html = template.replace(/%data/g, function () {
                return (mainIndex < mainData.length) ? (mainData[mainIndex++]) : ""
            });
            $(".XJPeriodPathAnalysis-result .allPlan").append(html);
        }
        //每一项点击事件
        $(".XJPeriodPathAnalysis-result .allPlan a").on("click", function (e) {

            if ($(event.currentTarget).parents(".workercheckpoint").find("div").hasClass("in")) {
                //清除巡检点
                var pathLayer = <GraphicsLayer>this.map.getLayer("XJPeriodPathAnalysis_plan");
                pathLayer.clear();
               
            } else {
                if ( $(".XJPeriodPathAnalysis-result .allPlan div").hasClass("in")) {
                    $(".XJPeriodPathAnalysis-result .allPlan div.in").collapse("hide");
                }
                //清除原有计划点
                var planLayer = <GraphicsLayer>this.map.getLayer("XJPeriodPathAnalysis_plan");
                planLayer.clear();
                //
                var mainPlanId = $(event.currentTarget).attr("mainplanid");
                this.requestCheckedPoint(mainPlanId, function (childPlanInfos) {
                    this.addWorkerCheckedPointList(childPlanInfos);
                    this.initWorkerCheckedPointList(childPlanInfos);
                }.bind(this));
            }
        }.bind(this));
    }

    //获取某个计划下的巡检点的具体巡检情况
    requestCheckedPoint(mainPlanId, callBack) {
        var config = this.config.requestCheckedPoint;
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
                "child_plan_id": mainPlanId
            },
            success: function (response) {
                if (response.code != 1) {
                    toast.Show(response.message);
                } else if (response.result[0].plan_child_points.length === 0) {
                    toast.Show(config.MSG_null);
                } else {
                    var rows = response.result[0].plan_child_points;
                    var childPlanInfos = [];
                    for (var i = 0, length = rows.length; i < length; i++) {
                        var childPlanInfo = {
                            "childPlanId": rows[i].child_plan_id,
                            "name": rows[i].name,//巡检点、巡检线等巡检设备名称
                            "deviceName": rows[i].device_type_name,//巡检设备类型（）
                            "geometry": rows[i].geometry,//图形
                            "isOver": rows[i].isover,//是否巡检
                            "overDate": rows[i].over_date//已检对应时间
                        }
                        childPlanInfos.push(childPlanInfo);
                    }

                    callBack(childPlanInfos);
                }
            }.bind(this),
            error: function () {
                toast.Show(config.MSG_error);
            },
            dataType: "json",
        });
    }

    //添加巡检点到地图
    addWorkerCheckedPointList(childPlanInfos: Array<any>) {
        var config = this.config.addWorkerCheckedPointList;
        // //清除原有数据（地图数据、列表数据）
        var pathGraphicLayer = <GraphicsLayer>this.map.getLayer("XJPeriodPathAnalysis_plan");
        // pathGraphicLayer.clear();
        //设置样式
        var deviceGraphicSymbol = {
            "checkedPoint": new PictureMarkerSymbol(this.root + config.checked, 45, 45),
            "checkingPoint": new PictureMarkerSymbol(this.root + config.checking, 45, 45),
            "checkedPath": new SimpleLineSymbol({
                color: new Color("#0000ff"),
                style: "solid",   //线的样式 dash|dash-dot|solid等	
                width: 3
            }),
            "checkingPath": new SimpleLineSymbol({
                color: new Color("#ff0000"),
                width: 2,
                style: "solid"
            }),
        }
        for (var i = 0, length = childPlanInfos.length; i < length; i++) {
            var state = childPlanInfos[i].isover;
            var geometryJson = "";//点、线、面
            geometryJson = childPlanInfos[i].geometry;
            var geometry;
            var symbol = undefined;
            if (/paths/.test(geometryJson)) {
                geometry = new Polyline(JSON.parse(geometryJson));
                if (childPlanInfos[i].isOver == 0) {//未检
                    symbol = deviceGraphicSymbol.checkingPath;
                } else {//已检
                    symbol = deviceGraphicSymbol.checkedPath;
                }

            } else if (/rings/.test(geometry)) {
                geometry = new Polygon(JSON.parse(geometryJson));
                if (childPlanInfos[i].isOver == 0) {//未检
                    symbol = deviceGraphicSymbol.checkingPoint;
                } else {//已检
                    symbol = deviceGraphicSymbol.checkedPoint;
                }

            } else {
                geometry = new Point(JSON.parse(geometryJson));
                if (childPlanInfos[i].isOver == 0) {//未检
                    symbol = deviceGraphicSymbol.checkingPoint;
                } else {//已检
                    symbol = deviceGraphicSymbol.checkedPoint;
                }

            }
            //添加巡检设备到地图
            var deviceGraphic = new Graphic(geometry, symbol);
            pathGraphicLayer.add(deviceGraphic);
        }

        //设置范围缩放
        var extent = graphicsUtils.graphicsExtent(pathGraphicLayer.graphics);
        if (extent != null && extent.getWidth() > 0.005) {
            this.map.setExtent(extent.expand(1.5));

        } else {
            var extentCenter = extent.getCenter()
            this.map.centerAndZoom(extentCenter, 11);
        }


    }

    //初始化巡检计划具体完成情况
    initWorkerCheckedPointList(childPlanInfos: Array<any>) {
        $(".XJPeriodPathAnalysis-result #mainplan" + childPlanInfos[0].childPlanId).find(".checkpoints *").remove();
        //
        var itemHtml = "";
        for (var i = 0, length = childPlanInfos.length; i < length; i++) {
            //设备名称
            var name = "--";
            if (childPlanInfos[i].name !== "" && childPlanInfos[i].name !== null) {
                name = childPlanInfos[i].name;
            }

            //
            var devicePng = "";
            var checkedTime = "--";
            var state = childPlanInfos[i].isover;
            var geometryJson = "";//点、线、面
            geometryJson = childPlanInfos[i].geometry;
            var geometry;
            var symbol = undefined;
            if (/paths/.test(geometryJson)) {
                geometry = new Polyline(JSON.parse(geometryJson));
                if (childPlanInfos[i].isOver == 0) {//未检
                    devicePng = "pointChecking.png"
                } else {//已检
                    devicePng = "pointChecked.png";
                    checkedTime = childPlanInfos[i].overDate.split(" ")[1];
                }

            } else if (/rings/.test(geometry)) {
                geometry = new Polygon(JSON.parse(geometryJson));
                if (childPlanInfos[i].isOver == 0) {//未检
                    devicePng = "pointChecking.png"
                } else {//已检
                    devicePng = "pointChecked.png";
                    checkedTime = childPlanInfos[i].overDate.split(" ")[1];
                }

            } else {
                geometry = new Point(JSON.parse(geometryJson));
                if (childPlanInfos[i].isOver == 0) {//未检
                    devicePng = "pointChecking.png"
                } else {//已检
                    devicePng = "pointChecked.png";
                    checkedTime = childPlanInfos[i].overDate.split(" ")[1];
                }

            }
            var itemTemplate = this.template.split("$$")[3];
            var subName = name;
            if (subName.length > 4) {
                subName = subName.substr(0, 4) + "..."
            }
            var data = [devicePng, name + "(" + childPlanInfos[i].deviceName + ")", subName + "(" + childPlanInfos[i].deviceName + ")", checkedTime];
            var index = 0;
            var itemTemplateReplace = itemTemplate.replace(/%data/g, function () {
                return (index < data.length) ? (data[index++]) : "";
            });
            itemHtml += itemTemplateReplace;
        }
        $(".XJPeriodPathAnalysis-result .allPlan " + " #mainplan" + childPlanInfos[0].childPlanId + " .checkpoints").append(itemHtml);
    }

    //获取查询周期内的轨迹分段索引
    requestWorkerSectionPathIndex(userID, startDate, endDate, callback) {
        var config = this.config.requestWorkerSectionPathIndex;
        var toast = this.AppX.runtimeConfig.toast;
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request,
            data: {

                "userid": userID,
                "start_date": startDate,
                "end_date": endDate

            },
            success: function (result) {
                if (result.code !== 1) {
                    toast.Show(config.MSG_error);
                } else if (result.result.length == 0) {
                    toast.Show(config.MSG_null);
                    return;
                } else {
                    var planSections = [];
                    var rows = result.result;
                    for (var i = 0, length = rows.length; i < length; i++) {
                        if (rows[i].ret.length !== 0 && rows[i].ret.length !== "") {
                            var planSection = {
                                "date": rows[i].date.split(" ")[0],
                                "sections": rows[i].ret
                            }
                            planSections.push(planSection);
                        }
                    }


                    callback(planSections, userID);
                }

            }.bind(this),
            error: function () {
                toast.Show(config.MSG_error);
            },
            dataType: "json",
        });

    }

    //初始化周期轨迹分段列表
    initAllPathList(planSections: Array<any>, userId) {
        for (var i = 0, length = planSections.length; i < length; i++) {
            var date = planSections[i].date;
            var template = this.template.split("$$")[4];
            var itemHtml = "";
            var index = 0;
            var data = ["plan" + date, userId, date, "plan" + date];
            var itemTemplateReplace = template.replace(/%data/g, function () {
                return (index < data.length) ? (data[index++]) : "";
            });
            itemHtml += itemTemplateReplace;
            $(".XJPeriodPathAnalysis-result .allPath").append(itemHtml);

            //添加分段信息
            var sections = planSections[i].sections;
            for (var j = 0; j < sections.length; j++) {
                var detailTemplate = this.template.split("$$")[5];
                var itemDetailHtml = "";
                var detailIndex = 0;
                var detailData = [userId, j + 1, sections[j].split(" ")[0], sections[j].split(" ")[1]];
                var templateReplace = detailTemplate.replace(/%data/g, function () {
                    return (detailIndex < detailData.length) ? (detailData[detailIndex++]) : "";
                });
                itemDetailHtml += templateReplace;
                $(".XJPeriodPathAnalysis-result .allPath " + " #plan" + date).append(itemDetailHtml);

            }

        }

        //某一天轨迹链接点击事件
        $(".XJPeriodPathAnalysis-result .allPath h5 a").on("click", function (e) {
            if ($(event.currentTarget).parents(".path-item").find("div").hasClass("in")) {
                var date = $(event.currentTarget).text();
                var pathLayer = <GraphicsLayer>this.map.getLayer("XJPeriodPathAnalysis_path");
                var graphics = pathLayer.graphics;
                for (var i = graphics.length - 1; i > -1; i--) {
                    if (graphics[i].attributes.id == date) {
                        pathLayer.remove(graphics[i]);
                    }
                }
            } else {
                var userId = $(event.currentTarget).attr("userid");
                var date = $(event.currentTarget).text();
                this.requestOneDayPath(userId, date + " 00:00:00", date + " 23:59:59", this.addOneDayPathToMap.bind(this));
            }
        }.bind(this));

        //某一天一段轨迹播放事件
        $(".XJPeriodPathAnalysis-result .allPath .path-sectionpath img").on("click", function (e) {
            var userId = $(event.currentTarget).attr("userid");
            var section = $(event.currentTarget).attr("section");
            var date = $(event.currentTarget).text();
            var playState = $(event.currentTarget).attr("playstate");
            this.pathPlayImgObj = $(event.currentTarget);
            /*
            *如果未播放轨迹，在回调函数中设置点击的轨迹播放图片状态为play
            * 如果为播放轨迹，点击的轨迹播放图片状态为stop
            */
            if (playState === "stop") {
                //清除可能存在的轨迹播放
                this.AppX.runtimeConfig.routeplayer.Hide();
                $(".XJPeriodPathAnalysis-result .allPath .path-sectionpath img").prop("src", "widgets/XJPeriodPathAnalysis/css/img/player.png");
                $(".XJPeriodPathAnalysis-result .allPath .path-sectionpath img").attr("playstate", "stop");

                $(event.currentTarget).attr("playstate", "play");
                // this.requestOneDaySectionPath(userId, section, date, this.requestOneDaySectionPathCallBack.bind(this));
                this.requestOneDaySectionPath("8ADD98D246A5414783B38D1EB6C4988D", "2", "2017/10/11", this.requestOneDaySectionPathCallBack.bind(this));
            } else {
                $(event.currentTarget).attr("playstate", "stop");
                $(event.currentTarget).attr("src", "widgets/XJPeriodPathAnalysis/css/img/player.png");
                this.AppX.runtimeConfig.routeplayer.Hide();
            }

        }.bind(this));
    }

    //获取某一天的轨迹
    requestOneDayPath(userid, uploadtime1, uploadtime2, callBack) {
        var config = this.config.requestOneDayPath;
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
                "pagesize": 1000000,
                "userid": userid,
                "uploadtime1": uploadtime1,
                "uploadtime2": uploadtime2,
                "isvalid": 1
            },
            success: function (result) {
                if (result.code !== 1) {
                    toast.Show(config.MSG_error);
                } else if (result.result.rows.length === 0) {
                    return;
                } else {
                    callBack(result, uploadtime1.split(" ")[0]);
                }

            }.bind(this),
            error: function () {
                toast.Show(config.MSG_error);
            },
            dataType: "json",
        });

    }


    addOneDayPathToMap(result, date) {
        var config = this.config.addOneDayPathToMap;
        var allPathGraphicLayer = <GraphicsLayer>this.map.getLayer("XJPeriodPathAnalysis_path");
        var path = result.result.rows[0].guiji;
        var linePath: Array<any> = [];
        var lineSymbol = new SimpleLineSymbol({
            // color: new Color(this.watchingSetting._workerPathColor),
            color: new Color(this.getColor()),
            style: "solid",   //线的样式 dash|dash-dot|solid等	
            width: this.watchingSetting.pathLineWith
        });
        var carLineSymbol = new SimpleLineSymbol({
            // color: new Color(this.watchingSetting._carPathColor),
            color: new Color(this.getColor()),
            style: "solid",   //线的样式 dash|dash-dot|solid等	
            width: this.watchingSetting.pathLineWith

        });
        var allPolyline = [];
        for (var i = 0, length = path.length; i < length; i++) {
            var pathPoint = [];
            if (i == 0 || path[i].gps_type == path[i - 1].gps_type) {
                pathPoint.push(path[i].location_longitude);
                pathPoint.push(path[i].location_latitude);
                linePath.push(pathPoint);
                //处理最后一段
                if (i == path.length - 1) {
                    if (path[i - 1].gps_type === 0) {
                        symbol = lineSymbol;
                    } else if (path[i - 1].gps_type === 1) {
                        symbol = carLineSymbol;
                    }
                    //添加线
                    var polyline = new Polyline({
                        "paths": [linePath],
                        "spatialReference": this.map.spatialReference
                    });
                    var lineGraphic = new Graphic(polyline, symbol);
                    lineGraphic.setAttributes({ "id": date });
                    allPathGraphicLayer.add(lineGraphic);
                    allPolyline.push(polyline);
                }
            } else if (path[i].gps_type !== path[i - 1].gps_type) {
                var symbol = undefined;
                if (path[i - 1].gps_type === 0) {
                    symbol = lineSymbol;
                } else if (path[i - 1].gps_type === 1) {
                    symbol = carLineSymbol;
                }
                //添加线
                var polyline = new Polyline({
                    "paths": [linePath],
                    "spatialReference": this.map.spatialReference
                });
                var lineGraphic = new Graphic(polyline, symbol);
                lineGraphic.setAttributes({ "id": date });
                allPathGraphicLayer.add(lineGraphic);
                pathPoint = [];
                linePath = [];
                pathPoint.push(path[i].location_longitude);
                pathPoint.push(path[i].location_latitude);
                linePath.push(pathPoint);
                allPolyline.push(polyline);
            }

        }
        // var startpoint = new Point(path[0].location_longitude, path[0].location_latitude, this.map.spatialReference);
        //起点添加
        var startx = path[0].location_longitude;
        var starty = path[0].location_latitude;
        var startPoint = new Point(startx, starty, this.map.spatialReference);
        var startPointSymbol = new PictureMarkerSymbol(this.root + config.IMG_startpoint, 23, 23);
        var startPointGraphic = new Graphic(startPoint, startPointSymbol);
        startPointGraphic.setAttributes({ "id": date });
        allPathGraphicLayer.add(startPointGraphic);
        //终点添加
        var endx = path[path.length - 1].location_longitude;
        var endy = path[path.length - 1].location_latitude;
        var endPoint = new Point(endx, endy, this.map.spatialReference);
        var endPointSymbol = new PictureMarkerSymbol(this.root + config.IMG_endpoint, 23, 23);
        var endPointGraphic = new Graphic(endPoint, endPointSymbol);
        endPointGraphic.setAttributes({ "id": date });
        allPathGraphicLayer.add(endPointGraphic);
        //定位到轨迹范围
        var extent = graphicsUtils.graphicsExtent(allPathGraphicLayer.graphics);
        if (extent != null && extent.getWidth() > 0.005) {
            this.map.setExtent(extent.expand(1.5));

        } else {
            var extentCenter = extent.getCenter()
            this.map.centerAndZoom(extentCenter, 11);
        }

    }

    //获取某天某段轨迹
    requestOneDaySectionPath(userid, section, searchDate, callBack) {
        var config = this.config.requestOneDaySectionPath;
        var toast = this.AppX.runtimeConfig.toast;
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request,
            data: {
                "userid": userid,
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
                    callBack(result);
                }

            }.bind(this),
            error: function () {
                toast.Show(config.MSG_error);
            },
            dataType: "json",
        });
    }


    //获取分段轨迹回调函数
    requestOneDaySectionPathCallBack(result) {
        var pathPlayerConfig = {
            "userlinecolor": this.watchingSetting._workerPathColor,//人巡轨迹颜色，16进制字符串
            "carlinecolor": this.watchingSetting._carPathColor,//车巡轨迹颜色
            "playpointcolor": this.watchingSetting.pathPointColor,//播放轨迹点颜色
            "playlinecolor": this.watchingSetting.pathLineColor,//播放轨迹线颜色
            "pointsieze": parseInt(this.watchingSetting.pathPointWith),//轨迹点大小
            "linezise": parseInt(this.watchingSetting.pathLineWith) //轨迹线宽度
        }
        this.AppX.runtimeConfig.routeplayer.Show(result.result.gps, pathPlayerConfig);
        this.pathPlayImgObj.attr("playstate", "play");
        this.pathPlayImgObj.attr("src", "widgets/MapWatching/css/img/play.png");
    }


    //随机生成16进制颜色值
    getColor() {
        var colorValue = "0,1,2,3,4,5,6,7,8,9,a,b,c,d,e,f";
        var colorArray = colorValue.split(",");
        var color = "#";
        for (var i = 0; i < 6; i++) {
            color += colorArray[Math.floor(Math.random() * 16)]
        }
        return color;
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
