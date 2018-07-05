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
import Popup = require('esri/dijit/Popup');
import PopupTemplate = require('esri/dijit/PopupTemplate');
import domconstruct = require('dojo/dom-construct');
import InfoWindow = require('esri/dijit/InfoWindow');
import InfoTemplate = require("esri/InfoTemplate");
import arrayUtils = require('dojo/_base/array');
import SimpleMarkerSymbol = require('esri/symbols/SimpleMarkerSymbol');
import ClassBreaksRenderer = require('esri/renderers/ClassBreaksRenderer');
import ClusterLayer = require('extras/ClusterLayer');




export = HiddenDangerHandle;

class HiddenDangerHandle extends BaseWidget {
    baseClass = "widget-hiddendangerhandle";
    map = null;
    toast = null;
    totalpage = 1;
    currentpage = 1;
    currentpagesieze = 1;
    curenthiddendangertypeid = "";
    handlehiddendangerInfoGraphicLayer: GraphicsLayer;
    trouble_typeid = "";
    equid = "";
    handle_userid = "";
    HandleTroublePoint = [];
    hiddendangerhandle_clusterLayer = null;//数据库中的隐患
    curhiddendangerid = "";

    startup() {
        this.configure();
        this.initHtml();
        this.initEvent();

    }
    initHtml() {
        var html = _.template(this.template.split('$$')[0])();
        this.setHtml(html);
        this.ready();
        this.getHiddenDanger(this.config.pagenumber, this.config.pagesize, this.trouble_typeid, this.equid, this.handle_userid);
    }

    configure() {
        this.toast = this.AppX.runtimeConfig.toast;
        this.map = this.AppX.runtimeConfig.map;
    }


    getHiddenDangerListCallback(results) {
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
        var domtb = this.domObj.find(".addhiddendanger")
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
            html_trs_data += "<tr class=goto  data-id='" + item.id + "' data-location_longitude='" + item.location_longitude + "' data-location_latitude='" + item.location_latitude + "' data-address='" + item.address + "' data-notes='" + item.notes + "' data-uploadtime='" + item.uploadtime + "' data-handle_state='" + item.handle_state + "' data-level1_name='" + item.level1_name + "' data-level2_name='" + item.level2_name + "' data-level3_name='" + item.level3_name + "' data-handle_trouble_clear='" + item.handle_trouble_clear + "' data-trouble_typeid='" + item.trouble_typeid + "' data-username='" + item.username + "' data-padid='" + item.padid + "' data-handle_username='" + item.handle_username + "' data-level3_name='" + item.level3_name + "' data-yhfx='" + item.yhfx + "' data-yhqc='" + item.yhqc + "'><td>" + item.trouble_typeid + "</td><td>" + item.equid + "</td><td>" + item.notes + "</td><td>" + item.username + "</td><td>" + handlestate + "</td><td>" + hanletroubleclear + "</td><td>" + item.address + "</td><td>" + item.uploadtime + "</td><td><a class='handle' data-id='" + item.id + "' data-location_longitude='" + item.location_longitude + "' data-location_latitude='" + item.location_latitude + "' data-address='" + item.address + "' data-notes='" + item.notes + "' data-uploadtime='" + item.uploadtime + "' data-handle_state='" + item.handle_state + "' data-level1_name='" + item.level1_name + "' data-level2_name='" + item.level2_name + "' data-level3_name='" + item.level3_name + "' data-handle_trouble_clear='" + item.handle_trouble_clear + "' data-trouble_typeid='" + item.trouble_typeid + "' data-username='" + item.username + "' data-padid='" + item.padid + "' data-handle_username='" + item.handle_username + "' data-level3_name='" + item.level3_name + "' data-yhfx='" + item.yhfx + "' data-yhqc='" + item.yhqc + "'>处理</td></tr>";
            //刷新infowindow
            // this.setContent(item);
        }.bind(this));
        domtb.append(html_trs_data);


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


        this.domObj.find('.handle').on("click", (e) => {
            if ($(e.currentTarget).data("id") == null) {
                return;
            } else {
                this.curhiddendangerid = $(e.currentTarget).data("id");
            }
            this.domObj.find('tr.active').removeClass('active');
            $(e.currentTarget).addClass('active');
            //定位
            var mapPoint = new Point($(e.currentTarget).data("location_longitude"), $(e.currentTarget).data("location_latitude"), new SpatialReference({ wkid: that.map.spatialReference.wkid }));
            this.map.infoWindow.setTitle("<div class='HiddenDangerSearch-id' id=" + $(e.currentTarget).data("id") + ">标题</div>");

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
            if ($(e.currentTarget).data("yhfx") != null) {
                if ($(e.currentTarget).data("yhfx").indexOf(',') >= 0) {
                    $(e.currentTarget).data("yhfx").split(',').forEach(
                        i => stryhfx += "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "'><image>"
                    );
                } else {
                    stryhfx = "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + $(e.currentTarget).data("yhfx") + "'><image>";
                }

            } else {
                stryhfx = "无";
            }


            var stryhqc = "";
            if ($(e.currentTarget).data("yhqc") != null) {
                if ($(e.currentTarget).data("yhqc").indexOf(',') >= 0) {
                    $(e.currentTarget).data("yhqc").split(',').forEach(
                        i => stryhqc += "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "'><image>"
                    );
                } else {
                    stryhqc = "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + $(e.currentTarget).data("yhqc") + "'><image>";
                }
            } else {
                stryhqc = "无";
            }
            var info = _.template(this.template.split('$$')[1])({
                "Caption": $(e.currentTarget).data("address"),
                "address": $(e.currentTarget).data("address"),
                "notes": $(e.currentTarget).data("notes"),
                "uploadtime": $(e.currentTarget).data("uploadtime"),
                "handle_state": handle_state,
                "Level1_name": level1_name,
                "Level2_name": level2_name,
                "Level3_name": level3_name,
                "Handle_trouble_clear": handle_trouble_clear,
                "trouble_typeid": $(e.currentTarget).data("trouble_typeid"),
                "username": $(e.currentTarget).data("username"),
                "Equid": $(e.currentTarget).data("padid"),
                "Handle_username": $(e.currentTarget).data("handle_username"),
                "yhfx": stryhfx,
                "yhqc": stryhqc,
                "content": "",
            });
            that.map.infoWindow.setContent(info);
            that.map.infoWindow.show(mapPoint, 17);

            //定位到那
            this.map.centerAndZoom(mapPoint, 17);

            $(".HiddenDangerHandle-handletrouble").off("click").on("click", function (e) {

                var id = this.curhiddendangerid;
                if (id != undefined) {
                    var userid = Cookies.get('userid');
                    var handle_notes = $('.templateOfInfo').find('.handle_notes').val();
                    var countryclass = $('.templateOfInfo').find('.HiddenDangerHandle-countryclass').val();
                    var cityclass = $('.templateOfInfo').find('.HiddenDangerHandle-countryclass').val();
                    var companyclass = $('.templateOfInfo').find('.HiddenDangerHandle-countryclass').val();
                    $.ajax({
                        headers: {
                            // 'Authorization-Token': AppX.appConfig.xjxj
                            'Token': AppX.appConfig.xjxj,
                            'departmentid': AppX.appConfig.departmentid,
                        },
                        type: "POST",
                        url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + that.config.handleHiddenDanger,
                        data: {
                            "trouble_id": id.trim(),
                            // "handle_time": ,
                            "handle_userid": userid,
                            "handle_notes": handle_notes,
                            "handle_state": 1,
                            "handle_trouble_clear": 0,
                            "level1": countryclass,
                            "level2": cityclass,
                            "level3": companyclass,
                            // f: "pjson"
                        },
                        success: that.handleHiddenDangerCallback.bind(that),
                        error: function (data) {
                            this.toast.Show("服务端ajax出错，获取数据失败!");
                        }.bind(this),
                        dataType: "json",
                    });

                } else {
                    that.toast.Show("请选择要处理的隐患！");

                }


            }.bind(this));

        });

    }


    initEvent() {
        var that = this;

        this.domObj.find('.btn-search').on("click", function () {
            this.trouble_typeid = this.domObj.find(".trouble_typeid").val();
            this.equid = this.domObj.find(".equid").val();
            this.handle_userid = this.domObj.find(".handle_userid").val();
            if (this.trouble_typeid == '' && this.equid == '' && this.handle_userid == '') {
                // name.addClass('has-error');
                // name.attr("placeholder", "不能为空！");
                // this.toast.Show("请输入查询条件！");
                // return;
            }

            this.domObj.remove();
            // this.getHiddenDanger(this.currentpage);
            this.getHiddenDanger(this.config.pagenumber, this.trouble_typeid, this.equid, this.handle_userid);
            this.domObj.find(".content").text("第" + (this.currentpage) + "页共" + this.totalpage + "页");

        }.bind(this));

        // 选中行高亮
        this.domObj.on('click', 'tbody tr', (e) => {
            if ($(e.currentTarget).data("id") == null) { return; }
            this.domObj.find('tr.active').removeClass('active');
            $(e.currentTarget).addClass('active');
            //定位
            var mapPoint = new Point($(e.currentTarget).data("location_longitude"), $(e.currentTarget).data("location_latitude"), new SpatialReference({ wkid: that.map.spatialReference.wkid }));
            //定位到那
            this.map.centerAndZoom(mapPoint, 17);


            // that.map.infoWindow.setTitle("<div class='HiddenDangerSearch-id' id=" + $(e.currentTarget).data("id") + ">标题</div>");

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
            // var info = _.template(this.template.split('$$')[1])({
            //     "Caption": $(e.currentTarget).data("address"),
            //     "address": $(e.currentTarget).data("address"),
            //     "notes": $(e.currentTarget).data("notes"),
            //     "uploadtime": $(e.currentTarget).data("uploadtime"),
            //     "handle_state": handle_state,
            //     "Level1_name": level1_name,
            //     "Level2_name": level2_name,
            //     "Level3_name": level3_name,
            //     "Handle_trouble_clear": handle_trouble_clear,
            //     "trouble_typeid": $(e.currentTarget).data("trouble_typeid"),
            //     "username": $(e.currentTarget).data("username"),
            //     "Equid": $(e.currentTarget).data("padid"),
            //     "Handle_username": $(e.currentTarget).data("handle_username"),
            //     "yhfx": stryhfx,
            //     "yhqc": stryhqc,
            //     "content": "",
            // });
            // that.map.infoWindow.setContent(info);
            // that.map.infoWindow.show(mapPoint, 17);

            // //定位到那
            // this.map.centerAndZoom(mapPoint, 17);


        });




        //动态生成书签及分页控件
        //分页控件fykj 向前、向后事件
        this.domObj.find(".pre").off("click").on("click", function () {
            if (this.currentpage - 1 > 0) {
                this.currentpage = this.currentpage - 1;
                this.getHiddenDanger(this.currentpage, this.config.pagesize, this.trouble_typeid, this.equid, this.handle_userid);

            }

        }.bind(this));
        this.domObj.find(".next").off("click").on("click", function () {
            if (this.currentpage + 1 <= this.totalpage) {
                this.currentpage = this.currentpage + 1;
                this.getHiddenDanger(this.currentpage, this.config.pagesize, this.trouble_typeid, this.equid, this.handle_userid);
            }
        }.bind(this));

        this.domObj.find(".pageturning").off("click").on("click", function () {
            var currpage = parseInt(this.domObj.find(".currpage").val());
            if (currpage <= this.totalpage && currpage >= 1) {
                this.currentpage = parseInt(this.domObj.find(".currpage").val());
                this.getHiddenDanger(this.currentpage, this.config.pagesize, this.trouble_typeid, this.equid, this.handle_userid);

            }
        }.bind(this));




    }

    getHiddenDanger(pagenumber, pagesize, trouble_typeid, equid, handle_userid) {
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
                "pageindex": pagenumber || this.config.pagenumber,
                "pagesize": this.config.pagesize,
                "trouble_typeid": trouble_typeid,
                "equid": equid,
                "handle_userid": handle_userid,
                "handle_state": 0,
                // f: "pjson"
            },
            success: this.getHiddenDangerListCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }







    handletrouble(id, countryclass, cityclass, companyclass) {

        if (id != undefined) {
            var curhandleid = $(this).data("id");
            // if (curhandleid != id) {
            //     this.toast.Show("请处理选择的隐患！");

            // }
            var userid = Cookies.get('userid');
            $.ajax({
                headers: {
                    // 'Authorization-Token': AppX.appConfig.xjxj
                    'Token': AppX.appConfig.xjxj,
                    'departmentid': AppX.appConfig.departmentid,
                },
                type: "POST",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.handleHiddenDanger,
                data: {
                    "trouble_id": id.trim(),
                    // "handle_time": ,
                    "handle_userid": userid,
                    "handle_state": 1,
                    "handle_trouble_clear": 0,
                    "level1": countryclass,
                    "level2": cityclass,
                    "level3": companyclass,


                    // f: "pjson"
                },
                success: this.handleHiddenDangerCallback.bind(this),
                error: function (data) {
                    this.toast.Show("服务端ajax出错，获取数据失败!");
                }.bind(this),
                dataType: "json",
            });

        } else {
            this.toast.Show("请选择要处理的隐患！");

        }
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
            //重新查询
            this.getHiddenDanger(this.config.pagenumber, this.config.pagesize, this.trouble_typeid, this.equid, this.handle_userid);

        }

    }


    getHiddenDangerType() {

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
            success: this.getHiddenDangerTypeListCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    getHiddenDangerTypeListCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("查询隐患类型信息出错！");
            console.log(results.message);
            return;
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
                        i => stryhfx += "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "'><image>"
                    );
                } else {
                    stryhfx = "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + p.yhfx + "'><image>";
                }

            } else {
                stryhfx = "无";
            }


            var stryhqc = "";
            if (p.yhqc != null) {
                if (p.yhqc.indexOf(',') >= 0) {
                    p.yhqc.split(',').forEach(
                        i => stryhqc += "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + i + "'><image>"
                    );
                } else {
                    stryhqc = "<image src='" + AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + p.yhqc + "'><image>";
                }
            } else {
                stryhqc = "无";
            }



            var attributes = {
                "Caption": p.address,
                "address": p.address,
                "notes": p.notes,
                "uploadtime": p.uploadtime.replace('T', '  '),
                "handle_state": handle_state,
                "Level1_name": level1_name,
                "Level2_name": level1_name,
                "Level3_name": level1_name,
                "Handle_trouble_clear": handle_trouble_clear,
                "trouble_typeid": p.trouble_typeid,
                "username": p.username,
                "Equid": p.pdaid,
                "Handle_username": p.handle_username,
                "yhfx": stryhfx,
                "yhqc": stryhqc,
                "content": "",

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
        var templateArr = this.template.split('$$');
        popupTemplate2.setContent(templateArr[1])


        // cluster layer that uses OpenLayers style clustering
        if (this.hiddendangerhandle_clusterLayer != null) {
            this.map.removeLayer(this.hiddendangerhandle_clusterLayer);
            this.hiddendangerhandle_clusterLayer.clear();
        }
        this.hiddendangerhandle_clusterLayer = new ClusterLayer({
            "basemap": this.map,
            "data": photoInfo.data,
            "distance": 10,
            "id": "hiddendangerhandle_clusters",
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
        this.hiddendangerhandle_clusterLayer.setRenderer(renderer);
        //this.clusterLayer.symbol = blue;
        this.map.addLayer(this.hiddendangerhandle_clusterLayer);
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
            $.each($(".widget-hiddendangerhandle .operation"), function (i, value) {
                if ($(value).data("id") == id) {

                    $($(".widget-hiddendangerhandle  .operation")[i]).trigger("click");

                }
            });

            $.each($(".widget-hiddendangerhandle .imglist li"), function (i, value) {
                if ($(value).data("troubleid") == id) {

                    $($(".widget-hiddendangerhandle  .imglist li")[i]).trigger("click");

                }
            });


        }.bind(this));

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





    destroy() {
        if (this.hiddendangerhandle_clusterLayer) {
            this.map.removeLayer(this.hiddendangerhandle_clusterLayer);
            this.hiddendangerhandle_clusterLayer.clear();
        }
        this.domObj.remove();
        this.afterDestroy();
    }

}