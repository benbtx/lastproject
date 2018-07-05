import BaseWidget = require('core/BaseWidget.class');

// import TileLayer = require('esri/layers/TileLayer');
import FeatureLayer = require('esri/layers/FeatureLayer');
// import WatchUtils = require("esri/core/watchUtils");
import QueryTask = require('esri/tasks/QueryTask');
import Query = require('esri/tasks/query');

// import SqlQueryDataShow = require('widgets/SqlQueryDataShow/Widget');
export = SqlQuery;

class SqlQuery extends BaseWidget {
    // panel: MapPanel;
    //$=this.domObj.find
    // pipeServicePath = "";
    map = null;
    baseClass: string = "wideget-sqlquery";
    layers = [];
    currentid: number;
    sqlquerydataset = null;
    toast = null;
    dataPanel = null;


    startup() {
        this.onPanelInit();
        //添加扩展方法，以在textarea中对鼠标位置插入文本,是否需要考虑前后是否有空格
        jQuery.fn.extend({
            //在鼠标处插入文本
            insertAtCaret: function (insertText, quotation) {
                return this.each(function (i) {
                    var doc: any = document;
                    if (doc.selection) {
                        //兼容IE类浏览器
                        this.focus();
                        var sel = doc.selection.createRange();
                        sel.text = insertText;
                        this.focus();
                    }
                    else if (this.selectionStart || this.selectionStart == '0') {
                        this.focus();
                        //选择个数为0时，应获取鼠标位置，并插入，不能使用选择区域进行插入（delete时有bug）
                        //兼容Firefox和基于Webkit的浏览器
                        var startPos = this.selectionStart;
                        var endPos = this.selectionEnd;
                        var scrollTop = this.scrollTop;
                        var startValue = this.value.substring(0, startPos);
                        var endValue = this.value.substring(endPos, this.value.length);
                        if (quotation) {//需要引号
                            if (/.*(l|L)ike\s*$/.test(startValue)) {//前面接着like关键词
                                insertText = "'%" + insertText + "%'"
                            } else if (/.*\s+$/.test(startValue) || /^\s.*$/.test(endValue))//前后都有空格时
                            {
                                insertText = "'" + insertText + "'";
                            }
                            else {//前面或后面没空格时，不添加引号

                            }
                        }
                        if (!/.*(\s|%)$/.test(startValue))//前面无空格,且无%
                        {
                            insertText = " " + insertText;
                        }
                        if (!/^(\s|%).*/.test(endValue))//后面无空格和%
                        {
                            insertText = insertText + " ";
                        }
                        this.value = this.value.substring(0, startPos) + insertText + this.value.substring(endPos, this.value.length);
                        this.focus();
                        this.selectionStart = startPos + insertText.length;
                        this.selectionEnd = startPos + insertText.length;
                        this.scrollTop = scrollTop;
                    } else {
                        this.value += insertText;
                        this.focus();
                    }
                })
            },
            //获取鼠标位置
            getCursorPosition: function () {
                var el: any = $(this).get(0);
                var pos = 0;
                var posEnd = 0;
                var doc: any = document;
                if ('selectionStart' in el) {
                    pos = el.selectionStart;
                    posEnd = el.selectionEnd;
                } else if ('selection' in doc) {
                    el.focus();
                    var Sel = doc.selection.createRange();
                    var SelLength = doc.selection.createRange().text.length;
                    Sel.moveStart('character', -el.value.length);
                    pos = Sel.text.length - SelLength;
                    posEnd = Sel.text.length;
                }
                return [pos, posEnd];
            },
            //设置鼠标位置
            setCursorPosition: function (pos) {
                var el: any = $(this).get(0);
                var doc: any = document;
                if (el.setSelectionRange) {
                    el.setSelectionRange(pos, pos);
                } else if (el.createTextRange) {
                    var range = el.createTextRange();
                    range.collapse(true);
                    range.moveEnd('character', pos);
                    range.moveStart('character', pos);
                    range.select();
                }
            }
        });
    }
    onPanelInit() {

        //获取图层
        // this.pipeServicePath = this.AppX.appConfig.gisResource.pipe.config[0].url;
        this.map = this.AppX.runtimeConfig.map;
        //获取所有管线图层名称
        this.layers = this.findPipeLayers();
        //添加图层选项下拉控件的选项值
        this.toast = this.AppX.runtimeConfig.toast;
        this.dataPanel = this.AppX.runtimeConfig.dataPanel;

        this.currentid = this.config.firstsublayerid;
        var data = {
            layers: this.layers
        }
        //var data = this.wrapLimitOptions(".more", this.layers);
        var htmlString = _.template(this.template)(data);

        if (this.layers.length > 0) {
            $.ajax({
                url: this.AppX.appConfig.gisResource.pipe.config[0].url + this.config.queryAlias,
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
        var maxLayerCount = this.layers.filter(item => { return item.urlindex == 0 }).length;
        this.limitSelect(".layers", maxLayerCount);
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
        var selectDom = this.domObj.find(selector);
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

    wrapLimitOptions(moreselector, layers: Array<any>) {
        var optionlayers = [];
        for (var i = 0; i < layers.length; i++) {
            if (layers[i].urlindex == 0)
                optionlayers.push(layers[i]);
        }
        optionlayers.push({ mapname: "更多..." });
        return { layers: optionlayers };
    }

    initEvent() {
        //初始化图层选择事件 
        this.domObj.find(".layers").on("change", function () {
            //清空sql
            this.domObj.find(".filter").val("");
            var selectedlayers = this.domObj.find(".layers option:selected");
            var values = selectedlayers.val().split(":");
            if (values == "more") return;
            this.currentid = { urlindex: values[0], id: values[1] };
            for (var i = 0; i < this.layers.length; i++) {
                if (this.layers[i].name == $.trim(selectedlayers.text())) {
                    if (this.layers[i].id == "") {
                        // alert("请先设置统计图层和字段！");
                        this.toast.Show("请先设置统计图层和字段！");
                    } else {
                        var urlindex = this.layers[i].urlindex;
                        // 执行SOE服务
                        $.ajax({
                            url: this.AppX.appConfig.gisResource.pipe.config[urlindex].url + this.config.queryAlias,
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
            var urlindex = this.currentid.urlindex;
            $.ajax({
                url: this.AppX.appConfig.gisResource.pipe.config[urlindex].url + this.config.getuniquevalue,
                data: {
                    usertoken: this.AppX.appConfig.usertoken,
                    layerid: this.currentid.id,
                    field_name: this.domObj.find(".on").attr("id"),
                    f: "pjson"
                },
                success: this.getuniquevalueCallback.bind(this),
                dataType: "json"
            });


        }.bind(this));

        // this.domObj.find('.filter').on('keydown', function (e) {
        //     var position = this.domObj.find('.filter').getCursorPosition();
        //     var deleted = '';
        //     var val = this.domObj.find('.filter').val();
        //     if (e.which == 8) {
        //         if (position[0] == position[1]) {
        //             if (position[0] == 0)
        //                 deleted = '';
        //             else {
        //                 deleted = val.substr(position[0] - 1, 1);
        //                 position[0]--;
        //                 position[1]--;
        //             }
        //         }
        //         else {
        //             deleted = val.substring(position[0], position[1]);
        //         }
        //     }
        //     else if (e.which == 46) {
        //         var val = this.domObj.find('.filter').val();
        //         if (position[0] == position[1]) {

        //             if (position[0] === val.length)
        //                 deleted = '';
        //             else
        //                 deleted = val.substr(position[0], 1);
        //         }
        //         else {
        //             deleted = val.substring(position[0], position[1]);
        //         }
        //     }
        //     else {
        //         position[0]++;
        //         position[1]++;
        //     }
        //     console.log(deleted);
        //     console.log("position:" + position);
        // }.bind(this));
        var that = this;


        //字段双击选择事件
        this.domObj.delegate(".fields", "dblclick", function () {
            var insertValue = this.domObj.find(".on").attr("id");//前后添加空格
            this.domObj.find('.filter').insertAtCaret(insertValue, false);
            // this.domObj.find(".filter").val(this.domObj.find(".filter").val() + " " + this.domObj.find(".on").attr("id"));
        }.bind(this));

        //操作双击符选择事件
        this.domObj.delegate(".operator", "click", function (event: any) {
            //that.domObj.find(".filter").val(that.domObj.find(".filter").val() + " " + this.value);
            var insertValue = event.currentTarget.value;//前后添加空格
            if (/.*(l|L)ike\s*$/.test(insertValue)) {//like关键词,后面添加 '%%'
                insertValue = insertValue + " '%%'"
            }
            this.domObj.find('.filter').insertAtCaret(insertValue, false);
            if (/.*(l|L)ike\s*$/.test(event.currentTarget.value)) {//like关键词,设置鼠标位置到%%间
                var position = this.domObj.find('.filter').getCursorPosition();
                this.domObj.find('.filter').setCursorPosition(position[0] - 3);
            }
            // this.insertTextOnFocus(textDom, insertValue);
        }.bind(this));

        //初始化查询事件
        this.domObj.delegate(".search", "click", function () {
            if (this.domObj.find(".search").hasClass('disabled')) {
                return;
            }
            if (this.domObj.find(".filter").val() == "") {
                this.domObj.find(".filter").attr("placeholder", "不能为空！");
                this.toast.Show("组合查询条件为空！");
                return;
            }
            //显示进度，按钮不可用
            // this.domObj.find(".search").attr({ "disabled": "disabled" });
            this.AppX.runtimeConfig.loadMask.Show("正在执行中，请耐心等待...");
            this.domObj.find(".search").addClass('disabled');
            (<any>this.domObj.find(".search")).button('analyze');

            var urlindex = this.currentid.urlindex;
            var selectedlayers = this.domObj.find(".layers option:selected");
            var layerUrl = this.AppX.appConfig.gisResource.pipe.config[urlindex].url + '/' + selectedlayers.val().split(':')[1];
            var setting: any = {};
            setting.url = layerUrl;
            setting.layerid = selectedlayers.val().split(':')[1];
            setting.layername = selectedlayers.text().trim();
            setting.urlindex = urlindex;
            setting.filter = this.domObj.find(".filter").val() == "" ? "1=1" : this.domObj.find(".filter").val();
            this.queryPage(setting);
            this.domObj.find(".search").removeClass('disabled');
            (<any>this.domObj.find(".search")).button('reset');
        }.bind(this));
    }

    /**
    * (方法说明)分页查询
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    queryPage(setting) {
        var queryTask = new QueryTask(setting.url);
        var query = new Query();
        query.returnGeometry = false;
        query.where = setting.filter;
        query.orderByFields = ["OBJECTID asc"];//默认排序
        var consoleError = console.error;
        console.error = function () { };
        queryTask.executeForIds(query, function (results) {
            this.AppX.runtimeConfig.loadMask.Hide();
            console.error = consoleError;
            //调用展示数据面板
            if (results == null || results.length == 0) {
                this.AppX.runtimeConfig.toast.Show("查询数据为空！");
                this.domObj.find(".search").removeClass('disabled');
                (<any>this.domObj.find(".search")).button('reset');
                return;
            }
            var layerfields = this.AppX.runtimeConfig.fieldConfig.GetLayerFields(setting.layername);
            var outfields, alias, objectidVisible = true;
            if (layerfields != null) {
                outfields = layerfields.fields.map(item => { return item.name });
                alias = layerfields.fields.map(item => { return item.alias });
                objectidVisible = layerfields.objectid;
            }
            var dataQuery = {where:setting.filter,geometry:null};
            var tab = this.dataPanelWrap(setting.urlindex, results, setting.layername, setting.layerid, query.orderByFields[0], outfields, objectidVisible, alias,dataQuery);
            this.AppX.runtimeConfig.dataPanel.showPage({ tabs: [tab] });
        }.bind(this), function (error) {
            this.AppX.runtimeConfig.loadMask.Hide();
            console.error = consoleError;
            if (error.httpCode == 500) {
                this.AppX.runtimeConfig.toast.Show("服务端错误，请检查相关服务！");
            } else if (error.httpCode == 400) {
                this.AppX.runtimeConfig.toast.Show("请检查“组合查询条件”是否正确！");
            } else if (error.httpCode == undefined) {
                this.AppX.runtimeConfig.toast.Show(error.message);
            }
            this.domObj.find(".search").removeClass('disabled');
            (<any>this.domObj.find(".search")).button('reset');
            if (this.dataPanel != null) {
                this.dataPanel.close();
            }
        }.bind(this));
    }

    /** 
    * (方法说明)数据面板格式转换
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

    //回调函数
    // var
    queryAliasCallback(data) {

        if (data.code == 10000) {
            this.domObj.find(".fields").empty();
            var attributionObj = this.domObj.find(".fields");
            var liattributionObj = "";
            if (data.result.rows.length == 0) {
                this.toast.Show("查询数据为空！");
                return;
            }
            $.each(data.result.rows, function (i, value) {
                var index = this.config.shieldField.indexOf(value.name);
                if (index <= -1) {
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
                    strli += "<li class=\"checkbox check2 uniquefieldvalue\"><label data=timestamp>" + value + " </label></li>";
                } else if (value == " ") {
                    value = "' '";
                    strli += "<li  class=\"checkbox check2 uniquefieldvalue\"><label  data=nullvalue>" + value + " </label></li>";
                } else {
                    // uniqueValueObj.append("<option" + " " + "value=" + value + ">" + value + "</option>");
                    strli += "<li  class=\"checkbox check2 uniquefieldvalue\"><label >" + value + " </label></li>";
                }

                if (i + 2 > this.config.uniquemaxnum) {
                    getuniquevaluebtn.text("获取唯一值");
                    this.toast.Show("默认只显示前" + this.config.uniquemaxnum + "条！");
                    return false;
                }
            }.bind(this));
            uniqueValueObj.append(strli);
            //唯一值双击选择事件
            var that: any = this;
            this.domObj.find(".uniquefieldvalue").off("dblclick").on("dblclick", function () {
                if ($(this).attr("data") == "timestamp") {
                    that.domObj.find(".filter").val(that.domObj.find(".filter").val() + " " + "timestamp'" + this.innerText.trim() + "'");
                } else if ($(this).attr("data") == "nullvalue") {
                    that.domObj.find(".filter").val(that.domObj.find(".filter").val() + " " + this.innerText.trim());
                } else {
                    var insertValue = this.innerText.trim();
                    that.domObj.find('.filter').insertAtCaret(insertValue, true);
                    // that.domObj.find(".filter").val(that.domObj.find(".filter").val() + " " + "\'" + this.innerText.trim() + "\'");
                }
            });
            getuniquevaluebtn.text("获取唯一值");
        } else {
            // alert("查询出错，请检查");
            getuniquevaluebtn.text("获取唯一值");
            this.toast.Show("查询唯一值出错，请检查！");
            console.log(data.error);
        }
    }

    // 展示数据面板
    showDataPanel(results) {
        this.dataPanel.show(results);
        // this.domObj.find(".search").removeAttr("disabled");
        this.domObj.find(".search").removeClass('disabled');
        (<any>this.domObj.find(".search")).button('reset');
    }

    destroy() {
        if (this.dataPanel != null) {
            this.dataPanel.close();
        }
        this.domObj.remove();
        this.afterDestroy();
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
                            item.mapname = item.name;// + '(' + mapname + ')';
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
    * (方法说明)在指定textarea的鼠标位置插入文本
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private insertTextOnFocus(textAreaDom, insertText: string) {
        if (document.getSelection()) {
            //For browsers like Internet Explorer
            textAreaDom.focus();
            var sel: any = document.createRange();//.selection.createRange();
            sel.text = insertText;
            textAreaDom.focus();
        } else if (textAreaDom.selectionStart || textAreaDom.selectionStart == '0') {
            //For browsers like Firefox and Webkit based
            var startPos = textAreaDom.selectionStart;
            var endPos = textAreaDom.selectionEnd;
            var scrollTop = textAreaDom.scrollTop;
            textAreaDom.value = textAreaDom.value.substring(0, startPos) + insertText + textAreaDom.value.substring(endPos, textAreaDom.value.length);
            textAreaDom.focus();
            textAreaDom.selectionStart = startPos + insertText.length;
            textAreaDom.selectionEnd = startPos + insertText.length;
            textAreaDom.scrollTop = scrollTop;
        } else {
            textAreaDom.value += insertText;
            textAreaDom.focus();
        }
    }
}