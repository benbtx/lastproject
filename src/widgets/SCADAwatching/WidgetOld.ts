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

    //用于时间的叠加
    j = 1;


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
        this.backToInit();
    }
    SCADAwatchingInit() {

        this.config.SCADAUrl=this.AppX.appConfig.gisResource.scada.config[0].url;
        //init the map object
        this.map = this.AppX.runtimeConfig.map;
        this.map.graphics.clear();
        this.symbol = this.setSymbol();
        $(".SCADAwatching input").bind('change', this.openSCADAWatching.bind(this));

        this.map.on("click", this.mapClickEvent.bind(this));

        this.map.on("pan", this.mapExtentChange.bind(this));

        this.map.on("zoom-start", this.zoomStartEvent.bind(this));

        this.map.on("zoom-end", this.zoomEndEvent.bind(this));


        setInterval(function() {

            if (this.infoWindowCount > 0) {
                for (var i = 0; i < this.infoWindowCount; i++) {
                    var inPressure = $(".infoWindow" + i + " .SCADAwatching-enter").text().replace("进站压力：", "");
                    inPressure = inPressure.replace("Mpa", "");
                    var outPressure = $(".infoWindow" + i + " .SCADAwatching-exist").text().replace("出站压力：", "");
                    outPressure = outPressure.replace("Mpa", "");
                    var time = $(".infoWindow" + i + " .SCADAwatching-time").text();

                    var currentTime = "时间：13:30:" + 6 * this.j;
                    this.j++;

                    var enterPressure = (parseFloat(inPressure) * Math.random() + 0.5).toFixed(2);
                    var existPressure = (parseFloat(outPressure) * Math.random() + 0.5).toFixed(2);
                    $(".infoWindow" + i + " .SCADAwatching-enter").text("进站压力：" + enterPressure + "Mpa");
                    $(".infoWindow" + i + " .SCADAwatching-exist").text("出站压力：" + existPressure + "Mpa");
                    $(".infoWindow" + i + " .SCADAwatching-time").text(currentTime);
                    if (parseFloat(enterPressure) > parseFloat($(".infoWindow" + i + " .SCADAwatching-enter").attr("max"))) {
                        $(".infoWindow" + i + " .SCADAwatching-enter").css("color", "red");
                    } else {
                        $(".infoWindow" + i + " .SCADAwatching-enter").css("color", "black");
                    }
                    if (parseFloat(existPressure) > parseFloat($(".infoWindow" + i + " .SCADAwatching-exist").attr("max"))) {
                        $(".infoWindow" + i + " .SCADAwatching-exist").css("color", "red")
                    } else {
                        $(".infoWindow" + i + " .SCADAwatching-exist").css("color", "black")
                    }
                }

            } else {
                return;
            }

        }.bind(this), 6000);




    }
    backToInit() {
        this.map.graphics.clear();
        if (this.map.getLayer("scada")) {
            var Layer = this.map.getLayer("scada");
            this.map.removeLayer(Layer);
        }
        $(".infoWindow").remove();
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
        if (checked.length != 0) {
            var scadaLayer = new ArcGISDynamicMapServiceLayer(this.config.SCADAUrl);
            scadaLayer.id = 'scada';
            this.map.addLayer(scadaLayer);

        } else {
            var Layer = this.map.getLayer("scada");
            this.map.removeLayer(Layer);
            //clear scada point graphic
            this.map.graphics.clear();
            //clear infoWindow
            $(".infoWindow").remove();


        }

    }
    mapClickEvent(event) {
        var identifyTask = new IdentifyTask(this.config.SCADAUrl);
        var identifyParameters = new IdentifyParameters();

        //设置几何查询图形
        identifyParameters.geometry = event.mapPoint;
        identifyParameters.mapExtent = this.map.extent;
        identifyParameters.tolerance = 3;
        identifyParameters.returnGeometry = true;    //contain in the feture'geometry attribute of the result
        identifyParameters.spatialReference = this.map.spatialReference;
        identifyTask.execute(identifyParameters).then(
            this.identifyTaskCallBack.bind(this),
            function(error) {
                console.error(error)
            });

        this.scadaScreenPoint = this.map.toScreen(event.mapPoint);


    }
    identifyTaskCallBack(result) {

        if (result.length == 0) {
            return;
        } else {
            var scadaMapPoint = new mapPoint({
                x: result[0].feature.geometry.x,
                y: result[0].feature.geometry.y,
                spatialReference: this.map.spatialReference
            })
            // var coordinate = [];
            // coordinate.push(result[0].feature.geometry.x);
            // coordinate.push(result[0].feature.geometry.y);

            //获取对应点击点的站场代码
            var scadaId = result[0].feature.attributes.站场代码;

            ///通过站场代码判断infowWindow是否添加，如果已经添加将不发送请求
            var scadaInfoWindows = $(".infoWindow");
            for (var i = 0; i < scadaInfoWindows.length; i++) {
                if (scadaInfoWindows[i].getAttribute("scadaPointId") == scadaId) {
                    return;
                }
                console.log("test  ");
            }
            this.scadaMapPoint.push(scadaMapPoint);
            var scadaGraphic = new Graphic(result[0].feature.geometry, this.symbol.SimpleMarkerSymbol, { graphic: "graphic" + this.graphicCount });
            this.map.graphics.add(scadaGraphic);
            this.graphicCount++;







            $.ajax({
                type: "get",
                url: this.AppX.appConfig.gisResource.apiscada.config[0].url,
                data: {
                    _fid: scadaId
                },
                success: this.AjaxCallBack.bind(this),
                dataType: "json"

            });


        }


    }
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


            // var screenPoint = this.map.toScreen(this.scadaMapPoint[i]);
            // var infoWindowClass = '.infoWindow' + i;

            // $(infoWindowClass).css("left", screenPoint.x + "px");
            // $(infoWindowClass).css("top", (screenPoint.y - 100) + "px");
            // $(infoWindowClass).css("display", "block");
            var infoWindowClass = '.infoWindow' + i;
            var screenPoint = this.map.toScreen(this.scadaMapPoint[i]);

            var left = screenPoint.x + event.delta.x;
            var top = screenPoint.y + event.delta.y;
            $(infoWindowClass).css("left", (left - 7) + "px");
            $(infoWindowClass).css("top", (top - 125 - 5) + "px");
            $(infoWindowClass).css("display", "block");


        }
    }
    zoomStartEvent() {
        if (this.scadaMapPoint.length == 0) {
            return;
        }
        for (var i = 0; i < this.scadaMapPoint.length; i++) {

            var infoWindowClass = '.infoWindow' + i;
            $(infoWindowClass).css("display", "none");
        }

    }
    zoomEndEvent() {
        if (this.scadaMapPoint.length == 0) {
            return;
        }
        for (var i = 0; i < this.scadaMapPoint.length; i++) {

            var infoWindowClass = '.infoWindow' + i;

            var screenPoint = this.map.toScreen(this.scadaMapPoint[i]);
            $(infoWindowClass).css("left", (screenPoint.x - 7) + "px");
            $(infoWindowClass).css("top", (screenPoint.y - 125 - 5) + "px");
            $(infoWindowClass).css("display", "block");
        }

    }
}