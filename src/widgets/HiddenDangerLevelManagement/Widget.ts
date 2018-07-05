import BaseWidget = require('core/BaseWidget.class');
export = HiddenDangerLevelManagement;

class HiddenDangerLevelManagement extends BaseWidget {
    baseClass = "widget-hiddendangerlevelmanagement";

    toast = null;
    popup = null;
    isfirst = false;
    totalpage = 1;
    currentpage = 1;
    currentpagesieze = 13;


    hiddendangerlevelid = "";
    name = "";
    notes = "";
    category = "";
    grading = "";
    submitting = "";
    keyword = "";
    version = "";


    startup() {
        this.configure();
        this.initHtml();
        this.initEvent();

    }
    initHtml() {
        var html = _.template(this.template.split('$$')[0] + "</div>")();
        this.setHtml(html);
        this.ready();
        // this.getHiddenDangerType(this.config.pagenumber);
        this.getHiddenDangerLevel(this.config.pagenumber);
    }

    configure() {
        this.toast = this.AppX.runtimeConfig.toast;
        this.popup = this.AppX.runtimeConfig.popup;
        //获取隐患类型信息
    }


    getHiddenDangerLevelListCallback(results) {
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
        var domtb = this.domObj.find(".addhiddendangerlevel");
        domtb.empty();
        var address;
        var html_trs_data = "";
        var strcheck = "";
        var strsubmit = "";
        $.each(results.result.rows, function (i, item) {
            strcheck = "否";
            if (item.ischeck == 1) {
                strcheck = "是"
            }
            strsubmit = "否";
            if (item.issubmit == 1) {
                strsubmit = "是"
            }
            //<td>" + item.category + "</td>
            // <td>" + strcheck + "</td>
            html_trs_data += "<tr class=goto  data-id='" + item.id + "' data-name='" + item.name + "' data-notes='" + item.notes + "' data-category='" + item.category + "' data-ischeck='" + item.ischeck + "' data-issubmit='" + item.issubmit + "'><td>" + item.name + "</td><td>" + item.notes + "</td><td>" + strsubmit + "</td></tr>";
            //刷新infowindow
            // this.setContent(item);
        }.bind(this));
        domtb.append(html_trs_data);


        var html_trs_blank = "";
        if (results.result.rows.length < that.config.pagesize) {
            var num = that.config.pagesize - results.result.rows.length;
            for (var i = 0; i < num; i++) {
                html_trs_blank += "<tr class=goto><td></td><td></td><td></td></tr>";
            }
            domtb.append(html_trs_blank);
        }


        //定义版本号

        this.domObj.find(".curversion").text("版本号:" + results.result.currentversion);
        var strversion = "";
        $.each(results.result.version, function (i, item) {
            strversion += "  <li  class='operation' data-index=" + item + "><a>" + "版本号:" + item + "</a></li>";
        }.bind(this));
        this.domObj.find(".versions").empty();
        this.domObj.find(".versions").append(strversion);
        if (this.version != "") {
            // this.domObj.find(".versions").val(this.version);
            this.domObj.find(".curversion").text("版本号:" + results.result.currentversion);

        }

        this.domObj.find('.operation').on("click", function (e) {
            this.domObj.find(".curversion").text($(e.currentTarget).text());
            this.version = $(e.currentTarget).data("index");
            this.getHiddenDangerLevel(this.config.pagenumber);

        }.bind(this));







    }


    initEvent() {


        this.domObj.find('.btn_search').on("click", function () {

            this.keyword = this.domObj.find('.search_condition').val();

            this.getHiddenDangerLevel(this.config.pagenumber);

        }.bind(this));


        this.domObj.find('.search_condition').keydown(function (event) {
            if (event.keyCode == 13) {//enter
                this.keyword = this.domObj.find('.search_condition').val();
                this.getHiddenDangerLevel(this.config.pagenumber);
            }
        }.bind(this));

        //重置查询
        this.domObj.find('.btn_rsearch').on("click", function () {

            this.keyword = "";
            this.domObj.find('.search_condition').val("");
            this.getHiddenDangerLevel(this.config.pagenumber);

        }.bind(this));



        this.domObj.find('.btn_add').off("click").on("click", function () {


            //弹出popup
            this.popup.setSize(600, 430);
            var Obj = this.popup.Show("新增", this.template.split('$$')[1]);


            //验证
            (<any>$('#hiddendangerlevelmanagement_addpopup')).bootstrapValidator();

            Obj.submitObj.off("click").on("click", function () {

                var name = Obj.conObj.find(".name");
                var notes = Obj.conObj.find('.notes');
                var category = Obj.conObj.find('.category');
                var grading = Obj.conObj.find('.grading');
                var submitting = Obj.conObj.find('.submitting');

                if (name.val() == '') {
                    name.addClass('has-error');
                    name.attr("placeholder", "不能为空！");
                    // this.toast.Show("隐患分类不能为空！");
                    return;
                }
                // if (category.val() == '') {
                //     category.addClass('has-error');
                //     category.attr("placeholder", "不能为空！");
                //     // this.toast.Show("隐患类别不能为空！");
                //     return;
                // }

                $.ajax({
                    headers: {
                        'Token': AppX.appConfig.xjxj,
                        'departmentid': AppX.appConfig.departmentid,
                    },
                    type: "POST",
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.addHiddenDangerLevel,
                    data: {
                        "name": name.val(),
                        "notes": notes.val(),
                        "category": category.val(),
                        // "ischeck": grading.val(),
                        "ischeck": 1,
                        "issubmit": submitting.val(),
                        // f: "pjson"
                    },
                    success: this.addHiddenDangerLevelCallback.bind(this),
                    error: function (data) {
                        this.toast.Show("服务端ajax出错，获取数据失败!");
                    }.bind(this),
                    dataType: "json",
                });

            }.bind(this));





        }.bind(this));

        this.domObj.find('.btn_edit').off("click").on("click", function () {


            if (this.hiddendangertypeid == "") {
                this.toast.Show("请选择要修改的隐患类型！");
                return;
            }
            //弹出popup
            this.popup.setSize(600, 430);

            var Obj = this.popup.Show("修改", this.template.split('$$')[2]);
            //赋值

            //   this.userid = $(e.currentTarget).data("userid");
            // Obj.conObj.find('.id').val(this.hiddendangertypeid);
            Obj.conObj.find('.name').val(this.name);
            Obj.conObj.find('.notes').val(this.notes);
            Obj.conObj.find('.category').val(this.category);

            Obj.conObj.find('.grading').val(this.grading);
            Obj.conObj.find('.submitting').val(this.submitting);

            //验证
            (<any>$('#hiddendangerlevelmanagement_updatepopup')).bootstrapValidator();

            Obj.submitObj.off("click").on("click", function () {


                var name = Obj.conObj.find(".name");
                var notes = Obj.conObj.find('.notes');
                var category = Obj.conObj.find('.category');

                var grading = Obj.conObj.find('.grading');
                var submitting = Obj.conObj.find('.submitting');
                if (name.val() == '') {
                    name.addClass('has-error');
                    name.attr("placeholder", "不能为空！");
                    // this.toast.Show("隐患类型名称不能为空！");
                    return;
                }
                // if (category.val() == '') {
                //     category.addClass('has-error');
                //     category.attr("placeholder", "不能为空！");
                //     // this.toast.Show("隐患类型登录账号不能为空！");
                //     return;
                // }


                $.ajax({
                    headers: {
                        'Token': AppX.appConfig.xjxj,
                        'departmentid': AppX.appConfig.departmentid,
                    },
                    type: "POST",
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.updateHiddenDangerLevel,
                    data: {
                        "id": this.hiddendangerlevelid,
                        "name": name.val(),
                        "notes": notes.val(),
                        "category": category.val(),
                        // "ischeck": grading.val(),
                        "ischeck": 1,
                        "issubmit": submitting.val(),
                    },
                    success: this.updateHiddenDangerLevelCallback.bind(this),
                    error: function (data) {
                        this.toast.Show("服务端ajax出错，获取数据失败!");
                    }.bind(this),
                    dataType: "json",
                });



            }.bind(this));



        }.bind(this));



        this.domObj.find('.btn_delete').off("click").on("click", function () {


            if (this.hiddendangerlevelid == "") {
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
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.deleteHiddenDangerLevel + this.hiddendangerlevelid,
                    data: {
                        "id": this.hiddendangertypeid,
                        // f: "pjson"
                    },
                    success: this.deleteHiddenDangerLevelCallback.bind(this),
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
                this.hiddendangerlevelid = $(e.currentTarget).data("id");
                this.name = $(e.currentTarget).data("name");
                this.notes = $(e.currentTarget).data("notes");
                this.category = $(e.currentTarget).data("category");

                this.grading = $(e.currentTarget).data("ischeck");

                this.submitting = $(e.currentTarget).data("issubmit");
            }
            this.domObj.find('tr.active').removeClass('active');
            $(e.currentTarget).addClass('active');



        });


        // 双击查看
        this.domObj.off("dblclick").on('dblclick', 'tbody tr', (e) => {

            if ($(e.currentTarget).data("id") == null) {
                return;
            } else {
                this.hiddendangerlevelid = $(e.currentTarget).data("id");
                this.name = $(e.currentTarget).data("name");
                this.notes = $(e.currentTarget).data("notes");
                this.category = $(e.currentTarget).data("category");

                this.grading = $(e.currentTarget).data("ischeck");
                this.submitting = $(e.currentTarget).data("issubmit");

            }
            this.domObj.find('tr.active').removeClass('active');
            $(e.currentTarget).addClass('active');

            if (this.hiddendangerlevelid == "") {
                this.toast.Show("请选择一位用户");
                return;
            }

            this.popup.setSize(600, 420);

            var Obj = this.popup.Show("查看", this.template.split('$$')[3], true);
            //赋值

            //   this.userid = $(e.currentTarget).data("userid");
            Obj.conObj.find('.name').val(this.name);
            Obj.conObj.find('.notes').val(this.notes);
            Obj.conObj.find('.category').val(this.category);

            if (this.grading == "0") {
                Obj.conObj.find('.grading').val("否");
            } else {
                Obj.conObj.find('.grading').val("是");
            }


            if (this.submitting == "0") {
                Obj.conObj.find('.submitting').val("否");
            } else {
                Obj.conObj.find('.submitting').val("是");
            }


            Obj.submitObj.off("click").on("click", function () {
                this.popup.Close();
            }.bind(this));



        });



        //动态生成书签及分页控件
        //分页控件fykj 向前、向后事件

        this.domObj.find(".pre").off("click").on("click", function () {
            if (this.currentpage - 1 > 0) {
                this.currentpage = this.currentpage - 1;
                this.getHiddenDangerLevel(this.currentpage);

            }

        }.bind(this));
        this.domObj.find(".next").off("click").on("click", function () {
            if (this.currentpage + 1 <= this.totalpage) {
                this.currentpage = this.currentpage + 1;
                this.getHiddenDangerLevel(this.currentpage);

            }
        }.bind(this));


        this.domObj.find(".pageturning").off("click").on("click", function () {
            var currpage = parseInt(this.domObj.find(".currpage").val());
            if (currpage <= this.totalpage && currpage >= 1) {
                this.currentpage = parseInt(this.domObj.find(".currpage").val());
                this.getHiddenDangerLevel(this.currentpage);

            }
        }.bind(this));


    }

    getHiddenDangerLevel(pagenumber) {
        this.currentpage = pagenumber || this.config.pagenumber;
        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getHiddenDangerLevelList,
            data: {
                "pageindex": pagenumber || this.config.pagenumber,
                "pagesize": this.config.pagesize,
                "keyword": this.keyword,
                "version": this.version,
                // f: "pjson"
            },
            success: this.getHiddenDangerLevelListCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    addHiddenDangerLevelCallback(results) {

        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            console.log(results.message);
            return;
        }
        this.popup.Close();
        that.toast.Show(results.message);
        //重新查询
        this.version = "";
        this.getHiddenDangerLevel(this.config.pagenumber);

        //清空：选中、新增时产生的选中，避免直接点删除
        this.hiddendangerlevelid = "";
        this.name = "";
        this.notes = "";
        this.category = "";
        this.grading = "";
        this.submitting = "";

    }

    updateHiddenDangerLevelCallback(results) {

        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            console.log(results.message);
            return;
        }
        this.popup.Close();
        that.toast.Show(results.message);
        //重新查询
        this.getHiddenDangerLevel(this.config.pagenumber);

        //清空修改时产生的选中，避免直接点删除
        this.hiddendangerlevelid = "";
        this.name = "";
        this.notes = "";
        this.category = "";
        this.grading = "";
        this.submitting = "";

    }


    deleteHiddenDangerLevelCallback(results) {

        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            console.log(results.message);
            return;
        }
        this.popup.Close();
        that.toast.Show(results.message);
        //重新查询
        this.version = "";
        this.getHiddenDangerLevel(this.config.pagenumber);

        //清空
        this.hiddendangerlevelid = "";
        this.name = "";
        this.notes = "";
        this.category = "";
        this.grading = "";
        this.submitting = "";

    }





    destroy() {

        this.domObj.remove();
        this.afterDestroy();
    }
}