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
import InfoWindows = require('./InfoWindows');

export = SCADAwatchingOnly;

class SCADAwatchingOnly extends BaseWidget {
    baseClass = "SCADAwatchingOnly";
    map: Map = null;
    SCADALayerInfo: LayerInfo = null;
    scadaMapPoint = [];
    symbol;
    scadaScreenPoint;
    scadaNumber: number = 0;
    graphicCount: number = 0;
    templateArr: Array<string> = null;
    private station_template: string = "<li class=\"<%=list_group_item_class%>\" data-ptid=\"<%=ptid%>\"><label><%=ptname%></label></li>";
    private infoWindows: InfoWindows = null;
    infoWindowCount: number = 0;
    currentPage;
    currentPageIndex;
    private detailPTID = null;//当前工艺图站点编号
    //用于时间的叠加
    j = 1;
    //
    private detailPanel = null;
    //setInterval返回的值，用于清除定时器
    private updateBriefTask;
    private updateDetailTask;

    filtername;//要查询的监控值名称,支持模糊查询
    private css = {
        list_group_item_class: 'list-group-item',
        list_group_check_item_class: 'list-group-item-check',
    };

    startup() {
        this.templateArr = this.template.split('$$');
        this.setHtml(_.template(this.templateArr[0])({}));
        this.SCADAwatchingInit();
    }

    destroy() {
        this.backToInit(true);
        if (this.detailPanel != null)
            this.detailPanel.Destroy();
        if (this.infoWindows != null)
            this.infoWindows.Clean();
        ///清除定时器
        clearInterval(this.updateBriefTask);
        clearInterval(this.updateDetailTask);
        this.domObj.remove();
        this.afterDestroy();
    }
    SCADAwatchingInit() {
        this.map = this.AppX.runtimeConfig.map;
        this.infoWindows = new InfoWindows({ map: this.map });
        //根据设置的条数获取指定页的全部scada信息，存入变量currentPage中
        this.getAllScadaInfo(this.config.onePageCount, 1);
        this.domObj.find(".pre").bind("click", this.prePage.bind(this));
        this.domObj.find(".next").bind("click", this.nextPage.bind(this));
        this.domObj.find(".pageturning").bind("click", this.goPage.bind(this));
        this.domObj.on("click", ".find", this.onFindClick.bind(this));
        this.domObj.on('click', '.locate', this.locateStation.bind(this));
        this.domObj.on('click', '.pic', this.loadSCADADetail.bind(this));
        this.domObj.on('click', '.find', this.onFindClick.bind(this));
        this.domObj.on('keydown', '.name', this.onInputKeyDown.bind(this));
        this.map.graphics.clear();
        //设置scada站点的样式
        this.symbol = this.setSymbol();
        this.updateBriefTask = setInterval(this.UpdateBriefTask.bind(this), this.config.updateInterval);
    }

    onInputKeyDown(event: any) {
        switch (event.keyCode) {
            case 13:
                //回车键
                this.onFindClick();
                event.stopPropagation();
                event.preventDefault();
                break;
        }
    }

    onFindClick() {
        this.getAllScadaInfo(this.config.onePageCount, 1);
    }

    backToInit(closeMode: boolean) {
        this.map.graphics.clear();
        this.domObj.find(".infoWindow").remove();
        if (this.map.getLayer("scada") && closeMode == true) {
            var Layer = this.map.getLayer("scada");
            this.map.removeLayer(Layer);
        }
    }

    //根据每页显示的条数和当前页，发送ajax同步请求，返回请求结果
    getAllScadaInfo(pageSize: number, pageIndex: number) {
        //请求指定条数下特定页scada接口url
        var scadaurl = this.AppX.appConfig.apiroot + "/scada/station/brief";
        var data;
        var name = this.domObj.find(".name").val().trim();
        if (name.length == 0)
            name = null;
        var inputdata: any = {
            pagesize: pageSize,
            pagenumber: pageIndex
        }
        if (name != null)
            inputdata.filter = name;
        $.ajax({
            headers: {
                'Authorization-Token': AppX.appConfig.usertoken
            },
            url: scadaurl,
            type: "post",
            dataType: "json",
            data: inputdata,
            success: function (result) {
                this.currentPage = result;
                this.initDataTable(this.currentPage);
            }.bind(this),
            error: function () {
                console.log('查询SCDA信息出错！')
            }
        });
    }

    initDataTable(data) {
        var content = "第" + (data.result.pagenumber) + "页" + "共" + data.result.totalnumberofpages + "页";
        var allRow: string = "";
        //可省略
        var value = '';
        var time2 = '';
        var name = '';
        var maxval = '';
        var minval = '';
        var itemId = '';
        this.domObj.find("button.content").text(content);
        this.domObj.find('.station-list').empty();
        data.result.rows.forEach(station => {
            var mixedTemplate = _.template(this.station_template)({
                list_group_item_class: this.css.list_group_item_class,
                ptname: station.ptname,
                ptid: station.ptid
            });
            var node: JQuery = $(mixedTemplate).appendTo(this.domObj.find('.station-list')).append(this.template.split('$$')[1]);
        });
        //添加站点信息窗体
        var infoTemplate = this.templateArr[2];
        this.infoWindows.ClearWindow();
        data.result.rows.forEach(station => {
            var p = new mapPoint(station.x, station.y, this.map.spatialReference);
            var mixedInfoTemplate = _.template(infoTemplate)({
                values: station.values
            });
            this.infoWindows.AddNewInfoWindow({
                id: station.ptid,
                title: station.ptname,
                content: mixedInfoTemplate,
                point: p
            });
        })
    }

    //站场信息后退一页
    prePage() {

        this.backToInit(false);
        var checked = this.domObj.find("input:checked");
        if (checked.length != 0) {
            checked.prop("checked", false);
        }
        var pageNumber = this.currentPage.result.pagenumber;
        if (pageNumber > 1) {
            this.getAllScadaInfo(this.config.onePageCount, pageNumber - 1);
        }
    }
    //站场信息前进一页
    nextPage() {
        //移除scada站点和infowindow
        this.backToInit(false);
        //是否勾选显示全部监控
        var checked = this.domObj.find("input:checked");
        if (checked.length != 0) {
            checked.prop("checked", false);
        }
        //
        var pageNumber = this.currentPage.result.pagenumber;
        if (pageNumber < this.currentPage.result.totalnumberofpages) {
            this.getAllScadaInfo(this.config.onePageCount, pageNumber + 1);
        }
    }
    //站场信息跳转至某页
    goPage() {
        this.backToInit(false);
        var checked = this.domObj.find("input:checked");
        if (checked.length != 0) {
            checked.prop("checked", false);
        }
        var goPage = parseInt(this.domObj.find("input.currpage").val());
        if (goPage > 0 && goPage < this.currentPage.result.totalnumberofpages + 1) {
            this.getAllScadaInfo(this.config.onePageCount, goPage);
        }
    }

    //更新scada信息
    updateScadaInfo() {
        var pageIndex = this.domObj.find("button.content").text().match(/\d/)[0];//当前为第几页
        //get all the scada info  
        var scadaurl = this.AppX.appConfig.apiroot + "/scada/valuesonly";
        var data;
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
                ///更新表中的scada信息
                var itemClassName = [];
                this.domObj.find("tr").prop("class", function (index, attr) {
                    itemClassName.push(attr);
                }.bind(this));
                for (var i = 1, length = itemClassName.length; i < length; i++) {
                    var scadaId = itemClassName[i];
                    for (var j = 0, len = result.result.rows.length; j < len; j++) {
                        if (result.result.rows[j].name == scadaId) {
                            var data = result.result.rows[j];
                            this.upTableText("." + scadaId, data.value, data.time2);
                        }
                    }
                }
            }.bind(this),
            error: function () {
            }
        });
    }
    upTableText(selector, value, time) {
        $(selector + " .data-value").text(value);
        $(selector + " .data-time").text(time);

    }

    //return the enterPressure ,existPressure and time of scada station.
    getNeedScadaInfo(data) {
        var info = [];
        var name = data.name;
        var value = data.value;

        var enterPressure: string = '';
        var existPressure: string = '';
        var time = '';
        if (data.info != null) {
            for (var i = 0; i < data.info.length; i++) {
                if (data.info[i].import == 1) {
                    //模拟
                    enterPressure = (data.info[i].value * (Math.random() + 0.5)).toFixed(2) + data.info[i].unit;
                    if (data.info[i].time != null) {
                        time = data.info[i].time;
                    }

                } else if (data.info[i].import == 2) {
                    //模拟
                    existPressure = (data.info[i].value * (Math.random() + 0.5)).toFixed(2) + data.info[i].unit;
                }
            }
        }
        info.push(name);
        info.push(enterPressure);
        info.push(existPressure);
        info.push(time);
        return info;
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

    private locateStation(event) {
        //定位到站点
        var stationDom = this.domObj.find('.station-list li:hover');
        if (stationDom) {
            var stationid = stationDom.data('ptid');
            var index = _.findIndex(this.currentPage.result.rows, function (o: any) { return o.ptid == stationid });
            if (index > -1) {
                var station = this.currentPage.result.rows[index];
                this.map.centerAt(new mapPoint(station.x, station.y, this.map.spatialReference));
                this.infoWindows.ShowInfoWindow(stationid);
            }
        }
    }

    private loadSCADADetail(event) {
        var stationDom = this.domObj.find('.station-list li:hover');
        if (!stationDom)
            return;
        var stationid = stationDom.data('ptid');
        var index = _.findIndex(this.currentPage.result.rows, function (o: any) { return o.ptid == stationid });
        if (index == -1)
            return;
        var station = this.currentPage.result.rows[index];
        if (!station.pic || station.pic.length == 0) {
            this.AppX.runtimeConfig.toast.Show("所选站点不存在工艺图");
            return;
        }
        var stationid = stationDom.data('ptid');
        var scadaurl = this.AppX.appConfig.apiroot + "/scada/station/detail";
        $.ajax({
            headers: {
                'Authorization-Token': AppX.appConfig.usertoken
            },
            url: scadaurl,
            type: "post",
            dataType: "json",
            data: { ptid: stationid },
            success: this.onDetailLoaded.bind(this),
            error: function () {
                console.log('获取SCDA工艺图信息出错！')
            }
        });
    }

    private onDetailLoaded(event) {
        var detail = event.result;
        var html: string = this.templateArr[3];
        var mixedTemplate = _.template(html)({
            ptid: detail.ptid,
            pic: this.AppX.appConfig.apiroot + "/" + event.result.pic,
            values: event.result.values
        });
        this.detailPTID = detail.ptid;
        if (this.detailPanel != null) {
            //this.detailPanel.Destroy();
            this.detailPanel.Reload({
                id: detail.ptid,
                title: detail.ptname + "工艺流程图",
                html: mixedTemplate,
                width: this.config.dataPanel.width,
                height: this.config.dataPanel.height,
                readyCallback: this.onSCADADetailReady.bind(this)
            });
        }
        else {
            this.detailPanel = new BlankPanel({
                id: detail.ptid,
                title: detail.ptname + "工艺流程图",
                html: mixedTemplate,
                width: this.config.dataPanel.width,
                height: this.config.dataPanel.height,
                readyCallback: this.onSCADADetailReady.bind(this)
            });
            this.detailPanel.afterDestroyCallback = this.afterDetailPanelDestroy.bind(this);
            this.updateDetailTask = setInterval(this.UpdateDetailTask.bind(this), this.config.updateInterval);
        }
    }

    private afterDetailPanelDestroy() {
        this.detailPanel = null;
    }

    private onSCADADetailReady(event) {
        //启用工艺图zoom pan效果
        var $panzoom = this.detailPanel.domObj.find('.panzoom');
        if (!$panzoom) return;
        $panzoom.panzoom();
        // $panzoom.panzoom("zoom", true, {
        //     silent: true,
        //     focal: {
        //         animate:false,
        //         duration:0,
        //         clientX: 260,
        //         clientY: 200
        //     }
        // });
        $panzoom.parent().on('mousewheel', function (e) {
            e.preventDefault();
            var delta = e.delta || e.originalEvent.wheelDelta;
            var zoomOut = delta ? delta < 0 : e.originalEvent.deltaY > 0;
            $panzoom.panzoom('zoom', zoomOut, {
                animate: false,
                focal: e//缩放中心点
            });
        });

        //开始工艺图参数定时刷新任务，识别当前打开的站点，自动终止任务.        
    }

    private UpdateBriefTask() {
        var ids = this.infoWindows.GetVisibleWindowIDs();
        if (ids.length == 0) return;
        var scadaurl = this.AppX.appConfig.apiroot + "/scada/station/values";
        $.ajax({
            headers: {
                'Authorization-Token': AppX.appConfig.usertoken
            },
            url: scadaurl,
            type: "post",
            dataType: "json",
            data: { ptids: ids.join(',') },
            success: this.OnUpdateBrief.bind(this),
            error: function () {
                console.log('获取SCDA工艺图信息出错！')
            }
        });
    }

    private UpdateDetailTask() {
        if (this.detailPTID == null)
            return;
        if (this.detailPanel == null)
            return;
        var detailDom = this.detailPanel.domObj.find('div[data-ptid="' + this.detailPTID + '"]');
        if (detailDom.length == 0) return;
        var scadaurl = this.AppX.appConfig.apiroot + "/scada/station/detail";
        $.ajax({
            headers: {
                'Authorization-Token': AppX.appConfig.usertoken
            },
            url: scadaurl,
            type: "post",
            dataType: "json",
            data: { ptid: this.detailPTID },
            success: this.OnUpdateDetail.bind(this),
            error: function () {
                console.log('获取SCDA工艺图信息出错！')
            }
        });
    }

    private OnUpdateBrief(event) {
        if (event.code == "10000") {
            this.infoWindows.UpdateInfoWindow(event.result.rows);
        }
    }

    private OnUpdateDetail(event) {
        if (event.code == "10000") {
            if (this.detailPTID == null)
                return;
            if (this.detailPanel == null)
                return;
            var detailDom = this.detailPanel.domObj.find('div[data-ptid="' + this.detailPTID + '"]');
            if (detailDom.length == 0) return;
            event.result.values.forEach(value => {
                var targetdom = detailDom.find('span[data-name="' + value.name + '"]');
                // if (targetdom.length > 0)
                //     targetdom.text(value.value + value.unit);
                //动态刷新效果
                var newValue = value.value + value.unit;
                if (targetdom.length > 0 && targetdom.text()!= newValue) {
                    targetdom.text('');
                    setTimeout(function () {
                        targetdom.text(newValue);
                    }, 500);
                }
            });
        }
    }
}