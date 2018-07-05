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

export = HiddenDangerAudit;

class HiddenDangerAudit extends BaseWidget {
    baseClass = "widget-hiddendangeraudit";
    map = null;
    toast = null;
    photowall = null;
    popup = null;

    totalpage = 1;
    currentpage = 1;
    currentpagesieze = 25;
    curenthiddendangertypeid = "";
    trouble_typeid = "";
    pdaid = "";
    userid = "";
    padname = "";
    username = "";
    depid = "";


    process_id = "7";
    handle_state = "";
    handle_trouble_clear = "";
    hiddendangeraudit_clusterLayer_hiddendanger = null;//数据库中的隐患
    curpage = null;

    showtype = 0;//0列表模式，1图标模式

    curhiddendangerid = "";


    print_address = "";
    print_describe = "";
    print_xjry = "";
    print_uploadtime = "";

    trouble_id = "";


    //选择某行时，保存当前行数据
    cur_address = "";
    cur_trouble_type_name = "";
    cur_device_type_name = "";
    cur_username = "";
    cur_yhfx = "";
    cur_yhqyp = "";
    cur_notes = "";
    cur_uploadtime = "";
    cur_safety_content = "";
    cur_level_name = "";
    cur_level_username = "";
    cur_level_check_username = "";
    cur_level_check_note = "";

    cur_level_time = "";
    cur_level_check_time = "";

    cur_regionname = "";
    cur_state = "";
    cur_process_id: number;

    //处置信息
    cur_fund = "";
    cur_duty = "";
    cur_controlmeasure = "";
    cur_timelimit = "";
    cur_emergencymeasure: "";


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
        this.photowall = this.AppX.runtimeConfig.photowall;
        this.popup = this.AppX.runtimeConfig.popup;
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
                this.getHiddenDanger_icon(this.config.pagenumber, 1000000, this.trouble_typeid, this.pdaid, this.depid, this.userid, this.process_id);
            }

        }.bind(this));


        this.domObj.find('.save2csv').off("click").on("click", function () {
            // var pong = new Howl({ src: ['http://localhost:3000/widgets/HiddenDangerAudit/1.mp3'] });
            // pong.play();
            //    var pong = new Howl({urls: ['http://www.javascriptoo.com/application/html/pong.wav']})
            //this.Save2File(this.data.tabs[this.getActiveTabIndex()]);
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


            //添加音频
            //this.getFiles($(e.currentTarget).data("id"));


            //定位
            // var mapPoint = new Point($(e.currentTarget).data("location_longitude"), $(e.currentTarget).data("location_latitude"), new SpatialReference({ wkid: that.map.spatialReference.wkid }));
            // // that.map.getInfoWindowAnchor(that.map.toScreen(mapPoint));
            // //this.hiddendangeraudit_clusterLayer_hiddendanger.infoTemplate=this.hiddendangeraudit_clusterLayer_hiddendanger._singleTemplate.content;
            // that.map.infoWindow.setTitle("<div class='HiddenDangerAudit-id' id=" + $(e.currentTarget).data("id") + ">标题</div>");
            // //that.map.infoWindow.setContent(this.hiddendangeraudit_clusterLayer_hiddendanger._singleTemplate.content);
            // var handle_state = "";
            // var level1_name = "无";
            // var level2_name = "无";
            // var level3_name = "无";
            // var handle_trouble_clear = "";
            // if ($(e.currentTarget).data("handle_state") == 0) {
            //     handle_state = "未处理";

            // } else {
            //     handle_state = "已处理";
            //     level1_name = $(e.currentTarget).data("level1_name");
            //     level2_name = $(e.currentTarget).data("level2_name");
            //     level3_name = $(e.currentTarget).data("level3_name");

            // }
            // if ($(e.currentTarget).data("handle_trouble_clear") == 0) {
            //     handle_trouble_clear = "未清除";
            // } else {
            //     handle_trouble_clear = "已清除";

            // }

            // //处理照片
            // var stryhfx = "";
            // if ($(e.currentTarget).data("yhfx") != null) {
            //     if ($(e.currentTarget).data("yhfx").indexOf(',') >= 0) {
            //         $(e.currentTarget).data("yhfx").split(',').forEach(
            //             i => stryhfx += "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "'><image>"
            //         );
            //     } else {
            //         stryhfx = "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + $(e.currentTarget).data("yhfx") + "'><image>";
            //     }

            // } else {
            //     stryhfx = "无";
            // }


            // var stryhqc = "";
            // if ($(e.currentTarget).data("yhqc") != null) {
            //     if ($(e.currentTarget).data("yhqc").indexOf(',') >= 0) {
            //         $(e.currentTarget).data("yhqc").split(',').forEach(
            //             i => stryhqc += "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "'><image>"
            //         );
            //     } else {
            //         stryhqc = "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + $(e.currentTarget).data("yhqc") + "'><image>";
            //     }
            // } else {
            //     stryhqc = "无";
            // }
            // var info = _.template(this.template.split('||')[1])({
            //     "Caption": $(e.currentTarget).data("address"),
            //     "Address": $(e.currentTarget).data("address"),
            //     "Notes": $(e.currentTarget).data("notes"),
            //     "Uploadtime": $(e.currentTarget).data("uploadtime"),
            //     "Handle_state": handle_state,
            //     "Level1_name": level1_name,
            //     "Level2_name": level2_name,
            //     "Level3_name": level3_name,
            //     "Handle_trouble_clear": handle_trouble_clear,
            //     "Trouble_typeid": $(e.currentTarget).data("trouble_typeid"),
            //     "Username": $(e.currentTarget).data("username"),
            //     "Equid": $(e.currentTarget).data("padid"),
            //     "Handle_username": $(e.currentTarget).data("handle_username"),
            //     "YHFXImage": stryhfx,
            //     "YHQCImage": stryhqc
            // });
            // that.map.infoWindow.setContent(info);
            // // that.map.infoWindow.resize(1200, 900)

            // // that.map.infoWindow.show(mapPoint, InfoWindow.ANCHOR_UPPERRIGHT);

            // //定位到那

            // var localtionpoint = new Point($(e.currentTarget).data("location_longitude") - 0.0008, $(e.currentTarget).data("location_latitude") - 0.0008, new SpatialReference({ wkid: that.map.spatialReference.wkid }));


            // this.map.centerAndZoom(localtionpoint, 11);
            // // var screenpoint = this.map.toScreen(mapPoint);
            // // //往左下角偏移
            // // var screenpoint2 = new ScreenPoint(screenpoint.x - 220, screenpoint.y - 200);
            // // var mappoint2 = this.map.toMap(screenpoint2);
            // // this.map.centerAndZoom(mappoint2, 11);
            // that.map.infoWindow.show(mapPoint, InfoWindow.ANCHOR_UPPERLEFT);




        });

        //图标模式
        this.domObj.find('.btn_icon').off("click").on("click", function () {
            this.showtype = 1;
            var preheight = this.domObj.find(".halfpaneltable").height();
            //进入图标模式
            //查询当前用户具体的任务安排
            this.domObj.empty();
            // this.domObj.append(this.template.split('$$')[1]);

            var html = _.template(this.template.split('$$')[1])({ depid: AppX.appConfig.groupid });

            this.domObj.append(html);

            this.initEvent();
            //查询图片
            this.showLoading();
            this.getHiddenDanger_icon(this.config.pagenumber, 1000000, this.trouble_typeid, this.pdaid, this.depid, this.userid, this.process_id);
            //  this.getHiddenDanger_icon(this.config.pagenumber, this.config.pagesize, this.trouble_typeid, this.pdaid, this.userid, this.handle_state, this.handle_trouble_clear);
            this.domObj.find(".halfpaneltable").height(preheight);
            // this.getPeriod();

        }.bind(this));

        //列表模式
        this.domObj.find('.btn_list').off("click").on("click", function () {
            this.showtype = 0;
            var preheight = this.domObj.find(".halfpaneltable").height();
            // var prepagesize = this.currentpagesieze;
            this.domObj.empty();
            var html = _.template(this.template.split('$$')[0] + "</div>")({ depid: AppX.appConfig.groupid });
            // var html = _.template(this.template.split('$$')[0])();
            // this.setHtml(html);
            this.domObj.append(html);
            this.initEvent();
            // this.currentpagesieze = prepagesize;
            // this.ready();
            this.showLoading();
            // this.getHiddenDanger(this.config.pagenumber, this.config.pagesize, this.trouble_typeid, this.pdaid, this.userid, this.handle_state, this.handle_trouble_clear);
            this.getHiddenDanger(this.currentpage, this.currentpagesieze, this.trouble_typeid, this.pdaid, this.depid, this.userid, this.process_id);
            this.domObj.find(".halfpaneltable").height(preheight);
        }.bind(this));






        //动态生成书签及分页控件
        //分页控件fykj 向前、向后事件
        this.domObj.find(".pre").off("click").on("click", function () {

            if (this.currentpage - 1 > 0) {
                that.map.infoWindow.hide();
                //清空图层

                if (this.hiddendangeraudit_clusterLayer_hiddendanger) {
                    this.hiddendangeraudit_clusterLayer_hiddendanger.clear();
                }
                this.currentpage = this.currentpage - 1;
                this.showLoading();
                this.getHiddenDanger(this.currentpage, this.currentpagesieze, this.trouble_typeid, this.pdaid, this.depid, this.userid, this.process_id);

            }


        }.bind(this));
        this.domObj.find(".next").off("click").on("click", function () {

            if (this.currentpage + 1 <= this.totalpage) {
                that.map.infoWindow.hide();
                //清空图层
                if (this.hiddendangeraudit_clusterLayer_hiddendanger) {
                    this.hiddendangeraudit_clusterLayer_hiddendanger.clear();
                }
                this.currentpage = this.currentpage + 1;
                this.showLoading();
                this.getHiddenDanger(this.currentpage, this.currentpagesieze, this.trouble_typeid, this.pdaid, this.userid, this.process_id);
            }
        }.bind(this));

        this.domObj.find(".pageturning").off("click").on("click", function () {
            var currpage = parseInt(this.domObj.find(".currpage").val());
            if (currpage <= this.totalpage && currpage >= 1) {
                that.map.infoWindow.hide();
                //清空图层
                if (this.hiddendangeraudit_clusterLayer_hiddendanger) {
                    this.hiddendangeraudit_clusterLayer_hiddendanger.clear();
                }
                this.currentpage = parseInt(this.domObj.find(".currpage").val());
                this.showLoading();
                this.getHiddenDanger(this.currentpage, this.currentpagesieze, this.trouble_typeid, this.pdaid, this.depid, this.userid, this.process_id);
            }
        }.bind(this));




        this.domObj.find(".dynamic_pagesize").off("change").on("change", function () {
            //清空图层
            if (this.hiddendangeraudit_clusterLayer_hiddendanger) {
                this.hiddendangeraudit_clusterLayer_hiddendanger.clear();
            }
            //重新查询

            this.currentpagesieze = parseInt(this.domObj.find(".dynamic_pagesize").val());
            this.showLoading();
            this.getHiddenDanger(this.config.pagenumber, this.currentpagesieze, this.trouble_typeid, this.pdaid, this.depid, this.userid, this.process_id);
            this.domObj.find(".halfpaneltable").height(this.domObj.find(".halfpaneltable").height());



        }.bind(this));





    }




    getHiddenDanger(pagenumber, pagesize, trouble_typeid, pdaid, depid, userid, process_id) {
        this.currentpage = pagenumber || this.config.pagenumber;
        this.currentpagesieze = pagesize || this.config.pagesize;
        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getHiddenDangerList,
            data: {
                // "pageindex": pagenumber || this.config.pagenumber,
                // "pagesize": this.config.pagesize,
                "pageindex": this.currentpage || this.config.pagenumber,
                "pagesize": this.currentpagesieze || this.config.pagesize,
                "trouble_typeid": trouble_typeid,
                "pdaid": pdaid,
                "userid": userid,
                "depid": depid,
                "process_id": process_id,
                // "state": 1,
                // "level_check_state": 1,
                // "fill_state": 0,
                // "handle_trouble_clear": 1,
                // "check_state": 0,
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
        if (results.result.total % this.currentpagesieze == 0) {
            this.totalpage = Math.floor(parseInt(results.result.total) / this.currentpagesieze);

        } else {
            this.totalpage = Math.floor(parseInt(results.result.total) / this.currentpagesieze) + 1;

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
        var domtb = this.domObj.find(".addhiddendanger")
        domtb.empty();
        var address;
        var html_trs_data = "";
        var state = "";
        var hanletroubleclear = "";
        var str_fill_state = "";

        $.each(results.result.rows, function (i, item) {

            state = "";
            str_fill_state = "";
            hanletroubleclear = "";

            if (item.handle_trouble_clear == 0) {
                hanletroubleclear = "未清除";
            } else if (item.handle_trouble_clear == 1) {
                hanletroubleclear = "已清除";
            }

            if (item.state == 0) {
                state = "否";
                hanletroubleclear = "无需清除";

            } else if (item.state == 1) {
                state = "是";
            } else {
                state = "";
                hanletroubleclear = "";
            }


            if (item.fill_state == 0) {
                str_fill_state = "否";
            } else if (item.fill_state == 1) {
                str_fill_state = "是";
            }

            var describle = item.handle_before_notes;
            if (item.handle_before_notes.length > 15) {
                describle = item.handle_before_notes.substring(0, 15) + "...";
            }


            //<td>" + item.equid_name + "</td>
            // html_trs_data += "<tr class=goto  data-id='" + item.id + "' data-location_longitude='" + item.location_longitude + "' data-location_latitude='" + item.location_latitude + "' data-address='" + item.address + "' data-notes='" + item.handle_before_notes + "' data-uploadtime='" + item.uploadtime + "' data-handle_state='" + item.handle_state + "' data-state='" + item.state + "' data-level_name='" + item.level_name + "' data-level3_name='" + item.level3_name + "' data-handle_trouble_clear='" + item.handle_trouble_clear + "' data-trouble_typeid='" + item.trouble_typeid + "' data-username='" + item.username + "' data-padid='" + item.padid + "' data-handle_username='" + item.handle_username + "' data-level3_name='" + item.level3_name + "' data-yhfx='" + item.yhfx + "' data-yhqc='" + item.yhqc + "'   data-yhqyp='" + item.yhqyp + "'><td>" + item.trouble_type_name + "</td> <td title='" + item.handle_before_notes + "'>" + describle + " </td><td>" + item.username + "</td><td>" + item.address + "</td><td>" + item.uploadtime + "</td><td><a class='operation' data-id='" + item.id + "' data-location_longitude='" + item.location_longitude + "' data-location_latitude='" + item.location_latitude + "' data-address='" + item.address + "' data-notes='" + item.handle_before_notes + "' data-uploadtime='" + item.uploadtime + "' data-process_id='" + item.process_id + "' data-level_name='" + item.level_name + "' data-level_username='" + item.level_username + "' data-safety_content='" + item.safety_content + "'  data-level_check_username='" + item.level_check_username + "'  data-regionname='" + item.regionname + "' data-handle_state='" + item.handle_state + "' data-state='" + item.state + "' data-level_name='" + item.level_name + "' data-level3_name='" + item.level3_name + "' data-handle_trouble_clear='" + item.handle_trouble_clear + "' data-equid_name='" + item.equid_name + "' data-trouble_type_name='" + item.trouble_type_name + "' data-username='" + item.username + "' data-padid='" + item.padid + "' data-handle_username='" + item.handle_username + "' data-level3_name='" + item.level3_name + "' data-yhfx='" + item.yhfx + "' data-yhqc='" + item.yhqc + "'  data-yhqyp='" + item.yhqyp + "'>详情</a><td><a class='yhaudit' data-id='" + item.id + "' data-location_longitude='" + item.location_longitude + "' data-location_latitude='" + item.location_latitude + "' data-address='" + item.address + "' data-notes='" + item.handle_before_notes + "' data-uploadtime='" + item.uploadtime + "' data-handle_state='" + item.handle_state + "' data-state='" + item.state + "' data-level_name='" + item.level_name + "' data-level3_name='" + item.level3_name + "' data-handle_trouble_clear='" + item.handle_trouble_clear + "' data-trouble_typeid='" + item.trouble_typeid + "' data-username='" + item.username + "' data-padid='" + item.padid + "' data-handle_username='" + item.handle_username + "' data-level3_name='" + item.level3_name + "' data-yhfx='" + item.yhfx + "' data-yhqc='" + item.yhqc + "'   data-yhqyp='" + item.yhqyp + "'><td>" + item.trouble_type_name + "</td> <td title='" + item.handle_before_notes + "'>" + describle + " </td><td>" + item.username + "</td><td>" + item.address + "</td><td>" + item.uploadtime + "</td><td><a class='operation' data-id='" + item.id + "' data-location_longitude='" + item.location_longitude + "' data-location_latitude='" + item.location_latitude + "' data-address='" + item.address + "' data-notes='" + item.handle_before_notes + "' data-uploadtime='" + item.uploadtime + "' data-process_id='" + item.process_id + "' data-level_name='" + item.level_name + "' data-level_username='" + item.level_username + "' data-safety_content='" + item.safety_content + "'  data-level_check_username='" + item.level_check_username + "'  data-regionname='" + item.regionname + "' data-handle_state='" + item.handle_state + "' data-state='" + item.state + "' data-level_name='" + item.level_name + "' data-level3_name='" + item.level3_name + "' data-handle_trouble_clear='" + item.handle_trouble_clear + "' data-equid_name='" + item.equid_name + "' data-trouble_type_name='" + item.trouble_type_name + "' data-username='" + item.username + "' data-padid='" + item.padid + "' data-handle_username='" + item.handle_username + "' data-level3_name='" + item.level3_name + "' data-yhfx='" + item.yhfx + "' data-yhqc='" + item.yhqc + "'  data-yhqyp='" + item.yhqyp + "' >审核</a></td></tr>";
            html_trs_data += "<tr class=goto  data-id='" + item.id + "' data-location_longitude='" + item.location_longitude + "' data-location_latitude='" + item.location_latitude + "' data-address='" + item.address + "' data-notes='" + item.handle_before_notes + "' data-uploadtime='" + item.uploadtime + "' data-handle_state='" + item.handle_state + "' data-state='" + item.state + "' data-level_name='" + item.level_name + "' data-level3_name='" + item.level3_name + "' data-handle_trouble_clear='" + item.handle_trouble_clear + "' data-trouble_typeid='" + item.trouble_typeid + "' data-username='" + item.username + "' data-padid='" + item.padid + "' data-handle_username='" + item.handle_username + "' data-level3_name='" + item.level3_name + "' data-yhfx='" + item.yhfx + "' data-yhqc='" + item.yhqc + "'   data-yhqyp='" + item.yhqyp + "'><td>" + item.trouble_name + "</td><td>" + item.trouble_type_name + "</td> <td title='" + item.handle_before_notes + "'>" + describle + " </td><td>" + item.username + "</td><td>" + item.address + "</td><td>" + item.uploadtime + "</td><td><a class='operation' data-id='" + item.id + "' data-location_longitude='" + item.location_longitude + "' data-location_latitude='" + item.location_latitude + "' data-address='" + item.address + "' data-notes='" + item.handle_before_notes + "' data-uploadtime='" + item.uploadtime + "' data-process_id='" + item.process_id + "' data-level_name='" + item.level_name + "' data-level_username='" + item.level_username + "' data-safety_content='" + item.safety_content + "'  data-level_check_username='" + item.level_check_username + "'  data-regionname='" + item.regionname + "' data-handle_state='" + item.handle_state + "' data-state='" + item.state + "' data-level_name='" + item.level_name + "' data-level_time='" + item.level_time + "' data-level_check_time='" + item.level_check_time + "' data-handle_trouble_clear='" + item.handle_trouble_clear + "' data-equid_name='" + item.equid_name + "' data-trouble_type_name='" + item.trouble_type_name + "'   data-device_type_name='" + item.device_type_name + "' data-username='" + item.username + "' data-padid='" + item.padid + "' data-handle_username='" + item.handle_username + "' data-level3_name='" + item.level3_name + "' data-yhfx='" + item.yhfx + "' data-yhqc='" + item.yhqc + "'  data-yhqyp='" + item.yhqyp + "' data-fund='" + item.fund + "' data-duty='" + item.duty + "' data-controlmeasure='" + item.controlmeasure + "'  data-timelimit='" + item.timelimit + "' data-emergencymeasure='" + item.emergencymeasure + "' >详情</a><td><a class='yhaudit' data-id='" + item.id + "'  data-location_longitude='" + item.location_longitude + "' data-location_latitude='" + item.location_latitude + "' data-address='" + item.address + "' data-notes='" + item.handle_before_notes + "' data-uploadtime='" + item.uploadtime + "' data-process_id='" + item.process_id + "' data-level_name='" + item.level_name + "'  data-level_time='" + item.level_time + "' data-level_check_time='" + item.level_check_time + "' data-level_username='" + item.level_username + "' data-safety_content='" + item.safety_content + "'  data-level_check_username='" + item.level_check_username + "'  data-regionname='" + item.regionname + "' data-handle_state='" + item.handle_state + "' data-state='" + item.state + "' data-level_name='" + item.level_name + "' data-level3_name='" + item.level3_name + "' data-handle_trouble_clear='" + item.handle_trouble_clear + "' data-equid_name='" + item.equid_name + "' data-trouble_type_name='" + item.trouble_type_name + "' data-device_type_name='" + item.device_type_name + "' data-username='" + item.username + "' data-padid='" + item.padid + "' data-handle_username='" + item.handle_username + "' data-level3_name='" + item.level3_name + "' data-yhfx='" + item.yhfx + "' data-yhqc='" + item.yhqc + "'  data-yhqyp='" + item.yhqyp + "' data-fund='" + item.fund + "' data-duty='" + item.duty + "' data-controlmeasure='" + item.controlmeasure + "'  data-timelimit='" + item.timelimit + "' data-emergencymeasure='" + item.emergencymeasure + "' >审核</a></td></tr>";
            //刷新infowindow
            // this.setContent(item);
        }.bind(this));
        domtb.append(html_trs_data);


        var html_trs_blank = "";
        if (results.result.rows.length < that.config.pagesize) {
            var num = that.config.pagesize - results.result.rows.length;
            for (var i = 0; i < num; i++) {
                html_trs_blank += "<tr class=goto data-id='null'><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>";
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


            //查询详情
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
            // popup.setTitle("<div class='HiddenDangerAudit-id'>标题</div>");




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



            var state = "";
            var handle_trouble_clear = "";
            var info = "";
            if ($(e.currentTarget).data("handle_trouble_clear") == 0) {
                handle_trouble_clear = "未清除";
            } else {
                handle_trouble_clear = "已清除";

            }
            if ($(e.currentTarget).data("state") == 0) {
                state = "否";
                handle_trouble_clear = "无需清除";
            } else if ($(e.currentTarget).data("state") == 1) {
                state = "是";
            } else {
                state = "";
                handle_trouble_clear = "";
            }

            var note = $(e.currentTarget).data("notes");
            if (note.length > 100) {
                // note = note.substring(0, 15) + "...";
                note = "<div class='bz'>" + note + "</div>";
            }


            if ($(e.currentTarget).data("process_id") == 7) {
                this.getTroublePlan(this.curhiddendangerid);

                this.cur_address = $(e.currentTarget).data("address");
                this.cur_trouble_type_name = $(e.currentTarget).data("trouble_type_name");
                this.cur_device_type_name = $(e.currentTarget).data("device_type_name");
                this.cur_username = $(e.currentTarget).data("username");
                this.cur_yhfx = stryhfx;
                this.cur_yhqyp = stryhqyp;
                this.cur_notes = note;
                this.cur_uploadtime = $(e.currentTarget).data("uploadtime");

                this.cur_safety_content = $(e.currentTarget).data("safety_content");
                this.cur_level_name = $(e.currentTarget).data("level_name");
                this.cur_level_username = $(e.currentTarget).data("level_username");
                this.cur_level_check_username = $(e.currentTarget).data("level_check_username");
                this.cur_level_check_note = $(e.currentTarget).data("level_check_note");

                this.cur_level_time = $(e.currentTarget).data("level_time");
                this.cur_level_check_time = $(e.currentTarget).data("level_check_time");

                this.cur_regionname = $(e.currentTarget).data("regionname");

                this.cur_state = state;

                this.cur_process_id = $(e.currentTarget).data("process_id");


                //处置信息
                this.cur_fund = $(e.currentTarget).data("fund");
                this.cur_duty = $(e.currentTarget).data("duty");
                this.cur_controlmeasure = $(e.currentTarget).data("controlmeasure");
                this.cur_timelimit = $(e.currentTarget).data("timelimit");
                this.cur_emergencymeasure = $(e.currentTarget).data("emergencymeasure");






            }


            // if ($(e.currentTarget).data("state") == 0) {
            //     info = _.template(this.template.split('||')[1])({
            //         "caption": $(e.currentTarget).data("address"),
            //         "address": $(e.currentTarget).data("address"),
            //         "notes": $(e.currentTarget).data("notes"),
            //         "uploadtime": $(e.currentTarget).data("uploadtime"),
            //         "state": state,
            //         "handle_trouble_clear": handle_trouble_clear,
            //         "trouble_type_name": $(e.currentTarget).data("trouble_type_name"),
            //         "username": $(e.currentTarget).data("username"),
            //         "equid": $(e.currentTarget).data("padid"),
            //         "handle_username": $(e.currentTarget).data("handle_username"),
            //         "safety_content": $(e.currentTarget).data("safety_content"),
            //         "level_check_note": $(e.currentTarget).data("level_check_note"),
            //         "level_name": $(e.currentTarget).data("level_name"),
            //         "level_username": $(e.currentTarget).data("level_username"),
            //         "level_check_username": $(e.currentTarget).data("level_check_username"),
            //         "regionname": $(e.currentTarget).data("regionname"),
            //         "yhfx": stryhfx,
            //         "yhqc": stryhqc,
            //         "yhqyp": stryhqyp,
            //         "content": "",
            //     });

            // } else if ($(e.currentTarget).data("state") == 1) {
            //     info = _.template(this.template.split('||')[1])({
            //         "id": $(e.currentTarget).data("id"),
            //         "caption": $(e.currentTarget).data("address"),
            //         "address": $(e.currentTarget).data("address"),
            //         "notes": $(e.currentTarget).data("notes"),
            //         "uploadtime": $(e.currentTarget).data("uploadtime"),
            //         "state": state,
            //         "yhjb": $(e.currentTarget).data("level_name"),
            //         "handle_trouble_clear": handle_trouble_clear,
            //         "trouble_type_name": $(e.currentTarget).data("trouble_type_name"),
            //         "username": $(e.currentTarget).data("username"),
            //         "equid": $(e.currentTarget).data("padid"),
            //         "handle_username": $(e.currentTarget).data("handle_username"),
            //         "safety_content": $(e.currentTarget).data("safety_content"),
            //         "level_check_note": $(e.currentTarget).data("level_check_note"),
            //         "level_name": $(e.currentTarget).data("level_name"),
            //         "level_username": $(e.currentTarget).data("level_username"),
            //         "level_check_username": $(e.currentTarget).data("level_check_username"),
            //         "regionname": $(e.currentTarget).data("regionname"),
            //         "yhfx": stryhfx,
            //         "yhqc": stryhqc,
            //         "yhqyp": stryhqyp,
            //         "content": "",
            //     });


            // } else {

            //     info = _.template(this.template.split('||')[1])({
            //         "caption": $(e.currentTarget).data("address"),
            //         "address": $(e.currentTarget).data("address"),
            //         "notes": $(e.currentTarget).data("notes"),
            //         "uploadtime": $(e.currentTarget).data("uploadtime"),
            //         "state": state,
            //         "handle_trouble_clear": handle_trouble_clear,
            //         "trouble_type_name": $(e.currentTarget).data("trouble_type_name"),
            //         "username": $(e.currentTarget).data("username"),
            //         "equid": $(e.currentTarget).data("padid"),
            //         "handle_username": $(e.currentTarget).data("handle_username"),
            //         "safety_content": $(e.currentTarget).data("safety_content"),
            //         "level_check_note": $(e.currentTarget).data("level_check_note"),
            //         "level_name": $(e.currentTarget).data("level_name"),
            //         "level_username": $(e.currentTarget).data("level_username"),
            //         "level_check_username": $(e.currentTarget).data("level_check_username"),
            //         "regionname": $(e.currentTarget).data("regionname"),
            //         "yhfx": stryhfx,
            //         "yhqc": stryhqc,
            //         "yhqyp": stryhqyp,
            //         "content": "",
            //     });

            // }

            //构造template
            // var info = _.template(this.template.split('||')[1])({
            //     "caption": $(e.currentTarget).data("address"),
            //     "address": $(e.currentTarget).data("address"),
            //     "notes": $(e.currentTarget).data("notes"),
            //     "uploadtime": $(e.currentTarget).data("uploadtime"),
            //     "state": state,
            //     "handle_trouble_clear": handle_trouble_clear,
            //     "trouble_type_name": $(e.currentTarget).data("trouble_type_name"),
            //     "username": $(e.currentTarget).data("username"),
            //     "equid": $(e.currentTarget).data("padid"),
            //     "handle_username": $(e.currentTarget).data("handle_username"),
            //     "yhfx": stryhfx,
            //     "yhqc": stryhqc,
            //     "yhqyp": stryhqyp,
            //     "content": "",
            // });
            // popup.setContent(info);
            // this.map.infoWindow = popup;
            // this.map.infoWindow.show(mapPoint);
            // popup.maximize();

            // that.popup.setSize(600, 700);
            // var Obj = that.popup.Show("隐患信息", info, true);

            // //定义音频播放
            // $(".hiddedangerinfo_audio").off("mouseover").on("mouseover", function (e) {
            //     $(e.currentTarget).attr("src", this.config.audio_light);
            //     $(e.currentTarget).data("yhqyp");
            //     var pong = new Howl({ src: [$(e.currentTarget).data("yhqyp")] });
            //     pong.play();

            // }.bind(this));


            // $(".hiddedangerinfo_audio").off("mouseout").on("mouseout", function (e) {
            //     $(e.currentTarget).attr("src", this.config.audio);
            //     $(e.currentTarget).data("yhqyp");
            //     var pong = new Howl({ src: [$(e.currentTarget).data("yhqyp")] });
            //     pong.stop();

            // }.bind(this));


            // //定义弹出照片墙

            // $(".picture-audit").off("click").on("click", function (e) {
            //     $(e.currentTarget).children();
            //     var data = [];
            //     for (var i = 0; i < $(e.currentTarget).children().length; i++) {
            //         data.push({ src: (<any>$(e.currentTarget).children()[i]).src, alt: $(e.currentTarget).children().attr("alt") });
            //     }
            //     this.photowall.setSize(600, 650);
            //     var htmlString = _.template(this.template.split('$$')[2])({ photoData: data });
            //     var Obj = this.photowall.Show("照片", htmlString);


            // }.bind(this));


            // //打印
            // this.print_address = $(e.currentTarget).data("address");
            // this.print_describe = "设备类型：" + $(e.currentTarget).data("equid_name") + "</br>" + "隐患类型：" + $(e.currentTarget).data("trouble_type_name") + "</br>" + "描述：" + $(e.currentTarget).data("notes");
            // this.print_xjry = $(e.currentTarget).data("username");
            // this.print_uploadtime = $(e.currentTarget).data("uploadtime");
            // //定义打印事件
            // $(".btn-handleregistration").off("click").on("click", function (e) {





            // }.bind(this));














        }.bind(this));


        $(".yhaudit").off("click").on("click", function (e) {

            this.trouble_id = $(e.currentTarget).data("id");



            //设置参数

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
                stryhqyp = "暂无音频";
            }



            var state = "";
            var handle_trouble_clear = "";
            var info = "";
            if ($(e.currentTarget).data("handle_trouble_clear") == 0) {
                handle_trouble_clear = "未清除";
            } else {
                handle_trouble_clear = "已清除";

            }
            if ($(e.currentTarget).data("state") == 0) {
                state = "否";
                handle_trouble_clear = "无需清除";
            } else if ($(e.currentTarget).data("state") == 1) {
                state = "是";
            } else {
                state = "";
                handle_trouble_clear = "";
            }

            var note = $(e.currentTarget).data("notes");
            if (note.length > 100) {
                // note = note.substring(0, 15) + "...";
                note = "<div class='bz'>" + note + "</div>";
            }


            if ($(e.currentTarget).data("process_id") == 7) {
                this.getTroublePlan2(this.trouble_id);

                this.cur_address = $(e.currentTarget).data("address");
                this.cur_trouble_type_name = $(e.currentTarget).data("trouble_type_name");
                this.cur_device_type_name = $(e.currentTarget).data("device_type_name");
                this.cur_username = $(e.currentTarget).data("username");
                this.cur_yhfx = stryhfx;
                this.cur_yhqyp = stryhqyp;
                this.cur_notes = note;
                this.cur_uploadtime = $(e.currentTarget).data("uploadtime");

                this.cur_safety_content = $(e.currentTarget).data("safety_content");
                this.cur_level_name = $(e.currentTarget).data("level_name");
                this.cur_level_username = $(e.currentTarget).data("level_username");
                this.cur_level_check_username = $(e.currentTarget).data("level_check_username");
                this.cur_level_check_note = $(e.currentTarget).data("level_check_note");

                this.cur_level_time = $(e.currentTarget).data("level_time");
                this.cur_level_check_time = $(e.currentTarget).data("level_check_time");

                this.cur_regionname = $(e.currentTarget).data("regionname");

                this.cur_state = state;

                this.cur_process_id = $(e.currentTarget).data("process_id");

                //处置信息
                this.cur_fund = $(e.currentTarget).data("fund");
                this.cur_duty = $(e.currentTarget).data("duty");
                this.cur_controlmeasure = $(e.currentTarget).data("controlmeasure");
                this.cur_timelimit = $(e.currentTarget).data("timelimit");
                this.cur_emergencymeasure = $(e.currentTarget).data("emergencymeasure");


            }



            this.trouble_id = $(e.currentTarget).data("id");
            //查询,如果没有则登记
            //弹出popup
            // this.popup.setSize(830, 600);
            // var Obj = this.popup.Show("隐患审核", this.template.split('||')[6]);
            // Obj.submitObj.off("click").on("click", function () {

            //     var check_state = Obj.conObj.find('.audit option:selected');
            //     var check_result = Obj.conObj.find('.auditresult');



            //     if (check_state.val() == 2) {
            //         if (check_result.val().trim() == "") {
            //             check_result.addClass('has-error');
            //             check_result.attr("placeholder", "不能为空！");
            //             // this.toast.Show("用户名称不能为空！");
            //             return;
            //         }

            //     }

            //     $.ajax({
            //         headers: {
            //             'Token': AppX.appConfig.xjxj,
            //             'departmentid': AppX.appConfig.departmentid,
            //         },
            //         type: "POST",
            //         url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.checktrouble,
            //         data: {
            //             "trouble_id": this.trouble_id,
            //             "check_state": check_state.val(),
            //             "check_result": check_result.val(),

            //             "check_user": AppX.appConfig.realname,
            //             // f: "pjson"
            //         },
            //         success: this.addhandleregistrationCallback.bind(this),
            //         error: function (data) {
            //             this.toast.Show("服务端ajax出错，获取数据失败!");
            //         }.bind(this),
            //         dataType: "json",
            //     });

            // }.bind(this));




        }.bind(this));




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

    addhandleregistrationCallback(results) {

        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            console.log(results.message);
            return;
        }
        this.popup.Close();
        that.toast.Show(results.message);

        //重新查询
        // this.getUser(this.config.pagenumber);
        this.showLoading();
        this.getHiddenDanger(this.config.pagenumber, this.currentpagesieze, this.trouble_typeid, this.pdaid, this.depid, this.userid, this.process_id);

    }


    getHiddenDanger_icon(pagenumber, pagesize, trouble_typeid, pdaid, depid, userid, process_id) {
        this.currentpage = pagenumber || this.config.pagenumber;
        // this.currentpagesieze = pagesize || this.config.pagesize;
        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getHiddenDangerList,
            data: {
                "pageindex": this.currentpage || this.config.pagenumber,
                "pagesize": this.currentpagesieze || this.config.pagesize,
                "trouble_typeid": trouble_typeid,
                "pdaid": pdaid,
                "userid": userid,
                "depid": depid,
                "process_id": process_id,
                // "handle_state": handle_state,
                // "state": 1,
                // "level_check_state": 1,
                // "handle_trouble_clear": 0,
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
        if (results.result.total % this.config.pagesize == 0) {
            this.totalpage = Math.floor(parseInt(results.result.total) / parseInt(this.config.pagesize));

        } else {
            this.totalpage = Math.floor(parseInt(results.result.total) / parseInt(this.config.pagesize)) + 1;

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
            var firstindex = stryhfx.indexOf("'");
            var lastindex = stryhfx.lastIndexOf("'");
            var strhref = stryhfx.substring(firstindex + 1, lastindex);

            html_trs_data += `<li data-troubleid='${item.id}' data-location_latitude='${item.location_latitude}' data-location_longitude='${item.location_longitude}' data-address='${item.address}' data-notes='${item.handle_before_notes}' data-uploadtime='${item.uploadtime}' data-handle_state='${item.handle_state}' data-state='${item.state}' data-level_name='${item.level_name}' data-level3_name='${item.level3_name}' data-handle_trouble_clear='${item.handle_trouble_clear}' data-equid_name='${item.equid_name}' data-trouble_typeid='${item.trouble_typeid}' data-trouble_type_name='${item.trouble_type_name}' data-device_type_name='${item.device_type_name}'  data-username='${item.username}' data-padid='${item.padid}' data-handle_username='${item.handle_username}' data-yhfx='${item.yhfx}' data-yhqc='${item.yhqc}' data-yhqyp='${item.yhqyp}'><a >${stryhfx}<span>${item.address}</span></a></li>`;
            //href="javascript:void(0)" target="_blank" 
            // html_trs_data += `<li><a href=${strhref} target="_blank">${stryhfx}<span>${item.address}</span></a></li>`;
            //刷新infowindow
            // this.setContent(item);
        }.bind(this));
        domtb.append(html_trs_data);


        //添加事件 .选中高亮
        this.domObj.on('click', '.imglist li', (e) => {
            this.domObj.find('li.active').removeClass('active');
            $(e.currentTarget).addClass('active');


            this.curhiddendangerid = $(e.currentTarget).data("troubleid");

            //定位
            var mapPoint = new Point($(e.currentTarget).data("location_longitude"), $(e.currentTarget).data("location_latitude"), new SpatialReference({ wkid: this.map.spatialReference.wkid }));
            // var strdiv= domConstruct.create("div");
            var popup = new Popup({
                fillSymbol: new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
                    new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                        new Color([255, 0, 0]), 2), new Color([255, 255, 0, 0.25]))
            }, document.createElement("div"));

            popup.setMap(this.map);
            popup.setTitle("<div class='HiddenDangerAudit-id'>标题</div>");
            // that.map.infoWindow.setTitle("<div class='HiddenDangerAudit-id' id=" + $(e.currentTarget).data("id") + ">标题</div>");


            //0，未处理，则处理；1，已处理，则详情

            var info = "";

            var state = "";

            var handle_trouble_clear = "";

            if ($(e.currentTarget).data("handle_trouble_clear") == 0) {
                handle_trouble_clear = "未清除";
            } else {
                handle_trouble_clear = "已清除";

            }

            if ($(e.currentTarget).data("state") == 0) {
                state = "否";
                handle_trouble_clear = "无需清除";
            } else if ($(e.currentTarget).data("state") == 1) {
                state = "是";

            } else {
                state = "";
                handle_trouble_clear = "";
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

            var stryhqyp = "";
            if ($(e.currentTarget).data("yhqyp") != "") {
                if ($(e.currentTarget).data("yhqyp").indexOf(',') >= 0) {
                    $(e.currentTarget).data("yhqyp").split(',').forEach(
                        i => stryhqyp += "<image class='hiddedangerinfo_audio'  src='./widgets/HiddenDangerAudit/images/audio.png' data-yhqyp='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "'/>"
                    );
                    stryhqyp = "<div  class='yy'>" + stryhqyp + "</div>";
                } else {
                    stryhqyp = "<audio class='one' controls='controls' preload='auto' src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + $(e.currentTarget).data("yhqyp") + "'/>";
                }


            } else {
                // stryhqyp = "无";
                stryhqyp = "暂无音频";
            }
            // var info = _.template(this.template.split('||')[1])({
            //     "caption": $(e.currentTarget).data("address"),
            //     "address": $(e.currentTarget).data("address"),
            //     "notes": $(e.currentTarget).data("notes"),
            //     "uploadtime": $(e.currentTarget).data("uploadtime"),
            //     "state": state,
            //     "handle_trouble_clear": handle_trouble_clear,
            //     // "class": handle_trouble_clear,
            //     "trouble_type_name": $(e.currentTarget).data("trouble_type_name"),
            //     "username": $(e.currentTarget).data("username"),
            //     "equid": $(e.currentTarget).data("padid"),
            //     "handle_username": $(e.currentTarget).data("handle_username"),
            //     "yhfx": stryhfx,
            //     "yhqc": stryhqc,
            //     "yhqyp": stryhqyp,
            //     "content": "",
            // });

            var note = $(e.currentTarget).data("notes");
            if (note.length > 100) {
                // note = note.substring(0, 15) + "...";
                note = "<div class='bz'>" + note + "</div>";
            }


            if ($(e.currentTarget).data("state") == 0) {
                info = _.template(this.template.split('||')[3])({
                    "caption": $(e.currentTarget).data("address"),
                    "address": $(e.currentTarget).data("address"),
                    "notes": note,
                    "uploadtime": $(e.currentTarget).data("uploadtime"),
                    "state": state,
                    "handle_trouble_clear": handle_trouble_clear,
                    "trouble_type_name": $(e.currentTarget).data("trouble_type_name"),
                    "device_type_name": $(e.currentTarget).data("device_type_name"),
                    "username": $(e.currentTarget).data("username"),
                    "equid": $(e.currentTarget).data("padid"),
                    "handle_username": $(e.currentTarget).data("handle_username"),
                    "yhfx": stryhfx,
                    "yhqc": stryhqc,
                    "yhqyp": stryhqyp,
                    "content": "",

                    //处置信息
                    "fund": $(e.currentTarget).data("fund"),
                    "duty": $(e.currentTarget).data("duty"),
                    "controlmeasure": $(e.currentTarget).data("controlmeasure"),
                    "timelimit": $(e.currentTarget).data("timelimit"),
                    "emergencymeasure": $(e.currentTarget).data("emergencymeasure"),

                });

            } else if ($(e.currentTarget).data("state") == 1) {
                info = _.template(this.template.split('||')[1])({
                    "id": $(e.currentTarget).data("id"),
                    "caption": $(e.currentTarget).data("address"),
                    "address": $(e.currentTarget).data("address"),
                    "notes": note,
                    "uploadtime": $(e.currentTarget).data("uploadtime"),
                    "state": state,
                    "yhjb": $(e.currentTarget).data("level_name"),
                    "handle_trouble_clear": handle_trouble_clear,
                    "trouble_type_name": $(e.currentTarget).data("trouble_type_name"),
                    "device_type_name": $(e.currentTarget).data("device_type_name"),
                    "username": $(e.currentTarget).data("username"),
                    "equid": $(e.currentTarget).data("padid"),
                    "handle_username": $(e.currentTarget).data("handle_username"),
                    "yhfx": stryhfx,
                    "yhqc": stryhqc,
                    "yhqyp": stryhqyp,
                    "content": "",

                    //处置信息
                    "fund": $(e.currentTarget).data("fund"),
                    "duty": $(e.currentTarget).data("duty"),
                    "controlmeasure": $(e.currentTarget).data("controlmeasure"),
                    "timelimit": $(e.currentTarget).data("timelimit"),
                    "emergencymeasure": $(e.currentTarget).data("emergencymeasure"),
                });


            } else {

                info = _.template(this.template.split('||')[2])({
                    "caption": $(e.currentTarget).data("address"),
                    "address": $(e.currentTarget).data("address"),
                    "notes": note,
                    "uploadtime": $(e.currentTarget).data("uploadtime"),
                    "state": state,
                    "handle_trouble_clear": handle_trouble_clear,
                    "trouble_type_name": $(e.currentTarget).data("trouble_type_name"),
                    "device_type_name": $(e.currentTarget).data("device_type_name"),
                    "username": $(e.currentTarget).data("username"),
                    "equid": $(e.currentTarget).data("padid"),
                    "handle_username": $(e.currentTarget).data("handle_username"),
                    "yhfx": stryhfx,
                    "yhqc": stryhqc,
                    "yhqyp": stryhqyp,
                    "content": "",

                    //处置信息
                    "fund": $(e.currentTarget).data("fund"),
                    "duty": $(e.currentTarget).data("duty"),
                    "controlmeasure": $(e.currentTarget).data("controlmeasure"),
                    "timelimit": $(e.currentTarget).data("timelimit"),
                    "emergencymeasure": $(e.currentTarget).data("emergencymeasure"),
                });

            }
            popup.setContent(info);
            this.map.infoWindow = popup;
            this.map.infoWindow.show(mapPoint);
            popup.maximize();


            //定义音频播放
            $(".hiddedangerinfo_audio").off("mouseover").on("mouseover", function (e) {
                $(e.currentTarget).attr("src", this.config.audio_light);
                $(e.currentTarget).data("yhqyp");
                var pong = new Howl({ src: [$(e.currentTarget).data("yhqyp")] });
                pong.play();

            }.bind(this));


            $(".hiddedangerinfo_audio").off("mouseout").on("mouseout", function (e) {
                $(e.currentTarget).attr("src", this.config.audio);
                $(e.currentTarget).data("yhqyp");
                var pong = new Howl({ src: [$(e.currentTarget).data("yhqyp")] });
                pong.stop();

            }.bind(this));

            //定义弹出照片墙

            $(".picture-audit").off("click").on("click", function (e) {
                $(e.currentTarget).children();
                var data = [];
                for (var i = 0; i < $(e.currentTarget).children().length; i++) {
                    data.push({ src: (<any>$(e.currentTarget).children()[i]).src, alt: $(e.currentTarget).children().attr("alt") });
                }
                // this.photowall.setSize(600, 650);
                this.photowall.setSize(500, 730);
                var htmlString = _.template(this.template.split('$$')[2])({ photoData: data });
                var Obj = this.photowall.Show("照片", htmlString);


            }.bind(this));



            //打印
            this.print_address = $(e.currentTarget).data("address");
            this.print_describe = "设备类型：" + $(e.currentTarget).data("equid_name") + "</br>" + "隐患类型：" + $(e.currentTarget).data("trouble_type_name") + "</br>" + "描述：" + $(e.currentTarget).data("notes");
            this.print_xjry = $(e.currentTarget).data("username");
            this.print_uploadtime = $(e.currentTarget).data("uploadtime");
            //定义打印事件
            $(".btn-handleregistration").off("click").on("click", function (e) {



            }.bind(this));











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


    handleHiddenDangerCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("处理隐患出错！");
            console.log(results.message);
            return;
        } else {
            that.map.infoWindow.hide();
            that.toast.Show("处理隐患成功！");
            //清空数据
            this.curhiddendangerid = "";
            //重新查询
            // this.getHiddenDanger(this.config.pagenumber, this.config.pagesize, this.trouble_typeid, this.equid, this.handle_userid);

            if (this.showtype == 0) {
                this.showLoading();
                this.getHiddenDanger(this.config.pagenumber, this.config.pagesize, this.trouble_typeid, this.pdaid, this.depid, this.userid, this.process_id);
            } else {
                this.showLoading();
                this.getHiddenDanger_icon(this.config.pagenumber, 1000000, this.trouble_typeid, this.pdaid, this.depid, this.userid, this.process_id);
            }

        }

    }


    getTroublePlan(troubleid) {
        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getTroublePlan + troubleid,
            data: {

            },
            success: this.getTroublePlanCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    getTroublePlanCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("查询设备信息出错！");
            console.log(results.message);
            return;
        }

        // var strxjxx = "";
        // var strzpxx = "";
        // var strypxx = "";

        // $.each(results.result, function (index, item) {
        //     strxjxx += "  <p><span>巡检人员：" + item.main_plan[0].username + "</span></p>";
        //     strxjxx += "  <p><span>巡检周期：" + item.main_plan[0].plan_begindate.split(' ')[0] + "--" + item.main_plan[0].plan_enddate.split(' ')[0] + "</span></p>";
        //     strxjxx += "  <p><span>巡检类型：" + item.main_plan[0].period_name + "</span></p>";
        //     strxjxx += "<table class='table table-bordered  table-striped'><thead> <tr> <th  class='xjrqlie'>日期</th> <th  class='xjzplie'>照片</th> <th>语音</th>   <th>备注 </th> </tr>  </thead> <tbody class='huibaojilu' >";
        //     $.each(item.xunjianluru, function (index, item_tr) {
        //         strzpxx = "";
        //         strypxx = "";

        //         if (item_tr.pic != "") {
        //             if (item_tr.pic.indexOf(',') >= 0) {
        //                 item_tr.pic.split(',').forEach(
        //                     i => strzpxx += "<li><image class='xjzp' src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "' /></li>"
        //                 );
        //             } else {
        //                 strzpxx = "<li><image class='xjzp' src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + item_tr.pic + "' /></li>";
        //             }

        //         } else {
        //             // stryhfx = "无";
        //             strzpxx = "<li><image class='xjzp' src='" + this.config.ZanWuTuPian + "'/></li>";
        //         }

        //         strzpxx = "  <ul id='pictureshow_xj' >" + strzpxx + "</ul>"

        //         if (item_tr.audio != "") {
        //             if (item_tr.audio.indexOf(',') >= 0) {
        //                 item_tr.audio.split(',').forEach(
        //                     i => strypxx += "<audio controls='controls' preload='auto'  src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "'/>"
        //                 );
        //             } else {
        //                 strypxx = "<audio  class='one' controls='controls' preload='auto' src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + item_tr.audio + "'/>";
        //             }
        //         } else {
        //             strypxx = "暂无音频";
        //         }

        //         strxjxx += " <tr> <td>" + item_tr.create_time.split(' ')[0] + " </td><td> <div class='xjzpdiv picture-audit'>" + strzpxx + " </div></td> <td> " + strypxx + "</td>  <td> " + item_tr.notes + "</td> </tr> ";



        //     }.bind(this));





        //     strxjxx += " </tbody> </table>";


        // }.bind(this));



        var strxjxx = "";
        var strzpxx = "";
        var strypxx = "";


        var strqcxx = "";
        var strqczpxx = "";
        var strqcypxx = "";

        var num = 0;

        var strshxx = "";

        $.each(results.result, function (index, item) {
            strxjxx += "  <p><span>巡检人员：" + item.main_plan[0].username + "</span></p>";
            strxjxx += "  <p><span>巡检周期：" + item.main_plan[0].plan_begindate.split(' ')[0] + "--" + item.main_plan[0].plan_enddate.split(' ')[0] + "</span></p>";
            strxjxx += "  <p><span>巡检类型：" + item.main_plan[0].period_name + "</span></p>";
            strxjxx += "<table class='table table-bordered  table-striped'><thead> <tr> <th class='xjlxlie'>类型</th><th  class='xjrqlie'>日期</th> <th  class='xjzplie'>照片</th> <th>语音</th> <th class='xjbzlie'>备注</th></tr>  </thead> <tbody class='huibaojilu' >";
            $.each(item.xunjianluru, function (index, item_tr) {
                strzpxx = "";
                if (item_tr.pic != "") {
                    if (item_tr.pic.indexOf(',') >= 0) {
                        item_tr.pic.split(',').forEach(
                            i => strzpxx += "<li><image class='xjzp' src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "' /></li>"
                        );
                    } else {
                        strzpxx = "<li><image class='xjzp' src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + item_tr.pic + "' /></li>";
                    }

                } else {

                    strzpxx = "<li><image class='xjzp' src='" + this.config.ZanWuTuPian + "'/></li>";
                    // strzpxx = "暂无图片";
                }
                strzpxx = "  <ul class='pictureshow_xj' >" + strzpxx + "</ul>"


                strypxx = "";
                if (item_tr.audio != "") {
                    if (item_tr.audio.indexOf(',') >= 0) {
                        item_tr.audio.split(',').forEach(
                            i => strypxx += "<audio controls='controls' preload='auto'  src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "'/>"
                        );
                    } else {
                        strypxx = "<audio controls='controls' preload='auto' src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + item_tr.audio + "'/>";
                    }


                } else {
                    // stryhfx = "无";
                    strypxx = "暂无音频";
                }
                var lx = "";
                if (item_tr.type == 0) {
                    lx = "一般录入";
                } else {
                    lx = "清除照片";
                }

                var state = "";
                if (item_tr.check_state == 0) {
                    state = "待审核";
                } else if (item_tr.check_state == 1) {
                    state = "通过";
                } else if (item_tr.check_state == 2) {
                    state = "不通过";
                }



                if (item_tr.type == 0) {
                    strxjxx += " <tr> <td>" + lx + "</td><td>" + item_tr.create_time + " </td> <td><div class='xjzpdiv picture-search'> " + strzpxx + " </div></td><td><div class='xjypdiv'> " + strypxx + " </div> </td> <td>" + item_tr.notes + " </td></tr> ";

                } else {
                    strxjxx += " <tr> <td>" + lx + "</td><td>" + item_tr.create_time + " </td> <td><div class='xjzpdiv picture-search'> " + strzpxx + " </div></td><td><div class='xjypdiv'> " + strypxx + " </div> </td> <td>" + item_tr.notes + " </td></tr> ";


                    if (item_tr.check_state == 0) {
                        strxjxx += " <tr class='qcborder'> <td colspan='5'> 状态：" + state + " </td> </tr> ";


                    } else {
                        strxjxx += " <tr class='qcborder'> <td colspan='5'>审核人：" + item_tr.check_user + "  &nbsp &nbsp 状态：" + state + "  &nbsp &nbsp审核意见：" + item_tr.check_result + " </td> </tr> ";

                    }

                }



                if (index == 0) {
                    num = item_tr.check_num;
                }
                if (num = item_tr.check_num) {
                    item_tr.check_user;
                    item_tr.check_user;
                    item_tr.notes;

                    strshxx += "  <p><span>审核人员：" + item_tr.check_user + "</span></p>";
                    strshxx += "  <p><span>审核意见：" + item_tr.notes + "</span></p>";
                    strshxx += "  <p><span>审核日期" + item_tr.check_user + "</span></p> </br>";

                }



            }.bind(this));

            strxjxx += " </tbody> </table>";






        }.bind(this));






        //待审核
        var info = _.template(this.template.split('||')[1])({
            "address": this.cur_address,
            "trouble_type_name": this.cur_trouble_type_name,
            "device_type_name": this.cur_device_type_name,
            "username": this.cur_username,
            "yhfx": this.cur_yhfx,
            "yhqyp": this.cur_yhqyp,
            "notes": this.cur_notes,
            "uploadtime": this.cur_uploadtime,

            "safety_content": this.cur_safety_content,
            "level_name": this.cur_level_name,
            "level_username": this.cur_level_username,
            "level_check_username": this.cur_level_check_username,
            "level_check_note": this.cur_level_check_note,

            "level_time": this.cur_level_time,
            "level_check_time": this.cur_level_check_time,


            "regionname": this.cur_regionname,
            //处置信息
            "fund": this.cur_fund,
            "duty": this.cur_duty,
            "controlmeasure": this.cur_controlmeasure,
            "timelimit": this.cur_timelimit,
            "emergencymeasure": this.cur_emergencymeasure,


            "state": this.cur_state,
            "xjxx": strxjxx,
        });
        //弹出popup
        this.popup.setSize(1100, 720);



        var Obj = this.popup.Show("隐患信息", info, true);
        if (this.popup.domObj.find("#pictureshow").length > 0) {
            this.popup.domObj.find("#pictureshow").viewer();
        }

        if (this.popup.domObj.find(".pictureshow_xj").length > 0) {
            this.popup.domObj.find(".pictureshow_xj").viewer();
        }
        if (this.popup.domObj.find(".pictureshow_qc").length > 0) {
            this.popup.domObj.find(".pictureshow_qc").viewer();
        }




        // //定义弹出照片墙

        // $(".picture-audit").off("click").on("click", function (e) {
        //     $(e.currentTarget).children();
        //     var data = [];
        //     for (var i = 0; i < $(e.currentTarget).children().length; i++) {
        //         data.push({ src: (<any>$(e.currentTarget).children()[i]).src, alt: $(e.currentTarget).children().attr("alt") });
        //     }
        //     // this.photowall.setSize(600, 650);
        //     this.photowall.setSize(500, 730);
        //     var htmlString = _.template(this.template.split('$$')[2])({ photoData: data });
        //     var Obj = this.photowall.Show("照片", htmlString);


        // }.bind(this));





    }


    getTroublePlan2(troubleid) {
        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getTroublePlan + troubleid,
            data: {

            },
            success: this.getTroublePlanCallback2.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    getTroublePlanCallback2(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("查询设备信息出错！");
            console.log(results.message);
            return;
        }

        var strxjxx = "";
        var strzpxx = "";
        var strypxx = "";
        // var lastnum = 0;

        var curindex = 0;//最新清除的索引

        var username = "";

        var yhqcnotes = "";

        $.each(results.result, function (index, item) {

            strzpxx = "";
            strypxx = "";

            $.each(item.xunjianluru, function (index, item_tr) {

                // if (index == 0) {
                //     lastnum = item_tr.check_num;
                //     yhqcnotes = item_tr.notes;
                // }lastnum == item_tr.check_num &&
                if (item_tr.type == 0) {
                    curindex += 1;
                }
                if (item_tr.type == 1) {
                    if (index != curindex) {
                        return;
                    }
                    username = item_tr.create_username;
                    curindex = index;
                    yhqcnotes = item_tr.notes;
                    if (item_tr.pic != "") {
                        if (item_tr.pic.indexOf(',') >= 0) {
                            item_tr.pic.split(',').forEach(
                                i => strzpxx += "<li><image class='xjzp' src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "' /></li>"
                            );
                        } else {
                            strzpxx = "<li><image class='xjzp' src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + item_tr.pic + "' /></li>";
                        }

                    } else {
                        // stryhfx = "无";
                        strzpxx = "<li><image class='xjzp' src='" + this.config.ZanWuTuPian + "'/></li>";
                    }


                    if (item_tr.audio != "") {
                        if (item_tr.audio.indexOf(',') >= 0) {
                            item_tr.audio.split(',').forEach(
                                i => strypxx += "<audio controls='controls' preload='auto'  src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "'/>"
                            );
                            strypxx = "<div  class='yy'>" + strypxx + "</div>";
                        } else {
                            strypxx = "<audio class='one' controls='controls' preload='auto' src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + item_tr.audio + "'/>";
                        }
                    } else {
                        strypxx = "暂无音频";
                    }
                }


            }.bind(this));
            strzpxx = "  <ul class='pictureshow_xj' >" + strzpxx + "</ul>"



        }.bind(this));









        //待审核
        var info = _.template(this.template.split('||')[6])({
            "address": this.cur_address,
            "trouble_type_name": this.cur_trouble_type_name,
            "device_type_name": this.cur_device_type_name,
            "username": this.cur_username,//this.cur_username,  username
            "yhfx": this.cur_yhfx,
            "yhqyp": this.cur_yhqyp,
            "notes": this.cur_notes,
            "uploadtime": this.cur_uploadtime,

            "safety_content": this.cur_safety_content,
            "level_name": this.cur_level_name,
            "level_username": this.cur_level_username,
            "level_check_username": this.cur_level_check_username,
            "level_check_note": this.cur_level_check_note,

            "regionname": this.cur_regionname,

            //处置信息
            "fund": this.cur_fund,
            "duty": this.cur_duty,
            "controlmeasure": this.cur_controlmeasure,
            "timelimit": this.cur_timelimit,
            "emergencymeasure": this.cur_emergencymeasure,

            "state": this.cur_state,

            // "check_time": results.result[0].xunjianluru[0].create_time,
            "xjxx": strxjxx,
            "yhqcnotes": yhqcnotes,
            "yhqczp": strzpxx,
            "yhqcyy": strypxx,

            "qcusername": username,//this.cur_username,  username


        });
        //弹出popup
        this.popup.setSize(1200, 730);



        var Obj = this.popup.Show("隐患信息", info, false);
        if (this.popup.domObj.find("#pictureshow").length > 0) {
            this.popup.domObj.find("#pictureshow").viewer();
        }

        if (this.popup.domObj.find(".pictureshow_xj").length > 0) {
            this.popup.domObj.find(".pictureshow_xj").viewer();
        }
        if (this.popup.domObj.find(".pictureshow_qc").length > 0) {
            this.popup.domObj.find(".pictureshow_qc").viewer();
        }



        Obj.submitObj.off("click").on("click", function () {

            var check_state = Obj.conObj.find('.audit option:selected');
            var check_result = Obj.conObj.find('.auditresult');


            if (check_state.val() == 2) {
                if (check_result.val().trim() == "") {
                    check_result.addClass('has-error');
                    check_result.attr("placeholder", "不能为空！");
                    // this.toast.Show("用户名称不能为空！");
                    return;
                }

            }

            $.ajax({
                headers: {
                    'Token': AppX.appConfig.xjxj,
                    'departmentid': AppX.appConfig.departmentid,
                },
                type: "POST",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.checktrouble,
                data: {
                    "trouble_id": this.trouble_id,
                    "check_state": check_state.val(),
                    "check_result": check_result.val(),

                    "check_user": AppX.appConfig.realname,
                    // f: "pjson"
                },
                success: this.addhandleregistrationCallback.bind(this),
                error: function (data) {
                    this.toast.Show("服务端ajax出错，获取数据失败!");
                }.bind(this),
                dataType: "json",
            });

        }.bind(this));




        // //定义弹出照片墙

        // $(".picture-audit").off("click").on("click", function (e) {
        //     $(e.currentTarget).children();
        //     var data = [];
        //     for (var i = 0; i < $(e.currentTarget).children().length; i++) {
        //         data.push({ src: (<any>$(e.currentTarget).children()[i]).src, alt: $(e.currentTarget).children().attr("alt") });
        //     }
        //     // this.photowall.setSize(600, 650);
        //     this.photowall.setSize(500, 730);
        //     var htmlString = _.template(this.template.split('$$')[2])({ photoData: data });
        //     var Obj = this.photowall.Show("照片", htmlString);


        // }.bind(this));





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
        var strequids = "<option > </option>";
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
                        i => stryhfx += "<li><image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "'/></li>"
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
                "notes": p.notes,
                "uploadtime": p.uploadtime.replace('T', '  '),
                "handle_state": handle_state,
                "trouble_type_name": p.trouble_type_name,
                "device_type_name": p.device_type_name,
                "level1_name": level1_name,
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
        popupTemplate2.setContent(templateArr[5])


        // cluster layer that uses OpenLayers style clustering
        if (this.hiddendangeraudit_clusterLayer_hiddendanger != null) {
            this.map.removeLayer(this.hiddendangeraudit_clusterLayer_hiddendanger);
            this.hiddendangeraudit_clusterLayer_hiddendanger = null
        }
        this.hiddendangeraudit_clusterLayer_hiddendanger = new ClusterLayer({
            "basemap": this.map,
            "data": photoInfo.data,
            "distance": 10,
            "id": "hiddendangeraudit_clusters",
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
        this.hiddendangeraudit_clusterLayer_hiddendanger.setRenderer(renderer);
        //this.hiddendangeraudit_clusterLayer_hiddendanger.symbol = blue;
        this.map.addLayer(this.hiddendangeraudit_clusterLayer_hiddendanger);
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
            $.each($(".widget-hiddendangeraudit .operation"), function (i, value) {
                if ($(value).data("id") == id) {

                    $($(".widget-hiddendangeraudit  .operation")[i]).trigger("click");

                }
            });

            $.each($(".widget-hiddendangeraudit .imglist li"), function (i, value) {
                if ($(value).data("troubleid") == id) {

                    $($(".widget-hiddendangeraudit  .imglist li")[i]).trigger("click");

                }
            });


        }.bind(this));

    }

    getFiles(id) {
        //查询图片
        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getFiles,
            data: {
                "tableid": id,

                // f: "pjson"
            },
            success: this.getFilesCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    getFilesCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("查询隐患类型信息出错！");
            console.log(results.message);
            return;
        }

        var before = true;
        var after = true;
        var m = 0;
        var n = 0;
        $.each(results.result.rows, function (i, value) {

            if (value.filenote == "隐患发现") {



            } else {


            }

        });

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
        if (this.hiddendangeraudit_clusterLayer_hiddendanger) {
            this.map.removeLayer(this.hiddendangeraudit_clusterLayer_hiddendanger);
        }
        this.domObj.remove();
        this.afterDestroy();
    }

}