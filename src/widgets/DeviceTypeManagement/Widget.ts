import BaseWidget = require('core/BaseWidget.class');

import QueryTask = require('esri/tasks/QueryTask');
import Query = require('esri/tasks/query');

export = DeviceTypeManagement;

class DeviceTypeManagement extends BaseWidget {
    baseClass = "widget-devicetypemanagement";

    map = null;
    layers = [];
    toast = null;
    popup = null;
    isfirst = false;
    totalpage = 1;
    currentpage = 1;
    currentpagesieze = 13;


    devicetypeid = "";
    name = "";
    sqlfilter = "";
    contact_layer = "";
    point_type_id = "";
    point_type_name = "";
    cn_contact_layer_name = "";


    keyword = "";
    pipeServicePath = "";
    layers_en_name = null;//图层英文名





    startup() {
        this.configure();
        this.initHtml();
        this.initEvent();
    }
    initHtml() {
        var html = _.template(this.template.split('$$')[0] + "</div>")();
        this.setHtml(html);
        this.ready();
        this.getDeviceType(this.config.pagenumber);
    }

    configure() {
        this.toast = this.AppX.runtimeConfig.toast;
        this.popup = this.AppX.runtimeConfig.popup;
        this.map = this.AppX.runtimeConfig.map;
        //获取所有管线图层名称
        this.layers = null;
        this.layers = this.findPipeLayers();

        //获取隐患类型信息
        if (this.AppX.appConfig.gisResource.pipe.config[0] == undefined) {
            this.toast.Show("管线服务未配置到config！");
            return;
        } else {
            this.pipeServicePath = this.AppX.appConfig.gisResource.pipe.config[0].url;
        }

        if (this.layers.length == 0) {
            this.toast.Show("管线图层无数据！");
            return;
        }
        var idsdata = [];
        $.each(this.layers, function (i, item) {
            idsdata.push(item.id);
        })
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


    getDeviceTypeListCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("查询隐患类型信息出错！");
            console.log(results.message);
            return;
        }

        if (results.result.total % this.config.pagesize == 0) {
            this.totalpage = Math.floor(parseInt(results.result.total) / parseInt(this.config.pagesize));

        } else {
            this.totalpage = Math.floor(parseInt(results.result.total) / parseInt(this.config.pagesize)) + 1;

        }

        //为分页控件添加信息

        this.domObj.find(".pagecontrol").text("总共" + results.result.total + "条记录，每页默认显示" + that.currentpagesieze + "条记录");
        this.domObj.find(".content").text("第" + that.currentpage + "页共" + that.totalpage + "页");
        if (that.totalpage == 0) {
            this.domObj.find(".content").text("无数据");
            this.domObj.find(".pagecontrol").text("总共-条记录，每页默认显示" + that.currentpagesieze + "条记录");
            this.domObj.find(".content").text("第-页共-页");
        }

        //生成table ,并给分页控件赋值事件

        // this.currentpage = results.result.pageindex;
        //动态生成书签及分页控件
        var domtb = this.domObj.find(".addhiddendangerdevice");
        domtb.empty();
        var address;
        var html_trs_data = "";
        var lx = "";
        var xjlx = "";
        $.each(results.result.rows, function (i, item) {
            // if (item.type == "0") {
            //     lx = "点";
            // } else if (item.type == "1") {
            //     lx = "线";
            // }
            // if (item.level2 == 0) {
            //     xjlx = "巡检点";
            // } else if (item.level2 == 1) {
            //     xjlx = "巡检线";
            // } else if (item.level2 == 2) {
            //     xjlx = "巡检设备";
            // } else if (item.level2 == 3) {
            //     xjlx = "隐患点";
            // } else if (item.level2 == 4) {
            //     xjlx = "管线";
            // }

            item.sqlfilter.replace("=", "&#61");

            html_trs_data += "<tr class=goto  data-id='" + item.id + "' data-name='" + item.name + "' data-point_type_id='" + item.point_type_id + "' data-contact_layer_id='" + item.contact_layer_id + "'  data-point_type_name='" + item.point_type_name + "'  data-cn_contact_layer_name='" + item.cn_contact_layer_name + "'  data-sqlfilter= '" + item.sqlfilter.replace(/'/g, "##").replace("=", "@@") + "'  ><td>" + item.name + "</td><td>" + item.cn_contact_layer_name + "</td><td>" + item.sqlfilter + "</td><td>" + item.point_type_name + "</td></tr>";
            //刷新infowindow
            // this.setContent(item);
        }.bind(this));
        domtb.append(html_trs_data);


        var html_trs_blank = "";
        if (results.result.rows.length < that.config.pagesize) {
            var num = that.config.pagesize - results.result.rows.length;
            for (var i = 0; i < num; i++) {
                html_trs_blank += "<tr class=goto><td></td><td></td><td></td><td></td></tr>";
            }
            domtb.append(html_trs_blank);
        }




    }


    initEvent() {


        this.domObj.find('.btn_search').on("click", function () {

            this.keyword = this.domObj.find('.search_condition').val();

            this.getDeviceType(this.config.pagenumber);



        }.bind(this));


        this.domObj.find('.search_condition').keydown(function (event) {
            if (event.keyCode == 13) {//enter
                this.keyword = this.domObj.find('.search_condition').val();
                this.getDeviceType(this.config.pagenumber);
            }
        }.bind(this));

        //重置查询
        this.domObj.find('.btn_rsearch').on("click", function () {

            this.keyword = "";
            this.domObj.find('.search_condition').val("");
            this.getDeviceType(this.config.pagenumber);

        }.bind(this));




        this.domObj.find('.btn_add').on("click", function () {

            //弹出popup
            this.popup.setSize(600, 350);
            var Obj = this.popup.Show("新增", this.template.split('$$')[1]);
            this.layers;
            var lay = Obj.conObj.find('.contact_layer').empty();
            var strlay = "";
            $.each(this.layers, function (index, item) {
                strlay += "<option value=" + item.id + " > " + item.name + " </option>";

            }.bind(this));
            lay.append(strlay);


            this.getXJType(Obj);

            //验证sql查询
            Obj.conObj.find('.btn-yanzheng').on("click", function () {
                var sqlfilter = Obj.conObj.find('.sqlfilter');
                if (sqlfilter.val() != '') {
                    var that = this;

                    var contact_layer = Obj.conObj.find('.contact_layer option:selected');
                    var url = this.AppX.appConfig.gisResource.pipedata.config[0].url;
                    var queryTask = new QueryTask(url + "/" + contact_layer.val());
                    var query = new Query();

                    query.where = sqlfilter.val();
                    queryTask.execute(query, function (results) {
                        that.toast.Show("验证成功！");

                    }, function () {
                        that.toast.Show("验证失败！");
                    });
                }




            }.bind(this));

            //验证
            (<any>$('#devicetypemanagement_addpopup')).bootstrapValidator();

            Obj.submitObj.off("click").on("click", function () {
                var that = this;

                var name = Obj.conObj.find(".name");


                var contact_layer = Obj.conObj.find('.contact_layer option:selected');
                // var contact_layer_id = Obj.conObj.find('.contact_layer option:selected');
                var sqlfilter = Obj.conObj.find('.sqlfilter');
                var point_type_id = Obj.conObj.find('.point_type_id option:selected');

                var enlayername = "";
                $.each(this.layers_en_name, function (i, item) {
                    if (item.layername.trim() == contact_layer.text().trim()) {
                        enlayername = item.layerdbname;
                    }
                })


                if (name.val() == '') {
                    name.addClass('has-error');
                    name.attr("placeholder", "不能为空！");
                    // this.toast.Show("隐患分类不能为空！");
                    return;
                }
                if (point_type_id.val() == '') {
                    point_type_id.addClass('has-error');
                    point_type_id.attr("placeholder", "不能为空！");
                    // this.toast.Show("隐患类别不能为空！");
                    return;
                }

                if (sqlfilter.val() != '') {
                    var url = this.AppX.appConfig.gisResource.pipedata.config[0].url;
                    var queryTask = new QueryTask(url + "/" + contact_layer.val());
                    var query = new Query();


                    query.where = sqlfilter.val();
                    queryTask.execute(query, function (results) {
                        // that.toast.Show("验证成功！");

                        $.ajax({
                            headers: {
                                'Token': AppX.appConfig.xjxj,
                                'departmentid': AppX.appConfig.departmentid,
                            },
                            type: "POST",
                            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.addDeviceType,
                            data: {
                                "name": name.val(),
                                "contact_layer_id": contact_layer.val(),
                                "cn_contact_layer_name": contact_layer.text(),
                                "en_contact_layer_name": enlayername,
                                "sqlfilter": sqlfilter.val(),
                                "point_type_id": point_type_id.val(),
                            },
                            success: this.addDeviceTypeCallback.bind(this),
                            error: function (data) {
                                this.toast.Show("服务端ajax出错，获取数据失败!");
                            }.bind(this),
                            dataType: "json",
                        });

                    }.bind(this), function () {
                        that.toast.Show("验证失败！");
                        return;
                    });

                } else {
                    $.ajax({
                        headers: {
                            'Token': AppX.appConfig.xjxj,
                            'departmentid': AppX.appConfig.departmentid,
                        },
                        type: "POST",
                        url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.addDeviceType,
                        data: {
                            "name": name.val(),
                            "contact_layer_id": contact_layer.val(),
                            "cn_contact_layer_name": contact_layer.text(),
                            "en_contact_layer_name": enlayername,
                            "sqlfilter": sqlfilter.val(),
                            "point_type_id": point_type_id.val(),
                        },
                        success: this.addDeviceTypeCallback.bind(this),
                        error: function (data) {
                            this.toast.Show("服务端ajax出错，获取数据失败!");
                        }.bind(this),
                        dataType: "json",
                    });
                }









            }.bind(this));











        }.bind(this));

        this.domObj.find('.btn_edit').on("click", function () {
            var that = this;
            if (this.devicetypeid == "") {
                this.toast.Show("请选择要修改的隐患类型！");
                return;
            }
            //弹出popup
            this.popup.setSize(600, 350);
            var Obj = this.popup.Show("修改", this.template.split('$$')[2]);
            //赋值

            var lay = Obj.conObj.find('.contact_layer').empty();
            var strlay = "<option> </option>";
            $.each(this.layers, function (index, item) {
                strlay += "<option value=" + item.id + " > " + item.name + " </option>";

            }.bind(this));
            lay.append(strlay);

            this.getXJType(Obj);

            Obj.conObj.find('.contact_layer').val(this.contact_layer);

            if (this.sqlfilter.toString().indexOf("##") > 0 && this.sqlfilter.toString().indexOf("@@") > 0) {
                Obj.conObj.find('.sqlfilter').val(this.sqlfilter.replace(/##/g, "'").replace("@@", "="));
            } else {
                Obj.conObj.find('.sqlfilter').val(this.sqlfilter);
            }


            //   this.userid = $(e.currentTarget).data("userid");
            // Obj.conObj.find('.id').val(this.devicetypeid);
            Obj.conObj.find('.name').val(this.name);
            Obj.conObj.find('.type').val(this.type);

            //验证sql查询
            Obj.conObj.find('.btn-yanzheng').on("click", function () {

                var sqlfilter = Obj.conObj.find('.sqlfilter');
                if (sqlfilter.val() != '') {
                    var that = this;

                    var contact_layer = Obj.conObj.find('.contact_layer option:selected');
                    var url = this.AppX.appConfig.gisResource.pipedata.config[0].url;
                    var queryTask = new QueryTask(url + "/" + contact_layer.val());
                    var query = new Query();

                    query.where = sqlfilter.val();
                    queryTask.execute(query, function (results) {
                        that.toast.Show("验证成功！");

                    }, function () {
                        that.toast.Show("验证失败！");
                    });
                }



            }.bind(this));


            //验证
            (<any>$('#devicetypemanagement_updatepopup')).bootstrapValidator();

            Obj.submitObj.off("click").on("click", function () {

                var name = Obj.conObj.find(".name");
                var contact_layer = Obj.conObj.find('.contact_layer option:selected');
                var sqlfilter = Obj.conObj.find('.sqlfilter');
                var point_type_id = Obj.conObj.find('.point_type_id option:selected');

                var enlayername = "";
                $.each(this.layers_en_name, function (i, item) {
                    if (item.layername.trim() == contact_layer.text().trim()) {
                        enlayername = item.layerdbname;
                    }
                })

                if (name.val() == '') {
                    name.addClass('has-error');
                    name.attr("placeholder", "不能为空！");
                    // this.toast.Show("隐患类型名称不能为空！");
                    return;
                }

                if (sqlfilter.val() != '') {
                    var url = this.AppX.appConfig.gisResource.pipedata.config[0].url;
                    var queryTask = new QueryTask(url + "/" + contact_layer.val());
                    var query = new Query();


                    query.where = sqlfilter.val();
                    queryTask.execute(query, function (results) {
                        // that.toast.Show("验证成功！");
                        $.ajax({
                            headers: {
                                'Token': AppX.appConfig.xjxj,
                                'departmentid': AppX.appConfig.departmentid,
                            },
                            type: "POST",
                            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.updateDeviceType,
                            data: {
                                "id": this.devicetypeid,


                                "name": name.val(),
                                "contact_layer_id": contact_layer.val(),
                                "cn_contact_layer_name": contact_layer.text(),
                                "en_contact_layer_name": enlayername,
                                "sqlfilter": sqlfilter.val(),
                                "point_type_id": point_type_id.val(),

                                // "default_level": strhiddendangerlevel,
                            },
                            success: this.updateDeviceTypeCallback.bind(this),
                            error: function (data) {
                                this.toast.Show("服务端ajax出错，获取数据失败!");
                            }.bind(this),
                            dataType: "json",
                        });

                    }.bind(this), function () {
                        that.toast.Show("验证失败！");
                        return;
                    });

                } else {
                    $.ajax({
                        headers: {
                            'Token': AppX.appConfig.xjxj,
                            'departmentid': AppX.appConfig.departmentid,
                        },
                        type: "POST",
                        url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.updateDeviceType,
                        data: {
                            "id": this.devicetypeid,


                            "name": name.val(),
                            "contact_layer_id": contact_layer.val(),
                            "cn_contact_layer_name": contact_layer.text(),
                            "en_contact_layer_name": enlayername,
                            "sqlfilter": sqlfilter.val(),
                            "point_type_id": point_type_id.val(),

                            // "default_level": strhiddendangerlevel,
                        },
                        success: this.updateDeviceTypeCallback.bind(this),
                        error: function (data) {
                            this.toast.Show("服务端ajax出错，获取数据失败!");
                        }.bind(this),
                        dataType: "json",
                    });
                }





            }.bind(this));





        }.bind(this));



        this.domObj.find('.btn_delete').on("click", function () {

            if (this.devicetypeid == "") {
                this.toast.Show("请选择要删除的隐患类型！");
                return;
            }

            this.popup.setSize(600, 150);

            var Obj = this.popup.Show("删除", this.template.split('$$')[4]);
            //赋值


            Obj.submitObj.off("click").on("click", function () {
                $.ajax({
                    headers: {
                        // 'Authorization-Token': AppX.appConfig.xjxj
                        'Token': AppX.appConfig.xjxj,
                        'departmentid': AppX.appConfig.departmentid,
                    },
                    type: "POST",
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.deleteDeviceType + this.devicetypeid,
                    data: {
                        "id": this.devicetypeid,
                        // f: "pjson"
                    },
                    success: this.deleteDeviceTypeCallback.bind(this),
                    error: function (data) {
                        this.toast.Show("服务端ajax出错，获取数据失败!");
                    }.bind(this),
                    dataType: "json",
                });
            }.bind(this));



        }.bind(this));

        // 选中行高亮
        this.domObj.off("click").on('click', 'tbody tr', (e) => {
            if ($(e.currentTarget).data("id") == null) {
                return;
            } else {
                this.devicetypeid = $(e.currentTarget).data("id");
                this.name = $(e.currentTarget).data("name");
                this.type = $(e.currentTarget).data("type");

                this.contact_layer = $(e.currentTarget).data("contact_layer_id");
                this.sqlfilter = $(e.currentTarget).data("sqlfilter");
                this.point_type_id = $(e.currentTarget).data("point_type_id");

                this.point_type_name = $(e.currentTarget).data("point_type_name");

                this.cn_contact_layer_name = $(e.currentTarget).data("cn_contact_layer_name");




            }
            this.domObj.find('tr.active').removeClass('active');
            $(e.currentTarget).addClass('active');



        });


        // 双击查看
        this.domObj.off("dblclick").on('dblclick', 'tbody tr', (e) => {

            if ($(e.currentTarget).data("id") == null) {
                return;
            } else {
                this.devicetypeid = $(e.currentTarget).data("id");
                this.name = $(e.currentTarget).data("name");
                this.type = $(e.currentTarget).data("type");
                this.sqlfilter = $(e.currentTarget).data("sqlfilter");

                this.point_type_id = $(e.currentTarget).data("point_type_id");
                this.point_type_name = $(e.currentTarget).data("point_type_name");
                this.cn_contact_layer_name = $(e.currentTarget).data("cn_contact_layer_name");


            }
            this.domObj.find('tr.active').removeClass('active');
            $(e.currentTarget).addClass('active');

            if (this.devicetypeid == "") {
                this.toast.Show("请选择一位用户");
                return;
            }

            this.popup.setSize(600, 350);

            var Obj = this.popup.Show("查看", this.template.split('$$')[3], true);
            //赋值

            //   this.userid = $(e.currentTarget).data("userid");
            Obj.conObj.find('.name').val(this.name);


            Obj.conObj.find('.contact_layer').val(this.cn_contact_layer_name);

            Obj.conObj.find('.point_type_id').val(this.point_type_name);
            if (this.sqlfilter.toString().indexOf("##") > 0 && this.sqlfilter.toString().indexOf("@@") > 0) {
                Obj.conObj.find('.sqlfilter').val(this.sqlfilter.replace(/##/g, "'").replace("@@", "="));
            } else {
                Obj.conObj.find('.sqlfilter').val(this.sqlfilter);
            }
            var lx = "";
            if (this.type == "0") {
                lx = "巡检点";
            } else if (this.type == "1") {
                lx = "巡检线";
            }

            Obj.conObj.find('.type').val(lx);




            Obj.submitObj.off("click").on("click", function () {
                this.popup.Close();
            }.bind(this));



        });



        //动态生成书签及分页控件
        //分页控件fykj 向前、向后事件
        this.domObj.find(".pre").off("click").on("click", function () {
            if (this.currentpage - 1 > 0) {
                this.currentpage = this.currentpage - 1;
                this.getDeviceType(this.currentpage);

            }

        }.bind(this));
        this.domObj.find(".next").off("click").on("click", function () {
            if (this.currentpage + 1 <= this.totalpage) {
                this.currentpage = this.currentpage + 1;
                this.getDeviceType(this.currentpage);

            }
        }.bind(this));


        this.domObj.find(".pageturning").off("click").on("click", function () {
            var currpage = parseInt(this.domObj.find(".currpage").val());
            if (currpage <= this.totalpage && currpage >= 1) {
                this.currentpage = parseInt(this.domObj.find(".currpage").val());
                this.getDeviceType(this.currentpage);

            }
        }.bind(this));


    }

    getDeviceType(pagenumber) {
        this.currentpage = pagenumber || this.config.pagenumber;
        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getDeviceTypeList,
            data: {
                "pageindex": pagenumber || this.config.pagenumber,
                "pagesize": this.config.pagesize,
                "keyword": this.keyword
                // f: "pjson"
            },
            success: this.getDeviceTypeListCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    addDeviceTypeCallback(results) {

        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            console.log(results.message);
            return;
        }
        this.popup.Close();
        that.toast.Show(results.message);
        //重新查询
        this.getDeviceType(this.config.pagenumber);


        //清空修改时产生的选中，避免直接点删除
        this.devicetypeid = "";
        this.name = "";
        this.type = "";


    }

    updateDeviceTypeCallback(results) {

        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            console.log(results.message);
            return;
        }
        this.popup.Close();
        that.toast.Show(results.message);
        //重新查询
        this.getDeviceType(this.config.pagenumber);

        //清空修改时产生的选中，避免直接点删除
        this.devicetypeid = "";
        this.name = "";
        this.type = "";


    }


    deleteDeviceTypeCallback(results) {

        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            console.log(results.message);
            return;
        }
        this.popup.Close();
        that.toast.Show(results.message);
        //重新查询
        this.getDeviceType(this.config.pagenumber);

        //清空
        this.devicetypeid = "";
        this.name = "";
        this.type = "";


    }


    findPipeLayers() {
        var PipeMapSubLayers = [];
        if (this.AppX.appConfig.gisResource.pipe.config.length > 0) {

            for (var i = 0; i < this.AppX.appConfig.gisResource.pipe.config.length; i++) {
                if (i == 0) {
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


    getXJType(Obj) {
        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getXJTypeList,
            data: {
                "pageindex": this.config.pagenumber,
                // "pagesize": this.config.pagesize_icon,
                "pagesize": 1000 || this.config.pagesize,
                // f: "pjson"
            },
            success: this.getXJTypeListCallback.bind({ Obj: Obj, objwidget: this }),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    getXJTypeListCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("查询用户信息出错！");
            console.log(results.message);
            return;
        }



        var users = this.Obj.domObj.find(".point_type_id").empty();
        var strusers = "";
        $.each(results.result.rows, function (index, item) {
            if (index == 0) {
                strusers += "<option value='" + item.id + "' selected>" + item.name + " </option>";
            }
            strusers += "<option value='" + item.id + "'>" + item.name + " </option>";

        }.bind(this));
        users.append(strusers);


        this.Obj.domObj.find(".point_type_id").val(this.objwidget.point_type_id);


    }






    queryLayerNameCallback(data) {
        var that = this;
        if (data.code == 10000) {
            // = data.result.rows;
            //遍历出数量统计所需图层
            // data.result.rows.forEach(function (item, i) {
            //     that.layersData.push(item);
            // });
            this.layers_en_name = data.result.rows;


        } else {
            that.toast.Show("查询出错！请检查");
            console.log(data.error);
        }
    }





    destroy() {

        this.domObj.remove();
        this.afterDestroy();
    }
}