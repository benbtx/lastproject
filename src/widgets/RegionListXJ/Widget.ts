import BaseWidget = require('core/BaseWidget.class');
import Functions = require('core/Functions.module');
import Map = require('esri/map');
import Graphic = require('esri/graphic');
import FeatureLayer = require('esri/layers/FeatureLayer');
import SimpleFillSymbol = require('esri/symbols/SimpleFillSymbol');
import SimpleLineSymbol = require('esri/symbols/SimpleLineSymbol');
import Color = require('esri/Color');
import GetData = require('./GetData');

export = RegionList;

declare var Cookies

class RegionList extends BaseWidget {
    baseClass = "widgets-region_list";
    debug = false;
    toast: any;
    private infortemplate = "<div class=\"common-panel\"><h3 class=\"common-panel-title\"><%=name%></h3><ul class=\"panel-1\"><li class=\"panel-list\"> <span class=\"list-title\"><%=valuetype%></span> <span class=\"list-intro\"><%=value%></span> </li></ul><div class=\"clearfix\"></div></div>";
    highlightSymbol = new SimpleFillSymbol(
        SimpleFillSymbol.STYLE_SOLID,
        new SimpleLineSymbol(
            SimpleLineSymbol.STYLE_SOLID,
            new Color([255, 0, 255]), 2
        ),
        new Color([0, 0, 0, 0])
    );
    featureLayer = null;
    // 此函数在系统初始化完成后会自动调用
    //  所有业务逻辑从此函数开始
    startup() {
        this.toast = this.AppX.runtimeConfig.toast;

        var url = null;
        try {
            url = this.AppX.appConfig.xjapiroot + this.config.regionListAPI;
        } catch (e) {
            this.toast.Show('配置文件获取失败');
            return;
        }
        var data = null;
        if (this.AppX.appConfig.groupid != null && this.AppX.appConfig.groupid.length > 0)//分组用户
            data = {
                deptid: this.AppX.appConfig.groupid,
            }
        else if (this.AppX.appConfig.range.split(";")[0] != "00") {//非集团用户
            data = {
                companyid: this.AppX.appConfig.departmentid
            }
        }
        GetData.getList(url, data, (result) => {
            if (result.result.items)
                this.setHtml(
                    _.template(this.template)({ data: result.result }),
                    '.body');
            this.bindEvents();
        })
        // this.setHtml(
        //     _.template(this.template)({ data: this.config.sampledata.userlist.result }),
        //     '.body');
        this.bindEvents();
        //对分组用户调整界面（隐藏"查看"按钮）
        if (this.AppX.appConfig.groupid != null && this.AppX.appConfig.groupid.length > 0) {
            this.domObj.find(".widgets-region_table_col-4").hide();

        }
    }

    bindEvents() {
        // this.domObj.find(".accordion").accordion({
        //     heightStyle: "content",
        //     animate: 150,
        //     icons: {
        //         header: "widgets-region_list-arrow_icon glyphicon " +
        //         "glyphicon-chevron-left",
        //         activeHeader: "widgets-region_list-arrow_icon glyphicon " +
        //         "glyphicon-chevron-down"
        //     }
        // });

        this.domObj.on('dblclick', '.widgets-region_table_row', (e) => {
            var departmentid = this.AppX.appConfig.departmentid;
            if (this.AppX.appConfig.range.split(";")[0] == "00" && e.currentTarget.attributes["data-target"]) {//集团用户
                var targetName = $(e.currentTarget).find('td:first-child').text().trim();
                departmentid = e.currentTarget.attributes["data-target"].value;
                var url = this.AppX.appConfig.apiroot + this.config.xzqapi;
                $.ajax({//从后台请求所选公司的行政区代码
                    headers: {
                        'Authorization-Token': AppX.appConfig.usertoken
                    },
                    data: { departmentid: departmentid },
                    type: 'post',
                    url: url,
                    success: function (data) {
                        if (data.code != 10000) {
                            AppX.runtimeConfig.toast.Show("查询行政区失败!");
                            return;
                        }
                        else {
                            var xzqCode = data.result;
                            Cookies.set('region', xzqCode);
                            this.toast.Show('即将跳转到' + targetName);
                            setTimeout(function () {
                                location.reload(false);
                            }, 1000);
                        }
                    }.bind(this)
                });
                // if (xzqCode)
                //     Cookies.set('region', xzqCode);
                // else
                //     Cookies.set('region', '*');
                // this.toast.Show('即将跳转到' + targetName);
                // setTimeout(function () {
                //     location.reload(false);
                // }, 1000);
            }
        })
            .on('mouseenter', '.widgets-region_table_row', function (e) {
                //在地图中高亮被选中区县
                var selectedValue = e.currentTarget.attributes["data-target"].value;
                if (this.AppX.runtimeConfig.map !== undefined) {
                    //查找featurelayer
                    if (this.featureLayer == null)
                        this.featureLayer = this.findFeatureLayer(this.AppX.runtimeConfig.map);
                    if (this.featureLayer != null) {
                        this.searchGraphicInMap(this.AppX.runtimeConfig.map, this.featureLayer, selectedValue);
                    }
                }
            }.bind(this))
            .on('mouseleave', '.widgets-region_table_row', function (e) {
                //移除地图高亮
                var selectedValue = e.currentTarget.attributes["data-target"].value;
                if (this.AppX.runtimeConfig.map !== undefined) {
                    this.AppX.runtimeConfig.map.graphics.clear();
                    this.AppX.runtimeConfig.map.infoWindow.hide();
                }
            }.bind(this));
    }
    searchGraphicInMap(map, featureLayer, whereCause) {
        if (featureLayer != null && featureLayer.graphics.length > 0) {
            var selectedindex = _.findIndex(featureLayer.graphics, function (o: any) { return o.attributes["ADMINCODE"] == whereCause });
            if (selectedindex != -1) {
                var feature: any = featureLayer.graphics[selectedindex];
                var centerP = feature.geometry.getExtent().getCenter();
                var mixedTemplate = _.template(this.infortemplate)({
                    name: feature.attributes["NAME"],
                    valuetype: "管线长度(公里):",
                    value: feature.attributes["value"]
                });
                map.infoWindow.setContent(mixedTemplate);
                map.infoWindow.resize(180, 77);
                var highlightGraphic = new Graphic(feature.geometry, this.highlightSymbol);
                map.graphics.add(highlightGraphic);
                map.infoWindow.show(centerP);
            }
        }
    }
    /**
    * (方法说明)查找featurlayer
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    findFeatureLayer(map: Map) {
        var url = this.AppX.appConfig.gisResource.xzqmap.config[0].url + '/1'
        for (var i = 0; i < map.graphicsLayerIds.length; i++) {
            var layer = map.getLayer(map.graphicsLayerIds[i]);
            if (layer.url && layer.url == url)
                return layer;
        }
        return null;
    }

    destroy() {

    }
}