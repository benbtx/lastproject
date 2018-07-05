import BaseWidget = require('core/BaseWidget.class');
import GraphicsLayer = require('esri/layers/GraphicsLayer');
import SimpleMarkerSymbol = require('esri/symbols/SimpleMarkerSymbol');
import SimpleLineSymbol = require('esri/symbols/SimpleLineSymbol');
import SimpleFillSymbol = require('esri/symbols/SimpleFillSymbol');
import Graphic = require('esri/graphic');
import Color = require('esri/Color');
import Draw = require('esri/toolbars/draw');
import IdentifyTask = require('esri/tasks/IdentifyTask');
import IdentifyParameters = require("esri/tasks/IdentifyParameters");
import SpatialReference = require("esri/SpatialReference");
import QueryTask = require("esri/tasks/QueryTask");
import Query = require("esri/tasks/query");


export = WarningAnalysis;

class WarningAnalysis extends BaseWidget {
    baseClass = "widget-warning-analysis";
    pipeServicePath = "";
    map = null;
    toast = null;
    currentid: number;
    currentids = [];
    layers = [];
    ids = [];
    glayer = new GraphicsLayer;
    currentGeometry = null;
    identifyTask = null;
    params = null; /***IdentifyTasK 参数  ***/
    checkedLayersWarningConfig = null;
    identifyResults = null;
    dataPanel = null;
    attribution = null;

    /*** 状态变量 ***/
    isAutoRefreshing: boolean = false;

    startup() {
        this.shortenStack();
        this.onPanelInit();
        // this.setHtml(this.template);
        //this.configure();

    }


    // 缩短调用栈
    shortenStack() {

        this.map = this.AppX.runtimeConfig.map;
        this.toast = this.AppX.runtimeConfig.toast;
        //this.pipeServicePath = this.AppX.appConfig.gisResource.pipe.config[0].url;
        if (this.AppX.appConfig.gisResource.pipe.config[0] == undefined) {
            this.toast.Show("管线服务未配置到config！");
            return;
        } else {
            this.pipeServicePath = this.AppX.appConfig.gisResource.pipe.config[0].url;
        }
        this.map.addLayer(this.glayer);
        this.dataPanel = this.AppX.runtimeConfig.dataPanel;
    }

    startGetLayerInfor() {
        var pipeMapCount = this.AppX.appConfig.gisResource.pipe.config.length;
        if (pipeMapCount == 0)
            return;
        this.layerlist = [];
        for (var urlindex = 0; urlindex < pipeMapCount; urlindex++) {
            this.getlayerinfor(urlindex);
        }
    }

    getlayerinfor(urlindex) {
        var layers = this.findPipeLayers(urlindex);
        var layerids = [];
        for (var i = 0; i < layers.length; i++) {
            layerids.push(layers[i].id);
        }
        $.ajax({
            url: this.AppX.appConfig.gisResource.pipe.config[urlindex].url + this.config.LayerName,
            data: {
                usertoken: this.AppX.appConfig.usertoken,
                layerids: JSON.stringify(layerids),
                f: "pjson"
            },
            success: function (data) { this.queryLayerNameCallback(urlindex, data) }.bind(this),//index换为urlindex时，有bug
            dataType: "json",
        });
    }

    onPanelInit() {
        this.startGetLayerInfor();
    }
    indexLock = 0;
    layerlist = [];
    queryLayerNameCallback(urlindex, data) {
        this.indexLock += 1;
        if (data.code == 10000) {
            var templayerlist = [];
            for (var i = 0; i < data.result.rows.length; i++) {
                if (_.findIndex(this.layerlist, function (o: any) { return o.layername == data.result.rows[i].layername }) == -1) {
                    data.result.rows[i].urlindex = urlindex;
                    templayerlist.push(data.result.rows[i]);
                }
            }
            if (templayerlist.length > 0) {
                if (this.layerlist.length > 0) {
                    if (this.layerlist[this.layerlist.length - 1].urlindex > templayerlist[0].urlindex)
                        this.layerlist = templayerlist.concat(this.layerlist);
                    else this.layerlist = this.layerlist.concat(templayerlist);
                }
                else
                    this.layerlist = templayerlist;
            }
            //this.layerlist = this.layerlist.concat(data.result.rows);
            if (this.indexLock >= this.AppX.appConfig.gisResource.pipe.config.length) {
                var datas = {
                    layers: this.layerlist
                }
                var htmlString = _.template(this.template)(datas);
                this.currentid = this.layerlist[0].layerid;
                this.indexLock = 0;
                // //设置面板内容
                this.setHtml(htmlString);
                this.initEvents();
                if (this.layerlist.length > 0) {
                    $.ajax({
                        url: this.AppX.appConfig.gisResource.pipe.config[this.layerlist[0].urlindex].url + "/" + this.layerlist[0].layerid,
                        success: this.queryCatalogFieldsCallback.bind(this),
                        error: this.queryDomainvalueerrorCallback.bind(this),
                        data: {
                            f: "pjson"
                        },
                        dataType: "json"
                    });
                }
            }
        } else {
            this.toast.Show("查询图层信息失败！");
            console.log(data.error);
        }
    }



    // 配置程序
    configure() {

    }

    // 绑定事件
    initEvents() {
        //this.domObj.on('click', '.pick-pipe', this.pickPipe.bind(this));
        this.domObj.find(".layers").on("change", this.layersSelect.bind(this));
        this.domObj.find(".attribution").on("change", this.attributionSelect.bind(this));
        // this.domObj.find(".domainvalue").on("change", this.getWarningConfig.bind(this));
        this.domObj.find(".btnsave").on("click", this.saveWarningConfig.bind(this));
        this.domObj.find(".figureOutRange").on("change", this.figureOutRange.bind(this));
        this.domObj.find(".drawRange").on("click", this.drawRange.bind(this));
        this.domObj.find(".warninganlysis").on("click", this.warningAnlysisOnPage.bind(this));

    }

    layersSelect() {
        var selectedlayers = this.domObj.find(".layers option:selected");
        var domianvalue = this.domObj.find(".domianvalue");
        domianvalue.empty();
        for (var i = 0; i < this.layerlist.length; i++) {
            if (this.layerlist[i].layername == $.trim(selectedlayers.text())) {
                if (this.layerlist[i].layerid == "") {
                    // alert("请先设置统计图层和字段！");
                    this.toast.Show("请先设置统计图层和字段！");
                } else {
                    this.currentid = this.layerlist[i].layerid;
                    // 执行SOE服务
                    $.ajax({
                        url: this.AppX.appConfig.gisResource.pipe.config[this.layerlist[i].urlindex].url + "/" + this.layerlist[i].layerid,
                        success: this.queryCatalogFieldsCallback.bind(this),
                        data: {
                            // usertoken: this.AppX.appConfig.usertoken,
                            layerid: this.layerlist[i].layerid,
                            f: "pjson"
                        },
                        dataType: "json"
                    });
                    //that.toggleExecutingState(true);
                }
            }
        }
    }



    attributionSelect() {
        var domianvalue = this.domObj.find(".domianvalue");
        var selectedlayers = this.domObj.find(".layers option:selected");
        var urlindex = parseInt(selectedlayers.attr("urlindex"));
        domianvalue.empty();
        var jsonstr = $.ajax({
            url: this.AppX.appConfig.gisResource.pipe.config[urlindex].url + "/" + selectedlayers.val(),
            success: this.queryDomainvalueCallback.bind(this),
            error: this.queryDomainvalueerrorCallback.bind(this),
            data: {
                f: "pjson"
            },
            dataType: "json"
        });

    }



    //回调函数
    // var
    queryCatalogFieldsCallback(data) {
        var that = this;
        this.domObj.find(".attribution option").remove();
        var attributionObj = this.domObj.find(".attribution")
        // attributionObj.append("<option></option>");
        if (data.fields.length == 0) {
            this.toast.Show("查询数据为空！");
            return;
        }

        //写死
        var domianvalue = this.domObj.find(".domianvalue");
        var layer = this.domObj.find(".layers");
        $.each(data.fields, function (i, value) {

            //写死:点为subtype,线为material
            if (data.geometryType == that.config.point.type) {
                if (value.name == that.config.point.name) {
                    attributionObj.append("<option" + " " + "value=" + that.config.point.name + ">" + that.config.point.alias + "</option>");
                    attributionObj.attr("disabled", "true");
                    //方案二：数据问题：中压管线材质属性值为钢质而阈值却为钢管，不匹配。所以直接统一查唯一值
                    domianvalue.append("查找中...")
                    layer.attr("disabled", "true");
                    that.getuniquevalue(that.config.point.name);
                }

            } else {
                if (value.name == that.config.line.name) {
                    attributionObj.append("<option" + " " + "value=" + that.config.line.name + " selected =selected>" + that.config.line.alias + "</option>");
                    attributionObj.attr("disabled", "true");
                    //方案二：数据问题：中压管线材质属性值为钢质而阈值却为钢管，不匹配。所以直接统一查唯一值
                    domianvalue.append("查找中...")
                    layer.attr("disabled", "true");
                    that.getuniquevalue(that.config.line.name);
                }
            }
        }.bind(this));
    }

    getuniquevalue(fieldname) {
        // 执行SOE服务
        //this.domObj.find(".getuniquevalue").text("获取中...");
        var urlindex = parseInt(this.domObj.find(".layers option:selected").attr("urlindex"));
        $.ajax({
            url: this.AppX.appConfig.gisResource.pipe.config[urlindex].url + this.config.getuniquevalue,
            data: {
                usertoken: this.AppX.appConfig.usertoken,
                layerid: this.currentid,
                field_name: fieldname,
                f: "pjson"
            },
            success: this.getuniquevalueCallback.bind(this),
            dataType: "json"
        });

    }
    getuniquevalueCallback(data) {
        var domianvalue = this.domObj.find(".domianvalue");
        var layer = this.domObj.find(".layers");
        domianvalue.empty();
        //var getuniquevaluebtn = this.domObj.find(".getuniquevalue");
        if (data.code == 10000) {
            if (data.result.rows.length == 0) {
                this.toast.Show("查询阈值数据为空！请直接设置统一阈值");
                //  domianvalue.append("<li calss=list-group-item><div class=\"checkbox check2\"><label><input type=radio id=" + this.config.domianvalue + " class=perdomainvalue name=domain value=" + this.config.domianvalue + " alt=" + this.config.domianvalue + ">" + "设置统一参数类型" + " </label></div></li>");
                layer.removeAttr("disabled");
                //直接触发阈值选择事件，查询设定的维修次数和服务年限
                this.getWarningConfig();

                return;
            }
            $.each(data.result.rows, function (i, value) {
                domianvalue.append("<li calss=list-group-item><div class=\"checkbox check2\"><label><input type=radio id=" + value + " class=perdomainvalue name=domain value=" + value + " alt=" + value + ">" + value + " </label></div></li>");

            });
            this.domObj.find(".perdomainvalue").off("change").on("change", this.getWarningConfig.bind(this));
            layer.removeAttr("disabled");
        }

    }






    queryDomainvalueCallback(data) {
        var that = this;
        if (data.fields.length > 0) {

            var selectedattribution = this.domObj.find(".attribution option:selected");
            var domianvalue = this.domObj.find(".domianvalue");
            $.each(data.fields, function (i, value) {
                if (value.domain == null) {
                    return;
                }
                if (value.name == selectedattribution.val() && value.domain.codedValues.length > 0) {
                    // if (!value.domain.hasOwnProperty("codedValues")) {
                    //     domianvalue.append("<h4>此字段不含域值<h4/>");
                    // }
                    $.each(value.domain.codedValues, function (i, value) {
                        // domianvalue.append("<li calss=list-group-item><div class=\"checkbox check2\"><label><input type=checkbox id=" + value.name + " name=" + value.name + " value=" + value.code + " alt=" + value.name + ">" + value.name + " </label></div></li></option>");
                        domianvalue.append("<li calss=list-group-item><div class=\"checkbox check2\"><label><input type=radio id=" + value.code + " class=perdomainvalue name=domain value=" + value.name + " alt=" + value.name + ">" + value.name + " </label></div></li>");
                    });
                }

            });

            this.domObj.find(".perdomainvalue").off("change").on("change", this.getWarningConfig.bind(this));
        } else {
            // alert("查询出错，请检查");
            this.toast.Show("获取阈值字段出错，请检查！" + data.error);
        }
    }

    queryDomainvalueerrorCallback(data) {
        this.AppX.runtimeConfig.loadMask.Hide();
        this.toast.Show("查询域值出错!");
    }

    getWarningConfig() {
        $.ajax({
            headers: {
                'Authorization-Token': AppX.appConfig.usertoken
            },
            type: "post",
            url: AppX.appConfig.apiroot.replace(/\/+$/, "") + this.config.getWarningConfig,
            success: this.getWarningConfigCallback.bind(this),
            // error: this.queryDomainvalueerrorCallback.bind(this),
            data: {
                // layername: this.domObj.find(".layers option:selected").text().trim(),
                // domianvalue: this.domObj.find("input[name=domain]:checked").val(),
                // categoryfield: this.domObj.find(".attribution option:selected").text(),
                warningtype: "1",
                layername: this.domObj.find(".layers option:selected").attr("name"),
                domianvalue: this.domObj.find("input[name=domain]:checked").val() || this.config.domianvalue,
                categoryfield: this.domObj.find(".attribution option:selected").val(),
                f: "pjson"
            },
            dataType: "json"
        });


    }

    /**
    * (方法说明)查询图层预警参数配置
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    getFullLayerWarningConfig() {

        var curlayers = "";
        var curalisa = "";
        var ids = new Array();
        var checkedObjs = this.domObj.find('.perlayer');
        checkedObjs.each(function () {
            if (this.checked == true) {
                curlayers += this.name + ",";
                curalisa += this.title + ",";
            }
        });

        //去除多余逗号
        curlayers = curlayers.substr(0, curlayers.length - 1);
        curalisa = curalisa.substr(0, curalisa.length - 1);
        $.ajax({
            headers: {
                'Authorization-Token': AppX.appConfig.usertoken
            },
            type: "post",
            url: AppX.appConfig.apiroot.replace(/\/+$/, "") + this.config.getWarningConfig,
            success: this.getFullLayerWarningConfigCallback.bind(this),
            error: this.queryDomainvalueerrorCallback.bind(this),
            data: {
                warningtype: "0",
                layername: curlayers,
                alisaname: curalisa
            },
            dataType: "json"
        });


    }



    saveWarningConfig() {
        //判断值是否设置
        var domianvalue = this.domObj.find(".domianvalue");
        if (domianvalue.children().length > 0) {
            if (this.domObj.find("input[name=domain]:checked").val() == undefined) {
                this.toast.Show("请选择某个阈值！");
                return;
            }
        }

        $.ajax({
            headers: {
                'Authorization-Token': AppX.appConfig.usertoken
            },
            type: "post",
            url: AppX.appConfig.apiroot.replace(/\/+$/, "") + this.config.setWarningConfig,
            success: this.saveWarningConfigCallback.bind(this),
            // error: this.queryDomainvalueerrorCallback.bind(this),
            data: {

                layername: this.domObj.find(".layers option:selected").attr("name"),
                //,当无阈值无唯一值时，整个图层以this.config.domianvalue为阈值
                domianvalue: this.domObj.find("input[name=domain]:checked").val() || this.config.domianvalue,
                categoryfield: this.domObj.find(".attribution option:selected").val(),
                alisaname: this.domObj.find(".layers option:selected").text().trim(),
                //,当无阈值无唯一值时，整个图层以this.config.domianvalue为阈值
                domianvaluenumber: this.domObj.find("input[name=domain]:checked").attr("id") || this.config.domianvalue,
                repairTimes: parseInt(this.domObj.find(".repairnumber").val()) || 0,
                servicePeriodyear: parseInt(this.domObj.find(".year").val()) || 0,
                servicePeriodmonth: parseInt(this.domObj.find(".month").val()) || 0,
                domaintablename: this.domObj.find(".layers option:selected").text().trim(),
                categoryfieldalias: this.domObj.find(".attribution option:selected").text().trim(),
                f: "pjson"
            },
            dataType: "json"
        });


    }


    getWarningConfigCallback(data) {
        if (data.code == 10000) {
            if (data.result.rows.length == 0) {
                this.domObj.find(".repairnumber").val(0);
                this.domObj.find(".year").val(0);
                this.domObj.find(".month").val(0);
                return;
            }
            $.each(data.result.rows, function (i, value) {

                this.domObj.find(".repairnumber").val(value.repairnumber);
                this.domObj.find(".year").val(value.serviceyear);
                this.domObj.find(".month").val(value.servicemonth);

            }.bind(this));

        } else {
            this.toast.Show("查询阈值出错！");
            console.log(data.error);
        }

    }

    /**
    * (方法说明)获取图层预警参数配置的回调
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    getFullLayerWarningConfigCallback(data) {
        this.AppX.runtimeConfig.loadMask.Hide();
        this.domObj.find(".warninganlysis").removeClass('disabled');
        (<any>this.domObj.find(".warninganlysis")).button('reset');
        if (data.code == 10000) {
            // if (data.result.rows.length == 0) {
            //     this.domObj.find(".warninganlysis").removeClass('disabled');
            //     (<any>this.domObj.find(".warninganlysis")).button('reset');
            //     return;
            // }
            this.checkedLayersWarningConfig = data.result;//过滤条件
            this.identifyResults;//设备信息
            //筛选出符合要求的设备信息
            var Organizationdata = [];
            var Showdata = [];//满足维修次数和服务期限的数据
            var currentfield = "";
            $.each(this.identifyResults, function (i, value) {
                //第一次组织数据构造
                var obj = { "layerid": value.layerId, "layername": value.layerName, "rows": [] };
                var iscontain = false;
                $.each(Organizationdata, function (i, value) {
                    if (value.layerid == obj.layerid) {
                        iscontain = true;
                    }
                });
                if (!iscontain) {
                    Organizationdata.push(obj);
                }
                if (data.result.alisaname.indexOf(value.layerName) < 0) {
                    //如果数据库没有对当前设备设置阈值，则该设备不满足超期条件
                    // Showdata.push(value);
                    return;
                } else {
                    //查找该图层的分类字段
                    $.each(data.result.rows, function (i, item) {
                        if (item.layeralias == value.layerName) {
                            currentfield = item.fieldalias;
                            return;
                        }
                    });
                    if (currentfield != "") {
                        //当前分类的域值
                        var catovalue = value.feature.attributes[currentfield];
                        var repairnum = value.feature.attributes[this.config.REPAIRNUM];//REPAIRNUM
                        if (repairnum == "Null") {
                            repairnum = 0;
                        }

                        var finishdate = value.feature.attributes[this.config.FINISHDATE];
                        if (repairnum == "Null" || finishdate == "Null") {
                            // this.toast.Show("存在维护次数或竣工日期字段值为空的数据！");
                            this.domObj.find(".warninganlysis").removeClass('disabled');
                            (<any>this.domObj.find(".warninganlysis")).button('reset');
                            return;
                        }
                        // var str = "2010/12/1";
                        var d1 = new Date(finishdate);
                        var d2 = new Date();
                        var m = Math.abs((d2.getFullYear() - d1.getFullYear()) * 12 + d2.getMonth() - d1.getMonth());
                        $.each(data.result.rows, function (i, item) {
                            if (item.layeralias == value.layerName && item.domain == this.config.domianvalue) {
                                //把年转换成月比较
                                if (item.repairnumber <= repairnum || (parseInt(item.serviceyear) * 12 + parseInt(item.servicemonth)) <= m) {
                                    Showdata.push(value);
                                    return;
                                }
                            }
                            if (item.layeralias == value.layerName && catovalue == item.domain) {
                                //把年转换成月比较
                                if (item.repairnumber <= repairnum || (parseInt(item.serviceyear) * 12 + parseInt(item.servicemonth)) <= m) {
                                    Showdata.push(value);
                                    return;
                                }
                            }
                        }.bind(this));
                    }


                }

            }.bind(this));

            //第二次组织数据构造
            var results = new Object;
            $.each(Showdata, function (i, item) {
                $.each(Organizationdata, function (i, value) {
                    if (value.layerid == item.layerId) {
                        value.rows.push(item.feature.attributes);
                    }
                });

            });

            //判断，无值则返回
            var Organizationdata_withoutnull = [];//不含空值的数据
            $.each(Organizationdata, function (i, value) {
                if (value.rows.length != 0) {
                    Organizationdata_withoutnull.push(value);
                }
            });
            //空索引所在的值
            if (Organizationdata_withoutnull.length == 0) {
                this.toast.Show("没有超出维护次数或服务年限的设备！");
                this.domObj.find(".warninganlysis").removeClass('disabled');
                (<any>this.domObj.find(".warninganlysis")).button('reset');
                return;
            }


            //第三次组织数据构造
            var finalresult = {
                "result": {
                    "rows": [
                    ]
                },
                "code": 10000,
                "message": "成功"
            }
            // finalresult.result.rows = Organizationdata_withoutnull;
            // this.showDataPanel(finalresult);
            //重新组织数据--wangjiao-20170312
            var tables = {
                tabs: []
            };
            for (var i = 0; i < Organizationdata_withoutnull.length; i++) {
                var data = Organizationdata_withoutnull[i];
                var tab = { id: i, layerId: data.layerid, urlindex: 0, title: data.layername, features: [] };
                for (var j = 0; j < data.rows.length; j++) {
                    tab.features.push({ attributes: data.rows[j] });
                }
                tables.tabs.push(tab);
            }
            if (tables.tabs.length > 0)
                this.AppX.runtimeConfig.dataPanel.show(tables);
            //重新组织数据

        } else {
            this.toast.Show("查询阈值出错！");
            console.log(data.error);
            this.domObj.find(".warninganlysis").removeClass('disabled');
            (<any>this.domObj.find(".warninganlysis")).button('reset');
        }

    }


    saveWarningConfigCallback(data) {
        if (data.code == 10000) {
            this.toast.Show("保存阈值成功！")
        } else {
            this.toast.Show("保存阈值出错！")
            console.log(data.error);
        }
    }

    drawRange() {
        this.glayer.clear();
        var drawToolbar = new Draw(this.map);
        drawToolbar.activate(Draw.POLYGON);
        this.currentGeometry = null;
        drawToolbar.on("draw-end", function (evt) {
            this.currentGrapic = new Graphic(evt.geometry, new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
                new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASHDOT,
                    new Color([255, 0, 0]), 2), new Color([0, 0, 0, 0.3])
            ));
            // this.map.jsongeometry = evt.geometry.toJson();
            this.currentGeometry = evt.geometry;
            this.glayer.add(this.currentGrapic);
            drawToolbar.deactivate();
        }.bind(this));

    }


    figureOutRange() {

        if (this.domObj.find("input:radio:checked").val() == "0") {
            this.glayer.clear();
            this.domObj.find(".drawRange").css("display", "none");
            this.currentGeometry = null
        }
        if (this.domObj.find("input:radio:checked").val() == "1") {
            this.glayer.clear();
            this.domObj.find(".drawRange").css("display", "none");
            this.currentGeometry = null
        }
        if (this.domObj.find("input:radio:checked").val() == "2") {
            this.glayer.clear();
            this.domObj.find(".drawRange").css("display", "inline-block");
            this.currentGeometry = null
        }


    }
    /**
    * (方法说明)执行预警分析
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    warningAnlysis() {
        if (this.domObj.find("input:radio:checked").val() == "1") {
            this.currentGeometry = this.map.extent;//当前视图
        }
        if (this.domObj.find(".warninganlysis").hasClass('disabled')) {
            return;
        }
        if (this.currentGeometry == null) {
            this.toast.Show("请绘制范围");
            return;
        }
        //idengtify
        this.identifyTask = new IdentifyTask(this.pipeServicePath);
        this.params = new IdentifyParameters();
        this.params.tolerance = this.config.tolerance;
        var curlayersid = [];
        var checkedObjs = this.domObj.find('.perlayer');
        checkedObjs.each(function () {
            if (this.checked == true) {
                curlayersid.push(parseInt(this.value));
            }
        });
        if (curlayersid.length == 0) {
            this.toast.Show("请指定设备所在图层！");
            return;
        }
        this.params.layerIds = curlayersid;
        //that.params.layerOption = "visible";
        this.params.layerOption = IdentifyParameters.LAYER_OPTION_ALL;
        this.params.geometry = this.currentGeometry;
        this.params.mapExtent = this.map.extent;
        (<any>this.domObj.find(".warninganlysis")).button('analyze');
        this.domObj.find(".warninganlysis").addClass('disabled');
        this.identifyTask.execute(this.params, function (results) {
            if (results.length == 0) {
                this.AppX.runtimeConfig.loadMask.Hide();
                this.toast.Show("当前视图或指定范围无指定设备！");
                this.domObj.find(".warninganlysis").removeClass('disabled');
                (<any>this.domObj.find(".warninganlysis")).button('reset');
                return;
            }
            this.identifyResults = results;
            this.getFullLayerWarningConfig();
        }.bind(this), function error() {
            this.AppX.runtimeConfig.loadMask.Hide();
            this.toast.Show("获取设备信息操作失败！");
            this.domObj.find(".warninganlysis").removeClass('disabled');
            (<any>this.domObj.find(".warninganlysis")).button('reset');

        }.bind(this));
        this.AppX.runtimeConfig.loadMask.Show();
    }
    // 展示数据面板
    showDataPanel(results) {
        this.dataPanel.show(results);
        this.domObj.find(".warninganlysis").removeClass('disabled');
        (<any>this.domObj.find(".warninganlysis")).button('reset');
    }

    //js 计算某一个日期和当前日期相差几年几月
    dateDiff(date1, date2, type) {
        date1 = typeof date1 == 'string' ? new Date(date1) : date1;
        date1 = date1.getTime();
        date2 = typeof date2 == 'string' ? new Date(date2) : date2;
        date2 = date2.getTime();
        type = type || 'hour';
        var diffValue = Math.abs(date2 - date1);
        var second = 1000,
            minute = second * 60,
            hour = minute * 60,
            day = hour * 24,
            month = day * 30,
            year = month * 12;
        var timeType = {
            second: second,
            minute: minute,
            hour: hour,
            day: day,
            month: month,
            year: year
        };

        return Math.ceil(diffValue / timeType[type]);
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

    destroy() {

        if (this.dataPanel != null) {
            this.dataPanel.close();
        }
        this.glayer.clear();
        this.map.removeLayer(this.glayer);
        this.domObj.remove();

        this.afterDestroy();
    }

    /**
* (方法说明)执行预警分析(取消1000数据上限，使用后台分页，循环各图层执行执行空间过滤和属性过滤)
* @method (方法名)
* @for (所属类名)
* @param {(参数类型)} (参数名) (参数说明)
* @return {(返回值类型)} (返回值说明)
*/
    warningAnlysisOnPage() {
        if (this.domObj.find("input:radio:checked").val() == "1") {
            this.currentGeometry = this.map.extent;//当前视图
        }
        if (this.domObj.find(".warninganlysis").hasClass('disabled')) {
            return;
        }
        if (this.currentGeometry == null) {
            this.toast.Show("请绘制范围");
            return;
        }
        //idengtify
        this.identifyTask = new IdentifyTask(this.pipeServicePath);
        this.params = new IdentifyParameters();
        this.params.tolerance = this.config.tolerance;
        var curlayersid = [];
        var checkedObjs = this.domObj.find('.perlayer');
        checkedObjs.each(function () {
            if (this.checked == true) {
                curlayersid.push(parseInt(this.value));
            }
        });
        if (curlayersid.length == 0) {
            this.toast.Show("请指定设备所在图层！");
            return;
        }
        this.params.layerIds = curlayersid;
        //that.params.layerOption = "visible";
        this.params.layerOption = IdentifyParameters.LAYER_OPTION_ALL;
        this.params.geometry = this.currentGeometry;
        this.params.mapExtent = this.map.extent;
        (<any>this.domObj.find(".warninganlysis")).button('analyze');
        this.domObj.find(".warninganlysis").addClass('disabled');
        this.tabs = [];
        this.countLock = 0;
        //关闭数据面板
        if (this.AppX.runtimeConfig.dataPanel != null) {
            this.AppX.runtimeConfig.dataPanel.close();
        }
        this.getSelectedLayerWarningConfig();
    }
    /**
    * (方法说明)获取当前选择图层的预警参数
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    getSelectedLayerWarningConfig() {
        var curlayers = "";
        var curalisa = "";
        var ids = new Array();
        var checkedObjs = this.domObj.find('.perlayer');
        checkedObjs.each(function () {
            if (this.checked == true) {
                curlayers += this.name + ",";
                curalisa += this.title + ",";
            }
        });

        //去除多余逗号
        curlayers = curlayers.substr(0, curlayers.length - 1);
        curalisa = curalisa.substr(0, curalisa.length - 1);
        $.ajax({
            headers: {
                'Authorization-Token': AppX.appConfig.usertoken
            },
            type: "post",
            url: AppX.appConfig.apiroot.replace(/\/+$/, "") + this.config.getWarningConfig,
            success: this.getSelectedLayerWarningConfigCallback.bind(this),
            error: this.queryDomainvalueerrorCallback.bind(this),
            data: {
                warningtype: "0",
                layername: curlayers,
                alisaname: curalisa
            },
            dataType: "json"
        });
        this.AppX.runtimeConfig.loadMask.Show("正在执行中，请耐心等待...");
    }

    /**
* (方法说明)获取图层预警参数配置的回调
* @method (方法名)
* @for (所属类名)
* @param {(参数类型)} (参数名) (参数说明)
* @return {(返回值类型)} (返回值说明)
*/
    getSelectedLayerWarningConfigCallback(data) {
        this.AppX.runtimeConfig.loadMask.Hide();
        this.domObj.find(".warninganlysis").removeClass('disabled');
        (<any>this.domObj.find(".warninganlysis")).button('reset');
        if (data.code == 10000) {
            //this.checkedLayersWarningConfig = data.result;//过滤条件
            var layers = data.result.layername.split(',');
            //检测没有配置预警参数的图层
            var curlayers = [];
            var curalisa = [];
            var ids = new Array();
            var checkedObjs = this.domObj.find('.perlayer');
            checkedObjs.each(function () {
                if (this.checked == true) {
                    curlayers.push(this.name);
                    curalisa.push(this.title);
                }
            });
            for (var layerindex = 0; layerindex < curlayers.length; layerindex++) {
                var index = _.findIndex(layers, function (o: any) { return o == curlayers[layerindex] });
                if (index == -1)
                    this.toast.Show(curalisa[layerindex] + "未配置预警参数");
            }
            //检测没有配置预警参数的图层
            if (layers.length > 0) {
                var params = [];
                for (var i = 0; i < layers.length; i++) {
                    var configs = _.filter(data.result.rows, function (item: any) {
                        return item.layername == layers[i];
                    });
                    if (configs.length > 0) {
                        var where = this.buildWhereOnLayer(layers[i], configs);
                        var geometry = this.currentGeometry;
                        var layer = _.filter(this.layerlist, function (item: any) {
                            return item.layerdbname == layers[i];
                        });
                        if (layer.length > 0)
                            params.push({
                                layerid: layer[0].layerid,
                                where: where,
                                geometry: geometry,
                                layername: layer[0].layername,
                                urlindex: layer[0].urlindex
                            });
                    }
                }
                //
                if (params.length > 0) {
                    for (var j = 0; j < params.length; j++) {
                        var url = this.AppX.appConfig.gisResource.pipedata.config[params[j].urlindex].url;
                        this.queryOnPipedataLayer(url, params[j].layerid, params[j].layername, params[j].geometry, params[j].where, params.length);
                    }
                }
            }
        } else {
            this.toast.Show("查询阈值出错！");
            console.log(data.error);
            this.domObj.find(".warninganlysis").removeClass('disabled');
            (<any>this.domObj.find(".warninganlysis")).button('reset');
        }

    }
    buildWhereOnLayer(layer, configs) {
        var wheres = [];
        var dateNow = new Date();
        configs.forEach(config => {
            var where = config.field + "='" + config.domain + "'";
            where += " and (REPAIRNUM >= " + config.repairnumber;
            var filerDate: Date = new Date(dateNow.getFullYear() - config.serviceyear, dateNow.getMonth() - config.servicemonth, dateNow.getDate());
            where += " or FINISHDATE <= timestamp '" + filerDate.getFullYear() + "-" + filerDate.getMonth() + "-" + filerDate.getDate() + "'";
            where += ")"
            wheres.push(where);
        });
        if (wheres.length > 1) {
            for (var i = 0; i < wheres.length; i++) {
                wheres[i] = "(" + wheres[i] + ")";
            }
        }
        //添加单位代码过滤
        var managerDepartment = Cookies.get('range');
        var ranges: Array<any> = managerDepartment.split(';');
        var filter = null;
        if (ranges.length > 0) {
            filter = ranges.map(function (range) {
                return "'" + range + "'";
            }).join(",");
            filter = 'MANAGEDEPT_CODE in (' + filter + ')';
        }
        return filter + " and (" + wheres.join(" or ") + ")";
    }
    private countLock = 0;
    private tabs = [];
    private queryOnPipedataLayer(url, layerid, layername, geometry, where, sum) {
        var layerfields = this.AppX.runtimeConfig.fieldConfig.GetLayerFields(layername);
        var outfields, alias, objectidVisible = true;
        if (layerfields == null) {
            this.countLock++;
            console.error("未找到图层" + layername + "的字段配置信息！");
            if (this.countLock >= sum) {
                this.AppX.runtimeConfig.dataPanel.showPage({ tabs: this.tabs });
                this.AppX.runtimeConfig.loadMask.Hide();
            }
        }
        else {
            outfields = layerfields.fields.map(item => { return item.name });
            alias = layerfields.fields.map(item => { return item.alias });
            objectidVisible = layerfields.objectid;
        }
        var queryTask = new QueryTask(url + "/" + layerid);
        var query = new Query();
        if (where != null)
            query.where = where;
        query.geometry = geometry;
        query.returnGeometry = false;
        if (objectidVisible)
            query.orderByFields = ["OBJECTID asc"];//默认排序
        else if (outfields != null && outfields.length > 0)
            query.orderByFields = [outfields[0] + " asc"];//默认排序
        queryTask.executeForIds(query, function (results) {
            if (results != null && results.length > 0) {
                var dataQuery = { where: where, geometry: geometry };
                var tab = this.dataPanelWrap(url, results, layername, layerid, query.orderByFields[0], outfields, objectidVisible, alias, dataQuery);
                this.tabs.push(tab);
            }
            this.countLock++;
            if (this.countLock >= sum) {
                if (this.tabs.length > 0)
                    this.AppX.runtimeConfig.dataPanel.showPage({ tabs: this.tabs });
                else
                    this.toast.Show("当前视图或指定范围无指定设备！");
                // this.btnStartAnalyse.button('reset');
                // this.btnStartAnalyse.removeClass('disabled');
                this.AppX.runtimeConfig.loadMask.Hide();
            }
        }.bind(this), function (error) {
            this.countLock++;
            if (this.countLock >= sum) {
                if (this.tabs.length > 0)
                    this.AppX.runtimeConfig.dataPanel.showPage({ tabs: this.tabs });
                else
                    this.toast.Show("当前视图或指定范围无指定设备！");
                // this.btnStartAnalyse.button('reset');
                // this.btnStartAnalyse.removeClass('disabled');
                this.AppX.runtimeConfig.loadMask.Hide();
            }
        }.bind(this));
    }

    /* (方法说明)数据面板格式转换
* @method (方法名)
* @for (所属类名)
* @param {(参数类型)} (参数名) (参数说明)
* @return {(返回值类型)} (返回值说明)
*/
    private dataPanelWrap(url, objectids, layername, layerid, order, outfields, objectidVisible, alias, dataQuery) {
        var result = {
            title: layername,
            id: layerid,//datapanel中tab的唯一性标识,不能有特殊字符
            canLocate: true,
            objectIDIndex: 0,
            layerId: layerid,
            url: url,
            objectids: objectids,
            objectidVisible: objectidVisible,
            query: dataQuery,
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
}