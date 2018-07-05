import BaseWidget = require('core/BaseWidget.class');

/*** Esri ***/
import Map = require('esri/map');
import ArcGISTiledMapServiceLayer = require('esri/layers/ArcGISTiledMapServiceLayer');
import ArcGISDynamicMapServiceLayer = require('esri/layers/ArcGISDynamicMapServiceLayer');
import Point = require('esri/geometry/Point');

export = DoubleScreen;

class DoubleScreen extends BaseWidget {
    baseClass = "widget-double-screen";

    /*** 状态值 ***/
    isCenterSync = true;
    isZoomSync = true;
    private innerCheckLock = false;//标记是否是组件内部引起的图层可见性变化
    basepublicLayer = "raster";//记录上次2000比例尺下使用的公共底图

    /*** 暂存值 ***/
    map: Map = null;
    leftMap: Map = null;
    leftBasemap: ArcGISTiledMapServiceLayer = null;

    /*** Dom 对象 ***/
    mapContainer: JQuery = null;
    layerTree: JQuery = null;
    classMaskObj: JQuery = null;

    /*** 事件 ***/
    extentChangeEvent = null;

    startup() {
        this.configure();

        this.setHtml(this.template);

        this.shortenStack();

        this.initDoubleScreen();

        this.bindEvents();

        /* Copied from LayerList widget : start*/
        this.onPanelInit();
        /* Copied from LayerList widget : end*/

    }

    // 配置
    configure() {
        this.map = this.AppX.runtimeConfig.map;
        this.mapContainer = $('.widgets-basemap');

    }

    shortenStack() {
        this.layerTree = this.domObj.find('.layer-tree');

    }

    // 绑定事件
    bindEvents() {
        this.domObj.find('.center-sync').on('click', function (e) {
            this.isCenterSync = $(e.currentTarget).prop('checked');
        }.bind(this));

        this.domObj.find('.zoom-sync').on('click', function (e) {
            this.isZoomSync = $(e.currentTarget).prop('checked');
        }.bind(this));

        // 中心同步
        this.extentChangeEvent = this.map.on('extent-change', function (e) {
            if (this.isCenterSync === true && this.isZoomSync === true) {
                this.leftMap.setExtent(e.extent);
            } else if (this.isZoomSync === true) {
                this.leftMap.setZoom(e.lod.level);
            } else if (this.isCenterSync === true) {
                this.leftMap.centerAt(e.extent.getCenter());
            }
        }.bind(this));
        this.leftMap.on("zoom-end", this.zoomEndEvent.bind(this));

        this.leftMap.on('load', () => {
            this.leftMap.setExtent(this.map.extent);
        });

        this.leftMap.on("layer-suspend", this.onLayerVisibleChanged.bind(this));
        this.leftMap.on("layer-resume", this.onLayerVisibleChanged.bind(this));
    }

    unBindEvent() {
        this.extentChangeEvent.remove();
    }

    keepInitCenter() {

    }

    // 初始化双屏
    initDoubleScreen() {
        // 调整位置
        this.mapContainer.addClass('center-right-doubled');

        this.initLeftMap(this.config.leftMapID);

        //var gisResource = this.AppX.appConfig.gisResource;

        // if (gisResource.raster.config.length>0) {
        //     this.setBasemap(gisResource.raster.config[0].url);
        // }
        // // 初始化其他图层
        // if (gisResource.pipe) {
        //     this.setLayers({
        //         url: gisResource.pipe.config[0].url,
        //         type: gisResource.pipe.type
        //     });
        // }
        // if (gisResource.poi) {
        //     this.setLayers({
        //         url: gisResource.poi.config[0].url,
        //         type: gisResource.poi.type
        //     });
        // }
    }

    // 初始化左侧地图
    initLeftMap(id: string) {
        var mainContainer = $(this.AppX.appConfig.mainContainer);
        mainContainer.prepend("<div id='" + id + "'></div>")
        this.classMaskObj = $("<div class='class-mask' " +
            "title='主视图上的操作将会映射到副视图上。'>" +
            "副视图&nbsp;&nbsp;&nbsp;&nbsp;主视图</div>");
        mainContainer.append(this.classMaskObj)
        // 增加地图
        this.leftMap = new Map(id, { logo: false, showLabels: true, showAttribution: false });
        for (var i = 0; i < this.config.mapService.length; i++) {
            var layername = this.config.mapService[i];
            if (this.AppX.appConfig.gisResource[layername].config.length > 0) {
                for (var index = 0; index < this.AppX.appConfig.gisResource[layername].config.length; index++) {
                    var url = this.AppX.appConfig.gisResource[layername].config[index].url;
                    if (this.AppX.appConfig.gisResource[layername].type == "tiled") {
                        var tileLayer = new ArcGISTiledMapServiceLayer(url, { className: "tileLayer" });
                        tileLayer.id = layername + "_" + index;
                        if (layername == "raster") {
                            this.leftMap.addLayer(tileLayer, 0);//管线图层最先添加，但地形图要插入到最底层，以保证地图的缩放比例尺与切片管线一致                            
                        }
                        else
                            this.leftMap.addLayer(tileLayer);
                        if (layername == "pipe")
                            tileLayer.on("load", this.onPipeLayerLoad.bind(this));
                    } else if (this.AppX.appConfig.gisResource[layername].type == "dynamic") {
                        var dynamicLayer = new ArcGISDynamicMapServiceLayer(url, { className: "dynamicLayer" });
                        dynamicLayer.id = layername + "_" + index;
                        this.leftMap.addLayer(dynamicLayer);
                        if (layername == "pipe")
                            dynamicLayer.on("load", this.onPipeLayerLoad.bind(this));
                    }
                }
            }
        }
    }

    private onPipeLayerLoad(event) {
        //获取右侧地图中心和比例尺，以设置到左侧地图
    }

    // 初始化底图选择
    setBasemap(layerURL: string) {
        if (!layerURL) return;
        if (this.leftBasemap !== null) {
            this.leftMap.removeLayer(this.leftBasemap);
        }
        this.leftBasemap = new ArcGISTiledMapServiceLayer(layerURL);
        this.leftMap.addLayer(this.leftBasemap, 1);
    }

    // 初始化图层
    setLayers(layer: {
        url: string,
        type: string
    }) {
        if (!layer) return;
        var mapLayer = null;
        switch (layer.type) {
            case "tiled":
                mapLayer = new ArcGISTiledMapServiceLayer(layer.url);
                break;
            case "dynamic":
                mapLayer = new ArcGISDynamicMapServiceLayer(layer.url);
                break;
            default:
                return;
        }
        this.leftMap.addLayer(mapLayer);
    }

    // 移除左侧地图
    destroyLeftMap() {
        $('#' + this.config.leftMapID).remove();
        this.leftMap = null;
    }

    // 销毁函数
    destroy() {
        /* Copied from LayerList widget : start*/

        this.domObj.off('click', '.' + this.css.list_group_item_class, this.onListClick)
            .off('change', 'input', this.onLayerCheckChange);
        /* Copied from LayerList widget : end*/

        this.mapContainer.removeClass('center-right-doubled');

        this.unBindEvent();
        this.destroyLeftMap();

        this.classMaskObj.remove();
        this.domObj.remove();
        this.afterDestroy();
    }

    /* Copied from LayerList widget : start*/

    private layers: any[] = [];
    // private data: any = {};
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

    onPanelInit() {
        this.initEvent();
        this.beginGetLayerInfors();
    }
    private initEvent() {
        this.domObj.on('click', '.' + this.css.list_group_item_class, this.onListClick.bind(this))
            .on('change', 'input', this.onLayerCheckChange.bind(this));
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
            var that = this;
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
        if (this.leftMap) {
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
                        this.leftMap.addLayer(layer, 0);
                    else
                        this.leftMap.addLayer(layer);
                    layer.setVisibility(visible);
                } else if (type == "dynamic") {

                    layer = new ArcGISDynamicMapServiceLayer(url, { className: "dynamicLayer" });
                    if (this.isBaseLayer(url))
                        this.leftMap.addLayer(layer, 0);
                    else
                        this.leftMap.addLayer(layer);
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
        for (var i = 0; i < this.leftMap.layerIds.length; i++) {
            var layer = this.leftMap.getLayer(this.leftMap.layerIds[i]);
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
    private previousScale;
    zoomEndEvent() {
        // var scaleOfMap = this.leftMap.getScale();
        // if (this.previousScale === undefined)
        //     this.previousScale = scaleOfMap;
        // if ((scaleOfMap > 2000 || scaleOfMap == 2000) && this.previousScale < 2000) {
        //     if (this.AppX.appConfig.gisResource.raster.config.length > 0) {
        //         //打开影像层
        //         this.updateLayerVisibility(this.AppX.appConfig.gisResource.raster.config[0].url, undefined, "tiled", true);
        //     }
        //     if (this.AppX.appConfig.gisResource.terrain.config.length > 0) {
        //         //关闭通用地形
        //         this.updateLayerVisibility(this.AppX.appConfig.gisResource.terrain.config[0].url, undefined, "tiled", false);
        //     }
        //     if (this.AppX.appConfig.gisResource.privateterrain.config.length > 0) {
        //         //关闭私有地形
        //         this.updateLayerVisibility(this.AppX.appConfig.gisResource.privateterrain.config[0].url, undefined, "tiled", false);
        //     }
        // } else if (scaleOfMap < 2000 && (this.previousScale > 2000 || this.previousScale == 2000)) {
        //     if (this.AppX.appConfig.gisResource.privateterrain.config.length > 0) {
        //         //打开私有地形
        //         this.updateLayerVisibility(this.AppX.appConfig.gisResource.privateterrain.config[0].url, undefined, "tiled", true);
        //     }
        //     if (this.AppX.appConfig.gisResource.raster.config.length > 0) {
        //         //关闭影像层
        //         this.updateLayerVisibility(this.AppX.appConfig.gisResource.raster.config[0].url, undefined, "tiled", false);
        //     }
        //     if (this.AppX.appConfig.gisResource.terrain.config.length > 0) {
        //         //关闭通用地形
        //         this.updateLayerVisibility(this.AppX.appConfig.gisResource.terrain.config[0].url, undefined, "tiled", false);
        //     }
        // }
        // this.previousScale = scaleOfMap;
        //修改图层列表各可见性
        var scaleOfMap = this.leftMap.getScale();
        if ((scaleOfMap > 2000 || scaleOfMap == 2000) && this.previousScale < 2000) {
            if (this.AppX.appConfig.gisResource.terrain.config.length > 0) {
                //打开上次的地图
                if (this.basepublicLayer != null)
                    this.updateLayerVisibility(this.AppX.appConfig.gisResource[this.basepublicLayer].config[0].url, undefined, "tiled", true);
            }
            for (var i = 0; i < this.config.baselayers.length; i++) {
                var layername = this.config.baselayers[i];
                if (layername != this.basepublicLayer &&
                    this.AppX.appConfig.gisResource[layername] &&
                    this.AppX.appConfig.gisResource[layername].config.length > 0) {
                    this.updateLayerVisibility(this.AppX.appConfig.gisResource[layername].config[0].url, undefined, "tiled", false);
                }
            }
        } else if (scaleOfMap < 2000 && (this.previousScale > 2000 || this.previousScale == 2000)) {
            this.basepublicLayer = this.findVisibleBaseLayer();
            if (this.AppX.appConfig.gisResource.privateterrain.config.length > 0) {
                //打开私有地形
                this.updateLayerVisibility(this.AppX.appConfig.gisResource.privateterrain.config[0].url, undefined, "tiled", true);
            }
            if (this.AppX.appConfig.gisResource.raster.config.length > 0) {
                //关闭影像层
                this.updateLayerVisibility(this.AppX.appConfig.gisResource.raster.config[0].url, undefined, "tiled", false);
            }
            if (this.AppX.appConfig.gisResource.terrain.config.length > 0) {
                //关闭通用地形
                this.updateLayerVisibility(this.AppX.appConfig.gisResource.terrain.config[0].url, undefined, "tiled", false);
            }
        }
        this.previousScale = scaleOfMap;
    }

    private findVisibleBaseLayer() {
        if (this.AppX.appConfig.gisResource.raster.config.length > 0) {
            var layer = this.findLayerInMap(this.AppX.appConfig.gisResource.raster.config[0].url);
            if (layer != null && layer.visible)
                return "raster";
        }
        if (this.AppX.appConfig.gisResource.terrain.config.length > 0) {
            var layer = this.findLayerInMap(this.AppX.appConfig.gisResource.terrain.config[0].url);
            if (layer != null && layer.visible)
                return "terrain";
        }
        return null;
    }

    private onLayerVisibleChanged(arg) {
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

    /* Copied from LayerList widget : end*/
}