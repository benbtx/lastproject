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
import geometryEngine = require("esri/geometry/geometryEngine");
import graphicsUtils = require("esri/graphicsUtils");

export = MissionSchedule;
class MissionSchedule extends BaseWidget {
    baseClass = "widget-missionschedule";
    map = null;
    toast = null;
    popup = null;
    loadWait = null;
    plan_pontype_layer: GraphicsLayer;//巡检任务计划片区图层
    plan_ptype_layer: GraphicsLayer;//显示具体巡检任务包含的巡检设备信息图层

    missionschedule_plandetail_polylinelayer: GraphicsLayer;
    regionInfoGraphicLayer: GraphicsLayer;

    companyid = "";//公司id
    companydatas = null;
    iszgs = false;//是否是总公司账号  
    ispartment = false;//是否为部门账号

    depid = "";
    depname = "";
    plan_type_id = 0;
    userid = "";
    plan_type = "";//巡检点类型决定是否查询图层和查询哪个图层
    periodid = "";
    zq = 0;//自定义天数   "custom_days": this.zq,//为0时，非自定义周期；为其他则为自定义周期
    plan_begindate = "";
    plan_enddate = "";
    missionschedule_planpoint_clusterLayer = null;//巡检点   
    regionid = "";
    regionname = "";
    planid = "";
    planstate = "";
    checkstate = "";
    plan_mode = 0;//巡检模式，默认人巡0，车巡1
    patrol_type = "";

    //修改计划参数
    updateplan_state = "add";//add，默认为添加计划；edit，为修改计划,
    updateplan_id = "";
    updateplan_periodtype = "";
    updateplan_begin = "";
    updateplan_end = "";
    updateplan_regionname = "";
    updateplan_regionid = "";
    updateplan_periodid = "";

    sb_objectids = [];

    plans_selected = [];//存储当前页选择计划
    copyplans_selected = [];
    popcopyplans_selected = [];
    copyPopup = null;//复制弹出窗
    devices_selected = [];//存储已选择设备
    devices_selected_layers: GraphicsLayer;
    currentRegionPolygon = null;//当前选中片区

    currentPagePlans = null;
    drawToolbar = null;//地图框选数据

    cur_mapitems = [];

    /**
     * @function 启动初始化
     */
    startup() {
        this.configure();
        this.initHtml();
        this.initEvent();
    }

    /**
     * @function 配置初始化
     */
    configure() {
        this.toast = this.AppX.runtimeConfig.toast;
        this.popup = this.AppX.runtimeConfig.popup;
        this.map = this.AppX.runtimeConfig.map;
        this.loadWait = this.AppX.runtimeConfig.loadWait;
        if (!this.map.getLayer("regionInfoGraphicLayer")) {
            this.regionInfoGraphicLayer = new GraphicsLayer();
            this.regionInfoGraphicLayer.id = "regionInfoGraphicLayer";
            this.map.addLayer(this.regionInfoGraphicLayer);
        }

        if (!this.map.getLayer("plan_pontype_layer")) {
            this.plan_pontype_layer = new GraphicsLayer();
            this.plan_pontype_layer.id = "plan_pontype_layer";
            this.map.addLayer(this.plan_pontype_layer);
        }

        if (!this.map.getLayer("devices_selected_layers")) {
            this.devices_selected_layers = new GraphicsLayer();
            this.devices_selected_layers.id = "devices_selected_layers";
            this.map.addLayer(this.devices_selected_layers);
        }

        if (!this.map.getLayer("missionschedule_plandetail_polylinelayer")) {
            this.missionschedule_plandetail_polylinelayer = new GraphicsLayer();
            this.missionschedule_plandetail_polylinelayer.id = "missionschedule_plandetail_polylinelayer";
            this.map.addLayer(this.missionschedule_plandetail_polylinelayer);
        }

        if (!this.map.getLayer("plan_ptype_layer")) {
            this.plan_ptype_layer = new GraphicsLayer();
            this.plan_ptype_layer.id = "plan_ptype_layer";
            this.map.addLayer(this.plan_ptype_layer);
        }


    }

    /**
     * @function 初始化页面
     */
    initHtml() {
        var html = _.template(this.template.split('$$')[0] + "</div>")();
        this.setHtml(html);
        this.ready();
    }

    /**
    * @function 判断是否为集团账号或子公司账号
    */
    initCompany() {
        if (AppX.appConfig.groupid != null && AppX.appConfig.groupid != "") {
            this.ispartment = true;
        }

        if (this.ispartment == false) {
            if (AppX.appConfig.range.indexOf(";") > -1) {
                var codes = AppX.appConfig.range.split(";");
                if (codes != null && codes.length > 0) {
                    for (var i = 0; i < codes.length; i++) {
                        if (codes[i] == this.config.rangeall) {
                            this.iszgs = true;
                            break;
                        }
                    }
                }
            } else {
                if (AppX.appConfig.range == this.config.rangeall) {
                    this.iszgs = true;
                }
            }
        }
    }

    /**
     * @function 根据登录账号（集团公司账号、子公司账号、部门账号）初始化
     */
    initLoginUser() {
        this.configTimes();
        this.initCompany();
        if (this.iszgs == true) {//集团公司账号           
            this.companydatas = new Object();
            this.domObj.find(".planslist-title").empty().append(this.template.split('$$')[10]);
            this.domObj.find(".company_serch").show();
            this.getCompanyList();
            //部门列表
            this.domObj.find('.company').on("change", function () {
                this.companyid = this.domObj.find('.company option:selected').val();
                this.setButtonInUse(this.companyid);
                this.getGroup();
                this.getMissionSchedule();
            }.bind(this));
        } else {
            this.domObj.find(".planslist-title").empty().append(this.template.split('$$')[9]);
            this.domObj.find(".company_serch").hide();
            if (this.ispartment) {
                this.depid = AppX.appConfig.groupid;//获取部门id
                this.domObj.find(".department_btn").hide();
                this.getUser(true);
            } else {
                this.getGroup();//查询部门及员工列表信息
            }
            this.getMissionSchedule();
        }
    }


    /**
     * @function 是否可使用
     * @param companyid 所属公司id，当公司id和用户的公司id一致时，可进行编辑更新操作
     */
    setButtonInUse(companyid?: string) {
        if (this.iszgs) {//总公司账号
            if (companyid == AppX.appConfig.departmentid) {//可使用
                this.domObj.find('.btn_addplans').prop('disabled', false);
                this.domObj.find('.btn_copyplans').prop('disabled', false);
                this.domObj.find('.btn_editplans').prop('disabled', false);
                this.domObj.find('.btn_cancelplans').prop('disabled', false);
                this.domObj.find('.btn_deleteplans').prop('disabled', false);
            } else {//不可使用
                this.domObj.find('.btn_addplans').prop('disabled', true);
                this.domObj.find('.btn_copyplans').prop('disabled', true);
                this.domObj.find('.btn_editplans').prop('disabled', true);
                this.domObj.find('.btn_cancelplans').prop('disabled', true);
                this.domObj.find('.btn_deleteplans').prop('disabled', true);
            }
        }
    }

    /**
     * @function 根据不同账号获取headers
     * @param type 0获取自己及以下部门数据，1获取自身数据
     */
    getHeaders(type?: number) {
        var headers = null;
        switch (type) {
            case 0:
                headers = {
                    'Token': AppX.appConfig.xjxj,
                    'departmentid': AppX.appConfig.departmentid,
                    'range': AppX.appConfig.range
                };
                break;
            case 1:
                headers = {
                    'Token': AppX.appConfig.xjxj,
                    'departmentid': AppX.appConfig.departmentid
                };
                break;
            default:
                headers = {
                    'Token': AppX.appConfig.xjxj,
                    'departmentid': AppX.appConfig.departmentid
                };
                break;
        }
        return headers;
    }

    /**
     * @function 获取公司列表信息
     */
    getCompanyList() {
        $.ajax({
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getCompanyList,
            success: function (results) {
                var that = this;
                if (results.code != 1) {
                    that.toast.Show(results.message);
                    return;
                }
                var strdepartment = "";//"<option value=''>全部</option>";
                $.each(results.result, function (index, item) {
                    this.companydatas[item.companyid] = item.company_name;
                    if (AppX.appConfig.departmentid == item.companyid) {
                        strdepartment += "<option selected value='" + item.companyid + "'>" + item.company_name + "</option>";
                    } else {
                        strdepartment += "<option value='" + item.companyid + "'>" + item.company_name + "</option>";
                    }
                }.bind(this));
                this.domObj.find(".company").empty().append(strdepartment);
                this.companyid = (this.iszgs == true ? this.domObj.find(".company option:selected").val() : "");
                this.getGroup();//查询部门及员工列表信息  
                this.getMissionSchedule();
            }.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取公司列表数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    planEnddate = {
        format: 'YYYY-MM-DD', //日期格式  
        isinitVal: false,
        minDate: "2017-08-28"
    }
    planBegindate = {
        format: 'YYYY-MM-DD', //日期格式  
        isinitVal: false,
        choosefun: function (elem, val, date) {
            var dt = new Date(val.replace(/-/g, "/"));
            this.planEnddate.minDate = Functions.DateFormat(dt, "yyyy-MM-dd");
            this.domObj.find(".plan_enddate").val(this.planEnddate.minDate);
        }.bind(this)
    }

    /**
     * @function 配置时间控件
     */
    configTimes() {
        $.jeDate(".plan_begindate", this.planBegindate);
        $.jeDate(".plan_enddate", this.planEnddate);
    }

    /**
     * @function 初始化相关事件
     * 时间控件、部门与人员列表、部门变化事件
     */
    initEvent() {
        this.regionInfoGraphicLayer.clear();
        this.patrol_type = "";
        this.initLoginUser();
        var that = this;
        //部门列表
        this.domObj.find('.department').on("change", function () {
            this.getUser(true);
        }.bind(this));

        //分页控件fykj 向前、向后事件
        this.domObj.find(".pre").off("click").on("click", function () {
            if (that.config.pagenumber - 1 > 0) {
                that.config.pagenumber = that.config.pagenumber - 1;
                that.getMissionSchedule();
                that.domObj.find(".content").text("第" + that.config.pagenumber + "页共" + that.config.pagetotal + "页");
            }
        });

        this.domObj.find(".next").off("click").on("click", function () {
            if (that.config.pagenumber + 1 <= that.config.pagetotal) {
                that.config.pagenumber = that.config.pagenumber + 1;
                that.getMissionSchedule();
                that.domObj.find(".content").text("第" + that.config.pagenumber + "页共" + that.config.pagetotal + "页");
            }
        });

        this.domObj.find(".pageturning").off("click").on("click", function () {
            if (parseInt(that.domObj.find(".currpage").val()) <= that.config.pagetotal && that.config.pagenumber >= 1) {
                that.config.pagenumber = parseInt(that.domObj.find(".currpage").val());
                that.getMissionSchedule();
                that.domObj.find(".content").text("第" + that.config.pagenumber + "页共" + that.config.pagetotal + "页");
            } else {
                that.domObj.find(".currpage").val("");
            }
        }.bind(this));

        //每页显示条数更改
        this.domObj.find(".dynamic_pagesize").off("change").on("change", function () {
            this.config.pagesize = parseInt(this.domObj.find(".dynamic_pagesize option:selected").val());
            this.config.pagenumber = 1;
            this.getMissionSchedule();

        }.bind(this));

        //计划安排全选
        this.domObj.find('.planslist-selected').off("change").on("change", function () {
            if (this.domObj.find(".planslist-selected").prop('checked') == true) {
                this.domObj.find(".planslist-select").each(function () {
                    $(this).prop('checked', true);
                    that.removeOrAddPlanItem(true, $(this));
                });
            } else {
                this.domObj.find(".planslist-select").each(function () {
                    $(this).prop('checked', false);
                    that.removeOrAddPlanItem(false, $(this));
                });
            }
        }.bind(that));

        //查询计划
        this.domObj.find(".btn-search").off("click").on("click", function () {
            this.getMissionSchedule();
        }.bind(this));

        //增加计划
        this.domObj.find('.btn_addplans').off("click").on("click", function () {
            this.updateplan_state = "add";
            this.domObj.empty().append(this.template.split('$$')[1]);
            this.initEvent2();
        }.bind(this));

        //计划修改
        this.domObj.find('.btn_editplans').off("click").on("click", function () {
            if (this.copyplans_selected.length <= 0) {
                this.toast.Show("请选择一个或多个未开始的计划！");
                return;
            } else {
                var ids = [];
                for (var n = 0; n < this.copyplans_selected.length; n++) {
                    var item = this.copyplans_selected[n];
                    ids.push(item.plan_id);
                    if (item.plan_state != 1) {
                        this.toast.Show("选中的计划包含已开始的计划，不能修改！");
                        return;
                    }
                }
                this.copyPlans(this.config.updateMissionSchedule, false);
            }
        }.bind(this));

        //计划删除---删除单个
        this.domObj.find('.btn_deleteplans').off("click").on("click", function () {
            this.updateplan_state = "delete";
            if (this.copyplans_selected.length <= 0) {
                this.toast.Show("请选择需删除的计划！");
                return;
            } else {
                var ids = [];
                for (var n = 0; n < this.copyplans_selected.length; n++) {
                    var item = this.copyplans_selected[n];
                    ids.push(item.plan_id);
                    if (item.plan_state != 1) {
                        this.toast.Show("选中的计划包含已开始的计划，不能删除！");
                        return;
                    }
                }
                this.popup.setSize(300, 150);
                var Obj = this.popup.ShowMessage("提示", "是否删除选择计划数据？");
                Obj.submitObj.off("click").on("click", function () {
                    this.popup.Close();
                    $.ajax({
                        headers: this.getHeaders(1),
                        type: "POST",
                        url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.deleteMissionSchedule,
                        data: {
                            "list": ids
                        },
                        success: this.deleteMissionScheduleCallback.bind(this),
                        error: function (data) {
                            this.toast.Show("服务端ajax出错，获取数据失败!");
                        }.bind(this),
                        dataType: "json",
                    });
                }.bind(this));
            }
        }.bind(this));

        //计划作废---作废单个
        this.domObj.find('.btn_cancelplans').off("click").on("click", function () {
            this.updateplan_state = "delete";
            if (this.copyplans_selected.length <= 0) {
                this.toast.Show("请选择需作废的计划！");
                return;
            } else {
                var ids = [];
                for (var n = 0; n < this.copyplans_selected.length; n++) {
                    var item = this.copyplans_selected[n];
                    ids.push(item.plan_id);
                    if (item.plan_state != 1) {
                        this.toast.Show("选中的计划包含已开始的计划，不能作废！");
                        return;
                    }
                }
                this.popup.setSize(300, 150);
                var Obj = this.popup.ShowMessage("提示", "是否作废选择计划数据？");
                Obj.submitObj.off("click").on("click", function () {
                    this.popup.Close();
                    $.ajax({
                        headers: this.getHeaders(1),
                        type: "POST",
                        url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.cancelMissionSchedule,
                        data: {
                            "list": ids
                        },
                        success: this.cancellMissionScheduleCallback.bind(this),
                        error: function (data) {
                            this.toast.Show("服务端ajax出错，获取数据失败!");
                        }.bind(this),
                        dataType: "json",
                    });
                }.bind(this));
            }
        }.bind(this));

        //复制计划
        this.domObj.find('.btn_copyplans').off("click").on("click", function () {
            this.copyPlans(this.config.copyPlan, true);
        }.bind(this));

        //计划提交
        this.domObj.find('.btn_submitplans').off("click").on("click", function () {
            if (this.copyplans_selected.length <= 0) {
                this.toast.Show("请选择需提交的计划！");
                return;
            } else {
                var ids = [];
                for (var n = 0; n < this.copyplans_selected.length; n++) {
                    var item = this.copyplans_selected[n];
                    ids.push(item.plan_id);
                    if (item.plan_state != 6) {
                        this.toast.Show("选中的计划包含已提交的计划，不能重复提交！");
                        return;
                    }
                }

                this.popup.setSize(300, 150);
                var Obj = this.popup.ShowMessage("提示", "确认提交选中计划？");
                Obj.submitObj.off("click").on("click", function () {
                    this.popup.Close();
                    $.ajax({
                        headers: this.getHeaders(1),
                        contentType: "application/json",
                        type: "POST",
                        url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.submitPlan,
                        data: JSON.stringify(ids),
                        success: this.submitMissionScheduleCallback.bind(this),
                        error: function (data) {
                            this.toast.Show("服务端ajax出错，获取数据失败!");
                        }.bind(this),
                        dataType: "json"
                    });
                }.bind(this));
            }
        }.bind(this));

        //选中行高亮,定位计划详细
        this.domObj.off("click").on('click', '.planslist tr', (e) => {
            if ($(e.currentTarget).data("user_id") == null) {
                return;
            } else {
                this.planid = $(e.currentTarget).data("plan_id");
                this.planstate = $(e.currentTarget).data("plan_state");
                this.checkstate = $(e.currentTarget).data("check_state");
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
            var mapPolygon = new Polygon($(e.currentTarget).data("geometry"));
            this.map.setExtent(mapPolygon.getExtent());
            //显示计划内容
            this.showMissionScheduleListPlans($(e.currentTarget).data("plan_id"));
        });

    }

    /**
     * @function 复制或修改操作
     * @param method
     * @param iscopy true复制,false修改
     */
    copyPlans(method, iscopy) {
        this.popcopyplans_selected = [];
        var unselect = false;
        for (var i = 0; i < this.copyplans_selected.length; i++) {
            var item = this.copyplans_selected[i];
            var copyItem = {
                "plan_state": item.plan_state,
                "plan_id": item.plan_id,
                "user_id": item.user_id,
                "start_date": item.start_date,
                "end_date": item.end_date,
                "region_id": item.region_id,
                "region_name": item.region_name,
                "depname": item.depname,
                "user_name": item.user_name,
                "period_name": item.period_name,
                "period_id": item.period_id,
                "device_type_name": item.device_type_name,
                "interval_days": item.interval_days,
                "create_user": AppX.appConfig.realname
            };

            if ((item.device_type_id + "") == "5") {
                unselect = true;
            }
            this.popcopyplans_selected.push(copyItem);
        }
        if (this.popcopyplans_selected.length == 0) {
            this.toast.Show("请选择一个或多个计划");
            return;
        }
        if (unselect == true) {
            if (iscopy) {
                this.toast.Show("选择计划中有隐患点，不能复制！");
            } else {
                this.toast.Show("选择计划中有隐患点，不能修改！");
            }
            return;
        }

        this.popup.setSize(860, 500);
        var day = this.updateplan_periodtype;

        var Obj = this.popup.Show((iscopy ? "计划复制" : "计划修改"), this.template.split('$$')[5]);
        this.copyPopup = Obj;
        var html_trs_data = "", department = "department";
        var len = this.popcopyplans_selected.length;

        for (var i = 0; i < len; i++) {
            var item = this.popcopyplans_selected[i];
            var days = item.interval_days - 1;
            if (iscopy == true) {
                var s = new Date(item.start_date);
                var nowDate = new Date();
                if (s.getTime() - nowDate.getTime() <= 0) {
                    nowDate.setDate(nowDate.getDate() + 1);
                    item.start_date = Functions.DateFormat(nowDate, "yyyy-MM-dd");
                    if (days > 1) {//大于一天一巡
                        nowDate.setDate(nowDate.getDate() + days);
                    }
                    item.end_date = Functions.DateFormat(nowDate, "yyyy-MM-dd");
                }
            }


            html_trs_data += "<tr class='goto'><td>"
                + (i + 1) + "</td><td>"
                + " <select " + (this.ispartment == true ? "disabled = 'true'" : "") + " class='form-control input-sm department" + i + " minwidth'></td><td>"
                + "<select class='form-control input-sm users" + i + " minwidth'></select></td><td title='" + item.period_name + "'>"
                + item.period_name + "</td><td title='" + item.device_type_name + "'>"
                + item.device_type_name + "</td><td title='" + item.region_name + "'>"
                + item.region_name + "</td><td>"
                + "<input type='text' " + (iscopy == false ? "disabled='true'" : "") + " readonly='readonly' days='" + days + "' idx='" + i + "' class='form-control begindate" + i + " minwidth' value='" + item.start_date.split(" ")[0] + "'/></td><td>"
                + "<input type='text' " + (iscopy == false ? "disabled='true'" : "") + " readonly='readonly' days='" + days + "' idx='" + i + "' class='form-control enddate" + i + " minwidth' value='" + item.end_date.split(" ")[0] + "'/></td></tr>";
        }

        Obj.conObj.find('.plancopyslist').empty().append(html_trs_data);
        this.getCopyGroup();
        for (var i = 0; i < len; i++) {//生成事件
            var period_id = this.popcopyplans_selected[i].period_id + "";

            var snodt = new Date((new Date()).getTime() + 24 * 3600000), sedt;
            var esnowDt = new Date((new Date()).getTime() + 24 * 3600000), eedt;

            //alert(period_id)
            switch (period_id) {
                case "1"://一天一巡
                    sedt = new Date(snodt.getTime() + 24 * 6 * 3600000);
                    eedt = new Date(esnowDt.getTime() + 24 * 6 * 3600000);
                    $.jeDate(".begindate" + i, {
                        format: 'YYYY-MM-DD', //日期格式  
                        isinitVal: true,
                        minDate: Functions.DateFormat(snodt, "yyyy-MM-dd"),
                        maxDate: Functions.DateFormat(sedt, "yyyy-MM-dd")
                    });
                    break;
                case "2"://两天一巡    
                    esnowDt = new Date((new Date()).getTime() + 24 * 2 * 3600000)
                    sedt = new Date(snodt.getTime() + 24 * 6 * 3600000);
                    eedt = new Date(snodt.getTime() + 24 * 6 * 3600000);
                    $.jeDate(".begindate" + i, {
                        format: 'YYYY-MM-DD', //日期格式  
                        isinitVal: true,
                        minDate: Functions.DateFormat(snodt, "yyyy-MM-dd"),
                        maxDate: Functions.DateFormat(sedt, "yyyy-MM-dd")
                    });
                    break;
                case "3"://一周一巡
                case "4"://半月一巡                
                case "5"://一月一巡
                case "8":
                case "6"://两月一巡                
                case "7"://半年一巡
                case "9":
                case "10"://两年一巡
                    snodt = this.getFirstDate(period_id);
                    sedt = this.getLastDate(period_id, snodt);
                    esnowDt = sedt;
                    eedt = sedt;
                    $.jeDate(".begindate" + i, {
                        format: 'YYYY-MM-DD', //日期格式  
                        isinitVal: true,
                        minDate: Functions.DateFormat(snodt, "yyyy-MM-dd"),
                        maxDate: Functions.DateFormat(snodt, "yyyy-MM-dd")
                    });
                    break;
            }



            $.jeDate(".enddate" + i, {
                format: 'YYYY-MM-DD', //日期格式  
                isinitVal: true,
                minDate: Functions.DateFormat(esnowDt, "yyyy-MM-dd"),
                maxDate: Functions.DateFormat(eedt, "yyyy-MM-dd")
            });

            Obj.conObj.find(".begindate" + i).val(Functions.DateFormat(snodt, "yyyy-MM-dd"));
            Obj.conObj.find(".enddate" + i).val(Functions.DateFormat(esnowDt, "yyyy-MM-dd"));
            Obj.conObj.find(".begindate" + i).off("input propertychange").on("input propertychange", function (e) {
                var idx = $(e.currentTarget).attr("idx");
                this.popcopyplans_selected[idx].start_date = $(e.currentTarget).val();
            }.bind(this));

            Obj.conObj.find(".enddate" + i).off("input propertychange").on("input propertychange", function (e) {
                var idx = $(e.currentTarget).attr("idx");
                this.popcopyplans_selected[idx].end_date = $(e.currentTarget).val();
            }.bind(this));

            Obj.conObj.find(".users" + i).off("change").on("change", function (e) {
                var userid = $(e.currentTarget).find('option:selected').val();
                var username = $(e.currentTarget).find('option:selected').text();
                var idx = $(e.currentTarget).find('option:selected').attr("idx");
                this.popcopyplans_selected[idx].user_id = userid;
                this.popcopyplans_selected[idx].user_name = username;
            }.bind(this));

            Obj.conObj.find(".department" + i).off("change").on("change", function (e) {
                var depid = $(e.currentTarget).find('option:selected').val();
                var depname = $(e.currentTarget).find('option:selected').text();
                var idx = $(e.currentTarget).find('option:selected').attr("idx");
                var userclassid = ".users" + idx;
                this.popcopyplans_selected[idx].depname = depname;
                $.ajax({
                    headers: this.getHeaders(1),
                    type: "POST",
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getUserList,
                    data: {
                        "pageindex": 1,
                        "pagesize": this.config.pagemaxsize,
                        "depid": depid
                    },
                    success: function (results) {
                        if (results.code != 1) {
                            this.toast.Show("查询用户信息出错！");
                            console.log(results.message);
                            return;
                        }
                        var cpdp = "";
                        $.each(results.result.rows, function (index, item) {
                            cpdp += "<option idx='" + idx + "' value='" + item.userid + "'>" + item.username + "</option>";
                        }.bind(this));
                        Obj.conObj.find(userclassid).empty().append(cpdp);
                        var idx = $(e.currentTarget).find('option:selected').data("idx");
                        this.popcopyplans_selected[idx].user_id = $(".users" + idx).find("option:selected").val();
                        this.popcopyplans_selected[idx].user_name = $(".users" + idx).find("option:selected").text();
                    }.bind(this),
                    error: function (data) {
                        this.toast.Show("服务端ajax出错，获取数据失败!");
                    }.bind(this),
                    dataType: "json"
                });
            }.bind(this));
        }

        Obj.submitObj.off("click").on("click", function () {
            if (this.popcopyplans_selected.length > 0) {
                for (var i = 0; i < this.popcopyplans_selected.length; i++) {
                    var sdt = new Date($(".begindate" + i).val()), edt = new Date($(".enddate" + i).val());
                    if (edt.getTime() - sdt.getTime() < 0) {
                        this.popup.ShowTip("开始时间大于结束时间！");
                        return;
                    }
                    var days = edt.getTime() - sdt.getTime();
                    if ((this.popcopyplans_selected[i].period_id + "") == "2") {
                        var time = Math.floor(days / (24 * 60 * 60 * 1000)) + 1;
                        if (time % 2 != 0) {
                            this.toast.Show("周期必须是2的倍数！");
                            return;
                        }
                    }

                    this.popcopyplans_selected[i].user_id = $(".users" + i).find("option:selected").val();
                    this.popcopyplans_selected[i].user_name = $(".users" + i).find("option:selected").text();
                    this.popcopyplans_selected[i].start_date = $(".begindate" + i).val();
                    this.popcopyplans_selected[i].end_date = $(".enddate" + i).val();
                }

                $.ajax({
                    headers: this.getHeaders(1),
                    type: "POST",
                    contentType: "application/json",
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + method,
                    data: JSON.stringify(this.popcopyplans_selected),
                    success: (iscopy == true ? this.copyCallback.bind(this) : this.updateCallback.bind(this)),
                    error: function (data) {
                        this.toast.Show("服务端ajax出错，获取数据失败!");
                    }.bind(this),
                    dataType: "json"
                });
            }
        }.bind(this));
    }

    /**
     * @function 初始化巡检计划列页面值
     */
    initEventVal() {
        this.config.pagenumber = 1;
        this.config.pagesize = 25;
        this.config.pagetotal = 0;
        this.periodid = "";
        this.updateplan_state = "add";//默认为添加；
        this.plans_selected = [];
        this.copyplans_selected = [];
        this.devices_selected = [];
        this.devices_selected_layers.clear();
        this.regionInfoGraphicLayer.clear();
        this.domObj.empty().append(this.template.split('$$')[0] + "</div>");
        this.initEvent();
    }

    //计划新增
    initEvent2() {
        var that = this;
        this.planClear();
        this.plan_mode = 0;
        this.patrol_type = "";
        this.plan_type_id = 0;
        this.current_device_type_name = "";
        if (this.ispartment == false) {
            this.domObj.find(".department_btn").show();
            this.getGroup();
        } else {
            this.domObj.find(".department_btn").hide();
            this.getUser(false);
        }

        this.getPlanType();
        this.getAllPlanRegionToMap();

        //车巡、人巡
        this.domObj.find('.radio').off("change").on("change", function (e) {
            var val = $(e.currentTarget).val();
            this.plan_mode = val;
            if (val == "1") {
                this.patrol_type = val;
            } else {
                this.patrol_type = "";
            }
            if (this.ispartment == false) {
                this.getGroup();
            } else {
                this.getUser(false);
            }
            this.getPlanType();
        }.bind(this));

        //部门列表
        this.domObj.find('.department').off("change").on("change", function () {
            this.getUser(true);
        }.bind(this));

        //巡检类型变化--周期变化
        this.domObj.find(".plantype").off("change").on("change", function () {
            this.plan_type = this.domObj.find(".plantype option:selected").val();
            this.getPeriod();
        }.bind(this));

        //巡检周期变化
        this.domObj.find(".periodid").off("change").on("change", function () {
            var type = this.domObj.find('.periodid option:selected').data("days") - 1;
            this.initTimes();

            //定义提示信息
            var id = this.domObj.find(".periodid").val();
            if (id == "11") {
                //巡检点：自定义
                this.domObj.find(".period_sign").attr("title", "从明天开始计算,时间周期必须为：自定义周期的倍数");
                this.domObj.find(".tianshu").show();
                this.domObj.find('.periodid option:selected').data('days', 1);
                this.domObj.find(".zidingyi_period").off("change").on("change", function (e) {
                    var dy = this.domObj.find(".zidingyi_period").val();
                    if (!isNaN(dy) && dy.indexOf('.') < 0) {
                        this.domObj.find('.periodid option:selected').data('days', dy);
                    }
                    this.initTimes();

                }.bind(this));
            } else {
                this.domObj.find(".tianshu").hide();
                if (id == "1") {
                    //巡检点：一天一巡检
                    this.domObj.find(".period_sign").attr("title", "从明天开始计算,时间周期必须1的倍数，只允许安排一周内计划");
                } else if (id == "2") {
                    //巡检点：两天一巡检
                    this.domObj.find(".period_sign").attr("title", "从明天开始计算,时间周期必须2的倍数，只允许安排一周内计划");
                } else if (id == "3") {
                    //巡检点：一周一巡检
                    this.domObj.find(".period_sign").attr("title", "从每周星期一开始计算,结束日期每周日，只允许安排一个周期计划");
                } else if (id == "4") {
                    //巡检点：半月一巡检
                    this.domObj.find(".period_sign").attr("title", "从每月1日或16日开始计算,结束日期15日或月底，只允许安排一个周期计划");
                } else if (id == "5") {
                    //巡检点：一月一巡检
                    this.domObj.find(".period_sign").attr("title", "从每月1日开始计算,结束日期月底，只允许安排一个周期计划");
                } else if (id == "6") {
                    //调压箱：两月巡
                    this.domObj.find(".period_sign").attr("title", "从每月1日开始计算,结束日期第2个月底，只允许安排一个周期计划");
                } else if (id == "7") {
                    //调压箱：半年巡
                    this.domObj.find(".period_sign").attr("title", "从每月1日开始计算,结束日期第6个月底，只允许安排一个周期计划");
                } else if (id == "8") {
                    //调压柜：一月一巡检
                    this.domObj.find(".period_sign").attr("title", "从每月1日开始计算,结束日期月底，只允许安排一个周期计划");
                } else if (id == "9") {
                    //调压柜：半年一巡检
                    this.domObj.find(".period_sign").attr("title", "从每月1日开始计算,结束日期第6个月底，只允许安排一个周期计划");
                } else if (id == "10") {
                    //调压柜：两年一巡检
                    this.domObj.find(".period_sign").attr("title", "从每月1日开始计算,结束日期第24个月底，只允许安排一个周期计划");
                }
            }

        }.bind(this));

        //上一步 返回巡检计划列表页面
        this.domObj.find('.btn_previous_step').off("click").on("click", function () {
            this.initEventVal();
        }.bind(this));

        //返回巡检计划列表页面
        this.domObj.find('.btn_return').off("click").on("click", function () {
            this.initEventVal();
        }.bind(this));

        //下一步 片区选择设备
        this.domObj.find('.btn_next_step').off("click").on("click", function () {
            //设置常量-巡检周期、 日期区间
            this.plan_type_id = this.domObj.find('.plantype option:selected').data("device_type_id");
            this.current_device_type_name = this.domObj.find('.plantype option:selected').text();
            this.periodid = this.domObj.find('.periodid option:selected').val();
            this.plan_begindate = this.domObj.find('.plan_begindate').val();
            this.plan_enddate = this.domObj.find('.plan_enddate').val();
            this.plan_type = this.domObj.find('.plantype option:selected ').val();
            this.userid = this.domObj.find('.users option:selected ').val();

            if (this.periodid == "") {
                this.toast.Show("请选择巡检类型");
                return;
            }
            if (this.plan_begindate == "") {
                this.toast.Show("请选择开始时间");
                return;
            }
            if (this.plan_enddate == "") {
                this.toast.Show("请选择结束时间");
                return;
            }
            if (this.userid == "") {
                this.toast.Show("请选择巡检人员");
                return;
            }

            var s1 = new Date(this.plan_begindate);
            var s2 = new Date(this.plan_enddate);
            var days = s2.getTime() - s1.getTime();
            if (this.periodid == "2") {
                var time = Math.floor(days / (24 * 60 * 60 * 1000)) + 1;
                if (time % 2 != 0) {
                    this.toast.Show("周期必须是2的倍数！");
                    return;
                }
            }

            this.domObj.empty().append(this.template.split('$$')[2]);//片区选择
            this.initEvent3();
        }.bind(this));
    }

    //片区选择初始化
    initEvent3() {
        var that = this;
        this.config.pagenumber = 1;
        this.config.pagesize = 25;
        this.config.pagetotal = 0;
        this.devices_selected = [];
        this.devices_selected_layers.clear();
        this.missionschedule_plandetail_polylinelayer.clear();
        this.regionInfoGraphicLayer.clear();
        if (this.missionschedule_planpoint_clusterLayer != null) {
            this.map.removeLayer(this.missionschedule_planpoint_clusterLayer);
            this.missionschedule_planpoint_clusterLayer = null;
        }
        this.getAllPlanRegion();

        //上一步 新增任务
        this.domObj.find('.btn_previous_step').off("click").on("click", function () {
            this.domObj.empty().append(this.template.split('$$')[1]);
            this.initEvent2();
        }.bind(this));

        //返回计划列表
        this.domObj.find('.btn_return').off("click").on("click", function () {
            this.initEventVal();
        }.bind(this));

        //片区选择
        this.domObj.off("click").on('click', '.planregionslist tr', (e) => {
            this.devices_selected = [];//设备归为0
            this.devices_selected_layers.clear();
            if ($(e.currentTarget).data("regionid") == null) {
                return;
            } else {
                var mapPolygon = new Polygon($(e.currentTarget).data("geometry"));
                this.map.setExtent(mapPolygon.getExtent());
                this.regionid = $(e.currentTarget).data("regionid");
                this.regionname = $(e.currentTarget).data("regionname");
                this.currentRegionPolygon = mapPolygon;
                if (this.plan_type_id == 1 || this.plan_type_id == 5 || this.plan_type_id == 6) {
                    this.checkExistPlanDevice(this.regionid, this.plan_type_id + "", this.current_device_type_name);
                } else {
                    this.checkExistPlanDeviceByLayer($(e.currentTarget).data("geometry"), this.plan_type_id + "", this.current_device_type_name);
                }
            }
        });

        //上一页
        this.domObj.find(".pre").off("click").on("click", function () {
            if (this.config.pagenumber - 1 > 0) {
                this.config.pagenumber = this.config.pagenumber - 1;
                this.getAllPlanRegion();
                this.domObj.find(".content").text("第" + this.config.pagenumber + "页共" + this.config.pagetotal + "页");
            }
        }.bind(this));

        //下一页
        this.domObj.find(".next").off("click").on("click", function () {
            if (this.config.pagenumber + 1 <= this.config.pagetotal) {
                this.config.pagenumber = this.config.pagenumber + 1;
                this.getAllPlanRegion();
                this.domObj.find(".content").text("第" + this.config.pagenumber + "页共" + this.config.pagetotal + "页");
            }
        }.bind(this));

        //跳转
        this.domObj.find(".pageturning").off("click").on("click", function () {
            if (parseInt(this.domObj.find(".currpage").val()) <= this.config.pagetotal && this.config.pagenumber >= 1) {
                this.config.pagenumber = parseInt(this.domObj.find(".currpage").val());
                this.getAllPlanRegion();
                this.domObj.find(".content").text("第" + this.config.pagenumber + "页共" + this.config.pagetotal + "页");
            } else {
                this.domObj.find(".currpage").val("");
            }
        }.bind(this));

        //每页显示条数更改
        this.domObj.find(".dynamic_pagesize").off("change").on("change", function () {
            this.config.pagesize = parseInt(this.domObj.find(".dynamic_pagesize option:selected").val());
            this.getAllPlanRegion();
        }.bind(this));

        //查询
        this.domObj.find(".btn_search").off("click").on("click", function () {
            this.config.pagenumber = 1;
            this.config.pagesize = parseInt(this.domObj.find(".dynamic_pagesize option:selected").val());
            this.getAllPlanRegion();
        }.bind(this));
    }

    //设备选择 完成新增计划
    initEvent4() {
        var that = this;
        this.config.pagenumber = 1;
        this.config.pagesize = 25;
        this.config.pagetotal = 0;
        this.domObj.find(".currentstep").text("当前步骤：" + this.current_device_type_name + "选择，");
        //完成新增计划
        this.domObj.find('.btn_confirm').off("click").on("click", function () {
            if (this.regionid == "") {
                this.toast.Show("请选择片区！");
                return;
            }
            var xjlist = [];
            var obj = this.config.deviceForLayer[this.plan_type_id];
            if (this.devices_selected.length > 0) {//巡检设备
                for (var j = 0; j < this.devices_selected.length; j++) {
                    var sobj = this.devices_selected[j];
                    var content = (sobj.mapitem == null ? sobj.currentTarget.data("content") : sobj.mapitem.content);
                    if (typeof (content) != 'string') {
                        content = JSON.stringify(content);
                    }
                    var itemselect = {
                        "sid": sobj.sid,
                        "geometry": sobj.geometry,
                        "name": "",
                        // "code": (content.hasOwnProperty("CODE") ? content["CODE"] : ""),
                        "code": JSON.parse(content).SID,
                        "device_type_id": (sobj.mapitem == null ? sobj.currentTarget.data("device_type_id") : sobj.mapitem.device_type_id),
                        "regionname": (sobj.mapitem == null ? sobj.currentTarget.data("regionname") : sobj.mapitem.regionname),
                        "address": "",
                        "content": "'" + content + "'",
                        "pipe_length": (obj.pipelength != undefined ? (sobj.mapitem == null ? sobj.currentTarget.data(obj.pipelength.toLowerCase()) : sobj.mapitem.attributes[obj.pipelength]) : 0)
                    };
                    xjlist.push(itemselect);
                }
            }

            this.domObj.find(".pointlist-select").each(function () {//巡检点、巡检类型、巡检线选择
                if ($(this).prop('checked') == true) {
                    xjlist.push({
                        "sid": this.id,
                        "geometry": $(this).data('geometry'),
                        "address": $(this).data('address'),
                        "device_type_id": $(this).data('device_type_id'),
                        "name": $(this).data('name'),
                        "code": $(this).data('name'),
                        "regionname": $(this).data("regionname"),
                        "content": "'" + JSON.stringify($(this).data("content")) + "'",
                        "pipe_length": $(this).data('pipe_length')
                    });
                }
            });

            if (xjlist.length == 0) {
                this.toast.Show("请选择巡检内容信息！");
                return;
            }
            //添加计划              
            $.ajax({
                headers: this.getHeaders(1),
                type: "POST",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.addMissionScheduleInfo,
                data: {
                    "region_id": this.regionid,
                    "user_id": this.userid,
                    "period_id": this.periodid,
                    "interval_day": this.zq,//为0时，非自定义周期；为其他则为自定义周期
                    "description": "",
                    "plan_begindate": this.plan_begindate,
                    "plan_enddate": this.plan_enddate,
                    "device_type_id": this.plan_type_id,
                    "list": JSON.stringify(xjlist),
                    "create_user": AppX.appConfig.realname,
                    "plan_mode": this.plan_mode,
                    // "code": this.plan_mode,
                },
                success: this.addMissionScheduleInfoCallback.bind(this),
                error: function (data) {
                    this.toast.Show("服务端ajax出错，获取数据失败!");
                }.bind(this),
                dataType: "json",
            });
        }.bind(this));

        //清除所有选择
        this.domObj.find('.btn_removeall').off("click").on("click", function () {
            this.devices_selected = [];//设备归为0
            this.devices_selected_layers.clear();
            this.addSelectItems(this);
            this.selectListItems();
            this.domObj.find(".currentpagecontrol").text("当前勾选" + this.devices_selected.length + "条");
        }.bind(this));

        //地图上选择
        this.domObj.find('.btn_select').off("click").on("click", function () {
            if (this.drawToolbar != null) {
                this.map.setMapCursor('default');
                this.drawToolbar.deactivate();
                this.drawToolbar = null;
            }
            this.map.setMapCursor('crosshair');
            this.drawToolbar = new Draw(this.AppX.runtimeConfig.map);
            this.drawToolbar.activate(Draw.RECTANGLE);
            this.drawToolbar.on("draw-end", function (evt) {
                this.map.setMapCursor('default');
                var geometry = evt.geometry;
                if (geometry == null) {
                    return;
                }


                if (!geometryEngine.contains(this.currentRegionPolygon, evt.geometry) && !geometryEngine.intersects(this.currentRegionPolygon, evt.geometry)) {
                    this.toast.Show("选择范围在当前片区外，请选择当前片区内的信息！");
                    return;
                }
                geometry = geometryEngine.clip(this.currentRegionPolygon, evt.geometry.getExtent());

                this.drawToolbar.deactivate();
                var url = this.AppX.appConfig.gisResource.pipe.config[this.config.mapindex].url;//pipedata
                var obj = this.config.deviceForLayer[this.plan_type_id];
                this.loadWait.Show("正在查询选择" + this.current_device_type_name + "信息，请等待...", this.domObj);
                var where = obj.where;
                var codes = AppX.appConfig.range.replace(/;/g, ',');
                if (codes != "")
                    where += " and " + obj.managelayerfieldname + ' in (' + codes + ')';


                var param = { "where": where, "spatialRel": "esriSpatialRelIntersects", "returnGeometry": true, "geometryType": "esriGeometryPolygon", "geometry": JSON.stringify(geometry), "outFields": obj.outfields, "returnIdsOnly": false, "f": "json" };
                $.ajax({
                    type: "POST",
                    url: url + "/" + obj.layerid + "/query",
                    cache: false,
                    data: param,
                    dataType: "json",
                    success: function (response) {
                        this.loadWait.Hide();
                        if (response.error !== undefined) {
                            this.AppX.runtimeConfig.toast.Show("查询失败，请联系管理员");
                            return;
                        }
                        var configObj = this.config.deviceForLayer[this.plan_type_id];
                        var layername = configObj.layername;
                        var mapitems = [];
                        //内容
                        response.features.forEach((p, itemindx) => {
                            var jsgeo = p.geometry;
                            var geometryobj = null;
                            if (jsgeo.hasOwnProperty("paths")) {
                                geometryobj = {
                                    "paths": jsgeo.paths,
                                    "spatialReference": { "wkid": this.map.spatialReference.wkid }
                                };

                            } else if (jsgeo.hasOwnProperty("rings")) {
                                geometryobj = {
                                    "rings": jsgeo.rings,
                                    "spatialReference": { "wkid": this.map.spatialReference.wkid }
                                };
                            } else {
                                geometryobj = { "x": jsgeo.x, "y": jsgeo.y, "spatialReference": { "wkid": this.map.spatialReference.wkid } }
                            }

                            var content = new Object();
                            for (var i = 0; i < configObj.showfields.length; i++) {
                                content[configObj.showfields[i]] = p.attributes[configObj.showfields[i]];
                            }

                            var item = {
                                geometry: geometryobj,
                                content: JSON.stringify(content),
                                device_type_id: this.plan_type_id,
                                regionname: this.regionname,
                                sid: layername + "-" + p.attributes[configObj.keyfield],
                                attributes: p.attributes
                            }
                            mapitems.push(item);
                        });
                        //剔除此范围内二月一巡的设备

                        //       "plan_begindate": this.plan_begindate,
                        // "plan_enddate": this.plan_enddate,
                        // "device_type_id": this.plan_type_id,

                        // this.cur_mapitems = mapitems;
                        // this.devicesWithout(this.cur_mapitems, this.plan_type_id, this.plan_begindate, this.plan_enddate);


                        if (mapitems.length > 0) {
                            this.selectMapItems(mapitems);
                        }


                    }.bind(this),
                    error: function (results) {
                        this.loadWait.Hide();
                        this.toast.Show("查询片区巡检信息出错！");
                    }.bind(this)
                });

            }.bind(this));
        }.bind(this));

        //清除部分选择
        this.domObj.find('.btn_part_removeall').off("click").on("click", function () {
            if (this.drawToolbar != null) {
                this.map.setMapCursor('default');
                this.drawToolbar.deactivate();
                this.drawToolbar = null;
            }
            this.map.setMapCursor('crosshair');
            this.drawToolbar = new Draw(this.AppX.runtimeConfig.map);
            this.drawToolbar.activate(Draw.RECTANGLE);
            this.drawToolbar.on("draw-end", function (evt) {
                this.map.setMapCursor('default');
                var geometry = evt.geometry;
                if (geometry == null) {
                    return;
                }

                this.drawToolbar.deactivate();
                var url = this.AppX.appConfig.gisResource.pipedata.config[this.config.mapindex].url;
                var obj = this.config.deviceForLayer[this.plan_type_id];
                this.loadWait.Show("正在查询删除的选择" + this.current_device_type_name + "信息，请等待...", this.domObj);
                var where = obj.where;
                var codes = AppX.appConfig.range.replace(/;/g, ',');
                if (codes != "")
                    where += " and " + obj.managelayerfieldname + ' in (' + codes + ')';


                var param = { "where": where, "spatialRel": "esriSpatialRelIntersects", "returnGeometry": true, "geometryType": "esriGeometryPolygon", "geometry": JSON.stringify(geometry), "outFields": obj.outfields, "returnIdsOnly": false, "f": "json" };
                $.ajax({
                    type: "POST",
                    url: url + "/" + obj.layerid + "/query",
                    cache: false,
                    data: param,
                    dataType: "json",
                    success: function (response) {
                        this.loadWait.Hide();
                        if (response.error !== undefined) {
                            this.AppX.runtimeConfig.toast.Show("查询失败，请联系管理员");
                            return;
                        }
                        var configObj = this.config.deviceForLayer[this.plan_type_id];
                        var layername = configObj.layername;
                        var mapitems = [];
                        //内容
                        response.features.forEach((p, itemindx) => {
                            var jsgeo = p.geometry;
                            var geometryobj = null;
                            if (jsgeo.hasOwnProperty("paths")) {
                                geometryobj = {
                                    "paths": jsgeo.paths,
                                    "spatialReference": { "wkid": this.map.spatialReference.wkid }
                                };

                            } else if (jsgeo.hasOwnProperty("rings")) {
                                geometryobj = {
                                    "rings": jsgeo.rings,
                                    "spatialReference": { "wkid": this.map.spatialReference.wkid }
                                };
                            } else {
                                geometryobj = { "x": jsgeo.x, "y": jsgeo.y, "spatialReference": { "wkid": this.map.spatialReference.wkid } }
                            }

                            var content = new Object();
                            for (var i = 0; i < configObj.showfields.length; i++) {
                                content[configObj.showfields[i]] = p.attributes[configObj.showfields[i]];
                            }

                            var item = {
                                geometry: geometryobj,
                                content: JSON.stringify(content),
                                device_type_id: this.plan_type_id,
                                regionname: this.regionname,
                                sid: layername + "-" + p.attributes[configObj.keyfield],
                                attributes: p.attributes
                            }
                            mapitems.push(item);
                        });
                        if (mapitems.length > 0) {
                            this.removeSelectMapItems(mapitems);
                        }
                    }.bind(this),
                    error: function (results) {
                        this.loadWait.Hide();
                        this.toast.Show("查询片区巡检信息出错！");
                    }.bind(this)
                });

            }.bind(this));
        }.bind(this));

        //设备当前页全选
        this.domObj.find('.deviceslist-selected').off("change").on("change", function () {
            if (this.domObj.find(".deviceslist-selected").prop('checked') == true) {
                this.domObj.find(".deviceslist-select").each(function () {
                    $(this).prop('checked', true);
                    that.removeOrAddServiceItem(true, $(this));
                });
            } else {
                this.domObj.find(".deviceslist-select").each(function () {
                    $(this).prop('checked', false);
                    that.removeOrAddServiceItem(false, $(this));
                });
            }
            that.loadWait.Show("正在添加选中项，请等待...", that.domObj);
            that.addSelectItems(that);
            that.loadWait.Hide();
        }.bind(that));

        //直接返回到计划列表
        this.domObj.find('.btn_return').off("click").on("click", function () {
            this.initEventVal();
        }.bind(this));

        //上一步 片区列表
        this.domObj.find('.btn_previous_step').off("click").on("click", function () {
            this.domObj.empty().append(this.template.split('$$')[2]);
            this.initEvent3();
        }.bind(this));

        //查询
        this.domObj.find('.btn_search').off("click").on("click", function () {
            var url = this.AppX.appConfig.gisResource.pipedata.config[this.config.mapindex].url;
            var content = this.domObj.find(".serchcontent").val();
            var where = "", cfg = this.config.deviceForLayer[this.plan_type_id];
            where = cfg.where;
            var codes = AppX.appConfig.range.replace(/;/g, ',');
            if (codes != "")
                where += " and " + cfg.managelayerfieldname + ' in (' + codes + ')';
            var str = "";
            for (var i = 0; i < cfg.searchfields.length; i++) {
                str += " and " + cfg.searchfields[i] + " like '%" + content + "%'"
            }
            if (content != "") {
                where += str;
            }

            this.loadWait.Show("正在查询片区中巡检类型信息，请等待...", this.domObj);
            this.SearchDevicesIDs(url, cfg.layerid, cfg.layername, this.currentRegionPolygon, where, cfg.outfields);
        }.bind(this));

        // 选中行高亮
        this.domObj.off("click").on('click', '.deviceslist-select tr', (e) => {
            this.domObj.find('.deviceslist-select tr.active').removeClass('active');
            $(e.currentTarget).addClass('active');
            this.missionschedule_plandetail_polylinelayer.clear();
            if ($(e.currentTarget).data("geometry").hasOwnProperty("paths")) {
                var polylineJson = {
                    "paths": $(e.currentTarget).data("geometry").paths,
                    "spatialReference": { "wkid": this.map.spatialReference.wkid }
                };
                var mappolyline = new Polyline(polylineJson);
                this.map.setExtent(mappolyline.getExtent());
                this.missionschedule_plandetail_polylinelayer.add(new Graphic(mappolyline, this.setGraphSymbol("polyline", 2)));
            } else if ($(e.currentTarget).data("geometry").hasOwnProperty("rings")) {
                var polygonJson = {
                    "rings": $(e.currentTarget).data("geometry").rings,
                    "spatialReference": { "wkid": this.map.spatialReference.wkid }
                };
                var mapPolygon = new Polygon(polygonJson);
                this.map.setExtent(mapPolygon.getExtent());
                this.missionschedule_plandetail_polylinelayer.add(new Graphic(mapPolygon, this.setGraphSymbol("polygon")));
            } else {
                var mapPoint = new Point({ "x": $(e.currentTarget).data("geometry").x, "y": $(e.currentTarget).data("geometry").y, "spatialReference": { "wkid": this.map.spatialReference.wkid } });
                this.map.centerAndZoom(mapPoint, 7);
                this.missionschedule_plandetail_polylinelayer.add(new Graphic(mapPoint, this.setGraphSymbol("point")));
            }
        });

    }

    //计划添加完成
    addMissionScheduleInfoCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            console.log(results.message);
            return;
        } else {
            this.devices_selected = [];
            this.devices_selected_layers.clear();
            that.toast.Show("添加巡检计划成功！");
            this.initEventVal();
        }
    }

    //删除计划完成
    deleteMissionScheduleCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        } else {
            this.planid = "";
            that.toast.Show("删除巡检计划成功！");
            this.getMissionSchedule();
        }
    }

    //删除计划完成
    cancellMissionScheduleCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        } else {
            this.planid = "";
            that.toast.Show("巡检计划作废成功！");
            this.getMissionSchedule();
        }
    }

    //复制计划
    copyCallback(results) {
        var that = this;
        if (results.code != 1) {
            this.popup.ShowTip(results.message);
            return;
        } else {
            this.popup.Close();
            that.toast.Show("计划复制成功！");
            this.initEventVal();
        }
    }

    //更新计划
    updateCallback(results) {
        var that = this;
        if (results.code != 1) {
            this.popup.ShowTip(results.message);
            return;
        } else {
            this.popup.Close();
            that.toast.Show("计划修改成功！");
            this.initEventVal();
        }
    }

    //计划提交
    submitMissionScheduleCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        } else {
            this.planid = "";
            that.toast.Show("提交巡检计划成功！");
            this.getMissionSchedule();
        }
    }

    //设置点、线或多边形的样式
    setGraphSymbol(type, size?) {
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

                break;
            case "polyline":
                symbol.SimpleLineSymbol = new SimpleLineSymbol({
                    color: new Color(this.config.color),
                    style: "solid",   //线的样式 dash|dash-dot|solid等	
                    width: size ? size : 3
                });
                break;

            case "polygon":
                symbol.SimpleFillSymbol = new SimpleFillSymbol({
                    color: new Color([0, 0, 255, 0.5]),
                    style: "solid",
                    outline: {
                        color: new Color(this.config.color),
                        width: 1

                    }
                });
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

    /**
     * @function 设置渲染符号
     * @param type(point,polyline,polygon)
     * @param color颜色（[0,0,0,1]）
     * @param size
     */
    setGraphSymbolByType(type, color, size) {
        var symbol = {
            "SimpleMarkerSymbol": null,
            "SimpleLineSymbol": null,
            "SimpleFillSymbol": null,
        };
        switch (type) {
            case "point":
                symbol.SimpleMarkerSymbol = new SimpleMarkerSymbol(
                    {
                        color: new Color(color),
                        style: "diamond",       //点样式solid\cross\square|diamond|circle|x
                        outline: {
                            color: new Color(color),
                            width: size
                        }
                    }
                );

                break;
            case "polyline":
                symbol.SimpleLineSymbol = new SimpleLineSymbol({
                    color: new Color(color),
                    style: "solid",   //线的样式 dash|dash-dot|solid等	
                    width: size
                });
                break;

            case "polygon":
                symbol.SimpleFillSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
                    new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                        new Color(color), size), new Color([0, 0, 0, 0.1]));
                break;
        }
        if (symbol.SimpleMarkerSymbol != null) {
            return symbol.SimpleMarkerSymbol.setSize(size);
        } else if (symbol.SimpleLineSymbol != null) {
            return symbol.SimpleLineSymbol;
        } else {
            return symbol.SimpleFillSymbol;
        }
    }

    //显示
    addClusters(resp, device_type_id) {
        var photoInfo = { "data": [] };
        var wgs = new SpatialReference({
            "wkid": this.map.spatialReference.wkid
        });
        photoInfo.data = arrayUtils.map(resp, function (p) {
            var attributes = {
                "Caption": p.device_type_name,
                "device_type_name": p.device_type_name,
                "troubletype": p.troubletype,
                "trouble_notes": p.trouble_notes,
                "address": p.address,
                "trouble_username": p.trouble_username,
                "trouble_findtime": p.trouble_findtime,
                "trouble_regioname": p.trouble_regioname
            };
            return {
                "x": p.lng - 0,
                "y": p.lat - 0,
                "attributes": attributes
            };
        }.bind(this));

        var popupTemplate2 = new PopupTemplate({});

        popupTemplate2.setContent(this.template.split('$$')[8]);

        // cluster layer that uses OpenLayers style clustering
        if (this.missionschedule_planpoint_clusterLayer != null) {
            this.map.removeLayer(this.missionschedule_planpoint_clusterLayer);
            this.missionschedule_planpoint_clusterLayer = null;
        }
        this.missionschedule_planpoint_clusterLayer = new ClusterLayer({
            "basemap": this.map,
            "data": photoInfo.data,
            "distance": 10,
            "id": "missionschedule_planpoint_clusters",
            "labelColor": "#fff",
            "labelOffset": 10,
            "resolution": this.map.extent.getWidth() / this.map.width,
            "singleColor": "#888",
            "singleTemplate": popupTemplate2,
            "spatialReference": wgs
        });
        var defaultSym = new SimpleMarkerSymbol().setSize(4);
        var renderer = new ClassBreaksRenderer(defaultSym, "clusterCount");
        var blue = new PictureMarkerSymbol(this.config.layersymbol[device_type_id], 48, 48).setOffset(0, 15);
        renderer.addBreak(0, 10000, blue);//范围放大点，用一种图标渲染
        this.missionschedule_planpoint_clusterLayer.setRenderer(renderer);

        this.map.addLayer(this.missionschedule_planpoint_clusterLayer);

    }

    //设置点的样式
    setSymbol(txt?) {
        var symbol = [];
        var fillSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASHDOT, new Color([255, 0, 0]), 2), new Color([0, 0, 0, 0.1]));
        var fillSymbol2 = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([255, 255, 0]), 2), new Color([255, 255, 255, 0.3]));

        var peopleSymbol = new PictureMarkerSymbol(this.config.MarkPictureSymbol, 24, 24);
        //根据字长度设置背景图片宽度
        var peopletextSymbol = new PictureMarkerSymbol(this.config.TextbgSymbol, txt == null ? 0 : txt.length * 90 / 6, 18);
        var warnSymbol = new PictureMarkerSymbol(this.config.WarnMarkPictureSymbol, 24, 24);
        var lineSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([255, 0, 0]), 3);
        symbol.push(peopleSymbol);
        symbol.push(peopletextSymbol);
        symbol.push(fillSymbol);
        symbol.push(fillSymbol2);
        symbol.push(warnSymbol);
        symbol.push(lineSymbol);
        return symbol;
    }

    /**
     * @function 设置符号样式
     * @param point
     * @param txt 文字内容
     * @param layer 图层
     */
    addTextToLayer(point, txt, layer) {
        var graphictextbg = new Graphic(point, this.setSymbol(txt)[1].setOffset(0, -20), "");
        layer.add(graphictextbg);
        //添加文字
        var peopleTextSymbol = new TextSymbol(txt);
        peopleTextSymbol.setOffset(0, -25);
        var font = new Font();
        font.setSize("10pt");
        font.setWeight(Font.WEIGHT_BOLD);
        peopleTextSymbol.setFont(font);
        var graphicText = new Graphic(point, peopleTextSymbol, "");
        layer.add(graphicText);
    }

    /**--------------------第一页 计划查询显示、新增、复制、提交------------------- */
    /**
     * @function 查询所有计划信息
     */
    getMissionSchedule() {
        this.loadWait.Show("正在查询计划信息，请等待...", this.domObj);
        this.planClear();
        this.companyid = (this.iszgs == true ? this.domObj.find(".company option:selected").val() : "");
        this.plans_selected = [];
        this.copyplans_selected = [];
        this.currentPagePlans = new Object();
        var depid = this.domObj.find(".department option:selected").val();
        var userid = this.domObj.find(".users option:selected").val();
        var startdate = this.domObj.find(".plan_begindate").val();
        var enddate = this.domObj.find(".plan_enddate").val();
        this.domObj.find('.planslist-selected').prop('checked', false);
        $.ajax({
            headers: this.getHeaders(0),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getMissionScheduleList,
            data: {
                "pageindex": this.config.pagenumber,
                "pagesize": this.config.pagesize,
                "user_id": (userid == undefined ? "" : userid),
                "depid": (depid == undefined ? "" : depid),
                "plan_begindate": startdate,
                "plan_enddate": enddate,
                "companyid": this.companyid
            },
            success: this.getMissionScheduleListCallback.bind(this),
            error: function (data) {
                this.loadWait.Hide();
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }
    getMissionScheduleListCallback(results) {
        console.log(results);
        this.loadWait.Hide();
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        }
        if (results.result.total % that.config.pagesize == 0) {
            that.config.pagetotal = Math.floor(parseInt(results.result.total) / that.config.pagesize);

        } else {
            that.config.pagetotal = Math.floor(parseInt(results.result.total) / that.config.pagesize) + 1;
        }
        if (results.result.rows.length == 0) {
            that.toast.Show("当前成员未安排巡检计划！");
            var domtb = this.domObj.find(".planslist").empty();
            this.domObj.find(".pagecontrol").text("总共-条，每页");
            this.domObj.find(".content").text("第-页共-页");
            return;
        }

        //为分页控件添加信息
        this.domObj.find(".pagecontrol").text("总共" + results.result.total + "条，每页");
        this.domObj.find(".content").text("第" + that.config.pagenumber + "页共" + that.config.pagetotal + "页");
        if (that.config.pagetotal == 0) {
            this.domObj.find(".pagecontrol").text("总共-条，每页");
            this.domObj.find(".content").text("第-页共-页");
        }
        //动态生成书签及分页控件
        var html_trs_data = "", regions = [];

        $.each(results.result.rows, function (i, item) {
            var checkstate = "未审核";
            var submit = "";
            if (item.isvalid == 0) {
                checkstate = "未审核";
            } else if (item.isvalid == 1) {
                checkstate = "通过审核 ";
            } else if (item.isvalid == 2) {
                checkstate = "未通过审核";
            }
            if (item.plan_state == 6)
                submit = "unsubmit";
            this.currentPagePlans[item.child_plan_id] = item.point_info;
            html_trs_data += "<tr class='goto " + submit + "' data-plan_id='"
                + item.child_plan_id + "' data-geometry='"
                + item.geometry + "' data-create_time='"
                + item.create_time + "' data-depname='"
                + item.depname + "' data-interval_days='"
                + item.interval_days + "' data-user_name='"
                + item.user_name + "' data-user_id='"
                + item.user_id + "' data-percent='"
                + item.percent + "'  data-region_id='"
                + item.region_id + "' data-region_name='"
                + item.region_name + "'  data-device_type_id='"
                + item.device_type_id + "'  data-device_type_name='"
                + item.device_type_name + "'  data-period_name='"
                + item.period_name + "'  data-period_id='"
                + item.period_id + "' data-plan_begindate='"
                + item.plan_begindate + "' data-plan_enddate='"
                + item.plan_enddate + "' data-plan_state='"
                + item.plan_state + "' data-check_state='"
                + checkstate + "'><td class='checkwidth'><input type='checkbox' class='planslist-select' data-plan_id='"
                + item.child_plan_id + "' data-geometry='"
                + item.geometry + "' data-create_time='"
                + item.create_time + "' data-depname='"
                + item.depname + "' data-interval_days='"
                + item.interval_days + "' data-user_name='"
                + item.user_name + "' data-user_id='"
                + item.user_id + "' data-percent='"
                + item.percent + "'  data-region_id='"
                + item.region_id + "' data-region_name='"
                + item.region_name + "'  data-device_type_id='"
                + item.device_type_id + "'  data-device_type_name='"
                + item.device_type_name + "'  data-period_name='"
                + item.period_name + "'  data-period_id='"
                + item.period_id + "' data-plan_begindate='"
                + item.plan_begindate + "' data-plan_enddate='"
                + item.plan_enddate + "' data-plan_state='"
                + item.plan_state + "' data-check_state='"
                + checkstate + "'/></td>"
                + (this.iszgs == true ? "<td title='" + this.companydatas[item.companyid] + "'>" + this.companydatas[item.companyid] + "</td>" : "")
                + "<td title='" + item.depname + "'>"
                + item.depname + "</td><td title='" + item.user_name + "'>"
                + item.user_name + "</td><td title='" + item.period_name + "'>"
                + item.period_name + "</td><td title='" + item.device_type_name + "'>"
                + item.device_type_name + "</td><td title='" + item.region_name + "'>"
                + item.region_name + "</td><td title='" + item.plan_begindate.split(" ")[0] + "'>"
                + item.plan_begindate.split(" ")[0] + "</td><td title='" + item.plan_enddate.split(" ")[0] + "'>"
                + item.plan_enddate.split(" ")[0] + "</td><td title='" + item.create_user + "'>"
                + item.create_user + "</td><td title='" + item.create_time + "'>"
                + item.create_time + "</td><td title='" + item.plan_process_name + "'>"
                + item.plan_process_name
                //+ "</td><td title='"+checkstate+"'>" 
                //+ checkstate + "</td><td title='"+item.check_note+"'>"
                //+item.check_note
                + "</td></tr>";

            //图层上加计划所属片区图形 去掉重复的片区
            var isexist = false;
            for (var k = 0; k < regions.length; k++) {
                if (regions[k] != "" && regions[k] == item.region_id) {
                    isexist = true;
                    break;
                }
            }
            if (!isexist) {
                regions.push(item.region_id);
                var pobj;
                if (item.geometry != "") {
                    if (typeof (item.geometry) == 'string') {
                        pobj = new Polygon(JSON.parse(item.geometry));
                    } else {
                        pobj = new Polygon(item.geometry);
                    }
                    var sym = this.setGraphSymbolByType("polygon", this.config.RegionColor, 1);
                    var graphic = new Graphic(pobj, this.setSymbol(item.region_name)[2], "");
                    if (graphic.attributes == undefined || graphic.attributes == "") {
                        graphic.attributes = { "id": "" }
                    }
                    graphic.attributes["id"] = item.plan_id;
                    this.plan_pontype_layer.add(graphic);
                    if (item.region_name != null && item.region_name != "")
                        this.addTextToLayer(pobj.getExtent().getCenter(), item.region_name, this.plan_pontype_layer);
                }

            }

        }.bind(this));
        this.domObj.find(".planslist").empty().append(html_trs_data);
        this.domObj.find(".currentpagecontrol").text(",当前勾选" + this.plans_selected.length + "条");

        //计划勾选
        this.domObj.find('.planslist-select').off("change").on("change", function (e) {
            this.removeOrAddPlanItem(e.currentTarget.checked, $(e.currentTarget));
        }.bind(this));
    }

    /**
     * @function 增加或移除缓存中的计划选择
     * @param ischecked 是否加入
     * @param currentTarget 数据集合
     */
    removeOrAddPlanItem(ischecked, currentTarget) {
        var item = {
            "plan_id": currentTarget.data('plan_id'),
            "geometry": currentTarget.data('geometry'),
            "user_id": currentTarget.data('user_id'),
            "region_id": currentTarget.data('region_id'),
            "period_id": currentTarget.data('period_id'),
            "plan_begindate": currentTarget.data('plan_begindate'),
            "plan_enddate": currentTarget.data('plan_enddate'),
            "plan_state": currentTarget.data('plan_state'),
            "check_state": currentTarget.data('check_state')
        },
            copyItem = {
                "plan_state": currentTarget.data('plan_state'),
                "plan_id": currentTarget.data('plan_id'),
                "user_id": currentTarget.data('user_id'),
                "start_date": currentTarget.data('plan_begindate'),
                "end_date": currentTarget.data('plan_enddate'),
                "region_id": currentTarget.data('region_id'),
                "region_name": currentTarget.data('region_name'),
                "depname": currentTarget.data('depname'),
                "user_name": currentTarget.data('user_name'),
                "period_name": currentTarget.data('period_name'),
                "period_id": currentTarget.data('period_id'),
                "device_type_id": currentTarget.data('device_type_id'),
                "device_type_name": currentTarget.data('device_type_name'),
                "interval_days": currentTarget.data('interval_days')
            };
        if (ischecked) {//添加
            var isExist = 0;
            for (var i = 0; i < this.plans_selected.length; i++) {
                var arrSid = this.plans_selected[i];
                if (arrSid.plan_id == item.plan_id) {
                    isExist = 1;
                    break;
                }
            }
            if (isExist == 0) {
                this.plans_selected.push(item);
                this.copyplans_selected.push(copyItem);
            }


        } else {//取消
            var arrSids = [], arrCopySids = [];
            for (var i = 0; i < this.plans_selected.length; i++) {
                var arrSid = this.plans_selected[i];
                var arrCopySid = this.copyplans_selected[i];
                if (arrSid.plan_id != item.plan_id) {
                    arrSids.push(arrSid);
                    arrCopySids.push(arrCopySid);
                }
            }
            this.plans_selected = arrSids;
            this.copyplans_selected = arrCopySids;
        }

        this.domObj.find(".currentpagecontrol").text(",当前勾选" + this.plans_selected.length + "条");
    }

    /**
     * @function 显示计划所有内容
     * @param infos
     */
    showMissionScheduleListPlans(plan_id) {
        var infos = (this.currentPagePlans != null ? JSON.parse(this.currentPagePlans[plan_id]) : null);
        this.plan_ptype_layer.clear();
        if (infos != null) {
            var gxs = {
                "polygon": [],
                "polyline": [],
                "point": []
            };
            for (var i = 0; i < infos.length; i++) {
                var info = infos[i];
                if (info) {
                    var device_type_id = info.device_type_id, color = "blue";
                    if (device_type_id != "")
                        color = this.config.DeviceSymbol[device_type_id];
                    var pobj = null, sym = null, graphic = null;
                    if (info.geometry == undefined) {
                        return;
                    }
                    if (info.geometry.hasOwnProperty("paths")) {//线
                        pobj = new Polyline(info.geometry);
                        sym = this.setGraphSymbolByType("polyline", color, 2);
                        graphic = new Graphic(pobj, sym);
                        gxs.polyline.push(graphic);
                    } else if (info.geometry.hasOwnProperty("rings")) {//面
                        pobj = new Polygon(info.geometry);
                        sym = this.setGraphSymbolByType("polygon", color, 1);
                        graphic = new Graphic(pobj, sym);
                        gxs.polygon.push(graphic);
                    } else {
                        pobj = new Point(info.geometry);
                        sym = this.setGraphSymbolByType("point", color, 6);
                        graphic = new Graphic(pobj, sym);
                        gxs.point.push(graphic);
                    }
                }
            }

            gxs.polygon.forEach((p, index) => {
                this.plan_ptype_layer.add(p);
            });
            gxs.polyline.forEach((p, index) => {
                this.plan_ptype_layer.add(p);
            });
            gxs.point.forEach((p, index) => {
                this.plan_ptype_layer.add(p);
            })
        }
    }


    /**
     * @function 获取部门列表
     */
    getGroup() {
        $.ajax({
            headers: this.getHeaders(0),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getGroupList,
            data: {
                "pageindex": 1,
                "pagesize": this.config.pagemaxsize,
                "companyid": this.companyid
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
            that.toast.Show(results.message);
            return;
        }
        var strdepartment = "<option value='' selected>全部</option>";
        $.each(results.result.rows, function (index, item) {
            strdepartment += "<option value='" + item.id + "'>" + item.name + "</option>";
        }.bind(this));
        this.domObj.find(".department").empty().append(strdepartment);
        this.getUser(true);
    }

    /**
     * @function 根据部门id获取用户列表，空代表查询全部
     * @param isall 是否全部
     */
    getUser(isall) {
        if (this.ispartment == false) {
            this.depid = this.domObj.find(".department option:selected").val();
        }
        $.ajax({
            headers: this.getHeaders(0),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getUserList,
            data: {
                "pageindex": 1,
                "pagesize": this.config.pagemaxsize,
                "depid": this.depid,
                "companyid": this.companyid,
                "patrol_type": this.patrol_type
            },
            success: function (results) {
                var that = this;
                if (results.code != 1) {
                    that.toast.Show("查询用户信息出错！");
                    console.log(results.message);
                    return;
                }
                var users = this.domObj.find(".users").empty();
                var strusers = "<option value='' selected>全部</option>";
                if (isall == false) {
                    strusers = "";
                }
                $.each(results.result.rows, function (index, item) {
                    strusers += "<option value=" + item.userid + " > " + item.username + " </option>";
                }.bind(this));
                users.append(strusers);
            }.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }


    /**
    * @function 获取部门列表
    */
    getCopyGroup() {
        $.ajax({
            headers: this.getHeaders(1),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getGroupList,
            data: {
                "pageindex": 1,
                "pagesize": this.config.pagemaxsize
            },
            success: this.getCopyGroupListCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }
    getCopyGroupListCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("查询部门信息出错！");
            console.log(results.message);
            return;
        }
        if (this.copyPopup != null && this.copyplans_selected.length > 0) {
            var copyDepids = [];
            for (var i = 0; i < this.copyplans_selected.length; i++) {
                var cpdp = "", obj = this.copyplans_selected[i];
                $.each(results.result.rows, function (index, item) {
                    if (obj.depname == item.name) {
                        copyDepids.push(item.id);
                        cpdp += "<option idx='" + i + "' value='" + item.id + "' selected>" + item.name + "</option>";
                    } else {
                        cpdp += "<option idx='" + i + "' value='" + item.id + "'>" + item.name + "</option>";
                    }

                }.bind(this));
                this.copyPopup.conObj.find(".department" + i).empty().append(cpdp)
            }
            this.getCopyUser(copyDepids, 0, ".users0");
        }


    }

    /**
     * @function 根据部门id获取用户列表，空代表查询全部
     * @param depids 部门id集合
     * @param idx 顺序号
     * @param userclassid
     */
    getCopyUser(depids, idx, userclassid) {
        if (idx >= depids.length) {
            return;
        }
        $.ajax({
            headers: this.getHeaders(1),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getUserList,
            data: {
                "pageindex": 1,
                "pagesize": this.config.pagemaxsize,
                "depid": depids[idx]
            },
            success: function (results) {
                if (results.code != 1) {
                    this.toast.Show(results.message);
                    return;
                }

                if (this.copyPopup != null && this.copyplans_selected.length > 0) {
                    var cpdp = "", obj = this.copyplans_selected[idx];
                    $.each(results.result.rows, function (index, item) {
                        if (obj.user_id == item.userid) {
                            cpdp += "<option idx='" + idx + "' value='" + item.userid + "' selected>" + item.username + "</option>";
                        } else {
                            cpdp += "<option idx='" + idx + "' value='" + item.userid + "'>" + item.username + "</option>";
                        }
                    }.bind(this));
                    this.copyPopup.conObj.find(userclassid).empty().append(cpdp);
                }
                idx = idx + 1;
                this.getCopyUser(depids, idx, ".users" + idx);
            }.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json"
        });
    }

    /**
     * @function 获取巡检类型
     */
    getPlanType() {
        $.ajax({
            headers: this.getHeaders(1),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getPlanType,
            data: {
                "pageindex": 1,
                "pagesize": this.config.pagemaxsize,
                "plan_mode": this.plan_mode
            },
            success: this.getPlanTypeListCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }
    getPlanTypeListCallback(results) {
        if (results.code != 1) {
            this.toast.Show(results.message);
            return;
        }
        var strplantype = "<option value=''>--请选择--</option>";
        $.each(results.result.rows, function (index, item) {
            strplantype += "<option value='" + item.device_id + "' data-device_type_id='" + item.device_type_id + "'>" + item.name + "</option>";
        }.bind(this));
        this.domObj.find(".plantype").empty().append(strplantype);
        this.getPeriod();//巡检周期 
    }

    /**
     * @function 获取巡检周期
     */
    getPeriod() {
        var plantype = this.domObj.find(".plantype option:selected").val();
        if (plantype == "") {
            this.domObj.find(".periodid").empty().append("<option value='' data-days='0'>--请选择--</option>");
            this.initTimes();
        } else {
            $.ajax({
                headers: this.getHeaders(1),
                type: "POST",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getPeriod,
                data: {
                    "pageindex": 1,
                    "pagesize": this.config.pagemaxsize,
                    "device_id": plantype
                },
                success: this.getPeriodListCallback.bind(this),
                error: function (data) {
                    this.toast.Show("服务端ajax出错，获取数据失败!");
                }.bind(this),
                dataType: "json",
            });
        }
    }
    getPeriodListCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        }
        var strperiod = "";
        $.each(results.result, function (index, item) {
            strperiod += "<option value='" + item.period_id + "'  data-days='" + item.interval_days + "'>" + item.period_name + "</option>";
        }.bind(this));
        this.domObj.find(".periodid").empty().append(strperiod);
        this.initTimes();//初始化周期时间
    }

    /**--------------------计划周期时间控制--------------------- */
    endDate = {
        format: 'YYYY-MM-DD', //日期格式  
        isinitVal: false,
        minDate: "2017-08-28",
        maxDate: "2017-08-28"
    }
    startDate = {
        format: 'YYYY-MM-DD', //日期格式  
        isinitVal: false,
        minDate: "2017-08-28",
        maxDate: "2017-08-28",
        choosefun: function (elem, val, date) {
            var period_id = this.domObj.find(".periodid option:selected").val() + "";
            var dt = new Date(val.replace(/-/g, "/"));
            if (period_id == "1") {
                this.endDate.minDate = val;
            } else if (period_id == "2") {
                this.endDate.minDate = Functions.DateFormat(new Date(dt.getTime() + 24 * 3600000), "yyyy-MM-dd");
            }
            this.domObj.find(".plan_enddate").val(this.endDate.minDate);
        }.bind(this)
    }

    /**
     * @function 控制时间
     */
    initTimes() {
        var period_id = this.domObj.find(".periodid option:selected").val() + "";
        if (period_id != "") {
            var days = this.domObj.find(".periodid option:selected").data('days');
            //+24*2*3600000     
            var enowDt = new Date(Functions.DateFormat(new Date((new Date()).getTime() + 24 * 1 * 3600000), "yyyy-MM-dd")), nowDt, num = 1, edt, sedt;
            //+24*3600000
            nowDt = new Date(Functions.DateFormat(new Date((new Date()).getTime()), "yyyy-MM-dd"));
            switch (period_id) {
                case "1"://一天一巡
                    sedt = new Date(nowDt.getTime() + 24 * 6 * 3600000);
                    this.startDate.minDate = Functions.DateFormat(nowDt, "yyyy-MM-dd");
                    this.startDate.maxDate = Functions.DateFormat(sedt, "yyyy-MM-dd");
                    this.endDate.minDate = Functions.DateFormat(nowDt, "yyyy-MM-dd");
                    this.endDate.maxDate = Functions.DateFormat(sedt, "yyyy-MM-dd");
                    break;
                case "2"://两天一巡                    
                    sedt = new Date(nowDt.getTime() + 24 * 6 * 3600000);
                    this.startDate.minDate = Functions.DateFormat(nowDt, "yyyy-MM-dd");
                    this.startDate.maxDate = Functions.DateFormat(sedt, "yyyy-MM-dd");
                    this.endDate.minDate = Functions.DateFormat(enowDt, "yyyy-MM-dd");
                    this.endDate.maxDate = Functions.DateFormat(sedt, "yyyy-MM-dd");
                    break;
                case "3"://一周一巡
                case "4"://半月一巡                
                case "5"://一月一巡
                case "8":
                case "6"://两月一巡                
                case "7"://半年一巡
                case "9":
                case "10"://两年一巡
                    nowDt = this.getFirstDate(period_id);
                    sedt = this.getLastDate(period_id, nowDt);
                    this.startDate.minDate = Functions.DateFormat(nowDt, "yyyy-MM-dd");
                    this.startDate.maxDate = Functions.DateFormat(nowDt, "yyyy-MM-dd");
                    this.endDate.minDate = Functions.DateFormat(sedt, "yyyy-MM-dd");
                    this.endDate.maxDate = Functions.DateFormat(sedt, "yyyy-MM-dd");
                    break;
                case "11"://自定义11               
                    if (days < 7) {
                        num = Math.floor(7 / days);//向下取整
                        edt = new Date(nowDt.getTime() + 24 * (days * num - 1) * 3600000);
                        sedt = edt;
                        this.endDate.minDate = Functions.DateFormat(nowDt, "yyyy-MM-dd");
                        this.endDate.maxDate = Functions.DateFormat(edt, "yyyy-MM-dd");
                    } else {
                        edt = new Date(nowDt.getTime() + 24 * (days - 1) * 3600000);
                        this.endDate.minDate = Functions.DateFormat(nowDt, "yyyy-MM-dd");
                        this.endDate.maxDate = Functions.DateFormat(edt, "yyyy-MM-dd");
                    }
                    break;
            }

            $.jeDate(".plan_begindate", this.startDate);
            this.domObj.find(".plan_begindate").val(this.startDate.minDate);
            $.jeDate(".plan_enddate", this.endDate);
            this.domObj.find(".plan_enddate").val(this.endDate.minDate);
        }
    }

    /**
     * @function 获取起止时间---临时用
     * @param dtype 3一周一巡、4半月一巡、5,8一月一巡、6两月一巡、7,9半年一巡、10两年一巡
     */
    getFirstDate(dtype) {
        var dt = new Date((new Date()).getTime());//+24*3600000
        // dtype = dtype + '';
        // while (1 == 1) {
        //     if (dtype == '3') {
        //         var wday = dt.getDay();
        //         if (wday == 1) {
        //             break;
        //         }
        //     } else if (dtype == '4') {
        //         var mday = dt.getDate();
        //         if (mday == 1 || mday == 16) {
        //             break;
        //         }
        //     } else {
        //         var mday = dt.getDate();
        //         if (mday == 1) {
        //             break;
        //         }
        //     }
        //     dt = new Date(dt.getTime() + 24 * 1 * 60 * 60 * 1000)
        // }

        return dt;
    }

    // getFirstDate(dtype){//正式使用
    //     var dt=new Date((new Date()).getTime()+24*3600000);
    //     dtype=dtype+'';
    //     while(1==1){
    //         if(dtype=='3'){
    //             var wday= dt.getDay(); 
    //             if(wday==1){
    //                 break;
    //             }
    //         }else if(dtype=='4'){
    //             var mday=dt.getDate();
    //             if(mday==1 || mday==16){
    //                 break;
    //             }
    //         }else{
    //             var mday=dt.getDate();
    //             if(mday==1){
    //                 break;
    //             }
    //         }
    //         dt=new Date( dt.getTime() + 24*1*60*60*1000)
    //     }
    //     return dt;
    // }

    /**
     * @function 获取累计天数
     * @param sdt
     * @param mouthNum
     */
    getDays(sdt, mouthNum) {
        var days = 0;
        var year = sdt.getFullYear();
        var mouth = sdt.getMonth() + 1;
        for (var i = 1; i <= mouthNum; i++) {
            if (mouth > 12) {
                year = year + 1;
                mouth = 1
            }
            days += this.getMouthTotalDays(year, mouth);
            mouth = mouth + 1;
        }
        return days;
    }

    /**
     * @function 获取每月总天数
     * @param year
     * @param mouth
     */
    getMouthTotalDays(year, mouth) {
        var days = 0;
        if (mouth == 2) {
            days = year % 4 == 0 ? 29 : 28;
        } else if (mouth == 1 || mouth == 3 || mouth == 5 || mouth == 7 || mouth == 8 || mouth == 10 || mouth == 12) {
            days = 31;
        } else {
            days = 30;
        }
        return days;
    }

    /**
     * @function 获取最后取值时间
     * @param dtype 3一周一巡、4半月一巡、5,8一月一巡、6两月一巡、7,9半年一巡、10两年一巡
     * @param sdate 开始时间
     */
    /*getLastDate(dtype,sdate){
        var sdt=new Date(sdate);        
        var year=sdt.getFullYear();
        var mouth=sdt.getMonth()+1;       
        switch(dtype+""){           
            case "3"://一周一巡
                sdt=new Date(sdt.getTime() + 24*6*60*60*1000);
                break;
            case "4"://半月一巡
                sdt=new Date(sdt.getTime() + 24*14*60*60*1000);                
                break;
            case "5"://一月一巡
            case "8":
                sdt=new Date(sdt.getTime() + 24*29*60*60*1000);
                break;
            case "6"://两月一巡
                sdt=new Date(sdt.getTime() + 24*59*60*60*1000);
                break;
            case "7"://半年一巡
            case "9":
                sdt=new Date(sdt.getTime() + 24*179*60*60*1000);
                break;
            case "10"://两年一巡
                sdt=new Date(sdt.getTime() + 24*729*60*60*1000);
                break;
        }
        return sdt;
    }*/

    getLastDate(dtype, sdate) {//正式使用
        var sdt = new Date(sdate);
        var year = sdt.getFullYear();
        var mouth = sdt.getMonth() + 1;
        switch (dtype + "") {
            case "3"://一周一巡
                sdt = new Date(sdt.getTime() + 24 * 6 * 60 * 60 * 1000);
                break;
            case "4"://半月一巡
                if (sdt.getDate() == 1) {
                    sdt.setDate(15);
                } else {
                    sdt.setDate(this.getMouthTotalDays(year, mouth));
                }
                break;
            case "5"://一月一巡
            case "8":
                sdt = new Date(sdt.getTime() + 24 * (this.getDays(sdt, 1) - 1) * 60 * 60 * 1000);
                break;
            case "6"://两月一巡
                sdt = new Date(sdt.getTime() + 24 * (this.getDays(sdt, 2) - 1) * 60 * 60 * 1000);
                break;
            case "7"://半年一巡
            case "9":
                sdt = new Date(sdt.getTime() + 24 * (this.getDays(sdt, 6) - 1) * 60 * 60 * 1000);
                break;
            case "10"://两年一巡
                sdt = new Date(sdt.getTime() + 24 * (this.getDays(sdt, 24) - 1) * 60 * 60 * 1000);
                break;
        }
        return sdt;
    }

    /**--------------------巡检类型内容是否存在检查--------------- */
    current_device_type_name = "";

    /**
     * @function 巡检片区是否存在检查巡检点、巡检线、隐患点
     * @param current_region_id 检查片区
     * @param device_type_id 巡检类型
     * @param device_type_name 巡检类型名称
     */
    checkExistPlanDevice(current_region_id, device_type_id, device_type_name) {
        if (current_region_id != "") {
            this.loadWait.Show("正在检查片区中是否有" + device_type_name + "信息，请等待...", this.domObj);
            $.ajax({
                headers: this.getHeaders(1),
                type: "POST",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.isExitDevices + device_type_id,
                data: {
                    "id": device_type_id
                },
                success: function (results) {//设置不能进行下一步 
                    this.loadWait.Hide();
                    var isexist = false;
                    if (results.code != 1) {
                        this.toast.Show(results.message);
                        return;
                    }

                    for (var i = 0; i < results.result.length; i++) {
                        if (results.result[i].state == 1 && current_region_id == results.result[i].regionid) {
                            isexist = true;
                            break;
                        }
                    }
                    if (isexist) {//下一步，巡检点、巡检线、隐患选择
                        this.getPlanDeviceList();
                    } else {
                        this.toast.Show(" 抱歉，该片区内没有可以安排的" + device_type_name + "！");
                    }
                }.bind(this),
                error: function (data) {
                    this.loadWait.Hide();
                    this.toast.Show("服务端ajax出错，获取数据失败!");
                }.bind(this),
                dataType: "json",
            });
        } else {
            this.toast.Show("请选择片区！");
        }
    }

    /**
     * @function 检查巡检片区中是否存在该巡检类型信息（从图层检查）
     * @param region_geometry 检查片区
     * @param device_type_id 检查类型id
     * @param device_type_name 检查类型名称
     */
    checkExistPlanDeviceByLayer(region_geometry, device_type_id, device_type_name) {
        if (region_geometry == "") {
            this.toast.Show("片区图形为空，请选择片区！");
            return;
        }
        var polygon;
        if (typeof (region_geometry) == "string") {
            polygon = new Polygon(JSON.parse(region_geometry));
        } else {
            polygon = new Polygon(region_geometry);
        }
        var url = this.AppX.appConfig.gisResource.pipedata.config[this.config.mapindex].url;
        var obj = this.config.deviceForLayer[device_type_id];
        this.loadWait.Show("正在检查片区中是否有" + device_type_name + "信息，请等待...", this.domObj);
        var where = obj.where;
        var codes = AppX.appConfig.range.replace(/;/g, ',');
        if (codes != "")
            where += " and " + obj.managelayerfieldname + ' in (' + codes + ')';
        var param = { "where": where, "spatialRel": "esriSpatialRelContains", "returnGeometry": true, "geometryType": "esriGeometryPolygon", "geometry": JSON.stringify(polygon), "returnCountOnly": true, "returnIdsOnly": false, "f": "json" };
        $.ajax({
            type: "POST",
            url: url + "/" + obj.layerid + "/query",
            cache: false,
            data: param,
            dataType: "json",
            success: function (response) {
                if (response.error !== undefined) {
                    this.AppX.runtimeConfig.toast.Show("查询失败，请联系管理员");
                    this.loadWait.Hide();
                    return;
                }
                var count = response.count;
                this.loadWait.Hide();
                if (count > 0) {//下一步、设备选择
                    this.getPlanDeviceList(polygon);
                } else {
                    this.toast.Show(" 抱歉，该片区内没有" + device_type_name + "信息！");
                }

            }.bind(this),
            error: function (results) {
                this.loadWait.Hide();
                this.toast.Show("查询片区巡检信息出错！");
            }.bind(this)
        });
    }

    /**
     * @function 获取巡检片区内巡检信息
     * @param region_polygon 片区面
     */
    getPlanDeviceList(region_polygon?) {
        var url = this.AppX.appConfig.gisResource.pipedata.config[this.config.mapindex].url;
        var where = "", cfg = null;
        if (this.plan_type_id != 1 && this.plan_type_id != 5 && this.plan_type_id != 6) {
            cfg = this.config.deviceForLayer[this.plan_type_id];
            where = cfg.where;
            var codes = AppX.appConfig.range.replace(/;/g, ',');
            if (codes != "")
                where += " and " + cfg.managelayerfieldname + ' in (' + codes + ')';
        }
        switch (this.plan_type_id) {
            case 1://巡检点
            case 6://巡检线
                this.domObj.empty().append(this.template.split('$$')[4]);
                this.initEvent4();
                this.getRegionInfo(this.regionid, this.plan_type_id);
                break;
            case 5://查询隐患点
                this.domObj.empty().append(this.template.split('$$')[6]);
                this.initEvent4();
                this.getRegionInfo(this.regionid, this.plan_type_id);
                break;
            default:
                this.domObj.empty().append(this.template.split('$$')[7]);//设备选择
                this.domObj.find(".serch_names").text(this.config.deviceForLayer[this.plan_type_id].searchnamefields);

                var title_htmlstr = "<tr><th colspan='" + (cfg.selectshowfieldnames.length + 1) + "'>选中列表</th></tr><tr>";
                for (var k = 0; k < cfg.selectshowfieldnames.length; k++) {
                    title_htmlstr += "<th title='" + cfg.selectshowfieldnames[k] + "'>" + cfg.selectshowfieldnames[k] + "</th>";
                }
                title_htmlstr += "<th title='所属片区'>所属片区</th></tr>";
                this.domObj.find(".deviceslist-select-title").empty().append(title_htmlstr);

                //标题               
                var title_htmlstr2 = "<tr><th class='checkwidth'><input type='checkbox'  name='deviceslist-select' data-index=0 class='deviceslist-selected'/></th>";
                for (var k = 0; k < cfg.showfieldnames.length; k++) {
                    title_htmlstr2 += "<th title='" + cfg.showfieldnames[k] + "'>" + cfg.showfieldnames[k] + "</th>";
                }
                title_htmlstr2 += "<th title='所属片区'>所属片区</th></tr>";
                this.domObj.find(".deviceslist-title").empty().append(title_htmlstr2);
                this.initEvent4();
                //this.loadWait.Show("正在查询片区中"+this.current_device_type_name+"信息，请等待...",this.domObj);                        
                //this.SearchDevicesIDs(url, cfg.layerid, cfg.layername, region_polygon, where,cfg.outfields);                        
                break;
        }
    }

    /**
     * @function 获取存在该类型的片区列表
     */
    getAllPlanRegion() {
        this.loadWait.Show("正在查询片区，请等待...", this.domObj);
        $.ajax({
            headers: this.getHeaders(1),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getPlanRegionList,
            data: {
                "pageindex": this.config.pagenumber,
                "pagesize": this.config.pagesize,
                "keyword": this.domObj.find(".serchcontent").val(),
                "companyid": this.companyid
            },
            success: this.getAllPlanRegionListCallback.bind(this),
            error: function (data) {
                this.loadWait.Hide();
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }
    getAllPlanRegionListCallback(results) {
        this.loadWait.Hide();
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        }
        if (results.result.total % that.config.pagesize == 0) {
            that.config.pagetotal = Math.floor(parseInt(results.result.total) / that.config.pagesize);

        } else {
            that.config.pagetotal = Math.floor(parseInt(results.result.total) / that.config.pagesize) + 1;
        }
        if (results.result.rows.length == 0) {
            that.toast.Show("抱歉，当前未划分片区！");
            this.domObj.find(".planregionslist").empty();
            this.domObj.find(".pagecontrol").text("总共" + results.result.total + "条，每页");
            this.domObj.find(".pagecontrol").text("总共-条，每页");
            this.domObj.find(".content").text("第-页共-页");
            return;
        }

        //为分页控件添加信息
        this.domObj.find(".pagecontrol").text("总共" + results.result.total + "条，每页");
        this.domObj.find(".content").text("第" + that.config.pagenumber + "页共" + that.config.pagetotal + "页");
        if (that.config.pagetotal == 0) {
            this.domObj.find(".pagecontrol").text("总共-条，每页");
            this.domObj.find(".content").text("第-页共-页");
        }

        var html_trs_data = "";
        $.each(results.result.rows, function (i, item) {
            html_trs_data += "<tr class=goto data-user_id='" + item.user_id
                + "' data-regionid='" + item.regionid
                + "' data-regionname='" + item.regionname
                + "' data-geometry='" + item.geometry
                + "'><td title='" + item.regionname + "'>" + item.regionname
                + "</td><td title='" + item.address + "'>" + item.address
                + "</td><td title='" + item.notes + "'>" + item.notes
                + "</td><td title='" + item.pointnum + "'>" + item.pointnum
                + "</td><td title='" + item.pathnum + "'>" + item.pathnum
                + "</td><td title='" + item.troublenum + "'>"
                + item.troublenum + "</td></tr>";
        }.bind(this));
        this.domObj.find(".planregionslist").empty().append(html_trs_data);
    }


    /**
      * @function 获取存在该类型的片区,加载到地图上
      */
    getAllPlanRegionToMap() {
        $.ajax({
            headers: this.getHeaders(1),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getPlanRegionList,
            data: {
                "pageindex": 1,
                "pagesize": this.config.pagemaxsize,
                "companyid": this.companyid
            },
            success: function (results) {
                var that = this;
                if (results.code != 1) {
                    that.toast.Show(results.message);
                    return;
                }
                this.addPolygonGraphic(results);
            }.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    /**
     * 添加片区结果在地图上展示
     */
    addPolygonGraphic(queryResult) {
        this.plan_pontype_layer.clear();
        for (var i = 0, length = queryResult.result.rows.length; i < length; i++) {
            var row = queryResult.result.rows[i];
            if (row.geometry == undefined || row.geometry == "") { continue; }
            var polygon = new Polygon(JSON.parse(row.geometry));
            var graphic = new Graphic(polygon, this.setSymbol(row.regionname)[2], "");

            graphic.attr("id", "graphic" + i);
            this.plan_pontype_layer.add(graphic);

            if (row.regionname != null && row.regionname != "") {
                //添加背景
                var point = polygon.getExtent().getCenter();
                var graphictextbg = new Graphic(point, this.setSymbol(row.regionname)[1].setOffset(0, -20), "");
                this.plan_pontype_layer.add(graphictextbg);
                //添加文字
                var peopleTextSymbol = new TextSymbol(row.regionname);
                peopleTextSymbol.setOffset(0, -25);
                var font = new Font();
                font.setSize("10pt");
                font.setWeight(Font.WEIGHT_BOLD);
                peopleTextSymbol.setFont(font);
                var graphicText = new Graphic(point, peopleTextSymbol, "");
                this.plan_pontype_layer.add(graphicText);
            }
        }
    }

    /**
     * @function 加载设备信息
     * @param url 图层地址
     * @param layerid 图层顺序号
     * @param layername 图层名称
     * @param geometry 图形
     * @param where 查询条件
     * @param outfields 输出字段
     */
    SearchDevicesIDs(url, layerid, layername, geometry, where, outfields) {
        var queryTask = new QueryTask(url + "/" + layerid);
        var query = new Query();
        query.returnGeometry = false;
        query.where = where;
        query.geometry = geometry;
        query.spatialRelationship = Query.SPATIAL_REL_CONTAINS;//Query.SPATIAL_REL_INTERSECTS;
        var that = this;
        queryTask.executeForIds(query, function (results) {
            if (results == null) {
                this.loadWait.Hide();
                this.domObj.find(".deviceslist").empty();
                this.domObj.find(".pagecontrol").text("总共-条，每页");
                this.domObj.find(".content").text("第-页共-页");
                return;
            }
            this.sb_objectids = results;
            var subobjectids = [];
            this.config.pagenumber = 1;
            this.SearchDevices(results, 1);
        }.bind(this), function (results) {
            this.loadWait.Hide();
            this.toast.Show("查询片区巡检设备信息出错！");
        }.bind(this));
    }

    /**
     * @function 删除或存储选中设备项
     */
    removeOrAddServiceItem(ischecked, currentTarget) {
        var item = {
            "sid": undefined,
            "currentTarget": null,
            "geometry": "",
            "mapitem": null
        };
        if (currentTarget.data('ptsid') != undefined && currentTarget.data('ptsid') != null) {
            item = {
                "sid": currentTarget.data('ptsid'),
                "currentTarget": currentTarget,
                "geometry": currentTarget.data('geometry'),
                "mapitem": null
            };
        }

        if (item.sid == undefined) {//唯一值未空
            return;
        }

        if (ischecked) {//添加
            var isExist = 0;
            for (var i = 0; i < this.devices_selected.length; i++) {
                var arrSid = this.devices_selected[i];
                if (arrSid.sid == item.sid) {
                    isExist = 1;
                    break;
                }
            }
            if (isExist == 0)
                this.devices_selected.push(item);
        } else {//取消
            var arrSids = [];
            for (var i = 0; i < this.devices_selected.length; i++) {
                var arrSid = this.devices_selected[i];
                if (arrSid.sid != item.sid) {
                    arrSids.push(arrSid);
                }
            }
            this.devices_selected = arrSids;
        }

        this.domObj.find(".currentpagecontrol").text("当前勾选" + this.devices_selected.length + "条");

    }

    /**
     * @function 地图上选择
     */
    selectMapItems(mapitems) {
        if (mapitems != null && mapitems.length > 0) {
            for (var i = 0; i < mapitems.length; i++) {
                var iobj = mapitems[i];
                if (iobj.sid == undefined) {
                    continue;
                }
                var item = {
                    "sid": iobj.sid,
                    "currentTarget": null,
                    "geometry": iobj.geometry,
                    "mapitem": iobj
                };
                var isExist = 0;
                for (var j = 0; j < this.devices_selected.length; j++) {
                    var arrSid = this.devices_selected[j];
                    if (arrSid.sid == iobj.sid) {
                        isExist = 1;
                        break;
                    }
                }
                if (isExist == 0)
                    this.devices_selected.push(item);
            }
        }
        this.domObj.find(".currentpagecontrol").text("当前勾选" + this.devices_selected.length + "条");
        this.addSelectItems(this);
        this.selectListItems();
    }

    removeSelectMapItems(mapitems) {
        if (mapitems != null && mapitems.length > 0) {
            var selectItem = [];
            for (var j = 0; j < this.devices_selected.length; j++) {
                var arrSid = this.devices_selected[j];
                var isExist = 0;
                for (var i = 0; i < mapitems.length; i++) {
                    var iobj = mapitems[i];
                    if (iobj.sid == undefined) {
                        continue;
                    }
                    if (arrSid.sid == iobj.sid) {
                        isExist = 1;
                        break;
                    }
                }
                if (isExist == 0) {
                    selectItem.push(arrSid);
                }
            }
            this.devices_selected = selectItem;
        }
        this.domObj.find(".currentpagecontrol").text("当前勾选" + this.devices_selected.length + "条");
        this.addSelectItems(this);
        this.selectListItems();
    }

    /**
     * @function 勾选列表
     */
    selectListItems() {
        var sobjs = this.domObj.find('.deviceslist-select');
        var selectitems = this.devices_selected;
        for (var j = 0; j < sobjs.length; j++) {
            var sid = $(sobjs[j]).data('ptsid');
            var isExist = 0;
            for (var i = 0; i < this.devices_selected.length; i++) {
                var arrSid = this.devices_selected[i];
                if (arrSid.sid == sid) {
                    isExist = 1;
                    break;
                }
            }
            if (isExist == 1) {
                $(sobjs[j]).prop('checked', true);
            } else {
                $(sobjs[j]).prop('checked', false);
            }
        }
    }

    /**
     * @function 添加选择项
     */
    addSelectItems(that) {
        that.devices_selected_layers.clear();
        that.missionschedule_plandetail_polylinelayer.clear();
        //选中更新    
        var configObj = that.config.deviceForLayer[that.plan_type_id];
        var html_trs_data = ""
        for (var i = 0; i < that.devices_selected.length; i++) {
            var pobj = that.devices_selected[i];
            html_trs_data += "<tr class=goto data-sid='" + pobj.sid
                + "'  data-geometry='" + JSON.stringify(pobj.geometry)
                + "' >";
            for (var j = 0; j < configObj.selectshowfields.length; j++) {
                html_trs_data += "<td title='" + (pobj.mapitem == null ? pobj.currentTarget.data(configObj.selectshowfields[j].toLowerCase()) : pobj.mapitem.attributes[configObj.selectshowfields[j]]) + "'>"
                    + (pobj.mapitem == null ? pobj.currentTarget.data(configObj.selectshowfields[j].toLowerCase()) : pobj.mapitem.attributes[configObj.selectshowfields[j]]) + "</td>";
            }
            html_trs_data += "<td title='" + (pobj.mapitem == null ? pobj.currentTarget.data("regionname") : pobj.mapitem.regionname) + "'>" + (pobj.mapitem == null ? pobj.currentTarget.data("regionname") : pobj.mapitem.regionname) + "</td></tr>";


            if (pobj.geometry == undefined) {
                continue;
            }
            var geo;
            if (typeof (pobj.geometry) == 'string') {
                geo = JSON.parse(pobj.geometry)
            } else
                geo = pobj.geometry;
            if (geo.hasOwnProperty("paths")) {//线
                that.devices_selected_layers.add(new Graphic(new Polyline(geo), that.setGraphSymbolByType("polyline", that.config.select_color, 4)));
            } else if (geo.hasOwnProperty("rings")) {//面
                that.devices_selected_layers.add(new Graphic(new Polygon(geo), that.setGraphSymbolByType("polygon", that.config.select_color, 1)));
            } else {
                that.devices_selected_layers.add(new Graphic(new Point(geo), that.setGraphSymbolByType("point", that.config.select_color, 6)));
            }
        }
        that.domObj.find(".deviceslist-select").empty().append(html_trs_data);
    }

    /**
     * @function 检查是否已经被选中
     * @param sid
     */
    isCheckedDevice(sid) {
        var isExist = false;
        for (var i = 0; i < this.devices_selected.length; i++) {
            var arrSid = this.devices_selected[i];
            if (arrSid.sid == sid) {
                isExist = true;
                break;
            }
        }
        return isExist;
    }


    /**
     * @function 查询图层信息
     * @param results 总结果要素id集合
     * @param curpage 当前显示页
     */
    SearchDevices(results, curpage) {
        var layerid = this.config.deviceForLayer[this.plan_type_id].layerid;
        var outFields = this.config.deviceForLayer[this.plan_type_id].outfields;
        var subobjectids = [];
        if (results.length % this.config.pagesize == 0) {
            this.config.pagetotal = Math.floor(parseInt(results.length) / this.config.pagesize);
        } else {
            this.config.pagetotal = Math.floor(parseInt(results.length) / this.config.pagesize) + 1;
        }
        if (curpage <= this.config.pagetotal) {
            var startindex = (curpage - 1) * this.config.pagesize;
            var endindex = curpage * this.config.pagesize;
            for (var i = startindex; i < results.length && i < endindex; i++) {
                subobjectids.push(results[i]);
            }
        }
        var param = { "objectIds": subobjectids.join(","), "returnGeometry": true, "outFields": outFields, "returnIdsOnly": false, "f": "json" };

        $.ajax({
            type: "POST",
            url: this.AppX.appConfig.gisResource.pipedata.config[this.config.mapindex].url + "/" + layerid + "/query",
            cache: false,
            data: param,
            dataType: "json",
            success: function (response) {
                if (response.error !== undefined) {
                    this.loadWait.Hide();
                    this.AppX.runtimeConfig.toast.Show("查询失败，请联系管理员");
                    return;
                }
                var html_trs_data = "";
                var configObj = this.config.deviceForLayer[this.plan_type_id];
                var layername = configObj.layername;

                //内容
                response.features.forEach((p, itemindx) => {
                    var ischecked = this.isCheckedDevice(layername + "-" + p.attributes[configObj.keyfield]);
                    var showstr = "";
                    html_trs_data += "<tr class=goto data-ptsid='" + layername + "-" + p.attributes[configObj.keyfield];
                    for (var i = 0; i < configObj.selectshowfields.length; i++) {
                        showstr += "' data-" + configObj.selectshowfields[i] + "='" + p.attributes[configObj.selectshowfields[i]];
                    }
                    var content = new Object();
                    for (var i = 0; i < configObj.showfields.length; i++) {
                        content[configObj.showfields[i]] = p.attributes[configObj.showfields[i]];
                    }
                    showstr += "' data-content='" + JSON.stringify(content);

                    html_trs_data += showstr;
                    var jsgeo = p.geometry;
                    var geometryobj = null;
                    if (jsgeo.hasOwnProperty("paths")) {
                        geometryobj = {
                            "paths": jsgeo.paths,
                            "spatialReference": { "wkid": this.map.spatialReference.wkid }
                        };

                    } else if (jsgeo.hasOwnProperty("rings")) {
                        geometryobj = {
                            "rings": jsgeo.rings,
                            "spatialReference": { "wkid": this.map.spatialReference.wkid }
                        };
                    } else {
                        geometryobj = { "x": jsgeo.x, "y": jsgeo.y, "spatialReference": { "wkid": this.map.spatialReference.wkid } }
                    }

                    html_trs_data += "' data-regionname='" + this.regionname
                        + "' data-device_type_id='" + this.plan_type_id
                        + "'  data-geometry='" + JSON.stringify(geometryobj)
                        + "' ><td class='checkwidth'><input type='checkbox' " + (ischecked == true ? 'checked ' : "")
                        + " name='deviceslist-select' class='deviceslist-select' data-ptsid='"
                        + layername + "-" + p.attributes[configObj.keyfield]
                        + showstr
                        + "' data-device_type_id='" + this.plan_type_id
                        + "' data-regionname='" + this.regionname
                        + "' data-geometry='" + JSON.stringify(geometryobj);

                    html_trs_data += "' /></td>";
                    for (var i = 0; i < configObj.showfields.length; i++) {
                        html_trs_data += "<td title='" + p.attributes[configObj.showfields[i]] + "'>" + p.attributes[configObj.showfields[i]] + "</td>";
                    }
                    html_trs_data += "<td title='" + this.regionname + "'>" + this.regionname + "</td></tr>";
                });
                this.domObj.find(".deviceslist").empty().append(html_trs_data);

                this.domObj.find(".pagecontrol").text("总共" + results.length + "条，每页显示");
                this.domObj.find(".content").text("第" + this.config.pagenumber + "页共" + this.config.pagetotal + "页");
                this.domObj.find(".currentpagecontrol").text("当前勾选" + this.devices_selected.length + "条");
                if (results.length == 0) {
                    this.domObj.find(".pagecontrol").text("总共-条，每页");
                    this.domObj.find(".content").text("第-页共-页");
                }
                var that = this;

                //上一页
                this.domObj.find(".pre").off("click").on("click", function () {
                    if (this.config.pagenumber - 1 > 0) {
                        this.config.pagenumber = this.config.pagenumber - 1;
                        this.SearchDevices(this.sb_objectids, this.config.pagenumber);
                        this.domObj.find(".content").text("第" + this.config.pagenumber + "页共" + this.config.pagetotal + "页");
                    }
                }.bind(this));

                //下一页
                this.domObj.find(".next").off("click").on("click", function () {
                    if (this.config.pagenumber + 1 <= this.config.pagetotal) {
                        this.config.pagenumber = this.config.pagenumber + 1;
                        this.SearchDevices(this.sb_objectids, this.config.pagenumber);
                        this.domObj.find(".content").text("第" + this.config.pagenumber + "页共" + this.config.pagetotal + "页");
                    }
                }.bind(this));

                //跳转
                this.domObj.find(".pageturning").off("click").on("click", function () {
                    if (parseInt(this.domObj.find(".currpage").val()) <= this.config.pagetotal && this.config.pagenumber >= 1) {
                        this.config.pagenumber = parseInt(this.domObj.find(".currpage").val());
                        this.SearchDevices(this.sb_objectids, this.config.pagenumber);
                        this.domObj.find(".content").text("第" + this.config.pagenumber + "页共" + this.config.pagetotal + "页");
                    } else {
                        this.domObj.find(".currpage").val("");
                    }
                }.bind(this));

                //每页显示条数更改
                this.domObj.find(".dynamic_pagesize").off("change").on("change", function () {
                    this.config.pagesize = parseInt(this.domObj.find(".dynamic_pagesize option:selected").val());
                    this.SearchDevices(this.sb_objectids, this.config.pagenumber);
                }.bind(this));

                //设备勾选
                this.domObj.find('.deviceslist-select').off("change").on("change", function (e) {
                    this.removeOrAddServiceItem(e.currentTarget.checked, $(e.currentTarget));
                    this.addSelectItems(this);
                }.bind(this));

                // 选中行高亮
                this.domObj.off("click").on('click', '.deviceslist tr', (e) => {
                    this.domObj.find('tr.active').removeClass('active');
                    $(e.currentTarget).addClass('active');
                    var device_type_id = $(e.currentTarget).data("device_type_id");
                    this.missionschedule_plandetail_polylinelayer.clear();
                    if ($(e.currentTarget).data("geometry").hasOwnProperty("paths")) {
                        var polylineJson = {
                            "paths": $(e.currentTarget).data("geometry").paths,
                            "spatialReference": { "wkid": this.map.spatialReference.wkid }
                        };
                        var mappolyline = new Polyline(polylineJson);
                        this.map.setExtent(mappolyline.getExtent());
                        this.missionschedule_plandetail_polylinelayer.add(new Graphic(mappolyline, this.setGraphSymbol("polyline", 2)));

                    } else if ($(e.currentTarget).data("geometry").hasOwnProperty("rings")) {
                        var polygonJson = {
                            "rings": $(e.currentTarget).data("geometry").rings,
                            "spatialReference": { "wkid": this.map.spatialReference.wkid }
                        };
                        var mapPolygon = new Polygon(polygonJson);
                        this.map.setExtent(mapPolygon.getExtent());
                        this.missionschedule_plandetail_polylinelayer.add(new Graphic(mapPolygon, this.setGraphSymbol("polygon")));
                    } else {
                        var mapPoint = new Point({ "x": $(e.currentTarget).data("geometry").x, "y": $(e.currentTarget).data("geometry").y, "spatialReference": { "wkid": this.map.spatialReference.wkid } });
                        this.map.centerAndZoom(mapPoint, 7);
                        this.missionschedule_plandetail_polylinelayer.add(new Graphic(mapPoint, this.setGraphSymbol("point")));
                    }
                });

                this.loadWait.Hide();
            }.bind(this),
            error: function (results) {
                this.loadWait.Hide();
                this.toast.Show("查询片区巡检信息出错！");
            }.bind(this)
        });
    }

    /**
    * @function 根据片区、巡检类型获取巡检信息
    * @param id 部门id
    * @param device_type_id 巡检类型id
    */
    getRegionInfo(id, device_type_id) {
        $.ajax({
            headers: this.getHeaders(1),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getRegionInfo,
            data: {
                "pageindex": 1,
                "pagesize": this.config.pagemaxsize,
                "region_id": id,
                "device_type_id": device_type_id
            },
            success: this.getRegionInfoCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }
    getRegionInfoCallback(results) {
        console.log(results);
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        }
        //添加巡检点图层
        this.map.infoWindow.resize(400, 260);
        this.addClusters(results.result, this.plan_type_id);
        var html_trs_data = "";
        var confobj = this.config.deviceForOther[this.plan_type_id];
        var content = null;
        switch (this.plan_type_id) {
            case 5://查询隐患点
                results.result.forEach((p, itemindx) => {
                    content = new Object();
                    for (var k = 0; k < confobj.showfields.length; k++) {
                        content[confobj.showfields[k]] = p[confobj.showfields[k]];
                    }
                    html_trs_data += "<tr class=goto data-id='" + p.point_id
                        + "'  data-geometry='" + p.geometry
                        + "'><td class='checkwidth'><input type='checkbox'  name='pointlist-select' class='pointlist-select'  id='" + p.point_id
                        + "' data-geometry='" + p.geometry
                        + "' data-x='" + p.geometry.x
                        + "' data-y='" + p.geometry.y
                        + "' data-address='" + p.address
                        + "' data-pipe_length='0"
                        + "' data-content='" + JSON.stringify(content)
                        + "' data-name='" + ""
                        + "' data-device_type_id='" + this.plan_type_id
                        + "' data-regionname='" + p.trouble_regioname
                        + "' /></td><td title='" + p.device_type_name + "'>" + p.device_type_name
                        + "</td><td title='" + p.troubletype + "'>" + p.troubletype
                        + "</td><td title='" + p.trouble_notes + "'>" + p.trouble_notes
                        + "</td><td title='" + p.address + "'>" + p.address
                        + "</td><td title='" + p.trouble_username + "'>" + p.trouble_username
                        + "</td><td title='" + p.trouble_findtime + "'>" + p.trouble_findtime
                        + "</td><td title='" + p.trouble_regioname + "'>" + p.trouble_regioname
                        + "</td></tr>";
                });
                break;
            case 1://巡检点
            case 6://巡检线
                results.result.forEach((p, itemindx) => {
                    content = new Object();
                    for (var k = 0; k < confobj.showfields.length; k++) {
                        content[confobj.showfields[k]] = p[confobj.showfields[k]];
                    }
                    html_trs_data += "<tr class=goto data-id='" + p.point_id
                        + "'   data-geometry='" + p.geometry
                        + "' ><td class='checkwidth'><input type='checkbox'  name='pointlist-select' class='pointlist-select'  id='" + p.point_id
                        + "' data-geometry='" + p.geometry
                        + "'  data-x='" + p.geometry.x
                        + "'  data-y='" + p.geometry.y
                        + "' data-pipe_length='" + p.pipe_length
                        + "' data-address='" + p.address
                        + "' data-content='" + JSON.stringify(content)
                        + "' data-name='" + p.point_name
                        + "' data-device_type_id='" + this.plan_type_id
                        + "' data-regionname='" + p.regioname
                        + "' /></td><td title='" + p.device_type_name + "'>" + p.device_type_name
                        + "</td><td title='" + p.point_name + "'>" + p.point_name
                        + "</td><td title='" + p.address + "'>" + p.address
                        + "</td><td title='" + p.regioname + "'>" + p.regioname
                        + "</td><td title='" + p.create_time + "'>" + p.create_time
                        + "</td></tr>";
                });
                break;
        }

        this.addRegionInfoGraphic(results, this.plan_type_id);//加载到地图

        this.domObj.find(".pointlist").empty().append(html_trs_data);

        // 选中行高亮------------------符号需修改--------------
        this.domObj.off("click").on('click', '.pointlist tr', (e) => {
            this.domObj.find('tr.active').removeClass('active');
            $(e.currentTarget).addClass('active');
            var device_type_id = $(e.currentTarget).data("device_type_id");
            this.missionschedule_plandetail_polylinelayer.clear();
            if ($(e.currentTarget).data("geometry").hasOwnProperty("paths")) {
                var mappolyline = new Polyline($(e.currentTarget).data("geometry"));
                this.map.setExtent(mappolyline.getExtent());
                this.missionschedule_plandetail_polylinelayer.add(new Graphic(mappolyline, this.setGraphSymbol("polyline", 2)));
            } else {
                var mapPoint = new Point($(e.currentTarget).data("geometry").x, $(e.currentTarget).data("geometry").y, new SpatialReference({ wkid: this.map.spatialReference.wkid }));
                this.map.centerAndZoom(mapPoint, 15);
                this.missionschedule_plandetail_polylinelayer.add(new Graphic(mapPoint, this.setGraphSymbol("point")));
            }
        });

        //全选
        this.domObj.find('.pointlist-selected').off("change").on("change", function () {
            if (this.domObj.find(".pointlist-selected").prop('checked') == true) {
                this.domObj.find(".pointlist-select").each(function () {
                    $(this).prop('checked', true);
                });
            } else {
                this.domObj.find(".pointlist-select").each(function () {
                    $(this).prop('checked', false);
                });
            }
        }.bind(this));
    }


    /**
     * @function 添加所有巡检线、巡检点、隐患点在地图上
     * @param queryResult 查询结果
     * @param device_type_id 当前巡检内容
     */
    addRegionInfoGraphic(queryResult, device_type_id) {
        this.regionInfoGraphicLayer.clear();
        for (var i = 0, length = queryResult.result.length; i < length; i++) {
            var row = queryResult.result[i];
            if (row.geometry == undefined || row.geometry == "") { continue; }
            var point, graphic, name = "";
            switch (device_type_id) {
                case 1:
                    point = new Point(JSON.parse(row.geometry));
                    graphic = new Graphic(point, this.setSymbol(row.point_name)[0], { "id": row.point_id });
                    name = row.point_name;
                    break;
                case 5:
                    point = new Point(JSON.parse(row.geometry));
                    graphic = new Graphic(point, this.setSymbol("")[4], { "id": row.point_id });
                    break;
                case 6:
                    var polyline = new Polyline(JSON.parse(row.geometry));
                    point = polyline.getExtent().getCenter();
                    graphic = new Graphic(polyline, this.setSymbol(row.point_name)[5], { "id": row.point_id });
                    name = row.point_name;
                    break;
            }

            this.regionInfoGraphicLayer.add(graphic);
            if (name != "") {
                var graphictextbg = new Graphic(point, this.setSymbol(name)[1].setOffset(0, -20), "");
                this.regionInfoGraphicLayer.add(graphictextbg);
                //添加文字
                var peopleTextSymbol = new TextSymbol(name);
                peopleTextSymbol.setOffset(0, -25);
                var font = new Font();
                font.setSize("10pt");
                font.setWeight(Font.WEIGHT_BOLD);
                peopleTextSymbol.setFont(font);
                var graphicText = new Graphic(point, peopleTextSymbol, "");
                this.regionInfoGraphicLayer.add(graphicText);
            }

        }

        if (length > 0) {
            var extent = graphicsUtils.graphicsExtent(this.regionInfoGraphicLayer.graphics);
            if (extent != null) {
                this.map.setExtent(extent);
            }
        }
    }


    devicesWithout(mapitems, plan_type_id, begintime, endtime) {

        // this.plan_begindate;
        // this.plan_enddate;
        // this.plan_type_id;
        //当前为两月一巡，如果有半年巡的则剔除当前设备


        //查询半年巡所有设备，并且当前两月一巡的时间范围，在半年巡的时间范围内
        this.getListEquipment(mapitems, plan_type_id);








    }


    getListEquipment(mapitems, typeid) {

        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getDeviceList,
            data: {
                "pageindex": this.config.pagenumber,
                "pagesize": 1000000 || this.config.pagesize,
                "device_type_id": typeid,
                // "companyid": this.companyid
            },
            success: this.getListEquipmentsCallback.bind(this),
            error: function (data) {
                this.loadWait.Hide();
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }
    getListEquipmentsCallback(results) {

        console.log(results);
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        }


        var html_trs_data = "";
        var selecteditem = [];
        this.cur_mapitems.forEach((item, itemindx) => {

            results.result.forEach((p, pindx) => {
                //    p.begindate<  this.plan_begindate;
                //    this.plan_enddate< p.enddate;
                if (item.sid == p.point_id && new Date(this.plan_begindate) > new Date(p.child_begin_date) && new Date(p.child_end_date) > new Date(this.plan_enddate)) {
                    //如果id相同，并且设备处在半年巡范围内，则剔除
                    this.cur_mapitems.splice(itemindx, 1);
                }


            });


        });

        if (this.cur_mapitems.length > 0) {
            this.selectMapItems(this.cur_mapitems);
        }


    }


    /**
     * 销毁对象
     */
    destroy() {
        if (this.missionschedule_plandetail_polylinelayer) {
            this.map.removeLayer(this.missionschedule_plandetail_polylinelayer);
            this.missionschedule_plandetail_polylinelayer.clear();
        }

        if (this.regionInfoGraphicLayer) {
            this.map.removeLayer(this.regionInfoGraphicLayer);
            this.regionInfoGraphicLayer.clear();
        }
        if (this.missionschedule_planpoint_clusterLayer) {
            this.map.removeLayer(this.missionschedule_planpoint_clusterLayer);
        }


        if (this.plan_ptype_layer) {
            this.map.removeLayer(this.plan_ptype_layer);
        }
        if (this.plan_pontype_layer) {
            this.map.removeLayer(this.plan_pontype_layer);
        }
        if (this.devices_selected_layers) {
            this.map.removeLayer(this.devices_selected_layers);
        }

        if (this.drawToolbar != null) {
            this.map.setMapCursor('default');
            this.drawToolbar.deactivate();
            this.drawToolbar = null;
        }

        this.domObj.remove();
        this.afterDestroy();
    }

    /**
     * @function 清空地图上图层元素
     */
    planClear() {
        this.plan_pontype_layer.clear();//计划涉及片区删除
        this.plan_ptype_layer.clear();//个人计划涉及的巡检信息
        this.missionschedule_plandetail_polylinelayer.clear();
        this.devices_selected_layers.clear();
        this.regionInfoGraphicLayer.clear();
        if (this.missionschedule_planpoint_clusterLayer != null) {
            this.map.removeLayer(this.missionschedule_planpoint_clusterLayer);
            this.missionschedule_planpoint_clusterLayer = null;
        }
    }
}