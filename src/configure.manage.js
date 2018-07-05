define(["require", "exports"], function (require, exports) {
    "use strict";
    var root = location.href.replace(/\/+$/, "");
    var AppX = {
        root: root,
        appConfig: {
            "theme": {
                "name": "FoldableTheme",
                "styles": [],
                "customStyles": []
            },
            "title": "重庆燃气管网云平台",
            "subtitle": "A configurable web application",
            "comment": {
                "geometryService": ""
            },
            "mainContainer": "#mainContainer",
            "restService": "http://192.168.1.101:6080/arcgis/rest/services",
            "apiroot": "http://192.168.1.90/webapi/api",
            "usertoken": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJVc2VySUQiOiI1RTc3NkU4MDNCNDIiLCJSQU5HRSI6IjAwMjUiLCJSQU5HRUZJRUxEIjoiTUFOQUdFREVQVF9DT0RFIiwiQ09OTkVDVFNUUiI6IkRBVEFCQVNFPUNSSlQ7TkVUTkFNRT0xOTIuMTY4LjEuMTA0L0NSSlQ7U0VSVkVSPTE5Mi4xNjguMS4xMDQ7VVNFUklEPXNkZV9jcXJxX2t5O1BBU1NXT1JEPXNkZV9jcXJxX2t5O1BPUlQ9MTUyMUA1MTUxL3RjcDtWRVJTSU9OPXNkZS5ERUZBVUxUIiwiQm9yblRpbWUiOjAsIkFwcElEIjpudWxsfQ.x_cJ-rqezOZ0plL25Bfii7DRbkVFEzjK0Pp9nVHKw8aURacWBWi_IZDHNL6ejNAC1-3buTuSkSIFes8OZHySZQ",
            "loadOnStartWidgets": [
                {
                    "name": "Loading",
                    "discription": "加载动画",
                    "url": "widgets/Loading",
                    "main": "Widget",
                    "configPath": "",
                    "templatePath": "",
                    "optional": false
                },
                {
                    "name": "EndLoading",
                    "discription": "结束加载动画",
                    "url": "widgets/EndLoading",
                    "main": "Widget",
                    "configPath": "",
                    "templatePath": "",
                    "depend": "RegionList",
                    "optional": false
                },
                {
                    "name": "Header",
                    "discription": "系统头部",
                    "url": "widgets/Header",
                    "main": "Widget",
                    "configPath": "",
                    "templatePath": "",
                    "depend": "Loading",
                    "optional": false
                },
                {
                    "name": "Toast",
                    "discription": "提示",
                    "url": "widgets/Toast",
                    "main": "Widget",
                    "configPath": "",
                    "templatePath": "",
                    "depend": "Loading",
                    "optional": false
                },
                {
                    "name": "Shouye",
                    "discription": "首页",
                    "url": "widgets/Dashboard",
                    "main": "Widget",
                    "configPath": "",
                    "templatePath": "",
                    "depend": "Loading",
                    "optional": false
                },
                {
                    "name": "RegionList",
                    "discription": "区域列表",
                    "url": "widgets/RegionList",
                    "main": "Widget",
                    "configPath": "",
                    "templatePath": "",
                    "depend": "Loading",
                    "optional": false
                },
                {
                    "name": "Toast",
                    "discription": "提示",
                    "url": "widgets/Toast",
                    "main": "Widget",
                    "configPath": "",
                    "templatePath": "",
                    "depend": "Loading",
                    "optional": false
                }
            ],
            "gisResource": {
                "xzqmap": {
                    "name": "行政区划",
                    "groupname": "行政区划服务",
                    "type": "tiled",
                    "config": [
                        {
                            "groupname": "行政区划服务",
                            "name": "重庆行政区划",
                            "url": "http://192.168.1.101:6080/arcgis/rest/services/test/QUHUA_CQ_DYNAMIC/MapServer"
                        }
                    ]
                }
            }
        },
        runtimeConfig: {
            map: null,
            Toast: null,
            dataPanel: null,
            panels: null
        },
        dojoConfig: {
            packages: [
                {
                    name: "root",
                    location: root
                },
                {
                    name: "core",
                    location: root + "/core"
                },
                {
                    name: "widgets",
                    location: root + "/widgets"
                }
            ]
        }
    };
    window["AppX"] = AppX;
    return AppX;
});
