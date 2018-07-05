import BaseWidget = require('core/BaseWidget.class');
import Map = require('esri/map');
import BlankPanel = require('widgets/BlankPanel/Widget');
import Draw = require("esri/toolbars/draw");
import SimpleMarkerSymbol = require("esri/symbols/SimpleMarkerSymbol");
import SimpleLineSymbol = require("esri/symbols/SimpleLineSymbol");
import Color = require("esri/Color");
import Graphic = require("esri/graphic");
import QueryTask = require("esri/tasks/QueryTask");
import Query = require("esri/tasks/query");
import LayerInfo = require("esri/layers/LayerInfo");
import ArcGISDynamicMapServiceLayer = require("esri/layers/ArcGISDynamicMapServiceLayer");

declare var echarts;

export = AcrossSectionAnalysis;
/**
* Description:横剖面分析
* @class 
*/
class AcrossSectionAnalysis extends BaseWidget {
    baseClass = "AcrossSectionAnalysis";



    symbol; //保存绘制横剖线的样式
    drawTool: Draw = null;
    ifDraw: Boolean = false;
    drawPointCount: number = 0;//绘制的点数计数
    doubleClick: Boolean = false;
    doubleClickEvent = null;
    clickEvent = null;//保存地图点击事件
    drawEndEvent = null;//保存绘图结束事件

    pipeId = [];///管线的编号
    z = []; //地面高程
    distance = [];//距离   
    depth = []; //埋深   
    pipeZ = []; //管线高程   
    material = [];//材质
    diameter = [];//材质
    soeResult = null;//保存横剖面分析的结果
    layerInfos = [];
    layerIds = null;
    layerNames = [];
    table = null;
    datas = [];
    blankPanel = null; //  保存表格面板对象
    arrayPipeLineInfos = [];    //保存分析结果中各类管线名和对应的objecid,[{layerName:"name",objectId:[id1,id2]},...]   
    arrayQueryInput = []; //[{layerId:id,objectId:[id1,id2]},...]
    boolQueryComplet: Boolean = false;
    tableCount = 0; //每种管线为一张表，记录表的数量
    toast = null;
    map: Map;
    layers: any[] = null;
    indexLock = 0;//标记查询的个数
    layerOids = null;


    startup() {
        this.setHtml(_.template(this.template)({
            hello: this.config.hello + (/\/([a-zA-Z]+)$/g.exec(this.widgetPath)[1])
        }));
        this.acrossSectionAnalysisInit();
    }

    destroy() {
        this.domObj.remove();
        this.afterDestroy();
        this.setSymbol = null;
        this.backToInit();
    }
    acrossSectionAnalysisInit() {
        this.toast = this.AppX.runtimeConfig.toast;
        ///判断所需的服务是否存在
        if (this.AppX.appConfig.gisResource.pipe.config.length == 0) {
            this.AppX.runtimeConfig.toast.Show('获取分析服务出错！');
        } else {
            //横剖面分析接口地址
            this.config.url = this.AppX.appConfig.gisResource.pipe.config[0].url + this.config.url;
            //加载的地图服务的管网图层地址
            this.config.findTaskUrl = this.AppX.appConfig.gisResource.pipe.config[0].url;
            //
            this.config.getLayerInfoUrl = this.AppX.appConfig.gisResource.pipe.config[0].url + this.config.getLayerInfoUrl;
            //
            this.config.baseLayerUrl = this.AppX.appConfig.gisResource.pipe.config[0].url;
            //设置绘制横剖线的样式
            this.symbol = this.setSymbol();
            //获取管线的信息
            //this.getPipeInfo();
            //绑定绘制横剖线按钮点击事件
            $(".AcrossSectionAnalysis  button:first").on("click", this.drawLineCallBack.bind(this));
            // 绑定获取分析详细结果按钮单击事件
            $('.AcrossSectionAnalysis  button:eq(1)').on("click", this.getAllInfo.bind(this));
        }
    }
    //回到模块打开的初始状态，清除运行过程产生的全局变量值，事件，添加的HTML元素
    backToInit() {
        //全局变量
        {
            //获取地图控件对象
            this.map = this.AppX.runtimeConfig.map;
            this.drawPointCount = 0;//绘制点数的数目
            this.soeResult = null;
            this.z = [];
            this.distance = [];
            this.depth = [];
            this.pipeZ = [];
            this.diameter = [];
            this.material = [];
            //清空保存的分析结果信息
            this.arrayPipeLineInfos = [];
            //清空保存的分析结果管线类别的中文名
            this.layerNames = [];
            //清空保存的分析结果的图表信息
            this.datas = [];
            //将表记录数归0
            this.tableCount = 0;
            this.ifDraw = false;
            if (this.drawTool != null) {
                //关闭绘图工具
                this.drawTool.deactivate();
            }
            //清空保存绘图工具的变量
            this.drawTool = null;
        }
        //事件
        {
            if (this.clickEvent != null) {
                this.clickEvent.remove();//移除地图单击事件
            }
            if (this.drawEndEvent != null) {
                //移除绘制完成事件
                this.drawEndEvent.remove();
            }
        }
        //HTML元素
        {
            //关闭上一次分析展现的数据面板和图表(如果存在)
            if (this.AppX.runtimeConfig.dataPanel != null) {
                this.AppX.runtimeConfig.dataPanel.close();
            }

            if (this.blankPanel != null) {
                this.blankPanel.Destroy();
            }
            //清除绘制的图形
            this.AppX.runtimeConfig.map.graphics.clear();
        }
    }


    setSymbol() {
        var symbol = {
            simpleMarkeSymbol: null,
            simpleLineSymbol: null
        }
        symbol.simpleMarkeSymbol = new SimpleMarkerSymbol({
            color: new Color("#ff00ff"),
            size: 11,
            style: SimpleMarkerSymbol.STYLE_DIAMOND,
            outline: {
                color: new Color("#00ff00"),
                width: 1,

            }
        });
        symbol.simpleLineSymbol = new SimpleLineSymbol({
            color: new Color("#00ff00"),
            style: "solid",   //线的样式 dash|dash-dot|solid等	
            width: 1
        });
        return symbol;

    }

    getPipeInfo() {
        //获取所有管线的id
        var Ids = [];
        var visibleLayer = this.AppX.runtimeConfig.map.getLayersVisibleAtScale();
        for (var i = 0; i < visibleLayer.length; i++) {
            if (/PIPE/.test(visibleLayer[i].url)) {
                Ids = visibleLayer[i].visibleLayers;
                Ids.shift();
            }

        }
        $.ajax({
            type: "get",
            url: this.config.getLayerInfoUrl,
            data: {
                usertoken: this.AppX.appConfig.usertoken,
                layerids: "[" + Ids.toString() + "]",
                f: "pjson"
            },
            success: this.ajaxGetLayerInfo.bind(this),
            dataType: "json",
            async: false

        });
    }
    ajaxGetLayerInfo(result) {
        //
        this.layerInfos = result.result.rows;


        //如果管线图层中为管线，则添加相应HTML元素，用于记录分析结果中对象管线的数量。
        for (var i = 0; i < this.layerInfos.length; i++) {

            if (this.layerInfos[i].geometrytype == "esriGeometryPolyline") {

                var eleTbody = " <tr><td class=\" pick-pipe-type \" > " + this.layerInfos[i].layername + " </td> <td class=\"pick-pipe-id\" type=" + this.layerInfos[i].layerdbname + ">0</td></tr>";
                $(eleTbody).appendTo($(".AcrossSectionAnalysis table tbody"));

            }
        }

    }


    //点击绘制横剖面线按钮的回调函数（）
    drawLineCallBack() {
        //回到初始状态
        this.backToInit();
        // //关闭上一次分析展现的数据面板和图表(如果存在)
        // //清除绘制的图形
        // this.AppX.runtimeConfig.map.graphics.clear();
        //设置获取分析结果按钮不可点击
        $(".AcrossSectionAnalysis button:eq(1)").addClass("disabled");
        // // //将表记录数归0
        // this.tableCount = 0;
        if (this.ifDraw) {
            return;
        }
        //初始化绘图工具
        this.drawTool = new Draw(this.AppX.runtimeConfig.map);
        //激活绘点工具
        this.drawTool.activate(Draw.POLYLINE);
        //添加地图点击事件
        this.clickEvent = this.AppX.runtimeConfig.map.on("click", this.mapClickCallBack.bind(this));
        //添加绘制完毕事件
        this.drawEndEvent = this.drawTool.on("draw-complete", this.drawEndCallBack.bind(this));
        this.ifDraw = true;
    }

    //地图单击回调函数，绘制两个点后激活绘制结束事件
    mapClickCallBack() {
        if (this.ifDraw == true) {//绘图工具是否激活
            //绘制点数计数
            this.drawPointCount++;
            if (this.drawPointCount % 2 == 0) {
                //结束绘制
                this.drawTool.finishDrawing();
                //关闭绘图工具
                this.drawTool.deactivate();
            }
        }
    }

    drawEndCallBack(event) {
        this.ifDraw = false;
        //添加绘制图形
        this.AppX.runtimeConfig.map.graphics.add(new Graphic(event.geometry, this.symbol.simpleLineSymbol));
        //获取起点和终点坐标
        var startPoint = event.geometry.paths[0][0];
        var endPoint = event.geometry.paths[0][1];
        //发送横剖面分析请求
        this.sendAnlysisRequest(startPoint, endPoint);
    }

    //根据给定的横剖面接口发送分析请求
    sendAnlysisRequest(startPoint, endPoint) {//起点和终点
        //发送横剖面分析请求
        $.ajax({
            type: "get",
            url: this.config.url,
            data: {
                UserToken: this.AppX.appConfig.usertoken,
                X1: startPoint[0],//起点投影X坐标
                Y1: startPoint[1],
                X2: endPoint[0],//终点投影X坐标
                Y2: endPoint[1],
                f: "pjson"
            },
            success: this.ajaxCallBack.bind(this),
            dataType: "json"
        });
        this.AppX.runtimeConfig.loadMask.Show();
    }


    ajaxCallBack(result) {
        this.AppX.runtimeConfig.loadMask.Hide();
        //移除查看详细信息不可点击
        $(".AcrossSectionAnalysis button:eq(1)").removeClass("disabled");
        ///分析失败处理
        if (result.Status != 'successed') {
            this.toast.Show("横剖面分析失败！");
            return;
        }
        if (result.Values.length == 0) {
            this.toast.Show("横剖面分析失败,缺少必要属性！");
            return;
        }
        ///保存分析结果到变量soeResult
        this.soeResult = result;
        //显示汇总信息
        this.showSummary();
        //this.getAnalysisResultLayerId();

        for (var i = 0; i < result.Values.length; i++) {
            var currentResult = result.Values[i];//结果中当前管线的信息
            this.pipeId.push(currentResult.ID);//管线编号
            this.z.push(currentResult.ZGround);//地面高程
            this.distance.push(currentResult.Distance);//离绘制起点的距离
            this.depth.push(currentResult.Depth * 8);//埋深--wj管点图与纵轴不能匹配,错误.
            this.pipeZ.push(currentResult.Z);//管线高程
            this.diameter.push(currentResult.Diameter);//管径大小
            this.material.push(currentResult.Material);//材质
        }
        //添加分析结果图表
        this.addDataPanel();
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
        for (var i = 0; i < this.soeResult.Values.length; i++) {
            var layername, oid;
            if (this.soeResult.Values[i].PipeLineNameDefinition.length > 0) {
                layername = this.soeResult.Values[i].PipeLineNameDefinition.split(':')[0];
                oid = this.soeResult.Values[i].PipeLineNameDefinition.split(':')[1];
            }
            else if (this.soeResult.Values[i].PipePointNameDefinition.length > 0) {
                layername = this.soeResult.Values[i].PipePointNameDefinition.split(':')[0];
                oid = this.soeResult.Values[i].PipePointNameDefinition.split(':')[1];
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
        $(".AcrossSectionAnalysis table tbody").empty();
        for (var i = 0; i < this.layerOids.length; i++) {
            var eleTbody = " <tr><td class=\" pick-pipe-type \" > " + this.layerOids[i].layername + " </td> <td class=\"pick-pipe-id\" " + ">" + this.layerOids[i].oids.length + "</td></tr>";
            $(eleTbody).appendTo($(".AcrossSectionAnalysis table tbody"));
        }
    }

    addDataPanel() {
        var html: string = "<div></div>";
        this.blankPanel = new BlankPanel({
            id: "AcrossSectionAnalysis",
            title: "横剖面分析结果",
            html: html,
            width: this.config.dataPanel.width,
            height: this.config.dataPanel.height,
            readyCallback: this.onBlankPanelReady.bind(this)
        });
    }
    onBlankPanelReady() {
        //地面高程折线图，横坐标为距离，纵坐标为地面高程
        var lineData = [];
        for (var i = 0; i < this.z.length; i++) {
            var point = [];
            point.push(this.distance[i]);
            point.push(this.z[i]);
            lineData.push(point);
        }

        //管点散点图，横坐标为距离，纵坐标为管线高程
        var scatterData = [];
        for (var i = 0; i < this.z.length; i++) {
            var point = [];
            point.push(this.distance[i]);
            point.push(this.pipeZ[i]);// - (this.depth[i])
            scatterData.push(point);
        }

        $("<div class=\"AcrossSectionAnalysis-charts\"></div>").appendTo($("#AcrossSectionAnalysis .panel-body"));
        var myChart = echarts.init($("#AcrossSectionAnalysis .panel-body .AcrossSectionAnalysis-charts")[0], 'macarons');
        // 指定图表的配置项和数据
        var option = {
            title: {
                text: ''
            },

            legend: {
                data: ['地面', '管点'],
                selectedMode: false
            },
            toolbox: {
                show: true,
                itemSize: 20,
                feature: {
                    mark: { show: true },
                    restore: { show: true },
                    saveAsImage: { show: true }
                }
            },
            dataZoom: {
                show: true,
                start: 0,
                end: 100
            },
            tooltip: {
                trigger: 'item',
                formatter: function (params) {
                    if (params.seriesName == "地面") {
                        return "地面点高程：" + this.z[params.dataIndex].toFixed(2);
                    } else if (params[0].seriesName == "管点") {
                        return "管径：" + this.diameter[params[0].dataIndex] + '<br/>' + "材质:" + this.material[params[0].dataIndex] + '<br/>' + "埋深:" + this.depth[params[0].dataIndex].toFixed(2) / 8;
                    }


                }.bind(this)
            },
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
                splitLine: {
                    show: false,
                    color: "#00ff00"
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
                },
                splitArea: {
                    show: false
                }
            },
            series: [

                {
                    name: "管点",
                    type: 'scatter',
                    tooltip: {
                        trigger: 'axis',
                    },

                    legendHoverLink: true,
                    symbol: 'emptyCircle',
                    symbolSize: function (value) {

                        var index;
                        for (var i = 0; i < scatterData.length; i++) {
                            if (scatterData[i][1] == value[1]) {
                                index = i;
                            }
                        }
                        return (this.diameter[index] / 10);

                    }.bind(this),
                    itemStyle: {
                        normal: {
                            color: 'red',
                            borderWidth: 2,
                            borderColor: "#070707",
                            //点对应的文本
                            label: {
                                show: true,
                                formatter: function (params) {//
                                    return this.pipeId[params.dataIndex];
                                }.bind(this)
                                ,
                                position: "bottom",
                                textStyle: {
                                    color: 'black',
                                    align: "right",
                                    baseline: "bottom",
                                    fontSize: '10px'

                                },


                            }

                        },
                        emphasis: {
                            color: '#aa0000',
                            borderWidth: 2,
                            borderColor: "#070707"
                        }
                    },
                    data: scatterData,


                }


                , {
                    name: '地面',
                    type: 'line',
                    clickable: true,//数据图形是否可点击，默认开启，如果没有click事件响应可以关闭
                    // itemStyle: null,
                    data: lineData,
                    markePoint: {},

                    itemStyle: {
                        normal: {
                            lineStyle: { width: 2, color: "#aaaaaa" },//线样式
                            areaStyle: { color: "#AE6F39", type: 'default' },
                            label: {
                                show: true,
                                formatter: function (params) {
                                    if (params.data[0] < (this.distance[params.dataIndex - 1] + 5) && params.dataIndex > 0) {
                                        var blank = "";
                                        return blank;
                                    } else {
                                        return params.data[1].toFixed(1);
                                    }

                                }.bind(this)
                            }

                        }
                    },
                    markeLine: {
                        data: [
                            { type: 'average', name: "平均高程" }
                        ]
                    },

                    stack: null,//
                    xAxisIndexs: 0,
                    yAxisIndex: 0,
                    symbol: null,//'circle' | 'rectangle' | 'triangle' | 'diamond' |'emptyCircle' | 'emptyRectangle' | 'emptyTriangle' | 'emptyDiamond'
                    symbolSize: 2 | 4,
                    symbolRotate: null,// 	标志图形旋转角度[-180,180]
                    showAllSymbol: false,
                    // smooth: true, //smooth为true时lineStyle不支持虚线
                    dataFilter: 'nearst',//'nearest', 'min', 'max', 'average'
                    legendHoverLink: true//是否启用图例（legend）hover时的联动响应（高亮显示） 

                }

            ]
        };
        // 使用刚指定的配置项和数据显示图表。
        myChart.setOption(option);

    }

    //获取所有管线的名称和ID
    getAnalysisResultLayerId() {
        //保存分析结果中一类管线的所有objectId
        var objectIds = [];
        //第一个分析结果的管线名称和objectId
        var layerNameFirst = this.soeResult.Values[0].PipeLineDefinition.replace(/:\d+/, "");
        var objectIdFirst: string = this.soeResult.Values[0].PipeLineDefinition.match(/\d+/)[0];
        var arrayPipeLineInfo = {
            layerName: layerNameFirst,
            objectIds: [objectIdFirst]
        }
        this.arrayPipeLineInfos.push(arrayPipeLineInfo);
        for (var i = 1, length = this.soeResult.Values.length; i < length; i++) {
            //获取当前管线的管线名称
            var currentLayerPipeLineDefiniton = this.soeResult.Values[i].PipeLineDefinition;
            var currentLayerName = currentLayerPipeLineDefiniton.replace(/:\d+/, "");
            var currentLayerId = currentLayerPipeLineDefiniton.match(/\d+/)[0];
            var layerNameHasExist = false;
            //判断是否已经存在相同的管线名称
            for (var j = 0; j < this.arrayPipeLineInfos.length; j++) {
                if (this.arrayPipeLineInfos[j].layerName == currentLayerName) {
                    this.arrayPipeLineInfos[j].objectIds.push(currentLayerId);
                    layerNameHasExist = true;
                }
            }
            //不存在，就添加
            if (layerNameHasExist == false) {
                var currentArrayPipeLineInfo = {
                    layerName: currentLayerName,
                    objectIds: [currentLayerId]
                }
                this.arrayPipeLineInfos.push(currentArrayPipeLineInfo);
            }
        }
        //get the layerids
        this.getLayerIds();
    }

    getLayerIds() {
        for (var i = 0; i < this.arrayPipeLineInfos.length; i++) {
            var layerName = this.arrayPipeLineInfos[i].layerName;
            for (var j = 0; j < this.layerInfos.length; j++) {
                if (layerName.toLocaleUpperCase() == this.layerInfos[j].layerdbname) {

                    this.layerNames[i] = this.layerInfos[j].layername;
                    this.arrayPipeLineInfos[i].layerName = this.layerInfos[j].layerid;
                    //修改分析结果
                    var tbodyTd = $(".AcrossSectionAnalysis table tbody td[type='" + this.layerInfos[j].layerdbname + "']");
                    tbodyTd.text(this.arrayPipeLineInfos[i].objectIds.length);
                    j = this.layerInfos.length;
                }
            }
        }
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
        $(".AcrossSectionAnalysis button:eq(1)").text('查询中...')
        $(".AcrossSectionAnalysis button:eq(1)").addClass("disabled");

        //循环对各个图层进行查询
        if (this.layerOids.length > 0) {
            this.datas = [];
            this.tableCount = 0;
            for (var i = 0; i < this.layerOids.length; i++) {
                this.queryDetail(this.layerOids[i]);
            }
        }
    }
    /**
    * (方法说明)查询一个图层里指定oids的要素详情
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
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
            this.datas.push(table);
            this.tableCount++;
            if (this.tableCount >= this.layerOids.length) {
                this.boolQueryComplet = true;
                var tabs = {
                    tabs: this.datas
                }
                //show dataPanel
                this.AppX.runtimeConfig.dataPanel.show(tabs);
                $(".AcrossSectionAnalysis button:eq(1)").text('详细信息')
                $(".AcrossSectionAnalysis button:eq(1)").removeClass("disabled");
            }
        }.bind(this), function () {
            this.tableCount++;
            if (this.tableCount >= this.layerOids.length) {
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
}