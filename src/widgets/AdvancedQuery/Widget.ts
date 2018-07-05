import BaseWidget = require('core/BaseWidget.class');

import Map = require("esri/map");
import Layer = require("esri/layers/layer");
import QueryTask = require("esri/tasks/QueryTask");
import Query = require("esri/tasks/query");
import LayerInfo = require("esri/layers/LayerInfo");
import ArcGISDynamicMapServiceLayer = require("esri/layers/ArcGISDynamicMapServiceLayer");




export = AdvancedQuery;
class AdvancedQuery extends BaseWidget {
    baseClass = "AdvancedQuery";

    //加载的地图对象
    map: Map;
    //表是查询什么（管径、材质。。）w
    queryWhat: string;

    //根据字段查询到所有的唯一值
    fieldUniqueValue: string[];

    //选择的图层
    selectedLayer: string;
    //layerName:layerid
    layerId = [];

    //选中的属性
    selectedAttr = [];

    //选中的图层的id
    selectedLayerId;
    //
    imgCount: number = 0;



    startup() {
        this.setHtml(_.template(this.template)({
            hello: this.config.hello + (/\/([a-zA-Z]+)$/g.exec(this.widgetPath)[1])
        }));


        //根据查询项目初始化查询界面
        this.advancedQueryToolInit();
    }

    destroy() {
        this.domObj.remove();
        this.afterDestroy();
        if (this.AppX.runtimeConfig.dataPanel != null) {
            this.AppX.runtimeConfig.dataPanel.close();
        }

    }



    advancedQueryToolInit() {
        ///判断所需的服务是否存在
        if (this.AppX.appConfig.gisResource.pipe.config.length == 0) {
            this.AppX.runtimeConfig.toast.Show('获取分析服务出错！');
        } else {
            this.config.getFieldUniqueValueUrl = this.AppX.appConfig.gisResource.pipe.config[0].url + this.config.getFieldUniqueValueUrl;
            //添加图层选项下拉控件的选项值
            this.addOptionToDrapdow();
            //获取选中的值
            this.selectedLayer = $(".AdvancedQuery-layerName").find("option:selected").text();
            //添加下拉列表选项的change事件监听
            this.addListener();

            //add clickListener to the img element
            var that = this;
            $(".AdvancedQuery-img").bind("click", this.imgClickCallbakc.bind(this));
            //主动触发点号查询单击事件
            $(".AdvancedQuery-img").first().trigger("click");
            //查询按钮 添加绑定事件
            $(".AdvancedQuery-queryBtn").bind("click", this.queryBtnCallback.bind(this));
        }
    }

    //AdvancedQuery-img click callback
    imgClickCallbakc(event) {

        //set the border attribute of all  img container
        $(".AdvancedQuery-img-container").css("border", "none");
        var targetParent = event.target.parentElement;
        $(targetParent).css("border", "1px solid red");
        var target: HTMLImageElement = <HTMLImageElement>event.target;
        if (target.alt == "点号查询") {
            $(".AdvancedQuery-attribute").text("点号：");
            this.queryWhat = "OLDNO";
            //获得选中图层的id
            this.selectedLayerId = this.getSelectedLayeid(this.selectedLayer);
            if ($(".AdvancedQuery-attribute-input").length != 0) {
                $(".AdvancedQuery-attribute-input").removeAttr("placeholder");
            }


            //清除可选属性
            $(".AdvancedQuery-attribute-value").children().remove();

            if ($(".AdvancedQuery-attribute-input").length == 0) {
                //添加输入框
                this.addAttributeChooseFrom(this.fieldUniqueValue);
            }
        } else if (target.alt == "图幅号查询") {

            $(".AdvancedQuery-attribute").text("图幅号：");
            this.queryWhat = "DISTNO";
            //获得选中 图层的id
            this.selectedLayerId = this.getSelectedLayeid(this.selectedLayer);
            //清除可选属性
            $(".AdvancedQuery-attribute-value").children().remove();

            if ($(".AdvancedQuery-attribute-input").length != 0) {
                $(".AdvancedQuery-attribute-input").removeAttr("placeholder");
            }


            if ($(".AdvancedQuery-attribute-input").length == 0) {
                //添加输入框
                this.addAttributeChooseFrom(this.fieldUniqueValue);

            }
            // //根据查询的选项添加查询的可选属性值
            // that.getFieldUniqueValueByAjax(layerid, that.queryWhat);
        } else if (target.alt == "管径查询") {

            $(".AdvancedQuery-attribute").text("管径：");
            $(".AdvancedQuery-attribute-input").remove();
            this.queryWhat = "DIAMETER";
            //获得选中 图层的id
            this.selectedLayerId = this.getSelectedLayeid(this.selectedLayer);
            //解决从 一个查询模块跳转到另一个查询模块后之前的属性值未删除
            this.selectedAttr = [];
            //设置属性DIV可见
            $(".AdvancedQuery-attribute-value").css("display", "block");
            //清除可选属性
            $(".AdvancedQuery-attribute-value").children().remove();
            //根据查询的选项添加查询的可选属性值
            // this.getFieldUniqueValueByAjax(this.selectedLayerId, this.queryWhat);
            this.addAttributeChooseFrom([]);
        } else if (target.alt == "材质查询") {
            //防止多次点击材质图片出现的问题
            this.imgCount++;
            if (this.imgCount > 1) {
                return;
            }
            $(".AdvancedQuery-attribute-input").remove();
            $(".AdvancedQuery-attribute").text("材质：");
            this.queryWhat = "MATERIAL";

            //解决从 一个查询模块跳转到另一个查询模块后之前的属性值未删除
            this.selectedAttr = [];
            //获得选中 图层的id
            this.selectedLayerId = this.getSelectedLayeid(this.selectedLayer);
            //设置属性DIV可见
            $(".AdvancedQuery-attribute-value").css("display", "block");
            //清除可选属性
            $(".AdvancedQuery-attribute-value").children().remove();
            //根据查询的选项添加查询的可选属性值
            this.getFieldUniqueValueByAjax(this.selectedLayerId, this.queryWhat);

        } else if (target.alt == "竣工查询") {

            $(".AdvancedQuery-attribute").text("竣工：");
            this.queryWhat = "FINISHDATE";
            //获得选中 图层的id
            this.selectedLayerId = this.getSelectedLayeid(this.selectedLayer);
            $(".AdvancedQuery-attribute-input").remove();
            //设置属性DIV可见
            $(".AdvancedQuery-attribute-value").css("display", "block");
            //清除可选属性
            $(".AdvancedQuery-attribute-value").children().remove();
            //添加日期控件
            this.addAttributeChooseFrom(this.fieldUniqueValue);
            // //根据查询的选项添加查询的可选属性值
            // that.getFieldUniqueValueByAjax(layerid, that.queryWhat);
        } else if (target.alt == "地址查询") {
            $(".AdvancedQuery-attribute").text("地址：");
            this.queryWhat = "ADDR";
            //获得选中 图层的id
            this.selectedLayerId = this.getSelectedLayeid(this.selectedLayer);

            //清除可选属性
            $(".AdvancedQuery-attribute-value").children().remove();
            if ($(".AdvancedQuery-attribute-input").length != 0) {
                $(".AdvancedQuery-attribute-input").removeAttr("placeholder");
            }


            if ($(".AdvancedQuery-attribute-input").length == 0) {
                //添加输入框
                this.addAttributeChooseFrom(this.fieldUniqueValue);
            }
        }

    }


    //查询按钮的回调函数
    queryBtnCallback(event) {

        if (this.queryWhat == "MATERIAL") {
            var SQLWhere: string = "";
            for (var i = 0; i < this.selectedAttr.length; i++) {
                SQLWhere = SQLWhere + this.queryWhat + "=" + "'" + this.selectedAttr[i] + "'";
                if (this.selectedAttr.length > 1 && i < this.selectedAttr.length - 1) {
                    SQLWhere = SQLWhere + " or ";
                }
            }
            this.QueryTask(SQLWhere);
        } else if (this.queryWhat == "DIAMETER") {
            if ($(".AdvancedQuery-DIAMETER-input").val() == "") {
                $(".AdvancedQuery-DIAMETER-input").attr("placeholder", "不能为空！")
            }

            else if (/^\d+$/.test($.trim($(".AdvancedQuery-DIAMETER-input").val()))) {
                //get　selected logic value 
                var logic = $('input.AdvancedQuery-DIAMETER:checked').val();

                var SQLWhere = this.queryWhat + logic + $(".AdvancedQuery-DIAMETER-input").val();
                this.QueryTask(SQLWhere);
            }

            else {
                $(".AdvancedQuery-DIAMETER-input").val('');
                $(".AdvancedQuery-DIAMETER-input").prop("placeholder", "请输入数字！");
            }

        }




        else if (this.queryWhat == "OLDNO" || this.queryWhat == "DISTNO" || this.queryWhat == "ADDR") {

            if ($(".AdvancedQuery-attribute-input").val() == "") {
                $(".AdvancedQuery-attribute-input").attr("placeholder", "不能为空！");
                return;
            }
            var SQLWhere: string = $(".AdvancedQuery-attribute-input").val();
            SQLWhere = this.queryWhat + " like" + "'%" + SQLWhere + "%'";
            this.QueryTask(SQLWhere);


        } else {
            var SQLWhere: string;
            var startDateText = $(".AdvancedQuery-datewidget-start").val();
            var endDateText = $(".AdvancedQuery-datewidget-end").val();
            var startDate = new Date(startDateText);
            var endDate = new Date(endDateText);
            if (startDate.getTime() > endDate.getTime()) {
                alert("起止日期不能大于终止日期");
            } else if (startDate.getTime() == endDate.getTime()) {
                SQLWhere = this.queryWhat + "= date" + "'" + startDateText + "'";
                this.QueryTask(SQLWhere);
            } else {
                SQLWhere = this.queryWhat + " between" + " date '" + startDateText + "' and date '" + endDateText + "'";
                this.QueryTask(SQLWhere);
            }


        }

    }

    //add option to the drapDown element
    addOptionToDrapdow() {
        //get the mapControl
        this.map = this.AppX.runtimeConfig.map;


        //获取可见范围中的所有图层
        var layerId = this.map.layerIds;
        var layerInfos: LayerInfo[]
        for (var i = 0; i < layerId.length; i++) {
            var layer = this.map.getLayer(layerId[i]);
            var layerUrl = layer.url;
            if (/PIPE/.test(layerUrl)) {
                var pipeLayer: ArcGISDynamicMapServiceLayer = <ArcGISDynamicMapServiceLayer>layer;
                layerInfos = pipeLayer.layerInfos;
            }
        }



        // //获取管线图层上的所有子图层
        // var subLayers: Layer[];
        // layersCollection.forEach(function (item, i) {
        //     var title: string = item.title;
        //     if (title != null) {
        //         if (title.match(/PIPE/)) {
        //             subLayers = item.allSublayers;
        //         }
        //     }


        // });

        //添加下拉列表的option
        for (var i = 1; i < layerInfos.length; i++) {
            var title = layerInfos[i].name;
            var option = "<option>" + title + "</option>";
            $(option).appendTo($(".AdvancedQuery-layerName"));
            this.layerId.push(title + ":" + layerInfos[i].id);
        }
    }
    QueryTask(sqlWhere: string) {
        var queryUrl = this.AppX.appConfig.gisResource.pipe.config[0].url + "\/" + this.selectedLayerId;
        var queryTask = new QueryTask(queryUrl);
        var query = new Query();
        query.outFields = ["*"];
        query.where = sqlWhere;
        queryTask.execute(query).then(this.queryTaskCallBack.bind(this));
    }

    queryTaskCallBack(result) {

        // for (var i = 0; i < result.features.length; i++) {
        //     var miliseconds = result.features[i].attributes["FINISHDATE"]
        //     var date = new Date(miliseconds);
        //     var year = date.getFullYear();
        //     var month = date.getMonth();
        //     var day = date.getDay();
        //     result.features[i].attributes["FINISHDATE"] = year + "-" + month + "-" + day;

        // }

        this.dateTransform(result, "FINISHDATE");
        this.dateTransform(result, "REPAIRDATE");
        this.dateTransform(result, "WRITEDATE");
        this.dateTransform(result, "CHANGEDATE");
        this.dateTransform(result, "GASDATE");
        result.id = "advancedQuery";
        result.title = this.selectedLayer;
        result.layerId = this.selectedLayerId;
        this.AppX.runtimeConfig.dataPanel.show(result);



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

    //通过ajax根据指定的图层和字段，结果放入公共变量fieldUniqueValue中
    getFieldUniqueValueByAjax(layerid: number, fieldName: string) {
        var that = this;
        $.ajax({
            type: "get",
            url: this.config.getFieldUniqueValueUrl,
            data: {
                usertoken: this.AppX.appConfig.usertoken,
                layerid: layerid,
                field_name: fieldName,
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
    //添加下拉选项的改变事件
    addListener() {
        var drapDown = $(".AdvancedQuery-layerName");
        var that = this;
        drapDown.on("change", function () {
            if (that.queryWhat == "MATERIAL") {
                //清除可选属性
                $(".AdvancedQuery-attribute-value").children().remove();
                //获取当前选的图层值
                that.selectedLayer = drapDown.find("option:selected").text();
                //获取所选图层的ID
                that.selectedLayerId = that.getSelectedLayeid(that.selectedLayer);

                that.getFieldUniqueValueByAjax(that.selectedLayerId, that.queryWhat);
            } else {

                if ($(".AdvancedQuery-attribute-input").length != 0) {
                    $(".AdvancedQuery-attribute-input").removeAttr("placeholder");
                }
                that.selectedLayer = drapDown.find("option:selected").text();
                that.selectedLayerId = that.getSelectedLayeid(that.selectedLayer);

            }

        });
    }

    //获取选中图层的layerid
    getSelectedLayeid(layerName: string) {
        var selected: string;
        var regExp = new RegExp(layerName);
        for (var i = 0; i < this.layerId.length; i++) {
            if (this.layerId[i].match(regExp)) {
                selected = this.layerId[i];
            }
        }
        var layerid: number = parseInt(selected.replace(/[^0-9]/ig, ""));
        return layerid;//[^0-9]不含有下列数字 ,i不区分大小写，g在全局下进行
    }

    //添加可选属性的checkbox
    addAttributeChooseFrom(fieldUniqueValue: string[]) {

        //材质、管径 查询提供checkbox
        if (this.queryWhat == "MATERIAL") {
            // if (this.queryWhat == "DIAMETER") {

            //     //将字符串数组转换为数字数组
            //     var sortFieldUniqueValue = [];
            //     for (var i = 0; i < fieldUniqueValue.length; i++) {
            //         sortFieldUniqueValue.push(parseInt(fieldUniqueValue[i]));
            //     }
            //     //按照从小到大排序
            //     fieldUniqueValue = sortFieldUniqueValue.sort(function (a, b) {
            //         if (a > b) {
            //             return 1;

            //         } else if (a < b) {
            //             return -1

            //         } else {
            //             return 0;

            //         }

            //     })
            // }
            for (var i = 0; i < fieldUniqueValue.length; i++) {
                if ($.trim(fieldUniqueValue[i]).length == 0) {

                } else {
                    var AttributeChooseFrom = "<p>" + "<input type=\"checkbox\" class=\"AdvancedQuery-checkbox\">" + fieldUniqueValue[i] + "</p>";
                    $(AttributeChooseFrom, {
                    }).appendTo($(".AdvancedQuery-attribute-value"));
                }

            }
        } else if (this.queryWhat == "DIAMETER") {
            $("<div class=\"input-group AdvancedQuery-DIAMETER-container\"></div>").appendTo($(".AdvancedQuery-attribute-value"));

            $("<input type=\"radio\" name=\"logic\" value=\"=\" class=\"AdvancedQuery-DIAMETER\" checked=\"checked\"> =</input>").appendTo($(".AdvancedQuery-DIAMETER-container"));
            $("<input type=\"radio\" name=\"logic\" value=\"<\" class=\"AdvancedQuery-DIAMETER\"> &lt</input> ").appendTo($(".AdvancedQuery-DIAMETER-container"));
            $("<input type=\"radio\" name=\"logic\" value=\">\" class=\"AdvancedQuery-DIAMETER\"> &gt</input> ").appendTo($(".AdvancedQuery-DIAMETER-container"));
            $("<input type=\"text\" class=\"form-control AdvancedQuery-DIAMETER-input\">").appendTo($(".AdvancedQuery-DIAMETER-container"));
        }
        else if (this.queryWhat == "OLDNO" || this.queryWhat == "DISTNO" || this.queryWhat == "ADDR") {
            //设置属性DIV不可见且不占用空间
            $(".AdvancedQuery-attribute-value").css("display", "none");
            if ($(".AdvancedQuery-attribute-input").length == 0) {
                var input = "<input type=\"text\"  autofocus=\"autofocus\" class=\"form-control AdvancedQuery-attribute-input \" style=\"margin-bottom:100px;\">";
                $(input).appendTo($(".AdvancedQuery-attribute-container"));
            }

        } else if (this.queryWhat == "FINISHDATE") {
            var startDate = "<h5 class=\"AdvancedQuery-starttext\"><span class=\"dateStart\">起始：</span></h5>"
            var endDate = "<h5 class=\"AdvancedQuery-endtext\"><span class=\"dateEnd\">终止：</span></h5>"
            var stratDateWidget = "<input type=\"text\" class=\"AdvancedQuery-datewidget-start form-control\" placeholder=\"年/月/日\" readonly> ";
            var endDateWidget = "<input type=\"text\" class=\"AdvancedQuery-datewidget-end form-control\" placeholder=\"年/月/日\" readonly>";
            $(startDate).appendTo($(".AdvancedQuery-attribute-value"));
            $(stratDateWidget).appendTo($(".AdvancedQuery-starttext"));
            $(endDate).appendTo($(".AdvancedQuery-attribute-value"));
            $(endDateWidget).appendTo($(".AdvancedQuery-endtext"));


            //jquery 日期控件初始化
            $.jeDate(".AdvancedQuery-datewidget-start", {
                format: 'YYYY/MM/DD', //日期格式  
                isinitVal: false,
                choosefun: function (elem, val) {
                    this.startDate = val;


                }.bind(this)
            })
            //jquery 日期控件初始化
            $.jeDate(".AdvancedQuery-datewidget-end", {
                format: 'YYYY/MM/DD', //日期格式  
                isinitVal: false,
                choosefun: function (elem, val) {
                    var startDate = this.startDate.split("-");
                    var startTime = new Date(startDate[0], startDate[1], startDate[2]);
                    var startMinute = startTime.getTime();
                    var endDate = val.split("-");
                    var endTime = new Date(endDate[0], endDate[1], endDate[2]);
                    var endMinute = endTime.getTime();
                    if (endMinute < startMinute) {
                        this.AppX.runtimeConfig.toast.Show('终止时间不能小于起始时间！');
                    }
                }.bind(this),
                okfun: function (elem, val) {
                    var startDate = this.startDate.split("-");
                    var startTime = new Date(startDate[0], startDate[1], startDate[2]);
                    var startMinute = startTime.getTime();
                    var endDate = val.split("-");
                    var endTime = new Date(endDate[0], endDate[1], endDate[2]);
                    var endMinute = endTime.getTime();
                    if (endMinute < startMinute) {
                        this.AppX.runtimeConfig.toast.Show('终止时间不能小于起始时间！');
                    }
                }.bind(this)
            })



        }
        var that = this;
        $(".AdvancedQuery-checkbox").on("change", function (event) {

            if (($(event.target).prop("checked")) == true) {
                var attrSelected = $(event.target).parent().text();
                that.selectedAttr.push(attrSelected);
            }
        })

    }
}