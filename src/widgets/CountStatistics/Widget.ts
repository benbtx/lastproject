import BaseWidget = require('core/BaseWidget.class');

import GraphicsLayer = require('esri/layers/GraphicsLayer');
import FeatureLayer = require('esri/layers/FeatureLayer');
import QueryTask = require('esri/tasks/QueryTask');
import Query = require('esri/tasks/query');
import Point = require('esri/geometry/Point');
import Polyline = require('esri/geometry/Polyline');
import Polygon = require('esri/geometry/Polygon');
import SimpleMarkerSymbol = require('esri/symbols/SimpleMarkerSymbol');
import SimpleLineSymbol = require('esri/symbols/SimpleLineSymbol');
import SimpleFillSymbol = require('esri/symbols/SimpleFillSymbol');
import Graphic = require('esri/graphic');
import ScreenPoint = require('esri/geometry/ScreenPoint');
import SpatialReference = require('esri/SpatialReference');
import Color = require('esri/Color');
import Draw = require('esri/toolbars/draw');
import BlankPanel = require('widgets/BlankPanel/Widget');
declare var echarts;


export = CountStatistics;

class CountStatistics extends BaseWidget {
    baseClass: string = "wideget-CountStatistics";
    pipeServicePath = "";
    map = null;
    layers = [];
    currentid: number;
    CurPoint = null;
    layersData: any = [];
    selectlayersid = [];
    selectfieldsid = [];
    selectlayers = [];
    glayer = new GraphicsLayer;
    clickPoints = [];
    latestPoint = null;
    staResult = null;
    queryFields = [];
    jsongeometry = null;
    chartTemplate = "";
    graphdata = [];
    blankPanels = null;
    Chart = null;
    toast = null;

    //柱状
    ChartOption = null;
    alllayersbardata = [];//所有当前查询图层的柱状图图层数组：每个对象包含一个图层名和柱状图数据对象（bar_dataZoom-bar_yAxis等属性）
    CurCharts = [];






    startup() {
        this.onPanelInit();
    }
    onPanelInit() {
        this.map = this.AppX.runtimeConfig.map;
        this.toast = this.AppX.runtimeConfig.toast;
        //this.pipeServicePath = this.AppX.appConfig.gisResource.pipe.config[0].url;
        if (this.AppX.appConfig.gisResource.pipe.config[0] == undefined) {
            this.toast.Show("管线服务未配置到config！");
            return;
        } else {
            this.pipeServicePath = this.AppX.appConfig.gisResource.pipe.config[0].url;
        }
        var idsdata = this.findLayerInMap(this.pipeServicePath);
        if (idsdata.length == 0) {
            this.toast.Show("管线图层无数据！");
            return;
        }
        // var idsdata = this.getPipeMapSubLayers();
        //构建图层信息
        $.ajax({
            url: this.pipeServicePath + this.config.LayerName,
            data: {
                usertoken: this.AppX.appConfig.usertoken,
                layerids: JSON.stringify(idsdata),
                f: "pjson"
            },
            success: this.queryLayerNameCallback.bind(this),
            dataType: "json",
        });
    }


    //获取管线图层子图层
    private findLayerInMap(url) {
        var sublayerids = [];
        for (var i = 0; i < this.map.layerIds.length; i++) {
            var layer = this.map.getLayer(this.map.layerIds[i]);
            if (layer.url && layer.url == url) {
                if (layer.layerInfos.length != 0) {
                    layer.layerInfos.forEach(function (item, layerindex) {
                        var layerId = item.id;
                        if (item.subLayerIds) {
                        } else {
                            sublayerids.push(layerId);
                        }
                    });
                }
                return sublayerids;
            }
        }
        return null;
    }



    queryLayerNameCallback(data) {
        var that = this;
        if (data.code == 10000) {
            // = data.result.rows;
            //遍历出数量统计所需图层
            data.result.rows.forEach(function (item, i) {
                that.layersData.push(item);
            });

            var layerdata = {
                layers: this.layersData
            }
            var htmlString = _.template(this.template)(layerdata);
            var ids = [];
            ids.push(that.layersData[0].layerid);

            //默认选中第一个
            $.ajax({
                url: this.pipeServicePath + this.config.fieldIntersect,
                data: {
                    usertoken: this.AppX.appConfig.usertoken,
                    layerids: JSON.stringify(ids),
                    f: "pjson"
                },
                success: this.queryfieldIntersectCallback.bind(this),
                dataType: "json",
            });

            // //设置面板内容
            this.setHtml(htmlString);
            this.domObj = $('.' + this.baseClass);
            //默认选中第一个layersid中相应加入
            this.domObj.find("input").first().attr({ checked: "checked" });
            this.selectlayersid.push(that.layersData[0].layerid);
            this.initEvent();



            this.initCreateSql();
            this.initCreateSqlEvent();



        } else {
            that.toast.Show("查询出错！请检查");
            console.log(data.error);
        }
    }


    initEvent() {

        var that = this;
        //初始化左侧checkbox事件
        this.domObj.delegate(".check", "change", function () {
            //动态生成构造语句图层
            that.initCreateSql();

            //   that.IDS=[];
            // //如果选中则加入ids,否则删除当前id
            //删除左侧selectfieldsid,获取selectlayersid，并生成右侧属性
            that.selectfieldsid = [];
            that.selectlayersid = [];
            var ids = new Array();
            var checkedObjs = that.domObj.find('.count_layers input:checked');
            ids = <any>checkedObjs.map((index, item: any) => {
                return parseInt(item.name);
            });
            for (var i = 0; i < ids.length; i++) {
                that.selectlayersid.push(ids[i]);
            }
            if (that.selectlayersid.length == 0) {
                that.domObj.find(".count_attribution li").remove();
                return;
            }
            $.ajax({
                url: that.pipeServicePath + that.config.fieldIntersect,
                data: {
                    usertoken: that.AppX.appConfig.usertoken,
                    layerids: JSON.stringify(that.selectlayersid),
                    f: "pjson"
                },
                success: that.queryfieldIntersectCallback.bind(that),
                dataType: "json",
            });



        }.bind(this));

        //初始化清除事件
        this.domObj.delegate(".count_clear", "click", function () {
            that.domObj.find(".count_filter").val("");
        });


        //初始化绘制范围事件
        this.glayer.clear();
        this.map.addLayer(this.glayer);
        this.domObj.find(".count_range").on("click", function () {

            //that.AppX.runtimeConfig.map.graphics.clear();
            var drawToolbar = new Draw(that.AppX.runtimeConfig.map);
            drawToolbar.activate(Draw.POLYGON);
            drawToolbar.on("draw-end", function (evt) {
                var graphic = new Graphic(evt.geometry, new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
                    new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASHDOT,
                        new Color([255, 0, 0]), 2), new Color([0, 0, 0, 0.1])
                ));
                that.jsongeometry = evt.geometry.toJson();
                that.glayer.clear();
                that.glayer.add(graphic);
                drawToolbar.deactivate();
            }.bind(that));
        });

        //清空绘制范围count_clearRange
        this.domObj.find(".count_clearRange").on("click", function () {
            that.glayer.clear();
            that.jsongeometry = null;
        });


        //初始化统计事件
        this.domObj.find(".CountStatistics").on("click", function () {
            if (that.domObj.find(".CountStatistics").hasClass('disabled')) {
                return;
            }
            if (that.blankPanels != null) {
                // $("#" + that.blankPanels.id).remove();
                that.blankPanels.Destroy();
            }
            if (that.selectlayersid.length == 0) {
                that.toast.Show("请先设置统计图层！");

            } else {
                (<any>that.domObj.find(".CountStatistics")).button('analyze');
                //显示进度，按钮不可用
                that.domObj.find(".CountStatistics").addClass('disabled');
                // that.domObj.find(".CountStatistics").attr({ "disabled": "disabled" });
                //清空上一次查询数据
                that.alllayersbardata = [];
                that.CurCharts = [];
                // 执行SOE服务
                $.ajax({
                    url: that.pipeServicePath + that.config.CountstatisticService,
                    data: {
                        usertoken: that.AppX.appConfig.usertoken,
                        layerids: JSON.stringify(that.selectlayersid),
                        group_fields: JSON.stringify(that.selectfieldsid),
                        statistic_field: "OBJECTID",
                        statistic_type: 1,
                        // where: "MATERIAL='钢' or MATERIAL='PE'",
                        // geometry: JSON.stringify(this.jsongeometry),
                        where: $(".count_filter").val(),
                        geometry: JSON.stringify(that.jsongeometry),
                        f: "pjson"
                    },
                    success: that.CountStatisticsCallback.bind(that),
                    dataType: "json"
                });
            }
        });

    }


    queryfieldIntersectCallback(data) {
        var that = this;
        if (data.code == 10000) {
            this.domObj.find(".count_attribution li").remove();
            var strattribution = "";
            $.each(data.result.rows, function (i, value) {
                var index = that.config.VisibleField.indexOf(value.name);
                if (index > -1) {
                    strattribution += "<li ><div class=\"checkbox check2\"><label><input type=checkbox  name=" + value.name + "  value=" + value.alias + ">" + value.alias + " </label></div></li></option>";
                }
            });
            this.domObj.find(".count_attribution").append(strattribution);
            //初始化右侧checkbox事件
            that.domObj.delegate(".check2", "change", function () {
                //获取selectfieldsid
                that.selectfieldsid = [];
                var fields = null;
                var checkedObjs = that.domObj.find('.count_attribution input:checked');
                fields = <any>checkedObjs.map((index, item: any) => {
                    return item.name;
                });
                for (var i = 0; i < fields.length; i++) {
                    that.selectfieldsid.push(fields[i]);
                }
                //获取select2对应的中文名
                that.queryFields = [];
                var querys = null;
                querys = <any>checkedObjs.map((index, item: any) => {
                    return item.value;
                });
                for (var i = 0; i < querys.length; i++) {
                    that.queryFields.push(querys[i]);
                }
            });
        } else {
            that.toast.Show("查询共有字段出错！请检查");
            console.log(data.error);
        }

    }
    CountStatisticsCallback(data) {
        var that = this;
        if (data.code == 10000) {
            // console.log(data);
            var data2 = JSON.stringify(data);
            var data3 = data2.replace(/OBJECTID/g, "个数");
            for (var i = 0; i < that.selectfieldsid.length; i++) {
                var mb = that.selectfieldsid[i];
                data3 = data3.replace(new RegExp(mb, 'g'), that.queryFields[i]);
            }
            var data4 = JSON.parse(data3);

            //显示图表
            this.graphdata = this.createChartDataset(data4);
            if (this.graphdata.length < 1) { return; }
            this.createTemplate();


            //构造总计
            if (this.selectfieldsid.length > 0) {


                for (var i = 0; i < data4.result.rows.length; i++) {
                    //计算总算
                    var count = 0;
                    for (var k = 0; k < data.result.rows[i].rows.length; k++) {
                        count += data.result.rows[i].rows[k]["OBJECTID"];
                    }
                    var obj = {};
                    for (var j = 0; j < this.selectfieldsid.length; j++) {
                        if (j == 0) {
                            obj["总计"] = " 总计";
                        } else {
                            obj[this.selectfieldsid[j]] = "";
                        }
                    }
                    obj["合计"] = count;
                    data4.result.rows[i].rows.push(obj);
                }


            }
            //调用展示数据面板
            //显示列表
            this.showDataPanel(data4);

        } else {
            that.toast.Show("数量统计失败！请检查");
            console.log(data.error);
            that.domObj.find(".CountStatistics").removeClass('disabled');
            (<any>that.domObj.find(".CountStatistics")).button('reset');
        }
    }
    // 展示数据面板
    showDataPanel(results) {
        this.AppX.runtimeConfig.dataPanel.show(results);
    }


    createChartDataset(staticsdata) {
        //dataset为所有图层的数据
        // var dataset = data = a=b= [];
        var dataset = [];
        var layername = [];
        var data = [];
        var a = [];
        var b = [];
        a = _.values(staticsdata.result);
        $.each(a[0], function (index, item) {
            //收集图层名
            layername.push(item.layername);
            //每个图层生成一下data
            var l = item.rows.length;
            var xrow = "";
            for (var i = 0; i < l; i++) {
                b = _.values(item.rows[i]);
                var len = b.length;//一组的长度
                var value = 0;
                for (var k = 0; k < len; k++) {
                    if (k < len - 1) {
                        //替换空值""
                        if (b[k] == "" || b[k] == " ") {
                            b[k] = "<空>";
                        }
                        xrow = xrow + " " + b[k];
                    }
                    if (k == len - 1) {
                        value = parseInt(b[k]);

                        var row = { xvalue: xrow, yvalue: value }
                        data.push(row);
                    }
                }
                xrow = "";
            }

            dataset[index] = data;
            data = [];

        });

        dataset.push(layername);
        return dataset

    }

    createTemplate() {
        var that = this;
        $.ajax("widgets/CountStatistics/CountStatisticschart.html", {
            dataType: "text",
            success: function (data) {
                that.chartTemplate = data;
                //获取图层英文名
                that.selectlayers = [];//每次统计都清空
                var layer = that.domObj.find(".check input:checkbox:checked ");
                layer.each(function (i, item) {
                    that.selectlayers.push(item.getAttribute("layerdata"));
                });
                //装载数据
                var datalayers = {
                    layers: that.graphdata[that.graphdata.length - 1],
                    layershref: that.selectlayers
                }
                var htmlString = _.template(that.chartTemplate)(datalayers);
                that.showBlankPanel(htmlString);
            },
            error: function (XMLHttpRequest, textStatus, errorThrown) {
                that.bug("获取" + "./CountStatisticschart" + "失败:" + textStatus);
            }
        });
    }


    configChart(data, id, name) {
        var xdata = [];
        data.forEach(function (item) {
            xdata.push(item.xvalue.trim());

        });

        var chartid = $(".CountStatisticschart #" + id);
        // chartid.width(data.length * 100 <= 900 ? 900 : data.length * 120);
        chartid.width(chartid.parent().css("width"));
        chartid.height(280);
        this.Chart = echarts.init(chartid[0], 'macarons');
        var option = option = {
            title: {
            },
            tooltip: {
                trigger: 'axis'
            },
            toolbox: {
                show: true,
                right: '15',
                itemSize: 20,
                feature: {
                    mark: { show: true },
                    // dataView: { show: true, readOnly: false },
                    // magicType: { show: true, type: ['line', 'bar'] },
                    magicType: { show: true, type: [] },
                    //自定义饼图
                    myTool1: {
                        show: true,
                        title: '饼图',
                        icon: 'image://./widgets/CountStatistics/images/pie.png',
                        onclick: function () {
                            var layerid = $(".CountStatisticschart .active a").attr("href").substr(1, $(".CountStatisticschart .active a").attr("href").length);//layerid="PIPESECTIONMP"
                            //this.Chart._dom.id
                            if (layerid == this.Chart._dom.id) {
                                //当前活动页和chart所在元素相同时，可直接操作
                                var tooltip = {
                                    formatter: "{b} : {c} ({d}%)"
                                }
                                var serise = {
                                    type: 'pie',
                                    radius: '70%',
                                    center: ['50%', '60%'],
                                    data: [
                                        { value: 335, name: '直接访问' },
                                        { value: 310, name: '邮件营销' },
                                        { value: 234, name: '联盟广告' },
                                        { value: 135, name: '视频广告' },
                                        { value: 1548, name: '搜索引擎' }
                                    ],
                                    itemStyle: {
                                        emphasis: {
                                            shadowBlur: 10,
                                            shadowOffsetX: 0,
                                            shadowColor: 'rgba(0, 0, 0, 0.1)'
                                        }
                                    }
                                }

                                var piedata = [];
                                for (var i = 0; i < this.alllayersbardata.length; i++) {
                                    if (this.alllayersbardata[i].name == layerid) {
                                        if (this.alllayersbardata[i].xAxis[0].data.length > 0 && this.alllayersbardata[i].series[0].data.length > 0) {
                                            for (var x = 0; x < this.alllayersbardata[i].xAxis[0].data.length; x++) {
                                                for (var y = 0; y < this.alllayersbardata[i].series[0].data.length; y++) {
                                                    if (x == y) {
                                                        piedata.push({ value: this.alllayersbardata[i].series[0].data[y], name: this.alllayersbardata[i].xAxis[0].data[x] });
                                                    }
                                                }
                                            }
                                        }

                                    }
                                }

                                serise.data = piedata;

                                //删除对象对象属性
                                delete this.ChartOption.dataZoom;
                                delete this.ChartOption.grid;
                                delete this.ChartOption.xAxis;
                                delete this.ChartOption.yAxis;

                                this.ChartOption.tooltip = tooltip;

                                this.ChartOption.series = serise;
                                this.Chart.setOption(this.ChartOption, true);
                            } else {
                                //重新找打当前活动页所属chart，及chartoption
                                var chartid = $(".CountStatisticschart #" + layerid);
                                this.Chart = echarts.init(chartid[0], 'macarons');


                                var tooltip = {
                                    formatter: "{b} : {c} ({d}%)"
                                }
                                var serise = {
                                    type: 'pie',
                                    radius: '70%',
                                    center: ['50%', '60%'],
                                    data: [
                                        { value: 335, name: '直接访问' },
                                        { value: 310, name: '邮件营销' },
                                        { value: 234, name: '联盟广告' },
                                        { value: 135, name: '视频广告' },
                                        { value: 1548, name: '搜索引擎' }
                                    ],
                                    itemStyle: {
                                        emphasis: {
                                            shadowBlur: 10,
                                            shadowOffsetX: 0,
                                            shadowColor: 'rgba(0, 0, 0, 0.1)'
                                        }
                                    }
                                }


                                //为饼图重新赋值
                                //this.ChartOption.xAxis[0].data;
                                //this.ChartOption.series[0].data;
                                var piedata = [];
                                for (var i = 0; i < this.alllayersbardata.length; i++) {
                                    if (this.alllayersbardata[i].name == layerid) {
                                        if (this.alllayersbardata[i].xAxis[0].data.length > 0 && this.alllayersbardata[i].series[0].data.length > 0) {
                                            for (var x = 0; x < this.alllayersbardata[i].xAxis[0].data.length; x++) {
                                                for (var y = 0; y < this.alllayersbardata[i].series[0].data.length; y++) {
                                                    if (x == y) {
                                                        piedata.push({ value: this.alllayersbardata[i].series[0].data[y], name: this.alllayersbardata[i].xAxis[0].data[x] });
                                                    }
                                                }
                                            }
                                        }

                                    }
                                }


                                serise.data = piedata;

                                //删除对象对象属性
                                delete this.ChartOption.dataZoom;
                                delete this.ChartOption.grid;
                                delete this.ChartOption.xAxis;
                                delete this.ChartOption.yAxis;

                                this.ChartOption.tooltip = tooltip;

                                this.ChartOption.series = serise;
                                this.Chart.setOption(this.ChartOption, true);

                            }



                            //alert('myToolHandler2')
                        }.bind(this)
                    },
                    //自定义柱状图
                    myTool2: {
                        show: true,
                        title: '柱状图',
                        icon: 'image://./widgets/CountStatistics/images/bar.png',
                        onclick: function () {

                            var layerid = $(".CountStatisticschart .active a").attr("href").substr(1, $(".CountStatisticschart .active a").attr("href").length);//layerid="PIPESECTIONMP"
                            //this.Chart._dom.id
                            if (layerid == this.Chart._dom.id) {
                                //当前活动页和chart所在元素相同时，可直接操作
                                // delete this.ChartOption.series[0];
                                for (var i = 0; i < this.alllayersbardata.length; i++) {
                                    if (this.alllayersbardata[i].name == layerid) {

                                        this.ChartOption.dataZoom = this.alllayersbardata[i].dataZoom;
                                        this.ChartOption.grid = this.alllayersbardata[i].grid;
                                        this.ChartOption.series = this.alllayersbardata[i].series;
                                        this.ChartOption.series[0].type = "bar";
                                        this.ChartOption.title = this.alllayersbardata[i].title;
                                        this.ChartOption.toolbox = this.alllayersbardata[i].toolbox;
                                        this.ChartOption.tooltip = this.alllayersbardata[i].tooltip;
                                        this.ChartOption.xAxis = this.alllayersbardata[i].xAxis;
                                        this.ChartOption.yAxis = this.alllayersbardata[i].yAxis;


                                    }
                                }



                                this.Chart.setOption(this.ChartOption, true);
                            } else {
                                //重新找打当前活动页所属chart，及chartoption
                                var chartid = $(".CountStatisticschart #" + layerid);
                                this.Chart = echarts.init(chartid[0], 'macarons');
                                for (var i = 0; i < this.alllayersbardata.length; i++) {
                                    if (this.alllayersbardata[i].name == layerid) {
                                        this.ChartOption.dataZoom = this.alllayersbardata[i].dataZoom;
                                        this.ChartOption.grid = this.alllayersbardata[i].grid;
                                        this.ChartOption.series = this.alllayersbardata[i].series;
                                        this.ChartOption.series[0].type = "bar";
                                        this.ChartOption.title = this.alllayersbardata[i].title;
                                        this.ChartOption.toolbox = this.alllayersbardata[i].toolbox;
                                        this.ChartOption.tooltip = this.alllayersbardata[i].tooltip;
                                        this.ChartOption.xAxis = this.alllayersbardata[i].xAxis;
                                        this.ChartOption.yAxis = this.alllayersbardata[i].yAxis;
                                    }
                                }

                                this.Chart.setOption(this.ChartOption, true);

                            }



                            //alert('myToolHandler2')
                        }.bind(this)
                    },
                    //自定义折线图
                    myTool3: {
                        show: true,
                        title: '折线图',
                        icon: 'image://./widgets/CountStatistics/images/line.png',
                        onclick: function () {

                            var layerid = $(".CountStatisticschart .active a").attr("href").substr(1, $(".CountStatisticschart .active a").attr("href").length);//layerid="PIPESECTIONMP"
                            //this.Chart._dom.id
                            if (layerid == this.Chart._dom.id) {
                                //当前活动页和chart所在元素相同时，可直接操作
                                // delete this.ChartOption.series[0];
                                for (var i = 0; i < this.alllayersbardata.length; i++) {
                                    if (this.alllayersbardata[i].name == layerid) {

                                        this.ChartOption.dataZoom = this.alllayersbardata[i].dataZoom;
                                        this.ChartOption.grid = this.alllayersbardata[i].grid;
                                        this.ChartOption.series = this.alllayersbardata[i].series;
                                        this.ChartOption.series[0].type = "line";
                                        this.ChartOption.title = this.alllayersbardata[i].title;
                                        this.ChartOption.toolbox = this.alllayersbardata[i].toolbox;
                                        this.ChartOption.tooltip = this.alllayersbardata[i].tooltip;
                                        this.ChartOption.xAxis = this.alllayersbardata[i].xAxis;
                                        this.ChartOption.yAxis = this.alllayersbardata[i].yAxis;




                                    }
                                }



                                this.Chart.setOption(this.ChartOption, true);
                            } else {
                                //重新找打当前活动页所属chart，及chartoption
                                var chartid = $(".CountStatisticschart #" + layerid);
                                this.Chart = echarts.init(chartid[0], 'macarons');
                                for (var i = 0; i < this.alllayersbardata.length; i++) {
                                    if (this.alllayersbardata[i].name == layerid) {
                                        this.ChartOption.dataZoom = this.alllayersbardata[i].dataZoom;
                                        this.ChartOption.grid = this.alllayersbardata[i].grid;
                                        this.ChartOption.series = this.alllayersbardata[i].series;
                                        this.ChartOption.series[0].type = "line";
                                        this.ChartOption.title = this.alllayersbardata[i].title;
                                        this.ChartOption.toolbox = this.alllayersbardata[i].toolbox;
                                        this.ChartOption.tooltip = this.alllayersbardata[i].tooltip;
                                        this.ChartOption.xAxis = this.alllayersbardata[i].xAxis;
                                        this.ChartOption.yAxis = this.alllayersbardata[i].yAxis;
                                    }
                                }

                                this.Chart.setOption(this.ChartOption, true);

                            }



                            //alert('myToolHandler2')
                        }.bind(this)
                    },
                    // restore: { show: true },
                    saveAsImage: { show: true }
                }
            },
            calculable: true,
            xAxis: [
                {
                    type: 'category',
                    data: xdata.map(function (str) {
                        if (str.indexOf(" ") > 0) {
                            return str.replace(/\s+/g, "\n")
                        }
                        return str
                    }),
                    axisLabel: {
                        interval: 0,////横轴信息全部显示
                        rotate: 0,//60度角倾斜显示

                    },

                }
            ],

            grid: { // 控制图的大小，调整下面这些值就可以，
                x: 60,
                x2: 100,
                y2: 100,// y2可以控制 X轴跟Zoom控件之间的间隔，避免以为倾斜后造成 label重叠到zoom上
            },

            yAxis: [
                {
                    type: 'value',
                    name: '个数',
                }
            ],

            dataZoom: [
            ],

            series: [
                {
                    name: name,
                    type: 'bar',
                    data: [],
                    barWidth: 30,//柱图宽度
                    // markPoint: {
                    //     symbolSize: '95',
                    //     symbolOffset: [0, 5],
                    //     data: [
                    //         { type: 'max', name: '最大值' },
                    //         { type: 'min', name: '最小值' }
                    //     ],
                    //     label: {
                    //         normal: {
                    //             textStyle: { fontSize: 5 }
                    //         }
                    //     }
                    // },
                    // markLine: {
                    //     data: [
                    //         { type: 'average', name: '平均值' }
                    //     ]
                    // },
                    label: {
                        normal: {
                            show: true,
                            position: 'top'
                        }
                    },
                    itemStyle: {
                        normal: {
                            color: this.config.barcolor
                        }
                    }
                }
            ]
        };

        // option.xAxis[0].data = [];
        option.series[0].data = [];
        data.forEach(function (item) {
            // option.xAxis[0].data.push(item.xvalue);
            option.series[0].data.push(item.yvalue);
        });
        var max = Math.max.apply(null, option.series[0].data);
        option.yAxis[0].max = Math.floor(max * 1.2);
        //默认95重新设置气泡大小
        // if (max < 1000) {
        //     option.series[0].markPoint.symbolSize = 70;
        // }
        if (data.length > 3) {
            option.dataZoom.push({ show: true, start: 0, end: 100 });
            option.dataZoom.push({ type: 'inside', start: 0, end: 100 });
            option.dataZoom.push({ show: true, yAxisIndex: 0, filterMode: 'empty', width: 30, height: '80%', showDataShadow: false, left: '93%' });

        }
        this.Chart.setOption(option);
        this.ChartOption = option;
        //构造alllayersbardata数据
        this.alllayersbardata.push({ name: id, dataZoom: option.dataZoom, grid: option.grid, series: option.series, toolbox: option.toolbox, tooltip: option.tooltip, xAxis: option.xAxis, yAxis: option.yAxis });
        this.CurCharts.push(this.Chart);


    }



    showBlankPanel(htmlString) {
        this.blankPanels = new BlankPanel({
            id: "CountStatistics_tb",
            title: "数量统计",
            html: htmlString,
            width: 700,
            height: 380,
            readyCallback: this.onBlankPanelReady.bind(this)
        });
    }

    // BlankPanel 初始化完成后调用
    onBlankPanelReady() {
        for (var i = 0; i < this.graphdata.length - 1; i++) {
            this.configChart(this.graphdata[i], this.selectlayers[i], this.graphdata[this.graphdata.length - 1][i]);
        }
        // this.domObj.find(".CountStatistics").removeAttr("disabled");
        this.domObj.find(".CountStatistics").removeClass('disabled');
        (<any>this.domObj.find(".CountStatistics")).button('reset');
    }

    initCreateSql() {
        //清空历史选择
        this.domObj.find(".countstatisticlayers").empty();
        if (this.domObj.find("input:checkbox:checked").length == 0) {
            this.domObj.find(".countstatisticlayers").append("<option > </option>");
            this.domObj.find(".countstatisticfields").empty();
            return;
        } else {
            // this.domObj.find(".countstatisticlayers").append("<option > </option>");
        }
        //初始化查询图层
        var strcountstatisticlayers = "";
        $.each(this.domObj.find("input:checkbox"), function (index, item) {
            if (item.checked == true) {
                strcountstatisticlayers += "<option value=" + item.name + " > " + item.value + " </option>";
            }

        }.bind(this));
        this.domObj.find(".countstatisticlayers").append(strcountstatisticlayers);

        //初始化查询字段
        if (this.domObj.find("input:checkbox:checked").length > 0) {
            $.ajax({
                url: this.pipeServicePath + this.config.queryAlias,
                data: {
                    usertoken: this.AppX.appConfig.usertoken,
                    layerid: this.domObj.find("input:checkbox:checked").attr("name"),
                    f: "pjson"
                },
                success: this.queryAliasCallback.bind(this),
                dataType: "json"
            });
        }
    }
    initCreateSqlEvent() {
        //图层选择事件
        this.domObj.find(".countstatisticlayers").on("change", function () {
            this.domObj.find(".count_filter").val("");
            var selectedlayers = this.domObj.find(".countstatisticlayers option:selected");
            // 执行SOE服务
            $.ajax({
                url: this.pipeServicePath + this.config.queryAlias,
                data: {
                    usertoken: this.AppX.appConfig.usertoken,
                    layerid: selectedlayers.val(),
                    f: "pjson"
                },
                success: this.queryAliasCallback.bind(this),
                dataType: "json"
            });

        }.bind(this));


        //获取唯一值选择事件
        this.domObj.delegate(".countstatisticgetuniquevalue", "click", function () {

            if (this.domObj.find(".on").length == 0) {
                this.toast.Show("请选择一个属性字段！");
                return;
            }
            // 执行SOE服务
            this.domObj.find(".countstatisticgetuniquevalue").text("获取中...");
            $.ajax({
                url: this.pipeServicePath + this.config.getuniquevalue,
                data: {
                    usertoken: this.AppX.appConfig.usertoken,
                    layerid: this.domObj.find(".countstatisticlayers option:checked").val(),
                    field_name: this.domObj.find(".on").attr("id"),
                    f: "pjson"
                },
                success: this.getuniquevalueCallback.bind(this),
                dataType: "json"
            });

        }.bind(this));



        //字段双击选择事件
        this.domObj.delegate(".countstatisticfields", "dblclick", function () {
            this.domObj.find(".count_filter").val(this.domObj.find(".count_filter").val() + " " + this.domObj.find(".on").attr("id"));

        }.bind(this));




        //操作双击符选择事件
        var that = this;
        this.domObj.delegate(".countstatisticoperator", "click", function () {
            that.domObj.find(".count_filter").val(that.domObj.find(".count_filter").val() + " " + this.value);

        });

    }

    //回调函数
    queryAliasCallback(data) {

        if (data.code == 10000) {
            this.domObj.find(".countstatisticfields").empty();
            var attributionObj = this.domObj.find(".countstatisticfields")
            // attributionObj.append("<option></option>");
            if (data.result.rows.length == 0) {
                this.toast.Show("查询数据为空！");
                return;
            }
            var strcountcheckedfield = "";
            $.each(data.result.rows, function (i, value) {
                var index = this.config.shieldField.indexOf(value.name);
                if (index <= -1) {
                    // attributionObj.append("<li" + " " + "value=" + value.name + ">" + value.alias + "</li>");
                    //attributionObj.append("<li calss=list-group-item><div class=\"checkbox check2\"><label class=countcheckedfield   name=countsqlfield id=" + value.name + "" + " value=" + value.alias + " alt=" + value.alias + ">" + value.alias + " </label></div></li>");
                    strcountcheckedfield += "<li  class=\" checkbox check2 countcheckedfield\"   name=countsqlfield id=" + value.name + "" + " value=" + value.alias + " alt=" + value.alias + ">" + value.alias + "</li>";
                }
            }.bind(this));
            attributionObj.append(strcountcheckedfield);
            //字段单击选择事件
            var that = this;
            this.domObj.find(".countcheckedfield").off("click").on("click", function () {
                // that.domObj.find(".fields").addClass("on");
                that.domObj.find(".on").removeClass("on");
                $(this).addClass("on");
            });


        } else {
            // alert("查询出错，请检查");
            this.toast.Show("获取图层字段出错，请检查！");
            console.log(data.error);
        }
    }

    getuniquevalueCallback(data) {
        var uniqueValueObj = this.domObj.find(".countstatisticuniquevalue")
        var uniqueValueBtnObj = this.domObj.find(".countstatisticgetuniquevalue")
        if (data.code == 10000) {
            uniqueValueObj.empty();
            if (data.result.rows.length == 0) {
                uniqueValueBtnObj.text("获取唯一值");
                this.toast.Show("查询数据为空！");
                return;
            }
            var strli = "";
            $.each(data.result.rows, function (i, value) {
                if (/^(\d{1,4})(-|\/)(\d{1,2})\2(\d{1,2})$/g.test(value)) {
                    //匹配日期，加上timestamp  
                    var time = "timestamp'" + value + "'"
                    // uniqueValueObj.append("<option" + " " + "value=" + time + ">" + value + "</option>");
                    strli += "<li  class=\"checkbox check2\"><label class=countstatisticuniquefieldvalue data=timestamp>" + value + " </label></li>";
                } else if (value == " ") {
                    value = "' '";
                    strli += "<li  class=\"checkbox check2\"><label class=countstatisticuniquefieldvalue data=nullvalue>" + value + " </label></li>";
                } else {
                    // uniqueValueObj.append("<option" + " " + "value=" + value + ">" + value + "</option>");
                    strli += "<li  class=\"checkbox check2\"><label class=countstatisticuniquefieldvalue>" + value + " </label></li>";
                }
                if (i + 2 > this.config.uniquemaxnum) {
                    this.domObj.find(".countstatisticgetuniquevalue").text("获取");
                    this.toast.Show("默认只显示前" + this.config.uniquemaxnum + "条！");
                    return false;
                }
            }.bind(this));

            uniqueValueObj.append(strli);


            //唯一值双击选择事件
            var that = this;
            this.domObj.find(".countstatisticuniquefieldvalue").off("dblclick").on("dblclick", function () {
                if ($(this).attr("data") == "timestamp") {
                    that.domObj.find(".count_filter").val(that.domObj.find(".count_filter").val() + " " + " to_date(' " + this.innerText + " ','yyyy/mm/dd') ");
                } else if ($(this).attr("data") == "nullvalue") {

                    that.domObj.find(".count_filter").val(that.domObj.find(".count_filter").val() + " " + this.innerText.trim());
                } else {
                    that.domObj.find(".count_filter").val(that.domObj.find(".count_filter").val() + " " + "\'" + this.innerText.trim() + "\'");
                }
            });
            uniqueValueBtnObj.text("获取唯一值");

        } else {
            // alert("查询出错，请检查");
            uniqueValueBtnObj.text("获取唯一值");
            this.toast.Show("查询唯一值出错，请检查！");
            console.log(data.error);
        }
        //this.domObj.find(".getuniquevalue").text("获取");
    }




    destroy() {
        if (this.blankPanels != null) {
            this.blankPanels.Destroy();
        }
        this.glayer.clear();
        this.map.removeLayer(this.glayer);
        this.afterDestroy();
    }



}