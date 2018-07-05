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

declare var Howl;

export = HiddenDangerGrading;

class HiddenDangerGrading extends BaseWidget {
    baseClass = "widget-hiddendangergrading";
    map = null;
    toast = null;
    popup = null;
    photowall = null;

    totalpage = 1;
    currentpage = 1;
    currentpagesize = 25;
    currentpage_icon = 1;
    currentpagesieze_icon = 30;
    curenthiddendangertypeid = "";
    trouble_typeid = "";
    pdaid = "";
    userid = "";
    padname = "";
    username = "";
    depid = "";

    // state = "";
    process_id = "2";

    // handle_state = "";
    // handle_trouble_clear = "";
    hiddendangergrading_clusterLayer_hiddendanger = null;//数据库中的隐患
    curpage = null;

    showtype = 0;//0列表模式，1图标模式

    curhiddendangerid = "";


    print_address = "";
    print_describe = "";
    print_xjry = "";
    print_uploadtime = "";


    strclass = "";
    straqyhlnr = "";


    startup() {
        this.configure();
        this.initHtml();
        this.initEvent();
    }
    initHtml() {
        var html = _.template(this.template.split('$$')[0] + "</div>")({ depid: AppX.appConfig.groupid });
        // var html = _.template(this.template.split('$$')[0])();
        this.setHtml(html);
        this.ready();
        this.showLoading();
        // this.getHiddenDanger(this.config.pagenumber, this.config.pagesize, this.trouble_typeid, this.pdaid, this.userid, this.handle_state, this.handle_trouble_clear);
        this.getHiddenDanger(this.config.pagenumber, this.config.pagesize, this.trouble_typeid, this.pdaid, this.depid, this.userid, this.process_id);
    }

    configure() {
        this.toast = this.AppX.runtimeConfig.toast;
        this.popup = this.AppX.runtimeConfig.popup;
        this.photowall = this.AppX.runtimeConfig.photowall;
        this.map = this.AppX.runtimeConfig.map;
        this.depid = AppX.appConfig.groupid;
    }



    initEvent() {
        var that = this;

        //查询按钮单击事件
        this.domObj.find('.btn-search').off("click").on("click", function () {
            this.trouble_typeid = this.domObj.find(".trouble_typeid").val();

            this.pdaid = this.domObj.find(".pdaid option:selected").val()

            this.userid = this.domObj.find(".username").val();

            this.username = this.domObj.find(".username").val();

            if (AppX.appConfig.groupid == "") {
                this.depid = this.domObj.find(".dep").val();
            }

            this.handle_state = this.domObj.find(".handle_state").val();
            this.handle_trouble_clear = this.domObj.find(".handle_trouble_clear").val();
            if (this.trouble_typeid == '' && this.pdaid == '' && this.handle_userid == '') {
                // name.addClass('has-error');
                // name.attr("placeholder", "不能为空！");
                // this.toast.Show("请输入查询条件！");
                // return;
            }
            if (this.showtype == 0) {
                this.showLoading();
                this.getHiddenDanger(this.config.pagenumber, this.currentpagesieze || this.config.pagesize, this.trouble_typeid, this.pdaid, this.depid, this.userid, this.process_id);

            } else {
                this.showLoading();
                this.getHiddenDanger_icon(this.config.pagenumber_icon, this.config.pagesize_icon, this.trouble_typeid, this.pdaid, this.depid, this.userid, this.process_id);
            }

        }.bind(this));


        this.domObj.find('.save2csv').off("click").on("click", function () {
            Save2File(this.curpage);
            //查询出所有数据
        }.bind(this));

        this.domObj.find('.trouble_typeid').on("change", function () {
            var hideDangerName = $(event.currentTarget).find("option:selected").text();
            $(event.currentTarget).attr("title", hideDangerName);

        }.bind(this));


        this.domObj.find('.dep').on("change", function () {
            //根据部门重新筛选用户
            this.depid = this.domObj.find('.dep option:selected').val();
            this.userid = "";
            // this.username = "";
            this.getUser();
        }.bind(this));

        // 选中行高亮
        this.domObj.off("click").on('click', 'tbody tr', (e) => {
            if ($(e.currentTarget).data("id") == null) { return; }
            this.domObj.find('tr.active').removeClass('active');
            $(e.currentTarget).addClass('active');
            var mapPoint = new Point($(e.currentTarget).data("location_longitude"), $(e.currentTarget).data("location_latitude"), new SpatialReference({ wkid: that.map.spatialReference.wkid }));
            this.map.centerAndZoom(mapPoint, 11);


        });

        //图标模式
        this.domObj.find('.btn_icon').off("click").on("click", function () {
            this.showtype = 1;
            var preheight = this.domObj.find(".halfpaneltable").height();
            //进入图标模式
            //查询当前用户具体的任务安排
            this.domObj.empty();
            var html = _.template(this.template.split('$$')[1])({ depid: AppX.appConfig.groupid });

            this.domObj.append(html);
            this.initEvent();
            //查询图片
            this.showLoading();
            this.getHiddenDanger_icon(this.config.pagenumber_icon, this.config.pagesize_icon, this.trouble_typeid, this.pdaid, this.depid, this.userid, this.process_id);
            //  this.getHiddenDanger_icon(this.config.pagenumber, this.config.pagesize, this.trouble_typeid, this.pdaid, this.userid, this.handle_state, this.handle_trouble_clear);
            this.domObj.find(".halfpaneltable").height(preheight);
            // this.getPeriod();

        }.bind(this));

        //列表模式
        this.domObj.find('.btn_list').off("click").on("click", function () {
            this.showtype = 0;
            var preheight = this.domObj.find(".halfpaneltable").height();
            this.domObj.empty();
            var html = _.template(this.template.split('$$')[0] + "</div>")({ depid: AppX.appConfig.groupid });
            // var html = _.template(this.template.split('$$')[0])();
            // this.setHtml(html);
            this.domObj.append(html);
            this.initEvent();
            // this.ready();
            this.showLoading();
            this.getHiddenDanger(this.config.pagenumber, this.currentpagesize, this.trouble_typeid, this.pdaid, this.depid, this.userid, this.process_id);

            this.domObj.find(".dynamic_pagesize").val(this.currentpagesieze);

            this.domObj.find(".halfpaneltable").height(preheight);
        }.bind(this));



        //动态生成书签及分页控件
        //分页控件fykj 向前、向后事件
        this.domObj.find(".pre").off("click").on("click", function () {

            if (this.currentpage - 1 > 0) {
                that.map.infoWindow.hide();
                //清空图层

                if (this.hiddendangergrading_clusterLayer_hiddendanger) {
                    this.hiddendangergrading_clusterLayer_hiddendanger.clear();
                }
                this.currentpage = this.currentpage - 1;
                this.showLoading();
                this.getHiddenDanger(this.currentpage, this.config.pagesize, this.trouble_typeid, this.pdaid, this.depid, this.userid, this.process_id);

            }


        }.bind(this));
        this.domObj.find(".next").off("click").on("click", function () {

            if (this.currentpage + 1 <= this.totalpage) {
                that.map.infoWindow.hide();
                //清空图层
                if (this.hiddendangergrading_clusterLayer_hiddendanger) {
                    this.hiddendangergrading_clusterLayer_hiddendanger.clear();
                }
                this.currentpage = this.currentpage + 1;
                this.showLoading();
                this.getHiddenDanger(this.currentpage, this.config.pagesize, this.trouble_typeid, this.pdaid, this.depid, this.userid, this.process_id);
            }
        }.bind(this));

        this.domObj.find(".pageturning").off("click").on("click", function () {
            var currpage = parseInt(this.domObj.find(".currpage").val());
            if (currpage <= this.totalpage && currpage >= 1) {
                that.map.infoWindow.hide();
                //清空图层
                if (this.hiddendangergrading_clusterLayer_hiddendanger) {
                    this.hiddendangergrading_clusterLayer_hiddendanger.clear();
                }
                this.currentpage = parseInt(this.domObj.find(".currpage").val());
                this.showLoading();
                this.getHiddenDanger(this.currentpage, this.config.pagesize, this.trouble_typeid, this.pdaid, this.depid, this.userid, this.process_id);
            }
        }.bind(this));


        this.domObj.find(".dynamic_pagesize").off("change").on("change", function () {
            //清空图层
            if (this.hiddendangergrading_clusterLayer_hiddendanger) {
                this.hiddendangergrading_clusterLayer_hiddendanger.clear();
            }
            //重新查询
            this.currentpagesize = parseInt(this.domObj.find(".dynamic_pagesize").val());
            this.showLoading();
            this.getHiddenDanger(this.config.pagenumber, this.currentpagesize, this.trouble_typeid, this.pdaid, this.depid, this.userid, this.process_id);
            this.domObj.find(".halfpaneltable").height(this.domObj.find(".halfpaneltable").height());
        }.bind(this));




    }




    getHiddenDanger(pagenumber, pagesize, trouble_typeid, pdaid, depid, userid, process_id) {
        this.currentpage = pagenumber || this.config.pagenumber;
        this.currentpagesize = pagesize || this.config.pagesize;
        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
                // 'range': AppX.appConfig.range,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getHiddenDangerList,
            data: {
                "pageindex": this.currentpage || this.config.pagenumber,
                "pagesize": this.currentpagesize || this.config.pagesize,
                "trouble_typeid": trouble_typeid,
                "pdaid": pdaid,
                "userid": userid,
                "depid": depid,
                // "state": state,
                "process_id": process_id,

                // "handle_trouble_clear": handle_trouble_clear,
                // "handle_state": handle_state,
                // "level_state": 0,
                // "handle_trouble_clear": 0,
                // "level_check_state": level_check_state,
                // "ischeck": 1,
                // f: "pjson"
            },
            success: this.getHiddenDangerListCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
                this.hideLoading();
            }.bind(this),
            dataType: "json",
        });
    }

    getHiddenDangerListCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("查询隐患信息出错！");
            console.log(results.message);
            return;
        }
        if (results.result.total % this.currentpagesize == 0) {
            this.totalpage = Math.floor(parseInt(results.result.total) / this.currentpagesize);

        } else {
            this.totalpage = Math.floor(parseInt(results.result.total) / this.currentpagesize) + 1;

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
        var domtb = this.domObj.find(".addhiddendanger")
        domtb.empty();
        var address;
        var html_trs_data = "";
        var handlestate = "";
        var hanletroubleclear = "";
        var operation = "";
        $.each(results.result.rows, function (i, item) {

            handlestate = "";
            hanletroubleclear = "";
            operation = "";
            // if (item.handle_state == 0) {
            //     handlestate = "未处理";
            //     operation = "处理";
            // } else if (item.handle_state == 1) {
            //     handlestate = "已处理";
            //     operation = "详情";
            // }
            // if (item.handle_trouble_clear == 0) {
            //     hanletroubleclear = "未清除";
            // } else if (item.handle_trouble_clear == 1) {
            //     hanletroubleclear = "已清除";
            // }

            var describle = item.handle_before_notes;
            if (item.handle_before_notes.length > 15) {
                describle = item.handle_before_notes.substring(0, 15) + "...";
            }




            html_trs_data += "<tr class=goto  data-id='" + item.id + "' data-location_longitude='" + item.location_longitude + "' data-location_latitude='" + item.location_latitude + "' data-address='" + item.address + "' data-notes='" + item.handle_before_notes + "' data-uploadtime='" + item.uploadtime + "' data-handle_state='" + item.handle_state + "' data-level_check_note='" + item.level_check_note + "' data-level_name='" + item.level_name + "' data-level3_name='" + item.level3_name + "' data-handle_trouble_clear='" + item.handle_trouble_clear + "' data-trouble_typeid='" + item.trouble_typeid + "' data-username='" + item.username + "' data-padid='" + item.padid + "' data-handle_username='" + item.handle_username + "' data-level3_name='" + item.level3_name + "' data-yhfx='" + item.yhfx + "' data-yhqc='" + item.yhqc + "'   data-yhqyp='" + item.yhqyp + "'><td>" + item.trouble_type_name + "</td><td title='" + item.handle_before_notes + "'>" + describle + "</td><td>" + item.username + "</td><td>" + item.address + "</td><td>" + item.uploadtime + "</td><td><a class='operation' data-id='" + item.id + "'  data-trouble_typeid='" + item.trouble_typeid + "'  data-location_longitude='" + item.location_longitude + "' data-location_latitude='" + item.location_latitude + "' data-address='" + item.address + "' data-notes='" + item.handle_before_notes + "' data-uploadtime='" + item.uploadtime + "' data-handle_state='" + item.handle_state + "' data-level_check_note='" + item.level_check_note + "' data-level_name='" + item.level_name + "' data-level_username='" + item.level_username + "' data-handle_trouble_clear='" + item.handle_trouble_clear + "' data-equid_name='" + item.equid_name + "' data-trouble_type_name='" + item.trouble_type_name + "' data-device_type_name='" + item.device_type_name + "' data-username='" + item.username + "' data-padid='" + item.padid + "' data-handle_username='" + item.handle_username + "' data-level_username='" + item.level_username + "'  data-level_time='" + item.level_time + "' data-level_check_time='" + item.level_check_time + "' data-level_check_username='" + item.level_check_username + "' data-yhfx='" + item.yhfx + "' data-yhqc='" + item.yhqc + "'  data-yhqyp='" + item.yhqyp + "'>定级</a></td></tr>";
            //刷新infowindow
            // this.setContent(item);
        }.bind(this));
        domtb.append(html_trs_data);


        var html_trs_blank = "";
        if (results.result.rows.length < that.config.pagesize) {
            var num = that.config.pagesize - results.result.rows.length;
            for (var i = 0; i < num; i++) {
                html_trs_blank += "<tr class=goto data-id='null'><td></td><td></td><td></td><td></td><td></td><td></td></tr>";
            }
            domtb.append(html_trs_blank);
        }


        //申明操作事件
        // var that=this;
        this.domObj.find(".operation").off("click").on("click", function (e) {

            var j = 0;
            if ($(e.currentTarget).data("id") == null) {
                return;
            } else {
                this.curhiddendangerid = $(e.currentTarget).data("id");
            }
            //0，未处理，则处理；1，已处理，则详情


            this.domObj.find('tr.active').removeClass('active');
            $(e.currentTarget).addClass('active');
            //定位
            var mapPoint = new Point($(e.currentTarget).data("location_longitude"), $(e.currentTarget).data("location_latitude"), new SpatialReference({ wkid: this.map.spatialReference.wkid }));


            // var popup = new Popup({
            //     fillSymbol: new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
            //         new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
            //             new Color([255, 0, 0]), 2), new Color([255, 255, 0, 0.25]))
            // }, document.createElement("div"));

            // popup.setMap(this.map);
            // popup.setTitle("<div class='HiddenDangerGrading-id'>标题</div>");

            var note = $(e.currentTarget).data("notes");
            if (note.length > 100) {
                // note = note.substring(0, 15) + "...";
                note = "<div class='bz'>" + note + "</div>";
            }

            //临时数据
            var ls_Caption = $(e.currentTarget).data("address");
            var ls_address = $(e.currentTarget).data("address");
            var ls_notes = note;
            var ls_uploadtime = $(e.currentTarget).data("uploadtime");
            var ls_level_check_note = $(e.currentTarget).data("level_check_note");
            var ls_level_name = $(e.currentTarget).data("level_name");
            var ls_level_username = $(e.currentTarget).data("level_username");

            var ls_level_time = $(e.currentTarget).data("level_time");
            var ls_level_check_time = $(e.currentTarget).data("level_check_time");
            var ls_level_check_username = $(e.currentTarget).data("level_check_username");

            var ls_Handle_trouble_clear = handle_trouble_clear;
            var ls_trouble_type_name = $(e.currentTarget).data("trouble_type_name");
            var ls_device_type_name = $(e.currentTarget).data("device_type_name");
            var ls_username = $(e.currentTarget).data("username");
            var ls_Equid = $(e.currentTarget).data("padid");
            var ls_Handle_username = $(e.currentTarget).data("handle_username");





            var handle_state = "";
            var level1_name = "无";
            var level2_name = "无";
            var level3_name = "无";
            var handle_trouble_clear = "";
            if ($(e.currentTarget).data("handle_state") == 0) {
                handle_state = "未处理";

            } else {
                handle_state = "已处理";
                level1_name = $(e.currentTarget).data("level1_name");
                level2_name = $(e.currentTarget).data("level2_name");
                level3_name = $(e.currentTarget).data("level3_name");

            }
            if ($(e.currentTarget).data("handle_trouble_clear") == 0) {
                handle_trouble_clear = "未清除";
            } else {
                handle_trouble_clear = "已清除";

            }

            //处理照片
            var stryhfx = "";
            if ($(e.currentTarget).data("yhfx") != "") {
                if ($(e.currentTarget).data("yhfx").indexOf(',') >= 0) {
                    $(e.currentTarget).data("yhfx").split(',').forEach(
                        i => stryhfx += "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "' alt='" + $(e.currentTarget).data("address") + "'/>"
                    );
                } else {
                    stryhfx = "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + $(e.currentTarget).data("yhfx") + "' alt='" + $(e.currentTarget).data("address") + "'/>";
                }

            } else {
                // stryhfx = "无";
                stryhfx = "<image src='" + this.config.ZanWuTuPian + "'/>";

            }


            //viewer控件
            stryhfx = "";
            if ($(e.currentTarget).data("yhfx") != "") {
                if ($(e.currentTarget).data("yhfx").indexOf(',') >= 0) {
                    $(e.currentTarget).data("yhfx").split(',').forEach(
                        i => stryhfx += "<li><image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "' alt='" + $(e.currentTarget).data("address") + "'/></li>"
                    );

                } else {
                    stryhfx = "<li><image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + $(e.currentTarget).data("yhfx") + "' alt='" + $(e.currentTarget).data("address") + "'/></li>";
                }
            } else {
                // stryhfx = "暂无图片";
                stryhfx = "<li><image src='" + this.config.ZanWuTuPian + "'/></li>";
            }

            stryhfx = "  <ul id='pictureshow' >" + stryhfx + "</ul>"


            var stryhqc = "";
            if ($(e.currentTarget).data("yhqc") != "") {
                if ($(e.currentTarget).data("yhqc").indexOf(',') >= 0) {
                    $(e.currentTarget).data("yhqc").split(',').forEach(
                        i => stryhqc += "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "' alt='" + $(e.currentTarget).data("address") + "'/>"
                    );
                } else {
                    stryhqc = "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + $(e.currentTarget).data("yhqc") + "' alt='" + $(e.currentTarget).data("address") + "'/>";
                }
            } else {
                // stryhqc = "无";
                stryhqc = "<image src='" + this.config.ZanWuTuPian + "'/>";
            }

            //处理音频

            // var stryhqyp = "";
            // if ($(e.currentTarget).data("yhqyp") != "") {
            //     if ($(e.currentTarget).data("yhqyp").indexOf(',') >= 0) {
            //         $(e.currentTarget).data("yhqyp").split(',').forEach(
            //             i => stryhqyp += "<image class='hiddedangerinfo_audio'  src='./widgets/HiddenDangerGrading/images/audio.png' data-yhqyp='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "'/>"
            //         );
            //     } else {
            //         stryhqyp = "<image class='hiddedangerinfo_audio' src='./widgets/HiddenDangerGrading/images/audio.png' data-yhqyp='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + $(e.currentTarget).data("yhqyp") + "'/>";
            //     }

            // } else {
            //     // stryhqyp = "无";
            //     stryhqyp = "";
            // }

            var stryhqyp = "";
            if ($(e.currentTarget).data("yhqyp") != "") {
                if ($(e.currentTarget).data("yhqyp").indexOf(',') >= 0) {
                    $(e.currentTarget).data("yhqyp").split(',').forEach(
                        i => stryhqyp += "<audio controls='controls' preload='auto'  src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "'/>"
                    );
                    stryhqyp = "<div  class='yy'>" + stryhqyp + "</div>";
                } else {
                    stryhqyp = "<audio class='one' controls='controls' preload='auto' src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + $(e.currentTarget).data("yhqyp") + "'/>";
                }
            } else {
                // stryhqyp = "无";
                stryhqyp = "";
            }


            //查询隐患分类定级表

            $.ajax({
                headers: {
                    // 'Authorization-Token': AppX.appConfig.xjxj
                    'Token': AppX.appConfig.xjxj,
                    'departmentid': AppX.appConfig.departmentid,
                },
                type: "POST",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getHiddenDangerGradigTableList,
                data: {
                    "pageindex": this.config.pagenumber,
                    "pagesize": 1000 || this.config.pagesize,
                    "trouble_type_id": $(e.currentTarget).data("trouble_typeid")
                    // f: "pjson"
                },
                success: function (results) {
                    if (results.code != 1) {
                        that.toast.Show(results.message);
                        console.log(results.message);
                        return;
                    }

                    //content
                    that.straqyhlnr = "";
                    that.strclass = "";
                    $.each(results.result.rows, function (i, item) {
                        that.straqyhlnr += " <option value='" + item.levelid + "'>" + item.content + "</option>";

                        that.strclass += " <option value='" + item.levelid + "'>" + item.level_name + "</option>";

                    }.bind(that));


                    var info = "";
                    // if ($(e.currentTarget).data("level_name") == "") {
                    // ls_level_name
                    if (ls_level_name == "") {
                        //未审核
                        info = _.template(that.template.split('||')[1])({
                            // "Caption": $(e.currentTarget).data("address"),
                            // "address": $(e.currentTarget).data("address"),
                            // "notes": $(e.currentTarget).data("notes"),
                            // "uploadtime": $(e.currentTarget).data("uploadtime"),
                            // "Handle_trouble_clear": handle_trouble_clear,
                            // "trouble_type_name": $(e.currentTarget).data("trouble_type_name"),
                            // "username": $(e.currentTarget).data("username"),
                            // "Equid": $(e.currentTarget).data("padid"),
                            // "Handle_username": $(e.currentTarget).data("handle_username"),
                            "Caption": ls_Caption,
                            "address": ls_address,
                            "notes": ls_notes,
                            "uploadtime": ls_uploadtime,
                            "Handle_trouble_clear": handle_trouble_clear,
                            "trouble_type_name": ls_trouble_type_name,
                            "device_type_name": ls_device_type_name,
                            "username": ls_username,
                            "Equid": ls_Equid,
                            "Handle_username": ls_Handle_username,
                            "yhfx": stryhfx,
                            "yhqc": stryhqc,
                            "yhqyp": stryhqyp,
                            "content": "",
                            "aqyhlnr": that.straqyhlnr,
                            "yhjb_class": that.strclass,
                            "yhjb": "<a href='" + that.config.yhjbtable + "' target='_blank'>隐患级别参考标准</a>",
                        });

                        that.popup.setSize(730, 640);
                        var Obj = that.popup.Show("隐患信息", info, true);

                    } else {
                        //已审核过一次（模板中已经包含上次审核意见）
                        info = _.template(that.template.split('||')[2])({
                            // "Caption": $(e.currentTarget).data("address"),
                            // "address": $(e.currentTarget).data("address"),
                            // "notes": $(e.currentTarget).data("notes"),
                            // "uploadtime": $(e.currentTarget).data("uploadtime"),
                            // "level_check_note": $(e.currentTarget).data("level_check_note"),
                            // "level_name": $(e.currentTarget).data("level_name"),
                            // "level_username": $(e.currentTarget).data("level_username"),
                            // "Handle_trouble_clear": handle_trouble_clear,
                            // "trouble_type_name": $(e.currentTarget).data("trouble_type_name"),
                            // "username": $(e.currentTarget).data("username"),
                            // "Equid": $(e.currentTarget).data("padid"),
                            // "Handle_username": $(e.currentTarget).data("handle_username"),
                            "Caption": ls_Caption,
                            "address": ls_address,
                            "notes": ls_notes,
                            "uploadtime": ls_uploadtime,
                            "Handle_trouble_clear": handle_trouble_clear,
                            "trouble_type_name": ls_trouble_type_name,
                            "device_type_name": ls_device_type_name,
                            "username": ls_username,
                            "Equid": ls_Equid,
                            "Handle_username": ls_Handle_username,
                            "level_check_note": ls_level_check_note,
                            "level_name": ls_level_name,
                            "level_username": ls_level_username,

                            "level_time": ls_level_time,
                            "level_check_time": ls_level_check_time,
                            "level_check_username": ls_level_check_username,


                            "yhfx": stryhfx,
                            "yhqc": stryhqc,
                            "yhqyp": stryhqyp,
                            "content": "",
                            "aqyhlnr": that.straqyhlnr,
                            "yhjb_class": that.strclass,
                            "yhjb": "<a href='" + that.config.yhjbtable + "' target='_blank'>隐患级别参考标准</a>",
                        });
                        that.popup.setSize(730, 720);
                        var Obj = that.popup.Show("隐患信息", info, true);
                    }
                    this.popup.domObj.find("#pictureshow").viewer();




                    //定义处理事件
                    $(".HiddenDangerHandle-gradingtrouble").off("click").on("click", function (e) {

                        var id = that.curhiddendangerid;
                        if (id != undefined) {

                            // var levelid = $('.templateOfInfo-grading').find('.grading option:selected').val();
                            var levelid = $($('.templateOfInfo-grading')[$('.templateOfInfo-grading').length - 1]).find('.grading option:selected').val();
                            var safety_content = $($('.templateOfInfo-grading')[$('.templateOfInfo-grading').length - 1]).find('.hiddendangergrading_jc_content option:selected').text();
                            var state = $($('.templateOfInfo-grading')[$('.templateOfInfo-grading').length - 1]).find("input[name='ishiddendanger']:checked").val();

                            var hiddendangername = $($('.templateOfInfo-grading')[$('.templateOfInfo-grading').length - 1]).find(".hiddendangername").val();

                            if (hiddendangername.length > 10) {
                                this.toast.Show("隐患命名不能超过10个字！");
                                return;
                            }
                            if (state == 0) {
                                levelid = "";
                            }
                            console.log(state);
                            $.ajax({
                                headers: {
                                    // 'Authorization-Token': AppX.appConfig.xjxj
                                    'Token': AppX.appConfig.xjxj,
                                    'departmentid': AppX.appConfig.departmentid,
                                },
                                type: "POST",
                                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + that.config.gradingHiddenDanger,
                                data: {
                                    "trouble_id": id.trim(),
                                    // "handle_time": ,
                                    "levelid": levelid,
                                    "safety_content": safety_content,
                                    "state": state,
                                    "level_username": AppX.appConfig.realname,

                                    "trouble_name": hiddendangername,



                                    // f: "pjson"
                                },
                                success: that.gradingHiddenDangerCallback.bind(that),
                                error: function (data) {
                                    this.toast.Show("服务端ajax出错，获取数据失败!");
                                }.bind(this),
                                dataType: "json",
                            });

                        } else {
                            that.toast.Show("请选择要处理的隐患！");

                        }


                    }.bind(that));



                    // //定义弹出照片墙

                    // $(".picture-grading").off("click").on("click", function (e) {
                    //     $(e.currentTarget).children();
                    //     var data = [];
                    //     for (var i = 0; i < $(e.currentTarget).children().length; i++) {
                    //         data.push({ src: (<any>$(e.currentTarget).children()[i]).src, alt: $(e.currentTarget).children().attr("alt") });
                    //     }
                    //     // that.photowall.setSize(600, 650);
                    //     that.photowall.setSize(500, 730);
                    //     var htmlString = _.template(that.template.split('$$')[2])({ photoData: data });
                    //     var Obj = that.photowall.Show("照片", htmlString);

                    // }.bind(that));


                    //定义音频播放
                    $(".hiddedangerinfo_audio").off("mouseover").on("mouseover", function (e) {
                        $(e.currentTarget).attr("src", this.config.audio_light);
                        $(e.currentTarget).data("yhqyp");
                        var pong = new Howl({ src: [$(e.currentTarget).data("yhqyp")] });
                        pong.play();

                    }.bind(that));



                    $(".hiddedangerinfo_audio").off("mouseout").on("mouseout", function (e) {
                        $(e.currentTarget).attr("src", this.config.audio);
                        $(e.currentTarget).data("yhqyp");
                        var pong = new Howl({ src: [$(e.currentTarget).data("yhqyp")] });
                        pong.stop();

                    }.bind(that));

                    $($('.templateOfInfo-grading')[$('.templateOfInfo-grading').length - 1]).find('.grading').attr("disabled", "true");
                    $($('.templateOfInfo-grading')[$('.templateOfInfo-grading').length - 1]).find('.grading').css("background-color", "gray");


                    //定义是否为隐患
                    $("input[name='ishiddendanger']").off("click").on("click", function (e) {
                        // console.log($(e.currentTarget).val());

                        // var state = $($('.templateOfInfo-grading')[$('.templateOfInfo-grading').length - 1]).find('input:radio:selected').val();
                        // console.log(state);
                        if ($(e.currentTarget).val() == 1) {
                            //显示隐患级别,隐患级别可用
                            // $($('.templateOfInfo-grading')[$('.templateOfInfo-grading').length - 1]).find('.grading').removeAttr("disabled");
                            // $($('.templateOfInfo-grading')[$('.templateOfInfo-grading').length - 1]).find('.grading').css("background-color", "white");

                            $($('.templateOfInfo-grading')[$('.templateOfInfo-grading').length - 1]).find('.hiddendangergrading_jc_content').removeAttr("disabled");
                            $($('.templateOfInfo-grading')[$('.templateOfInfo-grading').length - 1]).find('.hiddendangergrading_jc_content').css("background-color", "white");

                        } else {
                            //隐患级别不可用

                            // $($('.templateOfInfo-grading')[$('.templateOfInfo-grading').length - 1]).find('.grading').attr("disabled", "true");
                            // $($('.templateOfInfo-grading')[$('.templateOfInfo-grading').length - 1]).find('.grading').css("background-color", "gray");


                            $($('.templateOfInfo-grading')[$('.templateOfInfo-grading').length - 1]).find('.hiddendangergrading_jc_content').attr("disabled", "true");
                            $($('.templateOfInfo-grading')[$('.templateOfInfo-grading').length - 1]).find('.hiddendangergrading_jc_content').css("background-color", "gray");
                        }


                    }.bind(that));

                    //安全隐患内容和风险级别联动

                    $(".hiddendangergrading_jc_content").off("change").on("change", function (e) {
                        $(e.currentTarget);
                        //当前对应级别；
                        var jb = $(e.currentTarget).find("option:selected").val();
                        $(".grading").val(jb);

                    }.bind(that));












                }.bind(this),
                error: function (data) {
                    this.toast.Show("服务端ajax出错，获取数据失败!");
                }.bind(this),
                dataType: "json",
            });

















        }.bind(this));



        //添加隐患工单气泡

        this.map.infoWindow.resize(400, 260);
        this.addClusters(results.result.rows);

        this.curpage = results.result.rows;

        //初始化隐患级别
        this.getHiddenDangerLevel();

        //初始化设备
        this.getDevices();


        //初始化隐患类型
        this.getTroubleTypes();

        this.getGroup();

        //初始化隐患类型
        this.getUser();

        this.hideLoading();



    }


    getHiddenDanger_icon(pagenumber, pagesize, trouble_typeid, pdaid, depid, userid, process_id) {
        this.currentpage_icon = pagenumber || this.config.pagenumber;
        this.currentpagesieze_icon = pagesize || this.config.pagesize;
        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getHiddenDangerList,
            data: {
                "pageindex": pagenumber || this.config.pagenumber_icon,
                "pagesize": pagesize || this.config.pagesize_icon,
                "trouble_typeid": trouble_typeid,
                "pdaid": pdaid,
                "userid": userid,
                "depid": depid,
                // "state": state,
                "process_id": process_id,
                // "handle_trouble_clear": handle_trouble_clear,
                // "handle_state": handle_state,
                // "level_state": 0,
                // "handle_trouble_clear": 0,
                // "level_check_state": level_check_state,
                // "ischeck": 1,
                // f: "pjson"
            },
            success: this.getHiddenDangerIconCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
                this.hideLoading();
            }.bind(this),
            dataType: "json",
        });
    }

    getHiddenDangerIconCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("查询隐患信息出错！");
            console.log(results.message);
            return;
        }
        if (results.result.total % this.config.pagesize_icon == 0) {
            this.totalpage = Math.floor(parseInt(results.result.total) / parseInt(this.config.pagesize_icon));

        } else {
            this.totalpage = Math.floor(parseInt(results.result.total) / parseInt(this.config.pagesize_icon)) + 1;

        }


        //为分页控件添加信息

        this.domObj.find(".pagecontrol").text("总共" + results.result.total + "条记录，每页默认显示" + that.config.pagesize_icon + "条记录");
        this.domObj.find(".content").text("第" + that.currentpage_icon + "页共" + that.totalpage + "页");
        if (that.totalpage == 0) {
            this.domObj.find(".content").text("无数据");
            this.domObj.find(".pagecontrol").text("总共-条记录，每页默认显示" + that.currentpagesize + "条记录");
            this.domObj.find(".content").text("第-页共-页");
        }


        //生成table ,并给分页控件赋值事件


        // this.currentpage = results.result.pageindex;
        //动态生成书签及分页控件
        var domtb = this.domObj.find(".imglist");
        domtb.empty();
        var address;
        var html_trs_data = "";
        var handlestate = "";
        var hanletroubleclear = "";
        $.each(results.result.rows, function (i, item) {
            if (item.handle_state == 0) {
                handlestate = "未处理";
            } else if (item.handle_state == 1) {
                handlestate = "已处理";
            }
            if (item.handle_trouble_clear == 0) {
                hanletroubleclear = "未清除";
            } else if (item.handle_trouble_clear == 1) {
                hanletroubleclear = "已清除";
            }

            var stryhfx = "";
            if (item.yhfx != "") {
                if (item.yhfx.indexOf(',') >= 0) {
                    // item.yhfx.split(',').forEach(
                    //     i => stryhfx += "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "'><image>"
                    // );

                    for (var key = 0; key < item.yhfx.split(',').length; key++) {
                        if (key > 0) {
                            break;
                        }
                        stryhfx = "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + item.yhfx.split(',')[key] + "'/>";

                    }

                } else if (item.yhfx != "") {
                    stryhfx = "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + item.yhfx + "'/>";
                } else {
                    stryhfx = "<image src='" + this.config.ZanWuTuPian + "'/>";
                }

            } else {
                stryhfx = "<image src='" + this.config.ZanWuTuPian + "'/>";
            }


            //viewer控件
            stryhfx = "";
            if (item.yhfx != "") {
                if (item.yhfx.indexOf(',') >= 0) {
                    // item.yhfx.split(',').forEach(
                    //     i => stryhfx += "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "'><image>"
                    // );

                    for (var key = 0; key < item.yhfx.split(',').length; key++) {
                        if (key > 0) {
                            break;
                        }
                        stryhfx = "<li><image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + item.yhfx.split(',')[key] + "'/></li>";

                    }

                } else if (item.yhfx != "") {
                    stryhfx = "<li><image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + item.yhfx + "'/></li>";
                } else {
                    stryhfx = "<li><image src='" + this.config.ZanWuTuPian + "'/></li>";
                }

            } else {
                stryhfx = "<li><image src='" + this.config.ZanWuTuPian + "'/></li>";
            }

            stryhfx = "  <ul id='pictureshow' >" + stryhfx + "</ul>"


            var firstindex = stryhfx.indexOf("'");
            var lastindex = stryhfx.lastIndexOf("'");
            var strhref = stryhfx.substring(firstindex + 1, lastindex);

            var stryhfx_thumb = "";
            if (item.yhfx_thumb != "") {
                if (item.yhfx_thumb.indexOf(',') >= 0) {
                    // item.yhfx.split(',').forEach(
                    //     i => stryhfx += "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "'><image>"
                    // );

                    for (var key = 0; key < item.yhfx_thumb.split(',').length; key++) {
                        if (key > 0) {
                            break;
                        }
                        stryhfx_thumb = "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + item.yhfx_thumb.split(',')[key] + "'/>";

                    }

                } else if (item.yhfx_thumb != "") {
                    stryhfx_thumb = "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + item.yhfx_thumb + "'/>";
                } else {
                    stryhfx_thumb = "<image src='" + this.config.ZanWuTuPian + "'/>";
                }

            } else {
                stryhfx_thumb = "<image src='" + this.config.ZanWuTuPian + "'/>";
            }

            var addr = "";
            if (item.address.length > 14) {
                addr = item.address.substring(0, 14) + "...";
            } else {
                addr = item.address;
            }


            html_trs_data += `<li data-troubleid='${item.id}' data-location_latitude='${item.location_latitude}' data-location_longitude='${item.location_longitude}' data-address='${item.address}' data-notes='${item.handle_before_notes}' data-uploadtime='${item.uploadtime}' data-handle_state='${item.handle_state}' data-level_check_note='${item.level_check_note}' data-level_name='${item.level_name}'   data-level_time='${item.level_time}' data-level_check_time='${item.level_check_time}'  data-level_check_username='${item.level_check_username}' data-level_username='${item.level_username}' data-handle_trouble_clear='${item.handle_trouble_clear}' data-equid_name='${item.equid_name}' data-trouble_typeid='${item.trouble_typeid}' data-trouble_type_name='${item.trouble_type_name}' data-device_type_name='${item.device_type_name}' data-username='${item.username}' data-padid='${item.padid}' data-handle_username='${item.handle_username}' data-yhfx='${item.yhfx}' data-yhqc='${item.yhqc}' data-yhqyp='${item.yhqyp}'><a >${stryhfx_thumb}<span title='${item.address}'>${addr}</span></a></li>`;
            //href="javascript:void(0)" target="_blank" 
            // html_trs_data += `<li><a href=${strhref} target="_blank">${stryhfx}<span>${item.address}</span></a></li>`;
            //刷新infowindow
            // this.setContent(item);
        }.bind(this));
        domtb.append(html_trs_data);




        //定义分页事件

        this.domObj.find(".pre_icon").off("click").on("click", function () {

            if (this.currentpage_icon - 1 > 0) {
                that.map.infoWindow.hide();
                //清空图层

                if (this.hiddendangergrading_clusterLayer_hiddendanger) {
                    this.hiddendangergrading_clusterLayer_hiddendanger.clear();
                }
                this.currentpage_icon = this.currentpage_icon - 1;
                this.showLoading();
                this.getHiddenDanger_icon(this.currentpage_icon, this.currentpagesieze_icon, this.trouble_typeid, this.pdaid, this.depid, this.userid, this.process_id);

            }


        }.bind(this));
        this.domObj.find(".next_icon").off("click").on("click", function () {

            if (this.currentpage_icon + 1 <= this.totalpage) {
                that.map.infoWindow.hide();
                //清空图层
                if (this.hiddendangergrading_clusterLayer_hiddendanger) {
                    this.hiddendangergrading_clusterLayer_hiddendanger.clear();
                }
                this.currentpage_icon = this.currentpage_icon + 1;
                this.showLoading();
                this.getHiddenDanger_icon(this.currentpage_icon, this.currentpagesieze_icon, this.trouble_typeid, this.pdaid, this.depid, this.userid, this.process_id);
            }
        }.bind(this));

        this.domObj.find(".pageturning_icon").off("click").on("click", function () {
            var currpage = parseInt(this.domObj.find(".currpage").val());
            if (currpage <= this.totalpage && currpage >= 1) {
                that.map.infoWindow.hide();
                //清空图层
                if (this.hiddendangergrading_clusterLayer_hiddendanger) {
                    this.hiddendangergrading_clusterLayer_hiddendanger.clear();
                }
                this.currentpage_icon = parseInt(this.domObj.find(".currpage").val());
                this.showLoading();
                this.getHiddenDanger_icon(this.currentpage_icon, this.currentpagesieze_icon, this.trouble_typeid, this.pdaid, this.depid, this.userid, this.process_id);
            }
        }.bind(this));



        //添加事件 .选中高亮
        this.domObj.on('click', '.imglist li', (e) => {
            this.domObj.find('li.active').removeClass('active');
            $(e.currentTarget).addClass('active');


            this.curhiddendangerid = $(e.currentTarget).data("troubleid");

            //定位
            var mapPoint = new Point($(e.currentTarget).data("location_longitude"), $(e.currentTarget).data("location_latitude"), new SpatialReference({ wkid: this.map.spatialReference.wkid }));
            this.map.centerAndZoom(mapPoint, 11);
            // var popup = new Popup({
            //     fillSymbol: new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
            //         new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
            //             new Color([255, 0, 0]), 2), new Color([255, 255, 0, 0.25]))
            // }, document.createElement("div"));

            // popup.setMap(this.map);
            // popup.setTitle("<div class='HiddenDangerGrading-id'>标题</div>");

            var note = $(e.currentTarget).data("notes");
            if (note.length > 100) {
                // note = note.substring(0, 15) + "...";
                note = "<div class='bz'>" + note + "</div>";
            }

            //临时数据
            var ls_Caption = $(e.currentTarget).data("address");
            var ls_address = $(e.currentTarget).data("address");
            var ls_notes = note;
            var ls_uploadtime = $(e.currentTarget).data("uploadtime");
            var ls_level_check_note = $(e.currentTarget).data("level_check_note");
            var ls_level_name = $(e.currentTarget).data("level_name");

            var ls_level_time = $(e.currentTarget).data("level_time");
            var ls_level_check_time = $(e.currentTarget).data("level_check_time");
            var ls_level_check_username = $(e.currentTarget).data("level_check_username");


            var ls_level_username = $(e.currentTarget).data("level_username");
            var ls_Handle_trouble_clear = handle_trouble_clear;
            var ls_trouble_type_name = $(e.currentTarget).data("trouble_type_name");
            var ls_device_type_name = $(e.currentTarget).data("device_type_name");
            var ls_username = $(e.currentTarget).data("username");
            var ls_Equid = $(e.currentTarget).data("padid");
            var ls_Handle_username = $(e.currentTarget).data("handle_username");



            //0，未处理，则处理；1，已处理，则详情
            if ($(e.currentTarget).data("handle_state") == 0) {

                var handle_state = "";
                var level1_name = "无";
                var level2_name = "无";
                var level3_name = "无";
                var handle_trouble_clear = "";
                if ($(e.currentTarget).data("handle_state") == 0) {
                    handle_state = "未处理";

                } else {
                    handle_state = "已处理";
                    level1_name = $(e.currentTarget).data("level1_name");
                    level2_name = $(e.currentTarget).data("level2_name");
                    level3_name = $(e.currentTarget).data("level3_name");

                }
                if ($(e.currentTarget).data("handle_trouble_clear") == 0) {
                    handle_trouble_clear = "未清除";
                } else {
                    handle_trouble_clear = "已清除";

                }

                //处理照片
                var stryhfx = "";
                if ($(e.currentTarget).data("yhfx") != "") {
                    if ($(e.currentTarget).data("yhfx").indexOf(',') >= 0) {
                        $(e.currentTarget).data("yhfx").split(',').forEach(
                            i => stryhfx += "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "' alt='" + $(e.currentTarget).data("address") + "'/>"
                        );
                    } else {
                        stryhfx = "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + $(e.currentTarget).data("yhfx") + "' alt='" + $(e.currentTarget).data("address") + "'/>";
                    }

                } else {
                    // stryhfx = "无";
                    stryhfx = "<image src='" + this.config.ZanWuTuPian + "'/>";

                }


                //viewer控件
                stryhfx = "";
                if ($(e.currentTarget).data("yhfx") != "") {
                    if ($(e.currentTarget).data("yhfx").indexOf(',') >= 0) {
                        $(e.currentTarget).data("yhfx").split(',').forEach(
                            i => stryhfx += "<li><image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "' alt='" + $(e.currentTarget).data("address") + "'/></li>"
                        );

                    } else {
                        stryhfx = "<li><image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + $(e.currentTarget).data("yhfx") + "' alt='" + $(e.currentTarget).data("address") + "'/></li>";
                    }
                } else {
                    // stryhfx = "暂无图片";
                    stryhfx = "<li><image src='" + this.config.ZanWuTuPian + "'/></li>";
                }

                stryhfx = "  <ul id='pictureshow' >" + stryhfx + "</ul>"


                var stryhqc = "";
                if ($(e.currentTarget).data("yhqc") != "") {
                    if ($(e.currentTarget).data("yhqc").indexOf(',') >= 0) {
                        $(e.currentTarget).data("yhqc").split(',').forEach(
                            i => stryhqc += "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "' alt='" + $(e.currentTarget).data("address") + "'/>"
                        );
                    } else {
                        stryhqc = "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + $(e.currentTarget).data("yhqc") + "' alt='" + $(e.currentTarget).data("address") + "'/>";
                    }
                } else {
                    // stryhqc = "无";
                    stryhqc = "<image src='" + this.config.ZanWuTuPian + "'/>";
                }


                //处理音频

                // var stryhqyp = "";
                // if ($(e.currentTarget).data("yhqyp") != "") {
                //     if ($(e.currentTarget).data("yhqyp").indexOf(',') >= 0) {
                //         $(e.currentTarget).data("yhqyp").split(',').forEach(
                //             i => stryhqyp += "<image class='hiddedangerinfo_audio'  src='./widgets/HiddenDangerGrading/images/audio.png' data-yhqyp='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "'/>"
                //         );
                //     } else {
                //         stryhqyp = "<image class='hiddedangerinfo_audio' src='./widgets/HiddenDangerGrading/images/audio.png' data-yhqyp='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + $(e.currentTarget).data("yhqyp") + "'/>";
                //     }

                // } else {
                //     // stryhqyp = "无";
                //     stryhqyp = "";
                // }

                var stryhqyp = "";
                if ($(e.currentTarget).data("yhqyp") != "") {
                    if ($(e.currentTarget).data("yhqyp").indexOf(',') >= 0) {
                        $(e.currentTarget).data("yhqyp").split(',').forEach(
                            i => stryhqyp += "<audio controls='controls' preload='auto'  src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "'/>"
                        );
                        stryhqyp = "<div  class='yy'>" + stryhqyp + "</div>";
                    } else {
                        stryhqyp = "<audio class='one' controls='controls' preload='auto' src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + $(e.currentTarget).data("yhqyp") + "'/>";
                    }


                } else {
                    // stryhqyp = "无";
                    stryhqyp = "";
                }


                //查询隐患分类定级表

                $.ajax({
                    headers: {
                        // 'Authorization-Token': AppX.appConfig.xjxj
                        'Token': AppX.appConfig.xjxj,
                        'departmentid': AppX.appConfig.departmentid,
                    },
                    type: "POST",
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getHiddenDangerGradigTableList,
                    data: {
                        "pageindex": this.config.pagenumber,
                        "pagesize": 1000 || this.config.pagesize,
                        "trouble_type_id": $(e.currentTarget).data("trouble_typeid")
                        // f: "pjson"
                    },
                    success: function (results) {
                        if (results.code != 1) {
                            that.toast.Show(results.message);
                            console.log(results.message);
                            return;
                        }

                        //content
                        that.straqyhlnr = "";
                        that.strclass = "";
                        $.each(results.result.rows, function (i, item) {
                            that.straqyhlnr += " <option value='" + item.levelid + "'>" + item.content + "</option>";

                            that.strclass += " <option value='" + item.levelid + "'>" + item.level_name + "</option>";

                        }.bind(that));


                        // var info = _.template(that.template.split('||')[1])({
                        //     "Caption": $(e.currentTarget).data("address"),
                        //     "address": $(e.currentTarget).data("address"),
                        //     "notes": $(e.currentTarget).data("notes"),
                        //     "uploadtime": $(e.currentTarget).data("uploadtime"),
                        //     // "handle_state": handle_state,
                        //     "level_check_note": $(e.currentTarget).data("level_check_note"),
                        //     "level_name": $(e.currentTarget).data("level_name"),
                        //     "Level2_name": level2_name,
                        //     "Level3_name": level3_name,
                        //     "Handle_trouble_clear": handle_trouble_clear,
                        //     "trouble_type_name": $(e.currentTarget).data("trouble_type_name"),
                        //     "username": $(e.currentTarget).data("username"),
                        //     "Equid": $(e.currentTarget).data("padid"),
                        //     "Handle_username": $(e.currentTarget).data("handle_username"),
                        //     "yhfx": stryhfx,
                        //     "yhqc": stryhqc,
                        //     "yhqyp": stryhqyp,
                        //     "content": "",
                        //     "aqyhlnr": that.straqyhlnr,
                        //     "yhjb_class": that.strclass,
                        //     "yhjb": "<a href='" + that.config.yhjbtable + "' target='_blank'>隐患级别参考标准</a>",
                        // });
                        // popup.setContent(info);
                        // that.map.infoWindow = popup;
                        // that.map.infoWindow.show(mapPoint);
                        // popup.maximize();

                        // that.popup.setSize(600, 700);
                        // var Obj = that.popup.Show("隐患信息", info, true);



                        var info = "";
                        // if ($(e.currentTarget).data("level_name") == "") {
                        if (ls_level_name == "") {
                            //未审核
                            info = _.template(that.template.split('||')[1])({
                                // "Caption": $(e.currentTarget).data("address"),
                                // "address": $(e.currentTarget).data("address"),
                                // "notes": $(e.currentTarget).data("notes"),
                                // "uploadtime": $(e.currentTarget).data("uploadtime"),
                                // "Handle_trouble_clear": handle_trouble_clear,
                                // "trouble_type_name": $(e.currentTarget).data("trouble_type_name"),
                                // "username": $(e.currentTarget).data("username"),
                                // "Equid": $(e.currentTarget).data("padid"),
                                // "Handle_username": $(e.currentTarget).data("handle_username"),
                                "Caption": ls_Caption,
                                "address": ls_address,
                                "notes": ls_notes,
                                "uploadtime": ls_uploadtime,
                                "Handle_trouble_clear": handle_trouble_clear,
                                "trouble_type_name": ls_trouble_type_name,
                                "device_type_name": ls_device_type_name,
                                "username": ls_username,
                                "Equid": ls_Equid,
                                "Handle_username": ls_Handle_username,



                                "yhfx": stryhfx,
                                "yhqc": stryhqc,
                                "yhqyp": stryhqyp,
                                "content": "",
                                "aqyhlnr": that.straqyhlnr,
                                "yhjb_class": that.strclass,
                                "yhjb": "<a href='" + that.config.yhjbtable + "' target='_blank'>隐患级别参考标准</a>",
                            });

                            that.popup.setSize(730, 620);
                            var Obj = that.popup.Show("隐患信息", info, true);

                        } else {
                            //已审核过一次（模板中已经包含上次审核意见）
                            info = _.template(that.template.split('||')[2])({
                                // "Caption": $(e.currentTarget).data("address"),
                                // "address": $(e.currentTarget).data("address"),
                                // "notes": $(e.currentTarget).data("notes"),
                                // "uploadtime": $(e.currentTarget).data("uploadtime"),
                                // "level_check_note": $(e.currentTarget).data("level_check_note"),
                                // "level_name": $(e.currentTarget).data("level_name"),
                                // "level_username": $(e.currentTarget).data("level_username"),
                                // "Handle_trouble_clear": handle_trouble_clear,
                                // "trouble_type_name": $(e.currentTarget).data("trouble_type_name"),
                                // "username": $(e.currentTarget).data("username"),
                                // "Equid": $(e.currentTarget).data("padid"),
                                // "Handle_username": $(e.currentTarget).data("handle_username"),
                                "Caption": ls_Caption,
                                "address": ls_address,
                                "notes": ls_notes,
                                "uploadtime": ls_uploadtime,
                                "Handle_trouble_clear": handle_trouble_clear,
                                "trouble_type_name": ls_trouble_type_name,
                                "device_type_name": ls_device_type_name,
                                "username": ls_username,
                                "Equid": ls_Equid,
                                "Handle_username": ls_Handle_username,
                                "level_check_note": ls_level_check_note,
                                "level_name": ls_level_name,
                                "level_username": ls_level_username,

                                "level_time": ls_level_time,
                                "level_check_time": ls_level_check_time,
                                "level_check_username": ls_level_check_username,

                                "yhfx": stryhfx,
                                "yhqc": stryhqc,
                                "yhqyp": stryhqyp,
                                "content": "",
                                "aqyhlnr": that.straqyhlnr,
                                "yhjb_class": that.strclass,
                                "yhjb": "<a href='" + that.config.yhjbtable + "' target='_blank'>隐患级别参考标准</a>",
                            });
                            that.popup.setSize(730, 720);
                            var Obj = that.popup.Show("隐患信息", info, true);
                        }


                        that.popup.domObj.find("#pictureshow").viewer();



                        //定义处理事件
                        $(".HiddenDangerHandle-gradingtrouble").off("click").on("click", function (e) {

                            var id = that.curhiddendangerid;
                            if (id != undefined) {

                                // var levelid = $('.templateOfInfo-grading').find('.grading option:selected').val();
                                var levelid = $($('.templateOfInfo-grading')[$('.templateOfInfo-grading').length - 1]).find('.grading option:selected').val();
                                var safety_content = $($('.templateOfInfo-grading')[$('.templateOfInfo-grading').length - 1]).find('.hiddendangergrading_jc_content option:selected').text();
                                var state = $($('.templateOfInfo-grading')[$('.templateOfInfo-grading').length - 1]).find("input[name='ishiddendanger']:checked").val();

                                var hiddendangername = $($('.templateOfInfo-grading')[$('.templateOfInfo-grading').length - 1]).find(".hiddendangername").val();
                                if (hiddendangername.length > 10) {
                                    this.toast.Show("隐患命名不能超过10个字！");
                                    return;
                                }

                                if (state == 0) {
                                    levelid = "";
                                }
                                console.log(state);
                                $.ajax({
                                    headers: {
                                        // 'Authorization-Token': AppX.appConfig.xjxj
                                        'Token': AppX.appConfig.xjxj,
                                        'departmentid': AppX.appConfig.departmentid,
                                    },
                                    type: "POST",
                                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + that.config.gradingHiddenDanger,
                                    data: {
                                        "trouble_id": id.trim(),
                                        // "handle_time": ,
                                        "levelid": levelid,
                                        "safety_content": safety_content,
                                        "state": state,
                                        "level_username": AppX.appConfig.realname,

                                        "trouble_name": hiddendangername,

                                        // f: "pjson"
                                    },
                                    success: that.gradingHiddenDangerCallback.bind(that),
                                    error: function (data) {
                                        this.toast.Show("服务端ajax出错，获取数据失败!");
                                    }.bind(this),
                                    dataType: "json",
                                });

                            } else {
                                that.toast.Show("请选择要处理的隐患！");

                            }


                        }.bind(that));



                        // //定义弹出照片墙

                        // $(".picture-grading").off("click").on("click", function (e) {
                        //     $(e.currentTarget).children();
                        //     var data = [];
                        //     for (var i = 0; i < $(e.currentTarget).children().length; i++) {
                        //         data.push({ src: (<any>$(e.currentTarget).children()[i]).src, alt: $(e.currentTarget).children().attr("alt") });
                        //     }
                        //     // that.photowall.setSize(600, 650);
                        //     this.photowall.setSize(500, 730);
                        //     var htmlString = _.template(that.template.split('$$')[2])({ photoData: data });
                        //     var Obj = that.photowall.Show("照片", htmlString);

                        // }.bind(that));


                        //定义音频播放
                        $(".hiddedangerinfo_audio").off("mouseover").on("mouseover", function (e) {
                            $(e.currentTarget).attr("src", this.config.audio_light);
                            $(e.currentTarget).data("yhqyp");
                            var pong = new Howl({ src: [$(e.currentTarget).data("yhqyp")] });
                            pong.play();

                        }.bind(that));


                        $(".hiddedangerinfo_audio").off("mouseout").on("mouseout", function (e) {
                            $(e.currentTarget).attr("src", this.config.audio);
                            $(e.currentTarget).data("yhqyp");
                            var pong = new Howl({ src: [$(e.currentTarget).data("yhqyp")] });
                            pong.stop();

                        }.bind(that));

                        $($('.templateOfInfo-grading')[$('.templateOfInfo-grading').length - 1]).find('.grading').attr("disabled", "true");
                        $($('.templateOfInfo-grading')[$('.templateOfInfo-grading').length - 1]).find('.grading').css("background-color", "gray");


                        //定义是否为隐患
                        $("input[name='ishiddendanger']").off("click").on("click", function (e) {
                            // console.log($(e.currentTarget).val());

                            // var state = $($('.templateOfInfo-grading')[$('.templateOfInfo-grading').length - 1]).find('input:radio:selected').val();
                            // console.log(state);
                            if ($(e.currentTarget).val() == 1) {
                                //显示隐患级别,隐患级别可用
                                // $($('.templateOfInfo-grading')[$('.templateOfInfo-grading').length - 1]).find('.grading').removeAttr("disabled");
                                // $($('.templateOfInfo-grading')[$('.templateOfInfo-grading').length - 1]).find('.grading').css("background-color", "white");

                                $($('.templateOfInfo-grading')[$('.templateOfInfo-grading').length - 1]).find('.hiddendangergrading_jc_content').removeAttr("disabled");
                                $($('.templateOfInfo-grading')[$('.templateOfInfo-grading').length - 1]).find('.hiddendangergrading_jc_content').css("background-color", "white");

                            } else {
                                //隐患级别不可用

                                // $($('.templateOfInfo-grading')[$('.templateOfInfo-grading').length - 1]).find('.grading').attr("disabled", "true");
                                // $($('.templateOfInfo-grading')[$('.templateOfInfo-grading').length - 1]).find('.grading').css("background-color", "gray");


                                $($('.templateOfInfo-grading')[$('.templateOfInfo-grading').length - 1]).find('.hiddendangergrading_jc_content').attr("disabled", "true");
                                $($('.templateOfInfo-grading')[$('.templateOfInfo-grading').length - 1]).find('.hiddendangergrading_jc_content').css("background-color", "gray");
                            }


                        }.bind(that));

                        //安全隐患内容和风险级别联动

                        $(".hiddendangergrading_jc_content").off("change").on("change", function (e) {
                            $(e.currentTarget);
                            //当前对应级别；
                            var jb = $(e.currentTarget).find("option:selected").val();


                            $(".grading").val(jb);


                        }.bind(that));












                    },
                    error: function (data) {
                        this.toast.Show("服务端ajax出错，获取数据失败!");
                    }.bind(this),
                    dataType: "json",
                });





                // var info = _.template(this.template.split('||')[1])({
                //     "Caption": $(e.currentTarget).data("address"),
                //     "address": $(e.currentTarget).data("address"),
                //     "notes": $(e.currentTarget).data("notes"),
                //     "uploadtime": $(e.currentTarget).data("uploadtime"),
                //     // "handle_state": handle_state,
                //     "level_check_note": $(e.currentTarget).data("level_check_note"),
                //     "level_name": $(e.currentTarget).data("level_name"),
                //     "Level2_name": level2_name,
                //     "Level3_name": level3_name,
                //     "Handle_trouble_clear": handle_trouble_clear,
                //     "trouble_type_name": $(e.currentTarget).data("trouble_type_name"),
                //     "username": $(e.currentTarget).data("username"),
                //     "Equid": $(e.currentTarget).data("padid"),
                //     "Handle_username": $(e.currentTarget).data("handle_username"),
                //     "yhfx": stryhfx,
                //     "yhqc": stryhqc,
                //     "yhqyp": stryhqyp,
                //     "content": "",
                //     "yhjb_class": this.strclass,
                //     "yhjb": "<a href='" + this.config.yhjbtable + "' target='_blank'>隐患级别参考标准</a>",
                // });
                // popup.setContent(info);
                // this.map.infoWindow = popup;
                // this.map.infoWindow.show(mapPoint);
                // popup.maximize();



                // //定义处理事件
                // $(".HiddenDangerHandle-gradingtrouble").off("click").on("click", function (e) {

                //     var id = this.curhiddendangerid;
                //     if (id != undefined) {

                //         // var levelid = $('.templateOfInfo-grading').find('.grading option:selected').val();
                //         var levelid = $($('.templateOfInfo-grading')[$('.templateOfInfo-grading').length - 1]).find('.grading option:selected').val();
                //         var state = $($('.templateOfInfo-grading')[$('.templateOfInfo-grading').length - 1]).find("input[name='ishiddendanger']:checked").val();
                //         if (state == 0) {
                //             levelid = "";
                //         }
                //         $.ajax({
                //             headers: {
                //                 // 'Authorization-Token': AppX.appConfig.xjxj
                //                 'Token': AppX.appConfig.xjxj,
                //                 'departmentid': AppX.appConfig.departmentid,
                //             },
                //             type: "POST",
                //             url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + that.config.gradingHiddenDanger,
                //             data: {

                //                 "trouble_id": id.trim(),
                //                 // "handle_time": ,
                //                 "levelid": levelid,
                //                 "state": state,
                //                 "level_username": AppX.appConfig.realname,
                //             },
                //             success: that.gradingHiddenDangerCallback.bind(that),
                //             error: function (data) {
                //                 this.toast.Show("服务端ajax出错，获取数据失败!");
                //             }.bind(this),
                //             dataType: "json",
                //         });

                //     } else {
                //         that.toast.Show("请选择要处理的隐患！");

                //     }


                // }.bind(this));


                // //定义弹出照片墙

                // $(".picture-grading").off("click").on("click", function (e) {
                //     $(e.currentTarget).children();
                //     var data = [];
                //     for (var i = 0; i < $(e.currentTarget).children().length; i++) {
                //         data.push({ src: (<any>$(e.currentTarget).children()[i]).src, alt: $(e.currentTarget).children().attr("alt") });
                //     }
                //     this.photowall.setSize(600, 650);
                //     var htmlString = _.template(this.template.split('$$')[2])({ photoData: data });
                //     var Obj = this.photowall.Show("照片", htmlString);

                // }.bind(this));


                // //定义是否为隐患
                // $("input[name='ishiddendanger']").off("click").on("click", function (e) {
                //     // console.log($(e.currentTarget).val());

                //     // var state = $($('.templateOfInfo-grading')[$('.templateOfInfo-grading').length - 1]).find('input:radio:selected').val();
                //     // console.log(state);
                //     if ($(e.currentTarget).val() == 1) {
                //         //显示隐患级别,隐患级别可用
                //         $($('.templateOfInfo-grading')[$('.templateOfInfo-grading').length - 1]).find('.grading').removeAttr("disabled");
                //         $($('.templateOfInfo-grading')[$('.templateOfInfo-grading').length - 1]).find('.grading').css("background-color", "white");

                //     } else {
                //         //隐患级别不可用

                //         $($('.templateOfInfo-grading')[$('.templateOfInfo-grading').length - 1]).find('.grading').attr("disabled", "true");
                //         $($('.templateOfInfo-grading')[$('.templateOfInfo-grading').length - 1]).find('.grading').css("background-color", "gray");


                //     }


                // }.bind(this));





            }


        });



        var html_trs_blank = "";
        if (results.result.rows.length < that.config.pagesize) {
            var num = that.config.pagesize - results.result.rows.length;
            for (var i = 0; i < num; i++) {
                html_trs_blank += "<tr class=goto data-id='null'><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>";
            }
            domtb.append(html_trs_blank);
        }

        //添加隐患工单气泡

        this.map.infoWindow.resize(400, 260);
        this.addClusters(results.result.rows);

        this.curpage = results.result.rows;


        //初始化设备
        this.getDevices();


        //初始化隐患类型
        this.getTroubleTypes();

        this.getGroup();

        //初始化隐患类型
        this.getUser();

        this.hideLoading();

    }



    gradingHiddenDangerCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("处理隐患出错！");
            console.log(results.message);
            return;
        } else {
            // that.map.infoWindow.hide();
            that.popup.Close();
            that.toast.Show("处理隐患成功！");
            //清空数据
            this.curhiddendangerid = "";
            //重新查询
            // this.getHiddenDanger(this.config.pagenumber, this.config.pagesize, this.trouble_typeid, this.equid, this.handle_userid);

            if (this.showtype == 0) {
                this.showLoading();
                this.getHiddenDanger(this.config.pagenumber, this.currentpagesize, this.trouble_typeid, this.pdaid, this.depid, this.userid, this.process_id);
            } else {
                this.showLoading();
                this.getHiddenDanger_icon(this.config.pagenumber_icon, this.config.pagesize_icon, this.trouble_typeid, this.pdaid, this.depid, this.userid, this.process_id);
            }

        }

    }



    //设置点的样式
    setSymbol(txt?) {
        var symbol = [];
        var peopleSymbol = new PictureMarkerSymbol(this.config.MarkPictureSymbol, 48, 48);
        //根据字长度设置背景图片宽度
        var peopletextSymbol = new PictureMarkerSymbol(this.config.TextbgSymbol, txt == null ? 0 : txt.length * 90 / 6, 18);
        symbol.push(peopleSymbol);
        symbol.push(peopletextSymbol);
        return symbol;
    }

    getDevices() {
        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getDeviceList,
            data: {
                "pageindex": this.config.pagenumber,
                "pagesize": 1000 || this.config.pagesize,
                // "trouble_typeid": trouble_typeid,
                // "equid": equid,
                // "handle_userid": handle_userid,
                // "handle_state": 0,
                // f: "pjson"
            },
            success: this.getDevicesCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    getDevicesCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("查询设备信息出错！");
            console.log(results.message);
            return;
        }
        var pdaid = this.domObj.find(".pdaid")
        pdaid.empty();
        var strequids = "<option value='' selected>全部</option>";
        $.each(results.result.rows, function (index, item) {
            strequids += "<option value=" + item.padid + " > " + item.padname + " </option>";

        }.bind(this));
        pdaid.append(strequids);

        this.domObj.find(".pdaid").val(this.pdaid);





    }

    getTroubleTypes() {
        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getHiddenDangerTypeList,
            data: {
                "pageindex": this.config.pagenumber,
                "pagesize": 1000 || this.config.pagesize,
                // f: "pjson"
            },
            success: this.getTroubleTypesCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    getTroubleTypesCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("查询用户信息出错！");
            console.log(results.message);
            return;
        }


        var trouble_typeid = this.domObj.find(".trouble_typeid")
        trouble_typeid.empty();
        var strtrouble_typeids = "<option value='' selected>全部</option>";
        $.each(results.result.rows, function (index, item) {
            // strtrouble_typeids += "<option value=" + item.id + " > " + item.name + " </option>";
            strtrouble_typeids += "<option value=" + item.id + " > " + item.name + " </option>";

        }.bind(this));
        trouble_typeid.append(strtrouble_typeids);

        this.domObj.find(".trouble_typeid").val(this.trouble_typeid);


    }


    getGroup() {
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getGroupList,
            data: {
                "pageindex": this.config.pagenumber,
                "pagesize": 1000 || this.config.pagesize,
                // "companyid": this.company,
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
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getUserList,
            data: {
                "pageindex": this.config.pagenumber,
                "pagesize": 1000 || this.config.pagesize,
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



        var users = this.domObj.find(".username").empty();
        var strusers = "<option value='' selected>全部</option>";
        $.each(results.result.rows, function (index, item) {
            strusers += "<option value=" + item.userid + " > " + item.username + " </option>";

        }.bind(this));
        users.append(strusers);


        this.domObj.find(".username").val(this.username);


    }


    getHiddenDangerLevel() {

        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getHiddenDangerLevelList,
            data: {
                "pageindex": this.config.pagenumber,
                "pagesize": this.config.pagesize,
                // f: "pjson"
            },
            success: this.getHiddenDangerLevelListCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    getHiddenDangerLevelListCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("查询隐患类型信息出错！");
            console.log(results.message);
            return;
        }

        this.strclass = "";
        $.each(results.result.rows, function (i, item) {
            this.strclass += " <option value='" + item.id + "'>" + item.name + "</option>";
        }.bind(this));




    }



    //显示
    addClusters(resp) {
        var photoInfo = { "data": [] };
        var wgs = new SpatialReference({
            "wkid": this.map.spatialReference.wkid
        });
        photoInfo.data = arrayUtils.map(resp, function (p) {
            var address = "";
            var trouble_typeid = "";
            var equid = "";
            var notes = "";
            var username = "";
            var uploadtime = "";
            var handle_time = "";
            var handle_state = "";
            var level1 = "无";
            var level2 = "无";
            var level3 = "无";
            var level1_name = "无";
            var level2_name = "无";
            var level3_name = "无";
            var handle_trouble_clear = "";

            var handle_username = "";
            var yhfx = "";
            var yhcl = "";

            if (p.handle_state == 0) {
                handle_state = "未处理";

            } else {
                handle_state = "已处理";
                handle_time = p.handle_time;
                level1 = p.level1;
                level2 = p.level2;
                level3 = p.level3;

                level1_name = p.level1_name;
                level2_name = p.level2_name;
                level3_name = p.level3_name;

            }


            if (p.handle_trouble_clear == 0) {
                handle_trouble_clear = "未清除";
            } else {
                handle_trouble_clear = "已清除";

            }

            //处理照片
            var stryhfx = "";
            if (p.yhfx != null) {
                if (p.yhfx.indexOf(',') >= 0) {
                    p.yhfx.split(',').forEach(
                        i => stryhfx += "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "' />"
                    );
                } else {
                    stryhfx = "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + p.yhfx + "'/>";
                }

            } else {
                // stryhfx = "无";
                stryhfx = "<image src='" + this.config.ZanWuTuPian + "'/>";
            }


            //viewer控件
            stryhfx = "";
            if (p.yhfx != null) {
                if (p.yhfx.indexOf(',') >= 0) {
                    p.yhfx.split(',').forEach(
                        i => stryhfx += "<li><image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "' /></li>"
                    );
                } else {
                    stryhfx = "<li><image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + p.yhfx + "'/></li>";
                }

            } else {
                // stryhfx = "无";
                stryhfx = "<li><image src='" + this.config.ZanWuTuPian + "'/></li>";
            }

            stryhfx = "  <ul id='pictureshow' >" + stryhfx + "</ul>"


            var stryhqc = "";
            if (p.yhqc != null) {
                if (p.yhqc.indexOf(',') >= 0) {
                    p.yhqc.split(',').forEach(
                        i => stryhqc += "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "'/>"
                    );
                } else {
                    stryhqc = "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + p.yhqc + "'/>";
                }
            } else {
                // stryhqc = "无";
                stryhqc = "<image src='" + this.config.ZanWuTuPian + "'/>";
            }


            var attributes = {
                "id": p.id,
                "Caption": p.address,
                "address": p.address,
                "notes": p.handle_before_notes,
                "uploadtime": p.uploadtime.replace('T', '  '),
                "handle_state": handle_state,
                "trouble_type_name": p.trouble_type_name,
                "level2_name": level2_name,
                "level3_name": level3_name,
                "handle_trouble_clear": handle_trouble_clear,
                "trouble_typeid": p.trouble_typeid,
                "username": p.username,
                "equid": p.pdaid,
                "handle_username": p.handle_username,
                "yhfx": stryhfx,
                "yhqc": stryhqc,

                //  "YHFXImage": AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + p.yhfx,
                // "YHQCImage": AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + p.yhqc,

                // "Image": AppX.appConfig.apiroot.replace(/\/+$/, "") + this.config.filePath + p.fileid,
                // "Link": p.link
            };
            return {
                "x": p.location_longitude - 0,
                "y": p.location_latitude - 0,
                "attributes": attributes
            };
        }.bind(this));



        var popupTemplate2 = new PopupTemplate({});
        var templateArr = this.template.split('||');
        popupTemplate2.setContent(templateArr[3]);


        // cluster layer that uses OpenLayers style clustering
        if (this.hiddendangergrading_clusterLayer_hiddendanger != null) {
            this.map.removeLayer(this.hiddendangergrading_clusterLayer_hiddendanger);
            this.hiddendangergrading_clusterLayer_hiddendanger = null
        }
        this.hiddendangergrading_clusterLayer_hiddendanger = new ClusterLayer({
            "basemap": this.map,
            "data": photoInfo.data,
            "distance": 10,
            "id": "hiddendangergrading_clusters",
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
        this.hiddendangergrading_clusterLayer_hiddendanger.setRenderer(renderer);
        //this.hiddendangergrading_clusterLayer_hiddendanger.symbol = blue;
        this.map.addLayer(this.hiddendangergrading_clusterLayer_hiddendanger);
        // // close the info window when the map is clicked
        // this.map.on("click", this.cleanUp.bind(this));
        // // close the info window when esc is pressed
        // this.map.on("key-down", function (e) {
        //     if (e.keyCode === 27) {
        //         this.cleanUp().bind(this);
        //     }
        // });

        $("body").on("click", ".arcgispopup_operation", function (e) {
            var id = $(e.currentTarget).data("id");
            $.each($(".widget-hiddendangergrading .operation"), function (i, value) {
                if ($(value).data("id") == id) {

                    $($(".widget-hiddendangergrading  .operation")[i]).trigger("click");

                }
            });

            $.each($(".widget-hiddendangergrading .imglist li"), function (i, value) {
                if ($(value).data("troubleid") == id) {

                    $($(".widget-hiddendangergrading  .imglist li")[i]).trigger("click");

                }
            });


        }.bind(this));

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





    destroy() {
        this.map.infoWindow.hide();
        if (this.hiddendangergrading_clusterLayer_hiddendanger) {
            this.map.removeLayer(this.hiddendangergrading_clusterLayer_hiddendanger);
        }
        this.domObj.remove();
        this.afterDestroy();
    }

}