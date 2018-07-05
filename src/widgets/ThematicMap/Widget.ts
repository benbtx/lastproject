import BaseWidget = require('core/BaseWidget.class');

// import TileLayer = require('esri/layers/TileLayer');
import FeatureLayer = require('esri/layers/FeatureLayer');
// import WatchUtils = require("esri/core/watchUtils");
import QueryTask = require('esri/tasks/QueryTask');
import Query = require('esri/tasks/query');
import ArcGISDynamicMapServiceLayer = require("esri/layers/ArcGISDynamicMapServiceLayer");
import Extent = require("esri/geometry/Extent");


// import thematicMapDataShow = require('widgets/thematicMapDataShow/Widget');
export = thematicMap;

class thematicMap extends BaseWidget {
    // panel: MapPanel;
    //$=this.domObj.find
    pipeServicePath = "";
    map = null;
    baseClass: string = "wideget-thematicMap";
    layers = [];
    currentid: number;
    thematicMapdataset = null;
    toast = null;
    dataPanel = null;
    managerDepartment;//管理单位代码
    thematicIndex = 0;//专题图索引
    visibleLayers = [];//可见图层
    thematicLayers = [];

    startup() {
        this.onPanelInit();
    }
    onPanelInit() {
        ///隐藏管线图层
        var map = this.AppX.runtimeConfig.map;
        var layerIds = map.layerIds;
        for (var i = 0, length = layerIds.length; i < length; i++) {
            if (/pipe/.test(layerIds[i])) {
                var existPipeLayer = map.getLayer(layerIds[i]);
                existPipeLayer.setVisibility(false);
                this.visibleLayers.push(existPipeLayer);


            }
        }
        ///获取管理单位代码
        var userid = Cookies.get('userid');
        $.ajax({
            type: "post",
            headers: {
                'Authorization-Token': AppX.appConfig.usertoken
            },
            url: this.AppX.appConfig.apiroot + "/webapp/range",
            data: {
                userid: userid
            },
            success: function (result) {
                var codeStr = "";
                if (result.result.length > 0) {
                    for (var i = 0; i < result.result.length; i++)
                        codeStr += ',' + "'" + result.result[i] + "'";
                    codeStr = codeStr.substring(1);
                    codeStr = "(" + codeStr + ")";
                    this.managerDepartment = codeStr;
                }
                //    console.log(result);
            }.bind(this),
            error: function () {
                this.Appx.runtimeConfig.toast.show('获取管理单位代码错误')
            },
            dataType: "JSON"
        });

        ///获取图层
        $.ajax({
            type: "get",
            // headers: {
            //     'Authorization-Token': AppX.appConfig.usertoken
            // },
            url: this.appConfig.gisResource.zhuantitu.config[0].url + '/?f=json',
            success: function (result) {
                var jsonObj = eval('(' + result + ')');
                var layers = jsonObj.layers;
                var thematicLayers = [];
                for (var i = 0, length = layers.length; i < length; i++) {
                    if (!/管线层/.test(layers[i].name)) {
                        thematicLayers.push(layers[i]);
                    }
                }
                this.layers = thematicLayers;
            }.bind(this),
            async: false
        });

        this.map = this.AppX.runtimeConfig.map;
        this.toast = this.AppX.runtimeConfig.toast;
        this.pipeServicePath = this.appConfig.gisResource.zhuantitu.config[0].url;
        // this.map = this.AppX.runtimeConfig.map;
        // this.toast = this.AppX.runtimeConfig.toast;
        // this.dataPanel = this.AppX.runtimeConfig.dataPanel;
        // for (var i = 0; i < this.map.layerIds.length; i++) {
        //     if (this.map.getLayer(this.map.layerIds[i]).url == this.pipeServicePath) {
        //         this.currentid = this.map.layerIds[i];
        //     }
        // }

        // for (var i = 0; i < this.map.getLayer(this.currentid).layerInfos.length; i++) {
        //     //4.1
        //     // if (alllayers.items[i].parent.id != id) {
        //     //     this.layers.push(alllayers.items[i]);
        //     // }
        //     //4.0
        //     if (!this.map.getLayer(this.currentid).layerInfos[i].subLayerIds) {
        //         this.layers.push(this.map.getLayer(this.currentid).layerInfos[i]);
        //     }
        // }
        this.currentid = this.config.firstsublayerid;
        var data = {
            layers: this.layers
        }
        var htmlString = _.template(this.template)(data);
        if (this.layers.length > 0) {
            $.ajax({
                url: this.pipeServicePath + this.config.queryAlias,
                data: {
                    usertoken: this.AppX.appConfig.usertoken,
                    layerid: this.layers[0].id,
                    f: "pjson"
                },
                success: this.queryAliasCallback.bind(this),
                dataType: "json"
            });
        }
        // //设置面板内容
        this.setHtml(htmlString);
        this.initEvent();
    }
    initEvent() {
        //初始化图层选择事件 
        this.domObj.find(".layers").on("change", function () {

            this.domObj.find(".filter").val("");  //清空sql
            var selectedlayers = this.domObj.find(".layers option:selected");//获取选中的图层名
            for (var i = 0, layerLength = this.layers.length; i < layerLength; i++) {
                if (this.layers[i].name == $.trim(selectedlayers.text().trim())) {
                    if (this.layers[i].id == "") {
                        // alert("请先设置统计图层和字段！");
                        this.toast.Show("请先设置统计图层和字段！");
                    } else {
                        this.currentid = this.layers[i].id;


                        // if (/管维/.test(this.layers[i].name)) {

                        //     for (var j = 0, length = this.AppX.appConfig.gisResource.pipe.config.length; j < length; j++) {
                        //         if (/管维/.test(this.AppX.appConfig.gisResource.pipe.config[j].name)) {
                        //             this.pipeServicePath = this.AppX.appConfig.gisResource.pipe.config[j].url;
                        //         }
                        //     }
                        // } else {
                        //     for (var k = 0, length = this.AppX.appConfig.gisResource.pipe.config.length; k < length; k++) {
                        //         if (!/管维/.test(this.AppX.appConfig.gisResource.pipe.config[k].name)) {
                        //             this.pipeServicePath = this.AppX.appConfig.gisResource.pipe.config[k].url;
                        //         }
                        //     }
                        // }

                        // 执行SOE服务
                        $.ajax({
                            url: this.pipeServicePath + this.config.queryAlias,
                            data: {
                                usertoken: this.AppX.appConfig.usertoken,
                                layerid: this.layers[i].id,
                                f: "pjson"
                            },
                            success: this.queryAliasCallback.bind(this),
                            dataType: "json"
                        });

                    }


                }
            }

        }.bind(this));
        //初始化清除事件
        this.domObj.delegate(".clear", "click", function () {
            this.domObj.find(".filter").val("");
        }.bind(this));
        //获取唯一值选择事件
        this.domObj.delegate(".getuniquevalue", "click", function () {

            if (this.domObj.find(".on").length == 0) {
                this.toast.Show("请选择一个属性字段！");
                return;
            }
            // 执行SOE服务
            this.domObj.find(".getuniquevalue").text("获取中...");
            $.ajax({
                url: this.pipeServicePath + this.config.getuniquevalue,
                data: {
                    usertoken: this.AppX.appConfig.usertoken,
                    layerid: this.currentid,
                    field_name: this.domObj.find(".on").attr("id"),
                    f: "pjson"
                },
                success: this.getuniquevalueCallback.bind(this),
                dataType: "json"
            });


        }.bind(this));
        var that = this;
        //字段双击选择事件
        this.domObj.delegate(".fields", "dblclick", function () {
            this.domObj.find(".filter").val(this.domObj.find(".filter").val() + " " + this.domObj.find(".on").attr("id"));

        }.bind(this));
        //操作双击符选择事件
        this.domObj.delegate(".operator", "click", function () {
            that.domObj.find(".filter").val(that.domObj.find(".filter").val() + " " + this.value);

        });
        //初始化查询事件
        this.domObj.delegate(".search", "click", function () {
            ///输入有效值检查
            if (this.domObj.find(".search").hasClass('disabled')) {//不可重复点击显示
                return;
            }
            if (this.domObj.find(".filter").val() == "") {//过滤条件不可为空！
                this.domObj.find(".filter").attr("placeholder", "不能为空！");
                this.toast.Show("组合查询条件为空！");
                return;
            }
            if ($('.thematicName input').val() == '') {//专题图名称不可为空
                this.toast.Show("专题图名不可为空！");
                return;
            }
            //显示进度，按钮不可用
            this.domObj.find(".search").addClass('disabled');
            (<any>this.domObj.find(".search")).button('analyze');
            //获取选中的图层
            var selectedlayers = this.domObj.find(".layers option:selected");
            var layerNames = [];
            ///检查查询条件是否正确
            var layerUrl = this.appConfig.gisResource.zhuantitu.config[0].url + '/' + selectedlayers.val();
            var queryTask = new QueryTask(layerUrl);
            var query = new Query();
            query.returnGeometry = true;
            query.outFields = ["*"];
            query.where = this.domObj.find(".filter").val() == "" ? "1=1" : this.domObj.find(".filter").val();
            queryTask.execute(query, function (results) {

                ///设置之前的专题图不可见
                var thematicMap = this.AppX.runtimeConfig.map.getLayer("thematicMap_" + (this.thematicIndex - 1));
                if (thematicMap != undefined) {
                    this.AppX.runtimeConfig.map.getLayer("thematicMap_" + (this.thematicIndex - 1)).setVisibility(false);
                }

                ///设置其他专题图未选中
                $('.thematicInfo input:checkbox').removeAttr('checked');
                ///添加专题图图层
                var selctedLayerId = parseInt(selectedlayers.val());
                var thematicMapId = 'thematicMap_' + (this.thematicIndex++);
                var pipeLayer: ArcGISDynamicMapServiceLayer = new ArcGISDynamicMapServiceLayer(this.appConfig.gisResource.zhuantitu.config[0].url, { id: thematicMapId });
                ///设置过滤条件
                var layerDefinitions = [];
                var sql = this.domObj.find(".filter").val() == "" ? "1=1" : this.domObj.find(".filter").val();
                if (!this.managerDepartment) {
                    layerDefinitions[selctedLayerId] = sql;
                }

                else {
                    sql = sql + ' and MANAGEDEPT_CODE in' + this.managerDepartment
                    layerDefinitions[selctedLayerId] = sql;
                }
                //记录专题图
                var layer = {
                    layerid: thematicMapId
                }
                this.thematicLayers.push(layer);
                //查询专题图数据范围
                this.getResultExtent(layer, sql);

                pipeLayer.setLayerDefinitions(layerDefinitions);
                ///设置图层可见性
                var visibleLayer = [];
                visibleLayer.push(selctedLayerId);
                pipeLayer.setVisibleLayers(visibleLayer);
                this.map.addLayer(pipeLayer);
                ///添加专题图到专题图列表
                var thematicName = $('.thematicName input').val();
                var html = "<tr thematicMapId='" + thematicMapId + "' ><td><input type=\'checkbox\' checked=\'checked\'  thematicMapId='" + thematicMapId + "'></td><td>" + thematicName + "</td></tr>"
                $(html).appendTo($('table .thematicInfo'));


                this.domObj.find(".search").removeClass('disabled');
                (<any>this.domObj.find(".search")).button('reset');
                ///专题图可见性切换事件
                var that = this;
                $('.thematicInfo input:checkbox').on('change', function (event) {
                    var thematicId = event.currentTarget.getAttribute('thematicmapid');
                    var target: HTMLInputElement = <HTMLInputElement>event.currentTarget;
                    if (target.checked == false) {
                        that.AppX.runtimeConfig.map.getLayer(thematicId).setVisibility(false);
                    } else {
                        that.AppX.runtimeConfig.map.getLayer(thematicId).setVisibility(true);
                    }
                })

            }.bind(this), function () {
                this.toast.Show("请检查SQL语句！");
                this.domObj.find(".search").removeClass('disabled');
                (<any>this.domObj.find(".search")).button('reset');
            }.bind(this))


        }.bind(this));
        ///删除专题图事件
        $('button.deletethematic').on('click', function () {
            var selectedLayer = [];
            var test = $('.thematicInfo input:checkbox:checked').attr('thematicMapId', function (index, value) {
                selectedLayer.push(value);
                return value;
            });

            for (var i = 0, len = selectedLayer.length; i < len; i++) {
                var layer = that.AppX.runtimeConfig.map.getLayer(selectedLayer[i]);
                that.AppX.runtimeConfig.map.removeLayer(layer);
                $('tr[thematicMapId=' + selectedLayer[i] + ']').remove();
            }
        }.bind(this))
    }
    //回调函数
    queryAliasCallback(data) {

        if (data.code == 10000) {
            this.domObj.find(".fields").empty();
            var attributionObj = this.domObj.find(".fields");
            var liattributionObj = "";
            // attributionObj.append("<option></option>");
            if (data.result.rows.length == 0) {
                this.toast.Show("查询数据为空！");
                return;
            }
            $.each(data.result.rows, function (i, value) {
                var index = this.config.shieldField.indexOf(value.name);
                if (index <= -1) {
                    // attributionObj.append("<li" + " " + "value=" + value.name + ">" + value.alias + "</li>");
                    // attributionObj.append("<li calss=list-group-item><div class=\"checkbox check2\"><label><input type=radio class=checkedfield   name=sqlfield id=" + value.name + "" + " value=" + value.alias + " alt=" + value.alias + ">" + value.alias + " </label></div></li></option>");
                    liattributionObj += "<li  class=\" checkbox check2 checkedfield\"   name=sqlfield id=" + value.name + "" + " value=" + value.alias + " alt=" + value.alias + ">" + value.alias + "</li>";
                }
            }.bind(this));

            attributionObj.append(liattributionObj);


            //字段单击选择事件
            var that = this;
            this.domObj.find(".checkedfield").off("click").on("click", function () {
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
        var getuniquevaluebtn = this.domObj.find(".getuniquevalue");
        if (data.code == 10000) {
            var uniqueValueObj = this.domObj.find(".uniquevalue");
            uniqueValueObj.empty();
            if (data.result.rows.length == 0) {
                getuniquevaluebtn.text("获取唯一值");
                this.toast.Show("查询数据为空！");
                return;
            }
            var strli = "";
            $.each(data.result.rows, function (i, value) {
                if (/^(\d{1,4})(-|\/)(\d{1,2})\2(\d{1,2})$/g.test(value)) {
                    //匹配日期，加上timestamp  
                    var time = "timestamp'" + value + "'"
                    // uniqueValueObj.append("<option" + " " + "value=" + time + ">" + value + "</option>");
                    strli += "<li class=\"checkbox check2 uniquefieldvalue\"><label  data=timestamp>" + value + " </label></li>";
                } else if (value == " ") {
                    value = "' '";
                    strli += "<li  class=\"checkbox check2 uniquefieldvalue\"><label  data=nullvalue>" + value + " </label></li>";
                } else {
                    // uniqueValueObj.append("<option" + " " + "value=" + value + ">" + value + "</option>");
                    strli += "<li  class=\"checkbox check2 uniquefieldvalue\"><label>" + value + " </label></li>";
                }

                if (i + 2 > this.config.uniquemaxnum) {
                    getuniquevaluebtn.text("获取唯一值");
                    this.toast.Show("默认只显示前" + this.config.uniquemaxnum + "条！");
                    return false;
                }


            }.bind(this));

            uniqueValueObj.append(strli);



            //唯一值双击选择事件
            var that = this;
            this.domObj.find(".uniquefieldvalue").off("dblclick").on("dblclick", function () {
                if ($(this).attr("data") == "timestamp") {

                    that.domObj.find(".filter").val(that.domObj.find(".filter").val() + " " + "timestamp'" + this.innerText.trim() + "'");
                } else if ($(this).attr("data") == "nullvalue") {

                    that.domObj.find(".filter").val(that.domObj.find(".filter").val() + " " + this.innerText.trim());
                } else {

                    that.domObj.find(".filter").val(that.domObj.find(".filter").val() + " " + "\'" + this.innerText.trim() + "\'");
                }

            });
            getuniquevaluebtn.text("获取唯一值");
        } else {
            // alert("查询出错，请检查");
            getuniquevaluebtn.text("获取唯一值");
            this.toast.Show("查询唯一值出错，请检查！");
            console.log(data.error);
        }
        // getuniquevaluebtn.text("获取唯一值");
    }

    getResultExtent(layer, wherestr) {
        $.ajax({
            url: this.pipeServicePath + this.config.getextent,
            data: {
                usertoken: this.AppX.appConfig.usertoken,
                layerid: this.currentid,
                where: wherestr,
                f: "pjson"
            },
            success: function (data) {
                if (data.code == 10000) {
                    layer.extent = data.result;
                    var resultExtent = new Extent(data.result.xmin, data.result.ymin, data.result.xmax, data.result.ymax, this.map.spatialReference);
                    this.map.setExtent(resultExtent);
                    // console.log(data);
                }
                else {

                }
            }.bind(this),
            dataType: "json"
        });
    }
    destroy() {
        if (this.dataPanel != null) {
            this.dataPanel.close();
        }
        //清除专题图
        var selectedLayer = [];
        var test = $('.thematicInfo input:checkbox:checked').attr('thematicMapId', function (index, value) {
            selectedLayer.push(value);
            return value;
        });

        for (var i = 0, len = selectedLayer.length; i < len; i++) {
            var layer = this.AppX.runtimeConfig.map.getLayer(selectedLayer[i]);
            this.AppX.runtimeConfig.map.removeLayer(layer);
            $('tr[thematicMapId=' + selectedLayer[i] + ']').remove();
        }
        ///设置原有图层可见
        for (var i = 0; i < this.visibleLayers.length; i++) {
            this.visibleLayers[i].setVisibility(true);
        }

        this.domObj.remove();
        this.afterDestroy();
    }
}