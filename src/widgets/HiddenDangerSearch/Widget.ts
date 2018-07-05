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

export = HiddenDangerSearch;

class HiddenDangerSearch extends BaseWidget {
    baseClass = "widget-hiddendangersearch";
    map = null;
    toast = null;
    popup = null;
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
    // username = "";
    depid = "";
    company = "";
    address = "";

    state = "";
    process_id = "";
    hiddendangersearch_clusterLayer_hiddendanger = null;//数据库中的隐患
    curpage = null;

    showtype = 0;//0列表模式，1图标模式

    begindate = null;
    enddate = null;

    region_id = "";

    curhiddendangerid = "";

    print_id = "";
    print_address = "";
    print_describe = "";
    print_xjry = "";
    print_uploadtime = "";
    print_fximg = "";

    pointlayer: GraphicsLayer;


    //行选中，打印需要字段





    //选择某行时，保存当前行数据
    cur_address = "";
    cur_trouble_type_name = "";
    cur_device_type_name = "";
    cur_username = "";
    cur_yhfx = "";
    cur_yhqyp = "";
    cur_notes = "";
    cur_uploadtime = "";
    cur_coordinate;
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

        var html = _.template(this.template.split('$$')[0] + "</div>")({ range: AppX.appConfig.range.split(";")[0], depid: AppX.appConfig.groupid });
        // var html = _.template(this.template.split('$$')[0])();
        this.setHtml(html);
        this.ready();
        this.configTimes();
        this.showLoading();

        if (AppX.appConfig.range.split(";")[0] == "00") {
            if (AppX.appConfig.groupid == "") {
                this.domObj.find('.dep').attr("disabled", "true");
                this.domObj.find('.dep').css("background-color", "gray");

            }

        }
        this.getHiddenDanger(this.config.pagenumber, this.config.pagesize, this.trouble_typeid, this.pdaid, this.company, this.depid, this.userid, this.state, this.process_id);
    }

    configure() {
        this.toast = this.AppX.runtimeConfig.toast;
        this.popup = this.AppX.runtimeConfig.popup;
        this.photowall = this.AppX.runtimeConfig.photowall;
        this.map = this.AppX.runtimeConfig.map;
        this.depid = AppX.appConfig.groupid;

        if (this.map.getLayer("pointlayer")) {
            return;
        } else {
            var pointlayer = new GraphicsLayer();
            pointlayer.id = "pointlayer";
            this.pointlayer = pointlayer;
            this.map.addLayer(pointlayer);
        }

    }

    configTimes() {
        $.jeDate(".begindate", {
            format: 'YYYY/MM/DD', //日期格式  
            isinitVal: true,
            initialDate: new Date(this.begindate)
        });
        $.jeDate(".enddate", {
            format: 'YYYY/MM/DD', //日期格式  
            isinitVal: true,
            initialDate: new Date(this.enddate)
        });
        $(".begindate").val(this.begindate);
        $(".enddate").val(this.enddate);
    }



    initEvent() {
        var that = this;



        //查询按钮单击事件
        this.domObj.find('.btn-search').off("click").on("click", function () {
            this.trouble_typeid = this.domObj.find(".trouble_typeid").val();

            this.pdaid = this.domObj.find(".pdaid option:selected").val()

            this.userid = this.domObj.find(".username").val();

            this.userid = this.domObj.find(".username").val();
            if (AppX.appConfig.groupid == "") {
                this.depid = this.domObj.find(".dep").val();
            }


            this.region_id = this.domObj.find(".region_name").val();
            this.company = this.domObj.find(".company").val();

            this.address = this.domObj.find(".address").val();


            this.begindate = this.domObj.find(".begindate").val();
            this.enddate = this.domObj.find(".enddate").val();

            // this.state = this.domObj.find(".state").val();
            this.state = "";
            this.process_id = this.domObj.find(".process_id").val();
            if (this.trouble_typeid == '' && this.pdaid == '' && this.handle_userid == '') {
                // name.addClass('has-error');
                // name.attr("placeholder", "不能为空！");
                // this.toast.Show("请输入查询条件！");
                // return;
            }
            if (this.showtype == 0) {
                this.showLoading();
                this.getHiddenDanger(this.config.pagenumber, this.currentpagesieze || this.config.pagesize, this.trouble_typeid, this.pdaid, this.company, this.depid, this.userid, this.state, this.process_id);

            } else {
                this.showLoading();
                this.getHiddenDanger_icon(this.config.pagenumber_icon, this.config.pagesize_icon, this.trouble_typeid, this.pdaid, this.company, this.depid, this.userid, this.state, this.process_id);
            }

        }.bind(this));


        this.domObj.find('.save2csv').off("click").on("click", function () {
            // var pong = new Howl({ src: ['http://localhost:3000/widgets/HiddenDangerSearch/1.mp3'] });
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
            this.domObj.find('tr.active').removeClass('active');
            $(e.currentTarget).addClass('active');


            this.print_id = $(e.currentTarget).data("id");
            this.print_address = $(e.currentTarget).data("address");
            this.print_describe = "设备类型：" + $(e.currentTarget).data("device_type_name") + "</br>" + "隐患类型：" + $(e.currentTarget).data("trouble_type_name") + "</br>" + "描述：" + $(e.currentTarget).data("notes");
            this.print_xjry = $(e.currentTarget).data("username");
            this.print_uploadtime = $(e.currentTarget).data("uploadtime");
            // this.print_fximg = $(e.currentTarget).data("uploadtime");
            this.print_fximg = "";
            // var stryhfx = "";
            if ($(e.currentTarget).data("yhfx") != "") {
                if ($(e.currentTarget).data("yhfx").indexOf(',') >= 0) {
                    $(e.currentTarget).data("yhfx").split(',').forEach(
                        i => this.print_fximg += "<div class='print_fx no-print'><image  src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "' alt='" + $(e.currentTarget).data("address") + "'/><div class='img_isCheck'>   </div></div>"
                    );
                } else {
                    this.print_fximg = "<div   class='print_fx no-print'><image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + $(e.currentTarget).data("yhfx") + "' alt='" + $(e.currentTarget).data("address") + "'/><div class='img_isCheck'>   </div></div>";
                }

            } else {
                // stryhfx = "暂无图片";

            }

            var mapPoint = new Point($(e.currentTarget).data("location_longitude"), $(e.currentTarget).data("location_latitude"), new SpatialReference({ wkid: that.map.spatialReference.wkid }));
            this.map.centerAndZoom(mapPoint, 11);

            //高亮显示

            this.pointlayer.clear();
            this.pointlayer.add(new Graphic(mapPoint, this.setGraphSymbol("point")));



            //添加音频
            //this.getFiles($(e.currentTarget).data("id"));


            //定位
            // var mapPoint = new Point($(e.currentTarget).data("location_longitude"), $(e.currentTarget).data("location_latitude"), new SpatialReference({ wkid: that.map.spatialReference.wkid }));
            // // that.map.getInfoWindowAnchor(that.map.toScreen(mapPoint));
            // //this.hiddendangersearch_clusterLayer_hiddendanger.infoTemplate=this.hiddendangersearch_clusterLayer_hiddendanger._singleTemplate.content;
            // that.map.infoWindow.setTitle("<div class='HiddenDangerSearch-id' id=" + $(e.currentTarget).data("id") + ">标题</div>");
            // //that.map.infoWindow.setContent(this.hiddendangersearch_clusterLayer_hiddendanger._singleTemplate.content);
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
            var htmlString = _.template(this.template.split('||')[10])({
                repairorder_num: "编号" + repairorder_num,
                print_address: this.print_address,
                print_describe: this.print_describe,
                print_xjry: this.print_xjry,
                print_uploadtime: this.print_uploadtime,
                print_zhibao: AppX.appConfig.realname,
                print_rq: myDate.getFullYear().toString() + "年" + (myDate.getMonth() + 1) + "月" + myDate.getDate() + "日",
                print_fximg: this.print_fximg,
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
                if ($(".print_fximg").find(".active").length == 0) {
                    this.toast.Show("请双击选中要打印的照片!");
                    return;
                }

                (<any>$(".print_fximg")).print({
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

        //图标模式
        this.domObj.find('.btn_icon').off("click").on("click", function () {
            this.showtype = 1;
            var preheight = this.domObj.find(".halfpaneltable").height();
            //进入图标模式
            //查询当前用户具体的任务安排
            this.domObj.empty();
            var html = _.template(this.template.split('$$')[1])({ range: AppX.appConfig.range.split(";")[0], depid: AppX.appConfig.groupid });
            this.domObj.append(html);
            // this.domObj.append(this.template.split('$$')[1]);

            this.initEvent();
            this.configTimes();
            //查询图片
            this.showLoading();

            if (AppX.appConfig.range.split(";")[0] == "00") {
                if (AppX.appConfig.groupid == "") {
                    this.domObj.find('.dep').attr("disabled", "true");
                    this.domObj.find('.dep').css("background-color", "gray");

                }

            }
            this.getHiddenDanger_icon(this.config.pagenumber_icon, this.config.pagesize_icon, this.trouble_typeid, this.pdaid, this.company, this.depid, this.userid, this.state, this.process_id);
            //  this.getHiddenDanger_icon(this.config.pagenumber, this.config.pagesize, this.trouble_typeid, this.pdaid, this.userid, this.handle_state, this.handle_trouble_clear);
            this.domObj.find(".halfpaneltable").height(preheight);

            this.domObj.find(".address").text(this.address);
            this.domObj.find(".address").val(this.address);
            // this.getPeriod();

        }.bind(this));

        //列表模式
        this.domObj.find('.btn_list').off("click").on("click", function () {
            this.showtype = 0;
            var preheight = this.domObj.find(".halfpaneltable").height();
            // var prepagesize = this.currentpagesieze;
            this.domObj.empty();
            // var html = _.template(this.template.split('$$')[0] + "</div>")();
            var html = _.template(this.template.split('$$')[0] + "</div>")({ range: AppX.appConfig.range.split(";")[0], depid: AppX.appConfig.groupid });


            this.domObj.append(html);
            this.initEvent();
            this.configTimes();
            // this.currentpagesieze = prepagesize;
            // this.ready();
            // this.getHiddenDanger(this.config.pagenumber, this.config.pagesize, this.trouble_typeid, this.pdaid, this.userid, this.handle_state, this.handle_trouble_clear);
            this.showLoading();
            if (AppX.appConfig.range.split(";")[0] == "00") {
                if (AppX.appConfig.groupid == "") {
                    this.domObj.find('.dep').attr("disabled", "true");
                    this.domObj.find('.dep').css("background-color", "gray");

                }

            }
            this.getHiddenDanger(this.currentpage, this.currentpagesieze, this.trouble_typeid, this.pdaid, this.company, this.depid, this.userid, this.state, this.process_id);
            this.domObj.find(".dynamic_pagesize").val(this.currentpagesieze);

            this.domObj.find(".address").text(this.address);
            this.domObj.find(".address").val(this.address);

            this.domObj.find(".halfpaneltable").height(preheight);


        }.bind(this));






        //动态生成书签及分页控件
        //分页控件fykj 向前、向后事件
        this.domObj.find(".pre").off("click").on("click", function () {

            if (this.currentpage - 1 > 0) {
                that.map.infoWindow.hide();
                //清空图层

                if (this.hiddendangersearch_clusterLayer_hiddendanger) {
                    this.hiddendangersearch_clusterLayer_hiddendanger.clear();
                }
                this.currentpage = this.currentpage - 1;
                this.showLoading();
                this.getHiddenDanger(this.currentpage, this.currentpagesieze, this.trouble_typeid, this.pdaid, this.company, this.depid, this.userid, this.state, this.process_id);

            }


        }.bind(this));
        this.domObj.find(".next").off("click").on("click", function () {

            if (this.currentpage + 1 <= this.totalpage) {
                that.map.infoWindow.hide();
                //清空图层
                if (this.hiddendangersearch_clusterLayer_hiddendanger) {
                    this.hiddendangersearch_clusterLayer_hiddendanger.clear();
                }
                this.currentpage = this.currentpage + 1;
                this.showLoading();
                this.getHiddenDanger(this.currentpage, this.currentpagesieze, this.trouble_typeid, this.pdaid, this.company, this.depid, this.userid, this.state, this.process_id);
            }
        }.bind(this));

        this.domObj.find(".pageturning").off("click").on("click", function () {
            var currpage = parseInt(this.domObj.find(".currpage").val());
            if (currpage <= this.totalpage && currpage >= 1) {
                that.map.infoWindow.hide();
                //清空图层
                if (this.hiddendangersearch_clusterLayer_hiddendanger) {
                    this.hiddendangersearch_clusterLayer_hiddendanger.clear();
                }
                this.currentpage = parseInt(this.domObj.find(".currpage").val());
                this.showLoading();
                this.getHiddenDanger(this.currentpage, this.currentpagesieze, this.trouble_typeid, this.pdaid, this.company, this.depid, this.userid, this.state, this.process_id);
            }
        }.bind(this));




        this.domObj.find(".dynamic_pagesize").off("change").on("change", function () {
            //清空图层
            if (this.hiddendangersearch_clusterLayer_hiddendanger) {
                this.hiddendangersearch_clusterLayer_hiddendanger.clear();
            }
            //重新查询

            this.currentpagesieze = parseInt(this.domObj.find(".dynamic_pagesize").val());
            this.showLoading();
            this.getHiddenDanger(this.config.pagenumber, this.currentpagesieze, this.trouble_typeid, this.pdaid, this.company, this.depid, this.userid, this.state, this.process_id);
            this.domObj.find(".halfpaneltable").height(this.domObj.find(".halfpaneltable").height());



        }.bind(this));


        //隐患类型显示不完全，提供悬浮显示
        this.domObj.find(".trouble_typeid").off("change").on("change", function (event) {
            var hideDangerName = $(event.currentTarget).find("option:selected").text();
            $(event.currentTarget).attr("title", hideDangerName);
        })




    }




    getHiddenDanger(pagenumber, pagesize, trouble_typeid, pdaid, company, depid, userid, state, process_id) {
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

                "companyid": company,
                "state": state,
                "process_id": process_id,
                "region_id": this.region_id,

                "uploadtime1": this.begindate,
                "uploadtime2": this.enddate,

                "keyword": this.address,
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
        var istrouble = "";
        var troublestate = "";

        $.each(results.result.rows, function (i, item) {

            istrouble = "";
            troublestate = "";

            // if (item.handle_trouble_clear == 0) {
            //     troublestate = "未清除";
            // } else if (item.handle_trouble_clear == 1) {
            //     troublestate = "已清除";
            // }
            troublestate = item.process_name;

            if (item.state == 0) {
                istrouble = "否";
                troublestate = "无需清除";

            } else if (item.state == 1) {
                istrouble = "是";
            } else {
                istrouble = "";
            }
            //<td>" + item.equid_name + "</td>

            var describle = item.handle_before_notes;
            if (item.handle_before_notes.length > 15) {
                describle = item.handle_before_notes.substring(0, 15) + "...";
            }
            //<td>" + item.padname + "</td>
            // <td title='" + item.handle_before_notes + "'>" + describle + "</td>
            if (AppX.appConfig.range.split(";")[0] == "00") {
                var companyname = item.company_name;
                if (companyname.length > 6) {
                    html_trs_data += "<tr class=goto  data-id='" + item.id + "' data-location_longitude='" + item.location_longitude + "' data-location_latitude='" + item.location_latitude + "' data-address='" + item.address + "' data-equid_name='" + item.equid_name + "' data-trouble_type_name='" + item.trouble_type_name + "' data-notes='" + item.handle_before_notes + "' data-uploadtime='" + item.uploadtime + "' data-handle_state='" + item.handle_state + "' data-state='" + item.state + "' data-level_name='" + item.level_name + "' data-level3_name='" + item.level3_name + "' data-handle_trouble_clear='" + item.handle_trouble_clear + "' data-trouble_typeid='" + item.trouble_typeid + "' data-username='" + item.username + "' data-device_type_name='" + item.device_type_name + "'  data-padid='" + item.padid + "' data-handle_username='" + item.handle_username + "' data-level3_name='" + item.level3_name + "' data-yhfx='" + item.yhfx + "' data-yhfx_thumb='" + item.yhfx_thumb + "' data-yhqc='" + item.yhqc + "'   data-yhqyp='" + item.yhqyp + "'><td>" + item.trouble_name + "</td><td>" + item.trouble_type_name + "</td><td>" + item.username + "</td><td>" + item.address + "</td><td>" + item.regionname + "</td><td>" + item.uploadtime + "</td><td title=" + companyname + ">" + companyname.substr(0, 6) + "..." + "</td><td>" + istrouble + "</td><td>" + item.level_name + "</td><td>" + troublestate + "</td><td><a class='operation' data-id='" + item.id + "' data-location_longitude='" + item.location_longitude + "' data-location_latitude='" + item.location_latitude + "' data-address='" + item.address + "' data-device_type_name='" + item.device_type_name + "' data-notes='" + item.handle_before_notes + "' data-uploadtime='" + item.uploadtime + "' data-handle_state='" + item.handle_state + "' data-state='" + item.state + "'  data-process_id='" + item.process_id + "' data-level_name='" + item.level_name + "'  data-level_time='" + item.level_time + "' data-level_check_time='" + item.level_check_time + "' data-level_username='" + item.level_username + "' data-safety_content='" + item.safety_content + "'  data-level_check_username='" + item.level_check_username + "'  data-level_check_note='" + item.level_check_note + "' data-regionname='" + item.regionname + "' data-handle_trouble_clear='" + item.handle_trouble_clear + "' data-equid_name='" + item.equid_name + "' data-trouble_type_name='" + item.trouble_type_name + "' data-username='" + item.username + "' data-padid='" + item.padid + "' data-handle_username='" + item.handle_username + "' data-level3_name='" + item.level3_name + "' data-yhfx='" + item.yhfx + "' data-yhfx_thumb='" + item.yhfx_thumb + "' data-yhqc='" + item.yhqc + "'  data-yhqyp='" + item.yhqyp + "' data-fund='" + item.fund + "' data-duty='" + item.duty + "' data-controlmeasure='" + item.controlmeasure + "'  data-timelimit='" + item.timelimit + "' data-emergencymeasure='" + item.emergencymeasure + "'>详情</a></td></tr>";

                } else {
                    html_trs_data += "<tr class=goto  data-id='" + item.id + "' data-location_longitude='" + item.location_longitude + "' data-location_latitude='" + item.location_latitude + "' data-address='" + item.address + "' data-equid_name='" + item.equid_name + "' data-trouble_type_name='" + item.trouble_type_name + "' data-notes='" + item.handle_before_notes + "' data-uploadtime='" + item.uploadtime + "' data-handle_state='" + item.handle_state + "' data-state='" + item.state + "' data-level_name='" + item.level_name + "' data-level3_name='" + item.level3_name + "' data-handle_trouble_clear='" + item.handle_trouble_clear + "' data-trouble_typeid='" + item.trouble_typeid + "' data-username='" + item.username + "' data-device_type_name='" + item.device_type_name + "'  data-padid='" + item.padid + "' data-handle_username='" + item.handle_username + "' data-level3_name='" + item.level3_name + "' data-yhfx='" + item.yhfx + "' data-yhfx_thumb='" + item.yhfx_thumb + "' data-yhqc='" + item.yhqc + "'   data-yhqyp='" + item.yhqyp + "'><td>" + item.trouble_name + "</td><td>" + item.trouble_type_name + "</td><td>" + item.username + "</td><td>" + item.address + "</td><td>" + item.regionname + "</td><td>" + item.uploadtime + "</td><td title=" + companyname + ">" + companyname + "</td><td>" + istrouble + "</td><td>" + item.level_name + "</td><td>" + troublestate + "</td><td><a class='operation' data-id='" + item.id + "' data-location_longitude='" + item.location_longitude + "' data-location_latitude='" + item.location_latitude + "' data-address='" + item.address + "' data-device_type_name='" + item.device_type_name + "' data-notes='" + item.handle_before_notes + "' data-uploadtime='" + item.uploadtime + "' data-handle_state='" + item.handle_state + "' data-state='" + item.state + "'  data-process_id='" + item.process_id + "' data-level_name='" + item.level_name + "' data-level_time='" + item.level_time + "' data-level_check_time='" + item.level_check_time + "' data-level_username='" + item.level_username + "' data-safety_content='" + item.safety_content + "'  data-level_check_username='" + item.level_check_username + "'  data-level_check_note='" + item.level_check_note + "' data-regionname='" + item.regionname + "' data-handle_trouble_clear='" + item.handle_trouble_clear + "' data-equid_name='" + item.equid_name + "' data-trouble_type_name='" + item.trouble_type_name + "' data-username='" + item.username + "' data-padid='" + item.padid + "' data-handle_username='" + item.handle_username + "' data-level3_name='" + item.level3_name + "' data-yhfx='" + item.yhfx + "' data-yhfx_thumb='" + item.yhfx_thumb + "' data-yhqc='" + item.yhqc + "'  data-yhqyp='" + item.yhqyp + "' data-fund='" + item.fund + "' data-duty='" + item.duty + "' data-controlmeasure='" + item.controlmeasure + "'  data-timelimit='" + item.timelimit + "' data-emergencymeasure='" + item.emergencymeasure + "'>详情</a></td></tr>";

                }

            } else {
                html_trs_data += "<tr class=goto  data-id='" + item.id + "' data-location_longitude='" + item.location_longitude + "' data-location_latitude='" + item.location_latitude + "' data-address='" + item.address + "' data-equid_name='" + item.equid_name + "' data-trouble_type_name='" + item.trouble_type_name + "' data-notes='" + item.handle_before_notes + "' data-uploadtime='" + item.uploadtime + "' data-handle_state='" + item.handle_state + "' data-state='" + item.state + "' data-level_name='" + item.level_name + "' data-level3_name='" + item.level3_name + "' data-handle_trouble_clear='" + item.handle_trouble_clear + "' data-trouble_typeid='" + item.trouble_typeid + "' data-username='" + item.username + "' data-device_type_name='" + item.device_type_name + "'  data-padid='" + item.padid + "' data-handle_username='" + item.handle_username + "' data-level3_name='" + item.level3_name + "' data-yhfx='" + item.yhfx + "' data-yhfx_thumb='" + item.yhfx_thumb + "' data-yhqc='" + item.yhqc + "'   data-yhqyp='" + item.yhqyp + "'><td>" + item.trouble_name + "</td><td>" + item.trouble_type_name + "</td><td>" + item.username + "</td><td>" + item.address + "</td><td>" + item.regionname + "</td><td>" + item.uploadtime + "</td><td>" + istrouble + "</td><td>" + item.level_name + "</td><td>" + troublestate + "</td><td><a class='operation' data-id='" + item.id + "' data-location_longitude='" + item.location_longitude + "' data-location_latitude='" + item.location_latitude + "' data-address='" + item.address + "' data-device_type_name='" + item.device_type_name + "' data-notes='" + item.handle_before_notes + "' data-uploadtime='" + item.uploadtime + "' data-handle_state='" + item.handle_state + "' data-state='" + item.state + "'  data-process_id='" + item.process_id + "' data-level_name='" + item.level_name + "' data-level_time='" + item.level_time + "' data-level_check_time='" + item.level_check_time + "' data-level_username='" + item.level_username + "' data-safety_content='" + item.safety_content + "'  data-level_check_username='" + item.level_check_username + "'  data-level_check_note='" + item.level_check_note + "' data-regionname='" + item.regionname + "' data-handle_trouble_clear='" + item.handle_trouble_clear + "' data-equid_name='" + item.equid_name + "' data-trouble_type_name='" + item.trouble_type_name + "' data-username='" + item.username + "' data-padid='" + item.padid + "' data-handle_username='" + item.handle_username + "' data-level3_name='" + item.level3_name + "' data-yhfx='" + item.yhfx + "' data-yhfx_thumb='" + item.yhfx_thumb + "' data-yhqc='" + item.yhqc + "'  data-yhqyp='" + item.yhqyp + "' data-fund='" + item.fund + "' data-duty='" + item.duty + "' data-controlmeasure='" + item.controlmeasure + "'  data-timelimit='" + item.timelimit + "' data-emergencymeasure='" + item.emergencymeasure + "'>详情</a></td></tr>";

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

                    html_trs_blank += "<tr class=goto data-id='null'><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>";

                } else {

                    html_trs_blank += "<tr class=goto data-id='null'><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>";

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
            var mapPoint = new Point($(e.currentTarget).data("location_longitude"), $(e.currentTarget).data("location_latitude"), new SpatialReference({ wkid: this.map.spatialReference.wkid }));

            // var popup = new Popup({
            //     fillSymbol: new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
            //         new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
            //             new Color([255, 0, 0]), 2), new Color([255, 255, 0, 0.25]))
            // }, document.createElement("div"));

            // popup.setMap(this.map);
            // popup.setTitle("<div class='HiddenDangerSearch-id'>标题</div>");






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
                // stryhfx = "暂无图片";
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



            //处理縮略圖照片
            var stryhfx_thumb = "";
            if ($(e.currentTarget).data("yhfx_thumb") != "") {
                if ($(e.currentTarget).data("yhfx_thumb").indexOf(',') >= 0) {
                    $(e.currentTarget).data("yhfx_thumb").split(',').forEach(
                        i => stryhfx_thumb += "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "' alt='" + $(e.currentTarget).data("address") + "'/>"
                    );
                } else {
                    stryhfx_thumb = "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + $(e.currentTarget).data("yhfx_thumb") + "' alt='" + $(e.currentTarget).data("address") + "'/>";
                }

            } else {
                // stryhfx_thumb = "暂无图片";
                stryhfx_thumb = "<image src='" + this.config.ZanWuTuPian + "'/>";
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
                // stryhqc = "暂无图片";
                stryhqc = "<image src='" + this.config.ZanWuTuPian + "'/>";
            }


            //处理音频

            // var stryhqyp = "";
            // if ($(e.currentTarget).data("yhqyp") != "") {
            //     if ($(e.currentTarget).data("yhqyp").indexOf(',') >= 0) {
            //         $(e.currentTarget).data("yhqyp").split(',').forEach(
            //             i => stryhqyp += "<image class='hiddedangerinfo_audio'  src='./widgets/HiddenDangerSearch/images/audio.png' data-yhqyp='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "'/>"
            //         );
            //     } else {
            //         stryhqyp = "<image class='hiddedangerinfo_audio' src='./widgets/HiddenDangerSearch/images/audio.png' data-yhqyp='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + $(e.currentTarget).data("yhqyp") + "'/>";
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

            if ($(e.currentTarget).data("process_id") == 2) {
                //待定级
                info = _.template(this.template.split('||')[1])({
                    "caption": $(e.currentTarget).data("address"),
                    "address": $(e.currentTarget).data("address"),
                    // "notes": $(e.currentTarget).data("notes"),
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
                    "coordinate": $(e.currentTarget).data("location_longitude").toFixed("5") + "," + $(e.currentTarget).data("location_latitude").toFixed("5"),


                });
                //弹出popup
                this.popup.setSize(730, 420);


            } else if ($(e.currentTarget).data("process_id") == 3) {
                //待定级审核
                info = _.template(this.template.split('||')[3])({
                    "caption": $(e.currentTarget).data("address"),
                    "address": $(e.currentTarget).data("address"),
                    "notes": note,
                    "uploadtime": $(e.currentTarget).data("uploadtime"),
                    "state": state,
                    "yhjb": $(e.currentTarget).data("level_name"),
                    "level_check_note": $(e.currentTarget).data("level_check_note"),
                    "level_name": $(e.currentTarget).data("level_name"),
                    "level_username": $(e.currentTarget).data("level_username"),

                    "level_time": $(e.currentTarget).data("level_time"),
                    "level_check_time": $(e.currentTarget).data("level_check_time"),
                    "level_check_username": $(e.currentTarget).data("level_check_username"),


                    "safety_content": $(e.currentTarget).data("safety_content"),
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
                    "coordinate": $(e.currentTarget).data("location_longitude").toFixed("5") + "," + $(e.currentTarget).data("location_latitude").toFixed("5"),


                });
                //弹出popup
                this.popup.setSize(730, 520);


            } else if ($(e.currentTarget).data("process_id") == 4) {
                //待登记
                info = _.template(this.template.split('||')[4])({
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
                    "safety_content": $(e.currentTarget).data("safety_content"),
                    "level_check_note": $(e.currentTarget).data("level_check_note"),
                    "level_name": $(e.currentTarget).data("level_name"),
                    "level_username": $(e.currentTarget).data("level_username"),
                    "level_check_username": $(e.currentTarget).data("level_check_username"),
                    "level_time": $(e.currentTarget).data("level_time"),
                    "level_check_time": $(e.currentTarget).data("level_check_time"),

                    "equid": $(e.currentTarget).data("padid"),
                    "handle_username": $(e.currentTarget).data("handle_username"),
                    "yhfx": stryhfx,
                    "yhqc": stryhqc,
                    "yhqyp": stryhqyp,
                    "content": "",
                    "coordinate": $(e.currentTarget).data("location_longitude").toFixed("5") + "," + $(e.currentTarget).data("location_latitude").toFixed("5"),


                });
                //弹出popup
                this.popup.setSize(730, 560);


            } else if ($(e.currentTarget).data("process_id") == 5 || $(e.currentTarget).data("process_id") == 9 || $(e.currentTarget).data("process_id") == 10) {
                //待安排
                info = _.template(this.template.split('||')[5])({
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
                    "safety_content": $(e.currentTarget).data("safety_content"),
                    "level_check_note": $(e.currentTarget).data("level_check_note"),
                    "level_name": $(e.currentTarget).data("level_name"),
                    "level_username": $(e.currentTarget).data("level_username"),
                    "level_check_username": $(e.currentTarget).data("level_check_username"),
                    "level_time": $(e.currentTarget).data("level_time"),
                    "level_check_time": $(e.currentTarget).data("level_check_time"),
                    "regionname": $(e.currentTarget).data("regionname"),
                    "equid": $(e.currentTarget).data("padid"),
                    "handle_username": $(e.currentTarget).data("handle_username"),
                    "yhfx": stryhfx,
                    "yhqc": stryhqc,
                    "yhqyp": stryhqyp,
                    "content": "",
                    "coordinate": $(e.currentTarget).data("location_longitude").toFixed("5") + "," + $(e.currentTarget).data("location_latitude").toFixed("5"),


                    //处置信息
                    "fund": $(e.currentTarget).data("fund"),
                    "duty": $(e.currentTarget).data("duty"),
                    "controlmeasure": $(e.currentTarget).data("controlmeasure"),
                    "timelimit": $(e.currentTarget).data("timelimit"),
                    "emergencymeasure": $(e.currentTarget).data("emergencymeasure"),
                });
                //弹出popup
                this.popup.setSize(730, 720);


            } else if ($(e.currentTarget).data("process_id") == 6) {
                //巡检中
                this.getTroublePlan(this.curhiddendangerid);

                this.cur_address = $(e.currentTarget).data("address");
                this.cur_trouble_type_name = $(e.currentTarget).data("trouble_type_name");
                this.cur_device_type_name = $(e.currentTarget).data("device_type_name");
                this.cur_username = $(e.currentTarget).data("username");
                this.cur_yhfx = stryhfx;
                this.cur_yhqyp = stryhqyp;
                this.cur_notes = note;
                this.cur_uploadtime = $(e.currentTarget).data("uploadtime");
                this.cur_coordinate = $(e.currentTarget).data("location_longitude").toFixed("5") + "," + $(e.currentTarget).data("location_latitude").toFixed("5");
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



            } else if ($(e.currentTarget).data("process_id") == 7) {
                //待审核
                this.getTroublePlan(this.curhiddendangerid);

                this.cur_address = $(e.currentTarget).data("address");
                this.cur_trouble_type_name = $(e.currentTarget).data("trouble_type_name");
                this.cur_device_type_name = $(e.currentTarget).data("device_type_name");
                this.cur_username = $(e.currentTarget).data("username");
                this.cur_yhfx = stryhfx;
                this.cur_yhqyp = stryhqyp;
                this.cur_notes = note;
                this.cur_uploadtime = $(e.currentTarget).data("uploadtime");
                this.cur_coordinate = $(e.currentTarget).data("location_longitude").toFixed("5") + "," + $(e.currentTarget).data("location_latitude").toFixed("5");
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



            } else if ($(e.currentTarget).data("process_id") == 8) {
                //处理完成

                if ($(e.currentTarget).data("state") == 0) {
                    //不是隐患
                    info = _.template(this.template.split('||')[2])({
                        "caption": $(e.currentTarget).data("address"),
                        "address": $(e.currentTarget).data("address"),
                        "notes": note,
                        "uploadtime": $(e.currentTarget).data("uploadtime"),
                        "state": state,
                        "level_username": $(e.currentTarget).data("level_username"),
                        "level_time": $(e.currentTarget).data("level_time"),
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
                        "coordinate": $(e.currentTarget).data("location_longitude").toFixed("5") + "," + $(e.currentTarget).data("location_latitude").toFixed("5"),


                    });
                    //弹出popup
                    this.popup.setSize(730, 520);


                } else {
                    this.getTroublePlan(this.curhiddendangerid);

                    this.cur_address = $(e.currentTarget).data("address");
                    this.cur_trouble_type_name = $(e.currentTarget).data("trouble_type_name");
                    this.cur_device_type_name = $(e.currentTarget).data("device_type_name");
                    this.cur_username = $(e.currentTarget).data("username");
                    this.cur_yhfx = stryhfx;
                    this.cur_yhqyp = stryhqyp;
                    this.cur_notes = note;
                    this.cur_uploadtime = $(e.currentTarget).data("uploadtime");
                    this.cur_coordinate = $(e.currentTarget).data("location_longitude").toFixed("5") + "," + $(e.currentTarget).data("location_latitude").toFixed("5");

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

                    // // 隐患正常审核结束
                    // info = _.template(this.template.split('||')[7])({
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
                    // //弹出popup
                    // this.popup.setSize(600, 700);

                }

            }




            // popup.setContent(info);
            // this.map.infoWindow = popup;
            // this.map.infoWindow.show(mapPoint);
            // popup.maximize();


            var Obj = this.popup.Show("详情", info, true);
            this.popup.domObj.find("#pictureshow").viewer();

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



            // //定义弹出照片墙

            // $(".picture-search").off("click").on("click", function (e) {
            //     $(e.currentTarget).children();
            //     var data = [];
            //     for (var i = 0; i < $(e.currentTarget).children().length; i++) {
            //         data.push({ src: (<any>$(e.currentTarget).children()[i]).src, alt: $(e.currentTarget).children().attr("alt") });
            //     }
            //     // this.photowall.setSize(600, 650);
            //     this.photowall.setSize(500, 730);
            //     var htmlString = _.template(this.template.split('$$')[2])({ photoData: data });
            //     var Obj = this.photowall.Show("照片", htmlString);
            //     this.photowall.find("#pictureshow").viewer();



            // }.bind(this));


            //打印
            this.print_address = $(e.currentTarget).data("address");
            this.print_describe = "设备类型：" + $(e.currentTarget).data("equid_name") + "</br>" + "隐患类型：" + $(e.currentTarget).data("trouble_type_name") + "</br>" + "描述：" + $(e.currentTarget).data("notes");
            this.print_xjry = $(e.currentTarget).data("username");
            this.print_uploadtime = $(e.currentTarget).data("uploadtime");
            this.print_fximg = "";
            // var stryhfx = "";
            if ($(e.currentTarget).data("yhfx") != "") {
                if ($(e.currentTarget).data("yhfx").indexOf(',') >= 0) {
                    $(e.currentTarget).data("yhfx").split(',').forEach(
                        i => this.print_fximg += "<div  class='print_fx no-print'><image  src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "' alt='" + $(e.currentTarget).data("address") + "'/><div class='img_isCheck'>    </div></div>"// <span class='glyphicon glyphicon-ok' aria-hidden='true'></span> 
                    );
                } else {
                    this.print_fximg = "<div class='print_fx no-print'><image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + $(e.currentTarget).data("yhfx") + "' alt='" + $(e.currentTarget).data("address") + "'/><div class='img_isCheck'>     </div></div>";
                }

            } else {
                // stryhfx = "暂无图片";

            }

            //定义选中图片事件
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
            //定义打印事件
            // $(".btn-print").off("click").on("click", function (e) {


            //     var myDate = new Date();
            //     var repairorder_num = myDate.getFullYear().toString() + (myDate.getMonth() + 1) + myDate.getDate() + (myDate.getHours() + 1) + (myDate.getMinutes() + 1) + (myDate.getSeconds() + 1);

            //     // this.photowall.setSize(1100, 650);
            //     this.photowall.setSize(900, 550);
            //     var htmlString = _.template(this.template.split('||')[10])({
            //         repairorder_num: "编号" + repairorder_num,
            //         print_address: this.print_address,
            //         print_describe: this.print_describe,
            //         print_xjry: this.print_xjry,
            //         print_zhibao: AppX.appConfig.realname,
            //         print_uploadtime: this.print_uploadtime,
            //         print_rq: myDate.getFullYear().toString() + "年" + (myDate.getMonth() + 1) + "月" + myDate.getDate() + "日",
            //         print_fximg: this.print_fximg,
            //         // print_slr: 1,
            //         // print_slsj: 1,
            //         // print_clqk: 1,

            //     });
            //     var Obj = this.photowall.Show("打印", htmlString);

            //     $(".hiddendangersearch_btn_print").off("click").on("click", function (e) {
            //         (<any>$(".repairorder")).print();//template-print   repairorder
            //     }.bind(this));
            //     $(".hiddendangersearch_btn_return").off("click").on("click", function (e) {
            //         this.photowall.Close();
            //     }.bind(this));

            //     $(".hiddendangersearch_btn_print_photo").off("click").on("click", function (e) {
            //         (<any>$(".print_fximg")).print({
            //             //Use Global styles
            //             globalStyles: false,
            //             //Add link with attrbute media=print
            //             mediaPrint: true,
            //             //Custom stylesheet
            //             // stylesheet: "css/style.css",
            //             //Print in a hidden iframe
            //             iframe: false,
            //             //Don't print this
            //             noPrintSelector: ".avoid-this",
            //             //Add this at top
            //             prepend: "",
            //             //Add this on bottom
            //             append: ""
            //         });
            //     }.bind(this));




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


        //初始化隐患类型
        this.getCompany();

        this.getGroup();
        //初始化隐患类型
        this.getUser();

        //查询巡检片区
        this.getAllPlanRegion();


        this.domObj.find(".state").val(this.state);
        this.domObj.find(".process_id ").val(this.process_id);



        this.hideLoading();







    }



    getHiddenDanger_icon(pagenumber, pagesize, trouble_typeid, pdaid, company, depid, userid, state, process_id) {
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
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getHiddenDangerList,
            data: {
                "pageindex": pagenumber || this.config.pagenumber_icon,
                "pagesize": pagesize || this.config.pagesize_icon,
                "trouble_typeid": trouble_typeid,
                "pdaid": pdaid,
                "companyid": company,
                "depid": depid,
                "userid": userid,
                "state": state,
                "process_id": process_id,

                "uploadtime1": this.begindate,
                "uploadtime2": this.enddate,

                "keyword": this.address,
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
            var troublename = "";
            if (item.address.length > 14) {
                addr = item.address.substring(0, 14) + "...";
            } else {
                addr = item.address;
            }
            if (item.trouble_name.length > 14) {
                troublename = item.trouble_name.substring(0, 14) + "...";
            } else {
                troublename = item.trouble_name;
            }




            html_trs_data += `<li data-troubleid='${item.id}' data-location_latitude='${item.location_latitude}' data-location_longitude='${item.location_longitude}' data-address='${item.address}' data-equid_name='${item.equid_name}' data-trouble_type_name='${item.trouble_type_name}' data-notes='${item.handle_before_notes}' data-uploadtime='${item.uploadtime}' data-handle_state='${item.handle_state}' data-state='${item.state}' data-level_name='${item.level_name}' data-safety_content='${item.safety_content}'  data-level_username='${item.level_username}'  data-level_check_username='${item.level_check_username}'  data-level_check_note='${item.level_check_note}' data-process_id='${item.process_id}' data-level_time='${item.level_time}'  data-level_check_time='${item.level_check_time}'   data-regionname='${item.regionname}' data-handle_trouble_clear='${item.handle_trouble_clear}' data-equid_name='${item.equid_name}' data-trouble_typeid='${item.trouble_typeid}' data-trouble_type_name='${item.trouble_type_name}'  data-device_type_name='${item.device_type_name}' data-username='${item.username}' data-padid='${item.padid}' data-handle_username='${item.handle_username}' data-yhfx='${item.yhfx}' data-yhqc='${item.yhqc}' data-yhqyp='${item.yhqyp}' data-fund='${item.fund}' data-duty='${item.duty}' data-controlmeasure='${item.controlmeasure}' data-timelimit='${item.timelimit}' data-emergencymeasure='${item.emergencymeasure}' ><a >${stryhfx_thumb}<span  class="troublename" title='${item.trouble_name || item.address}'>${troublename || addr}</span></a></li>`;
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

                if (this.hiddendangersearch_clusterLayer_hiddendanger) {
                    this.hiddendangersearch_clusterLayer_hiddendanger.clear();
                }
                this.currentpage_icon = this.currentpage_icon - 1;
                this.getHiddenDanger_icon(this.currentpage_icon, this.currentpagesieze_icon, this.trouble_typeid, this.pdaid, this.company, this.depid, this.userid, this.handle_state, this.handle_trouble_clear);

            }


        }.bind(this));
        this.domObj.find(".next_icon").off("click").on("click", function () {

            if (this.currentpage_icon + 1 <= this.totalpage) {
                that.map.infoWindow.hide();
                //清空图层
                if (this.hiddendangersearch_clusterLayer_hiddendanger) {
                    this.hiddendangersearch_clusterLayer_hiddendanger.clear();
                }
                this.currentpage_icon = this.currentpage_icon + 1;
                this.getHiddenDanger_icon(this.currentpage_icon, this.currentpagesieze_icon, this.trouble_typeid, this.pdaid, this.company, this.depid, this.userid, this.handle_state, this.handle_trouble_clear);
            }
        }.bind(this));

        this.domObj.find(".pageturning_icon").off("click").on("click", function () {
            var currpage = parseInt(this.domObj.find(".currpage").val());
            if (currpage <= this.totalpage && currpage >= 1) {
                that.map.infoWindow.hide();
                //清空图层
                if (this.hiddendangersearch_clusterLayer_hiddendanger) {
                    this.hiddendangersearch_clusterLayer_hiddendanger.clear();
                }
                this.currentpage_icon = parseInt(this.domObj.find(".currpage").val());
                this.getHiddenDanger_icon(this.currentpage_icon, this.currentpagesieze_icon, this.trouble_typeid, this.pdaid, this.company, this.depid, this.userid, this.state, this.process_id);
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
            //高亮显示

            this.pointlayer.clear();
            this.pointlayer.add(new Graphic(mapPoint, this.setGraphSymbol("point")));

            // var strdiv= domConstruct.create("div");
            // var popup = new Popup({
            //     fillSymbol: new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
            //         new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
            //             new Color([255, 0, 0]), 2), new Color([255, 255, 0, 0.25]))
            // }, document.createElement("div"));

            // popup.setMap(this.map);
            // popup.setTitle("<div class='HiddenDangerSearch-id'>标题</div>");
            // that.map.infoWindow.setTitle("<div class='HiddenDangerSearch-id' id=" + $(e.currentTarget).data("id") + ">标题</div>");


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
                // stryhfx = "暂无图片";
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
                // stryhqc = "暂无图片";
                stryhqc = "<image src='" + this.config.ZanWuTuPian + "'/>";
            }

            //处理音频

            // var stryhqyp = "";
            // if ($(e.currentTarget).data("yhqyp") != "") {
            //     if ($(e.currentTarget).data("yhqyp").indexOf(',') >= 0) {
            //         $(e.currentTarget).data("yhqyp").split(',').forEach(
            //             i => stryhqyp += "<image class='hiddedangerinfo_audio'  src='./widgets/HiddenDangerSearch/images/audio.png' data-yhqyp='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "'/>"
            //         );
            //     } else {
            //         stryhqyp = "<image class='hiddedangerinfo_audio' src='./widgets/HiddenDangerSearch/images/audio.png' data-yhqyp='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + $(e.currentTarget).data("yhqyp") + "'/>";
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

            if ($(e.currentTarget).data("process_id") == 2) {
                //待定级
                info = _.template(this.template.split('||')[1])({
                    "caption": $(e.currentTarget).data("address"),
                    "address": $(e.currentTarget).data("address"),
                    // "notes": $(e.currentTarget).data("notes"),
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
                    "coordinate": $(e.currentTarget).data("location_longitude").toFixed("5") + "," + $(e.currentTarget).data("location_latitude").toFixed("5"),


                });
                //弹出popup
                this.popup.setSize(730, 420);


            } else if ($(e.currentTarget).data("process_id") == 3) {
                //待定级审核
                info = _.template(this.template.split('||')[3])({
                    "caption": $(e.currentTarget).data("address"),
                    "address": $(e.currentTarget).data("address"),
                    "notes": note,
                    "uploadtime": $(e.currentTarget).data("uploadtime"),
                    "state": state,
                    "yhjb": $(e.currentTarget).data("level_name"),
                    "level_check_note": $(e.currentTarget).data("level_check_note"),
                    "level_name": $(e.currentTarget).data("level_name"),
                    "level_username": $(e.currentTarget).data("level_username"),
                    "level_check_username": $(e.currentTarget).data("level_check_username"),

                    "level_time": $(e.currentTarget).data("level_time"),
                    "level_check_time": $(e.currentTarget).data("level_check_time"),

                    "safety_content": $(e.currentTarget).data("safety_content"),
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
                    "coordinate": $(e.currentTarget).data("location_longitude").toFixed("5") + "," + $(e.currentTarget).data("location_latitude").toFixed("5"),


                });
                //弹出popup
                this.popup.setSize(730, 520);


            } else if ($(e.currentTarget).data("process_id") == 4) {
                //待登记
                info = _.template(this.template.split('||')[4])({
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
                    "safety_content": $(e.currentTarget).data("safety_content"),
                    "level_check_note": $(e.currentTarget).data("level_check_note"),
                    "level_name": $(e.currentTarget).data("level_name"),
                    "level_username": $(e.currentTarget).data("level_username"),
                    "level_check_username": $(e.currentTarget).data("level_check_username"),

                    "level_time": $(e.currentTarget).data("level_time"),
                    "level_check_time": $(e.currentTarget).data("level_check_time"),


                    "equid": $(e.currentTarget).data("padid"),
                    "handle_username": $(e.currentTarget).data("handle_username"),
                    "yhfx": stryhfx,
                    "yhqc": stryhqc,
                    "yhqyp": stryhqyp,
                    "content": "",
                    "coordinate": $(e.currentTarget).data("location_longitude").toFixed("5") + "," + $(e.currentTarget).data("location_latitude").toFixed("5"),


                });
                //弹出popup
                this.popup.setSize(730, 560);


            } else if ($(e.currentTarget).data("process_id") == 5 || $(e.currentTarget).data("process_id") == 9 || $(e.currentTarget).data("process_id") == 10) {
                //待安排
                info = _.template(this.template.split('||')[5])({
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
                    "safety_content": $(e.currentTarget).data("safety_content"),
                    "level_check_note": $(e.currentTarget).data("level_check_note"),
                    "level_name": $(e.currentTarget).data("level_name"),
                    "level_username": $(e.currentTarget).data("level_username"),
                    "level_check_username": $(e.currentTarget).data("level_check_username"),


                    "level_time": $(e.currentTarget).data("level_time"),
                    "level_check_time": $(e.currentTarget).data("level_check_time"),


                    "regionname": $(e.currentTarget).data("regionname"),
                    "equid": $(e.currentTarget).data("padid"),
                    "handle_username": $(e.currentTarget).data("handle_username"),
                    "yhfx": stryhfx,
                    "yhqc": stryhqc,
                    "yhqyp": stryhqyp,
                    "content": "",
                    "coordinate": $(e.currentTarget).data("location_longitude").toFixed("5") + "," + $(e.currentTarget).data("location_latitude").toFixed("5"),


                    //处置信息
                    "fund": $(e.currentTarget).data("fund"),
                    "duty": $(e.currentTarget).data("duty"),
                    "controlmeasure": $(e.currentTarget).data("controlmeasure"),
                    "timelimit": $(e.currentTarget).data("timelimit"),
                    "emergencymeasure": $(e.currentTarget).data("emergencymeasure"),
                });
                //弹出popup
                this.popup.setSize(730, 720);//


            } else if ($(e.currentTarget).data("process_id") == 6) {
                //巡检中
                this.getTroublePlan(this.curhiddendangerid);

                this.cur_address = $(e.currentTarget).data("address");
                this.cur_trouble_type_name = $(e.currentTarget).data("trouble_type_name");
                this.cur_device_type_name = $(e.currentTarget).data("device_type_name");
                this.cur_username = $(e.currentTarget).data("username");
                this.cur_yhfx = stryhfx;
                this.cur_yhqyp = stryhqyp;
                this.cur_notes = note;
                this.cur_uploadtime = $(e.currentTarget).data("uploadtime");
                this.cur_coordinate = $(e.currentTarget).data("location_longitude").toFixed("5") + "," + $(e.currentTarget).data("location_latitude").toFixed("5");
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





            } else if ($(e.currentTarget).data("process_id") == 7) {
                //待审核
                this.getTroublePlan(this.curhiddendangerid);

                this.cur_address = $(e.currentTarget).data("address");
                this.cur_trouble_type_name = $(e.currentTarget).data("trouble_type_name");
                this.cur_device_type_name = $(e.currentTarget).data("device_type_name");
                this.cur_username = $(e.currentTarget).data("username");
                this.cur_yhfx = stryhfx;
                this.cur_yhqyp = stryhqyp;
                this.cur_notes = note;
                this.cur_uploadtime = $(e.currentTarget).data("uploadtime");
                this.cur_coordinate = $(e.currentTarget).data("location_longitude").toFixed("5") + "," + $(e.currentTarget).data("location_latitude").toFixed("5");
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



            } else if ($(e.currentTarget).data("process_id") == 8) {
                //处理完成

                if ($(e.currentTarget).data("state") == 0) {
                    //不是隐患
                    info = _.template(this.template.split('||')[2])({
                        "caption": $(e.currentTarget).data("address"),
                        "address": $(e.currentTarget).data("address"),
                        "notes": note,
                        "uploadtime": $(e.currentTarget).data("uploadtime"),
                        "state": state,
                        "level_username": $(e.currentTarget).data("level_username"),


                        "level_time": $(e.currentTarget).data("level_time"),

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
                        "coordinate": $(e.currentTarget).data("location_longitude").toFixed("5") + "," + $(e.currentTarget).data("location_latitude").toFixed("5"),


                    });
                    //弹出popup
                    this.popup.setSize(730, 520);


                } else {
                    this.getTroublePlan(this.curhiddendangerid);

                    this.cur_address = $(e.currentTarget).data("address");
                    this.cur_trouble_type_name = $(e.currentTarget).data("trouble_type_name");
                    this.cur_device_type_name = $(e.currentTarget).data("device_type_name");
                    this.cur_username = $(e.currentTarget).data("username");
                    this.cur_yhfx = stryhfx;
                    this.cur_yhqyp = stryhqyp;
                    this.cur_notes = note;
                    this.cur_uploadtime = $(e.currentTarget).data("uploadtime");

                    this.cur_coordinate = $(e.currentTarget).data("location_longitude").toFixed("5") + "," + $(e.currentTarget).data("location_latitude").toFixed("5");

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

                    // // 隐患正常审核结束
                    // info = _.template(this.template.split('||')[7])({
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
                    // //弹出popup
                    // this.popup.setSize(600, 700);

                }

            }
            // popup.setContent(info);
            // this.map.infoWindow = popup;
            // this.map.infoWindow.show(mapPoint);
            // popup.maximize();

            // this.popup.setSize(600, 650);
            var Obj = this.popup.Show("详情", info, true);


            this.popup.domObj.find("#pictureshow").viewer();


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

            // $(".picture-search").off("click").on("click", function (e) {
            //     $(e.currentTarget).children();
            //     var data = [];
            //     for (var i = 0; i < $(e.currentTarget).children().length; i++) {
            //         data.push({ src: (<any>$(e.currentTarget).children()[i]).src, alt: $(e.currentTarget).children().attr("alt") });
            //     }
            //     // this.photowall.setSize(600, 650);
            //     this.photowall.setSize(500, 730);
            //     var htmlString = _.template(this.template.split('$$')[2])({ photoData: data });
            //     var Obj = this.photowall.Show("照片", htmlString);
            //     // this.photowall.find("#pictureshow").viewer();



            // }.bind(this));



            //打印
            this.print_address = $(e.currentTarget).data("address");
            this.print_describe = "设备类型：" + $(e.currentTarget).data("equid_name") + "</br>" + "隐患类型：" + $(e.currentTarget).data("trouble_type_name") + "</br>" + "描述：" + $(e.currentTarget).data("notes");
            this.print_xjry = $(e.currentTarget).data("username");
            this.print_uploadtime = $(e.currentTarget).data("uploadtime");
            //定义打印事件
            $(".btn-print").off("click").on("click", function (e) {
                var myDate = new Date();
                myDate.getFullYear(); //获取完整的年份(4位,1970-????)
                myDate.getMonth(); //获取当前月份(0-11,0代表1月)
                myDate.getDate(); //获取当前日(1-31)
                myDate.getHours(); //获取当前小时数(0-23)
                myDate.getMinutes(); //获取当前分钟数(0-59)
                myDate.getSeconds(); //获取当前秒数(0-59)

                var repairorder_num = myDate.getFullYear().toString() + (myDate.getMonth() + 1) + myDate.getDate() + (myDate.getHours() + 1) + (myDate.getMinutes() + 1) + (myDate.getSeconds() + 1);


                this.photowall.setSize(900, 570);
                var htmlString = _.template(this.template.split('||')[6])({
                    repairorder_num: "编号" + repairorder_num,
                    print_address: this.print_address,
                    print_describe: this.print_describe,
                    print_xjry: this.print_xjry,
                    print_uploadtime: this.print_uploadtime,
                });
                var Obj = this.photowall.Show("打印", htmlString);

                $(".hiddendangersearch_btn_print").off("click").on("click", function (e) {
                    (<any>$(".repairorder")).print();
                }.bind(this));
                $(".hiddendangersearch_btn_return").off("click").on("click", function (e) {
                    this.photowall.Close();
                }.bind(this));


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
        this.getCompany();

        this.getGroup();

        //初始化隐患类型
        this.getUser();

        //查询巡检片区
        this.getAllPlanRegion();



        this.domObj.find(".state").val(this.state);
        this.domObj.find(".process_id ").val(this.process_id);


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
                this.getHiddenDanger(this.config.pagenumber, this.config.pagesize, this.trouble_typeid, this.pdaid, this.company, this.depid, this.userid, this.state, this.process_id);
            } else {
                this.getHiddenDanger_icon(this.config.pagenumber_icon, this.config.pagesize_icon, this.trouble_typeid, this.pdaid, this.company, this.depid, this.userid, this.state, this.process_id);
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
        that.cur_yhfx;
        that.cur_yhqyp;
        if (results.code != 1) {
            that.toast.Show("查询设备信息出错！");
            console.log(results.message);
            return;
        }
        // var pdaid = this.domObj.find(".pdaid")
        // pdaid.empty();
        var strxjxx = "";
        var strzpxx = "";
        var strypxx = "";


        var strqcxx = "";
        var strqczpxx = "";
        var strqcypxx = "";

        var num = 0;

        var strshxx = "";
        // <th>审核人</th><th>意见</th> 
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


            // var strqczp = "";
            // var strqcyp = "";

            // strqcxx += "<table class='table table-bordered  table-striped'> <tbody class='huibaojilu' >";


            // if (item.trouble_clear.length > 0) {

            //     $.each(item.trouble_clear, function (index, item_clear) {

            //         if (item_clear.clear_pic != "") {
            //             if (item_clear.clear_pic.indexOf(',') >= 0) {
            //                 item_clear.clear_pic.split(',').forEach(
            //                     i => strqczp += "<li><image class='xjzp' src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "' /></li>"
            //                 );
            //             } else {
            //                 strqczp = "<li><image class='xjzp' src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + item_clear.clear_pic + "' /></li>";
            //             }
            //         } else {
            //             strqczp = "暂无图片";
            //         }

            //         strqczp = "  <ul id='pictureshow_qc' >" + strqczp + "</ul>";

            //         if (item_clear.clear_audio != "") {
            //             if (item_clear.clear_audio.indexOf(',') >= 0) {
            //                 item_clear.clear_audio.split(',').forEach(
            //                     i => strqcyp += "<audio controls='controls' preload='auto'  src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "'/>"
            //                 );
            //             } else {
            //                 strqcyp = "<audio controls='controls' preload='auto' src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + item_clear.clear_audio + "'/>";
            //             }
            //         } else {
            //             strqcyp = "暂无音频";
            //         }



            //         strqcxx += " <tr class='qcbg'> <td class='xjrqlie'>" + item_clear.create_time + " </td><td class='xjzplie'> <div class='xjzpdiv picture-search'>" + strqczp + " </div></td> <td> <div class='xjypdiv'>" + strqcyp + " </div>  </td><td> " + item_clear.notes + " </td>  </tr> ";



            //     }.bind(this));


            // }


            // strqcxx += " </tbody> </table>";




        }.bind(this));

        // pdaid.append(strequids);

        // this.domObj.find(".pdaid").val(this.pdaid);


        // var strshxx = "";
        // $.each(results.result, function (index, item) {
        //     strshxx += "  <p><span>审核人：" + item.main_plan[0].username + "</span></p>";
        //     strshxx += "  <p><span>审核意见" + item.main_plan[0].plan_begindate.split(' ')[0] + "--" + item.main_plan[0].plan_enddate.split(' ')[0] + "</span></p>";



        //     var strqczp = "";
        //     var strqcyp = "";

        //     strshxx += "<table class='table table-bordered  table-striped'> <tbody class='huibaojilu' >";


        //     if (item.trouble_clear.length > 0) {

        //         $.each(item.trouble_clear, function (index, item_clear) {
        //             if(index==item_clear.check_num){


        //             }

        //             if (item_clear.clear_pic != "") {
        //                 if (item_clear.clear_pic.indexOf(',') >= 0) {
        //                     item_clear.clear_pic.split(',').forEach(
        //                         i => strqczp += "<li><image class='xjzp' src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "' /></li>"
        //                     );
        //                 } else {
        //                     strqczp = "<li><image class='xjzp' src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + item_clear.clear_pic + "' /></li>";
        //                 }
        //             } else {
        //                 strqczp = "暂无图片";
        //             }

        //             strqczp = "  <ul id='pictureshow_qc' >" + strqczp + "</ul>";

        //             if (item_clear.clear_audio != "") {
        //                 if (item_clear.clear_audio.indexOf(',') >= 0) {
        //                     item_clear.clear_audio.split(',').forEach(
        //                         i => strqcyp += "<audio controls='controls' preload='auto'  src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "'/>"
        //                     );
        //                 } else {
        //                     strqcyp = "<audio controls='controls' preload='auto' src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + item_clear.clear_audio + "'/>";
        //                 }
        //             } else {
        //                 strqcyp = "暂无音频";
        //             }



        //             strshxx += " <tr class='qcbg'> <td class='xjrqlie'>" + item_clear.create_time + " </td><td class='xjzplie'> <div class='xjzpdiv picture-search'>" + strqczp + " </div></td> <td> <div class='xjypdiv'>" + strqcyp + " </div>  </td><td> " + item_clear.notes + " </td>  </tr> ";



        //         }.bind(this));


        //     }


        //     strshxx += " </tbody> </table>";




        // }.bind(this));








        var info = "";


        if (this.cur_process_id == 6) {
            //巡检中
            info = _.template(this.template.split('||')[6])({
                "address": this.cur_address,
                "trouble_type_name": this.cur_trouble_type_name,
                "device_type_name": this.cur_device_type_name,

                "username": this.cur_username,
                "yhfx": this.cur_yhfx,
                "yhqyp": this.cur_yhqyp,
                "notes": this.cur_notes,
                "uploadtime": this.cur_uploadtime,


                "coordinate": this.cur_coordinate,

                "safety_content": this.cur_safety_content,
                "level_name": this.cur_level_name,
                "level_username": this.cur_level_username,
                "level_check_username": this.cur_level_check_username,
                "level_check_note": this.cur_level_check_note,

                "level_time": this.cur_level_time,
                "level_check_time": this.cur_level_check_time,

                "regionname": this.cur_regionname,

                "state": this.cur_state,
                "xjxx": strxjxx + strqcxx,
                // "shxx": strshxx,


                //处置信息
                "fund": this.cur_fund,
                "duty": this.cur_duty,
                "controlmeasure": this.cur_controlmeasure,
                "timelimit": this.cur_timelimit,
                "emergencymeasure": this.cur_emergencymeasure,

            });
            //弹出popup
            this.popup.setSize(900, 720);


        } else if (this.cur_process_id == 7) {

            //待审核
            info = _.template(this.template.split('||')[7])({
                "address": this.cur_address,
                "trouble_type_name": this.cur_trouble_type_name,
                "device_type_name": this.cur_device_type_name,
                "username": this.cur_username,
                "yhfx": this.cur_yhfx,
                "yhqyp": this.cur_yhqyp,
                "notes": this.cur_notes,
                "uploadtime": this.cur_uploadtime,
                "coordinate": this.cur_coordinate,

                "safety_content": this.cur_safety_content,
                "level_name": this.cur_level_name,
                "level_username": this.cur_level_username,
                "level_check_username": this.cur_level_check_username,
                "level_check_note": this.cur_level_check_note,

                "level_time": this.cur_level_time,
                "level_check_time": this.cur_level_check_time,


                "regionname": this.cur_regionname,

                "state": this.cur_state,
                "xjxx": strxjxx + strqcxx,
                "shxx": strshxx,


                //处置信息
                "fund": this.cur_fund,
                "duty": this.cur_duty,
                "controlmeasure": this.cur_controlmeasure,
                "timelimit": this.cur_timelimit,
                "emergencymeasure": this.cur_emergencymeasure,
            });
            //弹出popup
            this.popup.setSize(900, 720);

        } else if (this.cur_process_id == 8) {
            //完成

            info = _.template(this.template.split('||')[8])({
                "address": this.cur_address,
                "trouble_type_name": this.cur_trouble_type_name,
                "device_type_name": this.cur_device_type_name,
                "username": this.cur_username,
                "yhfx": this.cur_yhfx,
                "yhqyp": this.cur_yhqyp,
                "notes": this.cur_notes,
                "uploadtime": this.cur_uploadtime,
                "coordinate": this.cur_coordinate,

                "safety_content": this.cur_safety_content,
                "level_name": this.cur_level_name,
                "level_username": this.cur_level_username,
                "level_check_username": this.cur_level_check_username,
                "level_check_note": this.cur_level_check_note,

                "level_time": this.cur_level_time,
                "level_check_time": this.cur_level_check_time,


                "regionname": this.cur_regionname,

                "state": this.cur_state,
                "xjxx": strxjxx + strqcxx,
                "shxx": strshxx,


                //处置信息
                "fund": this.cur_fund,
                "duty": this.cur_duty,
                "controlmeasure": this.cur_controlmeasure,
                "timelimit": this.cur_timelimit,
                "emergencymeasure": this.cur_emergencymeasure,
            });
            //弹出popup
            this.popup.setSize(900, 720);

        }





        var Obj = this.popup.Show("详情", info, true);
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

        // $(".picture-search").off("click").on("click", function (e) {
        //     $(e.currentTarget).children();
        //     var data = [];
        //     for (var i = 0; i < $(e.currentTarget).children().length; i++) {
        //         data.push({ src: (<any>$(e.currentTarget).children()[i]).src, alt: $(e.currentTarget).children().attr("alt") });
        //     }
        //     // this.photowall.setSize(600, 650);
        //     this.photowall.setSize(500, 730);
        //     var htmlString = _.template(this.template.split('$$')[2])({ photoData: data });
        //     var Obj = this.photowall.Show("照片", htmlString);
        //     this.photowall.find("#pictureshow").viewer();



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
                // "pagesize": this.config.pagesize_icon,
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
            strtrouble_typeids += "<option value=" + item.id + " title=" + item.name + " > " + item.name + " </option>";

        }.bind(this));
        trouble_typeid.append(strtrouble_typeids);

        this.domObj.find(".trouble_typeid").val(this.trouble_typeid);


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
            strcompany += "<option value=" + item.companyid + " >" + item.company_name + " </option>";

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

    getAllPlanRegion() {
        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getPlanRegionList,
            data: {
                "pageindex": this.config.pagenumber,
                "pagesize": 1000 || this.config.pagesize,
                // "trouble_typeid": trouble_typeid,
                // "equid": equid,
                // "handle_user_id": handle_user_id,
                // "handle_state": 0,
                // f: "pjson"
            },
            success: this.getAllPlanRegionListCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    getAllPlanRegionListCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("查询巡检片区信息出错！");
            console.log(results.message);
            return;
        }

        var region_names = this.domObj.find(".region_name").empty();
        var strregion_names = "<option value='' selected>全部</option>";
        $.each(results.result.rows, function (index, item) {
            strregion_names += "<option value=" + item.regionid + " > " + item.regionname + " </option>";

        }.bind(this));
        region_names.append(strregion_names);

        //  this.addPolygonGraphic(results);
        this.domObj.find(".region_name").val(this.region_id);






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

                // stryhfx = "<image src='" + this.config.ZanWuTuPian + "'/>";
                stryhfx = "暂无图片";
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

                // stryhqc = "<image src='" + this.config.ZanWuTuPian + "'/>";
                stryhqc = "暂无图片";
            }



            var attributes = {
                "id": p.id,
                "Caption": p.address,
                "address": p.address,
                "notes": p.handle_before_notes,
                "uploadtime": p.uploadtime.replace('T', '  '),
                "handle_state": handle_state,
                "trouble_type_name": p.trouble_type_name,
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
        popupTemplate2.setContent(templateArr[9])


        // cluster layer that uses OpenLayers style clustering
        if (this.hiddendangersearch_clusterLayer_hiddendanger != null) {
            this.map.removeLayer(this.hiddendangersearch_clusterLayer_hiddendanger);
            this.hiddendangersearch_clusterLayer_hiddendanger = null
        }
        this.hiddendangersearch_clusterLayer_hiddendanger = new ClusterLayer({
            "basemap": this.map,
            "data": photoInfo.data,
            "distance": 10,
            "id": "hiddendangersearch_clusters",
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
        this.hiddendangersearch_clusterLayer_hiddendanger.setRenderer(renderer);
        //this.hiddendangersearch_clusterLayer_hiddendanger.symbol = blue;
        this.map.addLayer(this.hiddendangersearch_clusterLayer_hiddendanger);
        // // close the info window when the map is clicked
        // this.map.on("click", this.cleanUp.bind(this));
        // // close the info window when esc is pressed
        // this.map.on("key-down", function (e) {
        //     if (e.keyCode === 27) {
        //         this.cleanUp().bind(this);
        //     }
        // });

        //定义详情事件

        //click，点击生成
        // $(".arcgispopup_operation").on("click", () => {

        //     $(".operation").first().trigger("click");
        // });


        $("body").on("click", ".arcgispopup_operation", function (e) {
            var id = $(e.currentTarget).data("id");
            $.each($(".widget-hiddendangersearch .operation"), function (i, value) {
                if ($(value).data("id") == id) {

                    $($(".widget-hiddendangersearch  .operation")[i]).trigger("click");

                }
            });

            $.each($(".widget-hiddendangersearch .imglist li"), function (i, value) {
                if ($(value).data("troubleid") == id) {

                    $($(".widget-hiddendangersearch  .imglist li")[i]).trigger("click");

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
        if (this.hiddendangersearch_clusterLayer_hiddendanger) {
            this.map.removeLayer(this.hiddendangersearch_clusterLayer_hiddendanger);
        }
        if (this.pointlayer) {
            this.map.removeLayer(this.pointlayer);
            this.pointlayer.clear();
        }
        this.domObj.remove();
        this.afterDestroy();
    }

}