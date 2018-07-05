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
import Polyline = require('esri/geometry/Polyline');

import ClusterLayer = require('extras/ClusterLayer');
import arrayUtils = require('dojo/_base/array');
import ClassBreaksRenderer = require('esri/renderers/ClassBreaksRenderer');
import PopupTemplate = require('esri/dijit/PopupTemplate');
import Edit = require("esri/toolbars/edit");
import geometryEngine = require("esri/geometry/geometryEngine");


export = PlanPoint;

class PlanPoint extends BaseWidget {
    baseClass = "widget-planpoint";
    map = null;
    editTool = null;
    editingEnabled = false;
    toast = null;
    popup = null;
    loadWait = null;
    popupdomObj = null;
    totalpage = 1;
    currentpage = 1;
    currentpagesieze = 1;
    curentplanpointtypeid = "";
    planpointInfoGraphicLayer: GraphicsLayer;
    templanpoint: GraphicsLayer;//临时巡检点图层

    point_planregion: GraphicsLayer;
    point_planpath: GraphicsLayer;

    planpoint_clusterLayer = null;//数据库中的疑问标识


    jsongeometry = "";
    tempjsongeometry = "";//临时存储巡检点图形
    editgeometry: Point;
    editid = "";
    polygonid = "";

    polygon_add_id = "";//当前所属片区，片区不重叠
    polygon_id = [];//当前所属片区，片区可以重叠


    companyid = "";//公司id
    companydatas = null;
    iszgs = false;//是否是总公司账号
    ispartment = false;

    point_id = "";
    point_name = "";
    address = "";
    notes = "";
    status = "";
    drawToolbar = null;

    currentTarget = null;
    pointDatas = null;
    tempEditGeometry = "";

    /**
     * @function 初始化启动
     */
    startup() {
        this.configure();
        this.initHtml();
        this.initEvent();
    }

    /**
     * @function 页面初始化
     */
    initHtml() {
        var html = _.template(this.template.split('$$')[0] + "</div>")();
        this.setHtml(html);
        this.ready();
        this.initLoginUser();
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
        if (this.iszgs == true) {//集团公司账号           
            this.companydatas = new Object();
            this.domObj.find(".point-title").empty().append(this.template.split('$$')[3]);
            this.domObj.find(".company_serch").show();
            this.getCompanyList();
            this.domObj.find('.company').on("change", function (e) {
                var companyid = this.domObj.find('.company option:selected').val();
                this.setButtonInUse(companyid);
                this.reloadDatas();
                this.config.pagesize = parseInt(this.domObj.find(".dynamic_pagesize option:selected").val());
                this.getPlanPoint(this.config.pagenumber, this.config.pagesize);
            }.bind(this));

        } else {
            this.domObj.find(".point-title").empty().append(this.template.split('$$')[2]);
            this.domObj.find(".company_serch").hide();
            this.domObj.find('.region').prop("checked", true);
            this.getAllPlanRegion();
            this.getPlanPoint(this.config.pagenumber, this.config.pagesize);
        }
    }

    /**
     * @function 重新加载图层数据
     */
    reloadDatas() {
        this.domObj.find('.region').prop('checked', false);
        this.domObj.find('.path').prop('checked', false);
        this.point_planpath.clear();
        this.point_planregion.clear();
    }

    /**
     * @function 是否可使用
     * @param companyid 所属公司id，当公司id和用户的公司id一致时，可进行编辑更新操作
     */
    setButtonInUse(companyid?: string) {
        if (this.iszgs) {//总公司账号
            if (companyid == AppX.appConfig.departmentid) {//可使用
                this.domObj.find('.btn_addplanpoint').prop('disabled', false);
                this.domObj.find('.btn_editplanpoint').prop('disabled', false);
                this.domObj.find('.btn_edit_place').prop('disabled', false);
                this.domObj.find('.btn_deleteplanpoint').prop('disabled', false);
            } else {//不可使用
                this.domObj.find('.btn_addplanpoint').prop('disabled', true);
                this.domObj.find('.btn_editplanpoint').prop('disabled', true);
                this.domObj.find('.btn_edit_place').prop('disabled', true);
                this.domObj.find('.btn_deleteplanpoint').prop('disabled', true);
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
                this.domObj.find('.region').prop("checked", true);
                this.getAllPlanRegion();
                this.getPlanPoint(this.config.pagenumber, this.config.pagesize);
            }.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取公司列表数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    configure() {
        this.toast = this.AppX.runtimeConfig.toast;
        this.popup = this.AppX.runtimeConfig.popup;
        this.map = this.AppX.runtimeConfig.map;
        this.editTool = new Edit(this.map);
        this.loadWait = this.AppX.runtimeConfig.loadWait;
        if (!this.map.getLayer("point_planregion")) {
            var planregion = new GraphicsLayer();
            planregion.id = "point_planregion";
            this.point_planregion = planregion;
            this.map.addLayer(planregion);
        }
        //显示相关信息巡检线路和片区
        if (!this.map.getLayer("point_planpath")) {
            var planpath = new GraphicsLayer();
            planpath.id = "point_planpath";
            this.point_planpath = planpath;
            this.map.addLayer(planpath);
        }

        if (!this.map.getLayer("point_templanpoint")) {
            var templanpoint = new GraphicsLayer();
            templanpoint.id = "point_templanpoint";
            this.templanpoint = templanpoint;
            this.map.addLayer(templanpoint);
        }


    }

    /**
     * 初始化事件
     */
    initEvent() {
        var that = this;
        window.oncontextmenu = function () {
            return false;
        }
        $(document).keydown(function (event) {
            if (event.keyCode == 27) {//esc
                if (this.drawToolbar != null) {
                    this.map.setMapCursor('default');
                    this.drawToolbar.deactivate();
                    this.drawToolbar = null;
                }
            }

        }.bind(this));
        //巡检线图层勾选 
        this.domObj.find('.path').on("change", function () {
            if (this.checked) {
                that.getAllPlanPath();//查询所有巡检线
            } else {
                that.point_planpath.clear();
            }
        });

        //巡检片区勾选
        this.domObj.find('.region').on("change", function () {
            if (this.checked) {
                that.getAllPlanRegion();
            } else {
                that.point_planregion.clear();
            }
        });

        //查询
        this.domObj.find('.btn_serach').on("click", function () {
            this.config.pagesize = parseInt(this.domObj.find(".dynamic_pagesize option:selected").val());
            this.getPlanPoint(this.config.pagenumber, this.config.pagesize);
        }.bind(this));

        //添加巡检点 先绘制点然后弹出信息框
        this.domObj.find('.btn_addplanpoint').on("click", function () {
            if (this.drawToolbar != null) {
                this.map.setMapCursor('default');
                this.drawToolbar.deactivate();
                this.drawToolbar = null;
            }
            this.map.setMapCursor('crosshair');
            this.templanpoint.clear();
            this.drawToolbar = new Draw(this.AppX.runtimeConfig.map);
            this.drawToolbar.activate(Draw.POINT);
            //绘制完成
            this.drawToolbar.on("draw-end", function (evt) {
                this.map.setMapCursor('default');
                var currentPoint = new SimpleMarkerSymbol(
                    {
                        color: new Color("#FF0000"),
                        size: 5,
                        outline: {
                            color: new Color([255, 0, 0, 0.7]),
                            width: 2
                        }
                    }
                );
                var graphic = new Graphic(evt.geometry, currentPoint);
                this.tempjsongeometry = JSON.stringify(evt.geometry.toJson());
                this.templanpoint.add(graphic);
                this.drawToolbar.deactivate();
                this.status = "add";
                this.polygon_add_id = "";
                this.polygon_id = [];
                this.getAllPlanRegion_contain();//检查巡检点是否在片区内，在片区内就弹出信息框                
            }.bind(this));
        }.bind(this));

        //修改巡检点
        this.domObj.find('.btn_editplanpoint').on("click", function () {
            if (this.point_id == "") {
                this.toast.Show("请先选择一个巡检点！");
                return;
            }
            this.status = "update";
            this.isUpdate();
        }.bind(this));

        //删除巡检点
        this.domObj.find('.btn_deleteplanpoint').on("click", function () {
            if (this.point_id == "") {
                this.toast.Show("请选择要删除的巡检点!");
                return;
            }
            this.status = "delete";
            this.isUpdate();
        }.bind(this));

        //位置修改
        this.domObj.find('.btn_edit_place').on("click", function () {
            if (this.point_id == "") {
                this.toast.Show("请选择需位置修改的巡检点!");
                return;
            }
            this.status = "edit_place";
            this.isUpdate();
        }.bind(this));

        // 行定位高亮 显示信息
        this.domObj.off("click").on('click', 'tbody tr', (e) => {
            if ($(e.currentTarget).data("point_id") == null) {
                return;
            } else {
                this.point_id = $(e.currentTarget).data("point_id");
                this.point_name = $(e.currentTarget).data("point_name");
                this.address = $(e.currentTarget).data("address");
                this.notes = $(e.currentTarget).data("notes");
                this.tempjsongeometry = JSON.stringify($(e.currentTarget).data("geometry"));
                this.polygonid = $(e.currentTarget).data("regionid");
                this.currentTarget = $(e.currentTarget);
                this.setButtonInUse($(e.currentTarget).data("companyid"));
            }
            this.domObj.find('tr.active').removeClass('active');
            $(e.currentTarget).addClass('active');

            //定位
            var geom = $(e.currentTarget).data("geometry");
            if (typeof (geom) == "string") {
                geom = JSON.parse(geom);
            }
            var mapPoint = new Point(geom);
            this.map.centerAndZoom(mapPoint, 11);
        });

        //动态生成书签及分页控件
        //分页控件fykj 向前、向后事件
        this.domObj.find(".pre").off("click").on("click", function () {
            if (that.currentpage - 1 > 0) {
                that.currentpage = that.currentpage - 1;
                that.getPlanPoint(that.currentpage, that.currentpagesieze);
                that.domObj.find(".content").text("第" + that.currentpage + "页共" + that.totalpage + "页");
            }

        });
        this.domObj.find(".next").off("click").on("click", function () {
            if (that.currentpage + 1 <= that.totalpage) {
                that.currentpage = that.currentpage + 1;
                that.getPlanPoint(that.currentpage, that.currentpagesieze);
                that.domObj.find(".content").text("第" + that.currentpage + "页共" + that.totalpage + "页");

            }
        });
        this.domObj.find(".pageturning").off("click").on("click", function () {

            if (parseInt(that.domObj.find(".currpage").val()) <= that.totalpage && that.currentpage >= 1) {
                that.currentpage = parseInt(that.domObj.find(".currpage").val());
                that.getPlanPoint(that.currentpage, that.currentpagesieze);
                that.domObj.find(".content").text("第" + that.currentpage + "页共" + that.totalpage + "页");
                //清除infowindow
            } else {
                that.domObj.find(".currpage").val("");
            }
        }.bind(this));
        this.domObj.find(".dynamic_pagesize").off("change").on("change", function () {
            this.currentpagesize = parseInt(this.domObj.find(".dynamic_pagesize option:selected").val());
            //重新查询

            this.getPlanPoint(this.config.pagenumber, this.currentpagesize);

        }.bind(this));
    }

    addPoint() {
        //弹出popup
        this.popup.setSize(500, 380);
        var strhtml = _.template(this.template.split('$$')[1])({ count: this.polygon_id.length });
        var Obj = this.popup.Show("新增", strhtml);

        //如果当前线段所属片区超过两个
        if (this.polygon_id.length > 1) {


            var region = Obj.domObj.find('.region').empty();


            var strregion = "";
            $.each(this.polygon_id, function (index, item) {
                strregion += "<option value=" + item.id + " >" + item.name + " </option>";

            }.bind(this));
            region.append(strregion);
        }

        Obj.domObj.find('.btn-close').off("click").on("click", function () {
            this.templanpoint.clear();
            this.popup.Close();
        }.bind(this));

        Obj.domObj.find('.btn-hide').off("click").on("click", function () {
            this.templanpoint.clear();
            this.popup.Close();
        }.bind(this));
        //提交
        Obj.submitObj.off("click").on("click", function () {
            this.point_name = Obj.conObj.find(".point_name").val();
            this.address = Obj.conObj.find(".address").val();
            this.notes = Obj.conObj.find(".notes").val();
            if (this.point_name == "") {
                Obj.conObj.find(".point_name").addClass('has-error');
                Obj.conObj.find(".point_name").attr("placeholder", "不能为空！");
                this.popup.ShowTip("巡检点名称不能为空！");
                return;
            }

            //添加巡检点          
            $.ajax({
                headers: this.getHeaders(1),
                type: "POST",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.addPlanPointInfo,
                data: {
                    "point_name": this.point_name,
                    // "region_id": this.polygon_add_id,

                    "region_id": this.polygon_id.length == 1 ? this.polygon_id[0].id : Obj.domObj.find('.region').val(),

                    "geometry": this.tempjsongeometry,
                    "address": this.address,
                    "notes": this.notes,
                    "x": "0",
                    "y": "0",
                    "lat": "0",
                    "lng": "0",
                    "device_type_id": this.config.device_type_id.point,
                    "createuser": AppX.appConfig.realname
                },
                success: this.addPlanPointInfoCallback.bind(this),
                dataType: "json",
            });

        }.bind(this));
    }

    deletePoint() {
        this.popup.setSize(300, 150);
        var Obj = this.popup.ShowMessage("提示", "是否删除选择数据？");
        Obj.submitObj.off("click").on("click", function () {
            this.popup.Close();
            $.ajax({
                headers: this.getHeaders(1),
                type: "POST",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.deletePlanPoint + this.point_id,
                data: {
                    "id": this.point_id
                },
                success: this.deletePlanPointCallback.bind(this),
                dataType: "json",
            });
        }.bind(this));
    }

    /**
     * 修改巡检点
     */
    editPoint() {
        //弹出popup
        this.popup.setSize(500, 330);
        var Obj = this.popup.Show("修改", this.template.split('$$')[4]);
        Obj.conObj.find('.point_name').val(this.point_name);
        Obj.conObj.find('.address').val(this.address);
        Obj.conObj.find('.notes').val(this.notes);
        Obj.submitObj.off("click").on("click", function () {
            var pointname = Obj.conObj.find('.point_name');
            var address = Obj.conObj.find('.address');
            var notes = Obj.conObj.find('.notes');
            if (pointname.val() == "") {
                pointname.addClass('has-error');
                pointname.attr("placeholder", "不能为空！");
                this.popup.ShowTip("巡检点名称不能为空！");
                return;
            }

            $.ajax({
                headers: this.getHeaders(1),
                type: "POST",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.updatePlanPoint,
                data: {
                    "point_id": this.point_id,
                    "point_name": pointname.val(),
                    "region_id": this.polygonid,
                    "geometry": this.tempjsongeometry,
                    "address": address.val(),
                    "notes": notes.val(),
                    "x": "0",
                    "y": "0",
                    "lat": "0",
                    "lng": "0",
                    "device_type_id": this.config.device_type_id.point,
                },
                success: this.updatePlanPointInfoCallback.bind(this),
                dataType: "json",
            });
        }.bind(this));
    }

    /**
     * @function 判断巡检点是否在片区内
     */
    getAllPlanRegion_contain() {
        $.ajax({
            headers: this.getHeaders(1),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getPlanRegionList,
            data: {
                "pageindex": 1,
                "pagesize": this.config.maxsize
            },
            success: this.getAllPlanRegion_containListCallback.bind(this),
            dataType: "json",
        });
    }
    getAllPlanRegion_containListCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        }

        //添加当前页工单气泡
        for (var i = 0, length = results.result.rows.length; i < length; i++) {
            var row = results.result.rows[i];
            if (row.geometry == undefined || row.geometry == "") { continue; }
            var polygon = new Polygon(JSON.parse(row.geometry));
            var point = new Point(JSON.parse(this.tempjsongeometry));
            if (polygon.contains(point)) {
                this.polygon_add_id = row.regionid;
                that.polygon_id.push({ id: row.regionid, name: row.regionname });
            }
        }

        // if (this.polygon_add_id != "") {
        //     //this.isUpdate(); 
        //     this.addPoint();
        // } else {
        //     this.toast.Show("该巡检点无对应巡检片区，暂不插入数据！");
        //     this.templanpoint.clear();
        // }

        if (this.polygon_id.length != 0) {//巡检线在片区中，弹出输入框 
            this.addPoint();
        } else {
            this.toast.Show("该巡检点无对应巡检片区，暂不插入数据！");
            this.templanpoint.clear();
        }
    }

    getPlanPointListCallback(results) {
        this.loadWait.Hide();
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        }

        if (results.result.total % this.currentpagesieze == 0) {
            this.totalpage = Math.floor(parseInt(results.result.total) / this.currentpagesieze);

        } else {
            this.totalpage = Math.floor(parseInt(results.result.total) / this.currentpagesieze) + 1;

        }

        //为分页控件添加信息
        this.domObj.find(".pagecontrol").text("总共" + results.result.total + "条，每页");
        this.domObj.find(".content").text("第" + that.currentpage + "页共" + that.totalpage + "页");
        if (this.totalpage == 0) {
            this.domObj.find(".pagecontrol").text("总共-条，每页");
            this.domObj.find(".content").text("第-页共-页");
        }

        var html_trs_data = "";
        $.each(results.result.rows, function (i, item) {
            html_trs_data += "<tr class=goto data-geometry='"
                + item.geometry + "' data-point_id='"
                + item.point_id + "' data-regionid='"
                + item.region_id + "' data-point_name='"
                + item.point_name + "' data-address='"
                + item.address
                + "' data-notes='" + item.notes
                + "' data-companyid='" + (this.iszgs == true ? item.companyid : "")
                + "'>"
                + (this.iszgs == true ? "<td title='" + this.companydatas[item.companyid] + "'>" + this.companydatas[item.companyid] + "</td>" : "")
                + "<td title='" + item.point_name + "'>"
                + item.point_name + "</td><td title='" + item.address + "'>"
                + item.address + "</td><td title='" + item.notes + "'>"
                + item.notes + "</td><td title='" + item.region_name + "'>"
                + item.region_name + "</td><td title='" + item.createuser + "'>"
                + item.createuser + "</td><td title='" + (item.create_time != null ? item.create_time : "") + "'>"
                + (item.create_time != null ? item.create_time : "")
                + "</td></tr>";
        }.bind(this));
        this.domObj.find(".addpoint").empty().append(html_trs_data);

        //查询所有
        this.getAllPlanPoint();
    }

    getPlanPoint(pagenumber, pagesize) {
        this.loadWait.Show("正在查询数据，请耐心等待...", this.domObj);
        this.companyid = (this.iszgs == true ? this.domObj.find(".company option:selected").val() : "");
        this.point_id = "";
        this.currentTarget = null;
        this.currentpage = pagenumber || this.config.pagenumber;
        this.currentpagesieze = parseInt(this.domObj.find(".dynamic_pagesize option:selected").val()) || pagesize || this.config.pagesize;
        $.ajax({
            headers: this.getHeaders(0),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getPlanPointList,
            data: {
                "pageindex": this.currentpage || this.config.pagenumber,
                "pagesize": this.currentpagesieze || this.config.pagesize,
                "valid": 1,
                "device_type_id": this.config.device_type_id.point,
                "companyid": this.companyid
            },
            success: this.getPlanPointListCallback.bind(this),
            error: function (results) {
                this.loadWait.Hide();
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    getAllPlanPoint() {
        this.pointDatas = new Object();
        $.ajax({
            headers: this.getHeaders(0),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getPlanPointList,
            data: {
                "pageindex": 1,
                "pagesize": this.config.maxsize,
                "valid": 1,
                "device_type_id": this.config.device_type_id.point,
                "companyid": this.companyid
            },
            success: this.getAllPlanPointListCallback.bind(this),
            dataType: "json",
        });
    }

    getAllPlanPointListCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        }
        this.map.infoWindow.resize(400, 260);
        this.addClusters(results.result.rows);
    }

    getAllPlanRegion() {
        this.companyid = (this.iszgs == true ? this.domObj.find(".company option:selected").val() : "");
        $.ajax({
            headers: this.getHeaders(0),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getPlanRegionList,
            data: {
                "pageindex": 1,
                "pagesize": this.config.maxsize,
                "companyid": this.companyid
            },
            success: this.getAllPlanRegionListCallback.bind(this),
            dataType: "json",
        });
    }

    getAllPlanRegionListCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        }
        this.addPolygonGraphic(results);
    }

    getAllPlanPath() {
        this.companyid = (this.iszgs == true ? this.domObj.find(".company option:selected").val() : "");
        $.ajax({
            headers: this.getHeaders(0),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getPlanPathList,
            data: {
                "pageindex": 1,
                "pagesize": this.config.maxsize,
                "valid": 1,
                "device_type_id": this.config.device_type_id.path,
                "companyid": this.companyid
            },
            success: this.getAllPlanPathListCallback.bind(this),
            dataType: "json",
        });
    }

    getAllPlanPathListCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        }
        this.addPathGraphic(results);
    }

    addPointGraphic(queryResult) {
        //清除图层
        this.planpointInfoGraphicLayer.clear();

        //添加当前页工单气泡
        for (var i = 0, length = queryResult.result.rows.length; i < length; i++) {
            var row = queryResult.result.rows[i];
            if (row.geometry == undefined || row.geometry == "") { continue; }
            var point = new Point(JSON.parse(row.geometry));
            var graphic = new Graphic(point, this.setSymbol(row.point_name)[0], "");
            if (i == 0) {

            }

            graphic.attr("id", "graphic" + i);
            this.planpointInfoGraphicLayer.add(graphic);
            //this.map.centerAt(point);

            //添加背景

            var graphictextbg = new Graphic(point, this.setSymbol(row.point_name)[1].setOffset(0, -20), "");
            this.planpointInfoGraphicLayer.add(graphictextbg);
            //添加文字
            var peopleTextSymbol = new TextSymbol(row.point_name);
            peopleTextSymbol.setOffset(0, -25);
            var font = new Font();
            font.setSize("10pt");
            font.setWeight(Font.WEIGHT_BOLD);
            peopleTextSymbol.setFont(font);
            var graphicText = new Graphic(point, peopleTextSymbol, "");
            this.planpointInfoGraphicLayer.add(graphicText);
        }

    }

    addPolygonGraphic(queryResult) {
        //清除图层
        this.point_planregion.clear();
        // this.map.infoWindow.hide();

        //添加当前页工单气泡
        for (var i = 0, length = queryResult.result.rows.length; i < length; i++) {
            var row = queryResult.result.rows[i];

            if (row.geometry == undefined || row.geometry == "") { continue; }
            // var Polygon = new Polygon(JSON.parse(row.geometry));
            var polygon = new Polygon(JSON.parse(row.geometry));
            var graphic = new Graphic(polygon, this.setSymbol(row.regionname)[2], "");


            graphic.attr("id", "graphic" + i);
            this.point_planregion.add(graphic);
            //this.map.centerAt(point);

            //添加背景
            var point = polygon.getExtent().getCenter();
            var graphictextbg = new Graphic(point, this.setSymbol(row.regionname)[1].setOffset(0, -20), "");
            this.point_planregion.add(graphictextbg);
            //添加文字
            var peopleTextSymbol = new TextSymbol(row.regionname);
            peopleTextSymbol.setOffset(0, -25);
            var font = new Font();
            font.setSize("10pt");
            font.setWeight(Font.WEIGHT_BOLD);
            peopleTextSymbol.setFont(font);
            var graphicText = new Graphic(point, peopleTextSymbol, "");
            this.point_planregion.add(graphicText);

        }

    }

    addPathGraphic(queryResult) {
        //清除图层
        this.point_planpath.clear();

        //添加当前页工单气泡
        for (var i = 0, length = queryResult.result.rows.length; i < length; i++) {
            var row = queryResult.result.rows[i];
            if (row.geometry == undefined || row.geometry == "") { continue; }
            var polyline = new Polyline(JSON.parse(row.geometry));
            var point = polyline.getExtent().getCenter();
            var graphic = new Graphic(polyline, this.setSymbol(row.point_name)[3], "");
            if (i == 0) {

            }

            graphic.attr("id", "graphic" + i);
            this.point_planpath.add(graphic);
            //this.map.centerAt(point);

            //添加背景

            var graphictextbg = new Graphic(point, this.setSymbol(row.point_name)[1].setOffset(0, -20), "");
            this.point_planpath.add(graphictextbg);
            //添加文字
            var peopleTextSymbol = new TextSymbol(row.point_name);
            peopleTextSymbol.setOffset(0, -25);
            var font = new Font();
            font.setSize("10pt");
            font.setWeight(Font.WEIGHT_BOLD);
            peopleTextSymbol.setFont(font);
            var graphicText = new Graphic(point, peopleTextSymbol, "");
            this.point_planpath.add(graphicText);
        }
    }

    addPlanPointInfoCallback(results) {
        var that = this;
        if (results.code != 1) {
            this.popup.ShowTip(results.message);
            return;
        } else {
            this.popup.Close();
            this.tempjsongeometry = "";
            that.toast.Show("绘制巡检点成功！");
            this.jsongeometry = "";
            this.domObj.find(".point_name").val("");
            this.domObj.find(".address").val("");
            this.domObj.find(".notes").val("");
            this.point_id = "";
            this.getPlanPoint(this.config.pagenumber, this.config.pagesize);
            this.domObj.find(".content").text("第" + (this.config.pagenumber) + "页共" + this.totalpage + "页");
        }
        if (this.templanpoint) {
            this.templanpoint.clear();
        }
    }
    deletePlanPointCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        } else {
            that.toast.Show("删除巡检点成功！");
            this.point_id = "";
            this.getPlanPoint(this.config.pagenumber, this.config.pagesize);
            this.domObj.find(".content").text("第" + (this.config.pagenumber) + "页共" + this.totalpage + "页");

        }


    }

    updatePlanPointInfoCallback(results) {
        var that = this;
        if (results.code != 1) {
            this.popup.ShowTip(results.message);
            return;
        } else {
            this.popup.Close();
            that.toast.Show("修改巡检点成功！");
            this.tempjsongeometry = "";
            this.jsongeometry = "";
            this.domObj.find(".point_name").val("");
            this.domObj.find(".address").val("");
            this.domObj.find(".notes").val("");
            this.point_id = "";
            this.getPlanPoint(this.config.pagenumber, this.config.pagesize);
            this.domObj.find(".content").text("第" + (this.config.pagenumber) + "页共" + this.totalpage + "页");
        }
        if (this.templanpoint) {
            this.templanpoint.clear();
        }
    }

    //显示
    addClusters(resp) {
        console.log(resp);
        var photoInfo = { "data": [] };
        var wgs = new SpatialReference({
            "wkid": this.map.spatialReference.wkid
        });
        photoInfo.data = arrayUtils.map(resp, function (p) {
            this.pointDatas[p.point_id] = p;

            var attributes = {
                "Caption": p.point_name,
                "Address": p.address,
                "Type": p.device_type_name,
                "Code": p.notes,
            };
            return {
                "x": p.lng - 0,
                "y": p.lat - 0,
                "attributes": attributes
            };
        }.bind(this));

        var popupTemplate2 = new PopupTemplate({});

        popupTemplate2.setContent("<h5>标题：${Caption}</h5><h5>内容：${Address}</h5><h5>备注：${Code}</h5>");

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
        var blue = new PictureMarkerSymbol(this.config.MarkPictureSymbol, 48, 48).setOffset(0, 15);
        renderer.addBreak(0, 10000, blue);//范围放大点，用一种图标渲染
        this.planpoint_clusterLayer.setRenderer(renderer);

        this.map.addLayer(this.planpoint_clusterLayer);

    }



    /**
     * 设置符号样式
     */
    setSymbol(txt?) {
        var symbol = [];
        var fillSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASHDOT, new Color([255, 0, 0]), 2), new Color([0, 0, 0, 0.1]));
        var lineSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([255, 0, 0]), 2);
        var peopleSymbol = new PictureMarkerSymbol(this.config.MarkPictureSymbol, 48, 48);
        //根据字长度设置背景图片宽度
        var peopletextSymbol = new PictureMarkerSymbol(this.config.TextbgSymbol, txt == null ? 0 : txt.length * 90 / 6, 18);
        symbol.push(peopleSymbol);
        symbol.push(peopletextSymbol);
        symbol.push(fillSymbol);
        symbol.push(lineSymbol);
        return symbol;
    }

    isUpdate() {
        $.ajax({
            headers: this.getHeaders(1),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.isUpdate + this.point_id,
            data: {
                "id": this.point_id
            },
            success: this.isUpdateCallback.bind(this),
            dataType: "json",
        });
    }

    isUpdateCallback(data) {
        if (data.code != 1) {
            this.toast.Show(data.message);
            return;
        }
        if (data.result != null && data.result.state != 1) {//可以修改或删除
            switch (this.status) {
                case "update":
                    this.editPoint();
                    break;
                case "delete":
                    this.deletePoint();
                    break;
                case "add":
                    this.addPoint();
                    break;
                case "edit_place":
                    this.editPlacePoint();
                    break;
            }
        } else {
            this.toast.Show("该巡检点所在片区已安排在巡检计划中，暂时不能删除或更新！");
            this.templanpoint.clear();
            return;
        }
    }

    editPlacePoint() {
        if (this.drawToolbar != null) {
            this.map.setMapCursor('default');
            this.drawToolbar.deactivate();
            this.drawToolbar = null;
        }
        this.map.setMapCursor('crosshair');
        this.templanpoint.clear();

        this.drawToolbar = new Draw(this.AppX.runtimeConfig.map);
        this.drawToolbar.activate(Draw.POINT);
        //绘制完成
        this.drawToolbar.on("draw-end", function (evt) {
            this.map.setMapCursor('default');
            var currentPoint = new SimpleMarkerSymbol(
                {
                    color: new Color("#FF0000"),
                    size: 5,
                    outline: {
                        color: new Color([255, 0, 0, 0.7]),
                        width: 2
                    }
                }
            );

            this.drawToolbar.deactivate();
            var data = this.pointDatas[this.point_id];
            if (!geometryEngine.contains(new Polygon(JSON.parse(data.region_geometry)), evt.geometry)) {
                this.toast.Show("修改巡检点的位置不在所属片区范围内！");
                return;
            } else {
                this.templanpoint.clear();
                var graphic = new Graphic(evt.geometry, currentPoint);
                this.tempEditGeometry = JSON.stringify(evt.geometry.toJson());
                this.templanpoint.add(graphic);
                this.popup.setSize(300, 150);
                var Obj = this.popup.ShowMessage("提示", "是否保存位置修改？");
                Obj.domObj.find('.btn-close').off("click").on("click", function () {
                    this.templanpoint.clear();
                    this.tempEditGeometry = "";
                    this.popup.Close();
                }.bind(this));

                Obj.domObj.find('.btn-hide').off("click").on("click", function () {
                    this.templanpoint.clear();
                    this.tempEditGeometry = "";
                    this.popup.Close();
                }.bind(this));

                Obj.submitObj.off("click").on("click", function () {
                    this.popup.Close();
                    this.tempjsongeometry = this.tempEditGeometry;

                    $.ajax({
                        headers: this.getHeaders(1),
                        type: "POST",
                        url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.updatePlanPoint,
                        data: {
                            "point_id": data.point_id,
                            "point_name": data.point_name,
                            "region_id": data.region_id,
                            "geometry": this.tempjsongeometry,
                            "address": data.address,
                            "notes": data.notes,
                            "x": "0",
                            "y": "0",
                            "lat": "0",
                            "lng": "0",
                            "device_type_id": this.config.device_type_id.point,
                        },
                        success: function (results) {
                            if (results.code != 1) {
                                this.toast.Show(results.message);
                                return;
                            }
                            this.templanpoint.clear();
                            this.tempEditGeometry = "";
                            this.currentTarget.data("geometry", this.tempjsongeometry);
                            this.getAllPlanPoint();//重新加载数据
                            this.toast.Show("修改位置成功！");
                        }.bind(this),
                        dataType: "json",
                    });
                }.bind(this));
            }
        }.bind(this));
    }

    /**
     * 销毁对象
     */
    destroy() {
        if (this.templanpoint) {
            this.map.removeLayer(this.templanpoint);
            this.templanpoint.clear();
        }

        if (this.point_planregion) {
            this.map.removeLayer(this.point_planregion);
            this.point_planregion.clear();
        }

        if (this.point_planpath) {
            this.map.removeLayer(this.point_planpath);
            this.point_planpath.clear();
        }

        if (this.planpoint_clusterLayer != null) {
            this.map.removeLayer(this.planpoint_clusterLayer);
            this.planpoint_clusterLayer = null
        }
        if (this.drawToolbar != null) {
            this.map.setMapCursor('default');
            this.drawToolbar.deactivate();
            this.drawToolbar = null;
        }
        this.domObj.remove();
        this.afterDestroy();
    }
}