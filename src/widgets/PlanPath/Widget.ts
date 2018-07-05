import BaseWidget = require('core/BaseWidget.class');
import Functions = require('core/Functions.module');
import Extent = require('esri/geometry/Extent');
import SpatialReference = require('esri/SpatialReference');


import GraphicsLayer = require("esri/layers/GraphicsLayer");
import Graphic = require("esri/graphic");
import PictureMarkerSymbol = require("esri/symbols/PictureMarkerSymbol");
import TextSymbol = require("esri/symbols/TextSymbol");
import Font = require("esri/symbols/Font");
import ScreenPoint = require('esri/geometry/ScreenPoint');
import Draw = require('esri/toolbars/draw');

import SimpleMarkerSymbol = require('esri/symbols/SimpleMarkerSymbol');
import Color = require("esri/Color");
import SimpleLineSymbol = require('esri/symbols/SimpleLineSymbol');
import Point = require("esri/geometry/Point");
import Polyline = require('esri/geometry/Polyline');
import Polygon = require('esri/geometry/Polygon');
import SimpleFillSymbol = require('esri/symbols/SimpleFillSymbol');
import LengthsParameters = require("esri/tasks/LengthsParameters");
import GeometryService = require("esri/tasks/GeometryService");
import Edit = require("esri/toolbars/edit");
import geometryEngine = require("esri/geometry/geometryEngine");
import graphicsUtils = require("esri/graphicsUtils");


export = PlanPath;

class PlanPath extends BaseWidget {
    baseClass = "widget-planpath";
    popup = null;
    loadWait = null;
    map = null;
    editTool = null;
    editingEnabled = false;
    editToolEvent = null;
    toast = null;
    totalpage = 1;
    currentpage = 1;
    currentpagesieze = 1;
    curentplanpathtypeid = "";
    planpathInfoGraphicLayer: GraphicsLayer;
    templanpath: GraphicsLayer;
    jsongeometry = "";
    editgeometry: Polyline;
    editid = "";
    polygonid = "";
    polygon_add_id = "";//当前所属片区，片区不重叠
    polygon_id = [];//当前所属片区，片区可以重叠

    companyid = "";//公司id
    companydatas = null;
    iszgs = false;//是否是总公司账号
    ispartment = false;

    path_planregion: GraphicsLayer;
    path_planpoint: GraphicsLayer;
    path_plandetail_polylinelayer: GraphicsLayer;


    path_id = "";
    path_name = "";
    address = "";
    notes = "";
    status = "";//update修改、delete删除
    drawToolbar = null;
    currentTarget = null;
    pathDatas = null;

    startup() {
        this.configure();
        this.initHtml();
        this.initEvent();
        this.getConfigDistance();
    }

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
            this.domObj.find(".path-title").empty().append(this.template.split('$$')[3]);
            this.domObj.find(".company_serch").show();
            this.getCompanyList();
            this.domObj.find('.company').on("change", function (e) {
                var companyid = this.domObj.find('.company option:selected').val();
                this.setButtonInUse(companyid);
                this.reloadDatas();
                this.config.pagesize = parseInt(this.domObj.find(".dynamic_pagesize option:selected").val());
                this.getPlanPath(this.config.pagenumber, this.config.pagesize);
            }.bind(this));
        } else {
            this.domObj.find(".path-title").empty().append(this.template.split('$$')[2]);
            this.domObj.find(".company_serch").hide();
            this.domObj.find('.region').prop("checked", true);
            this.getAllPlanRegion();
            this.getPlanPath(this.config.pagenumber, this.config.pagesize);
        }
    }

    /**
     * @function 重新加载图层数据
     */
    reloadDatas() {
        this.domObj.find('.region').prop('checked', false);
        this.domObj.find('.point').prop('checked', false);
        this.path_planpoint.clear();
        this.path_planregion.clear();
    }

    /**
     * @function 是否可使用
     * @param companyid 所属公司id，当公司id和用户的公司id一致时，可进行编辑更新操作
     */
    setButtonInUse(companyid?: string) {
        if (this.iszgs) {//总公司账号
            if (companyid == AppX.appConfig.departmentid) {//可使用
                this.domObj.find('.btn_addplanpath').prop('disabled', false);
                this.domObj.find('.btn_editplanpath').prop('disabled', false);
                this.domObj.find('.btn_edit_location').prop('disabled', false);
                this.domObj.find('.btn_deleteplanpath').prop('disabled', false);
            } else {//不可使用
                this.domObj.find('.btn_addplanpath').prop('disabled', true);
                this.domObj.find('.btn_editplanpath').prop('disabled', true);
                this.domObj.find('.btn_edit_location').prop('disabled', true);
                this.domObj.find('.btn_deleteplanpath').prop('disabled', true);
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
                console.log(results);
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
                this.getPlanPath(this.config.pagenumber, this.config.pagesize);
            }.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取公司列表数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    configure() {
        this.toast = this.AppX.runtimeConfig.toast;
        this.map = this.AppX.runtimeConfig.map;
        this.popup = this.AppX.runtimeConfig.popup;
        this.loadWait = this.AppX.runtimeConfig.loadWait;
        this.editTool = new Edit(this.map);
        if (!this.map.getLayer("path_planregion")) {
            var planregion = new GraphicsLayer();
            planregion.id = "path_planregion";
            this.path_planregion = planregion;
            this.map.addLayer(planregion);
        }

        if (!this.map.getLayer("path_plandetail_polylinelayer")) {
            var path_plandetail_polylinelayer = new GraphicsLayer();
            path_plandetail_polylinelayer.id = "path_plandetail_polylinelayer";
            this.path_plandetail_polylinelayer = path_plandetail_polylinelayer;
            this.map.addLayer(path_plandetail_polylinelayer);
        }

        if (!this.map.getLayer("path_planpath")) {
            var graphicLayer = new GraphicsLayer();
            graphicLayer.id = "path_planpath";
            this.planpathInfoGraphicLayer = graphicLayer;
            this.map.addLayer(graphicLayer);
        }

        if (!this.map.getLayer("path_templanpath")) {
            var templanpath = new GraphicsLayer();
            templanpath.id = "path_templanpath";
            this.templanpath = templanpath;
            this.map.addLayer(templanpath);
        }

        //显示相关信息巡检点和片区
        if (!this.map.getLayer("path_planpoint")) {
            var planpoint = new GraphicsLayer();
            planpoint.id = "path_planpoint";
            this.path_planpoint = planpoint;
            this.map.addLayer(planpoint);
        }

        if (!this.map.getLayer("test_layer")) {
            var test_layer = new GraphicsLayer();
            test_layer.id = "test_layer";
            this.test_layer = test_layer;
            this.map.addLayer(test_layer);
        }
    }

    /**
     * 初始化显示列表页面
     */
    initEvent() {
        var that = this;
        window.oncontextmenu = function () {
            return false;
        }
        //打开图层巡检点
        this.domObj.find('.point').on("change", function () {
            if (this.checked) {
                that.getAllPlanPoint();
            } else {
                that.path_planpoint.clear();
            }
        });

        //打开图层巡检片区
        this.domObj.find('.region').on("change", function () {
            if (this.checked) {
                that.getAllPlanRegion();
            } else {
                that.path_planregion.clear();
            }
        });

        //查询
        this.domObj.find('.btn_serach').on("click", function () {
            this.config.pagesize = parseInt(this.domObj.find(".dynamic_pagesize option:selected").val());
            this.getPlanPath(this.config.pagenumber, this.config.pagesize);
        }.bind(this));

        //新增
        this.domObj.find('.btn_addplanpath').on("click", function () {
            this.map.setMapCursor('crosshair');
            this.OnMapClick();
            this.templanpath.clear();
            this.drawToolbar = new Draw(this.AppX.runtimeConfig.map);
            this.drawToolbar.activate(Draw.POLYLINE);

            this.drawToolbar.on("draw-end", function (evt) {
                this.map.setMapCursor('default');
                if (this.mapViewClickEvent) {
                    this.mapViewClickEvent.remove();
                }
                var graphic = new Graphic(evt.geometry, new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASHDOT, new Color([255, 0, 0]), 4), new Color([0, 0, 0, 0.3]));
                this.jsongeometry = JSON.stringify(evt.geometry.toJson());

                this.templanpath.add(graphic);
                this.drawToolbar.deactivate();
                this.status = "add";
                this.polygon_add_id = "";
                this.polygon_id = [];
                this.getAllPlanRegion_contain();
            }.bind(this));
        }.bind(this));

        //修改巡检线
        this.domObj.find('.btn_editplanpath').on("click", function () {
            if (this.path_id == "") {
                this.toast.Show("请先选择一个巡检线！");
                return;
            }
            this.status = "update";
            this.isUpdate()
        }.bind(this));

        //删除
        this.domObj.find('.btn_deleteplanpath').on("click", function () {
            if (this.path_id == "") {
                this.toast.Show("请先选择一个巡检线！");
                return;
            }
            this.status = "delete";
            this.isUpdate();
        }.bind(this));

        // 选中行高亮
        this.domObj.off("click").on('click', 'tbody tr', (e) => {
            var pathid = "";
            if (this.currentTarget != null) {
                pathid = this.currentTarget.data("path_id");
            }
            if ($(e.currentTarget).data("path_id") == null) {
                return;
            } else {
                this.path_id = $(e.currentTarget).data("path_id");
                this.path_name = $(e.currentTarget).data("path_name");
                this.address = $(e.currentTarget).data("address");
                this.notes = $(e.currentTarget).data("notes");
                this.jsongeometry = JSON.stringify($(e.currentTarget).data("geometry"));
                this.polygonid = $(e.currentTarget).data("regionid");
                this.currentTarget = $(e.currentTarget);
            }
            this.domObj.find('tr.active').removeClass('active');
            $(e.currentTarget).addClass('active');

            //定位
            var geom = $(e.currentTarget).data("geometry");
            if (typeof (geom) == 'string') {
                geom = JSON.parse(geom);
            }
            var mapPolyline = new Polyline(geom);
            this.path_plandetail_polylinelayer.clear();
            this.path_plandetail_polylinelayer.add(new Graphic(mapPolyline, this.setGraphSymbol("polyline")));
            this.map.setExtent(mapPolyline.getExtent());

            if (this.editingEnabled && pathid != "" && pathid != this.path_id) {
                this.editingEnabled = false;
                this.editTool.deactivate();
            }
        });

        //动态生成书签及分页控件
        //分页控件fykj 向前、向后事件
        this.domObj.find(".pre").off("click").on("click", function () {
            if (that.currentpage - 1 > 0) {
                that.currentpage = that.currentpage - 1;
                that.getPlanPath(that.currentpage, that.currentpagesieze);
                that.domObj.find(".content").text("第" + that.currentpage + "页共" + that.totalpage + "页");
            }

        });
        this.domObj.find(".next").off("click").on("click", function () {
            if (that.currentpage + 1 <= that.totalpage) {
                that.currentpage = that.currentpage + 1;
                that.getPlanPath(that.currentpage, that.currentpagesieze);
                that.domObj.find(".content").text("第" + that.currentpage + "页共" + that.totalpage + "页");

            }
        });
        this.domObj.find(".pageturning").off("click").on("click", function () {

            if (parseInt(that.domObj.find(".currpage").val()) <= that.totalpage && that.currentpage >= 1) {
                that.currentpage = parseInt(that.domObj.find(".currpage").val());
                that.getPlanPath(that.currentpage, that.currentpagesieze);
                that.domObj.find(".content").text("第" + that.currentpage + "页共" + that.totalpage + "页");
                //清除infowindow
            } else {
                that.domObj.find(".currpage").val("");
            }
        }.bind(this));
        this.domObj.find(".dynamic_pagesize").off("change").on("change", function () {
            //重新查询
            this.getPlanPath(this.config.pagenumber, parseInt(this.domObj.find(".dynamic_pagesize option:selected").val()));
        }.bind(this));

        //解决ESC取消键
        $(document).keydown(function (event) {
            if (event.keyCode == 27) {//esc
                this.line_lens = [];
                this.pointDraw = [];//拐点
                this.insertPts = [];//插入的点
                if (this.drawToolbar != null) {
                    this.map.setMapCursor('default');
                    this.drawToolbar.deactivate();
                }
            }
            if (event.keyCode == 13) {//enter
                if (this.editingEnabled) {
                    this.editingEnabled = false;
                    this.editTool.deactivate();
                }
            }
        }.bind(this));

        //图形修改
        this.domObj.find(".btn_edit_location").off("click").on("click", function () {
            if (this.path_id == "") {
                this.toast.Show("请先选择一个巡检线！");
                return;
            }
            this.status = "edit_place";
            this.domObj.find(".btn_edit_location").blur();
            this.isUpdate();

        }.bind(this));

        //释放后图形修改完成
        this.editToolEvent = this.editTool.on("deactivate", function (evt) {
            if (evt.info.isModified) {//修改了
                var path_id = evt.graphic.attributes["path_id"];
                var data = this.pathDatas[path_id];
                if (!geometryEngine.contains(new Polygon(JSON.parse(data.region_geometry)), evt.graphic.geometry)) {
                    this.toast.Show("巡检线修改超出所属片区！");
                    evt.graphic.geometry = new Polyline(JSON.parse(data.geometry));
                    this.planpathInfoGraphicLayer.redraw();
                } else {
                    this.popup.setSize(300, 150);
                    var Obj = this.popup.ShowMessage("提示", "是否保存巡检线图形修改？");
                    Obj.domObj.find('.btn-close').off("click").on("click", function () {
                        evt.graphic.geometry = new Polyline(JSON.parse(data.geometry));
                        this.planpathInfoGraphicLayer.redraw();
                        this.popup.Close();
                    }.bind(this));

                    Obj.domObj.find('.btn-hide').off("click").on("click", function () {
                        evt.graphic.geometry = new Polyline(JSON.parse(data.geometry));
                        this.planpathInfoGraphicLayer.redraw();
                        this.popup.Close();
                    }.bind(this));

                    Obj.submitObj.off("click").on("click", function () {
                        this.popup.Close();
                        this.path_plandetail_polylinelayer.clear();
                        var gstr = {
                            paths: evt.graphic.geometry.paths,
                            spatialReference: evt.graphic.geometry.spatialReference
                        };
                        this.jsongeometry = JSON.stringify(gstr);

                        $.ajax({
                            headers: this.getHeaders(1),
                            type: "POST",
                            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.updatePlanPath,
                            data: {
                                "point_id": data.point_id,
                                "point_name": data.point_name,
                                "region_id": data.region_id,
                                "geometry": this.jsongeometry,
                                "address": data.address,
                                "notes": data.notes,
                                "x": "0",
                                "y": "0",
                                "lat": "0",
                                "lng": "0",
                                "device_type_id": this.config.device_type_id.path,
                                "pipe_length": data.pipe_length
                            },
                            success: function (results) {
                                if (results.code != 1) {
                                    this.toast.Show(results.message);
                                    return;
                                }
                                this.currentTarget.data("geometry", this.jsongeometry);
                                this.currentTarget.removeClass('active');
                                this.path_id = "";
                                data.geometry = this.jsongeometry;
                                this.editingEnabled = false;
                                this.editTool.deactivate();
                                this.toast.Show("修改巡检线图形成功！");
                            }.bind(this),
                            dataType: "json",
                        });
                    }.bind(this));
                }
            }
        }.bind(this));

        //双击启动编辑
        this.planpathInfoGraphicLayer.on("click", function (evt) {
            if (this.editingEnabled) {
                this.editingEnabled = false;
                this.editTool.deactivate();
            }
        }.bind(this));
    }

    /**
     * 增加巡检线路
     */
    addPath() {
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
            this.templanpath.clear();
            this.popup.Close();
        }.bind(this));

        Obj.domObj.find('.btn-hide').off("click").on("click", function () {
            this.templanpath.clear();
            this.popup.Close();
        }.bind(this));
        Obj.submitObj.off("click").on("click", function () {
            //添加巡检线
            var path_name = Obj.conObj.find(".path_name");
            var address = Obj.conObj.find(".address").val();
            var notes = Obj.conObj.find(".notes").val();
            this.jsongeometry = JSON.stringify(this.insertPoints());//插值点结果
            this.addShowPts();
            if (path_name.val() == "") {
                path_name.addClass('has-error');
                path_name.attr("placeholder", "不能为空！");
                this.popup.ShowTip("线路名称不能为空！");
                return;
            }
            $.ajax({
                headers: this.getHeaders(1),
                type: "POST",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.addPlanPathInfo,
                data: {
                    "point_name": path_name.val(),
                    "region_id": this.polygon_id.length == 1 ? this.polygon_id[0].id : Obj.domObj.find('.region').val(),
                    "geometry": this.jsongeometry,
                    "address": address,
                    "notes": notes,
                    "device_type_id": this.config.device_type_id.path,
                    "createuser": AppX.appConfig.realname,
                    "pipe_length": this.getLengths()
                },
                success: this.addPlanPathInfoCallback.bind(this),
                dataType: "json",
            });
        }.bind(this));
    }

    /**
     * 删除巡检线路
     */
    deletePath() {
        this.popup.setSize(300, 150);
        var Obj = this.popup.ShowMessage("提示", "是否删除选择数据？");
        Obj.submitObj.off("click").on("click", function () {
            this.popup.Close();
            $.ajax({
                headers: this.getHeaders(1),
                type: "POST",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.deletePlanPath + this.path_id,
                data: {
                    "id": this.path_id
                },
                success: this.deletePlanPathCallback.bind(this),
                dataType: "json",
            });
        }.bind(this));
    }

    /**
     * 修改巡检线
     */
    editPath() {
        //弹出popup
        this.popup.setSize(500, 330);
        var Obj = this.popup.Show("修改", this.template.split('$$')[4]);
        Obj.conObj.find('.path_name').val(this.path_name);
        Obj.conObj.find('.address').val(this.address);
        Obj.conObj.find('.notes').val(this.notes);
        Obj.submitObj.off("click").on("click", function () {
            var pathname = Obj.conObj.find('.path_name');
            var address = Obj.conObj.find('.address');
            var notes = Obj.conObj.find('.notes');
            var pipelength = Obj.conObj.find('.pipelength');
            var pipenum = Obj.conObj.find('.pipenum');
            if (pathname.val() == "") {
                pathname.addClass('has-error');
                pathname.attr("placeholder", "不能为空！");
                this.popup.ShowTip("巡检线名称不能为空！");
                return;
            }

            $.ajax({
                headers: this.getHeaders(1),
                type: "POST",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.updatePlanPath,
                data: {
                    "point_id": this.path_id,
                    "point_name": pathname.val(),
                    "region_id": this.polygonid,
                    "geometry": this.jsongeometry,
                    "address": address.val(),
                    "notes": notes.val(),
                    "x": "0",
                    "y": "0",
                    "lat": "0",
                    "lng": "0",
                    "device_type_id": this.config.device_type_id.path,
                },
                success: this.updatePlanPathInfoCallback.bind(this),
                dataType: "json",
            });
        }.bind(this));
    }

    /**
     * 获取巡检线路列表(包括列表构建)
     */
    getPlanPath(pagenumber, pagesize) {
        this.path_plandetail_polylinelayer.clear();
        this.loadWait.Show("正在查询数据，请耐心等待...", this.domObj);
        this.companyid = (this.iszgs == true ? this.domObj.find(".company option:selected").val() : "");
        this.path_id = "";
        this.currentpage = pagenumber || this.config.pagenumber;
        this.currentpagesieze = parseInt(this.domObj.find(".dynamic_pagesize option:selected").val()) || pagesize || this.config.pagesize;
        $.ajax({
            headers: this.getHeaders(0),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getPlanPathList,
            data: {
                "pageindex": this.currentpage || this.config.pagenumber,
                "pagesize": this.currentpagesieze || this.config.pagesize,
                "device_type_id": this.config.device_type_id.path,
                "companyid": this.companyid
            },
            success: this.getPlanPathListCallback.bind(this),
            error: function (results) {
                this.loadWait.Hide();
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }
    getPlanPathListCallback(results) {
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

        this.domObj.find(".pagecontrol").text("总共" + results.result.total + "条，每页");
        this.domObj.find(".content").text("第" + that.currentpage + "页共" + that.totalpage + "页");
        if (this.totalpage == 0) {
            this.domObj.find(".pagecontrol").text("总共-条，每页");
            this.domObj.find(".content").text("第-页共-页");
        }

        var html_trs_data = "";
        $.each(results.result.rows, function (i, item) {
            html_trs_data += "<tr class=goto data-geometry='"
                + item.geometry + "' data-path_id='"
                + item.point_id + "' data-regionid='"
                + item.region_id + "' data-path_name='"
                + item.point_name + "' data-address='"
                + item.address + "' data-notes='"
                + item.notes + "'>"
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
        this.domObj.find(".addpath").empty().append(html_trs_data);

        //添加工单气泡
        this.getAllPlanPath();
    }

    /**
     * @function 获取巡检线路列表（不包括列表构建）
     */
    getAllPlanPath() {
        $.ajax({
            headers: this.getHeaders(0),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getPlanPathList,
            data: {
                "pageindex": 1,
                "pagesize": this.config.maxsize,
                "device_type_id": this.config.device_type_id.path,
                "companyid": this.companyid
            },
            success: function (results) {
                console.log(results);
                var that = this;
                if (results.code != 1) {
                    that.toast.Show(results.message);
                    return;
                }
                this.addPathGraphic(results);
            }.bind(this),
            dataType: "json",
        });
    }

    /**
     * 添加巡检线路在地图上
     */
    addPathGraphic(queryResult) {
        //清除图层
        this.planpathInfoGraphicLayer.clear();
        this.pathDatas = new Object();
        //添加当前页工单气泡
        for (var i = 0, length = queryResult.result.rows.length; i < length; i++) {
            var row = queryResult.result.rows[i];
            if (row.geometry == undefined || row.geometry == "") { continue; }
            var polyline = new Polyline(JSON.parse(row.geometry));
            var point = polyline.getExtent().getCenter();
            this.pathDatas[row.point_id] = row;

            var graphic = new Graphic(polyline, this.setSymbol(row.point_name)[3], { "path_id": row.point_id });
            this.planpathInfoGraphicLayer.add(graphic);

            var graphictextbg = new Graphic(point, this.setSymbol(row.point_name)[1].setOffset(0, -20), "");
            this.planpathInfoGraphicLayer.add(graphictextbg);
            //添加文字
            var peopleTextSymbol = new TextSymbol(row.point_name);
            peopleTextSymbol.setOffset(0, -25);
            var font = new Font();
            font.setSize("10pt");
            font.setWeight(Font.WEIGHT_BOLD);
            peopleTextSymbol.setFont(font);
            var graphicText = new Graphic(point, peopleTextSymbol, "");
            this.planpathInfoGraphicLayer.add(graphicText);
        }

        if (length > 0) {
            var extent = graphicsUtils.graphicsExtent(this.planpathInfoGraphicLayer.graphics);
            if (extent != null) {
                this.map.setExtent(extent);
            }
        }
    }

    /**
     * 获取巡检点信息
     */
    getAllPlanPoint() {
        this.companyid = (this.iszgs == true ? this.domObj.find(".company option:selected").val() : "");
        $.ajax({
            headers: this.getHeaders(0),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getPlanPointList,
            data: {
                "pageindex": 1,
                "pagesize": this.config.maxsize,
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
        //添加工单气泡
        this.addPointGraphic(results);
    }

    /**
     * 添加巡检点图形
     */
    addPointGraphic(queryResult) {
        //清除图层
        this.path_planpoint.clear();

        //添加当前页工单气泡
        for (var i = 0, length = queryResult.result.rows.length; i < length; i++) {
            var row = queryResult.result.rows[i];
            if (row.geometry == undefined || row.geometry == "") { continue; }
            var point = new Point(JSON.parse(row.geometry));
            var graphic = new Graphic(point, this.setSymbol(row.point_name)[0], "");
            graphic.attr("id", "graphic" + i);
            this.path_planpoint.add(graphic);

            var graphictextbg = new Graphic(point, this.setSymbol(row.point_name)[1].setOffset(0, -20), "");
            this.path_planpoint.add(graphictextbg);
            //添加文字
            var peopleTextSymbol = new TextSymbol(row.point_name);
            peopleTextSymbol.setOffset(0, -25);
            var font = new Font();
            font.setSize("10pt");
            font.setWeight(Font.WEIGHT_BOLD);
            peopleTextSymbol.setFont(font);
            var graphicText = new Graphic(point, peopleTextSymbol, "");
            this.path_planpoint.add(graphicText);
        }
    }

    /**
     * 获取所有片区信息
     */
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
        this.path_id = "";
        this.path_plandetail_polylinelayer.clear();
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        }
        this.addPolygonGraphic(results);
    }

    /**
     * 添加巡检片区图形
     */
    addPolygonGraphic(queryResult) {
        //清除图层
        this.path_planregion.clear();

        //添加当前页工单气泡
        for (var i = 0, length = queryResult.result.rows.length; i < length; i++) {
            var row = queryResult.result.rows[i];

            if (row.geometry == undefined || row.geometry == "") { continue; }
            var polygon = new Polygon(JSON.parse(row.geometry));
            var graphic = new Graphic(polygon, this.setSymbol(row.regionname)[2], "");

            graphic.attr("id", "graphic" + i);
            this.path_planregion.add(graphic);
            //添加背景
            var point = polygon.getExtent().getCenter();
            var graphictextbg = new Graphic(point, this.setSymbol(row.regionname)[1].setOffset(0, -20), "");
            this.path_planregion.add(graphictextbg);
            //添加文字
            var peopleTextSymbol = new TextSymbol(row.regionname);
            peopleTextSymbol.setOffset(0, -25);
            var font = new Font();
            font.setSize("10pt");
            font.setWeight(Font.WEIGHT_BOLD);
            peopleTextSymbol.setFont(font);
            var graphicText = new Graphic(point, peopleTextSymbol, "");
            this.path_planregion.add(graphicText);

        }

    }

    /**
     * 新增巡检线路时检查是否线在片区里面
     */
    getAllPlanRegion_contain() {
        $.ajax({
            headers: this.getHeaders(1),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getPlanRegionList,
            data: {
                "pageindex": 1,
                "pagesize": this.config.maxsize,
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
            var polyline = new Polyline(JSON.parse(this.jsongeometry));
            polyline.spatialReference;
            var count = 0;
            for (var j = 0, len = polyline.paths[0].length; j < len; j++) {
                var point = new Point(polyline.paths[0][j][0], polyline.paths[0][j][1], polyline.spatialReference);
                if (polygon.contains(point)) {
                    count += 1;
                } else {
                    count = 0;
                }
                if (count == polyline.paths[0].length) {
                    this.polygon_add_id = row.regionid;

                    that.polygon_id.push({ id: row.regionid, name: row.regionname });
                }

            }
        }

        // if (this.polygon_add_id != "") {//巡检线在片区中，弹出输入框 
        //     this.addPath();
        // } else {
        //     this.toast.Show("该巡检线路无对应巡检片区，暂不插入数据！");
        //     this.templanpath.clear();
        // }

        if (this.polygon_id.length != 0) {//巡检线在片区中，弹出输入框 
            this.addPath();
        } else {
            this.toast.Show("该巡检线路无对应巡检片区，暂不插入数据！");
            this.templanpath.clear();
        }
    }

    addPlanPathInfoCallback(results) {
        var that = this;
        if (results.code != 1) {
            this.popup.ShowTip(results.message);
            return;
        } else {
            this.popup.Close();
            that.toast.Show("添加巡检线路成功！");
            //重新查询
            this.jsongeometry = "";
            this.polygonid = "";
            this.path_id = "";
            this.path_plandetail_polylinelayer.clear();
            this.getPlanPath(this.config.pagenumber, this.config.pagesize);
            this.domObj.find(".content").text("第" + (this.config.pagenumber) + "页共" + this.totalpage + "页");
        }
        if (this.templanpath) {
            this.templanpath.clear();
        }
    }

    updatePlanPathInfoCallback(results) {
        var that = this;
        if (results.code != 1) {
            this.popup.ShowTip(results.message);
            return;
        } else {
            this.popup.Close();
            that.toast.Show("修改巡检线路成功！");
            //重新查询
            this.jsongeometry = "";
            this.polygonid = "";
            this.path_id = "";
            this.path_plandetail_polylinelayer.clear();
            this.getPlanPath(this.config.pagenumber, this.config.pagesize);
            this.domObj.find(".content").text("第" + (this.config.pagenumber) + "页共" + this.totalpage + "页");
        }
        if (this.templanpath) {
            this.templanpath.clear();
        }
    }


    deletePlanPathCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        } else {
            that.toast.Show("删除巡检线路成功！");
            this.path_id = "";
            this.path_plandetail_polylinelayer.clear();
            this.getPlanPath(this.config.pagenumber, this.config.pagesize);
            this.domObj.find(".content").text("第" + (this.config.pagenumber) + "页共" + this.totalpage + "页");
        }
    }

    //设置点的样式
    setSymbol(txt?) {
        var symbol = [];
        var fillSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASHDOT, new Color([255, 0, 0]), 2), new Color([0, 0, 0, 0.1]));
        var lineSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([255, 0, 0]), 3);
        var peopleSymbol = new PictureMarkerSymbol(this.config.MarkPictureSymbol, 48, 48).setOffset(0, 15);
        //根据字长度设置背景图片宽度
        var peopletextSymbol = new PictureMarkerSymbol(this.config.TextbgSymbol, txt == null ? 0 : txt.length * 90 / 6, 18);
        symbol.push(peopleSymbol);
        symbol.push(peopletextSymbol);
        symbol.push(fillSymbol);
        symbol.push(lineSymbol);
        return symbol;
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
                    width: 4
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

    isUpdate() {
        $.ajax({
            headers: this.getHeaders(1),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.isUpdate + this.path_id,
            data: {
                "id": this.path_id
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
                    this.editPath();
                    break;
                case "delete":
                    this.deletePath();
                    break;
                case "add":
                    this.addPath();
                    break;
                case "edit_place":
                    if (this.editingEnabled == false) {
                        for (var i = 0; i < this.planpathInfoGraphicLayer.graphics.length; i++) {
                            var gx = this.planpathInfoGraphicLayer.graphics[i];
                            var path_id = gx.attributes["path_id"];
                            if (this.path_id == path_id && gx.geometry.type == 'polyline') {
                                this.editingEnabled = true;
                                this.editTool.activate(Edit.EDIT_VERTICES, gx);
                                break;
                            }
                        }
                    }
                    break;
            }
        } else {
            this.toast.Show("该巡检线路所在片区已安排在巡检计划中，暂时不能删除或更新！");
            this.templanpath.clear();
            return;
        }
    }

    /**
     * @function 获取插值距离（与巡检到位距离保持一致）
     */
    getConfigDistance() {
        $.ajax({
            headers: this.getHeaders(1),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getSetting,
            success: function (results) {

                if (results.result != null && results.result.length > 0) {
                    if (results.result[0].min_distance_in_place != undefined) {
                        this.config.distance = results.result[0].min_distance_in_place * 2;
                    }

                }
            }.bind(this),
            dataType: "json"
        });
    }

    destroy() {
        if (this.planpathInfoGraphicLayer) {
            this.map.removeLayer(this.planpathInfoGraphicLayer);
            this.planpathInfoGraphicLayer.clear();
        }
        if (this.templanpath) {
            this.map.removeLayer(this.templanpath);
            this.templanpath.clear();
        }

        if (this.path_planpoint) {
            this.map.removeLayer(this.path_planpoint);
            this.path_planpoint.clear();
        }

        if (this.path_planregion) {
            this.map.removeLayer(this.path_planregion);
            this.path_planregion.clear();
        }

        if (this.path_plandetail_polylinelayer) {
            this.map.removeLayer(this.path_plandetail_polylinelayer);
            this.path_plandetail_polylinelayer.clear();
        }
        if (this.drawToolbar != null) {
            this.map.setMapCursor('default');
            this.drawToolbar.deactivate();
        }

        if (this.mapViewClickEvent) {
            this.mapViewClickEvent.remove();
        }

        if (this.test_layer) {
            this.map.removeLayer(this.test_layer);
        }
        if (this.editToolEvent) {
            this.editToolEvent.remove();
        }
        if (this.editTool) {
            this.editTool.deactivate();
        }

        this.domObj.remove();
        this.afterDestroy();
    }

    /**-------------------------插点算法(兼顾点与点之间的距离，以及点与点之间的个数)--------------------- */
    line_lens = [];
    pointDraw = [];//拐点
    insertPts = [];//插入的点
    mapViewClickEvent = null;
    insertPoints() {
        var path = [];
        var points = [];
        var d = this.config.distance;
        var cnum = this.line_lens.length;
        for (var i = 0; i < cnum; i++) {
            var len = this.line_lens[i];
            path.push([this.pointDraw[i].x, this.pointDraw[i].y]);
            if (len > d) {//大于规定距离
                var count = Math.floor(len / d) - 1;
                if (count > 0) {
                    if (count > this.config.insert_num) {
                        count = this.config.insert_num;
                    }
                    var pt1 = this.pointDraw[i], pt2 = this.pointDraw[i + 1];
                    var k = (pt2.y - pt1.y) / (pt2.x - pt1.x);
                    var mlen = Math.sqrt((pt2.y - pt1.y) * (pt2.y - pt1.y) + (pt2.x - pt1.x) * (pt2.x - pt1.x));
                    var md = mlen / (count + 1);
                    var sqk = Math.sqrt(1 + k * k);
                    var dd = md;
                    for (var j = 0; j < count; j++) {

                        var x = (dd / sqk) + pt1.x;
                        var y = (k * dd / sqk) + pt1.y;
                        if ((x > pt1.x && x > pt2.x) || (x < pt1.x && x < pt2.x)) {
                            x = pt1.x - (dd / sqk);
                        }

                        if ((y > pt1.y && y > pt2.y) || (y < pt1.y && y < pt2.y)) {
                            y = pt1.y - (k * dd / sqk);
                        }

                        path.push([x, y]);
                        this.insertPts.push([x, y]);//临时存储插入点
                        dd = dd + md;
                    }
                }
            }
        }
        path.push([this.pointDraw[cnum].x, this.pointDraw[cnum].y]);

        var obj = {
            paths: [path],
            spatialReference: this.AppX.runtimeConfig.map.spatialReference
        };
        return obj;
    }

    /**
     * @function 计算线长度
     */
    geometryServerCall(polyline: Polyline) {
        var geometryServer;
        if (this.AppX.appConfig.gisResource.geometry.config.length > 0) {
            geometryServer = new GeometryService(this.AppX.appConfig.gisResource.geometry.config[0].url);
        } else {
            this.toast.Show('获取geometryService服务出错！');
        }

        var lengthsParameters = new LengthsParameters();
        lengthsParameters.calculationType = "planar";
        lengthsParameters.geodesic = true;
        lengthsParameters.polylines = [polyline];
        lengthsParameters.lengthUnit = this.config.lengthUnit[0].number;

        geometryServer.lengths(lengthsParameters).then(function (lengthsPar) {
            this.line_lens.push(lengthsPar.lengths[0]);
        }.bind(this));

    }

    /**
     * @function 地图click事件
     */
    OnMapClick() {
        this.line_lens = [];
        this.pointDraw = [];
        this.insertPts = [];
        if (this.mapViewClickEvent) {
            this.mapViewClickEvent.remove();
        }
        this.mapViewClickEvent = null;
        this.mapViewClickEvent = this.AppX.runtimeConfig.map.on("click", function (event) {
            this.pointDraw.push(event.mapPoint);
            if (this.pointDraw.length > 1) {//两个点
                var path = [];
                for (var i = this.pointDraw.length - 2, length = this.pointDraw.length; i < length; i++) {
                    var allPoint = [];
                    allPoint.push(this.pointDraw[i].x, this.pointDraw[i].y);
                    path.push(allPoint);
                }

                var polyline = new Polyline({
                    paths: [path],
                    spatialReference: this.AppX.runtimeConfig.map.spatialReference
                });
                this.geometryServerCall(polyline);
            }
        }.bind(this));
    }

    test_layer: GraphicsLayer;
    addShowPts() {
        this.test_layer.clear();
        var symbol = new SimpleMarkerSymbol(
            {
                color: new Color("blue"),
                style: "diamond",       //点样式solid\cross\square|diamond|circle|x
                outline: {
                    color: new Color("blue"),
                    width: 0.2
                }
            }
        );
        symbol.setSize(6);
        var symbol2 = new SimpleMarkerSymbol(
            {
                color: new Color("green"),
                style: "circle",       //点样式solid\cross\square|diamond|circle|x
                outline: {
                    color: new Color("green"),
                    width: 0.2
                }
            }
        );
        symbol2.setSize(6);
        for (var i = 0; i < this.pointDraw.length; i++) {
            var jsgeo = this.pointDraw[i];
            var geometryobj = { "x": jsgeo.x, "y": jsgeo.y, "spatialReference": { "wkid": this.map.spatialReference.wkid } };
            var point = new Point(geometryobj);
            var graphic = new Graphic(point, symbol, "");
            this.test_layer.add(graphic);
        }

        for (var i = 0; i < this.insertPts.length; i++) {
            var jsgeo2 = this.insertPts[i];
            var geometryobj2 = { "x": jsgeo2[0], "y": jsgeo2[1], "spatialReference": { "wkid": this.map.spatialReference.wkid } }
            var point2 = new Point(geometryobj2);
            var graphic2 = new Graphic(point2, symbol2, "");
            this.test_layer.add(graphic2);
        }

    }

    getLengths() {
        var totallen = 0;
        for (var i = 0; i < this.line_lens.length; i++) {
            totallen += this.line_lens[i];
        }
        console.log(totallen);
        return totallen.toFixed(2);
    }
}