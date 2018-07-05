import BaseWidget = require('core/BaseWidget.class');
import ArcGISDynamicMapServiceLayer = require("esri/layers/ArcGISDynamicMapServiceLayer");
import LayerInfo = require("esri/layers/LayerInfo");
import Map = require("esri/map");
import FeaturtLayer = require("esri/layers/FeatureLayer");
import InfoTemplate = require("esri/InfoTemplate");
import Popup = require("esri/dijit/Popup");
import PopupTemplate = require("esri/dijit/PopupTemplate");
import InfoWindow = require("esri/dijit/InfoWindow");
import domConstruct = require("dojo/dom-construct");
import IdentifyParameters = require("esri/tasks/IdentifyParameters");
import IdentifyTask = require("esri/tasks/IdentifyTask");
import mapPoint = require("esri/geometry/Point");
import Graphic = require("esri/graphic");
import SimpleMarkerSymbol = require("esri/symbols/SimpleMarkerSymbol");
import Color = require("esri/Color");
import ScreenPoint = require('esri/geometry/ScreenPoint');
import GraphicsLayer = require("esri/layers/GraphicsLayer");
import QueryTask = require("esri/tasks/QueryTask");
import Query = require("esri/tasks/query");
import Point = require("esri/geometry/Point");
import BlankPanel = require('widgets/BlankPanel/Widget');




export = SCADAwatching;





class SCADAwatching extends BaseWidget {
    baseClass = "SCADAwatching";


    map: Map = null;
    SCADALayerInfo: LayerInfo = null;
    //[scadaMapPoint1,scadaMapPoint2,...],save all the scada mapPoint 
    scadaMapPoint = [];
    symbol;
    scadaScreenPoint;
    scadaNumber: number = 0;
    graphicCount: number = 0;
    templateArr: Array<string> = null;

    infoWindowCount: number = 0;
    //
    currentPage;
    //
    currentPageIndex;
    //用于时间的叠加
    j = 1;
    //
    blankChartPanel;
    //setInterval返回的值，用于清除定时器
    setInterval;


    startup() {

        this.templateArr = this.template.split('$$');

        this.setHtml(_.template(this.templateArr[0])({
            hello: this.config.hello + (/\/([a-zA-Z]+)$/g.exec(this.widgetPath)[1])
        }));
        this.SCADAwatchingInit();
    }

    destroy() {
        this.domObj.remove();
        this.afterDestroy();
        this.backToInit(true);
        ///清除定时器
        clearInterval(this.setInterval);
    }
    SCADAwatchingInit() {
        this.map = this.AppX.runtimeConfig.map;
        //根据设置的条数获取指定页的全部scada信息，存入变量currentPage中
        this.currentPage = this.getAllScadaInfo(this.config.onePageCount, 1);
        //初始化scada列表信息
        this.initDataTable(this.currentPage);
        $(".SCADAwatching .pre").bind("click", this.prePage.bind(this));
        $(".SCADAwatching .next").bind("click", this.nextPage.bind(this));
        $(".SCADAwatching .pageturning").bind("click", this.goPage.bind(this));
        this.map.graphics.clear();
        //设置scada站点的样式
        this.symbol = this.setSymbol();
        //show all the scada infomation
        $(".SCADAwatching input").bind('change', this.openSCADAWatching.bind(this));

        // this.map.on("click", this.mapClickEvent.bind(this));
        this.map.on("pan", this.mapExtentChange.bind(this));
        this.map.on("zoom-start", this.zoomStartEvent.bind(this));
        this.map.on("zoom-end", this.zoomEndEvent.bind(this));
        //一定时间后更新scada信息
        this.setInterval = setInterval(this.updateScadaInfo.bind(this), this.config.updateInterval);

        // setInterval(function () {    

        //     if (this.infoWindowCount > 0) {
        //         for (var i = 0; i < this.infoWindowCount; i++) {
        //             var inPressure = $(".infoWindow" + i + " .SCADAwatching-enter").text().replace("进站压力：", "");
        //             inPressure = inPressure.replace("Mpa", "");
        //             var outPressure = $(".infoWindow" + i + " .SCADAwatching-exist").text().replace("出站压力：", "");
        //             outPressure = outPressure.replace("Mpa", "");
        //             var time = $(".infoWindow" + i + " .SCADAwatching-time").text();
        //             var currentTime = "时间：13:30:" + 6 * this.j;
        //             this.j++;

        //             var enterPressure = (parseFloat(inPressure) * Math.random() + 0.5).toFixed(2);
        //             var existPressure = (parseFloat(outPressure) * Math.random() + 0.5).toFixed(2);
        //             $(".infoWindow" + i + " .SCADAwatching-enter").text("进站压力：" + enterPressure + "Mpa");
        //             $(".infoWindow" + i + " .SCADAwatching-exist").text("出站压力：" + existPressure + "Mpa");
        //             $(".infoWindow" + i + " .SCADAwatching-time").text(currentTime);
        //             if (parseFloat(enterPressure) > parseFloat($(".infoWindow" + i + " .SCADAwatching-enter").attr("max"))) {
        //                 $(".infoWindow" + i + " .SCADAwatching-enter").css("color", "red");
        //             } else {
        //                 $(".infoWindow" + i + " .SCADAwatching-enter").css("color", "black");
        //             }
        //             if (parseFloat(existPressure) > parseFloat($(".infoWindow" + i + " .SCADAwatching-exist").attr("max"))) {
        //                 $(".infoWindow" + i + " .SCADAwatching-exist").css("color", "red")
        //             } else {
        //                 $(".infoWindow" + i + " .SCADAwatching-exist").css("color", "black")
        //             }
        //         }

        //     } else {
        //         return;
        //     }

        // }.bind(this), 6000);

        setInterval(function () {
            $(".stationData").text(function (index, val) {
                return ((parseFloat(val) * (Math.random() + 0.5)).toFixed(2)).toString();
            });
        }.bind(this), 3000)




    }
    backToInit(closeMode: boolean) {
        this.map.graphics.clear();
        $(".infoWindow").remove();
        if (this.map.getLayer("scada") && closeMode == true) {
            var Layer = this.map.getLayer("scada");
            this.map.removeLayer(Layer);
        }

    }


    //根据每页显示的条数和当前页，发送ajax同步请求，返回请求结果
    getAllScadaInfo(pageSize: number, pageIndex: number) {
        //请求指定条数下特定页scada接口url
        var scadaurl = this.AppX.appConfig.apiroot + "/scada/values";
        //
        var data;



        //发送ajax同步请求
        $.ajax({
            headers: {
                'Authorization-Token': AppX.appConfig.usertoken
            },
            url: scadaurl,
            type: "post",
            dataType: "json",
            data: {
                pagesize: pageSize,
                pagenumber: pageIndex

            },
            async: false,
            success: function (result) {
                data = result;
            }.bind(this),
            error: function () {
                console.log('获取所有SCDA信息出错！')
            }

        });
        return data;
    }

    // getOneScadaInfo(scadaId: number) {
    //     var scadaurl = this.AppX.appConfig.gisResource.apiscada.config[0].url + "/GetSCADAInfo";
    //     var data;
    //     $.ajax({
    //         url: scadaurl,
    //         type: "get",
    //         dataType: "json",
    //         data: {
    //             _fid: scadaId

    //         },
    //         async: false,
    //         success: function (result) {
    //             data = result;
    //         }.bind(this),
    //         error: function () {

    //         }

    //     });
    //     return data;
    // }

    initDataTable(data) {
        //
        var content = "第" + (data.result.pagenumber) + "页" + "共" + data.result.totalnumberofpages + "页";
        var allRow: string = "";
        //可省略
        var inputMP = '';
        var outputMP = '';
        var enterMax = '';
        var enterMin = '';
        var existMax = '';
        var existMin = '';
        var name = '';
        $(".SCADAwatching button.content").text(content);
        var trElem = $(".SCADAwatching tbody tr");
        //
        if (trElem.length > 0) {
            trElem.remove();
        }

        for (var i = 0, dataLength = data.result.rows.length; i < dataLength; i++) {
            //每个站场的信息
            var row = data.result.rows[i];
            //站场名称
            name = row.name;
            //将站场id添加入每项的class中
            var itemId = "item" + row.owner_fid;

            //站场信息不为零（进站压力，出站压力等）
            if (row.info != null) {
                for (var j = 0; j < row.info.length; j++) {
                    if (row.info[j].import == 1) {
                        //进站压力
                        inputMP = row.info[j].value;
                        //进站最大值
                        enterMax = row.info[j].maxval;
                        //进站最小值
                        enterMin = row.info[j].minval;
                    } else if (row.info[j].import == 2) {
                        //出站压力：
                        outputMP = row.info[j].value;
                        //出站最大值
                        existMax = row.info[j].maxval;
                        //出站最小值
                        existMin = row.info[j].minval;
                    }
                }
            }

            allRow = allRow + " <tr class='" + itemId + "' enterMax='" + enterMax + "' enterMin='" + enterMin + "' existMax='" + existMax + "' existMin='" + existMin + "'>"
                + "<td>" + name + "</td><td class=\"enterPressure\">" +
                inputMP + "</td><td class=\'existPressure\'>" + outputMP + "</td><td><a value=\"" + i + "\">详情</a></td> </tr>";
        }
        //添加空的表格项
        if (data.result.rows.length < this.config.onePageCount) {
            for (var i = 0; i < this.config.onePageCount - dataLength; i++) {
                allRow = allRow + " <tr>" + " <td></td><td>" + "" + "</td><td>" + "" + "</td><td><a></a></td> </tr>";
            }
        }
        $(allRow).appendTo($(".SCADAwatching tbody"));
        //站场详情的单击事件
        $(".SCADAwatching a").bind("click", this.locateSacada.bind(this));
    }
    locateSacada(event) {
        this.currentPageIndex = parseInt(event.currentTarget.attributes.value.value);
        //获取需要查看的站场代码
        var scadaId = this.currentPage.result.rows[this.currentPageIndex].owner_fid;
        //当前查询站场的信息
        var scadaInfo = this.currentPage.result.rows[this.currentPageIndex];
        //获取需要的信息，包括进出站的最大和最小值
        if (scadaInfo.info != null) {
            for (var i = 0; i < scadaInfo.info.length; i++) {
                var info = scadaInfo.info;
                if (info[i].import == 1) {
                    var enterMax = info[i].maxval;
                    var enterMin = info[i].minval;
                } else if (info[i].import == 2) {
                    var existMax = info[i].maxval;
                    var existMin = info[i].minval;
                }
            }
        }

        //scada站点在地图中的点
        var mapPoint = new Point(scadaInfo.x, scadaInfo.y, this.map.spatialReference);
        //添加站点图形
        var scadaGraphic = new Graphic(mapPoint, this.symbol.SimpleMarkerSymbol, { graphic: "graphic" + scadaId });
        this.map.graphics.add(scadaGraphic);
        ///添加infowindow到地图
        var screenPoint = this.map.toScreen(mapPoint);
        var selector = this.addInfowindowToMap(screenPoint, scadaId, enterMin, enterMax, existMin, existMax);
        ///保存所有的scada站点
        var scadaPoint = [];
        scadaPoint.push(mapPoint);
        scadaPoint.push(scadaId);
        this.scadaMapPoint.push(scadaPoint);
        ///定位到改点
        this.map.centerAt(mapPoint);
        //设置infowindow的文本
        var enterPressure = "1.11MP";
        var existPressure = "2.22MP";
        var time = "12:23:11";
        var name;
        if (scadaInfo.info != null) {
            for (var i = 0, length = scadaInfo.info.length; i < length; i++) {
                var info = scadaInfo.info;
                var name = scadaInfo.name;
                if (info[i].import == 1) {
                    enterPressure = info[i].value + info[i].unit;
                    time = scadaInfo.info[i].time;
                } else if (info[i].import == 2) {
                    existPressure = info[i].value + info[i].unit;
                }

            }
        }

        this.setInfowindowText(name, selector, enterPressure, existPressure, time);

    }

    // // 按条件查询指定图层。
    // doQueryTask(url, SQL, scadaId, enterMin, enterMax, existMin, existMax) {
    //     var that = this;
    //     var queryTask = new QueryTask(url);
    //     var query = new Query();
    //     query.where = SQL;
    //     query.outFields = ["*"];
    //     query.returnGeometry = true;
    //     queryTask.execute(query).then(function (result) {
    //         //添加相应的graphic到图层
    //         var scadaGraphic = new Graphic(result.features[0].geometry, this.symbol.SimpleMarkerSymbol, { graphic: "graphic" + scadaId });
    //         this.map.graphics.add(scadaGraphic);
    //         var mapPoint = new Point(result.features[0].geometry.x, result.features[0].geometry.y, this.map.spatialReference)
    //         var screenPoint = this.map.toScreen(mapPoint);
    //         var selector = this.addInfowindowToMap(screenPoint, scadaId, enterMin, enterMax, existMin, existMax);
    //         //save all the scadaPoint
    //         var scadaPoint = [];
    //         scadaPoint.push(mapPoint);
    //         scadaPoint.push(scadaId);
    //         that.scadaMapPoint.push(scadaPoint);
    //         //定位到改点
    //         that.map.centerAt(mapPoint);

    //         //可省略
    //         var enterPressure = "1.11MP";
    //         var existPressure = "2.22MP";
    //         var time = "12:23:11";

    //         for (var i = 0; i < this.currentPage.Rows[this.currentPageIndex].info.length; i++) {
    //             if (this.currentPage.Rows[this.currentPageIndex].info[i].import == 1) {
    //                 enterPressure = this.currentPage.Rows[this.currentPageIndex].info[i].value + this.currentPage.Rows[this.currentPageIndex].info[i].unit;
    //                 time = this.currentPage.Rows[this.currentPageIndex].info[i].time;
    //             } else if (this.currentPage.Rows[this.currentPageIndex].info[i].import == 2) {
    //                 existPressure = this.currentPage.Rows[this.currentPageIndex].info[i].value + this.currentPage.Rows[this.currentPageIndex].info[i].unit;
    //             }

    //         }



    //         this.setInfowindowText(selector, enterPressure, existPressure, time);

    //     }.bind(this));

    // }

    //站场信息后退一页
    prePage() {

        this.backToInit(false);
        var checked = $(".SCADAwatching input:checked");
        if (checked.length != 0) {
            checked.prop("checked", false);
        }
        var pageNumber = this.currentPage.result.pagenumber;
        if (pageNumber > 1) {
            this.currentPage = this.getAllScadaInfo(this.config.onePageCount, pageNumber - 1);
            this.initDataTable(this.currentPage);
        }
    }
    //站场信息前进一页
    nextPage() {
        //移除scada站点和infowindow
        this.backToInit(false);
        //是否勾选显示全部监控
        var checked = $(".SCADAwatching input:checked");
        if (checked.length != 0) {
            checked.prop("checked", false);
        }
        //
        var pageNumber = this.currentPage.result.pagenumber;
        if (pageNumber < this.currentPage.result.totalnumberofpages) {
            this.currentPage = this.getAllScadaInfo(this.config.onePageCount, pageNumber + 1);
            this.initDataTable(this.currentPage);
        }
    }
    //站场信息跳转至某页
    goPage() {
        this.backToInit(false);
        var checked = $(".SCADAwatching input:checked");
        if (checked.length != 0) {
            checked.prop("checked", false);
        }
        var goPage = parseInt($(".SCADAwatching input.currpage").val());
        if (goPage > 0 && goPage < this.currentPage.result.totalnumberofpages + 1) {
            this.currentPage = this.getAllScadaInfo(this.config.onePageCount, goPage);
            this.initDataTable(this.currentPage);
        }
    }

    //添加infowindow到地图
    addInfowindowToMap(scadaPoint: ScreenPoint, scadaId: number, enterMin: number, enterMax: number, existMin: number, existMax: number) {

        var infowindow = $(".infoWindow" + scadaId);
        //avoid repeating add infowindow
        if (infowindow.length != 0) {
            return;
        } else {
            //contain the infwindow 
            var className = "infoWindow infoWindow" + scadaId;
            $("<div  class=\"" + className + "\"></div>").appendTo($("#mainContainer"));
            var infowindow = $(".infoWindow" + scadaId);
            $(this.templateArr[1]).appendTo(infowindow);
            infowindow.css("left", (scadaPoint.x - 7) + "px");
            infowindow.css("top", (scadaPoint.y - 125 - 5) + "px");
            infowindow.attr("enterMin", enterMin);
            infowindow.attr("enterMax", enterMax);
            infowindow.attr("existMin", existMin);
            infowindow.attr("existMax", existMax);
            $(".infoWindow" + scadaId + " .SCADAwatching-titleButton").addClass(".infoWindowtest" + scadaId);

        }
        var selector = ".infoWindow" + scadaId;
        //add the close event 
        $(selector + " .SCADAwatching-titleButton").bind("click", this.scadaClose.bind(this));

        //add the more info click event
        $(selector + " .detail").bind("click", this.detailClick.bind(this));
        return selector;
    }
    //设置infowindow的信息
    setInfowindowText(name, selector, enterPressure, existPressure, time) {
        $(selector + " .SCADAwatching-title").text(name);
        $(selector + " .SCADAwatching-enter").text("进站压力：" + enterPressure);
        $(selector + " .SCADAwatching-exist").text("出站压力：" + existPressure);
        $(selector + " .SCADAwatching-time").text("时间：" + time);

        enterPressure = parseFloat(enterPressure.replace("Mpa", ""));
        existPressure = parseFloat(existPressure.replace("Mpa", ""));
        if (enterPressure > parseFloat($(selector).attr("enterMax")) || enterPressure < parseFloat($(selector).attr("enterMin"))) {
            $(selector + " .SCADAwatching-enter").css("color", "red");

        } else {
            $(selector + " .SCADAwatching-enter").css("color", "black");

        }
        if (existPressure > parseFloat($(selector).attr("existMax")) || existPressure < parseFloat($(selector).attr("existMin"))) {
            $(selector + " .SCADAwatching-exist").css("color", "red");

        } else {
            $(selector + " .SCADAwatching-exist").css("color", "black");

        }

    }

    detailClick() {

        this.addBlankDataPanel();

    }
    addBlankDataPanel() {

        var html: string = this.templateArr[2];

        this.blankChartPanel = new BlankPanel({
            id: "stationFlowsheet",
            title: "工艺流程图",
            html: html,
            width: this.config.dataPanel.width,
            height: this.config.dataPanel.height,
            readyCallback: this.onBlankPanelReady.bind(this)
        });

    }

    onBlankPanelReady() {

    }

    //更新scada信息
    updateScadaInfo() {
        // //if there have no infowindow then return .
        // if ($(".infoWindow").length == 0) {
        //     return
        // }


        // //get the class attribute value of  all the scada infowindow
        // var className = []
        // $(".infoWindow").prop("class", function (index, attr) {
        //     className.push(attr);
        // }.bind(this));

        var pageIndex = $(".SCADAwatching button.content").text().match(/\d/)[0];//当前为第几页
        //get all the scada info  
        var scadaurl = this.AppX.appConfig.apiroot + "/scada/values";
        $.ajax({
            headers: {
                'Authorization-Token': AppX.appConfig.usertoken
            },
            url: scadaurl,
            type: "post",
            dataType: "json",
            data: {
                pagesize: this.config.onePageCount,
                pagenumber: pageIndex
            },
            async: true,
            success: function (result) {
                var data;
                ///更新表中的scada信息
                var itemClassName = [];
                $(".SCADAwatching tr").prop("class", function (index, attr) {
                    itemClassName.push(attr);
                }.bind(this));
                for (var i = 1, length = itemClassName.length; i < length; i++) {
                    var scadaId: number = parseInt(itemClassName[i].replace("item", "").trim());
                    // var data = this.getOneScadaInfo(scadaId);
                    for (var j = 0, len = result.result.rows.length; j < len; j++) {
                        if (result.result.rows[j].owner_fid == scadaId) {
                            data = result.result.rows[j];
                        }
                    }
                    var info = this.getNeedScadaInfo(data);
                    if (info)
                        this.upTableText(".item" + scadaId, info[1], info[2], info[3]);
                }

                ///更新infowindow中的scada信息
                if ($(".infoWindow").length != 0) {
                    //get the class attribute value of  all the scada infowindow
                    var className = [];
                    $(".infoWindow").prop("class", function (index, attr) {
                        className.push(attr);
                    }.bind(this));
                    for (var i = 0, length = className.length; i < length; i++) {
                        var scadaId: number = parseInt(className[i].replace("infoWindow infoWindow", "").trim());
                        // var data = this.getOneScadaInfo(scadaId);
                        for (var j = 0, len = result.result.rows.length; j < len; j++) {
                            if (result.result.rows[j].owner_fid == scadaId) {
                                data = result.result.rows[j];
                            }
                        }
                        var info = this.getNeedScadaInfo(data);
                        if (info)
                            this.setInfowindowText(info[0], ".infoWindow" + scadaId, info[1], info[2], info[3]);
                    }

                }



            }.bind(this),
            error: function () {

            }

        });

    }
    upTableText(selector, enterPressure, existPressure, time) {
        $(selector + " .enterPressure").text(enterPressure.replace('MPa', ''));
        $(selector + " .existPressure").text(existPressure.replace('MPa', ''));

        enterPressure = parseFloat(enterPressure.replace("MPa", ""));
        existPressure = parseFloat(existPressure.replace("Mpa", ""));
        if (enterPressure > parseFloat($(selector).attr("enterMax")) || enterPressure < parseFloat($(selector).attr("enterMin"))) {
            $(selector + " .enterPressure").css("color", "red");
        } else {

            $(selector + " .enterPressure").css("color", "black");
        }
        if (existPressure > parseFloat($(selector).attr("existMax")) || existPressure < parseFloat($(selector).attr("existMin"))) {

            $(selector + " .existPressure").css("color", "red");
        } else {

            $(selector + " .existPressure").css("color", "black");
        }

    }

    //return the enterPressure ,existPressure and time of scada station.
    getNeedScadaInfo(data) {
        if (!data)
            return;
        var info = [];
        var name = data.name;
        var enterPressure: string = '';
        var existPressure: string = '';
        var time = '';
        if (data.info != null) {
            for (var i = 0; i < data.info.length; i++) {
                if (data.info[i].import == 1) {
                    //模拟
                    enterPressure = (data.info[i].value * (Math.random() + 0.5)).toFixed(2) + data.info[i].unit;
                    // enterPressure = data.info[i].value + data.info[i].unit;
                    if (data.info[i].time != null) {
                        time = data.info[i].time;
                    }

                } else if (data.info[i].import == 2) {
                    //模拟
                    existPressure = (data.info[i].value * (Math.random() + 0.5)).toFixed(2) + data.info[i].unit;
                    // existPressure = data.info[i].value + data.info[i].unit;
                }
            }
        }
        info.push(name);
        info.push(enterPressure);
        info.push(existPressure);
        info.push(time);
        return info;
    }

    scadaClose(event) {
        console.log("1");
        var className = event.currentTarget.className.replace("SCADAwatching-titleButton close", "");
        var currentInfowindow = className.replace("test", "");
        $(currentInfowindow).remove();
        var currentGraphic = className.replace(".infoWindowtest", 'graphic').trim()
        for (var i = 0; i < this.map.graphics.graphics.length; i++) {
            if (this.map.graphics.graphics[i].attributes.graphic == currentGraphic) {
                this.map.graphics.graphics[i].hide();
            }
        }

        // event.currentTarget.remove();
    }
    openSCADAWatching(change) {



        var checked = $(".SCADAwatching input:checked");
        //勾选显示全部的scada信息
        if (checked.length != 0) {
            $(".SCADAwatching a").trigger("click");


        } else {
            //clear scada point graphic
            this.map.graphics.clear();
            //clear infoWindow
            $(".infoWindow").remove();


        }

    }
    // mapClickEvent(event) {
    //     var identifyTask = new IdentifyTask(this.config.SCADAUrl);
    //     var identifyParameters = new IdentifyParameters();

    //     //设置几何查询图形
    //     identifyParameters.geometry = event.mapPoint;
    //     identifyParameters.mapExtent = this.map.extent;
    //     identifyParameters.tolerance = 2;
    //     identifyParameters.returnGeometry = true;    //contain in the feture'geometry attribute of the result
    //     identifyParameters.spatialReference = this.map.spatialReference;
    //     identifyTask.execute(identifyParameters).then(
    //         this.identifyTaskCallBack.bind(this),
    //         function(error) {
    //             console.error(error)
    //         });

    //     this.scadaScreenPoint = this.map.toScreen(event.mapPoint);


    // }
    // identifyTaskCallBack(result) {

    //     if (result.length == 0) {
    //         return;
    //     } else {
    //         var scadaMapPoint = new mapPoint({
    //             x: result[0].feature.geometry.x,
    //             y: result[0].feature.geometry.y,
    //             spatialReference: this.map.spatialReference
    //         })
    //         //获取对应点击点的站场代码
    //         var scadaId = result[0].feature.attributes.站场代码;
    //         ///通过站场代码判断infowWindow是否添加，如果已经添加将不发送请求
    //         var scadaInfoWindows = $(".infoWindow");
    //         for (var i = 0; i < scadaInfoWindows.length; i++) {
    //             if (scadaInfoWindows[i].getAttribute("scadaPointId") == scadaId) {
    //                 return;
    //             }
    //             console.log("test  ");
    //         }
    //         this.scadaMapPoint.push(scadaMapPoint);
    //         var scadaGraphic = new Graphic(result[0].feature.geometry, this.symbol.SimpleMarkerSymbol, { graphic: "graphic" + this.graphicCount });
    //         this.map.graphics.add(scadaGraphic);
    //         this.graphicCount++;
    //         $.ajax({
    //             type: "get",
    //             url: this.AppX.appConfig.gisResource.apiscada.config[0].url + "/GetSCADAInfo",
    //             data: {
    //                 _fid: scadaId
    //             },
    //             success: this.AjaxCallBack.bind(this),
    //             async: false,
    //             dataType: "json"

    //         });

    //     }


    // }
    AjaxCallBack(result) {



        var className = "infoWindow infoWindow" + this.scadaNumber;
        $("<div  class=\"" + className + "\"></div>").appendTo($("#mainContainer"));
        $(this.templateArr[1]).appendTo($(".infoWindow" + this.scadaNumber));
        $(".infoWindow" + this.scadaNumber).css("left", (this.scadaScreenPoint.x - 7) + "px");
        $(".infoWindow" + this.scadaNumber).css("top", (this.scadaScreenPoint.y - 125 - 5) + "px");
        //将站场代码放入infowwindow的自定义属性中
        var owner_fid = "1234525";
        if (result.length != 0) {
            owner_fid = result[0].owner_fid
        }
        $(".infoWindow" + this.scadaNumber).attr("scadaPointId", owner_fid);

        var enterPressure = "0.43Mpa";
        var existPressure = "0.32Mpa";
        var maxEnterPressure = 1;
        var maxExistPressure = 1;
        var time = "13:30:00";
        if (result.length != 0) {
            for (var i = 0; i < result[0].info.length; i++) {
                if (result[0].info[i].import == 1) {
                    enterPressure = result[0].info[i].value + result[0].info[i].unit;
                    if (result[0].info[i].time != null) {
                        time = result[0].info[i].time;
                    }

                    maxEnterPressure = result[0].info[i].value + result[0].info[i].maxval;
                }
                if (result[0].info[i].import == 2) {
                    existPressure = result[0].info[i].value + result[0].info[i].unit;
                    maxExistPressure = result[0].info[i].value + result[0].info[i].maxval;
                }
            }
        }


        $(".infoWindow" + this.scadaNumber + " .SCADAwatching-enter").text("进站压力：" + enterPressure);
        $(".infoWindow" + this.scadaNumber + " .SCADAwatching-enter").attr("max", maxEnterPressure);
        $(".infoWindow" + this.scadaNumber + " .SCADAwatching-exist").text("出站压力：" + existPressure);
        $(".infoWindow" + this.scadaNumber + " .SCADAwatching-exist").attr("max", maxExistPressure);
        $(".infoWindow" + this.scadaNumber + " .SCADAwatching-time").text("时间：" + time);
        $(".infoWindow" + this.scadaNumber + " .SCADAwatching-titleButton").addClass(".infoWindowtest" + this.scadaNumber);



        this.infoWindowCount++;
        $(".infoWindow" + this.scadaNumber + " .SCADAwatching-titleButton").bind("click", this.scadaClose.bind(this));

        this.scadaNumber++;
    }
    setSymbol() {
        var symbol = {
            "SimpleMarkerSymbol": null
        };
        symbol.SimpleMarkerSymbol = new SimpleMarkerSymbol(
            {
                color: new Color("#FFFFFF"),
                size: 7,
                style: "circle",       //点样式cross|square|diamond|circle|x
                outline: {
                    color: new Color("#0000FF"),
                    width: 5
                }
            }

        );
        return symbol;
    }
    mapExtentChange(event) {
        if (this.scadaMapPoint.length == 0) {
            return;
        }
        for (var i = 0; i < this.scadaMapPoint.length; i++) {
            var infoWindowClass = '.infoWindow' + this.scadaMapPoint[i][1];
            var screenPoint = this.map.toScreen(this.scadaMapPoint[i][0]);
            var left = screenPoint.x + event.delta.x;
            var top = screenPoint.y + event.delta.y;
            var infowindowObject = $(infoWindowClass);
            infowindowObject.css("left", (left - 7) + "px");
            infowindowObject.css("top", (top - 125 - 5) + "px");
            infowindowObject.css("display", "block");


        }
    }
    zoomStartEvent() {
        if (this.scadaMapPoint.length == 0) {
            return;
        }
        for (var i = 0; i < this.scadaMapPoint.length; i++) {

            var infoWindowClass = '.infoWindow' + this.scadaMapPoint[i][1];
            $(infoWindowClass).css("display", "none");
        }

    }
    zoomEndEvent() {
        if (this.scadaMapPoint.length == 0) {
            return;
        }
        for (var i = 0; i < this.scadaMapPoint.length; i++) {
            var infoWindowClass = '.infoWindow' + this.scadaMapPoint[i][1];
            var screenPoint = this.map.toScreen(this.scadaMapPoint[i][0]);
            var infowindowObject = $(infoWindowClass);
            infowindowObject.css("left", (screenPoint.x - 7) + "px");
            infowindowObject.css("top", (screenPoint.y - 125 - 5) + "px");
            infowindowObject.css("display", "block");
        }

    }
}