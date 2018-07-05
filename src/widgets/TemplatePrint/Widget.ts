import BaseWidget = require('core/BaseWidget.class');
import Map = require("esri/map");
import Layer = require("esri/layers/layer");
import Point = require('esri/geometry/Point');
import Polygon = require('esri/geometry/Polygon');
import SpatialReference = require("esri/SpatialReference");
import Color = require('esri/Color');
import SimpleLineSymbol = require('esri/symbols/SimpleLineSymbol');
import SimpleFillSymbol = require('esri/symbols/SimpleFillSymbol');
import GraphicsLayer = require('esri/layers/GraphicsLayer');
import Extent = require("esri/geometry/Extent");
import Draw = require('esri/toolbars/draw');
import Graphic = require('esri/graphic');
import toJSON = require('./toJSON');
import Geoprocessor = require("esri/tasks/Geoprocessor");

export = TemplatePrint;
//是否需要监听map比例尺，同步各图层可见性
class TemplatePrint extends BaseWidget {
    private map: Map;
    baseClass: string = "wideget-templateprint";
    tempLayer = new GraphicsLayer();
    toast;
    count = 0;
    ajaxs = [];
    currentAjax = null;
    private css = {
        list_group_item_class: 'list-group-item',
        list_group_check_item_class: 'list-group-item-check',
        pipeLayerGroup_class: 'pipe-layers',
        baseLayerGroup_class: 'base-layers',
        gridLayerGroup_class: 'grid-layers',
    };

    private attr = {

    };
    startup() {
        this.map = this.AppX.runtimeConfig.map;
        this.map.addLayer(this.tempLayer);
        this.toast = this.AppX.runtimeConfig.toast;
        var htmlString = _.template(this.template)({ templates: this.config.templates });
        this.setHtml(htmlString);
        if (this.AppX.appConfig.gisResource.vectorprint.config.length == 0) {
            this.toast.Show("未配置打印服务，请联系管理员!");
            return;
        }
        if (this.AppX.appConfig.gisResource.printtemplatepath.config.length == 0) {
            this.toast.Show("未配置打印模板，请联系管理员!");
            return;
        }
        //广播插件已加载
        this.onPanelInit();
    }

    destroy() {
        this.map.enableMapNavigation();
        this.tempLayer.clear();
        this.map.removeLayer(this.tempLayer);
        this.afterDestroy();
    }
    onPanelInit() {
        this.initUI();
        this.initEvent();
    }
    private initUI() {
        //显示当前比例尺
        this.domObj.find(".scale").val(this.map.getScale());
        //显示默认出图人信息
        this.loadUserInforData();

    }
    private initEvent() {
        this.domObj.on('click', '.pick-extent', this.onPickExtentClick.bind(this))
            .on('click', '.btnprint', this.onPrintClick.bind(this));
        this.domObj.on("click", ".btntrash", function () {
            //清空count移除hander,清空printresults,隐藏clearresults
            this.count = 0;
            if (this.ajaxs !== undefined)
                this.ajaxs.forEach(function (item, index) {
                    // item.abort();
                    if (item.canceled == "false") {
                        item.cancel();
                    }
                }.bind(this));
            this.domObj.find(".printresults").empty();
            this.domObj.find(".clearresults").hide();
        }.bind(this));
    }
    /**
    * (方法说明)打印按钮点击事件处理
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private onPrintClick() {
        if (this.domObj.find(".title").val().length == 0) {
            this.domObj.find(".title").attr("placeholder", "标题，不能为空！");
            return;
        }
        var scaleStr = this.domObj.find(".scale").val().trim();
        if (!/^[0-9]*$/.test(scaleStr)) {
            this.AppX.runtimeConfig.toast.Show("请输入合法的比例尺！");
            return;
        }
        var scale = parseFloat(scaleStr);
        //输入框长度限制
        if (this.domObj.find(".title").val().length > this.config.inputmaxlength) {
            this.toast.Show("标题长度请小于" + this.config.inputmaxlength + "！");
            return;
        }
        if (this.domObj.find(".authorText").val().length > this.config.inputmaxlength) {
            this.toast.Show("出图人员长度请小于" + this.config.inputmaxlength + "！");
            return;
        }
        if (this.domObj.find(".copyrightText").val().length > this.config.inputmaxlength) {
            this.toast.Show("出图单位长度请小于" + this.config.inputmaxlength + "！");
            return;
        }
        if (this.tempLayer.graphics === undefined || this.tempLayer.graphics.length == 0) {
            this.toast.Show("请先生成打印范围!");
            return;
        }
        this.count += 1;
        var resultDom = this.domObj.find(".printresults");
        //判断是否有printresults显示清理按钮
        var clearresults = this.domObj.find(".clearresults")
        if (resultDom.length > 0 && clearresults.css("display") == "none") {
            clearresults.show();
            //绑定清理事件
            this.domObj.delegate(".btntrash", "click", function () {
                //清空count移除hander,清空printresults,隐藏clearresults
                this.count = 0;
                this.ajaxs.forEach(function (item, index) {
                    // item.abort();
                    if (item.canceled == "false") {
                        item.cancel();
                    }
                });
                this.domObj.find(".printresults").empty();
                this.domObj.find(".clearresults").hide();
            });
        }
        //配置mapjson
        var baseMapType = this.findBaseMapType(scale);
        var mapjson = toJSON.toJson(baseMapType, this.AppX.appConfig.gisResource.privateterrain.config);
        mapjson.layoutOptions.authorText = this.domObj.find(".authorText").val() == "" ? this.domObj.find(".authorText").attr("placeholder") : this.domObj.find(".authorText").val();
        mapjson.layoutOptions.copyrightText = this.domObj.find(".copyrightText").val() == "" ? this.domObj.find(".copyrightText").attr("placeholder") : this.domObj.find(".copyrightText").val();
        var title = this.domObj.find(".title").val() == "" ? this.domObj.find(".title").attr("placeholder") : this.domObj.find(".title").val();
        mapjson.layoutOptions.titleText = title;
        mapjson.mapOptions.scale = scale;//this.getScaleOnExtent();
        mapjson.layoutOptions.customTextElements.push({ company: this.domObj.find(".copyrightText").val() == "" ? this.domObj.find(".copyrightText").attr("placeholder") : this.domObj.find(".copyrightText").val() });
        if (this.tempLayer.graphics && this.tempLayer.graphics[0] != undefined) {
            var geo = <any>this.tempLayer.graphics[0].geometry
            mapjson.mapOptions.extent = geo.getExtent().toJson();
        }
        var template = this.domObj.find(".templates option:selected").prop('value').trim();
        var proDom = $("<div class=progress prog><div class='progress-bar progress-bar-success progress-bar-striped active' role=progressbar aria-valuenow=100 aria-valuemin=0 aria-valuemax=100 style='width:100%'> 正在打印 " + title + "</div> </div>").appendTo(resultDom);
        var gp = new Geoprocessor(this.AppX.appConfig.gisResource.vectorprint.config[0].url);
        var params = {
            "Web_Map_as_JSON": JSON.stringify(mapjson),
            "Format": this.domObj.find(".format").val(),//"PDF"
            "Layout_Template": template,//this.domObj.find(".layout").val(),//"DefaultA0L"
            "Georef_info": "False",
            "Template_Folder": this.AppX.appConfig.gisResource.printtemplatepath.config[0].url + "/" + baseMapType,
        };
        this.currentAjax = gp.execute(params, this.printResult.bind({ dom: proDom, hander: this, caption: title, count: this.count }), this.printError.bind({ dom: proDom, hander: this, caption: title, count: this.count }));
        this.ajaxs.push(this.currentAjax);
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
    private prePosition;
    private onPickExtentClick() {
        //生成矩形，居中显示
        var template = this.domObj.find(".templates option:selected");
        var templateid = template.prop("value");
        var templateIndex = _.findIndex(this.config.templates, function (item: any) { return item.id == templateid });
        if (templateIndex == -1) return;
        var selectedTemplate = this.config.templates[templateIndex];
        var scaleStr = this.domObj.find(".scale").val();
        if (!/^[0-9]*$/.test(scaleStr)) {
            this.AppX.runtimeConfig.toast.Show("请输入合法的比例尺！");
            return;
        }
        var scale = parseFloat(scaleStr);
        var radio = 180 / (Math.PI * 6378137);//实际距离换算到地图距离的参数
        var widthMap = selectedTemplate.width * scale / 1000 * radio;
        var heightMap = selectedTemplate.height * scale / 1000 * radio;
        var points = [];
        var centerPoint = this.map.extent.getCenter();
        points.push(new Point(centerPoint.x - widthMap / 2, centerPoint.y + heightMap / 2, this.map.spatialReference));
        points.push(new Point(centerPoint.x + widthMap / 2, centerPoint.y + heightMap / 2, this.map.spatialReference));
        points.push(new Point(centerPoint.x + widthMap / 2, centerPoint.y - heightMap / 2, this.map.spatialReference));
        points.push(new Point(centerPoint.x - widthMap / 2, centerPoint.y - heightMap / 2, this.map.spatialReference));
        var polygon = new Polygon(this.map.spatialReference);
        polygon.addRing(points);
        var fillSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
            new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                new Color([255, 0, 0]), 2), new Color([0, 0, 0, 0.3])
        );
        var graphic = new Graphic(polygon, fillSymbol);
        this.tempLayer.clear();
        this.tempLayer.add(graphic);

        //移动事件
        this.tempLayer.on("mouse-down", this.onGLayerMouseDown.bind(this));

        this.tempLayer.on("mouse-drag", this.onGLayerMousedrag.bind(this));

        this.tempLayer.on("mouse-up", this.onGLayerMouseup.bind(this));

        this.tempLayer.on("mouse-out", this.onGLayerMouseout.bind(this));
    }

    private onGLayerMouseDown(evt) {
        this.prePosition = evt.mapPoint;
        this.map.disableMapNavigation();
        this.isLayerOut = false;
    }

    private onGLayerMousedrag(evt) {
        if (this.isLayerOut)
            return;
        var ring = evt.graphic.geometry.rings[0];
        var dx = evt.mapPoint.x - this.prePosition.x;
        var dy = evt.mapPoint.y - this.prePosition.y;
        var newPoints = [];
        // for (var i = 0; i < points.length; i++) {
        //     newPoints.push(new Point(points[i].x + dx, points[i].y + dy, this.map.spatialReference))
        // }
        for (var i = 0; i < ring.length; i++) {
            ring[i][0] = ring[i][0] + dx;
            ring[i][1] = ring[i][1] + dy;
        }
        var newpolygon = new Polygon(this.map.spatialReference);
        // newpolygon.addRing(newPoints);
        newpolygon.addRing(ring);
        evt.graphic.setGeometry(newpolygon);
        this.prePosition = evt.mapPoint;
    }

    private onGLayerMouseup(evt) {
        this.isLayerOut = true;
        this.map.enableMapNavigation();
        var ring = evt.graphic.geometry.rings[0];
        var dx = evt.mapPoint.x - this.prePosition.x;
        var dy = evt.mapPoint.y - this.prePosition.y;
        var newPoints = [];
        for (var i = 0; i < ring.length; i++) {
            ring[i][0] = ring[i][0] + dx;
            ring[i][1] = ring[i][1] + dy;
        }
        var newpolygon = new Polygon(this.map.spatialReference);
        newpolygon.addRing(ring);
        evt.graphic.setGeometry(newpolygon);
    }
    private isLayerOut = true;
    private onGLayerMouseout(evt) {
        this.isLayerOut = true;
        this.map.enableMapNavigation();
    }
    /**
    * (方法说明)查询当前用户信息填充出图人信息
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
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

    /**
   * (方法说明)获取当前底图类型(0-无底图，1-公共地形地图，2-公共影像底图)；由于arcpy.mapping不支持将栅格数据的地图服务转换成地图文档而添加的解决方案
   * @method (方法名)
   * @for (所属类名)
   * @param {(参数类型)} (参数名) (参数说明)
   * @return {(返回值类型)} (返回值说明)
   */
    private findBaseMapType(scale) {
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
        if (scale < 2000)
            baseMapType = 0;
        return baseMapType;
    }

    private findLayerInMap(url) {
        for (var i = 0; i < this.map.layerIds.length; i++) {
            var layer = this.map.getLayer(this.map.layerIds[i]);
            if (layer.url && layer.url == url)
                return layer;
        }
        return null;
    }

    private getScaleOnExtent() {
        if (this.tempLayer.graphics && this.tempLayer.graphics[0] != undefined) {
            var geo = <any>this.tempLayer.graphics[0].geometry
            var extent = geo.getExtent();
            var dx = extent.xmax - extent.xmin;
            var dy = extent.ymax - extent.ymin;
            var length = Math.max(dx, dy);
            var radio = 180 / (Math.PI * 6378137);//实际距离换算到地图距离的参数
            var scale = length / radio / 0.5;
            return scale;
        }
        return this.map.getScale();
    }
}