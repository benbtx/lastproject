import BaseWidget = require('core/BaseWidget.class');

import Map = require("esri/map");
import Layer = require("esri/layers/layer");
import QueryTask = require("esri/tasks/QueryTask");
import Query = require("esri/tasks/query");
import LayerInfo = require("esri/layers/LayerInfo");
import ArcGISDynamicMapServiceLayer = require("esri/layers/ArcGISDynamicMapServiceLayer");




export = GuanjingQuery;
class GuanjingQuery extends BaseWidget {
    baseClass = "guanjingQuery";

    //加载的地图对象
    map: any;
    //选中的图层名称，用于数据列表的参数
    selectedLayer: string;
    //选中的图层的id，用于数据列表的参数
    selectedLayerId;


    startup() {
        this.setHtml(_.template(this.template)({
            hello: this.config.hello + (/\/([a-zA-Z]+)$/g.exec(this.widgetPath)[1])
        }));
        //初始化函数
        this.guanjingQueryInit();
    }

    destroy() {
        this.domObj.remove();
        this.afterDestroy();
        //关闭数据面板
        if (this.AppX.runtimeConfig.dataPanel != null) {
            this.AppX.runtimeConfig.dataPanel.close();
        }

    }

    guanjingQueryInit() {
        this.domObj.on('keydown', '.guanjingQuery-DIAMETER-input', this.onInputKeyDown.bind(this));
        if (this.AppX.appConfig.gisResource.pipe.config.length == 0) {
            this.AppX.runtimeConfig.toast.Show('获取分析服务出错！');
        } else {
            //获取地图控件对象
            this.map = this.AppX.runtimeConfig.map;
            //获取所有管线图层名称
            var layers = this.findPipeLayers();
            //添加图层选项下拉控件的选项值
            this.addOptionToDrapdow(layers);
            var maxLayerCount = layers.filter(item => { return item.urlindex == 0 }).length;
            this.limitSelect(".guanjingQuery-layerName", maxLayerCount);
            //查询按钮 添加绑定事件
            $(".guanjingQuery-queryBtn").bind("click", this.queryBtnCallback.bind(this));
        }
    }

    onInputKeyDown(event: any) {
        switch (event.keyCode) {
            case 13:
                //回车键
                this.queryBtnCallback(null);
                event.stopPropagation();
                event.preventDefault();
                break;
        }
    }

    /// 添加图层下拉列表的选项
    addOptionToDrapdow(layers) {
        //添加下拉列表的option
        for (var i = 0, length = layers.length; i < length; i++) {
            var option = "<option layerId='" + layers[i].urlindex + ':' + layers[i].id + "'>" + layers[i].mapname + "</option>";
            $(option).appendTo($(".guanjingQuery-layerName"));

        }
    }
    //查询按钮的回调函数
    queryBtnCallback(event) {
        if ($(".guanjingQuery-DIAMETER-input").val() == "") {
            $(".guanjingQuery-DIAMETER-input").attr("placeholder", "不能为空！");
            return;
        }

        else if ($(".guanjingQuery-queryBtn").text() == '查询中...') {
            return;
        }
        else if (/^\d+$/.test($.trim($(".guanjingQuery-DIAMETER-input").val()))) {
            $(".guanjingQuery-queryBtn").text('查询中...');

            var selectedObj = $(".guanjingQuery-layerName").find("option:selected");
            //获取选中图层的id
            var layerId = selectedObj.attr('layerId');
            this.selectedLayerId = layerId;
            //获取选中的图层名
            this.selectedLayer = selectedObj.text();
            //get　selected logic value 
            var logic = $('input.guanjingQuery-DIAMETER:checked').val();

            var SQLWhere = "DIAMETER" + logic + $(".guanjingQuery-DIAMETER-input").val();
            var layername = selectedObj.text().trim();
            //获取图层字段配置信息
            var layerfields = this.AppX.runtimeConfig.fieldConfig.GetLayerFields(layername);
            var outfields, alias, objectidVisible = true;
            if (layerfields != null) {
                outfields = layerfields.fields.map(item => { return item.name });
                alias = layerfields.fields.map(item => { return item.alias });
                objectidVisible = layerfields.objectid;
            }
            //获取选中的图层名
            this.QueryTask(SQLWhere, layerId, layername, outfields, objectidVisible, alias);
        }
        else {
            $(".guanjingQuery-DIAMETER-input").val('');
            $(".guanjingQuery-DIAMETER-input").prop("placeholder", "请输入数字！");
        }
    }

    QueryTask(sqlWhere: string, layerId, layername, outfields, objectidVisible, alias) {
        var layerid = layerId.split(':')[1];
        var urlindex = parseInt(layerId.split(':')[0]);
        var queryUrl = this.AppX.appConfig.gisResource.pipe.config[urlindex].url + "\/" + layerid;
        var queryTask = new QueryTask(queryUrl);
        var query = new Query();
        query.where = sqlWhere;
        query.returnGeometry = false;
        query.orderByFields = [outfields[0] + " asc"]
        if (objectidVisible)
            query.orderByFields = ["OBJECTID asc"];//默认排序
        queryTask.executeForIds(query, function (results) {
            $(".guanjingQuery-queryBtn").text('查询');
            if (results == null || results.length == 0) {
                this.AppX.runtimeConfig.toast.Show("查询数据为空！");
                return;
            }
            var dataQuery = {where:sqlWhere,geometry:null};
            var tab = this.dataPanelWrap(urlindex, results, layername, layerid, query.orderByFields[0], outfields, objectidVisible, alias,dataQuery);
            this.AppX.runtimeConfig.dataPanel.showPage({ tabs: [tab] });
        }.bind(this));
    }

    queryTaskCallBack(result) {
        this.dateTransform(result, "BUILDDATA");//修建时间
        this.dateTransform(result, "CHANGEDATE");//修改时间
        this.dateTransform(result, "DETECTDATE");//探测时间
        this.dateTransform(result, "FINISHDATE");//竣工日期
        this.dateTransform(result, "GASDATE");//通气日期
        this.dateTransform(result, "REPAIRDATE");//维修日期
        this.dateTransform(result, "WRITEDATE");//录入日期
        result.id = "guanjingQuery";
        result.title = this.selectedLayer;
        result.urlindex = this.selectedLayerId.split(':')[0];
        result.layerId = this.selectedLayerId.split(':')[1];
        this.AppX.runtimeConfig.dataPanel.show(result);
        $(".guanjingQuery-queryBtn").text('查询');
    }

    ///日期转换函数
    dateTransform(result, attribute: string) {
        for (var i = 0, length = result.features.length; i < length; i++) {
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

    findPipeLayers() {
        var PipeMapSubLayers = [];
        if (this.AppX.appConfig.gisResource.pipe.config.length > 0) {
            for (var i = 0; i < this.AppX.appConfig.gisResource.pipe.config.length; i++) {
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
            var layer = this.map.getLayer(this.map.layerIds[i]);
            if (layer.url && layer.url == url) {
                if (layer.layerInfos.length != 0) {
                    layer.layerInfos.forEach(function (item, layerindex) {
                        var layerId = item.id;
                        if (item.subLayerIds) {
                        } else {
                            item.urlindex = urlindex;
                            item.mapname = item.name;//+ '(' + mapname + ')';
                            //remore layers
                            var remove = false;
                            for (var j = 0, len = this.config.removeLayers.length; j < len; j++) {
                                var regExp = new RegExp(this.config.removeLayers[j]);
                                if (regExp.test(item.name)) {
                                    remove = true;
                                }
                            }
                            if (remove == false) {
                                sublayers.push(item);
                            }
                            //
                        }
                    }.bind(this));
                }
                return sublayers;
            }
        }
        return null;
    }

    /* (方法说明)数据面板格式转换
* @method (方法名)
* @for (所属类名)
* @param {(参数类型)} (参数名) (参数说明)
* @return {(返回值类型)} (返回值说明)
*/
    private dataPanelWrap(urlindex, objectids, layername, layerid, order, outfields, objectidVisible, alias,dataQuery) {
        var result = {
            title: layername,
            id: urlindex * 100 + layerid,//datapanel中tab的唯一性标识,不能有特殊字符
            canLocate: true,
            objectIDIndex: 0,
            layerId: layerid,
            url: this.AppX.appConfig.gisResource.pipe.config[urlindex].url,
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
    /**
* (方法说明)
* @method (方法名)
* @for (所属类名)
* @param {(参数类型)} (参数名) selectDom(参数说明)下拉控件
* @param {(参数类型)} (参数名) initCount(参数说明)初始下拉列表大小
* @return {(返回值类型)} (返回值说明)
*/
    private limitSelect(selector, initCount) {
        //移除多余项，并记录
        //添加more项，在more单击事件中移除more、添加前面的移除项、恢复下拉菜单到现实状态
        var selectDom = $(selector);
        var removeOptionas = [];
        var options = selectDom.find('option');
        options.each((index, element) => {
            if (index >= initCount) {
                removeOptionas.push(element);
                element.remove();
            }
        });
        if (options.length > initCount)
            selectDom.append("<option value='more'>更多...</option>")
                .on('click', function (evt) {
                    var selectedlayers = selectDom.find("option:selected");
                    var values = selectedlayers.val().split(":");
                    if (values == "more") {
                        selectDom.find("option[value='more']").remove();
                        removeOptionas.forEach(function (e, i) { selectDom.append(e) });
                    }
                    selectDom.attr("size", )
                }.bind(this));
    }
}