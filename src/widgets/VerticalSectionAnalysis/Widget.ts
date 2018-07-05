import BaseWidget = require('core/BaseWidget.class');
import Draw = require("esri/toolbars/draw");
import SimpleMarkerSymbol = require("esri/symbols/SimpleMarkerSymbol");
import SimpleLineSymbol = require("esri/symbols/SimpleLineSymbol");
import Color = require("esri/Color");
import Graphic = require("esri/graphic");
import Map = require("esri/map");
import IdentifyParameters = require("esri/tasks/IdentifyParameters");
import IdentifyTask = require("esri/tasks/IdentifyTask");
import SnappingManager = require("esri/SnappingManager");
import GeometryEngine = require("esri/geometry/geometryEngine");
import Point = require("esri/geometry/Point");
import BlankPanel = require('widgets/BlankPanel/Widget');
import QueryTask = require("esri/tasks/QueryTask");
import Query = require("esri/tasks/query");
import LayerInfo = require("esri/layers/LayerInfo");
import ArcGISDynamicMapServiceLayer = require("esri/layers/ArcGISDynamicMapServiceLayer");
declare var echarts;


export = VerticalSectionAnalysis;

class VerticalSectionAnalysis extends BaseWidget {
    baseClass = "VerticalSectionAnalysis";
    toast: any;
    //  save the polyLine  and point  symbol
    objSymbol;
    //save the map Object
    map: Map;
    //save the all layer information in the mapcontrol
    layerInfos = [];
    //save the mapClickEvent
    mapClickEvent
    //save  the click mapPoint
    mapClickPoint

    drawPoint = [];//保存起始和终止管点的坐标：save [startPoint,endPoint]
    //
    blankChartPanel = null;
    //save all the used data in chart 
    chartData
    //
    depth
    //save the soeVerticalSectionAnalysis result
    soeAnalysisResult;
    //存储soe结果中管点类型的唯一值
    layerUniquedbname = [];
    count: number = 0;
    //
    tables = [];
    layers: any[] = null;
    indexLock = 0;//标记查询的个数
    layerOids = null;
    tableCount = 0; //每种管线为一张表，记录表的数量
    isIdentifing = false;

    startup() {
        this.setHtml(_.template(this.template)({
            hello: this.config.hello + (/\/([a-zA-Z]+)$/g.exec(this.widgetPath)[1])
        }));
        this.verticalSectionAnalysisInit();
    }

    destroy() {
        this.domObj.remove();
        this.afterDestroy();
        this.backToInitialState();
    }

    verticalSectionAnalysisInit() {
        if (this.AppX.appConfig.gisResource.pipe.config.length == 0) {
            this.AppX.runtimeConfig.toast.Show('获取分析服务出错！');
        } else {
            // this.config.getLayerInfoUrl = this.AppX.appConfig.gisResource.pipe.config[0].url + this.config.getLayerInfoUrl;
            this.config.identifyTaskUrl = this.AppX.appConfig.gisResource.pipe.config[0].url;
            this.config.soeVerticalSectionAnalysisUrl = this.AppX.appConfig.gisResource.pipe.config[0].url + this.config.soeVerticalSectionAnalysisUrl;
            this.config.baseLayerUrl = this.AppX.appConfig.gisResource.pipe.config[0].url;
            //初始化map对象
            this.map = this.AppX.runtimeConfig.map;
            this.toast = this.AppX.runtimeConfig.toast;
            //初始化绘制点的样式
            this.objSymbol = this.setSymbol();
            //获取管线的信息
            this.getPipeInfo();
            //绑定绘制纵剖线的点击事件
            $(".VerticalSectionAnalysis button:first").on("click", this.drawLineCallBack.bind(this));
            //绑定查看详细信息的事件
            $('.VerticalSectionAnalysis  button:eq(1)').on("click", this.getAllInfo.bind(this));
        }
    }

    ///
    backToInitialState() {
        //全局变量
        {
            this.map.setMapCursor("default");
            this.drawPoint = [];
            //before soeAnalysisResult come out you can not get  the detail analysis result
            $(".VerticalSectionAnalysis button:eq(1)").addClass("disabled");
        }
        //事件
        {

            if (this.mapClickEvent != null) {
                this.mapClickEvent.remove();//移除地图单击事件
            }

            //清除存储表数组
            this.tables = []
        }
        //html元素
        {

            //关闭上一次分析展现的数据面板和图表(如果存在)
            if (this.AppX.runtimeConfig.dataPanel) {
                this.AppX.runtimeConfig.dataPanel.close();
            }

            if (this.blankChartPanel != null) {
                this.blankChartPanel.Destroy();
            }
            //移除结果统计
            if ($(".VerticalSectionAnalysis tbody tr").length != 0) {
                $(".VerticalSectionAnalysis tbody tr").remove();
            }
            this.AppX.runtimeConfig.map.graphics.clear();//清除绘制的图形

        }

    }

    //设置绘制点的样式
    setSymbol() {
        var symbol = {
            startSimpleMarkeSymbol: null,
            endSimpleMarkSymbol: null,
            simpleLineSymbol: null
        }

        //the start point symbol
        symbol.startSimpleMarkeSymbol = new SimpleMarkerSymbol({
            color: new Color("#ff00ff"),
            size: 10,
            style: SimpleMarkerSymbol.STYLE_CROSS,
            outline: {
                color: new Color("#00ff00"),
                width: 1,
            }
        });
        //the end point symbol
        symbol.endSimpleMarkSymbol = new SimpleMarkerSymbol({
            color: new Color("#0000ff"),
            size: 10,
            style: SimpleMarkerSymbol.STYLE_CROSS,
            outline: {
                color: new Color("#00ff00"),
                width: 1,
            }
        });

        //the ployline symbol
        symbol.simpleLineSymbol = new SimpleLineSymbol({
            color: new Color("#00ff00"),
            style: "solid",   //线的样式 dash|dash-dot|solid等	
            width: 5
        });
        return symbol;
    }


    ///draw line button callBack meathod
    drawLineCallBack() {
        // //移除影响结果
        // if ($(".VerticalSectionAnalysis tbody tr").length != 0) {
        //     $(".VerticalSectionAnalysis tbody tr").remove();
        // }
        // //清除存储表数组
        // this.tables = []
        //回到初始状态
        this.backToInitialState();
        //设置指针样式
        this.map.setMapCursor("crosshair");// "default", "pointer", "crosshair", "text", "help", and "wait".
        //绑定地图单击事件
        this.mapClickEvent = this.AppX.runtimeConfig.map.on("click", this.mapClickCallBack.bind(this));
    }
    //单击地图回调函数
    mapClickCallBack(event) {
        this.isIdentifing = true;
        // 管线识别
        this.startPickPipe(event.mapPoint);
    }

    identifyTaskCallBack(result) {
        //查询结果不包括满足条件的管线，直接返回
        if (result.length == 0) {
            return;
        }
        //获取离管线最近，并在管线上的点（及与管线相交的点）
        var nearestCoordinate = GeometryEngine.nearestCoordinate(result[0].feature.geometry, this.mapClickPoint);
        for (var i = 0; i < this.layerInfos.length; i++) {
            if (this.layerInfos[i].layername == result[0].layerName) {
                this.drawPoint.push(this.layerInfos[i].layerdbname);
            }

        }
        var point = new Point(nearestCoordinate.coordinate.x, nearestCoordinate.coordinate.y);
        this.drawPoint.push(point);
        if (this.drawPoint.length < 3) {
            var pointGraphic = new Graphic(point, this.objSymbol.startSimpleMarkeSymbol);
        } else {
            var pointGraphic = new Graphic(point, this.objSymbol.endSimpleMarkSymbol);
            this.map.setMapCursor("default");
            //执行纵剖面分析
            this.soeVerticalSectionAnalysis();

        }
        //添加绘制点图形
        this.AppX.runtimeConfig.map.graphics.add(pointGraphic);
    }

    getPipeInfo() {
        //get the all layer id from the attribute visibleLayer of ArcGISDynamicMapServiceLayer
        var pipeMapCount = this.AppX.appConfig.gisResource.pipe.config.length;
        if (pipeMapCount == 0)
            return;
        for (var urlindex = 0; urlindex < pipeMapCount; urlindex++) {
            this.startGetPipeInfo(urlindex);
        }
    }

    startGetPipeInfo(urlindex) {
        var url = this.AppX.appConfig.gisResource.pipe.config[urlindex].url
        var layers = this.findPipeLayersByIndex(urlindex);
        var layerids = [];
        for (var i = 0; i < layers.length; i++) {
            layerids.push(layers[i].id);
        }
        $.ajax({
            type: "get",
            url: url + this.config.getLayerInfoUrl,
            data: {
                usertoken: this.AppX.appConfig.usertoken,
                layerids: JSON.stringify(layerids),
                f: "pjson"
            },
            success: this.ajaxGetLayerInfo.bind(this),
            dataType: "json",
            async: false

        });
    }

    //获取地图上已有图层的信息
    ajaxGetLayerInfo(result) {
        if (result.result !== undefined)
            this.layerInfos = this.layerInfos.concat(result.result.rows);
    }

    addBlankDataPanel() {
        var html: string = "<div></div>";
        this.blankChartPanel = new BlankPanel({
            id: "VerticalSectionAnalysis",
            title: "纵剖面分析结果",
            html: html,
            width: this.config.dataPanel.width,
            height: this.config.dataPanel.height,
            readyCallback: this.onBlankPanelReady.bind(this)
        });
    }
    onBlankPanelReady() {
        this.addChart(this.chartData);
    }
    soeVerticalSectionAnalysis() {
        $.ajax({
            type: "get",
            url: this.config.soeVerticalSectionAnalysisUrl,
            data: {
                UserToken: this.AppX.appConfig.usertoken,
                X1: this.drawPoint[1].x,
                Y1: this.drawPoint[1].y,
                X2: this.drawPoint[3].x,
                Y2: this.drawPoint[3].y,
                Buffer: 0,
                f: "pjson"
            },
            success: this.soeAjaxCallBack.bind(this),
            dataType: "json"
        });
        this.AppX.runtimeConfig.loadMask.Show();
    }
    soeAjaxCallBack(result) {
        this.AppX.runtimeConfig.loadMask.Hide();
        //移除获取详情不可点击状态
        $(".VerticalSectionAnalysis button:eq(1)").removeClass("disabled");
        if (result.Status != 'successed') {
            this.toast.Show("纵剖面分析失败！");
            return;
        }
        if (result.Values.length == 0) {
            this.toast.Show("纵剖面分析失败,缺少必要属性！");
            return;
        }
        this.soeAnalysisResult = result;//将纵剖面分析结果保存在变量soeAnalysisResult中
        // ///modify the basic analysis information
        // //获取ajax结果中管点类型的唯一值
        // this.layerUniquedbname = [];
        // for (var i = 1, length = this.soeAnalysisResult.Values.length; i < length - 1; i++) {//去除绘制的起点和终点
        //     var layerdbname = this.soeAnalysisResult.Values[i].PipePointDefinition.match(/[A-Za-z]+/)[0];
        //     if (this.layerUniquedbname.every(function (value) { return value != layerdbname })) {
        //         this.layerUniquedbname.push(layerdbname);
        //     }
        // }
        // //循环获取各类管线的总记录数，添加结果的大致信息
        // for (var i = 0, len = this.layerUniquedbname.length; i < len; i++) {
        //     var layerName;
        //     for (var j = 0, long = this.layerInfos.length; j < long; j++) {
        //         if (this.layerInfos[j].layerdbname == this.layerUniquedbname[i].toUpperCase()) {
        //             layerName = this.layerInfos[j].layername;
        //         }
        //     }
        //     //对该类管线，记录结果中总记录数
        //     var count: number = 0;
        //     for (var k = 1; k < result.Values.length; k++) {
        //         var regEx = new RegExp(this.layerUniquedbname[i]);
        //         if (regEx.test(result.Values[k].PipePointDefinition.toLowerCase())) {
        //             count++;
        //         }
        //     }
        //     var layerNameEle = "<tr><td class=\"pick-pipe-type\">" + layerName + "</td> <td class=\"pick-pipe-type\">" + count + "</td></tr>"
        //     $(layerNameEle).appendTo($(".VerticalSectionAnalysis tbody "));
        // }
        ///显示汇总信息
        this.showSummary();
        ///对分析结果数据进行处理
        this.chartData = this.transformResultToChartData(result);
        ///添加图表
        this.addBlankDataPanel();
    }
    transformResultToChartData(result) {
        var chartData = {
            groundData: null,    
            pipeNodeData: null
        }
        //the elevation of ground 
        var z = [];
        //the pipeline buried depth
        this.depth = [];
        //the distance between startPoint and the curent pipe node 
        var distance = [];
        //the elevation of pipe node after calculating
        var pipeNodeZ = []
        for (var i = 0; i < result.Values.length; i++) {
            z.push(result.Values[i].ZGround);
            distance.push(result.Values[i].Distance);
            this.depth.push(result.Values[i].Depth);
            pipeNodeZ.push(result.Values[i].Z);//- result.Values[i].Depth * 5
        }

        var groundData = [];
        for (var i = 0; i < z.length; i++) {
            var point = [];
            point.push(distance[i]);
            point.push(z[i]);
            groundData.push(point);

        }
        var pipeNodeData = [];
        for (var i = 0; i < z.length; i++) {
            var point = [];
            point.push(distance[i]);
            point.push(pipeNodeZ[i]);
            pipeNodeData.push(point);
        }

        chartData.groundData = groundData;
        chartData.pipeNodeData = pipeNodeData
        return chartData;
    }

    addChart(chartData) {
        $("<div class=\"VerticalSectionAnalysis-charts\"></div>").appendTo($("#VerticalSectionAnalysis .panel-body"));
        //init the chart Object
        var myChart = echarts.init($("#VerticalSectionAnalysis .panel-body .VerticalSectionAnalysis-charts")[0], 'macarons');
        //set the option and data of the chart Object
        var option = {
            //the title of the chart which can help you understand what the chart want to show. 
            title: {
                text: ''
            },
            ///工具箱
            toolbox: {
                show: true,
                itemSize: 20,
                feature: {
                    mark: { show: true },
                    restore: { show: true },
                    saveAsImage: { show: true }
                }
            },
           ///图例
            legend: {
                data: ['地面', '管点'],
                selectedMode: false
            },
            ///
            dataZoom: {
                show: true,
                start: 0,
                end: 100
            },
            grid: {
                backgroundColor: 'rgba(0,0,0,0)'
            },
            tooltip: {
                trigger: 'axis',
                formatter: function (params) {
                    //   console.log(params);
                    return "点号："+ this.soeAnalysisResult.Values[params[1].dataIndex].ID+'<br/>'+"埋深：" + this.depth[params[1].dataIndex].toFixed(2) + "m"+'<br/>'+"高程："+this.soeAnalysisResult.Values[params[1].dataIndex].Z.toFixed(2)+"m";
                }.bind(this)
            },
            //
            xAxis: {
                type: "value",//坐标类型
                // data: xAxisData,
                show: true,//是否显示
                position: 'bottom',//位置
                name: "距离", //坐标轴的名称
                nameLocation: 'end',//坐标轴名称位置
                nameTextStyle: {},// 
                boundaryGap: [0, 0],
                min: null,
                max: null,
                axisLabel: {
                    formatter: '{value}m'
                },
                splitArea: {
                    show: false
                }
            },
            yAxis: {
                name: "高程",
                type: 'value',
                scale: true,
                axisLabel: {
                    formatter: '{value}m'
                }
            },
            series: [
                {
                    name: "地面",
                    type: "line",
                    data: chartData.groundData,
                    itemStyle: {
                        normal: {
                            lineStyle: { type: "dotted", width: 2, color: "#060606" },//线样式
                            label: {
                                show: false,
                                formatter: function (params) {
                                    return '';
                                    //return params.data[1].toFixed(1);
                                }
                            }

                        }
                    }
                }, {
                    name: "节点",
                    type: "line",
                    data: chartData.pipeNodeData,
                    // itemStyle: {
                    //     normal: {
                    //         //点对应的文本
                    //         label: {
                    //             show: true,
                    //             formatter: function (params) {
                    //                 return this.soeAnalysisResult.Values[params.dataIndex].ID;
                    //             }.bind(this),
                    //             position: "bottom",
                    //             textStyle: {
                    //                 color: 'black',
                    //                 align: "right",
                    //                 baseline: "bottom",
                    //                 fontSize: '10px'

                    //             }


                    //         }
                    //     }


                    // }
                }
            ]

        }
        // use the option and data to show chart
        myChart.setOption(option);
    }
    //日期转换函数

    dateTransform(result, attribute: string) {

        for (var i = 0; i < result.features.length; i++) {
            var miliseconds = result.features[i].attributes[attribute];
            if (miliseconds != null) {
                var date = new Date(miliseconds);
                var year = date.getFullYear();
                var month = date.getMonth() + 1;
                var day = date.getDate();
                result.features[i].attributes[attribute] = year + "-" + month + "-" + day;
            }
        }

    }

    /**
* (方法说明)显示汇总信息
* @method (方法名)
* @for (所属类名)
* @param {(参数类型)} (参数名) (参数说明)
* @return {(返回值类型)} (返回值说明)
*/
    showSummary() {
        this.layerOids = [];
        //整理每个图层的oids
        var layerOids = [];
        for (var i = 0; i < this.soeAnalysisResult.Values.length; i++) {
            var layername, oid;
            if (this.soeAnalysisResult.Values[i].PipeLineNameDefinition.length > 0) {
                layername = this.soeAnalysisResult.Values[i].PipeLineNameDefinition.split(':')[0];
                oid = this.soeAnalysisResult.Values[i].PipeLineNameDefinition.split(':')[1];
            }
            else if (this.soeAnalysisResult.Values[i].PipePointNameDefinition.length > 0) {
                layername = this.soeAnalysisResult.Values[i].PipePointNameDefinition.split(':')[0];
                oid = this.soeAnalysisResult.Values[i].PipePointNameDefinition.split(':')[1];
            }
            if (layername !== undefined) {
                var index = _.findIndex(layerOids, function (o: any) { return o.layername == layername });
                if (index == -1) {
                    layerOids.push({ layername: layername, oids: [oid] });
                }
                else
                    layerOids[index].oids.push(oid);
            }
        }
        //整理每个图层的url
        if (this.layers == null)
            this.layers = this.findPipeLayers();
        for (var i = 0; i < layerOids.length; i++) {
            var index = _.findIndex(this.layers, function (o: any) { return o.name == layerOids[i].layername });
            if (index > -1) {
                layerOids[i].urlindex = this.layers[index].urlindex;
                layerOids[i].layerid = this.layers[index].id;
            }
        }
        this.layerOids = layerOids;
        //动态显示到界面
        $(".VerticalSectionAnalysis table tbody").empty();
        for (var i = 0; i < this.layerOids.length; i++) {
            var eleTbody = " <tr><td class=\" pick-pipe-type \" > " + this.layerOids[i].layername + " </td> <td class=\"pick-pipe-id\" " + ">" + this.layerOids[i].oids.length + "</td></tr>";
            $(eleTbody).appendTo($(".VerticalSectionAnalysis table tbody"));
        }
    }

    /**
   * (方法说明)查询剖面分析详情，支持多管线服务
   * @method (方法名)
   * @for (所属类名)
   * @param {(参数类型)} (参数名) (参数说明)
   * @return {(返回值类型)} (返回值说明)
   */
    getAllInfo() {
        var classValue = $(".AcrossSectionAnalysis button:eq(1)").attr("class");
        if (/disabled/.test(classValue)) {
            return;
        }
        $(".AcrossSectionAnalysis button:eq(1)").text('查询中。。')
        $(".AcrossSectionAnalysis button:eq(1)").addClass("disabled");
        //循环对各个图层进行查询
        if (this.layerOids.length > 0) {
            this.tables = [];
            this.tableCount = this.layerOids.length;
            this.indexLock = 0;
            for (var i = 0; i < this.layerOids.length; i++) {
                this.queryDetail(this.layerOids[i]);
            }
        }
    }

    queryDetail(param) {
        var strQueryurl = this.AppX.appConfig.gisResource.pipe.config[param.urlindex].url + "/" + param.layerid;
        var queryTask = new QueryTask(strQueryurl);
        var query = new Query();
        query.objectIds = param.oids;
        query.outFields = ["*"];
        queryTask.execute(query, function (result) {
            //设置每一张表的title/id/layerid 属性
            var table = {
                title: param.layername,
                id: param.urlindex * 100 + param.layerid,
                layerId: param.layerid,
                urlindex: param.urlindex,
                features: '',
                fieldAliases: ''
            }
            //transform the data format 
            this.dateTransform(result, "FINISHDATE");
            this.dateTransform(result, "REPAIRDATE");
            this.dateTransform(result, "WRITEDATE");
            this.dateTransform(result, "CHANGEDATE");
            this.dateTransform(result, "GASDATE");
            table.features = result.features;
            table.fieldAliases = result.fieldAliases;
            this.tables.push(table);
            this.indexLock++;
            if (this.tableCount <= this.indexLock) {
                this.boolQueryComplet = true;
                var tabs = {
                    tabs: this.tables
                }
                //show dataPanel
                this.AppX.runtimeConfig.dataPanel.show(tabs);
                $(".AcrossSectionAnalysis button:eq(1)").text('详细信息')
                $(".AcrossSectionAnalysis button:eq(1)").removeClass("disabled");
            }
        }.bind(this), function () {
            this.indexLock++;
            if (this.tableCount <= this.indexLock) {
                this.boolQueryComplet = true;
                var tabs = {
                    tabs: this.datas
                }
                //show dataPanel
                this.AppX.runtimeConfig.dataPanel.show(tabs);
                $(".AcrossSectionAnalysis button:eq(1)").text('详细信息')
                $(".AcrossSectionAnalysis button:eq(1)").removeClass("disabled");
            }
        }.bind(this));
    }
    /**
    * (方法说明)获取指定服务的图层
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    findPipeLayers() {
        var PipeMapSubLayers = [];
        if (this.AppX.appConfig.gisResource.pipe.config.length > 0) {
            for (var i = 0; i < this.AppX.appConfig.gisResource.pipe.config.length; i++) {
                var url = this.AppX.appConfig.gisResource.pipe.config[i].url;
                var mapname = this.AppX.appConfig.gisResource.pipe.config[i].name;
                var sublayers = this.findLayerInMap(mapname, i, url);
                if (sublayers != null && sublayers.length > 0) {
                    for (var j = 0; j < sublayers.length; j++) {
                        if (_.findIndex(PipeMapSubLayers, function (o: any) { return o.mapname == sublayers[j].mapname }) == -1) {
                            PipeMapSubLayers.push(sublayers[j]);
                        }
                    }
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
* (方法说明)获取指定服务的图层
* @method (方法名)
* @for (所属类名)
* @param {(参数类型)} (参数名) (参数说明)
* @return {(返回值类型)} (返回值说明)
*/
    findPipeLayersByIndex(i) {
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
        params.tolerance = 3;
        params.layerOption = IdentifyParameters.LAYER_OPTION_ALL;
        params.geometry = point;
        params.mapExtent = this.map.extent;
        params.width = this.map.width;
        params.returnGeometry = true;
        var layers = this.findPipeLayersByIndex(urlindex);
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
                    this.onIdentifyFinished(urlindex, results[targetIndex], point);
            }
        }.bind(this));
    }

    onIdentifyFinished(urlindex, result, mousepoint) {
        //获取离管线最近，并在管线上的点（及与管线相交的点）
        var nearestCoordinate = GeometryEngine.nearestCoordinate(result.feature.geometry, mousepoint);
        for (var i = 0; i < this.layerInfos.length; i++) {
            if (this.layerInfos[i].layername == result.layerName) {
                this.drawPoint.push(this.layerInfos[i].layerdbname);
            }
        }
        var point = new Point(nearestCoordinate.coordinate.x, nearestCoordinate.coordinate.y);
        this.drawPoint.push(point);
        if (this.drawPoint.length < 3) {
            var pointGraphic = new Graphic(point, this.objSymbol.startSimpleMarkeSymbol);
        } else {
            var pointGraphic = new Graphic(point, this.objSymbol.endSimpleMarkSymbol);
            this.map.setMapCursor("default");
            //执行纵剖面分析
            this.soeVerticalSectionAnalysis();
        }
        //添加绘制点图形
        this.AppX.runtimeConfig.map.graphics.add(pointGraphic);
    }
}