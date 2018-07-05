import BaseWidget = require('core/BaseWidget.class');

import Functions = require('core/Functions.module');

export = DetailPanel;

class DetailPanel extends BaseWidget {

    baseClass: string = "widget-detailpanel";
    id: string;
    title: string;
    html: string;
    width: any;
    height: any;
    data: any;
    containerWidget: JQuery

    /*** 状态变量 ***/
    isDestroyed: boolean = false;

    // 默认值
    defaultWidth = "100%";

    // panelHeightDelta: number = 240;

    constructor(detailPanelOpinions: {
        id: string,
        title: string,
        html?: string,
        data?: any,
        readyCallback?: Function,
        destoryCallback?: Function
    }) {
        super({
            widgetPath: "widgets/DetailPanel"
        });

        this.id = detailPanelOpinions.id;
        this.title = detailPanelOpinions.title;
        this.html = detailPanelOpinions.html || null;
        this.data = detailPanelOpinions.data || null;
        this.readyCallback = detailPanelOpinions.readyCallback || function () { };
        this.afterDestroyCallback = detailPanelOpinions.destoryCallback || function () { };

        if (this.html === null) {
            this.bug('DetailPanel 的初始化需指定 html 参数！');
            return;
        }

        this.baseClass += '-' + this.id;
    }

    /*** 基类模块接口 ***/
    startup() {
        /*** 初始化面板 ***/
        // 增加一个大容器来容纳 Data Panel
        this.initContainer();

        // 初始化内容
        this.setHtml(_.template(this.template)({
            baseClass: this.baseClass,
            id: this.id,
            title: this.title,
            html: this.html,
        }), '#' + this.config.panelContainerID);

        // 增加交互
        this.interactable();
        this.focus(true);

        this.ready();
    }

    // 判断是否存在容器
    initContainer() {
        this.containerWidget = $('#' + this.config.panelContainerID);
        if (this.containerWidget.length > 0) {

        } else {
            this.containerWidget = $('<div id="' + this.config.panelContainerID + '"></div>');
            $(this.AppX.appConfig.mainContainer).append(this.containerWidget);
        }
    }

    // 可交互设置
    interactable() {
        var windowObj = $(window);
        // 面板高度可调整
        this.domObj.draggable({
            handle: ".detailpanel-heading",
            axis: "y",
            opacity: 0.35,
            containment: [0, 64, 0, $(window).height() - 35],
            stop: () => {
                
            }
        });
        
        //面板放大缩小
        this.domObj.find('.fullhalfpanel').on("click", function (event) {
            var fullhalfpanelObj= this.domObj.find('.fullhalfpanel')
            var src = fullhalfpanelObj.prop("src");
            if (/zoomout/.test(src)) {
                fullhalfpanelObj.prop("src", function (index, value) {
                    return value.replace("out", "in");
                });
                this.domObj.css("top", "50px");
            } else {
                fullhalfpanelObj.prop("src", function (index, value) {
                    return value.replace("in", "out");
                });
                this.domObj.css("top", "55%");
            }

        }.bind(this));


        // 浏览器缩放可自动调整大小
        windowObj.on('resize.deatailpanle', function (event) {
            // 保持面板高度
            // this.domObj.height(windowObj.height() - this.panelHeightDelta);
            this.domObj.width($('#mainContainer').width());
            this.domObj.css({ bottom: '0px' });

        }.bind(this));

        // 关闭按钮事件
        this.domObj.find('.closehalfpanel').on('click', function () {
            this.Destroy();
            this.afterDestroyCallback();
        }.bind(this));

        // // 点击置顶事件
        // this.domObj.on('click', this.focus.bind(this));
    }

    // 移除特殊事件绑定
    removeEvents() {
        $(window).off('resize.detailpanel');
    }

    focus(autoFocus?: boolean) {
        if (this.containerWidget.children().length > 1) {
            this.containerWidget.addClass('focus');
            if (autoFocus === undefined || autoFocus !== true) {
                this.containerWidget.append(this.domObj);
            }
        } else {
            this.containerWidget.removeClass('focus');
        }
    }

    public Destroy() {
        super.destroy();
        this.removeEvents();
        this.domObj.remove();

        this.focus(true);

        this.isDestroyed = true;
        this.afterDestroy();
    }


}