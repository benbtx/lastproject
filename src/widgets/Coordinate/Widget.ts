import BaseWidget = require('core/BaseWidget.class');
import Map = require("esri/map");

declare var proj4;
export = Coordinate;


class Coordinate extends BaseWidget {
    baseClass = "widget-coordinate";
    map: Map;
    startup() {

        this.setHtml(this.template);
        this.ready();
        this.initCoordinate();
    }

    initCoordinate() {

        this.map = this.AppX.runtimeConfig.map;

        this.map.on("mouse-move", this.MouseMove.bind(this));
    }

    setScale(text) {

    }
    MouseMove(evt) {
        if (evt.mapPoint.x == undefined)
            return;
        $(".coordinate span.Geodetic").text(evt.mapPoint.x.toFixed(5) + "," + evt.mapPoint.y.toFixed(5));

        var wkid = 4510 + parseInt(((evt.mapPoint.x - 1.5) / 3).toString());
        var daihao = wkid - 4509;
        var CentralMeridian = 3 * (wkid - 4509);//中央经度
        proj4.defs('EPSG:4490', 'GEOGCS["GCS_China_Geodetic_Coordinate_System_2000",DATUM["D_China_2000",SPHEROID["CGCS2000",6378137.0,298.257222101]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433],AUTHORITY["EPSG",4490]]');//经纬度坐标
        proj4.defs('EPSG:4544', 'PROJCS["CGCS2000_3_Degree_GK_CM_105E",GEOGCS["GCS_China_Geodetic_Coordinate_System_2000",DATUM["D_China_2000",SPHEROID["CGCS2000",6378137.0,298.257222101]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",500000.0],PARAMETER["False_Northing",0.0],PARAMETER["Central_Meridian",' + CentralMeridian + '],PARAMETER["Scale_Factor",1.0],PARAMETER["Latitude_Of_Origin",0.0],UNIT["Meter",1.0],AUTHORITY["EPSG",4544]]');//投影坐标
        // proj4.defs('EPSG:4544','PROJCS["CGCS2000_3_Degree_GK_CM_105E",GEOGCS["GCS_China_Geodetic_Coordinate_System_2000",DATUM["D_China_2000",SPHEROID["CGCS2000",6378137.0,298.257222101]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",500000.0],PARAMETER["False_Northing",0.0],PARAMETER["Central_Meridian",105.0],PARAMETER["Scale_Factor",1.0],PARAMETER["Latitude_Of_Origin",0.0],UNIT["Meter",1.0],AUTHORITY["EPSG",4544]]')
        var result = proj4('EPSG:4490', 'EPSG:4544', [evt.mapPoint.x, evt.mapPoint.y]);
        result[0] = daihao + "" + result[0].toFixed(2);
        $('span.project').text(result[0] + "," + result[1].toFixed(2))
    }

}