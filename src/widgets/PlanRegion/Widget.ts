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
import Polygon = require('esri/geometry/Polygon');
import SimpleMarkerSymbol = require('esri/symbols/SimpleMarkerSymbol');
import Color = require("esri/Color");
import SimpleLineSymbol = require('esri/symbols/SimpleLineSymbol');
import SimpleFillSymbol = require('esri/symbols/SimpleFillSymbol');
import BlankPanel = require('widgets/BlankPanel/Widget');
import Polyline = require('esri/geometry/Polyline');

import ClusterLayer = require('extras/ClusterLayer');
import arrayUtils = require('dojo/_base/array');
import ClassBreaksRenderer = require('esri/renderers/ClassBreaksRenderer');
import PopupTemplate = require('esri/dijit/PopupTemplate');

import Query = require('esri/tasks/query');
import QueryTask = require('esri/tasks/QueryTask');
import FeatureLayer = require('esri/layers/FeatureLayer');
import InfoTemplate = require('esri/InfoTemplate');
import SimpleRenderer = require('esri/renderers/SimpleRenderer');
import geometryEngine = require("esri/geometry/geometryEngine");
import Geometry = require("esri/geometry/Geometry");
import graphicsUtils = require("esri/graphicsUtils");
import Edit = require("esri/toolbars/edit");

export = PlanRegion;

class PlanRegion extends BaseWidget {
    baseClass = "widget-planregion";
    map = null;
    toast = null;
    popup = null;
    loadWait = null;

    editTool = null;
    editingEnabled = false;

    editToolEvent = null;

    totalpage = 1;
    currentpage = 1;
    currentpagesieze = 1;

    planregionInfoGraphicLayer: GraphicsLayer;
    templanregion: GraphicsLayer;
    planpointInfoGraphicLayer: GraphicsLayer;
    planpathInfoGraphicLayer: GraphicsLayer;
    planwarnInfoGraphicLayer: GraphicsLayer;
    planmanageregionlayer: GraphicsLayer;

    planregion_pointlayer: GraphicsLayer;

    companyid = "";//公司id
    companydatas = null;
    iszgs = false;//是否是总公司账号
    ispartment = false;//部门账号

    regionid = "";
    regionname = "";
    address = "";
    notes = "";
    regioncontain_pointnum = 0;
    regioncontain_pathnum = 0;

    pipe_length = 0;
    pipe_num = 0;
    tempregionjson = "";//临时绘制，未存入数据库中
    calculateStatus = 2;//统计管线长度与数量，1数量统计，2长度统计，3先数量统计后长度统计
    objpup = null;
    status = "";
    drawToolbar = null;

    currentRegionGraphics = [];//已划分片区

    curstate = "";


    polygonDatas = null;

    /**
     * @function 初始化
     */
    startup() {
        this.configure();
        this.initHtml();
        this.initEvent();
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
            this.domObj.find(".regionlist-title").empty().append(this.template.split('$$')[3]);
            this.domObj.find(".company_serch").show();
            this.getCompanyList();
            this.domObj.find('.company').on("change", function (e) {
                var companyid = this.domObj.find('.company option:selected').val();
                this.setButtonInUse(companyid);
                this.reloadDatas();
                this.getPlanRegion(this.config.pagenumber, this.config.pagesize);
            }.bind(this));
        } else {
            this.domObj.find(".regionlist-title").empty().append(this.template.split('$$')[2]);
            this.domObj.find(".company_serch").hide();
            this.getPlanRegion(this.config.pagenumber, this.config.pagesize);
        }
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
                this.getPlanRegion(this.config.pagenumber, this.config.pagesize);
            }.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取公司列表数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    /**
     * @function 是否可使用
     * @param companyid 所属公司id，当公司id和用户的公司id一致时，可进行编辑更新操作
     */
    setButtonInUse(companyid?: string) {
        if (this.iszgs) {//总公司账号
            if (companyid == AppX.appConfig.departmentid) {//可使用
                this.domObj.find('.btn_addplanregion').prop('disabled', false);
                this.domObj.find('.btn_editplanregion').prop('disabled', false);
                this.domObj.find('.btn_deleteplanregion').prop('disabled', false);
            } else {//不可使用
                this.domObj.find('.btn_addplanregion').prop('disabled', true);
                this.domObj.find('.btn_editplanregion').prop('disabled', true);
                this.domObj.find('.btn_deleteplanregion').prop('disabled', true);
            }
        }
    }

    /**
     * @function 重新加载图层数据
     */
    reloadDatas() {
        this.domObj.find('.point').prop('checked', false);
        this.domObj.find('.path').prop('checked', false);
        this.domObj.find('.warnpoint').prop('checked', false);
        this.planpointInfoGraphicLayer.clear();
        this.planpathInfoGraphicLayer.clear();
        this.planwarnInfoGraphicLayer.clear();
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
     * @function 页面初始化
     */
    initHtml() {
        var html = _.template(this.template.split('$$')[0] + "</div>")();
        this.setHtml(html);
        this.ready();
        this.initLoginUser();
    }

    /**
     * @function 配置初始化
     */
    configure() {
        this.toast = this.AppX.runtimeConfig.toast;
        this.popup = this.AppX.runtimeConfig.popup;
        this.loadWait = this.AppX.runtimeConfig.loadWait;
        this.map = this.AppX.runtimeConfig.map;
        this.editTool = new Edit(this.map);

        //辖区范围图层
        if (!this.map.getLayer("planmanageregionlayer")) {
            this.planmanageregionlayer = new GraphicsLayer();
            this.planmanageregionlayer.id = "planmanageregionlayer";
            this.map.addLayer(this.planmanageregionlayer);
        }

        //片区图层
        if (!this.map.getLayer("region_planregion")) {
            this.planregionInfoGraphicLayer = new GraphicsLayer();
            this.planregionInfoGraphicLayer.id = "region_planregion";
            this.map.addLayer(this.planregionInfoGraphicLayer);
        }

        //路线图层
        if (!this.map.getLayer("region_planpath")) {
            this.planpathInfoGraphicLayer = new GraphicsLayer();
            this.planpathInfoGraphicLayer.id = "region_planpath";
            this.map.addLayer(this.planpathInfoGraphicLayer);
        }

        //点图层
        if (!this.map.getLayer("region_planpoint")) {
            this.planpointInfoGraphicLayer = new GraphicsLayer();
            this.planpointInfoGraphicLayer.id = "region_planpoint";
            this.map.addLayer(this.planpointInfoGraphicLayer);
        }

        //隐患点图层
        if (!this.map.getLayer("region_planwarnpoint")) {
            this.planwarnInfoGraphicLayer = new GraphicsLayer();
            this.planwarnInfoGraphicLayer.id = "region_planwarnpoint";
            this.map.addLayer(this.planwarnInfoGraphicLayer);
        }

        //临时图层
        if (!this.map.getLayer("region_templanregion")) {
            this.templanregion = new GraphicsLayer();
            this.templanregion.id = "region_templanregion";
            this.map.addLayer(this.templanregion);
        }
        //高亮图层
        if (this.map.getLayer("planregion_pointlayer")) {
            return;
        } else {
            var planregion_pointlayer = new GraphicsLayer();
            planregion_pointlayer.id = "pointlayer";
            this.planregion_pointlayer = planregion_pointlayer;
            this.map.addLayer(planregion_pointlayer);
        }
    }

    /**
     * 初始化片区展示页面
     */
    initEvent() {
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
        var that = this;
        //this.domObj.find('.manageregion').prop("checked",true);//初始化加载管辖片区        
        //this.getManageRegion();

        //查询
        this.domObj.find('.btn_serach').on("click", function () {
            this.companyid = this.domObj.find(".company option:selected").val();
            this.config.pagesize = parseInt(this.domObj.find(".dynamic_pagesize option:selected").val());
            this.getPlanRegion(this.config.pagenumber, this.config.pagesize);
        }.bind(this));

        //打开图层辖区范围
        this.domObj.find('.manageregion').on("change", function () {
            if (this.checked) {
                that.getManageRegion();
            } else {
                that.planmanageregionlayer.clear();
            }
        });

        //打开图层巡检点
        this.domObj.find('.point').on("change", function () {
            if (this.checked) {
                that.getAllPlanPoint();
            } else {
                that.planpointInfoGraphicLayer.clear();
            }
        });

        //打开图层巡检线路
        this.domObj.find('.path').on("change", function () {
            if (this.checked) {
                that.getAllPlanPath();
            } else {
                that.planpathInfoGraphicLayer.clear();
            }
        });

        //打开图层隐患点
        this.domObj.find('.warnpoint').on("change", function () {
            if (this.checked) {
                that.getAllPlanWarn();
            } else {
                that.planwarnInfoGraphicLayer.clear();
            }
        });

        //添加片区
        this.domObj.find('.btn_addplanregion').on("click", function () {
            if (this.drawToolbar != null) {
                this.map.setMapCursor('default');
                this.drawToolbar.deactivate();
                this.drawToolbar = null;
            }
            this.map.setMapCursor('crosshair');
            this.templanregion.clear();
            this.drawToolbar = new Draw(this.AppX.runtimeConfig.map);
            this.drawToolbar.activate(Draw.POLYGON);
            this.drawToolbar.on("draw-end", function (evt) {
                this.map.setMapCursor('default');
                var graphic = new Graphic(evt.geometry, new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
                    new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASHDOT,
                        new Color([255, 0, 0]), 2), new Color([0, 0, 0, 0.3])
                ));
                this.tempregionjson = JSON.stringify(evt.geometry.toJson());
                this.templanregion.add(graphic);

                var gxs = this.currentRegionGraphics;
                for (var i = 0; i < gxs.length; i++) {
                    var gem = gxs[i];
                    if (this.isContain(gem, this.tempregionjson, true)) {
                        this.templanregion.clear();
                        this.map.setMapCursor('crosshair');
                        this.toast.Show("绘制片区范围在已划定片区内部，请重新划定！");
                        return;
                    }
                }

                var rgxs = this.planmanageregionlayer.graphics;

                if (rgxs != null && rgxs.length > 0) {//是否在管辖片区内
                    var isin = false;
                    for (var i = 0; i < rgxs.length; i++) {
                        var tgem = rgxs[i];
                        if (this.isContain(tgem.geometry, this.tempregionjson, true)) {
                            isin = true;
                            break;
                        }
                    }
                    if (isin == false) {
                        this.templanregion.clear();
                        this.map.setMapCursor('crosshair');
                        this.toast.Show("绘制片区范围不在管辖片区内，请重新划定！");
                        return;
                    }
                }


                this.drawToolbar.deactivate();
                this.calculateStatus = 3;
                // this.geometryServerCut();//裁剪
                this.loadWait.Show("正在计算统计长度与数量，请等待...", this.domObj);
                this.calculatePipe(3);
            }.bind(this));
        }.bind(this));

        //片区编辑
        this.domObj.find('.btn_editplanregion').on("click", function () {
            if (this.regionid == "") {
                this.toast.Show("请先选择一个片区！");
                return;
            }
            this.status = "update";
            this.isUpdate();
        }.bind(this));

        //删除片区
        this.domObj.find('.btn_deleteplanregion').on("click", function () {
            if (this.regionid == "") {
                this.toast.Show("请先选择一个片区！");
                return;
            }
            if (this.regioncontain_pointnum > 0) {
                this.toast.Show("请先删除该片区内的巡检点");
                return;
            }
            this.status = "delete";
            this.isUpdate();
        }.bind(this));

        // 选中行高亮
        this.domObj.off("click").on('click', 'tbody tr', (e) => {

            var regionid = "";
            var pathid = "";
            if ($(e.currentTarget).data("regionid") != null) {
                regionid = $(e.currentTarget).data("regionid");
            }
            if (this.editingEnabled && regionid != "" && regionid != this.regionid) {
                this.editingEnabled = false;
                this.editTool.deactivate();
                return;

                // // this.drawToolbar.deactivate();
                // this.calculateStatus = 4;
                // // this.geometryServerCut();//裁剪
                // this.loadWait.Show("正在计算统计长度与数量，请等待...", this.domObj);
                // this.calculatePipe(3);
            }

            if ($(e.currentTarget).data("regionid") == null) {
                return;
            } else {

                this.regionid = $(e.currentTarget).data("regionid");
                this.regionname = $(e.currentTarget).data("regionname");
                this.address = $(e.currentTarget).data("address");
                this.notes = $(e.currentTarget).data("notes");
                this.tempregionjson = JSON.stringify($(e.currentTarget).data("geometry"));
                this.regioncontain_pathnum = $(e.currentTarget).data("pathnum");
                this.regioncontain_pointnum = $(e.currentTarget).data("pointnum");
                this.pipe_num = $(e.currentTarget).data("pipenum");
                this.pipe_length = $(e.currentTarget).data("pipelength");
                this.setButtonInUse($(e.currentTarget).data("companyid"));
            }
            this.domObj.find('tr.active').removeClass('active');
            $(e.currentTarget).addClass('active');

            //定位
            var mapPolygon = new Polygon($(e.currentTarget).data("geometry"));
            this.map.setExtent(mapPolygon.getExtent());

            // this.planregionInfoGraphicLayer.graphics;
            // for (var i = 0; i < this.planregionInfoGraphicLayer.graphics.length; i++) {
            //     var gx = this.planregionInfoGraphicLayer.graphics[i];
            //     if (gx.geometry.type == 'polygon') {
            //         if (JSON.stringify((<any>gx.geometry).rings) == JSON.stringify(mapPolygon.rings)) {
            //         }
            //     }
            // }


            //高亮显示

            this.planregion_pointlayer.clear();
            this.planregion_pointlayer.add(new Graphic(mapPolygon.getExtent().getCenter(), this.setGraphSymbol("point")));


        });

        //上一页
        this.domObj.find(".pre").off("click").on("click", function () {
            if (that.currentpage - 1 > 0) {
                that.currentpage = that.currentpage - 1;
                that.getPlanRegion(that.currentpage, that.currentpagesieze);
                that.domObj.find(".content").text("第" + that.currentpage + "页共" + that.totalpage + "页");
            }

        });

        //下一页
        this.domObj.find(".next").off("click").on("click", function () {
            if (that.currentpage + 1 <= that.totalpage) {
                that.currentpage = that.currentpage + 1;
                that.getPlanRegion(that.currentpage, that.currentpagesieze);
                that.domObj.find(".content").text("第" + that.currentpage + "页共" + that.totalpage + "页");

            }
        });

        //返回
        this.domObj.find(".pageturning").off("click").on("click", function () {

            if (parseInt(that.domObj.find(".currpage").val()) <= that.totalpage && that.currentpage >= 1) {
                that.currentpage = parseInt(that.domObj.find(".currpage").val());
                that.getPlanRegion(that.currentpage, that.currentpagesieze);
                that.domObj.find(".content").text("第" + that.currentpage + "页共" + that.totalpage + "页");
                //清除infowindow
            } else {
                that.domObj.find(".currpage").val("");
            }
        }.bind(this));

        //默认显示条数变化
        this.domObj.find(".dynamic_pagesize").off("change").on("change", function () {
            this.currentpagesieze = parseInt(this.domObj.find(".dynamic_pagesize option:selected").val());
            this.getPlanRegion(this.config.pagenumber, this.currentpagesieze);
        }.bind(this));

        //解决ESC取消键
        $(document).keydown(function (event) {
            if (event.keyCode == 27) {//esc
                // this.line_lens = [];
                // this.pointDraw = [];//拐点
                // this.insertPts = [];//插入的点
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
            if (this.regionid == "") {
                this.toast.Show("请先选择一个片区！");
                return;
            }
            this.status = "edit_place";
            this.domObj.find(".btn_edit_location").blur();
            this.isUpdate();

        }.bind(this));


        //释放后图形修改完成
        this.editToolEvent = this.editTool.on("deactivate", function (evt) {
            if (evt.info.isModified) {//修改了
                var regionid = evt.graphic.attributes["regionid"];
                var data = this.polygonDatas[regionid];
                // if (!geometryEngine.contains(new Polygon(JSON.parse(data.region_geometry)), evt.graphic.geometry)) {
                //     this.toast.Show("巡检线修改超出所属片区！");
                //     evt.graphic.geometry = new Polyline(JSON.parse(data.geometry));
                //     this.planpathInfoGraphicLayer.redraw();
                // } else {

                // }

                this.popup.setSize(300, 150);
                var Obj = this.popup.ShowMessage("提示", "是否保存巡检片区图形修改？");
                Obj.domObj.find('.btn-close').off("click").on("click", function () {
                    evt.graphic.geometry = new Polygon(JSON.parse(data.geometry));
                    this.planregionInfoGraphicLayer.redraw();
                    this.popup.Close();
                }.bind(this));

                Obj.domObj.find('.btn-hide').off("click").on("click", function () {
                    evt.graphic.geometry = new Polygon(JSON.parse(data.geometry));
                    this.planregionInfoGraphicLayer.redraw();
                    this.popup.Close();
                }.bind(this));

                Obj.submitObj.off("click").on("click", function () {
                    this.popup.Close();
                    // this.plandetail_polygonlayer.clear();
                    var gstr = {
                        rings: evt.graphic.geometry.rings,
                        spatialReference: evt.graphic.geometry.spatialReference
                    };
                    this.jsongeometry = JSON.stringify(gstr);

                    this.tempregionjson = JSON.stringify(gstr);

                    this.editingEnabled = false;
                    this.editTool.deactivate();

                    // this.curstate = "update";
                    this.calculateStatus = 4;
                    // this.geometryServerCut();//裁剪
                    this.loadWait.Show("正在重新计算统计长度与数量，请等待...", this.domObj);
                    this.calculatePipe(3);


                    // $.ajax({
                    //     headers: this.getHeaders(1),
                    //     type: "POST",
                    //     url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.updatePlanRegion,
                    //     data: {
                    //         // "point_id": data.point_id,
                    //         // "point_name": data.point_name,
                    //         // "region_id": data.region_id,
                    //         // "geometry": this.jsongeometry,
                    //         // "address": data.address,
                    //         // "notes": data.notes,
                    //         // "x": "0",
                    //         // "y": "0",
                    //         // "lat": "0",
                    //         // "lng": "0",
                    //         // "device_type_id": this.config.device_type_id.path,
                    //         // "pipe_length": data.pipe_length

                    //         // "regionid": this.regionid,
                    //         // "regionname": regionname.val(),
                    //         // "geometry": this.tempregionjson,
                    //         // "address": address.val(),
                    //         // "notes": notes.val(),
                    //         // "pipe_length": pipelength.val(),
                    //         // "pipe_num": pipenum.val()
                    //     },
                    //     success: function (results) {
                    //         if (results.code != 1) {
                    //             this.toast.Show(results.message);
                    //             return;
                    //         }
                    //         this.currentTarget.data("geometry", this.jsongeometry);
                    //         this.currentTarget.removeClass('active');
                    //         this.path_id = "";
                    //         data.geometry = this.jsongeometry;
                    //         this.editingEnabled = false;
                    //         this.editTool.deactivate();


                    //         this.calculateStatus = 3;
                    //         // this.geometryServerCut();//裁剪
                    //         this.loadWait.Show("正在计算统计长度与数量，请等待...", this.domObj);
                    //         this.calculatePipe(3);

                    //         this.toast.Show("修改巡检线图形成功！");
                    //     }.bind(this),
                    //     dataType: "json",
                    // });
                }.bind(this));
            }
        }.bind(this));
    }

    /**
     * @function 获取管辖区
     */
    getManageRegion() {
        this.planmanageregionlayer.clear();
        var where = "1<>1";
        if (AppX.appConfig.range.indexOf(';') > -1) {
            var codes = AppX.appConfig.range.replace(/;/g, "','");
            if (codes != "")
                where = this.config.managelayerfieldname + " in ('" + codes + "')";
        } else {
            where = '1=1';
        }
        var param = { "where": where, "returnGeometry": true, "outFields": "*", "returnIdsOnly": false, "f": "json" };
        $.ajax({
            type: "POST",
            url: this.AppX.appConfig.gisResource.region_map.config[this.config.managelayerindex].url + "/" + this.config.managelayerindex + "/query",
            cache: false,
            data: param,
            dataType: "json",
            success: function (response) {
                if (response.error !== undefined) {
                    this.AppX.runtimeConfig.toast.Show("查询失败，请联系管理员");
                }
                response.features.forEach((p, itemindx) => {
                    var geometry = {
                        rings: p.geometry.rings,
                        spatialReference: this.map.spatialReference
                    }
                    var polygon = new Polygon(geometry);
                    var graphic = new Graphic(polygon, this.setSymbol()[4], "");
                    this.planmanageregionlayer.add(graphic);
                });

            }.bind(this)
        });
    }

    /**
     * @function 获取片区信息列表（包括列表信息构建）
     */
    getPlanRegion(pagenumber, pagesize) {
        this.loadWait.Show("正在查询数据，请耐心等待...", this.domObj);
        this.regionid = "";
        this.currentpage = pagenumber || this.config.pagenumber;
        this.currentpagesieze = parseInt(this.domObj.find(".dynamic_pagesize option:selected").val()) || pagesize || this.config.pagesize;
        this.companyid = (this.iszgs == true ? this.domObj.find(".company option:selected").val() : "");
        $.ajax({
            headers: this.getHeaders(0),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getPlanRegionList,
            data: {
                "pageindex": this.currentpage || this.config.pagenumber,
                "pagesize": this.currentpagesieze || this.config.pagesize,
                "companyid": this.companyid
            },
            success: this.getPlanRegionListCallback.bind(this),
            error: function (results) {
                this.loadWait.Hide();
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }
    getPlanRegionListCallback(results) {
        this.loadWait.Hide();
        if (results.code != 1) {
            this.toast.Show(results.message);
            return;
        }

        if (results.result.total % this.currentpagesieze == 0) {
            this.totalpage = Math.floor(parseInt(results.result.total) / this.currentpagesieze);
        } else {
            this.totalpage = Math.floor(parseInt(results.result.total) / this.currentpagesieze) + 1;
        }
        this.domObj.find(".pagecontrol").text("总共" + results.result.total + "条，每页");
        this.domObj.find(".content").text("第" + this.currentpage + "页共" + this.totalpage + "页");
        if (this.totalpage == 0) {
            this.domObj.find(".pagecontrol").text("总共-条，每页");
            this.domObj.find(".content").text("第-页共-页");
        }
        var html_trs_data = "";
        $.each(results.result.rows, function (i, item) {
            html_trs_data += "<tr class=goto data-geometry='" + item.geometry
                + "' data-regionid='" + item.regionid
                + "' data-regionname='" + item.regionname
                // + "' data-address='" + item.address 
                // + "' data-notes='" + item.notes 
                + "' data-pointnum='" + item.pointnum
                + "' data-pathnum='" + item.pathnum
                + "' data-pipenum='" + item.pipe_num
                + "' data-pipelength='" + item.pipe_length
                + "' data-companyid='" + (this.iszgs == true ? item.companyid : "")
                + "'>"
                + (this.iszgs == true ? "<td title='" + this.companydatas[item.companyid] + "'>" + this.companydatas[item.companyid] + "</td>" : "")
                + "<td title='" + item.regionname + "'>"
                + item.regionname + "</td><td title='" + item.address + "'>"
                // + item.address + "</td><td title='"+item.notes+"'>" 
                // + item.notes + "</td><td title='"+item.pipe_length+"'>" 
                + item.pipe_length + "</td><td title='" + item.pipe_num + "'>"
                + item.pipe_num + "</td><td title='" + item.pointnum + "'>"
                + item.pointnum + "</td><td title='" + item.pathnum + "'>"
                + item.pathnum + "</td><td title='" + item.troublenum + "'>"
                + item.troublenum + "</td><td title='" + item.createuser + "'>"
                + item.createuser + "</td><td title='" + (item.createdate != null ? item.createdate : "") + "'>"
                + (item.createdate != null ? item.createdate : "")
                + "</td></tr>";
        }.bind(this));
        this.domObj.find(".addregion").empty().append(html_trs_data);

        //添加工单气泡         
        this.getAllPlanRegion();
    }

    /**
     * @function 获取片区信息列表（不包括列表信息构建）
     */
    getAllPlanRegion() {
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
        //添加工单气泡
        this.addPolygonGraphic(results);
    }

    /**
     * @function 添加片区结果在地图上展示
     */
    addPolygonGraphic(queryResult) {
        //清除图层
        this.planregionInfoGraphicLayer.clear();
        this.currentRegionGraphics = [];
        this.polygonDatas = new Object();
        //添加当前页工单气泡
        for (var i = 0, length = queryResult.result.rows.length; i < length; i++) {
            var row = queryResult.result.rows[i];

            if (row.geometry == undefined || row.geometry == "") { continue; }
            var polygon = new Polygon(JSON.parse(row.geometry));
            var graphic = new Graphic(polygon, this.setSymbol(row.regionname)[2], { "regionid": row.regionid });
            this.currentRegionGraphics.push(polygon);//存储所有片区面

            this.polygonDatas[row.regionid] = row;
            this.planregionInfoGraphicLayer.add(graphic);

            if (row.regionname != null && row.regionname != "") {
                //添加背景
                var point = polygon.getExtent().getCenter();
                var graphictextbg = new Graphic(point, this.setSymbol(row.regionname)[1].setOffset(0, -20), "");
                this.planregionInfoGraphicLayer.add(graphictextbg);
                //添加文字
                var peopleTextSymbol = new TextSymbol(row.regionname);
                peopleTextSymbol.setOffset(0, -25);
                var font = new Font();
                font.setSize("10pt");
                font.setWeight(Font.WEIGHT_BOLD);
                peopleTextSymbol.setFont(font);
                var graphicText = new Graphic(point, peopleTextSymbol, "");
                this.planregionInfoGraphicLayer.add(graphicText);
            }
        }

        if (length > 0) {
            var extent = graphicsUtils.graphicsExtent(this.planregionInfoGraphicLayer.graphics);
            if (extent != null) {
                this.map.setExtent(extent);
            }
        }
    }

    /**
     * @function 删除片区
     */
    deleteRegion() {
        if (this.regioncontain_pathnum > 0) {
            this.toast.Show("请先删除该片区内的巡检线路");
            return;
        }
        if (this.regionid == "") {
            this.toast.Show("请选择要删除的巡检片区!");
            return;
        }

        this.popup.setSize(300, 150);
        var Obj = this.popup.ShowMessage("提示", "是否删除选择数据？");
        Obj.submitObj.off("click").on("click", function () {
            this.popup.Close();
            $.ajax({
                headers: this.getHeaders(1),
                type: "POST",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.deletePlanRegion + this.regionid,
                data: {
                    "id": this.regionid
                },
                success: this.deletePlanRegionCallback.bind(this),
                dataType: "json",
            });
        }.bind(this));
    }

    /**
     * @function 片区编辑
     */
    editRegion() {
        //弹出popup
        this.popup.setSize(500, 450);
        var Obj = this.popup.Show("修改", this.template.split('$$')[1]);
        this.objpup = Obj;
        Obj.conObj.find('.regionname').val(this.regionname);
        Obj.conObj.find('.address').val(this.address);
        Obj.conObj.find('.notes').val(this.notes);
        Obj.conObj.find('.pipelength').val(this.pipe_length);
        Obj.conObj.find('.pipenum').val(this.pipe_num);
        Obj.conObj.find('.btn_calculatelength').off("click").on("click", function () {
            this.calculateStatus = 2;
            this.calculatePipe(2);
        }.bind(this));

        Obj.conObj.find('.btn_calculatenum').off("click").on("click", function () {
            this.calculateStatus = 1;
            this.calculatePipe(1);
        }.bind(this));

        Obj.submitObj.off("click").on("click", function () {
            var regionname = Obj.conObj.find('.regionname');
            var address = Obj.conObj.find('.address');
            var notes = Obj.conObj.find('.notes');
            var pipelength = Obj.conObj.find('.pipelength');
            var pipenum = Obj.conObj.find('.pipenum');
            if (regionname.val() == "") {
                regionname.addClass('has-error');
                regionname.attr("placeholder", "不能为空！");
                this.popup.ShowTip("片区名称不能为空！");
                return;
            }
            // if (address.val() == "") {
            //     address.addClass('has-error');
            //     address.attr("placeholder", "不能为空！");
            //     this.popup.ShowTip("位置信息不能为空！");
            //     return;
            // } 


            $.ajax({
                headers: this.getHeaders(1),
                type: "POST",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.updatePlanRegion,
                data: {
                    "regionid": this.regionid,
                    "regionname": regionname.val(),
                    "geometry": this.tempregionjson,
                    "address": address.val(),
                    "notes": notes.val(),
                    "pipe_length": pipelength.val(),
                    "pipe_num": pipenum.val()
                },
                success: this.updatePlanRegionInfoCallback.bind(this),
                dataType: "json",
            });
        }.bind(this));
    }

    /**
     * @function 添加片区回调函数
     */
    addPlanRegionInfoCallback(results) {
        var that = this;
        if (results.code != 1) {
            this.popup.ShowTip(results.message);
            return;
        } else {
            this.popup.Close();
            that.toast.Show("添加片区成功！");
            this.tempregionjson = "";
            this.templanregion.clear();
            this.regionid = "";
            this.getPlanRegion(this.config.pagenumber, this.config.pagesize);
        }
    }

    /**
     * @function 删除片区回调函数
     */
    deletePlanRegionCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        } else {
            that.toast.Show("删除片区成功！");
            this.tempregionjson = "";
            this.regionid = "";
            this.getPlanRegion(this.config.pagenumber, this.config.pagesize);
        }
    }

    /**
     * @function 修改片区回调
     */
    updatePlanRegionInfoCallback(results) {
        var that = this;
        if (results.code != 1) {
            this.popup.ShowTip(results.message);
            return;
        } else {
            this.popup.Close();
            that.toast.Show("修改片区信息成功！");
            this.tempregionjson = "";
            this.templanregion.clear();
            this.regionid = "";
            this.getPlanRegion(this.config.pagenumber, this.config.pagesize);
        }
    }

    /**
     * @function 获取隐患点列表
     */
    getAllPlanWarn() {
        this.companyid = (this.iszgs == true ? this.domObj.find(".company option:selected").val() : "");
        $.ajax({
            headers: this.getHeaders(0),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getPlanPointList,
            data: {
                "pageindex": 1,
                "pagesize": this.config.maxsize,
                "device_type_id": this.config.device_type_id.warnpoint,
                "companyid": this.companyid
            },
            success: this.getAllPlanWarnListCallback.bind(this),
            dataType: "json",
        });
    }
    getAllPlanWarnListCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        }
        //添加工单气泡
        this.addWarnPointGraphic(results.result.rows);
    }

    /**
     * 获取巡检点列表
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
        this.addPointGraphic(results.result.rows);
    }

    /**
     * @function 获取巡检路线
     */
    getAllPlanPath() {
        this.companyid = (this.iszgs == true ? this.domObj.find(".company option:selected").val() : "");
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
        this.addPathGraphic(results.result.rows);
    }

    addPointGraphic(queryResult) {
        //清除图层
        this.planpointInfoGraphicLayer.clear();

        //添加当前页工单气泡
        for (var i = 0, length = queryResult.length; i < length; i++) {
            var row = queryResult[i];
            if (row.geometry == undefined || row.geometry == "") { continue; }
            var point = new Point(JSON.parse(row.geometry));
            var graphic = new Graphic(point, this.setSymbol(row.point_name)[0], "");

            graphic.attr("id", "graphic" + i);
            this.planpointInfoGraphicLayer.add(graphic);

            if (row.point_name != null && row.point_name != "") {
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
    }

    addWarnPointGraphic(queryResult) {
        //清除图层
        this.planwarnInfoGraphicLayer.clear();
        //添加当前页工单气泡
        for (var i = 0, length = queryResult.length; i < length; i++) {
            var row = queryResult[i];
            if (row.geometry == undefined || row.geometry == "") { continue; }
            var point = new Point(JSON.parse(row.geometry));
            var graphic = new Graphic(point, new PictureMarkerSymbol(this.config.WarnMarkPictureSymbol, 48, 48), "");

            graphic.attr("id", "graphic" + i);
            this.planwarnInfoGraphicLayer.add(graphic);

            if (row.point_name != null && row.point_name != "") {
                var peopleTextSymbol = new TextSymbol(row.point_name);
                peopleTextSymbol.setOffset(0, -25);
                var font = new Font();
                font.setSize("10pt");
                font.setWeight(Font.WEIGHT_BOLD);
                peopleTextSymbol.setFont(font);
                var graphicText = new Graphic(point, peopleTextSymbol, "");
                this.planwarnInfoGraphicLayer.add(graphicText);
            }

        }
    }

    addPathGraphic(queryResult) {
        //清除图层
        this.planpathInfoGraphicLayer.clear();

        //添加当前页工单气泡
        for (var i = 0, length = queryResult.length; i < length; i++) {
            var row = queryResult[i];
            if (row.geometry == undefined || row.geometry == "") { continue; }
            var polyline = new Polyline(JSON.parse(row.geometry));
            var point = polyline.getExtent().getCenter();
            var graphic = new Graphic(polyline, this.setSymbol(row.point_name)[3], "");

            graphic.attr("id", "graphic" + i);
            this.planpathInfoGraphicLayer.add(graphic);

            if (row.point_name != null && row.point_name != "") {
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
        }

    }

    //设置点的样式
    setSymbol(txt?) {
        var symbol = [];
        var fillSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASHDOT, new Color([255, 0, 0]), 2), new Color([0, 0, 0, 0.1]));
        var lineSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([255, 0, 0]), 2);
        var peopleSymbol = new PictureMarkerSymbol(this.config.MarkPictureSymbol, 48, 48).setOffset(0, 15);
        //根据字长度设置背景图片宽度
        var peopletextSymbol = new PictureMarkerSymbol(this.config.TextbgSymbol, txt == null ? 0 : txt.length * 90 / 6, 18);
        var fillmanegeSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([168, 10, 206]), 3), new Color([0, 0, 0, 0]));
        symbol.push(peopleSymbol);
        symbol.push(peopletextSymbol);
        symbol.push(fillSymbol);
        symbol.push(lineSymbol);
        symbol.push(fillmanegeSymbol);
        return symbol;
    }

    /**
     * @function 统计管线长度与数量
     * @param calculateType 1统计数量，2统计长度,3是先统计数量再统计长度
     */
    calculatePipe(calculateType) {
        if (this.calculateStatus == 1) {
            this.loadWait.Show("正在计算统计数量，请等待...", this.objpup.conObj);
        } else if (this.calculateStatus == 2) {
            this.loadWait.Show("正在计算统计长度，请等待...", this.objpup.conObj);
        }
        var pipeServicePath = "";
        if (this.AppX.appConfig.gisResource.pipe.config[0] == undefined) {
            this.loadWait.Hide();
            this.toast.Show("管线服务未配置到config！");
            return;
        } else {
            pipeServicePath = this.AppX.appConfig.gisResource.pipe.config[0].url;
        }

        var idsdata = this.findLayerInMap(pipeServicePath);
        if (idsdata.length == 0) {//无管线数据
            this.pipe_length = 0;
            this.pipe_num = 0;
            this.loadWait.Hide();
            return;
        }

        //构建图层信息
        $.ajax({
            url: pipeServicePath + this.config.LengthstatisticService,
            data: {
                usertoken: this.AppX.appConfig.usertoken,
                layerids: JSON.stringify(this.config.layerids),
                group_fields: [],
                statistic_field: (calculateType == 2 ? "PIPELENGTH" : "OBJECTID"),
                statistic_type: ((calculateType == 3 || calculateType == 1) ? 1 : 2),
                where: "",
                geometry: this.tempregionjson,
                f: "pjson"
            },
            success: (calculateType == 2 ? this.LengthStatisticsCallback.bind(this) : this.CountStatisticsCallback.bind(this)),
            dataType: "json"
        });

    }

    //获取管线图层子图层
    private findLayerInMap(url) {
        var sublayerids = [];
        for (var i = 0; i < this.map.layerIds.length; i++) {
            var layer = this.map.getLayer(this.map.layerIds[i]);
            if (layer.url && layer.url == url) {
                if (layer.layerInfos.length != 0) {
                    layer.layerInfos.forEach(function (item, layerindex) {
                        var layerId = item.id;
                        if (item.subLayerIds) {
                        } else {
                            sublayerids.push(layerId);
                        }
                    });
                }
                return sublayerids;
            }
        }
        return null;
    }

    LengthStatisticsCallback(data) {
        var that = this;
        if (data.code == 10000) {
            //替换英文字符
            var data2 = JSON.stringify(data);
            var data3 = data2.replace(/PIPELENGTH/g, "长度/m");
            var data4 = JSON.parse(data3);
            var length = 0.00;
            for (var i = 0; i < data4.result.rows.length; i++) {
                for (var k = 0; k < data.result.rows[i].rows.length; k++) {
                    length = (length + data.result.rows[i].rows[k]["PIPELENGTH"]).toFixed(2) - 0;
                }
            }
            this.pipe_length = length;
        } else {
            that.toast.Show("统计长度出错！请检查");
            console.log(data.error);
        }
        if (that.calculateStatus == 3) {//添加    

            // if (that.curstate = "update") {

            //     that.curstate = "";
            //     return;

            // }
            that.loadWait.Hide();
            //弹出popup
            that.popup.setSize(500, 450);
            var Obj = that.popup.Show("新增", that.template.split('$$')[1]);
            that.objpup = Obj;
            Obj.conObj.find('.pipelength').val(that.pipe_length);
            Obj.conObj.find('.pipenum').val(that.pipe_num);
            Obj.conObj.find('.btn_calculatelength').off("click").on("click", function () {
                that.calculateStatus = 2;
                that.calculatePipe(2);
            }.bind(that));

            Obj.domObj.find('.btn-close').off("click").on("click", function () {
                this.templanregion.clear();
                this.popup.Close();
            }.bind(this));

            Obj.domObj.find('.btn-hide').off("click").on("click", function () {
                this.templanregion.clear();
                this.popup.Close();
            }.bind(this));

            Obj.conObj.find('.btn_calculatenum').off("click").on("click", function () {
                that.calculateStatus = 1
                that.calculatePipe(1);
            }.bind(that));

            Obj.submitObj.off("click").on("click", function () {
                if (that.planregionInfoGraphicLayer) {
                    that.planregionInfoGraphicLayer.clear();
                }
                if (that.templanregion) {
                    that.templanregion.clear();
                }
                var regionname = Obj.conObj.find('.regionname');
                var address = Obj.conObj.find('.address');
                var notes = Obj.conObj.find('.notes');
                var len = Obj.conObj.find('.pipelength');
                var num = Obj.conObj.find('.pipenum');
                if (regionname.val() == "") {
                    regionname.addClass('has-error');
                    regionname.attr("placeholder", "不能为空！");
                    that.popup.ShowTip("片区名称不能为空！");
                    return;
                }
                // if (address.val() == "") {
                //     address.addClass('has-error');
                //     address.attr("placeholder", "不能为空！");
                //     that.popup.ShowTip("位置信息不能为空！");
                //     return;
                // } 

                $.ajax({
                    headers: this.getHeaders(1),
                    type: "POST",
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.addPlanRegionInfo,
                    data: {
                        "regionname": regionname.val(),
                        "geometry": that.tempregionjson,
                        "address": address.val(),
                        "notes": notes.val(),
                        "pipe_length": len.val(),
                        "pipe_num": num.val(),
                        "createuser": AppX.appConfig.realname
                    },
                    success: that.addPlanRegionInfoCallback.bind(that),
                    dataType: "json",
                });
            }.bind(that));

        } else if (that.calculateStatus == 4) { //修改

            that.loadWait.Hide();

            that.pipe_length;
            that.pipe_num;
            $.ajax({
                headers: this.getHeaders(1),
                type: "POST",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.updatePlanRegion,
                data: {

                    "regionid": this.regionid,
                    "regionname": this.regionname,
                    "geometry": this.tempregionjson,
                    "address": this.address,
                    "notes": this.notes,
                    "pipe_length": that.pipe_length,
                    "pipe_num": that.pipe_num,

                },
                success: that.updatePlanRegionInfoCallback.bind(that),
                dataType: "json",
            });




        } else {
            that.loadWait.Hide();
            that.objpup.conObj.find('.pipelength').val(that.pipe_length);
        }
    }

    CountStatisticsCallback(data) {
        var that = this;
        if (data.code == 10000) {
            var data2 = JSON.stringify(data);
            var data3 = data2.replace(/OBJECTID/g, "条数");
            var data4 = JSON.parse(data3);
            var count = 0;
            for (var i = 0; i < data4.result.rows.length; i++) {
                for (var k = 0; k < data.result.rows[i].rows.length; k++) {
                    count += data.result.rows[i].rows[k]["OBJECTID"];
                }
            }
            that.pipe_num = count;

        } else {
            that.toast.Show("数量统计失败！请检查");
            console.log(data.error);
        }
        if (that.calculateStatus == 3) {
            that.calculatePipe(2);
        } else if (that.calculateStatus == 4) {
            that.calculatePipe(2);
        } else {
            that.loadWait.Hide();
            that.objpup.conObj.find('.pipenum').val(that.pipe_num);
        }
    }

    /**
     * @function 是否可以删除或更新判断
     */
    isUpdate() {
        $.ajax({
            headers: this.getHeaders(1),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.isUpdate + this.regionid,
            data: {
                "id": this.regionid
            },
            success: this.isUpdateCallback.bind(this),
            dataType: "json",
        });
    }
    isUpdateCallback(data) {
        console.log(data);
        if (data.code != 1) {
            this.toast.Show(data.message);
            return;
        }
        if (data.result != 1) {//可以修改或删除
            switch (this.status) {
                case "update"://修改
                    this.editRegion();
                    break;
                case "delete"://删除
                    this.deleteRegion();
                    break;
                case "edit_place":
                    if (this.editingEnabled == false) {
                        for (var i = 0; i < this.planregionInfoGraphicLayer.graphics.length; i++) {
                            var gx = this.planregionInfoGraphicLayer.graphics[i];
                            var polygon_id = gx.attributes["regionid"];
                            if (this.regionid == polygon_id && gx.geometry.type == 'polygon') {
                                this.editingEnabled = true;
                                this.editTool.activate(Edit.EDIT_VERTICES, gx);
                                break;

                            }
                        }
                    }
                    break;
            }
        } else {
            this.toast.Show("该巡检片区已安排在巡检计划中，暂时不能删除或更新！");
            return;
        }
    }

    /**----------------------------------裁切片区---------------------------------- */
    /**
     * @function 去掉重复的
     */
    geometryServerCut() {
        var ply = [];
        var gxs = this.currentRegionGraphics;
        for (var i = 0; i < gxs.length; i++) {
            var gem = gxs[i];
            if (this.isContain(gem, this.tempregionjson, false)) {
                ply.push(gem);
            }
        }
        if (ply.length > 0) {
            var pgeo = (new Polygon(JSON.parse(this.tempregionjson)));
            var extent = pgeo.getExtent();
            var result_pgeo = null;
            for (var j = 0; j < ply.length; j++) {
                if (result_pgeo == null) {
                    result_pgeo = this.geometryCut(pgeo, ply[j])
                }
                else {
                    result_pgeo = this.geometryCut(result_pgeo, ply[j]);
                }

            }
            this.tempregionjson = JSON.stringify(result_pgeo.toJson());
        }
    }

    /**
     * @function 裁切图片
     * @param cutGeo 被裁切面
     * @param ply 裁切面
     */
    geometryCut(cutGeo: Polygon, ply: Polygon) {
        var result_pgeo = null;
        result_pgeo = geometryEngine.clip(ply, cutGeo.getExtent());//获取相同部分
        var plinejson = {
            paths: result_pgeo.rings,
            spatialReference: result_pgeo.spatialReference
        };
        var pline = new Polyline(plinejson);
        var geos = geometryEngine.cut(cutGeo, pline);
        for (var m = 0; m < geos.length; m++) {
            if (this.isContain(geos[m], JSON.stringify(ply.toJson()), true) == false) {
                result_pgeo = geos[m];
                break;
            }
        }
        return result_pgeo;
    }

    /**
     * @function 是否包含
     * @param geometry 图上已有图形
     * @param jsongeometry 新增图形
     * @param isall 是否全包含
     */
    isContain(geometry, jsongeometry, isall) {
        var polygon = geometry;
        var gpolygon = new Polygon(JSON.parse(jsongeometry));
        var isContain = false;
        if (isall == true) {
            if (geometryEngine.contains(polygon, gpolygon)) {
                isContain = true;
            }
        } else if (geometryEngine.intersects(polygon, gpolygon) || geometryEngine.contains(polygon, gpolygon)) {
            isContain = true;
        }
        return isContain;
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
     * @function 销毁对象
     */
    destroy() {
        //删除管辖区图层
        if (this.planmanageregionlayer) {
            this.map.removeLayer(this.planmanageregionlayer);
            this.planmanageregionlayer.clear();
        }
        //删除巡检片区
        if (this.planregionInfoGraphicLayer) {
            this.map.removeLayer(this.planregionInfoGraphicLayer);
            this.planregionInfoGraphicLayer.clear();
        }
        if (this.templanregion) {
            this.map.removeLayer(this.templanregion);
            this.templanregion.clear();
        }
        //删除点        
        if (this.planpointInfoGraphicLayer) {
            this.map.removeLayer(this.planpointInfoGraphicLayer);
            this.planpointInfoGraphicLayer.clear();
        }

        //删除线路
        if (this.planpathInfoGraphicLayer) {
            this.map.removeLayer(this.planpathInfoGraphicLayer);
            this.planpathInfoGraphicLayer.clear();
        }

        //删除隐患点
        if (this.planwarnInfoGraphicLayer) {
            this.map.removeLayer(this.planwarnInfoGraphicLayer);
            this.planwarnInfoGraphicLayer.clear();
        }
        if (this.drawToolbar != null) {
            this.map.setMapCursor('default');
            this.drawToolbar.deactivate();
        }

        if (this.editToolEvent) {
            this.editToolEvent.remove();
        }

        if (this.planregion_pointlayer) {
            this.map.removeLayer(this.planregion_pointlayer);
            this.planregion_pointlayer.clear();
        }

        this.domObj.remove();
        this.afterDestroy();
    }
}