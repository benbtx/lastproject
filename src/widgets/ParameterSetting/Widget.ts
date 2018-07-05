import { IdentifyTaskOptions } from 'esri';

import BaseWidget = require('core/BaseWidget.class');

import Point = require('esri/geometry/Point');
import GraphicsLayer = require('esri/layers/GraphicsLayer');
import SimpleLineSymbol = require('esri/symbols/SimpleLineSymbol');
import SimpleFillSymbol = require('esri/symbols/SimpleFillSymbol');
import Graphic = require('esri/graphic');
import Color = require('esri/Color');
// import Circle = require('esri/geometry/Circle');
import SimpleMarkerSymbol = require('esri/symbols/SimpleMarkerSymbol');
import QueryTask = require('esri/tasks/QueryTask');
import Query = require("esri/tasks/query");
import IdentifyTask = require('esri/tasks/IdentifyTask');
import IdentifyParameters = require("esri/tasks/IdentifyParameters");
import SpatialReference = require("esri/SpatialReference");

import Circle = require("esri/geometry/Circle");


export = ParameterSetting;

class ParameterSetting extends BaseWidget {
    baseClass = "widget-ParameterSetting";
    pipeServicePath = "";
    map = null;
    toast = null;


    id = "";
    server_ip = "";
    server_port = "";
    upload_rate = "";
    min_distance_in_place = "";
    build_range = "";


    trail_point_color = "";
    trail_point_width = "";
    trail_line_color = "";
    trail_line_width = "";

    section_point_num = "";
    refresh_internal = "";

    car_refresh_internal = "";
    car_min_distance_in_place = "";
    refresh_workerpath_color = "";//人巡轨迹颜色
    refresh_carpath_color = '';//车巡轨迹颜色


    startup() {
        this.domObj = $('.' + this.baseClass);
        //配置当前模块变量

        this.map = this.AppX.runtimeConfig.map;
        this.toast = this.AppX.runtimeConfig.toast;
        this.setHtml(this.template);
        //定义地图鼠标样式
        this.onPanelInit();
        this.initEvent();
    }


    onPanelInit() {
        this.getSysSetting();

    }
    initEvent() {
        var that = this;
        //保存app参数事件
        this.domObj.find('.btn_saveapp').off("click").on("click", function () {
            this.id;
            this.server_ip = this.domObj.find(".server_ip").val();
            this.server_port = this.domObj.find(".server_port").val()
            this.upload_rate = this.domObj.find(".upload_rate").val();
            this.min_distance_in_place = this.domObj.find(".min_distance_in_place").val();
            this.build_range = this.domObj.find(".build_range").val();



            this.updateSysSetting(this.id, 0);

        }.bind(this));
        //保存bs参数事件
        this.domObj.find('.btn_savebs').off("click").on("click", function () {
            this.id;
            this.trail_point_color = this.domObj.find(".trail_point_color").val();
            this.trail_point_width = this.domObj.find(".trail_point_width").val()
            this.trail_line_color = this.domObj.find(".trail_line_color").val();
            this.trail_line_width = this.domObj.find(".trail_line_width").val();
            this.section_point_num = this.domObj.find(".section_point_num").val();
            this.refresh_internal = this.domObj.find(".refresh_internal").val();
            this.refresh_workerpath_color = this.domObj.find(".workerPathColor").val();
            this.refresh_carpath_color = this.domObj.find(".carPathColor").val();

            this.updateSysSetting(this.id, 1);

        }.bind(this));
        //保存app参车辆数事件
        this.domObj.find('.btn_savevehicle').off("click").on("click", function () {


            this.car_refresh_internal = this.domObj.find(".car_refresh_internal").val();
            this.car_min_distance_in_place = this.domObj.find(".car_min_distance_in_place").val();


            this.updateSysSetting(this.id, 2);

        }.bind(this));
    }


    getSysSetting() {

        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getSysSetting,
            data: {

                // f: "pjson"
            },
            success: this.getSysSettingListCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    getSysSettingListCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("查询设备信息出错！");
            console.log(results.message);
            return;
        }

        this.id = results.result[0].id;
        this.domObj.find(".server_ip").val(results.result[0].server_ip);
        this.domObj.find(".server_port").val(results.result[0].server_port);
        this.domObj.find(".upload_rate").val(results.result[0].upload_rate);
        this.domObj.find(".min_distance_in_place").val(results.result[0].min_distance_in_place);

        this.domObj.find(".build_range").val(results.result[0].build_range);

        this.domObj.find(".section_point_num").val(results.result[0].section_point_num);
        this.domObj.find(".refresh_internal").val(results.result[0].refresh_internal);
        this.domObj.find(".trail_line_color").val(results.result[0].trail_line_color);
        this.domObj.find(".trail_line_width").val(results.result[0].trail_line_width);
        this.domObj.find(".trail_point_color").val(results.result[0].trail_point_color);
        this.domObj.find(".trail_point_width").val(results.result[0].trail_point_width);
        this.domObj.find(".workerPathColor").val(results.result[0].trail_person_color);
        this.domObj.find(".carPathColor").val(results.result[0].trail_car_color);

        this.domObj.find(".car_refresh_internal").val(results.result[0].car_refresh_internal);
        this.domObj.find(".car_min_distance_in_place").val(results.result[0].car_min_distance_in_place);


    }

    updateSysSetting(id, type) {
        if (type == 0) {
            $.ajax({
                headers: {
                    // 'Authorization-Token': AppX.appConfig.xjxj
                    'Token': AppX.appConfig.xjxj,
                    'departmentid': AppX.appConfig.departmentid,
                },
                type: "POST",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.updateSysSetting,
                data: {
                    "id": id,
                    "server_ip": this.server_ip,
                    "server_port": this.server_port,
                    "upload_rate": this.upload_rate,
                    "min_distance_in_place": this.min_distance_in_place,

                    "build_range": this.build_range,
                    // "trail_point_color": this.trail_point_color,
                    // "trail_point_width": this.trail_point_width,
                    // "trail_line_color": this.trail_line_color,
                    // "trail_line_width": this.trail_line_width,
                    // "section_point_num": this.section_point_num,
                    // "refresh_internal": this.refresh_internal,

                    // f: "pjson"
                },
                success: this.updateSysSettingListCallback.bind(this),
                error: function (data) {
                    this.toast.Show("服务端ajax出错，获取数据失败!");
                }.bind(this),
                dataType: "json",
            });
        } else if (type == 1) {
            $.ajax({
                headers: {
                    // 'Authorization-Token': AppX.appConfig.xjxj
                    'Token': AppX.appConfig.xjxj,
                    'departmentid': AppX.appConfig.departmentid,
                },
                type: "POST",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.updateSysSetting,
                data: {
                    "id": id,
                    // "server_ip": this.server_ip,
                    // "server_port": this.server_port,
                    // "upload_rate": this.upload_rate,
                    // "min_distance_in_place": this.min_distance_in_place,


                    "trail_point_color": this.trail_point_color,
                    "trail_point_width": this.trail_point_width,
                    "trail_line_color": this.trail_line_color,
                    "trail_line_width": this.trail_line_width,
                    "section_point_num": this.section_point_num,
                    "refresh_internal": this.refresh_internal,
                    "trail_person_color": this.refresh_workerpath_color,
                    "trail_car_color": this.refresh_carpath_color,

                    // f: "pjson"
                },
                success: this.updateSysSettingListCallback.bind(this),
                error: function (data) {
                    this.toast.Show("服务端ajax出错，获取数据失败!");
                }.bind(this),
                dataType: "json",
            });
        } else if (type == 2) {
            $.ajax({
                headers: {
                    // 'Authorization-Token': AppX.appConfig.xjxj
                    'Token': AppX.appConfig.xjxj,
                    'departmentid': AppX.appConfig.departmentid,
                },
                type: "POST",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.updateSysSetting,
                data: {
                    "id": id,

                    "car_refresh_internal": this.car_refresh_internal,
                    "car_min_distance_in_place": this.car_min_distance_in_place,




                    // f: "pjson"
                },
                success: this.updateSysSettingListCallback.bind(this),
                error: function (data) {
                    this.toast.Show("服务端ajax出错，获取数据失败!");
                }.bind(this),
                dataType: "json",
            });
        }


    }

    updateSysSettingListCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("保存信息出错！");
            console.log(results.message);
            return;
        }

        that.toast.Show("保存信息成功！");





    }




    destroy() {
        //恢复地图默认鼠标样式


        this.domObj.remove();
        this.afterDestroy();
    }
}