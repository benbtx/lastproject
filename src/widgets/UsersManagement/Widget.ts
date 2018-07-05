import BaseWidget = require('core/BaseWidget.class');
export = UsersManagement;

class UsersManagement extends BaseWidget {
    baseClass = "widget-usersmanagement";

    toast = null;
    popup = null;
    popupdomObj = null;
    isfirst = false;
    totalpage = 1;
    currentpage = 1;
    currentpagesieze = 13;


    userid = "";
    username = "";
    loginid = "";
    // companyid = "";
    depid = "";//默认登录时获取
    cur_depid = "";//行选中时获取
    groupname = "";
    pdaid = "";
    pdaname = "";
    mobile = "";
    roleid = "";
    online = "";
    state = "";
    keyword = "";
    company = "";
    cur_company = "";
    ls_company = "";
    cur_state = ""//add,edit

    patrol_type = "";


    startup() {
        this.configure();
        this.initHtml();
        this.initEvent();

    }

    configure() {
        this.toast = this.AppX.runtimeConfig.toast;
        this.popup = this.AppX.runtimeConfig.popup;
        this.depid = AppX.appConfig.groupid;
        //获取用户信息
    }
    initHtml() {
        var html = _.template(this.template.split('$$')[0] + "</div>")({ range: AppX.appConfig.range.split(";")[0] });

        this.setHtml(html);
        this.ready();
        this.getUser(this.config.pagenumber);
    }



    getUser(pagenumber) {
        this.currentpage = pagenumber || this.config.pagenumber;
        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
                'range': AppX.appConfig.range,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getUserList,
            data: {
                "pageindex": pagenumber || this.config.pagenumber,
                "pagesize": this.config.pagesize,
                "keyword": this.keyword,
                "companyid": this.domObj.find(".companyname").val(),
                "depid": this.depid,
                // f: "pjson"
            },
            success: this.getUserListCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    getUserListCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("查询用户信息出错！");
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
        var domtb = this.domObj.find(".adduser");
        domtb.empty();
        var address;
        var html_trs_data = "";
        var isonline = "离线";
        var patrol_type = "";
        var accountstate = "";
        $.each(results.result.rows, function (i, item) {
            isonline = "";
            if (item.online_state == 1) {
                isonline = "在线";
            }

            patrol_type = "";
            if (item.patrol_type == 0) {
                patrol_type = "人巡";
            } else if (item.patrol_type == 1) {
                patrol_type = "车巡";
            }


            accountstate = "";
            if (item.state == 0) {
                accountstate = "启用";
            } else if (item.state == 1) {
                accountstate = "停用";
            } else if (item.state == 2) {
                accountstate = "未绑定";
            }



            html_trs_data += "<tr class=goto  data-userid='" + item.userid + "' data-username='" + item.username + "' data-loginid='" + item.loginid + "' data-companyid='" + item.companyid + "' data-companyid='" + item.companyid + "' data-depid='" + item.depid + "' data-group_name='" + item.group_name + "' data-pdaid='" + item.pdaid + "' data-pdaname='" + item.pdaname + "' data-mobile='" + item.mobile + "'  data-roleid='" + item.roleid + "' data-state='" + item.state + "' data-logintime='" + item.logintime + "' data-patrol_type='" + item.patrol_type + "'><td>" + item.group_name + "</td><td>" + item.username + "</td><td>" + item.loginid + "</td><td>" + item.padname + "</td><td>" + item.mobile + "</td><td>" + patrol_type + "</td><td>" + item.company_name + "</td><td>" + accountstate + "</td></tr>";
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

            this.getUser(this.config.pagenumber);



        }.bind(this));

        this.domObj.find('.search_condition').keydown(function (event) {
            if (event.keyCode == 13) {//enter
                this.keyword = this.domObj.find('.search_condition').val();
                this.getUser(this.config.pagenumber);
            }
        }.bind(this));


        //重置查询
        this.domObj.find('.btn_rsearch').on("click", function () {

            this.keyword = "";
            this.domObj.find('.search_condition').val("");
            this.domObj.find('.companyname').val("");
            this.getUser(this.config.pagenumber);

        }.bind(this));




        this.domObj.find('.btn_add').on("click", function () {

            //弹出popup
            this.popup.setSize(600, 500);

            var html = _.template(this.template.split('$$')[1])({ range: AppX.appConfig.range.split(";")[0], depid: AppX.appConfig.groupid });

            var Obj = this.popup.Show("新增", html);
            this.cur_state = "add";
            this.getCompany();
            this.getGroup();

            // //查询所有部门和分组
            // $.ajax({
            //     headers: {
            //         // 'Authorization-Token': AppX.appConfig.xjxj
            //         'Token': AppX.appConfig.xjxj,
            //         'departmentid': AppX.appConfig.departmentid,
            //     },
            //     type: "POST",
            //     url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getGroupList,
            //     data: {
            //         "pageindex": this.config.pagenumber,
            //         "pagesize": 1000,
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
            //         Obj.conObj.find('.group').empty();
            //         Obj.conObj.find('.group').append(stroption);
            //         // bindpadModel.find('.devices').val(radio.data('userid'));





            //     },
            //     error: function (data) {
            //         this.toast.Show("服务端ajax出错，获取数据失败!");
            //     }.bind(this),
            //     dataType: "json",
            // });

            //公司部门联动事件
            this.popup.contentObj.find('.company').on("change", function () {
                //根据部门重新筛选用户
                // this.company = this.popup.contentObj.find('.company option:selected').val();
                this.ls_company = this.popup.contentObj.find('.company option:selected').val();
                this.depid = "";
                // this.userid = "";
                this.getGroup();

                // if (this.company != "") {
                //     this.domObj.find('.dep').removeAttr("disabled");
                //     this.domObj.find('.dep').css("background-color", "white");

                // }

                // else {
                //     this.domObj.find('.dep').attr("disabled", "true");
                //     this.domObj.find('.dep').css("background-color", "gray");
                // }
            }.bind(this));



            //添加验证

            (<any>$('#usersmanagement_addpopup')).bootstrapValidator();
            Obj.submitObj.off("click").on("click", function () {
                var username = Obj.conObj.find('.username');
                var loginid = Obj.conObj.find('.loginid');
                var pdaid = Obj.conObj.find('.pdaid');
                var mobile = Obj.conObj.find('.mobile');
                // var companyid = Obj.conObj.find('.companyid');
                var depid = Obj.conObj.find('.depid');
                var patrol_type = Obj.conObj.find('.patrol_type option:selected');


                var group = Obj.conObj.find('.group option:selected');
                if (username.val() == '') {
                    username.addClass('has-error');
                    username.attr("placeholder", "不能为空！");
                    // this.toast.Show("用户名称不能为空！");
                    return;
                } else {
                    if (username.val().length > 10) {
                        this.toast.Show("用户名称字段长度不得超过10 ");
                        return;
                    }
                }
                if (loginid.val() == '') {
                    loginid.addClass('has-error');
                    loginid.attr("placeholder", "不能为空！");
                    // this.toast.Show("用户登录账号不能为空！");
                    return;
                } else {
                    if (loginid.val().length > 10) {
                        this.toast.Show("隐患登录账户字段长度不得超过10 ");
                        return;
                    }
                }
                if (mobile.val() == '') {
                    // mobile.addClass('has-error');
                    // mobile.attr("placeholder", "不能为空！");
                    // this.toast.Show("巡检类型不能为空！");
                    // return;
                } else {
                    var reg = /^1(3|4|5|7|8)\d{9}$/;
                    if (!reg.test(mobile.val())) {
                        this.toast.Show("手机号码验证不通过 ");
                        return;
                    }
                }

                if (group.val() == '' || group.val() == undefined) {
                    group.addClass('has-error');
                    group.attr("placeholder", "不能为空！");
                    this.toast.Show("部门名称\分组不能为空！");
                    return;
                }

                $.ajax({
                    headers: {
                        'Token': AppX.appConfig.xjxj,
                        'departmentid': AppX.appConfig.departmentid,
                    },
                    type: "POST",
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.addUser,
                    data: {
                        "loginid": loginid.val(),
                        "username": username.val(),
                        "pdaid": pdaid.val(),
                        "mobile": mobile.val(),
                        "companyid": Obj.conObj.find('.company option:selected').val() || AppX.appConfig.departmentid,// AppX.appConfig.departmentid,
                        "companyname": Obj.conObj.find('.company option:selected').text() || AppX.appConfig.departmentname, //AppX.appConfig.departmentname,
                        // "depid": depid.val(),
                        "patrol_type": patrol_type.val(),
                        "depid": group.val() || this.depid,
                        "depname": group.text(),
                        // f: "pjson"
                    },
                    success: this.addUserCallback.bind(this),
                    error: function (data) {
                        this.toast.Show("服务端ajax出错，获取数据失败!");
                    }.bind(this),
                    dataType: "json",
                });

            }.bind(that));













        }.bind(this));

        this.domObj.find('.btn_edit').on("click", function () {


            if (this.userid == "") {
                this.toast.Show("请选择一位用户");
                return;
            }

            this.popup.setSize(600, 500);

            var html = _.template(this.template.split('$$')[2])({ range: AppX.appConfig.range.split(";")[0], depid: AppX.appConfig.groupid });


            var Obj = this.popup.Show("修改", html);
            //赋值

            //   this.userid = $(e.currentTarget).data("userid");
            Obj.conObj.find('.username').val(this.username);
            Obj.conObj.find('.loginid').val(this.loginid);
            Obj.conObj.find('.companyid').val(this.cur_company);

            Obj.conObj.find('.depid').val(this.cur_depid);
            Obj.conObj.find('.pdaid').val(this.pdaid);
            Obj.conObj.find('.pdaname').val(this.pdaname);
            Obj.conObj.find('.mobile').val(this.mobile);
            Obj.conObj.find('.roleid').val(this.roleid);
            Obj.conObj.find('.online').val(this.online);
            Obj.conObj.find('.state').val(this.state);
            Obj.conObj.find('.patrol_type').val(this.patrol_type);

            this.cur_state = "edit";
            this.getCompany();
            // this.getGroup();

            //公司部门联动事件
            this.popup.contentObj.find('.company').on("change", function () {
                //根据部门重新筛选用户
                // this.company = this.popup.contentObj.find('.company option:selected').val();
                this.ls_company = this.popup.contentObj.find('.company option:selected').val();
                this.depid = "";
                // this.userid = "";
                this.getGroup();

                // if (this.company != "") {
                //     this.domObj.find('.dep').removeAttr("disabled");
                //     this.domObj.find('.dep').css("background-color", "white");

                // }

                // else {
                //     this.domObj.find('.dep').attr("disabled", "true");
                //     this.domObj.find('.dep').css("background-color", "gray");
                // }
            }.bind(this));

            // //查询所有部门和分组
            // $.ajax({
            //     headers: {
            //         // 'Authorization-Token': AppX.appConfig.xjxj
            //         'Token': AppX.appConfig.xjxj,
            //         'departmentid': AppX.appConfig.departmentid,
            //     },
            //     type: "POST",
            //     url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getGroupList,
            //     data: {
            //         "pageindex": this.config.pagenumber,
            //         "pagesize": 1000,
            //         // f: "pjson"
            //     },
            //     success: result => {
            //         if (result.code != 1) {
            //             that.toast.Show(result.message);
            //             console.log(result.message);
            //             return;
            //         }
            //         var stroption = "";
            //         result.result.rows.forEach(function (row) {
            //             stroption += "<option value='" + row.id + "'>" + row.name + "</option>";
            //         })
            //         Obj.conObj.find('.group').empty();
            //         Obj.conObj.find('.group').append(stroption);
            //         // bindpadModel.find('.devices').val(radio.data('userid'));


            //         Obj.conObj.find('.group').val(that.cur_depid);



            //     },
            //     error: function (data) {
            //         this.toast.Show("服务端ajax出错，获取数据失败!");
            //     }.bind(this),
            //     dataType: "json",
            // });


            //添加验证

            (<any>$('#usersmanagement_updatepopup')).bootstrapValidator();

            Obj.submitObj.off("click").on("click", function () {
                var username = Obj.conObj.find('.username');
                var loginid = Obj.conObj.find('.loginid');
                var pdaid = Obj.conObj.find('.pdaid');
                var mobile = Obj.conObj.find('.mobile');
                // var companyid = Obj.conObj.find('.companyid');
                this.patrol_type = Obj.conObj.find('.patrol_type option:selected').val();
                var group = Obj.conObj.find('.group option:selected');
                if (username.val() == '') {
                    username.addClass('has-error');
                    username.attr("placeholder", "不能为空！");
                    // this.toast.Show("用户名称不能为空！");
                    return;
                } else {
                    if (username.val().length > 10) {
                        this.toast.Show("用户名称字段长度不得超过10 ");
                        return;
                    }
                }
                if (loginid.val() == '') {
                    loginid.addClass('has-error');
                    loginid.attr("placeholder", "不能为空！");
                    // this.toast.Show("用户登录账号不能为空！");
                    return;
                } else {
                    if (loginid.val().length > 10) {
                        this.toast.Show("用户登录账户字段长度不得超过10 ");
                        return;
                    }
                }
                if (mobile.val() == '') {
                    // mobile.addClass('has-error');
                    // mobile.attr("placeholder", "不能为空！");
                    // this.toast.Show("巡检类型不能为空！");
                    // return;
                } else {
                    var reg = /^1(3|4|5|7|8)\d{9}$/;
                    if (!reg.test(mobile.val())) {
                        this.toast.Show("手机号码验证不通过 ");
                        return;
                    }
                }

                // if (depid.val() == '') {
                //     depid.addClass('has-error');
                //     depid.attr("placeholder", "不能为空！");
                //     // this.toast.Show("部门不能为空！");
                //     return;
                // }

                if (group.val() == '' || group.val() == undefined) {
                    group.addClass('has-error');
                    group.attr("placeholder", "不能为空！");
                    this.toast.Show("部门名称\分组不能为空！");
                    return;
                }
                $.ajax({
                    headers: {
                        'Token': AppX.appConfig.xjxj,
                        'departmentid': AppX.appConfig.departmentid,
                    },
                    type: "POST",
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.updateUser,
                    data: {
                        "userid": this.userid,
                        "loginid": loginid.val(),
                        "username": username.val(),
                        "mobile": mobile.val(),
                        "patrol_type": this.patrol_type,
                        "depid": group.val(),
                        "depname": group.text(),
                        "companyid": Obj.conObj.find('.company option:selected').val() || AppX.appConfig.departmentid,// AppX.appConfig.departmentid,
                        "companyname": Obj.conObj.find('.company option:selected').text() || AppX.appConfig.departmentname, //AppX.appConfig.departmentname,
                        // "companyname": AppX.appConfig.departmentname,
                        // "pdaid": pdaid.val(),

                        // "companyid": AppX.appConfig.departmentid,
                        // "depid": depid.val(),

                        // f: "pjson"
                    },
                    success: this.updateUserCallback.bind(this),
                    error: function (data) {
                        this.toast.Show("服务端ajax出错，获取数据失败!");
                    }.bind(this),
                    dataType: "json",
                });
            }.bind(this));






        }.bind(this));



        this.domObj.find('.btn_bindpad').on("click", function () {
            if (this.userid == "") {
                this.toast.Show("请选择一位用户");
                return;
            }
            var Obj = this.popup.Show("绑定设备", this.template.split('$$')[3]);
            //赋值
            this.popup.setSize(600, 180);

            //查询所有正式机设备
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
                    "pageindex": this.config.pagenumber,
                    "pagesize": 1000,
                    "isBind": 0,
                    "type": 0,
                    "depid": this.depid,
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
                        stroption += "<option value='" + row.padid + "'>" + row.padname + "</option>";
                    })
                    Obj.conObj.find('.devices').empty();
                    Obj.conObj.find('.devices').append(stroption);
                    // bindpadModel.find('.devices').val(radio.data('userid'));

                    Obj.submitObj.off("click").on("click", function () {

                        var padid = Obj.conObj.find('.devices');

                        if (padid.val() == '') {
                            padid.addClass('has-error');
                            padid.attr("placeholder", "不能为空！");
                            this.toast.Show("选择一个设备！");
                            return;
                        }

                        $.ajax({
                            headers: {
                                'Token': AppX.appConfig.xjxj,
                                'departmentid': AppX.appConfig.departmentid,
                            },
                            type: "POST",
                            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.bindpad,
                            data: {
                                "userid": this.userid,
                                "pdaid": padid.val(),
                                // f: "pjson"
                            },
                            success: this.bindPadCallback.bind(this),
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

        }.bind(this));

        this.domObj.find('.btn_unbindpad').on("click", function () {
            if (this.userid == "") {
                this.toast.Show("请选择一位用户");
                return;
            }

            if (this.state == 2) {
                this.toast.Show("设备已经解绑");
                return;
            }
            $.ajax({
                headers: {
                    // 'Authorization-Token': AppX.appConfig.xjxj
                    'Token': AppX.appConfig.xjxj,
                    'departmentid': AppX.appConfig.departmentid,
                },
                type: "POST",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.firebind + this.userid,
                data: {
                    // "pageindex": this.config.pagenumber,
                    // "pagesize": 1000,
                    // f: "pjson"
                },
                success: function (results) {
                    if (results.code != 1) {
                        that.toast.Show(results.message);
                        console.log(results.message);
                        return;
                    }
                    that.toast.Show(results.message);

                    //重新查询
                    that.getUser(that.config.pagenumber);
                },
                error: function (data) {
                    this.toast.Show("服务端ajax出错，获取数据失败!");
                }.bind(this),
                dataType: "json",
            });


        }.bind(this));


        this.domObj.find('.btn_group').on("click", function () {
            if (this.userid == "") {
                this.toast.Show("请选择一位用户");
                return;
            }
            var Obj = this.popup.Show("部门名称\分组", this.template.split('$$')[4]);
            //赋值
            this.popup.setSize(600, 180);

            //查询所有部门和分组
            $.ajax({
                headers: {
                    // 'Authorization-Token': AppX.appConfig.xjxj
                    'Token': AppX.appConfig.xjxj,
                    'departmentid': AppX.appConfig.departmentid,
                },
                type: "POST",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getGroupList,
                data: {
                    "pageindex": this.config.pagenumber,
                    "pagesize": 1000,
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
                    Obj.conObj.find('.group').empty();
                    Obj.conObj.find('.group').append(stroption);
                    // bindpadModel.find('.devices').val(radio.data('userid'));

                    Obj.submitObj.off("click").on("click", function () {

                        var group = Obj.conObj.find('.group option:selected');

                        if (group.val() == '') {
                            group.addClass('has-error');
                            group.attr("placeholder", "不能为空！");
                            this.toast.Show("选择一个部门/分组！");
                            return;
                        }

                        $.ajax({
                            headers: {
                                'Token': AppX.appConfig.xjxj,
                                'departmentid': AppX.appConfig.departmentid,
                            },
                            type: "POST",
                            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.grouping,
                            data: {
                                "user_id": this.userid,
                                "group_id": group.val(),
                                "group_name": group.text(),
                                // f: "pjson"
                            },
                            success: this.groupCallback.bind(this),
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

        }.bind(this));





        this.domObj.find('.btn_delete').on("click", function () {

            if (this.userid == "") {
                this.toast.Show("请选择一位用户");
                return;
            }

            this.popup.setSize(600, 150);

            var Obj = this.popup.Show("删除", this.template.split('$$')[6]);
            //赋值


            Obj.submitObj.off("click").on("click", function () {
                // this.popup.Close();

                $.ajax({
                    headers: {
                        // 'Authorization-Token': AppX.appConfig.xjxj
                        'Token': AppX.appConfig.xjxj,
                        'departmentid': AppX.appConfig.departmentid,
                    },
                    type: "POST",
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.deleteUser + this.userid,
                    data: {
                        "id": this.userid,
                        // f: "pjson"
                    },
                    success: this.deleteUserCallback.bind(this),
                    error: function (data) {
                        this.toast.Show("服务端ajax出错，获取数据失败!");
                    }.bind(this),
                    dataType: "json",
                });


            }.bind(this));



        }.bind(this));

        //重置密码
        this.domObj.find('.btn_resetpassword').on("click", function () {

            if (this.userid == "") {
                this.toast.Show("请选择一位用户");
                return;
            }
            $.ajax({
                headers: {
                    // 'Authorization-Token': AppX.appConfig.xjxj
                    'Token': AppX.appConfig.xjxj,
                    'departmentid': AppX.appConfig.departmentid,
                },
                type: "POST",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.resetpassword + this.userid,
                data: {
                    "id": this.userid,
                    // f: "pjson"
                },
                success: function (result) {
                    if (result.code !== 1) {
                        this.toast.Show("重置密码失败!");
                    } else {
                        this.toast.Show("重置密码成功!");
                    }

                }.bind(this),
                error: function (data) {
                    this.toast.Show("服务端ajax出错，获取数据失败!");
                }.bind(this),
                dataType: "json",
            });
        }.bind(this));

        //启用/停用账户
        this.domObj.find('.btn_stop').on("click", function () {


            if (this.userid == "") {
                this.toast.Show("请选择一位用户");
                return;
            }
            if (this.state == 2) {
                this.toast.Show("请先绑定设备");
                return;
            }
            if (this.state == 1) {
                this.state = 0;
            } else {
                this.state = 1;
            }

            $.ajax({
                headers: {
                    // 'Authorization-Token': AppX.appConfig.xjxj
                    'Token': AppX.appConfig.xjxj,
                    'departmentid': AppX.appConfig.departmentid,
                },
                type: "POST",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.updateUser,
                data: {
                    "userid": this.userid,
                    "state": this.state,
                    // f: "pjson"
                },
                success: this.deleteUserCallback.bind(this),
                error: function (data) {
                    this.toast.Show("服务端ajax出错，获取数据失败!");
                }.bind(this),
                dataType: "json",
            });
        }.bind(this));




        // 选中行高亮
        this.domObj.off("click").on('click', 'tbody tr', (e) => {
            if ($(e.currentTarget).data("userid") == null) {
                return;
            } else {
                this.userid = $(e.currentTarget).data("userid");
                this.username = $(e.currentTarget).data("username");
                this.loginid = $(e.currentTarget).data("loginid");
                // this.company = $(e.currentTarget).data("companyid");
                // this.depid = $(e.currentTarget).data("depid");

                this.cur_company = $(e.currentTarget).data("companyid");
                this.cur_depid = $(e.currentTarget).data("depid");

                this.groupname = $(e.currentTarget).data("group_name");
                this.pdaid = $(e.currentTarget).data("pdaid");
                this.pdaname = $(e.currentTarget).data("pdaname");
                this.mobile = $(e.currentTarget).data("mobile");
                this.roleid = $(e.currentTarget).data("roleid");
                this.online = $(e.currentTarget).data("online");
                this.state = $(e.currentTarget).data("state");
                this.patrol_type = $(e.currentTarget).data("patrol_type");
            }
            this.domObj.find('tr.active').removeClass('active');
            $(e.currentTarget).addClass('active');



        });

        // 双击查看
        this.domObj.off("dblclick").on('dblclick', 'tbody tr', (e) => {

            if ($(e.currentTarget).data("userid") == null) {
                return;
            } else {
                this.userid = $(e.currentTarget).data("userid");
                this.username = $(e.currentTarget).data("username");
                this.loginid = $(e.currentTarget).data("loginid");
                // this.company = $(e.currentTarget).data("companyid");
                // this.depid = $(e.currentTarget).data("depid");

                this.cur_company = $(e.currentTarget).data("companyid");
                this.cur_depid = $(e.currentTarget).data("depid");

                this.groupname = $(e.currentTarget).data("group_name");
                this.pdaid = $(e.currentTarget).data("pdaid");
                this.pdaname = $(e.currentTarget).data("pdaname");
                this.mobile = $(e.currentTarget).data("mobile");
                this.roleid = $(e.currentTarget).data("roleid");
                this.online = $(e.currentTarget).data("online");
                this.state = $(e.currentTarget).data("state");
                this.patrol_type = $(e.currentTarget).data("patrol_type");
            }
            this.domObj.find('tr.active').removeClass('active');
            $(e.currentTarget).addClass('active');

            if (this.userid == "") {
                this.toast.Show("请选择一位用户");
                return;
            }

            this.popup.setSize(600, 400);

            var Obj = this.popup.Show("查看", this.template.split('$$')[5], true);
            //赋值

            //   this.userid = $(e.currentTarget).data("userid");
            Obj.conObj.find('.username').val(this.username);
            Obj.conObj.find('.loginid').val(this.loginid);
            Obj.conObj.find('.companyid').val(this.cur_company);
            Obj.conObj.find('.depid').val(this.cur_depid);
            Obj.conObj.find('.pdaid').val(this.pdaid);
            Obj.conObj.find('.pdaname').val(this.pdaname);
            Obj.conObj.find('.mobile').val(this.mobile);
            Obj.conObj.find('.roleid').val(this.roleid);
            Obj.conObj.find('.online').val(this.online);
            Obj.conObj.find('.state').val(this.state);

            if (this.patrol_type == "0") {
                Obj.conObj.find('.patrol_type').val("人巡");

            } else if (this.patrol_type == "1") {
                Obj.conObj.find('.patrol_type').val("车巡");
            }

            Obj.conObj.find('.group').val(this.groupname);

            Obj.submitObj.off("click").on("click", function () {
                this.popup.Close();
            }.bind(this));



        });




        //动态生成书签及分页控件
        //分页控件fykj 向前、向后事件
        this.domObj.find(".pre").off("click").on("click", function () {
            if (this.currentpage - 1 > 0) {
                this.currentpage = this.currentpage - 1;
                this.getUser(this.currentpage);

            }

        }.bind(this));
        this.domObj.find(".next").off("click").on("click", function () {
            if (this.currentpage + 1 <= this.totalpage) {
                this.currentpage = this.currentpage + 1;
                this.getUser(this.currentpage);

            }
        }.bind(this));


        this.domObj.find(".pageturning").off("click").on("click", function () {
            var currpage = parseInt(this.domObj.find(".currpage").val());
            if (currpage <= this.totalpage && currpage >= 1) {
                this.currentpage = parseInt(this.domObj.find(".currpage").val());
                this.getUser(this.currentpage);
            }
        }.bind(this));


    }


    addUserCallback(results) {

        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            console.log(results.message);
            return;
        }
        this.popup.Close();
        that.toast.Show(results.message);



        //清空：选中、新增时产生的选中，避免直接点删除
        this.userid = "";
        this.username = "";
        this.loginid = "";
        this.company = "";
        this.cur_depid = "";
        this.pdaid = "";
        this.roleid = "";
        this.online = "";
        this.state = "";

        this.groupname = "";
        this.pdaname = "";
        this.mobile = "";
        this.patrol_type = "";

        this.cur_state = "";

        //重新查询
        this.getUser(this.config.pagenumber);

    }

    updateUserCallback(results) {

        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            console.log(results.message);
            return;
        }
        this.popup.Close();
        that.toast.Show(results.message);



        //清空修改时产生的选中，避免直接点删除


        this.userid = "";
        this.username = "";
        this.loginid = "";
        this.company = "";
        this.cur_depid = "";
        this.pdaid = "";
        this.roleid = "";
        this.online = "";
        this.state = "";

        this.groupname = "";
        this.pdaname = "";
        this.mobile = "";
        this.patrol_type = "";
        this.cur_state = "";
        //重新查询
        this.getUser(this.config.pagenumber);

    }

    bindPadCallback(results) {

        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            console.log(results.message);
            return;
        }
        this.popup.Close();
        that.toast.Show(results.message);

        this.cur_state = "";

        //重新查询
        this.getUser(this.config.pagenumber);


    }

    groupCallback(results) {

        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            console.log(results.message);
            return;
        }
        this.popup.Close();
        that.toast.Show(results.message);

        //重新查询
        this.getUser(this.config.pagenumber);


    }




    deleteUserCallback(results) {

        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            console.log(results.message);
            return;
        }
        this.popup.Close();
        that.toast.Show(results.message);

        //清空数据
        this.userid = "";
        this.username = "";
        this.loginid = "";
        this.company = "";
        this.cur_depid = "";
        this.pdaid = "";
        this.roleid = "";
        this.online = "";
        this.state = "";
        this.cur_state = "";

        //重新查询
        this.getUser(this.config.pagenumber);


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


        //组织popup数据
        this.popup.contentObj.find(".company");

        var company = this.popup.contentObj.find(".company").empty();
        // var strcompany = "<option value='' selected>全部</option>";
        var strcompany = "";
        $.each(results.result, function (index, item) {
            strcompany += "<option value=" + item.companyid + " > " + item.company_name + " </option>";

        }.bind(this));
        company.append(strcompany);
        if (this.cur_state == "add") {

        } else {
            company.val(this.cur_company || AppX.appConfig.departmentid);
        }

        if (this.cur_state == "edit") {
            this.getGroup();
        }






    }




    getGroup() {
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
                'range': AppX.appConfig.range,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getGroupList,
            data: {
                "pageindex": this.config.pagenumber,
                "pagesize": 1000 || this.config.pagesize,
                "companyid": this.ls_company || this.cur_company || AppX.appConfig.departmentid,
            },
            // this.company ||
            success: this.getGroupListCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }


    getGroupListCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("查询分组信息出错！");
            console.log(results.message);
            return;
        }
        var department = this.popup.contentObj.find(".group").empty();
        // var strdepartment = "<option value='' selected>全部</option>";
        var strdepartment = "";
        $.each(results.result.rows, function (index, item) {
            strdepartment += "<option value='" + item.id + "'>" + item.name + "</option>";

        }.bind(this));
        department.append(strdepartment);

        department.val(this.cur_depid);

        this.ls_company = "";

        if (results.result.rows.length == 0) {
            that.toast.Show("当前公司没有部门分组信息！");
        }

    }





    public destroy() {

        this.domObj.remove();
        this.afterDestroy();
    }
}