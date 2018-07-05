/*** ArcGIS ***/
import Query = require("esri/tasks/query");
import QueryTask = require("esri/tasks/QueryTask");
import GraphicsLayer = require("esri/layers/GraphicsLayer");
import SimpleLineSymbol = require('esri/symbols/SimpleLineSymbol');
import SimpleMarkerSymbol = require("esri/symbols/SimpleMarkerSymbol");
import Extent = require("esri/geometry/Extent");
import SimpleFillSymbol = require('esri/symbols/SimpleFillSymbol');
import Graphic = require('esri/graphic');
import Color = require('esri/Color');

/*** 配置常量 ***/
var map = AppX.runtimeConfig.map;
// 所使用的图层 ID
const graphicsLayerID = "DataPanelLocateLayer";
// 导航到指定元素时的level
const zoomLevel = 9;
const zoomscale = 2000;
// 定义点标志
const simpleMarkerSymbol = new SimpleMarkerSymbol({
    "color": [, 255, 255],
    "size": 12,
    "xoffset": 0,
    "yoffset": 0,
    "style": "circle",
    "outline": {
        "color": [255, 0, 255],
        "width": 2,
        "style": "solid"
    }
});
// 定义线标志
const simpleLineSymbol = new SimpleLineSymbol({
    "color": [0, 255, 255],
    "style": "solid",
    "width": 3
});

const simpleFillSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
    new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0, 255, 255]), 3),
    new Color([0, 0, 0, 0.1])
);

// 根据提供的 ObjectID 来绘制元素
export function Show(objectID: number, service: string, appendMode = false) {
    if (appendMode !== true) {
        Clean();
    }

    // 根据ObjectID查询元素
    QueryElement(objectID, service, DarwGraphic);
}

// 清空绘制的所有元素
export function Clean() {
    // 清空图层
    var layer = map.getLayer(graphicsLayerID)
    if (layer !== undefined) {
        layer.clear();
    }
}

// 销毁函数
export function Destroy() {
    // 移除图层
    var layer = map.getLayer(graphicsLayerID);
    if (layer) {
        map.removeLayer(layer);
    }
}

// 根据 ObjectID 查询元素
function QueryElement(objectID: number, service: string, callback: Function) {

    var query = new Query();
    var queryTask = new QueryTask(service);
    query.where = "OBJECTID = " + objectID;
    query.returnGeometry = true;

    queryTask.execute(query, callback);
}

// 绘制元素
function DarwGraphic(data) {
    if (!data) {
        return;
    }

    // 定义标志
    var symbol = null;
    if (/(P|p)oint/.test(data.geometryType)) {
        // 为点
        symbol = simpleMarkerSymbol;
    } else if (/(L|l)ine/.test(data.geometryType)) {
        // 为线
        symbol = simpleLineSymbol;
    } else if (/(P|p)olygon/.test(data.geometryType)) {
        // 为面
        symbol = simpleFillSymbol;//new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
        //     new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
        //         new Color([255, 0, 0]), 2), new Color([255, 255, 0, 0.25])
        // );
    } else {
        console.error("DataPanel Locate 不支持此类型数据：", data.geometryType);
        return;
    }

    var feature = data.features[0];
    if (feature == undefined)
        return;
    feature.symbol = symbol;

    // 定义图层
    var layer = map.getLayer(graphicsLayerID)
    if (layer === undefined) {
        // 不存在图层
        layer = new GraphicsLayer({
            id: graphicsLayerID
        });

        map.addLayer(layer);
    }

    // 添加到图层
    layer.add(feature);
    // 定位
    if (feature.geometry.type == "point") {
        PointAtMap(feature.geometry);
    }
    else {
        var extent = feature.geometry.getExtent();
        var width = extent.xmax - extent.xmin;
        var height = extent.ymax - extent.ymin;
        var xmin = extent.xmin - width / 2;
        var xmax = extent.xmax + width / 2;
        var ymin = extent.ymin - height / 2;
        var ymax = extent.ymax + height / 2;
        var resultExtent = new Extent(xmin, ymin, xmax, ymax, map.spatialReference);
        map.setExtent(resultExtent);
        //PointAtMap(feature.geometry.getExtent().getCenter());
    }
}

// 定位到指定 Extent
function PointAtMap(point) {
    // 设置到指定缩放级别
    map.setScale(zoomscale);
    // 设置到指定的显示范围
    map.centerAt(point);
}