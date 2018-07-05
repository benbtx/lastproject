import BaseWidget = require('core/BaseWidget.class');

import Map = require("esri/map");
import Layer = require("esri/layers/layer");
import QueryTask = require("esri/tasks/QueryTask");
import Query = require("esri/tasks/query");
import LayerInfo = require("esri/layers/LayerInfo");
import ArcGISDynamicMapServiceLayer = require("esri/layers/ArcGISDynamicMapServiceLayer");




export = MaterialQuery;
class MaterialQuery extends BaseWidget {
    baseClass = "materialQuery";

    //加载的地图对象
    map: any;
    //选中的图层名称，用于数据列表的参数
    selectedLayer: string;
    //选中的图层的id，用于数据列表的参数
    selectedLayerId;
    //
    fieldUniqueValue;
    //
    selectedAttr = [];


    startup() {
        this.setHtml(_.template(this.template)({
            hello: this.config.hello + (/\/([a-zA-Z]+)$/g.exec(this.widgetPath)[1])
        }));
        //初始化函数
        this.materialQueryInit();
    }

    destroy() {
        this.domObj.remove();
        this.afterDestroy();
        //关闭数据面板
        if (this.AppX.runtimeConfig.dataPanel != null) {
            this.AppX.runtimeConfig.dataPanel.close();
        }

    }

    materialQueryInit() {
        if (this.AppX.appConfig.gisResource.pipe.config.length == 0) {
            this.AppX.runtimeConfig.toast.Show('获取分析服务出错！');
        } else {
            //获取地图控件对象
            this.map = this.AppX.runtimeConfig.map;
            //获取所有管线图层名称
            //var layerNames = this.getAllLayerName();
            var layers = this.findPipeLayers();
            //添加图层选项下拉控件的选项值
            //this.addOptionToDrapdow(layerNames);
            this.addOptionToDrapdow(layers);
            var maxLayerCount = layers.filter(item => { return item.urlindex == 0 }).length;
            this.limitSelect(".materialQuery-layerName", maxLayerCount);
            //下拉框条目改变事件
            var drapDown = $(".materialQuery-layerName");
            this.addAttributeChooseFrom(this.config.materials);
            drapDown.on("change", function () {

                //清除可选属性
                //$(".materialQuery-attribute-value").children().remove();
                //清除选中的材质
                //this.selectedAttr = [];
                //获取当前选的图层值
                this.selectedLayer = drapDown.find("option:selected").text();
                //this.getFieldUniqueValueByAjax();

            }.bind(this));
            //主动触发事件
            //drapDown.trigger("change");

            //查询按钮 添加绑定事件
            $(".materialQuery-queryBtn").bind("click", this.queryBtnCallback.bind(this));
        }
    }
    ///获得所有管线图层的图层名
    getAllLayerName() {
        var layerNames = [];
        var layerId = this.map.layerIds;//获取所有图层的id ,["terrain_0", "pipe_0", "poi_0"]，即在添加basemap中设置的图层id
        var layerInfos: LayerInfo[] = [];
        for (var i = 0; i < layerId.length; i++) {
            if (/pipe/.test(layerId[i])) {//其中terrain为地形，pipe为管线，poi为注记，获取管线图层
                var layer = this.map.getLayer(layerId[i]);//
                // //根据不同用户获取相应管线图层
                // if (layer.url == this.appConfig.gisResource.pipe.config[0].url) {
                //     var pipeLayer: ArcGISDynamicMapServiceLayer = <ArcGISDynamicMapServiceLayer>layer;
                //     layerInfos = pipeLayer.layerInfos;//
                // }
                var pipeLayer: ArcGISDynamicMapServiceLayer = <ArcGISDynamicMapServiceLayer>layer;
                layerInfos = layerInfos.concat(pipeLayer.layerInfos);//
            }
        }
        //
        for (var i = 1; i < layerInfos.length; i++) {
            var name = layerInfos[i].name;
            //过滤不需要的图层
            var remove = false;
            for (var j = 0, len = this.config.removeLayers.length; j < len; j++) {
                var regExp = new RegExp(this.config.removeLayers[j]);
                if (regExp.test(name)) {
                    remove = true;
                }
            }

            if (remove == false) {
                var layerName = name + ":" + layerInfos[i].id;
                layerNames.push(layerName);
            }

        }
        return layerNames;
    }
    /// 添加图层下拉列表的选项
    addOptionToDrapdow(layers) {
        //添加下拉列表的option
        for (var i = 0, length = layers.length; i < length; i++) {
            var option = "<option layerId='" + layers[i].urlindex + ':' + layers[i].id + "'>" + layers[i].mapname + "</option>";
            $(option).appendTo($(".materialQuery-layerName"));
        }
    }

    //通过ajax根据指定的图层和字段，结果放入公共变量fieldUniqueValue中
    getFieldUniqueValueByAjax() {
        var selectedObj = $(".materialQuery-layerName").find("option:selected");
        //获取选中图层的id
        var value = selectedObj.attr('layerId');
        var layerid = value.split(':')[1];
        var urlindex = parseInt(value.split(':')[0]);
        var that = this;
        $.ajax({
            type: "get",
            url: this.AppX.appConfig.gisResource.pipe.config[urlindex].url + this.config.getFieldUniqueValueUrl,
            data: {
                usertoken: this.AppX.appConfig.usertoken,
                layerid: layerid,
                field_name: "MATERIAL",
                f: "pjson"
            },
            success: this.AjaxCallBack.bind(this),
            dataType: "json"

        });
    }


    //ajax回调函数
    AjaxCallBack(data) {
        var that = this
        if (data.code == 10000) {
            that.fieldUniqueValue = data.result.rows;
        }
        else {

        }
        if (that.fieldUniqueValue.length > 0) {
            //添加可以选择的属性
            that.addAttributeChooseFrom(that.fieldUniqueValue);
        }
    }
    //添加可选属性的checkbox
    addAttributeChooseFrom(fieldUniqueValue: string[]) {
        this.domObj.find(".materialQuery-attribute-value").empty();
        for (var i = 0; i < fieldUniqueValue.length; i++) {
            if ($.trim(fieldUniqueValue[i]).length == 0) {
            } else {
                var AttributeChooseFrom = "<p>" + "<input type=\"checkbox\" class=\"materialQuery-checkbox\">" + fieldUniqueValue[i] + "</p>";
                $(AttributeChooseFrom, {
                }).appendTo($(".materialQuery-attribute-value"));
            }
        }
        $(".materialQuery-checkbox").on("change", function (event) {
            //清除选中的材质
            this.selectedAttr = [];
            //查询出所有选中的材质，并存入selectedAttr数组中
            $(".materialQuery-checkbox:checked").parent().text(function (index, text) {
                this.selectedAttr.push(text);
            }.bind(this));
        }.bind(this))
    }


    //查询按钮的回调函数
    queryBtnCallback(event) {

        if (this.selectedAttr.length == 0) {
            this.AppX.runtimeConfig.toast.Show('请选择材质！');
            return;
        }
        if ($(".materialQuery-queryBtn").text() == '查询中...') {
            return;
        }
        $(".materialQuery-queryBtn").text('查询中...');
        var SQLWhere: string = "";
        for (var i = 0; i < this.selectedAttr.length; i++) {
            SQLWhere = SQLWhere + "MATERIAL" + "=" + "'" + this.selectedAttr[i] + "'";
            if (this.selectedAttr.length > 1 && i < this.selectedAttr.length - 1) {
                SQLWhere = SQLWhere + " or ";
            }
        }

        var selectedObj = $(".materialQuery-layerName").find("option:selected");
        //获取选中图层的id
        var layerId = selectedObj.attr('layerId');
        var layername = selectedObj.text().trim();
        this.selectedLayerId = layerId;
        //获取选中的图层名
        this.selectedLayer = selectedObj.text();
        var layerfields = this.AppX.runtimeConfig.fieldConfig.GetLayerFields(layername);
        var outfields, alias, objectidVisible = true;
        if (layerfields != null) {
            outfields = layerfields.fields.map(item => { return item.name });
            alias = layerfields.fields.map(item => { return item.alias });
            objectidVisible = layerfields.objectid;
        }
        this.QueryTask(SQLWhere, layerId, layername, outfields, objectidVisible, alias);
    }

    QueryTask(sqlWhere: string, layerId, layername, outfields, objectidVisible, alias) {
        var layerid = layerId.split(':')[1];
        var urlindex = parseInt(layerId.split(':')[0]);
        var queryUrl = this.AppX.appConfig.gisResource.pipe.config[urlindex].url + "\/" + layerid;
        var queryTask = new QueryTask(queryUrl);
        var query = new Query();
        query.where = sqlWhere;
        query.returnGeometry = false;
        query.orderByFields = ["OBJECTID asc"];//默认排序
        queryTask.executeForIds(query, function (results) {
            $(".materialQuery-queryBtn").text('查询');
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
        result.id = "materialQuery";
        result.title = this.selectedLayer;
        result.urlindex = this.selectedLayerId.split(':')[0];
        result.layerId = this.selectedLayerId.split(':')[1];
        this.AppX.runtimeConfig.dataPanel.show(result);
        $(".materialQuery-queryBtn").text('查询');
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
                            sublayers.push(item);
                        }
                    });
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
            outFields: outfields,
            objectidVisible: objectidVisible,
            query:dataQuery,
            order: order,
            table: null
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