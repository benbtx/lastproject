import BaseWidget = require('core/BaseWidget.class');

import QueryTask = require('esri/tasks/QueryTask');
import Query = require('esri/tasks/query');

export = LogManagement;

class LogManagement extends BaseWidget {
    baseClass = "widget-logmanagement";

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
        this.getLog(this.config.pagenumber);
    }

    configure() {
        this.toast = this.AppX.runtimeConfig.toast;
        this.popup = this.AppX.runtimeConfig.popup;
        this.map = this.AppX.runtimeConfig.map;

    }


    getLogListCallback(results) {
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



            html_trs_data += "<tr class=goto  data-id='" + item.id + "' ><td>" + item.ip + "</td><td>" + item.username + "</td><td>" + item.record_time + "</td></tr>";


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

            this.getLog(this.config.pagenumber);



        }.bind(this));


        this.domObj.find('.search_condition').keydown(function (event) {
            if (event.keyCode == 13) {//enter
                this.keyword = this.domObj.find('.search_condition').val();
                this.getLog(this.config.pagenumber);
            }
        }.bind(this));


        //重置查询
        this.domObj.find('.btn_rsearch').on("click", function () {

            this.keyword = "";
            this.domObj.find('.search_condition').val("");
            this.getLog(this.config.pagenumber);

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



        //动态生成书签及分页控件
        //分页控件fykj 向前、向后事件
        this.domObj.find(".pre").off("click").on("click", function () {
            if (this.currentpage - 1 > 0) {
                this.currentpage = this.currentpage - 1;
                this.getLog(this.currentpage);

            }

        }.bind(this));
        this.domObj.find(".next").off("click").on("click", function () {
            if (this.currentpage + 1 <= this.totalpage) {
                this.currentpage = this.currentpage + 1;
                this.getLog(this.currentpage);

            }
        }.bind(this));


        this.domObj.find(".pageturning").off("click").on("click", function () {
            var currpage = parseInt(this.domObj.find(".currpage").val());
            if (currpage <= this.totalpage && currpage >= 1) {
                this.currentpage = parseInt(this.domObj.find(".currpage").val());
                this.getLog(this.currentpage);

            }
        }.bind(this));


    }

    getLog(pagenumber) {
        this.currentpage = pagenumber || this.config.pagenumber;
        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getLogList,
            data: {
                "pageindex": pagenumber || this.config.pagenumber,
                "pagesize": this.config.pagesize,
                "keyword": this.keyword
                // f: "pjson"
            },
            success: this.getLogListCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }











    destroy() {

        this.domObj.remove();
        this.afterDestroy();
    }
}