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

import ClusterLayer = require('extras/ClusterLayer');
import arrayUtils = require('dojo/_base/array');
import ClassBreaksRenderer = require('esri/renderers/ClassBreaksRenderer');
import PopupTemplate = require('esri/dijit/PopupTemplate');

import Query = require('esri/tasks/query');
import QueryTask = require('esri/tasks/QueryTask');
import FeatureLayer = require('esri/layers/FeatureLayer');
import InfoTemplate = require('esri/InfoTemplate');
import SimpleRenderer = require('esri/renderers/SimpleRenderer');
import Polyline = require('esri/geometry/Polyline');


export = MissionAudit;

class MissionAudit extends BaseWidget {
    baseClass = "widget-missionaudit";
    map = null;
    toast = null;
    popup = null;
    totalpage = 1;
    currentpage = 1;


    Plan_list_currentpage = 1;

    // currentpagesieze = 1;
    // currentpagecount = 0;
    curentmissionaudittypeid = "";
    missionauditInfoGraphicLayer: GraphicsLayer;
    jsongeometry = "";
    editgeometry: Point;
    editid = "";
    polygonid = "";
    planmode = 0;


    depname = "";
    step1_start = "";
    step1_end = "";

    plan_type_id = 0;



    plan_type = "";//巡检点类型决定是否查询图层和查询哪个图层
    periodid = "";
    zq = 0;//自定义天数   "custom_days": this.zq,//为0时，非自定义周期；为其他则为自定义周期
    // plan_begindate = "";
    // plan_enddate = "";
    missionaudit_planpoint_clusterLayer = null;//巡检点
    missionaudit_devicepoint_clusterLayer = null;//设备点
    regionid = "";

    planid = "";
    child_plan_id = "";

    devices = null;//各个片区内的设备点


    regionname = "";
    regionaddress = "";
    regionnotes = "";
    regionjsongeometry = "";
    templanregion: GraphicsLayer;

    pointname = "";
    pointaddress = "";
    pointnotes = "";
    pointjsongeometry = "";
    templanpoint: GraphicsLayer;
    planpoint: GraphicsLayer;

    step3_plan_begindate = "";

    planstate = "";
    checkstate = "";
    isvalid = "";

    plan_state = "";

    //修改计划参数
    updateplan_state = 0;//0，默认为添加计划；1，为修改计划
    updateplan_id = "";
    updateplan_periodtype = "";
    updateplan_begin = "";
    updateplan_end = "";
    updateplan_regionname = "";
    updateplan_regionid = "";
    updateplan_periodid = "";



    startime_my97 = "";
    startime_type = 0;



    missionaudit_plandetail_polylinelayer: GraphicsLayer;
    missionaudit_plandetail_pointlayer: GraphicsLayer;

    missionaudit_plandetail_polylinelayer_gl: GraphicsLayer;
    missionaudit_plandetail_pointlayer_gl: GraphicsLayer;


    missionaudit_planregionInfoGraphicLayer: GraphicsLayer;


    currentpagesieze = 1;
    currentpagenumber = 0;



    depid = "";
    // user_id = "";

    region_id = "";
    user_id = "";
    plan_begindate = "";
    plan_enddate = "";




    //当前halfpaneltable的高度；
    halfpaneltable_height = 0;






    startup() {
        this.configure();
        this.initHtml();



    }
    initHtml() {
        var html = _.template(this.template.split('$$')[0] + "</div>")({ depid: AppX.appConfig.groupid });
        this.setHtml(html);
        this.initEvent();
        this.ready();




        //查询计划列表
        this.showLoading();
        // this.getAllpersonMissionAudit(this.config.pagenumber, this.config.pagesize, "", "", "");
        this.getMissionAudit(this.config.pagenumber, this.config.pagesize, this.region_id, this.depid, this.user_id, this.plan_begindate, this.plan_enddate);


    }

    configure() {
        this.toast = this.AppX.runtimeConfig.toast;
        this.popup = this.AppX.runtimeConfig.popup;
        this.map = this.AppX.runtimeConfig.map;
        this.depid = AppX.appConfig.groupid;
        // this.company = AppX.appConfig.departmentid;
        if (this.map.getLayer("missionaudit")) {
            return;
        } else {
            var graphicLayer = new GraphicsLayer();
            graphicLayer.id = "missionaudit";
            this.missionauditInfoGraphicLayer = graphicLayer;
            this.map.addLayer(graphicLayer);
        }

        //巡检线类型
        if (this.map.getLayer("missionaudit_plandetail_polylinelayer")) {
            return;
        } else {
            var missionaudit_plandetail_polylinelayer = new GraphicsLayer();
            missionaudit_plandetail_polylinelayer.id = "missionaudit_plandetail_polylinelayer";
            this.missionaudit_plandetail_polylinelayer = missionaudit_plandetail_polylinelayer;
            this.map.addLayer(missionaudit_plandetail_polylinelayer);
        }

        //巡检点类型
        if (this.map.getLayer("missionaudit_plandetail_pointlayer")) {
            return;
        } else {
            var missionaudit_plandetail_pointlayer = new GraphicsLayer();
            missionaudit_plandetail_pointlayer.id = "missionaudit_plandetail_pointlayer";
            this.missionaudit_plandetail_pointlayer = missionaudit_plandetail_pointlayer;
            this.map.addLayer(missionaudit_plandetail_pointlayer);
        }

        //巡检线——高亮类型
        if (this.map.getLayer("missionaudit_plandetail_polylinelayer_gl")) {
            return;
        } else {
            var missionaudit_plandetail_polylinelayer_gl = new GraphicsLayer();
            missionaudit_plandetail_polylinelayer_gl.id = "missionaudit_plandetail_polylinelayer_gl";
            this.missionaudit_plandetail_polylinelayer_gl = missionaudit_plandetail_polylinelayer_gl;
            this.map.addLayer(missionaudit_plandetail_polylinelayer_gl);
        }

        //巡检点——高亮类型
        if (this.map.getLayer("missionaudit_plandetail_pointlayer_gl")) {
            return;
        } else {
            var missionaudit_plandetail_pointlayer_gl = new GraphicsLayer();
            missionaudit_plandetail_pointlayer_gl.id = "missionaudit_plandetail_pointlayer_gl";
            this.missionaudit_plandetail_pointlayer_gl = missionaudit_plandetail_pointlayer_gl;
            this.map.addLayer(missionaudit_plandetail_pointlayer_gl);
        }





        if (this.map.getLayer("missionaudit_planregionInfoGraphicLayer")) {
            return;
        } else {
            var missionaudit_planregionInfoGraphicLayer = new GraphicsLayer();
            missionaudit_planregionInfoGraphicLayer.id = "missionaudit_planregionInfoGraphicLayer";
            this.missionaudit_planregionInfoGraphicLayer = missionaudit_planregionInfoGraphicLayer;
            this.map.addLayer(missionaudit_planregionInfoGraphicLayer);
        }




        //获取隐患类型信息
    }


    //步骤一事件  查询所有人
    initEvent() {
        var that = this;
        //动态生成书签及分页控件
        //分页控件fykj 向前、向后事件

        this.domObj.find(".pre").off("click").on("click", function () {
            if (that.currentpage - 1 > 0) {
                that.currentpage = that.currentpage - 1;
                // that.getMissionAudit(that.currentpage, that.config.pagesize, "");
                that.showLoading();
                // that.getAllpersonMissionAudit(that.currentpage, this.currentpagesize, that.depid, that.step1_start, that.step1_end);
                // that.getMissionAudit(that.currentpage, this.currentpagesize, this.user_id);
                that.getMissionAudit(that.currentpage, this.currentpagesize, this.region_id, this.depid, this.user_id, this.plan_begindate, this.plan_enddate);
                that.domObj.find(".content").text("第" + that.currentpage + "页共" + that.totalpage + "页");
            }

        }.bind(this));
        this.domObj.find(".next").off("click").on("click", function () {
            if (that.currentpage + 1 <= that.totalpage) {
                that.currentpage = that.currentpage + 1;
                that.showLoading();
                // that.getAllpersonMissionAudit(that.currentpage, this.currentpagesize, that.depid, that.step1_start, that.step1_end);

                that.getMissionAudit(that.currentpage, this.currentpagesize, this.region_id, this.depid, this.user_id, this.plan_begindate, this.plan_enddate);

                that.domObj.find(".content").text("第" + that.currentpage + "页共" + that.totalpage + "页");

            }
        }.bind(this));


        this.domObj.find(".pageturning").off("click").on("click", function () {

            if (parseInt(that.domObj.find(".currpage").val()) <= that.totalpage && that.currentpage >= 1) {
                that.currentpage = parseInt(that.domObj.find(".currpage").val());
                that.showLoading();
                // that.getAllpersonMissionAudit(that.currentpage, this.currentpagesize, that.depid, that.step1_start, that.step1_end);

                that.getMissionAudit(that.currentpage, this.currentpagesize, this.region_id, this.depid, this.user_id, this.plan_begindate, this.plan_enddate);


                that.domObj.find(".content").text("第" + that.currentpage + "页共" + that.totalpage + "页");
                //清除infowindow
            } else {
                that.domObj.find(".currpage").val("");
            }
        }.bind(this));


        this.domObj.find(".dynamic_pagesize").off("change").on("change", function () {

            //重新查询
            this.currentpagesize = parseInt(this.domObj.find(".dynamic_pagesize").val());
            that.showLoading();
            //that.currentpage
            // that.getAllpersonMissionAudit(that.currentpage, this.currentpagesize, that.depid, that.step1_start, that.step1_end);
            that.getMissionAudit(1, this.currentpagesize, this.region_id, this.depid, this.user_id, this.plan_begindate, this.plan_enddate);

            this.domObj.find(".halfpaneltable").height(this.domObj.find(".halfpaneltable").height());
        }.bind(this));


        // // 选中行高亮
        // this.domObj.off("click").on('click', 'tbody tr', (e) => {
        //     if ($(e.currentTarget).data("user_id") == null) { return; } else { this.user_id = $(e.currentTarget).data("user_id"); }
        //     this.domObj.find('tr.active').removeClass('active');
        //     $(e.currentTarget).addClass('active');

        //     this.halfpaneltable_height = this.domObj.find(".halfpaneltable").height();
        //     //进入步骤二
        //     //查询当前用户具体的任务安排
        //     this.domObj.empty();
        //     this.domObj.append(this.template.split('$$')[1]);
        //     this.initEvent2();
        //     //查询某个人计划列表
        //     this.getMissionAudit(this.config.pagenumber, this.config.pagesize, this.user_id);

        //     this.domObj.find(".halfpaneltable").height(this.halfpaneltable_height);

        // });

        // 选中行高亮
        //  this.domObj.off("click").on('click', 'tbody tr', (e) => {
        this.domObj.off("click").on('click', 'tbody tr', (e) => {
            if ($(e.currentTarget).data("user_id") == null) {
                return;
            } else {
                this.planid = $(e.currentTarget).data("plan_id");
                this.child_plan_id = $(e.currentTarget).data("child_plan_id");
                this.step3_plan_begindate = $(e.currentTarget).data("plan_begindate");
                this.planstate = $(e.currentTarget).data("plan_state");
                this.checkstate = $(e.currentTarget).data("check_state");
                this.planmode = $(e.currentTarget).data("plan_mode");
                this.isvalid = $(e.currentTarget).data("isvalid");


                // this.updateplan_state = 1;

                this.updateplan_id = $(e.currentTarget).data("plan_id");
                this.updateplan_periodtype = $(e.currentTarget).data("period_name");
                this.updateplan_begin = $(e.currentTarget).data("plan_begindate");
                this.updateplan_end = $(e.currentTarget).data("plan_enddate");
                this.updateplan_regionname = $(e.currentTarget).data("region_name");
                this.updateplan_regionid = $(e.currentTarget).data("region_id");


                this.updateplan_periodid = $(e.currentTarget).data("period_id");









            }
            this.domObj.find('tr.active').removeClass('active');
            $(e.currentTarget).addClass('active');


            //定位
            if ($(e.currentTarget).data("geometry") == undefined) { return; }
            var polygon = new Polygon($(e.currentTarget).data("geometry"));

            this.map.centerAndZoom(polygon.getExtent().getCenter(), 10);

            //显示该区域
            var rows = [];
            rows[0] = { "regionid": $(e.currentTarget).data("regionid"), "regionname": $(e.currentTarget).data("region_name").toString(), "geometry": JSON.stringify($(e.currentTarget).data("geometry")) };
            var result = { "rows": rows };
            var results = { "result": result }
            that.addPolygonGraphic(results);



            //定义选择事件



            //进入步骤三
            //查询当前用户具体的任务安排
            // this.domObj.remove();
            // var html = _.template(this.template.split('$$')[1])();
            // this.setHtml(html);
            // this.initEvent();
            // this.ready();






        });


        //查询事件

        this.domObj.find(".btn-search").off("click").on("click", function () {


            if (AppX.appConfig.groupid == "") {
                this.depid = this.domObj.find(".department").val();
                this.depname = this.domObj.find(".department").text();
            }


            this.region_id = this.domObj.find(".region_name").val();
            this.user_id = this.domObj.find(".users").val();

            this.plan_begindate = this.domObj.find(".plan_begindate").val();
            this.plan_enddate = this.domObj.find(".plan_enddate").val();

            this.plan_state = this.domObj.find(".plan_state option:selected").val();
            this.showLoading();
            // this.getAllpersonMissionAudit(this.config.pagenumber, this.config.pagesize, this.depid, this.step1_start, this.step1_end);

            // this.getMissionAudit(this.config.pagenumber, this.config.pagesize, this.user_id);
            that.getMissionAudit(that.currentpage, this.currentpagesize, this.region_id, this.depid, this.user_id, this.plan_begindate, this.plan_enddate);


        }.bind(this));

        this.domObj.find('.department').on("change", function () {
            //根据部门重新筛选用户
            this.depid = this.domObj.find('.department option:selected').val();
            this.userid = "";
            // this.username = "";
            this.getUser();
        }.bind(this));

        this.domObj.find('.btn_auditplans').off("click").on("click", function () {

            if (this.planid == "") {
                this.toast.Show("请选择一个计划");
                return;
            }

            // if (this.planstate != "1") {
            //     this.toast.Show("只能审核巡检已完成的计划！");
            //     return;
            // }
            // if (this.checkstate == "1" || this.checkstate == "3") {
            //     this.toast.Show("已审核或作废的巡检计划不能再审核！");
            //     return;
            // }


            if (this.planstate >= 1) {
                this.toast.Show("已审核的计划不能再审核！");
                return;
            }
            //弹出模式对话框
            this.popup.setSize(600, 250);
            var Obj = this.popup.Show("审核", this.template.split('$$')[3]);
            Obj.submitObj.off("click").on("click", function () {
                var ispass = Obj.conObj.find('.ispass option:selected').val();
                var checknote = Obj.conObj.find('.checknotes').val();
                this.checkPlan(this.planid, ispass, checknote);

            }.bind(this));
            Obj.conObj;




        }.bind(this));

        this.domObj.find('.btn_transferplans').off("click").on("click", function () {

            //转移未开始的计划
            if (this.step3_plan_begindate == "") {
                this.toast.Show("请选择一个计划");
                return;
            }
            // if (this.isvalid == "0") {
            //     this.toast.Show("计划未审核");
            //     return;
            // }
            // if (this.isvalid == "2") {
            //     this.toast.Show("计划审核未通过，不能转移");
            //     return;
            // }
            if (new Date(this.step3_plan_begindate).getTime() - new Date().getTime() > 0) {
                //转移计划{}
                //进入步骤七-转移计划
                //查询当前用户具体的任务安排
                this.domObj.empty();
                this.domObj.append(this.template.split('$$')[4]);
                this.initEvent3();
                //初始化人员
                this.getUser();

            } else {
                this.toast.Show("计划已开始，不能转移！");
            }



        }.bind(this));






    }

    //步骤二事件   详情
    initEvent2() {
        var that = this;

        this.domObj.find('.btn_auditplans').off("click").on("click", function () {

            if (this.planid == "") {
                this.toast.Show("请选择一个计划");
                return;
            }

            // if (this.planstate != "1") {
            //     this.toast.Show("只能审核巡检已完成的计划！");
            //     return;
            // }
            // if (this.checkstate == "1" || this.checkstate == "3") {
            //     this.toast.Show("已审核或作废的巡检计划不能再审核！");
            //     return;
            // }


            if (this.planstate >= 1) {
                this.toast.Show("已审核的计划不能再审核！");
                return;
            }
            //弹出模式对话框
            this.popup.setSize(600, 250);
            var Obj = this.popup.Show("审核", this.template.split('$$')[3]);
            Obj.submitObj.off("click").on("click", function () {
                var ispass = Obj.conObj.find('.ispass option:selected').val();
                var checknote = Obj.conObj.find('.checknotes').val();
                this.checkPlan(this.planid, ispass, checknote);

            }.bind(this));
            Obj.conObj;




        }.bind(this));

        this.domObj.find('.btn_transferplans').off("click").on("click", function () {

            //转移未开始的计划
            if (this.step3_plan_begindate == "") {
                this.toast.Show("请选择一个计划");
                return;
            }
            if (this.isvalid == "0") {
                this.toast.Show("计划未审核");
                return;
            }
            if (this.isvalid == "2") {
                this.toast.Show("计划审核未通过，不能转移");
                return;
            }
            if (new Date(this.step3_plan_begindate).getTime() - new Date().getTime() > 0) {
                //转移计划{}
                //进入步骤七-转移计划
                //查询当前用户具体的任务安排
                this.domObj.empty();
                this.domObj.append(this.template.split('$$')[2]);
                this.initEvent3();
                //初始化人员
                this.getUser();

            } else {
                this.toast.Show("计划已开始，不能转移！");
            }



        }.bind(this));



        this.domObj.find('.btn_return').off("click").on("click", function () {

            // this.missionaudit_planregionInfoGraphicLayer.clear();
            this.missionauditInfoGraphicLayer.clear();

            this.missionaudit_plandetail_polylinelayer.clear();
            this.missionaudit_plandetail_pointlayer.clear();
            this.missionaudit_plandetail_polylinelayer_gl.clear();
            this.missionaudit_plandetail_pointlayer_gl.clear();
            this.updateplan_state = 0;

            this.updateplan_id = "";
            this.updateplan_periodtype = "";
            this.updateplan_begin = "";
            this.updateplan_end = "";
            this.updateplan_regionname = "";
            this.updateplan_regionid = "";
            //清空数据
            this.planid = "";
            this.step3_plan_begindate = "";
            this.planstate = "";
            this.checkstate = "";


            this.halfpaneltable_height = this.domObj.find(".halfpaneltable").height();
            //返回步骤一
            //查询所有用户具体的任务安排
            this.domObj.empty();
            var html = _.template(this.template.split('$$')[0] + "</div>")({ depid: AppX.appConfig.groupid });
            this.domObj.append(html);
            // this.domObj.append(this.template.split('$$')[0].replace("<div class='widget-missionaudit'>", ""));
            // 
            this.initEvent();

            //查询部门分组信息
            this.getGroup();

            //查询巡检片区
            this.getAllPlanRegion();

            //查询用户

            this.getUser();


            //查询某个人计划列表
            this.user_id = "";
            // this.getMissionAudit(this.config.pagenumber, this.config.pagesize, "");


            this.domObj.find(".department").val(this.depid);
            this.domObj.find(".plan_begindate").val(this.step1_start);
            this.domObj.find(".plan_enddate").val(this.step1_end);
            this.showLoading();
            // this.getAllpersonMissionAudit(that.currentpage, this.config.pagesize, this.depid, this.step1_start, this.step1_end);
            this.getMissionAudit(that.currentpage, this.currentpagesize, this.user_id);

            this.domObj.find(".halfpaneltable").height(this.halfpaneltable_height);
        }.bind(this));





    }


    //查询某个人的所有计划
    getMissionAudit(pagenumber, pagesize, region_id, depid, user_id, plan_begindate, plan_enddate) {
        this.currentpagenumber = pagenumber || this.config.pagenumber;
        this.currentpagesieze = pagesize || this.config.pagesize;
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getMissionAuditList,
            data: {
                "pageindex": pagenumber || this.config.pagenumber,
                "pagesize": pagesize || this.config.pagesize,

                "region_id": region_id,
                "depid": depid,
                "user_id": user_id,
                "plan_begindate": plan_begindate,
                "plan_enddate": plan_enddate,

                // "plan_state": "0,1",

                // "plan_state": this.plan_state || "5,7",

                "transfer_state": 1,
                // "plan_state": this.plan_state || "5,7",


                // "trouble_typeid": trouble_typeid,
                // "equid": equid,
                // "handle_user_id": handle_user_id,
                // "handle_state": 0,
                // f: "pjson"
            },
            success: this.getMissionAuditListCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    getMissionAuditListCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("查询巡检计划信息出错！");
            console.log(results.message);
            this.hideLoading();
            return;
        }
        //添加终端用户图层
        if (results.result.total % that.currentpagesieze == 0) {
            this.totalpage = Math.floor(parseInt(results.result.total) / that.currentpagesieze);

        } else {
            this.totalpage = Math.floor(parseInt(results.result.total) / that.currentpagesieze) + 1;

        }
        if (results.result.rows.length != 0) {
            this.currentpagenumber = results.result.rows.length;
            // this.map.infoWindow.resize(400, 260);
            // this.addClusters(results.result.rows);
        } else {
            // that.toast.Show("当前无需要审核的巡检计划！");
            var domtb = this.domObj.find(".planslist")
            domtb.empty();
            this.domObj.find(".pagecontrol").text("总共" + results.result.total + "条记录，每页默认显示" + that.currentpagesieze + "条记录");
            this.domObj.find(".content").text("第" + that.currentpage + "页共" + that.totalpage + "页");
            if (that.totalpage == 0) {
                this.domObj.find(".content").text("无数据");
                this.domObj.find(".pagecontrol").text("总共-条记录，每页默认显示" + that.currentpagesieze + "条记录");
                this.domObj.find(".content").text("第-页共-页");
            }
            this.hideLoading();
            // return;
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
        var domtb = this.domObj.find(".planslist")
        domtb.empty();
        var address;
        var html_trs_data = "";


        $.each(results.result.rows, function (i, item) {
            // var planstate = "计划执行阶段";
            // var percent = "未完成";
            var checkstate = "未审核";
            // if (item.plan_state == 1) {
            //     planstate = "巡检已完成";
            // } else if (item.plan_state == 2) {
            //     planstate = "巡检超时未完成";
            // } else if (item.plan_state == 3) {
            //     planstate = "未开始";
            // }



            if (item.isvalid == 0) {
                checkstate = "未审核";
            } else if (item.isvalid == 1) {
                checkstate = "通过审核 ";
            } else if (item.isvalid == 2) {
                checkstate = "未通过审核";
            }

            // if (item.percent == 1) {
            //     percent = "完成";
            // }

            // <td>" + checkstate + "</td><td>" + item.plan_process_name + "</td>

            html_trs_data += "<tr class=goto data-plan_id='" + item.plan_id + "' data-child_plan_id='" + item.child_plan_id + "' data-geometry='" + item.geometry + "' data-region_name='" + item.region_name + "' data-user_id='" + item.user_id + "' data-percent='" + item.percent + "'  data-region_id='" + item.region_id + "' data-region_name='" + item.region_name + "'  data-period_name='" + item.period_name + "'  data-period_id='" + item.period_id + "' data-plan_begindate='" + item.plan_begindate + "' data-plan_enddate='" + item.plan_enddate + "' data-plan_state='" + item.plan_state + "' data-check_state='" + item.check_state + "' data-isvalid='" + item.isvalid + "' data-plan_mode='" + item.plan_mode + "'><td>" + item.user_name + "</td><td>" + item.device_type_name + "</td><td>" + item.depname + "</td><td>" + item.period_name + "</td><td>" + item.region_name + "</td><td>" + item.transfer_name + "</td><td>" + item.plan_begindate.split(" ")[0] + "</td><td>" + item.plan_enddate.split(" ")[0] + "</td><td>" + item.create_user + "</td><td>" + item.create_time + "</td><td><a class='zyjl' data-child_plan_id='" + item.child_plan_id + "'>详情</a></td><td><a class='operation' data-plan_id='" + item.plan_id + "' data-geometry='" + item.geometry + "' data-region_id='" + item.region_id + "' data-region_name='" + item.region_name + "'  data-device_type_id='" + item.device_type_id + "' data-child_plan_id='" + item.child_plan_id + "' >详情</a></td></tr>";

            //刷新infowindow
            // this.setContent(item);
        }.bind(this));

        domtb.append(html_trs_data);


        var html_trs_blank = "";
        if (results.result.rows.length < that.config.pagesize) {
            var num = that.config.pagesize - results.result.rows.length;
            for (var i = 0; i < num; i++) {
                html_trs_blank += "<tr class=goto data-user_id='null'><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>";
            }
            domtb.append(html_trs_blank);
        }


        this.domObj.find(".zyjl").off("click").on("click", (e) => {

            var preheight = this.domObj.find(".halfpaneltable").height();
            this.child_plan_id = $(e.currentTarget).data("child_plan_id");

            //触发行选中事件
            // this.domObj.find("tbody tr").trigger("click")
            //进入步骤二
            //查询当前用户具体的任务安排

            this.domObj.empty();
            this.domObj.append(this.template.split('$$')[5]);
            this.initEvent2();
            this.showLoading();
            //查询转移记录
            this.getTransferPlan(this.child_plan_id);
            this.domObj.find(".halfpaneltable").height(preheight);
        });


        this.domObj.find(".operation").off("click").on("click", (e) => {

            this.halfpaneltable_height = this.domObj.find(".halfpaneltable").height();


            //触发行选中事件
            // this.domObj.find("tbody tr").trigger("click")

            if ($(e.currentTarget).data("plan_id") == null) {
                return;
            } else {
                this.planid = $(e.currentTarget).data("plan_id");
                this.step3_plan_begindate = $(e.currentTarget).data("plan_begindate");
                this.planstate = $(e.currentTarget).data("plan_state");
                this.checkstate = $(e.currentTarget).data("check_state");

                this.isvalid = $(e.currentTarget).data("isvalid");


                // this.updateplan_state = 1;

                this.updateplan_id = $(e.currentTarget).data("plan_id");
                this.updateplan_periodtype = $(e.currentTarget).data("period_name");
                this.updateplan_begin = $(e.currentTarget).data("plan_begindate");
                this.updateplan_end = $(e.currentTarget).data("plan_enddate");
                this.updateplan_regionname = $(e.currentTarget).data("region_name");
                this.updateplan_regionid = $(e.currentTarget).data("region_id");


                this.updateplan_periodid = $(e.currentTarget).data("period_id");









            }
            this.domObj.find('tr.active').removeClass('active');
            $(e.currentTarget).addClass('active');


            //定位
            if ($(e.currentTarget).data("geometry") == undefined) { return; }
            var polygon = new Polygon($(e.currentTarget).data("geometry"));

            this.map.centerAndZoom(polygon.getExtent().getCenter(), 10);

            //显示该区域
            var rows = [];
            rows[0] = { "regionid": $(e.currentTarget).data("regionid"), "regionname": $(e.currentTarget).data("region_name").toString(), "geometry": JSON.stringify($(e.currentTarget).data("geometry")) };
            var result = { "rows": rows };
            var results = { "result": result }
            that.addPolygonGraphic(results);


            //定义详情事件
            $.each(this.config.deviceForLayer, function (i, item) {
                if ($(e.currentTarget).data("device_type_id") == item.device_type_id) {
                    item.showfieldnames;

                    this.domObj.empty();
                    var htmlString = _.template(this.template.split('$$')[1])({ fields: item.showfieldnames });
                    this.domObj.append(htmlString);
                    this.initEvent2();

                    this.showLoading();
                    //查询该计划对应的巡检点或线

                    this.getPlanDetail($(e.currentTarget).data("plan_id"));
                    // this.getPlanDetail($(e.currentTarget).data("point_info"));

                    this.domObj.find(".halfpaneltable").height(this.halfpaneltable_height);
                }

            }.bind(this));




        });


        //选中图上添加片区

        // 选中行高亮
        // this.domObj.off("click").on('click', 'tbody tr', (e) => {
        //     if ($(e.currentTarget).data("plan_id") == null) {
        //         return;
        //     } else {
        //         this.missionaudit_planregionInfoGraphicLayer.clear();

        //     }
        //     this.domObj.find('tr.active').removeClass('active');
        //     $(e.currentTarget).addClass('active');


        //     //定位
        //     if ($(e.currentTarget).data("geometry") == undefined) { return; }
        //     var polygon = new Polygon($(e.currentTarget).data("geometry"));

        //     this.map.centerAndZoom(polygon.getExtent().getCenter(), 10);

        //     // //显示该区域
        //     // var rows = [];
        //     // rows[0] = { "regionid": $(e.currentTarget).data("regionid"), "regionname": $(e.currentTarget).data("region_name").toString(), "geometry": JSON.stringify($(e.currentTarget).data("geometry")) };
        //     // var result = { "rows": rows };
        //     // var results = { "result": result }
        //     // that.addPolygonGraphic(results);



        //     // //添加图形
        //     // var graphic = new Graphic(polygon, this.setGraphSymbol("polygon"));

        //     // graphic.attr("id", "graphic" + i);
        //     // this.missionaudit_planregionInfoGraphicLayer.add(graphic);

        //     // //添加背景
        //     // var point = polygon.getExtent().getCenter();
        //     // var graphictextbg = new Graphic(point, this.setSymbol($(e.currentTarget).data("region_name"))[1].setOffset(0, -20), "");
        //     // this.missionaudit_planregionInfoGraphicLayer.add(graphictextbg);
        //     // //添加文字
        //     // var peopleTextSymbol = new TextSymbol($(e.currentTarget).data("region_name"));
        //     // peopleTextSymbol.setOffset(0, -25);
        //     // var font = new Font();
        //     // font.setSize("10pt");
        //     // font.setWeight(Font.WEIGHT_BOLD);
        //     // peopleTextSymbol.setFont(font);
        //     // var graphicText = new Graphic(point, peopleTextSymbol, "");
        //     // this.missionaudit_planregionInfoGraphicLayer.add(graphicText);


        // });





        this.hideLoading();

        //查询巡检片区
        this.getAllPlanRegion();

        //查询用户

        this.getUser();



        //查询周期

        //this.getPeriod();


        //查询部门分组信息

        this.getGroup();









    }


    //查询某个计划对应的点或线

    getPlanDetail2(point_info) {

    }

    getPlanDetail(id) {
        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getPlanDetail + id,
            data: {
                "pageindex": this.config.pagenumber,
                "pagesize": 100000 || this.config.pagesize,
                "id": id,
                // f: "pjson"
            },
            success: this.getPlanDetailCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
                this.hideLoading();

            }.bind(this),
            dataType: "json",
        });
    }

    getPlanDetailCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("查询片区巡检信息出错！");
            console.log(results.message);
            this.hideLoading();
            return;
        }
        // //添加巡检点图层
        // this.map.infoWindow.resize(400, 260);
        // this.addClusters(results.result.points);
        //定位才绘制



        var domtb = this.domObj.find(".planslist")
        domtb.empty();
        var address;
        var html_trs_data = "";
        // var that = this;
        $.each(results.result.point, function (i, item) {

            //定义详情事件
            $.each(this.config.deviceForLayer, function (i, ite) {
                if (item.device_type_id == ite.device_type_id) {

                    ite.showfields;
                    if (item.content != "") {
                        var j = JSON.parse(item.content);
                        var strcontent = "";
                        //   for(var i=0;i<results.length;i++){
                        for (var m = 0; m < ite.showfields.length; m++) {
                            if (JSON.parse(item.content)[ite.showfields[m]] != null) {
                                if (JSON.parse(item.content)[ite.showfields[m]].length > 20) {
                                    strcontent += "<td title='" + JSON.parse(item.content)[ite.showfields[m]] + "'>" + JSON.parse(item.content)[ite.showfields[m]].substr(0, 20) + "..." + "</td>";
                                } else {
                                    strcontent += "<td>" + JSON.parse(item.content)[ite.showfields[m]] + "</td>";
                                }

                            } else {

                                strcontent += "<td>" + JSON.parse(item.content)[ite.showfields[m]] + "</td>";
                            }

                            // strcontent += "<td>" + JSON.parse(item.content)[ite.showfields[m]] + "</td>";
                        }
                        // $.each(ite.showfields, (i, it) => {
                        //     strcontent += "<td>" + it + "</td>";
                        // });




                        html_trs_data += "<tr class=goto data-plan_id='" + item.plan_id + "' data-geometry='" + item.geometry + "' data-device_type_name='" + item.device_type_name + "'><td>" + item.device_type_name + "</td> <td title='" + item.point_name + "'>" + (item.point_name.length >= 10 ? item.point_name.substr(0, 10) + "..." : item.point_name) + "</td><td title='" + item.address + "'>" + (item.address.length >= 10 ? item.address.substr(0, 10) + "..." : item.address) + "</td><td title='" + item.regionname + "'>" + (item.regionname.length >= 10 ? item.point_name.substr(0, 10) + "..." : item.regionname) + "</td>" + strcontent + "</tr>";

                    } else {
                        html_trs_data += "<tr class=goto data-plan_id='" + item.plan_id + "' data-geometry='" + item.geometry + "' data-device_type_name='" + item.device_type_name + "'><td>" + item.device_type_name + "</td> <td title='" + item.point_name + "'>" + (item.point_name.length >= 10 ? item.point_name.substr(0, 10) + "..." : item.point_name) + "</td><td title='" + item.address + "'>" + (item.address.length >= 10 ? item.address.substr(0, 10) + "..." : item.address) + "</td><td title='" + item.regionname + "'>" + (item.regionname.length >= 10 ? item.point_name.substr(0, 10) + "..." : item.regionname) + "</td></tr>";

                    }


                }

            }.bind(this));
            // JSON.parse(item.content);


            // JSON.parse(item.content).trouble_username;
            // JSON.parse(item.content).troubletype;
            // JSON.parse(item.content).trouble_notes;
            // JSON.parse(item.content).trouble_findtime;

        }.bind(this));

        domtb.append(html_trs_data);



        this.domObj.find(".pagecontrol").text("总共" + results.result.point.length + "条记录");


        //绘制所有内容
        this.missionaudit_plandetail_polylinelayer.clear();
        this.missionaudit_plandetail_pointlayer.clear();
        $.each(results.result.point, (i, item) => {

            if (item.geometry.hasOwnProperty("paths")) {

                var polylineJson = {
                    "paths": JSON.parse(item.geometry).paths,
                    "spatialReference": { "wkid": this.map.spatialReference.wkid }
                };
                var mappolyline = new Polyline(polylineJson);


                this.missionaudit_plandetail_polylinelayer.add(new Graphic(mappolyline, this.setGraphSymbol("polyline")));


            } else {

                var mapPoint = new Point({ "x": JSON.parse(item.geometry).x, "y": JSON.parse(item.geometry).y, "spatialReference": { "wkid": this.map.spatialReference.wkid } });

                this.missionaudit_plandetail_pointlayer.add(new Graphic(mapPoint, this.setGraphSymbol("point")));

            }

        });





        //定位才绘制

        // 选中行高亮
        this.domObj.off("click").on('click', 'tbody tr', (e) => {
            if ($(e.currentTarget).data("plan_id") == null) {
                return;
            } else {


            }
            this.domObj.find('tr.active').removeClass('active');
            $(e.currentTarget).addClass('active');


            //定位

            if ($(e.currentTarget).data("geometry").hasOwnProperty("paths")) {

                var polylineJson = {
                    "paths": $(e.currentTarget).data("geometry").paths,
                    "spatialReference": { "wkid": this.map.spatialReference.wkid }
                };
                var mappolyline = new Polyline(polylineJson);


                if ($(e.currentTarget).data("device_type_name") == "巡检线") {
                    this.map.centerAndZoom(mappolyline.getExtent().getCenter(), 13);//9
                } else {
                    this.map.centerAndZoom(mappolyline.getExtent().getCenter(), 13);//10
                }


                this.missionaudit_plandetail_polylinelayer_gl.clear();
                this.missionaudit_plandetail_polylinelayer_gl.add(new Graphic(mappolyline, this.setGraphSymbol("polyline")));

            } else {
                var mapPoint = new Point({ "x": $(e.currentTarget).data("geometry").x, "y": $(e.currentTarget).data("geometry").y, "spatialReference": { "wkid": this.map.spatialReference.wkid } });
                this.map.centerAndZoom(mapPoint, 13);//9

                this.missionaudit_plandetail_pointlayer_gl.clear();
                this.missionaudit_plandetail_pointlayer_gl.add(new Graphic(mapPoint, this.setGraphSymbol("point")));
                //  this.pointlayer.add(new Graphic(mapPoint, this.setGraphSymbol("point")));

            }



        });






        this.hideLoading();









    }


    //审核计划（通过、驳回）
    checkPlan(planid, ispass, checknote) {


        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.checkPlan,
            data: {
                "plan_id": planid,
                "valid": ispass,
                "check_note": checknote,

                "check_user": AppX.appConfig.realname,

            },
            success: function (results) {

                this.halfpaneltable_height = this.domObj.find(".halfpaneltable").height();
                //返回步骤一
                //查询所有用户具体的任务安排
                this.domObj.empty();

                var html = _.template(this.template.split('$$')[0] + "</div>")({ depid: AppX.appConfig.groupid });
                this.domObj.append(html);

                // this.domObj.append(this.template.split('$$')[0].replace("<div class='widget-missionaudit'>", ""));
                this.initEvent();

                //查询部门分组信息
                this.getGroup();

                //查询某个人计划列表
                this.user_id = "";
                // this.getMissionAudit(this.config.pagenumber, this.config.pagesize, "");


                this.domObj.find(".department").val(this.depid);
                this.domObj.find(".plan_begindate").val(this.step1_start);
                this.domObj.find(".plan_enddate").val(this.step1_end);
                this.showLoading();

                //查询重新
                // this.getMissionAudit(this.config.pagenumber, this.config.pagesize, this.user_id);
                this.getMissionAudit(this.currentpage, this.config.pagesize, this.region_id, this.depid, this.user_id, this.plan_begindate, this.plan_enddate);

                this.popup.Close();
                this.domObj.find(".halfpaneltable").height(this.halfpaneltable_height);

            }.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });


    }







    //
    //步骤六事件
    initEvent3() {
        var that = this;
        //转移计划
        this.domObj.find('.btn_confirm').off("click").on("click", function () {
            //查询该计划开始时间，和网络时间

            if (this.planid == "") {
                this.toast.Show("请选择一个计划");
                return;
            } else {
                if (this.domObj.find("input[name='isagree']:checked").val() == "1") {
                    if (this.domObj.find('.users option:selected').val() == "") {
                        this.toast.Show("请选择一个用户");
                        return;
                    }

                } else {
                    //不同意填写意见
                    if (this.domObj.find('.audit_notes').val().trim() == "") {
                        this.toast.Show("请填写审核意见");
                        return;
                    }


                }
                // this.domObj.find("input[name='isagree']:checked").val();
                // this.domObj.find('.users option:selected').val();
                //转移计划
                $.ajax({
                    headers: {
                        // 'Authorization-Token': AppX.appConfig.xjxj
                        'Token': AppX.appConfig.xjxj,
                        'departmentid': AppX.appConfig.departmentid,
                    },
                    type: "POST",
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.transferMissionAudit,
                    data: {
                        "child_plan_id": this.child_plan_id,


                        "check_state": this.domObj.find("input[name='isagree']:checked").val(),
                        "check_note": this.domObj.find('.audit_notes').val().trim(),

                        "check_user": AppX.appConfig.realname,
                        "replace_userid": this.domObj.find('.users option:selected').val(),

                        // f: "pjson"
                    },
                    success: function (results) {


                        var that = this;
                        if (results.code != 1) {
                            that.toast.Show("转移失败");
                            console.log(results.message);
                            return;
                        } else {
                            that.toast.Show("转移成功！");

                        }


                        //清空数据
                        this.planid = "";
                        this.step3_plan_begindate = "";
                        this.planstate = "";
                        this.checkstate = "";

                        //重新查询改人的所有计划
                        //查询某个人计划列表

                        this.domObj.empty();

                        var html = _.template(this.template.split('$$')[0] + "</div>")({ depid: AppX.appConfig.groupid });

                        this.domObj.append(html);
                        this.initEvent();
                        //查询某个人计划列表
                        // this.getMissionAudit(this.config.pagenumber, this.config.pagesize, this.user_id);
                        // that.getMissionAudit(that.currentpage, that.config.pagesize, "");
                        this.showLoading();
                        // that.getAllpersonMissionAudit(that.currentpage, this.currentpagesize, that.depid, that.step1_start, that.step1_end);
                        // that.getMissionAudit(that.currentpage, this.currentpagesize, this.user_id);
                        this.getMissionAudit(this.currentpage, this.currentpagesize, this.region_id, this.depid, this.user_id, this.plan_begindate, this.plan_enddate);




                    }.bind(this),
                    error: function (data) {
                        this.toast.Show("服务端ajax出错，获取数据失败!");
                    }.bind(this),
                    dataType: "json",
                });



            }





        }.bind(this));



        this.domObj.find('.btn_cancel').off("click").on("click", function () {
            //清空数据
            this.planid = "";
            this.step3_plan_begindate = "";
            this.planstate = "";
            this.checkstate = "";
            this.planmode = "";

            //重新查询改人的所有计划
            //查询某个人计划列表

            this.domObj.empty();
            // this.domObj.append(this.template.split('$$')[0]);
            var html = _.template(this.template.split('$$')[0] + "</div>")({ depid: AppX.appConfig.groupid });
            this.domObj.append(html);
            this.initEvent();
            //查询某个人计划列表
            // this.getMissionAudit(this.config.pagenumber, this.config.pagesize, this.user_id);
            // that.getMissionAudit(that.currentpage, that.config.pagesize, "");
            this.showLoading();
            // that.getAllpersonMissionAudit(that.currentpage, this.currentpagesize, that.depid, that.step1_start, that.step1_end);
            // that.getMissionAudit(that.currentpage, this.currentpagesize, this.user_id);
            this.getMissionAudit(this.currentpage, this.currentpagesize, this.region_id, this.depid, this.user_id, this.plan_begindate, this.plan_enddate);


        }.bind(this));


        //是否同意

        //定义是否为隐患
        $("input[name='isagree']").off("click").on("click", function (e) {

            if ($(e.currentTarget).val() == 1) {
                //显示隐患级别,隐患级别可用

                this.domObj.find('.users').removeAttr("disabled");
                this.domObj.find('.users').css("background-color", "white");

            } else {
                //隐患级别不可用


                this.domObj.find('.users').attr("disabled", "true");
                this.domObj.find('.users').css("background-color", "gray");
            }


        }.bind(that));




    }

    //步骤二事件  查询某个人的计划（ 审核和计划转移）
    initEvent5() {
        var that = this;




        this.domObj.find('.btn_auditplans').off("click").on("click", function () {

            if (this.planid == "") {
                this.toast.Show("请选择一个计划");
                return;
            }

            // if (this.planstate != "1") {
            //     this.toast.Show("只能审核巡检已完成的计划！");
            //     return;
            // }
            // if (this.checkstate == "1" || this.checkstate == "3") {
            //     this.toast.Show("已审核或作废的巡检计划不能再审核！");
            //     return;
            // }


            if (this.planstate >= 1) {
                this.toast.Show("已审核的计划不能再审核！");
                return;
            }
            //弹出模式对话框
            this.popup.setSize(600, 250);
            var Obj = this.popup.Show("审核", this.template.split('$$')[3]);
            Obj.submitObj.off("click").on("click", function () {
                var ispass = Obj.conObj.find('.ispass option:selected').val();
                var checknote = Obj.conObj.find('.checknotes').val();
                this.checkPlan(this.planid, ispass, checknote);

            }.bind(this));
            Obj.conObj;




        }.bind(this));

        this.domObj.find('.btn_transferplans').off("click").on("click", function () {

            //转移未开始的计划
            if (this.step3_plan_begindate == "") {
                this.toast.Show("请选择一个计划");
                return;
            }
            if (this.isvalid == "0") {
                this.toast.Show("计划未审核");
                return;
            }
            if (this.isvalid == "2") {
                this.toast.Show("计划审核未通过，不能转移");
                return;
            }
            if (new Date(this.step3_plan_begindate).getTime() - new Date().getTime() > 0) {
                //转移计划{}
                //进入步骤七-转移计划
                //查询当前用户具体的任务安排
                this.domObj.empty();
                this.domObj.append(this.template.split('$$')[2]);
                this.initEvent3();
                //初始化人员
                this.getUser();

            } else {
                this.toast.Show("计划已开始，不能转移！");
            }



        }.bind(this));

        this.domObj.find('.btn_return').off("click").on("click", function () {
            this.missionaudit_planregionInfoGraphicLayer.clear();
            this.missionauditInfoGraphicLayer.clear();
            this.updateplan_state = 0;

            this.updateplan_id = "";
            this.updateplan_periodtype = "";
            this.updateplan_begin = "";
            this.updateplan_end = "";
            this.updateplan_regionname = "";
            this.updateplan_regionid = "";
            //清空数据
            this.planid = "";
            this.step3_plan_begindate = "";
            this.planstate = "";
            this.checkstate = "";


            this.halfpaneltable_height = this.domObj.find(".halfpaneltable").height();
            //返回步骤一
            //查询所有用户具体的任务安排
            this.domObj.empty();
            this.domObj.append(this.template.split('$$')[0].replace("<div class='widget-missionaudit'>", ""));
            this.initEvent();

            //查询部门分组信息
            this.getGroup();

            //查询某个人计划列表
            this.user_id = "";
            // this.getMissionAudit(this.config.pagenumber, this.config.pagesize, "");


            this.domObj.find(".department").val(this.depid);
            this.domObj.find(".plan_begindate").val(this.step1_start);
            this.domObj.find(".plan_enddate").val(this.step1_end);
            this.showLoading();
            // this.getAllpersonMissionAudit(that.currentpage, this.config.pagesize, this.depid, this.step1_start, this.step1_end);


            this.domObj.find(".halfpaneltable").height(this.halfpaneltable_height);

        }.bind(this));

        //动态生成书签及分页控件
        //分页控件fykj 向前、向后事件

        this.domObj.find(".pre").off("click").on("click", function () {
            //清空数据
            this.planid = "";
            this.step3_plan_begindate = "";
            this.planstate = "";
            this.checkstate = "";
            if (that.Plan_list_currentpage - 1 > 0) {
                that.Plan_list_currentpage = that.Plan_list_currentpage - 1;
                // that.getMissionAudit(that.Plan_list_currentpage, that.config.pagesize, that.user_id);
                that.domObj.find(".content").text("第" + that.Plan_list_currentpage + "页共" + that.totalpage + "页");
            }

        });
        this.domObj.find(".next").off("click").on("click", function () {
            //清空数据
            this.planid = "";
            this.step3_plan_begindate = "";
            this.planstate = "";
            this.checkstate = "";
            if (that.Plan_list_currentpage + 1 <= that.totalpage) {
                that.Plan_list_currentpage = that.Plan_list_currentpage + 1;
                // that.getMissionAudit(that.Plan_list_currentpage, that.config.pagesize, that.user_id);
                that.domObj.find(".content").text("第" + that.Plan_list_currentpage + "页共" + that.totalpage + "页");

            }
        });


        this.domObj.find(".pageturning").off("click").on("click", function () {
            //清空数据
            this.planid = "";
            this.step3_plan_begindate = "";
            this.planstate = "";
            this.checkstate = "";
            if (parseInt(that.domObj.find(".currpage").val()) <= that.totalpage && that.Plan_list_currentpage >= 1) {
                that.Plan_list_currentpage = parseInt(that.domObj.find(".currpage").val());
                // that.getMissionAudit(that.Plan_list_currentpage, that.config.pagesize, that.user_id);
                that.domObj.find(".content").text("第" + that.Plan_list_currentpage + "页共" + that.totalpage + "页");
                //清除infowindow
            } else {
                that.domObj.find(".currpage").val("");
            }
        }.bind(this));

        this.domObj.find(".dynamic_pagesize").off("change").on("change", function () {

            //重新查询
            this.currentpagesize = parseInt(this.domObj.find(".dynamic_pagesize").val());
            // that.getMissionAudit(that.Plan_list_currentpage, this.currentpagesize, that.user_id);
            this.domObj.find(".halfpaneltable").height(this.domObj.find(".halfpaneltable").height());
        }.bind(this));


        // 选中行高亮
        this.domObj.off("click").on('click', '.planslist tr', (e) => {
            if ($(e.currentTarget).data("user_id") == null) {
                return;
            } else {
                this.planid = $(e.currentTarget).data("plan_id");
                this.step3_plan_begindate = $(e.currentTarget).data("plan_begindate");
                this.planstate = $(e.currentTarget).data("plan_state");
                this.checkstate = $(e.currentTarget).data("check_state");

                this.isvalid = $(e.currentTarget).data("isvalid");


                // this.updateplan_state = 1;

                this.updateplan_id = $(e.currentTarget).data("plan_id");
                this.updateplan_periodtype = $(e.currentTarget).data("period_name");
                this.updateplan_begin = $(e.currentTarget).data("plan_begindate");
                this.updateplan_end = $(e.currentTarget).data("plan_enddate");
                this.updateplan_regionname = $(e.currentTarget).data("region_name");
                this.updateplan_regionid = $(e.currentTarget).data("region_id");


                this.updateplan_periodid = $(e.currentTarget).data("period_id");









            }
            this.domObj.find('tr.active').removeClass('active');
            $(e.currentTarget).addClass('active');


            //定位
            if ($(e.currentTarget).data("geometry") == undefined) { return; }
            var polygon = new Polygon($(e.currentTarget).data("geometry"));

            this.map.centerAndZoom(polygon.getExtent().getCenter(), 10);

            //显示该区域
            var rows = [];
            rows[0] = { "regionid": $(e.currentTarget).data("regionid"), "regionname": $(e.currentTarget).data("region_name").toString(), "geometry": JSON.stringify($(e.currentTarget).data("geometry")) };
            var result = { "rows": rows };
            var results = { "result": result }
            that.addPolygonGraphic(results);



            //定义选择事件



            //进入步骤三
            //查询当前用户具体的任务安排
            // this.domObj.remove();
            // var html = _.template(this.template.split('$$')[1])();
            // this.setHtml(html);
            // this.initEvent();
            // this.ready();






        });





    }



    //添加片区
    addPlanRegionInfoCallback(results) {

        var that = this;
        if (results.code != 1) {
            that.toast.Show("划分片区出错！");
            console.log(results.message);
            return;
        } else {
            that.toast.Show("划分片区成功！");
            this.regionid = results.result.regionid;
            //重新查询片区

            this.addPlanPoint(this.regionid);

        }



    }

    addPlanPoint(regionid) {

        //添加巡检点
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.addPlanPointInfo,
            data: {
                "point_name": this.pointname,
                "region_id": regionid,
                "geometry": this.pointjsongeometry,
                "address": this.pointaddress,
                "notes": this.pointnotes,
                "x": "0",
                "y": "0",
                "lat": "0",
                "lng": "0",

            },
            success: this.addPlanPointInfoCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });

    }



    addPlanPointInfoCallback(results) {

        var that = this;
        if (results.code != 1) {
            that.toast.Show("绘制巡检点出错！");
            console.log(results.message);
            return;
        } else {
            that.toast.Show("绘制巡检点成功！");
            //重新查询
            //info中加上该点信息
            var strdata = "<tr data-point_id='" + results.result.point_id + "'> <td>" + this.regionname + "</td><td>" + this.pointname + "</td></tr>";

            this.domObj.find(".planregion-current").append(strdata);





        }
        //清空界面输入内容
        this.domObj.find('.pointname').val("");
        this.domObj.find('.pointaddress').val("");
        this.domObj.find('.pointnotes').val("");
        //清空点数据数据
        this.pointjsongeometry = "";
        this.pointname = "";
        this.pointaddress = "";
        this.pointnotes = "";
        //清空片区数据除regionid


        this.regionaddress = "";
        this.regionnotes = "";

        //清空临时图层，添加该区域点图层
        if (this.templanpoint) {
            this.templanpoint.clear();
        }
        //查询查询添加点图层

        //根据regionid，查询出当前所有点、线信息

        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getRegionInfo,
            data: {
                "region_id": this.regionid,
            },
            success: function (results) {
                var planpoints = results.result.points;
                this.addClusters(results.result.points);

            }.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });





    }









    //查询所有人的所有计划
    getAllpersonMissionAudit(pagenumber, pagesize, depid, plan_begindate, plan_enddate) {
        this.currentpage = pagenumber || this.config.pagenumber;
        this.currentpagesieze = pagesize || this.config.pagesize;
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getAllpersonPlan,
            data: {
                "pageindex": pagenumber || this.config.pagenumber,
                "pagesize": pagesize || this.config.pagesize,
                "depid": depid,
                "plan_begindate": plan_begindate,
                "plan_enddate": plan_enddate,
                // "handle_user_id": handle_user_id,
                // "handle_state": 0,
                // f: "pjson"
            },
            success: this.getAllpersonMissionAuditListCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
                this.hideLoading();
            }.bind(this),
            dataType: "json",
        });
    }

    getAllpersonMissionAuditListCallback(results) {
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
            // this.currentpagecount = results.result.rows.length;
            // this.map.infoWindow.resize(400, 260);
            // this.addClusters(results.result.rows);
        } else {
            that.toast.Show("无巡检计划！");

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
        var domtb = this.domObj.find(".planslist")
        domtb.empty();
        var address;
        var html_trs_data = "";


        $.each(results.result.rows, function (i, item) {
            var planstate = "计划执行阶段";
            var percent = "未完成";
            var checkstate = "未审核";
            if (item.plan_state == 1) {
                planstate = "巡检已完成";
            } else if (item.plan_state == 2) {
                planstate = "巡检超时未完成";
            } else if (item.plan_state == 3) {
                planstate = "未开始";
            }

            if (item.isvalid == 0) {
                checkstate = "未审核";
            } else if (item.isvalid == 1) {
                checkstate = "通过审核 ";
            } else if (item.isvalid == 2) {
                checkstate = "未通过审核";
            }

            // if (item.percent == 1) {
            //     percent = "完成";
            // }

            html_trs_data += "<tr class=goto data-plan_id='" + item.plan_id + "' data-user_id='" + item.user_id + "' data-percent='" + item.percent + "' data-plan_begindate='" + item.plan_begindate + "' data-plan_state='" + item.plan_state + "' data-check_state='" + item.check_state + "'><td>" + item.user_name + "</td><td>" + item.depname + "</td><td>" + item.date_range + "</td></tr>";
            //刷新infowindow
            // this.setContent(item);
        }.bind(this));
        domtb.append(html_trs_data);


        var html_trs_blank = "";
        if (results.result.rows.length < that.config.pagesize) {
            var num = that.config.pagesize - results.result.rows.length;
            for (var i = 0; i < num; i++) {
                html_trs_blank += "<tr class=goto data-user_id='null'><td></td><td></td><td></td></tr>";
            }
            domtb.append(html_trs_blank);
        }


        this.hideLoading();





    }






    //查询所有人的计划
    getAllMissionAudit() {
        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getMissionAuditList,
            data: {
                "pageindex": this.config.pagenumber,
                "pagesize": 1000 || this.config.pagesize,
                // "trouble_typeid": trouble_typeid,
                // "equid": equid,
                // "handle_user_id": handle_user_id,
                // "handle_state": 0,
                // f: "pjson"
            },
            success: this.getAllMissionAuditListCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    getAllMissionAuditListCallback(results) {
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
        this.missionauditInfoGraphicLayer.clear();
        // this.map.infoWindow.hide();

        //添加当前页工单气泡
        for (var i = 0, length = queryResult.result.rows.length; i < length; i++) {
            var row = queryResult.result.rows[i];

            if (row.geometry == undefined) { return; }
            // var Polygon = new Polygon(JSON.parse(row.geometry));
            var polygon = new Polygon(JSON.parse(row.geometry));
            var graphic = new Graphic(polygon, this.setSymbol(row.regionname)[2], "");


            graphic.attr("id", "graphic" + i);
            this.missionauditInfoGraphicLayer.add(graphic);
            //this.map.centerAt(point);

            //添加背景
            var point = polygon.getExtent().getCenter();
            var graphictextbg = new Graphic(point, this.setSymbol(row.regionname)[1].setOffset(0, -20), "");
            this.missionauditInfoGraphicLayer.add(graphictextbg);
            //添加文字
            var peopleTextSymbol = new TextSymbol(row.regionname);
            peopleTextSymbol.setOffset(0, -25);
            var font = new Font();
            font.setSize("10pt");
            font.setWeight(Font.WEIGHT_BOLD);
            peopleTextSymbol.setFont(font);
            var graphicText = new Graphic(point, peopleTextSymbol, "");
            this.missionauditInfoGraphicLayer.add(graphicText);

        }

    }






    addMissionAuditInfoCallback(results) {

        var that = this;
        if (results.code != 1) {
            // that.toast.Show("绘制巡检计划出错！");
            that.toast.Show(results.message);
            // console.log(results.message);
            return;
        } else {
            that.toast.Show("绘制巡检计划成功！");
            //清除数据
            //   this.user_id = "";
            this.periodid = "";
            this.plan_begindate = "";
            this.plan_enddate = "";
            if (this.missionauditInfoGraphicLayer) {
                this.missionauditInfoGraphicLayer.clear();
            }
            if (this.templanregion) {

                this.templanregion.clear();
            }
            if (this.missionaudit_planpoint_clusterLayer != null) {
                this.map.removeLayer(this.missionaudit_planpoint_clusterLayer);
                this.missionaudit_planpoint_clusterLayer = null
            }
            this.regionid = "";
            //重新查询
            //进入步骤二
            //查询当前用户具体的任务安排
            this.domObj.empty();
            this.domObj.append(this.template.split('$$')[1]);
            this.initEvent2();
            //查询某个人计划列表
            // this.getMissionAudit(this.config.pagenumber, this.config.pagesize, this.user_id);
            this.getMissionAudit(that.currentpage, this.config.pagesize, this.region_id, this.depid, this.user_id, this.plan_begindate, this.plan_enddate);

            this.domObj.find(".halfpaneltable").height(this.halfpaneltable_height);

        }

    }
    deleteMissionAuditCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("删除巡检计划出错！");
            console.log(results.message);
            return;
        } else {
            //清空数据
            this.planid = "";
            that.toast.Show("删除巡检计划成功！");
            // this.getMissionAudit(this.config.pagenumber, this.config.pagesize, this.user_id);
            this.getMissionAudit(this.currentpage, this.config.pagesize, this.region_id, this.depid, this.user_id, this.plan_begindate, this.plan_enddate);



        }


    }

    updateMissionAuditInfoCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("修改巡检计划出错！");
            console.log(results.message);
            return;
        } else {
            that.toast.Show("修改巡检计划成功！");
            //重新查询
            // this.getMissionAudit(this.config.pagenumber, this.config.pagesize, this.user_id);
            that.getMissionAudit(that.currentpage, this.config.pagesize, this.region_id, this.depid, this.user_id, this.plan_begindate, this.plan_enddate);

        }


        if (this.updateplan_state == 1) {
            //清空数据
            this.updateplan_state = 0;
            this.updateplan_id = "";
            this.updateplan_periodtype = "";
            this.updateplan_begin = "";
            this.updateplan_end = "";
            this.updateplan_regionname = "";
            this.updateplan_regionid = "";

        }


        //清除数据
        //   this.user_id = "";
        this.periodid = "";
        this.plan_begindate = "";
        this.plan_enddate = "";
        if (this.missionauditInfoGraphicLayer) {
            this.missionauditInfoGraphicLayer.clear();
        }
        if (this.templanregion) {

            this.templanregion.clear();
        }
        if (this.missionaudit_planpoint_clusterLayer != null) {
            this.map.removeLayer(this.missionaudit_planpoint_clusterLayer);
            this.missionaudit_planpoint_clusterLayer = null
        }
        this.regionid = "";
        //重新查询
        //进入步骤二
        //查询当前用户具体的任务安排
        this.domObj.empty();
        this.domObj.append(this.template.split('$$')[1]);
        this.initEvent2();
        //查询某个人计划列表
        // this.getMissionAudit(this.config.pagenumber, this.config.pagesize, this.user_id);
        that.getMissionAudit(that.currentpage, this.config.pagesize, this.region_id, this.depid, this.user_id, this.plan_begindate, this.plan_enddate);


        this.domObj.find(".halfpaneltable").height(this.halfpaneltable_height);




    }


    //查询转移记录

    getTransferPlan(id) {
        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.GetTransferPlanInfo + id,
            data: {
                "pageindex": this.config.pagenumber,
                "pagesize": 1000 || this.config.pagesize,
                "id": id,
                // f: "pjson"
            },
            success: this.getTransferPlanCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
                this.hideLoading();
            }.bind(this),
            dataType: "json",
        });
    }

    getTransferPlanCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("查询片区巡检点信息出错！");
            console.log(results.message);
            this.hideLoading();
            return;
        }
        // //添加巡检点图层
        // this.map.infoWindow.resize(400, 260);
        // this.addClusters(results.result.points);
        //定位才绘制



        var domtb = this.domObj.find(".planslist")
        domtb.empty();
        var address;
        var html_trs_data = "";
        var state = "";
        $.each(results.result, function (i, item) {

            // if (item.isover == 0) {
            //     state = "未完成"
            // } else {
            //     state = "完成"
            // }
            // html_trs_data += "<tr class=goto data-plan_id='" + item.plan_id + "' data-geometry='" + item.geometry + "' ><td>" + item.device_type_name + "</td> <td>" + item.point_name + "</td><td>" + item.address + "</td><td>" + item.regionname + "</td><td>" + state + "</td></tr>";


            state = "";
            if (item.check_state == 1) {
                state = "同意"
            } else if (item.check_state == 0) {
                state = "不同意"
            }

            // html_trs_data += "<tr class=goto data-plan_id='" + item.plan_id + "' data-geometry='" + item.geometry + "' ><td>" + item.device_type_name + "</td> <td>" + item.point_name + "</td><td>" + item.address + "</td><td>" + item.regionname + "</td><td>" + state + "</td>" + strcontent + "</tr>";
            html_trs_data += "<tr class=goto  ><td>" + item.apply_username + "</td> <td >" + item.apply_time + "</td><td>" + item.check_user + "</td><td>" + item.check_time + "</td><td>" + state + "</td><td>" + item.check_note + "</td><td>" + item.replace_username + "</td></tr>";



        }.bind(this));


        domtb.append(html_trs_data);



        // this.domObj.find(".pagecontrol").text("总共" + results.result.point.length + "条记录");
        this.domObj.find(".pagecontrol").text("总共" + results.result.length + "条记录");
        // this.domObj.find(".content").text("第" + that.currentpage + "页共" + that.totalpage + "页");
        if (results.result.length == 0) {
            this.domObj.find(".content").text("无数据");
            this.domObj.find(".pagecontrol").text("总共-条记录");
            // this.domObj.find(".content").text("第-页共-页");
        }


        //定位才绘制

        // 选中行高亮
        this.domObj.off("click").on('click', 'tbody tr', (e) => {
            if ($(e.currentTarget).data("plan_id") == null) {
                return;
            } else {


            }
            this.domObj.find('tr.active').removeClass('active');
            $(e.currentTarget).addClass('active');


            //定位

            if ($(e.currentTarget).data("geometry").hasOwnProperty("paths")) {

                var polylineJson = {
                    "paths": $(e.currentTarget).data("geometry").paths,
                    "spatialReference": { "wkid": this.map.spatialReference.wkid }
                };
                var mappolyline = new Polyline(polylineJson);
                this.map.centerAndZoom(mappolyline.getExtent().getCenter(), 14);

                this.missionaudit_plandetail_polylinelayer.clear();
                this.missionaudit_plandetail_polylinelayer.add(new Graphic(mappolyline, this.setGraphSymbol("polyline")));

            } else {
                var mapPoint = new Point({ "x": $(e.currentTarget).data("geometry").x, "y": $(e.currentTarget).data("geometry").y, "spatialReference": { "wkid": this.map.spatialReference.wkid } });
                this.map.centerAndZoom(mapPoint, 9);

                this.missionaudit_plandetail_pointlayer.clear();
                this.missionaudit_plandetail_pointlayer.add(new Graphic(mapPoint, this.setGraphSymbol("point")));

            }



        });






        this.hideLoading();






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
                // "handle_user_id": handle_user_id,
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
        var strregion_names = "<option value='' selected>全部</option>";
        $.each(results.result.rows, function (index, item) {
            strregion_names += "<option value=" + item.regionid + " > " + item.regionname + " </option>";

        }.bind(this));
        region_names.append(strregion_names);

        //  this.addPolygonGraphic(results);
        this.domObj.find(".region_name").val(this.region_id);






    }


    getRegionInfo(id) {
        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getRegionInfo,
            data: {
                "pageindex": this.config.pagenumber,
                "pagesize": 1000 || this.config.pagesize,
                "region_id": id,
                // f: "pjson"
            },
            success: this.getRegionInfoCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    getRegionInfoCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("查询片区巡检点信息出错！");
            console.log(results.message);
            return;
        }
        //添加巡检点图层
        this.map.infoWindow.resize(400, 260);
        this.addClusters(results.result.points);





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
                "depid": this.depid,
                "patrol_type": this.planmode,
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
        var strusers = "<option value='' selected>全部</option>";
        $.each(results.result.rows, function (index, item) {
            strusers += "<option value=" + item.userid + " > " + item.username + " </option>";

        }.bind(this));
        users.append(strusers);


        this.domObj.find(".users").val(this.user_id);


    }



    getGroup() {

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
                "pagesize": 1000 || this.config.pagesize,
                // f: "pjson"
            },
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



        var department = this.domObj.find(".department").empty();
        var strdepartment = "<option value='' selected>全部</option>";
        $.each(results.result.rows, function (index, item) {
            strdepartment += "<option value=" + item.id + "> " + item.name + " </option>";

        }.bind(this));
        department.append(strdepartment);

        this.domObj.find(".department").val(this.depid);


    }


    //高亮定位,并显示属性
    Goto(url, layerid, geometry, type, where) {
        var queryTask = new QueryTask(url + "/" + layerid);
        var query = new Query();
        query.returnGeometry = true;
        query.outFields = ["OLDNO", "SUBTYPE", "DISTRICT"];
        query.where = where;
        // query.where = "1 =1";
        // query.where = "OBJECTID =" + objid;  // Return all cities with a population greater than 1 million
        query.geometry = geometry;
        query.spatialRelationship = Query.SPATIAL_REL_INTERSECTS;
        var that = this;
        queryTask.execute(query, function (results) {
            this.devices = results;
            if (results == null || results.features.length == 0) {
                if (this.missionaudit_devicepoint_clusterLayer != null) {
                    // this.missionaudit_planpoint_clusterLayer.clear();
                    this.map.removeLayer(this.missionaudit_devicepoint_clusterLayer);
                    this.missionaudit_devicepoint_clusterLayer = null;
                    return;
                }
            }

            results.features[0].symbol = that.setGraphSymbol(results.features[0].geometry.type);
            // that.glayer.clear();
            // that.glayer.add(results.features[0]);
            this.addQuerydataClusters(results, type);
            //that.map.centerAndZoom(location,12);
            // if (results.features[0].geometry.type == "point") {
            //     that.map.centerAndZoom(results.features[0].geometry, 16);

            // } else if (results.features[0].geometry.type == "polyline") {
            //     var x = (results.features[0].geometry.paths[0][0][0] + results.features[0].geometry.paths[0][1][0]) / 2
            //     var y = (results.features[0].geometry.paths[0][0][1] + results.features[0].geometry.paths[0][1][1]) / 2
            //     var point = new Point(x, y, new SpatialReference({ wkid: that.map.spatialReference.wkid }));
            //     that.map.centerAndZoom(point, 16);
            // }
            //显示所选的要素的属性
            // this.attrannotation({ feature: results.features[0], alias: results.fieldAliases });
        }.bind(this));
    }

    //设置点、线或多边形的样式
    setGraphSymbol(type) {

        var symbol = {
            "SimpleMarkerSymbol": null,
            "SimpleLineSymbol": null,
            "SimpleFillSymbol": null,
        };
        switch (type) {
            case "point":
                // symbol.SimpleMarkerSymbol = new SimpleMarkerSymbol(
                //     {
                //         color: new Color(this.config.color),
                //         style: "diamond",       //点样式solid\cross\square|diamond|circle|x
                //         outline: {
                //             color: new Color(this.config.color),
                //             width: 0.2
                //         }
                //     }
                // );
                symbol.SimpleMarkerSymbol = new PictureMarkerSymbol(this.config.MarkPictureSymbol, 48, 48);

                break;
            case "polyline":
                symbol.SimpleLineSymbol = new SimpleLineSymbol({
                    color: new Color(this.config.color),
                    style: "solid",   //线的样式 dash|dash-dot|solid等	
                    width: 3
                });
                break;

            case "polygon":
                // symbol.SimpleFillSymbol = new SimpleFillSymbol({
                //     color: new Color([0, 0, 0, 0.1]),
                //     style: "solid",
                //     outline: {
                //         color: new Color(this.config.color),
                //         width: 1

                //     }
                // });

                symbol.SimpleFillSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color(this.config.color), 2), new Color([255, 255, 255, 0.3]));

                break;
        }
        if (symbol.SimpleMarkerSymbol != null) {
            return symbol.SimpleMarkerSymbol;
        } else if (symbol.SimpleLineSymbol != null) {
            return symbol.SimpleLineSymbol;
        } else {
            return symbol.SimpleFillSymbol;
        }
    }

    //显示
    addQuerydataClusters(querydata, type) {
        var photoInfo = { "data": [] };
        var wgs = new SpatialReference({
            "wkid": this.map.spatialReference.wkid
        });
        photoInfo.data = arrayUtils.map(querydata.features, function (p) {

            var attributes = {
                "Caption": p.attributes.DISTRICT,
                "Type": p.attributes.SUBTYPE,
                "Code": p.attributes.CODE,
                // "code": p.attributes.CODE,
                "Address": p.attributes.DISTRICT,
            };
            return {
                "x": p.geometry.x - 0,
                "y": p.geometry.y - 0,
                "attributes": attributes
            };
        }.bind(this));

        var popupTemplate2 = new PopupTemplate({});

        popupTemplate2.setContent("<h5>标题：${Caption}</h5><h5>内容：${Type}</h5><h5>");

        // cluster layer that uses OpenLayers style clustering
        if (this.missionaudit_devicepoint_clusterLayer != null) {
            // this.missionaudit_devicepoint_clusterLayer.clear();
            this.map.removeLayer(this.missionaudit_devicepoint_clusterLayer);
            this.missionaudit_devicepoint_clusterLayer = null
        }
        this.missionaudit_devicepoint_clusterLayer = new ClusterLayer({
            "basemap": this.map,
            "data": photoInfo.data,
            "distance": 10,
            "id": "missionaudit_planpoint_clusters",
            "labelColor": "#fff",
            "labelOffset": 10,
            "resolution": this.map.extent.getWidth() / this.map.width,
            "singleColor": "#888",
            "singleTemplate": popupTemplate2,
            "spatialReference": wgs
        });
        var defaultSym = new SimpleMarkerSymbol().setSize(4);
        var renderer = new ClassBreaksRenderer(defaultSym, "clusterCount");
        if (this.plan_type_id == 2) {
            var blue = new PictureMarkerSymbol(this.config.MarkPictureSymbol_tyx, 32, 32).setOffset(0, 15);
            renderer.addBreak(0, 10000, blue);//范围放大点，用一种图标渲染
        } else if (this.plan_type_id == 2) {
            var blue = new PictureMarkerSymbol(this.config.MarkPictureSymbol_tyg, 32, 32).setOffset(0, 15);
            renderer.addBreak(0, 10000, blue);//范围放大点，用一种图标渲染
        } else if (this.plan_type_id == 4) {
            var blue = new PictureMarkerSymbol(this.config.MarkPictureSymbol_fj, 32, 32).setOffset(0, 15);
            renderer.addBreak(0, 10000, blue);//范围放大点，用一种图标渲染
        } else {
            var blue = new PictureMarkerSymbol(this.config.MarkPictureSymbol, 32, 32).setOffset(0, 15);
            renderer.addBreak(0, 10000, blue);//范围放大点，用一种图标渲染
        }

        this.missionaudit_devicepoint_clusterLayer.setRenderer(renderer);

        this.map.addLayer(this.missionaudit_devicepoint_clusterLayer);

    }


    //显示
    addClusters(resp) {
        var photoInfo = { "data": [] };
        var wgs = new SpatialReference({
            "wkid": this.map.spatialReference.wkid
        });
        photoInfo.data = arrayUtils.map(resp, function (p) {

            var attributes = {
                "Caption": p.point_name,
                "Address": p.address,
            };
            return {
                "x": p.lng - 0,
                "y": p.lat - 0,
                "attributes": attributes
            };
        }.bind(this));

        var popupTemplate2 = new PopupTemplate({});

        popupTemplate2.setContent("<h5>标题：${Caption}</h5><h5>内容：${Address}</h5><h5>");

        // cluster layer that uses OpenLayers style clustering
        if (this.missionaudit_planpoint_clusterLayer != null) {
            // this.missionaudit_planpoint_clusterLayer.clear();
            this.map.removeLayer(this.missionaudit_planpoint_clusterLayer);
            this.missionaudit_planpoint_clusterLayer = null;
        }
        this.missionaudit_planpoint_clusterLayer = new ClusterLayer({
            "basemap": this.map,
            "data": photoInfo.data,
            "distance": 10,
            "id": "missionaudit_planpoint_clusters",
            "labelColor": "#fff",
            "labelOffset": 10,
            "resolution": this.map.extent.getWidth() / this.map.width,
            "singleColor": "#888",
            "singleTemplate": popupTemplate2,
            "spatialReference": wgs
        });
        var defaultSym = new SimpleMarkerSymbol().setSize(4);
        var renderer = new ClassBreaksRenderer(defaultSym, "clusterCount");
        var blue = new PictureMarkerSymbol(this.config.MarkPictureSymbol, 32, 32).setOffset(0, 15);
        renderer.addBreak(0, 10000, blue);//范围放大点，用一种图标渲染
        this.missionaudit_planpoint_clusterLayer.setRenderer(renderer);

        this.map.addLayer(this.missionaudit_planpoint_clusterLayer);

    }


    getEndDate() {
        // //产生一个随机的数字 0-23 
        // var H = Math.round(Math.random() * 23);
        // if (H < 10) { H = '0' + H; }
        // //返回 '^' + 数字
        // return '^' + H;
        var enddays = "";
        for (var i = 2; i++; i < 10) {
            var end = new Date(this.startime_my97).getTime() + this.startime_type * 24000 * 3600 * 2;
            var endday = new Date();
            endday.setTime(end);
            enddays += endday + ",";
        }

        return enddays.substr(0, enddays.length - 1);

    }




    cweekday(wday) {
        var hzWeek = new Array("日", "一", "二", "三", "四", "五", "六", "日");
        return hzWeek[wday];
    }


    //设置点的样式
    setSymbol(txt?) {
        var symbol = [];
        var fillSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASHDOT, new Color([255, 0, 0]), 2), new Color([0, 0, 0, 0.3]));
        var fillSymbol2 = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([255, 255, 0]), 2), new Color([255, 255, 255, 0.3]));

        var peopleSymbol = new PictureMarkerSymbol(this.config.MarkPictureSymbol, 24, 24);
        //根据字长度设置背景图片宽度
        var peopletextSymbol = new PictureMarkerSymbol(this.config.TextbgSymbol, txt == null ? 0 : txt.length * 90 / 6, 18);
        symbol.push(peopleSymbol);
        symbol.push(peopletextSymbol);
        symbol.push(fillSymbol);
        symbol.push(fillSymbol2);
        return symbol;
    }

    //加载等待。。。
    showLoading() {
        var lbgobj = this.domObj.find(".loadingbg");
        if (lbgobj.length == 0)
            this.domObj.append(this.template.split('$$')[6]);
        else
            lbgobj.show();
    }
    //关闭等待。。。
    hideLoading() {
        var lbgobj = this.domObj.find(".loadingbg");
        if (lbgobj.length > 0) {
            lbgobj.hide();
        }
    }




    destroy() {
        if (this.missionauditInfoGraphicLayer) {
            this.map.removeLayer(this.missionauditInfoGraphicLayer);
            this.missionauditInfoGraphicLayer.clear();
        }
        if (this.missionaudit_plandetail_polylinelayer) {
            this.map.removeLayer(this.missionaudit_plandetail_polylinelayer);
            this.missionaudit_plandetail_polylinelayer.clear();
        }
        if (this.missionaudit_plandetail_pointlayer) {
            this.map.removeLayer(this.missionaudit_plandetail_pointlayer);
            this.missionaudit_plandetail_pointlayer.clear();
        }
        if (this.missionaudit_plandetail_polylinelayer_gl) {
            this.map.removeLayer(this.missionaudit_plandetail_polylinelayer_gl);
            this.missionaudit_plandetail_polylinelayer_gl.clear();
        }
        if (this.missionaudit_plandetail_pointlayer_gl) {
            this.map.removeLayer(this.missionaudit_plandetail_pointlayer_gl);
            this.missionaudit_plandetail_pointlayer_gl.clear();
        }

        if (this.missionaudit_planpoint_clusterLayer) {
            this.map.removeLayer(this.missionaudit_planpoint_clusterLayer);
        }
        if (this.missionaudit_devicepoint_clusterLayer) {
            this.map.removeLayer(this.missionaudit_devicepoint_clusterLayer);
        }



        if (this.missionaudit_planregionInfoGraphicLayer) {
            this.map.removeLayer(this.missionaudit_planregionInfoGraphicLayer);
        }

        this.domObj.remove();
        this.afterDestroy();
    }

}