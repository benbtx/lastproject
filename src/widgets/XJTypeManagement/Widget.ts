import BaseWidget = require('core/BaseWidget.class');
export = XJTypeManagement;

class XJTypeManagement extends BaseWidget {
    baseClass = "widget-xjtypemanagement";

    toast = null;
    popup = null;
    isfirst = false;
    totalpage = 1;
    currentpage = 1;
    currentpagesieze = 13;


    xjtypeid = "";
    name = "";
    type = "";
    category = "";
    strhiddendangerlevel = "";
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
        this.getXJType(this.config.pagenumber);

    }

    configure() {
        this.toast = this.AppX.runtimeConfig.toast;
        this.popup = this.AppX.runtimeConfig.popup;
        //获取隐患类型信息
    }


    getXJTypeListCallback(results) {
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
        var lx = "";
        var planmode = "";
        $.each(results.result.rows, function (i, item) {

            if (item.type == "0") {
                lx = "点";
            } else if (item.type == "1") {
                lx = "线";
            }
            if (item.plan_mode == "1") {
                planmode = "到位巡检";
            } else if (item.plan_mode == "2") {
                planmode = "隐患巡检";
            } else if (item.plan_mode == "3") {
                planmode = "设备巡检";
            }

            html_trs_data += "<tr class=goto  data-id='" + item.id + "' data-name='" + item.name + "' data-type='" + item.type + "' data-category='" + item.category + "' data-default_level='" + item.default_level + "'><td>" + item.name + "</td><td>" + lx + "</td><td>" + planmode + "</td></tr>";
            //刷新infowindow
            // this.setContent(item);
        }.bind(this));
        domtb.append(html_trs_data);


        var html_trs_blank = "";
        if (results.result.rows.length < that.config.pagesize) {
            var num = that.config.pagesize - results.result.rows.length;
            for (var i = 0; i < num; i++) {
                html_trs_blank += "<tr class=goto><td></td><td></td></tr>";
            }
            domtb.append(html_trs_blank);
        }

        // this.domObj.find(".curversion").text("版本号:" + results.result.currentversion);

        // var strversion = "";
        // $.each(results.result.version, function (i, item) {
        //     strversion += "  <li data-index=" + item + "><a>" + "版本号:" + item + "</a></li>";
        // }.bind(this));
        // this.domObj.find(".versions").append(strversion);





    }


    initEvent() {


        this.domObj.find('.btn_search').on("click", function () {

            this.keyword = this.domObj.find('.search_condition').val();

            this.getXJType(this.config.pagenumber);



        }.bind(this));


        //重置查询
        this.domObj.find('.btn_rsearch').on("click", function () {

            this.keyword = "";
            this.domObj.find('.search_condition').val("");
            this.getXJType(this.config.pagenumber);

        }.bind(this));




        this.domObj.find('.btn_add').on("click", function () {


            //弹出popup
            this.popup.setSize(600, 350);
            var Obj = this.popup.Show("新增", this.template.split('$$')[1]);

            //验证
            (<any>$('#xjtypemanagement_addpopup')).bootstrapValidator();

            Obj.submitObj.off("click").on("click", function () {

                var name = Obj.conObj.find(".name");
                var type = Obj.conObj.find('.type');

                var plan_mode = Obj.conObj.find('.plan_mode');
                if (name.val() == '') {
                    name.addClass('has-error');
                    name.attr("placeholder", "不能为空！");
                    // this.toast.Show("隐患分类不能为空！");
                    return;
                }
                else {
                    if (name.val().length > 30) {
                        this.toast.Show("隐患分类字段长度不得超过30 ");
                        return;
                    }
                }
                if (type.val() != '') {
                    if (type.val().length > 60) {
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
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.addXJType,
                    data: {
                        // "key": "0017",
                        "name": name.val(),
                        "type": type.val(),
                        "plan_mode": plan_mode.val(),
                        // "category": category.val(),
                        // "default_level": strhiddendangerlevel,
                        // f: "pjson"
                    },
                    success: this.addXJTypeCallback.bind(this),
                    error: function (data) {
                        this.toast.Show("服务端ajax出错，获取数据失败!");
                    }.bind(this),
                    dataType: "json",
                });

            }.bind(this));











        }.bind(this));

        this.domObj.find('.btn_edit').on("click", function () {
            var that = this;
            if (this.xjtypeid == "") {
                this.toast.Show("请选择要修改的隐患类型！");
                return;
            }
            //弹出popup
            this.popup.setSize(600, 350);
            var Obj = this.popup.Show("修改", this.template.split('$$')[2]);
            //赋值

            //   this.userid = $(e.currentTarget).data("userid");
            // Obj.conObj.find('.id').val(this.xjtypeid);
            Obj.conObj.find('.name').val(this.name);
            Obj.conObj.find('.type').val(this.type);


            if (that.strhiddendangerlevel != "") {
                Obj.conObj.find('input:checkbox').each(function (i, item) {
                    if (that.strhiddendangerlevel.indexOf(item.value) > -1) {
                        // alert(item.value);
                        item.checked = true;
                    }
                });

            }


            //验证
            (<any>$('#xjtypemanagement_updatepopup')).bootstrapValidator();

            Obj.submitObj.off("click").on("click", function () {


                var name = Obj.conObj.find(".name");
                var type = Obj.conObj.find('.type');
                var category = Obj.conObj.find('.category');


                var strhiddendangerlevel = "";

                Obj.conObj.find('input:checkbox').each(function (i, item) {
                    if (item.checked == true) {
                        // alert(item.value);
                        strhiddendangerlevel += item.value + ","
                    }
                });

                strhiddendangerlevel = strhiddendangerlevel.substr(0, strhiddendangerlevel.length - 1);

                if (name.val() == '') {
                    name.addClass('has-error');
                    name.attr("placeholder", "不能为空！");
                    // this.toast.Show("隐患类型名称不能为空！");
                    return;
                }
                else {
                    if (name.val().length > 30) {
                        this.toast.Show("隐患分类字段长度不得超过30 ");
                        return;
                    }
                }
                if (type.val() != '') {
                    if (type.val().length > 60) {
                        this.toast.Show("备注字段长度不得超过60 ");
                        return;
                    }
                }
                // if (strhiddendangerlevel == "") {
                //     this.toast.Show("风险级别不能为空！");
                // }


                $.ajax({
                    headers: {
                        'Token': AppX.appConfig.xjxj,
                        'departmentid': AppX.appConfig.departmentid,
                    },
                    type: "POST",
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.updateXJType,
                    data: {
                        "id": this.xjtypeid,
                        // "key": "0017",
                        "name": name.val(),
                        "type": type.val(),
                        // "category": category.val(),
                        // "default_level": strhiddendangerlevel,
                    },
                    success: this.updateXJTypeCallback.bind(this),
                    error: function (data) {
                        this.toast.Show("服务端ajax出错，获取数据失败!");
                    }.bind(this),
                    dataType: "json",
                });

            }.bind(this));





        }.bind(this));



        this.domObj.find('.btn_delete').on("click", function () {

            if (this.xjtypeid == "") {
                this.toast.Show("请选择要删除的隐患类型！");
                return;
            }

            this.popup.setSize(600, 150);

            var Obj = this.popup.Show("删除", this.template.split('$$')[4]);
            //赋值


            Obj.submitObj.off("click").on("click", function () {
                // var arr = [];
                // arr.push(this.xjtypeid);
                $.ajax({
                    headers: {
                        // 'Authorization-Token': AppX.appConfig.xjxj
                        'Token': AppX.appConfig.xjxj,
                        'departmentid': AppX.appConfig.departmentid,
                    },
                    type: "POST",
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.deleteXJType + this.xjtypeid,
                    data: {
                        // "id": this.xjtypeid,
                        // "list": arr,
                        // f: "pjson"
                    },
                    success: this.deleteXJTypeCallback.bind(this),
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
                this.xjtypeid = $(e.currentTarget).data("id");
                this.name = $(e.currentTarget).data("name");
                this.type = $(e.currentTarget).data("type");
                this.category = $(e.currentTarget).data("category");
                if ($(e.currentTarget).data("default_level") != null) {
                    this.strhiddendangerlevel = $(e.currentTarget).data("default_level").toString();
                } else {
                    this.strhiddendangerlevel = "";
                }




            }
            this.domObj.find('tr.active').removeClass('active');
            $(e.currentTarget).addClass('active');



        });


        // 双击查看
        this.domObj.off("dblclick").on('dblclick', 'tbody tr', (e) => {

            if ($(e.currentTarget).data("id") == null) {
                return;
            } else {
                this.xjtypeid = $(e.currentTarget).data("id");
                this.name = $(e.currentTarget).data("name");
                this.type = $(e.currentTarget).data("type");
                this.category = $(e.currentTarget).data("category");
                if ($(e.currentTarget).data("default_level") != null) {
                    this.strhiddendangerlevel = $(e.currentTarget).data("default_level").toString();
                } else {
                    this.strhiddendangerlevel = "";
                }




            }
            this.domObj.find('tr.active').removeClass('active');
            $(e.currentTarget).addClass('active');

            if (this.xjtypeid == "") {
                this.toast.Show("请选择一位用户");
                return;
            }

            this.popup.setSize(600, 350);

            var Obj = this.popup.Show("查看", this.template.split('$$')[3], true);
            //赋值

            //   this.userid = $(e.currentTarget).data("userid");
            Obj.conObj.find('.name').val(this.name);
            Obj.conObj.find('.type').val(this.type);
            Obj.conObj.find('.category').val(this.category);



            Obj.submitObj.off("click").on("click", function () {
                this.popup.Close();
            }.bind(this));



        });



        //动态生成书签及分页控件
        //分页控件fykj 向前、向后事件
        this.domObj.find(".pre").off("click").on("click", function () {
            if (this.currentpage - 1 > 0) {
                this.currentpage = this.currentpage - 1;
                this.getXJType(this.currentpage);

            }

        }.bind(this));
        this.domObj.find(".next").off("click").on("click", function () {
            if (this.currentpage + 1 <= this.totalpage) {
                this.currentpage = this.currentpage + 1;
                this.getXJType(this.currentpage);

            }
        }.bind(this));


        this.domObj.find(".pageturning").off("click").on("click", function () {
            var currpage = parseInt(this.domObj.find(".currpage").val());
            if (currpage <= this.totalpage && currpage >= 1) {
                this.currentpage = parseInt(this.domObj.find(".currpage").val());
                this.getXJType(this.currentpage);

            }
        }.bind(this));


    }

    getXJType(pagenumber) {
        this.currentpage = pagenumber || this.config.pagenumber;
        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getXJTypeList,
            data: {
                // "key": "0017",
                "pageindex": pagenumber || this.config.pagenumber,
                "pagesize": this.config.pagesize,
                "keyword": this.keyword,

                // f: "pjson"
            },
            success: this.getXJTypeListCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    addXJTypeCallback(results) {

        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            console.log(results.message);
            return;
        }
        this.popup.Close();
        that.toast.Show(results.message);
        //重新查询
        this.getXJType(this.config.pagenumber);

        //清空：选中、新增时产生的选中，避免直接点删除
        this.xjtypeid = "";
        this.name = "";
        this.type = "";
        this.category = "";
        this.strhiddendangerlevel = "";


    }

    updateXJTypeCallback(results) {

        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            console.log(results.message);
            return;
        }
        this.popup.Close();
        that.toast.Show(results.message);
        //重新查询
        this.getXJType(this.config.pagenumber);

        //清空修改时产生的选中，避免直接点删除

        this.xjtypeid = "";
        this.name = "";
        this.type = "";
        this.category = "";
        this.strhiddendangerlevel = "";


    }


    deleteXJTypeCallback(results) {

        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            console.log(results.message);
            return;
        }
        this.popup.Close();
        that.toast.Show(results.message);
        //重新查询
        this.getXJType(this.config.pagenumber);

        //清空

        this.xjtypeid = "";
        this.name = "";
        this.type = "";
        this.category = "";
        this.strhiddendangerlevel = "";


    }







    destroy() {

        this.domObj.remove();
        this.afterDestroy();
    }
}