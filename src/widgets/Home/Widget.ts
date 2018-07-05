import BaseWidget = require('core/BaseWidget.class');
import Point = require("esri/geometry/Point");
import Extent = require('esri/geometry/Extent');
import HomeButton = require("esri/dijit/HomeButton");

/*** 暴露类 ***/
export = MapHome;

class MapHome extends BaseWidget {
    baseClass = "widget-home";
    homeButton: HomeButton;
    extents: Extent[] = [];
    startup() {

        this.setHtml(this.template);

        //this.initHome();
        this.ready();
        this.queryPipeExtents();
    }

    initHome(extent) {
        this.homeButton = new HomeButton(
            {
                theme: "HomeButton",
                map: this.AppX.runtimeConfig.map,
                extent: extent,
                visible: true
            }, this.config.homeDomID
        );

        this.homeButton.startup();
    }

    private queryPipeExtents() {
        var pipeConfig = this.AppX.appConfig.gisResource.pipe.config;
        if (pipeConfig && pipeConfig.length > 0) {
            for (var i = 0; i < 1; i++) {
                if ($.ajax) {
                    $.ajax({
                        data: { f: "pjson" },
                        url: pipeConfig[i].url,
                        type: "get",
                        dataType: "json",
                        success: this.onQueryExtentSuccess.bind(this)
                    });
                }
            }
        }
    }
    
    /**
    * (方法说明)查询所有管线服务全图范围信息，并设置全图范围为所有范围的合并范围
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private onQueryExtentSuccess(data) {
        if (data.fullExtent) {
            var extent = new Extent({
                xmax: data.fullExtent.xmax,
                xmin: data.fullExtent.xmin,
                ymax: data.fullExtent.ymax,
                ymin: data.fullExtent.ymin,
                spatialReference: data.fullExtent.spatialReference
            });
            this.extents.push(extent);
        }
        // if (this.extents.length >= this.AppX.appConfig.gisResource.pipe.config.length) {
            if (this.extents.length > 0) {
                var fullExtent = this.extents[0];
                // for (var i = 1; i < this.extents.length; i++) {
                //     fullExtent = fullExtent.union(this.extents[i]);
                // }
                this.initHome(fullExtent);
            }
        // }
    }
}