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

export = PhotoQuery;

class PhotoQuery extends BaseWidget {
    baseClass = "widget-photoquery";
    map = null;
    popup = null;
    toast = null;
    photowall = null;

    totalpage = 1;
    currentpage = 1;
    currentpagesieze = 25;
    currentpage_icon = 1;
    currentpagesieze_icon = 30;
    curenthiddendangertypeid = "";
    trouble_typeid = "";
    pdaid = "";
    userid = "";
    padname = "";
    username = "";
    phototypeid = "";

    depid = "";
    company = "";

    handle_state = "";
    handle_trouble_clear = "";
    clusterLayer_hiddendanger = null;//数据库中的隐患
    curpage = null;

    showtype = 0;//0列表模式，1图标模式

    curhiddendangerid = "";


    print_address = "";

    print_upload_username = "";
    print_create_time = "";

    print_zplx = "";
    print_description = "";


    print_img//照片


    startup() {
        this.configure();
        this.initHtml();
        this.initEvent();
    }
    initHtml() {
        var html = _.template(this.template.split('$$')[0] + "</div>")({ range: AppX.appConfig.range.split(";")[0], depid: AppX.appConfig.groupid });

        // var html = _.template(this.template.split('$$')[0] + "</div>")();
        // var html = _.template(this.template.split('$$')[0])();
        this.setHtml(html);
        this.ready();
        this.showLoading();
        if (AppX.appConfig.range.split(";")[0] == "00") {
            if (AppX.appConfig.groupid == "") {
                this.domObj.find('.dep').attr("disabled", "true");
                this.domObj.find('.dep').css("background-color", "gray");

            }

        }



        this.getPhotoQuery(this.config.pagenumber, this.config.pagesize, this.pdaid, this.phototypeid, this.company, this.depid, this.userid);
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
            // this.trouble_typeid = this.domObj.find(".trouble_typeid").val();

            // this.pdaid = this.domObj.find(".pdaid option:selected").val()

            this.phototypeid = this.domObj.find(".phototype").val();
            this.userid = this.domObj.find(".username").val();

            if (AppX.appConfig.groupid == "") {
                this.depid = this.domObj.find(".dep").val();
            }


            this.company = this.domObj.find(".company").val();
            // this.username = this.domObj.find(".username").val();

            // this.handle_state = this.domObj.find(".handle_state").val();
            // this.handle_trouble_clear = this.domObj.find(".handle_trouble_clear").val();

            if (this.showtype == 0) {
                this.showLoading();
                this.getPhotoQuery(this.config.pagenumber, this.currentpagesieze || this.config.pagesize, this.pdaid, this.phototypeid, this.company, this.depid, this.userid);

            } else {
                this.showLoading();
                this.getPhotoQuery_icon(this.config.pagenumber_icon, this.config.pagesize_icon, this.pdaid, this.phototypeid, this.company, this.depid, this.userid);
            }

        }.bind(this));

        //定义打印事件
        this.domObj.find('.btn-print').off("click").on("click", function () {
            if (this.print_id == "") {
                this.toast.Show("请选择一行记录，进行工单打印!");
                return;
            }

            var myDate = new Date();
            var repairorder_num = myDate.getFullYear().toString() + (myDate.getMonth() + 1) + myDate.getDate() + (myDate.getHours() + 1) + (myDate.getMinutes() + 1) + (myDate.getSeconds() + 1);

            // this.photowall.setSize(1100, 650);
            this.photowall.setSize(900, 550);


            var htmlString = _.template(this.template.split('||')[3])({

                "address": this.print_address,
                "upload_username": this.print_upload_username,
                "create_time": this.print_create_time,
                "zplx": this.print_zplx,
                "description": this.print_description,






                print_img: this.print_img,
                // print_clqk: 1,

            });
            var Obj = this.photowall.Show("打印", htmlString);

            $(".hiddendangersearch_btn_print").off("click").on("click", function (e) {
                (<any>$(".repairorder")).print();
            }.bind(this));
            $(".hiddendangersearch_btn_return").off("click").on("click", function (e) {
                this.photowall.Close();
            }.bind(this));

            $(".hiddendangersearch_btn_print_photo").off("click").on("click", function (e) {
                if ($(".print_img").find(".active").length == 0) {
                    this.toast.Show("请双击选中要打印的照片!");
                    return;
                }

                (<any>$(".print_imgs")).print({
                    //Use Global styles
                    globalStyles: false,
                    //Add link with attrbute media=print
                    mediaPrint: true,
                    //Custom stylesheet
                    // stylesheet: "css/style.css",
                    //Print in a hidden iframe
                    iframe: true,
                    //Don't print this
                    noPrintSelector: ".no-print",//.no-print   .avoid-this
                    //Add this at top
                    prepend: "",
                    //Add this on bottom
                    append: ""
                });
            }.bind(this));

            //定义选中图片事件
            //  this.domObj.off("dblclick").on('dblclick', 'tbody tr', (e) => {
            $(".print_fx").off("dblclick").on("dblclick", function (e) {

                // if ($(e.currentTarget).data("id") == null) { return; }

                // this.domObj.find('tr.active').removeClass('active');
                if ($(e.currentTarget).hasClass('active')) {
                    $(e.currentTarget).removeClass('active');
                    $(e.currentTarget).addClass('no-print');
                } else {
                    $(e.currentTarget).addClass('active');
                    $(e.currentTarget).removeClass('no-print');
                }


            }.bind(this));






        }.bind(this));


        this.domObj.find('.save2csv').off("click").on("click", function () {
            // var pong = new Howl({ src: ['http://localhost:3000/widgets/PhotoQuery/1.mp3'] });
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

        // 选中行高亮
        this.domObj.off("click").on('click', 'tbody tr', (e) => {
            if ($(e.currentTarget).data("id") == null) { return; }

            this.print_img = "";
            // var stryhfx = "";
            if ($(e.currentTarget).data("files") != "") {
                if ($(e.currentTarget).data("files").indexOf(',') >= 0) {
                    $(e.currentTarget).data("files").split(',').forEach(
                        i => this.print_img += "<div class='print_fx no-print'><image  src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "' alt='" + $(e.currentTarget).data("address") + "'/><div class='img_isCheck'>   </div></div>"
                    );
                } else {
                    this.print_img = "<div   class='print_fx no-print'><image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + $(e.currentTarget).data("files") + "' alt='" + $(e.currentTarget).data("address") + "'/><div class='img_isCheck'>   </div></div>";
                }

            } else {
                // stryhfx = "暂无图片";

            }

            //    this.address=$(e.currentTarget).data("address"),

            //  this.pic_type_name= $(e.currentTarget).data("pic_type_name"),
            //         "description": describle,
            //         "pic_type_name": $(e.currentTarget).data("pic_type_name"),

            //         "create_time": $(e.currentTarget).data("create_time"),
            //         "upload_username": $(e.currentTarget).data("upload_username"),
            //         "files": strfiles,
            //         "coordinate": $(e.currentTarget).data("lng").toFixed("5") + "," + $(e.currentTarget).data("lat").toFixed("5"),

            this.print_address = $(e.currentTarget).data("address");
            this.print_upload_username = $(e.currentTarget).data("upload_username");
            this.print_create_time = $(e.currentTarget).data("create_time");
            this.print_zplx = $(e.currentTarget).data("pic_type_name");
            this.print_description = $(e.currentTarget).data("description");



            this.domObj.find('tr.active').removeClass('active');
            $(e.currentTarget).addClass('active');
            var mapPoint = new Point($(e.currentTarget).data("lng"), $(e.currentTarget).data("lat"), new SpatialReference({ wkid: that.map.spatialReference.wkid }));
            this.map.centerAndZoom(mapPoint, 11);


            //添加音频
            //this.getFiles($(e.currentTarget).data("id"));


            //定位
            // var mapPoint = new Point($(e.currentTarget).data("location_longitude"), $(e.currentTarget).data("location_latitude"), new SpatialReference({ wkid: that.map.spatialReference.wkid }));
            // // that.map.getInfoWindowAnchor(that.map.toScreen(mapPoint));
            // //this.clusterLayer_hiddendanger.infoTemplate=this.clusterLayer_hiddendanger._singleTemplate.content;
            // that.map.infoWindow.setTitle("<div class='PhotoQuery-id' id=" + $(e.currentTarget).data("id") + ">标题</div>");
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
            // var strfiles = "";
            // if ($(e.currentTarget).data("files") != null) {
            //     if ($(e.currentTarget).data("files").indexOf(',') >= 0) {
            //         $(e.currentTarget).data("files").split(',').forEach(
            //             i => strfiles += "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "'><image>"
            //         );
            //     } else {
            //         strfiles = "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + $(e.currentTarget).data("files") + "'><image>";
            //     }

            // } else {
            //     strfiles = "无";
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
            //     "YHFXImage": strfiles,
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


            var html = _.template(this.template.split('$$')[1])({ range: AppX.appConfig.range.split(";")[0], depid: AppX.appConfig.groupid });
            this.domObj.append(html);

            this.initEvent();
            //查询图片
            this.showLoading();
            this.getPhotoQuery_icon(this.config.pagenumber_icon, this.config.pagesize_icon, this.pdaid, this.phototypeid, this.company, this.depid, this.userid);
            //  this.getPhotoQuery_icon(this.config.pagenumber, this.config.pagesize, this.trouble_typeid, this.pdaid, this.userid, this.handle_state, this.handle_trouble_clear);
            this.domObj.find(".halfpaneltable").height(preheight);
            // this.getPeriod();

        }.bind(this));

        //列表模式
        this.domObj.find('.btn_list').off("click").on("click", function () {
            this.showtype = 0;
            var preheight = this.domObj.find(".halfpaneltable").height();
            // var prepagesize = this.currentpagesieze;
            this.domObj.empty();
            var html = _.template(this.template.split('$$')[0] + "</div>")({ range: AppX.appConfig.range.split(";")[0], depid: AppX.appConfig.groupid });

            // var html = _.template(this.template.split('$$')[0] + "</div>")();
            // var html = _.template(this.template.split('$$')[0])();
            // this.setHtml(html);
            this.domObj.append(html);
            this.initEvent();
            // this.currentpagesieze = prepagesize;
            // this.ready();
            // this.getPhotoQuery(this.config.pagenumber, this.config.pagesize, this.trouble_typeid, this.pdaid, this.userid, this.handle_state, this.handle_trouble_clear);
            this.showLoading();
            this.getPhotoQuery(this.currentpage, this.currentpagesieze, this.pdaid, this.phototypeid, this.company, this.depid, this.userid);

            this.domObj.find(".dynamic_pagesize").val(this.currentpagesieze);

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
                this.showLoading();
                this.getPhotoQuery(this.currentpage, this.currentpagesieze, this.pdaid, this.phototypeid, this.company, this.depid, this.userid);

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
                this.showLoading();
                this.getPhotoQuery(this.currentpage, this.currentpagesieze, this.pdaid, this.phototypeid, this.company, this.depid, this.userid);
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
                this.showLoading();
                this.getPhotoQuery(this.currentpage, this.currentpagesieze, this.pdaid, this.phototypeid, this.company, this.depid, this.userid);
            }
        }.bind(this));




        this.domObj.find(".dynamic_pagesize").off("change").on("change", function () {
            //清空图层
            if (this.clusterLayer_hiddendanger) {
                this.clusterLayer_hiddendanger.clear();
            }
            //重新查询

            this.currentpagesieze = parseInt(this.domObj.find(".dynamic_pagesize").val());
            this.showLoading();
            this.getPhotoQuery(this.config.pagenumber, this.currentpagesieze, this.pdaid, this.phototypeid, this.company, this.depid, this.userid);
            this.domObj.find(".halfpaneltable").height(this.domObj.find(".halfpaneltable").height());



        }.bind(this));





    }




    getPhotoQuery(pagenumber, pagesize, pdaid, phototypeid, company, depid, userid) {
        this.currentpage = pagenumber || this.config.pagenumber;
        this.currentpagesieze = pagesize || this.config.pagesize;
        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
                'range': AppX.appConfig.range,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getFiles,
            data: {
                // "pageindex": pagenumber || this.config.pagenumber,
                // "pagesize": this.config.pagesize,
                "pageindex": this.currentpage || this.config.pagenumber,
                "pagesize": this.currentpagesieze || this.config.pagesize,
                "userid": userid,
                "depid": depid,

                "companyid": company,
                // "trouble_typeid": trouble_typeid,
                "pdaid": pdaid,
                "pic_type_id": phototypeid,

                // "userid": userid,
                // "handle_trouble_clear": handle_trouble_clear,
                // "handle_state": handle_state,
                // f: "pjson"
            },
            success: this.getPhotoQueryListCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
                this.hideLoading();
            }.bind(this),
            dataType: "json",
        });
    }

    getPhotoQueryListCallback(results) {
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
        var domtb = this.domObj.find(".addphoto");
        domtb.empty();
        var address;
        var html_trs_data = "";
        var state = "";
        var hanletroubleclear = "";

        $.each(results.result.rows, function (i, item) {



            //<td>" + item.equid_name + "</td>
            var describle = item.description;
            if (item.description.length > 20) {
                describle = item.description.substring(0, 20) + "...";
            }

            if (AppX.appConfig.range.split(";")[0] == "00") {
                html_trs_data += "<tr class=goto data-id='" + item.id + "' data-lat='" + item.lat + "' data-lng='" + item.lng + "' data-address='" + item.address + "' data-description='" + item.description + "' data-create_time='" + item.create_time + "'  data-files='" + item.files + "'  data-upload_username='" + item.upload_username + "' data-pic_type_name='" + item.pic_type_name + "'><td>" + item.pic_type_name + "</td><td>" + item.address + "</td><td title='" + item.description + "'>" + describle + "</td><td>" + item.upload_username + "</td><td>" + item.create_time + "</td><td>" + item.company_name + "</td><td><a class='operation' data-id='" + item.id + "' data-lat='" + item.lat + "' data-lng='" + item.lng + "' data-address='" + item.address + "' data-description='" + item.description + "' data-create_time='" + item.create_time + "'  data-upload_username='" + item.upload_username + "' data-files='" + item.files + "'  data-files_thumb='" + item.files_thumb + "' data-luyin='" + item.luyin + "' data-pic_type_name='" + item.pic_type_name + "' >详情</a></td></tr>";


            } else {
                html_trs_data += "<tr class=goto data-id='" + item.id + "' data-lat='" + item.lat + "' data-lng='" + item.lng + "' data-address='" + item.address + "' data-description='" + item.description + "' data-create_time='" + item.create_time + "'  data-files='" + item.files + "'  data-upload_username='" + item.upload_username + "' data-pic_type_name='" + item.pic_type_name + "'><td>" + item.pic_type_name + "</td><td>" + item.address + "</td><td title='" + item.description + "'>" + describle + "</td><td>" + item.upload_username + "</td><td>" + item.create_time + "</td><td><a class='operation' data-id='" + item.id + "' data-lat='" + item.lat + "' data-lng='" + item.lng + "' data-address='" + item.address + "' data-description='" + item.description + "' data-create_time='" + item.create_time + "'  data-upload_username='" + item.upload_username + "' data-files='" + item.files + "'  data-files_thumb='" + item.files_thumb + "' data-luyin='" + item.luyin + "' data-pic_type_name='" + item.pic_type_name + "' >详情</a></td></tr>";


            }

            //刷新infowindow
            // this.setContent(item);
        }.bind(this));
        domtb.append(html_trs_data);


        var html_trs_blank = "";
        if (results.result.rows.length < that.config.pagesize) {
            var num = that.config.pagesize - results.result.rows.length;
            for (var i = 0; i < num; i++) {
                if (AppX.appConfig.range.split(";")[0] == "00") {

                    html_trs_blank += "<tr class=goto data-id='null'><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>";

                } else {

                    html_trs_blank += "<tr class=goto data-id='null'><td></td><td></td><td></td><td></td><td></td><td></td></tr>";

                }

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
            var mapPoint = new Point($(e.currentTarget).data("lng"), $(e.currentTarget).data("lat"), new SpatialReference({ wkid: this.map.spatialReference.wkid }));

            // var popup = new Popup({
            //     fillSymbol: new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
            //         new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
            //             new Color([255, 0, 0]), 2), new Color([255, 255, 0, 0.25]))
            // }, document.createElement("div"));

            // popup.setMap(this.map);
            // popup.setTitle("<div class='PhotoQuery-id'>标题</div>");




            //处理照片
            var strfiles = "";
            if ($(e.currentTarget).data("files") != "") {
                if ($(e.currentTarget).data("files").indexOf(',') >= 0) {
                    $(e.currentTarget).data("files").split(',').forEach(
                        i => strfiles += "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "' alt='" + $(e.currentTarget).data("address") + "'/>"
                    );
                } else {
                    strfiles = "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + $(e.currentTarget).data("files") + "' alt='" + $(e.currentTarget).data("address") + "'/>";
                }

            } else {
                // strfiles = "无";
                strfiles = "<image src='" + this.config.ZanWuTuPian + "'/>";
            }

            //viewer控件
            strfiles = "";
            if ($(e.currentTarget).data("files") != "") {
                if ($(e.currentTarget).data("files").indexOf(',') >= 0) {
                    $(e.currentTarget).data("files").split(',').forEach(
                        i => strfiles += "<li><image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "' alt='" + $(e.currentTarget).data("address") + "'/></li>"
                    );
                } else {
                    strfiles = "<li><image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + $(e.currentTarget).data("files") + "' alt='" + $(e.currentTarget).data("address") + "'/></li>";
                }

            } else {
                // strfiles = "无";
                strfiles = "<li><image src='" + this.config.ZanWuTuPian + "'/></li>";
            }

            strfiles = "  <ul id='pictureshow' >" + strfiles + "</ul>"



            var strluyin = "";
            if ($(e.currentTarget).data("luyin") != "") {
                if ($(e.currentTarget).data("luyin").indexOf(',') >= 0) {
                    $(e.currentTarget).data("luyin").split(',').forEach(
                        i => strluyin += "<audio controls='controls' preload='auto'  src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "'/>"
                    );
                    strluyin = "<div  class='yy'>" + strluyin + "</div>";
                } else {
                    strluyin = "<audio class='one' controls='controls' preload='auto' src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + $(e.currentTarget).data("luyin") + "'/>";
                }

            } else {
                strluyin = "暂无音频";
            }







            var info = "";
            //描述太长，自动截取100字
            var describle = $(e.currentTarget).data("description");
            if (describle.length > 100) {
                // describle = describle.substring(0, 100);
                describle = "<div class='bz'>" + describle + "</div>";
            }


            info = _.template(this.template.split('||')[1])({
                "caption": $(e.currentTarget).data("address"),
                "address": $(e.currentTarget).data("address"),
                "zplx": $(e.currentTarget).data("pic_type_name"),
                "description": describle,
                "pic_type_name": $(e.currentTarget).data("pic_type_name"),
                "luyin": strluyin,
                "create_time": $(e.currentTarget).data("create_time"),
                "upload_username": $(e.currentTarget).data("upload_username"),
                "files": strfiles,
                "coordinate": $(e.currentTarget).data("lng").toFixed("5") + "," + $(e.currentTarget).data("lat").toFixed("5"),


            });


            that.popup.setSize(730, 400);
            var Obj = that.popup.Show("信息", info, true);
            this.popup.domObj.find("#pictureshow").viewer();

            // popup.setContent(info);
            // this.map.infoWindow = popup;
            // this.map.infoWindow.show(mapPoint);
            // popup.maximize();




            // //定义弹出照片墙
            // $(".picture-photoquery").off("click").on("click", function (e) {
            //     $(e.currentTarget).children();
            //     var data = [];
            //     for (var i = 0; i < $(e.currentTarget).children().length; i++) {
            //         data.push({ src: (<any>$(e.currentTarget).children()[i]).src, alt: $(e.currentTarget).children().attr("alt") });
            //     }
            //     this.photowall.setSize(500, 730);
            //     var htmlString = _.template(this.template.split('$$')[2])({ photoData: data });
            //     var Obj = this.photowall.Show("照片", htmlString);
            // }.bind(this));




        }.bind(this));



        //添加隐患工单气泡

        this.map.infoWindow.resize(400, 260);
        this.addClusters(results.result.rows);

        this.curpage = results.result.rows;


        //初始化设备
        this.getDevices();


        this.getCompany();
        this.getGroup();

        //初始化隐患类型
        this.getUser();

        //初始化照片类型
        this.getPhotoType();


        this.hideLoading();








    }


    getPhotoQuery_icon(pagenumber, pagesize, pdaid, phototypeid, company, depid, userid) {
        this.currentpage_icon = pagenumber || this.config.pagenumber;
        this.currentpagesieze_icon = pagesize || this.config.pagesize;
        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
                'range': AppX.appConfig.range,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getFiles,
            data: {
                "pageindex": pagenumber || this.config.pagenumber_icon,
                "pagesize": pagesize || this.config.pagesize_icon,
                "userid": userid,
                "depid": depid,

                "companyid": company,
                // "trouble_typeid": trouble_typeid,
                "pdaid": pdaid,
                "pic_type_id": phototypeid,
                // "userid": userid,
                // "handle_trouble_clear": handle_trouble_clear,
                // "handle_state": handle_state,
                // f: "pjson"
            },
            success: this.getPhotoQueryIconCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
                this.hideLoading();
            }.bind(this),
            dataType: "json",
        });
    }

    getPhotoQueryIconCallback(results) {
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

            var strfiles = "";
            if (item.files != "") {
                if (item.files.indexOf(',') >= 0) {
                    // item.files.split(',').forEach(
                    //     i => strfiles += "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "'><image>"
                    // );

                    for (var key = 0; key < item.files.split(',').length; key++) {
                        if (key > 0) {
                            break;
                        }
                        strfiles = "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + item.files.split(',')[key] + "'/>";

                    }

                } else if (item.files != "") {
                    strfiles = "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + item.files + "'/>";
                } else {
                    strfiles = "<image src='" + this.config.ZanWuTuPian + "'/>";
                }

            } else {
                strfiles = "<image src='" + this.config.ZanWuTuPian + "'/>";
            }

            var strfiles_thumb = "";
            if (item.files_thumb != "") {
                if (item.files.indexOf(',') >= 0) {
                    // item.files.split(',').forEach(
                    //     i => strfiles += "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "'><image>"
                    // );
                    //title='"+item.address+"'

                    for (var key = 0; key < item.files.split(',').length; key++) {
                        if (key > 0) {
                            break;
                        }
                        strfiles_thumb = "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + item.files_thumb.split(',')[key] + "'/>";

                    }

                } else if (item.files != "") {
                    strfiles_thumb = "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + item.files_thumb + "' />";
                } else {
                    strfiles_thumb = "<image src='" + this.config.ZanWuTuPian + "'/>";
                }

            } else {
                strfiles_thumb = "<image src='" + this.config.ZanWuTuPian + "'/>";
            }
            var addr = "";
            if (item.address.length > 14) {
                addr = item.address.substring(0, 14) + "...";
            } else {
                addr = item.address;
            }
            html_trs_data += `<li data-id='${item.id}' data-files='${item.files}' data-lat='${item.lat}' data-lng='${item.lng}' data-address='${item.address}' data-description='${item.description}' data-luyin='${item.luyin}' data-create_time='${item.create_time}' data-upload_username='${item.upload_username}' ><a data-id='${item.id}' data-lat='${item.lat}' data-lng='${item.lng}' data-address='${item.address}' data-description='${item.description}'  data-upload_username='${item.upload_username}' data-create_time='${item.create_time}' data-luyin='${item.luyin}' data-upload_username='${item.upload_username}'  data-pic_type_name='${item.pic_type_name}'>${strfiles_thumb}<span title='${item.address}'>${addr}</span></a></li>`;

            // html_trs_data += `<li data-id='${item.id}' data-files='${item.files}' data-lat='${item.lat}' data-lng='${item.lng}' data-address='${item.address}' data-description='${item.description}' data-luyin='${item.luyin}' data-create_time='${item.create_time}' data-upload_username='${item.upload_username}' ><a data-id='${item.id}' data-lat='${item.lat}' data-lng='${item.lng}' data-address='${item.address}' data-description='${item.description}'  data-upload_username='${item.upload_username}' data-create_time='${item.create_time}' data-luyin='${item.luyin}' data-upload_username='${item.upload_username}'>${strfiles_thumb}</a></li>`;

        }.bind(this));
        domtb.append(html_trs_data);



        //定义分页事件

        this.domObj.find(".pre_icon").off("click").on("click", function () {

            if (this.currentpage_icon - 1 > 0) {
                that.map.infoWindow.hide();
                //清空图层

                if (this.clusterLayer_hiddendanger) {
                    this.clusterLayer_hiddendanger.clear();
                }
                this.currentpage_icon = this.currentpage_icon - 1;
                this.showLoading();
                this.getPhotoQuery_icon(this.currentpage_icon, this.currentpagesieze_icon, this.trouble_typeid, this.pdaid, this.phototypeid, this.company, this.depid, this.userid);

            }


        }.bind(this));
        this.domObj.find(".next_icon").off("click").on("click", function () {

            if (this.currentpage_icon + 1 <= this.totalpage) {
                that.map.infoWindow.hide();
                //清空图层
                if (this.clusterLayer_hiddendanger) {
                    this.clusterLayer_hiddendanger.clear();
                }
                this.currentpage_icon = this.currentpage_icon + 1;
                this.showLoading();
                this.getPhotoQuery_icon(this.currentpage_icon, this.currentpagesieze_icon, this.trouble_typeid, this.pdaid, this.phototypeid, this.company, this.depid, this.userid);
            }
        }.bind(this));

        this.domObj.find(".pageturning_icon").off("click").on("click", function () {
            var currpage = parseInt(this.domObj.find(".currpage").val());
            if (currpage <= this.totalpage && currpage >= 1) {
                that.map.infoWindow.hide();
                //清空图层
                if (this.clusterLayer_hiddendanger) {
                    this.clusterLayer_hiddendanger.clear();
                }
                this.currentpage_icon = parseInt(this.domObj.find(".currpage").val());
                this.showLoading();
                this.getPhotoQuery_icon(this.currentpage_icon, this.currentpagesieze_icon, this.trouble_typeid, this.pdaid, this.phototypeid, this.company, this.depid, this.userid);
            }
        }.bind(this));



        //添加事件 .选中高亮
        this.domObj.on('click', '.imglist li', (e) => {
            this.domObj.find('li.active').removeClass('active');
            $(e.currentTarget).addClass('active');


            this.curhiddendangerid = $(e.currentTarget).data("troubleid");

            //定位
            var mapPoint = new Point($(e.currentTarget).data("lng"), $(e.currentTarget).data("lat"), new SpatialReference({ wkid: this.map.spatialReference.wkid }));

            this.map.centerAndZoom(mapPoint, 11);
            // var strdiv= domConstruct.create("div");
            // var popup = new Popup({
            //     fillSymbol: new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
            //         new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
            //             new Color([255, 0, 0]), 2), new Color([255, 255, 0, 0.25]))
            // }, document.createElement("div"));

            // popup.setMap(this.map);
            // popup.setTitle("<div class='PhotoQuery-id'>标题</div>");
            // that.map.infoWindow.setTitle("<div class='PhotoQuery-id' id=" + $(e.currentTarget).data("id") + ">标题</div>");


            //0，未处理，则处理；1，已处理，则详情

            var info = "";


            //处理照片
            var strfiles = "";
            if ($(e.currentTarget).data("files") != "") {
                if ($(e.currentTarget).data("files").indexOf(',') >= 0) {
                    $(e.currentTarget).data("files").split(',').forEach(
                        i => strfiles += "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "' alt='" + $(e.currentTarget).data("address") + "'/>"
                    );
                } else {
                    strfiles = "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + $(e.currentTarget).data("files") + "' alt='" + $(e.currentTarget).data("address") + "'/>";
                }

            } else {
                // strfiles = "无";
                strfiles = "<image src='" + this.config.ZanWuTuPian + "'/>";
            }

            //viewer控件
            strfiles = "";
            if ($(e.currentTarget).data("files") != "") {
                if ($(e.currentTarget).data("files").indexOf(',') >= 0) {
                    $(e.currentTarget).data("files").split(',').forEach(
                        i => strfiles += "<li><image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "' alt='" + $(e.currentTarget).data("address") + "'/></li>"
                    );
                } else {
                    strfiles = "<li><image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + $(e.currentTarget).data("files") + "' alt='" + $(e.currentTarget).data("address") + "'/></li>";
                }

            } else {
                // strfiles = "无";
                strfiles = "<li><image src='" + this.config.ZanWuTuPian + "'/></li>";
            }

            strfiles = "  <ul id='pictureshow' >" + strfiles + "</ul>"


            var strluyin = "";
            if ($(e.currentTarget).data("luyin") != "") {
                if ($(e.currentTarget).data("luyin").indexOf(',') >= 0) {
                    $(e.currentTarget).data("luyin").split(',').forEach(
                        i => strluyin += "<audio controls='controls' preload='auto'  src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "'/>"
                    );
                    strluyin = "<div  class='yy'>" + strluyin + "</div>";
                } else {
                    strluyin = "<audio class='one' controls='controls' preload='auto' src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + $(e.currentTarget).data("luyin") + "'/>";
                }

            } else {
                strluyin = "暂无音频";
            }


            var info = "";
            //描述太长，自动截取100字
            var describle = $(e.currentTarget).data("description");
            if (describle.length > 100) {
                // describle = describle.substring(0, 100);
                describle = "<div class='bz'>" + describle + "</div>";
            }

            info = _.template(this.template.split('||')[1])({
                "caption": $(e.currentTarget).data("address"),
                "address": $(e.currentTarget).data("address"),
                "pic_type_name": $(e.currentTarget).data("pic_type_name"),
                "zplx": $(e.currentTarget).data("pic_type_name"),
                "description": describle,
                "luyin": strluyin,
                "create_time": $(e.currentTarget).data("create_time"),
                "upload_username": $(e.currentTarget).data("upload_username"),
                "files": strfiles,
                "coordinate": $(e.currentTarget).data("lng").toFixed("5") + "," + $(e.currentTarget).data("lat").toFixed("5"),

            });


            // popup.setContent(info);
            // this.map.infoWindow = popup;
            // this.map.infoWindow.show(mapPoint);
            // popup.maximize();

            that.popup.setSize(730, 400);
            var Obj = that.popup.Show("信息", info, true);

            this.popup.domObj.find("#pictureshow").viewer();



            // //定义弹出照片墙

            // $(".picture-photoquery").off("click").on("click", function (e) {
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



        this.getCompany();

        this.getGroup();


        //初始化隐患类型
        this.getUser();

        //初始化照片类型
        this.getPhotoType();



        this.hideLoading();



    }


    handlePhotoQueryCallback(results) {
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
            // this.getPhotoQuery(this.config.pagenumber, this.config.pagesize, this.trouble_typeid, this.equid, this.handle_userid);

            if (this.showtype == 0) {
                this.showLoading();
                this.getPhotoQuery(this.config.pagenumber, this.config.pagesize, this.pdaid, this.phototypeid, this.company, this.depid, this.userid);

            } else {
                this.showLoading();
                this.getPhotoQuery_icon(this.config.pagenumber_icon, this.config.pagesize_icon, this.pdaid, this.phototypeid, this.company, this.depid, this.userid);
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
                // "pagesize": this.config.pagesize_icon,
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
        var strcompany = "<option value='' selected>全部</option>";
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
                // "pagesize": this.config.pagesize_icon,
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



        var users = this.domObj.find(".username").empty();
        var strusers = "<option value='' selected>全部</option>";
        $.each(results.result.rows, function (index, item) {
            strusers += "<option value=" + item.userid + " > " + item.username + " </option>";

        }.bind(this));
        users.append(strusers);


        this.domObj.find(".username").val(this.userid);


    }

    getPhotoType() {

        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getPhotoTypeList,
            data: {
                "key": "0011",
                "pageindex": this.config.pagenumber,
                // "pagesize": this.config.pagesize_icon,
                "pagesize": 1000 || this.config.pagesize,

                // f: "pjson"
            },
            success: this.getPhotoTypeListCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    getPhotoTypeListCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("查询隐患类型信息出错！");
            console.log(results.message);
            return;
        }


        var phototype = this.domObj.find(".phototype").empty();
        var strphototype = "<option value='' selected>全部</option>";
        $.each(results.result.rows, function (index, item) {
            strphototype += "<option value=" + item.id + " > " + item.value + " </option>";

        }.bind(this));
        phototype.append(strphototype);


        this.domObj.find(".phototype").val(this.phototypeid);









    }


    //显示
    addClusters(resp) {
        var photoInfo = { "data": [] };
        var wgs = new SpatialReference({
            "wkid": this.map.spatialReference.wkid
        });
        photoInfo.data = arrayUtils.map(resp, function (p) {
            // var address = "";

            // var create_time = "";
            // var description = "";
            // var upload_username = "";
            // var lat = "";
            // var lng = "";


            //处理照片
            var strfiles = "";
            if (p.files != null) {
                if (p.files.indexOf(',') >= 0) {
                    p.files.split(',').forEach(
                        i => strfiles += "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "' />"
                    );
                } else {
                    strfiles = "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + p.files + "'/>";
                }

            } else {
                // strfiles = "无";
                strfiles = "<image src='" + this.config.ZanWuTuPian + "'/>";
            }

            //viewer控件
            strfiles = "";
            if (p.files != null) {
                if (p.files.indexOf(',') >= 0) {
                    p.files.split(',').forEach(
                        i => strfiles += "<li><image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "' /></li>"
                    );
                } else {
                    strfiles = "<li><image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + p.files + "'/></li>";
                }

            } else {
                // strfiles = "无";
                strfiles = "<li><image src='" + this.config.ZanWuTuPian + "'/></li>";
            }
            strfiles = "  <ul id='pictureshow' >" + strfiles + "</ul>"

            var attributes = {
                "id": p.id,
                "Caption": p.address,
                "address": p.address,
                "uploadtime": p.create_time,
                "upload_username": p.upload_username,
                "description": p.description,

                "pic": strfiles,

            };
            return {
                "x": p.lng - 0,
                "y": p.lat - 0,
                "attributes": attributes
            };
        }.bind(this));



        var popupTemplate2 = new PopupTemplate({});
        var templateArr = this.template.split('||');
        popupTemplate2.setContent(templateArr[2]);


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
        var blue = new PictureMarkerSymbol(this.config.MarkPictureSymbol, 32, 32).setOffset(0, 15);
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

        $("body").on("click", ".arcgispopup_operation", function (e) {
            var id = $(e.currentTarget).data("id");
            $.each($(".widget-photoquery .operation"), function (i, value) {
                if ($(value).data("id") == id) {

                    $($(".widget-photoquery  .operation")[i]).trigger("click");

                }
            });

            $.each($(".widget-photoquery .imglist li"), function (i, value) {
                if ($(value).data("id") == id) {

                    $($(".widget-photoquery  .imglist li")[i]).trigger("click");

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
        if (this.clusterLayer_hiddendanger) {
            this.map.removeLayer(this.clusterLayer_hiddendanger);
        }
        this.domObj.remove();
        this.afterDestroy();
    }

}