import BaseWidget = require('core/BaseWidget.class');

import Functions = require('core/Functions.module');

export = BlankPanel;

class BlankPanel extends BaseWidget {

    baseClass: string = "widget-blankpanel";
    id: string;
    title: string;
    html: string;
    width: number;
    height: number;
    containerWidget: JQuery

    /*** 状态变量 ***/
    isDestroyed: boolean = false;

    // 默认值
    defaultWidth = 700;

    panelHeightDelta: number = 240;

    constructor(blankPanelOpinions: {
        id: string,
        title: string,
        html?: string,
        width?: number,
        height?: number,
        readyCallback?: Function
    }) {
        super({
            widgetPath: "widgets/BlankPanel"
        });

        this.id = blankPanelOpinions.id;
        this.title = blankPanelOpinions.title;
        this.html = blankPanelOpinions.html || null;
        this.width = blankPanelOpinions.width || this.defaultWidth;
        this.height = blankPanelOpinions.height || null;
        this.readyCallback = blankPanelOpinions.readyCallback || function () { };

        if (this.html === null) {
            this.bug('DataPanel 的初始化需指定 html 参数！');
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
            width: this.width,
            height: this.height || $(window).height() - this.panelHeightDelta
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
        // 可拖动
        this.domObj.draggable({
            handle: '.panel-heading',
            containment: this.AppX.appConfig.mainContainer,
            scroll: false,
            start: function () {
                this.focus();
            }.bind(this)
        });
        // 可折叠
        this.domObj.delegate('.fold', 'click', function (event) {
            if (this.domObj.data('closed') === false) {
                this.domObj.find('.panel-body').css('display', 'none');
                this.domObj.find('.fold span').removeClass('glyphicon-chevron-up').addClass('glyphicon-chevron-down');
                this.domObj.height('33px');
                this.domObj.data('closed', true);
            } else {
                this.domObj.find('.panel-body').css('display', 'block');
                this.domObj.find('.fold span').removeClass('glyphicon-chevron-down').addClass('glyphicon-chevron-up');
                this.domObj.height(this.height || windowObj.height() - this.panelHeightDelta);
                this.domObj.data('closed', false);
            }
        }.bind(this));

        // 浏览器缩放可自动调整大小
        windowObj.on('resize.blankpanle', function (event) {
            // 保持面板高度
            if (this.height === null) {
                this.domObj.height(windowObj.height() - this.panelHeightDelta);
            }

            // 如果面板移出界面,将其拉回
            if (this.domObj.offset().left + this.domObj.width() > windowObj.width()) {
                this.domObj.css({
                    top: "60px",
                    left: windowObj.width() - this.domObj.width() - 20 + "px"
                });
            }
        }.bind(this));

        // 关闭按钮事件
        this.domObj.find('.close').on('click', function () {
            this.Destroy();
        }.bind(this));

        // 点击置顶事件
        this.domObj.on('click', this.focus.bind(this));
    }

    // 移除特殊事件绑定
    removeEvents() {
        $(window).off('resize.blankpanel');
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
    /**
    * (方法说明)重新加载新的面板内容，避免切换面板内容时的闪烁
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    public Reload(blankPanelOpinions: {
        id: string,
        title: string,
        html?: string,
        width?: number,
        height?: number,
        readyCallback?: Function
    }) {
        this.id = blankPanelOpinions.id;
        this.title = blankPanelOpinions.title;
        this.html = blankPanelOpinions.html || null;
        this.width = blankPanelOpinions.width || this.defaultWidth;
        this.height = blankPanelOpinions.height || null;
        this.readyCallback = blankPanelOpinions.readyCallback || function () { };
        
        if (this.html === null) {
            this.bug('DataPanel 的初始化需指定 html 参数！');
            return;
        }
        // 初始化内容
        this.domObj.find('.title').text(this.title);
        this.domObj.find('.panel-body').html(this.html);
        this.focus(true);
        this.ready();        
    }
}