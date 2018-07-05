import BaseWidget = require('core/BaseWidget.class');


import Map = require("esri/map");
import SimpleMarkerSymbol = require("esri/symbols/SimpleMarkerSymbol");
import SimpleLineSymbol = require("esri/symbols/SimpleLineSymbol");
import SimpleFillSymbol = require("esri/symbols/SimpleFillSymbol");
import Color = require("esri/Color");
import ScreenPoint = require('esri/geometry/ScreenPoint');
import GraphicsLayer = require("esri/layers/GraphicsLayer");
import Graphic = require("esri/graphic");
import GeometryEngine = require("esri/geometry/geometryEngine");
import Point = require("esri/geometry/Point");
import SpatialReference = require("esri/SpatialReference");
import Polyline = require("esri/geometry/Polyline");
import QueryTask = require("esri/tasks/QueryTask");
import Query = require("esri/tasks/query");
import Draw = require('esri/toolbars/draw');
import IdentifyParameters = require("esri/tasks/IdentifyParameters");
import IdentifyTask = require("esri/tasks/IdentifyTask");
import Polygon = require("esri/geometry/Polygon");
import GeometryService = require("esri/tasks/GeometryService");
import BufferParameters = require("esri/tasks/BufferParameters");

export = BufferAnalysis;

interface IndentifyResult {
    url: string,
    layerId: string,
    layerName: string,
    objectids: Array<number>,
    outFileds: Array<string>,
    alias: Array<string>,
    objecjtVsible: boolean,
}

class BufferAnalysis extends BaseWidget {
    baseClass = "BufferAnalysis";
    //提示信息框
    Toast: any;
    //地图的mapView
    map: Map;
    //
    $mainContainer;
    $radioBufferType;
    $bufferAnalysisBtn;
    //
    bufferLayer: GraphicsLayer;
    //
    moveLayer: GraphicsLayer;
    //点线面的样式
    symbol;
    //判断是对什么 做缓冲区分析 
    bufferWhat: string = "point";
    //缓冲图形
    bufferGeometry;
    //缓冲距离
    bufferDistance: string;
    //
    mapViewClick;
    mapViewDoubleClick;
    //
    bufferGraphic: Graphic;
    //
    pointDraw = [];
    moveLineGraphic: Graphic;
    movePolygonGraphic: Graphic;
    doubleClick: Boolean = false;
    //缓冲获得的图形
    bufferGetGeometry
    resultTabs = [];
    drawType: any = Draw.POINT;//默认绘图方式为点
    drawTool: Draw = null;

    btnStartAnalyse: any = null;

    startup() {
        this.setHtml(_.template(this.template)({
            hello: this.config.hello + (/\/([a-zA-Z]+)$/g.exec(this.widgetPath)[1])
        }));
        this.initElement();
        this.bufferAnalysisInit();
    }

    initElement() {
        this.btnStartAnalyse = this.domObj.find('.BufferAnalysis-bufferBtn');
    }

    destroy() {
        this.domObj.remove();
        this.afterDestroy();
        this.drawTool.deactivate();
        //移除相关事件
        if (this.mapViewClick) {
            this.mapViewClick.remove();
        }
        this.$mainContainer.off("mousemove");
        this.$mainContainer.off("dblclick");
        this.bufferLayer.clear();
        //恢复双击放大
        this.map.enableDoubleClickZoom();
        //移除缓冲区绘制图层
        this.map.removeLayer(this.bufferLayer);
        this.map.removeLayer(this.moveLayer);
        this.moveLayer.clear();
        if (this.AppX.runtimeConfig.dataPanel != null) {
            this.AppX.runtimeConfig.dataPanel.close();
        }
    }

    bufferAnalysisInit() {
        ///判断所需的服务是否存在
        if (this.AppX.appConfig.gisResource.geometry.config.length == 0) {
            this.AppX.runtimeConfig.toast.Show('获取几何分析服务出错！');
        } else {
            //获取相关元素
            this.map = this.AppX.runtimeConfig.map;
            //设置绘图双击不放大
            this.map.disableDoubleClickZoom();
            this.$mainContainer = $(this.AppX.appConfig.mainContainer);
            this.$radioBufferType = $(".BufferAnalysisTypeRadio");
            this.$bufferAnalysisBtn = $(".BufferAnalysis-bufferBtn");

            //初始化画点画线画面的样式
            this.symbol = this.setSymbol();

            //绑定radio的change事件
            this.$radioBufferType.on("change", this.radioSelectedCallBack.bind(this));

            this.$bufferAnalysisBtn.on("click", this.bufferAnalysisBtnClickCallBack.bind(this));
            $('.BufferAnalysis-distance').val(0);
            this.addLayer();
            this.drawTool = new Draw(this.map);
            this.drawTool.on("draw-end", function (evt) {
                var symbol = null;
                switch (evt.geometry.type) {
                    case "point":
                        symbol = this.symbol.SimpleMarkerSymbol;
                        break;
                    case "polyline":
                        symbol = this.symbol.SimpleLineSymbol;
                        break;
                    case "polygon":
                        symbol = this.symbol.SimpleFillSymbol;
                        break;
                }
                var graphic = new Graphic(evt.geometry, symbol);
                this.bufferGeometry = evt.geometry;
                this.bufferLayer.clear();
                this.bufferLayer.add(graphic);
                // this.drawTool.deactivate();
            }.bind(this));
            this.drawTool.activate(this.drawType);
        }
    }
    addLayer() {
        var bufferLayer = new GraphicsLayer();
        this.bufferLayer = bufferLayer;
        bufferLayer.id = "buffer";
        this.map.addLayer(bufferLayer);
        var moveLayer = new GraphicsLayer();
        moveLayer.id = "move";
        this.moveLayer = moveLayer;
        this.map.addLayer(moveLayer);

        // this.map.on("mouse-down", this.onGLayerMouseDown.bind(this));
    }
    setSymbol() {

        var symbol = {
            "SimpleMarkerSymbol": null,
            "SimpleLineSymbol": null,
            "SimpleFillSymbol": null,
            "SimpleLineSymbolOfArea": null,
            "SimpleMarkerSymbolOfAngle": null,
            "SimpleFillSymbolOftest": null,
            "SimpleFillSymbolOfBuffer": null,

        };
        symbol.SimpleMarkerSymbol = new SimpleMarkerSymbol(
            {
                color: new Color("#FFFFFF"),
                size: 7,
                style: "circle",       //点样式cross|square|diamond|circle|x
                outline: {
                    color: new Color("#0000FF"),
                    width: 5
                }
            }

        );
        symbol.SimpleMarkerSymbolOfAngle = new SimpleMarkerSymbol(
            {
                color: new Color("#FFFFFF"),
                style: "circle",  //点样式
                size: 2,         //默认为12px  
                outline: {
                    color: new Color("#FF0000"),
                    width: 1
                }
            }

        );
        // symbol.SimpleMarkerSymbol.size = 10;
        symbol.SimpleLineSymbol = new SimpleLineSymbol({
            color: new Color("#FF0000"),
            style: "solid",   //线的样式 dash|dash-dot|solid等	
            width: 1
        });
        //绘制多边形移动的线样式
        symbol.SimpleLineSymbolOfArea = new SimpleLineSymbol({
            color: new Color("#FF0000"),
            style: "solid",   //线的样式 dash|dash-dot|solid等	
            width: 1
        });

        symbol.SimpleFillSymbol = new SimpleFillSymbol({
            color: new Color([0, 0, 0, 0.1]),
            // style: "backward-diagonal",//cross|diagonal-cross|forward-diagona|horizontal	|solid|vertical|none
            outline: {
                color: new Color("#FF0000"),
                width: 1

            }
        });
        symbol.SimpleFillSymbol.style = SimpleFillSymbol.STYLE_SOLID;
        // symbol.SimpleFillSymbol.style = SimpleFillSymbol.STYLE_BACKWARD_DIAGONAL;

        symbol.SimpleFillSymbolOfBuffer = new SimpleFillSymbol({
            color: new Color([0, 0, 0, 0.1]),
            //cross|diagonal-cross|forward-diagona|horizontal	|solid|vertical|none
            outline: {
                color: new Color("#FF0000"),
                width: 1

            }
        });

        symbol.SimpleFillSymbolOfBuffer.style = SimpleFillSymbol.STYLE_SOLID;


        symbol.SimpleFillSymbolOftest = new SimpleFillSymbol({
            color: new Color([0, 0, 0, 0.1]),
            // style: "solid",
            outline: {
                color: new Color("#0000FF"),
                width: 1

            }
        });
        symbol.SimpleFillSymbolOftest.style = SimpleFillSymbol.STYLE_SOLID;
        return symbol;
    }

    //radio的change事件的回调函数（表明是对什么类型的图形进行缓冲分析）
    radioSelectedCallBack(event) {
        //关闭之前分析显示的面板
        if (this.AppX.runtimeConfig.dataPanel != null) {
            this.AppX.runtimeConfig.dataPanel.close();
        }
        //初始化对谁做缓冲
        this.bufferWhat = $(".BufferAnalysisTypeRadio:checked").val();
        switch (this.bufferWhat) {
            case 'point':
                this.drawType = Draw.POINT;
                break;
            case 'line':
                this.drawType = Draw.POLYLINE;
                break;
            case 'polygon':
                this.drawType = Draw.POLYGON;
                break;
        }
        this.drawTool.activate(this.drawType);
        //清除绘制图形
        this.bufferLayer.clear();
        this.moveLayer.clear();
        this.bufferGeometry = null;
        //绘制点保存的数组滞空
        this.pointDraw = [];
        //避免无法触发鼠标的移动事件
        this.doubleClick = false;
        $(".BufferAnalysis-distance").removeAttr("placeholder");
    }
    //缓冲区分析的按钮点击事件回调函数
    bufferAnalysisBtnClickCallBack(event) {
        if (this.domObj.find(".BufferAnalysis-bufferBtn").hasClass('disabled'))
            return;
        if (this.bufferGeometry == undefined) {
            this.AppX.runtimeConfig.toast.Show("请先绘制图形。");
            return;
        }
        //关闭之前分析显示的面板
        if (this.AppX.runtimeConfig.dataPanel != null) {
            this.AppX.runtimeConfig.dataPanel.close();
        }
        //获取缓冲的距离
        this.bufferDistance = $('.BufferAnalysis-distance').val().trim();
        //清除之前绘制的缓冲图形
        if (this.bufferGraphic) {
            this.bufferLayer.remove(this.bufferGraphic);
        }
        //缓冲距离不能为空
        if (this.bufferDistance == "") {
            $('.BufferAnalysis-distance').attr("placeholder", "请输入缓冲半径！");
            //无效输入将不进行查询操作
            return;
        } else if (this.bufferDistance == '0') {
            //省略buffer过程，直接使用空间查询
            this.bufferGetGeometry = this.bufferGeometry;
            this.btnStartAnalyse.button('analyze');
            this.btnStartAnalyse.addClass('disabled');
            this.AppX.runtimeConfig.loadMask.Show();
            this.startdoQueryTask();
        }
        else if (/^\d+.{0,1}\d?$/.test(this.bufferDistance)) {
            this.btnStartAnalyse.button('analyze');
            this.btnStartAnalyse.addClass('disabled');
            this.AppX.runtimeConfig.loadMask.Show();
            this.doBuffer(parseFloat(this.bufferDistance));
        }
        else {
            $('.BufferAnalysis-distance').val("");
            $('.BufferAnalysis-distance').attr("placeholder", "请输入数字");
            //无效输入将不进行查询操作
            return;
        }

        // this.doQueryTask();

    }

    //缓冲区操作
    doBuffer(distance: number) {
        //判断是否绘制图形
        if (this.bufferGeometry == null) {
            this.AppX.runtimeConfig.toast.Show("请先绘制图形。");
            this.btnStartAnalyse.button('reset');
            this.btnStartAnalyse.removeClass('disabled');
            this.AppX.runtimeConfig.loadMask.Hide();
            return;
        }
        if (this.AppX.appConfig.gisResource.geometry.config.length > 0) {
            var geometryService = new GeometryService(this.AppX.appConfig.gisResource.geometry.config[0].url);
            var bufferParameters = new BufferParameters();
            bufferParameters.bufferSpatialReference = this.map.spatialReference;
            bufferParameters.distances = [distance];
            bufferParameters.geometries = [this.bufferGeometry];
            bufferParameters.outSpatialReference = this.map.spatialReference;
            bufferParameters.geodesic = true;
            bufferParameters.unit = 9001;
            geometryService.buffer(bufferParameters, function (result) {
                this.bufferGetGeometry = result[0];
                var bufferGraphic = new Graphic(result[0], this.symbol.SimpleFillSymbolOfBuffer);
                this.bufferGraphic = bufferGraphic;
                this.bufferLayer.add(bufferGraphic);
                //this.startdoQueryTask();
                var url = this.AppX.appConfig.gisResource.pipedata.config[0].url;
                var managerDepartment = Cookies.get('range');
                var ranges: Array<any> = managerDepartment.split(';');
                var filter = null;
                if (ranges.length > 0) {
                    filter = ranges.map(function (range) {
                        return "'" + range + "'";
                    }).join(",");
                    filter = 'MANAGEDEPT_CODE in (' + filter + ')';
                }
                this.queryOnPipedataServer(url, result[0], filter);
            }.bind(this))
        } else {
            this.AppX.runtimeConfig.toast.Show("获取缓冲区服务出错！");
            this.btnStartAnalyse.button('reset');
            this.btnStartAnalyse.removeClass('disabled');
            this.AppX.runtimeConfig.loadMask.Hide();
        }

    }


    // //查询操作
    // doQueryTask() {
    //     var identifyTask = new IdentifyTask(this.AppX.appConfig.gisResource.pipe.config[0].url);
    //     var identifyParameters = new IdentifyParameters();
    //     identifyParameters.geometry = this.bufferGetGeometry;
    //     identifyParameters.tolerance = 0;
    //     identifyParameters.mapExtent = this.AppX.runtimeConfig.map.extent;

    //     //定义查询的图层（最上面、可见、所有）
    //     identifyParameters.layerOption = IdentifyParameters.LAYER_OPTION_ALL;//LAYER_OPTION_TOP|LAYER_OPTION_ALL|LAYER_OPTION_VISIBLE
    //     identifyTask.execute(identifyParameters).then(
    //         this.identifyTaskCallBack.bind(this),
    //         function (error) {
    //             console.error(error)
    //         });

    // }
    /**
    * (方法说明)汇总查询结果到数据面板
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    wrapData2TataTable(urlindex, result) {
        var features = [];
        var layerName = [];
        var table = [];
        var tabs = [];
        //获取相应图层的id
        var layerId = [];
        for (var i = 0; i < result.length; i++) {
            //获取图层名的唯一 值
            if (layerName.every(function (x) { return x != result[i].layerName })) {
                layerName.push(result[i].layerName);
            }
        }
        for (var i = 0; i < layerName.length; i++) {
            for (var j = 0; j < result.length; j++) {
                if (result[j].layerName == layerName[i]) {
                    layerId.push(result[j].layerId);
                    j = result.length;
                }
            }
        }
        for (var i = 0; i < layerName.length; i++) {
            table = [];
            table.push(layerName[i]);
            for (var j = 0; j < result.length; j++) {
                if (result[j].layerName == layerName[i]) {
                    table.push(result[j].feature);
                }
            }
            tabs.push(table);
        }
        var datas = [];
        for (var i = 0; i < tabs.length; i++) {
            var feature = [];
            for (var j = 1; j < tabs[i].length; j++) {
                feature.push(tabs[i][j])
            }
            var data = {
                title: tabs[i][0],
                id: urlindex + "buffer" + i,
                features: feature,
                urlindex: urlindex,
                layerId: layerId[i]
            }
            this.resultTabs.push(data);
        }
        if (this.indexLock >= this.AppX.appConfig.gisResource.pipe.config.length) {
            this.AppX.runtimeConfig.loadMask.Hide();
            this.indexLock = 0;
            var tables = {
                tabs: this.resultTabs
            };
            if (tables.tabs.length > 0)
                this.AppX.runtimeConfig.dataPanel.show(tables);
            else this.AppX.runtimeConfig.toast.Show("未查询到管网设备!");
        }
    }
    /**
    * (方法说明)汇总查询结果到数据面板,考虑字段配置
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    wrapData2TataTableOnFieldConfig(urlindex, result) {
        var resultIndentify: Array<IndentifyResult> = [];
        for (var i = 0; i < result.length; i++) {
            var layerName = result[i].layerName;
            var layerData = _.find<IndentifyResult>(resultIndentify, function (o: any) { return o.layerName == layerName });
            if (layerData == null) {
                var layerfields = this.AppX.runtimeConfig.fieldConfig.GetLayerFields(layerName);
                var outfields, alias, objectidVisible = true;
                if (layerfields != null) {
                    outfields = layerfields.fields.map(item => { return item.name });
                    alias = layerfields.fields.map(item => { return item.alias });
                    objectidVisible = layerfields.objectid;
                }
                layerData = {
                    url: this.AppX.appConfig.gisResource.pipedata.config[0].url,
                    layerId: result[i].layerId,
                    layerName: layerName,
                    objectids: [],
                    outFileds: outfields,
                    alias: alias,
                    objecjtVsible: layerfields.objectid
                }
                layerData.objectids.push(result[i].feature.attributes["OBJECTID"]);
                resultIndentify.push(layerData);
            }
            else
                layerData.objectids.push(result[i].feature.attributes["OBJECTID"]);
        }
        this.resultTabs = []
        resultIndentify.forEach((layerData, index) => {
            var tab = {
                title: layerData.layerName,
                id: urlindex * 100 + layerData.layerId,//datapanel中tab的唯一性标识,不能有特殊字符
                canLocate: true,
                objectIDIndex: 0,
                layerId: layerData.layerId,
                url: layerData.url,
                objectids: layerData.objectids,
                objectidVisible: layerData.objecjtVsible,
                order: "OBJECTID asc",
                table: null,
                outFields: layerData.outFileds,
            }
            if (!layerData.objecjtVsible && layerData.outFileds.length > 0)
                tab.order = layerData.outFileds[0] + " asc";
            var theadData = [];
            var tbodyData = [];
            tab.table = {
                thead: layerData.alias,
                tbody: tbodyData
            }
            this.resultTabs.push(tab);
        })

        if (this.indexLock >= this.AppX.appConfig.gisResource.pipe.config.length) {
            this.AppX.runtimeConfig.loadMask.Hide();
            this.indexLock = 0;
            var tables = {
                tabs: this.resultTabs
            };
            if (tables.tabs.length > 0)
                this.AppX.runtimeConfig.dataPanel.showPage(tables);
            else this.AppX.runtimeConfig.toast.Show("未查询到管网设备!");
        }
    }


    identifyTaskCallBack(urlindex, result) {
        this.wrapData2TataTableOnFieldConfig(urlindex, result);
    }

    startdoQueryTask() {
        var url = this.AppX.appConfig.gisResource.pipedata.config[0].url;
        var managerDepartment = Cookies.get('range');
        var ranges: Array<any> = managerDepartment.split(';');
        var filter = null;
        if (ranges.length > 0) {
            filter = ranges.map(function (range) {
                return "'" + range + "'";
            }).join(",");
            filter = 'MANAGEDEPT_CODE in (' + filter + ')';
        }
        this.queryOnPipedataServer(url, this.bufferGetGeometry, filter);
    }
    indexLock = 0;
    /**
    * (方法说明)对指定地图服务进行查询 
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    identifyOnMapserver(urlindex) {
        var url = this.AppX.appConfig.gisResource.pipe.config[urlindex].url;
        var identifyTask = new IdentifyTask(url);
        var identifyParameters = new IdentifyParameters();
        identifyParameters.geometry = this.bufferGetGeometry;
        identifyParameters.tolerance = 0;
        identifyParameters.mapExtent = this.AppX.runtimeConfig.map.extent;

        //定义查询的图层（最上面、可见、所有）
        identifyParameters.layerOption = IdentifyParameters.LAYER_OPTION_ALL;//LAYER_OPTION_TOP|LAYER_OPTION_ALL|LAYER_OPTION_VISIBLE
        identifyTask.execute(identifyParameters).then(
            function (results) {
                this.indexLock += 1;
                this.identifyTaskCallBack(urlindex, results);
            }.bind(this),
            function (error) {
                this.indexLock += 1;
                if (this.indexLock >= this.AppX.appConfig.gisResource.pipe.config.length) {
                    this.indexLock = 0;
                    this.AppX.runtimeConfig.loadMask.Hide();
                    this.AppX.runtimeConfig.toast.Show("查询失败!");
                }
                console.error(error)
            });
    }
    /**
    * (方法说明)对业务图层的各个图层进行空间查询
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private queryOnPipedataServer(url, geometry, where) {
        //获取图层序号集合
        //循环各图层查询
        $.ajax(
            {
                type: "get",
                traditional: true,
                url: url,
                data: { f: "json" },
                async: true,
                dataType: "json",
                success: function (data) {
                    //记录非图层组图层集合
                    var layers = data.layers.filter((item) => { return item.subLayerIds == undefined });
                    this.countLock = 0;
                    this.tabs = [];
                    layers.forEach(function (item, index) {
                        this.queryOnPipedataLayer(url, item.id, item.name, geometry, where, layers.length);
                    }.bind(this))
                }.bind(this),
                error: function (data) {
                    this.AppX.runtimeConfig.toast.Show("查询详情失败，请联系管理员");
                    this.btnStartAnalyse.button('reset');
                    this.btnStartAnalyse.removeClass('disabled');
                    this.AppX.runtimeConfig.loadMask.Hide();
                    console.error(data);
                }.bind(this)
            }
        );
    }
    private countLock = 0;
    private tabs = [];
    private queryOnPipedataLayer(url, layerid, layername, geometry, where, sum) {
        var layerfields = this.AppX.runtimeConfig.fieldConfig.GetLayerFields(layername);
        var outfields, alias, objectidVisible = true;
        if (layerfields == null) {
            this.countLock++;
            console.error("未找到图层" + layername + "的字段配置信息！");
            if (this.countLock >= sum) {
                this.AppX.runtimeConfig.dataPanel.showPage({ tabs: this.tabs });
                this.btnStartAnalyse.button('reset');
                this.btnStartAnalyse.removeClass('disabled');
                this.AppX.runtimeConfig.loadMask.Hide();
            }
        }
        else {
            outfields = layerfields.fields.map(item => { return item.name });
            alias = layerfields.fields.map(item => { return item.alias });
            objectidVisible = layerfields.objectid;
        }
        var queryTask = new QueryTask(url + "/" + layerid);
        var query = new Query();
        if (where != null)
            query.where = where;
        query.geometry = geometry;
        query.returnGeometry = false;
        if (objectidVisible)
            query.orderByFields = ["OBJECTID asc"];//默认排序
        else if (outfields != null && outfields.length > 0)
            query.orderByFields = [outfields[0] + " asc"];//默认排序
        queryTask.executeForIds(query, function (results) {
            if (results != null && results.length > 0) {
                var dataQuery = {where:where,geometry:geometry};
                var tab = this.dataPanelWrap(url, results, layername, layerid, query.orderByFields[0], outfields, objectidVisible, alias,dataQuery);
                this.tabs.push(tab);
            }
            this.countLock++;
            if (this.countLock >= sum) {
                this.AppX.runtimeConfig.dataPanel.showPage({ tabs: this.tabs });
                this.btnStartAnalyse.button('reset');
                this.btnStartAnalyse.removeClass('disabled');
                this.AppX.runtimeConfig.loadMask.Hide();
            }
        }.bind(this), function (error) {
            this.countLock++;
            if (this.countLock >= sum) {
                this.AppX.runtimeConfig.dataPanel.showPage({ tabs: this.tabs });
                this.btnStartAnalyse.button('reset');
                this.btnStartAnalyse.removeClass('disabled');
                this.AppX.runtimeConfig.loadMask.Hide();
            }
        }.bind(this));
    }

    /* (方法说明)数据面板格式转换
* @method (方法名)
* @for (所属类名)
* @param {(参数类型)} (参数名) (参数说明)
* @return {(返回值类型)} (返回值说明)
*/
    private dataPanelWrap(url, objectids, layername, layerid, order, outfields, objectidVisible, alias,dataQuery) {
        var result = {
            title: layername,
            id: layerid,//datapanel中tab的唯一性标识,不能有特殊字符
            canLocate: true,
            objectIDIndex: 0,
            layerId: layerid,
            url: url,
            objectids: objectids,
            objectidVisible: objectidVisible,
            query:dataQuery,
            order: order,
            table: null,
            outFields: outfields,
        }
        var theadData = [];
        var tbodyData = [];
        result.table = {
            thead: alias,
            tbody: tbodyData
        }
        return result;
    }
}