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

import Functions = require('core/Functions.module');

import DetailPanel = require('widgets/DetailPanel/Widget');



export = MapMonitor;

class MapMonitor extends BaseWidget {
    baseClass = "widget-map-monitor";
    map = null;
    toast = null;
    userInfoGraphicLayer: GraphicsLayer;
    yhInfoGraphicLayer: GraphicsLayer;
    totalpage = 1;
    currentpage = 1;
    personint: any;
    hiddendangerint: any;
    currentselectuser = "";
    templateArr: Array<string> = null;
    userMapPoint = [];
    detailpanel = null;
    currentpageUserinfo = [];
    currentpageVehicleinfo = [];
    currentpageHiddenDangerinfo = [];
    /*** 状态变量 ***/
    isAutoRefreshing: boolean = false;

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
            this.userInfoGraphicLayer = graphicLayer;
            this.map.addLayer(graphicLayer);
        }
        if (this.map.getLayer("yhInfo")) {
            return;
        } else {
            var graphicLayer = new GraphicsLayer();
            graphicLayer.id = "yhInfo";
            this.yhInfoGraphicLayer = graphicLayer;
            this.map.addLayer(graphicLayer);
        }
    }

    // 配置程序
    onPanelInit() {
        //ajax，查询人员信息 // 执行SOE服务

        this.showuserinfo(this.config.pagenumber, this.config.pagesize);


        this.showyhinfo(this.config.pagenumber, this.config.pagesize);

    }




    // 绑定事件
    bindEvents() {



        this.map.on("pan", this.mapExtentChange.bind(this));
        this.map.on("zoom-start", this.zoomStartEvent.bind(this));
        this.map.on("zoom-end", this.zoomEndEvent.bind(this));

        //控制人员的的刷新
        this.domObj.on('click', '.personrefresh .auto-refresh', function (e) {
            var tempObj = $(e.currentTarget);
            tempObj.addClass("btn-success");
            this.domObj.find('.personrefresh .manual-refresh').removeClass("btn-success");
            if (!this.personint) {
                this.personint = window.setInterval(this.personclock.bind(this), this.config.refreshtime * 1000);
            }
            // if (tempObj.hasClass('btn-success')) {
            //     /*** 关闭自动刷新 ***/
            //     this.isAutoRefreshing = false;
            //     tempObj.removeClass('btn-success');
            //     window.clearInterval(this.personint);
            // } else {
            //     /*** 开启自动刷新 ***/
            //     this.isAutoRefreshing = true;
            //     tempObj.addClass('btn-success');
            //     if (!this.personint) {
            //         this.personint = window.setInterval(this.personclock.bind(this), this.config.refreshtime * 1000);
            //     }
            // }
        }.bind(this));

        this.domObj.on('click', '.personrefresh .manual-refresh', function (e) {
            var tempObj = $(e.currentTarget);
            tempObj.addClass("btn-success");
            this.domObj.find('.personrefresh .auto-refresh').removeClass("btn-success");
            window.clearInterval(this.personint);
            this.personint = undefined;
            //刷新一下
            this.showuserinfo(this.currentpage, this.config.pagesize);


        }.bind(this));
        //默认自动
        this.domObj.find('.personrefresh .auto-refresh').addClass("btn-success");
        this.personint = window.setInterval(this.personclock.bind(this), this.config.refreshtime * 1000);


        //控制车辆的的刷新

        //控制隐患的的刷新
        this.domObj.on('click', '.hiddendangerrefresh .auto-refresh', function (e) {
            var tempObj = $(e.currentTarget);
            tempObj.addClass("btn-success");
            this.domObj.find('.hiddendangerrefresh .manual-refresh').removeClass("btn-success");
            if (!this.hiddendangerint) {
                this.hiddendangerint = window.setInterval(this.hiddendangerclock.bind(this), this.config.refreshtime * 1000);
            }
        }.bind(this));

        this.domObj.on('click', '.hiddendangerrefresh .manual-refresh', function (e) {
            var tempObj = $(e.currentTarget);
            tempObj.addClass("btn-success");
            this.domObj.find('.hiddendangerrefresh .auto-refresh').removeClass("btn-success");
            window.clearInterval(this.hiddendangerint);
            this.hiddendangerint = undefined;
            //刷新一下
            this.showyhinfo(this.currentpage, this.config.pagesize);


        }.bind(this));
        //默认自动
        this.domObj.find('.hiddendangerrefresh .auto-refresh').addClass("btn-success");
        this.hiddendangerint = window.setInterval(this.hiddendangerclock.bind(this), this.config.refreshtime * 1000);
    }



    showuserinfo(pagenumber, pagesize) {


        this.currentpage = pagenumber || this.config.pagenumber;
        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getUserList,
            data: {
                "pageindex": pagenumber || this.config.pagenumber,
                "pagesize": 10,
                // f: "pjson"
            },
            success: this.searchuserinfoCallback.bind(this),
            dataType: "json",
        });

    }


    showyhinfo(pagenumber, pagesize) {
        // trouble_typeid, equid, handle_userid, handle_state, handle_trouble_clear
        this.currentpage = pagenumber || this.config.pagenumber;
        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getHiddenDangerList,
            data: {
                "pageindex": pagenumber || this.config.pagenumber,
                "pagesize": this.config.pagesize,
                // "trouble_typeid": trouble_typeid,
                // "equid": equid,
                // "handle_userid": handle_userid,
                // "handle_trouble_clear": handle_trouble_clear,
                // "handle_state": handle_state,
                // f: "pjson"
            },
            success: this.searchyhinfoCallback.bind(this),
            dataType: "json",
        });

    }



    searchuserinfoCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("查询用户GPS信息出错！");
            console.log(results.message);
            that.domObj.find(".fykj").hide();
            return;
        }


        if (results.result.total % results.result.pagesize == 0) {
            this.totalpage = Math.floor(parseInt(results.result.total) / parseInt(results.result.pagesize));

        } else {
            this.totalpage = Math.floor(parseInt(results.result.total) / parseInt(results.result.pagesize)) + 1;

        }



        this.currentpage = results.result.pageindex;
        //动态生成书签及分页控件
        var domtb = this.domObj.find(".pick-pipe-tbody-person")
        domtb.empty();
        var address;
        var html_trs_data = "";
        this.currentpageUserinfo = results.result.rows;
        $.each(results.result.rows, function (i, item) {
            if (item.username.length > 8) {
                address = item.username.substr(0, 8) + "...";
            } else {
                address = item.username;
            }
            var coords = item.lng + "," + item.lat;
            var time = "\'" + item.posttime + "\'";
            var isonline = "离线";
            if (item.online_state == "1") {
                isonline = "在线";
            } else {
                isonline = "离线";
            }
            //<td width=10%><input type=radio checked name=gpsinfo data=" + item.id + " value=" + coords + "  /> </td>
            if (this.currentselectuser != "" && this.currentselectuser == item.username) {
                html_trs_data += "<tr class=goto ><td >" + item.username + "</td><td title=" + item.username + " width=45%>" + isonline + "</td><td><a     style='cursor:pointer' name=" + item.userid + " address=" + item.username + " time=" + time + " value=" + coords + ">详细</a></td></tr>";
            } else {
                html_trs_data += "<tr class=goto ><td >" + item.username + "</td><td title=" + item.username + " width=45%>" + isonline + "</td><td><a style='cursor:pointer' name=" + item.userid + " address=" + item.username + " time=" + time + " value=" + coords + ">详细</a></td></tr>";
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
            this.map.centerAndZoom(mapPoint, 17);
            // var screenPoint = this.map.toScreen(mapPoint);
            // var userid = $(e.target).attr("name");
            // var time = $(e.target).attr("time");
            // var selector = this.addInfowindowToMap(screenPoint, userid, address, time);
            // //加入点
            // var userPoint = [];
            // userPoint.push(mapPoint);
            // userPoint.push(userid);
            // this.userMapPoint.push(userPoint);



            //弹出详情
            if (this.detailpanel != null) {
                // $("#" + that.blankPanels.id).remove();
                that.detailpanel.Destroy();
            }
            var title = this.domObj.find('li.active').children().text();
            that.currentpageUserinfo.forEach(value => {
                if (e.target.name == value.id)
                    //   this.setHtml(_.template(this.templateArr[2])({
                    //     name: value.realname,
                    //     address: value.location,
                    // }));

                    var html = _.template(this.templateArr[2])({
                        name: value.realname,
                        address: value.location,
                    });
                that.showDetailPanel(html, title, value);


            });

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
                that.map.centerAndZoom(mapPoint, 15);
            }
        });




        //动态生成书签及分页控件
        //分页控件fykj 向前、向后事件


        that.domObj.find(".content").text("第" + (results.result.pageindex) + "页共" + this.totalpage + "页");

        this.domObj.find(".pre").off("click").on("click", function () {
            if (results.result.pageindex - 1 > 0) {
                this.currentpage = results.result.pageindex - 1;
                that.showuserinfo(results.result.pageindex - 1, that.config.pagesize);
                that.domObj.find(".content").text("第" + (results.result.pageindex - 1) + "页共" + this.totalpage + "页");
                //清除infowindow
                $(".RealtimeMonitor").remove();
            }

        });
        this.domObj.find(".next").off("click").on("click", function () {
            if (results.result.pageindex + 1 <= this.totalpage) {
                this.currentpage = results.result.pageindex + 1;
                that.showuserinfo(results.result.pageindex + 1, that.config.pagesize);
                that.domObj.find(".content").text("第" + (results.result.pageindex + 1) + "页共" + this.totalpage + "页");
                //清除infowindow
                $(".RealtimeMonitor").remove();
            }
        });


        this.domObj.find(".pageturning").off("click").on("click", function () {

            if (parseInt(that.domObj.find(".currpage").val()) <= this.totalpage && this.currentpage >= 1) {
                this.currentpage = parseInt(that.domObj.find(".currpage").val());
                that.showuserinfo(this.currentpage, that.config.pagesize);
                that.domObj.find(".content").text("第" + this.currentpage + "页共" + this.totalpage + "页");
                //清除infowindow
                $(".RealtimeMonitor").remove();
            } else {
                that.domObj.find(".currpage").val("");
            }
        }.bind(this));

        //添加工单气泡
        this.addPointGraphic(results, "person");

    }

    searchyhinfoCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("查询隐患信息出错！");
            console.log(results.message);
            that.domObj.find(".fykj").hide();
            return;
        }
        if (results.result.total % results.result.pagesize == 0) {
            this.totalpage = Math.floor(parseInt(results.result.total) / parseInt(results.result.pagesize));

        } else {
            this.totalpage = Math.floor(parseInt(results.result.total) / parseInt(results.result.pagesize)) + 1;

        }


        this.currentpage = results.result.pageindex;
        //动态生成书签及分页控件
        var domtb = this.domObj.find(".pick-pipe-tbody-hiddendanger")
        domtb.empty();
        var address;
        var html_trs_data = "";
        this.currentpageUserinfo = results.result.rows;
        $.each(results.result.rows, function (i, item) {
            if (item.address.length > 8) {
                address = item.address.substr(0, 8) + "...";
            } else {
                address = item.address;
            }
            var coords = item.location_longitude + "," + item.location_latitude;
            var time = "\'" + item.uploadtime + "\'";
            //<td width=10%><input type=radio checked name=gpsinfo data=" + item.id + " value=" + coords + "  /> </td>
            if (this.currentselectuser != "" && this.currentselectuser == item.realname) {
                html_trs_data += "<tr class=goto ><td >" + item.notes + "</td><td title=" + item.address + " width=45%>" + address + "</td><td><a     style='cursor:pointer' name=" + item.id + " address=" + item.address + " time=" + time + " value=" + coords + ">详细</a></td></tr>";
            } else {
                html_trs_data += "<tr class=goto ><td >" + item.notes + "</td><td title=" + item.address + " width=45%>" + address + "</td><td><a style='cursor:pointer' name=" + item.id + " address=" + item.address + " time=" + time + " value=" + coords + ">详细</a></td></tr>";
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
            this.map.centerAndZoom(mapPoint, 17);
            // var screenPoint = this.map.toScreen(mapPoint);
            // var userid = $(e.target).attr("name");
            // var time = $(e.target).attr("time");
            // var selector = this.addInfowindowToMap(screenPoint, userid, address, time);
            // //加入点
            // var userPoint = [];
            // userPoint.push(mapPoint);
            // userPoint.push(userid);
            // this.userMapPoint.push(userPoint);



            //弹出详情
            if (this.detailpanel != null) {
                // $("#" + that.blankPanels.id).remove();
                that.detailpanel.Destroy();
            }
            var title = this.domObj.find('li.active').children().text();
            that.currentpageUserinfo.forEach(value => {
                if (e.target.name == value.id)
                    //   this.setHtml(_.template(this.templateArr[2])({
                    //     name: value.realname,
                    //     address: value.location,
                    // }));

                    var html = _.template(this.templateArr[2])({
                        name: value.realname,
                        address: value.location,
                    });
                that.showDetailPanel(html, title, value);


            });


            //  require({}, [Functions.concatUrl(this.config.fullpanelWidgetPath, this.config.panelWidgetMain)], (HalfPanel) => {
            //         this.log('加载面板模块:' + target.data('widget'));
            //         // 新建一个panel用于存放widget
            //         this.fullpanels[target.data('id')] = new HalfPanel({
            //             widgetPath: this.config.halfpanelWidgetPath,
            //             afterDestroyCallback: this.destroyWidget.bind(this, target.data('id'))
            //         }, {
            //                 panelTitle: target.data('label'),
            //                 panelUniqClassName: target.data('id'),
            //                 innerWidgetPath: target.data('widget'),
            //                 innerWidgetMain: target.data('main')
            //             });
            //     });
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
                that.map.centerAndZoom(mapPoint, 15);
            }
        });




        //动态生成书签及分页控件
        //分页控件fykj 向前、向后事件


        that.domObj.find(".content").text("第" + (results.result.pageindex) + "页共" + this.totalpage + "页");

        this.domObj.find(".pre").off("click").on("click", function () {
            if (results.result.pageindex - 1 > 0) {
                this.currentpage = results.result.pageindex - 1;
                that.showyhinfo(results.result.pageindex - 1, that.config.pagesize);
                that.domObj.find(".content").text("第" + (results.result.pageindex - 1) + "页共" + this.totalpage + "页");
                //清除infowindow
                $(".RealtimeMonitor").remove();
            }

        });
        this.domObj.find(".next").off("click").on("click", function () {
            if (results.result.pageindex + 1 <= results.result.total) {
                this.currentpage = results.result.pageindex + 1;
                that.showyhinfo(results.result.pageindex + 1, that.config.pagesize);
                that.domObj.find(".content").text("第" + (results.result.pageindex + 1) + "页共" + this.totalpage + "页");
                //清除infowindow
                $(".RealtimeMonitor").remove();
            }
        });


        this.domObj.find(".pageturning").off("click").on("click", function () {

            if (parseInt(that.domObj.find(".currpage").val()) <= this.totalpage && this.currentpage >= 1) {
                this.currentpage = parseInt(that.domObj.find(".currpage").val());
                that.showyhinfo(this.currentpage, that.config.pagesize);
                that.domObj.find(".content").text("第" + this.currentpage + "页共" + this.totalpage + "页");
                //清除infowindow
                $(".RealtimeMonitor").remove();
            } else {
                that.domObj.find(".currpage").val("");
            }
        }.bind(this));

        //添加工单气泡
        this.addPointGraphic(results, "hiddendanger");




    }

    addPointGraphic(queryResult, lx) {

        if (lx == "person") {
            //清除图层
            this.userInfoGraphicLayer.clear();
            //添加当前页工单气泡
            for (var i = 0, length = queryResult.result.rows.length; i < length; i++) {
                var row = queryResult.result.rows[i];
                var point = new Point(row.lng, row.lat, this.map.spatialReference);
                var address = row.username;

                var graphic = new Graphic(point, this.setSymbol()[0], "");
                if (i == 0) {

                }

                graphic.attr("id", "graphic" + i);
                this.userInfoGraphicLayer.add(graphic);
                //this.map.centerAt(point);

                //添加背景

                var graphictextbg = new Graphic(point, this.setSymbol()[1].setOffset(0, -20), "");
                this.userInfoGraphicLayer.add(graphictextbg);
                //添加文字
                var peopleTextSymbol = new TextSymbol(row.username);
                peopleTextSymbol.setOffset(0, -25);
                var font = new Font();
                font.setSize("10pt");
                font.setWeight(Font.WEIGHT_BOLD);
                peopleTextSymbol.setFont(font);
                var graphicText = new Graphic(point, peopleTextSymbol, "");
                this.userInfoGraphicLayer.add(graphicText);
            }




        }
        else if (lx == "hiddendanger") {
            //清除图层
            this.yhInfoGraphicLayer.clear();
            //添加当前页工单气泡
            for (var i = 0, length = queryResult.result.rows.length; i < length; i++) {
                var row = queryResult.result.rows[i];
                var point = new Point(row.location_longitude, row.location_latitude, this.map.spatialReference);
                var address = row.address;

                var graphic = new Graphic(point, this.setSymbol()[2], "");
                if (i == 0) {

                }

                graphic.attr("id", "graphic" + i);
                this.yhInfoGraphicLayer.add(graphic);
                //this.map.centerAt(point);

                //添加背景

                var graphictextbg = new Graphic(point, this.setSymbol()[1].setOffset(0, -20), "");
                this.yhInfoGraphicLayer.add(graphictextbg);
                //添加文字
                var peopleTextSymbol = new TextSymbol(row.notes);
                peopleTextSymbol.setOffset(0, -25);
                var font = new Font();
                font.setSize("10pt");
                font.setWeight(Font.WEIGHT_BOLD);
                peopleTextSymbol.setFont(font);
                var graphicText = new Graphic(point, peopleTextSymbol, "");
                this.yhInfoGraphicLayer.add(graphicText);

            }

        } else if (lx == "vehicle") {

        }
        // //清除图层
        // this.userInfoGraphicLayer.clear();
        // this.map.infoWindow.hide();

        // //添加当前页工单气泡
        // for (var i = 0, length = queryResult.result.rows.length; i < length; i++) {
        //     var row = queryResult.result.rows[i];
        //     var point = new Point(row.x, row.y, this.map.spatialReference);
        //     var address = row.location;
        //     var infoTemplate = new InfoTemplate({
        //         title: "用户:" + row.realname,
        //         content: "地址:" + row.location
        //         // content: this.templateArr[1]
        //         // content: "派工人：${dispatch_realname}</br>任务内容：${content}</br>接单人：${realname}</br>处理情况：${handle_record}</br>预计完工时间:${plan_finish_date}</br>实际完工时间:${finish_date}</br>附件:</br>${fileids}"
        //     });

        //     //var graphic = new Graphic(point, this.setSymbol()[0], "", infoTemplate);
        //     var graphic = new Graphic(point, this.setSymbol()[0], "");
        //     if (i == 0) {

        //     }

        //     graphic.attr("id", "graphic" + i);
        //     this.userInfoGraphicLayer.add(graphic);
        //     //this.map.centerAt(point);

        //     //添加背景

        //     var graphictextbg = new Graphic(point, this.setSymbol()[1].setOffset(0, -20), "");
        //     this.userInfoGraphicLayer.add(graphictextbg);
        //     //添加文字
        //     var peopleTextSymbol = new TextSymbol(row.realname);
        //     peopleTextSymbol.setOffset(0, -25);
        //     var font = new Font();
        //     font.setSize("10pt");
        //     font.setWeight(Font.WEIGHT_BOLD);
        //     peopleTextSymbol.setFont(font);
        //     var graphicText = new Graphic(point, peopleTextSymbol, "");
        //     this.userInfoGraphicLayer.add(graphicText);

        //     //移动infowindow ()

        //     var infoWindowClass = '.RealtimeMonitorinfoWindow' + row.id;

        //     var infowindowObject = $(infoWindowClass);
        //     //if (infowindowObject.length == 0) { return; }
        //     var point = new Point(row.x, row.y, new SpatialReference({ wkid: this.map.spatialReference.wkid }));
        //     var screenPoint = this.map.toScreen(point);
        //     infowindowObject.css("left", (screenPoint.x - 7) + "px");
        //     infowindowObject.css("top", (screenPoint.y - 100 - 5) + "px");
        //     infowindowObject.css("display", "block");



        // }

    }


    //设置点的样式
    setSymbol() {
        var symbol = [];
        var peopleSymbol = new PictureMarkerSymbol(this.config.MarkPictureSymbol, 24, 24);
        var hiddedangerSymbol = new PictureMarkerSymbol(this.config.hiddendangerMarkPictureSymbol, 24, 24);
        var peopletextSymbol = new PictureMarkerSymbol(this.config.TextbgSymbol, 55, 18);
        symbol.push(peopleSymbol);
        symbol.push(peopletextSymbol);
        symbol.push(hiddedangerSymbol);
        return symbol;
    }
    //添加graphic图层
    addGraphicLayer() {
        if (this.map.getLayer("gpsInfo")) {
            return;
        } else {
            var graphicLayer = new GraphicsLayer();
            graphicLayer.id = "gpsInfo";
            this.userInfoGraphicLayer = graphicLayer;
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


    personclock() {
        //只刷新当前页
        // this.currentpage++;
        // if (this.currentpage > this.totalpage) {
        //     this.currentpage = 1;
        // }
        // this.showgpsinfo(this.currentpage, this.config.pagesize);
        console.log("实时刷新用户信息");
        this.showuserinfo(this.currentpage, this.config.pagesize);

    }

    hiddendangerclock() {
        //只刷新当前页
        // this.currentpage++;
        // if (this.currentpage > this.totalpage) {
        //     this.currentpage = 1;
        // }
        // this.showgpsinfo(this.currentpage, this.config.pagesize);
        console.log("实时刷新隐患信息");
        this.showyhinfo(this.currentpage, this.config.pagesize);

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



    showDetailPanel(htmlString, title, data) {
        this.detailpanel = new DetailPanel({
            id: "xunjianjiankong",
            title: title,
            html: htmlString,
            // width: 700,
            // height: 380,
            width: $('#mainContainer').width(),
            height: $('#mainContainer').height() * 0.4,
            data: data,
            readyCallback: this.onDetailPanelReady.bind(this)
        });
    }

    // onDetailPanel 初始化完成后调用
    onDetailPanelReady() {

    }


    destroy() {

        if (this.detailpanel != null) {
            this.detailpanel.Destroy();
        }
        if (this.userInfoGraphicLayer) {
            this.map.removeLayer(this.userInfoGraphicLayer);
            this.userInfoGraphicLayer.clear();
        }
        if (this.yhInfoGraphicLayer) {
            this.map.removeLayer(this.yhInfoGraphicLayer);
            this.yhInfoGraphicLayer.clear();
        }
        if (this.personint) {
            window.clearInterval(this.personint);
        }
        if (this.hiddendangerint) {
            window.clearInterval(this.hiddendangerint);
        }
        $(".RealtimeMonitor").remove();
        this.domObj.remove();
        this.afterDestroy();
    }
}