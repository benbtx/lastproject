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

import Polyline = require('esri/geometry/Polyline');

import Save2File = require('./Save2File');



export = PlansSearch;

class PlansSearch extends BaseWidget {
    baseClass = "widget-planssearch";
    map = null;
    toast = null;
    totalpage = 1;
    currentpage = 1;

    childplan_current_page = 1;

    Plan_list_currentpage = 1;

    currentpagesize = 25;
    curentplansmanagementtypeid = "";
    plansmanagementInfoGraphicLayer: GraphicsLayer;
    templansmanagement: GraphicsLayer;
    jsongeometry = "";
    editgeometry: Point;
    editid = "";
    polygonid = "";

    regionid = "";
    userid = "";
    depid = "";
    company = "";
    plan_state = "";
    plan_begindate = "";
    plan_enddate = "";
    isvalid = "";

    curpage = "";

    plan_id = "";
    child_plan_id = "";
    plan_name = "";
    address = "";
    notes = "";
    device_type_id = "";
    plantypeid = "";
    peroid = "";
    planpoint_clusterLayer = null;//数据库中的疑问标识

    plandetail_polylinelayer: GraphicsLayer;
    plandetail_pointlayer: GraphicsLayer;

    startup() {
        this.configure();
        this.initHtml();
        this.initEvent();

    }
    initHtml() {

        // var html = _.template(this.template)();
        // var html = _.template(this.template.split('$$')[0] + "</div>")();
        var html = _.template(this.template.split('$$')[0] + "</div>")({ range: AppX.appConfig.range.split(";")[0], depid: AppX.appConfig.groupid });
        // var html = _.template(this.template.split('$$')[0])();
        // this.setHtml(html);
        this.setHtml(html);
        this.ready();
        this.configTimes();
        this.showLoading();
        if (AppX.appConfig.range.split(";")[0] == "00") {
            if (AppX.appConfig.groupid == "") {
                this.domObj.find('.dep').attr("disabled", "true");
                this.domObj.find('.dep').css("background-color", "gray");

            }

        }

        this.getPlansManagement(this.config.pagenumber, this.currentpagesize, this.regionid, this.company, this.depid, this.userid, this.plan_state, this.isvalid, this.plan_begindate, this.plan_enddate, this.plantypeid, this.peroid);



    }

    configure() {
        this.toast = this.AppX.runtimeConfig.toast;
        this.map = this.AppX.runtimeConfig.map;
        this.depid = AppX.appConfig.groupid;
        // this.company = AppX.appConfig.departmentid;
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


        if (this.map.getLayer("plandetail_polylinelayer")) {
            return;
        } else {
            var plandetail_polylinelayer = new GraphicsLayer();
            plandetail_polylinelayer.id = "plandetail_polylinelayer";
            this.plandetail_polylinelayer = plandetail_polylinelayer;
            this.map.addLayer(plandetail_polylinelayer);
        }


        if (this.map.getLayer("plandetail_pointlayer")) {
            return;
        } else {
            var plandetail_pointlayer = new GraphicsLayer();
            plandetail_pointlayer.id = "plandetail_pointlayer";
            this.plandetail_pointlayer = plandetail_pointlayer;
            this.map.addLayer(plandetail_pointlayer);
        }
    }

    configTimes() {
        $.jeDate(".plan_begindate", {
            format: 'YYYY/MM/DD', //日期格式  
            isinitVal: false
        });
        $.jeDate(".plan_enddate", {
            format: 'YYYY/MM/DD', //日期格式  
            isinitVal: false
        });
    }


    getPlansManagementListCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("查询巡检计划信息出错！");
            console.log(results.message);
            this.hideLoading();
            return;
        }

        if (results.result.total % that.currentpagesize == 0) {
            this.totalpage = Math.floor(parseInt(results.result.total) / that.currentpagesize);

        } else {
            this.totalpage = Math.floor(parseInt(results.result.total) / that.currentpagesize) + 1;

        }


        //为分页控件添加信息

        this.domObj.find(".pagecontrol").text("总共" + results.result.total + "条记录，每页默认显示" + that.currentpagesize + "条记录");
        this.domObj.find(".content").text("第" + that.currentpage + "页共" + that.totalpage + "页");
        if (that.totalpage == 0) {
            this.domObj.find(".content").text("无数据");
            this.domObj.find(".pagecontrol").text("总共-条记录，每页默认显示" + that.currentpagesize + "条记录");
            this.domObj.find(".content").text("第-页共-页");
        }

        //生成table ,并给分页控件赋值事件




        // this.currentpage = results.result.pageindex;
        //动态生成书签及分页控件
        var domtb = this.domObj.find(".addplan")
        domtb.empty();
        var address;
        var html_trs_data = "";
        var checkstate = "";
        var checknote = "";
        var percent = "";
        this.curpage = results.result.rows;
        $.each(results.result.rows, function (i, item) {
            checkstate = "";
            if (item.isvalid == 0) {
                checkstate = "未审核";
            } else if (item.isvalid == 1) {
                checkstate = "通过审核 ";
            } else if (item.isvalid == 2) {
                checkstate = "未通过审核";
            }

            percent = "未完成";

            if (item.percent == null || item.percent == "") {
                percent = "0%";
            } else if (item.percent == 1) {
                percent = "100%";
            } else {
                percent = (item.percent * 100).toFixed(2) + "%";
            }

            checknote = "未完成";

            if (item.check_note.length > 5) {
                checknote = item.check_note.substr(0, 4) + "...";
            } else {
                checknote = item.check_note;
            }
            // item.transfer_state = 1;
            item.plan_state != 7;
            if (item.transfer_state == 0) {

                // html_trs_data += "<tr class=goto data-geometry='" + item.geometry + "' data-plan_id='" + item.plan_id + "' data-device_type_id='" + item.device_type_id + "'  data-regionid='" + item.region_id + "' data-user_id='" + item.user_id + "' data-regionname='" + item.region_name + "' data-notes='" + item.notes + "'></td><td>" + item.region_name + "</td><td>" + item.device_type_name + "</td><td>" + item.user_name + "</td><td>" + item.create_user + "</td><td>" + item.check_user + "</td><td title='" + item.check_note + "'>" + checknote + "</td><td>" + item.plan_begindate.split(" ")[0] + "</td><td>" + item.plan_enddate.split(" ")[0] + "</td><td>" + item.period_name + "</td><td>" + checkstate + "</td><td>" + item.plan_process_name + "</td><td>" + percent + "</td><td></td></tr>";
                if (AppX.appConfig.range.split(";")[0] == "00") {
                    var companyname = item.company_name;
                    if (companyname.length > 6) {

                        html_trs_data += "<tr class=goto data-geometry='" + item.geometry + "' data-plan_id='" + item.plan_id + "' data-device_type_id='" + item.device_type_id + "'  data-regionid='" + item.region_id + "' data-user_id='" + item.user_id + "' data-regionname='" + item.region_name + "' data-notes='" + item.notes + "'></td><td>" + item.region_name + "</td><td>" + item.device_type_name + "</td><td>" + item.user_name + "</td><td>" + item.create_user + "</td><td>" + item.plan_begindate.split(" ")[0] + "</td><td>" + item.plan_enddate.split(" ")[0] + "</td><td>" + item.period_name + "</td><td title=" + companyname + ">" + companyname.substr(0, 6) + "..." + "</td><td>" + item.isovertototal + "</td><td>" + item.plan_process_name + "</td><td>" + percent + "</td><td><a class='operation' data-child_plan_id='" + item.child_plan_id + "' data-device_type_id='" + item.device_type_id + "'>详情</a></td></tr>";

                    } else {

                        html_trs_data += "<tr class=goto data-geometry='" + item.geometry + "' data-plan_id='" + item.plan_id + "' data-device_type_id='" + item.device_type_id + "'  data-regionid='" + item.region_id + "' data-user_id='" + item.user_id + "' data-regionname='" + item.region_name + "' data-notes='" + item.notes + "'></td><td>" + item.region_name + "</td><td>" + item.device_type_name + "</td><td>" + item.user_name + "</td><td>" + item.create_user + "</td><td>" + item.plan_begindate.split(" ")[0] + "</td><td>" + item.plan_enddate.split(" ")[0] + "</td><td>" + item.period_name + "</td><td title=" + companyname + ">" + companyname + "</td><td>" + item.isovertototal + "</td><td>" + item.plan_process_name + "</td><td>" + percent + "</td><td><a class='operation' data-child_plan_id='" + item.child_plan_id + "' data-device_type_id='" + item.device_type_id + "'>详情</a></td></tr>";

                    }

                } else {

                    html_trs_data += "<tr class=goto data-geometry='" + item.geometry + "' data-plan_id='" + item.plan_id + "' data-device_type_id='" + item.device_type_id + "'  data-regionid='" + item.region_id + "' data-user_id='" + item.user_id + "' data-regionname='" + item.region_name + "' data-notes='" + item.notes + "'></td><td>" + item.region_name + "</td><td>" + item.device_type_name + "</td><td>" + item.user_name + "</td><td>" + item.create_user + "</td><td>" + item.plan_begindate.split(" ")[0] + "</td><td>" + item.plan_enddate.split(" ")[0] + "</td><td>" + item.period_name + "</td><td>" + item.isovertototal + "</td><td>" + item.plan_process_name + "</td><td>" + percent + "</td><td><a class='operation' data-child_plan_id='" + item.child_plan_id + "' data-device_type_id='" + item.device_type_id + "'>详情</a></td></tr>";

                }

            } else {
                // html_trs_data += "<tr class=goto data-geometry='" + item.geometry + "' data-plan_id='" + item.plan_id + "' data-device_type_id='" + item.device_type_id + "'  data-regionid='" + item.region_id + "' data-user_id='" + item.user_id + "' data-regionname='" + item.region_name + "' data-notes='" + item.notes + "'></td><td>" + item.region_name + "</td><td>" + item.device_type_name + "</td><td>" + item.user_name + "</td><td>" + item.create_user + "</td><td>" + item.check_user + "</td><td title='" + item.check_note + "'>" + checknote + "</td><td>" + item.plan_begindate.split(" ")[0] + "</td><td>" + item.plan_enddate.split(" ")[0] + "</td><td>" + item.period_name + "</td><td>" + checkstate + "</td><td>" + item.plan_process_name + "</td><td>" + percent + "</td><td><a class='operation' data-plan_id='" + item.plan_id + "' >详情</a></td></tr>";

                if (AppX.appConfig.range.split(";")[0] == "00") {
                    //<td><a class='zyjl' data-child_plan_id='" + item.child_plan_id + "'>详情</a></td>
                    var companyname = item.company_name;
                    if (companyname.length > 6) {
                        html_trs_data += "<tr class=goto data-geometry='" + item.geometry + "' data-plan_id='" + item.plan_id + "' data-device_type_id='" + item.device_type_id + "'  data-regionid='" + item.region_id + "' data-user_id='" + item.user_id + "' data-regionname='" + item.region_name + "' data-notes='" + item.notes + "'></td><td>" + item.region_name + "</td><td>" + item.device_type_name + "</td><td>" + item.user_name + "</td><td>" + item.create_user + "</td><td>" + item.plan_begindate.split(" ")[0] + "</td><td>" + item.plan_enddate.split(" ")[0] + "</td><td>" + item.period_name + "</td><td title=" + companyname + ">" + companyname.substr(0, 6) + "..." + "</td><td>" + item.isovertototal + "</td><td>" + item.plan_process_name + "</td><td>" + percent + "</td><td><a class='operation' data-child_plan_id='" + item.child_plan_id + "' data-device_type_id='" + item.device_type_id + "'>详情</a></td></tr>";

                    } else {
                        html_trs_data += "<tr class=goto data-geometry='" + item.geometry + "' data-plan_id='" + item.plan_id + "' data-device_type_id='" + item.device_type_id + "'  data-regionid='" + item.region_id + "' data-user_id='" + item.user_id + "' data-regionname='" + item.region_name + "' data-notes='" + item.notes + "'></td><td>" + item.region_name + "</td><td>" + item.device_type_name + "</td><td>" + item.user_name + "</td><td>" + item.create_user + "</td>td>" + item.plan_begindate.split(" ")[0] + "</td><td>" + item.plan_enddate.split(" ")[0] + "</td><td>" + item.period_name + "</td><td title=" + companyname + ">" + companyname + "</td><td>" + item.isovertototal + "</td><td>" + item.plan_process_name + "</td><td>" + percent + "</td><td><a class='operation' data-child_plan_id='" + item.child_plan_id + "' data-device_type_id='" + item.device_type_id + "'>详情</a></td></tr>";

                    }

                } else {
                    html_trs_data += "<tr class=goto data-geometry='" + item.geometry + "' data-plan_id='" + item.plan_id + "' data-device_type_id='" + item.device_type_id + "'  data-regionid='" + item.region_id + "' data-user_id='" + item.user_id + "' data-regionname='" + item.region_name + "' data-notes='" + item.notes + "'></td><td>" + item.region_name + "</td><td>" + item.device_type_name + "</td><td>" + item.user_name + "</td><td>" + item.create_user + "</td><td>" + item.plan_begindate.split(" ")[0] + "</td><td>" + item.plan_enddate.split(" ")[0] + "</td><td>" + item.period_name + "</td><td>" + item.isovertototal + "</td><td>" + item.plan_process_name + "</td><td>" + percent + "</td><td><a class='operation' data-child_plan_id='" + item.child_plan_id + "' data-device_type_id='" + item.device_type_id + "'>详情</a></td></tr>";

                }


            }




            //刷新infowindow
            // this.setContent(item);
        }.bind(this));
        domtb.append(html_trs_data);


        var html_trs_blank = "";
        if (results.result.rows.length < that.currentpagesize) {
            var num = that.currentpagesize - results.result.rows.length;
            for (var i = 0; i < num; i++) {
                html_trs_blank += "<tr class=goto><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>";
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
            this.domObj.append(this.template.split('$$')[2]);
            this.initEvent2();
            this.showLoading();
            //查询转移记录
            this.getTransferPlan(this.child_plan_id);
            this.domObj.find(".halfpaneltable").height(preheight);
        });

        this.domObj.find(".operation").off("click").on("click", (e) => {

            var preheight = this.domObj.find(".halfpaneltable").height();
            this.plan_id = $(e.currentTarget).data("plan_id");
            this.child_plan_id = $(e.currentTarget).data("child_plan_id");
            //触发行选中事件
            // this.domObj.find("tbody tr").trigger("click")
            //进入步骤二
            //查询当前用户具体的任务安排


            $.each(this.config.deviceForLayer, function (i, item) {
                if ($(e.currentTarget).data("device_type_id") == item.device_type_id) {
                    item.showfieldnames;

                    this.domObj.empty();
                    var htmlString = _.template(this.template.split('$$')[1])({ fields: item.showfieldnames });
                    this.domObj.append(htmlString);


                    this.initEvent2();
                    this.showLoading();

                    this.getChildPlanDetail(this.child_plan_id);


                }

            }.bind(this));



            this.domObj.find(".halfpaneltable").height(preheight);
        });




        //初始化片区
        this.getAllPlanRegion();


        this.getCompany();

        this.getGroup();

        //初始化人员
        this.getUser();

        this.getPlanType();

        this.getPeriod();

        //查询所有


        // this.getAllPlansManagement();
        // this.addPointGraphic(results);


        this.hideLoading();


    }


    initEvent() {
        var that = this;
        this.domObj.find('.btn-search').on("click", function () {

            this.regionid = this.domObj.find(".region_name option:selected").val()
            this.userid = this.domObj.find(".users option:selected").val();
            if (AppX.appConfig.groupid == "") {
                this.depid = this.domObj.find(".dep").val();
            }

            if (AppX.appConfig.range.split(";")[0] == "00") {
                if (AppX.appConfig.groupid == "") {
                    this.company = this.domObj.find(".company").val();
                }
            }




            this.plan_state = this.domObj.find(".plan_state option:selected").val();

            this.peroid = this.domObj.find(".periodid option:selected").val();

            this.plantypeid = this.domObj.find(".plantype option:selected").val();
            // this.plantypeid = this.domObj.find(".plantype option:selected").data("device_type_id");

            this.isvalid = this.domObj.find(".isvalid option:selected").val();
            this.plan_begindate = this.domObj.find(".plan_begindate").val();
            this.plan_enddate = this.domObj.find(".plan_enddate").val();

            if (this.regionid == '' && this.userid == '' && this.plan_begindate == '' && this.plan_enddate == '') {
                // name.addClass('has-error');
                // name.attr("placeholder", "不能为空！");
                // this.toast.Show("请输入查询条件！");
                // return;
            }

            this.showLoading();
            // this.getHiddenDanger(this.currentpage);
            this.getPlansManagement(this.config.pagenumber, this.currentpagesize, this.regionid, this.company, this.depid, this.userid, this.plan_state, this.isvalid, this.plan_begindate, this.plan_enddate, this.plantypeid, this.peroid);


        }.bind(this));

        this.domObj.find('.save2csv').off("click").on("click", function () {
            // var pong = new Howl({ src: ['http://localhost:3000/widgets/HiddenDangerSearch/1.mp3'] });
            // pong.play();
            //    var pong = new Howl({urls: ['http://www.javascriptoo.com/application/html/pong.wav']})
            //this.Save2File(this.data.tabs[this.getActiveTabIndex()]);
            Save2File(this.curpage);
            //查询出所有数据

        }.bind(this));

        this.domObj.find('.company').on("change", function () {
            //根据部门重新筛选用户
            this.company = this.domObj.find('.company option:selected').val();
            this.depid = "";
            this.userid = "";
            this.getGroup();
            this.getUser();

            if (this.company != "") {
                this.domObj.find('.dep').removeAttr("disabled");
                this.domObj.find('.dep').css("background-color", "white");

            }

            else {
                this.domObj.find('.dep').attr("disabled", "true");
                this.domObj.find('.dep').css("background-color", "gray");
            }

        }.bind(this));

        this.domObj.find('.dep').on("change", function () {
            //根据部门重新筛选用户
            this.depid = this.domObj.find('.dep option:selected').val();
            this.userid = "";
            // this.username = "";
            this.getUser();
        }.bind(this));


        //巡检类型变化--周期变化
        this.domObj.find(".plantype").on("change", function () {
            this.plan_type = this.domObj.find(".plantype option:selected").val();
            // this.getPeriod();

        }.bind(this));






        //动态生成书签及分页控件
        //分页控件fykj 向前、向后事件

        this.domObj.find(".pre").off("click").on("click", function () {
            if (this.currentpage - 1 > 0) {
                this.currentpage = this.currentpage - 1;
                this.showLoading();
                this.getPlansManagement(this.currentpage, this.currentpagesize, this.regionid, this.company, this.depid, this.userid, this.plan_state, this.isvalid, this.plan_begindate, this.plan_enddate, this.plantypeid, this.peroid);

            }

        }.bind(this));
        this.domObj.find(".next").off("click").on("click", function () {
            if (this.currentpage + 1 <= this.totalpage) {
                this.currentpage = this.currentpage + 1;
                this.showLoading();
                this.getPlansManagement(this.currentpage, this.currentpagesize, this.regionid, this.company, this.depid, this.userid, this.plan_state, this.isvalid, this.plan_begindate, this.plan_enddate, this.plantypeid, this.peroid);
            }
        }.bind(this));

        this.domObj.find(".pageturning").off("click").on("click", function () {
            var currpage = parseInt(this.domObj.find(".currpage").val());
            if (currpage <= this.totalpage && currpage >= 1) {
                this.currentpage = parseInt(this.domObj.find(".currpage").val());
                this.showLoading();
                // this.getPlansManagement(this.currentpage);
                this.getPlansManagement(this.currentpage, this.currentpagesize, this.regionid, this.company, this.depid, this.userid, this.plan_state, this.isvalid, this.plan_begindate, this.plan_enddate, this.plantypeid, this.peroid);

            }
        }.bind(this));


        // 选中行高亮
        this.domObj.off("click").on('click', 'tbody tr', (e) => {
            if ($(e.currentTarget).data("plan_id") == null) {
                return;
            } else {
                this.plan_id = $(e.currentTarget).data("plan_id");
                this.plan_name = $(e.currentTarget).data("plan_name");
                this.address = $(e.currentTarget).data("address");
                this.notes = $(e.currentTarget).data("notes");
                // this.regionid = $(e.currentTarget).data("regionid");
                this.device_type_id = $(e.currentTarget).data("device_type_id");

            }
            this.domObj.find('tr.active').removeClass('active');
            $(e.currentTarget).addClass('active');



            //定位
            var mapPolygon = new Polygon($(e.currentTarget).data("geometry"));
            //添加图层
            this.map.centerAndZoom(mapPolygon.getExtent().getCenter(), 11);

            //显示该区域
            var rows = [];
            rows[0] = { "regionid": $(e.currentTarget).data("regionid"), "regionname": $(e.currentTarget).data("regionname").toString(), "geometry": JSON.stringify($(e.currentTarget).data("geometry")) };
            var result = { "rows": rows };
            var results = { "result": result }
            that.addPolygonGraphic(results);




        });


        this.domObj.find(".dynamic_pagesize").off("change").on("change", function () {
            this.currentpagesize = parseInt(this.domObj.find(".dynamic_pagesize").val());
            //重新查询
            this.showLoading();
            //this.currentpage
            // this.getPlansManagement(this.config.pagenumber, this.currentpagesize, this.trouble_typeid, this.equid, this.handle_userid);
            this.getPlansManagement(1, this.currentpagesize, this.regionid, this.company, this.depid, this.userid, this.plan_state, this.isvalid, this.plan_begindate, this.plan_enddate, this.plantypeid, this.peroid);
            // this.getPlanPoint(this.config.pagenumber, parseInt(this.domObj.find(".dynamic_pagesize").val()));
            this.domObj.find(".halfpaneltable").height(this.domObj.find(".halfpaneltable").height());

        }.bind(this));







    }

    getPlansManagement(pagenumber, pagesize, region_id, company, depid, user_id, plan_state, isvalid, plan_begindate, plan_enddate, plantypeid, period_id) {
        this.currentpage = pagenumber || this.config.pagenumber;
        this.currentpagesize = pagesize || this.config.pagesize;
        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
                'range': AppX.appConfig.range,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getPlansManagementList,
            data: {
                "pageindex": this.currentpage || this.config.pagenumber,
                "pagesize": this.currentpagesize || this.config.pagesize,
                "region_id": region_id,
                "user_id": user_id,
                "depid": depid,
                "companyid": company,
                "plan_state": plan_state,
                "plan_begindate": plan_begindate,
                "plan_enddate": plan_enddate,
                "isvalid": isvalid,

                "device_type_id": plantypeid,
                "period_id": period_id,
                // "isvalid": 1,
                // f: "pjson"
            },
            success: this.getPlansManagementListCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
                this.hideLoading();
            }.bind(this),
            dataType: "json",
        });
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
            this.domObj.remove();
            // this.getPlansManagement(this.currentpage);
            this.getPlansManagement(this.config.pagenumber, this.currentpagesize, this.regionid, this.company, this.depid, this.userid, this.plan_state, this.isvalid, this.plan_begindate, this.plan_enddate, this.plantypeid, this.peroid);
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
            this.domObj.remove();
            // this.getPlanRegion(this.currentpage);
            this.getPlansManagement(this.config.pagenumber, this.currentpagesize, this.regionid, this.company, this.depid, this.userid, this.plan_state, this.isvalid, this.plan_begindate, this.plan_enddate, this.plantypeid, this.peroid);
            this.domObj.find(".content").text("第" + (this.config.pagenumber) + "页共" + this.totalpage + "页");
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
            //重新查询
            this.domObj.remove();
            // this.getPlanRegion(this.currentpage);
            this.getPlansManagement(this.config.pagenumber, this.currentpagesize, this.regionid, this.company, this.depid, this.userid, this.plan_state, this.isvalid, this.plan_begindate, this.plan_enddate, this.plantypeid, this.peroid);
            this.domObj.find(".content").text("第" + (this.config.pagenumber) + "页共" + this.totalpage + "页");

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
            this.domObj.remove();
            // this.getPlanRegion(this.currentpage);
            this.getPlansManagement(this.config.pagenumber, this.currentpagesize, this.regionid, this.company, this.depid, this.userid, this.plan_state, this.isvalid, this.plan_begindate, this.plan_enddate, this.plantypeid, this.peroid);
            this.domObj.find(".content").text("第" + (this.config.pagenumber) + "页共" + this.totalpage + "页");

        }





    }

    getAllPlanRegion() {
        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
                'range': AppX.appConfig.range,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getPlanRegionList,
            data: {
                "pageindex": this.config.pagenumber,
                "pagesize": 1000 || this.config.pagesize,

                "companyid": this.company,
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
        var strregion_names = "<option value='' selected>全部</option>";
        $.each(results.result.rows, function (index, item) {
            strregion_names += "<option value=" + item.regionid + " > " + item.regionname + " </option>";

        }.bind(this));
        region_names.append(strregion_names);


        this.domObj.find(".region_name").val(this.regionid);

        // this.addPolygonGraphic(results);



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

        var company = this.domObj.find(".company").empty();
        var strcompany = "<option value='' selected >全部</option>";
        $.each(results.result, function (index, item) {
            strcompany += "<option value=" + item.companyid + " > " + item.company_name + " </option>";

        }.bind(this));
        company.append(strcompany);


        this.domObj.find(".company").val(this.company);



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
                "companyid": this.company,
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
        var department = this.domObj.find(".dep").empty();
        var strdepartment = "<option value='' selected>全部</option>";
        $.each(results.result.rows, function (index, item) {
            strdepartment += "<option value='" + item.id + "'>" + item.name + "</option>";

        }.bind(this));
        department.append(strdepartment);

        this.domObj.find(".dep").val(this.depid);


    }

    getUser() {
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
                "pageindex": this.config.pagenumber,
                "pagesize": 1000 || this.config.pagesize,
                "companyid": this.company,
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



        var users = this.domObj.find(".users").empty();
        var strusers = "<option value='' selected>全部</option>";
        $.each(results.result.rows, function (index, item) {
            strusers += "<option value=" + item.userid + " > " + item.username + " </option>";

        }.bind(this));
        users.append(strusers);

        this.domObj.find(".users").val(this.userid);


    }


    /**
   * @function 获取巡检类型
   */
    getPlanType() {
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getPlanType,
            data: {
                "pageindex": this.config.pagenumber,
                "pagesize": 1000 || this.config.pagesize
            },
            success: this.getPlanTypeListCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }
    getPlanTypeListCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        }
        var plantype = this.domObj.find(".plantype").empty();
        var strplantype = "    <option value='' selected>请选择</option>";
        $.each(results.result.rows, function (index, item) {
            strplantype += "<option value='" + item.device_type_id + "' data-device_id='" + item.device_id + "'>" + item.name + "</option>";
        }.bind(this));
        plantype.append(strplantype);

        this.domObj.find(".plantype").val(this.plantypeid);

    }

    /**
     * @function 获取巡检周期
     */
    getPeriod() {
        var plantype = this.domObj.find(".plantype option:selected").val();
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getPeriod,
            data: {
                "pageindex": this.config.pagenumber,
                "pagesize": 1000 || this.config.pagesize,
                // "device_id": plantype
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
            that.toast.Show(results.message);
            return;
        }
        var period = this.domObj.find(".periodid").empty();
        var strperiod = "    <option value='' selected>请选择</option>";
        $.each(results.result, function (index, item) {
            strperiod += "<option value='" + item.period_id + "'  data-days='" + item.interval_days + "'>" + item.period_name + "</option>";
            if (index == 0) {
                this.domObj.find(".plan_enddate").attr("onfocus", "WdatePicker({minDate:'#F{$dp.$D(\\'d1007\\',{d:" + (item.interval_days - 1) + "});}'})");
            }
        }.bind(this));
        period.append(strperiod);
        this.domObj.find(".periodid").val(this.peroid);

    }




    //查询某个人的所有计划
    getChildPlan(pagenumber, pagesize, plan_id) {
        this.Plan_list_currentpage = pagenumber || this.config.pagenumber;
        this.currentpagesize = pagesize || this.config.pagesize;
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getChildPlansList,
            data: {
                "pageindex": pagenumber || this.config.pagenumber,
                "pagesize": this.currentpagesize || this.config.pagesize,
                "plan_id": plan_id,
                // "trouble_typeid": trouble_typeid,
                // "equid": equid,
                // "handle_userid": handle_userid,
                // "handle_state": 0,
                // f: "pjson"
            },
            success: this.getChildPlanListCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    getChildPlanListCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("查询巡检计划信息出错！");
            console.log(results.message);
            this.hideLoading();
            return;
        }
        //添加终端用户图层
        if (results.result.total % that.currentpagesize == 0) {
            this.totalpage = Math.floor(parseInt(results.result.total) / that.currentpagesize);

        } else {
            this.totalpage = Math.floor(parseInt(results.result.total) / that.currentpagesize) + 1;

        }
        if (results.result.rows.length != 0) {

        } else {
            that.toast.Show("无巡检计划！");
            return;
        }






        //为分页控件添加信息

        this.domObj.find(".pagecontrol").text("总共" + results.result.total + "条记录，每页默认显示" + that.currentpagesize + "条记录");
        this.domObj.find(".content").text("第" + that.Plan_list_currentpage + "页共" + that.totalpage + "页");
        if (that.totalpage == 0) {
            this.domObj.find(".content").text("无数据");
            this.domObj.find(".pagecontrol").text("总共-条记录，每页默认显示" + that.currentpagesize + "条记录");
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
            if (item.percent == null || item.percent == "") {
                percent = "0%";
            } else if (item.percent == 1) {
                percent = "100%";
            } else {
                percent = (item.percent * 100).toFixed(2) + "%";
            }


            // if (item.percent == 1) {
            //     percent = "完成";
            // }

            html_trs_data += "<tr class=goto data-plan_id='" + item.plan_id + "' data-user_id='" + item.user_id + "' data-percent='" + item.percent + "' data-plan_begindate='" + item.plan_begindate + "' data-plan_state='" + item.plan_state + "' data-check_state='" + item.check_state + "'><td>" + item.username + "</td><td>" + item.depname + "</td><td>" + item.period_name + "</td><td>" + item.regionname + "</td><td>" + item.child_begin_date.split(" ")[0] + "</td><td>" + item.child_end_date.split(" ")[0] + "</td><td>" + percent + "</td><td><a class='operation' data-plan_id='" + item.main_plan_id + "'  data-child_plan_id='" + item.child_plan_id + "' data-device_type_id='" + item.device_type_id + "' >详情</a></td></tr>";
            //刷新infowindow
            // this.setContent(item);
        }.bind(this));
        domtb.append(html_trs_data);


        var html_trs_blank = "";
        if (results.result.rows.length < that.currentpagesize) {
            var num = that.currentpagesize - results.result.rows.length;
            for (var i = 0; i < num; i++) {
                html_trs_blank += "<tr class=goto data-user_id='null'><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>";
            }
            domtb.append(html_trs_blank);
        }


        this.domObj.find(".operation").off("click").on("click", (e) => {

            var preheight = this.domObj.find(".halfpaneltable").height();
            // this.plan_id = $(e.currentTarget).data("plan_id");
            // //进入步骤二
            // //查询当前用户具体的任务安排



            // this.domObj.empty();
            // this.domObj.append(this.template.split('$$')[2]);
            // this.initEvent3();
            // this.getChildPlanDetail($(e.currentTarget).data("child_plan_id"));

            $.each(this.config.deviceForLayer, function (i, item) {
                if ($(e.currentTarget).data("device_type_id") == item.device_type_id) {
                    item.showfieldnames;

                    this.domObj.empty();
                    var htmlString = _.template(this.template.split('$$')[2])({ fields: item.showfieldnames });
                    this.domObj.append(htmlString);


                    this.initEvent3();
                    this.getChildPlanDetail($(e.currentTarget).data("child_plan_id"));


                }

            }.bind(this));








            this.domObj.find(".halfpaneltable").height(preheight);
        });









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



            if (item.check_state == 1) {
                state = "同意"
            } else {
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
                this.map.centerAndZoom(mappolyline.getExtent().getCenter(), 11);

                this.plandetail_polylinelayer.clear();
                this.plandetail_polylinelayer.add(new Graphic(mappolyline, this.setGraphSymbol("polyline")));

            } else {
                var mapPoint = new Point({ "x": $(e.currentTarget).data("geometry").x, "y": $(e.currentTarget).data("geometry").y, "spatialReference": { "wkid": this.map.spatialReference.wkid } });
                this.map.centerAndZoom(mapPoint, 11);

                this.plandetail_pointlayer.clear();
                this.plandetail_pointlayer.add(new Graphic(mapPoint, this.setGraphSymbol("point")));

            }



        });






        this.hideLoading();






    }



    //查询某个计划对应的点或线

    getChildPlanDetail(id) {
        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getChildPlanDetail + id,
            data: {
                "pageindex": this.config.pagenumber,
                "pagesize": 1000 || this.config.pagesize,
                "id": id,
                // f: "pjson"
            },
            success: this.getChildPlanDetailCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
                this.hideLoading();
            }.bind(this),
            dataType: "json",
        });
    }

    getChildPlanDetailCallback(results) {
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



            //定义详情事件
            $.each(this.config.deviceForLayer, function (i, ite) {
                if (item.device_type_id == ite.device_type_id) {

                    ite.showfields;
                    if (item.content != "") {
                        var con = item.content;
                        var con_json = JSON.parse(con);
                        var j = JSON.parse(item.content);
                        var strcontent = "";
                        for (var m = 0; m < ite.showfields.length; m++) {
                            // strcontent += "<td>" + JSON.parse(item.content)[ite.showfields[m]] + "</td>";
                            if (JSON.parse(item.content)[ite.showfields[m]] != null) {
                                if (JSON.parse(item.content)[ite.showfields[m]].length > 20) {
                                    strcontent += "<td title='" + JSON.parse(item.content)[ite.showfields[m]] + "'>" + JSON.parse(item.content)[ite.showfields[m]].substr(0, 20) + "..." + "</td>";
                                } else {
                                    strcontent += "<td>" + JSON.parse(item.content)[ite.showfields[m]] + "</td>";
                                }

                            } else {

                                strcontent += "<td>" + JSON.parse(item.content)[ite.showfields[m]] + "</td>";
                            }

                        }


                        if (item.isover == 0) {
                            state = "未完成"
                        } else {
                            state = "完成"
                        }

                        // html_trs_data += "<tr class=goto data-plan_id='" + item.plan_id + "' data-geometry='" + item.geometry + "' ><td>" + item.device_type_name + "</td> <td>" + item.point_name + "</td><td>" + item.address + "</td><td>" + item.regionname + "</td><td>" + state + "</td>" + strcontent + "</tr>";
                        html_trs_data += "<tr class=goto data-plan_id='" + item.plan_id + "' data-geometry='" + item.geometry + "' ><td>" + item.device_type_name + "</td> <td title='" + item.point_name + "'>" + (item.point_name.length >= 10 ? item.point_name.substr(0, 10) + "..." : item.point_name) + "</td><td title='" + item.address + "'>" + (item.address.length >= 10 ? item.address.substr(0, 10) + "..." : item.address) + "</td><td title='" + item.regionname + "'>" + (item.regionname.length >= 10 ? item.point_name.substr(0, 10) + "..." : item.regionname) + "</td><td>" + state + "</td>" + strcontent + "</tr>";


                    } else {
                        html_trs_data += "<tr class=goto data-plan_id='" + item.plan_id + "' data-geometry='" + item.geometry + "' data-device_type_name='" + item.device_type_name + "'><td>" + item.device_type_name + "</td> <td title='" + item.point_name + "'>" + (item.point_name.length >= 10 ? item.point_name.substr(0, 10) + "..." : item.point_name) + "</td><td title='" + item.address + "'>" + (item.address.length >= 10 ? item.address.substr(0, 10) + "..." : item.address) + "</td><td title='" + item.regionname + "'>" + (item.regionname.length >= 8 ? item.point_name.substr(0, 10) + "..." : item.regionname) + "</td><td>" + state + "</td></tr>";


                    }


                }

            }.bind(this));


        }.bind(this));


        domtb.append(html_trs_data);



        // this.domObj.find(".pagecontrol").text("总共" + results.result.point.length + "条记录");
        this.domObj.find(".pagecontrol").text("总共" + results.result.length + "条记录");
        this.domObj.find(".content").text("第" + that.currentpage + "页共" + that.totalpage + "页");

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
                this.map.centerAndZoom(mappolyline.getExtent().getCenter(), 11);

                this.plandetail_polylinelayer.clear();
                this.plandetail_polylinelayer.add(new Graphic(mappolyline, this.setGraphSymbol("polyline")));

            } else {
                var mapPoint = new Point({ "x": $(e.currentTarget).data("geometry").x, "y": $(e.currentTarget).data("geometry").y, "spatialReference": { "wkid": this.map.spatialReference.wkid } });
                this.map.centerAndZoom(mapPoint, 11);

                this.plandetail_pointlayer.clear();
                this.plandetail_pointlayer.add(new Graphic(mapPoint, this.setGraphSymbol("point")));


            }



        });








        this.hideLoading();




    }


    getPoint() {
        var that = this;
        //根据regionid，查询出当前所有点、线信息

        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getPointandPathList,
            data: {
                "region_id": this.regionid,
                "device_type_id": this.device_type_id,
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



    //步骤二事件
    initEvent2() {
        var that = this;


        this.domObj.find('.btn_return').off("click").on("click", function () {

            var preheight = this.domObj.find(".halfpaneltable").height();
            //清空数据
            this.planid = "";
            this.step3_plan_begindate = "";
            this.planstate = "";
            this.checkstate = "";
            //  this.planstate = "";
            // this.regionid = "";
            //  this.userid = "";

            if (this.plansmanagementInfoGraphicLayer) {
                this.plansmanagementInfoGraphicLayer.clear();
            }
            if (this.planpoint_clusterLayer != null) {
                this.planpoint_clusterLayer = null
            }
            //返回步骤一
            //查询所有用户具体的任务安排
            this.domObj.empty();
            var html = _.template(this.template.split('$$')[0] + "</div>")({ range: AppX.appConfig.range.split(";")[0], depid: AppX.appConfig.groupid });

            // var html = _.template(this.template.split('$$')[0] + "</div>")({ range: AppX.appConfig.range.split(";")[0] });
            this.domObj.append(html);

            // this.domObj.append(this.template.split('$$')[0].replace("<div class='widget-missionschedule'>", ""));
            this.initEvent();



            //查询某个人计划列表
            // this.userid = "";
            // this.getMissionSchedule(this.config.pagenumber, this.config.pagesize, "");


            this.domObj.find(".department").text(this.depname);
            this.domObj.find(".plan_state").val(this.plan_state);
            this.domObj.find(".plan_begindate").val(this.plan_begindate);
            this.domObj.find(".plan_enddate").val(this.plan_enddate);
            this.showLoading();

            this.getPlansManagement(this.currentpage, this.config.pagesize, this.regionid, this.company, this.depid, this.userid, this.plan_state, this.isvalid, this.plan_begindate, this.plan_enddate, this.plantypeid, this.peroid);
            // this.getPlansManagement(this.config.pagenumber, this.currentpagesize, this.regionid, this.userid, this.plan_state, this.plan_begindate, this.plan_enddate);



            this.domObj.find(".halfpaneltable").height(preheight);

        }.bind(this));

        //动态生成书签及分页控件
        //分页控件fykj 向前、向后事件

        this.domObj.find(".pre").off("click").on("click", function () {
            //清空数据

            this.step3_plan_begindate = "";
            this.planstate = "";
            this.checkstate = "";
            if (that.Plan_list_currentpage - 1 > 0) {
                that.Plan_list_currentpage = that.Plan_list_currentpage - 1;
                // that.getChildPlan(that.Plan_list_currentpage, that.config.pagesize, this.plan_id);
                this.getChildPlanDetail(this.child_plan_id);
                that.domObj.find(".content").text("第" + that.Plan_list_currentpage + "页共" + that.totalpage + "页");
            }

        }.bind(this));
        this.domObj.find(".next").off("click").on("click", function () {
            //清空数据

            this.step3_plan_begindate = "";
            this.planstate = "";
            this.checkstate = "";
            if (that.Plan_list_currentpage + 1 <= that.totalpage) {
                that.Plan_list_currentpage = that.Plan_list_currentpage + 1;
                // that.getChildPlan(that.Plan_list_currentpage, that.config.pagesize, this.plan_id);
                this.getChildPlanDetail(this.child_plan_id);
                that.domObj.find(".content").text("第" + that.Plan_list_currentpage + "页共" + that.totalpage + "页");

            }
        }.bind(this));


        this.domObj.find(".pageturning").off("click").on("click", function () {
            //清空数据
            this.step3_plan_begindate = "";
            this.planstate = "";
            this.checkstate = "";
            if (parseInt(that.domObj.find(".currpage").val()) <= that.totalpage && that.Plan_list_currentpage >= 1) {
                that.Plan_list_currentpage = parseInt(that.domObj.find(".currpage").val());
                // that.getChildPlan(that.Plan_list_currentpage, that.config.pagesize, this.plan_id);
                this.getChildPlanDetail(this.child_plan_id);
                that.domObj.find(".content").text("第" + that.Plan_list_currentpage + "页共" + that.totalpage + "页");
                //清除infowindow
            } else {
                that.domObj.find(".currpage").val("");
            }
        }.bind(this));

        // 选中行高亮
        this.domObj.off("click").on('click', 'tbody tr', (e) => {
            if ($(e.currentTarget).data("user_id") == null) {
                return;
            }
            this.domObj.find('tr.active').removeClass('active');
            $(e.currentTarget).addClass('active');
            this.child_plan_id = $(e.currentTarget).data("child_plan_id");

            //显示并定位


        });




    }


    //步骤三事件   详情
    initEvent3() {
        var that = this;




        this.domObj.find('.btn_return').off("click").on("click", function () {

            this.halfpaneltable_height = this.domObj.find(".halfpaneltable").height();



            //进入步骤二
            //查询当前用户具体的任务安排

            //清空数据
            this.plandetail_pointlayer.clear();
            this.plandetail_polylinelayer.clear();

            this.domObj.empty();
            this.domObj.append(this.template.split('$$')[1]);
            this.initEvent2();
            //查询某个人计划列表
            // this.getChildPlan(this.config.pagenumber, this.config.pagesize, this.plan_id);
            this.getChildPlanDetail(this.child_plan_id);



            this.domObj.find(".halfpaneltable").height(this.halfpaneltable_height);
        }.bind(this));





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
        if (this.planpoint_clusterLayer != null) {
            this.map.removeLayer(this.planpoint_clusterLayer);
            this.planpoint_clusterLayer = null
        }
        this.planpoint_clusterLayer = new ClusterLayer({
            "basemap": this.map,
            "data": photoInfo.data,
            "distance": 10,
            "id": "planpoint_clusters",
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
        this.planpoint_clusterLayer.setRenderer(renderer);

        this.map.addLayer(this.planpoint_clusterLayer);

    }

    //加载等待。。。
    showLoading() {
        var lbgobj = this.domObj.find(".loadingbg");
        if (lbgobj.length == 0)
            this.domObj.append(this.template.split('$$')[3]);
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




    //设置点、线或多边形的样式
    setGraphSymbol(type) {

        var symbol = {
            "SimpleMarkerSymbol": null,
            "SimpleLineSymbol": null,
            "SimpleFillSymbol": null,
        };
        switch (type) {
            case "point":
                symbol.SimpleMarkerSymbol = new SimpleMarkerSymbol(
                    {
                        color: new Color(this.config.color),
                        style: "diamond",       //点样式solid\cross\square|diamond|circle|x
                        outline: {
                            color: new Color(this.config.color),
                            width: 0.2
                        }
                    }
                );
                // symbol.SimpleMarkerSymbol = new PictureMarkerSymbol(this.config.MarkPictureSymbol, 48, 48);


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
        if (this.planpoint_clusterLayer != null) {
            this.map.removeLayer(this.planpoint_clusterLayer);
            this.planpoint_clusterLayer = null
        }

        if (this.plandetail_polylinelayer) {
            this.map.removeLayer(this.plandetail_polylinelayer);
            this.plandetail_polylinelayer.clear();
        }
        if (this.plandetail_pointlayer) {
            this.map.removeLayer(this.plandetail_pointlayer);
            this.plandetail_pointlayer.clear();
        }
        this.domObj.remove();
        this.afterDestroy();
    }

}