import BaseWidget = require('core/BaseWidget.class');

import Functions = require('core/Functions.module');

export = HalfPanel;

class HalfPanel extends BaseWidget {

    baseClass: string = "widget-halfpanel";
    panelTitle: string;
    panelUniqClassName: string;
    innerWidgetPath: string;
    innerWidgetMain: string;
    widgetObj: any;
    panelContainerWidget: JQuery;
    mainContainerObj: JQuery;
    /** 状态变量 */
    isInnerWidgetLoaded = false;
    isFold = false;//是否折叠，默认不折叠
    /*** 配置型量 ***/
    // panelHeightDelta: number = 78; // 37
    // resizeMinHight: number = 80; // 39
    bottom: number = 0; //15
    left: number = 0;

    /** dom 元素 */
    loadingObj: JQuery;

    constructor(settings, panelOpinions: {
        panelTitle: string,
        panelUniqClassName: string,
        innerWidgetPath: string,
        innerWidgetMain?: string
    }) {
        super(settings);

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
        // height: this.mainContainerObj.height(),
        this.setHtml(_.template(this.template)({

            title: this.panelTitle,
            uniqClass: this.baseClass
        }), '#' + this.config.panelContainerID);
        //设置高度
        // this.domObj.height($('#mainContainer').height() * 0.44);


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
                panelSelector: '.' + this.baseClass + ' .halfpanel-content',
                readyCallback: this.onInnerWidgetReady.bind(this),
                afterDestroyCallback: this.destroy.bind(this)
            });
        }.bind(this));
    }

    onInnerWidgetReady() {
        this.isInnerWidgetLoaded = true;
        this.hideLoading();
        this.domObj.find('.halfpanel-content').show();
        // setTimeout(this.rebuildHeight.bind(this), 1000);
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



    interactable() {
        var that = this;
        var windowObj = $(window);

        // 关闭面板
        this.domObj.find('.closehalfpanel').on("click", function () {
            if (this.widgetObj) {
                this.widgetObj.destroy.bind(this.widgetObj)();
            } else {
                this.destroy();
            }
        }.bind(this));

        // 关闭面板
        this.domObj.find('.fullhalfpanel').on("click", function (event) {
            var fullhalfpanelObj = this.domObj.find('.fullhalfpanel')
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




        // 展开面板
        // this.domObj.on('click', '.unfold-panel', () => {
        //     this.Unfold();
        // });
        // 点击置顶事件
        this.domObj.on('click', this.focus.bind(this));
        // 折叠面板 
        this.domObj.on('click', '.downhalfpanel', () => {
            this.Fold();
        });


        // 面板高度可调整
        this.domObj.draggable({
            handle: ".resize-bar",
            axis: "y",
            opacity: 0.35,
            containment: [0, 64, 0, $(window).height() - 35],
            stop: () => {
                this.refitTableHeight();
            }
        });


        //窗口改变
        windowObj.on('resize.halfpanel', function () {
            // this.domObj.height($('#mainContainer').height() * 0.44);
            this.refitTableHeight();
        }.bind(this));







    }

    // 移除特殊事件绑定
    removeEvents() {
        $(window).off('resize.halfpanel');
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
    // 关闭面板
    public Close() {
        this.domObj.hide();
    }


    // 重新调整表格高度
    refitTableHeight() {
        // var widgetHeaderHeight = this.headerHeight + this.headbar.height() +
        //     this.tableBodyHeighDelta;
        this.domObj.find('.halfpanel-content').height(this.domObj.height() - 64 + 'px');
        // this.domObj.find('.halfpanelcontent').height(this.domObj.height() - 140 + 'px');
        this.domObj.find('.halfpaneltable').height(this.domObj.height() - 145 + 'px');//当工具栏两行时，减去145；一行时减去115

        if (this.domObj.find('.halfpanel-content').height() <= 50) {
            this.domObj.find('.halfpanel-content').css({ "display": "none" });
            //    $(".issumbitToyhk").css({ "display": "inline-block" });
        } else {
            this.domObj.find('.halfpanel-content').css({ "display": "block" });
        }

    }

    public Fold() {
        var top = this.domObj.parent().parent().height() - 60 + 'px';
        this.domObj.css({ top: top + "px!important" });

        // this.refitTableHeight();


        // this.domObj.height(40);

    }

    destroyWidget() {
        if (this.widgetObj) {
            this.widgetObj.destroy.bind(this.widgetObj)();
        }
        else {
            this.destroy();
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