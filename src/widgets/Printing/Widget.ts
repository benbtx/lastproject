import BaseWidget = require('core/BaseWidget.class');
import PrintTask = require('esri/tasks/PrintTask');
import PrintParameters = require('esri/tasks/PrintParameters');
import PrintTemplate = require('esri/tasks/PrintTemplate');
import toJSON = require('./toJSON');
import Polygon = require('esri/geometry/Polygon');
import MapImageLayer = require('esri/layers/MapImageLayer');
import QueryTask = require('esri/tasks/QueryTask');
import Query = require("esri/tasks/query");
import Color = require('esri/Color');
import SimpleLineSymbol = require('esri/symbols/SimpleLineSymbol');
import SimpleFillSymbol = require('esri/symbols/SimpleFillSymbol');
import GraphicsLayer = require('esri/layers/GraphicsLayer');
import Extent = require("esri/geometry/Extent");
import Print = require("esri/dijit/Print");
import LegendLayer = require("esri/tasks/LegendLayer");
import ArcGISTiledMapServiceLayer = require('esri/layers/ArcGISTiledMapServiceLayer');
import ArcGISDynamicMapServiceLayer = require('esri/layers/ArcGISDynamicMapServiceLayer');
import Draw = require('esri/toolbars/draw');
import Graphic = require('esri/graphic');
import Geoprocessor = require("esri/tasks/Geoprocessor");

export = Printing;

class Printing extends BaseWidget {
    baseClass = "wideget-Printing";
    apiPrint = "";
    grid: any;
    gridServicePath = "";
    printtemplatePath = "";
    map = null;
    printTask = null;
    printparams = null;
    template = null;
    count = 0;
    currentAjax = null;
    ajaxs = [];
    glayer = new GraphicsLayer;
    mapimageLayer = null;
    currentid = "map";
    toast = null;
    tfLayer = null;
    draw: Draw = null;
    mapClickHandler = null;


    startup() {
        this.domObj = $('.' + this.baseClass);
        this.map = this.AppX.runtimeConfig.map;
        this.toast = this.AppX.runtimeConfig.toast;
        // this.apiPrint = this.AppX.appConfig.gisResource.vectorprint.config[0].url;
        // this.gridServicePath = this.AppX.appConfig.gisResource.grid.config[0].url;
        if (this.AppX.appConfig.gisResource.vectorprint.config[0] == undefined) {
            this.toast.Show("矢量打印服务未配置到config！");
            return;
        } else {
            this.apiPrint = this.AppX.appConfig.gisResource.vectorprint.config[0].url;
        }
        if (this.AppX.appConfig.gisResource.grid == undefined) {
            this.toast.Show("网格服务名称配置错误！");
        } else {
            this.grid = this.AppX.appConfig.gisResource.grid;
        }
        if (this.AppX.appConfig.gisResource.grid.config[0] == undefined) {
            this.toast.Show("网格服务未配置到config！");
        } else {
            this.gridServicePath = this.AppX.appConfig.gisResource.grid.config[0].url;
        }
        //that.AppX.appConfig.gisResource.printtemplatepath.config[0].url
        if (this.AppX.appConfig.gisResource.printtemplatepath.config[0] == undefined) {
            this.toast.Show("打印模板路径未配置到config！");
        } else {
            this.printtemplatePath = this.AppX.appConfig.gisResource.printtemplatepath.config[0].url;

        }
        this.onPanelInit();
    }


    onPanelInit() {
        // //设置面板内容
        this.setHtml(this.template);
        this.beginGetLayerInfors();
        this.loadUserInforData();
        //添加网格服务
        //添加格网地图服务

        // this.mapimageLayer = new MapImageLayer({
        //     url: this.config.gridServiceUrl
        // });
        // this.AppX.runtimeConfig.map.layers.add(this.mapimageLayer);
        this.initEvent();

    }
    loadUserInforData() {
        $.ajax({
            headers: {
                'Authorization-Token': AppX.appConfig.usertoken
            },
            url: AppX.appConfig.apiroot.replace(/\/+$/, "") + '/webapp/userinfor',
            type: "post",
            dataType: "json",
            success: function (data) {
                if (data.code == 10000) {
                    //更新界面显示
                    this.userinfor = data.result;
                    this.domObj.find(".authorText").val(data.result.realname);
                    this.domObj.find(".copyrightText").val(data.result.departmentname);

                }
            }.bind(this),
            error: function (data) {
                this.toast.Show("获取用户信息失败!");
            }.bind(this)
        });
    }

    initEvent() {
        var that = this;
        this.domObj.delegate(".btnprint", "click", function () {

            if (that.domObj.find(".title").val().length == 0) {
                that.domObj.find(".title").attr("placeholder", "标题，不能为空！");
                return;
            }
            //输入框长度限制
            if (that.domObj.find(".title").val().length > that.config.inputmaxlength) {
                that.toast.Show("标题长度请小于" + that.config.inputmaxlength + "！");
                return;
            }
            if (that.domObj.find(".authorText").val().length > that.config.inputmaxlength) {
                that.toast.Show("出图人员长度请小于" + that.config.inputmaxlength + "！");
                return;
            }
            if (that.domObj.find(".copyrightText").val().length > that.config.inputmaxlength) {
                that.toast.Show("出图单位长度请小于" + that.config.inputmaxlength + "！");
                return;
            }


            if (that.currentid != "map" && that.glayer.graphics.length == 0) {
                that.toast.Show("请选择一个区域进行打印！");
                return;
            }
            that.count += 1;
            var resultDom = that.domObj.find(".printresults");
            //判断是否有printresults显示清理按钮
            var clearresults = that.domObj.find(".clearresults")
            if (resultDom.length > 0 && clearresults.css("display") == "none") {
                clearresults.show();
                //绑定清理事件
                var cur_that = that;
                that.domObj.delegate(".btntrash", "click", function () {
                    //清空count移除hander,清空printresults,隐藏clearresults
                    cur_that.count = 0;
                    cur_that.ajaxs.forEach(function (item, index) {
                        // item.abort();
                        if (item.canceled == "false") {
                            item.cancel();
                        }
                    });
                    cur_that.domObj.find(".printresults").empty();
                    cur_that.domObj.find(".clearresults").hide();
                });
            }


            // //继续配置mapjson
            var baseMapType = that.findBaseMapType();
            var mapjson = toJSON.toJson(baseMapType, that.AppX.appConfig.gisResource.privateterrain.config);
            mapjson.layoutOptions.authorText = that.domObj.find(".authorText").val() == "" ? that.domObj.find(".authorText").attr("placeholder") : that.domObj.find(".authorText").val();
            mapjson.layoutOptions.copyrightText = that.domObj.find(".copyrightText").val() == "" ? that.domObj.find(".copyrightText").attr("placeholder") : that.domObj.find(".copyrightText").val();
            var title = that.domObj.find(".title").val() == "" ? that.domObj.find(".title").attr("placeholder") : that.domObj.find(".title").val();
            mapjson.layoutOptions.titleText = title;
            if (that.currentid != "map" && that.currentid != 'rectangle')
                mapjson.mapOptions.scale = that.config.scales[that.currentid];//that.domObj.find(".scale").val() == "" ? parseInt(that.view.scale) : parseInt(that.domObj.find(".scale").val());
            else mapjson.mapOptions.scale = that.map.getScale();
            mapjson.layoutOptions.customTextElements.push({ company: that.domObj.find(".copyrightText").val() == "" ? that.domObj.find(".copyrightText").attr("placeholder") : that.domObj.find(".copyrightText").val() });
            if (that.glayer.graphics.length > 0) {
                switch (that.currentid) {
                    case 'rectangle':
                        //计算框选范围在50cm*50cm的图纸上的比例尺
                        mapjson.mapOptions.scale = that.getScaleOnExtent();
                        break;
                    case 'map':
                        mapjson.mapOptions.scale = that.map.getScale();
                        mapjson.mapOptions.extent = that.map.extent.toJson();
                        break;
                    default:
                        var xl = parseInt(that.glayer.graphics[0].attributes["XL"]);
                        var yl = parseInt(that.glayer.graphics[0].attributes["YL"]);
                        var leftbottomStr = yl + "-" + xl;
                        mapjson.layoutOptions.customTextElements.push({ leftbottom: leftbottomStr });
                        break;
                }
            }
            //  //没选图幅，则为当前查看
            // if( that.glayer.graphics[0]!=undefined){
            //     mapjson.mapOptions.extent=that.glayer.graphics[0].geometry.getExtent().toJSON();
            // }

            if (that.glayer.graphics && that.glayer.graphics[0] != undefined) {
                var geo = <any>that.glayer.graphics[0].geometry
                mapjson.mapOptions.extent = geo.getExtent().toJson();
            }
            var proDom = $("<div class=progress prog><div class='progress-bar progress-bar-success progress-bar-striped active' role=progressbar aria-valuenow=100 aria-valuemin=0 aria-valuemax=100 style='width:100%'> 正在打印 " + title + "</div> </div>").appendTo(resultDom);
            var gp = new Geoprocessor(that.apiPrint);
            var params = {
                "Web_Map_as_JSON": JSON.stringify(mapjson),
                "Format": that.domObj.find(".format").val(),//"PDF"
                "Layout_Template": "Default",//that.domObj.find(".layout").val(),//"DefaultA0L"
                "Georef_info": "False",
                "Template_Folder": that.printtemplatePath + "/" + baseMapType,
            };
            that.currentAjax = gp.execute(params, that.printResult.bind({ dom: proDom, hander: that, caption: title, count: that.count }), that.printError.bind({ dom: proDom, hander: that, caption: title, count: that.count }));
            that.ajaxs.push(that.currentAjax);

        });

        //mapview click 事件 获取当前范围
        this.map.addLayer(this.glayer);

    }

    private onMapClick(evt) {
        if (this.currentid != '0' && this.currentid != '1') {
            return;
        }
        var queryTask = new QueryTask(this.gridServicePath + "/" + this.currentid);
        var query = new Query();
        query.returnGeometry = true;
        query.geometry = evt.mapPoint;
        query.spatialRelationship = Query.SPATIAL_REL_INTERSECTS;
        query.outFields = this.config.outfields;
        queryTask.execute(query, function (results) {
            var fillSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
                new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                    new Color([255, 0, 0]), 2), new Color([0, 0, 0, 0.3])
            )
            results.features[0].symbol = fillSymbol;
            this.glayer.clear();
            this.domObj.find(".grid").attr("checked", "checked");
            this.glayer.add(results.features[0]);
        }.bind(this));
        //清理选中状态
        this.domObj.find(".extent-item").prop("checked", false);
        if (this.mapClickHandler != null) {
            this.mapClickHandler.remove();
            this.mapClickHandler = null;
        }
    }

    private getScaleOnExtent() {
        if (this.glayer.graphics && this.glayer.graphics[0] != undefined) {
            var geo = <any>this.glayer.graphics[0].geometry
            var extent = geo.getExtent();
            var dx = extent.xmax - extent.xmin;
            var dy = extent.ymax - extent.ymin;
            var length = Math.max(dx, dy);
            var radio = 180 / (Math.PI * 6378137);//实际距离换算到地图距离的参数 度/米
            var scale = length / radio / 0.5;
            return scale;
        }
        return this.map.getScale();
    }

    printResult(e) {
        var that: any = this;
        var proDom: any = that.dom;
        if (e[0].value.url == "") {
            that.dom.replaceWith("<div>" + that.count + "." + "打印" + that.caption + "出错,请重新尝试" + "</div>");
            return;
        }
        if (that.hander.domObj.find(".format").val() == "PDF") {
            that.dom.replaceWith("<div>" + that.count + ".<a target=_blank title='打开' href=" + e[0].value.url + ">" + that.caption + "</a></div>");
        } else {
            that.dom.replaceWith("<div>" + that.count + ".<a target=_blank title='打开' href=" + e[0].value.url + ">" + that.caption + "</a></div>");
        }
        //清理历史输入
        that.hander.domObj.find(".title").val("");

    }
    printError(e) {
        var that: any = this;
        if (e.message == "Request canceled") {
            this.toast.Show("已取消打印！");
        } else if (e.message == "Timeout exceeded") {
            // this.toast.Show("打印出错!");
            that.dom.replaceWith("<div>" + that.count + "." + "打印" + that.caption + "超时,请重新尝试" + "</div>");
        } else {
            that.dom.replaceWith("<div>" + that.count + "." + "打印" + that.caption + "错误,请重新尝试" + "</div>");
        }
        //清理历史输入
        that.hander.domObj.find(".title").val("");
    }


    private beginGetLayerInfors() {
        if (this.grid && this.grid.config.length > 0) {
            $.ajax({
                data: { f: "pjson" },
                url: this.gridServicePath,
                type: "get",
                dataType: "json",
                success: this.onQueryGridSuccess.bind(this),
                error: this.onQueryGridError.bind(this)
            });
        }
    }
    private onQueryGridError(data) {
        this.AppX.runtimeConfig.toast.Show("获取网格数据失败！");
    }
    private onQueryGridSuccess(data) {
        var layers = [];
        if (data && this.grid) {

            for (var i = 0; i < data.layers.length; i++) {
                if (data.layers[i].subLayerIds == null) {
                    data.layers[i].name;
                    this.domObj.find(".sheet").append("<label class=radio-inline><input type=radio class=extent-item name=tf value=" + data.layers[i].id + ">" + data.layers[i].name + "</label>");
                }
            }

            //图幅选择事件
            this.domObj.delegate(".extent-item", "click", function () {
                if (this.glayer != null) {
                    this.glayer.clear();
                }

                //设置可见性
                var extenttype = this.domObj.find(".extent-item:checked").val();
                //清理上一种出图范围设置方式
                if (this.currentid != "" && this.currentid != extenttype) {
                    switch (this.currentid) {
                        case 'rectangle':
                            this.disposeDrawTool();
                            break;
                        case 'map':
                            //this.initDrawTool();
                            break;
                        default:
                            if (this.mapClickHandler != null) {
                                this.mapClickHandler.remove();
                                this.mapClickHandler = null;
                            }
                            this.updateLayerVisibility(this.gridServicePath, this.currentid, "dynamic", false);
                            break;
                    }
                }
                //初始化新的出图范围设置方式
                switch (extenttype) {
                    case 'rectangle':
                        this.initDrawTool();
                        break;
                    case 'map':
                        //this.initDrawTool();
                        break;
                    default:
                        this.mapClickHandler = this.map.on("click", this.onMapClick.bind(this));
                        this.updateLayerVisibility(this.gridServicePath, extenttype, "dynamic", true);
                        break;
                }
                this.currentid = extenttype
                // this.updateLayerVisibility(this.gridServicePath, extenttype, "dynamic", true);
            }.bind(this));
        }
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
        var fillSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
            new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                new Color([255, 0, 0]), 2), new Color([0, 0, 0, 0.3])
        );
        var graphic = new Graphic(event.geometry, fillSymbol);
        this.glayer.clear();
        this.glayer.add(graphic);

        if (this.draw != null)
            this.draw.deactivate();
        this.domObj.find(".extent-item").prop("checked", false);
    }

    private updateLayerVisibility(url, sublayerid, type, visible) {
        if (this.map) {
            this.tfLayer = this.findLayerInMap(url);
            var visilble = false;
            if (this.tfLayer != null) {
                if (sublayerid === undefined)
                    this.tfLayer.setVisibility(visible);
                if (sublayerid !== undefined) {
                    if (visible)
                        this.tfLayer.setVisibleLayers([sublayerid]);
                    else {
                        this.tfLayer.setVisibleLayers([]);
                    }
                }
            }
            else {
                if (type == "tiled") {
                    this.tfLayer = new ArcGISTiledMapServiceLayer(url, { className: "tileLayer" });
                    this.map.addLayer(this.tfLayer);
                    this.tfLayer.setVisibility(visible);
                } else if (type == "dynamic") {

                    this.tfLayer = new ArcGISDynamicMapServiceLayer(url, { className: "dynamicLayer" });
                    this.map.addLayer(this.tfLayer);
                    if (sublayerid !== undefined)
                        if (visible)
                            this.tfLayer.setVisibleLayers([sublayerid]);
                }
            }
        }
    }


    private findLayerInMap(url) {
        for (var i = 0; i < this.map.layerIds.length; i++) {
            var layer = this.map.getLayer(this.map.layerIds[i]);
            if (layer.url && layer.url == url)
                return layer;
        }
        return null;
    }

    /**
    * (方法说明)获取当前底图类型(0-无底图，1-公共地形地图，2-公共影像底图)；由于arcpy.mapping不支持将栅格数据的地图服务转换成地图文档而添加的解决方案
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private findBaseMapType() {
        var baseMapType = 0;
        for (var i = 0; i < this.config.baselayers.length; i++) {
            if (this.AppX.appConfig.gisResource[this.config.baselayers[i]].config.length == 0)
                continue
            var url = this.AppX.appConfig.gisResource[this.config.baselayers[i]].config[0].url;
            var layer = this.findLayerInMap(url);
            if (layer != null && layer.visible) {
                baseMapType = i + 1;
            }
        }
        if (this.currentid == 'rectangle') {
            var scale = this.getScaleOnExtent();
            if (scale < 2000)
                baseMapType = 0;
        }
        else if (this.currentid != "map" && this.currentid != 'rectangle') {
            var scale = this.config.scales[this.currentid];
            if (scale < 2000)
                baseMapType = 0;
        }
        return baseMapType;
    }




    destroy() {
        this.glayer.clear();
        this.map.removeLayer(this.glayer);
        if (this.tfLayer) {
            this.map.removeLayer(this.tfLayer);
        }
        this.domObj.remove();
        this.afterDestroy();
    }
}