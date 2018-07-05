import BaseWidget = require('core/BaseWidget.class');


import Map = require('esri/map');
import LayerInfo = require("esri/layers/LayerInfo");
import ArcGISDynamicMapServiceLayer = require("esri/layers/ArcGISDynamicMapServiceLayer");
import ArcGISTiledMapServiceLayer = require("esri/layers/ArcGISTiledMapServiceLayer");
import SpatialReference = require("esri/SpatialReference");
import Extent = require("esri/geometry/Extent");
import Graphic = require("esri/graphic");
import SimpleMarkerSymbol = require("esri/symbols/SimpleMarkerSymbol");
import Color = require("esri/Color");
import GraphicsLayer = require("esri/layers/GraphicsLayer");



export = WorkSheetDelivery;

class WorkSheetDelivery extends BaseWidget {
    baseClass = "WorkSheetDelivery";

    //
    map: Map;
    //
    pointLayer;
    //
    location;


    startup() {
        this.setHtml(_.template(this.template)({
            hello: this.config.hello + (/\/([a-zA-Z]+)$/g.exec(this.widgetPath)[1])
        }));


        //
        this.init();

    }

    destroy() {
        this.domObj.remove();
        this.afterDestroy();

        //
        this.map.removeLayer(this.pointLayer);
    }

    init() {
        //jquery 日期控件初始化
        $.jeDate(".WorkSheetDelivery  .finishDate",{
            format: 'YYYY-MM-DD', //日期格式  
            isinitVal: true,
            minDate: $.nowDate(0),
            startMin: $.nowDate(0)
        })
        //获取map对象
        this.map = this.AppX.runtimeConfig.map;
        //添加图层
        this.addLayer();
        //添加地图的单击实际
        this.map.on("click", this.mapClick.bind(this));
        //初始化可选的派单人员
        this.initOption();
        //
        $(".WorkSheetDelivery input").on("click", this.inputClick.bind(this));
        $(".WorkSheetDelivery .save").on("click", this.saveClick.bind(this));
        // $(".WorkSheetDelivery .send").on("click", this.sendClick.bind(this));
        //绑定清除按钮事件
        $(".WorkSheetDelivery .clear").on("click", this.clearClick.bind(this));
    }
    backToInit() {

    }
    addLayer() {
        //添加图层
        var pointLayer = new GraphicsLayer();
        pointLayer.id = "WorkSheetDelivery";
        this.map.addLayer(pointLayer);
        //保存到变量pointLayer 
        this.pointLayer = pointLayer;
    }

    //设置工单位置点的样式
    setSymbol() {

        var simpleMarkerSymbol = new SimpleMarkerSymbol(
            {
                color: new Color("#FFFFFF"),
                style: "circle",       //点样式square|diamond|circle|x|cross
                outline: {
                    color: new Color("#FF0000"),
                    width: 1
                }
            }

        );
        return simpleMarkerSymbol;
    }
    inputClick(event) {
        //去除值
        // event.currentTarget.value = "";
        //设置文本颜色
        event.currentTarget.style.color = "black";
    }
    mapClick(event) {
        this.location = event.mapPoint;
        this.pointLayer.clear();
        var symbol = this.setSymbol();
        var graphic = new Graphic(event.mapPoint, symbol);
        this.pointLayer.add(graphic);
        $(".WorkSheetDelivery .address").prop("disabled", "");
        $(".WorkSheetDelivery .address").prop("placeholder", "输入地址");
    }
    initOption() {

        $.ajax({
            type: "POST",
            headers: {
                'Authorization-Token': AppX.appConfig.usertoken
            },
            url: this.AppX.appConfig.apiroot + "/webapp/job/users",

            success: function (result) {
              

                var optionElem = "";
                for (var i = 0; i < result.result.length; i++) {
                    var userName = result.result[i].realname;
                    optionElem = optionElem + "<option value=\"" + result.result[i].userid + "\">" + userName + "</option>"
                }
                $(optionElem).appendTo($(".WorkSheetDelivery select"));
            },
            error: function () {
                console.log('获取可选派单用户出错！')
            },
            dataType: "JSON"
        });



    }
    saveClick() {
        //从cookie中获取当前用户的id
        var dispatchUserid = document.cookie.split(";")[1].split("=")[1];
        //获取接单用户id
        var data = [];
        var select = $(".WorkSheetDelivery option:selected");
        var userid = select.val();
        //获取接单用户的姓名
        var realname = select.text()
        //检查输入数据
        var inputValue = $(".WorkSheetDelivery input").val(function (index, text) {
            if (text == "" && index != 1) {
                $(".WorkSheetDelivery input:eq(" + index + ")").css("color", "red");
                return "不能为空!";


            } else {
                data.push(text);
                return text;
            }

        });
        //获取工单内容
        var textareaValue = $(".WorkSheetDelivery textarea").val();
        if (data[0] == "" || data[1] == "" || data[2] == "" || textareaValue == "") {
            this.AppX.runtimeConfig.toast.Show('工单存在未填写项！');
            return;
        }
        //
        $.ajax({
            type: "post",
            headers: {
                'Authorization-Token': AppX.appConfig.usertoken
            },
            url: this.AppX.appConfig.apiroot + "/webapp/job/set",
            data: {
                x: this.location.x.toString(),
                y: this.location.y.toString(),
                // wkid: this.location.spatialReference.wkid.toString(),
                dispatch_userid: dispatchUserid,
                userid: userid,//接单人编号
                realname: realname,//接单人真实姓名
                caption: data[0],
                plan_finish_date: data[1],
                address: data[2],
                content: textareaValue,
                // dispatch_date: date,
                // task_status: "未处理"

            },
            success: function (result) {
                this.AppX.runtimeConfig.toast.Show('发送成功');
            }.bind(this),
            error: function () {

            },
            dataType: "JSON"

        });

    }
    // sendClick() {

    // }
    clearClick() {
        $(".WorkSheetDelivery input").val("");
        $(".WorkSheetDelivery textarea").val("");
    }



}
