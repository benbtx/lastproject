import BaseWidget = require('core/BaseWidget.class');
import SpatialReference = require('esri/SpatialReference');
import Point = require('esri/geometry/Point');

import GraphicsLayer = require("esri/layers/GraphicsLayer");
import Graphic = require("esri/graphic");
import PictureMarkerSymbol = require("esri/symbols/PictureMarkerSymbol");
import TextSymbol = require("esri/symbols/TextSymbol");
import Font = require("esri/symbols/Font");
import ScreenPoint = require('esri/geometry/ScreenPoint');


import InfoTemplate = require("esri/InfoTemplate");



export = RealtimeMonitor;

class RealtimeMonitor extends BaseWidget {
    baseClass = "widget-realtime-monitor";
    map = null;
    toast = null;
    gpsInfoGraphicLayer: GraphicsLayer;
    totalpage = 1;
    currentpage = 1;
    int: any;
    currentselectuser = "";
    templateArr: Array<string> = null;
    userMapPoint = [];
    /*** 状态变量 ***/
    isAutoRefreshing: boolean = false;
    zoomscale: number = 2000;

    startup() {
        this.templateArr = this.template.split('$$');
        this.setHtml(this.templateArr[0]);
        this.shortenStack();
        this.configure();
        this.onPanelInit();
        this.bindEvents();
    }

    // 缩短调用栈
    shortenStack() {
        this.map = this.AppX.runtimeConfig.map;
        this.toast = this.AppX.runtimeConfig.toast;
        this.zoomscale = this.config.zoomscale;
    }

    // 配置程序
    configure() {

        //this.setSymbol();
        // this.addGraphicLayer.bind(this);
        if (this.map.getLayer("gpsInfo")) {
            return;
        } else {
            var graphicLayer = new GraphicsLayer();
            graphicLayer.id = "gpsInfo";
            this.gpsInfoGraphicLayer = graphicLayer;
            this.map.addLayer(graphicLayer);
        }
    }

    // 配置程序
    onPanelInit() {
        //ajax，查询人员信息 // 执行SOE服务

        this.showgpsinfo(this.config.pagenumber, this.config.pagesize);

    }




    // 绑定事件
    bindEvents() {



        this.map.on("pan", this.mapExtentChange.bind(this));
        this.map.on("zoom-start", this.zoomStartEvent.bind(this));
        this.map.on("zoom-end", this.zoomEndEvent.bind(this));

        this.domObj.on('click', '.refresh .auto-refresh', function (e) {
            var tempObj = $(e.currentTarget);
            tempObj.addClass("btn-success");
            this.domObj.find('.refresh .manual-refresh').removeClass("btn-success");
            if (!this.int) {
                this.int = window.setInterval(this.clock.bind(this), this.config.refreshtime * 1000);
            }
            // if (tempObj.hasClass('btn-success')) {
            //     /*** 关闭自动刷新 ***/
            //     this.isAutoRefreshing = false;
            //     tempObj.removeClass('btn-success');
            //     window.clearInterval(this.int);
            // } else {
            //     /*** 开启自动刷新 ***/
            //     this.isAutoRefreshing = true;
            //     tempObj.addClass('btn-success');
            //     if (!this.int) {
            //         this.int = window.setInterval(this.clock.bind(this), this.config.refreshtime * 1000);
            //     }
            // }
        }.bind(this));

        this.domObj.on('click', '.refresh .manual-refresh', function (e) {
            var tempObj = $(e.currentTarget);
            tempObj.addClass("btn-success");
            this.domObj.find('.refresh .auto-refresh').removeClass("btn-success");
            window.clearInterval(this.int);
            this.int = undefined;
            //刷新一下
            this.showgpsinfo(this.currentpage, this.config.pagesize);


        }.bind(this));


        //默认自动
        this.domObj.find('.refresh .auto-refresh').addClass("btn-success");
        this.int = window.setInterval(this.clock.bind(this), this.config.refreshtime * 1000);

        //this.totalpage = results.result.totalnumberofrecords;





    }

    showgpsinfo2(pagenumber, pagesize) {
        // 执行SOE服务
        $.ajax({
            headers: {
                'Authorization-Token': AppX.appConfig.usertoken
            },
            type: 'POST',
            url: AppX.appConfig.apiroot.replace(/\/+$/, "") + this.config.gpsinfo,
            data: {
                pagenumber: pagenumber,
                pagesize: pagesize,
                //usersid: usersid.substr(0, usersid.length - 1),
                // f: "pjson"
            },
            success: this.searchgpsinfoCallback.bind(this),
            dataType: "json"
        });

    }

    showgpsinfo(pagenumber, pagesize) {
        $.ajax({
            type: "POST",
            headers: {
                'Authorization-Token': AppX.appConfig.usertoken
            },
            url: AppX.appConfig.apiroot.replace(/\/+$/, "") + this.config.userinfo,

            success: function (result) {
                // console.log(result);

                var optionElem = "";
                for (var i = 0; i < result.result.length; i++) {
                    var userName = result.result[i].realname;
                    optionElem = optionElem + "<option value=\"" + result.result[i].userid + "\">" + userName + "</option>"
                }
                $(optionElem).appendTo(this.domObj.find(".userlist"));

                var usersid = "";
                for (var i = 0; i < result.result.length; i++) {
                    usersid += "'" + result.result[i].userid + "',";
                }

                $.ajax({
                    headers: {
                        'Authorization-Token': AppX.appConfig.usertoken
                    },
                    type: 'POST',
                    url: AppX.appConfig.apiroot.replace(/\/+$/, "") + this.config.gpsinfo,
                    data: {
                        usersid: usersid.substr(0, usersid.length - 1),
                        pagenumber: pagenumber,
                        pagesize: pagesize,
                        // creatorid: 4,
                        // f: "pjson"
                    },
                    success: this.searchgpsinfoCallback.bind(this),
                    dataType: "json"
                });


            }.bind(this),
            error: function (err) {
                console.log(err);
            },
            dataType: "JSON"
        });

    }


    searchgpsinfoCallback(results) {
        var that = this;
        if (results.code != 10000) {
            that.toast.Show("查询GPS信息出错！");
            console.log(results.message);
            that.domObj.find(".fykj").hide();
            return;
        }
        this.totalpage = results.result.totalnumberofpages;
        this.currentpage = results.result.pagenumber;
        //动态生成书签及分页控件
        var domtb = this.domObj.find(".pick-pipe-tbody")
        domtb.empty();
        var address;
        var html_trs_data = "";
        $.each(results.result.rows, function (i, item) {
            if (item.location.length > 8) {
                address = item.location.substr(0, 8) + "...";
            } else {
                address = item.location;
            }
            var coords = item.x + "," + item.y;
            var time = "\'" + item.systemtime + "\'";
            //<td width=10%><input type=radio checked name=gpsinfo data=" + item.id + " value=" + coords + "  /> </td>
            if (this.currentselectuser != "" && this.currentselectuser == item.realname) {
                html_trs_data += "<tr class=goto ><td >" + item.realname + "</td><td title=" + item.location + " width=45%>" + address + "</td><td><a     style='cursor:pointer' name=" + item.id + " address=" + item.location + " time=" + time + " value=" + coords + ">详细</a></td></tr>";
            } else {
                html_trs_data += "<tr class=goto ><td >" + item.realname + "</td><td title=" + item.location + " width=45%>" + address + "</td><td><a style='cursor:pointer' name=" + item.id + " address=" + item.location + " time=" + time + " value=" + coords + ">详细</a></td></tr>";
            }
            //刷新infowindow
            this.setContent(item);
        }.bind(this));
        domtb.append(html_trs_data);


        var html_trs_blank = "";
        if (results.result.rows.length < that.config.pagesize) {
            var num = that.config.pagesize - results.result.rows.length;
            for (var i = 0; i < num; i++) {
                html_trs_blank += "<tr class=goto height=32><td ></td><td </td><td ></td></tr>";
            }
            domtb.append(html_trs_blank);
        }
        //用户详情的单击事件
        var curuser = $(".goto a");
        curuser.off("click").on("click", function (e) {

            var point = $(e.target).attr("value");
            var address = $(e.target).attr("address");
            if (point.split(',').length != 2) { return; }
            //arcgis 
            var mapPoint = new Point(parseFloat(point.split(',')[0]), parseFloat(point.split(',')[1]), new SpatialReference({ wkid: that.map.spatialReference.wkid }));
            //定位到那
            this.PointAtMap(mapPoint);
            var screenPoint = this.map.toScreen(mapPoint);
            var userid = $(e.target).attr("name");
            var time = $(e.target).attr("time");
            var selector = this.addInfowindowToMap(screenPoint, userid, address, time);
            //加入点
            var userPoint = [];
            userPoint.push(mapPoint);
            userPoint.push(userid);
            this.userMapPoint.push(userPoint);

        }.bind(this));




        //radio选择定位
        var that = this;
        this.domObj.find("input[name='gpsinfo']").off("change").on("change", function () {
            if ($(this).val()) {
                that.currentselectuser = this.parentNode.parentNode.childNodes[1].innerText;
                var point = $(this).val();
                //tihs.pro
                if (point.split(',').length != 2) { return; }
                //arcgis 
                var mapPoint = new Point(parseFloat(point.split(',')[0]), parseFloat(point.split(',')[1]), new SpatialReference({ wkid: that.map.spatialReference.wkid }));
                that.PointAtMap(mapPoint);
            }
        });




        //动态生成书签及分页控件
        //分页控件fykj 向前、向后事件


        that.domObj.find(".content").text("第" + (results.result.pagenumber) + "页共" + results.result.totalnumberofpages + "页");

        this.domObj.find(".pre").off("click").on("click", function () {
            if (results.result.pagenumber - 1 > 0) {
                this.currentpage = results.result.pagenumber - 1;
                that.showgpsinfo(results.result.pagenumber - 1, that.config.pagesize);
                that.domObj.find(".content").text("第" + (results.result.pagenumber - 1) + "页共" + results.result.totalnumberofpages + "页");
                //清除infowindow
                $(".RealtimeMonitor").remove();
            }

        });
        this.domObj.find(".next").off("click").on("click", function () {
            if (results.result.pagenumber + 1 <= results.result.totalnumberofpages) {
                this.currentpage = results.result.pagenumber + 1;
                that.showgpsinfo(results.result.pagenumber + 1, that.config.pagesize);
                that.domObj.find(".content").text("第" + (results.result.pagenumber + 1) + "页共" + results.result.totalnumberofpages + "页");
                //清除infowindow
                $(".RealtimeMonitor").remove();
            }
        });


        this.domObj.find(".pageturning").off("click").on("click", function () {

            if (parseInt(that.domObj.find(".currpage").val()) <= results.result.totalnumberofpages && this.currentpage >= 1) {
                this.currentpage = parseInt(that.domObj.find(".currpage").val());
                that.showgpsinfo(this.currentpage, that.config.pagesize);
                that.domObj.find(".content").text("第" + this.currentpage + "页共" + results.result.totalnumberofpages + "页");
                //清除infowindow
                $(".RealtimeMonitor").remove();
            } else {
                that.domObj.find(".currpage").val("");
            }
        }.bind(this));

        //添加工单气泡
        this.addPointGraphic(results);

    }

    addPointGraphic(queryResult) {
        //清除图层
        this.gpsInfoGraphicLayer.clear();
        this.map.infoWindow.hide();

        //添加当前页工单气泡
        for (var i = 0, length = queryResult.result.rows.length; i < length; i++) {
            var row = queryResult.result.rows[i];
            var point = new Point(row.x, row.y, this.map.spatialReference);
            var address = row.location;
            var infoTemplate = new InfoTemplate({
                title: "用户:" + row.realname,
                content: "地址:" + row.location
                // content: this.templateArr[1]
                // content: "派工人：${dispatch_realname}</br>任务内容：${content}</br>接单人：${realname}</br>处理情况：${handle_record}</br>预计完工时间:${plan_finish_date}</br>实际完工时间:${finish_date}</br>附件:</br>${fileids}"
            });

            //var graphic = new Graphic(point, this.setSymbol()[0], "", infoTemplate);
            var symbols = this.setSymbol();
            var graphic = new Graphic(point, symbols[0], "");
            if (i == 0) {

            }

            graphic.attr("id", "graphic" + i);
            this.gpsInfoGraphicLayer.add(graphic);
            //this.map.centerAt(point);

            //添加背景
            symbols[1].setWidth(row.realname.length*13.5);
            var graphictextbg = new Graphic(point, symbols[1].setOffset(0, -20), "");
            this.gpsInfoGraphicLayer.add(graphictextbg);
            //添加文字
            var peopleTextSymbol = new TextSymbol(row.realname);
            peopleTextSymbol.setOffset(0, -25);
            var font = new Font();
            font.setSize("10pt");
            font.setWeight(Font.WEIGHT_BOLD);
            peopleTextSymbol.setFont(font);
            var graphicText = new Graphic(point, peopleTextSymbol, "");
            this.gpsInfoGraphicLayer.add(graphicText);

            //移动infowindow ()

            var infoWindowClass = '.RealtimeMonitorinfoWindow' + row.id;

            var infowindowObject = $(infoWindowClass);
            //if (infowindowObject.length == 0) { return; }
            var point = new Point(row.x, row.y, new SpatialReference({ wkid: this.map.spatialReference.wkid }));
            var screenPoint = this.map.toScreen(point);
            infowindowObject.css("left", (screenPoint.x - 7) + "px");
            infowindowObject.css("top", (screenPoint.y - 100 - 5) + "px");
            infowindowObject.css("display", "block");



        }

    }


    //设置点的样式
    setSymbol() {
        var symbol = [];
        var peopleSymbol = new PictureMarkerSymbol(this.config.MarkPictureSymbol, 24, 24);
        var peopletextSymbol = new PictureMarkerSymbol(this.config.TextbgSymbol, 55, 18);
        symbol.push(peopleSymbol);
        symbol.push(peopletextSymbol);
        return symbol;
    }
    //添加graphic图层
    addGraphicLayer() {
        if (this.map.getLayer("gpsInfo")) {
            return;
        } else {
            var graphicLayer = new GraphicsLayer();
            graphicLayer.id = "gpsInfo";
            this.gpsInfoGraphicLayer = graphicLayer;
            this.map.addLayer(graphicLayer);
        }

    }

    //add infoWindow to the Map,and return the class 
    addInfowindowToMap(scadaPoint: ScreenPoint, userId: string, address: string, time: string) {


        var infowindow = $(".RealtimeMonitorinfoWindow" + userId);
        //avoid repeating add infowindow
        if (infowindow.length != 0) {
            return;
        } else {
            //contain the infwindow 
            var className = "RealtimeMonitor RealtimeMonitorinfoWindow" + userId;
            $("<div  class=\"" + className + "\"></div>").appendTo($("#mainContainer"));
            var infowindow = $(".RealtimeMonitorinfoWindow" + userId);
            $(this.templateArr[1]).appendTo(infowindow);
            infowindow.css("left", (scadaPoint.x - 7) + "px");
            infowindow.css("top", (scadaPoint.y - 100 - 5) + "px");
            $(".RealtimeMonitorinfoWindow" + userId).find(".RealtimeMonitor-address").text("地址：" + address);
            $(".RealtimeMonitorinfoWindow" + userId).find(".RealtimeMonitor-time").text("时间：" + time);
            $(".RealtimeMonitorinfoWindow" + userId + " .RealtimeMonitor-titleButton").addClass(".RealtimeMonitorinfoWindowtest" + userId);


        }
        var selector = ".RealtimeMonitorinfoWindow" + userId;
        //add the close event 
        $(selector + " .RealtimeMonitor-titleButton").bind("click", this.userClose.bind(this));


        return selector;
    }
    userClose(event) {
        console.log("1");
        var className = event.currentTarget.className.replace("RealtimeMonitor-titleButton close", "");
        var currentInfowindow = className.replace("test", "");
        $(currentInfowindow).remove();


        // event.currentTarget.remove();
    }


    clock() {
        //只刷新当前页
        // this.currentpage++;
        // if (this.currentpage > this.totalpage) {
        //     this.currentpage = 1;
        // }
        this.showgpsinfo(this.currentpage, this.config.pagesize);

    }

    setContent(item: any) {
        var allinfowindow = $(".RealtimeMonitor");
        if (allinfowindow.length <= 0) { return; }
        $.each(allinfowindow, function (i, value) {
            var id = $(value).attr("class").replace("RealtimeMonitor RealtimeMonitorinfoWindow", "");
            if (id == item.id) {
                $(value).find(".RealtimeMonitor-address").text("地址：" + item.location);
                $(value).find(".RealtimeMonitor-time").text("时间：" + item.systemtime);
            }
        });

        // $(".RealtimeMonitor-address").text("地址：");
    }

    mapExtentChange(event) {
        if (this.userMapPoint.length == 0) {
            return;
        }
        for (var i = 0; i < this.userMapPoint.length; i++) {
            var infoWindowClass = '.RealtimeMonitorinfoWindow' + this.userMapPoint[i][1];
            var screenPoint = this.map.toScreen(this.userMapPoint[i][0]);
            var left = screenPoint.x + event.delta.x;
            var top = screenPoint.y + event.delta.y;
            var infowindowObject = $(infoWindowClass);
            infowindowObject.css("left", (left - 7) + "px");
            infowindowObject.css("top", (top - 100 - 5) + "px");
            infowindowObject.css("display", "block");


        }
    }
    zoomStartEvent() {
        if (this.userMapPoint.length == 0) {
            return;
        }
        for (var i = 0; i < this.userMapPoint.length; i++) {

            var infoWindowClass = '.RealtimeMonitorinfoWindow' + this.userMapPoint[i][1];
            $(infoWindowClass).css("display", "none");
        }

    }
    zoomEndEvent() {
        if (this.userMapPoint.length == 0) {
            return;
        }
        for (var i = 0; i < this.userMapPoint.length; i++) {
            var infoWindowClass = '.RealtimeMonitorinfoWindow' + this.userMapPoint[i][1];
            var screenPoint = this.map.toScreen(this.userMapPoint[i][0]);
            var infowindowObject = $(infoWindowClass);
            infowindowObject.css("left", (screenPoint.x - 7) + "px");
            infowindowObject.css("top", (screenPoint.y - 100 - 5) + "px");
            infowindowObject.css("display", "block");
        }

    }

    destroy() {
        if (this.gpsInfoGraphicLayer) {
            this.map.removeLayer(this.gpsInfoGraphicLayer);
            this.gpsInfoGraphicLayer.clear();
        }
        if (this.int) {
            window.clearInterval(this.int);
        }
        $(".RealtimeMonitor").remove();
        this.domObj.remove();
        this.afterDestroy();
    }

    // 定位到指定 Extent
    PointAtMap(point) {
        // 设置到指定缩放级别
        this.map.setScale(this.zoomscale);
        // 设置到指定的显示范围
        this.map.centerAt(point);
    }
}