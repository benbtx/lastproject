import BaseWidget = require('core/BaseWidget.class');
export = DevicesManagement;

class DevicesManagement extends BaseWidget {
    baseClass = "widget-devicesmanagement";

    toast = null;
    popup = null;
    isfirst = false;
    totalpage = 1;
    currentpage = 1;
    currentpagesieze = 13;



    padid = "";
    uim = "";
    imei = "";
    mobile = "";
    padname = "";
    brand = "";
    model = "";
    note = "";
    buydate = "";
    appos = "";
    appversion = "";
    appversion_releasetime = "";
    appversion_updatetime = "";
    state = "";
    company = "";
    depid = "";

    android_version = "";
    type = "";

    keyword = "";




    startup() {
        this.configure();
        this.initHtml();
        this.initEvent();

    }
    initHtml() {
        var html = _.template(this.template.split('$$')[0] + "</div>")({ range: AppX.appConfig.range.split(";")[0] });

        this.setHtml(html);
        this.ready();
        this.getDevice(this.config.pagenumber);

    }

    configure() {
        this.toast = this.AppX.runtimeConfig.toast;
        this.popup = this.AppX.runtimeConfig.popup;
        this.depid = AppX.appConfig.groupid;
        //获取设备信息
    }


    getDeviceListCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("查询设备信息出错！");
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
            // this.domObj.find(".content").text("无数据");
            this.domObj.find(".pagecontrol").text("总共-条记录，每页默认显示" + that.currentpagesieze + "条记录");
            this.domObj.find(".content").text("第-页共-页");
        }


        //生成table ,并给分页控件赋值事件

        // this.currentpage = results.result.pageindex;
        //动态生成书签及分页控件
        var domtb = this.domObj.find(".adddevice");
        domtb.empty();
        var address;
        var html_trs_data = "";
        var type = "正式机";
        $.each(results.result.rows, function (i, item) {
            type = "正式机";
            if (item.type == 0) {
                type = "正式机";
            } else {
                type = "备用机";
            }

            html_trs_data += "<tr class=goto  data-padid='" + item.padid + "' data-uim='" + item.uim + "' data-imei='" + item.imei + "' data-padname='" + item.padname + "' data-model='" + item.model + "' data-companyid='" + item.companyid + "' data-appversion='" + item.appversion + "' data-brand='" + item.brand + "' data-state='" + item.state + "' data-logintime='" + item.logintime + "' data-appversion_updatetime='" + item.appversion_updatetime + "' data-android_version='" + item.android_version + "' data-note='" + item.note + "' data-type='" + item.type + "' ><td>" + item.padname + "</td><td>" + item.imei + "</td><td>" + item.model + "</td><td>" + type + "</td><td>" + item.android_version + "</td><td>" + item.company_name + "</td><td>" + item.create_time + "</td><td>" + item.note + "</td></tr>";
            //刷新infowindow
            // this.setContent(item);
        }.bind(this));
        domtb.append(html_trs_data);


        var html_trs_blank = "";
        if (results.result.rows.length < that.config.pagesize) {
            var num = that.config.pagesize - results.result.rows.length;
            for (var i = 0; i < num; i++) {
                html_trs_blank += "<tr class=goto><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>";
            }
            domtb.append(html_trs_blank);
        }

        this.initCompany();







    }


    initEvent() {
        var that = this;
        this.domObj.find('.btn_search').on("click", function () {

            this.keyword = this.domObj.find('.search_condition').val();

            this.getDevice(this.config.pagenumber);



        }.bind(this));

        //解决ESC取消键
        this.domObj.find('.search_condition').keydown(function (event) {
            // event.target.innerText;
            if (event.keyCode == 13) {//enter
                this.keyword = this.domObj.find('.search_condition').val();
                this.getDevice(this.config.pagenumber);
            }
        }.bind(this));

        //重置查询
        this.domObj.find('.btn_rsearch').on("click", function () {

            this.keyword = "";
            this.domObj.find('.search_condition').val("");
            this.domObj.find('.companyname').val("");
            this.getDevice(this.config.pagenumber);

        }.bind(this));

        this.domObj.find('.btn_add').on("click", function () {

            //弹出popup
            this.popup.setSize(600, 550);
            // var Obj = this.popup.Show("新增", this.template.split('$$')[1]);

            var html = _.template(this.template.split('$$')[1])({ range: AppX.appConfig.range.split(";")[0], depid: AppX.appConfig.groupid });
            var Obj = this.popup.Show("新增", html);

            this.getCompany();

            //添加验证
            (<any>$('#devicesmanagement_addpopup')).bootstrapValidator();







            Obj.submitObj.off("click").on("click", function () {

                var uim = Obj.conObj.find(".uim");
                var imei = Obj.conObj.find('.imei');
                var mobile = Obj.conObj.find('.mobile');
                var padname = Obj.conObj.find('.padname');
                // var brand = Obj.conObj.find('.brand');
                var model = Obj.conObj.find('.model');
                var note = Obj.conObj.find('.note');
                var appos = Obj.conObj.find('.appos');
                var appversion = Obj.conObj.find('.appversion');
                var appversion_releasetime = Obj.conObj.find('.appversion_releasetime');
                var appversion_updatetime = Obj.conObj.find('.appversion_updatetime');
                var state = Obj.conObj.find('.state');
                var company = Obj.conObj.find('.company');


                var android_version = Obj.conObj.find('.android_version');
                var note = Obj.conObj.find('.note');
                var type = Obj.conObj.find('.type option:selected');
                if (padname.val() == '') {
                    padname.addClass('has-error');
                    padname.attr("placeholder", "不能为空！");
                    // this.toast.Show("设备名称不能为空！");
                    return;
                } else {
                    if (padname.val().length > 20) {
                        this.toast.Show("设备名称字段长度不得超过20 ");
                        return;
                    }
                }
                // if (uim.val() == '') {
                //     uim.addClass('has-error');
                //     uim.attr("placeholder", "不能为空！");
                //     // this.toast.Show("设备编码不能为空！");
                //     return;
                // }
                if (imei.val() == '') {
                    imei.addClass('has-error');
                    imei.attr("placeholder", "不能为空！");
                    // this.toast.Show("设备登录账号不能为空！");
                    return;
                } else {


                    var reg = /^\d{15}$/;

                    if (!reg.test(imei.val())) {
                        return;
                    }
                }



                if (model.val() == '') {
                    model.addClass('has-error');
                    model.attr("placeholder", "不能为空！");
                    // this.toast.Show("设备型号不能为空！");
                    return;
                } else {
                    if (model.val().length > 20) {
                        this.toast.Show("设备型号字段长度不得超过20 ");
                        return;
                    }
                }


                if (android_version.val() == '') {
                    android_version.addClass('has-error');
                    android_version.attr("placeholder", "不能为空！");
                    // this.toast.Show("Android版本号不能为空！");
                    return;
                } else {
                    if (android_version.val().length > 10) {
                        this.toast.Show("安卓版本字段长度不得超过10 ");
                        return;
                    }
                }


                if (type.val() == '') {
                    type.addClass('has-error');
                    type.attr("placeholder", "不能为空！");
                    // this.toast.Show("Android版本号不能为空！");
                    return;
                }

                if (note.val() == '') {

                } else {
                    if (note.val().length > 60) {
                        this.toast.Show("备注字段长度不得超过60 ");
                        return;
                    }
                }

                $.ajax({
                    headers: {
                        'Token': AppX.appConfig.xjxj,
                        'departmentid': AppX.appConfig.departmentid,
                    },
                    type: "POST",
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.addDevice,
                    data: {
                        "uim": uim.val(),
                        "imei": imei.val(),
                        "mobile": mobile.val(),
                        "padname": padname.val(),
                        // "brand": brand.val(),
                        "model": model.val(),
                        "appos": appos.val(),
                        "appversion": appversion.val(),
                        "appversion_releasetime": appversion_releasetime.val(),
                        "appversion_updatetime": appversion_updatetime.val(),
                        "state": state.val(),
                        "companyid": company.val(),

                        "company_name": Obj.conObj.find('.company option:selected').text() || AppX.appConfig.departmentname, //AppX.appConfig.departmentname,

                        "android_version": android_version.val(),
                        "note": note.val(),
                        "type": type.val(),

                        // f: "pjson"
                    },
                    success: this.addDeviceCallback.bind(this),
                    error: function (data) {
                        this.toast.Show("服务端ajax出错，获取数据失败!");
                    }.bind(this),
                    dataType: "json",
                });

            }.bind(this));



        }.bind(this));

        this.domObj.find('.btn_edit').on("click", function () {

            if (this.padid == "") {
                this.toast.Show("请选择一个设备！");
                return;
            }
            //弹出popup
            this.popup.setSize(600, 480);
            var Obj = this.popup.Show("修改", this.template.split('$$')[2]);
            //赋值

            (<any>$('#devicesmanagement_updatepopup')).bootstrapValidator();
            //   this.userid = $(e.currentTarget).data("userid");
            Obj.conObj.find('.uim').val(this.uim);
            Obj.conObj.find('.imei').val(this.imei);
            Obj.conObj.find('.mobile').val(this.mobile);
            Obj.conObj.find('.padname').val(this.padname);
            Obj.conObj.find('.brand').val(this.brand);
            Obj.conObj.find('.model').val(this.model);
            Obj.conObj.find('.note').val(this.note);
            Obj.conObj.find('.type').val(this.type);

            Obj.conObj.find('.buydate').val(this.buydate);
            Obj.conObj.find('.appos').val(this.appos);
            Obj.conObj.find('.appversion').val(this.appversion);
            Obj.conObj.find('.appversion_releasetime').val(this.appversion_releasetime);
            Obj.conObj.find('.appversion_updatetime').val(this.appversion_updatetime);
            Obj.conObj.find('.state').val(this.state);
            Obj.conObj.find('.company').val(this.company);

            Obj.conObj.find('.android_version').val(this.android_version);
            Obj.conObj.find('.type').val(this.type);


            Obj.submitObj.off("click").on("click", function () {

                var uim = Obj.conObj.find(".uim");
                var imei = Obj.conObj.find('.imei');
                var userid = Obj.conObj.find('.userid');
                var pdaid = Obj.conObj.find('.pdaid');
                var mobile = Obj.conObj.find('.mobile');
                var padname = Obj.conObj.find('.padname');
                var brand = Obj.conObj.find('.brand');
                var model = Obj.conObj.find('.model');
                var note = Obj.conObj.find('.note');
                var type = Obj.conObj.find('.type');

                var buydate = Obj.conObj.find('.buydate');
                var appos = Obj.conObj.find('.appos');
                var appos = Obj.conObj.find('.appos');
                var appversion = Obj.conObj.find('.appversion');
                var appversion_releasetime = Obj.conObj.find('.appversion_releasetime');
                var appversion_updatetime = Obj.conObj.find('.appversion_updatetime');
                var state = Obj.conObj.find('.state');
                var company = Obj.conObj.find('.company');

                var android_version = Obj.conObj.find('.android_version');


                if (padname.val() == '') {
                    padname.addClass('has-error');
                    padname.attr("placeholder", "不能为空！");
                    this.toast.Show("设备名称不能为空！");
                    return;
                } else {
                    if (padname.val().length > 20) {
                        this.toast.Show("设备名称字段长度不得超过20 ");
                        return;
                    }
                }


                // if (uim.val() == '') {
                //     uim.addClass('has-error');
                //     uim.attr("placeholder", "不能为空！");
                //     this.toast.Show("设备名称不能为空！");
                //     return;
                // }

                if (imei.val() == '') {
                    imei.addClass('has-error');
                    imei.attr("placeholder", "不能为空！");
                    // this.toast.Show("设备登录账号不能为空！");
                    return;
                } else {
                    var reg = /^\d{15}$/;
                    if (!reg.test(imei.val())) {
                        this.toast.Show("IMEI码包含15位数字");
                        return;
                    }
                }

                // if (model.val() == '') {
                //     model.addClass('has-error');
                //     model.attr("placeholder", "不能为空！");
                //     this.toast.Show("设备型号不能为空！");
                //     return;
                // } else {
                //     if (model.val().length > 20) {
                //         this.toast.Show("设备型号字段长度不得超过20 ");
                //         return;
                //     }
                // }

                if (android_version.val() == '') {
                    android_version.addClass('has-error');
                    android_version.attr("placeholder", "不能为空！");
                    // this.toast.Show("Android版本号不能为空！");
                    return;
                } else {
                    if (android_version.val().length > 10) {
                        this.toast.Show("安卓版本字段长度不得超过10 ");
                        return;
                    }
                }

                if (note.val() == '') {

                } else {
                    if (note.val().length > 60) {
                        this.toast.Show("备注字段长度不得超过60 ");
                        return;
                    }
                }



                $.ajax({
                    headers: {
                        'Token': AppX.appConfig.xjxj,
                        'departmentid': AppX.appConfig.departmentid,
                    },
                    type: "POST",
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.updateDevice,
                    data: {
                        "padid": this.padid,
                        "uim": uim.val(),
                        "imei": imei.val(),
                        "padname": padname.val(),
                        "brand": brand.val(),
                        "model": model.val(),
                        "note": note.val(),
                        "type": type.val(),
                        "buydate": buydate.val(),
                        "appos": appos.val(),
                        "appversion": appversion.val(),
                        "android_version": android_version.val(),
                        "appversion_releasetime": appversion_releasetime.val(),
                        "appversion_updatetime": appversion_updatetime.val(),
                        "state": state.val(),
                        "companyid": this.company || AppX.appConfig.departmentid,
                        // "companyname": this.companynameObj.conObj.find('.company option:selected').text() || AppX.appConfig.departmentname, //AppX.appConfig.departmentname,

                        // f: "pjson"
                    },
                    success: this.updateDeviceCallback.bind(this),
                    error: function (data) {
                        this.toast.Show("服务端ajax出错，获取数据失败!");
                    }.bind(this),
                    dataType: "json",
                });
            }.bind(this));







        }.bind(this));


        this.domObj.find('.btn_delete').on("click", function () {

            if (this.padid == "") {
                this.toast.Show("请选择一个设备！");
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
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.deleteDevice + this.padid,
                    data: {
                        "id": this.padid,
                        // f: "pjson"
                    },
                    success: this.deleteDeviceCallback.bind(this),
                    error: function (data) {
                        this.toast.Show("服务端ajax出错，获取数据失败!");
                    }.bind(this),
                    dataType: "json",
                });


            }.bind(this));





        }.bind(this));


        // 选中行高亮
        this.domObj.off("click").on('click', 'tbody tr', (e) => {
            if ($(e.currentTarget).data("padid") == null) {
                return;
            } else {
                this.padid = $(e.currentTarget).data("padid");
                this.uim = $(e.currentTarget).data("uim");
                this.imei = $(e.currentTarget).data("imei");
                this.mobile = $(e.currentTarget).data("mobile");
                this.padname = $(e.currentTarget).data("padname");
                this.brand = $(e.currentTarget).data("brand");
                this.model = $(e.currentTarget).data("model");
                this.note = $(e.currentTarget).data("note");

                this.buydate = $(e.currentTarget).data("buydate");
                this.appos = $(e.currentTarget).data("appos");
                this.appversion = $(e.currentTarget).data("appversion");
                this.appversion_releasetime = $(e.currentTarget).data("appversion_releasetime");
                this.appversion_updatetime = $(e.currentTarget).data("appversion_updatetime");

                this.company = $(e.currentTarget).data("companyid");
                this.state = $(e.currentTarget).data("state");


                this.android_version = $(e.currentTarget).data("android_version");
                this.type = $(e.currentTarget).data("type");



            }
            this.domObj.find('tr.active').removeClass('active');
            $(e.currentTarget).addClass('active');



        });
        //动态生成书签及分页控件
        //分页控件fykj 向前、向后事件

        // 双击查看
        this.domObj.off("dblclick").on('dblclick', 'tbody tr', (e) => {

            if ($(e.currentTarget).data("padid") == null) {
                return;
            } else {
                this.padid = $(e.currentTarget).data("padid");
                this.uim = $(e.currentTarget).data("uim");
                this.imei = $(e.currentTarget).data("imei");
                this.mobile = $(e.currentTarget).data("mobile");
                this.padname = $(e.currentTarget).data("padname");
                this.brand = $(e.currentTarget).data("brand");
                this.model = $(e.currentTarget).data("model");
                this.note = $(e.currentTarget).data("note");

                this.buydate = $(e.currentTarget).data("buydate");
                this.appos = $(e.currentTarget).data("appos");
                this.appversion = $(e.currentTarget).data("appversion");
                this.appversion_releasetime = $(e.currentTarget).data("appversion_releasetime");
                this.appversion_updatetime = $(e.currentTarget).data("appversion_updatetime");

                this.company = $(e.currentTarget).data("companyid");
                this.state = $(e.currentTarget).data("state");

                this.android_version = $(e.currentTarget).data("android_version");
                this.type = $(e.currentTarget).data("type");


            }
            this.domObj.find('tr.active').removeClass('active');
            $(e.currentTarget).addClass('active');

            if (this.padid == "") {
                this.toast.Show("请选择一位用户");
                return;
            }

            this.popup.setSize(600, 400);

            var Obj = this.popup.Show("查看", this.template.split('$$')[3], true);
            //赋值

            //   this.userid = $(e.currentTarget).data("userid");
            Obj.conObj.find('.uim').val(this.uim);
            Obj.conObj.find('.imei').val(this.imei);
            Obj.conObj.find('.mobile').val(this.mobile);
            Obj.conObj.find('.padname').val(this.padname);
            Obj.conObj.find('.brand').val(this.brand);
            Obj.conObj.find('.model').val(this.model);
            Obj.conObj.find('.note').val(this.note);
            Obj.conObj.find('.buydate').val(this.buydate);
            Obj.conObj.find('.appos').val(this.appos);
            Obj.conObj.find('.appversion').val(this.appversion);
            Obj.conObj.find('.appversion_releasetime').val(this.appversion_releasetime);
            Obj.conObj.find('.appversion_updatetime').val(this.appversion_updatetime);
            Obj.conObj.find('.state').val(this.state);
            Obj.conObj.find('.companyid').val(this.company);


            Obj.conObj.find('.android_version').val(this.android_version);
            if (this.type == "0") {
                Obj.conObj.find('.type').val("正式机");
            } else {
                Obj.conObj.find('.type').val("备用机");
            }






            Obj.submitObj.off("click").on("click", function () {
                this.popup.Close();
            }.bind(this));



        });



        this.domObj.find(".pre").off("click").on("click", function () {
            if (this.currentpage - 1 > 0) {
                this.currentpage = this.currentpage - 1;
                this.getDevice(this.currentpage);
            }

        }.bind(this));
        this.domObj.find(".next").off("click").on("click", function () {
            if (this.currentpage + 1 <= this.totalpage) {
                this.currentpage = this.currentpage + 1;
                this.getDevice(this.currentpage);
            }
        }.bind(this));


        this.domObj.find(".pageturning").off("click").on("click", function () {
            var currpage = parseInt(this.domObj.find(".currpage").val());
            if (currpage <= this.totalpage && currpage >= 1) {
                this.currentpage = parseInt(this.domObj.find(".currpage").val());
                this.getDevice(this.currentpage);
            }
        }.bind(this));


    }

    getDevice(pagenumber) {
        this.currentpage = pagenumber || this.config.pagenumber;
        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
                'range': AppX.appConfig.range,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getDeviceList,
            data: {
                "pageindex": pagenumber || this.config.pagenumber,
                "pagesize": this.config.pagesize,
                "depid": this.depid,
                "companyid": this.domObj.find(".companyname").val(),
                "keyword": this.keyword,
                // f: "pjson"
            },
            success: this.getDeviceListCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    addDeviceCallback(results) {

        var that = this;
        if (results.code != 1) {
            this.popup.ShowTip(results.message);
            // that.toast.Show(results.message);
            console.log(results.message);
            return;
        }
        // this.popup.ShowTip(results.message);
        this.popup.Close();
        that.toast.Show(results.message);
        //重新查询
        this.getDevice(this.config.pagenumber);

        //清空：选中、新增时产生的选中，避免直接点删除
        this.padid = "";
        this.uim = "";
        this.imei = "";
        this.mobile = "";
        this.padname = "";
        this.brand = "";
        this.model = "";
        this.note = "";
        this.buydate = "";
        this.appos = "";
        this.appversion = "";
        this.appversion_releasetime = "";
        this.appversion_updatetime = "";
        this.company = "";
        this.state = "";
        this.android_version = "";
        this.type = "";

    }

    updateDeviceCallback(results) {

        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            console.log(results.message);
            return;
        }
        this.popup.Close();
        that.toast.Show(results.message);
        //重新查询
        this.getDevice(this.config.pagenumber);

        //清空修改时产生的选中，避免直接点删除
        this.padid = "";
        this.uim = "";
        this.imei = "";
        this.mobile = "";
        this.padname = "";
        this.brand = "";
        this.model = "";
        this.note = "";
        this.buydate = "";
        this.appos = "";
        this.appversion = "";
        this.appversion_releasetime = "";
        this.appversion_updatetime = "";
        this.company = "";
        this.state = "";
        this.android_version = "";
        this.type = "";

    }


    deleteDeviceCallback(results) {

        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            console.log(results.message);
            return;
        }
        this.popup.Close();
        that.toast.Show(results.message);
        //重新查询
        this.getDevice(this.config.pagenumber);

        //清空数据
        this.padid = "";
        this.uim = "";
        this.imei = "";
        this.mobile = "";
        this.padname = "";
        this.brand = "";
        this.model = "";
        this.note = "";
        this.buydate = "";
        this.appos = "";
        this.appversion = "";
        this.appversion_releasetime = "";
        this.appversion_updatetime = "";
        this.company = "";
        this.state = "";
        this.android_version = "";
        this.type = "";

    }



    initCompany() {
        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
                // 'range': AppX.appConfig.range,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getCompanyList,
            data: {
                // "depid": depid,
                // f: "pjson"
            },
            success: this.initCompanyListCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    initCompanyListCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("查询公司信息出错！");
            console.log(results.message);
            return;
        }


        //组织popup数据

        var strcompany = "<option value='' selected>全部</option>";
        $.each(results.result, function (index, item) {
            strcompany += "<option value=" + item.companyid + " > " + item.company_name + " </option>";

        }.bind(this));

        //组织初始数据

        var companyname_value = this.domObj.find(".companyname").val();
        var companyname = this.domObj.find(".companyname").empty();
        companyname.append(strcompany);
        companyname.val(companyname_value);



    }


    getCompany() {
        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
                // 'range': AppX.appConfig.range,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getCompanyList,
            data: {
                // "depid": depid,
                // f: "pjson"
            },
            success: this.getCompanyListCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    getCompanyListCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("查询公司信息出错！");
            console.log(results.message);
            return;
        }
        //组织数据
        this.popup.contentObj.find(".company");

        var company = this.popup.contentObj.find(".company").empty();
        // var strcompany = "<option value='' selected>全部</option>";
        var strcompany = "";
        $.each(results.result, function (index, item) {
            strcompany += "<option value=" + item.companyid + " > " + item.company_name + " </option>";

        }.bind(this));
        company.append(strcompany);

        company.val(this.company || AppX.appConfig.departmentid);



    }






    destroy() {

        this.domObj.remove();
        this.afterDestroy();
    }
}