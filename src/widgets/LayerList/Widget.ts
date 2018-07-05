import BaseWidget = require('core/BaseWidget.class');
import Map = require("esri/map");
import Layer = require("esri/layers/layer");
import ArcGISTiledMapServiceLayer = require('esri/layers/ArcGISTiledMapServiceLayer');
import ArcGISDynamicMapServiceLayer = require('esri/layers/ArcGISDynamicMapServiceLayer');


export = LayerList;
//是否需要监听map比例尺，同步各图层可见性
class LayerList extends BaseWidget {
    // panel: MapPanel;
    private map: Map;
    private layers: any[] = [];
    private innerCheckLock = false;//标记是否是组件内部引起的图层可见性变化
    // private data: any = {};
    baseClass: string = "wideget-layerlist";
    private css = {
        list_group_item_class: 'list-group-item',
        list_group_check_item_class: 'list-group-item-check',
        pipeLayerGroup_class: 'pipe-layers',
        baseLayerGroup_class: 'base-layers',
        gridLayerGroup_class: 'grid-layers',
    };

    private attr = {

    };
    private pipe_layer_template: string = "<li class=\"<%=list_group_item_class%>\"><label for=\"<%=layerindex%>-checkbox\"><%=layername%></label><input type=\"checkbox\" id=\"<%=layerindex%>-checkbox\" data-source-layer-index=\"<%=layerindex%>\"  data-source-check-group=\"<%=checkgroup%>\" class=\"pull-right  <%=list_group_check_item_class%>\"></li>";
    startup() {
        this.map = this.AppX.runtimeConfig.map;
        this.setHtml(this.template);
        //广播插件已加载
        this.onPanelInit();
    }

    destroy() {
        this.domObj.off('click', '.' + this.css.list_group_item_class, this.onListClick)
            .off('change', 'input', this.onLayerCheckChange);
        // ("layer-suspend", this.onLayerVisibleChanged.bind(this));            
        this.afterDestroy();
    }
    onPanelInit() {
        this.initEvent();
        this.beginGetLayerInfors();
    }
    private initEvent() {
        this.domObj.on('click', '.' + this.css.list_group_item_class, this.onListClick.bind(this))
            .on('change', 'input', this.onLayerCheckChange.bind(this));
        this.map.on("layer-suspend", this.onLayerVisibleChanged.bind(this));
        this.map.on("layer-resume", this.onLayerVisibleChanged.bind(this));
    }
    private onLayerVisibleChanged(arg){
        if (!this.innerCheckLock) this.checkLayerVisible();
    }
    private checkLayerVisible() {
        for (var i = 0; i < this.layers.length; i++) {
            var layer = this.layers[i];
            var visible = this.findLayerVisible(layer);
            var target = this.domObj.find("input[data-source-layer-index='" + layer.id + "']");//prop('checked', !checked);
            if (target) {
                target.prop('checked', visible);
            }
        }
    }
    private findLayerVisible(layer) {
        if (this.map) {
            var url = layer.url;
            var sublayerid = layer.sublayerid;
            var type = layer.type;
            var layer: any = this.findLayerInMap(url);
            var visilble = false;
            if (layer != null) {
                if (sublayerid === undefined)
                    return layer.visible;
                else {
                    if (_.findIndex(layer.visibleLayers, function (o: any) { return o == sublayerid }) == -1) {
                        return false;
                    }
                    else
                        return true;
                }
            }
            else return false;
        }
        return false;
    }
    private onListClick(event) {
        this.innerCheckLock = true;
        var target = $(event.target);
        var checkbox = target.find('input');
        var checked = checkbox.prop("checked");
        checkbox.prop("checked", !checked);
        checkbox.trigger('change');
    }
    /**
    * (方法说明)在指定的tab页中加入图层信息
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private buildLayerItemOnUI(layerInfors: any[], groudSelector) {
        // $("." + this.baseClass + " ." + groudSelector).empty();
        $.each(layerInfors, function (index, layer) {
            var that: LayerList = this;
            var mixedTemplate = _.template(that.pipe_layer_template)({
                layername: layer.name,
                list_group_item_class: that.css.list_group_item_class,
                list_group_check_item_class: that.css.list_group_check_item_class,
                layerindex: layer.id,
                checkgroup: layer.checkgroup
            });
            var node: JQuery = $(mixedTemplate).appendTo($("." + that.baseClass + " ." + groudSelector));
            if (layer.checked)
                node.find('.' + that.css.list_group_check_item_class).prop("checked", true);
            //node.on('change', this.onLayerCheckChange.bind(this));
        }.bind(this));
        // $("." + this.baseClass + " ." + this.css.list_group_check_item_class).off().on('change', this.onLayerCheckChange.bind(this));
    };

    private onLayerCheckChange(event) {
        this.innerCheckLock = true;
        var target = $(event.target);
        var dataIdx = target.attr("data-source-layer-index");
        var datacheckgroup = target.attr("data-source-check-group");
        var checked = target.prop("checked");
        var layer = _.findLast(this.layers, function (item) {
            return item.id == dataIdx;
        });

        if (checked)
            this.domObj.find("input[data-source-check-group='" + datacheckgroup + "']").not(target).prop('checked', !checked).trigger('change');
        if (layer) {
            this.updateLayerVisibility(layer.url, layer.sublayerid, layer.type, checked);
            this.innerCheckLock = false;
        }
    };
    private updateLayerVisibility(url, sublayerid, type, visible) {
        if (this.map) {
            var layer: any = this.findLayerInMap(url);
            var visilble = false;
            if (layer != null) {
                if (sublayerid === undefined)
                    layer.setVisibility(visible);
                if (sublayerid !== undefined) {
                    if (visible)
                        layer.setVisibleLayers([sublayerid]);
                    else {
                        layer.setVisibleLayers([]);
                    }
                }
            }
            else {
                if (type == "tiled") {
                    layer = new ArcGISTiledMapServiceLayer(url, { className: "tileLayer" });
                    if (this.isBaseLayer(url))
                        this.map.addLayer(layer, 0);
                    else
                        this.map.addLayer(layer);
                    layer.setVisibility(visible);
                } else if (type == "dynamic") {

                    layer = new ArcGISDynamicMapServiceLayer(url, { className: "dynamicLayer" });
                    if (this.isBaseLayer(url))
                        this.map.addLayer(layer, 0);
                    else
                        this.map.addLayer(layer);
                    if (sublayerid !== undefined)
                        if (visible)
                            layer.setVisibleLayers([sublayerid]);
                }
            }
        }
    }

    private contains(arr, obj) {
        var i = arr.length;
        while (i--) {
            if (arr[i] === obj) {
                return true;
            }
        }
        return false;
    }

    //new 

    private beginGetLayerInfors() {
        if (this.AppX.appConfig.gisResource[this.config.gridlayer] &&
            this.AppX.appConfig.gisResource[this.config.gridlayer].config.length > 0) {
            if ($.ajax) {
                $.ajax({
                    data: { f: "pjson" },
                    url: this.AppX.appConfig.gisResource[this.config.gridlayer].config[0].url,
                    type: "get",
                    dataType: "json",
                    success: this.onQueryGridSuccess.bind(this),
                    error: this.onQueryGridError.bind(this)
                });
            }
        }
        //没有配置网格数据
        else {
            // this.AppX.runtimeConfig.toast.Show("未配置网格数据！");
            var layers = [];
            var optionLayers = this.getOptionalLayers();
            var baseLayers = this.getBaseLayers();
            layers = layers.concat(optionLayers);
            this.layers = layers = layers.concat(baseLayers);
            this.buildLayerItemOnUI(layers, this.css.pipeLayerGroup_class);
        }
    }
    private onQueryGridError(data) {
        this.AppX.runtimeConfig.toast.Show("获取网格数据失败！");
    }
    private onQueryGridSuccess(data) {
        var layers = [];
        if (data && this.AppX.appConfig.gisResource[this.config.gridlayer]) {
            for (var i = 0; i < data.layers.length; i++) {
                if (data.layers[i].subLayerIds == null) {
                    var config = this.AppX.appConfig.gisResource[this.config.gridlayer].config[0];
                    var url = config.url;
                    var layer: any = this.findLayerInMap(url);

                    var visilble = false;
                    if (layer != null && layer.visible) {
                        var visibleIds = layer.visibleLayers;
                        if (this.contains(visibleIds, data.layers[i].id))
                            visilble = true;
                        else visilble = false;
                    }
                    else
                        visilble = false;
                    var layerObject = {
                        name: data.layers[i].name,
                        id: data.layers[i].id,
                        defaultVisibility: data.layers[i].defaultVisibility,
                        checked: visilble,
                        minScale: data.layers[i].minScale,
                        maxScale: data.layers[i].maxScale,
                        url: url,
                        sublayerid: data.layers[i].id,
                        checkgroup: "grid",
                        type: this.AppX.appConfig.gisResource[this.config.gridlayer].type
                    };
                    layers.push(layerObject);
                }
            }
        }
        var optionLayers = this.getOptionalLayers();
        var baseLayers = this.getBaseLayers();
        layers = layers.concat(optionLayers);
        this.layers = layers = layers.concat(baseLayers);
        this.buildLayerItemOnUI(layers, this.css.pipeLayerGroup_class);
    }

    private getOptionalLayers() {
        var layers = [];
        for (var i = 0; i < this.config.optionallayers.length; i++) {
            var layername = this.config.optionallayers[i];
            if (this.AppX.appConfig.gisResource[layername] &&
                this.AppX.appConfig.gisResource[layername].config.length > 0) {
                for (var j = 0; j < this.AppX.appConfig.gisResource[layername].config.length; j++) {
                    var config = this.AppX.appConfig.gisResource[layername].config[j];
                    var layer = this.findLayerInMap(config.url);
                    var visilble = false;
                    if (layer != null && layer.visible)
                        visilble = true;
                    var layerObject = {
                        name: config.name,
                        id: layername + "_" + j,
                        defaultVisibility: true,
                        checked: visilble,
                        url: config.url,
                        checkgroup: layername + "_" + j,
                        type: this.AppX.appConfig.gisResource[layername].type
                    };
                    layers.push(layerObject);
                }
            }
        }
        return layers;
    }

    private getBaseLayers() {
        var layers = [];
        for (var i = 0; i < this.config.baselayers.length; i++) {
            var layername = this.config.baselayers[i];
            if (this.AppX.appConfig.gisResource[layername] &&
                this.AppX.appConfig.gisResource[layername].config.length > 0) {
                var config = this.AppX.appConfig.gisResource[layername].config[0];
                var layer = this.findLayerInMap(config.url);
                var visilble = false;
                if (layer != null && layer.visible)
                    visilble = true;
                var layerObject = {
                    name: config.name,
                    id: layername,
                    defaultVisibility: true,
                    checked: visilble,
                    url: config.url,
                    checkgroup: "baselayers",
                    type: this.AppX.appConfig.gisResource[layername].type
                };
                layers.push(layerObject);
            }
        }
        return layers;
    }

    private findLayerInMap(url) {
        for (var i = 0; i < this.map.layerIds.length; i++) {
            var layer = this.map.getLayer(this.map.layerIds[i]);
            if (layer.url && layer.url == url)
                return layer;
        }
        return null;
    }

    private isBaseLayer(url) {
        var isBase = false;
        for (var i = 0; i < this.config.baselayers.length; i++) {
            var layername = this.config.baselayers[i];
            if (this.AppX.appConfig.gisResource[layername] &&
                this.AppX.appConfig.gisResource[layername].config.length > 0) {
                var config = this.AppX.appConfig.gisResource[layername].config[0];
                if (url == config.url)
                    isBase = true;
            }
        }
        return isBase;
    }
}