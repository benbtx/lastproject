import BaseWidget = require('core/BaseWidget.class');


import Map = require('esri/map');
import LayerInfo = require("esri/layers/LayerInfo");
import ArcGISDynamicMapServiceLayer = require("esri/layers/ArcGISDynamicMapServiceLayer");
import ArcGISTiledMapServiceLayer = require("esri/layers/ArcGISTiledMapServiceLayer");
import SpatialReference = require("esri/SpatialReference");
import Extent = require("esri/geometry/Extent");





export = ThematicMap;

class ThematicMap extends BaseWidget {
    baseClass = "ThematicMap";

    //array contain all the ThematicMap name
    thematicMapName = [];
    //the thematicMap object which contain all the ThematicMap
    thematicMap
    //save the selected ThematicMap name
    selectedThematicMap: string = null;
    //save the pipe map of basemap
    layerHide;








    startup() {
        this.setHtml(_.template(this.template)({
            hello: this.config.hello + (/\/([a-zA-Z]+)$/g.exec(this.widgetPath)[1])
        }));

        this.thematicMapInit();
    }

    destroy() {
        this.domObj.remove();
        this.afterDestroy();

        //remove the ThematicMap
        var thematicMap = this.AppX.runtimeConfig.map.getLayer("thematicMap");
        if (thematicMap != undefined) {
            this.AppX.runtimeConfig.map.removeLayer(this.AppX.runtimeConfig.map.getLayer("thematicMap"));
        }
        //set the basemap visible
        this.layerHide.setVisibility(true);
    }

    //初始化专题图显示相关内容
    thematicMapInit() {
        //下拉列表添加可选的专题图选项
        this.addSelectThematicMapOption();
        //the selected ThematicMap change event
        $("select.thematicMap-layerName").on("change", this.thematicMapOptionChange.bind(this));
        //the  show ThematicMap button click event
        $("button.ThematicMap-showbtn").bind("click", this.showThematicMap.bind(this));
        ///get the layer id of pipe layer which you should hide 

        //get the layerIds of the map object which contain all the exist layer id. 
        var layerIdExist = this.AppX.runtimeConfig.map.layerIds;
        for (var i = 0; i < layerIdExist.length; i++) {

            var layerExistUrl = this.AppX.runtimeConfig.map.getLayer(layerIdExist[i]).url;
            if (/PIPE/.test(layerExistUrl)) {
                this.layerHide = this.AppX.runtimeConfig.map.getLayer(layerIdExist[i]);


            }
        }

    }
    addSelectThematicMapOption() {
        //get the thematicMap object which contain all the ThematicMap
        this.thematicMap = this.AppX.appConfig.gisResource.zhuantitu;
        //put all the name of ThematicMap into thematicMapName array
        for (var i = 0; i < this.thematicMap.config.length; i++) {
            this.thematicMapName.push(this.thematicMap.config[i].name);
        }

        // add the option html object
        for (var j = 0; j < this.thematicMapName.length; j++) {
            var option = " <option>" + this.thematicMapName[j] + "</option>"
            $(option).appendTo($("select.thematicMap-layerName"));
        }
        //init the selectedThematicMap value
        this.selectedThematicMap = this.thematicMapName[0];
    }
    thematicMapOptionChange(event) {
        this.selectedThematicMap = $("select.thematicMap-layerName").find("option:selected").text()
    }

    showThematicMap(event) {

        if (this.layerHide.visible == true) {
            this.layerHide.setVisibility(false);
        }
        //get the thematicMap ,if  exist remove it which means you have to remove the previous  thematicMap when add a new one
        var thematicMap = this.AppX.runtimeConfig.map.getLayer("thematicMap");
        if (thematicMap != undefined) {
            this.AppX.runtimeConfig.map.removeLayer(this.AppX.runtimeConfig.map.getLayer("thematicMap"));
        }


        //get the url of  the new ThematicMap and create a ArcGISTiledMapServiceLayer object
        var ThematicMapUrl;
        for (var i = 0; i < this.thematicMap.config.length; i++) {
            if (this.thematicMap.config[i].name == this.selectedThematicMap) {
                ThematicMapUrl = this.thematicMap.config[i].url;
            }
        }
        var thematicMapLayer = new ArcGISTiledMapServiceLayer(ThematicMapUrl);
        thematicMapLayer.id = "thematicMap";
        //add the new ThematicMap
        this.AppX.runtimeConfig.map.addLayer(thematicMapLayer);
    }


}
