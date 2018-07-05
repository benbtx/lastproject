import BaseWidget = require('core/BaseWidget.class');
import Functions = require('core/Functions.module');

import Map = require("esri/map");
import GraphicsLayer = require("esri/layers/GraphicsLayer");
import PictureMarkerSymbol = require("esri/symbols/PictureMarkerSymbol");
import DetailPanel = require('widgets/DetailPanel/Widget');




export = StationPathAnalysis;

class StationPathAnalysis extends BaseWidget {
    map: Map;
    terminalGraphicLayer: GraphicsLayer;
    symbol: Array<any>;
    detailpanel;//显示详情的数据面板

    startup() {


        var html = _.template(this.template.split("$$")[0])();
        this.setHtml(html);
        this.initInterface();


    }
    destroy() {
        this.domObj.remove();
        this.afterDestroy();
        this.backToInit();
    }

    //回到初始状态
    backToInit() {
    }

    //初始化查询界面
    initInterface() {
        this.getWorkerInfo(0, 0);//添加巡检人员信息
        this.dateWeightInit();//初始化日期控件
        $(".widget-StationPathAnalysis button.query").bind("click", this.queryClick.bind(this));//绑定查询事件
    }

    //初始化日期控件
    dateWeightInit() {
        //jquery 日期控件初始化
        $.jeDate(".widget-StationPathAnalysis input.date", {
            format: 'YYYY-MM-DD', //日期格式  
            isinitVal: true,
            choosefun: function (elem, val) {
                this.startDate = val;
            }.bind(this)
        })
    }
    //获取巡检人员信息
    getWorkerInfo(currentPageNumber, pagesize) {
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getUserList,
            data: {
                "pageindex": currentPageNumber,
                "pagesize": pagesize
            },
            success: function (result) {
                this.getAllWorkerInfoCallBack(result)
            }.bind(this),
            error: function () {
            },
            dataType: "json",
        });
    }

    //获取巡检人员信息回调函数
    getAllWorkerInfoCallBack(result) {
        console.log(result);
        var workerInfo: Array<any> = result.result.rows;
        var html = "";
        for (var i = 0, length = workerInfo.length; i < length; i++) {
            var name = workerInfo[i].username;
            if (name != "管理员") {//过滤管理员（非巡检人员）
                html += "<option>" + name + "</option>";
            }
        }
        $(".widget-StationPathAnalysis select.userName").append(html);
    }

    //获取查询需要的参数，并检查合法性
    getQueryParms() {
        var queryParms: Array<any> = [];
        var department = $(".widget-StationPathAnalysis select.department").find("option:selected").text();
        var workerName = $(".widget-StationPathAnalysis select.userName").find("option:selected").text();
        var date = $(".widget-StationPathAnalysis input.date").val();
        var startTime = $(".widget-StationPathAnalysis  select.startTime").find("option:selected").text();
        var endTime = $(".widget-StationPathAnalysis  select.endTime").find("option:selected").text();
        queryParms.push([department, workerName, date, startTime, endTime]);
        return queryParms;
    }

    //查询点击事件
    queryClick(event) {
        console.log("click!");
        var queryParms = this.getQueryParms();
        // this.getPathInfo(queryParms[0], queryParms[1], queryParms[2], queryParms[3], queryParms[3]);
        this.showDetailPanel(this.template.split("$$")[1], "巡检轨迹查询结果", "");
    }

    //查询轨迹信息
    getPathInfo(department, workerName, date, startTime, endTime) {
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getPathInfo,
            data: {

            },
            success: function (result) {
                this.getPathInfoCallBack(result)
            }.bind(this),
            error: function () {

            },
            dataType: "json",
        });
    }

    //查询轨迹信息回调函数
    getPathInfoCallBack(result) {
        this.showDetailPanel(this.template.split("$$")[1], "巡检轨迹查询结果", "");
    }

    //显示数据面板
    showDetailPanel(htmlString, title, data) {
        this.detailpanel = new DetailPanel({
            id: "jizhanguijifenxi",
            title: title,
            html: htmlString,
            width: "100%",
            height: $('#mainContainer').height() * 0.45,
            data: data,
            readyCallback: this.onDetailPanelReady.bind(this)
        });
    }

    //
    onDetailPanelReady() {

    }

}