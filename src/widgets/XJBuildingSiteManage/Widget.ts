import BaseWidget = require('core/BaseWidget.class');
import GraphicsLayer = require("esri/layers/GraphicsLayer");
import Graphic = require("esri/graphic");
import PictureMarkerSymbol = require("esri/symbols/PictureMarkerSymbol");
import Point = require('esri/geometry/Point');
import Draw = require('esri/toolbars/draw');
import InfoTemplate = require("esri/InfoTemplate");
import SimpleMarkerSymbol = require('esri/symbols/SimpleMarkerSymbol');
import Color = require("esri/Color");
import XJfloatpanel = require("widgets/XJfloatpanel/Widget");
import graphicsUtils = require("esri/graphicsUtils");
import Save2File = require('./Save2File');


export = XJBuildingSiteManage;

class XJBuildingSiteManage extends BaseWidget {
    baseClass = "widget-XJBuildingSiteManage";


    userType = "";//用户类型：总公司(superadmin)，分公司管理员(companyadmin)，分公司部门管理员(departmentadmin)
    requestHeader;//请求数据的头部
    requestData;//请求数据的data
    firstRequest = true;//用于初次加载界面数据 初始化






    buildSiteGraphiclayer: GraphicsLayer;//工地全局图层
    buildSiteAddressGraphiclayer: GraphicsLayer;//添加工地时工地地址图层
    map;
    toast;
    popup;//
    photowall;
    pageIndex;//当前显示的为第几页
    pageSize;//每页显示的条数
    buildingSiteResult;//请求的工地信息
    addFloatpanel: XJfloatpanel;//添加panel
    modifyFloatpanel: XJfloatpanel;//添加panel
    reportJournalList = [];//回报日志
    tableBuildSiteList = [];//列表台账信息
    companyId = "";//当前用户所属公司id
    departmentId = "";//当前用户所属公司部门id
    companyDectionary = [];


    symbol;
    tempjsongeometry = "";

    startup() {
        this.initHtml();

    }

    initHtml() {
        // var html = _.template(this.template.split('$$')[0])();
        // this.setHtml(html);
        this.ready();
        this.XJBuildingSiteManageInit();

    }


    destroy() {
        this.afterDestroy();
        this.domObj.remove();
        this.destroyWidget();
    }

    //
    destroyWidget() {
        this.removeLayer([this.buildSiteGraphiclayer, this.buildSiteAddressGraphiclayer]);
    }



    XJBuildingSiteManageInit() {

        //判断用户类型
        this.judgeUserType();
        var template = this.template.split('$$')[0];
        if (this.userType == "companyadmin") {
            template = template.replace("工地名称", "监护部门");
            template = template.replace(/公司/g, "工地名称")
        }
        var html = _.template(template)();
        this.setHtml(html);

        this.initQueryInterface();
        this.requestCompanyInfo();
        this.initEvent();



        //
        this.companyId = this.AppX.appConfig.departmentid;
        this.toast = this.AppX.runtimeConfig.toast;
        this.popup = this.AppX.runtimeConfig.popup;
        this.photowall = this.AppX.runtimeConfig.photowall;
        this.map = this.AppX.runtimeConfig.map;
        this.pageIndex = this.config.requestBuildingSiteInfo.Count_pageindex;
        this.pageSize = this.config.requestBuildingSiteInfo.Count_pagesize;

        //添加图层（工地全局图层，绘制工地点图层）
        var layerNames = ["buildsitegraphiclayer", "buildsitepointlayer"];
        var graphicLayers = this.addGraphicLayer(layerNames);
        this.buildSiteGraphiclayer = graphicLayers[0];
        this.buildSiteAddressGraphiclayer = graphicLayers[1];
        //设置工地样式
        this.symbol = this.setBuildSiteSymbol();
        // //添加所有工地并添加到地图

        // var allHeader = {
        //     'Token': AppX.appConfig.xjxj,
        //     'departmentid': AppX.appConfig.departmentid
        // };
        // var allData = {
        //     "pageindex": 1,
        //     "pagesize": 10000000
        // }
        // this.requestBuildingSiteInfo(allHeader, allData, this.addAllBildSiteToMap.bind(this));
        // //分页获取工地信息并初始化工地台账列表

        // var header = {
        //     'Token': AppX.appConfig.xjxj,
        //     'departmentid': AppX.appConfig.departmentid
        // };
        // var data = {
        //     "pageindex": this.pageIndex,
        //     "pagesize": this.pageSize
        // }
        // this.requestBuildingSiteInfo(header, data, this.initBuildingSiteList.bind(this));
    }

    //判断用户的类型（总公司，分公司，部门管理员）
    judgeUserType() {
        if (AppX.appConfig.groupid != null && AppX.appConfig.groupid != "") {
            this.userType = "departmentadmin";
        } else if (/00;/.test(AppX.appConfig.range)) {
            this.userType = "superadmin";
        } else {
            this.userType = "companyadmin";
        }
    }

    initQueryInterface() {
        if (this.userType === "companyadmin") {
            this.domObj.find("div.company").css("display", "none");
        } else if (this.userType === "departmentadmin") {
            this.domObj.find("div.company").css("display", "none");
            this.domObj.find("div.department").css("display", "none");
        }
    }


    //获取公司信息
    requestCompanyInfo() {
        var config = this.config.requestCompanyInfo;
        $.ajax({
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request,
            data: {

            },
            success: function (result) {
                if (result.code !== 1) {
                    console.log(result.message);
                } else if (result.result.length === 0) {
                    console.log(config.MSG_null);
                } else {
                    var rows = result.result;
                    var html = "<option companyid=''> 全部 </option>";
                    for (var i = 0, length = rows.length; i < length; i++) {
                        var companyId = rows[i].companyid;
                        var companyName = rows[i].company_name;
                        var companyObj = {
                            "id": companyId,
                            "name": companyName
                        }
                        this.companyDectionary.push(companyObj);
                        var itemHtml = "<option companyid='" + companyId + "'>" + companyName + "</option>";
                        html += itemHtml;
                    }

                    //初始化公司下拉选项
                    this.domObj.find("select.company").append(html);
                    //绑定下拉改变事件
                    this.domObj.find("select.company").change(function (this) {
                        var companyId = this.domObj.find("select.company option:selected").attr("companyid");
                        this.initDepartment(companyId);
                    }.bind(this));;
                    //自动触发
                    this.domObj.find("select.company option").attr("companyid", function (index, val) {
                        if (val === AppX.appConfig.departmentid) {
                            $(this).attr("selected", "selected")
                        }
                        return val;
                    });
                    this.domObj.find("select.company ").trigger("change");
                }
            }.bind(this),
            error: function (error) {
                console.log(config.MSG_error);
            }.bind(this),
            dataType: "json",
        });
    }

    initDepartment(companyId) {
        this.domObj.find("select.department option").remove();
        if (companyId === "") {
            return;
        }
        var config = this.config.initDepartment;
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': companyId
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request,
            data: {
                "companyid": companyId
            },
            success: function (result) {
                if (result.code !== 1) {
                    console.log(result.message);
                } else if (result.result.rows.length === 0) {
                    console.log(config.MSG_null);
                } else {
                    var rows = result.result.rows;
                    var html = "<option value=''>所有</option>";
                    for (var i = 0, length = rows.length; i < length; i++) {
                        var departmentId = rows[i].id;
                        var departmentName = rows[i].name;
                        var itemHtml = "<option departmentid='" + departmentId + "'>" + departmentName + "</option>";
                        html += itemHtml;
                    }
                    this.domObj.find("select.department option").remove();
                    //初始化部门下拉选项
                    this.domObj.find("select.department").append(html);
                    if (this.firstRequest == true) {
                        //主动触发查询事件
                        this.domObj.find(".querycondition button.searchbutton").trigger("click");
                        this.firstRequest = false;
                    }

                }
            }.bind(this),
            error: function (error) {
                console.log(config.MSG_error);
            }.bind(this),
            dataType: "json",
        });
    }


    /*
     * 初始化事件
     */

    initEvent() {
        //查询事件
        this.domObj.find(".querycondition button.searchbutton").bind("click", this.searchClick.bind(this));
        //工具点击事件
        this.domObj.find(" #toolbar button.toolbar").bind("click", this.toolbarClick.bind(this));
        //上一页请求事件
        this.domObj.find(".div-pagetool button.pre").bind("click", this.prePage.bind(this));
        //下一页请求事件
        this.domObj.find(" .div-pagetool button.next").bind("click", this.nextPage.bind(this));
        //跳转请求事件
        this.domObj.find(".div-pagetool button.pageturning").bind("click", this.goPage.bind(this));
        //每页显示数目重设
        this.domObj.find(".div-pagetool select.dynamic_pagesize").bind("change", function (event) {
            var pageSize = $(event.currentTarget).find("option:selected").val();
            this.requestData.pageindex = 1;
            this.requestData.pagesize = pageSize;
            this.pageSize = pageSize;
            this.requestBuildingSiteInfo(this.requestHeader, this.requestData, this.initBuildingSiteList.bind(this));
        }.bind(this))
    }

    //查询事件
    searchClick(event) {
        var companyId = this.domObj.find("select.company option:selected").attr("companyid");
        var departmentid = this.domObj.find("select.department option:selected").attr("departmentid");
        // var buildState = "";
        var buildState = this.domObj.find("select.watchstate option:selected").val().trim();
        // switch (state) {
        //     case "待指派":
        //         buildState = "0";
        //         break;
        //     case "监护中":
        //         buildState = "1";
        //         break;
        //     case "监护完成":
        //         buildState = "2";
        //         break;
        //     case "已结案":
        //         buildState = "3";
        //         break;
        // }

        switch (this.userType) {
            case "superadmin":
                this.requestHeader = {
                    'Token': AppX.appConfig.xjxj,
                    'departmentid': AppX.appConfig.departmentid,
                    'range': AppX.appConfig.range
                };
                this.requestData = {
                    "pageindex": this.pageIndex,
                    "pagesize": this.pageSize,
                    "companyid": companyId,
                    "depid": departmentid,
                    "state": buildState
                };
                if (companyId !== AppX.appConfig.departmentid) {
                    this.domObj.find("div.toolbar button").addClass("disabled");
                } else {
                    this.domObj.find("div.toolbar button").removeClass("disabled");
                };
                break;
            case "companyadmin":
                this.requestHeader = {
                    'Token': AppX.appConfig.xjxj,
                    'departmentid': AppX.appConfig.departmentid,
                    'range': AppX.appConfig.range
                };
                this.requestData = {
                    "pageindex": this.pageIndex,
                    "pagesize": this.pageSize,
                    "depid": departmentid,
                    "state": buildState
                };
                break;
            case "departmentadmin":
                this.requestHeader = {
                    'Token': AppX.appConfig.xjxj,
                    'departmentid': AppX.appConfig.departmentid
                };
                this.requestData = {
                    "pageindex": this.pageIndex,
                    "pagesize": this.pageSize,
                    "depid": AppX.appConfig.groupid,
                    "state": buildState
                };
                break;
        }

        this.requestBuildingSiteInfo(this.requestHeader, this.requestData, this.initBuildingSiteList.bind(this));
        //添加所有工地到地图  
        var allData = {
            "pageindex": 1,
            "pagesize": 100000,
            "companyid": this.requestData.companyid,
            "depid": this.requestData.depid,
            "state": this.requestData.state
        }
        this.buildSiteGraphiclayer.clear();
        this.requestBuildingSiteInfo(this.requestHeader, allData, this.addAllBildSiteToMap.bind(this));
    }





    //移除图层
    removeLayer(layerObjec: Array<any>) {
        for (var i = 0, length = layerObjec.length; i < length; i++) {
            this.map.removeLayer(layerObjec[i]);
        }
    }

    //添加指定的图层
    addGraphicLayer(graphicLayerName: Array<string>) {
        var graphicLayers = [];
        for (var i = 0, length = graphicLayerName.length; i < length; i++) {
            var name = graphicLayerName[i];
            if (this.map.getLayer(name) == undefined) {
                var graphicLayer = new GraphicsLayer();
                graphicLayer.id = name;
                this.map.addLayer(graphicLayer);
                graphicLayers.push(graphicLayer);
            }
        }
        return graphicLayers;
    }

    //设置工地的样式
    setBuildSiteSymbol() {
        var config = this.config.setBuildSiteSymbol;
        var buildSiteSymbol = new PictureMarkerSymbol(this.root + config.Img_buildsite, 30, 30);
        return buildSiteSymbol;
    }




    /*
    * 地图显示所有未结案工地，点击可以查看工地详细信息 
    */

    // //发送ajax请求，获取所有工地台账信息
    // requestBuildingSiteInfo(pageindex, pagesize, buildstate, callback) {
    //     //清除工地列表原有数据（表格内，分页数据）
    //     this.domObj.find(".buildingsiteinfo tbody tr").remove();
    //     this.domObj.find(".div-pagetool .pagecontrol .total").text("-");
    //     this.domObj.find(".div-pagetool .pagecontrol .pagesize").text("-");
    //     this.domObj.find(".div-pagetool  span.totalpage").text("-");
    //     this.domObj.find(".div-pagetool  span.currentpage").text("-");
    //     //数据加载动画
    //     this.domObj.find(".dataloader").css("display", "block");
    //     //保存工地数据变量清空
    //     this.tableBuildSiteList = [];
    //     var config = this.config.requestBuildingSiteInfo;
    //     var toast = this.AppX.runtimeConfig.toast;
    //     $.ajax({
    //         headers: {
    //             'Token': AppX.appConfig.xjxj,
    //             'departmentid': AppX.appConfig.departmentid,
    //             'range': AppX.appConfig.range
    //         },
    //         type: "POST",
    //         url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request,
    //         data: {
    //             "pageindex": pageindex,
    //             "pagesize": pagesize,
    //             "state": buildstate
    //         },
    //         success: function (result) {
    //             this.tableBuildSiteList = [];
    //             this.domObj.find(".dataloader").css("display", "none");
    //             if (result.code !== 1) {
    //                 toast.Show(result.message);
    //             } else if (result.result.rows.length === 0) {
    //                 toast.Show(config.MSG_null);
    //             } else {
    //                 var rows = result.result.rows;
    //                 for (var i = 0, length = rows.length; i < length; i++) {
    //                     //台账信息
    //                     var ID = rows[i].id;//工地台账id
    //                     var name = rows[i].name;//工地监护名称
    //                     var buildSiteState = rows[i].build_state;//工地状态
    //                     var watchingState = rows[i].state;//监护状态状态
    //                     var workerName = rows[i].build_username;//监护人
    //                     var creatTime = rows[i].create_time;//创建时间
    //                     var closeTime = rows[i].check_time;//结案时间
    //                     var noWatchTime = rows[i].unguarded_date;//未监护时间
    //                     //工地信息
    //                     var constructionType = rows[i].project_type_name;//工地类型名称
    //                     var x = rows[i].lng;//经度
    //                     var y = rows[i].lat;//纬度
    //                     var constructionAdress = rows[i].address;//工地地址
    //                     var managerCompany = rows[i].build_company_name;//施工单位
    //                     var manager = rows[i].scene_charege_name;//现场负责人姓名
    //                     var managerPhone = rows[i].charege_phone;//现场负责人电话
    //                     var spuperManager = rows[i].charege_username;//主管人
    //                     var spuperManageCompany = rows[i].charge_company_name;//主管单位
    //                     var notification = rows[i].gaozhishu;//告知书
    //                     var finder = rows[i].find_user;
    //                     //回报日志
    //                     var reportJournal = rows[i].report;//回报日志
    //                     //审核状态
    //                     var checkState = rows[i].check_state;
    //                     var notes = rows[i].notes;
    //                     //公司信息
    //                     var companyId = rows[i].companyid;
    //                     var buildSite = new BuildSite(ID, name, watchingState, buildSiteState, workerName, creatTime, closeTime, noWatchTime, constructionType, x, y, constructionAdress, managerCompany, manager, managerPhone, spuperManager, spuperManageCompany, notification, reportJournal, checkState, notes, finder, companyId, this.companyDectionary)
    //                     this.tableBuildSiteList.push(buildSite);
    //                 }

    //                 callback(this.tableBuildSiteList);
    //                 //初始化列表时，设置分页信息
    //                 if (pagesize < 100000) {
    //                     var total = result.result.total;//总记录数
    //                     var pageSize = result.result.pagesize || this.pageSize;//每页显示几条
    //                     var pageIndex = result.result.pageindex || this.pageIndex;//第几页
    //                     var totalPage = Math.ceil(parseInt(total) / parseInt(pageSize));//总页数
    //                     this.domObj.find(".div-pagetool .pagecontrol .total").text(total);
    //                     this.domObj.find(".div-pagetool .pagecontrol .pagesize").text(pageSize);
    //                     this.domObj.find(".div-pagetool  span.totalpage").text(totalPage);
    //                     this.domObj.find(".div-pagetool  span.currentpage").text(pageIndex);
    //                 }
    //             }
    //         }.bind(this),
    //         error: function () {
    //             this.domObj.find(".dataloader").css("display", "none");
    //             toast.Show(config.MSG_error);
    //         }.bind(this),
    //         dataType: "json",
    //     });
    // }

    //发送ajax请求，获取所有工地台账信息
    requestBuildingSiteInfo(header, data, callback) {

        //清除工地列表原有数据（表格内，分页数据）
        this.domObj.find(".buildingsiteinfo tbody tr").remove();
        this.domObj.find(".div-pagetool .pagecontrol .total").text("-");
        this.domObj.find(".div-pagetool .pagecontrol .pagesize").text("-");
        this.domObj.find(".div-pagetool  span.totalpage").text("-");
        this.domObj.find(".div-pagetool  span.currentpage").text("-");

        //数据加载动画
        this.domObj.find(".dataloader").css("display", "block");
        //保存工地数据变量清空
        this.tableBuildSiteList = [];
        var config = this.config.requestBuildingSiteInfo;
        var toast = this.AppX.runtimeConfig.toast;
        $.ajax({
            headers: header,
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request,
            data: data,
            success: function (result) {
                this.tableBuildSiteList = [];
                this.domObj.find(".dataloader").css("display", "none");
                if (result.code !== 1) {
                    toast.Show(result.message);
                } else if (result.result.rows.length === 0) {
                    toast.Show(config.MSG_null);
                } else {
                    var rows = result.result.rows;
                    for (var i = 0, length = rows.length; i < length; i++) {
                        //台账信息
                        var ID = rows[i].id;//工地台账id
                        var name = rows[i].name;//工地监护名称
                        var buildSiteState = rows[i].build_state;//工地状态
                        var watchingState = rows[i].state;//监护状态状态
                        var workerName = rows[i].build_username;//监护人
                        var watchingTime = rows[i].assign_time;//开始监护时间
                        var creatTime = rows[i].create_time;//创建时间
                        var closeTime = rows[i].check_time;//结案时间
                        var noWatchTime = rows[i].unguarded_date;//未监护时间
                        var watchTimeSpan = rows[i].consume_time//监护时长
                        //工地信息
                        var constructionType = rows[i].project_type_name;//工地类型名称
                        var x = rows[i].lng;//经度
                        var y = rows[i].lat;//纬度
                        var constructionAdress = rows[i].address;//工地地址
                        var managerCompany = rows[i].build_company_name;//施工单位
                        var manager = rows[i].scene_charege_name;//现场负责人姓名
                        var managerPhone = rows[i].charege_phone;//现场负责人电话
                        var spuperManager = rows[i].charege_username;//主管人
                        var spuperManageCompany = rows[i].charge_company_name;//主管单位
                        var notification = rows[i].gaozhishu;//告知书
                        var finder = rows[i].find_user;
                        //回报日志
                        var reportJournal = rows[i].report;//回报日志
                        //审核状态
                        var checkState = rows[i].check_state;
                        var notes = rows[i].notes;
                        //公司信息
                        var companyId = rows[i].companyid;
                        var departmentName = rows[i].depname;
                        //音频
                        var findAudio = rows[i].file_audio;
                        var gzsAudio = rows[i].gaozhishuaudio;
                        var buildSite = new BuildSite(ID, name, watchingState, buildSiteState, workerName, watchingTime, creatTime, closeTime, watchTimeSpan, noWatchTime, constructionType, x, y, constructionAdress, managerCompany, manager, managerPhone, spuperManager, spuperManageCompany, notification, reportJournal, checkState, notes, finder, companyId, this.companyDectionary, departmentName, findAudio, gzsAudio)
                        this.tableBuildSiteList.push(buildSite);
                    }

                    callback(this.tableBuildSiteList);
                    //初始化列表时，设置分页信息
                    if (result.result.pagesize < 100000) {
                        var total = result.result.total;//总记录数
                        var pageSize = result.result.pagesize || this.pageSize;//每页显示几条
                        var pageIndex = result.result.pageindex || this.pageIndex;//第几页
                        var totalPage = Math.ceil(parseInt(total) / parseInt(pageSize));//总页数
                        this.domObj.find(".div-pagetool .pagecontrol .total").text(total);
                        this.domObj.find(".div-pagetool .pagecontrol .pagesize").text(pageSize);
                        this.domObj.find(".div-pagetool  span.totalpage").text(totalPage);
                        this.domObj.find(".div-pagetool  span.currentpage").text(pageIndex);
                    }
                }
            }.bind(this),
            error: function () {
                this.domObj.find(".dataloader").css("display", "none");
                toast.Show(config.MSG_error);
            }.bind(this),
            dataType: "json",
        });
    }



    //添加工地信息到地图
    addAllBildSiteToMap(buildSiteList: Array<BuildSite>) {
        this.buildSiteGraphiclayer.clear();
        for (var i = 0, length = buildSiteList.length; i < length; i++) {
            var point = new Point(buildSiteList[i].longitude, buildSiteList[i].latitude, this.map.spatialReference);
            var infoTemplate = new InfoTemplate({
                title: "工地详情",
                content: this.template.split('$$')[1]
            });
            var data = buildSiteList[i].getGraphicData();
            var graphic = new Graphic(point, this.symbol, "", infoTemplate)
            graphic.setAttributes({
                "managercompany": data[0],
                "manager": data[1],
                "chargercompany": data[2],
                "chargername": data[3],
                "chargerphone": data[4],
                "address": data[5],
                "type": data[6],
                "longitude": data[7],
                "latitude": data[8],
                "watchname": data[9],
                "watchworkername": data[10],
                "findername": data[11],
                "state": data[12],
                "checkstate": data[13],
                "notes": data[14],
                "audio": data[15]
            });
            this.buildSiteGraphiclayer.add(graphic);

        }

        // //定位范围
        // var extent = graphicsUtils.graphicsExtent(this.buildSiteGraphiclayer.graphics);
        // if (extent != null && extent.getWidth() > 0.005) {
        //     this.map.setExtent(extent.expand(1.5));

        // } else {
        //     var extentCenter = extent.getCenter()
        //     this.map.centerAndZoom(extentCenter, 11);
        // }
    }


    /*
    * 列表分页显示所有工地台账信息 
    */

    //初始化台账信息列表
    initBuildingSiteList(buildSiteList: Array<BuildSite>) {
        var template = this.domObj.find(".buildingsiteinfo tbody #template").text().trim();
        var html = "";
        var data = [];
        for (var i = 0, length = buildSiteList.length; i < length; i++) {
            if (this.userType === "superadmin" || this.userType === "departmentadmin") {
                data = buildSiteList[i].getTableData();
            } else if (this.userType === "companyadmin") {
                data = buildSiteList[i].getOneCompanyTableData();
            }
            data = [i].concat(data);
            var index = 0;
            var templateRepalce = template.replace(/%[a-zA-Z]+%/g, function () {
                return (index < data.length) ? (data[index++]) : '';
            });
            html += templateRepalce;
        }
        this.domObj.find(".buildingsiteinfo tbody tr").remove();
        this.domObj.find(".buildingsiteinfo tbody").append(html);
        if ((this.userType === "departmentadmin")) {
            this.domObj.find(".table-head .company").css("display", "none");
            this.domObj.find(".buildingsiteinfo .company").css("display", "none");
        }

        //每一项单击事件
        this.domObj.find("#maincontent tbody tr").bind("click", this.selecteItem.bind(this));

        //查看告知书详情 事件
        this.domObj.find("#maincontent tbody tr a.notification").bind("click", function (event) {
            var index = $(event.currentTarget).parents("tr").attr("index");
            this.viewNotification(index);
        }.bind(this));

        //查看日志详情 事件
        this.domObj.find("#maincontent tbody tr a.log").bind("click", function (event) {
            var buildSiteID = $(event.currentTarget).parents("tr").attr("buildsiteid");
            this.viewBuildSiteInfo(buildSiteID);
        }.bind(this));

    }

    //单击每一项时，定位到地图，并高亮选中项。
    selecteItem(event) {
        //定位到当前的工地
        var x = parseFloat($(event.currentTarget).attr("longitude"));
        var y = parseFloat($(event.currentTarget).attr("latitude"));
        var point = new Point(x, y, this.map.spatialReference)
        this.map.centerAndZoom(point, 11);
        //高亮选中项
        if ($(event.currentTarget).find("td input").prop("checked")) {
            $(event.currentTarget).removeClass("success");
            $(event.currentTarget).find("td input").prop("checked", false);
        } else {
            this.domObj.find("input[type='checkbox']").prop("checked", false);
            this.domObj.find(".buildsitecontent tbody tr").removeClass("success");
            $(event.currentTarget).addClass("success");
            $(event.currentTarget).attr("choosed", "yes");
            $(event.currentTarget).find("td input").prop("checked", true);

        }

    }

    //上一页
    prePage() {
        var pageIndex = parseInt($(".widget-XJBuildingSiteManage  .div-pagetool button.current span.currentpage").text());
        var prePage = pageIndex - 1;
        if (prePage < 1) {
            return;
        } else {
            this.requestData.pageindex = prePage;
            this.requestBuildingSiteInfo(this.requestHeader, this.requestData, this.initBuildingSiteList.bind(this));
        }
    }
    //下一页
    nextPage() {
        var pageIndex = parseInt($(".widget-XJBuildingSiteManage  .div-pagetool button.current span.currentpage").text());
        var totalPage = parseInt($(".widget-XJBuildingSiteManage  .div-pagetool button.current span.totalpage").text());
        var nextPage = pageIndex + 1;
        if (nextPage > totalPage) {
            return;
        } else {
            this.requestData.pageindex = nextPage;
            this.requestBuildingSiteInfo(this.requestHeader, this.requestData, this.initBuildingSiteList.bind(this));
        }
    }

    //跳转到另外一页
    goPage() {
        var pageIndex = parseInt($(".widget-XJBuildingSiteManage  .div-pagetool div.go input.currpage").val());
        var totalPage = parseInt($(".widget-XJBuildingSiteManage  .div-pagetool button.current span.totalpage").text());
        var goPage = pageIndex;
        if (goPage > totalPage || goPage < 1) {
            return;
        } else {
            this.requestData.pageindex = goPage;
            this.requestBuildingSiteInfo(this.requestHeader, this.requestData, this.initBuildingSiteList.bind(this));
        }
    }

    /*
    * 对工地台账进行相关操作
    * 1.添加、修改、删除
    * 2指派、结案
    */
    toolbarClick(event) {
        if ($(event.currentTarget).hasClass("disabled")) {
            return;
        }
        //

        var handleType = $(event.currentTarget).attr("handletype");
        if (handleType === "add") {
            //初始化添工地台账表单
            var template = this.template.split('$$')[2];
            if ($(".buildsiteadd").length == 0) {
                this.addFloatpanel = new XJfloatpanel({
                    innerWidgetHtml: template,
                    panelUniqClassName: "buildsiteadd",
                    panelTitle: "工地台账添加",
                    panelHeight: "400px",
                    panelWidth: "780px",
                    panelDestroyFun: function () {
                        this.buildSiteAddressGraphiclayer.clear();
                    }.bind(this),
                    panelReadyFun: function () {
                        $("#XJBuildingSiteManage_additem form").bootstrapValidator();
                        //初始化工地类型
                        this.initSelect($('.buildsiteadd'));
                        //初始化发现人员
                        this.initFinderSelect($('.buildsiteadd'));
                        //绑定定位事件
                        this.bindLocateEvent($('.buildsiteadd'));
                        //绑定提交事件
                        this.bindSubmitEvent($('.buildsiteadd'));
                        //绑定关闭事件
                        this.bindCloseEvent($('.buildsiteadd'));
                    }.bind(this)
                });
            }

        } else if (handleType === "delete") {
            var selctedItem = $(".widget-XJBuildingSiteManage  #maincontent tbody input:checked");
            if (selctedItem.length === 0) {
                this.AppX.runtimeConfig.toast.Show("请选择要删除的工地台账！");
            } else {
                this.popup.setSize(300, 150);
                var Obj = this.popup.ShowMessage("提示", "确认需删除选中数据？");
                Obj.submitObj.off("click").on("click", function () {
                    this.popup.Close();
                    var buildeSiteId = [];
                    selctedItem.parents("tr").attr("buildsiteid", function (index, val) {
                        buildeSiteId.push(val);
                        return val;
                    });
                    this.deleteBuildSiteInfo(buildeSiteId);
                }.bind(this));

            }
        } else if (handleType === "modify") {
            var selctedItem = $(".widget-XJBuildingSiteManage  #maincontent tbody input:checked");
            if (selctedItem.length === 0) {
                this.AppX.runtimeConfig.toast.Show("请选择要修改的工地台账！");
            } else {
                var selectRow = selctedItem.parents("tr");
                var buildeSiteID = selectRow.attr("buildsiteid");
                //初始化添工地台账表单
                var template = this.template.split('$$')[2]
                this.modifyFloatpanel = new XJfloatpanel({
                    innerWidgetHtml: template,
                    panelUniqClassName: "buildsitemodify",
                    panelTitle: "工地台账修改",
                    panelHeight: "400px",
                    panelWidth: "780px",
                    panelDestroyFun: function () {
                        this.buildSiteAddressGraphiclayer.clear();
                    }.bind(this),
                    panelReadyFun: function () {
                        //初始化工地类型
                        this.initSelect($('.buildsitemodify'));
                        //初始化发现人
                        this.initFinderSelect($('.buildsitemodify'));
                        //绑定定位事件
                        this.bindLocateEvent($('.buildsitemodify'));
                        //绑定提交事件
                        this.bindModifySubmitEvent($('.buildsitemodify'), buildeSiteID);
                        //绑定关闭事件
                        this.bindModifyCloseEvent($('.buildsitemodify'));
                        //初始化之前的值
                        this.initPreviousData(buildeSiteID, $('.buildsitemodify'));
                    }.bind(this)
                });


            }
        } else if (handleType === "assign") {
            var selctedItem = $(".widget-XJBuildingSiteManage  #maincontent tbody input:checked");
            if (selctedItem.length === 0) {
                this.AppX.runtimeConfig.toast.Show("请选择要指派的工地台账！");
            } else {
                var selectRow = selctedItem.parents("tr");
                var buildeSiteID = selectRow.attr("buildsiteid");
                //初始化指派工地台账表单
                var template = this.template.split('$$')[4];
                this.popup.setSize(400, 250);
                var Obj = this.popup.Show("工地指派", template);
                this.initUserSelect($("#XJBuildingSiteManage_assign"));
                $('#XJBuildingSiteManage_assign .watchingtime').jeDate({
                    format: 'YYYY/MM/DD', //日期格式  
                    isinitVal: true,
                    initAddVal: $.nowDate(0),
                    minDate: $.nowDate(0)
                })


                if (this.userType == "departmentadmin") {
                    $("#XJBuildingSiteManage_assign div.department ").css("display", "none");
                }

                //绑定提交事件
                //提交按钮事件
                Obj.submitObj.off("click").on("click", function (event) {
                    var userid = Obj.conObj.find("select.username").find("option:selected").attr("userid");
                    var watchingTime = Obj.conObj.find("input.watchingtime").val();
                    this.assignBuildSiteWatcher(buildeSiteID, userid, watchingTime);
                    Obj.conObj.find(".btn-close").trigger("click");
                }.bind(this));
            }
        } else if (handleType === "close") {
            var selctedItem = $(".widget-XJBuildingSiteManage  #maincontent tbody input:checked");
            if (selctedItem.length === 0) {
                this.AppX.runtimeConfig.toast.Show("请选择要结案的工地台账！");
            } else {
                var buildeSiteId = selctedItem.parents("tr").attr("buildsiteid");
                //初始化添工地结案表单
                var template = this.template.split('$$')[9];
                this.popup.setSize(400, 300);
                var Obj = this.popup.Show("工地结案", template);
                Obj.submitObj.off("click").on("click", function (event) {
                    var checkState = Obj.conObj.find("input[type='radio']:checked").val();
                    var checkNote = Obj.conObj.find("textarea").val();
                    this.closeBuildSite(buildeSiteId, checkState, checkNote);
                    Obj.conObj.find(".btn-close").trigger("click");

                }.bind(this));
            }
        } else if (handleType === "export") {
            var selctedItem = this.domObj.find(" #maincontent tbody input:checked");
            if (selctedItem.length == 1) {
                var datas = [];
                var index = selctedItem.parents("tr").attr("index");
                var data = this.tableBuildSiteList[index].getOneCsvData();
                datas.push(data);
                Save2File(datas);

            } else {
                var datas = [];
                for (var i = 0; i < this.tableBuildSiteList.length; i++) {
                    var data = this.tableBuildSiteList[i].getCsvData();
                    datas.push(data);
                }
                Save2File(datas);
            }

            // mothedexport_xjterminal();
        }
        else if (handleType === "refresh") {
            //添加所有工地到地图  
            var allData = {
                "pageindex": 1,
                "pagesize": 100000,
                "companyid": this.requestData.companyid,
                "depid": this.requestData.depid,
                "state": this.requestData.state
            }
            this.buildSiteGraphiclayer.clear();
            this.requestBuildingSiteInfo(this.requestHeader, allData, this.addAllBildSiteToMap.bind(this));
            //更新列表
            this.requestBuildingSiteInfo(this.requestHeader, this.requestData, this.initBuildingSiteList.bind(this));
        }
    }

    initSelect(selector) {
        var config = this.config.initSelect;
        var toast = this.AppX.runtimeConfig.toast;
        //初始化工地类型
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_buildsiterequest,
            data: {
                "pageindex": config.Count_pageindex,
                "pagesize": config.Count_pagesize
            },
            success: function (result) {
                if (result.code !== 1) {
                    toast.Show(config.MSG_buildsiteerror);
                } else if (result.result.rows.length === 0) {
                    toast.Show(config.MSG_buildsitenull);
                } else {
                    var rows = result.result.rows;
                    var html = "";
                    for (var i = 0, length = rows.length; i < length; i++) {
                        var buildSiteId = rows[i].id;
                        var buildSiteName = rows[i].name;
                        html += "<option  buildsiteid='" + buildSiteId + "'>" + buildSiteName + "</option>";
                    }
                    selector.find(".buildtsiteype select.constructiontype").append(html);
                }
            },
            error: function () {
                toast.Show(config.MSG_buildsiteerror);
            },
            dataType: "json",
        });
    }

    initFinderSelect(selector) {
        var config = this.config.initFinderSelect;
        var toast = this.AppX.runtimeConfig.toast;
        //初始化工地类型
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request,
            data: {
                "pageindex": config.Count_pageindex,
                "pagesize": config.Count_pagesize,
                "companyid": this.companyId,
                "depid": AppX.appConfig.groupid
            },
            success: function (result) {
                if (result.code !== 1) {
                    toast.Show(result.message);
                } else if (result.result.rows.length === 0) {
                    toast.Show(config.MSG_null);
                } else {
                    var rows = result.result.rows;
                    var html = "";
                    for (var i = 0, length = rows.length; i < length; i++) {
                        var userID = rows[i].userid;
                        var userName = rows[i].username;
                        html += "<option  finderid='" + userID + "'>" + userName + "</option>";
                    }
                    selector.find("select.finder").append(html);
                }
            },
            error: function (error) {
                toast.Show(config.MSG_error);
            },
            dataType: "json",
        });
    }

    bindLocateEvent(selector) {
        selector.find("img.locate").on("click", function (event) {
            this.map.setMapCursor('crosshair');
            this.buildSiteAddressGraphiclayer.clear();
            var drawToolbar = new Draw(this.AppX.runtimeConfig.map);
            drawToolbar.activate(Draw.POINT);
            drawToolbar.on("draw-end", function (evt) {
                this.map.setMapCursor('default');
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
                this.tempjsongeometry = JSON.stringify(evt.geometry.toJson());
                this.buildSiteAddressGraphiclayer.add(graphic);
                drawToolbar.deactivate();
                //添加数据到输入框
                $(selector).find("input.longitude").val((JSON.parse(this.tempjsongeometry).x).toFixed(6));
                $(selector).find("input.latitude").val((JSON.parse(this.tempjsongeometry).y).toFixed(6));
            }.bind(this));
        }.bind(this))
    }

    bindSubmitEvent(selector) {
        selector.find(".additem-submit ").on("click", function () {
            var managerCompany = $(selector).find("input.constructionorganazition").val();//施工单位
            var type = $(selector).find("select.constructiontype").find("option:selected").attr("buildsiteid");//工地类型
            var manager = $(selector).find("input.managername").val();//施工负责人
            var managerPhone = $(selector).find("input.managertelephone").val();//施工负责人电话
            var superManagerCompany = $(selector).find("input.superiororganazition").val();//主管单位
            var superManager = $(selector).find("input.superiormanager").val();//主管人
            var address = $(selector).find("input.position").val();//施工地址
            var longitude = $(selector).find("input.longitude").val();//经度
            var latitude = $(selector).find("input.latitude").val();//纬度
            var buildsitewatchname = $(selector).find("input.buidsitewatchname").val();//工地监护名称
            var finderId = $(selector).find("select.finder").find("option:selected").attr("finderid");//工地发现人
            if (buildsitewatchname == "" || longitude == "" || latitude === "" || address == "" || type === undefined) {
                this.AppX.runtimeConfig.toast.Show("必填项未填写！");
            } else {
                var constructionInfo = [managerCompany, type, manager, managerPhone, superManagerCompany, superManager, address, longitude, latitude, buildsitewatchname, finderId];
                this.addBuildSiteInfo(constructionInfo);
            }
        }.bind(this))
    }

    bindCloseEvent(selector) {
        selector.find(".additem-close ").on("click", function () {
            this.addFloatpanel.close();
        }.bind(this))
    }




    //添加工地台账信息
    addBuildSiteInfo(constructionInfo) {
        var config = this.config.addBuildSiteInfo;
        var toast = this.AppX.runtimeConfig.toast;
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request,
            data: {
                "build_company_name": constructionInfo[0],
                "project_type_id": constructionInfo[1],
                "scene_charege_name": constructionInfo[2],
                "charege_phone": constructionInfo[3],
                "charge_company_name": constructionInfo[4],
                "charege_username": constructionInfo[5],
                "address": constructionInfo[6],
                "lng": constructionInfo[7],
                "lat": constructionInfo[8],
                "name": constructionInfo[9],
                "find_userid": constructionInfo[10]
            },
            success: function (result) {
                if (result.code !== 1) {
                    this.popup.ShowTip(result.messa);
                } else {
                    this.popup.Close();
                    toast.Show(config.MSG_success);
                    //关闭添加框
                    this.addFloatpanel.close();
                    this.domObj.find(" #toolbar button.toolbar[handletype='refresh']").trigger("click");
                }
            }.bind(this),
            error: function () {
                this.popup.ShowTip(config.MSG_error);
            },
            dataType: "json",
        });

    }

    //删除工地台账信息
    deleteBuildSiteInfo(buildeSiteId) {
        var config = this.config.deleteBuildSiteInfo;
        var toast = this.AppX.runtimeConfig.toast;
        for (var i = 0, length = buildeSiteId.length; i < length; i++) {
            var count = 0;//回调函数计算器
            $.ajax({
                headers: {
                    'Token': AppX.appConfig.xjxj,
                    'departmentid': AppX.appConfig.departmentid,
                },
                type: "POST",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request + "/" + buildeSiteId[i],
                data: {
                },
                success: function (result) {
                    if (result.code !== 1) {
                        toast.Show(result.message);
                    } else {
                        toast.Show(config.MSG_success);
                        //删除图标
                        this.domObj.find(" #toolbar button.toolbar[handletype='refresh']").trigger("click");

                    }
                }.bind(this),
                error: function () {
                    toast.Show(config.MSG_error);
                },
                dataType: "json",
            });
        }
    }

    /*修改工地台账信息*/

    //初始台账原数据
    initPreviousData(buildeSiteID, selector) {
        var config = this.config.initPreviousData;
        var toast = this.AppX.runtimeConfig.toast;
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request,
            data: {

                "pageindex": 1,
                "pagesize": 1000,
                "build_id": buildeSiteID
            },
            success: function (result) {
                var rows = result.result.rows[0];
                var chargeCompany = rows.build_company_name;//施工单位
                var constructionType = rows.project_type_name;//工地类型名称
                var typeId = rows.project_type_id;//工地类型id
                var chargerName = rows.scene_charege_name;//现场负责人姓名
                var chargerPhone = rows.charege_phone;//现场负责人电话
                var superiorCompany = rows.charge_company_name;//主管单位
                var superiorManager = rows.charege_username;//主管人
                var x = rows.lng;//经度
                var y = rows.lat;//纬度
                var name = rows.name;//工地监护名称
                var adress = rows.address;//工地地址
                var finderId = rows.find_userid;//发现人id
                $(selector).find("input.constructionorganazition").val(chargeCompany);//施工单位
                $(selector).find("select.constructiontype option[buildsiteid='" + typeId + "']").attr("selected", "selected");//工地类型
                $(selector).find("input.managername").val(chargerName);//施工负责人
                $(selector).find("input.managertelephone").val(chargerPhone);//施工负责人电话
                $(selector).find("input.superiororganazition").val(superiorCompany);//主管单位
                $(selector).find("input.superiormanager").val(superiorManager);//主管人
                $(selector).find("input.position").val(adress);//施工地址
                $(selector).find("input.longitude").val(x);//经度
                $(selector).find("input.latitude").val(y);//纬度
                $(selector).find("input.buidsitewatchname").val(name);//工地监护名称
                $(selector).find("select.finder option[finderid='" + finderId + "']").attr("selected", "selected");//工地类型
            },
            error: function () {
                toast.Show(config.MSG_error);
            },
            dataType: "json",
        });
    }

    //修改提交事件
    bindModifySubmitEvent(selector, buildeSiteID) {
        selector.find(".additem-submit").on("click", function () {
            var managerCompany = $(selector).find("input.constructionorganazition").val();//施工单位
            var type = $(selector).find("select.constructiontype").find("option:selected").attr("buildsiteid");//工地类型
            var manager = $(selector).find("input.managername").val();//施工负责人
            var managerPhone = $(selector).find("input.managertelephone").val();//施工负责人电话
            var superManagerCompany = $(selector).find("input.superiororganazition").val();//主管单位
            var superManager = $(selector).find("input.superiormanager").val();//主管人
            var address = $(selector).find("input.position").val();//施工地址
            var longitude = $(selector).find("input.longitude").val();//经度
            var latitude = $(selector).find("input.latitude").val();//纬度
            var buildsitewatchname = $(selector).find("input.buidsitewatchname").val();//工地监护名称
            var finderid = $(selector).find("select.finder option:selected").attr("finderid");//工地监护名称
            if (buildsitewatchname == "" || longitude == "" || latitude === "" || address == "" || type === undefined) {
                this.AppX.runtimeConfig.toast.Show("必填项未填写！");
            } else {
                var constructionInfo = [managerCompany, type, manager, managerPhone, superManagerCompany, superManager, address, longitude, latitude, buildsitewatchname, finderid];
                this.modifyBuildSiteInfo(constructionInfo, buildeSiteID);
            }
        }.bind(this));
    }


    //修改关闭事件
    bindModifyCloseEvent(selector, buildeSiteID) {
        selector.find(".additem-close ").on("click", function () {
            this.modifyFloatpanel.close();
        }.bind(this))
    }


    //调用接口进行工地数据更新
    modifyBuildSiteInfo(constructionInfo: Array<any>, buildeSiteID) {
        var config = this.config.modifyBuildSiteInfo;
        var toast = this.AppX.runtimeConfig.toast;
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request,
            data: {

                "build_company_name": constructionInfo[0],
                "project_type_id": constructionInfo[1],
                "scene_charege_name": constructionInfo[2],
                "charege_phone": constructionInfo[3],
                "charge_company_name": constructionInfo[4],
                "charege_username": constructionInfo[5],
                "address": constructionInfo[6],
                "lng": constructionInfo[7],
                "lat": constructionInfo[8],
                "name": constructionInfo[9],
                "find_userid": constructionInfo[10],
                "id": buildeSiteID

            },
            success: function (result) {
                if (result.code !== 1) {
                    toast.Show(result.message);
                } else {
                    this.popup.Close();
                    toast.Show(config.MSG_success);
                    //关闭修改框
                    this.modifyFloatpanel.close();
                    //更新图标属性
                    this.domObj.find(" #toolbar button.toolbar[handletype='refresh']").trigger("click");
                }
            }.bind(this),
            error: function () {
                this.popup.ShowTip(config.MSG_error);
            },
            dataType: "json",
        });
    }

    /*工地监护指派人员*/

    //指派监护人员
    initUserSelect(selector) {
        var config = this.config.initUserSelect;
        var toast = this.AppX.runtimeConfig.toast;
        // 初始化部门或者分组
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_departmentrequest,
            data: {
                "pageindex": config.Count_pageindex,
                "pagesize": config.Count_pagesize
            },
            success: function (result) {
                if (result.code !== 1) {
                    toast.Show(config.MSG_departmenterror);
                } else if (result.result.rows.length === 0) {
                    toast.Show(config.MSG_departmentnull);
                } else {
                    var rows = result.result.rows;
                    var html = "";
                    for (var i = 0, length = rows.length; i < length; i++) {
                        var departmentId = rows[i].id;
                        var departmentName = rows[i].name;
                        html += "<option  departmentid='" + departmentId + "'>" + departmentName + "</option>";
                    }
                    selector.find("select.department").append(html);
                    //
                    selector.find("select.department").bind("change", function (event) {
                        var departmentid = selector.find("select.department option:selected").attr("departmentid").trim();
                        selector.find("select.username option").remove();
                        $.ajax({
                            headers: {
                                'Token': AppX.appConfig.xjxj,
                                'departmentid': AppX.appConfig.departmentid,
                            },
                            type: "POST",
                            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_userrequest,
                            data: {
                                "depid": departmentid,
                                "pageindex": config.Count_pageindex,
                                "pagesize": config.Count_pagesize
                            },
                            success: function (result) {
                                if (result.code !== 1) {
                                    toast.Show(config.MSG_buildsiteerror);
                                } else if (result.result.rows.length === 0) {
                                    toast.Show(config.MSG_buildsitenull);
                                } else {
                                    var rows = result.result.rows;
                                    var html = "<option selected value=''> 请选择</option>";
                                    for (var i = 0, length = rows.length; i < length; i++) {
                                        var userId = rows[i].userid;
                                        var userName = rows[i].username;
                                        html += "<option  userid='" + userId + "'>" + userName + "</option>";
                                    }
                                    selector.find("select.username option").remove();
                                    selector.find("select.username").append(html);
                                }
                            },
                            error: function () {
                                toast.Show(config.MSG_buildsiteerror);
                            },
                            dataType: "json",
                        });
                    });

                    if (this.userType == "departmentadmin") {
                        $(selector).find("select.department option").attr("departmentid", function (index, val) {
                            if (val === AppX.appConfig.groupid) {
                                $(this).attr("selected", "selected")
                            }
                            return val;
                        });
                    }
                    selector.find("select.department").trigger("change");
                }
            }.bind(this),
            error: function () {
                toast.Show(config.MSG_departmenterror);
            },
            dataType: "json",
        });
    }

    assignBuildSiteWatcher(buildeSiteID, userID, watchingTime) {
        var config = this.config.assignBuildSiteWatcher;
        var toast = this.AppX.runtimeConfig.toast;
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request,
            data: {
                "build_id": buildeSiteID,
                "build_userid": userID,
                "assign_time": watchingTime
            },
            success: function (result) {
                if (result.code !== 1) {
                    toast.Show(result.message);
                } else {
                    toast.Show(config.MSG_success);
                    //更新列表
                    this.requestBuildingSiteInfo(this.requestHeader, this.requestData, this.initBuildingSiteList.bind(this));

                }
            }.bind(this),
            error: function () {
                this.popup.ShowTip(config.MSG_error);
            },
            dataType: "json",
        });

    }

    /*告知书、回报日志查看*/
    viewNotification(index) {
        //日志界面
        var data = this.tableBuildSiteList[index].getNotificationData();
        if (data.pictureData.length !== 0) {
            var template = _.template(this.template.split("$$")[11])({ photoData: data.pictureData, audioData: data.audioData });
            this.popup.setSize(600, 620);
            var Obj = this.popup.Show("告知书", template);
            $(".notification ul").viewer({
                title: 0,
                navbar: 1
            });
            //
            if (data.audioData.length === 0) {
                $(".notification ul").css("height", "100%");
            }
        } else {
            this.AppX.runtimeConfig.toast.Show("无告知书！");
        }



    }

    //查看回报记录
    viewBuildSiteInfo(viewBuildeSiteId) {
        var config = this.config.viewBuildSiteInfo;
        var toast = this.AppX.runtimeConfig.toast;
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request,
            data: {
                "build_id": viewBuildeSiteId,
                "pageindex": config.Count_pageindex,
                "pagesize": config.Count_pagesize
            },
            success: function (result) {
                if (result.code !== 1) {
                    toast.Show(result.message);
                } else if (result.result.rows[0].report.length === 0) {
                    toast.Show(config.MSG_loginnull);
                } else {
                    this.reportJournalList = [];
                    //添加回报记录
                    var reportRecord = result.result.rows[0].report;
                    var reportRecordHtml = "";
                    var carouselIndexHtml = this.template.split("$$")[5]
                    var reportRecordTemplate = this.template.split("$$")[6];
                    var reportRecordLength = reportRecord.length;//
                    for (var i = 0; i < reportRecordLength; i++) {
                        var haveSecuritySign = reportRecord[i].is_safemark;//是否有安全标识
                        var notification = reportRecord[i].is_notification;//是否有告知书
                        var leakGass = reportRecord[i].is_leak;//是否漏气
                        var isInSafeDistance = reportRecord[i].is_safedistance;//是否在安全距离之内
                        var pipeline = reportRecord[i].is_pipeline;//是否占压管线 
                        var reportTime = reportRecord[i].report_time;//回报时间
                        var reportPerson = reportRecord[i].report_username;// 回报人
                        var reportAddress = reportRecord[i].address;//回报地址
                        var reportPicture = reportRecord[i].file;//回报照片
                        var minReportPicture = reportRecord[i].file_thumb;//回报照片缩略图
                        var gaozhishu = reportRecord[i].gaozhishu;//告知书
                        var minGaozhishu = reportRecord[i].gaozhishu;//告知书缩略图
                        var notes = reportRecord[i].notes;//备注
                        var audio = reportRecord[i].file_audio;//语音
                        var reportRecordItem = new ReportJournal(haveSecuritySign, notification, isInSafeDistance, leakGass, pipeline, reportTime, reportPerson, reportAddress, minGaozhishu, gaozhishu, minReportPicture, reportPicture, notes, audio)
                        this.reportJournalList.push(reportRecordItem);
                    }
                    this.initReportRecord(this.reportJournalList);
                }
            }.bind(this),
            error: function () {
                toast.Show(config.MSG_loginerror);
            },
            dataType: "json",
        });
    }

    initReportRecord(reportJournalList: Array<ReportJournal>) {
        //日志界面
        var template = this.template.split('$$')[5];
        this.popup.setSize(600, 690);
        var Obj = this.popup.Show("回报日志(" + reportJournalList.length + ")", template);
        var innerWidgetHtml = "";
        var reportRecordTemplate = "";
        for (var i = 0, length = reportJournalList.length; i < length; i++) {
            var todayData = reportJournalList[i].getWidgetData();
            reportRecordTemplate = _.template(this.template.split("$$")[7])({ photoData: todayData[todayData.length - 1] });
            var reportRecordIndex = 0;
            var reportRecordTemplateReplace = reportRecordTemplate.replace(/%data/g, function () {
                return (reportRecordIndex < todayData.length) ? (todayData[reportRecordIndex++]) : "";
            });
            innerWidgetHtml += reportRecordTemplateReplace;
        }
        $("#XJBuildingSiteManage_report .reportContainer").append(innerWidgetHtml);
        //设置包含图片的ul宽度，用于横向查看图片
        $("#XJBuildingSiteManage_report .reportJournal-body ul").val(function (index, value) {
            var ulWidth = $(this).find("li").length * 162;
            $(this).css("width", ulWidth + "px");
            return value;
        });

        //设置备注、语音为空，不显示
        $("#XJBuildingSiteManage_report .bz textarea").val(function (index, value) {
            if (value == "") {
                $(this).parents(".bz").remove();
            }
            return value;
        });

        $("#XJBuildingSiteManage_report .yy div.reportaudio").val(function (index, value) {
            if ($(this).find("audio").length == 0) {
                $(this).parents(".yy").remove();
            }
            return value;
        });




        //查看具体照片
        $("#XJBuildingSiteManage_report ul").viewer({
            title: 0,
            // navbar: 0,
            show: function () {
                $(".reportJournal").addClass("viewerProblem");
            },
            hide: function () {
                $(".reportJournal").removeClass("viewerProblem");
            }
        });

        //确定按钮
        Obj.submitObj.off("click").on("click", function (event) {
            Obj.conObj.find(".btn-close").trigger("click");
        });

        //初始化日期控件
        $("#XJBuildingSiteManage_report .queryContainer input.startdate").jeDate({
            format: 'YYYY-MM-DD', //日期格式  
            isinitVal: true,
            maxDate: $.nowDate(0)
        });
        $("#XJBuildingSiteManage_report .queryContainer input.enddate").jeDate({
            format: 'YYYY-MM-DD', //日期格式  
            isinitVal: true,
            // minDate:  $.nowDate(-5),
            maxDate: $.nowDate(0),
            choosefun: function (elem, val) {
                var startDate = $("#XJBuildingSiteManage_report .queryContainer input.startdate").val();
                var startMin = new Date(startDate.split("-")[0], startDate.split("-")[1], startDate.split("-")[2]).getTime();//毫秒数
                var endMin = new Date(val.split("-")[0], val.split("-")[1], val.split("-")[2]).getTime();//毫秒数
                if (endMin < startMin) {
                    this.AppX.runtimeConfig.toast.Show("结束日期不能小于开始日期!");
                }
            }.bind(this)
        });

        //绑定日志查询事件
        $("#XJBuildingSiteManage_report .queryContainer button").on("click", function (e) {
            var startDate = $("#XJBuildingSiteManage_report .queryContainer input.startdate").val();
            var endDate = $("#XJBuildingSiteManage_report .queryContainer input.enddate").val();
            var startMin = new Date(startDate.split("-")[0], startDate.split("-")[1], startDate.split("-")[2]).getTime();//毫秒数
            var endMin = new Date(endDate.split("-")[0], endDate.split("-")[1], endDate.split("-")[2]).getTime();//毫秒数
            if (endMin < startMin) {
                return;
            }
            $("#XJBuildingSiteManage_report .reportContainer span.reporttime").text(function (index, value) {
                var reportTime = value.trim().split(" ")[0];
                var reportTimeMin = new Date(parseInt(reportTime.split("-")[0]), parseInt(reportTime.split("-")[1]), parseInt(reportTime.split("-")[2])).getTime();//毫秒数
                if (reportTimeMin < startMin || reportTimeMin > endMin) {
                    $(this).parents(".item").css("display", "none");
                } else {
                    $(this).parents(".item").css("display", "block");
                }
                return value;
            })
        });

    }


    /*工地结案*/

    //调用接口进行结案
    closeBuildSite(buildeSiteID, checkState, checkNote) {
        var config = this.config.closeBuildSite;
        var toast = this.AppX.runtimeConfig.toast;
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request,
            data: {
                "build_id": buildeSiteID,
                "check_state": parseInt(checkState),
                "check_note": checkNote
            },
            success: function (result) {
                if (result.code !== 1) {
                    toast.Show(result.message);
                } else {
                    toast.Show(config.MSG_success);
                    //更新图标属性
                    var allData = this.requestData;
                    allData.pagesize = 100000;
                    this.requestBuildingSiteInfo(this.requestHeader, allData, this.addAllBildSiteToMap.bind(this));
                    //更新列表
                    this.requestBuildingSiteInfo(this.requestHeader, this.requestData, this.initBuildingSiteList.bind(this));

                }
            }.bind(this),
            error: function () {
                this.popup.ShowTip(config.MSG_error);
            },
            dataType: "json",
        });
    }


}

class ReportJournal {
    haveSafeSignal: number;//是否有安全标志（0:否；1：是）
    notification: number;//是否发告知书
    inSafeDistance: number;//是否符合安全距离
    airLeak: number;//是否漏气
    occupyPipeline: number;//占压管线
    time: string;//回报时间
    reportWorker: string;//回报人
    address: string;//回报地址
    notes: string;//回报备注
    notificationPicture: string;//告知书照片
    minNotificationPicture: string;//告知书缩略图
    reportPicture: string;//回报照片
    minReportPictre: string;//回报照片缩略图
    audio: string;//回报语音
    constructor(haveSafeSignal, notification, inSafeDistance, airLeak, occupyPipeline, time, reportWorker, address, minNotificationPicture, notificationPicture, minReportPictre, reportPicture, notes, audio) {
        this.haveSafeSignal = haveSafeSignal;
        this.notification = notification;
        this.inSafeDistance = inSafeDistance;
        this.airLeak = airLeak;
        this.occupyPipeline = occupyPipeline;
        this.time = time;
        this.reportWorker = reportWorker;
        this.address = address;
        this.minNotificationPicture = minNotificationPicture;
        this.notificationPicture = notificationPicture;
        this.minReportPictre = minReportPictre;
        this.reportPicture = reportPicture;
        this.notes = notes;
        this.audio = audio;
    }

    /* */
    getWidgetData() {
        var data = [];
        var haveSecuritySign = (this.haveSafeSignal === 0) ? "否" : "是";//是否有安全标识
        var leakGass = (this.airLeak === 0) ? "否" : "是";//是否漏气
        var isInSafeDistance = (this.inSafeDistance === 0) ? "否" : "是";//是否在安全距离之内
        var pipeline = (this.occupyPipeline === 0) ? "否" : "是";//是否占压管线 
        //图片
        var reportPicture = [];
        if (this.reportPicture == "" || this.reportPicture == null) {
            reportPicture.push("/widgets/XJBuildingSiteManage/css/img/noPicture.png");
        } else {
            var reportPictureSrc = this.reportPicture.trim().split(",");
            for (var i = 0, length = reportPictureSrc.length; i < length; i++) {
                var pictureSrc = AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + reportPictureSrc[i];//回报照片
                reportPicture.push(pictureSrc);
            }
        }
        //音频
        var reportAudioHtml = "";
        if (this.audio == "" || this.audio == null) {
            reportAudioHtml = "无";
        } else {
            var reportAudioSrc = this.audio.trim().split(",");
            for (var i = 0, length = reportAudioSrc.length; i < length; i++) {
                var aduioSrc = AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + reportAudioSrc[i];//回报照片
                reportAudioHtml += "<audio controls='controls' preload='auto' src='" + aduioSrc + "'/>"
            }
        }

        data = [this.reportWorker, this.time, this.address, haveSecuritySign, isInSafeDistance, pipeline, leakGass, this.notes, reportAudioHtml, reportPicture];
        return data;
    }


}
/*工地台账类 */
class BuildSite {
    //台账信息
    id: string;//唯一标识
    name: string;//工地监护名称
    watchingState: number;//监护状态(0:待指派;1:监护中;2:监护完成;3:已结案)
    buildSiteState: number;//工地状态（0:施工中;1：施工完成）
    watcher: string;//监护人
    _watchingTIme: string;//开始监护时间
    createTime: string;//创建时间
    finishTime: string;//结案时间
    _noWatchTime: string;//未监护时间
    _watchTimeSpan: string;//监护时长
    //工地信息
    buildSiteType: string;//工地类型
    longitude: number;//经度
    latitude: number;//纬度
    address: string;//工地地址
    managerCompany: string;//施工单位
    manager: string;//负责人
    managerPhone: string;//负责人电话
    superManager: string;//建设单位
    superManagerCompany: string;//建设单位负责人
    notification;//告知书
    _finder: string;//工地发现人（巡检人员）
    _findAduio: string;//发现工地 上传的音频
    _gzsAduio;//上传告知书上传的音频
    //回报日志
    reportJournal;//回报日志
    reportTime: string;//最后回报时间
    //审核信息
    _checkState: number;
    _checkNotes: string;
    //公司,部门信息
    _companyId: number;
    companyName: string;//燃气公司名称
    companyDectionary: Array<any>;
    _departmentName: string;//部门名称

    constructor(id, name, watchingState, buildSiteState, watcher, watchingTime, createTime, finishTime, watchTimeSpan, noWatchTime, buildSiteType, longitued, latitude, address, managerCompany, manager, managerPhone, surperManager, superManagerCompany, notification, reportJournal, checkstate, notes, finder, companyId, companyDectionary, departmentName, findAudio, gzsAduio) {
        this.id = id;
        this.name = name;
        this.watchingState = watchingState;
        this.buildSiteState = buildSiteState;
        this.watcher = watcher;
        this.createTime = createTime;
        this.finishTime = finishTime;
        this._noWatchTime = noWatchTime;
        this.buildSiteType = buildSiteType;
        this.longitude = longitued;
        this.latitude = latitude;
        this.address = address;
        this.managerCompany = managerCompany;
        this.manager = manager;
        this.managerPhone = managerPhone;
        this.superManager = surperManager;
        this.superManagerCompany = superManagerCompany;
        this.notification = notification;
        this.reportJournal = reportJournal;
        this._checkNotes = notes;
        this._checkState = checkstate;
        this._finder = finder;
        this._companyId = companyId;
        this.companyDectionary = companyDectionary;
        this._departmentName = departmentName;
        this._findAduio = findAudio;
        this._gzsAduio = gzsAduio;
        this._watchingTIme = watchingTime;
        this._watchTimeSpan = watchTimeSpan;
        this.getCompanyName();
    }

    private getCompanyName() {
        for (var i = 0; i < this.companyDectionary.length; i++) {
            if (this._companyId == this.companyDectionary[i].id) {
                this.companyName = this.companyDectionary[i].name;
            }
        }
    }

    public getGraphicData() {
        var data = [];
        var subLlongitude = this.longitude.toFixed(4);
        var subLatitude = this.latitude.toFixed(4);
        var buildsiteState = "";
        if (this.buildSiteState == 0) {
            buildsiteState = "施工中";
        } else {
            buildsiteState = "施工完成";
        }
        var checkState = "";
        if (this._checkState = 2) {
            checkState = "待结案";
        } else if (this._checkState = 1) {
            checkState = "同意";
        } else if (this._checkState = 2) {
            checkState = "不同意";
        }
        //处理语音
        var findAudio = "";
        if (this._findAduio !== "" && this._findAduio !== null) {
            var findAudioSrc = this._findAduio.split(",");
            for (var i = 0; i < findAudioSrc.length; i++) {
                var aduioSrc = AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + findAudioSrc[i];//回报照片
                findAudio += "<audio controls='controls' preload='auto' src='" + aduioSrc + "'/>"
            }
        } else {
            findAudio = "无"
        }
        data = [this.superManagerCompany, this.superManager, this.managerCompany, this.manager, this.managerPhone, this.address, this.buildSiteType, subLlongitude, subLatitude, this.name, this.watcher, this._finder, buildsiteState, checkState, this._checkNotes, findAudio];
        return data;
    }

    public getTableData() {
        var data = [];

        var watchingState = "";//监护状态状态
        if (this.watchingState === 0) {
            watchingState = "待指派";
        } else if (this.watchingState === 1) {
            watchingState = "监护中";
        } else if (this.watchingState === 2) {
            watchingState = "监护完成";
        } else if (this.watchingState === 3) {
            watchingState = "已结案";
        }
        var buildSiteState = "";//工地状态
        if (this.buildSiteState == 0) {
            buildSiteState = "施工中";
        } else if (this.buildSiteState == 1) {
            buildSiteState = "施工完成";
        }
        var reportPerson = "-"; //回报人姓名
        var reportTime = "-";
        if (this.reportJournal.length !== 0) {
            reportPerson = this.reportJournal[0].report_username;
            reportTime = this.reportJournal[0].report_time;
        }
        var creatTime = this.createTime;//创建时间
        var closeTime = this.finishTime !== null ? this.finishTime : '--------';//结案时间
        //工地是否监护
        var noWatch = 'no';
        var createTimeMillSecond = new Date(parseInt(reportTime.split("-")[0]), parseInt(reportTime.split("-")[1]) - 1, parseInt(reportTime.split("-")[2])).getTime();
        var nowYear = new Date().getFullYear();
        var nowMoth = new Date().getMonth();
        var nowDate = new Date().getDate();
        var todayMillSecond = new Date(nowYear, nowMoth, nowDate).getTime();//毫秒数
        if (todayMillSecond !== createTimeMillSecond && this.watchingState == 1) {
            noWatch = "yes";
        }




        var notification = "查看";
        if (this.notification === null || Object.prototype.toString.call(this.notification) === '[object  Array]' && this.notification.length == 0) {
            notification = "无";
        }

        var checkReport = "详情";
        if (this.reportJournal === null || this.reportJournal.length === 0) {
            checkReport = "无";
        }

        data = [this.id, this.longitude, this.latitude, noWatch, this.companyName, this.companyName, this.name, this.name,
        this.watcher, this.watcher, watchingState, watchingState, buildSiteState, buildSiteState,
        this.address, this.address, this.buildSiteType, this.buildSiteType, creatTime, creatTime, reportTime, reportTime,
        (parseInt(this._watchTimeSpan) / 60) + "分", (parseInt(this._watchTimeSpan) / 60) + "分", this._noWatchTime, this._noWatchTime, notification, checkReport];
        return data;
    }
    public getOneCompanyTableData() {
        var data = [];
        var watchingState = "";//监护状态状态
        if (this.watchingState === 0) {
            watchingState = "待指派";
        } else if (this.watchingState === 1) {
            watchingState = "监护中";
        } else if (this.watchingState === 2) {
            watchingState = "监护完成";
        } else if (this.watchingState === 3) {
            watchingState = "已结案";
        }
        var buildSiteState = "";//工地状态
        if (this.buildSiteState == 0) {
            buildSiteState = "施工中";
        } else if (this.buildSiteState == 1) {
            buildSiteState = "施工完成";
        }
        var reportPerson = "-"; //回报人姓名
        var reportTime = "-";
        if (this.reportJournal.length !== 0) {
            reportPerson = this.reportJournal[0].report_username;
            reportTime = this.reportJournal[0].report_time;
        }
        var creatTime = this.createTime;//创建时间
        var closeTime = this.finishTime !== null ? this.finishTime : '--------';//结案时间
        var noWatch = 'no';
        var nowTime = new Date();
        var moth = (nowTime.getMonth() + 1);
        var mothStr = "'" + moth + "'";
        if (moth < 10) {
            mothStr = "0" + moth;
        }
        var todayDate = nowTime.getFullYear() + "-" + mothStr + "-" + nowTime.getDate();
        var reg = new RegExp(todayDate);
        if (!reg.test(reportTime) && this.watchingState == 1) {
            noWatch = "yes";
        }
        var notification = "查看";
        if (this.notification === null || Object.prototype.toString.call(this.notification) === '[object  Array]' && this.notification.length == 0) {
            notification = "无";
        }

        var checkReport = "详情";
        if (this.reportJournal === null || this.reportJournal.length === 0) {
            checkReport = "无";
        }

        data = [this.id, this.longitude, this.latitude, noWatch, this.name, this.name, this._departmentName, this._departmentName,
        this.watcher, this.watcher, watchingState, watchingState, buildSiteState, buildSiteState,
        this.address, this.address, this.buildSiteType, this.buildSiteType, creatTime, creatTime, reportTime, reportTime,
        this._noWatchTime, this._noWatchTime, notification, checkReport];
        return data;
    }

    public getNotificationData() {
        var data = {
            pictureData: [],
            audioData: []
        };
        if (this.notification !== null) {
            for (var i = 0, length = this.notification.length; i < length; i++) {
                var imgSrc = AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + this.notification[i].filename;
                data.pictureData.push(imgSrc);
            }
        }
        if (this._gzsAduio !== null && this._gzsAduio.length != 0) {
            for (var i = 0, length = this._gzsAduio.length; i < length; i++) {
                var imgSrc = AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + this._gzsAduio[i].filename;
                data.audioData.push(imgSrc);
            }
        }
        return data;
    }


    public getCsvData() {
        var data = [];

        var watchingState = "";//监护状态状态
        if (this.watchingState === 0) {
            watchingState = "待指派";
        } else if (this.watchingState === 1) {
            watchingState = "监护中";
        } else if (this.watchingState === 2) {
            watchingState = "监护完成";
        } else if (this.watchingState === 3) {
            watchingState = "已结案";
        }
        var buildSiteState = "";//工地状态
        if (this.buildSiteState == 0) {
            buildSiteState = "施工中";
        } else if (this.buildSiteState == 1) {
            buildSiteState = "施工完成";
        }
        var reportPerson = "-"; //回报人姓名
        var reportTime = "-";
        if (this.reportJournal.length !== 0) {
            reportPerson = this.reportJournal[0].report_username;
            reportTime = this.reportJournal[0].report_time;
        }
        var creatTime = this.createTime;//创建时间
        var closeTime = this.finishTime !== null ? this.finishTime : '--------';//结案时间


        var notification = "查看";
        if (this.notification === null || Object.prototype.toString.call(this.notification) === '[object  Array]' && this.notification.length == 0) {
            notification = "无";
        }

        var checkReport = "详情";
        if (this.reportJournal === null || this.reportJournal.length === 0) {
            checkReport = "无";
        }

        data = [this.companyName, this.name, this.watcher, watchingState, buildSiteState, this.address, this.buildSiteType, creatTime, reportTime,
        this._noWatchTime, notification, checkReport];
        return data;
    }

    public getOneCsvData() {
        var data = [];
        data = [this.managerCompany, this.buildSiteType, this.manager, this.managerPhone, this.superManagerCompany, this.superManager, this.address, this.longitude, this.latitude, this.name, this.watcher, this._departmentName,
        this._watchingTIme];
        return data;
    }

}

/*请求接口类 */
class Interface {
    header;
    data;
    callBack;
    constructor() {

    }

}
