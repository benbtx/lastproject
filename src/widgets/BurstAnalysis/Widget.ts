import BaseWidget = require('core/BaseWidget.class');
/*** Local ***/

/*** Esri ***/
import Map = require('esri/map');
import IdentifyTask = require('esri/tasks/IdentifyTask');
import IdentifyParameters = require('esri/tasks/IdentifyParameters');
import GraphicsLayer = require('esri/layers/GraphicsLayer');
import SimpleMarkerSymbol = require('esri/symbols/SimpleMarkerSymbol');
import SimpleLineSymbol = require('esri/symbols/SimpleLineSymbol');
import Color = require("esri/Color");
import Graphic = require('esri/graphic');
import Symbol = require('esri/symbols/Symbol');
import Geoprocessor = require("esri/tasks/Geoprocessor");
import ArcGISDynamicMapServiceLayer = require("esri/layers/ArcGISDynamicMapServiceLayer");
import GeometryEngine = require("esri/geometry/geometryEngine");
import Extent = require("esri/geometry/Extent");
import FindTask = require("esri/tasks/FindTask");
import FindParameters = require("esri/tasks/FindParameters");
import QueryTask = require("esri/tasks/QueryTask");
import Query = require("esri/tasks/query");
import Point = require("esri/geometry/Point");
import PictureMarkerSymbol = require("esri/symbols/PictureMarkerSymbol");


export = BurstAnalysis;

class BurstAnalysis extends BaseWidget {
    baseClass = "widget-burst-analysis";
    debug = false;
    mapClickEventHandle: any;
    toast: any;
    identifyTask: IdentifyTask;
    identifyParameters: IdentifyParameters;
    /*** Esri 相关变量 ***/
    identifyResult: any = null;
    analysisResult: Object;
    graphicsLayer: GraphicsLayer;
    simpleMarkerSymbol: SimpleMarkerSymbol;
    simpleLineSymbol: SimpleLineSymbol;
    map: Map;
    gp: Geoprocessor;
    analyzeUrl: string;
    layerInforUrl: string;
    resultLayer: ArcGISDynamicMapServiceLayer;
    resultSummary: any = null;
    summaryTemplate = "<tr><td class=\"analyse-info-pipe\"><%=layername%></td><td class=\"analyse-info-fitting\"><%=summaryvalue%></td></tr>";
    jobid: any = null;
    detailFeild = "detail";


    /*** 状态属性 ***/
    isIdentifing: boolean = false;
    hasFinishedQuering: boolean = false;
    /*** Dom元素 ***/
    btnPickPipe: JQuery;
    labelPickPipeTips: JQuery;
    tablePickPipeTbody: JQuery;
    btnStartAnalyse: any;
    tableAnalyseInfoTbody: JQuery;
    btnViewDetails: JQuery;
    btnCleanAll: JQuery;
    baseMapContainer: JQuery;
    btnViewMap: JQuery;

    startup() {
        this.setHtml(_.template(this.template)({
            pickPipeTips: this.config.pickPipeTips
        }));

        this.shortStack();
        this.initSymble();
        this.bindElement();
        this.initEvents();
    }

    /**
    * 缩短调用栈
    * @method (方法名)
    * @for BurstAnalysis
    * @param null
    * @return null
    */
    shortStack() {
        this.toast = this.AppX.runtimeConfig.toast;
        this.map = this.AppX.runtimeConfig.map;
        ///判断所需的服务是否存在
        if (this.AppX.appConfig.gisResource.apiburstpipe.config.length > 0) {
            this.analyzeUrl = this.AppX.appConfig.gisResource.apiburstpipe.config[0].url;
        } else {
            this.AppX.runtimeConfig.toast.Show('获取爆管分析出错！');
        }
        if (this.AppX.appConfig.gisResource.pipe.config.length == 0) {
            this.AppX.runtimeConfig.toast.Show('获取分析服务出错！');
        } else {
            this.layerInforUrl = this.AppX.appConfig.gisResource.pipe.config[0].url + "/exts/TFExtentionSOE/getLayerInfor";
        }

    }

    /**
    * 初始化Symble
    * @method initSymble
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */

    initSymble() {
        // this.simpleMarkerSymbol = new SimpleMarkerSymbol({
        //     color: new Color(this.config.simpleMarkerSymbol.color || "#FF00FF"),
        //     size: this.config.simpleMarkerSymbol.size || 10,
        //     style: SimpleMarkerSymbol.STYLE_CROSS,
        //     outline: {
        //         color: new Color(this.config.simpleMarkerSymbol.outline.color || "#00ff00"),
        //         width: this.config.simpleMarkerSymbol.outline.width || 1,
        //     }
        // });

        // this.log('this.simpleMarkerSymbol:', this.simpleMarkerSymbol);

        this.simpleLineSymbol = new SimpleLineSymbol({
            color: new Color(this.config.simpleLineSymbol.color || "#FF00FF"),
            width: this.config.simpleLineSymbol.width || 3,
            style: SimpleLineSymbol.STYLE_SOLID
        });

        this.log('this.simpleLineSymbol:', this.simpleLineSymbol);
    }

    /**
    * 绑定页面元素
    * @method bindElement
    * @for BurstAnalysis
    * @param null
    * @return null
    */
    bindElement() {

        this.btnPickPipe = this.domObj.find('.pick-pipe');
        this.tablePickPipeTbody = this.domObj.find('.pick-pipe-tbody');
        this.tableAnalyseInfoTbody = this.domObj.find('.analyse-info-tbody');
        this.btnStartAnalyse = this.domObj.find('.start-analyse');
        this.btnViewDetails = this.domObj.find('.view-details');
        this.btnCleanAll = this.domObj.find('.clean-all');
        this.baseMapContainer = $('.' + this.config.baseMapContainerClass);
        this.btnViewMap = this.domObj.find('.view-map');
    }

    /**
    * 初始化事件帮定
    * @method initEvents
    * @for BurstAnalysis
    * @param null
    * @return null 
    */
    initEvents() {
        this.domObj
            .on('click', '.pick-pipe', this.pickPipe.bind(this))
            .on('click', '.start-analyse', this.startAnalyse.bind(this))
            .on('click', '.view-details', this.viewDetails.bind(this))
            .on('click', '.clean-all', this.cleanAll.bind(this))
            .on('click', '.view-map', this.viewOnMap.bind(this));
    }

    /**
    * 点击管线事件回调函数
    * @method pickPipe
    * @for BurstAnalysis
    * @param null
    * @return null
    */
    pickPipe() {
        if (this.resultLayer != null) {
            this.tableAnalyseInfoTbody.empty();
            this.map.removeLayer(this.resultLayer);
            this.resultLayer = null
        }

        this.btnViewMap
            .removeClass('glyphicon-check')
            .addClass('glyphicon-unchecked');

        if (this.AppX.runtimeConfig.map) {
            if (this.mapClickEventHandle) {
                this.toast.Show("请在地图上选取要分析的管线。");
                return;
            }

            this.btnPickPipe.addClass('disabled');
            this.map.setMapCursor('crosshair');

            this.btnStartAnalyse.addClass('disabled');
            this.tableAnalyseInfoTbody.hide(120);
            this.tableAnalyseInfoTbody.empty();

            this.mapClickEventHandle = this.AppX.runtimeConfig.map.on('click', function (event) {
                this.log('pickPipeEvent: ', event);

                this.isIdentifing = true;
                // 管线识别
                this.doIdentify(event);

                this.map.setMapCursor('default');
                this.btnPickPipe.removeClass('disabled');
                this.mapClickEventHandle.remove();
                this.mapClickEventHandle = null;
            }.bind(this))
        } else {
            this.toast.Show("地图未定义，模块初始化失败，请关闭并重试。");
        }
    }
    /**
    * 管线识别
    * @method doIdentify
    * @for BurstAnalysis
    * @param {__esri.Event} event
    * @return null
    */
    doIdentify(event) {
        this.startPickPipe(event.mapPoint);
    }

    /**
    * 可根据传入的参数进行绘图
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    darwGraphic(feature?: Graphic, symble?: Symbol, clearLayer?: boolean) {
        // 通过传入的 Geometry 绘制图形，如果参数为空，则清空图层并释放资源
        if (!feature) {
            if (this.graphicsLayer) {
                this.graphicsLayer.clear();
                this.map.removeLayer(this.graphicsLayer);
                this.graphicsLayer = null;
            }
            return;
        }

        if (!this.graphicsLayer) {
            this.graphicsLayer = new GraphicsLayer();
            this.map.addLayer(this.graphicsLayer);
        }

        if (clearLayer === undefined || clearLayer === true) {
            this.graphicsLayer.clear();
        }

        if (symble !== undefined) {
            feature.symbol = symble;
        }

        this.graphicsLayer.add(feature);

    }

    /**
    * 分析按钮回调函数
    * @method (方法名)
    * @for BurstAnalysis
    * @param null
    * @return null
    */
    startAnalyse() {
        if (this.btnStartAnalyse.hasClass('disabled')) {
            // this.toast.Show('分析中！');
            return;
        }
        if (this.identifyResult === null) {
            this.btnStartAnalyse.addClass('disabled');
            this.toast.Show('请先选择管线！');
        } else {
            this.btnStartAnalyse.button('analyze');
            this.btnStartAnalyse.addClass('disabled')
            this.tableAnalyseInfoTbody.empty();
            this.AppX.runtimeConfig.loadMask.Show();
            if (this.resultLayer != null)
                this.map.removeLayer(this.resultLayer);
            this.queryLayerClassName(this.identifyResult.layerId);
            this.btnViewDetails.removeClass('disabled');
        }

    }
    /**
    * (方法说明)提交爆管分析任务
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private submitAnalyzeTask(layerdbname, oid) {
        if (this.gp == null)
            this.gp = new Geoprocessor(this.analyzeUrl);
        var options = {
            pipefeatureclassname: layerdbname,
            pipeobjectid: oid,
            bysource: true,
            usertoken: this.AppX.appConfig.usertoken
        };
        var delayResult = this.gp.submitJob(
            options,
            this.onAnalyzeComplete.bind(this),
            this.onAnalyzeStatus.bind(this),
            this.onAnalyzeFail.bind(this)
        );
    }
    /**
    * (方法说明)分析完处理函数
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private onAnalyzeComplete(jobinfo) {
        this.btnStartAnalyse.button('reset');
        this.btnStartAnalyse.removeClass('disabled');
        if (jobinfo.jobStatus == "esriJobSucceeded") {
            this.jobid = jobinfo.jobId;
            var gpBaseUrl = this.parseUrl2Mapserver(this.analyzeUrl);
            var resultMaptUrl = gpBaseUrl + jobinfo.jobId;
            this.resultLayer = new ArcGISDynamicMapServiceLayer(resultMaptUrl);
            var pipeMapIndex = this.getPipeMapLayerIndex();
            this.map.addLayer(this.resultLayer, pipeMapIndex);
            this.btnViewMap
                .removeClass('glyphicon-unchecked')
                .addClass('glyphicon-check');
            //获取汇总信息
            var summaryUrl = jobinfo.results.summary.paramUrl;
            this.getAnalyzsSummary(this.analyzeUrl + "/jobs/" + jobinfo.jobId + "/" + summaryUrl);
        } else {
            this.AppX.runtimeConfig.loadMask.Hide();
            this.AppX.runtimeConfig.toast.Show("分析失败，请联系管理员");
        }
    }
    private parseUrl2Mapserver(url: string) {
        var reg = new RegExp("GPServer.+");
        return url.replace(reg, "MapServer/jobs/");
    }
    /**
    * (方法说明)分析状态处理函数
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private onAnalyzeStatus(jobinfo) {
    }
    /**
    * (方法说明)查询爆管分析汇总信息
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private getAnalyzsSummary(url) {
        if ($.ajax) {
            $.ajax(
                {
                    type: "get",
                    traditional: true,
                    url: url,
                    data: { f: "json" },
                    async: true,
                    dataType: "json",
                    success: function (data) {
                        if (data.value.code != 10000) {
                            // this.AppX.runtimeConfig.loadMask.Show(data.value.error);
                            this.toast.Show(data.value.error, 3600000);//添加消息显示时间，需手动关闭
                        }
                        else {
                            //显示汇总信息
                            this.resultSummary = data.value.result.summary;
                            this.showSummary(this.resultSummary);
                        }
                        this.btnStartAnalyse.removeClass('disabled');
                        this.AppX.runtimeConfig.loadMask.Hide();
                    }.bind(this),
                    error: function (data) {
                        this.AppX.runtimeConfig.loadMask.Hide();
                        this.AppX.runtimeConfig.toast.Show("分析失败，请联系管理员");
                        console.error(data);
                    }.bind(this)
                }
            );
        }
    }

    /**
    * (方法说明)显示爆管分析汇总信息到界面上
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private showSummary(summary) {

        if (summary.layersummary.length > 0) {
            summary.layersummary.forEach(
                function (value, index) {
                    var data;
                    if (value.geometrytype == "esriGeometryPoint")
                        data = { layername: value.layername, summaryvalue: value.count + "个" };
                    else data = { layername: value.layername, summaryvalue: value.length.toFixed(2) + "米" };
                    var mixedTemplate = _.template(this.summaryTemplate)(data);
                    var currentDom: JQuery = this.domObj;
                    this.tableAnalyseInfoTbody.append(mixedTemplate);
                    this.tableAnalyseInfoTbody.show();
                }.bind(this)
            );
        }
        var xmin: number = summary.xmin || this.map.extent.xmin;
        var xmax: number = summary.xmax || this.map.extent.xmax;
        var ymin: number = summary.ymin || this.map.extent.ymin;
        var ymax: number = summary.ymax || this.map.extent.ymax;
        var width = xmax - xmin;
        var height = ymax - ymin;
        xmin = xmin - width / 2;
        xmax = xmax + width / 2;
        ymin = ymin - height / 2;
        ymax = ymax + height / 2;
        var resultExtent = new Extent(xmin, ymin, xmax, ymax, this.map.spatialReference);
        this.map.setExtent(resultExtent);
    }
    /**
    * (方法说明)获取管线图层的最小序号
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private getPipeMapLayerIndex() {
        var layerIndex = 100;
        var pipeMapName: string = "PIPE";
        this.map.layerIds.forEach(function (layerid, index) {
            // var layerTitle: string = layer.title;
            var layer = this.map.getLayer(layerid);
            if (layer.url) {
                if (layer.url.indexOf(pipeMapName) >= 0) {
                    if (layerIndex > index)
                        layerIndex = index;
                }
            }
        }.bind(this));
        return layerIndex;
    }
    /**
    * (方法说明)分析失败处理函数
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private onAnalyzeFail(jobinfo) {
        this.btnStartAnalyse.button('reset');
        this.btnStartAnalyse.removeClass('disabled')
        this.AppX.runtimeConfig.loadMask.Hide();
        this.AppX.runtimeConfig.toast.Show("分析失败，请联系管理员");
        console.error(jobinfo);
    }
    /**
    * (方法说明)获取图层的要素类别名
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private queryLayerClassName(layerid: number) {
        if ($.ajax) {
            $.ajax(
                {
                    type: "get",
                    traditional: true,
                    data: { usertoken: this.AppX.appConfig.usertoken, layerids: "[" + layerid + "]", f: "json" },//JSON.stringify(options),//options,//,
                    url: this.layerInforUrl,
                    async: true,
                    dataType: "json",
                    success: function (data) {
                        if (data.code !== 10000)
                            return;
                        var layerdbName = data.result.rows[0].layerdbname;
                        var pipeoid = this.identifyResult.feature.attributes["OBJECTID"];
                        this.submitAnalyzeTask(layerdbName, pipeoid);
                    }.bind(this),
                    error: function (data) {
                        console.error(data);
                    }.bind(this)
                }
            );
        }
    }

    /**
* (方法说明)在地图中查看分析结果
* @method (方法名)
* @for (所属类名)
* @param {(参数类型)} (参数名) (参数说明)
* @return {(返回值类型)} (返回值说明)
*/
    private viewOnMap() {
        if (this.resultLayer == null)
            return;
        if (this.btnViewMap.hasClass('glyphicon-check')) {
            // 切换到不显示
            this.resultLayer.setVisibility(false);
            this.btnViewMap
                .removeClass('glyphicon-check')
                .addClass('glyphicon-unchecked');
        } else {
            // 切换到显示
            this.resultLayer.setVisibility(true);
            this.btnViewMap
                .removeClass('glyphicon-unchecked')
                .addClass('glyphicon-check');
        }
    }
    /**
    * 查看详细回调函数
    * @method viewDetails
    * @for BurstAnalysis
    * @param null
    * @return null
    */
    viewDetails() {
        if (this.btnViewDetails.hasClass('disabled')) {
            // this.toast.Show('查询中！');
            return;
        }
        if (this.resultSummary[this.detailFeild] !== undefined)
            this.resultSummary[this.detailFeild] = undefined;
        if (this.resultSummary == null)
            return;
        if (this.resultSummary !== null) {
            // this.btnViewDetails.addClass('disabled');
            var gpBaseUrl = this.parseUrl2Mapserver(this.analyzeUrl);
            var resultMaptUrl = gpBaseUrl + this.jobid; this.resultLayer.url;
            //判断汇总信息里是否已包含oids或layerid,有，则直接显示数据面板，否则，先查询oids和layerid
            var ifGetAllLayerid = false;
            this.resultSummary.layersummary.forEach((item, index) => { if (item.oids != undefined) ifGetAllLayerid = true; })
            if (ifGetAllLayerid) {
                this.showSumaryDetailInDataPanel();
            }
            else
                this.resultSummary.layersummary.forEach(
                    function (value, index) {
                        this.findPageOidsofLayer(this.resultLayer.url, value.layername);
                    }.bind(this)
                );
        }
    }

    /**
  * (方法说明)查找受影响图层的要素oids,考虑后台分页
  * @method (方法名)
  * @for (所属类名)
  * @param {(参数类型)} (参数名) (参数说明)
  * @return {(返回值类型)} (返回值说明)
  */
    private findPageOidsofLayer(mapurl, layername) {
        // var find: FindTask = new FindTask(mapurl);
        // var params: FindParameters = new FindParameters();
        // params.layerIds = this.resultLayer.visibleLayers || [0, 1];
        // params.searchFields = ["layerdbname"];
        // params.returnGeometry = false;
        // params.searchText = layerdbname;
        // params.contains = false;
        // find.execute(params)
        //     .then(this.queryDetailofLayer.bind(this))
        //     .otherwise(this.findOidsofLayerError.bind(this));
        for (var i = 0; i < 2; i++) {
            var sqlWhere = "layername='" + layername + "'";
            this.queryTempOIDs(sqlWhere, mapurl, i, layername);
        }
    }

    private queryDetailCallBack(response) {
        if (this.resultSummary[this.detailFeild] == undefined) {
            this.resultSummary[this.detailFeild] = [];
            var table = {
            }
        }
    }

    private queryDetailErrorCallBack(error) {
        console.error(error);
        this.btnViewDetails.removeClass('disabled');
    }
    /**
        * (方法说明)获取管网子图层序号,支持多管线服务
        * @method (方法名)
        * @for (所属类名)
        * @param {(参数类型)} (参数名) (参数说明)
        * @return {(返回值类型)} (返回值说明)
        */
    private getSubLayerIdofPipeMap(layername): string {
        if (this.AppX.appConfig.gisResource.pipe.config.length > 0) {
            for (var i = 0; i < this.AppX.appConfig.gisResource.pipe.config.length; i++) {
                var layers = this.findPipeLayers(i);
                for (var j = 0; j < layers.length; j++) {
                    if (layers[j].name == layername)
                        return i + ":" + layers[j].id;
                }
            }
        }
        return null;
    }
    /*
var 最终数据格式 = {
tabs: [
{
title: "",
id: "",
canLocate: false,
objectIDIndex: 0,
layerid: 0,
table: {
thead: [],
tbody: [
    []
]
}
}
]
}

        */
    /* (方法说明)数据面板格式转换
* @method (方法名)
* @for (所属类名)
* @param {(参数类型)} (参数名) (参数说明)
* @return {(返回值类型)} (返回值说明)
*/
    private dataPanelWrap(urlindex, objectids, layername, layerid, outfields, objectidVisible, alias,dataQuery) {
        var result = {
            title: layername,
            id: urlindex * 100 + layerid,//datapanel中tab的唯一性标识,不能有特殊字符
            canLocate: true,
            objectIDIndex: 0,
            layerId: layerid,
            url: this.AppX.appConfig.gisResource.pipedata.config[0].url,
            objectids: objectids,
            objectidVisible: objectidVisible,
            query:dataQuery,
            order: "OBJECTID asc",
            table: null,
            outFields: outfields,
        }
        if (!objectidVisible && outfields.length > 0)
            result.order = outfields[0] + " asc";//默认排序
        var theadData = [];
        var tbodyData = [];
        result.table = {
            thead: alias,
            tbody: tbodyData
        }
        return result;
    }

    /**
    * 清除所有回调函数
    * @method cleanAll
    * @for BurstAnalysis
    * @param 
    * @return 
    */
    cleanAll() {
        this.map.setMapCursor('default');
        if (this.resultLayer != null) {
            this.map.removeLayer(this.resultLayer);
            this.resultLayer = null
        }
        if (this.mapClickEventHandle) {
            this.mapClickEventHandle.remove();
            this.mapClickEventHandle = null;
            this.baseMapContainer.css('cursor', 'default');
        }
        this.darwGraphic();

        /*** 重置控件显示状态 ***/
        this.tablePickPipeTbody.hide(120);
        this.tableAnalyseInfoTbody.hide(120);
        this.btnPickPipe.removeClass('disabled');
        this.btnStartAnalyse.addClass('disabled');

        this.btnViewMap
            .removeClass('glyphicon-check')
            .addClass('glyphicon-unchecked');

        this.btnViewDetails.addClass('disabled');

        /*** 重置状态 ***/
        this.isIdentifing = false;
        this.identifyResult = null;

    }

    // 格式化查询结果中的日期
    formatQueryResult(result) {
        var tmpVar = null;
        try {
            // 选出包含有时间戳的字段索引
            result.fields.forEach((item, index) => {
                if (/Date/.test(item.type)) {
                    result.features.forEach((feature) => {
                        feature.attributes[item.name] = this.formatDate(feature.attributes[item.name]);
                    });
                }
            });
        } catch (e) {
            console.error('数据格式化出错', e);
        }

        return result;
    }

    // 格式化毫秒时间戳
    formatDate(miliTimeStamp) {
        var resultStr = miliTimeStamp;
        if (('' + miliTimeStamp).length > 10 && !isNaN(miliTimeStamp)) {
            var date = new Date(miliTimeStamp);
            var year = date.getFullYear();
            var month = date.getMonth() + 1;
            var day = date.getDate();
            resultStr = year + "-" + month + "-" + day;
        }
        return resultStr;
    }

    /**
    * 自我销毁方法
    * @method (方法名)
    * @for BurstAnalysis
    * @param 
    * @return 
    */
    destroy() {
        this.domObj.remove();
        this.cleanAll();
        this.afterDestroy();
    }

    /**
    * (方法说明)开始获取指定位置的管线，支持多管线服务
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    startPickPipe(point) {
        if (this.AppX.appConfig.gisResource.pipe.config.length > 0) {
            this.identifyOnMapserver(0, point);
        }
    }

    /**
    * (方法说明)对指定地图服务进行查询 
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    identifyOnMapserver(urlindex, point) {
        var url = this.AppX.appConfig.gisResource.pipe.config[urlindex].url;
        var identifyTask = new IdentifyTask(url);
        var params = new IdentifyParameters();
        params.tolerance = this.config.identifyParameters.tolerance;;
        params.layerOption = IdentifyParameters.LAYER_OPTION_ALL;
        params.geometry = point;
        params.mapExtent = this.map.extent;
        params.width = this.map.width;
        params.returnGeometry = true;
        var layers = this.findPipeLayers(urlindex);
        var layerids = [];
        for (var j = 0; j < layers.length; j++)
            layerids.push(layers[j].id);
        params.layerIds = layerids;
        identifyTask.execute(params, function (results) {
            if (results.length == 0) {
                if (this.AppX.appConfig.gisResource.pipe.config.length > urlindex + 1)
                    this.identifyOnMapserver(urlindex + 1, point);
                else {
                    this.toast.Show('未查询到管线！');
                    this.isIdentifing = false;
                    this.btnPickPipe.removeClass('disabled');
                }
            }
            else {
                var targetIndex = null;
                for (var i = 0, j = results.length; i < j; i++) {
                    if (results[i].geometryType !== 'esriGeometryPoint') {//应改为线
                        targetIndex = i;
                        break;
                    }
                }
                if (targetIndex == null)
                    this.identifyOnMapserver(urlindex + 1, point);
                else
                    this.onIdentifyFinished(urlindex, results[targetIndex], point);
            }
        }.bind(this));
    }

    onIdentifyFinished(urlindex, result, point) {
        this.log('识别结果： ', result);
        // 如果查询中途结束则不再显示结果
        if (!this.isIdentifing) {
            return;
        }
        this.identifyResult = result;
        this.tablePickPipeTbody.find('.pick-pipe-type').text(result.layerName);
        this.tablePickPipeTbody.find('.pick-pipe-id').text(result.value);
        this.tablePickPipeTbody.show(120);
        this.darwGraphic(result.feature, this.simpleLineSymbol);
        //显示爆管点图形
        var picSymbol = new PictureMarkerSymbol("widgets/BurstAnalysis/images/poi_burst.png", 30, 36).setOffset(0, 18)
        var pointOnLine = GeometryEngine.nearestCoordinate(result.feature.geometry, point).coordinate;
        var feature = new Graphic(pointOnLine);
        this.darwGraphic(feature, picSymbol);
        this.layerInforUrl = this.AppX.appConfig.gisResource.pipe.config[urlindex].url + "/exts/TFExtentionSOE/getLayerInfor";
        this.btnStartAnalyse.removeClass('disabled');
        this.isIdentifing = false;
    }

    /**
    * (方法说明)获取指定服务的图层
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    findPipeLayers(i) {
        var PipeMapSubLayers = [];
        var url = this.AppX.appConfig.gisResource.pipe.config[i].url;
        var mapname = this.AppX.appConfig.gisResource.pipe.config[i].name;
        var sublayers = this.findLayerInMap(mapname, i, url);
        if (sublayers.length > 0) {
            for (var j = 0; j < sublayers.length; j++) {
                if (_.findIndex(PipeMapSubLayers, function (o: any) { return o.mapname == sublayers[j].mapname }) == -1) {
                    PipeMapSubLayers.push(sublayers[j]);
                }
            }
        }
        return PipeMapSubLayers;
    }

    /**
    * (方法说明)从地图中获取图层信息,不用写到配置文件
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private findLayerInMap(mapname, urlindex, url) {
        var sublayers = [];
        for (var i = 0; i < this.map.layerIds.length; i++) {
            var layer: any = this.map.getLayer(this.map.layerIds[i]);
            if (layer.url && layer.url == url) {
                if (layer.layerInfos.length != 0) {
                    layer.layerInfos.forEach(function (item, layerindex) {
                        var layerId = item.id;
                        if (item.subLayerIds) {
                        } else {
                            item.urlindex = urlindex;
                            item.mapname = item.name + '(' + mapname + ')';
                            sublayers.push(item);
                        }
                    });
                }
                return sublayers;
            }
        }
        return null;
    }

    /**
    * (方法说明)获取gp临时结果的object集合
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    queryTempOIDs(sqlWhere: string, url, layerid, layername) {
        var queryUrl = url + "\/" + layerid;
        var queryTask = new QueryTask(queryUrl);
        var query = new Query();
        query.where = sqlWhere;
        query.returnGeometry = false;
        query.orderByFields = ["OBJECTID asc"];
        queryTask.executeForIds(query, function (tempOIDs) {
            if (tempOIDs != null && tempOIDs.length > 0)
                this.beginQuerySourceOID(tempOIDs, url, layerid, layername);
        }.bind(this));
    }
    /**
    * (方法说明)分页方式获取受影响设备objectid集合
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    beginQuerySourceOID(tempoids, url, layerid, layername) {
        var pagesize = 1000;
        var total = tempoids.length;
        var page = total / pagesize;
        var totalpage = total % pagesize > 0 ? page + 1 : page;
        for (var i = 1; i <= totalpage; i++) {
            var currentOIDs = this.getCurrentPageOIDs(tempoids, i, pagesize);
            this.querySourceOIDs(currentOIDs, url, layerid, layername);
        }
    }
    /**
    * (方法说明)获取指定页内临时objectid集合的管网设备objectid集合
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    querySourceOIDs(oids, url, layerid, layername) {
        var queryUrl = url + "\/" + layerid;
        var queryTask = new QueryTask(queryUrl);
        var query = new Query();
        query.objectIds = oids,
            query.returnGeometry = false;
        // query.orderByFields = ["OBJECTID asc"];
        query.outFields = ["sourceoid"];
        queryTask.execute(query, function (result) {
            if (result.features == null || result.features.length == 0)
                return;
            var index = _.findIndex(this.resultSummary.layersummary, (o: any) => { return o.layername == layername });
            if (index >= 0) {
                result.features.forEach(function (feature) {
                    if (this.resultSummary.layersummary[index].oids == undefined)
                        this.resultSummary.layersummary[index].oids = [];
                    this.resultSummary.layersummary[index].oids.push(parseInt(feature.attributes["sourceoid"]));
                    // sourceOIDs.push(parseInt(feature.attributes["sourceoid"]));
                }.bind(this));
                //this.resultSummary.layersummary[index].layerid = layerid//layerid取值错误

            }
            //构建后台分页展示
            var ifGetAllLayerid = true;
            this.resultSummary.layersummary.forEach((item, index) => { if (item.oids === undefined) ifGetAllLayerid = false; })
            if (ifGetAllLayerid) {
                this.getSubLayerIdofPipeMapFromMianPipe();
            }
        }.bind(this));
    }

    /**
    * (方法说明)获取当前页的objectid集合
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    getCurrentPageOIDs(objectids: Array<number>, pageindex: number, pagesize: number): Array<number> {
        var subobjectids = [];
        var total = objectids.length;
        var page = total / pagesize;
        var totalpage = total % pagesize > 0 ? page + 1 : page;
        if (pageindex <= totalpage) {
            var startindex = (pageindex - 1) * pagesize;
            var endindex = (pageindex) * pagesize;
            for (var i = startindex; i <= total && i < endindex; i++) {
                subobjectids.push(objectids[i]);
            }
        }
        return subobjectids;
    }

    /**
    * (方法说明)获取管网子图层序号,使用业务地图服务
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private getSubLayerIdofPipeMapFromMianPipe() {
        if ($.ajax && this.AppX.appConfig.gisResource.pipedata.config.length > 0) {
            $.ajax(
                {
                    type: "get",
                    traditional: true,
                    url: this.AppX.appConfig.gisResource.pipedata.config[0].url,
                    data: { f: "json" },
                    async: true,
                    dataType: "json",
                    success: function (data) {
                        //获取图层信息，查找指定图层的id
                        this.resultSummary.layersummary.forEach((item, index) => {
                            var layerindex = _.findIndex(data.layers, function (o: any) { return o.name == item.layername });
                            if (layerindex >= 0) {
                                item.layerid = data.layers[layerindex].id;
                            }
                        })
                        this.showSumaryDetailInDataPanel();
                    }.bind(this),
                    error: function (data) {
                        this.AppX.runtimeConfig.toast.Show("查询详情失败，请联系管理员");
                        this.btnViewDetails.removeClass('disabled');
                        console.error(data);
                    }.bind(this)
                }
            );
        }
    }

    /**
    * (方法说明)依据以包含受影响设备objectid集合的汇总信息，构建数据面板并显示
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private showSumaryDetailInDataPanel() {
        var tabs = [];
        this.resultSummary.layersummary.forEach(function (layer, index) {
            var layerfields = this.AppX.runtimeConfig.fieldConfig.GetLayerFields(layer.layername);
            if (layerfields == null) {
                console.error("未找到图层" + layer.layername + "的字段配置");
                return;
            }
            if (layer.layerid != undefined && layer.oids != undefined && layer.oids.length > 0) {
                var outfields = layerfields.fields.map(item => { return item.name });
                var alias = layerfields.fields.map(item => { return item.alias });
                var objectidVisible = layerfields.objectid;
                var dataQuery = {where:null,geometry:null};
                var tab = this.dataPanelWrap(0, layer.oids, layer.layername, layer.layerid, outfields, objectidVisible, alias,dataQuery);
                tabs.push(tab);
            }
        }.bind(this));
        this.AppX.runtimeConfig.dataPanel.showPage({ tabs: tabs });
        this.btnViewDetails.removeClass('disabled');
    }
}