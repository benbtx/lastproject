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



export = XJCarPathAnalysis;

class XJCarPathAnalysis extends BaseWidget {
    baseClass = "widget-XJCarPathAnalysis";

    map: Map;
    analysisPathGraphicLayer: GraphicsLayer = undefined;
    highlightPathGraphicLayer: GraphicsLayer = undefined;//轨迹高亮图层
    checkPointGraphicLayer: GraphicsLayer = undefined;//巡检点图层
    pathAnalysisDetailpanel = undefined;//显示详情的数据面板
    symbol = undefined;//点、线的样式
    pathResult;
    pageIndex;//当前显示的为第几页
    pageSize;//每页显示的条数
    resultPanelObj;//数据面板Obj

    userType = " ";//用户类型：总公司(superadmin)，分公司管理员(companyadmin)，分公司部门管理员(departmentadmin)
    requestHeader;//请求数据的头部
    requestData;//请求数据的data



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
        this.map.removeLayer(this.analysisPathGraphicLayer);
        this.map.removeLayer(this.highlightPathGraphicLayer);
        this.map.removeLayer(this.checkPointGraphicLayer);
        this.pathAnalysisDetailpanel.destroy();
    }
    //回到初始状态
    backToInit() {

    }

    //
    XJPathAnalysisInit() {
        this.map = this.AppX.runtimeConfig.map;
        //
        //判断用户类型
        this.judgeUserType();
        //初始化查询界面
        this.initInterface();
        //绑定查询事件
        this.domObj.find(" button.query").bind("click", this.queryClick.bind(this));



        //添加用于显示轨迹的图层（轨迹图层、高亮图层）
        this.analysisPathGraphicLayer = this.addGraphicLayer("analysisPathGraphicLayer");
        this.highlightPathGraphicLayer = this.addGraphicLayer("highlightPathGraphicLayer");
        this.checkPointGraphicLayer = this.addGraphicLayer("checkPointGraphicLayer");
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




    //添加图层
    addGraphicLayer(layerId) {
        if (this.map.getLayer(layerId) == undefined) {//未添加
            var graphicLayer = new GraphicsLayer();
            graphicLayer.id = layerId;
            this.map.addLayer(graphicLayer);
            return graphicLayer;
        }
    }


    /*
    *初始化轨迹查询界面
    *1. 初始化人员选择界面
    *2. 初始化时间段选择界面
    */
    //初始化查询界面,绑定查询事件
    initInterface() {

        switch (this.userType) {
            case "superadmin":
                //初始化公司列表
                this.requestCompanyInfo();
                break;
            case "companyadmin":
                this.domObj.find("div.company").css("display", "none");
                this.requestDepartment("", this.initDepartmentList.bind(this));
                break;
            case "departmentadmin":
                this.domObj.find("div.company").css("display", "none");
                this.domObj.find("div.department").css("display", "none");
                this.requestCarInfo(0, 0, AppX.appConfig.groupid, this.initCarList.bind(this));
                break;
        }
        // //初始化部门列表
        // this.initDepartmenInterface();
        //初始化日期控件
        this.dateWeightInit();
    }

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
                    //绑定下拉改变事件
                    this.domObj.find("select.company").change(function (this) {
                        this.domObj.find("select.department option").remove();
                        var companyId = this.domObj.find("select.company option:selected").attr("companyid");
                        this.requestDepartment(companyId, this.initDepartmentList.bind(this));
                    }.bind(this));;
                    //自动触发
                    this.domObj.find("select.company option").attr("companyid", function (index, val) {
                        if (val === AppX.appConfig.departmentid) {
                            $(this).attr("selected", "selected")
                        }
                        return val;
                    });
                    this.domObj.find("select.company ").trigger("change");
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
                    callback(result);
                }

            }.bind(this),
            error: function () {
                toast.Show(config.MSG_error);
            },
            dataType: "json",
        });
    }

    //初始化部门列表
    initDepartmentList(result) {
        var rows = result.result.rows;
        var html = "";
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
        //部门 select change事件
        this.domObj.find("select.department").change(function () {
            var departmentId = this.domObj.find("select.department").find("option:selected").val();
            this.domObj.find("select.userName option").remove();
            this.requestCarInfo(0, 0, departmentId, this.initCarList.bind(this));
        }.bind(this));
        //主动触发
        this.domObj.find("select.department").trigger("change");

    }

    //请求巡检人员信息
    requestCarInfo(pageindex, pagesize, departmentId, callback) {
        var config = this.config.requestCarInfo;
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
                "pageindex": pageindex,
                "pagesize": pagesize,
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

    //初始化巡检人员列表
    initCarList(result) {
        var config = this.config.initCarList;
        var rows = result.result.rows;
        var html = "";
        var template = this.domObj.find(" #userList").text().trim();
        for (var i = 0, length = rows.length; i < length; i++) {
            var carNumber = rows[i].plate_number;
            var carId = rows[i].id;
            var data = [carId, carNumber];
            var index = 0;
            var replaceTemplate = template.replace(/%data/g, function () {
                return (index < data.length) ? (data[index++]) : "";
            })
            html += replaceTemplate

        }
        this.domObj.find("select.userName option").remove();
        this.domObj.find(" select.userName").append(html);


    }

    //初始化日期控件
    dateWeightInit() {
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
            lineSymbol: undefined,
            highlightLineSymbol: undefined,
            highlightPointSymbol: undefined,
            planCheckedPointSymbol: undefined,
            planCheckingPointSymbol: undefined,
            planCheckedLineSymbol: undefined,
            planCheckingLineSymbol: undefined

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
        //线的样式
        symbol.lineSymbol = new SimpleLineSymbol({
            color: new Color("#0000FF"),
            style: "solid",   //线的样式 dash|dash-dot|solid等	
            width: 1
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
            color: new Color("#dddddd"),
            style: "solid",   //线的样式 dash|dash-dot|solid等	
            width: 5
        });
        //计划未检线样式
        symbol.planCheckingLineSymbol = new SimpleLineSymbol({
            color: new Color("#6eb1e6"),
            width: 5,
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
            this.analysisPathGraphicLayer.clear();
            this.requestPathAnalysisResult(1, 1000000, queryParms[0], queryParms[1], queryParms[3], queryParms[4], this.addPathToMap.bind(this));
            //分页显示分析结果
            this.pageIndex = 1;
            this.pageSize = 5;
            this.requestPathAnalysisResult(this.pageIndex, this.pageSize, queryParms[0], queryParms[1], queryParms[3], queryParms[4], this.initPathAnalysisResultList.bind(this));
            //添加巡检人员需巡检的巡检点到地图
            this.checkPointGraphicLayer.clear();
            if (this.pathAnalysisDetailpanel !== undefined) {
                this.pathAnalysisDetailpanel.Destroy();
                this.pathAnalysisDetailpanel = undefined;
            }
            this.requestWorkerCheckPoint(queryParms[0], queryParms[1], queryParms[2]);

        }
    }

    //获取查询需要的参数，并检查合法性
    getQueryParms() {
        var queryParms: Array<any> = [];
        // var departmentId = $(".widget-XJPathAnalysis select.department").find("option:selected").val();
        var carID = this.domObj.find("select.userName").find("option:selected").val();
        var date = this.domObj.find(" input.date").val();
        var dateNow = new Date(date);
        var datenext = new Date(dateNow.getTime() + 24 * 60 * 60 * 1000);
        var dateNext = datenext.getFullYear() + "/" + (datenext.getMonth() + 1) + "/" + datenext.getDate();
        var startTime = this.domObj.find("input.startTime").val();
        var endTime = this.domObj.find(" input.endTime").val();
        queryParms.push(carID, date, dateNext, startTime, endTime);
        return queryParms;
    }

    //获取轨迹分析结果
    requestPathAnalysisResult(pageindex, pagesize, carId, date, startTime, endTime, callback) {
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
                "uploadtime1": date + " " + startTime,
                "uploadtime2": date + " " + endTime,
                "carid": carId,
                'gps_type': 1
            },
            success: function (result) {
                this.domObj.find(" button.query").prop("disabled", "");
                this.domObj.find("button.query").text("查询");
                if (result.code !== 1) {
                    toast.Show(config.MSG_error);
                } else if (result.result.rows.length==0||result.result.rows[0].guiji.length === 0) {
                    toast.Show(config.MSG_null);
                } else {
                    callback(result);
                    // this.initPathAnalysisResultList(result);
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
    initPathAnalysisResultList(result) {
        this.pathResult = result;
        if ($("#xunjianguijifenxi").length == 0) {
            this.showDetailPanel("xunjianguijifenxi", this.template.split("$$")[1], "巡检轨迹分析结果", "");
        } else {
            this.onDetailPanelReady();
        }

    }

    //显示数据面板
    showDetailPanel(panelId, htmlString, title, data) {
        if (this.pathAnalysisDetailpanel == undefined) {
            this.pathAnalysisDetailpanel = new DetailPanel({
                id: panelId,
                title: title,
                html: htmlString,
                data: data,
                readyCallback: this.onDetailPanelReady.bind(this),
                destoryCallback: function () {
                    this.analysisPathGraphicLayer.clear();
                    this.checkPointGraphicLayer.clear();
                    this.highlightPathGraphicLayer.clear();
                    this.pathAnalysisDetailpanel = undefined;
                }.bind(this)
            });
        }
    }

    //数据面板初始化完成回调函数
    onDetailPanelReady() {
        //初始化数据面板
        this.initDataTable(this.pathResult);
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
            this.requestPathAnalysisResult(this.pageIndex, this.pageSize, queryParms[0], queryParms[1], queryParms[3], queryParms[4], this.initPathAnalysisResultList.bind(this));
        }.bind(this))
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

            this.requestPathAnalysisResult(this.pageIndex, this.pageSize, queryParms[0], queryParms[1], queryParms[3], queryParms[4], this.initPathAnalysisResultList.bind(this));
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
            this.requestPathAnalysisResult(this.pageIndex, this.pageSize, queryParms[0], queryParms[1], queryParms[3], queryParms[4], this.initPathAnalysisResultList.bind(this));
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
            this.requestPathAnalysisResult(this.pageIndex, this.pageSize, queryParms[0], queryParms[1], queryParms[3], queryParms[4], this.initPathAnalysisResultList.bind(this));
        }
    }


    //初始化轨迹分析结果
    initDataTable(result) {
        //初始化总的分析结果(总路程、总耗时、平均速度)
        var totalDistance = (result.result.total_distance / 1000).toFixed(2);
        var toatalTime = (result.result.time_consume / 60).toFixed(2);
        var toatalSpeed = (result.result.average * 3.6).toFixed(2);
        var resultPanelObj = $(".XJPathAnalysis-result");
        resultPanelObj.find(".totalinfo span.distance").text(totalDistance);
        resultPanelObj.find(".totalinfo span.time").text(toatalTime);
        var toatalSpeed = (result.result.average * 3.6).toFixed(2);
        resultPanelObj.find(" .totalinfo span.speed").text(toatalSpeed);
        //清空之前的结果
        resultPanelObj.find(".detailresult tbody tr").remove();
        //初始化分析数据列表
        var rows: Array<any> = result.result.rows[0].guiji;
        var mainBoxHtml = "";
        var template = resultPanelObj.find(".detailresult #pathanalysistemplate").text().trim(); //主表格模板
        for (var i = 0, length = rows.length; i < length; i++) {
            var data = [];
            var x = rows[i].location_longitude;
            var y = rows[i].location_latitude;
            var point = x + "," + y;
            if ((i - 1) < 0) {
                var prex = rows[i].location_longitude;
                var prey = rows[i].location_latitude;
                var prepoint = prex + "," + prey;
            } else {
                var prex = rows[i - 1].location_longitude;
                var prey = rows[i - 1].location_latitude;
                var prepoint = prex + "," + prey;
            }
            var time = rows[i].gpstime.split(" ")[1];//gps定位时间
            var distance = (rows[i].distance != null) ? (rows[i].distance) : "-";//与上一个点的距离(m)
            var needTime = (rows[i].gps_timespan != null) ? (rows[i].gps_timespan).toFixed(2) : "-";//与上一个点的时间间隔(s->min)
            var speed = (rows[i].speed === "" || rows[i].speed === null) ? "-" : (rows[i].speed).toFixed(2);//速度(m/s)
            var star = rows[i].gps_star || "-";
            var precision = rows[i].gps_precision || "-"
            data.push(prepoint, point, time, distance, needTime, speed, star, precision);
            var index = 0;
            var templateRepalce = template.replace(/%data/g, function () {
                var itemVal = (index < data.length) ? data[index++] : '';
                return itemVal;
            });
            mainBoxHtml += templateRepalce;
        }
        resultPanelObj.find(".detailresult tbody ").append(mainBoxHtml);
        resultPanelObj.find(".detailresult tbody tr").bind("click", this.itemClick.bind(this));
        //显示分页（总记录，每页几条，第几页）
        var total = result.result.total;//总记录数
        var pageSize = result.result.pagesize || this.pageSize;//每页显示几条
        var pageIndex = result.result.pageindex || this.pageIndex;//第几页
        var totalPage = Math.ceil(parseInt(total) / parseInt(pageSize));//总页数
        resultPanelObj.find(".div-pagetool .total").text(total);
        resultPanelObj.find(".div-pagetool .pagesize").text(pageSize);
        resultPanelObj.find(".div-pagetool  span.totalpage").text(totalPage);
        resultPanelObj.find(".div-pagetool  span.currentpage").text(pageIndex);
    }

    //添加轨迹到地图
    addPathToMap(result) {
        //清除原有的图形
        this.analysisPathGraphicLayer.clear();
        var rows: Array<any> = result.result.rows[0].guiji;
        var linePath: Array<any> = [];

        for (var i = 0, length = rows.length; i < length; i++) {
            //添加点
            var x = rows[i].location_longitude;
            var y = rows[i].location_latitude;
            var point = new Point(x, y, this.map.spatialReference);//起点添加
            var infoTemplate = new InfoTemplate({
                title: "距离前一个轨迹点的信息",
                content: this.template.split('$$')[2]
            });
            var graphic = new Graphic(point, this.symbol.pointSymbol, "", infoTemplate);
            //设置点的属性
            var time = rows[i].gpstime.split(" ")[1];//gps定位时间
            var distance = (rows[i].distance != null) ? (rows[i].distance) : "-";//与上一个点的距离(m)
            var needTime = (rows[i].gps_timespan != null) ? (rows[i].gps_timespan).toFixed(2) : "-";//与上一个点的时间间隔(s->min)
            var speed = (rows[i].speed === "" || rows[i].speed === null) ? "-" : (rows[i].speed).toFixed(2);//速度(m/s)
            var star = rows[i].gps_star || "-";
            var precision = rows[i].gps_precision || "-"
            graphic.setAttributes({
                "distance": distance + "m",
                "time": time,
                "timespan": needTime + "s",
                "speed": speed + "m/s",
                "star": star + "个",
                "precision": precision
            });
            if (i !== 1 || i !== length - 1) {
                this.analysisPathGraphicLayer.add(graphic);
            }
            if (i == length - 1) {//放大到最后一个点的位置
                this.map.centerAndZoom(point, 17);
            }
            //设置线的path
            var pathPoint = [];
            pathPoint.push(x);
            pathPoint.push(y);
            linePath.push(pathPoint);
        }
        //添加线
        var polyline = new Polyline({
            "paths": [linePath],
            "spatialReference": this.map.spatialReference
        });
        var lineGraphic = new Graphic(polyline, this.symbol.lineSymbol);
        this.analysisPathGraphicLayer.add(lineGraphic);

        //起点终点添加
        var startx = rows[0].location_longitude;
        var starty = rows[0].location_latitude;
        var startPoint = new Point(startx, starty, this.map.spatialReference);
        var startPointGraphic = new Graphic(startPoint, this.symbol.startPointSymbol);
        this.analysisPathGraphicLayer.add(startPointGraphic);
        //起点终点添加
        var endx = rows[rows.length - 1].location_longitude;
        var endy = rows[rows.length - 1].location_latitude;
        var endPoint = new Point(endx, endy, this.map.spatialReference);
        var endPointGraphic = new Graphic(endPoint, this.symbol.endPointSymbol);
        this.analysisPathGraphicLayer.add(endPointGraphic);
    }

    //每行分析数据的点击事件
    itemClick(event) {
        $(".XJPathAnalysis-result .detailresult tbody tr").css("background-color", "white")
        $(event.currentTarget).css("background-color", "#337ab7");
        var prePoint = $(event.currentTarget).attr("prepoint");
        var point = $(event.currentTarget).attr("point");
        this.hilightPath(prePoint, point);
    }

    //高亮选中点
    hilightPath(prepoint, point) {
        //清除之前的线
        this.highlightPathGraphicLayer.clear();
        //添加目前需要高亮的线
        // var prex = prepoint.split(",")[0];
        // var prey = prepoint.split(",")[1];
        var x = point.split(",")[0];
        var y = point.split(",")[1];
        // //设置线的path
        // var linePath: Array<any> = [];
        // var previousPoint = [];
        // previousPoint.push(prex);
        // previousPoint.push(prey);
        // linePath.push(previousPoint);
        // var currentPoint = [];
        // currentPoint.push(x);
        // currentPoint.push(y);
        // linePath.push(currentPoint);
        // var polyline = new Polyline({
        //     "paths": [linePath],
        //     "spatialReference": this.map.spatialReference
        // });
        // var lineGraphic = new Graphic(polyline, this.symbol.highlightLineSymbol);
        var highligthPoint = new Point(parseFloat(x), parseFloat(y), this.map.spatialReference)
        var pointGraphic = new Graphic(highligthPoint, this.symbol.highlightPointSymbol)
        this.highlightPathGraphicLayer.add(pointGraphic);
        // var clickPoint = new Point(parseFloat(x), parseFloat(y), this.map.spatialReference)
        this.map.centerAndZoom(highligthPoint, 17)

    }


    /*
   * 查看单个巡检人员的计划，及完成情况，用于和巡检轨迹对比
   */

    //获取巡检人巡检点
    requestWorkerCheckPoint(userid, dateNow, dateNext) {
        //获取巡检人员巡检计划包含今天的所有巡检计划id
        this.requestWorkerAllPlanId(userid, dateNow, this.requestCheckedPoint.bind(this));
        //

    }

    //获取巡检人员巡检计划包含今天的所有巡检计划id
    requestWorkerAllPlanId(userid, searchDate, callback) {
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
                    console.log(config.MSG_error);
                    return;
                } else if (response.result.length === 0) {
                    console.log(config.MSG_null);
                    return;
                } else {
                    var rows = response.result.rows;
                    for (var i = 0, length = rows.length; i < length; i++) {
                        var mainPlanId = rows[i].plan_id; //巡检主计划id
                        callback(mainPlanId, searchDate, this.addWorkerCheckedPointList.bind(this));
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
    requestCheckedPoint(mainPlanId, searchDate, callBack) {
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
                "search_date": searchDate,
            },
            success: function (response) {

                if (response.code != 1) {
                    console.log(config.MSG_error);
                } else if (response.result.length === 0) {
                    console.log(config.MSG_null);
                } else {
                    callBack(response);
                }
            }.bind(this),
            error: function () {
                console.log(config.MSG_error);
            },
            dataType: "json",
        });
    }

    //添加巡检点到地图
    addWorkerCheckedPointList(result) {
        var checkPoints = result.result[0].plan_child_points;
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
                    symbol = this.symbol.planCheckingLineSymbol;
                } else {//已检
                    checkedTime = checkPoints[i].over_date.split(" ")[1];
                    symbol = this.symbol.planCheckedLineSymbol;
                }

            } else if (/rings/.test(geometry)) {
                geometry = new Polygon(JSON.parse(geometryJson));
                if (state == 0) {//未检
                    symbol = this.symbol.planCheckingPointSymbol;
                } else {//已检
                    checkedTime = checkPoints[i].last_time.split(" ")[1];
                    symbol = this.symbol.planCheckedPointSymbol;
                }

            } else {
                geometry = new Point(JSON.parse(geometryJson));
                if (state == 0) {//未检
                    symbol = this.symbol.planCheckingPointSymbol;
                } else {//已检
                    checkedTime = checkPoints[i].last_time.split(" ")[1];
                    symbol = this.symbol.planCheckedPointSymbol;
                }

            }
            //添加巡检设备到地图
            var deviceGraphic = new Graphic(geometry, symbol);
            this.checkPointGraphicLayer.add(deviceGraphic);
        }
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