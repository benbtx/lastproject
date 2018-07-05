// 获得当前根目录
var root = location.href.replace(/\/+$/, "");

var AppX = {
    // 当前 url 中的根目录
    //  比如 localhost:3000/WebAppFrame
    root: root,
    // 应用配置
    //  此配置为应用中 [只读] 的属性项
    //  和下面 runtimeConfig 不同的是,runtimeConfig中的内容是运行过程中逐步构建起来的
    appConfig: {
        "theme": {
            "name": "FoldableTheme",
            "styles": [],
            "customStyles": []
        },
        "title": "重庆燃气巡检系统",
        "subtitle": "A configurable web application",
        "version": "1.0.2",//主版本号.分子版本号.小版本号.日期版本号_阶段标识
        "debug": false,//标记当前程序状态，当时bug版本时从本地加载配置
        "comment": {
            "geometryService": ""
        },
        "mainContainer": "#mainContainer",
        "initextent": {},//地图初始范围 
        // "apiroot": "http://192.168.1.90/webapi/api",//后台接口
        // "apirootx": "http://192.168.1.106:8010/api",//第三方接口(营销客服等接口)
        // "apiroot": "http://192.98.151.21/webapi/api",
        "apiroot": "http://27.10.102.109:8081/webapi/api",
        // "xjapiroot": "http://192.168.2.108:8083/api",
        // "xjapiroot": "http://27.10.102.109:8088/api",
        // "xjapipicroot": "http://27.10.102.109:8088/api/",
        "xjapiroot": "http://61.186.220.221:8009/xjapi/api",//"http://27.10.102.109:8088/api",//kfxjapi
        "xjapipicroot": "http://61.186.220.221:8009/xjapi/api/",//"http://27.10.102.109:8088/api/",
        "usertoken": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJVc2VySUQiOiI0MTk4NjcyMEMxMEYiLCJVU0VSTkFNRSI6IndqIiwiUkVBTE5BTUUiOiJCU-W8gOWPkea1i-ivleeUqOaItzEiLCJXS0lEIjo0NDkwLCJSQU5HRSI6IjAwMDIiLCJSQU5HRUZJRUxEIjoiTUFOQUdFREVQVF9DT0RFIiwiQ09OTkVDVFNUUiI6IkRBVEFCQVNFPUNRUlE7TkVUTkFNRT0xOTIuMTY4LjEuMTA0L0NRUlE7U0VSVkVSPTE5Mi4xNjguMS4xMDQ7VVNFUklEPWdhc2RhdGFfY3FycTtQQVNTV09SRD1nYXNkYXRhX2NxcnE7UE9SVD0xNTIxQDUxNTEvdGNwO1ZFUlNJT049c2RlLkRFRkFVTFQiLCJCb3JuVGltZSI6MCwiQXBwSUQiOiIzNkExQTIzN0VBNzcifQ.631wJMry28U_OZCijVPXvaG8PDOf8eU4bbSgs3eePeIu39CFa1X_AIkAqqcuvgUgyWbPB49OzUQBYndS98OHKA",
        "xjxj": "58E9A0EF2ADE4809A742FD86220090EA",
        "range": "",
        "groupid": "",
        "groupname": "",
        "departmentid": "",
        "departmentname": "",
        "realname": "",
        "loadOnStartWidgets": [
            {
                "subsys": "gis",
                "name": "Loading",
                "discription": "加载动画",
                "url": "widgets/Loading",
                "main": "Widget",
                "configPath": "",
                "templatePath": "",
                "optional": false
            },
            {
                "subsys": "gis",
                "name": "EndLoading",
                "discription": "结束加载动画",
                "url": "widgets/EndLoading",
                "main": "Widget",
                "configPath": "",
                "templatePath": "",
                "depend": "MenuBar",
                "optional": false
            },
            {
                "subsys": "gis",
                "name": "Header",
                "discription": "系统头部",
                "url": "widgets/Header",
                "main": "Widget",
                "configPath": "",
                "templatePath": "",
                "depend": "EndLoading",
                "optional": false
            },
            {
                "subsys": "gis",
                "name": "BaseWidget",
                "discription": "基础地图",
                "url": "widgets/BaseMap",
                "main": "Widget",
                "configPath": "",
                "templatePath": "",
                "depend": "Loading",
                "optional": false
            },
            {
                "subsys": "gis",
                "name": "Scalebar",
                "discription": "比例尺",
                "url": "widgets/Scalebar",
                "main": "Widget",
                "configPath": "",
                "templatePath": "",
                "depend": "BaseWidget",
                "optional": false
            },
            {
                "subsys": "gis",
                "name": "Coordinate",
                "discription": "坐标",
                "url": "widgets/Coordinate",
                "main": "Widget",
                "configPath": "",
                "templatePath": "",
                "depend": "BaseWidget",
                "optional": false
            },
            {
                "subsys": "gis",
                "name": "Navigation",
                "discription": "导航",
                "url": "widgets/Navigation",
                "main": "Widget",
                "configPath": "",
                "templatePath": "",
                "depend": "BaseWidget",
                "optional": false
            },
            {
                "subsys": "gis",
                "name": "Home",
                "discription": "Home",
                "url": "widgets/Home",
                "main": "Widget",
                "configPath": "",
                "templatePath": "",
                "depend": "BaseWidget",
                "optional": false
            },
            {
                "subsys": "gis",
                "name": "OverViewMap",
                "discription": "鹰眼",
                "url": "widgets/OverViewMap",
                "main": "Widget",
                "configPath": "",
                "templatePath": "",
                "depend": "BaseWidget",
                "optional": false
            },
            {
                "subsys": "gis",
                "name": "Toast",
                "discription": "提示",
                "url": "widgets/Toast",
                "main": "Widget",
                "configPath": "",
                "templatePath": "",
                "depend": "BaseWidget",
                "optional": false
            },
            {
                "subsys": "gis",
                "name": "Popup",
                "discription": "弹出框",
                "url": "widgets/Popup",
                "main": "Widget",
                "configPath": "",
                "templatePath": "",
                "depend": "BaseWidget",
                "optional": false
            },
            {
                "subsys": "gis",
                "name": "PhotoWall",
                "discription": "照片墙",
                "url": "widgets/PhotoWall",
                "main": "Widget",
                "configPath": "",
                "templatePath": "",
                "depend": "BaseWidget",
                "optional": false
            },
            {
                "subsys": "gis",
                "name": "LoadMask",
                "discription": "加载遮罩",
                "url": "widgets/LoadMask",
                "main": "Widget",
                "configPath": "",
                "templatePath": "",
                "depend": "BaseWidget",
                "optional": false
            },
            {
                "subsys": "gis",
                "name": "Search",
                "discription": "搜索",
                "url": "widgets/Search",
                "main": "Widget",
                "configPath": "",
                "templatePath": "",
                "depend": "BaseMap",
                "optional": false
            },
            {
                "subsys": "gis",
                "name": "SideMenu",
                "discription": "侧边菜单",
                "url": "widgets/SideMenu",
                "main": "Widget",
                "configPath": "",
                "templatePath": "",
                "depend": "BaseWidget",
                "optional": false
            },
            {
                "subsys": "gis",
                "name": "DataPanel",
                "discription": "数据面板",
                "url": "widgets/DataPanel",
                "main": "Widget",
                "configPath": "",
                "templatePath": "",
                "depend": "BaseMap",
                "optional": false
            },
            {
                "subsys": "gis",
                "name": "Refresh",
                "discription": "地图刷新",
                "url": "widgets/Refresh",
                "main": "Widget",
                "configPath": "",
                "templatePath": "",
                "depend": "BaseMap",
                "optional": false
            },
            {
                "subsys": "gis",
                "name": "shuxingbiaozhu",
                "discription": "属性标注工具",
                "url": "widgets/AttributeAnnotationTool",
                "main": "Widget",
                "configPath": "",
                "templatePath": "",
                "depend": "BaseMap",
                "optional": false
            },
            {
                "subsys": "gis",
                "name": "tucengkongzhigongju",
                "discription": "图层控制工具",
                "url": "widgets/LayerListTool",
                "main": "Widget",
                "configPath": "",
                "templatePath": "",
                "depend": "BaseMap",
                "optional": false
            },
            {
                "subsys": "gis",
                "name": "MeasureToolHotkey",
                "discription": "测量快捷工具",
                "url": "widgets/MeasureToolHotkey",
                "main": "Widget",
                "configPath": "",
                "templatePath": "",
                "depend": "BaseMap",
                "optional": false
            },
            {
                "subsys": "gis",
                "name": "version",
                "discription": "系统信息",
                "url": "widgets/Version",
                "main": "Widget",
                "configPath": "",
                "templatePath": "",
                "depend": "BaseMap",
                "optional": false
            },
            {
                "subsys": "gis",
                "name": "fieldconfig",
                "discription": "字段配置",
                "url": "widgets/FieldConfig",
                "main": "Widget",
                "configPath": "",
                "templatePath": "",
                "depend": "BaseMap",
                "optional": false
            },
            {
                "subsys": "gis",
                "name": "XJMessager",
                "discription": "全局消息提示",
                "url": "widgets/XJMessager",
                "main": "Widget",
                "configPath": "",
                "templatePath": "",
                "depend": "BaseMap",
                "optional": false
            },
            {
                "subsys": "gis",
                "name": "LoadWait",
                "discription": "加载进度",
                "url": "widgets/LoadWait",
                "main": "Widget",
                "configPath": "",
                "templatePath": "",
                "depend": "BaseWidget",
                "optional": false
            },
            {
                "subsys": "gis",
                "name": "zoombar",
                "discription": "拉框缩放",
                "url": "widgets/ZoomBar",
                "main": "Widget",
                "configPath": "",
                "templatePath": "",
                "depend": "BaseMap",
                "optional": false
            },
            {
                "subsys": "gis",
                "name": "autorunadaptor",
                "discription": "模块自动运行适配器",
                "url": "widgets/AutoRunAdaptor",
                "main": "Widget",
                "configPath": "",
                "templatePath": "",
                "depend": "BaseMap",
                "optional": false
            },
            {
                "subsys": "gis",
                "name": "routeplayer",
                "discription": "巡检轨迹播放器",
                "url": "widgets/RoutePlayer",
                "main": "Widget",
                "configPath": "",
                "templatePath": "",
                "depend": "BaseMap",
                "optional": false
            }
        ],
        "menuBarWidgets": [
            {
                "id": "shouye",
                "label": "首页",
                "icon": "/images/shouye.png",
                "widget": {
                    "subsys": "gis",
                    "id": "shouye",
                    "label": "首页",
                    "widget": "widgets/Manage",
                    "main": "Widget"
                }
            },
            {
                "id": "tongyonggongju",
                "label": "通用工具",
                "icon": "/images/tongyonggongju.png",
                "data": [
                    {
                        "subsys": "gis",
                        "id": "tucengkongzhi",
                        "label": "图层控制",
                        "widget": "widgets/LayerList",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "Panel",
                        "autorun":false
                    },
                    {
                        "subsys": "gis",
                        "id": "gongzuokongjian",
                        "label": "工作空间",
                        "widget": "widgets/WorkSpace",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "Panel",
                        "autorun":false                        
                    },
                    {
                        "subsys": "gis",
                        "id": "liangcegongju",
                        "label": "量测工具",
                        "widget": "widgets/MeasureTool",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "Panel",
                        "autorun":false
                    },
                    {
                        "subsys": "gis",
                        "id": "magnifier",
                        "label": "放大镜",
                        "widget": "widgets/Magnifier",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "panel": "Panel",
                        "autorun":false
                    },
                    {
                        "subsys": "gis",
                        "id": "fenpingxianshi",
                        "label": "分屏显示",
                        "widget": "widgets/DoubleScreen",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "Panel",
                        "autorun":false
                    },
                    {
                        "subsys": "gis",
                        "id": "shuxingbiaozhu",
                        "label": "属性标注",
                        "widget": "widgets/AttributeAnnotation",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "Panel",
                        "autorun":false
                    },
                    {
                        "subsys": "gis",
                        "id": "zhuantituxianshi",
                        "label": "专题图显示",
                        "widget": "widgets/ThematicMap",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "Panel",
                        "autorun":false
                    },
                    {
                        "subsys": "gis",
                        "id": "zhitudaying",
                        "label": "制图打印",
                        "widget": "widgets/Printing",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "Panel",
                        "autorun":false
                    },
                    {
                        "subsys": "gis",
                        "id": "mobandaying",
                        "label": "模板打印",
                        "widget": "widgets/TemplatePrint",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "Panel",
                        "autorun":false
                    },
                    {
                        "subsys": "gis",
                        "id": "yiwenbiaozhi",
                        "label": "疑问标识",
                        "widget": "widgets/QuestionMark",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "Panel",
                        "autorun":false
                    }
                ]
            },
            {
                "id": "guanwangchaxun",
                "label": "管网查询",
                "icon": "/images/guanwangchaxun.png",
                "data": [
                    {
                        "subsys": "gis",
                        "id": "sqlchaxun",
                        "label": "SQL查询",
                        "widget": "widgets/SqlQuery",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "Panel",
                        "autorun":false
                    },
                    {
                        "subsys": "gis",
                        "id": "dianhaochaxun",
                        "label": "按点号查询",
                        "widget": "widgets/DianhaoQuery",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "Panel",
                        "autorun":false
                    },
                    {
                        "subsys": "gis",
                        "id": "bianhaochaxun",
                        "label": "按编号查询",
                        "widget": "widgets/BianhaoQuery",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "Panel",
                        "autorun":false
                    },
                    {
                        "subsys": "gis",
                        "id": "tufuhaochaxun",
                        "label": "按图幅号查询",
                        "widget": "widgets/TufuhaoQuery",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "Panel",
                        "autorun":false
                    },
                    {
                        "subsys": "gis",
                        "id": "adresschaxun",
                        "label": "设备地址查询",
                        "widget": "widgets/AdressQuery",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "Panel",
                        "autorun":false
                    },
                    {
                        "subsys": "gis",
                        "id": "caizhichaxun",
                        "label": "按材质查询",
                        "widget": "widgets/MaterialQuery",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "Panel",
                        "autorun":false
                    },
                    {
                        "subsys": "gis",
                        "id": "guanjingchaxun",
                        "label": "按管径查询",
                        "widget": "widgets/GuanjingQuery",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "Panel",
                        "autorun":false
                    },
                    {
                        "subsys": "gis",
                        "id": "jungongchaxun",
                        "label": "按竣工时间查询",
                        "widget": "widgets/FinishDateQuery",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "Panel",
                        "autorun":false
                    }
                ]
            },
            {
                "id": "guanwangtongji",
                "label": "管网统计",
                "icon": "/images/guanwangtongji.png",
                "data": [
                    {
                        "subsys": "gis",
                        "id": "changdutongji",
                        "label": "长度统计",
                        "widget": "widgets/LengthStatistics",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "Panel",
                        "autorun":false
                    },
                    {
                        "subsys": "gis",
                        "id": "shuliangtongji",
                        "label": "数量统计",
                        "widget": "widgets/CountStatistics",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "Panel",
                        "autorun":false
                    }
                ]
            },
            {
                "id": "guanwangfenxi",
                "label": "管网分析",
                "icon": "/images/guanwangfenxi.png",
                "data": [
                    {
                        "subsys": "gis",
                        "id": "baoguanfenxi",
                        "label": "爆管分析",
                        "widget": "widgets/BurstAnalysis",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "autorun":false
                    },
                    {
                        "subsys": "gis",
                        "id": "liantongxingfenxi",
                        "label": "连通性分析",
                        "widget": "widgets/ConnectedAnalysis",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "autorun":false
                    },
                    {
                        "subsys": "gis",
                        "id": "huanchongqufenxi",
                        "label": "缓冲区分析",
                        "widget": "widgets/BufferAnalysis",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "autorun":false
                    },
                    {
                        "subsys": "gis",
                        "id": "hengpoumianfenxi",
                        "label": "横剖面分析",
                        "widget": "widgets/AcrossSectionAnalysis",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "autorun":false
                    },
                    {
                        "subsys": "gis",
                        "id": "zongpoumianfenxi",
                        "label": "纵剖面分析",
                        "widget": "widgets/VerticalSectionAnalysis",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "autorun":false
                    },
                    {
                        "subsys": "gis",
                        "id": "tingyongqifenxi",
                        "label": "停用气分析",
                        "widget": "widgets/GasStopAnalysis",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "autorun":false
                    },
                    {
                        "subsys": "gis",
                        "id": "yujingfenxi",
                        "label": "预警分析",
                        "widget": "widgets/WarningAnalysis",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "autorun":false
                    },
                    {
                        "subsys": "gis",
                        "id": "zuiduanlujingfenxi",
                        "label": "最短路径分析",
                        "widget": "widgets/PathAnalysis",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "autorun":false
                    }
                ]
            },
            {
                "id": "scadajiankongzhongxin",
                "label": "SCADA监控中心",
                "icon": "/images/scadajiankongzhongxin.png",
                "data": [
                    {
                        "subsys": "gis",
                        "id": "scadajiankongOnly",
                        "label": "SCADA监控",
                        "widget": "widgets/SCADAwatchingOnly",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "autorun":false
                    }
                ]
            },
            {
                "id": "sanweizhanchang",
                "label": "三维站场",
                "icon": "/images/scadajiankongzhongxin.png",
                "data": [
                    {
                        "subsys": "gis",
                        "id": "hantuzhan",
                        "label": "旱土站",
                        "widget": "widgets/Hantuzhan",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    }
                ]
            },
            {
                "id": "yidongjiankongzhongxin",
                "label": "移动监控中心",
                "icon": "/images/yidongjiankongzhongxin.png",
                "data": [
                    {
                        "subsys": "gis",
                        "id": "shishijiankong",
                        "label": "移动实时监控",
                        "widget": "widgets/RealtimeMonitor",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "Panel",
                        "autorun":false
                    },
                    {
                        "subsys": "gis",
                        "id": "yidonggongdanpaifa",
                        "label": "移动工单派发",
                        "widget": "widgets/WorkSheetDelivery",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "Panel",
                        "autorun":false
                    },
                    {
                        "subsys": "gis",
                        "id": "yidonggongdanchaxun",
                        "label": "移动工单查询",
                        "widget": "widgets/WorkSheetQuery",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "Panel",
                        "autorun":false
                    },
                    {
                        "subsys": "gis",
                        "id": "yidonggshangbachaxun",
                        "label": "移动上报查询",
                        "widget": "widgets/MobileInfoUpload",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "Panel",
                        "autorun":false
                    }
                ]
            },
            {
                "id": "jiankongzhongxin",
                "label": "巡检监控中心",
                "icon": "/images/jiankongzhongxin.png",
                "data": [
                    {
                        "subsys": "xunjian",
                        "id": "ditujiankong",
                        "label": "实时监控",
                        "widget": "widgets/MapWatching",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "Panel",
                        "autorun":true
                    },
                    {
                        "subsys": "xunjian",
                        "id": "zhongduanzhuangtaijiankong",
                        "label": "终端状态监控",
                        "widget": "widgets/terminalstate",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "HalfPanel",
                        "autorun":false
                    },
                    {
                        "subsys": "xunjian",
                        "id": "xunjianlishichakan",
                        "label": "巡检历史查看",
                        "widget": "widgets/XJHistoryQuery",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "Panel",
                        "autorun":false
                    },
                    {
                        "subsys": "xunjian",
                        "id": "xunjianguijifenxi",
                        "label": "巡检轨迹分析",
                        "widget": "widgets/XJPathAnalysis",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "Panel",
                        "autorun":false
                    }, {
                        "subsys": "xunjian",
                        "id": "xiaoxitongzhiguanli",
                        "label": "消息通知管理",
                        "widget": "widgets/XJMessageManage",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "Panel",
                        "autorun":false
                    }
                ]
            },
            {
                "id": "yinhuanguanli",
                "label": "隐患管理",
                "icon": "/images/yinhuanguanli.png",
                "data": [
                    {
                        "subsys": "xunjian",
                        "id": "yinhuanchaxun",
                        "label": "隐患查询",
                        "widget": "widgets/HiddenDangerSearch",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "HalfPanel",
                        "autorun":false
                    },
                    {
                        "subsys": "xunjian",
                        "id": "yinhuandingji",
                        "label": "隐患定级",
                        "widget": "widgets/HiddenDangerGrading",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "HalfPanel",
                        "autorun":false
                    },
                    {
                        "subsys": "xunjian",
                        "id": "yinhuandingjishenhe",
                        "label": "隐患定级审核",
                        "widget": "widgets/HiddenDangerGradingAudit",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "HalfPanel",
                        "autorun":false
                    },
                    {
                        "subsys": "xunjian",
                        "id": "yinhuanchulidengji",
                        "label": "隐患处理",
                        "widget": "widgets/HiddenDangerHandleRegistration",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "HalfPanel",
                        "autorun":false
                    },
                    {
                        "subsys": "xunjian",
                        "id": "yinhuanshenhe",
                        "label": "隐患处理审核",
                        "widget": "widgets/HiddenDangerAudit",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "HalfPanel",
                        "autorun":false
                    }
                ]
            },
            {
                "id": "xunjiangongzuoguanli",
                "label": "巡检工作管理",
                "icon": "/images/xunjiangongzuoguanli.png",
                "data": [
                    {
                        "subsys": "xunjian",
                        "id": "xunjianpianquhuafen",
                        "label": "巡检片区划分",
                        "widget": "widgets/PlanRegion",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "HalfPanel",
                        "autorun":false
                    },
                    {
                        "subsys": "xunjian",
                        "id": "xunjiandianzhiding",
                        "label": "巡检点制定",
                        "widget": "widgets/PlanPoint",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "HalfPanel",
                        "autorun":false
                    },
                    {
                        "subsys": "xunjian",
                        "id": "xunjianxianluzhiding",
                        "label": "巡检线路制定",
                        "widget": "widgets/PlanPath",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "HalfPanel",
                        "autorun":false
                    },
                    {
                        "subsys": "xunjian",
                        "id": "renwuanpai",
                        "label": "巡检任务安排",
                        "widget": "widgets/MissionSchedule",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "HalfPanel",
                        "autorun":false
                    },
                    {
                        "subsys": "xunjian",
                        "id": "renwushenhe",
                        "label": "任务转移审核",
                        "widget": "widgets/MissionAudit",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "HalfPanel",
                        "autorun":false
                    },
                    {
                        "subsys": "xunjian",
                        "id": "jihuachaxun",
                        "label": "巡检任务查询",
                        "widget": "widgets/PlansSearch",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "HalfPanel",
                        "autorun":false
                    }

                ]
            },
            {
                "id": "xunjianbaobiaoguanli",
                "label": "巡检报表管理",
                "icon": "/images/xunjianbaobiaoguanli.png",
                "data": [
                    {
                        "subsys": "xunjian",
                        "id": "xunjianribao",
                        "label": "巡检日报",
                        "widget": "widgets/PlanDailyReport",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    },
                    {
                        "subsys": "xunjian",
                        "id": "xunjianyuebao",
                        "label": "巡检月报",
                        "widget": "widgets/PlanMonthlyReport",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    },
                    {
                        "subsys": "xunjian",
                        "id": "zhoubaotongji",
                        "label": "周报统计",
                        "widget": "widgets/PlanWeeklyStatistics",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    },
                    {
                        "subsys": "xunjian",
                        "id": "yuebaotongji",
                        "label": "月报统计",
                        "widget": "widgets/PlanMonthlyStatistics",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    },
                    {
                        "subsys": "xunjian",
                        "id": "nianbaotongji",
                        "label": "年报统计",
                        "widget": "widgets/PlanAnnualStatistics",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    },
                    {
                        "subsys": "xunjian",
                        "id": "paibanjihuabaobiao",
                        "label": "排班计划报表",
                        "widget": "widgets/PlanScheduleReport",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    },
                    {
                        "subsys": "xunjian",
                        "id": "yinhuanleixingfenxi",
                        "label": "隐患类型分析",
                        "widget": "widgets/HiddenDangerTypeAnalysis",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    },
                    {
                        "subsys": "xunjian",
                        "id": "yinhuanqushifenxi",
                        "label": "隐患趋势分析",
                        "widget": "widgets/HiddenDangerTrendAnalysis",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    },
                    {
                        "subsys": "xunjian",
                        "id": "yinhuanchaxunbaobiao",
                        "label": "隐患查询报表",
                        "widget": "widgets/HiddenDangerQueryReport",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    },
                    {
                        "subsys": "xunjian",
                        "id": "kaoqingjilubaobiao",
                        "label": "考勤记录报表",
                        "widget": "widgets/XJloginStatisitics",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    }
                    ,
                    {
                        "subsys": "xunjian",
                        "id": "zhongduanshiyongbaobiao",
                        "label": "终端使用报表",
                        "widget": "widgets/XJTerminalStatistics",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    },
                    {
                        "subsys": "xunjian",
                        "id": "guanxianxunjianshishitj",
                        "label": "管线巡检实时统计表",
                        "widget": "widgets/PlanTimeStatistics",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    },
                    {
                        "subsys": "xunjian",
                        "id": "shebeixunjianshishitj",
                        "label": "设备巡检实时统计表",
                        "widget": "widgets/DeviceTimeStatistics",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    }
                ]
            },
            {
                "id": "cheliangyunxingguanli",
                "label": "车辆运行管理",
                "icon": "/images/xitongguanli.png",
                "data": [
                    {
                        "subsys": "xunjian",
                        "id": "cheliangshishijiankong",
                        "label": "车辆实时监控",
                        "widget": "widgets/XJCarWatching",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "Panel",
                        "autorun":false
                    }, {
                        "subsys": "xunjian",
                        "id": "cheliangguijifenxi",
                        "label": "车辆轨迹分析",
                        "widget": "widgets/XJCarPathAnalysis",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "Panel",
                        "autorun":false
                    }, {
                        "subsys": "xunjian",
                        "id": "cheliangzhuangtaichaxun",
                        "label": "车辆状态查询",
                        "widget": "widgets/XJCarState",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "HalfPanel",
                        "autorun":false
                    }, {
                        "subsys": "xunjian",
                        "id": "cheliangbaojingchaxun",
                        "label": "车辆报警查询",
                        "widget": "widgets/VehicleWarnInfo",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    }, {
                        "subsys": "xunjian",
                        "id": "cheliangbaojingtongji",
                        "label": "车辆报警统计查询",
                        "widget": "widgets/VehicleWarnInfoStatistics",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    }, {
                        "subsys": "xunjian",
                        "id": "paichejihuaguanli",
                        "label": "派车计划管理",
                        "widget": "widgets/VehicleSendManagement",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    }, {
                        "subsys": "xunjian",
                        "id": "paichejihuachaxunbaobiao",
                        "label": "派车计划查询报表",
                        "widget": "widgets/VehicleSendInfoReport",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    }, {
                        "subsys": "xunjian",
                        "id": "guizhonglingbujiangenghuanjilu",
                        "label": "贵重零部件更换记录",
                        "widget": "widgets/VehicleImportControlRecord",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    }, {
                        "subsys": "xunjian",
                        "id": "cheliangweixiubaoyangjilu",
                        "label": "车辆维修保养记录",
                        "widget": "widgets/VehicleCareRecord",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    }, {
                        "subsys": "xunjian",
                        "id": "sijiweizhangjilu",
                        "label": "司机违章记录",
                        "widget": "widgets/VehiclePeccancyRecord",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    }, {
                        "subsys": "xunjian",
                        "id": "cheliangjiaotongshiguijilu",
                        "label": "车辆交通事故记录",
                        "widget": "widgets/VehicleTrafficRecord",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    }, {
                        "subsys": "xunjian",
                        "id": "cheliangtoubaojilu",
                        "label": "车辆投保记录",
                        "widget": "widgets/VehicleCoverRecord",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    }, {
                        "subsys": "xunjian",
                        "id": "cheliangjiayoujilu",
                        "label": "车辆加油记录",
                        "widget": "widgets/VehicleRefuelingRecordInfo",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    }, {
                        "subsys": "xunjian",
                        "id": "cheliangjiayoutongji",
                        "label": "车辆加油统计查询",
                        "widget": "widgets/VehicleRefuelingRecordStatistics",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    }, {
                        "subsys": "xunjian",
                        "id": "chelianghaoyoutongji",
                        "label": "车辆耗油统计查询",
                        "widget": "widgets/VehicleOysterSauceStatistics",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    }, {
                        "subsys": "xunjian",
                        "id": "chelianglichengtongji",
                        "label": "车辆里程统计报表",
                        "widget": "widgets/VehicleMilegeInfoStatistics",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    }, {
                        "subsys": "xunjian",
                        "id": "cheliangribiao",
                        "label": "车辆日表",
                        "widget": "widgets/VehicleDailyReport",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    }, {
                        "subsys": "xunjian",
                        "id": "cheliangyuebiao",
                        "label": "车辆月表",
                        "widget": "widgets/VehicleMouthReport",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    }, {
                        "subsys": "xunjian",
                        "id": "gongsicheliangyuebiao",
                        "label": "公司车辆月表",
                        "widget": "widgets/VehicleDepartmentMouthReport",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    }
                ]
            },
            {
                "id": "cheliangziliaoguanli",
                "label": "车辆资料管理",
                "icon": "/images/xitongguanli.png",
                "data": [
                    {
                        "subsys": "xunjian",
                        "id": "cheliangleixingguanli",
                        "label": "车辆类型管理",
                        "widget": "widgets/VehicleTypeManagement",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    },
                    {
                        "subsys": "xunjian",
                        "id": "cheliangjibenziliaoguanli",
                        "label": "车辆基本资料管理",
                        "widget": "widgets/VehicleRegistrationManagement",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    },
                    {
                        "subsys": "xunjian",
                        "id": "sijijibenziliaoguanli",
                        "label": "司机基本资料管理",
                        "widget": "widgets/VehicleDriverBaseInfoManagement",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    },
                    {
                        "subsys": "xunjian",
                        "id": "cheliangbaojingquyuguanli",
                        "label": "车辆报警区域管理",
                        "widget": "widgets/VehicleWarnAreaManagement",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "HalfPanel",
                        "autorun":false
                    }, {
                        "subsys": "xunjian",
                        "id": "cheliangjichudaimaguanli",
                        "label": "车辆基础代码管理",
                        "widget": "widgets/VehicleSysConfigManagement",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    }
                ]
            },
            {
                "id": "shebeixunchaguanli",
                "label": "设备巡查管理",
                "icon": "/images/shebeixunchaguanli.png",
                "data": [
                    {
                        "subsys": "xunjian",
                        "id": "shebeitaizhang",
                        "label": "设备台账",
                        "widget": "widgets/EquipmentLedger",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "HalfPanel",
                        "autorun":false
                    },
                    {
                        "subsys": "xunjian",
                        "id": "xjshebeitaizhang",
                        "label": "巡检设备台账",
                        "widget": "widgets/PlanEquipmentLedger",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "HalfPanel",
                        "autorun":false
                    }
                ]
            },
            {
                "id": "zhaopianshangchuanguanli",
                "label": "照片上传",
                "icon": "/images/zhaopianshangchuanguanli.png",
                "data": [
                    {
                        "subsys": "xunjian",
                        "id": "zhaopianchaxun",
                        "label": "照片查询",
                        "widget": "widgets/PhotoQuery",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "HalfPanel",
                        "autorun":false
                    },

                ]
            },
            {
                "id": "gongdijianhuguanli",
                "label": "工地监护管理",
                "icon": "/images/gongdijianhuguanli.png",
                "data": [
                    {
                        "subsys": "xunjian",
                        "id": "gongdileixingpeizhi",
                        "label": "工地类型配置",
                        "widget": "widgets/XJBuildingSiteType",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    },
                    {
                        "subsys": "xunjian",
                        "id": "gongditaizhangguanli",
                        "label": "工地台账管理",
                        "widget": "widgets/XJBuildingSiteManage",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "HalfPanel",
                        "autorun":false
                    }

                ]
            },
            {
                "id": "jiejiariguanli",
                "label": "节假日管理",
                "icon": "/images/gongdijianhuguanli.png",
                "data": [
                    {
                        "subsys": "xunjian",
                        "id": "qingjialeixingguanli",
                        "label": "请假类型管理",
                        "widget": "widgets/XJVacationType",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    },
                    {
                        "subsys": "xunjian",
                        "id": "jiejiariguanli",
                        "label": "员工节假日管理",
                        "widget": "widgets/XJWorkerVacationManagement",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    },
                    {
                        "subsys": "xunjian",
                        "id": "jieriguanli ",
                        "label": "节日管理",
                        "widget": "widgets/XJFestivalManager",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    }
                ]
            },

            {
                "id": "xitongguanli",
                "label": "系统管理",
                "icon": "/images/xitongguanli.png",
                "data": [
                    {
                        "subsys": "xunjian",
                        "id": "fenzuxinxiguanli",
                        "label": "分组信息管理",
                        "widget": "widgets/GroupsManagement",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    },
                    {
                        "subsys": "xunjian",
                        "id": "renyuanxinxiguanli",
                        "label": "巡检人员管理",
                        "widget": "widgets/UsersManagement",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    },
                    {
                        "subsys": "xunjian",
                        "id": "shebeixinxiguanli",
                        "label": "设备信息管理",
                        "widget": "widgets/DevicesManagement",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    },
                    {
                        "subsys": "xunjian",
                        "id": "yinhuanshebeiguanli",
                        "label": "巡检类型管理",
                        "widget": "widgets/HiddenDangerDeviceManagement",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    },
                    {
                        "subsys": "xunjian",
                        "id": "xunjianleixingguanli",
                        "label": "xj类型管理",
                        "widget": "widgets/XJTypeManagement",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    },
                    {
                        "subsys": "xunjian",
                        "id": "shebeileixing",
                        "label": "设备类型管理",
                        "widget": "widgets/DeviceTypeManagement",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    },
                    {
                        "subsys": "xunjian",
                        "id": "shebeiyinhuan",
                        "label": "设备隐患关系",
                        "widget": "widgets/DeviceHiddenDangerTable",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    },
                    {
                        "subsys": "xunjian",
                        "id": "yinhuanleixingguanli",
                        "label": "隐患类型管理",
                        "widget": "widgets/HiddenDangerTypeManagement",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    },
                    {
                        "subsys": "xunjian",
                        "id": "yinhuanjibiegguanli",
                        "label": "隐患级别管理",
                        "widget": "widgets/HiddenDangerLevelManagement",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    },
                    {
                        "subsys": "xunjian",
                        "id": "yinhuanfenjichuzhi",
                        "label": "隐患分级处置",
                        "widget": "widgets/HiddenDangerGradigTable",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    },
                    {
                        "subsys": "xunjian",
                        "id": "zhaopianleixingguanli",
                        "label": "照片类型管理",
                        "widget": "widgets/PhotoTypeManagement",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    },
                    {
                        "subsys": "xunjian",
                        "id": "xunjianappbanbenguanli",
                        "label": "app版本管理",
                        "widget": "widgets/AppVersionManagement",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    },
                    {
                        "subsys": "xunjian",
                        "id": "canshushezhi",
                        "label": "参数设置",
                        "widget": "widgets/ParameterSetting",
                        "main": "Widget",
                        "icon": "/images/choose.png",
                        "inPanel": true,
                        "panel": "FullPanel",
                        "autorun":false
                    }

                ]
            }
        ],
        "gisResource": {
            "raster": {
                "name": "通用影像",
                "groupname": "影像服务",
                "type": "tiled",
                "config": [
                    {
                        "groupname": "影像服务",
                        "name": "通用影像",
                        "url": "http://192.168.1.101:6080/arcgis/rest/services/cqgas/BEIJING_IMAGE/MapServer"
                    }
                ]
            },
            "terrain": {
                "name": "通用地形",
                "groupname": "地形服务",
                "type": "tiled",
                "config": [
                    {
                        "groupname": "地形服务",
                        "name": "通用地形",
                        "url": "http://192.168.1.101:6080/arcgis/rest/services/cqgas/BEIJING_DXT/MapServer"
                    }
                ]
            },
            "poi": {
                "name": "注记",
                "groupname": "POI服务",
                "type": "tiled",
                "config": [
                    {
                        "groupname": "POI服务",
                        "name": "重燃地名",
                        "url": "http://192.168.1.101:6080/arcgis/rest/services/cqgas/POI_QY_CRJANGBEI/MapServer"
                    }
                ]
            },
            "grid": {
                "name": "网格服务",
                "groupname": "网格服务",
                "type": "dynamic",
                "config": [
                    {
                        "groupname": "网格服务",
                        "name": "重庆网格",
                        "url": "http://192.168.1.101:6080/arcgis/rest/services/cqgas/BEIJING_GRID/MapServer"
                    }
                ]
            },
            "privateterrain": {
                "name": "地形",
                "groupname": "专用地形服务",
                "type": "tiled",
                "config": [
                    {
                        "groupname": "专用地形服务",
                        "name": "重燃地形",
                        "url": "http://192.168.1.101:6080/arcgis/rest/services/cqgas/DXT_QY_CRJANGBEI/MapServer"
                    }
                ]
            },
            "pipe": {
                "name": "管网地图",
                "groupname": "管线服务",
                "type": "tiled",
                "config": [
                    {
                        "groupname": "管线服务",
                        "name": "重燃江北管线",
                        "url": "http://192.168.1.101:6080/arcgis/rest/services/cqgas/PIPE_QY_CRJANGBEI/MapServer"
                    },
                    {
                        "groupname": "管线服务",
                        "name": "重燃管维公司管线",
                        "url": "http://192.168.1.101:6080/arcgis/rest/services/cqgas/PIPE_QY_CRGUANWEI/MapServer"
                    }
                ]
            },
            "zhuantitu": {
                "name": "专题图",
                "groupname": "专题图服务",
                "type": "tiled",
                "config": [
                    {
                        "groupname": "专题图服务",
                        "name": "重燃管网专题图",
                        "url": "http://192.168.1.101:6080/arcgis/rest/services/cqgas/PIPE_QY_CRJT_THEMATIC/MapServer"
                    }
                ]
            },
            "scada": {
                "name": "SCADA监控",
                "groupname": "SCADA监控服务",
                "type": "dynamic",
                "config": []
            },
            "geometry": {
                "name": "几何服务",
                "groupname": "几何服务",
                "config": [
                    {
                        "groupname": "几何服务",
                        "name": "通用几何服务",
                        "url": "http://192.168.2.104:6080/arcgis/rest/services/Utilities/Geometry/GeometryServer"
                    }
                ]
            },
            "apiburstpipe": {
                "name": "爆管分析服务",
                "groupname": "爆管服务",
                "config": [
                    {
                        "groupname": "爆管服务",
                        "name": "爆管服务",
                        "url": "http://192.168.2.104:6080/arcgis/rest/services/cqgas/PathAnalyze1/GPServer/BurstPipeAnalyze"
                    }
                ]
            },
            "apiconnectedpipe": {
                "name": "连通性分析服务",
                "groupname": "连通性服务",
                "config": [
                    {
                        "groupname": "连通性服务",
                        "name": "连通性服务",
                        "url": "http://192.168.2.104:6080/arcgis/rest/services/cqgas/PathAnalyze1/GPServer/ConnectedAnalyze"
                    }
                ]
            },
            "apipipepath": {
                "name": "路径分析服务",
                "groupname": "路径服务",
                "config": [
                    {
                        "groupname": "路径服务",
                        "name": "路径服务",
                        "url": "http://192.168.2.104:6080/arcgis/rest/services/cqgas/PathAnalyze1/GPServer/PathAnalyze"
                    }
                ]
            },
            "apiscada": {
                "name": "SCADA数据接口",
                "groupname": "SCADA数据接口",
                "config": []
            },
            "vectorprint": {
                "name": "矢量打印服务",
                "groupname": "矢量打印服务",
                "config": [
                    {
                        "groupname": "矢量打印服务",
                        "name": "矢量打印服务",
                        "url": "http://192.168.2.104:6080/arcgis/rest/services/GP_Print/GPServer/TFPrint"
                    }
                ]
            },
            "rasterprint": {
                "name": "栅格打印服务",
                "groupname": "栅格打印服务",
                "config": [
                    {
                        "groupname": "栅格打印服务",
                        "name": "栅格打印",
                        "url": "http://192.168.2.104:6080/arcgis/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task"
                    }
                ]
            },
            "printtemplatepath": {
                "name": "打印模板路径",
                "groupname": "打印模板路径",
                "config": [
                    {
                        "groupname": "打印模板路径",
                        "name": "重燃打印模板目录",
                        "url": "C:/work_cqrq/jiangbei"
                    }
                ]
            },
            "xzqmap": {
                "name": "行政区划",
                "groupname": "行政区划服务",
                "config": [
                    {
                        "groupname": "行政区划服务",
                        "name": "重庆行政区划",
                        "url": "http://192.168.1.101:6080/arcgis/rest/services/test/QUHUA_CQ_DYNAMIC/MapServer"
                    }
                ]
            },
            "fangdamap": {
                "name": "放大镜管线服务",
                "groupname": "放大镜管线服务",
                "config": [
                    {
                        "groupname": "放大镜管线服务",
                        "name": "放大镜管线服务",
                        "url": "http://192.98.151.20/cqgas/rest/services/CHONGRAN/PIPE_QY_CHONGRAN_FANGDA/MapServer"
                    }
                ]
            },
            "pipedata": {
                "name": "管线业务服务",
                "groupname": "管线业务服务",
                "config": [
                    {
                        "groupname": "管线业务服务",
                        "name": "重燃管线业务服务",
                        "url": "http://192.168.1.101:6080/arcgis/rest/services/cqgas/PIPE_QY_CRJT_THEMATIC/MapServer"
                    }
                ]
            },
            "region_map": {
                "name": "巡检片区服务",
                "groupname": "巡检片区服务",
                "config": [                   
                    {
                        "groupname": "巡检片区服务",
                        "name": "巡检片区服务",
                        "url":"http://192.98.151.20/cqgas/rest/services/CHONGRAN/XJAREA_QY_CHONGRAN/MapServer"                       
                    }
                ]
            },
            "fswmap": {
                "name": "附属物服务",
                "groupname": "附属物服务",
                "type": "dynamic",
                "filter": true,//是否进行管理单位的过滤
                "config": [
                    {
                        "groupname": "附属物服务",
                        "name": "重燃附属物",
                        "url": "http://192.98.151.20/cqgas/rest/services/CHONGRAN/FSW_QY_CHONGRAN/MapServer"
                    }
                ]
            }
        }
    },

    // 运行时配置
    //  用于存放运行时建立的全局变量、全局对象等
    runtimeConfig: {
        map: null,
        toast: null,
        popup: null,
        photoWall: null,
        SideMenu:null,
        dataPanel: null,
        loadMask: null,
        fieldConfig: null,
        unit: null,
        loadWait:null
    },

    // dojo 配置
    //  用于存放 Dojo 相关的配置项
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

// 全局配置变量
window["AppX"] = AppX;

// 作为模块暴露给其他调用者
export = AppX;
