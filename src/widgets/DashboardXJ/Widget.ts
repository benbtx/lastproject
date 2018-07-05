import BaseWidget = require('core/BaseWidget.class');
/** Esri */
import Map = require('esri/map');
import Graphic = require('esri/graphic');
import Query = require('esri/tasks/query');
import FeatureLayer = require('esri/layers/FeatureLayer');
import SimpleFillSymbol = require('esri/symbols/SimpleFillSymbol');
import SimpleLineSymbol = require('esri/symbols/SimpleLineSymbol');
import Color = require('esri/Color');
import ClassBreaksRenderer = require('esri/renderers/ClassBreaksRenderer');
import ArcGISDynamicMapServiceLayer = require('esri/layers/ArcGISDynamicMapServiceLayer');
import HeatmapRenderer = require('esri/renderers/HeatmapRenderer');
import Point = require("esri/geometry/Point");
import SimpleMarkerSymbol = require('esri/symbols/SimpleMarkerSymbol');
import GraphicsLayer = require('esri/layers/GraphicsLayer');


import GetData = require('./GetData');

declare var echarts;

declare var esri;

export = DataPanelDemo;

class DataPanelDemo extends BaseWidget {
    baseClass = "widget-dashboard";
    charts: Array<any> = [];
    map: Map;
    toast: any;
    featureLayer: FeatureLayer;
    private infortemplate = "<div class=\"common-panel\"><h3 class=\"common-panel-title\"><%=name%></h3><ul class=\"panel-1\"><li class=\"panel-list\"> <span class=\"list-title\"><%=valuetype%></span> <span class=\"list-intro\"><%=value%></span> </li></ul><div class=\"clearfix\"></div></div>";
    staticData: any;
    /** 图表 */
    topLeftChart: any;
    centerLeftChart: any;
    bottomLeftChart: any;
    bottomCenterChart: any;
    bottomRightChart: any;
    miniScale: any;
    cqWidth = 482204;//重庆市宽度m
    tempLayer: GraphicsLayer;//位置点图层
    heatLayer: FeatureLayer;//热点图层
    highlightSymbol = new SimpleFillSymbol(
        SimpleFillSymbol.STYLE_SOLID,
        new SimpleLineSymbol(
            SimpleLineSymbol.STYLE_SOLID,
            new Color([255, 0, 255]), 2
        ),
        new Color([0, 0, 0, 0])
    );
    userSymbol = new SimpleMarkerSymbol(
        {
            color: new Color([255, 0, 0, 0.8]),
            style: "diamond",       //点样式solid\cross\square|diamond|circle|x
            outline: {
                color: new Color([102, 102, 102]),
                width: 0.2
            },
            size: 6
        }
    );
    carSymbol = new SimpleMarkerSymbol(
        {
            color: new Color([255, 255, 0, 0.8]),
            style: "diamond",       //点样式solid\cross\square|diamond|circle|x
            outline: {
                color: new Color([102, 102, 102]),
                width: 0.2
            },
            size: 6
        }
    );

    startup() {
        this.toast = this.AppX.runtimeConfig.toast;
        this.setHtml(this.template);
        if (this.AppX.appConfig.gisResource.xzqmap.config.length == 0) {
            this.AppX.runtimeConfig.toast.Show('获取行政区划服务出错！')
        } else {
            this.showChart();
            this.setMap();
            this.bindEvent();
        }
    }

    showChart() {
        this.topLeftChart = echarts.init(document.getElementById('widget-dashboard_top-left-chart'));
        this.centerLeftChart = echarts.init(document.getElementById('widget-dashboard_center-left-chart-pie'));
        this.bottomLeftChart = echarts.init(document.getElementById('widget-dashboard_bottom-left-chart'));
        this.bottomCenterChart = echarts.init(document.getElementById('widget-dashboard_bottom-center-chart'));
        this.bottomRightChart = echarts.init(document.getElementById('widget-dashboard_bottom-right-chart'));
        var data1 = {
            deptid: this.AppX.appConfig.groupid,
            companyid: this.AppX.appConfig.departmentid,
        }
        var data2 = {
            deptid: this.AppX.appConfig.groupid,
            companyid: this.AppX.appConfig.departmentid,
            q_patrol_date: this.getDataTime()
        }
        this.buildChart(data1, data1);
        $(window).resize(() => {
            this.autoResizeChart();
        });
    }

    autoResizeChart() {
        this.charts.forEach((item) => {
            item.resize();
        });
    }

    bindEvent() {
        // this.bottomCenterChart.on('dblclick', (e) => {
        //     this.jump(e.data[3], e.name);
        // });
        // this.bottomCenterChart.on('mouseover', function (param) {
        //     var wherecause = param.data[3];
        //     // var wherecause = "ADMINCODE in ('" + param.data[3] + "')";
        //     this.searchGraphicInMap(wherecause);
        // }.bind(this));
        // this.bottomCenterChart.on('mouseout', function (param) {
        //     this.map.graphics.clear();
        //     this.map.infoWindow.hide();
        // }.bind(this))
        this.domObj.on('click', '.widget-dashboard_home_button', this.onHomeClick.bind(this));
        //点击左侧目录时刷新饼图
        $('body').on('click', '.fire-on', this.regionListItemClick.bind(this));
        //点击左侧目录标题是刷新为集团统计饼图
        $('body').on('click', '.widgets-region_list-item_header', this.regionListHeaderClick.bind(this));
    }

    searchGraphicInMap(whereCause) {
        if (this.featureLayer != null && this.featureLayer.graphics.length > 0) {
            var selectedindex = _.findIndex(this.featureLayer.graphics, function (o: any) { return o.attributes["ADMINCODE"] == whereCause });
            if (selectedindex != -1) {
                var feature: any = this.featureLayer.graphics[selectedindex];
                var centerP = feature.geometry.getExtent().getCenter();
                var mixedTemplate = _.template(this.infortemplate)({
                    name: feature.attributes["NAME"],
                    valuetype: "管线长度(公里):",
                    value: feature.attributes["value"]
                });
                this.map.infoWindow.setContent(mixedTemplate);
                this.map.infoWindow.resize(180, 77);
                var highlightGraphic = new Graphic(feature.geometry, this.highlightSymbol);
                this.map.graphics.add(highlightGraphic);
                this.map.infoWindow.show(centerP);
            }
        }
    }

    setMap() {
        var width = this.domObj.find(".widget-dashboard_top-right-map").width();
        var height = this.domObj.find(".widget-dashboard_top-right-map").height();
        var length = Math.min(width, height);
        var miniScale = this.cqWidth / (length * 2.54 / 9600);
        this.map = new Map('widget-dashboard_top-right-map', {
            logo: false,
            showLabels: true,
            slider: false,
            fadeOnZoom: true,
            force3DTransforms: true,
            showAttribution: false,
            navigationMode: "css-transforms",
            minScale: miniScale
        });
        this.AppX.runtimeConfig.map = this.map;//用于其它模块使用地图
        this.map.on('load', () => {
            this.miniScale = this.map.getScale();
            this.map.disableDoubleClickZoom();
            this.map.graphics.enableMouseEvents();
            this.map.graphics.on("mouse-out", function (evt) {
                this.map.graphics.clear();
                this.map.infoWindow.hide();
            }.bind(this));
            this.map.graphics.on("mouse-move", function (evt) {
                this.map.infoWindow.show(evt.screenPoint, this.map.getInfoWindowAnchor(evt.screenPoint));
            }.bind(this));
        });

        var xzqLayer = new ArcGISDynamicMapServiceLayer(this.AppX.appConfig.gisResource.xzqmap.config[0].url);
        this.map.addLayer(xzqLayer);

        this.map.on('dbl-click', (e) => {
            this.queryFeature(e.mapPoint, this.featureLayer, (featureSet) => {
                if (featureSet.features.length > 0) {
                    var attributes = featureSet.features[0].attributes;
                    this.jump(attributes.ADMINCODE, attributes.ADMINNAME);
                }
            });
        });
        //this.loadStaticData();
        //如果登录用户是重燃集团用户，在地图上添加跳转到主城范围的按钮
        var data = {
            deptid: this.AppX.appConfig.groupid,
            companyid: this.AppX.appConfig.departmentid,
        }
        this.initOnlineMap(data);
    }

    queryFeature(geometry, featureLayer, callback) {
        var query = new Query();
        query.geometry = geometry;
        query.outFields = ["*"];
        featureLayer.queryFeatures(query, callback);
    }

    destroy() {
        this.domObj.remove();
        this.afterDestroy();
    }


    loadStaticData() {
        $.ajax({
            headers: {
                'Authorization-Token': AppX.appConfig.usertoken
            },
            type: 'post',
            url: this.AppX.appConfig.apiroot + this.config.lengthofXZQAPI,
            success: this.onStaticDataLoad.bind(this),
            error: function (error) {
                this.toast.Show('查询统计信息失败!');
            }
        });
    }

    onStaticDataLoad(e) {
        if (e.code == 10000) {
            this.staticData = e.result;
            this.domObj.find('.widget-dashboard_map_title span').text(e.result.title);
            //load featureLayer and renderer
            var xzqCodes = [];
            e.result.items.forEach(function (item, itemindx) {
                xzqCodes.push("'" + item.xzqcode + "'");
            });
            var inClause = xzqCodes.toString();
            var queryExpression = "ADMINCODE in (" + inClause + ")";
            this.loadThematicMap(queryExpression);
        }
        else {
            this.toast.Show('查询统计信息失败!');
        }
    }
    loadThematicMap(queryExpression) {
        this.featureLayer = new FeatureLayer(this.AppX.appConfig.gisResource.xzqmap.config[0].url + '/1', {
            mode: FeatureLayer.MODE_SNAPSHOT,//加载所有要素到前台
            outFields: ["*"],
            showLabels: false
        });
        this.featureLayer.setDefinitionExpression(queryExpression);
        this.featureLayer.on('update-end', this.onFeatureLayerLoad.bind(this));
        esri.config.defaults.map.zoomDuration = 5; //time in milliseconds; default is 500
        esri.config.defaults.map.zoomRate = 40;//default 20
        this.map.addLayer(this.featureLayer)
        this.featureLayer.on("mouse-over", (e) => {
            this.map.infoWindow.resize(180, 77);
            var mixedTemplate = _.template(this.infortemplate)({
                name: e.graphic.attributes["NAME"] + "(双击进入)",
                valuetype: "管线长度(公里):",
                value: e.graphic.attributes["value"]
            });
            this.map.infoWindow.setContent(mixedTemplate);
            var highlightGraphic = new Graphic(e.graphic.geometry, this.highlightSymbol);
            this.map.graphics.add(highlightGraphic);
        });

    }

    onFeatureLayerLoad(e) {
        // var staticOnXZQ = _.groupBy(this.staticData,"xzqcode");
        var min = 0;
        var max = 0;
        this.featureLayer.graphics.forEach(function (feature, featureindex) {
            var xzqcode = feature.attributes["ADMINCODE"];
            var values = _.filter(this.staticData.items, function (item: any) {
                return item.xzqcode == xzqcode;
            });
            var sum = 0;
            values.forEach(function (value, index) {
                sum += value.value;
            })
            if (featureindex == 0) {
                min = max = sum;
            }
            else {
                if (sum < min)
                    min = sum;
                if (sum > max)
                    max = sum;
            }
            feature.attributes["value"] = parseFloat(sum.toFixed(2));
        }.bind(this));
        //分类渲染
        var avalue: number = 0.5;//0.5;
        var count = parseInt((this.featureLayer.graphics.length / 4).toFixed(0));
        var offset = (max - min) / count;
        min -= 10;
        var outLineSymbol = new SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new Color([252, 238, 206, avalue]), 1)
        var symbol = new SimpleFillSymbol();
        symbol.setColor(new Color([255, 255, 0, avalue]));
        symbol.setOutline(outLineSymbol);
        var renderer = new ClassBreaksRenderer(symbol, "value");
        var startColor = { r: 255, g: 255, b: 0, a: avalue };
        var endColor = { r: 255, g: 102, b: 0, a: avalue };
        var colors = this.buildClassBreakColor(startColor, endColor, count, avalue);
        for (var i = 0; i < count; i++) {
            var fillSymbol = new SimpleFillSymbol();
            fillSymbol.setOutline(outLineSymbol);
            fillSymbol.setColor(new Color([colors[i].r, colors[i].g, colors[i].b, colors[i].a]));
            if (i != count - 1)
                renderer.addBreak(min + offset * i, min + offset * (i + 1), fillSymbol);
            else
                renderer.addBreak(min + offset * i, Infinity, fillSymbol);
        }
        this.featureLayer.setRenderer(renderer);
        this.featureLayer.redraw();
    }

    buildClassBreakColor(startColor, endColor, count, a) {
        var colors = [];
        var g_max = startColor.g;
        var g_min = endColor.g;
        var offset = (g_max - g_min) / count;
        for (var i = 0; i < count; i++) {
            var color = { r: startColor.r, g: parseInt((startColor.g - offset * i).toString()), b: startColor.b, a: a };
            colors.push(color);
        }
        return colors;
    }

    jump(targetCode: string, targetName: string) {
        Cookies.set('region', targetCode);
        this.toast.Show('即将跳转到' + targetName);
        setTimeout(function () {
            location.reload(false);
        }, 1000);
    }
    /**
    * (方法说明)跳转到管线地图界面
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private onHomeClick(event) {
        Cookies.set('region', '*');//使用默认初始范围
        this.toast.Show('即将跳转到管线地图');
        setTimeout(function () {
            location.reload(false);
        }, 1000);
    }

    private regionListItemClick(event) {
        var code = event.target.attributes["data-code"].value;
        var data1 = {
            deptid: this.AppX.appConfig.groupid,
            companyid: this.AppX.appConfig.departmentid,
        }
        var data2 = {
            deptid: this.AppX.appConfig.groupid,
            companyid: this.AppX.appConfig.departmentid,
            q_patrol_date: this.getDataTime()
        }
        if (this.AppX.appConfig.range.split(";")[0] != "00") {//非集团用户
            data2.deptid = data1.deptid = code;
            data2.companyid = data1.companyid = null;
        } else {//集团用户
            data2.companyid = data1.companyid = code;
            data2.deptid = data1.deptid = null;
        }
        this.buildChart(data1, data1);
        this.initOnlineMap(data1);
    }

    private regionListHeaderClick(event) {
        var data1 = {
            deptid: this.AppX.appConfig.groupid,
            companyid: this.AppX.appConfig.departmentid,
        }
        var data2 = {
            deptid: this.AppX.appConfig.groupid,
            companyid: this.AppX.appConfig.departmentid,
            q_patrol_date: this.getDataTime()
        }
        if (this.AppX.appConfig.range.split(";")[0] != "00") {//非集团用户
            data2.companyid = data1.companyid = null;
        } {//集团用户
            data2.deptid = data1.deptid = null;
        }
        this.buildChart(data1, data1);
        this.initOnlineMap(data1);
    }

    //热力图-测试用
    private InitHeatMap() {
        //添加空要素服务图层
        //动态加入数据
        //测试流畅性
        var layerDefinition = {
            "geometryType": "esriGeometryPoint",
            "fields": [{
                "name": "OBJECTID",
                "type": "esriFieldTypeInteger",
                "alias": "OBJECTID"
            }]
        };

        var featureCollection = {
            layerDefinition: layerDefinition,
            featureSet: null
        };

        var hFeatureLayer = new FeatureLayer(featureCollection, {
            mode: FeatureLayer.MODE_SNAPSHOT,
            opacity: 1
        });
        this.map.addLayer(hFeatureLayer);

        var heatmapRenderer = new HeatmapRenderer(null);
        heatmapRenderer.blurRadius = 10;
        heatmapRenderer.maxPixelIntensity = 300;
        heatmapRenderer.minPixelIntensity = 0;
        heatmapRenderer.setColorStops([
            { ratio: 0, color: "rgb(255, 219, 0, 0)" },
            { ratio: 0.15, color: "rgb(255, 196, 0)" },
            { ratio: 0.3, color: "rgb(250, 176, 0)" },
            { ratio: 0.45, color: "rgb(250, 161, 0)" },
            { ratio: 0.6, color: "rgb(250, 146, 0)" },
            { ratio: 0.7, color: "rgb(250, 109, 0)" },
            { ratio: 0.85, color: "rgb(250, 90, 0)" },
            { ratio: 0.95, color: "rgba(250, 73, 0)" },
            { ratio: 1, color: "rgba(255, 0, 0)" },
        ]);
        hFeatureLayer.setRenderer(heatmapRenderer);
        this.config.sampledata.hearpoint.result.items.forEach(function (item, index) {
            var pt = new Point(item.x, item.y, this.map.spatialReference);
            var g = new Graphic(pt, this.setSymbol(pt.type), { OBJECTID: item.objectid });
            //g.setAttributes(currentItem);
            //g.setSymbol(EsriMap.markerSymbol);
            hFeatureLayer.add(g);
        }.bind(this));
    }

    //设置点、线或多边形的样式
    setSymbol(type) {

        var symbol = {
            "SimpleMarkerSymbol": null,
            "SimpleLineSymbol": null,
            "SimpleFillSymbol": null,
        };
        switch (type) {
            case "point":
                symbol.SimpleMarkerSymbol = new SimpleMarkerSymbol(
                    {
                        color: new Color(this.config.color),
                        style: "diamond",       //点样式solid\cross\square|diamond|circle|x
                        outline: {
                            color: new Color(this.config.color),
                            width: 0.2
                        }
                    }
                );

                break;
            case "polyline":
                symbol.SimpleLineSymbol = new SimpleLineSymbol({
                    color: new Color(this.config.color),
                    style: "solid",   //线的样式 dash|dash-dot|solid等	
                    width: 3
                });
                break;

            case "polygon":
                symbol.SimpleFillSymbol = new SimpleFillSymbol({
                    color: new Color([0, 0, 0, 0.1]),
                    outline: {
                        color: new Color(this.config.color),
                        width: 3
                    }
                });
                symbol.SimpleFillSymbol.style = SimpleFillSymbol.STYLE_SOLID;
                break;
        }
        if (symbol.SimpleMarkerSymbol != null) {
            return symbol.SimpleMarkerSymbol;
        } else if (symbol.SimpleLineSymbol != null) {
            return symbol.SimpleLineSymbol;
        } else {
            return symbol.SimpleFillSymbol;
        }
    }

    getDataTime() {
        var date = new Date();
        var resultArr = new Array();

        resultArr.push(date.getFullYear());
        resultArr.push(date.getMonth() + 1);
        resultArr.push(date.getDate());
        var timeArr = new Array();
        timeArr.push(date.getHours());
        timeArr.push(date.getMinutes());
        timeArr.push(date.getSeconds());

        return resultArr.join('-') + " " + timeArr.join(':');
    }

    /**
    * (方法说明)构建统计图表
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    buildChart(data1, data2) {
        GetData.getCompanyPieData(this.AppX.appConfig.xjapiroot + this.config.userstatusAPI,
            data2, 
            (data) => {
                this.topLeftChart.setOption(data);
                this.charts.push(this.topLeftChart);
            });

        GetData.getPipePieData(this.AppX.appConfig.xjapiroot + this.config.yinhuanAPI,
            data1, 
            this.config.yinhuanColors, (data, option) => {
                this.centerLeftChart.setOption(option);
                this.charts.push(this.centerLeftChart);
                //添加今日隐患信息
                if (!data.result)
                    return;
                this.domObj.find(".widget-dashboard_center-left-chart .chart-title").text(data.result.title);
                this.domObj.find(".widget-dashboard_center-left-chart .upload").text(data.result.today.upload);
                this.domObj.find(".widget-dashboard_center-left-chart .handle").text(data.result.today.handle);
            });

        GetData.getTodayXunjianData(this.AppX.appConfig.xjapiroot + this.config.todayxunjianAPI,
            data1, 
            this.config.itemColors, (data, option) => {
                this.bottomLeftChart.setOption(option);
                this.charts.push(this.bottomLeftChart);
                //添加今日巡检信息
                if (!data.result)
                    return;
                this.domObj.find(".widget-dashboard_bottom-left .planuser").text(data.result.today.planuser);
                this.domObj.find(".widget-dashboard_bottom-left .onlineuser").text(data.result.today.onlineuser);
                this.domObj.find(".widget-dashboard_bottom-left .planpoint").text(data.result.today.planpoint);
                this.domObj.find(".widget-dashboard_bottom-left .handlepoint").text(data.result.today.handlepoint);
                this.domObj.find(".widget-dashboard_bottom-left .planline").text(data.result.today.planline);
                this.domObj.find(".widget-dashboard_bottom-left .handleline").text(data.result.today.handleline);
            });

        GetData.getTodayShebeiData(this.AppX.appConfig.xjapiroot + this.config.todayshebeiAPI,
            data1, 
            this.config.itemColors, (data, option) => {
                this.bottomCenterChart.setOption(option);
                this.charts.push(this.bottomCenterChart);
                //添加今日设备巡查信息
                if (!data.result)
                    return;
                this.domObj.find(".widget-dashboard_bottom-center .planuser").text(data.result.today.planuser);
                this.domObj.find(".widget-dashboard_bottom-center .onlineuser").text(data.result.today.onlineuser);
                this.domObj.find(".widget-dashboard_bottom-center .planpoint").text(data.result.today.planpoint);
                this.domObj.find(".widget-dashboard_bottom-center .handlepoint").text(data.result.today.handlepoint);
            });

        GetData.getTodayGongdiData(this.AppX.appConfig.xjapiroot + this.config.todaygongdiAPI,
            data1, 
            this.config.itemColors, (data, option) => {
                this.bottomRightChart.setOption(option);
                this.charts.push(this.bottomRightChart);
                //添加今日工地信息
                if (!data.result)
                    return;
                this.domObj.find(".widget-dashboard_bottom-right .upload").text(data.result.today.upload);
                this.domObj.find(".widget-dashboard_bottom-right .handling").text(data.result.today.handling);
                this.domObj.find(".widget-dashboard_bottom-right .closed").text(data.result.today.closed);
            });
    }
    /**
    * (方法说明)在地图上渲染人和车辆的热点图
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    initOnlineHeatMap(users: Array<any>, cars: Array<any>) {
        if (this.heatLayer == null) {
            var layerDefinition = {
                "geometryType": "esriGeometryPoint",
                "fields": [{
                    "name": "id",
                    "type": "esriFieldTypeString",
                    "alias": "id"
                }]
            };
            var featureCollection = {
                layerDefinition: layerDefinition,
                featureSet: null
            };
            this.heatLayer = new FeatureLayer(featureCollection, {
                mode: FeatureLayer.MODE_SNAPSHOT,
                opacity: 1
            });
            this.map.addLayer(this.heatLayer);
        }
        this.heatLayer.clear();
        this.heatLayer.redraw();
        var heatmapRenderer = new HeatmapRenderer(null);
        heatmapRenderer.blurRadius = 10;
        heatmapRenderer.maxPixelIntensity = 100;
        heatmapRenderer.minPixelIntensity = 0;
        heatmapRenderer.setColorStops([
            { ratio: 0, color: "rgb(255, 219, 0, 0)" },
            { ratio: 0.15, color: "rgb(255, 196, 0)" },
            { ratio: 0.3, color: "rgb(250, 176, 0)" },
            { ratio: 0.45, color: "rgb(250, 161, 0)" },
            { ratio: 0.6, color: "rgb(250, 146, 0)" },
            { ratio: 0.7, color: "rgb(250, 109, 0)" },
            { ratio: 0.85, color: "rgb(250, 90, 0)" },
            { ratio: 0.95, color: "rgba(250, 73, 0)" },
            { ratio: 1, color: "rgba(255, 0, 0)" },
        ]);
        this.heatLayer.setRenderer(heatmapRenderer);
        if (users != null && users.length > 0)
            users.forEach(function (item, index) {
                var pt = new Point(item.x, item.y, this.map.spatialReference);
                var g = new Graphic(pt, this.setSymbol(pt.type), { id: item.id });
                this.heatLayer.add(g);
            }.bind(this));
        if (cars != null && cars.length > 0)
            cars.forEach(function (item, index) {
                var pt = new Point(item.x, item.y, this.map.spatialReference);
                var g = new Graphic(pt, this.setSymbol(pt.type), { id: item.id });
                this.heatLayer.add(g);
            }.bind(this));
    }
    /**
    * (方法说明)以指定参数查询(车辆，人)位置数据并在地图上绘制位置或热点图
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    initOnlineMap(data) {
        if (this.tempLayer != null)
            this.tempLayer.clear();

        var url = this.AppX.appConfig.xjapiroot + this.config.heatpointAPI;
        $.ajax({
            headers: {
                'token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
                'range': AppX.appConfig.range
            },
            data: data,
            type: 'post',
            url: url,
            success: function (data) {
                if (data.code != 1) {
                    AppX.runtimeConfig.toast.Show("位置分布接口错误!");
                    return;
                }
                if (data.result == null) return;
                this.domObj.find(".widget-dashboard_top-right-map .chart-title").text(data.result.title);
                if (this.tempLayer == null) {
                    this.tempLayer = new GraphicsLayer();
                    this.map.addLayer(this.tempLayer);
                }
                if (data.result.users) {
                    data.result.users.forEach(function (item, index) {
                        var point = new Point(item.x, item.y, this.map.spatialReference);
                        var graphic = new Graphic(point, this.userSymbol);
                        this.tempLayer.add(graphic);
                    }.bind(this));
                }
                if (data.result.cars) {
                    data.result.cars.forEach(function (item, index) {
                        var point = new Point(item.x, item.y, this.map.spatialReference);
                        var graphic = new Graphic(point, this.carSymbol);
                        this.tempLayer.add(graphic);
                    }.bind(this));
                }
                this.initOnlineHeatMap(data.result.users,data.result.cars);
            }.bind(this)
        });
    }
}