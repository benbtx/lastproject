import BaseWidget = require('core/BaseWidget.class');
import Map = require('esri/map');
import Point = require("esri/geometry/Point");
import ScreenPoint = require("esri/geometry/ScreenPoint");
import ArcGISDynamicMapServiceLayer = require('esri/layers/ArcGISDynamicMapServiceLayer');
import ArcGISTiledMapServiceLayer = require('esri/layers/ArcGISTiledMapServiceLayer');

/*** 暴露类 ***/
export = Magnifier;

class Magnifier extends BaseWidget {
    baseClass = "";
    myMap: Map = null;
    managerDepartment = null;
    startup() {
        this.setHtml(this.template);
        this.initEvent();
        this.setMagnifierMove();
    }
    initEvent() {
        $(".MagnifierCloseButton").on("click", $.proxy(this.destroy, this));
    }
    setMagnifierMove() {
        var mainMap: Map = this.AppX.runtimeConfig.map;
        var levelMax = 0;
        var map: Map = new Map("MagnifierContainer", {
            slider: false,
            logo: false,
            showAttribution: false
        });
        this.myMap = map;
        if (this.AppX.appConfig.gisResource.fangdamap.config.length == 0) {
            this.AppX.runtimeConfig.toast.Show("未配置管线服务，请联系管理员!");
        }
        else {
            var dynamicLayer = new ArcGISDynamicMapServiceLayer(this.appConfig.gisResource.fangdamap.config[0].url);
            this.managerDepartment = Cookies.get('range');
            var ranges: Array<any> = this.managerDepartment.split(';');
            var filter;
            if (ranges.length > 0) {
                filter = ranges.map(function (range) {
                    return "'" + range + "'";
                }).join(",");
                filter = 'MANAGEDEPT_CODE in (' + filter + ')';
                var layerDefinitions = [];
                for (var i = 0; i <= 92; i++) {
                    layerDefinitions.push(filter);
                }
                dynamicLayer.setLayerDefinitions(layerDefinitions);
            }
            map.addLayer(dynamicLayer);
        }
        var MagnifierDiv = $(".Magnifier");
        MagnifierDiv.draggable({
            containment: $(".widgets-basemap"),
            start: this.onDragStart.bind(this),
            stop: this.onDragStop.bind(this)
        });
        MagnifierDiv.on("dragstop", function (event, ui) {
            updateMapviewExtent();
        });
        //主动触发拖拽事件
        MagnifierDiv.trigger("dragstop");
        map.on("load", function (resolvedVal) {
            this.myMap = map;
            //移除双击放大功能
            map.disableDoubleClickZoom();
            //移除鼠标单击可移动地图功能
            map.disablePan();
            mainMap.on("extent-change", updateMapviewExtent);
        });

        function updateMapviewExtent() {
            var mainContainer = $('#mainContainer')[0];
            var centerScreenX = MagnifierDiv.width() / 2 + MagnifierDiv.offset().left - mainContainer.offsetLeft;
            var centerScreenY = MagnifierDiv.height() / 2 + MagnifierDiv.offset().top - mainContainer.offsetTop;
            var centerScreenPoint = new ScreenPoint({ x: centerScreenX, y: centerScreenY })
            var centerMap = mainMap.toMap(centerScreenPoint);
            var scale = mainMap.getScale() / Math.max(mainMap.width / map.width, mainMap.height / map.height);
            map.setScale(scale);
            map.centerAt(centerMap);
        }
    }

    changeMapVisible(visible) {
        if (this.myMap != null && this.myMap.layerIds != null)
            for (var i = 0; i < this.myMap.layerIds.length; i++) {
                var layer = this.myMap.getLayer(this.myMap.layerIds[i]);
                layer.setVisibility(visible);
            }
    }
    onDragStart(evt, ui) {
        $(".Magnifier").css('background-color', 'transparent');
        $(".MagnifierCloseButton").hide();
        this.changeMapVisible(false);
    }
    onDragStop(evt, ui) {
        $(".Magnifier").css('background-color', 'white');
        $(".MagnifierCloseButton").show();
        this.changeMapVisible(true);
    }
    destroy() {
        $(".Magnifier").remove();
        this.myMap = null;
        this.afterDestroy();
    }
    queryManageCode() {
        ///获取管理单位代码
        var userid = Cookies.get('userid');
        $.ajax({
            type: "post",
            headers: {
                'Authorization-Token': AppX.appConfig.usertoken
            },
            url: this.AppX.appConfig.apiroot + "/webapp/range",
            data: {
                userid: userid
            },
            success: function (result) {
                var codeStr = "";
                if (result.result.length > 0) {
                    for (var i = 0; i < result.result.length; i++)
                        codeStr += ',' + "'" + result.result[i] + "'";
                    codeStr = codeStr.substring(1);
                    codeStr = "(" + codeStr + ")";
                    this.managerDepartment = codeStr;
                }
                //    console.log(result);
            }.bind(this),
            error: function () {
                this.Appx.runtimeConfig.toast.show('获取管理单位代码错误')
            },
            dataType: "JSON"
        });
    }
}