import BaseWidget = require('core/BaseWidget.class');
import navigation = require("esri/toolbars/navigation");

export = Navigation;

class Navigation extends BaseWidget {
    baseClass = "widget-nav";
    map = null;
    navToolbar = null;

    startup() {
        this.setHtml(this.template);

        this.map = this.AppX.runtimeConfig.map;

        this.navToolbar = new navigation(this.map);
        
        this.initEvent();

        this.ready();
    }

    initEvent() {
        var that = this;
        this.domObj.delegate(".preView", "click", function (evt) {
            that.navToolbar.zoomToPrevExtent();
        });

        this.domObj.delegate(".nextView", "click", function (evt) {
            that.navToolbar.zoomToNextExtent();
        });
    }

}