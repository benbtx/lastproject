import BaseWidget = require('core/BaseWidget.class');

import LoTemplate = require('lodash/template');
import Draw = require('esri/toolbars/draw');
import Graphic = require('esri/graphic');
import SimpleMarkerSymbol = require('esri/symbols/SimpleMarkerSymbol');
import SimpleLineSymbol = require('esri/symbols/SimpleLineSymbol');
import SimpleFillSymbol = require('esri/symbols/SimpleFillSymbol');
import PictureMarkerSymbol = require('esri/symbols/PictureMarkerSymbol');
import GraphicsLayer = require('esri/layers/GraphicsLayer');
import TextSymbol = require('esri/symbols/TextSymbol');
import Font = require('esri/symbols/Font');
import Color = require('esri/Color');

import ClusterLayer = require('extras/ClusterLayer');
import esriRequest = require('esri/request');
import arrayUtils = require('dojo/_base/array');
import ClassBreaksRenderer = require('esri/renderers/ClassBreaksRenderer');
import SpatialReference = require('esri/SpatialReference');
import Point = require('esri/geometry/Point');

import domConstruct = require('dojo/dom-construct');
import Popup = require('esri/dijit/Popup');
import PopupTemplate = require('esri/dijit/PopupTemplate');

import Extent = require('esri/geometry/Extent');
import ArcGISDynamicMapServiceLayer = require('esri/layers/ArcGISDynamicMapServiceLayer');

import PrintTask = require('esri/tasks/PrintTask');
import PrintParameters = require('esri/tasks/PrintParameters');
import PrintTemplate = require('esri/tasks/PrintTemplate');

declare var html2canvas;
declare var ImgAreaSelect;

export = QuestionMark;

class QuestionMark extends BaseWidget {
    baseClass = "widget-QuestionMark";
    pipeServicePath = "";
    apiPrint = "";
    gridServicePath = "";
    userToken = "";
    toast = null;
    map = null;
    drawtoolbar = null;//画图工具
    polygonselecttoolbar = null;//框选工具
    screenShottoolbar = null;//框选工具
    glayer = new GraphicsLayer;//当前绘制图形层
    mapTextClickHandle = null;
    textblurHandle = null;
    currandom = 0;//当前随机数
    curSelectGraphic = [];
    totalpage = 1;
    currentpage = 1;
    currentpagecount = 1;
    popupTemplate = null;
    clusterLayer = null;//数据库中的疑问标识
    isScreenShot = false;
    screenShotExtent = null;
    pipeUrl = "";
    terrainUrl = "";
    btnSketch = null;
    ishasdraw = false;//当前是否点击
    zoomscale: number = 2000;
    startup() {
        this.onPanelInit();
    }
    onPanelInit() {
        // //设置面板内容
        this.setHtml(this.template);
        this.shortStack();
        this.showQuestionMark(this.config.pagenumber, this.config.pagesize);
        this.initArcgis();
        this.initDomEvent();
    }

    shortStack() {
        this.userToken = this.AppX.appConfig.usertoken;
        this.toast = this.AppX.runtimeConfig.toast;
        this.zoomscale = this.config.zoomscale;
        this.map = this.AppX.runtimeConfig.map;

        if (this.AppX.appConfig.gisResource.pipe.config[0] == undefined) {
            this.toast.Show("管线服务未配置到config！");
            return;
        } else {
            this.pipeServicePath = this.AppX.appConfig.gisResource.pipe.config[0].url;
        }

        if (this.AppX.appConfig.gisResource.rasterprint.config[0] == undefined) {
            this.toast.Show("栅格打印服务未配置到config！");
            return;
        } else {
            this.apiPrint = this.AppX.appConfig.gisResource.rasterprint.config[0].url;
        }
        if (this.AppX.appConfig.gisResource.grid.config[0] == undefined) {
            // this.toast.Show("网格服务未配置到config！");
            return;
        } else {
            this.gridServicePath = this.AppX.appConfig.gisResource.grid.config[0].url;
        }


    }

    initArcgis() {
        // this.btnSketch = this.domObj.find('.sketch');
        // this.glayer.clear();
        this.map.addLayer(this.glayer);
        //画图工具
        this.drawtoolbar = new Draw(this.map);
        this.drawtoolbar.on("draw-end", this.addToMap.bind(this));
    }



    cleanUp() {
        this.map.infoWindow.hide();
        this.clusterLayer.clearSingles();
    }
    error(err) {

        console.log("something failed: ", err);
    }
    initDomEvent() {
        this.domObj.on('click', '#sketchExtent', this.sketchExtent.bind(this))
            .on('click', '#sketchEllipse', this.sketchEllipse.bind(this))
            .on('click', '#sketchArrow', this.sketchArrow.bind(this))
            .on('click', '#sketch', this.skecth.bind(this))
            .on('click', '#sketchText', this.sketchText.bind(this))
            .on('click', '#sketchClearAll', this.sketchClearAll.bind(this));
        //疑问标识，增删查
        this.domObj.find(".saveQuestionMark").off("click").on("click", this.printAndSave.bind(this));
        this.domObj.find(".deleteQuestionMark").off("click").on("click", this.deleteQuestionMark.bind(this));

        var that = this;
        this.domObj.on('click', '.drawTool', function () {
            that.domObj.find(".drawTool.active").removeClass("active");
            if ($(this).attr("id") == "sketchClearAll") {
                return;
            }
            // if ($(this).attr("id") == "sketchText" && that.domObj.find(".markconten").val().length == 0) {
            //     return;
            // }
            $(this).addClass("active");
        })

    }







    skecth() {
        this.map.setMapCursor('crosshair');
        this.map.disablePan();
        this.drawtoolbar.activate(Draw.FREEHAND_POLYLINE);
    }
    sketchText() {
        this.drawtoolbar.deactivate();
        this.map.setMapCursor('crosshair');
        this.map.disablePan();
        // if (this.domObj.find(".markconten").val().length == 0) {
        //     this.toast.Show("文本内容，不能为空！");
        //     this.domObj.find(".markconten").attr("placeholder", "文本内容，不能为空！");
        //     this.map.setMapCursor('default');
        //     this.domObj.find(".drawTool.active").removeClass("active");
        //     this.domObj.find(".markconten").focus();
        //     return;
        // }
        if (this.mapTextClickHandle) {
            this.mapTextClickHandle.remove();
        }
        this.mapTextClickHandle = this.map.on("click", this.mapTextPoint.bind(this));
    }

    mapTextPoint(evt) {

        this.currandom = Math.floor(Math.random() * 10000)
        //map上create:div input type=textarea
        // $("#mainContainer").append("<div class=textlabel style='position: absolute;top: 200px;left: 200px;z-index: 1;width: 100px;height: 100px;border: dashed;border-width: 3px;border-color: gray;'><input type=textarea rows=3 style='display:inline-block;width=100%;height:100%'></div>");
        var screenpoint = this.map.toScreen(evt.mapPoint);
        $("#mainContainer").append("<textarea  class=\"ui-widget-content " + this.currandom + " textlabel\" cols=27 rows=3 style='position: absolute;top:" + screenpoint.y + "px;left:" + screenpoint.x + "px;z-index: 1;width:250px;height: 60px;background:transparent;border: solid;border-width: 3px;border-color: red;font-size:18px; color:#000;'></textarea >");
        // $("#mainContainer textarea").focus();
        $("." + this.currandom).focus();
        this.mapTextClickHandle.remove();
        this.map.setMapCursor('default');
        this.domObj.find(".drawTool.active").removeClass("active");
        this.map.enablePan();


        //监听窗口点击事件
        // if (this.textblurHandle) {
        //     this.textblurHandle.remove();
        // }
        //this.textblurHandle = $("." + this.currandom).off("blur").on("blur", this.textblur.bind(this));
        $("." + this.currandom).one("blur", this.textblur.bind(this));

        // if (this.domObj.find(".markconten").val().length == 0) {
        //     this.toast.Show("文本内容，不能为空！");
        //     // this.domObj.find(".markconten").attr("placeholder", "文本内容，不能为空！");
        //     // this.map.setMapCursor('default');
        //     // this.domObj.find(".drawTool.active").removeClass("active");
        //     this.domObj.find(".markconten").focus();
        //     this.map.enablePan();
        //     return;
        // }

        // create a text symbol
        // var font = new Font("20px", Font.STYLE_NORMAL, Font.VARIANT_NORMAL, Font.WEIGHT_BOLDER);
        // var textSymbol = new TextSymbol(this.domObj.find(".markconten").val(),
        //     font, new Color(this.config.lineColor));
        // var labelPointGraphic = new Graphic(evt.mapPoint, textSymbol);
        // // add the label point graphic to the map
        // this.glayer.add(labelPointGraphic);
        // this.mapTextClickHandle.remove();
        // this.map.setMapCursor('default');
        // this.domObj.find(".drawTool.active").removeClass("active");
        // this.domObj.find(".markconten").val("");
        // this.map.enablePan();
    }

    /**
    * (方法说明)输入完毕后处理函数
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    textblur() {
        // $("." + this.currandom).css("border-width", "0px");
        var textobj = $("." + this.currandom);
        //转换为地图注记
        var x = parseInt(textobj.css("left"));
        var y = parseInt(textobj.css("top"));
        var text = textobj.val().replace('<br/>', '/n');
        textobj.remove();
        this.showLabelOnMap(text, x, y);
    }

    private showLabelOnMap(text, x, y) {
        var font = new Font("20px", Font.STYLE_NORMAL, Font.VARIANT_NORMAL, Font.WEIGHT_BOLDER);
        var textSymbol = new TextSymbol(text,
            font, new Color("#000"));
        var point = new Point(x, y, new SpatialReference({ wkid: this.map.spatialReference.wkid }));
        var labelPointGraphic = new Graphic(this.map.toMap(point), textSymbol);
        // add the label point graphic to the map
        this.glayer.add(labelPointGraphic);
    }

    sketchArrow() {
        this.map.setMapCursor('crosshair');
        this.map.disablePan();
        this.drawtoolbar.activate(Draw.ARROW);
    }
    sketchExtent() {
        this.map.setMapCursor('crosshair');
        this.map.disablePan();
        this.drawtoolbar.activate(Draw.EXTENT);
    }
    sketchEllipse() {
        this.map.setMapCursor('crosshair');
        this.map.disablePan();
        this.drawtoolbar.activate(Draw.ELLIPSE);
    }

    addToMap(evt) {
        var symbol;
        this.drawtoolbar.deactivate();
        this.map.showZoomSlider();
        switch (evt.geometry.type) {
            case "point":
                symbol = new PictureMarkerSymbol(this.config.MarkPictureSymbol, 48, 48).setOffset(0, 15);
                symbol.setColor(new Color(this.config.lineColor));
                break;
            case "multipoint":
                symbol = new SimpleMarkerSymbol();
                break;
            case "polyline":
                symbol = new SimpleLineSymbol();
                symbol.setColor(new Color(this.config.lineColor));
                symbol.width = this.config.lineWidth;
                break;
            default:
                symbol = new SimpleFillSymbol();
                symbol.setColor(new Color(new Color([255, 255, 255, 0])));
                symbol.setOutline(new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color(this.config.lineColor), this.config.lineWidth));
                break;
        }
        var graphic = new Graphic(evt.geometry, symbol);
        //  graphic.infoTemplate
        graphic.infoTemplate = this.popupTemplate;
        this.glayer.add(graphic);
        this.drawtoolbar.deactivate();
        this.map.enablePan();
        this.map.setMapCursor('default');
        this.domObj.find(".drawTool.active").removeClass("active");
    }



    getSymbol(geometry) {
        var symbol;
        switch (geometry.type) {
            case "point":
            case "multipoint":
                symbol = new SimpleMarkerSymbol();
                break;
            case "polyline":
                symbol = new SimpleLineSymbol();
                break;
            default:
                symbol = new SimpleFillSymbol();
                break;
        }
        return symbol;
    }


    deleteSketch() {
        this.curSelectGraphic.forEach(function (item) {
            this.glayer.remove(item);
        }.bind(this))
    }

    sketchClearAll() {
        this.glayer.clear();
        if ($("#mainContainer .textlabel")) {
            for (var i = 0; i < $("#mainContainer .textlabel").length; i++) {
                $($("#mainContainer .textlabel")[i]).remove();
                i--;
            }
        }
    }


    //疑问标识，增删查
    //删除
    deleteQuestionMark() {
        if (this.domObj.find("input:radio:checked").length != 0) {

            // this.domObj.find(".deleteQuestionMark").attr("data-target", "#questionmarkModal");
            // this.domObj.find('.suredelete').off("click").on("click", function () {
            //     (<any>this.domObj.find('#questionmarkModal')).modal('hide');
            //     this.domObj.find(".deleteQuestionMark").attr("data-target", "");
            // }.bind(this));

            // 执行SOE服务
            $.ajax({
                headers: {
                    'Authorization-Token': AppX.appConfig.usertoken
                },
                type: 'POST',
                url: AppX.appConfig.apiroot.replace(/\/+$/, "") + '/webapp/questionmarks/delete',
                data: {
                    id: this.domObj.find("input:radio:checked").attr("data"),
                    // f: "pjson"
                },
                success: this.deleteQuestionMarkCallback.bind(this),
                dataType: "json"
            });

        } else {
            this.toast.Show("请选择一个疑问标识！");
        }
    }

    deleteQuestionMarkCallback(results) {
        if (results.code != 10000) {
            this.toast.Show("删除疑问标识出错！");
            console.log(results.error);
            return;
        }
        //重新查询，构建分页
        if (this.currentpage == this.totalpage && this.currentpagecount == 1) {
            this.showQuestionMark(this.currentpage - 1, this.config.pagesize);
        } else {
            this.showQuestionMark(this.currentpage, this.config.pagesize);
        }

    }

    showQuestionMark(pagenumber, pagesize) {
        // 执行SOE服务
        $.ajax({
            type: 'POST',
            url: AppX.appConfig.apiroot.replace(/\/+$/, "") + '/webapp/questionmarks',
            headers: {
                'Authorization-Token': this.userToken
            },
            data: {
                pagenumber: pagenumber,
                pagesize: pagesize,
                // f: "pjson"
            },
            success: this.showQuestionMarkCallback.bind(this),
            dataType: "json"
        });

    }

    showQuestionMarkCallback(results) {
        var that = this;
        if (results.code != 10000) {
            that.toast.Show("显示疑问标识出错！");
            console.log(results.error);
            // that.domObj.find(".fykj").hide();
            return;
        }
        if (results.result.rows.length != 0) {
            this.totalpage = results.result.totalnumberofpages;
            this.currentpage = results.result.pagenumber;
            this.currentpagecount = results.result.rows.length;
            this.map.infoWindow.resize(400, 260);
            this.addClusters(results.result.rows);
        } else {
            // that.toast.Show("无疑问标识！");
            //清理界面
            this.domObj.find(".pick-pipe-tbody").empty();
            if (this.clusterLayer != null) {
                this.map.removeLayer(this.clusterLayer);
                this.clusterLayer = null
            }
            return;
        }
        //动态生成书签及分页控件
        this.domObj.find(".pick-pipe-tbody").empty();
        var dom_tbody = that.domObj.find(".pick-pipe-tbody");
        var str_tbody = "";
        var name;
        $.each(results.result.rows, function (i, item) {

            if (item.caption.length > 5) {
                name = item.caption.substr(0, 5) + "...";
            } else {
                name = item.caption;
            }
            var point = item.x + "," + item.y;
            var status = "";
            var handledate = "";
            if (item.status == "0") {
                status = "未处理";
            } else {
                status = "已处理";
                handledate = item.handledate;
            }

            str_tbody += "<tr class=goto data-content=" + item.content + "><td width=10%><input type=radio name=questionmark data=" + item.id + " value=" + point + "  /> </td><td title=" + "双击定位：" + item.caption + ">" + name + "</td><td width=35%>" + item.createdate.split("T")[0] + "</td><td width=20%>" + status + "</td></tr>";
        });


        if (results.result.rows.length < that.config.pagesize) {
            var num = that.config.pagesize - results.result.rows.length;
            for (var i = 0; i < num; i++) {
                str_tbody += "<tr class=goto height=32><td></td><td></td><td></td><td></td></tr>";
            }
        }
        dom_tbody.append(str_tbody);
        //补全，
        this.domObj.find(".goto").off("dblclick").on("dblclick", function () {
            if (this.firstChild.firstChild) {
                this.firstChild.firstChild.checked = true;
                var point = this.firstChild.firstChild.value;
                //tihs.pro
                if (point.split(',').length != 2) { return; }
                //arcgis 
                var mapPoint = new Point(parseFloat(point.split(',')[0]), parseFloat(point.split(',')[1]), new SpatialReference({ wkid: that.map.spatialReference.wkid }));
                that.PointAtMap(mapPoint);
            }

        });


        //radio选择定位
        this.domObj.find("input[name='questionmark']").off("change").on("change", function () {
            if ($(this).val()) {
                var point = $(this).val();
                //tihs.pro
                if (point.split(',').length != 2) { return; }
                //arcgis 
                var mapPoint = new Point(parseFloat(point.split(',')[0]), parseFloat(point.split(',')[1]), new SpatialReference({ wkid: that.map.spatialReference.wkid }));
                that.PointAtMap(mapPoint);
            }
        });




        //动态生成书签及分页控件
        //分页控件fykj 向前、向后事件
        that.domObj.find(".content").text("第" + (results.result.pagenumber) + "页共" + results.result.totalnumberofpages + "页");
        this.domObj.find(".pre").off("click").on("click", function () {
            if (results.result.pagenumber - 1 > 0) {
                this.currentpage = results.result.pagenumber - 1;
                that.showQuestionMark(results.result.pagenumber - 1, that.config.pagesize);
                that.domObj.find(".content").text("第" + (results.result.pagenumber - 1) + "页共" + results.result.totalnumberofpages + "页");
            }
        });
        this.domObj.find(".next").off("click").on("click", function () {
            if (results.result.pagenumber + 1 <= results.result.totalnumberofpages) {
                this.currentpage = results.result.pagenumber + 1;
                that.showQuestionMark(results.result.pagenumber + 1, that.config.pagesize);
                that.domObj.find(".content").text("第" + (results.result.pagenumber + 1) + "页共" + results.result.totalnumberofpages + "页");
            }
        });

        this.domObj.find(".pageturning").off("click").on("click", function () {
            var currpage = parseInt(that.domObj.find(".currpage").val());
            if (currpage <= results.result.totalnumberofpages && currpage >= 1) {
                this.currentpage = parseInt(that.domObj.find(".currpage").val());
                that.showQuestionMark(currpage, that.config.pagesize);
                that.domObj.find(".content").text("第" + currpage + "页共" + results.result.totalnumberofpages + "页");
            }
        });

    }

    //显示
    addClusters(resp) {
        var photoInfo = { "data": [] };
        var wgs = new SpatialReference({
            "wkid": this.map.spatialReference.wkid
        });
        photoInfo.data = arrayUtils.map(resp, function (p) {
            var status = "";
            var handledate = "";
            if (p.status == "0") {
                status = "未处理";
            } else {
                status = "已处理";
                handledate = p.handledate;
            }
            var attributes = {
                "Caption": p.caption,
                "Content": p.content,
                "Createdate": p.createdate,
                "Handledate": handledate,
                "Status": status,
                "Image": AppX.appConfig.apiroot.replace(/\/+$/, "") + this.config.filePath + p.fileid,
                // "Link": p.link
            };
            return {
                "x": p.x - 0,
                "y": p.y - 0,
                "attributes": attributes
            };
        }.bind(this));

        // popupTemplate to work with attributes specific to this dataset
        var popupTemplate = new PopupTemplate({
            "title": "",
            "fieldInfos": [{
                "fieldName": "Caption",
                "label": "标题：",
                format: { places: 0 },
                visible: true
            },
                // {
                //     "fieldName": "Name",
                //     "label": "创建者：",
                //     visible: true
                // }
            ],
            "mediaInfos": [{
                "title": "",
                "caption": "",
                "type": "image",
                "value": {
                    "sourceURL": "{Image}",
                    "linkURL": "{Link}"
                }
            }]
        });


        var popupTemplate2 = new PopupTemplate({});
        // popupTemplate2.setContent("<h5>标题：${Caption}</h5><image style=width:600px;height:400px"+ "  src= ${Image}><image>");
        popupTemplate2.setContent("<h5>标题：${Caption}</h5><h5>内容：${Content}</h5><h5>处理情况：${Status}</h5><h5>创建时间：${Createdate}</h5><h5>处理时间：${Handledate}</h5><image src= ${Image}><image>");

        // cluster layer that uses OpenLayers style clustering
        if (this.clusterLayer != null) {
            this.map.removeLayer(this.clusterLayer);
            this.clusterLayer = null
        }
        this.clusterLayer = new ClusterLayer({
            "basemap": this.map,
            "data": photoInfo.data,
            "distance": 10,
            "id": "clusters",
            "labelColor": "#fff",
            "labelOffset": 10,
            "resolution": this.map.extent.getWidth() / this.map.width,
            "singleColor": "#888",
            "singleTemplate": popupTemplate2,
            "spatialReference": wgs
        });
        var defaultSym = new SimpleMarkerSymbol().setSize(4);
        var renderer = new ClassBreaksRenderer(defaultSym, "clusterCount");
        var blue = new PictureMarkerSymbol(this.config.MarkPictureSymbol, 48, 48).setOffset(0, 15);
        renderer.addBreak(0, 10000, blue);//范围放大点，用一种图标渲染
        this.clusterLayer.setRenderer(renderer);
        //this.clusterLayer.symbol = blue;
        this.map.addLayer(this.clusterLayer);
        // // close the info window when the map is clicked
        // this.map.on("click", this.cleanUp.bind(this));
        // // close the info window when esc is pressed
        // this.map.on("key-down", function (e) {
        //     if (e.keyCode === 27) {
        //         this.cleanUp().bind(this);
        //     }
        // });
    }
    //保存
    printAndSave() {
        if (this.domObj.find(".markname").val().length == 0) {
            this.domObj.find(".markname").attr("placeholder", "标识名称，不能为空！");
            this.toast.Show("标识名称，不能为空");
            return;
        }
        if (this.domObj.find(".markconten").val().length == 0) {
            this.domObj.find(".markconten").attr("placeholder", "标识内容，不能为空");
            this.toast.Show("标识内容，不能为空");
            return;
        }
        if (this.domObj.find(".markname").val().length > this.config.namelength) {
            this.toast.Show("名称超过" + this.config.namelength + "个字，请重新输入！");
            return;
        }

        if (this.domObj.find(".markconten").val().length > 200) {
            this.toast.Show("内容超过200个字，请重新输入！");
            return;
        }
        if (this.domObj.find(".saveQuestionMark").hasClass('disabled')) {
            return;
        }
        if (this.glayer.graphics.length > 0) {

            //清空文本
            if ($("#mainContainer .textlabel")) {
                for (var i = 0; i < $("#mainContainer .textlabel").length; i++) {
                    $($("#mainContainer .textlabel")[i]).remove();
                    i--;
                }
            }

            // 执行
            (<any>this.domObj.find(".saveQuestionMark")).button('analyze');
            this.domObj.find(".saveQuestionMark").addClass('disabled');
            this.printTaskSetup("MAP_ONLY", "png32");
        } else {
            this.toast.Show("请先注明疑问再保存！");
        }
    };

    printTaskSetup(layout, format) {
        var template = new PrintTemplate();
        template.format = format;
        template.layout = layout;
        template.layoutOptions = {
            "showAttribution": false
        };
        template.exportOptions = {
            width: this.map.width,
            height: this.map.height
        };
        template.preserveScale = true;
        var params = new PrintParameters();
        //去掉疑问标识图层
        if (this.clusterLayer) {
            this.map.removeLayer(this.clusterLayer);
        }
        //判断当前是否有grid,有去掉
        if (this.gridServicePath != "") {
            var gridlayer: any = this.findLayerInMap(this.gridServicePath);
            var visilble = false;
            if (gridlayer != null) {
                this.map.removeLayer(gridlayer)
            }
        }


        params.map = this.map;
        params.template = template;
        // var printTask = new PrintTask("http://192.168.1.101:6080/arcgis/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task");
        if (this.apiPrint == "") {
            this.toast.Show("栅格打印服务未配置到config！");
            return;
        }
        var printTask = new PrintTask(this.apiPrint);
        printTask.execute(params, this.printResult.bind(this), this.printError.bind(this));
    }
    printResult(result) {
        console.log(result.url);
        //保存疑问标识信息到数据库

        this.saveQuestionMark(result.url);
    }
    printError(error) {
        console.error(error);
        this.domObj.find(".saveQuestionMark").removeClass('disabled');
        (<any>this.domObj.find(".saveQuestionMark")).button('reset');
        this.toast.Show("截图失败，请重新保存！");
        //重新加上疑问标识图层
        this.map.addLayer(this.clusterLayer);
    }

    saveQuestionMark(url) {
        var centerx, centery;
        if (this.glayer.graphics[0].geometry.type == "point") {
            centerx = (<any>this.glayer.graphics[0].geometry).x;
            centery = (<any>this.glayer.graphics[0].geometry).y;

        } else {
            centerx = (<any>this.glayer.graphics[0].geometry).getExtent().getCenter().x;
            centery = (<any>this.glayer.graphics[0].geometry).getExtent().getCenter().y;
        }
        var option = {
            x: centerx,
            y: centery,
            caption: this.domObj.find(".markname").val(),
            fileurl: url,
            content: this.domObj.find(".markconten").val(),
            wkid: this.map.spatialReference.wkid,
            scale: this.map.getScale()
        };
        //清空文本和graphics
        this.glayer.clear();

        $.ajax({
            headers: {
                'Authorization-Token': AppX.appConfig.usertoken
            },
            data: option,
            url: AppX.appConfig.apiroot.replace(/\/+$/, "") + '/webapp/questionmarks/add',
            type: "post",
            dataType: "json",
            success: function (data) {
                if (data.code == 10000) {
                    //清除graphic,刷新列表
                    this.glayer.clear();
                    this.showQuestionMark(1, this.config.pagesize);
                    this.domObj.find(".saveQuestionMark").removeClass('disabled');
                    (<any>this.domObj.find(".saveQuestionMark")).button('reset');
                    this.toast.Show("保存成功！");
                    //清理历史输入
                    //this.domObj.find(".markname").val("");
                    // this.domObj.find(".markconten").val("");
                    //重新加上疑问标识图层
                    this.map.addLayer(this.clusterLayer);
                    // AppX.appConfig.loadOnStartWidgets = data.result.widgets.loadOnStartWidgets;
                    // AppX.appConfig.menuBarWidgets = data.result.widgets.menuBarWidgets;
                    // require(AppX.dojoConfig, ['core/LoadManager.class', 'dojo/domReady!'], function (LoadManager) {
                    //     (new LoadManager).load(AppX.appConfig.loadOnStartWidgets);
                    // });
                } else {
                    this.toast.Show("保存疑问标识失败！请检查");
                    console.log(data.error);
                    this.domObj.find(".saveQuestionMark").removeClass('disabled');
                    (<any>this.domObj.find(".saveQuestionMark")).button('reset');
                    //重新加上疑问标识图层
                    this.map.addLayer(this.clusterLayer);
                }
            }.bind(this)
        });
    }


    private findLayerInMap(url) {
        for (var i = 0; i < this.map.layerIds.length; i++) {
            var layer = this.map.getLayer(this.map.layerIds[i]);
            if (layer.url && layer.url == url)
                return layer;
        }
        return null;
    }


    destroy() {
        this.map.enablePan();
        // if(this.glayer.graphics.length>0){
        //    this.toast.Show("是否保存？");
        // }
        if ($("#mainContainer .textlabel")) {
            for (var i = 0; i < $("#mainContainer .textlabel").length; i++) {
                $($("#mainContainer .textlabel")[i]).remove();
                i--;
            }
        }
        this.glayer.clear();
        this.map.removeLayer(this.glayer);
        if (this.clusterLayer) {
            this.map.removeLayer(this.clusterLayer);
        }
        this.domObj.remove();
        this.afterDestroy();
    }
    // 定位到指定 Extent
    PointAtMap(point) {
        // 设置到指定缩放级别
        this.map.setScale(this.zoomscale);
        // 设置到指定的显示范围
        this.map.centerAt(point);
    }
}