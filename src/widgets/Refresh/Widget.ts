import BaseWidget = require('core/BaseWidget.class');

/*** 暴露类 ***/
export = Refresh;

class Refresh extends BaseWidget {
    baseClass = "widget-refresh";
    isRefreshing: boolean = false;
    map = null;

    startup() {

        this.setHtml(this.template);

        this.map = this.AppX.runtimeConfig.map;

        this.bindEvents();
        this.ready();
    }

    bindEvents() {
        this.domObj.on('click', function () {
            this.freshAllLayers();
        }.bind(this));

        this.map.on('update-end', function () {
            this.setState(false);
        }.bind(this));
    }

    freshAllLayers() {
        if (this.isRefreshing === false) {
            this.setState(true);

            var layerIds = <Array<any>>this.map.layerIds,
                tempCurrentLayer = null;
            for (var i = layerIds.length - 1; i >= 0; i--) {
                tempCurrentLayer = this.map.getLayer(layerIds[i]);
                if (tempCurrentLayer.refresh) {
                    tempCurrentLayer.refresh();
                } else if (tempCurrentLayer.redraw) {
                    tempCurrentLayer.redraw();
                }
            }
        }
    }

    setState(isRefreshing: boolean) {
        this.isRefreshing = isRefreshing;
        if (isRefreshing === true) {
            // 正在刷新
            this.domObj.find('.glyphicon-refresh').addClass('refreshing');
        } else if (isRefreshing === false) {
            // 刷新完成
            this.domObj.find('.glyphicon-refresh').removeClass('refreshing');
        }
    }
}