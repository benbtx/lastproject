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



export = XJPathAnalysis;

class XJPathAnalysis extends BaseWidget {
    baseClass = "widget-XJPathAnalysis";

    map: Map;
    pathAnalysisDetailpanel = undefined;//显示详情的数据面板
    symbol = undefined;//点、线的样式
    pathResult;
    pageIndex;//当前显示的为第几页
    pageSize;//每页显示的条数
    resultPanelObj;//数据面板Obj

    userType = " ";//用户类型：总公司(superadmin)，分公司管理员(companyadmin)，分公司部门管理员(departmentadmin)
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



    startup() {


        var html = _.template(this.template.split("$$")[0])();
        this.setHtml(html);
        this.XJPathAnalysisInit();
    }
    destroy() {
        this.domObj.remove();
        this.afterDestroy();
        this.destroyWidget();
    }


    //关闭模块时回收资源
    destroyWidget() {
        this.pathAnalysisLayers.removeGraphicLayer();
        this.pathAnalysisDetailpanel.destroy();
    }
    //回到初始状态
    backToInit() {

    }

    //
    XJPathAnalysisInit() {
        this.map = this.AppX.runtimeConfig.map;
        //获取配置项信息
        this.requestWatchingSetting();
        //判断用户类型
        this.judgeUserType();
        //初始化查询界面
        this.initInterface();
        //添加界面的数据（如公司、部门、人员），查询日期
        this.initBaseData();
        this.initEvent();
        //绑定查询事件
        this.domObj.find(" button.query").bind("click", this.queryClick.bind(this));
        this.pathAnalysisLayers = new XJGraphicLayer(this.map, this.config.baseLayerIds);
        //设置轨迹点和线的样式
        this.symbol = this.setSymbol();


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
        // //jquery 日期控件初始化
        // this.domObj.find("input.startTime").jeDate({
        //     format: 'YYYY-MM-DD hh:mm', //日期格式  
        //     isinitVal: true,
        //     maxDate: $.nowDate(0),
        //     hmsSetVal: { hh: "7", mm: "00", ss: "00" },
        //     choosefun: function (elem, val) {
        //         this.startDate = val;
        //     }.bind(this)
        // })
        // this.domObj.find("input.endTime").jeDate({
        //     format: 'YYYY-MM-DD hh:mm', //日期格式  
        //     maxDate: $.nowDate(0),
        //     isinitVal: true,
        //     // initAddVal: [-2, "hh"],
        //     hmsSetVal: { hh: 23, mm: 59, ss: 59 },
        //     choosefun: function (elem, val) {
        //         this.endDate = val;
        //     }.bind(this)
        // })
        //jquery 日期控件初始化
        this.domObj.find("input.date").jeDate({
            format: 'YYYY-MM-DD', //日期格式  
            isinitVal: true,
            maxDate: $.nowDate(0),
            choosefun: function (elem, val) {
                this.startDate = val;
            }.bind(this)
        })
        this.domObj.find("input.startTime").jeDate({
            format: 'hh:mm', //日期格式  
            isinitVal: true,
            // initAddVal: [-2, "hh"],
            hmsSetVal: { hh: "7", mm: "00", ss: "00" },
            choosefun: function (elem, val) {
                this.startDate = val;
            }.bind(this)
        })
        this.domObj.find("input.endTime").jeDate({
            format: 'hh:mm', //日期格式  
            isinitVal: true,
            hmsSetVal: { hh: 23, mm: 59, ss: 59 },
            choosefun: function (elem, val) {
                this.startDate = val;
            }.bind(this)
        })
    }






    //添加图层
    addGraphicLayer(layerId) {
        if (this.map.getLayer(layerId) == undefined) {//未添加
            var graphicLayer = new GraphicsLayer();
            graphicLayer.id = layerId;
            this.map.addLayer(graphicLayer);
            return graphicLayer;
        }
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

                    //实时刷新
                    this.clockNumber = window.setInterval(this.setTimeClock.bind(this), refrshTimeSpan);
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
        var disabled = $(event.currentTarget).prop("disabled");
        if (disabled === "disabled") {
            return;
        } else {
            var state = $(event.currentTarget).prop("disabled", "disabled");
            this.domObj.find("button.query").text("查询中...");
            //获取查询参数
            var queryParms = this.getQueryParms();
            //添加查询时间段所有轨迹到地图
            var analysisPathGraphicLayer = <GraphicsLayer>this.map.getLayer("analysisPathGraphicLayer");
            analysisPathGraphicLayer.clear();
            this.requestPathAnalysisResult(1, 1000000, this.queryData.userid, this.queryData.date + " " + this.queryData.startTime, this.queryData.date + " " + this.queryData.endTime, this.addPathToMap.bind(this));
            //分页显示分析结果
            this.pageIndex = 1;
            this.pageSize = 25;
            this.requestPathAnalysisResult(this.pageIndex, this.pageSize, this.queryData.userid, this.queryData.date + " " + this.queryData.startTime, this.queryData.date + " " + this.queryData.endTime, this.initPathAnalysisResultList.bind(this));
            if (this.pathAnalysisDetailpanel !== undefined) {
                this.pathAnalysisDetailpanel.Destroy();
                this.pathAnalysisDetailpanel = undefined;
            }

        }
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
                    if( result.result.pagesize < 1000){
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

    //查询轨迹信息回调函数
    initPathAnalysisResultList(pathAnalysisResults: Array<any>) {
        if ($("#xunjianguijifenxi").length == 0) {
            this.showDetailPanel("xunjianguijifenxi", this.template.split("$$")[1], "巡检轨迹分析结果", "", pathAnalysisResults);
        } else {
            this.onDetailPanelReady(pathAnalysisResults);
        }

    }

    //显示数据面板
    showDetailPanel(panelId, htmlString, title, data, pathAnalysisResults: Array<any>) {
        if (this.pathAnalysisDetailpanel == undefined) {
            this.pathAnalysisDetailpanel = new DetailPanel({
                id: panelId,
                title: title,
                html: htmlString,
                data: data,
                readyCallback: function (event) {
                    this.onDetailPanelReady(pathAnalysisResults)
                }.bind(this),
                destoryCallback: function () {
                    var analysisPathGraphicLayer = <GraphicsLayer>this.map.getLayer("analysisPathGraphicLayer");
                    analysisPathGraphicLayer.clear();
                    var checkPointGraphicLayer = <GraphicsLayer>this.map.getLayer("checkPointGraphicLayer");
                    checkPointGraphicLayer.clear();
                    var highlightPathGraphicLayer = <GraphicsLayer>this.map.getLayer("highlightPathGraphicLayer");
                    highlightPathGraphicLayer.clear();
                    if ($(".widget-halfpanel").length > 0) {
                        $(".widget-halfpanel").css("display", "block");
                    }
                }.bind(this)
            });
        }
    }

    //数据面板初始化完成回调函数
    onDetailPanelReady(result) {
        if ($(".widget-halfpanel").length > 0) {
            $(".widget-halfpanel").css("display", "none");
        }
        //初始化数据面板
        this.initDataTable(result);
        var panelResultObj = $(".XJPathAnalysis-result");
        //选择分页点击事件
        panelResultObj.find(".div-pagetool button.pre").off("click");
        panelResultObj.find(".div-pagetool button.pre").on("click", this.prePage.bind(this)); //上一页请求事件
        panelResultObj.find(" .div-pagetool button.next").off("click");
        panelResultObj.find(".div-pagetool button.next").on("click", this.nextPage.bind(this)); //下一页请求事件
        panelResultObj.find(".div-pagetool button.pageturning").off("click");
        panelResultObj.find(" .div-pagetool button.pageturning").on("click", this.goPage.bind(this)); //跳转请求事件
        panelResultObj.find(".div-pagetool select").on("change", function (event) {
            this.pageSize = panelResultObj.find(".div-pagetool select").find("option:selected").val();
            var queryParms = this.getQueryParms();
            this.requestPathAnalysisResult(this.pageIndex, this.pageSize, this.queryData.userid, this.queryData.date + " " + this.queryData.startTime, this.queryData.date + " " + this.queryData.endTime, queryParms[4], this.initPathAnalysisResultList.bind(this));
        }.bind(this))
    }

    //初始化轨迹分析结果
    initDataTable(pathAnalysisResults: Array<any>) {
        //清空之前的结果
        var resultPanelObj = $(".XJPathAnalysis-result");
        resultPanelObj.find(".detailresult tbody tr").remove();

        //初始化总的分析结果(总路程、总耗时、平均速度)
        var totalDistance = pathAnalysisResults[0].totalDistance.toFixed(2);//千米
        var toatalTime = pathAnalysisResults[0].totalTimeSpend.toFixed(4);//小时
        var toatalSpeed = pathAnalysisResults[0].averageSpeed.toFixed(2);//千米/小时
        resultPanelObj.find(".totalinfo span.distance").text(totalDistance);
        resultPanelObj.find(".totalinfo span.time").text(toatalTime);
        resultPanelObj.find(" .totalinfo span.speed").text(toatalSpeed);

        //初始化分析数据列表
        var mainBoxHtml = "";
        var template = resultPanelObj.find(".detailresult #pathanalysistemplate").text().trim(); //主表格模板
        for (var i = 0, length = pathAnalysisResults.length; i < length; i++) {
            var pointInfo = pathAnalysisResults[i].pointInfo;
            var point = pointInfo.x + "," + pointInfo.y;
            var gpsType = "";
            switch (pointInfo.gpsType) {
                case 0:
                    gpsType = "人巡";
                    break;
                case 1:
                    gpsType = "车巡";
                    break;
                default: break;
            }
            var data = [point, pointInfo.checkTime, pointInfo.distance, pointInfo.timeSpan, pointInfo.speed, pointInfo.star, pointInfo.precision, gpsType];
            var index = 0;
            var templateRepalce = template.replace(/%data/g, function () {
                var itemVal = (index < data.length) ? data[index++] : '';
                return itemVal;
            });
            mainBoxHtml += templateRepalce;
        }
        resultPanelObj.find(".detailresult tbody ").append(mainBoxHtml);
        //显示分页（总记录，每页几条，第几页）
        var total = pathAnalysisResults[0].total;//总记录数
        var pageSize = pathAnalysisResults[0].pageSize
        var pageIndex = pathAnalysisResults[0].pageIndex
        var totalPage = Math.ceil(parseInt(total) / parseInt(pageSize));//总页数
        resultPanelObj.find(".div-pagetool .total").text(total);
        resultPanelObj.find(".div-pagetool .pagesize").text(pageSize);
        resultPanelObj.find(".div-pagetool  span.totalpage").text(totalPage);
        resultPanelObj.find(".div-pagetool  span.currentpage").text(pageIndex);


        resultPanelObj.find(".detailresult tbody tr").bind("click", this.itemClick.bind(this));
        resultPanelObj.find(".detailresult tbody tr").dblclick(this.dbitemClick.bind(this));

    }

    //上一页
    prePage() {
        var panelResultObj = $(".XJPathAnalysis-result");
        var pageIndex = parseInt(panelResultObj.find(".div-pagetool button.current span.currentpage").text());
        var prePage = pageIndex - 1;
        if (prePage < 1) {
            return;
        } else {
            this.pageIndex = prePage;
            var queryParms = this.getQueryParms();

            this.requestPathAnalysisResult(this.pageIndex, this.pageSize, this.queryData.userid, this.queryData.date+" " + this.queryData.startTime, this.queryData.date+" " + this.queryData.endTime, this.initPathAnalysisResultList.bind(this));
        }
    }

    //下一页
    nextPage() {
        var panelResultObj = $(".XJPathAnalysis-result");
        var pageIndex = parseInt(panelResultObj.find(".div-pagetool button.current span.currentpage").text());
        var totalPage = parseInt(panelResultObj.find(".div-pagetool button.current span.totalpage").text());
        var nextPage = pageIndex + 1;
        if (nextPage > totalPage) {
            return;
        } else {
            this.pageIndex = nextPage;
            var queryParms = this.getQueryParms();
            this.requestPathAnalysisResult(this.pageIndex, this.pageSize, this.queryData.userid, this.queryData.date + this.queryData.startTime, this.queryData.date + this.queryData.endTime, this.initPathAnalysisResultList.bind(this));
        }
    }

    //跳转到另外一页
    goPage() {
        var panelResultObj = $(".XJPathAnalysis-result");
        var pageIndex = parseInt(panelResultObj.find(" .div-pagetool div.go input.currpage").val());
        var totalPage = parseInt(panelResultObj.find(" .div-pagetool button.current span.totalpage").text());
        var goPage = pageIndex;
        if (goPage > totalPage || goPage < 1) {
            return;
        } else {
            this.pageIndex = goPage;
            var queryParms = this.getQueryParms();
            this.requestPathAnalysisResult(this.pageIndex, this.pageSize, this.queryData.userid, this.queryData.startTime, this.queryData.endTime, this.initPathAnalysisResultList.bind(this));
        }
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

    //每行分析数据的点击事件
    itemClick(event, dbclick) {
        $(".XJPathAnalysis-result .detailresult tbody tr").css("background-color", "white")
        $(event.currentTarget).css("background-color", "#337ab7");
        var prePoint = $(event.currentTarget).attr("prepoint");
        var point = $(event.currentTarget).attr("point");
        this.hilightPath(point, false);
    }
    dbitemClick(event, dbclick) {
        $(".XJPathAnalysis-result .detailresult tbody tr").css("background-color", "white")
        $(event.currentTarget).css("background-color", "#337ab7");
        var prePoint = $(event.currentTarget).attr("prepoint");
        var point = $(event.currentTarget).attr("point");
        this.hilightPath(point, true);
    }
    //高亮选中点
    hilightPath(point, dbclick) {
        //清除之前的线
        var highlightPathGraphicLayer = <GraphicsLayer>this.map.getLayer("highlightPathGraphicLayer");
        highlightPathGraphicLayer.clear();
        var x = point.split(",")[0];
        var y = point.split(",")[1];
        var highligthPoint = new Point(parseFloat(x), parseFloat(y), this.map.spatialReference)
        var pointGraphic = new Graphic(highligthPoint, this.symbol.highlightPointSymbol)
        highlightPathGraphicLayer.add(pointGraphic);
        if (dbclick == true) {
            this.map.centerAndZoom(highligthPoint, 17);
        }


    }


    /*
   * 查看单个巡检人员的计划，及完成情况，用于和巡检轨迹对比
   */

    //获取巡检人巡检点
    requestWorkerCheckPoint(userid, startTime, endTime) {
        //获取巡检人员巡检计划包含今天的所有巡检计划id
        this.requestWorkerAllPlanId(userid, startTime, endTime, this.requestCheckedPoint.bind(this));
        //

    }

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
                "plan_enddate": endTime

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
                            "mainPlanId": rows[i].plan_id, //巡检主计划id
                            "childPlanId": rows[i].child_plan_id//巡检子计划id
                        }
                        planInfos.push(planInfo);
                    }
                    callback(planInfos, this.addWorkerCheckedPointList.bind(this))
                }
            }.bind(this),
            error: function () {
                toast.Show(config.MSG_error);
            },
            dataType: "json",
        });
    }

    //获取某个计划下的巡检点情况（已检，未检 ）
    requestCheckedPoint(planInfos: Array<any>, callBack) {
        var config = this.config.requestCheckedPoint;
        var toast = this.AppX.runtimeConfig.toast;
        for (var i = 0, length = planInfos.length; i < length; i++) {
            $.ajax({
                headers: {
                    'Token': AppX.appConfig.xjxj,
                    'departmentid': AppX.appConfig.departmentid,
                    "range": AppX.appConfig.range
                },
                type: "POST",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request,
                data: {
                    "plan_id": planInfos[i].mainPlanId,
                    "child_plan_id": planInfos[i].childPlanId,
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
                                "geometry": rows[i].geometry,//图形
                                "isOver": rows[i].isover,//是否巡检
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

    }

    //添加巡检点到地图
    addWorkerCheckedPointList(childPlanInfos: Array<any>) {
        for (var i = 0, length = childPlanInfos.length; i < length; i++) {
            var state = childPlanInfos[i].isOver;
            var geometryJson = "";//点、线、面
            geometryJson = childPlanInfos[i].geometry;
            var geometry;
            var symbol = undefined;
            if (/paths/.test(geometryJson)) {//巡检线
                geometry = new Polyline(JSON.parse(geometryJson));
                if (state == 0) {//未检
                    symbol = this.symbol.planCheckingLineSymbol;
                } else {//已检
                    symbol = this.symbol.planCheckedLineSymbol;
                }

            } else if (/rings/.test(geometry)) {
                geometry = new Polygon(JSON.parse(geometryJson));
                if (state == 0) {//未检
                    symbol = this.symbol.planCheckingPointSymbol;
                } else {//已检
                    symbol = this.symbol.planCheckedPointSymbol;
                }

            } else {
                geometry = new Point(JSON.parse(geometryJson));
                if (state == 0) {//未检
                    symbol = this.symbol.planCheckingPointSymbol;
                } else {//已检
                    symbol = this.symbol.planCheckedPointSymbol;
                }

            }
            //添加巡检设备到地图
            var deviceGraphic = new Graphic(geometry, symbol);
            var checkPointGraphicLayer = <GraphicsLayer>this.map.getLayer("checkPointGraphicLayer");
            checkPointGraphicLayer.add(deviceGraphic);
        }
    }

    //获取查询周期内的轨迹分段索引
    requestPathSectionIndex() {

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
