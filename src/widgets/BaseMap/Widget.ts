import BaseWidget = require('core/BaseWidget.class');

import Map = require("esri/map");
import ArcGISTiledMapServiceLayer = require('esri/layers/ArcGISTiledMapServiceLayer');
import ArcGISDynamicMapServiceLayer = require('esri/layers/ArcGISDynamicMapServiceLayer');
import Extent = require('esri/geometry/Extent');



export = BaseMap;

class BaseMap extends BaseWidget {
    baseClass = "widgets-basemap";
    basepublicLayer = "terrain";//记录上次2000比例尺下使用的公共底图
    map: Map;
    extents: Extent[] = [];
    baseBerrain;//通用底图
    specialBerrain = null;//专用底图
    previousScale;//上一次的比例尺
    // 此函数在系统初始化完成后会自动调用
    //  所有业务逻辑从此函数开始
    startup() {
        this.addToDom({
            mapDiv: this.config.mapDiv
        });
        /*** 初始化地图 ***/
        this.initMap();
        this.map.on('load', this.mapOnLoad.bind(this));
        this.getBaseTrrian();
        this.map.on("zoom-end", this.zoomEndEvent.bind(this));
    }

    mapOnLoad() {
        this.previousScale = this.map.getScale();
        // this.map.setExtent(new Extent({
        //     xmax: 770049.9464697815,
        //     xmin: 762144.1806582497,
        //     ymax: 3400461.863531368,
        //     ymin: 3394550.0017076437,
        //     spatialReference: 4544
        // }));
        this.ready();
    }

    initMap() {

        /*** 添加图层到map控件 ***/
        var map = this.addToMap();

        this.map = map;
        this.AppX.runtimeConfig.map = map;

    }

    addToDom(data?: any) {
        var htmlString = _.template(this.template)(data || {});
        this.setHtml(htmlString);
    }

    /**
    * (方法说明)
    * @method (addToMap)
    * @for ()
    * @param 无
    * @return {(Map)} (返回一个Map对象)
    */
    addToMap() {
        var map = new Map(this.config.mapDiv, { logo: false, showLabels: true, showAttribution: false,slider:false });
        for (var i = 0; i < this.config.mapService.length; i++) {
            var layername = this.config.mapService[i];
            if (this.AppX.appConfig.gisResource[layername].config.length > 0) {
                for (var index = 0; index < this.AppX.appConfig.gisResource[layername].config.length; index++) {
                    var url = this.AppX.appConfig.gisResource[layername].config[index].url;
                    var layerAlias = this.AppX.appConfig.gisResource[layername].config[index].name;
                    if (this.AppX.appConfig.gisResource[layername].type == "tiled") {
                        var tileLayer = new ArcGISTiledMapServiceLayer(url, { className: "tileLayer" });
                        tileLayer.id = layername + "_" + index;
                        if (layername == "terrain") {
                            //add private terrain layer
                            if (this.AppX.appConfig.gisResource.privateterrain.config.length) {
                                var privatelayer = new ArcGISTiledMapServiceLayer(this.AppX.appConfig.gisResource.privateterrain.config[0].url, { className: "tileLayer" });
                                privatelayer.id = "privateterrain_0";
                                privatelayer.setVisibility(false);
                                map.addLayer(privatelayer, 0);
                            }
                            //add private terrain layer
                            map.addLayer(tileLayer, 0);//管线图层最先添加，但地形图要插入到最底层，以保证地图的缩放比例尺与切片管线一致                            
                        }
                        else
                            map.addLayer(tileLayer);
                        if (layername == "pipe")
                            tileLayer.on("load", this.onPipeLayerLoad.bind(this));
                    } else if (this.AppX.appConfig.gisResource[layername].type == "dynamic") {
                        var dynamicLayer = new ArcGISDynamicMapServiceLayer(url, { className: "dynamicLayer" });
                        dynamicLayer.id = layername + "_" + index;
                        if (this.AppX.appConfig.gisResource[layername].filter) {
                            this.setLayerFilter(dynamicLayer, layerAlias);
                        }
                        map.addLayer(dynamicLayer);
                        if (layername == "pipe")
                            dynamicLayer.on("load", this.onPipeLayerLoad.bind(this));
                    }
                }
            }
        }
        return map;
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
            if (this.AppX.appConfig.initextent.xmax != undefined)
                this.map.setExtent(new Extent({
                    xmax: this.AppX.appConfig.initextent.xmax,
                    xmin: this.AppX.appConfig.initextent.xmin,
                    ymax: this.AppX.appConfig.initextent.ymax,
                    ymin: this.AppX.appConfig.initextent.ymin,
                    spatialReference: this.map.spatialReference
                }));
            else
                this.map.setExtent(fullExtent);
        }
        // }
    }

    private onPipeLayerLoad(event) {
        this.extents.push(event.layer.fullExtent);
        if (event.layer.units)
            this.AppX.runtimeConfig.unit = event.layer.units;
        // if (this.extents.length == this.AppX.appConfig.gisResource.pipe.config.length) {
        //设置地图范围
        if (this.extents.length > 0) {
            var fullExtent = this.extents[0];
            // for (var i = 1; i < this.extents.length; i++) {
            //     fullExtent = fullExtent.union(this.extents[i]);
            // }
            if (this.AppX.appConfig.initextent.xmax != undefined)
                this.map.setExtent(new Extent({
                    xmax: this.AppX.appConfig.initextent.xmax,
                    xmin: this.AppX.appConfig.initextent.xmin,
                    ymax: this.AppX.appConfig.initextent.ymax,
                    ymin: this.AppX.appConfig.initextent.ymin,
                    spatialReference: this.map.spatialReference
                }));
            else
                this.map.setExtent(fullExtent);
        }
        // }
    }

    getBaseTrrian() {
        var map = this.AppX.runtimeConfig.map;
        // this.previousScale = map.getScale();
        var layerIds = map.layerIds;
        for (var i = 0, length = layerIds.length; i < length; i++) {
            if (/terrain/.test(layerIds[i])) {
                this.baseBerrain = map.getLayer(layerIds[i]);

            }
        }
    }
    zoomEndEvent() {
        var scaleOfMap = this.map.getScale();
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

    private updateLayerVisibility(url, sublayerid, type, visible) {
        if (this.map) {
            var layer: any = this.findLayerInMap(url);
            var visilble = false;
            if (layer != null) {
                if (sublayerid === undefined && layer.vislble != visible)
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

    private findLayerInMap(url) {
        for (var i = 0; i < this.map.layerIds.length; i++) {
            var layer = this.map.getLayer(this.map.layerIds[i]);
            if (layer.url && layer.url == url)
                return layer;
        }
        return null;
    }

    private setLayerFilter(dlayer: ArcGISDynamicMapServiceLayer, layerAlias: string) {
        var managerDepartment = Cookies.get('range');
        var ranges: Array<any> = managerDepartment.split(';');
        var filter = null;
        if (ranges.length > 0) {
            filter = ranges.map(function (range) {
                return "'" + range + "'";
            }).join(",");
            filter = 'MANAGEDEPT_CODE in (' + filter + ')';
        }
        ///设置过滤条件
        if ($.ajax && this.AppX.appConfig.gisResource.pipedata.config.length > 0) {
            $.ajax(
                {
                    type: "get",
                    traditional: true,
                    url: dlayer.url,
                    data: { f: "json" },
                    async: true,
                    dataType: "json",
                    success: function (data) {
                        var layerDefinitions = [];
                        data.layers.forEach((item, index) => {
                            if (!item.subLayerIds) {
                                layerDefinitions[item.id] = filter;
                            }
                        });
                        dlayer.setLayerDefinitions(layerDefinitions);
                    }.bind(this),
                    error: function (data) {
                        this.AppX.runtimeConfig.toast.Show("加载图层:" + layerAlias + "失败，请联系管理员");
                        this.btnViewDetails.removeClass('disabled');
                        console.error(data);
                    }.bind(this)
                }
            );
        }
    }
}