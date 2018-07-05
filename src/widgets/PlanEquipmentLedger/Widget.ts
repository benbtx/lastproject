import BaseWidget = require('core/BaseWidget.class');
import Functions = require('core/Functions.module');
import Extent = require('esri/geometry/Extent');
import SpatialReference = require('esri/SpatialReference');
import Point = require("esri/geometry/Point");
import Polyline = require('esri/geometry/Polyline');
import Polygon = require('esri/geometry/Polygon');

import GraphicsLayer = require("esri/layers/GraphicsLayer");
import Graphic = require("esri/graphic");
import PictureMarkerSymbol = require("esri/symbols/PictureMarkerSymbol");
import TextSymbol = require("esri/symbols/TextSymbol");
import Font = require("esri/symbols/Font");
import ScreenPoint = require('esri/geometry/ScreenPoint');
import arrayUtils = require('dojo/_base/array');
import PopupTemplate = require('esri/dijit/PopupTemplate');
import SimpleMarkerSymbol = require('esri/symbols/SimpleMarkerSymbol');
import ClassBreaksRenderer = require('esri/renderers/ClassBreaksRenderer');
import InfoWindow = require('esri/dijit/InfoWindow');
import Popup = require('esri/dijit/Popup');
import domConstruct = require('dojo/dom-construct');
import ClusterLayer = require('extras/ClusterLayer');
import Save2File = require('./Save2File');


import Color = require("esri/Color");
import SimpleLineSymbol = require('esri/symbols/SimpleLineSymbol');
import SimpleFillSymbol = require('esri/symbols/SimpleFillSymbol');
import InfoTemplate = require('esri/InfoTemplate');



import Query = require('esri/tasks/query');
import QueryTask = require('esri/tasks/QueryTask');
import FeatureLayer = require('esri/layers/FeatureLayer');
import SimpleRenderer = require('esri/renderers/SimpleRenderer');

declare var Howl;

export = PlanEquipmentLedger;

class PlanEquipmentLedger extends BaseWidget {
    baseClass = "widget-planequipmentledger";
    map = null;
    toast = null;
    photowall = null;
    loadWait = null;
    companyid = "";//公司id
    iszgs = false;//是否是总公司账号
    companydatas = null;
    ispartment = false;


    curentequipmentledgertypeid = "";
    trouble_typeid = "";
    pdaid = "";
    userid = "";
    padname = "";
    username = "";

    handle_state = "";
    handle_trouble_clear = "";

    curpage = [];

    showtype = 0;//0列表模式，1图标模式

    curequipmentledgerid = "";


    print_address = "";
    print_describe = "";
    print_xjry = "";
    print_uploadtime = "";


    strclass = "";

    devicelist = "";
    devicedata = { "data": [] };
    selected_device = [];

    plandetail_polylinelayer: GraphicsLayer;
    count = 0;//计数//查询设备默认循环2个图层

    total = 0;//调压设备数
    objectids = [];//所有ids
    objectids_layerid = [];//所有ids对应的图层顺序号

    subObjIds = {};//二次查询显示使用
    subLayerIds = "";
    currentPageFeatures = [];

    totalpage = 1;
    currentpage = 1;
    currentpagesize = 1;
    device_type_name = "";

    startup() {
        this.configure();
        this.initHtml();
        this.initTypes();//设备类型
        this.initEvent();
        this.initLoginUser();
    }

    configure() {
        this.toast = this.AppX.runtimeConfig.toast;
        this.photowall = this.AppX.runtimeConfig.photowall;
        this.loadWait = this.AppX.runtimeConfig.loadWait;
        this.map = this.AppX.runtimeConfig.map;

        if (this.map.getLayer("plandetail_polylinelayer")) {
            return;
        } else {
            var plandetail_polylinelayer = new GraphicsLayer();
            plandetail_polylinelayer.id = "plandetail_polylinelayer";
            this.plandetail_polylinelayer = plandetail_polylinelayer;
            this.map.addLayer(plandetail_polylinelayer);
        }
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
        this.initCompany();
        this.addtitle();
        if (this.iszgs == true) {//集团公司账号
            this.domObj.find(".company_serch").show();
            this.companydatas = new Object();
            this.getCompanyList();
            //部门列表
            this.domObj.find('.company').on("change", function () {
                this.companyid = this.domObj.find(".company option:selected").val();
            }.bind(this));
        } else {
            this.domObj.find(".company_serch").hide();
            this.getListEquipment();
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
                var strdepartment = "<option value=''>全部</option>";//"<option value=''>全部</option>";
                $.each(results.result, function (index, item) {
                    this.companydatas[item.companyid] = item.company_name;
                    if (AppX.appConfig.departmentid == item.companyid) {
                        strdepartment += "<option selected value='" + item.companyid + "'>" + item.company_name + "</option>";
                    } else {
                        strdepartment += "<option value='" + item.companyid + "'>" + item.company_name + "</option>";
                    }
                }.bind(this));
                this.domObj.find(".company").empty().append(strdepartment);
                this.domObj.find(".company").val(this.companyid);

                this.companyid = (this.iszgs == true ? this.domObj.find(".company option:selected").val() : "");
                this.getListEquipment();
            }.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取公司列表数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    /**
     * @function 添加标题
     */
    addtitle() {
        var codes = AppX.appConfig.range.split(";");
        var htmlstr = "";
        if (this.iszgs) {
            htmlstr = "<tr><th title='公司名称'>管理公司</th><th title='设备类型'>设备类型</th><th title='唯一编号'>唯一编号</th><th title='设备编码'>设备编码</th><th title='所在片区'>所在片区</th><th title='检查时间'>检查时间</th><th title='检查详情'>检查详情</th></tr>";
        } else {
            htmlstr = "<tr><th title='设备类型'>设备类型</th><th title='唯一编号'>唯一编号</th><th title='设备编码'>设备编码</th><th title='所在片区'>所在片区</th><th title='检查时间'>检查时间</th><th title='检查详情'>检查详情</th></tr>";
        }
        this.domObj.find(".addequipmentledger-title").empty().append(htmlstr);
    }

    initHtml() {
        var html = _.template(this.template.split('$$')[0] + "</div>")();
        this.setHtml(html);
        this.ready();
    }

    initEvent() {
        var that = this;

        //查询按钮单击事件
        this.domObj.find('.btn-search').off("click").on("click", function () {
            this.getListEquipment();
        }.bind(this));

        //导出excel
        this.domObj.find('.save2csv').off("click").on("click", function () {
            Save2File(this.curpage, this.iszgs);
        }.bind(this));

        //图层点击事件
        this.plandetail_polylinelayer.on("click", function (gx) {
            console.log(gx);
            if (this.map.infoWindow != null)
                this.map.infoWindow.hide();
            var popup = new Popup({
                fillSymbol: new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
                    new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                        new Color([255, 0, 0]), 2), new Color([255, 255, 0, 0.25]))
            }, document.createElement("div"));

            popup.setMap(this.map);
            popup.setTitle("<div class='HiddenDangerSearch-id'>设备信息</div>");
            var info = _.template(this.template.split('$$')[3])(gx.graphic.attributes);
            popup.setContent(info);
            this.map.infoWindow = popup;
            this.map.infoWindow.show(gx.mapPoint);

        }.bind(this));

        // 选中行高亮
        this.domObj.off("click").on('click', 'tbody tr', (e) => {
            this.domObj.find('tr.active').removeClass('active');
            $(e.currentTarget).addClass('active');
            if ($(e.currentTarget).data("geometry")) {
                if (this.map.infoWindow != null)
                    this.map.infoWindow.hide();
                var geo = JSON.stringify($(e.currentTarget).data("geometry"));
                var geom = $(e.currentTarget).data("geometry");

                var pobj = null, sym = null, graphic = null;
                var mapPoint = null;
                if (geo.indexOf("paths") > -1) {//线
                    geom = {
                        "paths": geom.paths,
                        "spatialReference": this.map.spatialReference
                    }
                    pobj = new Polyline(geom);
                    sym = this.setGraphSymbol("polyline");
                    graphic = new Graphic(pobj, sym);
                    mapPoint = pobj.getExtent().getCenter();
                    this.map.setExtent(pobj.getExtent());
                } else if (geo.indexOf("rings") > -1) {//面
                    geom = {
                        "rings": geom.paths,
                        "spatialReference": this.map.spatialReference
                    }
                    pobj = new Polygon(geom);
                    sym = this.setGraphSymbol("polygon");
                    graphic = new Graphic(pobj, sym);
                    this.map.setExtent(pobj.getExtent());
                    mapPoint = pobj.getExtent().getCenter();
                } else {
                    geom = {
                        "x": geom.x,
                        "y": geom.y,
                        "spatialReference": this.map.spatialReference
                    }
                    pobj = new Point(geom);
                    sym = this.setGraphSymbol("point");
                    graphic = new Graphic(pobj, sym);
                    this.map.centerAndZoom(pobj, 17);
                    mapPoint = pobj;
                }
                if (graphic.attributes == undefined) {
                    graphic.attributes = {
                        "device_type_name": $(e.currentTarget).data("device_type_name"),
                        "code": $(e.currentTarget).data("code"),
                        "regionname": $(e.currentTarget).data("regionname"),
                        "last_time": $(e.currentTarget).data("create_time")
                    }
                }
                this.plandetail_polylinelayer.clear();
                this.plandetail_polylinelayer.add(graphic);
            }
        });

        //上一页
        this.domObj.find(".pre").off("click").on("click", function () {
            if (this.currentpage - 1 > 0) {
                that.map.infoWindow.hide();
                this.currentpage = this.currentpage - 1;
                this.getDevicePoint(this.currentpage, this.config.pagesize, this.trouble_typeid, this.pdaid, this.userid, 0, this.handle_trouble_clear);
            }
        }.bind(this));

        //下一页
        this.domObj.find(".next").off("click").on("click", function () {
            if (this.currentpage + 1 <= this.totalpage) {
                that.map.infoWindow.hide();
                this.currentpage = this.currentpage + 1;
                this.getDevicePoint(this.currentpage, this.config.pagesize, this.trouble_typeid, this.pdaid, this.userid, 0, this.handle_trouble_clear);
            }
        }.bind(this));

        //跳转
        this.domObj.find(".pageturning").off("click").on("click", function () {
            var currpage = parseInt(this.domObj.find(".currpage").val());
            if (currpage <= this.totalpage && currpage >= 1) {
                that.map.infoWindow.hide();
                this.currentpage = parseInt(this.domObj.find(".currpage").val());
                this.getDevicePoint(this.currentpage, this.config.pagesize, this.trouble_typeid, this.pdaid, this.userid, 0, this.handle_trouble_clear);
            }
        }.bind(this));
    }

    /**
     * 初始化设备类型
     */
    initTypes() {
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getDevicePointTypeList,
            data: {
                "pageindex": 1,
                "pagesize": this.config.maxsize
            },
            success: this.getDeviceTypesCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }
    getDeviceTypesCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        }
        var optionHtml = "<option value=''>全部</option>";

        $.each(results.result.rows, function (index, item) {
            if (item.device_type_id == '2' || item.device_type_id == '3' || item.device_type_id == '4' || item.device_type_id == '8')
                optionHtml += "<option value='" + item.device_type_id + "'> " + item.name + " </option>";
        }.bind(this));
        this.domObj.find(".plantype").empty().append(optionHtml);
        this.domObj.find(".plantype option:first").prop("selected", 'selected');
    }

    /**
     * 获取设备信息
     */

    getListEquipmentALL() {
        this.curpage = [];
        this.loadWait.Show("正在查询数据，请耐心等待...", this.domObj);
        var typeid = this.domObj.find(".plantype option:selected").val();
        $.ajax({
            headers: this.getHeaders(0),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getDeviceList,
            data: {
                "pageindex": this.config.pagenumber,
                "pagesize": this.config.pagesize,
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

    getListEquipment() {
        this.curpage = [];
        this.loadWait.Show("正在查询数据，请耐心等待...", this.domObj);
        var typeid = this.domObj.find(".plantype option:selected").val();
        $.ajax({
            headers: this.getHeaders(0),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getDeviceList,
            data: {
                "pageindex": this.config.pagenumber,
                "pagesize": this.config.pagesize,
                "device_type_id": typeid,
                "companyid": this.companyid
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
        this.loadWait.Hide();
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        }

        if (results.result.total % this.config.pagesize == 0) {
            this.totalpage = Math.floor(parseInt(results.result.total) / parseInt(this.config.pagesize));
        } else {
            this.totalpage = Math.floor(parseInt(results.result.total) / parseInt(this.config.pagesize)) + 1;
        }

        var html_trs_data = "";
        results.result.rows.forEach((p, itemindx) => {
            this.curpage.push({
                company_name: (this.iszgs ? this.companydatas[p.companyid] : ""),
                device_type_name: p.device_type_name,
                sid: (p.point_id ? p.point_id.split("-")[1] : ""),
                code: p.code,
                regionname: p.regionname,
                create_time: (p.create_time ? p.create_time : "")
            });
            if (p.state == 1) {
                html_trs_data += "<tr class=goto data-geometry='" + p.geometry
                    + "' data-sid='" + p.id
                    + "' data-regionname='" + p.regionname
                    + "' data-last_time='" + p.last_time
                    + "' data-device_type_name='" + p.device_type_name
                    + "' data-code='" + p.code + "'><td title='" + (this.iszgs ? this.companydatas[p.companyid] : p.device_type_name) + "' class='centercheck'>"
                    + (this.iszgs ? this.companydatas[p.companyid] + "</td><td title='" + p.device_type_name + "' class='centercheck'>" : "")
                    + p.device_type_name + "</td><td title='" + (p.point_id ? p.point_id.split("-")[1] : "") + "' class='centercheck'>"
                    + (p.point_id ? p.point_id.split("-")[1] : "") + "</td><td title='" + p.code + "' class='centercheck'>"
                    + p.code + "</td><td title='" + p.regionname + "' class='centercheck'>"
                    + p.regionname + "</td><td title='" + (p.create_time ? p.create_time : "") + "' class='centercheck'>"
                    + (p.create_time ? p.create_time : "") + "</td><td class='centercheck'><a class='operation' data-pointid='"
                    + p.point_id + "' data-device_type_name='"
                    + p.device_type_name + "'>检查记录</a></td></tr>";

            } else {
                html_trs_data += "<tr class=goto data-geometry='" + p.geometry
                    + "' data-sid='" + p.id
                    + "' data-regionname='" + p.regionname
                    + "' data-last_time='" + p.last_time
                    + "' data-device_type_name='" + p.device_type_name
                    + "' data-code='" + p.code + "'><td title='" + (this.iszgs ? this.companydatas[p.companyid] : p.device_type_name) + "' class='centercheck'>"
                    + (this.iszgs ? this.companydatas[p.companyid] + "</td><td title='" + p.device_type_name + "' class='centercheck'>" : "")
                    + p.device_type_name + "</td><td title='" + (p.point_id ? p.point_id.split("-")[1] : "") + "' class='centercheck'>"
                    + (p.point_id ? p.point_id.split("-")[1] : "") + "</td><td title='" + p.code + "' class='centercheck'>"
                    + p.code + "</td><td title='" + p.regionname + "' class='centercheck'>"
                    + p.regionname + "</td><td title='" + (p.create_time ? p.create_time : "") + "' class='centercheck'>"
                    + (p.create_time ? p.create_time : "") + "</td><td class='centercheck'></td></tr>";
            }

        });
        var domtb = this.domObj.find(".addequipmentledger").empty().append(html_trs_data);
        var domtb_page = this.domObj.find(".pagecontrol");
        domtb_page.text("总共" + results.result.total + "条，每页");
        this.domObj.find(".content").text("第" + this.currentpage + "页共" + this.totalpage + "页");
        if (results.result.total == 0) {
            this.domObj.find(".pagecontrol").text("总共-页，每页");
            this.domObj.find(".content").text("第-页共-页");
        }
        var that = this;

        //定义检查记录事件
        this.domObj.find(".operation").off("click").on("click", function (e) {
            that.map.infoWindow.hide();
            var id = $(this).data("pointid");
            that.device_type_name = $(this).data("device_type_name");
            var path = "";
            if (that.device_type_name == "调压箱" || that.device_type_name == "调压柜") {
                path = that.config.getTYSB;
            } else if (that.device_type_name == "阀门") {
                path = that.config.getFM;
            } else {
                path = that.config.getTYSB;
            }
            $.ajax({
                headers: that.getHeaders(0),
                type: "POST",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + path + id,
                data: {
                    "pageindex": 0,
                    "pagesize": that.config.maxsize,
                    "point_id": id
                },
                success: that.getPlanPointRepairCallback.bind(that),
                error: function (data) {
                    that.toast.Show("服务端ajax出错，获取数据失败!");
                }.bind(that),
                dataType: "json",
            });
            e.stopPropagation();
        });

        //上一页
        this.domObj.find(".pre").off("click").on("click", function () {
            if (this.currentpage - 1 > 0) {
                this.currentpage = this.currentpage - 1;
                this.getListEquipment();
            }

        }.bind(this));

        //下一页
        this.domObj.find(".next").off("click").on("click", function () {
            if (this.currentpage + 1 <= this.totalpage) {
                this.currentpage = this.currentpage + 1;
                this.getListEquipment();
            }
        }.bind(this));

        //跳转
        this.domObj.find(".pageturning").off("click").on("click", function () {
            var currpage = parseInt(this.domObj.find(".currpage").val());
            if (currpage <= this.totalpage && currpage >= 1) {
                this.currentpage = parseInt(this.domObj.find(".currpage").val());
                this.getListEquipment();
            }
        }.bind(this));

        //默认页条数修改
        this.domObj.find(".dynamic_pagesize").off("change").on("change", function () {
            this.config.pagesize = parseInt(this.domObj.find(".dynamic_pagesize option:selected").val());
            this.getListEquipment();
        }.bind(this));

    }
    getPlanPointRepairCallback(results) {


        this.domObj.find(".temppics").empty();
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        }



        var html_trs_data = "";
        if (this.device_type_name == "调压箱" || that.device_type_name == "调压柜") {
            this.domObj.empty().append(this.template.split('||')[2]);
            this.initEvent2();

            var domtb = this.domObj.find(".adddevicerepair");
            domtb.empty();

            $.each(results.result.rows, function (i, item) {


                // <td>${item.switch_flexible}</td><td>${item.leak_detect}</td>
                var isnormal: string;
                if (item.is_normal == 0) {
                    isnormal = "否";
                } else if (item.is_normal == 1) {
                    isnormal = "是";
                }


                html_trs_data += `<tr><td>${item.main_operating_pressure}</td><td>${item.duputy_closing_pressure}</td><td>${item.main_closing_pressure}</td><td>${item.main_cutting_pressure}</td><td>${isnormal}</td> <td>${item.period_name}</td><td>${item.create_username}</td><td>${item.create_time}</td><td>${item.notes}</td><td class='viewpic' data-pointid=${item.id}><a>详情</a></td></tr>`;
                //href="javascript:void(0)" target="_blank" 
                // html_trs_data += `<li><a href=${strhref} target="_blank">${stryhfx}<span>${item.address}</span></a></li>`;
                //刷新infowindow
                // this.setContent(item);
            }.bind(this));
            domtb.append(html_trs_data);


            this.domObj.find(".viewpic").off("click").on("click", function (e) {

                //查看照片

                var id = $(e.currentTarget).data("pointid");
                var path = "";
                if (that.device_type_name == "调压箱" || that.device_type_name == "调压柜") {
                    path = that.config.getFiles;
                } else if (that.device_type_name == "阀门") {
                    path = that.config.getFiles;
                }


                $.ajax({
                    headers: that.getHeaders(0),
                    type: "POST",
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + path,//+ id
                    data: {
                        "pageindex": 0,
                        "pagesize": that.config.maxsize,
                        "tableid": id
                    },
                    success: function (results) {

                        results.result.rows
                        var pics = "";
                        $.each(results.result.rows, function (i, item) {
                            pics += "<li style='margin-top:5px;'><span>"+item.filenote +"</span><img src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + item.filename + "'/></li>";
                        }.bind(this));

                        //组织照片

                        //弹出照片

                        // var pics = "http://192.98.151.40/kfxjapi/file/1521b21a-c0c6-4b2d-9103-712c19081e8a.jpg";
                        var htmlstr = "";
                        // for (var i = 0; i < pics.length; i++) {
                        //     if (pics[i].alt == undefined) {
                        //         htmlstr += "<li style='margin-top:5px;'><img src='" + pics[i].src + "'/></li>"
                        //     } else {
                        //         htmlstr += "<li style='margin-top:5px;'><img src='" + pics[i].src + "' alt='" + pics[i].alt + "'/></li>";
                        //     }
                        // }
                        this.photowall.setSize(600, 650);
                        var Obj = this.photowall.Show("检修照片查看", this.template.split('$$')[4])
                        Obj.conObj.find('.piclist').empty().append(pics);
                        Obj.conObj.find('.piclist').off("click").on("click", function () {
                            $('.piclist').viewer();
                            return false;
                        }.bind(this))

                    }.bind(that),
                    error: function (data) {
                        that.toast.Show("服务端ajax出错，获取数据失败!");
                    }.bind(that),
                    dataType: "json",
                });



            }.bind(this));

        } else if (this.device_type_name == "阀门") {

            this.domObj.empty().append(this.template.split('||')[1]);
            this.initEvent2();

            var domtb = this.domObj.find(".adddevicerepair");
            domtb.empty();

            $.each(results.result.rows, function (i, item) {

                var switchflexible: string;
                if (item.switch_flexible == 0) {
                    switchflexible = "否";
                } else if (item.switch_flexible == 1) {
                    switchflexible = "是";
                }

                  var leakdetect: string;
                if (item.leak_detect == 0) {
                    leakdetect = "否";
                } else if (item.leak_detect == 1) {
                    leakdetect = "是";
                }




                html_trs_data += `<tr><td>${switchflexible}</td><td>${leakdetect}</td><td>${item.period_name}</td><td>${item.create_username}</td><td>${item.create_time}</td><td>${item.notes}</td><td class='viewpic' data-pointid=${item.id}><a>详情</a></td></tr>`;
                //href="javascript:void(0)" target="_blank" 
                // html_trs_data += `<li><a href=${strhref} target="_blank">${stryhfx}<span>${item.address}</span></a></li>`;
                //刷新infowindow
                // this.setContent(item);
            }.bind(this));
            domtb.append(html_trs_data);


            this.domObj.find(".viewpic").off("click").on("click", function (e) {

                //查看照片

                var id = $(e.currentTarget).data("pointid");
                var path = "";
                if (that.device_type_name == "调压箱" || that.device_type_name == "调压柜") {
                    path = that.config.getFiles;
                } else if (that.device_type_name == "阀门") {
                    path = that.config.getFiles;
                }

                $.ajax({
                    headers: that.getHeaders(0),
                    type: "POST",
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + path,//+ id
                    data: {
                        "pageindex": 0,
                        "pagesize": that.config.maxsize,
                        "tableid": id
                    },
                    success: function (results) {

                        results.result.rows
                        var pics = "";
                        $.each(results.result.rows, function (i, item) {
                            pics += "<li style='margin-top:5px;'><img src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + item.filename + "'/></li>";
                        }.bind(this));

                        //组织照片

                        //弹出照片

                        // var pics = "http://192.98.151.40/kfxjapi/file/1521b21a-c0c6-4b2d-9103-712c19081e8a.jpg";
                        var htmlstr = "";
                        // for (var i = 0; i < pics.length; i++) {
                        //     if (pics[i].alt == undefined) {
                        //         htmlstr += "<li style='margin-top:5px;'><img src='" + pics[i].src + "'/></li>"
                        //     } else {
                        //         htmlstr += "<li style='margin-top:5px;'><img src='" + pics[i].src + "' alt='" + pics[i].alt + "'/></li>";
                        //     }
                        // }
                        this.photowall.setSize(600, 650);
                        var Obj = this.photowall.Show("检修照片查看", this.template.split('$$')[4])
                        Obj.conObj.find('.piclist').empty().append(pics);
                        Obj.conObj.find('.piclist').off("click").on("click", function () {
                            $('.piclist').viewer();
                            return false;
                        }.bind(this))



                    }.bind(that),
                    error: function (data) {
                        that.toast.Show("服务端ajax出错，获取数据失败!");
                    }.bind(that),
                    dataType: "json",
                });



            }.bind(this));


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
                break;
            case "polyline":
                symbol.SimpleLineSymbol = new SimpleLineSymbol({
                    color: new Color(this.config.color),
                    style: "solid",   //线的样式 dash|dash-dot|solid等	
                    width: 3
                });
                break;

            case "polygon":
                symbol.SimpleFillSymbol = new SimpleFillSymbol({
                    color: new Color([0, 0, 0, 0.1]),
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
     * @function 第二个页面初始化
     */
    initEvent2() {
        //返回
        this.domObj.find('.btn-return').off("click").on("click", function () {
            this.domObj.empty().append(this.template.split('$$')[0] + "</div>");
            this.initTypes();
            this.initEvent();
            this.initLoginUser();
            // this.getCompanyList();
        }.bind(this));
    }

    /**
     * @function 销毁对象
     */
    destroy() {
        this.map.infoWindow.hide();
        if (this.plandetail_polylinelayer) {
            this.map.removeLayer(this.plandetail_polylinelayer);
            this.plandetail_polylinelayer.clear();
        }
        this.domObj.remove();
        this.afterDestroy();
    }
}