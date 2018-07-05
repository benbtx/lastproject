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

export = HiddenDangerAttachmentUpload;

class HiddenDangerAttachmentUpload extends BaseWidget {
    baseClass = "widget-hiddendangerattachmentupload";
    map = null;
    toast = null;
    photowall = null;
    popup = null;

    totalpage = 1;
    currentpage = 1;
    currentpagesieze = 1;
    curenthiddendangertypeid = "";
    trouble_typeid = "";
    pdaid = "";
    userid = "";
    padname = "";
    username = "";

    handle_state = "";
    handle_trouble_clear = "";
    clusterLayer_hiddendanger = null;//数据库中的隐患
    curpage = null;

    showtype = 0;//0列表模式，1图标模式

    curhiddendangerid = "";


    print_address = "";
    print_describe = "";
    print_xjry = "";
    print_uploadtime = "";

    trouble_id = "";


    startup() {
        this.configure();
        this.initHtml();
        this.initEvent();
    }
    initHtml() {
        var html = _.template(this.template.split('$$')[0] + "</div>")();
        // var html = _.template(this.template.split('$$')[0])();
        this.setHtml(html);
        this.ready();
        this.getHiddenDanger(this.config.pagenumber, this.config.pagesize, this.trouble_typeid, this.pdaid, this.userid, this.handle_state, this.handle_trouble_clear);
    }

    configure() {
        this.toast = this.AppX.runtimeConfig.toast;
        this.photowall = this.AppX.runtimeConfig.photowall;
        this.popup = this.AppX.runtimeConfig.popup;
        this.map = this.AppX.runtimeConfig.map;

    }



    initEvent() {
        var that = this;

        //查询按钮单击事件
        this.domObj.find('.btn-search').off("click").on("click", function () {
            this.trouble_typeid = this.domObj.find(".trouble_typeid").val();

            this.pdaid = this.domObj.find(".pdaid option:selected").val()

            this.userid = this.domObj.find(".username").val();

            this.username = this.domObj.find(".username").val();

            this.handle_state = this.domObj.find(".handle_state").val();
            this.handle_trouble_clear = this.domObj.find(".handle_trouble_clear").val();
            if (this.trouble_typeid == '' && this.pdaid == '' && this.handle_userid == '') {
                // name.addClass('has-error');
                // name.attr("placeholder", "不能为空！");
                // this.toast.Show("请输入查询条件！");
                // return;
            }
            if (this.showtype == 0) {
                this.getHiddenDanger(this.config.pagenumber, this.config.pagesize, this.trouble_typeid, this.pdaid, this.userid, this.handle_state, this.handle_trouble_clear);

            } else {
                this.getHiddenDanger_icon(this.config.pagenumber, 1000000, this.trouble_typeid, this.pdaid, this.userid, this.handle_state, this.handle_trouble_clear);
            }

        }.bind(this));


        this.domObj.find('.save2csv').off("click").on("click", function () {
            // var pong = new Howl({ src: ['http://localhost:3000/widgets/HiddenDangerAttachmentUpload/1.mp3'] });
            // pong.play();
            //    var pong = new Howl({urls: ['http://www.javascriptoo.com/application/html/pong.wav']})
            //this.Save2File(this.data.tabs[this.getActiveTabIndex()]);
            Save2File(this.curpage);
            //查询出所有数据

        }.bind(this));

        // 选中行高亮
        this.domObj.off("click").on('click', 'tbody tr', (e) => {
            if ($(e.currentTarget).data("id") == null) { return; }
            this.domObj.find('tr.active').removeClass('active');
            $(e.currentTarget).addClass('active');
            var mapPoint = new Point($(e.currentTarget).data("location_longitude"), $(e.currentTarget).data("location_latitude"), new SpatialReference({ wkid: that.map.spatialReference.wkid }));
            this.map.centerAndZoom(mapPoint, 17);


            //添加音频
            //this.getFiles($(e.currentTarget).data("id"));


            //定位
            // var mapPoint = new Point($(e.currentTarget).data("location_longitude"), $(e.currentTarget).data("location_latitude"), new SpatialReference({ wkid: that.map.spatialReference.wkid }));
            // // that.map.getInfoWindowAnchor(that.map.toScreen(mapPoint));
            // //this.clusterLayer_hiddendanger.infoTemplate=this.clusterLayer_hiddendanger._singleTemplate.content;
            // that.map.infoWindow.setTitle("<div class='HiddenDangerAttachmentUpload-id' id=" + $(e.currentTarget).data("id") + ">标题</div>");
            // //that.map.infoWindow.setContent(this.clusterLayer_hiddendanger._singleTemplate.content);
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


            // this.map.centerAndZoom(localtionpoint, 17);
            // // var screenpoint = this.map.toScreen(mapPoint);
            // // //往左下角偏移
            // // var screenpoint2 = new ScreenPoint(screenpoint.x - 220, screenpoint.y - 200);
            // // var mappoint2 = this.map.toMap(screenpoint2);
            // // this.map.centerAndZoom(mappoint2, 17);
            // that.map.infoWindow.show(mapPoint, InfoWindow.ANCHOR_UPPERLEFT);




        });

        //图标模式
        this.domObj.find('.btn_icon').off("click").on("click", function () {
            this.showtype = 1;
            var preheight = this.domObj.find(".halfpaneltable").height();
            //进入图标模式
            //查询当前用户具体的任务安排
            this.domObj.empty();
            this.domObj.append(this.template.split('$$')[1]);

            this.initEvent();
            //查询图片
            this.getHiddenDanger_icon(this.config.pagenumber, 1000000, this.trouble_typeid, this.pdaid, this.userid, this.handle_state, this.handle_trouble_clear);
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
            var html = _.template(this.template.split('$$')[0] + "</div>")();
            // var html = _.template(this.template.split('$$')[0])();
            // this.setHtml(html);
            this.domObj.append(html);
            this.initEvent();
            // this.currentpagesieze = prepagesize;
            // this.ready();
            // this.getHiddenDanger(this.config.pagenumber, this.config.pagesize, this.trouble_typeid, this.pdaid, this.userid, this.handle_state, this.handle_trouble_clear);
            this.getHiddenDanger(this.currentpage, this.currentpagesieze, this.trouble_typeid, this.pdaid, this.userid, this.handle_state, this.handle_trouble_clear);
            this.domObj.find(".halfpaneltable").height(preheight);
        }.bind(this));






        //动态生成书签及分页控件
        //分页控件fykj 向前、向后事件
        this.domObj.find(".pre").off("click").on("click", function () {

            if (this.currentpage - 1 > 0) {
                that.map.infoWindow.hide();
                //清空图层

                if (this.clusterLayer_hiddendanger) {
                    this.clusterLayer_hiddendanger.clear();
                }
                this.currentpage = this.currentpage - 1;
                this.getHiddenDanger(this.currentpage, this.currentpagesieze, this.trouble_typeid, this.pdaid, this.userid, this.handle_state, this.handle_trouble_clear);

            }


        }.bind(this));
        this.domObj.find(".next").off("click").on("click", function () {

            if (this.currentpage + 1 <= this.totalpage) {
                that.map.infoWindow.hide();
                //清空图层
                if (this.clusterLayer_hiddendanger) {
                    this.clusterLayer_hiddendanger.clear();
                }
                this.currentpage = this.currentpage + 1;
                this.getHiddenDanger(this.currentpage, this.currentpagesieze, this.trouble_typeid, this.pdaid, this.userid, this.handle_state, this.handle_trouble_clear);
            }
        }.bind(this));

        this.domObj.find(".pageturning").off("click").on("click", function () {
            var currpage = parseInt(this.domObj.find(".currpage").val());
            if (currpage <= this.totalpage && currpage >= 1) {
                that.map.infoWindow.hide();
                //清空图层
                if (this.clusterLayer_hiddendanger) {
                    this.clusterLayer_hiddendanger.clear();
                }
                this.currentpage = parseInt(this.domObj.find(".currpage").val());
                this.getHiddenDanger(this.currentpage, this.currentpagesieze, this.trouble_typeid, this.pdaid, this.userid, this.handle_state, this.handle_trouble_clear);
            }
        }.bind(this));




        this.domObj.find(".dynamic_pagesize").off("change").on("change", function () {
            //清空图层
            if (this.clusterLayer_hiddendanger) {
                this.clusterLayer_hiddendanger.clear();
            }
            //重新查询

            this.currentpage = parseInt(this.domObj.find(".dynamic_pagesize").val());

            this.getHiddenDanger(this.config.pagenumber, this.currentpage, this.trouble_typeid, this.pdaid, this.userid, this.handle_state, this.handle_trouble_clear);
            this.domObj.find(".halfpaneltable").height(this.domObj.find(".halfpaneltable").height());



        }.bind(this));





    }




    getHiddenDanger(pagenumber, pagesize, trouble_typeid, pdaid, userid, handle_state, handle_trouble_clear) {
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
                "handle_state": handle_state,
                "state": 1,
                "level_check_state": 1,
                "handle_trouble_clear": 0,
                "fill_state": 0,
                // f: "pjson"
            },
            success: this.getHiddenDangerListCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
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


            html_trs_data += "<tr class=goto  data-id='" + item.id + "' data-location_longitude='" + item.location_longitude + "' data-location_latitude='" + item.location_latitude + "' data-address='" + item.address + "' data-notes='" + item.notes + "' data-uploadtime='" + item.uploadtime + "' data-handle_state='" + item.handle_state + "' data-state='" + item.state + "' data-level_name='" + item.level_name + "' data-level3_name='" + item.level3_name + "' data-handle_trouble_clear='" + item.handle_trouble_clear + "' data-trouble_typeid='" + item.trouble_typeid + "' data-username='" + item.username + "' data-padid='" + item.padid + "' data-handle_username='" + item.handle_username + "' data-level3_name='" + item.level3_name + "' data-yhfx='" + item.yhfx + "' data-yhqc='" + item.yhqc + "'   data-yhyp='" + item.yhyp + "'><td>" + item.padname + "</td><td>" + item.equid_name + "</td><td>" + item.trouble_type_name + "</td><td>" + item.notes + "</td><td>" + item.username + "</td><td>" + item.address + "</td><td>" + item.uploadtime + "</td><td>" + state + "</td><td>" + str_fill_state + "</td><td>" + hanletroubleclear + "</td><td><a class='operation' data-id='" + item.id + "' data-location_longitude='" + item.location_longitude + "' data-location_latitude='" + item.location_latitude + "' data-address='" + item.address + "' data-notes='" + item.notes + "' data-uploadtime='" + item.uploadtime + "' data-handle_state='" + item.handle_state + "' data-state='" + item.state + "' data-level_name='" + item.level_name + "' data-level3_name='" + item.level3_name + "' data-handle_trouble_clear='" + item.handle_trouble_clear + "' data-equid_name='" + item.equid_name + "' data-trouble_type_name='" + item.trouble_type_name + "' data-username='" + item.username + "' data-padid='" + item.padid + "' data-handle_username='" + item.handle_username + "' data-level3_name='" + item.level3_name + "' data-yhfx='" + item.yhfx + "' data-yhqc='" + item.yhqc + "'  data-yhyp='" + item.yhyp + "'>详情</a></td><td><a class='attachmentupload' data-id='" + item.id + "' >附件上传</a></td></tr>";
            //刷新infowindow
            // this.setContent(item);
        }.bind(this));
        domtb.append(html_trs_data);


        var html_trs_blank = "";
        if (results.result.rows.length < that.config.pagesize) {
            var num = that.config.pagesize - results.result.rows.length;
            for (var i = 0; i < num; i++) {
                html_trs_blank += "<tr class=goto data-id='null'><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>";
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

            var popup = new Popup({
                fillSymbol: new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
                    new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                        new Color([255, 0, 0]), 2), new Color([255, 255, 0, 0.25]))
            }, document.createElement("div"));

            popup.setMap(this.map);
            popup.setTitle("<div class='HiddenDangerAttachmentUpload-id'>标题</div>");




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

            var stryhyp = "";
            if ($(e.currentTarget).data("yhyp") != "") {
                if ($(e.currentTarget).data("yhyp").indexOf(',') >= 0) {
                    $(e.currentTarget).data("yhyp").split(',').forEach(
                        i => stryhyp += "<image class='hiddedangerinfo_audio'  src='./widgets/HiddenDangerAttachmentUpload/images/audio.png' data-yhyp='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "'/>"
                    );
                } else {
                    stryhyp = "<image class='hiddedangerinfo_audio' src='./widgets/HiddenDangerAttachmentUpload/images/audio.png' data-yhyp='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + $(e.currentTarget).data("yhyp") + "'/>";
                }

            } else {
                // stryhyp = "无";
                stryhyp = "";
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



            if ($(e.currentTarget).data("state") == 0) {
                info = _.template(this.template.split('||')[3])({
                    "caption": $(e.currentTarget).data("address"),
                    "address": $(e.currentTarget).data("address"),
                    "notes": $(e.currentTarget).data("notes"),
                    "uploadtime": $(e.currentTarget).data("uploadtime"),
                    "state": state,
                    "handle_trouble_clear": handle_trouble_clear,
                    "trouble_type_name": $(e.currentTarget).data("trouble_type_name"),
                    "username": $(e.currentTarget).data("username"),
                    "equid": $(e.currentTarget).data("padid"),
                    "handle_username": $(e.currentTarget).data("handle_username"),
                    "yhfx": stryhfx,
                    "yhqc": stryhqc,
                    "yhyp": stryhyp,
                    "content": "",
                });

            } else if ($(e.currentTarget).data("state") == 1) {
                info = _.template(this.template.split('||')[1])({
                    "id": $(e.currentTarget).data("id"),
                    "caption": $(e.currentTarget).data("address"),
                    "address": $(e.currentTarget).data("address"),
                    "notes": $(e.currentTarget).data("notes"),
                    "uploadtime": $(e.currentTarget).data("uploadtime"),
                    "state": state,
                    "yhjb": $(e.currentTarget).data("level_name"),
                    "handle_trouble_clear": handle_trouble_clear,
                    "trouble_type_name": $(e.currentTarget).data("trouble_type_name"),
                    "username": $(e.currentTarget).data("username"),
                    "equid": $(e.currentTarget).data("padid"),
                    "handle_username": $(e.currentTarget).data("handle_username"),
                    "yhfx": stryhfx,
                    "yhqc": stryhqc,
                    "yhyp": stryhyp,
                    "content": "",
                });


            } else {

                info = _.template(this.template.split('||')[2])({
                    "caption": $(e.currentTarget).data("address"),
                    "address": $(e.currentTarget).data("address"),
                    "notes": $(e.currentTarget).data("notes"),
                    "uploadtime": $(e.currentTarget).data("uploadtime"),
                    "state": state,
                    "handle_trouble_clear": handle_trouble_clear,
                    "trouble_type_name": $(e.currentTarget).data("trouble_type_name"),
                    "username": $(e.currentTarget).data("username"),
                    "equid": $(e.currentTarget).data("padid"),
                    "handle_username": $(e.currentTarget).data("handle_username"),
                    "yhfx": stryhfx,
                    "yhqc": stryhqc,
                    "yhyp": stryhyp,
                    "content": "",
                });

            }

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
            //     "yhyp": stryhyp,
            //     "content": "",
            // });
            popup.setContent(info);
            this.map.infoWindow = popup;
            this.map.infoWindow.show(mapPoint);
            popup.maximize();


            //定义音频播放
            $(".hiddedangerinfo_audio").off("mouseover").on("mouseover", function (e) {
                $(e.currentTarget).data("yhyp");
                var pong = new Howl({ src: [$(e.currentTarget).data("yhyp")] });
                pong.play();

            }.bind(this));


            //定义弹出照片墙

            $(".picture-search").off("click").on("click", function (e) {
                $(e.currentTarget).children();
                var data = [];
                for (var i = 0; i < $(e.currentTarget).children().length; i++) {
                    data.push({ src: (<any>$(e.currentTarget).children()[i]).src, alt: $(e.currentTarget).children().attr("alt") });
                }
                this.photowall.setSize(600, 650);
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














        }.bind(this));


        $(".attachmentupload").off("click").on("click", function (e) {
            this.trouble_id = $(e.currentTarget).data("id");
            //查询,如果没有则登记


            //弹出popup
            this.popup.setSize(600, 300);
            var Obj = this.popup.Show("附件上传", this.template.split('||')[6]);
            this.initFileUploadPlugin(Obj);

            Obj.submitObj.off("click").on("click", function () {
                var fund = Obj.conObj.find('.fund');
                var duty = Obj.conObj.find('.duty');
                var controlmeasure = Obj.conObj.find('.controlmeasure');
                var timelimit = Obj.conObj.find('.timelimit');
                var emergencymeasure = Obj.conObj.find('.emergencymeasure');


                if (fund.val() == '') {
                    fund.addClass('has-error');
                    fund.attr("placeholder", "不能为空！");
                    // this.toast.Show("用户名称不能为空！");
                    return;
                }
                if (duty.val() == '') {
                    duty.addClass('has-error');
                    duty.attr("placeholder", "不能为空！");
                    // this.toast.Show("用户登录账号不能为空！");
                    return;
                }
                if (controlmeasure.val() == '') {
                    controlmeasure.addClass('has-error');
                    controlmeasure.attr("placeholder", "不能为空！");
                    // this.toast.Show("巡检类型不能为空！");
                    return;
                }
                if (timelimit.val() == '') {
                    timelimit.addClass('has-error');
                    timelimit.attr("placeholder", "不能为空！");
                    // this.toast.Show("巡检类型不能为空！");
                    return;
                }
                if (emergencymeasure.val() == '') {
                    emergencymeasure.addClass('has-error');
                    emergencymeasure.attr("placeholder", "不能为空！");
                    // this.toast.Show("巡检类型不能为空！");
                    return;
                }
                $.ajax({
                    headers: {
                        'Token': AppX.appConfig.xjxj,
                        'departmentid': AppX.appConfig.departmentid,
                    },
                    type: "POST",
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.addHandleRegistration,
                    data: {
                        "trouble_id": this.trouble_id,
                        "fund": fund.val(),
                        "duty": duty.val(),
                        "controlmeasure": controlmeasure.val(),
                        "timelimit": timelimit.val(),
                        "emergencymeasure": emergencymeasure.val(),

                        // f: "pjson"
                    },
                    success: this.addhandleregistrationCallback.bind(this),
                    error: function (data) {
                        this.toast.Show("服务端ajax出错，获取数据失败!");
                    }.bind(this),
                    dataType: "json",
                });

            }.bind(this));




        }.bind(this));




        //添加隐患工单气泡

        this.map.infoWindow.resize(400, 260);
        this.addClusters(results.result.rows);

        this.curpage = results.result.rows;


        //初始化设备
        this.getDevices();


        //初始化隐患类型
        this.getTroubleTypes();

        //初始化隐患类型
        this.getUser();








    }


    //初始化上传文件插件
    initFileUploadPlugin(Obj) {
        (<any>Obj.conObj.find("#input-fileupload")).fileinput({
            'language': 'zh',
            'showCaption': true,
            'showPreview ': false,
            'showRemove': false,
            'showUpload': false,
            'previewClass ': {
                height: "100px"
            },
            'initialPreviewCount': 2,
            'initialPreviewConfig': [{
                width: '50px'
            }],
            "allowedFileExtensions": ['apk'],//接收的文件后缀
            'previewFileType': 'image',
            'dropZoneEnabled': true,//是否显示拖拽区域
            'previewSettings': {
                image: { width: "30px", height: "30px" },
            },
        });
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
        this.getHiddenDanger(this.config.pagenumber, this.currentpage, this.trouble_typeid, this.pdaid, this.userid, this.handle_state, this.handle_trouble_clear);

    }


    getHiddenDanger_icon(pagenumber, pagesize, trouble_typeid, pdaid, userid, handle_state, handle_trouble_clear) {
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
                "handle_state": handle_state,
                "state": 1,
                "level_check_state": 1,
                "handle_trouble_clear": 0,
                // f: "pjson"
            },
            success: this.getHiddenDangerIconCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
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

            html_trs_data += `<li data-troubleid='${item.id}' data-location_latitude='${item.location_latitude}' data-location_longitude='${item.location_longitude}' data-address='${item.address}' data-notes='${item.notes}' data-uploadtime='${item.uploadtime}' data-handle_state='${item.handle_state}' data-state='${item.state}' data-level_name='${item.level_name}' data-level3_name='${item.level3_name}' data-handle_trouble_clear='${item.handle_trouble_clear}' data-equid_name='${item.equid_name}' data-trouble_typeid='${item.trouble_typeid}' data-trouble_type_name='${item.trouble_type_name}' data-username='${item.username}' data-padid='${item.padid}' data-handle_username='${item.handle_username}' data-yhfx='${item.yhfx}' data-yhqc='${item.yhqc}' data-yhyp='${item.yhyp}'><a >${stryhfx}<span>${item.address}</span></a></li>`;
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
            popup.setTitle("<div class='HiddenDangerAttachmentUpload-id'>标题</div>");
            // that.map.infoWindow.setTitle("<div class='HiddenDangerAttachmentUpload-id' id=" + $(e.currentTarget).data("id") + ">标题</div>");


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

            var stryhyp = "";
            if ($(e.currentTarget).data("yhyp") != "") {
                if ($(e.currentTarget).data("yhyp").indexOf(',') >= 0) {
                    $(e.currentTarget).data("yhyp").split(',').forEach(
                        i => stryhyp += "<image class='hiddedangerinfo_audio'  src='./widgets/HiddenDangerAttachmentUpload/images/audio.png' data-yhyp='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "'/>"
                    );
                } else {
                    stryhyp = "<image class='hiddedangerinfo_audio' src='./widgets/HiddenDangerAttachmentUpload/images/audio.png' data-yhyp='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + $(e.currentTarget).data("yhyp") + "'/>";
                }

            } else {
                // stryhyp = "无";
                stryhyp = "";
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
            //     "yhyp": stryhyp,
            //     "content": "",
            // });


            if ($(e.currentTarget).data("state") == 0) {
                info = _.template(this.template.split('||')[3])({
                    "caption": $(e.currentTarget).data("address"),
                    "address": $(e.currentTarget).data("address"),
                    "notes": $(e.currentTarget).data("notes"),
                    "uploadtime": $(e.currentTarget).data("uploadtime"),
                    "state": state,
                    "handle_trouble_clear": handle_trouble_clear,
                    "trouble_type_name": $(e.currentTarget).data("trouble_type_name"),
                    "username": $(e.currentTarget).data("username"),
                    "equid": $(e.currentTarget).data("padid"),
                    "handle_username": $(e.currentTarget).data("handle_username"),
                    "yhfx": stryhfx,
                    "yhqc": stryhqc,
                    "yhyp": stryhyp,
                    "content": "",
                });

            } else if ($(e.currentTarget).data("state") == 1) {
                info = _.template(this.template.split('||')[1])({
                    "id": $(e.currentTarget).data("id"),
                    "caption": $(e.currentTarget).data("address"),
                    "address": $(e.currentTarget).data("address"),
                    "notes": $(e.currentTarget).data("notes"),
                    "uploadtime": $(e.currentTarget).data("uploadtime"),
                    "state": state,
                    "yhjb": $(e.currentTarget).data("level_name"),
                    "handle_trouble_clear": handle_trouble_clear,
                    "trouble_type_name": $(e.currentTarget).data("trouble_type_name"),
                    "username": $(e.currentTarget).data("username"),
                    "equid": $(e.currentTarget).data("padid"),
                    "handle_username": $(e.currentTarget).data("handle_username"),
                    "yhfx": stryhfx,
                    "yhqc": stryhqc,
                    "yhyp": stryhyp,
                    "content": "",
                });


            } else {

                info = _.template(this.template.split('||')[2])({
                    "caption": $(e.currentTarget).data("address"),
                    "address": $(e.currentTarget).data("address"),
                    "notes": $(e.currentTarget).data("notes"),
                    "uploadtime": $(e.currentTarget).data("uploadtime"),
                    "state": state,
                    "handle_trouble_clear": handle_trouble_clear,
                    "trouble_type_name": $(e.currentTarget).data("trouble_type_name"),
                    "username": $(e.currentTarget).data("username"),
                    "equid": $(e.currentTarget).data("padid"),
                    "handle_username": $(e.currentTarget).data("handle_username"),
                    "yhfx": stryhfx,
                    "yhqc": stryhqc,
                    "yhyp": stryhyp,
                    "content": "",
                });

            }
            popup.setContent(info);
            this.map.infoWindow = popup;
            this.map.infoWindow.show(mapPoint);
            popup.maximize();



            //定义弹出照片墙

            $(".picture-search").off("click").on("click", function (e) {
                $(e.currentTarget).children();
                var data = [];
                for (var i = 0; i < $(e.currentTarget).children().length; i++) {
                    data.push({ src: (<any>$(e.currentTarget).children()[i]).src, alt: $(e.currentTarget).children().attr("alt") });
                }
                this.photowall.setSize(600, 650);
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

        //初始化隐患类型
        this.getUser();



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
                this.getHiddenDanger(this.config.pagenumber, this.config.pagesize, this.trouble_typeid, this.pdaid, this.userid, this.handle_state, this.handle_trouble_clear);
            } else {
                this.getHiddenDanger_icon(this.config.pagenumber, 1000000, this.trouble_typeid, this.pdaid, this.userid, this.handle_state, this.handle_trouble_clear);
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
        var strtrouble_typeids = "<option > </option>";
        $.each(results.result.rows, function (index, item) {
            // strtrouble_typeids += "<option value=" + item.id + " > " + item.name + " </option>";
            strtrouble_typeids += "<option value=" + item.id + " > " + item.name + " </option>";

        }.bind(this));
        trouble_typeid.append(strtrouble_typeids);

        this.domObj.find(".trouble_typeid").val(this.trouble_typeid);


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
        var strusers = "<option></option>";
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
                "Caption": p.address,
                "address": p.address,
                "notes": p.notes,
                "uploadtime": p.uploadtime.replace('T', '  '),
                "handle_state": handle_state,
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
        popupTemplate2.setContent(templateArr[3])


        // cluster layer that uses OpenLayers style clustering
        if (this.clusterLayer_hiddendanger != null) {
            this.map.removeLayer(this.clusterLayer_hiddendanger);
            this.clusterLayer_hiddendanger = null
        }
        this.clusterLayer_hiddendanger = new ClusterLayer({
            "basemap": this.map,
            "data": photoInfo.data,
            "distance": 10,
            "id": "clusters",
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
        this.clusterLayer_hiddendanger.setRenderer(renderer);
        //this.clusterLayer_hiddendanger.symbol = blue;
        this.map.addLayer(this.clusterLayer_hiddendanger);
        // // close the info window when the map is clicked
        // this.map.on("click", this.cleanUp.bind(this));
        // // close the info window when esc is pressed
        // this.map.on("key-down", function (e) {
        //     if (e.keyCode === 27) {
        //         this.cleanUp().bind(this);
        //     }
        // });
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




    destroy() {
        this.map.infoWindow.hide();
        if (this.clusterLayer_hiddendanger) {
            this.map.removeLayer(this.clusterLayer_hiddendanger);
        }
        this.domObj.remove();
        this.afterDestroy();
    }

}