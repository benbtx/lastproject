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

export = WorkSheetQuery;

class WorkSheetQuery extends BaseWidget {
    baseClass = "WorkSheetQuery";

    templateArr: Array<string> = null;
    map: Map;
    currentPage = null;
    notChange = false;
    symbol;
    workSheetGraphicLayer: GraphicsLayer;
    startDate;

    //用来标识当前气泡的graphic
    currentPoint = null;




    startup() {
        this.templateArr = this.template.split('$$');
        this.setHtml(_.template(this.templateArr[0])({
            hello: this.config.hello + (/\/([a-zA-Z]+)$/g.exec(this.widgetPath)[1])
        }));
        this.init();

    }

    destroy() {
        this.domObj.remove();
        this.afterDestroy();
        this.init();

        //移除图层
        this.map.removeLayer(this.workSheetGraphicLayer);
        this.map.infoWindow.hide();

    }

    init() {
        //jquery 日期控件初始化
        $.jeDate(".WorkSheetQuery .startDate", {
            format: 'YYYY-MM-DD', //日期格式  
            isinitVal: false,
            choosefun: function (elem, val) {
                this.startDate = val;


            }.bind(this)
        })
        //jquery 日期控件初始化
        $.jeDate(".WorkSheetQuery .endDate", {
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


        this.map = this.AppX.runtimeConfig.map;
        //设置点的样式
        this.symbol = this.setSymbol();
        this.addGraphicLayer();
        //设置infowindow的大小
        this.map.infoWindow.resize(270, 180);
        //移动工单查询点击事件绑定
        $(".WorkSheetQuery .query").on("click", this.queryClick.bind(this));
        //前一页点击事件
        $(".WorkSheetQuery button.pre").on("click", this.preClick.bind(this));
        //后一页点击事件
        $(".WorkSheetQuery button.next").on("click", this.nextClick.bind(this));
        //跳转事件
        $(".WorkSheetQuery button.pageturning").on("click", this.pageturningClick.bind(this));

        //

    }


    //设置点的样式
    setSymbol() {
        var symbol = [];
        var redPointSymbol = new PictureMarkerSymbol(this.root + '/widgets/WorkSheetQuery/images/redPoint.png', 16, 22);
        var bulePointSymbol = new PictureMarkerSymbol(this.root + '/widgets/WorkSheetQuery/images/bluePoint.png', 16, 22);
        var greenPointSymbol = new PictureMarkerSymbol(this.root + '/widgets/WorkSheetQuery/images/greenPoint.png', 16, 22);
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
    //添加graphic图层
    addGraphicLayer() {
        if (this.map.getLayer("workSheet")) {
            return;
        } else {
            var graphicLayer = new GraphicsLayer();
            graphicLayer.id = "workSheet";
            this.map.addLayer(graphicLayer);
            this.workSheetGraphicLayer = graphicLayer;
        }

    }
    queryClick() {
        //获取上报人或者标题的值
        var filter = $(".WorkSheetQuery .filter").val();
        //获取上报起始日期
        var startDate = $(".WorkSheetQuery .startDate").val();
        //获取上报终止日期
        var endDate = $(".WorkSheetQuery .endDate").val();

        //时间段不可为空
        if (startDate == "" || endDate == "") {
            this.AppX.runtimeConfig.toast.Show('时间段不能为空');
            return;
        }

        //获取第x页共x页
        var content = $(".WorkSheetQuery button.content").text();
        if (this.notChange == true) {
            var number = content.split("共")[0];
            // var pageNumber = parseInt(content.match(/\d/)[0]) - 1;
            var pageNumber = parseInt(number.match(/\d+/)[0]) ;
        } else {
            var pageNumber = 1;
        }

        $.ajax({
            headers: {
                'Authorization-Token': AppX.appConfig.usertoken
            },
            type: "post",
            url: this.AppX.appConfig.apiroot + "/webapp/job",
            data: {
                pagenumber: pageNumber,
                pagesize: this.config.pageCount,
                filter: filter,
                dispatch_date_before: startDate,
                dispatch_date_after: endDate,
            },
            success: function (result) {

                this.updateTable(result);
            }.bind(this),
            error: function () {

            },
            dataType: "JSON"
        });
    }

    updateTable(result) {
        this.currentPage = result.result;
        var itemsElem = "";
        var tr = $(".WorkSheetQuery tbody tr");
        if (tr.length != 0) {
            tr.remove();
        }
        var items = result.result.rows;
        for (var i = 0, length = items.length; i < length; i++) {
            //标题
            var caption = items[i].caption;
            //接单人
            var name = items[i].realname;
            //工单状态
            var status = items[i].task_status;
            if (status == "1") {
                status = "未完成"
            } else if (status == "0") {
                status = "已完成"
            } else {
                status = "已取消"
            }
            //派单日期
            var dispatchDate = items[i].dispatch_date.split("T")[0];
            itemsElem = itemsElem + "<tr><td>" + caption + " </td><td>" + name + " </td> <td>" + dispatchDate + " </td><td>" + status + " </td></tr>";
        }
        $(itemsElem).appendTo($(".WorkSheetQuery tbody"));
        var allPage = result.result.totalnumberofpages;
        var content = "第" + (result.result.pagenumber ) + "页" + "共" + allPage + "页";
        $(".WorkSheetQuery button.content").text(content);
        this.notChange = false;
        var itemTr = $(".WorkSheetQuery tbody tr");
        itemTr.on("click", this.itemClick.bind(this));
        itemTr.trigger("click");
        //添加工单气泡
        this.addPointGraphic(result);
    }
    //添加工单气泡
    addPointGraphic(queryResult) {
        //清除图层
        this.workSheetGraphicLayer.clear();
        this.map.infoWindow.hide();

        //添加当前页工单气泡
        for (var i = 0, length = queryResult.result.rows.length; i < length; i++) {
            var row = queryResult.result.rows[i];
            var point = new Point(row.x, row.y, this.map.spatialReference);
            var infoTemplate = new InfoTemplate({
                title: "${caption}",
                content: this.templateArr[1]
                // content: "派工人：${dispatch_realname}</br>任务内容：${content}</br>接单人：${realname}</br>处理情况：${handle_record}</br>预计完工时间:${plan_finish_date}</br>实际完工时间:${finish_date}</br>附件:</br>${fileids}"
            });
            if (row.task_status == "1") {

                var graphic = new Graphic(point, this.symbol[0], "", infoTemplate);
            } else if (row.task_status == "0") {
                var graphic = new Graphic(point, this.symbol[2], "", infoTemplate);
            } else {
                var graphic = new Graphic(point, this.symbol[1], "", infoTemplate);
            }

            graphic.attr("id", "graphic" + i);
            this.workSheetGraphicLayer.add(graphic);
            this.map.centerAt(point);
        }

    }
    itemClick(event) {
        var index = event.currentTarget.rowIndex - 1;
        var data = this.currentPage.rows[index];
        var point = new Point(data.x, data.y, this.map.spatialReference);
        this.map.centerAt(point);

        //标识当前的气泡
        if (this.currentPoint != null) {
            this.workSheetGraphicLayer.remove(this.currentPoint);
        }
        var graphic = new Graphic(point, this.symbol[3]);
        this.currentPoint = graphic;
        this.workSheetGraphicLayer.add(graphic);
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
            url: this.AppX.appConfig.apiroot + "/webapp/job/detail",
            data: {
                id: workSheetId
            },
            success: function (ajaxResult) {
                var graphic = this.workSheetGraphicLayer.graphics[index];
                var data = ajaxResult.result;
                var imgurl = "";
                if (data.fileids != null) {
                    for (var i = 0, length = data.fileids.length; i < length; i++) {
                        var src = imgUrl + data.fileids[i];
                        imgurl = imgurl + "<img src='" + src + "'/>"
                    }
                }

                graphic.setAttributes({
                    "id": data.taskbh,
                    "caption": data.capion,
                    "dispatch_realname": data.dispatch_realname,//派单人
                    "content": data.content,//内容
                    "realname": data.realname,//接单人
                    "handleRecord": data.handle_record,//处理情况
                    "fileids": imgurl,//附件
                    "plan_finish_date": data.plan_finish_date,//预计完工时间
                    "finish_date": data.finish_date//时间完工时间
                });
                this.map.infoWindow.setContent(graphic.getContent());
                this.map.infoWindow.setTitle("移动工单");
                this.map.infoWindow.show(graphic.geometry);
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
        var content = "第" + (this.currentPage.pagenumber-1) + "页" + "共" + allPage + "页";

        if (pageNumber  > 1) {
            $(".WorkSheetQuery button.content").text(content);
            this.queryClick();

        }
    }
    nextClick() {
        this.notChange = true;
        var pageNumber = this.currentPage.pagenumber;
        var allPage = this.currentPage.totalnumberofpages;
        var content = "第" + (this.currentPage.pagenumber + 1) + "页" + "共" + allPage + "页";

        if (pageNumber  < this.currentPage.totalnumberofpages) {
            $(".WorkSheetQuery button.content").text(content);
            this.queryClick();

        }
    }
    pageturningClick() {
        this.notChange = true;
        // var pageNumber = this.currentPage.pagenumber;
        var allPage = this.currentPage.totalnumberofpages;
        var goPage = parseInt($(".WorkSheetQuery input.currpage").val());
        var content = "第" + goPage + "页" + "共" + allPage + "页";

        if (goPage  > 0 && goPage  < allPage+1) {
            $(".WorkSheetQuery button.content").text(content);
            this.queryClick();

        }
    }
}

