import BaseWidget = require('core/BaseWidget.class');
import Point = require("esri/geometry/Point");
import Extent = require('esri/geometry/Extent');
import Draw = require('esri/toolbars/draw');

/*** 暴露类 ***/
export = ZoomBar;

class ZoomBar extends BaseWidget {
    baseClass = "widget-zoombar";
    draw = null;
    map = null;
    zoomType = null;//zoomin or zoomout
    startup() {
        this.setHtml(this.template);
        this.init();
        this.ready();
    }

    init() {
        this.map = this.AppX.runtimeConfig.map;
        this.domObj.on('click', '.zoomin', this.onZoominClick.bind(this))
            .on('click', '.zoomout', this.onZoomoutClick.bind(this));
    }

    private onZoominClick(event) {
        this.zoomType = "zoomin"
        this.initDrawTool();
    }

    private onZoomoutClick(event) {
        this.zoomType = "zoomout"
        this.initDrawTool();
    }

    private initDrawTool() {
        if (this.draw == null) {
            this.draw = new Draw(this.map, { showTooltips: false });
            this.draw.on('draw-end', this.onDrawEnd.bind(this));
        }
        this.draw.activate(Draw.RECTANGLE);
    }

    private disposeDrawTool() {
        if (this.draw != null)
            this.draw.deactivate();
    }

    private onDrawEnd(event) {
        if (this.draw != null)
            this.draw.deactivate();
        var newExtent = null;
        if (this.zoomType == "zoomin") {
            newExtent = event.geometry.getExtent();
            if (this.map != null)
                this.map.setExtent(newExtent);
        }
        else if (this.zoomType == "zoomout") {
            var tempExtent = event.geometry.getExtent();
            var mapExtent = this.map.extent;
            var dxmap = mapExtent.xmax - mapExtent.xmin;
            var dymap = mapExtent.ymax - mapExtent.ymin;
            var dxtemp = tempExtent.xmax - tempExtent.xmin;
            var dytemp = tempExtent.ymax - tempExtent.ymin;
            var radiox = (dxmap / (tempExtent.xmax - tempExtent.xmin));
            var radioy = (dymap / (tempExtent.ymax - tempExtent.ymin));
            var radio = Math.min(radiox, radioy);
            var dxc = (tempExtent.xmax + tempExtent.xmin) / 2 - (mapExtent.xmax + mapExtent.xmin) / 2;
            var dyc = (tempExtent.ymax + tempExtent.ymin) / 2 - (mapExtent.ymax + mapExtent.ymin) / 2;
            var xmax = mapExtent.xmax + (radio - 1) * dxmap / 2 - radio*dxc;
            var ymax = mapExtent.ymax + (radio - 1) * dymap / 2 - radio*dyc;
            var xmin = mapExtent.xmin - (radio - 1) * dxmap / 2 - radio*dxc;
            var ymin = mapExtent.ymin - (radio - 1) * dymap / 2 - radio*dyc;
            newExtent = new Extent(xmin, ymin, xmax, ymax, this.map.spatialReference);
            if (this.map != null)
                this.map.setExtent(newExtent);
        }
    }
}