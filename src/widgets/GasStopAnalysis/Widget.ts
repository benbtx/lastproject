import BaseWidget = require('core/BaseWidget.class');

/*** Esri ***/
import Map = require('esri/map');
import IdentifyTask = require('esri/tasks/IdentifyTask');
import IdentifyParameters = require('esri/tasks/IdentifyParameters');
import GraphicsLayer = require('esri/layers/GraphicsLayer');
import SimpleMarkerSymbol = require('esri/symbols/SimpleMarkerSymbol');
import Graphic = require('esri/graphic');
import Symbol = require('esri/symbols/Symbol');
import GeometryEngine = require("esri/geometry/geometryEngine");
import Geoprocessor = require("esri/tasks/Geoprocessor");
import ArcGISDynamicMapServiceLayer = require("esri/layers/ArcGISDynamicMapServiceLayer");
import Extent = require("esri/geometry/Extent");
import FindTask = require("esri/tasks/FindTask");
import FindParameters = require("esri/tasks/FindParameters");
import QueryTask = require("esri/tasks/QueryTask");
import Query = require("esri/tasks/query");
import Point = require("esri/geometry/Point");
import Color = require("esri/Color");
import PictureMarkerSymbol = require("esri/symbols/PictureMarkerSymbol");

export = GasStopAnalysis;

class GasStopAnalysis extends BaseWidget {
    baseClass = "widget-gasstop-analysis";
    debug = false;
    mapClickEventHandle: any;
    toast: any;
    imageServiceUrl: string;
    identifyTask: IdentifyTask;
    identifyParameters: IdentifyParameters;
    /*** Esri 相关变量 ***/
    identifyResult: any = null;
    analysisResult: Object;
    graphicsLayer: GraphicsLayer;
    simpleMarkerSymbol: SimpleMarkerSymbol;
    map: Map;
    gp: Geoprocessor;
    analyzeUrl: string;
    layerInforUrl: string;
    resultLayer: ArcGISDynamicMapServiceLayer;
    resultSummary: any = [];//调压箱汇总信息(layerid,layername,objectids)
    boosterCodes: Array<string> = [];//调压箱设备编号集合
    summaryTemplate = "<tr><td class=\"analyse-info-pipe\"><%=name%></td><td class=\"analyse-info-fitting\"><%=value%></td></tr>";
    jobid: any = null;
    detailFeild = "detail";
    coveredUsers = null;

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
        if (this.AppX.appConfig.gisResource.pipe.config.length == 0) {
            this.AppX.runtimeConfig.toast.Show('获取分析服务出错！');
        } else {
            this.imageServiceUrl = this.AppX.appConfig.gisResource.pipe.config[0].url;
            this.layerInforUrl = this.AppX.appConfig.gisResource.pipe.config[0].url + '/exts/TFExtentionSOE/getLayerInfor';
        }
        this.map = this.AppX.runtimeConfig.map;
        if (this.AppX.appConfig.gisResource.apiburstpipe.config.length > 0) {
            this.analyzeUrl = this.AppX.appConfig.gisResource.apiburstpipe.config[0].url;
        } else {
            this.AppX.runtimeConfig.toast.Show('获取停用气分析服务出错！');
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
        this.simpleMarkerSymbol = new SimpleMarkerSymbol({
            color: new Color(this.config.simpleMarkerSymbol.color || "#FF00FF"),
            size: this.config.simpleMarkerSymbol.size || 10,
            style: SimpleMarkerSymbol.STYLE_CROSS,
            outline: {
                color: new Color(this.config.simpleMarkerSymbol.outline.color || "#00ff00"),
                width: this.config.simpleMarkerSymbol.outline.width || 1,
            }
        });
        this.log('this.simpleMarkerSymbol:', this.simpleMarkerSymbol);
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
        this.domObj.on('click', '.pick-pipe', this.pickPipe.bind(this))
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
    * 通过传入的图层编号查询相关信息
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    queryAlias(layerIndex: number) {

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
            // this.btnViewDetails.removeClass('disabled');
        }
    }
    /**
    * (方法说明)提交停气分析任务
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
            bysource: false,
            outpointfields: "CODE",
            usertoken: this.AppX.appConfig.usertoken
        };
        var delayResult = this.gp.submitJob(
            options,
            this.onAnalyzeComplete.bind(this),
            this.onAnalyzeStatus.bind(this),
            this.onAnalyzeFail.bind(this)
        );
        this.btnViewDetails.addClass('disabled');
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

        if (jobinfo.jobStatus == "esriJobSucceeded") {
            var summaryUrl = jobinfo.results.summary.paramUrl;
            this.jobid = jobinfo.jobId;
            this.getAnalyzsSummary(this.analyzeUrl + "/jobs/" + jobinfo.jobId + "/" + summaryUrl);

            // this.jobid = jobinfo.jobId;
            // var gpBaseUrl = this.parseUrl2Mapserver(this.analyzeUrl);
            // var resultMaptUrl = gpBaseUrl + jobinfo.jobId;
            // this.resultLayer = new ArcGISDynamicMapServiceLayer(resultMaptUrl);
            // var pipeMapIndex = this.getPipeMapLayerIndex();
            // this.map.addLayer(this.resultLayer, pipeMapIndex);

            // this.resultLayer.on('load', () => {
            //     var xmin: number = this.resultLayer.fullExtent.xmin || this.map.extent.xmin;
            //     var xmax: number = this.resultLayer.fullExtent.xmax || this.map.extent.xmax;
            //     var ymin: number = this.resultLayer.fullExtent.ymin || this.map.extent.ymin;
            //     var ymax: number = this.resultLayer.fullExtent.ymax || this.map.extent.ymax;
            //     var width = xmax - xmin;
            //     var height = ymax - ymin;
            //     xmin = xmin - width / 2;
            //     xmax = xmax + width / 2;
            //     ymin = ymin - height / 2;
            //     ymax = ymax + height / 2;
            //     var resultExtent = new Extent(xmin, ymin, xmax, ymax, this.map.spatialReference);
            //     this.map.setExtent(resultExtent);
            //     this.btnViewMap
            //         .removeClass('glyphicon-unchecked')
            //         .addClass('glyphicon-check');
            // });
            // //获取汇总信息
            // //this.showSummary();
            // //查询所有调压箱
            // var layerInfo = {
            //     layername: "调压设备",
            //     oids: [],
            //     count: 0,
            //     loaded: false,
            // };
            // var layerInfo_gw = {
            //     layername: "调压设备_管维",
            //     oids: [],
            //     count: 0,
            //     loaded: false,
            // };
            // this.resultSummary = [];
            // this.resultSummary.push(layerInfo);
            // this.resultSummary.push(layerInfo_gw);
            // this.boosterCodes = [];
            // // var url = this.resultLayer.url + "/0";
            // this.findPageOidsofLayer(this.resultLayer.url, "调压设备");
            // this.findPageOidsofLayer(this.resultLayer.url, "调压设备_管维");
        } else {
            this.AppX.runtimeConfig.loadMask.Hide();
            this.AppX.runtimeConfig.toast.Show("分析失败，请联系管理员");
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
        for (var i = 0; i < 1; i++) {
            var sqlWhere = "layername='" + layername + "'";
            this.queryTempOIDs(sqlWhere, mapurl, i, layername);
        }
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
            var layerInfo = _.find(this.resultSummary, (o: any) => { return o.layername == layername });
            if (layerInfo != null && layerInfo != undefined) {
                layerInfo.loaded = true;
                if (tempOIDs != null && tempOIDs.length > 0) {
                    layerInfo.count = tempOIDs.length;
                    // this.beginQuerySourceOID(tempOIDs, url, layerid, layername);
                } else {
                    layerInfo.count = 0;
                    //影响区域没有调压箱时的处理
                }
                //如果两个调压设备图层都没查询到调压箱，进行提示
                var allLoaded = true;
                this.resultSummary.forEach(item => { if (!item.loaded) allLoaded = false; });
                if (allLoaded) {
                    var allCount = 0;
                    this.resultSummary.forEach(item => { allCount += item.count; });
                    if (allCount == 0) {
                        this.AppX.runtimeConfig.toast.Show("停气区域没有调压箱，不能查询用户信息!");
                    }
                }
                if (tempOIDs != null && tempOIDs.length > 0) {
                    this.beginQuerySourceOID(tempOIDs, url, layerid, layername);
                }
            }
        }.bind(this), function (error) {
            console.error("查询调压箱失败:" + error);
            //this.AppX.runtimeConfig.toast.Show("停气区域没有调压箱，不能查询用户信息!");
        }.bind(this));
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
                            var gpBaseUrl = this.parseUrl2Mapserver(this.analyzeUrl);
                            var resultMaptUrl = gpBaseUrl + this.jobid;
                            this.resultLayer = new ArcGISDynamicMapServiceLayer(resultMaptUrl);
                            var pipeMapIndex = this.getPipeMapLayerIndex();
                            this.map.addLayer(this.resultLayer, pipeMapIndex);

                            this.resultLayer.on('load', () => {
                                var xmin: number = this.resultLayer.fullExtent.xmin || this.map.extent.xmin;
                                var xmax: number = this.resultLayer.fullExtent.xmax || this.map.extent.xmax;
                                var ymin: number = this.resultLayer.fullExtent.ymin || this.map.extent.ymin;
                                var ymax: number = this.resultLayer.fullExtent.ymax || this.map.extent.ymax;
                                var width = xmax - xmin;
                                var height = ymax - ymin;
                                xmin = xmin - width / 2;
                                xmax = xmax + width / 2;
                                ymin = ymin - height / 2;
                                ymax = ymax + height / 2;
                                var resultExtent = new Extent(xmin, ymin, xmax, ymax, this.map.spatialReference);
                                this.map.setExtent(resultExtent);
                                this.btnViewMap
                                    .removeClass('glyphicon-unchecked')
                                    .addClass('glyphicon-check');
                            });
                            //获取汇总信息
                            //this.showSummary();
                            //查询所有调压箱
                            var layerInfo = {
                                layername: "调压设备",
                                oids: [],
                                count: 0,
                                loaded: false,
                            };
                            var layerInfo_gw = {
                                layername: "调压设备_管维",
                                oids: [],
                                count: 0,
                                loaded: false,
                            };
                            this.resultSummary = [];
                            this.resultSummary.push(layerInfo);
                            this.resultSummary.push(layerInfo_gw);
                            this.boosterCodes = [];
                            // var url = this.resultLayer.url + "/0";
                            this.findPageOidsofLayer(this.resultLayer.url, "调压设备");
                            this.findPageOidsofLayer(this.resultLayer.url, "调压设备_管维");
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
    * (方法说明)分页方式获取受影响设备objectid集合
    * @method (方法名))
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
        query.objectIds = oids;
        query.returnGeometry = false;
        query.outFields = ["CODE"];
        queryTask.execute(query, function (result) {
            result.features.forEach(function (feature) {
                this.boosterCodes.push(feature.attributes["CODE"]);
            }.bind(this));
            //构建后台分页展示
            // var ifGetAllLayerid = true;
            // this.resultSummary.forEach((item, index) => { if (item.oids.length != item.count) ifGetAllLayerid = false; })
            // if (ifGetAllLayerid) {
            //     this.getSubLayerIdofPipeMapFromMianPipe();
            // }
            var sum = 0;
            this.resultSummary.forEach((item, index) => { sum += item.count; })
            if (sum == this.boosterCodes.length) {
                if (sum > 0) {
                    // if (this.boosterCodes.length > 0) {
                    var codes = this.boosterCodes.filter(function (item) {
                        return item != null && item.length > 0;
                    });
                    this.showSummaryPage(codes);
                }
                else {
                    //没查询到调压箱时提示
                    this.AppX.runtimeConfig.toast.Show("停气区域没有调压箱，不能查询用户信息!");
                }
                // }
            }
        }.bind(this));
    }

    private queryMustShut() {
        //查询必关阀
        var queryTask = new QueryTask(this.resultLayer.url + "/0");
        var query = new Query();
        query.where = "mustshut=1";
        query.outFields = ["*"];
        queryTask.on("complete", (result) => {
            var features = result.featureSet.features;
            var mustShutIDArr: Array<number> = new Array();
            for (var i = 0, j = features.length; i < j; i++) {
                if (features[i].attributes.mustshut === 1) {
                    if (features[i].attributes.CODE) {
                        mustShutIDArr.push(features[i].attributes.CODE);
                    }
                }
            }
            var mustShutIDStr = mustShutIDArr.join("<br/>");
            var string = _.template(this.summaryTemplate)({
                name: "必关阀门",
                value: mustShutIDStr
            });
            this.tableAnalyseInfoTbody.append(string).show(120);
        });
    }

    private showSummaryPage(codes: Array<string>) {
        //查询必关阀
        var queryTask = new QueryTask(this.resultLayer.url + "/0");
        var query = new Query();
        query.where = "mustshut=1";
        query.outFields = ["*"];
        queryTask.on("complete", (result) => {
            var features = result.featureSet.features;
            var mustShutIDArr: Array<number> = new Array();
            for (var i = 0, j = features.length; i < j; i++) {
                if (features[i].attributes.mustshut === 1) {
                    if (features[i].attributes.CODE) {
                        mustShutIDArr.push(features[i].attributes.CODE);
                    }
                }
            }
            var string = "";
            if (mustShutIDArr.length > 0) {
                var mustShutIDStr = mustShutIDArr.join("<br/>");
                var string = _.template(this.summaryTemplate)({
                    name: "必关阀门",
                    value: mustShutIDStr
                });
            }
            this.tableAnalyseInfoTbody.append(string).show(120);
            if (codes.length > 0) {
                // 存在调压箱
                $.ajax({
                    type: "post",
                    headers: {
                        "Authorization-Token": this.AppX.appConfig.usertoken
                    },
                    data: { ids: codes.join(',') },
                    url: this.AppX.appConfig.apirootx + "/yingxiao/users",
                    async: true,
                    dataType: "json",
                    success: (data) => {
                        this.AppX.runtimeConfig.loadMask.Hide();
                        this.coveredUsers = null;
                        // 已获得数组的网上的
                        // TODO: 停用气户数，停用气区域
                        if (data.code === 10000 && data.result.rows.length > 0) {
                            this.coveredUsers = data;
                            //提取片区信息
                            var addArea = [];
                            data.result.rows.forEach(element => {
                                // var add = element.add.replace(/\d+-{0,1}\d?$/, "");//删除楼层号和门号
                                // var add = element.add.replace(/\d+-{1}\d.*?$/, "");//删除楼层号和门号
                                var add = element.add.match(/^.*(路|栋|幢)/);//删除楼层号和门号
                                if (add == null)
                                    add = element.add
                                else
                                    add = add[0];
                                if (addArea.length < 8 && addArea.indexOf(add) == -1)
                                    addArea.push(add);
                            });
                            //提取片区信息
                            this.btnStartAnalyse.removeClass('disabled');
                            this.tableAnalyseInfoTbody.empty();
                            if (addArea.length > 0)
                                string += _.template(this.summaryTemplate)({
                                    name: "停气区域",
                                    value: addArea.join(','),
                                })
                            if (data.result.rows.length > 0)
                                string += _.template(this.summaryTemplate)({
                                    name: "停气户数",
                                    value: data.result.rows.length
                                })
                            this.tableAnalyseInfoTbody.append(string).show(120);
                            this.btnViewDetails.removeClass('disabled');
                        }
                        else {
                            this.AppX.runtimeConfig.toast.Show("未查询到受影响用户");
                        }
                    },
                    error: (data) => {
                        this.AppX.runtimeConfig.loadMask.Hide();
                        this.AppX.runtimeConfig.toast.Show("分析失败，请联系管理员");
                        console.error(data);
                    }
                });
            } else {
                this.tableAnalyseInfoTbody.empty();

                string += _.template(this.summaryTemplate)({
                    name: "停气区域",
                    value: "无调压箱数据，无法分析"
                })

                string += _.template(this.summaryTemplate)({
                    name: "停气户数",
                    value: "无调压箱数据，无法分析"
                })

                this.tableAnalyseInfoTbody.append(string).show(120);
                this.AppX.runtimeConfig.loadMask.Hide();
            }

        });
        queryTask.on("error", (err) => {
            this.log(err);
        });
        queryTask.execute(query);
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
    * (方法说明)显示停气分析汇总信息到界面上
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private showSummary() {
        var queryTask = new QueryTask(this.resultLayer.url + "/0");
        var query = new Query();
        query.where = "1=1";
        query.outFields = ["*"];
        queryTask.on("complete", (result) => {
            var features = result.featureSet.features;
            var mustShutIDArr: Array<number> = new Array();
            var boosterIDArr: Array<number> = new Array();
            for (var i = 0, j = features.length; i < j; i++) {
                if (features[i].attributes.mustshut === 1) {
                    if (features[i].attributes.CODE) {
                        mustShutIDArr.push(features[i].attributes.CODE);
                    }
                }
                if (features[i].attributes.layerdbname === "BOOSTER") {
                    if (features[i].attributes.CODE) {
                        boosterIDArr.push(features[i].attributes.CODE);
                    }
                }
            }
            var mustShutIDStr = mustShutIDArr.join("<br/>");
            var string = _.template(this.summaryTemplate)({
                name: "必关阀门",
                value: mustShutIDStr
            });

            this.tableAnalyseInfoTbody.append(string).show(120);
            if (boosterIDArr.length > 0) {
                // 存在调压箱
                $.ajax({
                    type: "post",
                    headers: {
                        "Authorization-Token": this.AppX.appConfig.usertoken
                    },
                    data: { ids: boosterIDArr.join(',') },
                    url: this.AppX.appConfig.apirootx + "/yingxiao/users",
                    async: true,
                    dataType: "json",
                    success: (data) => {
                        this.AppX.runtimeConfig.loadMask.Hide();
                        this.coveredUsers = null;
                        // 已获得数组的网上的
                        // TODO: 停用气户数，停用气区域
                        if (data.code === 10000 && data.result.rows.length > 0) {
                            this.coveredUsers = data;
                            //提取片区信息
                            var addArea = [];
                            data.result.rows.forEach(element => {
                                // var add = element.add.replace(/\d+-{0,1}\d?$/, "");//删除楼层号和门号
                                // var add = element.add.replace(/\d+-{1}\d.*?$/, "");//删除楼层号和门号
                                var add = element.add.match(/^.*(路|栋|幢)/);//删除楼层号和门号
                                if (add == null)
                                    add = element.add
                                else
                                    add = add[0];
                                if (addArea.length < 8 && addArea.indexOf(add) == -1)
                                    addArea.push(add);
                            });
                            //提取片区信息


                            // if (boosterIDArr.length > 0) {
                            this.btnStartAnalyse.removeClass('disabled');
                            // }

                            // var string = _.template(this.summaryTemplate)({
                            //     name: "必关阀门",
                            //     value: mustShutIDStr
                            // });

                            this.tableAnalyseInfoTbody.empty();

                            string += _.template(this.summaryTemplate)({
                                name: "停气区域",
                                value: addArea.join(','),
                            })

                            string += _.template(this.summaryTemplate)({
                                name: "停气户数",
                                value: data.result.rows.length
                            })

                            this.tableAnalyseInfoTbody.append(string).show(120);
                            this.btnViewDetails.removeClass('disabled');
                        }
                        else {
                            this.AppX.runtimeConfig.toast.Show("未查询到受影响用户");
                        }
                    },
                    error: (data) => {
                        this.AppX.runtimeConfig.loadMask.Hide();
                        this.AppX.runtimeConfig.toast.Show("分析失败，请联系管理员");
                        console.error(data);
                    }
                });
            } else {
                var mustShutIDStr = mustShutIDArr.join("<br/>");
                var string = _.template(this.summaryTemplate)({
                    name: "必关阀门",
                    value: mustShutIDStr
                });

                string += _.template(this.summaryTemplate)({
                    name: "停气区域",
                    value: "无调压箱数据，无法分析"
                })

                string += _.template(this.summaryTemplate)({
                    name: "停气户数",
                    value: "无调压箱数据，无法分析"
                })

                this.tableAnalyseInfoTbody.append(string).show(120);
                this.AppX.runtimeConfig.loadMask.Hide();
            }

        });
        queryTask.on("error", (err) => {
            this.log(err);
        });
        queryTask.execute(query);
    }

    /**
    * (方法说明)获取管线图层的序号
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
            $.ajax({
                type: "get",
                traditional: true,
                data: { usertoken: this.AppX.appConfig.usertoken, layerids: "[" + layerid + "]", f: "pjson" },//JSON.stringify(options),//options,//,
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
            });
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

        // TODO: 切换为真正的数据源
        if (this.coveredUsers != null) {
            this.AppX.runtimeConfig.dataPanel.show(
                this.formatUsersData(
                    this.coveredUsers.result.rows
                )
            );
            this.btnViewDetails.removeClass('disabled');
            // if (this.resultSummary[this.detailFeild] !== undefined)
            //     this.resultSummary[this.detailFeild] = undefined;
            // if (this.resultSummary == null)
            //     return;
        }
    }

    // 传入用户信息数组
    formatUsersData(usersData) {
        var result = {
            tabs: [
                {
                    title: "停气用户详细信息",
                    id: "",
                    canLocate: false,
                    objectIDIndex: 0,
                    layerId: 0,
                    table: {
                        thead: [],
                        tbody: []
                    }
                }
            ]
        };

        // 构建 Head
        // if (usersData[0]) {
        //     for (var attr in usersData[0]) {
        //         result.tabs[0].table.thead.push(attr);
        //     }
        // }
        result.tabs[0].table.thead.push("用户号");
        result.tabs[0].table.thead.push("姓名");
        result.tabs[0].table.thead.push("客户类型");
        result.tabs[0].table.thead.push("地址");
        result.tabs[0].table.thead.push("地址状态");
        result.tabs[0].table.thead.push("表类型");
        result.tabs[0].table.thead.push("表型号");
        result.tabs[0].table.thead.push("表状态");
        result.tabs[0].table.thead.push("联系电话");

        // 增加值
        usersData.forEach(user => {
            var currentUserAttr = [];
            for (var attr in user) {
                currentUserAttr.push(user[attr]);
            }
            result.tabs[0].table.tbody.push(currentUserAttr);
        });

        return result;
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
                    this.btnPickPipe.removeClass('disabled');
                    this.isIdentifing = false;
                }
            }
            else {
                var targetIndex = null;
                for (var i = 0, j = results.length; i < j; i++) {
                    if (results[i].geometryType !== 'esriGeometryPoint') {
                        targetIndex = i;
                        break;
                    }
                }
                if (targetIndex == null)
                    this.identifyOnMapserver(urlindex + 1, point);
                else
                    this.onIdentifyFinished(urlindex, results[targetIndex], point);
            }
        }.bind(this), function () { this.btnPickPipe.removeClass('disabled'); }.bind(this));
    }

    onIdentifyFinished(urlindex, result, point) {
        this.btnPickPipe.removeClass('disabled');
        this.log('识别结果： ', result);
        // 如果查询中途结束则不再显示结果
        if (!this.isIdentifing) {
            return;
        }
        this.identifyResult = result;
        this.tablePickPipeTbody.find('.pick-pipe-type').text(result.layerName);
        this.tablePickPipeTbody.find('.pick-pipe-id').text(result.value);
        this.tablePickPipeTbody.show(120);
        var pointOnLine = GeometryEngine.nearestCoordinate(result.feature.geometry, point).coordinate;
        var feature = new Graphic(pointOnLine);
        var picSymbol = new PictureMarkerSymbol("widgets/GasStopAnalysis/images/poi_burst.png", 30, 36).setOffset(0, 18)
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
}
