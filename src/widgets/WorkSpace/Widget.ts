import BaseWidget = require('core/BaseWidget.class');


import Extent = require('esri/geometry/Extent');
import SpatialReference = require('esri/SpatialReference');
import webMercatorUtils = require('esri/geometry/webMercatorUtils');

export = WorkSpace;

class WorkSpace extends BaseWidget {
    baseClass = "widget-workspace";
    map = null;
    toast = null;
    totalpage = 1;
    currentpage = 1;
    currentpagecount = 1;

    startup() {
        this.setHtml(this.template);
        this.map = this.AppX.runtimeConfig.map;
        this.toast = this.AppX.runtimeConfig.toast;
        this.showbookmark(this.config.pagenumber, this.config.pagesize);
        this.initEvents();
    }

    initEvents() {

        var that = this;
        this.domObj.find(".addbookmark").off("click").on("click", function () {

            if (that.domObj.find(".bookmarkname").val() != "") {
                if (that.domObj.find(".bookmarkname").val().length > that.config.namelength) {
                    that.toast.Show("名称超过" + that.config.namelength + "个字，请重新输入！");
                    return;
                }
                // 利用webMercatorUtils模块转换坐标
                var geo = webMercatorUtils.webMercatorToGeographic(that.map.extent);
                // 执行SOE服务
                $.ajax({
                    headers: {
                        'Authorization-Token': AppX.appConfig.usertoken
                    },
                    type: 'POST',
                    url: AppX.appConfig.apiroot.replace(/\/+$/, "") + that.config.bookmarkadd,
                    data: {
                        markname: that.domObj.find(".bookmarkname").val(),
                        remark: that.domObj.find(".bookmarkname").val(),
                        xmin: that.map.extent.xmin,
                        xmax: that.map.extent.xmax,
                        ymin: that.map.extent.ymin,
                        ymax: that.map.extent.ymax,
                        // creatorid: 4,
                        // f: "pjson"
                    },
                    success: that.addbookmarkCallback.bind(that),
                    dataType: "json"
                });
            } else {
                that.toast.Show("名称不能为空！");
            }
        });

        this.domObj.find(".deletebookmark").off("click").on("click", function () {
            if (that.domObj.find("input:radio:checked").length != 0) {

                // 执行SOE服务
                $.ajax({
                    headers: {
                        'Authorization-Token': AppX.appConfig.usertoken
                    },
                    type: 'POST',
                    url: AppX.appConfig.apiroot.replace(/\/+$/, "") + that.config.bookmarkdelete,
                    data: {
                        id: that.domObj.find("input:radio:checked").attr("data"),
                        // f: "pjson"
                    },
                    success: that.deletebookmarkCallback.bind(that),
                    dataType: "json"
                });


            } else {
                that.toast.Show("请选择一个工作空间！");
            }

        });


    }

    showbookmark(pagenumber, pagesize) {
        // 执行SOE服务
        $.ajax({
            headers: {
                'Authorization-Token': AppX.appConfig.usertoken
            },
            type: 'POST',
            url: AppX.appConfig.apiroot.replace(/\/+$/, "") + this.config.bookmark,
            data: {
                pagenumber: pagenumber,
                pagesize: pagesize,
                // f: "pjson"
            },
            success: this.querybookmarkCallback.bind(this),
            dataType: "json"
        });

    }


    querybookmarkCallback(results) {
        var that = this;
        if (results.code != 10000) {
            that.toast.Show("查询工作空间出错！");
            console.log(results.error);
            that.domObj.find(".fykj").hide();
            return;
        }
        this.totalpage = results.result.totalnumberofpages;
        this.currentpage = results.result.pagenumber;
        this.currentpagecount = results.result.rows.length;
        //动态生成书签及分页控件
        this.domObj.find(".pick-pipe-tbody").empty();
        var name;
        $.each(results.result.rows, function (i, item) {

            if (item.markname.length > 8) {
                name = item.markname.substr(0, 8) + "...";
            } else {
                name = item.markname;
            }
            var extent = item.xmin + "," + item.ymin + "," + item.xmax + "," + item.ymax
            that.domObj.find(".pick-pipe-tbody").append("<tr class=goto ><td width=10%><input type=radio name=bookmark data=" + item.id + " value=" + extent + "  /> </td><td title=" + "双击定位：" + item.markname + ">" + name + "</td><td width=40%>" + item.createdate.split("T")[0] + "</td></tr>");
        });
        if (results.result.rows.length < that.config.pagesize) {
            var num = that.config.pagesize - results.result.rows.length;
            for (var i = 0; i < num; i++) {
                that.domObj.find(".pick-pipe-tbody").append("<tr class=goto height=32><td ></td><td </td><td ></td></tr>");
            }
        }

        //补全，
        //双击定位
        this.domObj.find(".goto").off("dblclick").on("dblclick", function () {
            // this.find("#bookmark");
            if (this.firstChild.firstChild) {
                this.firstChild.firstChild.checked = true;
                var extent = this.firstChild.firstChild.value;
                //tihs.pro
                if (extent.split(',').length != 4) { return; }
                //arcgis 
                var startExtent = new Extent(parseFloat(extent.split(',')[0]), parseFloat(extent.split(',')[1]), parseFloat(extent.split(',')[2]), parseFloat(extent.split(',')[3]),
                    new SpatialReference({ wkid: that.map.spatialReference.wkid }));
                that.map.setExtent(startExtent);
            }
        });

        //radio选择定位
        this.domObj.find("input[name='bookmark']").off("change").on("change", function () {
            // this.find("#bookmark");
            if ($(this).val()) {
                var extent = $(this).val();
                //tihs.pro
                if (extent.split(',').length != 4) { return; }
                //arcgis 
                var startExtent = new Extent(parseFloat(extent.split(',')[0]), parseFloat(extent.split(',')[1]), parseFloat(extent.split(',')[2]), parseFloat(extent.split(',')[3]),
                    new SpatialReference({ wkid: that.map.spatialReference.wkid }));
                that.map.setExtent(startExtent);
             
            }
        });



        //动态生成书签及分页控件
        //分页控件fykj 向前、向后事件


        that.domObj.find(".content").text("第" + (results.result.pagenumber) + "页共" + results.result.totalnumberofpages + "页");

        this.domObj.find(".pre").off("click").on("click", function () {
            if (results.result.pagenumber - 1 > 0) {
                this.currentpage = results.result.pagenumber - 1;
                that.showbookmark(results.result.pagenumber - 1, that.config.pagesize);
                that.domObj.find(".content").text("第" + (results.result.pagenumber - 1) + "页共" + results.result.totalnumberofpages + "页");
            }

        });
        this.domObj.find(".next").off("click").on("click", function () {
            if (results.result.pagenumber + 1 <= results.result.totalnumberofpages) {
                this.currentpage = results.result.pagenumber + 1;
                that.showbookmark(results.result.pagenumber + 1, that.config.pagesize);
                that.domObj.find(".content").text("第" + (results.result.pagenumber + 1) + "页共" + results.result.totalnumberofpages + "页");
            }
        });


        this.domObj.find(".pageturning").off("click").on("click", function () {
            var currpage = parseInt(that.domObj.find(".currpage").val());
            if (currpage <= results.result.totalnumberofpages && currpage >= 1) {
                this.currentpage = parseInt(that.domObj.find(".currpage").val());
                that.showbookmark(currpage, that.config.pagesize);
                that.domObj.find(".content").text("第" + currpage + "页共" + results.result.totalnumberofpages + "页");
            }
        });

    }

    addbookmarkCallback(results) {
        //重新查询，构建分页
        this.showbookmark(1, this.config.pagesize);
        if (results.code != 10000) {
            this.toast.Show("添加工作空间出错！");
            console.log(results.error);
            return;
        }
        //清理历史输入
        this.domObj.find(".bookmarkname").val('');
    }

    deletebookmarkCallback(results) {
        //重新查询，构建分页
        if (results.code != 10000) {
            this.toast.Show("删除工作空间出错！");
            console.log(results.error);
            return;
        }
        if (this.currentpage == this.totalpage && this.currentpagecount == 1) {
            this.showbookmark(this.currentpage - 1, this.config.pagesize);
            //   this.showbookmark(1, this.config.pagesize);
        } else {
            this.showbookmark(this.currentpage, this.config.pagesize);
        }
    }


    destroy() {
        this.domObj.remove();

        this.afterDestroy();
    }
}