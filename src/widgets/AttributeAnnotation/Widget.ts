import { IdentifyTaskOptions } from 'esri';

import BaseWidget = require('core/BaseWidget.class');
import ScreenPoint = require('esri/geometry/ScreenPoint');
import Point = require('esri/geometry/Point');
import GraphicsLayer = require('esri/layers/GraphicsLayer');
import SimpleLineSymbol = require('esri/symbols/SimpleLineSymbol');
import SimpleFillSymbol = require('esri/symbols/SimpleFillSymbol');
import Graphic = require('esri/graphic');
import Color = require('esri/Color');
import scaleUtils = require('esri/geometry/scaleUtils');
import SimpleMarkerSymbol = require('esri/symbols/SimpleMarkerSymbol');
import QueryTask = require('esri/tasks/QueryTask');
import Query = require("esri/tasks/query");
import IdentifyTask = require('esri/tasks/IdentifyTask');
import IdentifyParameters = require("esri/tasks/IdentifyParameters");
import SpatialReference = require("esri/SpatialReference");
import Extent = require("esri/geometry/Extent");
import Circle = require("esri/geometry/Circle");
import Draw = require("esri/toolbars/draw");


export = AttributeAnnotation;

class AttributeAnnotation extends BaseWidget {
    baseClass = "widget-AttributeAnnotation";
    pipeServicePath = "";
    map = null;
    toast = null;
    identifyTask = null;
    params = null; /***IdentifyTasK 参数  ***/
    map_click_handle = null;/***地图点击句柄 ***/
    glayer = new GraphicsLayer;/***查询结果显示图层 ***/
    tolerancelayer = new GraphicsLayer;/***容差层 ***/
    selectlayersid = [];
    PipeMapSubLayers: any = {};
    PipeMapSubLayers2 = [];
    visibleLayersId = [];//可见图层Ids
    islocate = true;//  //查询两个管线图层，默认之定位一次
    drawTool;//绘图工具对象
    drawEndEvent;//绘图结束事件对象
    zoomscale: number = 2000;

    startup() {
        this.domObj = $('.' + this.baseClass);
        //配置当前模块变量
        this.pipeServicePath = this.AppX.appConfig.gisResource.pipe.config[0].url;
        this.map = this.AppX.runtimeConfig.map;
        this.toast = this.AppX.runtimeConfig.toast;
        this.zoomscale = this.config.zoomscale;
        //定义地图鼠标样式
        this.map.setMapCursor(this.config.identifycursor);
        this.drawTool = new Draw(this.AppX.runtimeConfig.map);  //初始化绘图工具
        this.onPanelInit();
    }

    /**
    * (方法说明)初始化字段可见性设置面板，支持多管网服务
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    onPanelInit() {
        if (this.AppX.appConfig.gisResource.pipe.config.length > 0) {
            this.PipeMapSubLayers2 = [];
            for (var i = 0; i < this.AppX.appConfig.gisResource.pipe.config.length; i++) {
                var url = this.AppX.appConfig.gisResource.pipe.config[i].url;
                var sublayers = this.findLayerInMap(i, url);
                if (sublayers.length > 0) {
                    for (var j = 0; j < sublayers.length; j++) {
                        if (_.findIndex(this.PipeMapSubLayers2, function (o: any) { return o.name == sublayers[j].name }) == -1) {
                            this.PipeMapSubLayers2.push(sublayers[j]);
                        }
                    }
                }
            }
            if (this.PipeMapSubLayers2.length > 0) {
                var layerdata = {
                    layers: this.PipeMapSubLayers2
                }
                var htmlString = _.template(this.template)(layerdata);
                this.selectlayersid.push(this.PipeMapSubLayers2[0].id);
                var layername = this.PipeMapSubLayers2[0].name;

                //默认选中第一个
                $.ajax({
                    headers: {
                        'Authorization-Token': AppX.appConfig.usertoken
                    },
                    type: "POST",
                    traditional: true,
                    url: AppX.appConfig.apiroot.replace(/\/+$/, "") + this.config.fieldconfig,
                    data: {
                        layername: layername
                    },
                    async: true,
                    success: this.queryfieldCallback.bind(this),
                    error: function (data) {
                        console.error(data);
                    }.bind(this)
                });
                this.setHtml(htmlString);
            }
            this.initEvent();
        }
    }
    /**
    * (方法说明)从地图中获取图层信息,不用写到配置文件
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private findLayerInMap(urlindex, url) {
        var sublayers = [];
        for (var i = 0; i < this.map.layerIds.length; i++) {
            var layer = this.map.getLayer(this.map.layerIds[i]);
            if (layer.url && layer.url == url) {
                if (layer.layerInfos.length != 0) {
                    layer.layerInfos.forEach(function (item, layerindex) {
                        var layerId = item.id;
                        if (item.subLayerIds) {
                        } else {
                            item.urlindex = urlindex;
                            sublayers.push(item);
                        }
                    });
                }
                if (layer.layerInfos.length != 0) {
                    this.visibleLayersId = this.findLayerIDsInMap(url);
                }
                return sublayers;
            }
        }
        return null;
    }

    initEvent() {
        var that = this;
        this.glayer.clear();
        that.map.addLayer(this.glayer);
        this.tolerancelayer.clear();
        that.map.addLayer(this.tolerancelayer);
        this.domObj.on('click', '.btnselectall', this.onSelectallClick.bind(this))
            .on('click', '.btnunselectall', this.onUnSelectallClick.bind(this));
        // //初始化开关按钮
        // this.domObj.delegate(".onoffswitch-checkbox", "click", function () {
        //     that.glayer.clear();
        //     //mapview click 事件
        //     if (that.map_click_handle != null) {
        //         that.map_click_handle.remove();
        //     }
        //     //定义地图点击事件
        //     that.map_click_handle = that.map.on("click", that.executeIdentifyTask.bind(that));
        // })

        //定义地图点击事件
        that.map_click_handle = that.map.on("click", that.executeIdentifyTask.bind(that));

        //初始化Setting 中 图层选择事件
        this.domObj.delegate(".layers", "change", function () {
            //   that.IDS=[];
            // //如果选中则加入ids,否则删除当前id
            //获取selectlayersid，并生成右侧属性
            that.selectlayersid = [];
            var selectedlayers = that.domObj.find(".layers option:selected");
            var value = selectedlayers.val().trim();
            var layerid = value.split('/')[1];
            var urlindex = parseInt(value.split('/')[0]);
            $.ajax({
                headers: {
                    'Authorization-Token': AppX.appConfig.usertoken
                },
                type: "POST",
                traditional: true,
                url: AppX.appConfig.apiroot.replace(/\/+$/, "") + this.config.fieldconfig,
                data: {
                    layername: selectedlayers.text().trim(),
                },
                async: true,
                success: this.queryfieldCallback.bind(this),
                error: function (data) {
                    console.error(data);
                }.bind(this)
            });
        }.bind(this));
        //定义保存事件
        this.domObj.delegate(".btnsave", "click", function () {
            var selectedlayers = that.domObj.find(".layers option:selected");
            var layername = selectedlayers.text().trim();
            var fields = [];
            for (var i = 0; i < that.domObj.find(" #setting input:checkbox:checked").length; i++) {
                var fi = <any>that.domObj.find("  #setting  input:checkbox:checked")[i];
                var field = {
                    "name": fi.name,
                    "alias": fi.value,
                    "type": fi.alt,
                    "visible": true
                }
                fields.push(field);
            }
            //限制用户至少选择一个字段可见
            if (fields.length == 0) {
                that.toast.Show("请至少设置一个属性可见！");
                return;
            }

            $.ajax({
                headers: {
                    'Authorization-Token': AppX.appConfig.usertoken
                },
                type: "POST",
                // traditional: true,
                url: AppX.appConfig.apiroot.replace(/\/+$/, "") + that.config.fieldconfigset,
                data: {
                    layername: layername,
                    fields: fields,
                    f: "pjson"
                },
                // async: true,
                success: that.fieldconfigSetCallback.bind(that),
                dataType: "json",
            });
        });

        this.domObj.delegate(".btnreset", "click", function () {
            var selectedlayers = that.domObj.find(".layers option:selected");//" #setting input:checkbox:checked"
            var layername = selectedlayers.text().trim();
            var fields = [];

            $.ajax({
                headers: {
                    'Authorization-Token': AppX.appConfig.usertoken
                },
                type: "POST",
                // traditional: true,
                url: AppX.appConfig.apiroot.replace(/\/+$/, "") + that.config.fieldconfigset,
                data: {
                    layername: layername,
                    fields: fields,
                    f: "pjson"
                },
                // async: true,
                success: that.fieldconfigResetCallback.bind(that),
                dataType: "json",
            });
        });


        ///定义框选选择事件
        $('.chooseType').on('change', this.chooseTypeCallBack.bind(this))
        ///添加绘制完毕事件
        this.drawEndEvent = this.drawTool.on("draw-complete", this.drawEndCallBack.bind(this));

    }

    private onSelectallClick(event) {
        this.domObj.find(".visibleattribution input:checkbox").prop('checked', true);//("checked","true");
    }
    private onUnSelectallClick(event) {
        this.domObj.find(".visibleattribution input:checkbox").prop('checked', false);
    }
    ///框选按钮点击回调函数
    chooseTypeCallBack() {

        var target: HTMLInputElement = <HTMLInputElement>event.currentTarget;
        if (target.checked == false) {
            this.drawTool.deactivate() //关闭绘制工具
        } else {
            this.drawTool.activate(Draw.RECTANGLE); //激活绘制工具
        }
    }
    ///
    drawEndCallBack(event) {
        if (this.AppX.appConfig.gisResource.pipe.config.length > 0) {
            this.AppX.runtimeConfig.loadMask.Show("正在执行中，请耐心等待...");
            for (var i = 0; i < this.AppX.appConfig.gisResource.pipe.config.length; i++) {
                var url = this.AppX.appConfig.gisResource.pipe.config[i].url;
                ///清除点选的图形
                this.glayer.clear();
                this.tolerancelayer.clear();
                ///清除之前的结果
                this.domObj.find(".data").empty();
                var featurelist = this.domObj.find(".fields");
                featurelist.find(" li").remove();
                this.islocate = true;
                this.identifyOnMapserver(i, event.geometry);
            }
        }
    }
    private fieldconfigResetCallback(data) {
        if (data.code == 10000) {
            if (this.toast) {
                // this.domObj.find(" #setting input:checkbox:checked").prop("checked", false);
                var selectedlayers = this.domObj.find(".layers option:selected");
                $.ajax({
                    headers: {
                        'Authorization-Token': AppX.appConfig.usertoken
                    },
                    type: "POST",
                    traditional: true,
                    url: AppX.appConfig.apiroot.replace(/\/+$/, "") + this.config.fieldconfig,
                    data: {
                        layername: selectedlayers.text().trim(),
                    },
                    async: true,
                    success: this.queryfieldCallback.bind(this),
                    error: function (data) {
                        console.error(data);
                    }.bind(this)
                });
                this.toast.Show("恢复默认成功！");
            }
            this.AppX.runtimeConfig.fieldConfig.Reload();
        }
        else {
            if (this.toast) {
                this.toast.Show("恢复默认失败！请检查");
                console.log(data.error);
            }
        }
    }
    private fieldconfigSetCallback(data) {
        if (data.code == 10000) {
            if (this.toast) {
                this.toast.Show("保存成功！");
            }
            this.AppX.runtimeConfig.fieldConfig.Reload();
        }
        else {
            if (this.toast) {
                this.toast.Show("保存失败！请检查");
                console.log(data.error);
            }
        }
    }
    /**
    * (方法说明)以迭代方式查询所有管线服务
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    executeIdentifyTask(event) {
        this.glayer.clear();

        this.tolerancelayer.clear();
        //添加容差圆this.config.tolerance
        var cir = new Circle(event.mapPoint, {
            // "radius": 0.6 * 0.0039 * this.map.getScale()
            // "radius": 0.6 * 0.0035 * this.map.getScale()
            //"radius": 0.6 * 0.0025 * this.map.getScale()
            // "radius": 1 / 23 * 2.54 * this.map.getScale() / 100
            "radiusUnit":this.AppX.runtimeConfig.unit,//esri.Units.DECIMAL_DEGREES,
            "radius": this.distance2Map(event.screenPoint,this.config.tolerance)//(this.config.tolerance * 3 / 96) * 2.54 * (this.map.getScale() / 100)
        });
        var g = new Graphic(cir, new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
            new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                new Color([200, 0, 0]), 2), new Color([0, 0, 0, 0.3])
        ));
        //g.symbol = this.setSymbol(g.geometry.type);
        this.tolerancelayer.add(g);
        this.domObj.find(".data").empty();
        var featurelist = this.domObj.find(".fields");
        featurelist.find(" li").remove();
        this.islocate = true;
        if (this.AppX.appConfig.gisResource.pipe.config.length > 0) {
            this.AppX.runtimeConfig.loadMask.Show("正在执行中，请耐心等待...");
            for (var i = 0; i < this.AppX.appConfig.gisResource.pipe.config.length; i++) {
                var url = this.AppX.appConfig.gisResource.pipe.config[i].url;
                this.identifyOnMapserver(i, cir);//event.mapPoint//是哟个mapPoint时cir范围和查询结果范围有差异
            }
        }
    }
    /**
    * (方法说明)对指定地图服务进行查询
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    identifyOnMapserver(i, point) {
        var url = this.AppX.appConfig.gisResource.pipe.config[i].url;
        var identifyTask = new IdentifyTask(url);
        var params = new IdentifyParameters();
        params.tolerance = this.config.tolerance;
        params.layerOption = IdentifyParameters.LAYER_OPTION_ALL;
        params.geometry = point;
        params.mapExtent = this.map.extent;
        params.width = this.map.width;
        params.dpi = 96;
        //获取当前可见图层
        this.getVisibilityLayer(url);
        //如果包含父图层，就要去掉父图层
        if (this.visibleLayersId.indexOf(0) > -1) {
            this.visibleLayersId.splice(this.visibleLayersId.indexOf(0), 1);
        };
        params.layerIds = this.visibleLayersId;
        identifyTask.execute(params, function (results) {
            this.AppX.runtimeConfig.loadMask.Hide();
            if (results.length == 0) {
                return;
            }
            this.onIdentifyFinished(i, results);
        }.bind(this), function () {
            this.AppX.runtimeConfig.loadMask.Hide();
            this.toast.Show("查询数据失败!");
        }.bind(this));
    }

    onIdentifyFinished(urlindex, results) {
        var url = this.AppX.appConfig.gisResource.pipe.config[urlindex].url;
        var feature = this.domObj.find(".featureset");
        var featurelist = this.domObj.find(".fields");
        //方案二，滾動列表 

        $.each(results, function (i, item) {
            if (i == 0) {
                //第一个要素：添加到checkbox,高亮定位，根据设置构造table
                featurelist.append("<li  class=\" checkbox check2 checkedfield\"   name=AttributeAnnotation id=" + item.layerId + "" + " value=" + item.feature.attributes.OBJECTID + " alt=" + item.layerName + "/" + item.value + " serviceid=" + urlindex + ">" + item.layerName + "/" + item.feature.attributes.OBJECTID + "</li>");//item.layerId
                //高亮定位
                if (this.islocate) {
                    this.Goto(url, item.layerId, item.feature.attributes.OBJECTID, item.layerName);
                    //根据item.layerId,获取设置的字段信息数组fields
                    //this.attrannotation(item);
                    this.islocate = false;
                }

            } else {
                featurelist.append("<li  class=\" checkbox check2 checkedfield\"   name=AttributeAnnotation id=" + item.layerId + "" + " value=" + item.feature.attributes.OBJECTID + " alt=" + item.layerName + "/" + item.value + " serviceid=" + urlindex + ">" + item.layerName + "/" + item.feature.attributes.OBJECTID + "</li>");//item.layerId
            }
        }.bind(this));
        if (results.length >= 1000) {
            this.toast.Show("默认显示前1000条数据");
        }

        //字段单击选择事件
        var that = this;
        this.domObj.find(".checkedfield").off("click").on("click", function () {
            // that.domObj.find(".fields").addClass("on");
            that.domObj.find(".on").removeClass("on");
            $(this).addClass("on");


        });

        // 定义查询后双击 事件
        //必须移除上次绑定的事件（每次点击地图即绑定一次）
        // var itemUrl;
        this.domObj.find(".fields").off("click").on("click", function () {//换为单击定位
            //获取当前select 的value,定位要素高亮显示、生产table
            var curvalue = this.domObj.find(".on")[0];
            var layername = curvalue.innerText.trim().split('/')[0];
            // itemUrl = this.AppX.appConfig.gisResource.pipe.config[urlindex].url;
            if (this.AppX.appConfig.gisResource.pipe.config.length > 0) {
                for (var i = 0; i < this.AppX.appConfig.gisResource.pipe.config.length; i++) {
                    if (i == this.domObj.find(".on").attr("serviceid")) {
                        var url = this.AppX.appConfig.gisResource.pipe.config[i].url;
                        this.Goto(url, curvalue.id, curvalue.value, layername);
                    }
                }
            }
        }.bind(this))
    }

    /**
    * (方法说明)查询字段可见性配置，并显示所选要素的属性
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    attrannotation(item) {
        this.domObj.find(".data").empty();
        var datarows = this.domObj.find(".data");
        var name = this.domObj.find(".checkedfield")[0].innerText.split("/")[0];//checkedfield
        if (this.domObj.find(".on")[0] !== undefined)
            name = this.domObj.find(".on")[0].innerText.split("/")[0];
        $.ajax({
            headers: {
                'Authorization-Token': AppX.appConfig.usertoken
            },
            type: "POST",
            url: AppX.appConfig.apiroot.replace(/\/+$/, "") + this.config.fieldconfig,
            data: {
                // layername: this.domObj.find(".featureset option:selected").text().split("/")[0],
                layername: name,
                f: "pjson"
            },
            success: this.fieldshowCallback.bind({ that: this, item: item, datarows: datarows }),
            dataType: "json",
        });

    }

    /**
    * (方法说明)显示一个所选feature的属性
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    fieldshowCallback(data) {
        var tr;
        var that = <any>this;
        if (data.code == 10000) {
            if (data.result.rows && data.result.rows.length > 0) {
                $.each(data.result.rows, function (index2, item2) {
                    if (item2.visible) {
                        var regx = /null/i;
                        var value = that.item.feature.attributes[item2.name];
                        if (regx.test(value))
                            value = "";
                        else if (/[时间|日期]/g.test(item2.alias)) {//格式化日期
                            var date = new Date(value);
                            var year = date.getFullYear();
                            var month = date.getMonth() + 1;
                            var day = date.getDate();
                            value = year + "-" + month + "-" + day;
                        }
                        if (value === undefined) value = "";//避免在界面显示undefined
                        tr = "<tr><td>" + item2.alias + "</td>" + "<td>" + value + "</td></tr>";
                        that.datarows.append(tr);
                        tr = "";
                    }
                })
            }
            //未配置图层字段可见性时显示所有字段
            else {
                $.each(that.item.feature.attributes, function (index2, item2) {
                    if (!that.that.config.exceptAttribute.some(function (x) { return index2 == x; })) {//过滤非默认的字段
                        var regx = /null/i;
                        var value = item2;
                        if (regx.test(item2))
                            value = "";
                        else if (/DATE$/.test(index2)) {//格式化日期
                            var date = new Date(value);
                            var year = date.getFullYear();
                            var month = date.getMonth() + 1;
                            var day = date.getDate();
                            value = year + "-" + month + "-" + day;
                        }
                        if (value === undefined) value = "";//避免在界面显示undefined
                        tr = "<tr><td>" + that.item.alias[index2] + "</td>" + "<td>" + value + "</td></tr>";
                        that.datarows.append(tr);
                        tr = "";
                    }

                })
            }
        } else {
            that.toast.Show("字段查询失败！请检查");
            console.log(data.error);
        }
    }


    queryfieldCallback(data) {
        var that = this;
        //格式化字段类型
        if (data.code == 10000) {
            var selectedlayers = that.domObj.find(".layers option:selected");
            var urlindex = selectedlayers.val().trim().split('/')[0];
            var layerid = selectedlayers.val().trim().split('/')[1];
            var layername = selectedlayers.text().trim();
            var layerfields = this.AppX.runtimeConfig.fieldConfig.GetLayerFields(layername);
            this.domObj.find(".visibleattribution").empty();
            if (layerfields == null) {
                var url = this.AppX.appConfig.gisResource.pipe.config[urlindex].url + "/" + layerid;
                $.ajax({
                    type: "GET",
                    data: { f: "json" },
                    url: url,
                    async: true,
                    dataType: "json",
                    success: function (layerinfo) {
                        var layers = layerinfo.fields.map(item => {
                            return {
                                alias: item.alias,
                                name: item.name,
                                type: item.type,
                                visible: false,
                            }
                        });
                        layers.forEach(function (value) {
                            var index = _.findIndex(data.result.rows, function (row: any) { return row.name == value.name });
                            if (index >= 0)
                                value.visible = true;
                        }.bind(this));
                        layers.forEach(function (value) {
                            var lidom = $("<li calss=list-group-item><div class=\"checkbox check2\"><label><input type=checkbox id=" + value.name + " name=" + value.name + " value=" + value.alias + " alt=" + value.type + ">" + value.alias + " </label></div></li></option>")
                                .appendTo(this.domObj.find(".visibleattribution"));
                            if (value.visible)
                                lidom.find('input').attr({ checked: "checked" });
                        }.bind(this));
                    }.bind(this),
                    error: function (data) {
                        console.error(data);
                    }.bind(this)
                });
            }
            else {
                $.each(data.result.rows, function (i, value) {
                    // $(".visibleattribution").append("<li calss=list-group-item><div class=\"checkbox check2\"><label><input type=checkbox  name=" + value.name + ">" + value.alias + " </label></div></li></option>");
                    var lidom = $("<li calss=list-group-item><div class=\"checkbox check2\"><label><input type=checkbox id=" + value.name + " name=" + value.name + " value=" + value.alias + " alt=" + value.type + ">" + value.alias + " </label></div></li></option>")
                        .appendTo(this.domObj.find(".visibleattribution"));
                    if (value.visible)
                        lidom.find('input').attr({ checked: "checked" });
                }.bind(this));
            }

        } else {
            that.toast.Show("字段查询失败！请检查");
            console.log(data.error);
        }

    }

    //获取可见图层
    private getVisibilityLayer(url) {
        this.visibleLayersId = this.findLayerIDsInMap(url);
    }
    //高亮定位,并显示属性
    Goto(url, layerid, objid, layername) {
        var layerfields = this.AppX.runtimeConfig.fieldConfig.GetLayerFields(layername);
        var outfields, alias, objectidVisible = true;
        if (layerfields != null) {
            outfields = layerfields.fields.map(item => { return item.name });
            alias = layerfields.fields.map(item => { return item.alias });
            objectidVisible = layerfields.objectid;
        }
        var queryTask = new QueryTask(url + "/" + layerid);
        var query = new Query();
        query.returnGeometry = true;
        query.outFields = ["*"];
        if (outfields != null)
            query.outFields = outfields;
        query.where = "OBJECTID =" + objid;  // Return all cities with a population greater than 1 million
        var that = this;
        queryTask.execute(query, function (results) {
            if (results == null || results.features.length == 0)
                return;
            results.features[0].symbol = that.setSymbol(results.features[0].geometry.type);
            that.glayer.clear();
            that.glayer.add(results.features[0]);
            if (results.features[0].geometry.type == "point") {
                that.PointAtMap(results.features[0].geometry);
            } else {
                var extent = results.features[0].geometry.getExtent();
                var width = extent.xmax - extent.xmin;
                var height = extent.ymax - extent.ymin;
                var xmin = extent.xmin - width / 2;
                var xmax = extent.xmax + width / 2;
                var ymin = extent.ymin - height / 2;
                var ymax = extent.ymax + height / 2;
                var resultExtent = new Extent(xmin, ymin, xmax, ymax, this.map.spatialReference);
                this.map.setExtent(resultExtent);
            }
            //显示所选的要素的属性
            this.attrannotation({ feature: results.features[0], alias: results.fieldAliases });
        }.bind(this));
    }


    //设置点、线或多边形的样式
    setSymbol(type) {

        var symbol = {
            "SimpleMarkerSymbol": null,
            "SimpleLineSymbol": null,
            "SimpleFillSymbol": null,
        };
        switch (type) {
            case "point":
                symbol.SimpleMarkerSymbol = new SimpleMarkerSymbol(
                    {
                        color: new Color(this.config.color),
                        style: "diamond",       //点样式solid\cross\square|diamond|circle|x
                        outline: {
                            color: new Color(this.config.color),
                            width: 0.2
                        }
                    }
                );

                break;
            case "polyline":
                symbol.SimpleLineSymbol = new SimpleLineSymbol({
                    color: new Color(this.config.color),
                    style: "solid",   //线的样式 dash|dash-dot|solid等	
                    width: 3
                });
                break;

            case "polygon":
                symbol.SimpleFillSymbol = new SimpleFillSymbol({
                    color: new Color([0, 0, 0, 0.1]),
                    outline: {
                        color: new Color(this.config.color),
                        width: 3
                    }
                });
                symbol.SimpleFillSymbol.style = SimpleFillSymbol.STYLE_SOLID;
                break;
        }
        if (symbol.SimpleMarkerSymbol != null) {
            return symbol.SimpleMarkerSymbol;
        } else if (symbol.SimpleLineSymbol != null) {
            return symbol.SimpleLineSymbol;
        } else {
            return symbol.SimpleFillSymbol;
        }
    }

    /**
* (方法说明)从地图中获取图层信息,不用写到配置文件
* @method (方法名)
* @for (所属类名)
* @param {(参数类型)} (参数名) (参数说明)
* @return {(返回值类型)} (返回值说明)
*/
    private findLayerIDsInMap(url) {
        var sublayers = [];
        for (var i = 0; i < this.map.layerIds.length; i++) {
            var layer: any = this.map.getLayer(this.map.layerIds[i]);
            if (layer.url && layer.url == url) {
                if (layer.layerInfos.length != 0) {
                    layer.layerInfos.forEach(function (item, layerindex) {
                        var layerId = item.id;
                        if (item.subLayerIds) {
                        } else {
                            sublayers.push(item.id);
                        }
                    });
                }
                return sublayers;
            }
        }
        return null;
    }

    private distance2Map(screenPoint, screenDistance): number {
        if (this.AppX.runtimeConfig.map == null)
            return 0;
        else {
            var screenPoint2 = new ScreenPoint(screenPoint.x+screenDistance,screenPoint.y);
            var mapPoint1 = this.AppX.runtimeConfig.map.toMap(screenPoint);
            var mapPoint2 = this.AppX.runtimeConfig.map.toMap(screenPoint2);
            var mapDistance = Math.sqrt(Math.pow(mapPoint1.x-mapPoint2.x,2)+Math.pow(mapPoint1.y-mapPoint2.y,2));
            return mapDistance;
        }
    }

    destroy() {
        //恢复地图默认鼠标样式
        this.map.setMapCursor("auto");
        if (this.map_click_handle != null) {
            this.map_click_handle.remove();
        }
        this.glayer.clear();
        this.map.removeLayer(this.glayer);
        this.tolerancelayer.clear();
        this.map.removeLayer(this.tolerancelayer);

        this.domObj.remove();
        this.afterDestroy();
        this.drawTool.deactivate() //关闭绘制工具
        this.drawTool = null;
    }
    // 定位到指定 Extent
    PointAtMap(point) {
        // 设置到指定缩放级别
        this.map.setScale(this.zoomscale);
        // 设置到指定的显示范围
        this.map.centerAt(point);
    }

}