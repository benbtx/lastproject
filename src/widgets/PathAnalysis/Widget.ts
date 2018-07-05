import BaseWidget = require('core/BaseWidget.class');
/*** Local ***/

/*** Esri ***/
import IdentifyTask = require('esri/tasks/IdentifyTask');
import IdentifyParameters = require('esri/tasks/IdentifyParameters');
import GraphicsLayer = require('esri/layers/GraphicsLayer');
import SimpleMarkerSymbol = require('esri/symbols/SimpleMarkerSymbol');
import SimpleLineSymbol = require('esri/symbols/SimpleLineSymbol');
import Geoprocessor = require("esri/tasks/Geoprocessor");
import ArcGISDynamicMapServiceLayer = require("esri/layers/ArcGISDynamicMapServiceLayer");
import Extent = require("esri/geometry/Extent");
import Point = require("esri/geometry/Point");
import GeometryEngine = require("esri/geometry/geometryEngine");
import Color = require("esri/Color");
import Graphic = require('esri/graphic');

export = PathAnalysis;

class PathAnalysis extends BaseWidget {
    baseClass = "widget-PathAnalysis";
    debug = false;
    mapViewClickEventHandle: any;
    toast: any;
    imageServiceUrl: string;
    imageServiceIdentifyTask: IdentifyTask;
    imageServiceIdentifyParameters: IdentifyParameters;
    /*** Esri 相关变量 ***/
    identifyResult: Object;
    analysisResult: Object;
    graphicsLayer: GraphicsLayer;
    firstSimpleMarkerSymbol: SimpleMarkerSymbol;
    lastSimpleMarkerSymbol: SimpleMarkerSymbol;
    firstSimpleLineSymbol: SimpleLineSymbol;
    lastSimpleLineSymbol: SimpleLineSymbol;
    resultLayer: ArcGISDynamicMapServiceLayer;
    map: any;
    gp: Geoprocessor;
    analyzeUrl: string;
    jobid: any = null;



    /*** 状态属性 ***/
    isIdentifing: boolean = false;
    hasFinishedQuering: boolean = false;
    count: number = 0;
    /*** Dom元素 ***/
    btnPickPipe: JQuery;
    labelPickPipeTips: JQuery;
    tablePickPipeTbody: JQuery;
    btnStartAnalyse: JQuery;
    tableAnalyseInfoTbody: JQuery;
    btnViewDetails: JQuery;
    btnCleanAll: JQuery;
    baseMapContainer: JQuery;
    btnViewMap: any;
    summaryTemplate = "<tr><td class=\"analyse-info-pipe\"><%=layername%></td><td class=\"analyse-info-fitting\"><%=countvalue%></td><td class=\"analyse-info-fitting\"><%=summaryvalue%></td></tr>";
    /***其他 ***/
    layersname = [];
    ids = [];
    layername: string;


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
        this.map = this.AppX.runtimeConfig.map;
        this.toast = this.AppX.runtimeConfig.toast;
        if (this.AppX.appConfig.gisResource.pipe.config.length == 0) {
            this.AppX.runtimeConfig.toast.Show('获取分析服务出错！');
        } else {
            this.imageServiceUrl = this.AppX.appConfig.gisResource.pipe.config[0].url;
            this.layername = this.AppX.appConfig.gisResource.pipe.config[0].url + this.config.serviceUrl.LayerName;
        }
        if (this.AppX.appConfig.gisResource.apipipepath.config.length > 0) {
            this.analyzeUrl = this.AppX.appConfig.gisResource.apipipepath.config[0].url;
        } else {
            this.AppX.runtimeConfig.toast.Show('获取路径分析服务出错！')
        }

        // this.mapView = this.AppX.runtimeConfig.mapView;
    }

    /**
    * 初始化Symble
    * @method initSymble
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */

    initSymble() {
        // this.firstSimpleMarkerSymbol = new SimpleMarkerSymbol({
        //     color: new Color(this.config.firstSimpleMarkerSymbol.color || "#FF00FF"),
        //     size: this.config.firstSimpleMarkerSymbol.size || 10,
        //     style: SimpleMarkerSymbol.STYLE_CROSS,
        //     outline: {
        //         color: new Color(this.config.firstSimpleMarkerSymbol.outline.color || "#00ff00"),
        //         width: this.config.firstSimpleMarkerSymbol.outline.width || 1,
        //     }
        // });
        // this.log('this.simpleMarkerSymbol:', this.firstSimpleMarkerSymbol);

        // this.lastSimpleMarkerSymbol = new SimpleMarkerSymbol({
        //     color: new Color(this.config.lastSimpleMarkerSymbol.color || "#0000FF"),
        //     size: this.config.lastSimpleMarkerSymbol.size || 10,
        //     style: SimpleMarkerSymbol.STYLE_CROSS,
        //     outline: {
        //         color: new Color(this.config.lastSimpleMarkerSymbol.outline.color || "#00ff00"),
        //         width: this.config.lastSimpleMarkerSymbol.outline.width || 1,
        //     }
        // });
        // this.log('this.simpleMarkerSymbol:', this.lastSimpleMarkerSymbol);

        this.firstSimpleLineSymbol = new SimpleLineSymbol({
            color: new Color(this.config.firstSimpleLineSymbol.color || "#FF00FF"),
            width: this.config.firstSimpleLineSymbol.width || 3,
            style: SimpleLineSymbol.STYLE_SOLID
        });

        this.log('this.firstSimpleLineSymbol:', this.firstSimpleLineSymbol);

        this.lastSimpleLineSymbol = new SimpleLineSymbol({
            color: new Color(this.config.lastSimpleLineSymbol.color || "#0000FF"),
            width: this.config.lastSimpleLineSymbol.width || 3,
            style: SimpleLineSymbol.STYLE_SOLID
        });

        this.log('this.lastSimpleLineSymbol:', this.lastSimpleLineSymbol);
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
        this.btnViewMap = this.domObj.find('.view-map');
        this.baseMapContainer = $('.' + this.config.baseMapContainerClass);
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
            if (this.mapViewClickEventHandle) {
                this.toast.Show("请在地图上选取要分析的管线。");
                return;
            }

            this.btnPickPipe.addClass('disabled');
            // this.baseMapContainer.css('cursor', 'crosshair');
            this.map.setMapCursor('crosshair');

            this.btnStartAnalyse.addClass('disabled');
            //this.tableAnalyseInfoTbody.hide(120);
            //移除graphice 
            if (this.graphicsLayer) {
                if (this.graphicsLayer.graphics.length >= 2) {
                    this.graphicsLayer.clear();
                    this.map.removeLayer(this.graphicsLayer);
                    this.graphicsLayer = null;
                    this.tablePickPipeTbody.empty();
                    this.tableAnalyseInfoTbody.empty();
                    this.ids = [];
                    this.layersname = [];

                }
            }
            this.mapViewClickEventHandle = this.AppX.runtimeConfig.map.on('click', function (event) {
                this.log('pickPipeEvent: ', event);
                this.isIdentifing = true;
                // 管线识别
                // this.doIdentify(event);
                this.startPickPipe(event.mapPoint);
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
        if (!this.imageServiceIdentifyTask) {
            this.imageServiceIdentifyTask = new IdentifyTask(this.imageServiceUrl);
            this.log('this.imageServiceUrl:' + this.imageServiceUrl);
        }
        if (!this.imageServiceIdentifyParameters) {
            this.imageServiceIdentifyParameters = new IdentifyParameters();
        }
        this.imageServiceIdentifyParameters.geometry = event.mapPoint;
        this.imageServiceIdentifyParameters.layerOption = IdentifyParameters.LAYER_OPTION_ALL;
        this.imageServiceIdentifyParameters.tolerance = this.config.identifyParameters.tolerance;
        this.imageServiceIdentifyParameters.mapExtent = this.AppX.runtimeConfig.map.extent;
        this.imageServiceIdentifyParameters.returnGeometry = true;

        this.imageServiceIdentifyTask.execute(this.imageServiceIdentifyParameters, function (data) {
            this.log('识别结果： ', data);
            if (data.length < 1) { this.count -= 1; return; }

            // 如果查询中途结束则不再显示结果
            if (!this.isIdentifing) {
                return;
            }

            var targetIndex = null;
            for (var i = 0, j = data.length; i < j; i++) {
                if (data[i].geometryType !== 'esriGeometryPoint') {
                    targetIndex = i;
                    break;
                }
            }

            var result = null;

            if (targetIndex !== null) {
                result = data[targetIndex]
                this.identifyResult = result;
                // this.tablePickPipeTbody.find('.pick-pipe-type').text(result.layerName);
                // this.tablePickPipeTbody.find('.pick-pipe-id').text(result.value);
                // this.tablePickPipeTbody.show(120);
                this.tablePickPipeTbody.append("<tr><td class='pick-pipe-type'>" + result.layerName + "</td><td class='pick-pipe-id'>" + result.value + "</td></tr>");
                this.ids.push(result.feature.attributes["OBJECTID"]);
                //根据图层id获取图层英文名
                $.ajax({
                    url: this.layername,
                    data: {
                        usertoken: this.AppX.appConfig.usertoken,
                        layerids: "[" + result.layerId + "]",
                        f: "pjson"
                    },
                    success: this.queryLayerNameCallback.bind(this),
                    dataType: "json",
                });

                // var point = GeometryEngine.nearestCoordinate(result.feature.geometry, event.mapPoint).coordinate;
                // var feature = new Graphic(point);

                this.darwGraphic(result.feature, this.count === 1 ? this.firstSimpleLineSymbol : this.lastSimpleLineSymbol);
            } else {
                this.identifyResult = null;
                this.btnStartAnalyse.addClass('disabled');
                //this.tablePickPipeTbody.hide(120);

                if (result.length <= 0) {
                    this.toast.Show('未查询到管线！');
                    this.count -= 1;
                } else {
                    this.toast.Show('不能对节点进行分析！');
                    this.count -= 1;
                }
            }
            if (this.count == 2) {
                this.isIdentifing = false;
                this.count = 0;
                this.map.setMapCursor('default');
                this.btnPickPipe.removeClass('disabled');
                this.mapViewClickEventHandle.remove();
                this.mapViewClickEventHandle = null;
                this.btnStartAnalyse.removeClass('disabled');
            }
        }.bind(this));
    }

    /**
    * 可根据传入的参数进行绘图
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    darwGraphic(feature?, symble?, clearLayer?: boolean) {
        // 通过传入的 Geometry 绘制图形，如果参数为空，则清空图层并释放资源
        if (!feature) {
            if (this.graphicsLayer.graphics.length > 2) {
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
            //this.graphicsLayer.removeAll();
        }

        if (symble !== undefined) {
            feature.symbol = symble;
        }
        if (this.graphicsLayer.graphics.length > 0) {
            if (feature.geometry != this.graphicsLayer.graphics[0].geometry) {
                this.graphicsLayer.add(feature);
            }
        } else {
            this.graphicsLayer.add(feature);
        }



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
            this.toast.Show('请点击选取管线！');
            return;
        }
        if (this.resultLayer != null) {
            // this.tableAnalyseInfoTbody.empty();
            // this.map.removeLayer(this.resultLayer);
            // this.resultLayer = null
            this.toast.Show('分析结果已完成！');
            return;
        }
        if (this.identifyResult === null) {
            this.btnStartAnalyse.addClass('disabled');
            this.toast.Show('请先选择管线！');
        } else {

            // this.tableAnalyseInfoTbody.find('.analyse-info-pipe').text('12345');
            // this.tableAnalyseInfoTbody.find('.analyse-info-fitting').text('12');
            // this.tableAnalyseInfoTbody.show(120);
            // this.btnStartAnalyse.removeClass('disabled');
            // this.btnViewDetails.removeClass('disabled');
            //最短路径分析

            // $.ajax({
            //     url: this.config.serviceUrl.PathAnalysisUrl,
            //     data: {
            //         ServerName: "crjt",
            //         UserName: "sde_cqrq_crjt",//"PDF"
            //         Password: "sde_cqrq_crjt",//"DefaultA0L"
            //         SourceFeatureClassName: "PIPESECTIONMP",
            //         SourceEdgeID1: parseInt(this.ids[0]),
            //         SourceEdgeID2: parseInt(this.ids[1]),
            //         // layerids: JSON.stringify(ids),
            //         f: "pjson"
            //     },
            //     success: this.pathResult.bind(this),
            //     error: this.Error,
            //     dataType: "json",
            // });

            (<any>this.btnStartAnalyse).button('analyze');
            this.btnStartAnalyse.addClass('disabled');
            this.AppX.runtimeConfig.loadMask.Show();
            if (this.gp == null)
                this.gp = new Geoprocessor(this.analyzeUrl);
            var options = {
                startclassname: this.layersname[0],
                startid: this.ids[0],
                endclassname: this.layersname[1],
                endid: this.ids[1],
                usertoken: this.AppX.appConfig.usertoken
            };
            var delayResult = this.gp.submitJob(
                options,
                this.onAnalyzeComplete.bind(this),
                this.onAnalyzeStatus.bind(this),
                this.onAnalyzeFail.bind(this)
            );
        }

    }
    pathResult(results) {
        if (results.Connected == "true") {

            //高亮显示
            var that = this;
            $.each(results.Path, function (i, item) {
                that.tableAnalyseInfoTbody.append("<tr><td class='pick-pipe-type'>" + item.LineDefiniton.split(":")[0] + "</td><td class='pick-pipe-id'>" + item.LineDefiniton.split(":")[1] + "</td></tr>");
            })
        } else {
            alert("管线不连通");
        }
    }

    Error() {
    }

    queryLayerNameCallback(data) {
        var that = this;
        if (data.code == 10000) {

            // = data.result.rows;
            //遍历出数量统计所需图层
            data.result.rows.forEach(function (item, i) {
                if (item == null) { return; }
                that.layersname.push(item.layerdbname);
            });


        } else {
            that.toast.Show("图层名查询出错，请检查");
            console.log(data.error);
        }
    }
    /**
   * (方法说明)分析完处理函数
   * @method (方法名)
   * @for (所属类名)
   * @param {(参数类型)} (参数名) (参数说明)
   * @return {(返回值类型)} (返回值说明)
   */
    private onAnalyzeComplete(jobinfo) {
        // this.btnStartAnalyse.button('reset');
        // this.btnStartAnalyse.removeClass('disabled');
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
            (<any>this.btnStartAnalyse).button('reset');
        } else {
            this.AppX.runtimeConfig.loadMask.Hide();
            this.toast.Show("两条管线不连通！");
            (<any>this.btnStartAnalyse).button('reset');
        }

    }
    private parseUrl2Mapserver(url: string) {
        var reg = new RegExp("GPServer.+");
        return url.replace(reg, "MapServer/jobs/");
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
   * (方法说明)查询最短路径分析汇总信息
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
                    data: { f: "pjson" },
                    async: true,
                    dataType: "json",
                    success: function (data) {
                        if (data.value.code != 10000) {
                            this.toast.Show(data.value.error,3600000);
                        }
                        else {
                            //显示汇总信息
                            this.resultSummary = data.value;
                            this.showSummary(data.value);
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
    private showSummary(data) {
        if (data.result.summary.layersummary.length > 0) {
            data.result.summary.layersummary.forEach(
                function (value, index) {
                    var data;
                    if (value.geometrytype == "esriGeometryPoint")
                        data = { layername: value.layername, summaryvalue: value.count + "个" };
                    else data = { layername: value.layername, countvalue: value.count, summaryvalue: value.length.toFixed(2) + "米" };
                    var mixedTemplate = _.template(this.summaryTemplate)(data);
                    var currentDom: JQuery = this.domObj;
                    this.tableAnalyseInfoTbody.append(mixedTemplate);
                    this.tableAnalyseInfoTbody.show();
                }.bind(this)
            );
        }
        var xmin: number = data.result.summary.xmin || this.map.extent.xmin;
        var xmax: number = data.result.summary.xmax || this.map.extent.xmax;
        var ymin: number = data.result.summary.ymin || this.map.extent.ymin;
        var ymax: number = data.result.summary.ymax || this.map.extent.ymax;
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
   * (方法说明)分析状态处理函数
   * @method (方法名)
   * @for (所属类名)
   * @param {(参数类型)} (参数名) (参数说明)
   * @return {(返回值类型)} (返回值说明)
   */
    private onAnalyzeStatus(jobinfo) {
    }

    /**
   * (方法说明)分析失败处理函数
   * @method (方法名)
   * @for (所属类名)
   * @param {(参数类型)} (参数名) (参数说明)
   * @return {(返回值类型)} (返回值说明)
   */
    private onAnalyzeFail(jobinfo) {
        (<any>this.btnStartAnalyse).button('reset');
        this.btnStartAnalyse.removeClass('disabled')
        this.AppX.runtimeConfig.loadMask.Hide();
        this.AppX.runtimeConfig.toast.Show("分析失败，请联系管理员");
        console.error(jobinfo);
    }



    /**
    * 清除所有回调函数
    * @method cleanAll
    * @for BurstAnalysis
    * @param 
    * @return 
    */
    cleanAll() {
        if (this.resultLayer != null) {
            this.map.removeLayer(this.resultLayer);
            this.resultLayer = null
        }
        if (this.mapViewClickEventHandle) {
            this.mapViewClickEventHandle.remove();
            this.mapViewClickEventHandle = null;
            // this.baseMapContainer.css('cursor', 'default');
            this.map.setMapCursor('default');
        }
        //this.darwGraphic();

        /*** 重置控件显示状态 ***/
        //this.tablePickPipeTbody.hide(120);
        // this.tableAnalyseInfoTbody.hide(120);
        this.btnPickPipe.removeClass('disabled');
        this.btnStartAnalyse.addClass('disabled');
        this.btnViewMap
            .removeClass('glyphicon-check')
            .addClass('glyphicon-unchecked');
        // this.btnViewDetails.addClass('disabled');

        /*** 重置状态 ***/
        this.isIdentifing = false;
        this.identifyResult = null;
        if (this.graphicsLayer) {
            this.graphicsLayer.clear();
            this.map.removeLayer(this.graphicsLayer);
            this.graphicsLayer = null;
        }


        this.tablePickPipeTbody.empty();
        this.tableAnalyseInfoTbody.empty();
        if (this.ids) {
            this.ids = [];
        }
        if (this.layersname) {
            this.layersname = [];
        }



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
                    this.onIdentifyFinished(urlindex, results[targetIndex]);
            }
        }.bind(this));
    }

    onIdentifyFinished(urlindex, result) {
        this.log('识别结果： ', result);
        // 如果查询中途结束则不再显示结果
        if (!this.isIdentifing) {
            return;
        }
        this.count += 1;
        this.identifyResult = result;
        this.layername = this.AppX.appConfig.gisResource.pipe.config[urlindex].url + "/exts/TFExtentionSOE/getLayerInfor";
        this.tablePickPipeTbody.append("<tr><td class='pick-pipe-type'>" + result.layerName + "</td><td class='pick-pipe-id'>" + result.value + "</td></tr>");
        this.ids.push(result.feature.attributes["OBJECTID"]);
        //根据图层id获取图层英文名
        $.ajax({
            url: this.layername,
            data: {
                usertoken: this.AppX.appConfig.usertoken,
                layerids: "[" + result.layerId + "]",
                f: "pjson"
            },
            success: this.queryLayerNameCallback.bind(this),
            dataType: "json",
        });
        this.darwGraphic(result.feature, this.count === 1 ? this.firstSimpleLineSymbol : this.lastSimpleLineSymbol);
        this.btnStartAnalyse.removeClass('disabled');
        if (this.count >= 2) {
            this.isIdentifing = false;
            this.count = 0;
            this.map.setMapCursor('default');
            this.btnPickPipe.removeClass('disabled');
            this.mapViewClickEventHandle.remove();
            this.mapViewClickEventHandle = null;
            this.btnStartAnalyse.removeClass('disabled');
        }
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