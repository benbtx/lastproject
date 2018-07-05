import BaseWidget = require('core/BaseWidget.class');


import Map = require('esri/map');
import LayerInfo = require("esri/layers/LayerInfo");
import ArcGISDynamicMapServiceLayer = require("esri/layers/ArcGISDynamicMapServiceLayer");
import ArcGISTiledMapServiceLayer = require("esri/layers/ArcGISTiledMapServiceLayer");
import SpatialReference = require("esri/SpatialReference");
import Extent = require("esri/geometry/Extent");



import GraphicsLayer = require("esri/layers/GraphicsLayer");
import Graphic = require("esri/graphic");
import PictureMarkerSymbol = require("esri/symbols/PictureMarkerSymbol");
import Point = require("esri/geometry/Point");
import InfoTemplate = require("esri/InfoTemplate");
import SimpleMarkerSymbol = require("esri/symbols/SimpleMarkerSymbol");
import Color = require("esri/Color");





export = MobileInfoUpload;

class MobileInfoUpload extends BaseWidget {
    baseClass = "MobileInfoUpload";


    //定位点样式
    symbol;
    //当前地图对象
    map: Map;
    //当前graphic存放的图层
    mobileInfoUploadGraphicLayer: GraphicsLayer;
    //
    notChange: boolean = false;
    //保存当前页的所有上报信息
    currentPage;
    //HTML模板
    templateArr: Array<string> = null;
    //用来标识当前气泡的graphic
    currentPoint = null;


    startup() {
        this.templateArr = this.template.split('$$');
        this.setHtml(_.template(this.templateArr[0])({
            hello: this.config.hello + (/\/([a-zA-Z]+)$/g.exec(this.widgetPath)[1])
        }));
        this.init();


        this.test();


    }

    destroy() {
        this.domObj.remove();
        this.afterDestroy();

        this.map.removeLayer(this.mobileInfoUploadGraphicLayer);
        //隐藏infowindow
        this.map.infoWindow.hide();

    }
    test() {
        function Person(name, age, job) {
            this.name = name;
            this.age = age;
            this.job = job;
            this.sayName = function () {
                alert(this.name);
            };
        }
        var person1 = new Person("Tom", 13, "child");
        var person2 = new Person("xiaoming", 24, "worker");



    }

    inherit(p) {
        if (p == null) throw TypeError;
        if (Object.create)
            return Object.create(p);
        var t = typeof p;
        if (t !== "object" && t !== "function") throw TypeError;
        function f() { };
        f.prototype = p;
        return new f();
    }



    init() {


        //jquery 日期控件初始化
        $.jeDate(".MobileInfoUpload .startDate", {
            format: 'YYYY-MM-DD', //日期格式  
            isinitVal: false,
            choosefun: function (elem, val) {
                this.startDate = val;


            }.bind(this)
        })
        //jquery 日期控件初始化
        $.jeDate(".MobileInfoUpload .endDate", {
            format: 'YYYY-MM-DD', //日期格式  
            isinitVal: false,
            choosefun: function (elem, val) {
                var startDate = this.startDate.split("-");
                var startTime = new Date(startDate[0], startDate[1], startDate[2]);
                var startMinute = startTime.getTime();
                var endDate = val.split("-");
                var endTime = new Date(endDate[0], endDate[1], endDate[2]);
                var endMinute = endTime.getTime();
                if (endMinute < startMinute) {
                    this.AppX.runtimeConfig.toast.Show('终止时间不能小于起始时间！');
                }
            }.bind(this),
            okfun: function (elem, val) {
                var startDate = this.startDate.split("-");
                var startTime = new Date(startDate[0], startDate[1], startDate[2]);
                var startMinute = startTime.getTime();
                var endDate = val.split("-");
                var endTime = new Date(endDate[0], endDate[1], endDate[2]);
                var endMinute = endTime.getTime();
                if (endMinute < startMinute) {
                    this.AppX.runtimeConfig.toast.Show('终止时间不能小于起始时间！');
                }
            }.bind(this)
        })
        //init map object
        this.map = this.AppX.runtimeConfig.map;
        //set the symbol of point 
        this.symbol = this.setSymbol();
        //
        this.addGraphicLayer();
        //bind the query click event
        $(".MobileInfoUpload .query").on("click", this.queryClick.bind(this));
        $(".MobileInfoUpload button.pre").on("click", this.preClick.bind(this));
        $(".MobileInfoUpload button.next").on("click", this.nextClick.bind(this));
        $(".MobileInfoUpload  button.pageturning").on("click", this.pageturningClick.bind(this));
    }

    //添加graphic图层
    addGraphicLayer() {
        if (this.map.getLayer("MobileInfoUpload")) {
            return;
        } else {
            var graphicLayer = new GraphicsLayer();
            graphicLayer.id = "MobileInfoUpload";
            this.map.addLayer(graphicLayer);
            this.mobileInfoUploadGraphicLayer = graphicLayer;
        }

    }
    //设置点的样式
    setSymbol() {
        var symbol = [];
        var redPointSymbol = new PictureMarkerSymbol(this.root + '/widgets/MobileInfoUpload/css/images/redPoint.png', 16, 22);
        var bulePointSymbol = new PictureMarkerSymbol(this.root + '/widgets/MobileInfoUpload/css/images/bluePoint.png', 16, 22);
        var greenPointSymbol = new PictureMarkerSymbol(this.root + '/widgets/MobileInfoUpload/css/images/greenPoint.png', 16, 22);
        //当前点的样式
        var currentPoint = new SimpleMarkerSymbol(
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

        );
        currentPoint.setStyle(SimpleMarkerSymbol.STYLE_X);
        symbol.push(redPointSymbol);
        symbol.push(bulePointSymbol);
        symbol.push(greenPointSymbol);
        symbol.push(currentPoint);
        return symbol;
    }
    //移动上报查询
    queryClick() {
        //获取上报人或者标题的值
        var filter = $(".MobileInfoUpload .filter").val();
        //获取上报起始日期
        var startDate = $(".MobileInfoUpload .startDate").val();
        //获取上报终止日期
        var endDate = $(".MobileInfoUpload .endDate").val();

        //时间段不可为空
        if (startDate == "" || endDate == "") {
            this.AppX.runtimeConfig.toast.Show('时间段不能为空');
            return;
        }
        //获取第x页共x页
        var content = $(".MobileInfoUpload  button.content").text();
        if (this.notChange == true) {
            var number = content.split("共")[0];
            var pageNumber = parseInt(number.match(/\d+/)[0]);
        } else {
            var pageNumber = 1;
        }
        $.ajax({
            headers: {
                'Authorization-Token': AppX.appConfig.usertoken
            },
            type: "post",
            url: this.AppX.appConfig.apiroot + "/webapp/submitinfo",
            data: {
                pagenumber: pageNumber, //第几页
                pagesize: this.config.pageCount, //每页显示的数量
                filter: filter, //可选，上报人或标题
                date_before: startDate,//日期区间起点
                date_after: endDate,//日期区间终点
            },
            success: function (result) {

                this.updateTable(result);
            }.bind(this),
            error: function () {

            },
            dataType: "JSON"
        });

    }

    //更新biaoge
    updateTable(result) {
        //当前页的所有上报信息
        this.currentPage = result.result;
        //清除之前的表达内容
        var tr = $(".MobileInfoUpload tbody tr");
        if (tr.length != 0) {
            tr.remove();
        }

        //当前页记录条数
        var items = result.result.rows;
        var itemsElem = "";
        for (var i = 0, length = items.length; i < length; i++) {
            //标题
            var caption = items[i].caption;
            //上报人
            var name = items[i].realname;
            //上报日期
            var uploaDate = items[i].submitdate.split("T")[0];
            //地址
            var address = items[i].address;
            itemsElem = itemsElem + "<tr><td>" + caption + " </td><td>" + name + " </td> <td>" + uploaDate + " </td><td>" + address + " </td></tr>";
        }
        $(itemsElem).appendTo($(".MobileInfoUpload tbody"));

        var allPage = result.result.totalnumberofpages;
        var content = "第" + (result.result.pagenumber) + "页" + "共" + allPage + "页";
        $(".MobileInfoUpload button.content").text(content);
        this.notChange = false;
        //添加工单气泡
        this.addPointGraphic(result);
        //每条信息点击事件
        var itemTr = $(".MobileInfoUpload tbody tr");
        itemTr.on("click", this.itemClick.bind(this));
        //触发单击事件
        itemTr.trigger("click");


    }
    //添加工单气泡
    addPointGraphic(queryResult) {
        //清除图层
        this.mobileInfoUploadGraphicLayer.clear();
        this.map.infoWindow.hide();

        //添加当前页工单气泡
        for (var i = 0, length = queryResult.result.rows.length; i < length; i++) {
            var row = queryResult.result.rows[i];
            // var point = new Point(row.longitude, row.latitude, new SpatialReference({ wikd: 4326 }));
            var point = new Point(row.x, row.y, this.map.spatialReference);

            var infoTemplate = new InfoTemplate({
                title: "${caption}",
                content: this.templateArr[1]
                // content: "派工人：${dispatch_realname}</br>任务内容：${content}</br>接单人：${realname}</br>处理情况：${handle_record}</br>预计完工时间:${plan_finish_date}</br>实际完工时间:${finish_date}</br>附件:</br>${fileids}"
            });
            var graphic = new Graphic(point, this.symbol[0], "", infoTemplate);


            graphic.attr("id", "graphic" + i);
            this.mobileInfoUploadGraphicLayer.add(graphic);
            this.map.centerAt(point);
        }

    }
    itemClick(event) {
        var index = event.currentTarget.rowIndex - 1;
        var data = this.currentPage.rows[index];
        // var point = new Point(data.x, data.y, new SpatialReference({ wikd: 4326 }));
        var point = new Point(data.x, data.y, this.map.spatialReference);
        this.map.centerAt(point);

        //标识当前的气泡
        if (this.currentPoint != null) {
            this.mobileInfoUploadGraphicLayer.remove(this.currentPoint);
        }
        var graphic = new Graphic(point, this.symbol[3]);
        this.currentPoint = graphic;
        this.mobileInfoUploadGraphicLayer.add(graphic);
        //获取详细信息
        this.getDtail(data, index);

    }
    getDtail(data, index) {

        var workSheetId = data.id;
        var imgUrl = this.AppX.appConfig.apiroot + "/webapp/file/"
        $.ajax({
            headers: {
                'Authorization-Token': AppX.appConfig.usertoken
            },
            type: 'post',
            url: this.AppX.appConfig.apiroot + "/webapp/submitinfo/detail",
            data: {
                id: workSheetId
            },
            success: function (ajaxResult) {
                var graphic = this.mobileInfoUploadGraphicLayer.graphics[index];
                var data = ajaxResult.result[0];
                var url = "";
                if (data.fileids!=undefined){
                    for (var i = 0, length = data.fileids.length; i < length; i++) {

                        var src = imgUrl + data.fileids[i];
                        url = url + "<img src='" + src + "'/>"
                    }
                }

                graphic.setAttributes({
                    "caption": data.capion,//标题

                    "content": data.content,//内容
                    "realname": data.realname,//上报人
                    "address": data.address,//地址
                    "fileids": url,//附件
                    "submitdate": data.submitdate.replace('T', '  '),//上报时间

                });

            }.bind(this),
            error: function () {

            },
            dataType: "json"
        });
    }
    preClick() {
        this.notChange = true;
        var pageNumber = this.currentPage.pagenumber;
        var allPage = this.currentPage.totalnumberofpages;
        var content = "第" + (this.currentPage.pagenumber - 1) + "页" + "共" + allPage + "页";

        if (pageNumber > 1) {
            $(".MobileInfoUpload button.content").text(content);
            this.queryClick();

        }
    }
    nextClick() {
        this.notChange = true;
        var pageNumber = this.currentPage.pagenumber;
        var allPage = this.currentPage.totalnumberofpages;
        var content = "第" + (this.currentPage.pagenumber + 1) + "页" + "共" + allPage + "页";

        if (pageNumber < this.currentPage.totalnumberofpages) {
            $(".MobileInfoUpload button.content").text(content);
            this.queryClick();

        }
    }
    pageturningClick() {
        this.notChange = true;
        var allPage = this.currentPage.totalnumberofpages;
        var goPage = parseInt($(".MobileInfoUpload input.currpage").val());
        var content = "第" + goPage + "页" + "共" + allPage + "页";

        if (goPage > 0 && goPage < allPage + 1) {
            $(".MobileInfoUpload button.content").text(content);
            this.queryClick();

        }

    }
}
