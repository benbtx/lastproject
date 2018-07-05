import BaseWidget = require('core/BaseWidget.class');
export = DeviceHiddenDangerTable;

class DeviceHiddenDangerTable extends BaseWidget {
    baseClass = "widget-devicehiddendangertable";

    toast = null;
    popup = null;
    isfirst = false;
    totalpage = 1;
    currentpage = 1;
    currentpagesieze = 100;


    id = "";
    content = "";
    levelid = "";
    level_name = "";
    trouble_type_id = "";
    trouble_type_name = "";
    strhiddendangerlevel = "";
    sys_device_type_id = "";
    sys_device_type_name = "";
    devicetype = "";
    keyword = "";



    startup() {
        this.configure();
        this.initHtml();
        this.initEvent();
    }
    initHtml() {
        var html = _.template(this.template.split('$$')[0] + "</div>")();
        this.setHtml(html);
        this.ready();
        this.getDeviceHiddenDangerTable(this.config.pagenumber);
    }

    configure() {
        this.toast = this.AppX.runtimeConfig.toast;
        this.popup = this.AppX.runtimeConfig.popup;
        //获取隐患类型信息
    }


    getDeviceHiddenDangerTableListCallback(results) {
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
        var domtb = this.domObj.find(".addhiddendangertype");
        domtb.empty();
        var address;
        var html_trs_data = "";
        $.each(results.result.rows, function (i, item) {

            html_trs_data += "<tr class=goto  data-id='" + item.id + "' data-content='" + item.content + "' data-levelid='" + item.levelid + "' data-level_name='" + item.level_name + "' data-trouble_type_id='" + item.trouble_type_id + "'data-trouble_type_name='" + item.trouble_type_name + "'  data-sys_device_type_id='" + item.sys_device_type_id + "'  data-sys_device_type_name='" + item.sys_device_type_name + "' data-default_level='" + item.default_level + "'><td>" + item.sys_device_type_name + "</td><td>" + item.trouble_type_name + "</td><td>" + item.content + "</td><td>" + item.level_name + "</td></tr>";
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

            this.getDeviceHiddenDangerTable(this.config.pagenumber);



        }.bind(this));


        this.domObj.find('.btn_add').on("click", function () {
            var that = this;

            //查询检查项（隐患类型）
            // this.getHiddenDangerType(this.config.pagenumber);

            //查询分级
            // this.getHiddenDangerLevel(this.config.pagenumber);

            //弹出popup
            this.popup.setSize(600, 360);
            var Obj = this.popup.Show("新增", this.template.split('$$')[1]);

            //赋值
            this.getDeviceType(Obj);

            //查询检查项（隐患类型）
            $.ajax({
                headers: {
                    // 'Authorization-Token': AppX.appConfig.xjxj
                    'Token': AppX.appConfig.xjxj,
                    'departmentid': AppX.appConfig.departmentid,
                },
                type: "POST",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getHiddenDangerTypeList,
                data: {
                    "pageindex": this.config.pagenumber,
                    "pagesize": 1000,
                    "keyword": this.keyword
                    // f: "pjson"
                },
                success: function (result) {
                    if (result.code != 1) {
                        that.toast.Show(result.message);
                        console.log(result.message);
                        return;
                    }
                    var stroption = "";
                    result.result.rows.forEach(function (row) {
                        stroption += "<option value='" + row.id + "'>" + row.name + "</option>";
                    })
                    Obj.conObj.find('.trouble_type_id').empty();
                    Obj.conObj.find('.trouble_type_id').append(stroption);
                    // bindpadModel.find('.devices').val(radio.data('userid'));




                    //查询分级
                    $.ajax({
                        headers: {
                            // 'Authorization-Token': AppX.appConfig.xjxj
                            'Token': AppX.appConfig.xjxj,
                            'departmentid': AppX.appConfig.departmentid,
                        },
                        type: "POST",
                        url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + that.config.getHiddenDangerLevelList,
                        data: {
                            "pageindex": that.config.pagenumber,
                            "pagesize": 1000,
                            "keyword": that.keyword
                            // f: "pjson"
                        },
                        success: function (result) {
                            if (result.code != 1) {
                                that.toast.Show(result.message);
                                console.log(result.message);
                                return;
                            }
                            var stroption = "";
                            result.result.rows.forEach(function (row) {
                                stroption += "<option value='" + row.id + "'>" + row.name + "</option>";
                            })
                            Obj.conObj.find('.levelid').empty();
                            Obj.conObj.find('.levelid').append(stroption);
                            // bindpadModel.find('.devices').val(radio.data('userid'));



                            //验证
                            (<any>$('#devicehiddendangertable_addpopup')).bootstrapValidator();
                            Obj.submitObj.off("click").on("click", function () {
                                var trouble_type_id = Obj.conObj.find('.trouble_type_id option:selected');
                                var levelid = Obj.conObj.find('.levelid option:selected');
                                var devicetype = Obj.conObj.find('.devicetype option:selected');

                                var content = Obj.conObj.find('.jc_content');

                                if (devicetype.val() == '') {
                                    devicetype.addClass('has-error');
                                    devicetype.attr("placeholder", "不能为空！");
                                    that.toast.Show("设备类型不能为空！");
                                    return;
                                }


                                if (content.val() == '') {
                                    content.addClass('has-error');
                                    content.attr("placeholder", "不能为空！");
                                    that.toast.Show("内容不能为空！");
                                    return;
                                } else {
                                    if (content.val().length > 200) {
                                        this.toast.Show("隐患分类字段长度不得超过200 ");
                                        return;
                                    }
                                }

                                $.ajax({
                                    headers: {
                                        'Token': AppX.appConfig.xjxj,
                                        'departmentid': AppX.appConfig.departmentid,
                                    },
                                    type: "POST",
                                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + that.config.addDeviceHiddenDangerTable,
                                    data: {
                                        "trouble_type_id": trouble_type_id.val(),
                                        "content": content.val(),
                                        "levelid": levelid.val(),
                                        "sys_device_type_id": devicetype.val(),
                                        // f: "pjson"
                                    },
                                    success: this.addDeviceHiddenDangerTableCallback.bind(this),
                                    error: function (data) {
                                        this.toast.Show("服务端ajax出错，获取数据失败!");
                                    }.bind(this),
                                    dataType: "json",
                                });

                            }.bind(that));
                        },
                        error: function (data) {
                            this.toast.Show("服务端ajax出错，获取数据失败!");
                        }.bind(this),
                        dataType: "json",
                    });


                },
                error: function (data) {
                    this.toast.Show("服务端ajax出错，获取数据失败!");
                }.bind(this),
                dataType: "json",
            });










        }.bind(this));

        this.domObj.find('.btn_edit').on("click", function () {
            var that = this;
            if (this.id == "") {
                this.toast.Show("请选择要修改的隐患类型！");
                return;
            }
            //弹出popup
            this.popup.setSize(600, 360);
            var Obj = this.popup.Show("修改", this.template.split('$$')[2]);
            //赋值

            //赋值
            this.getDeviceType(Obj);

            Obj.conObj.find('.jc_content').val(this.content);


            //查询检查项（隐患类型）
            $.ajax({
                headers: {
                    // 'Authorization-Token': AppX.appConfig.xjxj
                    'Token': AppX.appConfig.xjxj,
                    'departmentid': AppX.appConfig.departmentid,
                },
                type: "POST",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getHiddenDangerTypeList,
                data: {
                    "pageindex": this.config.pagenumber,
                    "pagesize": 1000,
                    "keyword": this.keyword
                    // f: "pjson"
                },
                success: function (result) {
                    if (result.code != 1) {
                        that.toast.Show(result.message);
                        console.log(result.message);
                        return;
                    }
                    var stroption = "";
                    result.result.rows.forEach(function (row) {
                        stroption += "<option value='" + row.id + "'>" + row.name + "</option>";
                    })
                    Obj.conObj.find('.trouble_type_id').empty();
                    Obj.conObj.find('.trouble_type_id').append(stroption);
                    // bindpadModel.find('.devices').val(radio.data('userid'));

                    Obj.conObj.find('.trouble_type_id').val(that.trouble_type_id);

                    //查询分级
                    $.ajax({
                        headers: {
                            // 'Authorization-Token': AppX.appConfig.xjxj
                            'Token': AppX.appConfig.xjxj,
                            'departmentid': AppX.appConfig.departmentid,
                        },
                        type: "POST",
                        url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + that.config.getHiddenDangerLevelList,
                        data: {
                            "pageindex": that.config.pagenumber,
                            "pagesize": 1000,
                            "keyword": that.keyword
                            // f: "pjson"
                        },
                        success: function (result) {
                            if (result.code != 1) {
                                that.toast.Show(result.message);
                                console.log(result.message);
                                return;
                            }
                            var stroption = "";
                            result.result.rows.forEach(function (row) {
                                stroption += "<option value='" + row.id + "'>" + row.name + "</option>";
                            })
                            Obj.conObj.find('.levelid').empty();
                            Obj.conObj.find('.levelid').append(stroption);
                            // bindpadModel.find('.devices').val(radio.data('userid'));


                            Obj.conObj.find('.levelid').val(that.levelid);

                            //验证
                            (<any>$('#devicehiddendangertable_updatepopup')).bootstrapValidator();

                            Obj.submitObj.off("click").on("click", function () {
                                var trouble_type_id = Obj.conObj.find('.trouble_type_id option:selected');
                                var levelid = Obj.conObj.find('.levelid option:selected');
                                var devicetype = Obj.conObj.find('.devicetype option:selected');

                                var content = Obj.conObj.find('.jc_content');

                                if (devicetype.val() == '') {
                                    devicetype.addClass('has-error');
                                    devicetype.attr("placeholder", "不能为空！");
                                    that.toast.Show("设备类型不能为空！");
                                    return;
                                }


                                if (content.val() == '') {
                                    content.addClass('has-error');
                                    content.attr("placeholder", "不能为空！");
                                    that.toast.Show("选择填写内容");
                                    return;
                                } else {
                                    if (content.val().length > 200) {
                                        this.toast.Show("内容字段长度不得超过200 ");
                                        return;
                                    }
                                }

                                $.ajax({
                                    headers: {
                                        'Token': AppX.appConfig.xjxj,
                                        'departmentid': AppX.appConfig.departmentid,
                                    },
                                    type: "POST",
                                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + that.config.updateDeviceHiddenDangerTable,
                                    data: {
                                        "id": that.id,
                                        "trouble_type_id": trouble_type_id.val(),
                                        "content": content.val(),
                                        "levelid": levelid.val(),
                                        "sys_device_type_id": devicetype.val(),
                                        // f: "pjson"
                                    },
                                    success: that.updateDeviceHiddenDangerTableCallback.bind(this),
                                    error: function (data) {
                                        that.toast.Show("服务端ajax出错，获取数据失败!");
                                    }.bind(this),
                                    dataType: "json",
                                });

                            }.bind(that));
                        },
                        error: function (data) {
                            this.toast.Show("服务端ajax出错，获取数据失败!");
                        }.bind(this),
                        dataType: "json",
                    });


                },
                error: function (data) {
                    this.toast.Show("服务端ajax出错，获取数据失败!");
                }.bind(this),
                dataType: "json",
            });





        }.bind(this));



        this.domObj.find('.btn_delete').on("click", function () {

            if (this.id == "") {
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
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.deleteDeviceHiddenDangerTable + this.id,
                    data: {
                        "id": this.id,
                        // f: "pjson"
                    },
                    success: this.deleteDeviceHiddenDangerTableCallback.bind(this),
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
                this.id = $(e.currentTarget).data("id");
                this.content = $(e.currentTarget).data("content");
                this.levelid = $(e.currentTarget).data("levelid");
                this.level_name = $(e.currentTarget).data("level_name");
                this.trouble_type_id = $(e.currentTarget).data("trouble_type_id");
                this.trouble_type_name = $(e.currentTarget).data("trouble_type_name");

                this.sys_device_type_id = $(e.currentTarget).data("sys_device_type_id");
                this.sys_device_type_name = $(e.currentTarget).data("sys_device_type_name");
                // if ($(e.currentTarget).data("default_level") != null) {
                //     this.strhiddendangerlevel = $(e.currentTarget).data("default_level").toString();
                // } else {
                //     this.strhiddendangerlevel = "";
                // }




            }
            this.domObj.find('tr.active').removeClass('active');
            $(e.currentTarget).addClass('active');


            // var that = this;

            // //弹出popup
            // this.popup.setSize(600, 300);
            // var Obj = this.popup.Show("修改", this.template.split('$$')[2]);
            // Obj.conObj.find('.jc_content').val(this.content);


            // //查询检查项（隐患类型）
            // $.ajax({
            //     headers: {
            //         // 'Authorization-Token': AppX.appConfig.xjxj
            //         'Token': AppX.appConfig.xjxj,
            //         'departmentid': AppX.appConfig.departmentid,
            //     },
            //     type: "POST",
            //     url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getHiddenDangerTypeList,
            //     data: {
            //         "pageindex": this.config.pagenumber,
            //         "pagesize": 1000,
            //         "keyword": this.keyword
            //         // f: "pjson"
            //     },
            //     success: function (result) {
            //         if (result.code != 1) {
            //             that.toast.Show(result.message);
            //             console.log(result.message);
            //             return;
            //         }
            //         var stroption = "";
            //         result.result.rows.forEach(function (row) {
            //             stroption += "<option value='" + row.id + "'>" + row.name + "</option>";
            //         })
            //         Obj.conObj.find('.trouble_type_id').empty();
            //         Obj.conObj.find('.trouble_type_id').append(stroption);
            //         // bindpadModel.find('.devices').val(radio.data('userid'));

            //         Obj.conObj.find('.trouble_type_id').val(that.trouble_type_id);


            //         //查询分级
            //         $.ajax({
            //             headers: {
            //                 // 'Authorization-Token': AppX.appConfig.xjxj
            //                 'Token': AppX.appConfig.xjxj,
            //                 'departmentid': AppX.appConfig.departmentid,
            //             },
            //             type: "POST",
            //             url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + that.config.getHiddenDangerLevelList,
            //             data: {
            //                 "pageindex": that.config.pagenumber,
            //                 "pagesize": 1000,
            //                 "keyword": that.keyword
            //                 // f: "pjson"
            //             },
            //             success: function (result) {
            //                 if (result.code != 1) {
            //                     that.toast.Show(result.message);
            //                     console.log(result.message);
            //                     return;
            //                 }
            //                 var stroption = "";
            //                 result.result.rows.forEach(function (row) {
            //                     stroption += "<option value='" + row.id + "'>" + row.name + "</option>";
            //                 })
            //                 Obj.conObj.find('.levelid').empty();
            //                 Obj.conObj.find('.levelid').append(stroption);
            //                 // bindpadModel.find('.devices').val(radio.data('userid'));


            //                 Obj.conObj.find('.levelid').val(that.levelid);

            //                 Obj.submitObj.off("click").on("click", function () {
            //                     var trouble_type_id = Obj.conObj.find('.trouble_type_id option:selected');
            //                     var levelid = Obj.conObj.find('.levelid option:selected');


            //                     var content = Obj.conObj.find('.jc_content');

            //                     if (content.val() == '') {
            //                         content.addClass('has-error');
            //                         content.attr("placeholder", "不能为空！");
            //                         that.toast.Show("选择一个部门/分组！");
            //                         return;
            //                     }



            //                 }.bind(that));
            //             },
            //             error: function (data) {
            //                 this.toast.Show("服务端ajax出错，获取数据失败!");
            //             }.bind(this),
            //             dataType: "json",
            //         });


            //     },
            //     error: function (data) {
            //         this.toast.Show("服务端ajax出错，获取数据失败!");
            //     }.bind(this),
            //     dataType: "json",
            // });




        });


        // 双击查看
        this.domObj.off("dblclick").on('dblclick', 'tbody tr', (e) => {

            if ($(e.currentTarget).data("id") == null) {
                return;
            } else {
                this.id = $(e.currentTarget).data("id");
                this.content = $(e.currentTarget).data("content");
                this.levelid = $(e.currentTarget).data("levelid");
                this.level_name = $(e.currentTarget).data("level_name");
                this.trouble_type_id = $(e.currentTarget).data("trouble_type_id");
                this.trouble_type_name = $(e.currentTarget).data("trouble_type_name");


                this.sys_device_type_id = $(e.currentTarget).data("sys_device_type_id");
                this.sys_device_type_name = $(e.currentTarget).data("sys_device_type_name");
                this.devicetype = $(e.currentTarget).data("devicetype");
            }
            this.domObj.find('tr.active').removeClass('active');
            $(e.currentTarget).addClass('active');

            if (this.id == "") {
                this.toast.Show("请选择一位用户");
                return;
            }

            this.popup.setSize(600, 360);

            var Obj = this.popup.Show("查看", this.template.split('$$')[3], true);
            //赋值





            //   this.userid = $(e.currentTarget).data("userid");

            Obj.conObj.find('.trouble_type_name').val(this.trouble_type_name);
            Obj.conObj.find('.jc_content').val(this.content);
            Obj.conObj.find('.level_name').val(this.level_name);

            Obj.conObj.find('.devicetype').val(this.sys_device_type_name);


            Obj.submitObj.off("click").on("click", function () {
                this.popup.Close();
            }.bind(this));



        });


        //动态生成书签及分页控件
        //分页控件fykj 向前、向后事件
        this.domObj.find(".pre").off("click").on("click", function () {
            if (this.currentpage - 1 > 0) {
                this.currentpage = this.currentpage - 1;
                this.getDeviceHiddenDangerTable(this.currentpage);

            }

        }.bind(this));
        this.domObj.find(".next").off("click").on("click", function () {
            if (this.currentpage + 1 <= this.totalpage) {
                this.currentpage = this.currentpage + 1;
                this.getDeviceHiddenDangerTable(this.currentpage);

            }
        }.bind(this));


        this.domObj.find(".pageturning").off("click").on("click", function () {
            var currpage = parseInt(this.domObj.find(".currpage").val());
            if (currpage <= this.totalpage && currpage >= 1) {
                this.currentpage = parseInt(this.domObj.find(".currpage").val());
                this.getDeviceHiddenDangerTable(this.currentpage);

            }
        }.bind(this));


    }




    getDeviceHiddenDangerTable(pagenumber) {
        this.currentpage = pagenumber || this.config.pagenumber;
        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getDeviceHiddenDangerTableList,
            data: {
                "pageindex": pagenumber || this.config.pagenumber,
                "pagesize": this.config.pagesize,
                "keyword": this.keyword
                // f: "pjson"
            },
            success: this.getDeviceHiddenDangerTableListCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    addDeviceHiddenDangerTableCallback(results) {

        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            console.log(results.message);
            return;
        }
        this.popup.Close();
        that.toast.Show(results.message);
        //重新查询
        this.getDeviceHiddenDangerTable(this.config.pagenumber);

        //清空：选中、新增时产生的选中，避免直接点删除
        this.id = "";
        this.content = "";
        this.levelid = "";
        this.level_name = "";
        this.trouble_type_id = "";
        this.trouble_type_name = "";

    }

    updateDeviceHiddenDangerTableCallback(results) {

        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            console.log(results.message);
            return;
        }
        this.popup.Close();
        that.toast.Show(results.message);
        //重新查询
        this.getDeviceHiddenDangerTable(this.config.pagenumber);

        //清空修改时产生的选中，避免直接点删除
        this.id = "";
        this.content = "";
        this.levelid = "";
        this.level_name = "";
        this.trouble_type_id = "";
        this.trouble_type_name = "";

    }


    deleteDeviceHiddenDangerTableCallback(results) {

        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            console.log(results.message);
            return;
        }
        this.popup.Close();
        that.toast.Show(results.message);
        //重新查询
        this.getDeviceHiddenDangerTable(this.config.pagenumber);


        //清空
        this.id = "";
        this.content = "";
        this.levelid = "";
        this.level_name = "";
        this.trouble_type_id = "";
        this.trouble_type_name = "";

    }




    getDeviceType(Obj) {
        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getDeviceTypeList,
            data: {
                "pageindex": this.config.pagenumber,
                // "pagesize": this.config.pagesize_icon,
                "pagesize": 1000 || this.config.pagesize,
                // f: "pjson"
            },
            success: this.getDeviceTypeListCallback.bind({ h: Obj, t: this }),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    getDeviceTypeListCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.t.toast.Show("查询用户信息出错！");
            console.log(results.message);
            return;
        }


        var devicetype = this.h.domObj.find(".devicetype").empty();
        var strdevicetype = "<option ></option>";
        $.each(results.result.rows, function (index, item) {
            // if (index == 0) {
            //     strdevicetype += "<option value='" + item.id + "' selected>" + item.name + " </option>";
            // }
            strdevicetype += "<option value='" + item.id + "'>" + item.name + " </option>";

        }.bind(this));
        devicetype.append(strdevicetype);


        devicetype.val(this.t.sys_device_type_id);


    }






    destroy() {

        this.domObj.remove();
        this.afterDestroy();
    }
}