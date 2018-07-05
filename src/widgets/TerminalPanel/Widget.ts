import BaseWidget = require('core/BaseWidget.class');

import Functions = require('core/Functions.module');

export =TerminalPanel;

class TerminalPanel extends BaseWidget {

    baseClass: string = "widget-panel";
    panelTitle: string;
    panelUniqClassName: string;
    innerWidgetPath: string;
    innerWidgetMain: string;
    widgetObj: any;
    panelContainerWidget: JQuery;
    mainContainerObj: JQuery;
    /** 状态变量 */
    isInnerWidgetLoaded = false;
    /*** 配置型量 ***/
    panelHeightDelta: number = 78; // 37
    resizeMinHight: number = 80; // 39
    top: number = 56; //15
    right: number = 50;
    /** dom 元素 */
    loadingObj: JQuery;

    constructor(settings, panelOpinions: {
        panelTitle: string,
        panelUniqClassName: string,
        innerWidgetPath: string,
        innerWidgetMain?: string
    }) {
        super(settings); //调用 BaseWidget.class=>(widgetPath:"widgets/TerminalPanel")

        this.panelTitle = panelOpinions.panelTitle;
        this.panelUniqClassName = panelOpinions.panelUniqClassName;
        this.baseClass += '-' + this.panelUniqClassName;
        this.innerWidgetPath = panelOpinions.innerWidgetPath;
        this.innerWidgetMain = panelOpinions.innerWidgetMain || '/Widget';
    }

    /*** 基类模块接口 ***/
    startup() {
        /*** 初始化面板 ***/
        // 增加一个大容器来容纳panel
        this.initContainer();

        this.setHtml(_.template(this.template)({
            height: this.mainContainerObj.height() ,
            title: this.panelTitle,
            uniqClass: this.baseClass
        }), '#' + this.config.panelContainerID);

        this.configure();

        this.interactable();

        this.showLoading();
        // 初始化Widget
        this.initInnerWidget(this.innerWidgetPath, this.innerWidgetMain);

        this.focus(true);
    }

    configure() {
        this.loadingObj = this.domObj.find('.loading');
    }

    initContainer() {
        this.panelContainerWidget = $('#' + this.config.panelContainerID);
        if (this.panelContainerWidget.length > 0) {

        } else {
            this.panelContainerWidget = $('<div id="' + this.config.panelContainerID + '"></div>');
            $(this.AppX.appConfig.mainContainer).append(this.panelContainerWidget);
        }

        this.mainContainerObj = $(this.AppX.appConfig.mainContainer);
    }

    initInnerWidget(widgetPath, widgetMain) {
        require({}, [Functions.concatUrl(widgetPath, widgetMain)], function (Widget) {
            this.widgetObj = new Widget({
                widgetPath: widgetPath,
                panelSelector: '.' + this.baseClass + ' .panel-content',
                readyCallback: this.onInnerWidgetReady.bind(this),
                afterDestroyCallback: this.destroy.bind(this)
            });
        }.bind(this));
    }

    onInnerWidgetReady() {
        this.isInnerWidgetLoaded = true;
        this.hideLoading();

        this.domObj.find('.panel-content').show();

        setTimeout(this.rebuildHeight.bind(this), 1000);

        this.ready();
    }

    showLoading() {
        setTimeout(() => {
            if (!this.isInnerWidgetLoaded) {
                this.loadingObj.show();
            }
        }, this.config.loadingDelay);
    }

    hideLoading() {
        this.loadingObj.remove();
    }

    // 重新计算面板高度并标准化
    rebuildHeight() {
        var domObjHeight = this.domObj.height(),
            domObjWidth = this.domObj.width(),
            mainContainerHeight = this.mainContainerObj.height();
        // 超过固定高度后将其拉回初始高度 
        if (domObjHeight > mainContainerHeight - this.panelHeightDelta) {
            // 面板高度小于临界值时停止改变其高度
            if (mainContainerHeight - this.panelHeightDelta > this.resizeMinHight) {
                this.domObj.height(mainContainerHeight);
            }
        }
    }

    interactable() {
        var that = this;
        var windowObj = $(window);

        this.domObj.on('mousedown', '.panel-heading', function () {
            // 判断是否过高
            this.rebuildHeight();
        }.bind(this));

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
            if (that.domObj.hasClass('folded') === true) {
                that.domObj.removeClass('folded');
                that.domObj.find('.fold span').removeClass('glyphicon-chevron-up').addClass('glyphicon-chevron-down');
            } else {
                that.domObj.addClass("folded");
                that.domObj.find('.fold span').removeClass('glyphicon-chevron-down').addClass('glyphicon-chevron-up');
            }
            this.rebuildHeight();
        }.bind(this));

        windowObj.on('resize.panel', function () {
            var domObjHeight = this.domObj.height(),
                domObjWidth = this.domObj.width(),
                mainContainerHeight = this.mainContainerObj.height();
            // 超过固定高度后将其拉回初始高度 
            if (domObjHeight > mainContainerHeight - this.panelHeightDelta) {
                // 面板高度小于临界值时停止改变其高度
                if (mainContainerHeight - this.panelHeightDelta > this.resizeMinHight) {
                    that.domObj.height(mainContainerHeight );
                }
            }
            // 如果面板移出界面,将其拉回
            if (that.domObj.offset().left + domObjWidth > windowObj.width()) {
                that.domObj.css({
                    // top: this.top + "px",
                    left: windowObj.width() - domObjWidth  + "px"
                });
            }
        }.bind(this));

        // 关闭按钮事件
        this.domObj.find('.close').on('click', function () {
            if (this.widgetObj) {
                this.widgetObj.destroy.bind(this.widgetObj)();
            } else {
                this.destroy();
            }
        }.bind(this));

        // 点击置顶事件
        this.domObj.on('click', this.focus.bind(this));

        // 可改变高度
        var dragging = false,
            docObj = $(document),
            tempTop = null;
        this.domObj.on('mousedown', '.panel-resize-y', function (e) {
            dragging = true;

            docObj.on('mousemove.panel', function (e) {
                if (dragging) {
                    tempTop = this.domObj.offset().top;
                    // 控制面板最小高度
                    if (tempTop + this.resizeMinHight < e.pageY) {
                        // TODO: 限制面板最大高度
                        if (e.pageY - tempTop < this.mainContainerObj.height() - this.resizeMinHight) {
                            this.domObj.height(e.pageY - tempTop);
                        }
                    }
                }
            }.bind(this));

            docObj.on('mouseup.panel', function (e) {
                dragging = false;
                docObj.off('mousemove.panel').off('mouseup.panel');
            }.bind(this));
        }.bind(this));

        // 区块可折叠
        this.domObj.on('click', 'fieldset>legend', function (e) {
            var target = $(e.currentTarget).next('.foldable');
            if (target.css('display') === "none") {
                target.show(250);
            } else {
                target.hide(250);
            }
            this.rebuildHeight();
        }.bind(this));

    }

    // 移除特殊事件绑定
    removeEvents() {
        $(window).off('resize.panel');
    }

    focus(autoFocus?: boolean) {
        var len = this.panelContainerWidget.children().length;
        if (len > 1) {
            this.panelContainerWidget.addClass('focus');
            if (autoFocus === undefined || autoFocus !== true) {
                if (this.domObj.index() < len - 1) {
                    this.panelContainerWidget.append(this.domObj);
                }
            }
        } else {
            this.panelContainerWidget.removeClass('focus');
        }
    }

    destroy() {
        super.destroy();

        this.removeEvents();
        this.domObj.remove();
        this.widgetObj = null;

        this.focus(true);

        this.afterDestroy();
    }
}