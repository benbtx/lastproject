import BaseWidget = require('core/BaseWidget.class');


export =XJfloatpanel;
class XJfloatpanel extends BaseWidget {
    baseClass: string = "widget-floatpanel";
    panelTitle: string// panel的标题
    innerWidgetHtml: any;//panel里面的html
    panelHeight: string;//panel高度
    panelWidth: string;//panel宽度
    panelContainerWidget;//panel的包含框
    panelUniqClassName: string;//panel的唯一标示class
    panelReadyFun: Function;//panel初始化后回调函数
    panelDestroyFun: Function;//panel关闭后回调函数


    constructor(
        panelOptions: {
            panelTitle: string,
            panelUniqClassName: string,
            innerWidgetHtml: any,
            panelHeight?: string,
            panelWidth?: string
            panelReadyFun?: Function,
            panelDestroyFun?: Function
        }) {
        super({ widgetPath: "widgets/XJfloatpanel" });
        this.panelTitle = panelOptions.panelTitle;
        this.innerWidgetHtml = panelOptions.innerWidgetHtml;
        this.panelHeight = panelOptions.panelHeight || "300px";
        this.panelWidth = panelOptions.panelWidth || "200px";
        this.panelUniqClassName = panelOptions.panelUniqClassName;
        this.baseClass += this.panelUniqClassName;
        this.panelReadyFun = panelOptions.panelReadyFun;
        this.panelDestroyFun = panelOptions.panelDestroyFun;
    }

    startup() {
        //添加panel的包含框
        this.initContainer();
        //
        this.setHtml(_.template(this.template)({
            height: this.panelHeight,
            width: this.panelWidth,
            title: this.panelTitle,
            uniqClass: this.baseClass,
            selctorclass: this.panelUniqClassName
        }), '#' + this.config.panelContainerID);
        // 初始化floatpanel内部的html
        this.initInnerWidget(this.innerWidgetHtml);
        //绑定相关事件
        this.eventinit();
        //绑定交互事件（可拖动）
        this.interactable();
    }

    initContainer() {
        this.panelContainerWidget = $('#' + this.config.panelContainerID);
        if (this.panelContainerWidget.length > 0) {

        } else {
            this.panelContainerWidget = $('<div id="' + this.config.panelContainerID + '"></div>');
            $(this.AppX.appConfig.mainContainer).append(this.panelContainerWidget);
        }
    }


    initInnerWidget(html) {
        var type = typeof (html);
        if (type === "string") {
            this.domObj.find(".panelbody").append(html);
        } else if (type === "object") {

        }
        if (this.panelReadyFun !== undefined) {
            this.panelReadyFun();
        }

    }

    eventinit() {
        //panel关闭事件
        this.domObj.find("div.XJfloatpanel-close").on("click", function (event) {
            this.domObj.remove();
            this.panelDestroyFun();
        }.bind(this))
    }

    public close() {
        this.domObj.remove();
        this.panelDestroyFun();
    }

    interactable() {
        // 可拖动
        this.domObj.draggable({
            handle: '.panelhead',
            containment: this.AppX.appConfig.mainContainer,
            scroll: false
        });
    }








}