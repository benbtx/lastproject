import BaseWidget = require('core/BaseWidget.class');
import EsriScalebar = require('esri/dijit/Scalebar');
import Map = require("esri/map");

export = Scalebar;

class Scalebar extends BaseWidget {
    baseClass = "widget-scalebar";
    scalebar: Object;
    map: Map;
    startup() {

        this.setHtml(this.template);
        this.ready();
        this.initScalebar();
    }

    initScalebar() {
        // this.scalebar = new EsriScalebar({
        //     map: this.AppX.runtimeConfig.map,
        //     attachTo: "bottom-left",
        //     scalebarStyle: "line",
        //     scalebarUnit: "metric"
        // });
        this.map = this.AppX.runtimeConfig.map;
        var scale = this.getScale();
        this.setScale(scale);
        this.map.on("zoom-end", this.zoomEnd.bind(this));
    }
    getScale() {
        var scale = this.map.getScale();
        return scale
    }
    setScale(text) {
        this.domObj.find("span").text(text);
    }
    zoomEnd() {
        var scale = this.getScale();
        this.setScale(scale);
    }

}