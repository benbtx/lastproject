import BaseWidget = require('core/BaseWidget.class');
import Functions = require('core/Functions.module');
import Extent = require('esri/geometry/Extent');
import SpatialReference = require('esri/SpatialReference');
import Point = require("esri/geometry/Point");

import GraphicsLayer = require("esri/layers/GraphicsLayer");
import Graphic = require("esri/graphic");
import PictureMarkerSymbol = require("esri/symbols/PictureMarkerSymbol");
import TextSymbol = require("esri/symbols/TextSymbol");
import Font = require("esri/symbols/Font");
import ScreenPoint = require('esri/geometry/ScreenPoint');
import Draw = require('esri/toolbars/draw');

import SimpleMarkerSymbol = require('esri/symbols/SimpleMarkerSymbol');
import Color = require("esri/Color");
import Polygon = require('esri/geometry/Polygon');
import SimpleLineSymbol = require('esri/symbols/SimpleLineSymbol');
import SimpleFillSymbol = require('esri/symbols/SimpleFillSymbol');



export = PlansManagement;

class PlansManagement extends BaseWidget {
    baseClass = "widget-plansmanagement";
    map = null;
    toast = null;
    totalpage = 1;
    currentpage = 1;
    currentpagesieze = 1;
    currentpagecount = 0;
    curentplansmanagementtypeid = "";
    plansmanagementInfoGraphicLayer: GraphicsLayer;
    templansmanagement: GraphicsLayer;
    jsongeometry = "";
    editgeometry: Point;
    editid = "";
    polygonid = "";



    startup() {
        this.configure();
        this.initHtml();



    }
    initHtml() {


        var html = _.template(this.template)();
        this.setHtml(html);
        this.initEvent();
        this.ready();

        //查询巡检片区
        this.getAllPlanRegion();

        //查询用户

        this.getUser();


        //查询周期

        this.getPeriod();


        //查询计划列表
        this.getPlansManagement(this.config.pagenumber, this.config.pagesize);



    }

    configure() {
        this.toast = this.AppX.runtimeConfig.toast;
        this.map = this.AppX.runtimeConfig.map;
        if (this.map.getLayer("plansmanagement")) {
            return;
        } else {
            var graphicLayer = new GraphicsLayer();
            graphicLayer.id = "plansmanagement";
            this.plansmanagementInfoGraphicLayer = graphicLayer;
            this.map.addLayer(graphicLayer);
        }
        if (this.map.getLayer("templansmanagement")) {
            return;
        } else {
            var templansmanagement = new GraphicsLayer();
            templansmanagement.id = "templansmanagement";
            this.templansmanagement = templansmanagement;
            this.map.addLayer(templansmanagement);
        }
        //获取隐患类型信息
    }



    initEvent() {
        var that = this;
        this.domObj.find('.btn_addplans').on("click", function () {
            var region_id = this.domObj.find(".region_name");
            var user_id = this.domObj.find(".users");
            var period_id = this.domObj.find(".period");
            var description = this.domObj.find(".description");
            var plan_begindate = this.domObj.find(".plan_begindate");
            var plan_enddate = this.domObj.find(".plan_enddate");

            if (region_id.val() == "") {
                region_id.addClass('has-error');
                region_id.attr("placeholder", "不能为空！");
                this.toast.Show("请选择某个片区！");
                return;
            }
            if (user_id.val() == "") {
                user_id.addClass('has-error');
                user_id.attr("placeholder", "不能为空！");
                this.toast.Show("请选择用户！");
                return;

            }
            if (period_id.val() == "") {
                period_id.addClass('has-error');
                period_id.attr("placeholder", "不能为空！");
                this.toast.Show("请输入周期！");
                return;

            }
            if (description.val() == "") {
                description.addClass('has-error');
                description.attr("placeholder", "不能为空！");
                this.toast.Show("请输入描述信息！");
                return;

            }
            if (plan_begindate.val() == "") {
                plan_begindate.addClass('has-error');
                plan_begindate.attr("placeholder", "不能为空！");
                this.toast.Show("请选择计划开始时间！");
                return;

            }
            if (plan_enddate.val() == "") {
                plan_enddate.addClass('has-error');
                plan_enddate.attr("placeholder", "不能为空！");
                this.toast.Show("请选择计划结束时间！");
                return;

            }

            // //查找该点对应的巡检片区
            // this.getAllPlanRegion();





            //添加计划
            $.ajax({
                headers: {
                    'Token': AppX.appConfig.xjxj,
                    'departmentid': AppX.appConfig.departmentid,
                },
                type: "POST",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.addPlansManagementInfo,
                data: {
                    "region_id": region_id.val(),
                    "user_id": user_id.val(),
                    "period_id": period_id.val(),
                    "description": description.val(),
                    "plan_begindate": plan_begindate.val(),
                    "plan_enddate": plan_enddate.val(),

                },
                success: this.addPlansManagementInfoCallback.bind(this),
                error: function (data) {
                    this.toast.Show("服务端ajax出错，获取数据失败!");
                }.bind(this),
                dataType: "json",
            });



            this.getPlansManagement(this.config.pagenumber);
            // this.domObj.find(".content").text("第" + (this.currentpage) + "页共" + this.totalpage + "页");


        }.bind(this));



        this.domObj.find('.btn_editplans').on("click", function () {
            var updateModel = this.domObj.find('#PlansManagementsManagement_UpdateModal');
            var id = this.domObj.find('input:radio:checked').data('region_id');
            var name = updateModel.find(".name");
            var notes = updateModel.find('.notes');
            var category = updateModel.find('.category');

            if (name.val() == '') {
                name.addClass('has-error');
                name.attr("placeholder", "不能为空！");
                this.toast.Show("隐患类型名称不能为空！");
                return;
            }
            if (category.val() == '') {
                category.addClass('has-error');
                category.attr("placeholder", "不能为空！");
                this.toast.Show("隐患类型登录账号不能为空！");
                return;
            }

            $.ajax({
                headers: {
                    'Token': AppX.appConfig.xjxj,
                    'departmentid': AppX.appConfig.departmentid,
                },
                type: "POST",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.updatePlansManagement,
                data: {
                    "id": id,
                    "name": name.val(),
                    "notes": notes.val(),
                    "category": category.val(),
                },
                success: this.updatePlansManagementInfoCallback.bind(this),
                error: function (data) {
                    this.toast.Show("服务端ajax出错，获取数据失败!");
                }.bind(this),
                dataType: "json",
            });
        }.bind(this));

        this.domObj.find('.btn_deleteplans').on("click", function () {
            var id = this.domObj.find('input:radio:checked').data('plan_id');
            if (id != undefined) {
                $.ajax({
                    headers: {
                        // 'Authorization-Token': AppX.appConfig.xjxj
                        'Token': AppX.appConfig.xjxj,
                        'departmentid': AppX.appConfig.departmentid,
                    },
                    type: "POST",
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.deletePlansManagement + id,
                    // data: {
                    //     // "id": id,
                    //     // f: "pjson"
                    // },
                    success: this.deletePlansManagementCallback.bind(this),
                    error: function (data) {
                        this.toast.Show("服务端ajax出错，获取数据失败!");
                    }.bind(this),
                    dataType: "json",
                });
            } else {
                this.toast.Show("请选择要删除的隐患类型！");

            }

        }.bind(this));

        //动态生成书签及分页控件
        //分页控件fykj 向前、向后事件

        this.domObj.find(".pre").off("click").on("click", function () {
            if (this.currentpage - 1 > 0) {
                this.currentpage = this.currentpage - 1;


                // this.domObj.remove();
                // this.getPlansManagement(this.currentpage);
                this.getPlansManagement(this.currentpage, this.trouble_typeid, this.equid, this.handle_userid);
                this.domObj.find(".content").text("第" + (this.currentpage) + "页共" + this.totalpage + "页");
            }

        }.bind(this));
        this.domObj.find(".next").off("click").on("click", function () {
            if (this.currentpage + 1 <= this.totalpage) {
                this.currentpage = this.currentpage + 1;

                // this.domObj.remove();
                // this.getPlansManagement(this.currentpage);
                this.getPlansManagement(this.currentpage, this.trouble_typeid, this.equid, this.handle_userid);
                this.domObj.find(".content").text("第" + (this.currentpage) + "页共" + this.totalpage + "页");
            }
        }.bind(this));

        this.domObj.find(".pageturning").off("click").on("click", function () {
            var currpage = parseInt(this.domObj.find(".currpage").val());
            if (currpage <= this.totalpage && currpage >= 1) {
                this.currentpage = parseInt(this.domObj.find(".currpage").val());

                // this.domObj.remove();
                // this.getPlansManagement(this.currentpage);
                this.getPlansManagement(this.currentpage, this.trouble_typeid, this.equid, this.handle_userid);
                this.domObj.find(".content").text("第" + (this.currentpage) + "页共" + this.totalpage + "页");
            }
        }.bind(this));

        //定位
        //radio选择定位
        this.domObj.find("input[name='plansmanagement']").off("change").on("change", function () {
            // this.find("#bookmark");
            // if ($(this).data("id") != "") {

            //     var point = new Point($(this).data("lng"), $(this).data("lat"), that.map.spatialReference);
            //     that.map.centerAt(point);
            // }
            //point_id;
            if ($(this).data("regionid") != "") {
                var point = new Point($(this).data("geometry"));
                that.editgeometry = point;
                that.editid = $(this).data("regionid");
                that.map.centerAt(point);

                that.domObj.find(".point_name").val($(this).data("point_name"));
                that.domObj.find(".address").val($(this).data("address"));
                that.domObj.find(".notes").val($(this).data("notes"));

            }

        });

        //初始化绘制范围事件

        this.domObj.find(".count_range").on("click", function () {
            this.templansmanagement.clear();
            this.map.addLayer(this.templansmanagement);
            //that.AppX.runtimeConfig.map.graphics.clear();
            var drawToolbar = new Draw(this.AppX.runtimeConfig.map);
            drawToolbar.activate(Draw.POINT);
            drawToolbar.on("draw-end", function (evt) {

                var currentPoint = new SimpleMarkerSymbol(
                    {
                        color: new Color("#FF0000"),
                        size: 5,
                        // style: "STYLE_CROSS",       //点样式cross|square|diamond|circle|x
                        yoffset: -8,

                        outline: {
                            color: new Color([255, 0, 0, 0.7]),
                            width: 2
                        }
                    }

                );
                var graphic = new Graphic(evt.geometry, currentPoint);
                this.jsongeometry = JSON.stringify(evt.geometry.toJson());
                this.templansmanagement.add(graphic);
                drawToolbar.deactivate();
            }.bind(this));

        }.bind(this));


        //清空绘制范围count_clearRange
        this.domObj.find(".count_clearRange").on("click", function () {
            that.templansmanagement.clear();
            // that.templansmanagement = null;
        });

        //查询条件改变事件
        //清空文本则对应全局变量也清空

        // this.domObj.find(".trouble_typeid").change(function () {
        //     that.trouble_typeid = $(this).text();
        // });
        // this.domObj.find(".equid").change(function () {
        //     that.equid = $(this).text();
        // });
        // this.domObj.find(".handle_userid").change(function () {
        //     that.handle_userid = $(this).text();
        // });
    }

    getPlansManagement(pagenumber, pagesize) {
        this.currentpage = pagenumber || this.config.pagenumber;
        this.currentpagesieze = pagesize || this.config.pagesize;
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getPlansManagementList,
            data: {
                "pageindex": pagenumber || this.config.pagenumber,
                "pagesize": pagesize || this.config.pagesize,
                // "trouble_typeid": trouble_typeid,
                // "equid": equid,
                // "handle_userid": handle_userid,
                // "handle_state": 0,
                // f: "pjson"
            },
            success: this.getPlansManagementListCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    getPlansManagementListCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("查询巡检计划信息出错！");
            console.log(results.message);
            return;
        }
        //添加终端用户图层
        if (results.result.total % that.currentpagesieze == 0) {
            this.totalpage = Math.floor(parseInt(results.result.total) / that.currentpagesieze);

        } else {
            this.totalpage = Math.floor(parseInt(results.result.total) / that.currentpagesieze) + 1;

        }
        if (results.result.rows.length != 0) {
            this.currentpagecount = results.result.rows.length;
            // this.map.infoWindow.resize(400, 260);
            // this.addClusters(results.result.rows);
        } else {
            that.toast.Show("无巡检计划！");
            return;
        }


        //为查询控件赋值
        // var users = this.domObj.find(".users").empty();
        // var strusers = "<option></option>";
        // $.each(results.result.rows, function (index, item) {
        //     strusers += "<option value=" + item.user_id + " > " + item.user_name + " </option>";

        // }.bind(this));
        // users.append(strusers);

        // this.domObj.find(".users").val(this.userid);


        //为分页控件添加信息

        this.domObj.find(".pagecontrol").text("总共" + results.result.total + "条记录，每页默认显示" + that.currentpagesieze + "条记录");
        this.domObj.find(".content").val("第" + that.currentpage + "页共" + that.totalpage + "页");

        //生成table ,并给分页控件赋值事件




        // this.currentpage = results.result.pageindex;
        //动态生成书签及分页控件
        var domtb = this.domObj.find(".planslist")
        domtb.empty();
        var address;
        var html_trs_data = "";
        $.each(results.result.rows, function (i, item) {

            html_trs_data += "<tr class=goto ><td><input type='radio' name='user' data-plan_id='" + item.plan_id + "'/></td><td>" + item.region_name + "</td><td>" + item.user_name + "</td><td>" + item.period_name + "</td><td>" + item.description + "</td><td>" + item.plan_begindate + "</td><td>" + item.plan_enddate + "</td></tr>";
            //刷新infowindow
            // this.setContent(item);
        }.bind(this));
        domtb.append(html_trs_data);


        var html_trs_blank = "";
        if (results.result.rows.length < that.config.pagesize) {
            var num = that.config.pagesize - results.result.rows.length;
            for (var i = 0; i < num; i++) {
                html_trs_blank += "<tr class=goto><td><input type='radio' name='user'/></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>";
            }
            domtb.append(html_trs_blank);
        }
        //用户详情的单击事件
        var curuser = $(".goto a");
        curuser.off("click").on("click", function (e) {

            var point = $(e.target).attr("value");
            var address = $(e.target).attr("address");
            if (point.split(',').length != 2) { return; }
            //arcgis 
            var mapPoint = new Point(parseFloat(point.split(',')[0]), parseFloat(point.split(',')[1]), new SpatialReference({ wkid: that.map.spatialReference.wkid }));
            //定位到那
            this.map.centerAndZoom(mapPoint, 17);


        }.bind(this));




        //radio选择定位
        var that = this;
        this.domObj.find("input[name='gpsinfo']").off("change").on("change", function () {
            if ($(this).val()) {
                // that.currentselectuser = this.parentNode.parentNode.childNodes[1].innerText;
                var point = $(this).val();
                //tihs.pro
                if (point.split(',').length != 2) { return; }
                //arcgis 
                var mapPoint = new Point(parseFloat(point.split(',')[0]), parseFloat(point.split(',')[1]), new SpatialReference({ wkid: that.map.spatialReference.wkid }));
                that.map.centerAndZoom(mapPoint, 15);
            }
        });




        //动态生成书签及分页控件
        //分页控件fykj 向前、向后事件


        that.domObj.find(".content").text("第" + (that.currentpage) + "页共" + that.totalpage + "页");

        this.domObj.find(".pre").off("click").on("click", function () {
            if (that.currentpage - 1 > 0) {
                that.currentpage = that.currentpage - 1;
                that.getPlansManagement(that.currentpage, that.config.pagesize);
                that.domObj.find(".content").text("第" + that.currentpage + "页共" + that.totalpage + "页");
            }

        });
        this.domObj.find(".next").off("click").on("click", function () {
            if (that.currentpage + 1 <= that.totalpage) {
                that.currentpage = that.currentpage + 1;
                that.getPlansManagement(that.currentpage, that.config.pagesize);
                that.domObj.find(".content").text("第" + that.currentpage + "页共" + that.totalpage + "页");

            }
        });


        this.domObj.find(".pageturning").off("click").on("click", function () {

            if (parseInt(that.domObj.find(".currpage").val()) <= that.totalpage && that.currentpage >= 1) {
                that.currentpage = parseInt(that.domObj.find(".currpage").val());
                that.getPlansManagement(that.currentpage, that.config.pagesize);
                that.domObj.find(".content").text("第" + that.currentpage + "页共" + that.totalpage + "页");
                //清除infowindow
            } else {
                that.domObj.find(".currpage").val("");
            }
        }.bind(this));

    }

    getAllPlansManagement() {
        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getPlansManagementList,
            data: {
                "pageindex": this.config.pagenumber,
                "pagesize": 1000 || this.config.pagesize,
                // "trouble_typeid": trouble_typeid,
                // "equid": equid,
                // "handle_userid": handle_userid,
                // "handle_state": 0,
                // f: "pjson"
            },
            success: this.getAllPlansManagementListCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    getAllPlansManagementListCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("查询巡检计划信息出错！");
            console.log(results.message);
            return;
        }
        //添加工单气泡
        // this.addPointGraphic(results);

    }



    addPolygonGraphic(queryResult) {
        //清除图层
        this.plansmanagementInfoGraphicLayer.clear();
        // this.map.infoWindow.hide();

        //添加当前页工单气泡
        for (var i = 0, length = queryResult.result.rows.length; i < length; i++) {
            var row = queryResult.result.rows[i];

            if (row.geometry == undefined) { return; }
            // var Polygon = new Polygon(JSON.parse(row.geometry));
            var polygon = new Polygon(JSON.parse(row.geometry));
            var graphic = new Graphic(polygon, this.setSymbol(row.regionname)[2], "");


            graphic.attr("id", "graphic" + i);
            this.plansmanagementInfoGraphicLayer.add(graphic);
            //this.map.centerAt(point);

            //添加背景
            var point = polygon.getExtent().getCenter();
            var graphictextbg = new Graphic(point, this.setSymbol(row.regionname)[1].setOffset(0, -20), "");
            this.plansmanagementInfoGraphicLayer.add(graphictextbg);
            //添加文字
            var peopleTextSymbol = new TextSymbol(row.regionname);
            peopleTextSymbol.setOffset(0, -25);
            var font = new Font();
            font.setSize("10pt");
            font.setWeight(Font.WEIGHT_BOLD);
            peopleTextSymbol.setFont(font);
            var graphicText = new Graphic(point, peopleTextSymbol, "");
            this.plansmanagementInfoGraphicLayer.add(graphicText);

        }

    }


    getFilesCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("查询隐患类型信息出错！");
            console.log(results.message);
            return;
        }


        // var title = "";
        // var content = "";
        var titdom = this.domObj.find(".carousel-indicators");
        var condom = this.domObj.find(".carousel-inner");
        titdom.empty();
        condom.empty();
        $.each(results.result.rows, function (i, value) {

            if (i == 0) {
                titdom.append("<li data-target='#myCarousel' data-slide-to='0' class='active'></li>");
                condom.append("<div class='item active'> <img src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + value.filename + "' alt='" + i + "slide'></div>");
            }
            else {
                titdom.append("<li data-target='#myCarousel' data-slide-to='" + i + "'></li>");
                condom.append("<div class='item'> <img src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + value.filename + "' alt='" + i + "slide'></div>");
            }
        });

    }

    handlePlansManagementCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("处理隐患出错！");
            console.log(results.message);
            return;
        } else {
            that.toast.Show("处理隐患成功！");
            //重新查询

            this.getPlansManagement(this.config.pagenumber, this.config.pagesize);
            this.domObj.find(".content").text("第" + (this.config.pagenumber) + "页共" + this.totalpage + "页");

        }





    }

    addPlansManagementInfoCallback(results) {

        var that = this;
        if (results.code != 1) {
            that.toast.Show("绘制巡检计划出错！");
            console.log(results.message);
            return;
        } else {
            that.toast.Show("绘制巡检计划成功！");
            //重新查询


            this.getPlansManagement(this.config.pagenumber, this.config.pagesize);

        }
        if (this.templansmanagement) {
            this.templansmanagement.clear();
        }


    }
    deletePlansManagementCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("删除巡检计划出错！");
            console.log(results.message);
            return;
        } else {
            that.toast.Show("删除巡检计划成功！");
            this.getPlansManagement(this.config.pagenumber, this.config.pagesize);


        }


    }

    updatePlansManagementInfoCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("修改巡检计划出错！");
            console.log(results.message);
            return;
        } else {
            that.toast.Show("修改巡检计划成功！");
            //重新查询
            this.getPlansManagement(this.config.pagenumber, this.config.pagesize);
        }





    }

    getAllPlanRegion() {
        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getPlanRegionList,
            data: {
                "pageindex": this.config.pagenumber,
                "pagesize": 1000 || this.config.pagesize,
                // "trouble_typeid": trouble_typeid,
                // "equid": equid,
                // "handle_userid": handle_userid,
                // "handle_state": 0,
                // f: "pjson"
            },
            success: this.getAllPlanRegionListCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    getAllPlanRegionListCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("查询巡检片区信息出错！");
            console.log(results.message);
            return;
        }

        var region_names = this.domObj.find(".region_name").empty();
        var strregion_names = "";
        $.each(results.result.rows, function (index, item) {
            strregion_names += "<option value=" + item.regionid + " > " + item.regionname + " </option>";

        }.bind(this));
        region_names.append(strregion_names);

        this.addPolygonGraphic(results);



    }

    getUser() {
        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getUserList,
            data: {
                "pageindex": this.config.pagenumber,
                "pagesize": 1000 || this.config.pagesize,
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



        var users = this.domObj.find(".users").empty();
        var strusers = "";
        $.each(results.result.rows, function (index, item) {
            strusers += "<option value=" + item.userid + " > " + item.username + " </option>";

        }.bind(this));
        users.append(strusers);


    }


    getPeriod() {
        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getPeriod,
            data: {
                "pageindex": this.config.pagenumber,
                "pagesize": 1000 || this.config.pagesize,
                // f: "pjson"
            },
            success: this.getPeriodListCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    getPeriodListCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("查询周期信息出错！");
            console.log(results.message);
            return;
        }



        var period = this.domObj.find(".period").empty();
        var strperiod = "";
        $.each(results.result, function (index, item) {
            strperiod += "<option value=" + item.period_id + " > " + item.period_name + " </option>";

        }.bind(this));
        period.append(strperiod);


    }





    //设置点的样式
    setSymbol(txt?) {
        var symbol = [];
        var fillSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASHDOT, new Color([255, 0, 0]), 2), new Color([0, 0, 0, 0.3]));

        var peopleSymbol = new PictureMarkerSymbol(this.config.MarkPictureSymbol, 24, 24);
        //根据字长度设置背景图片宽度
        var peopletextSymbol = new PictureMarkerSymbol(this.config.TextbgSymbol, txt == null ? 0 : txt.length * 90 / 6, 18);
        symbol.push(peopleSymbol);
        symbol.push(peopletextSymbol);
        symbol.push(fillSymbol);
        return symbol;
    }


    destroy() {
        if (this.plansmanagementInfoGraphicLayer) {
            this.map.removeLayer(this.plansmanagementInfoGraphicLayer);
            this.plansmanagementInfoGraphicLayer.clear();
        }
        if (this.templansmanagement) {
            this.map.removeLayer(this.templansmanagement);
            this.templansmanagement.clear();
        }
        this.domObj.remove();
        this.afterDestroy();
    }

}