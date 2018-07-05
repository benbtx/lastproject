import BaseWidget = require('core/BaseWidget.class');

import Functions = require('core/Functions.module');

export = FullPanel;

class FullPanel extends BaseWidget {

    baseClass: string = "widget-fullpanel";
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
    fulpanelheight = 0;
    titles = [];

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
        // this.setHtml(_.template(this.template)({

        //     title: this.panelTitle,
        //     uniqClass: this.baseClass
        // }), '#' + this.config.panelContainerID);

        this.setHtml(_.template(this.template.split('$$')[1])({

            title: this.panelTitle,
            uniqClass: this.baseClass
        }), '.widget-fullpanel-tit-ul');
        //每添加一個li,變量titles[].添加一次，刪除則titles刪除一次。保持最新狀態
        //獲取長度，適當改變文字顯示個數
        this.titles.push(this.panelTitle);
        if (this.titles.length > 9) {

        }



        this.setHtml(_.template(this.template.split('$$')[2])({

            uniqClass: this.baseClass
        }), '.widget-fullpanel-con');


        this.configure();

        this.interactable();

        this.showLoading();
        // 初始化Widget
        this.initInnerWidget(this.innerWidgetPath, this.innerWidgetMain);

        // this.focus(true);
        // //默认展开
        // this.Unfold();
        // this.isFold = false;

    }

    configure() {
        this.loadingObj = this.domObj.find('.loading');
    }

    initContainer() {
        this.panelContainerWidget = $('#' + this.config.panelContainerID);
        if (this.panelContainerWidget.length > 0) {

        } else {
            this.template.split('$$')[0];
            this.panelContainerWidget = $('<div id="' + this.config.panelContainerID + '">' + this.template.split('$$')[0] + '</div>');
            $(this.AppX.appConfig.mainContainer).append(this.panelContainerWidget);
        }

        this.mainContainerObj = $(this.AppX.appConfig.mainContainer);
    }

    initInnerWidget(widgetPath, widgetMain) {
        require({}, [Functions.concatUrl(widgetPath, widgetMain)], function (Widget) {
            this.widgetObj = new Widget({
                widgetPath: widgetPath,
                // panelSelector: '.' + this.baseClass + ' .panel-content',
                panelSelector: 'div.' + this.baseClass,
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
        // if (domObjHeight > mainContainerHeight - this.panelHeightDelta) {
        //     // 面板高度小于临界值时停止改变其高度
        //     if (mainContainerHeight - this.panelHeightDelta > this.resizeMinHight) {
        //         this.domObj.height(mainContainerHeight - this.panelHeightDelta);
        //     }
        // }
    }

    interactable() {
        var that = this;
        var windowObj = $(window);
        //tab选项卡
        var tits = $('.widget-fullpanel-tit-li');
        var cons = $('.widget-fullpanel-con-div');

        // alert(tits.length);
        if (tits.length != cons.length) {
            return;
        }
        //添加索引
        for (var i = 0; i < tits.length; i++) {
            tits[i].id = i.toString();
            tits[i].onclick = function () {

                //alert(this.id);
                for (var j = 0; j < tits.length; j++) {
                    $(tits[j]).removeClass('select');
                    $(cons[j]).removeClass('select');
                    cons[j].style.display = 'none';
                }
                $(this).addClass('select');
                $(cons[this.id]).addClass('select');
                cons[this.id].style.display = 'block';
            }
            //新增一个tab,去除前面的选状态
            if (i < tits.length - 1) {
                $(tits[i]).removeClass('select');
                $(cons[i]).removeClass('select');
                cons[i].style.display = 'none';
            }
        }


        $(this.domObj[0]).find('.glyphicon').on('click', (e) => {
            //阻止事件传播
            // if (e.target==this[0]) {
            // }
            e.stopPropagation();
            //如果还存在fullpanel,则选中最后一个，否则删除整个模板
            var id = this.domObj[0].id;
            if (this.widgetObj) {
                this.widgetObj.destroy.bind(this.widgetObj)();
            }
            else {
                this.destroy();
            }
            //  //获取当前li数量，防止删除是li减少造成错误,
            //重新定义onclick事件
            this.reBindOnclickEvent();


            //重新计算id
            var lis = $('.widget-fullpanel-tit-li');
            var mods = $('.widget-fullpanel-con-div');
            if (lis.length > 0) {
                lis.each((i, value) => { value.id = i.toString() });
                for (var j = 0; j < lis.length; j++) {
                    $(lis[j]).removeClass('select');
                    $(mods[j]).removeClass('select');
                    mods[j].style.display = 'none';
                }
                if (parseInt(id) > 0) {
                    $(lis[parseInt(id) - 1]).addClass('select');
                    $(mods[parseInt(id) - 1]).addClass('select');
                    $(mods[parseInt(id) - 1]).css({ display: 'block' });
                } else {
                    $(lis[0]).addClass('select');
                    $(mods[0]).addClass('select');
                    $(mods[0]).css({ display: 'block' });
                }

            } else {
                $('#' + this.config.panelContainerID).remove();
            }

        });

        // 关闭面板
        $('.fullpanel_close').off().on('click', function (e) {

            //清空面板和数据
            // $(e.currentTarget.parentNode.parentNode.parentNode.parentNode).remove();
            // this.AppX.runtimeConfig.SideMenu.fullpanels = [];

            for (var p in this.AppX.runtimeConfig.SideMenu.fullpanels) {
                if (this.AppX.runtimeConfig.SideMenu.fullpanels[p] != null) {
                    this.AppX.runtimeConfig.SideMenu.fullpanels[p].destroyWidget();
                }
            }

        }.bind(this));

        // // 折叠面板 
        // $('.widget-fullpanel-fold-panel').off().click(() => {
        //     if (this.isFold == true) return;
        //     this.Fold();
        // });

        // // 展开面板
        // $('.widget-fullpanel-unfold-panel').off().click(() => {
        //     if (this.isFold == false) return;
        //     this.Unfold();
        // });

        // 可折叠
        $('.fullpanel_fold').off().click((e) => {
            if ($(e.currentTarget).find(' span').hasClass('glyphicon-chevron-down') === true) {
                if (this.isFold == true) return;
                this.Fold();
                // this.isFold = true;

                $(e.currentTarget).find('span').removeClass('glyphicon-chevron-down').addClass('glyphicon-chevron-up');
                $(".widget-fullpanel-con").css({ "display": "none" });
            } else {
                if (this.isFold == false) return;
                this.Unfold();
                // this.isFold = false;

                $(e.currentTarget).find('span').removeClass('glyphicon-chevron-up').addClass('glyphicon-chevron-down');
                $(".widget-fullpanel-con").css({ "display": "block" });
            }
        });




        //窗口改变
        windowObj.off().on('resize.widget-fullpanel', function () {
            var fullpanel = $('.widget-fullpanel');
            this.fulpanelheight = fullpanel.height();
            var maincontainer = $('#mainContainer');
            this.fulpanelheight = maincontainer.height();
            if (this.isFold) {
                fullpanel.css({
                    height: 50,
                    top: this.fulpanelheight - 50
                });
            } else {
                fullpanel.css({
                    height: this.fulpanelheight,
                    top: "0px"

                });

            }

        }.bind(this));


        // 面板高度可调整
        // this.domObj.draggable({
        //     handle: ".resize-bar",
        //     axis: "y",
        //     opacity: 0.35,
        //     containment: [0, 60, 0, $(window).height() - 79],
        //     // stop: () => {
        //     //     this.refitTableHeight();
        //     // }
        // });



    }

    // 移除特殊事件绑定
    removeEvents() {
        $(window).off('resize.fullpanel');
    }
    reBindOnclickEvent() {

        //tab选项卡
        var tits = $('.widget-fullpanel-tit-li');
        var cons = $('.widget-fullpanel-con-div');

        // alert(tits.length);
        if (tits.length != cons.length) {
            return;
        }
        //添加索引
        for (var i = 0; i < tits.length; i++) {
            tits[i].id = i.toString();
            tits[i].onclick = function () {

                //alert(this.id);
                for (var j = 0; j < tits.length; j++) {
                    $(tits[j]).removeClass('select');
                    $(cons[j]).removeClass('select');
                    cons[j].style.display = 'none';
                }
                $(this).addClass('select');
                $(cons[this.id]).addClass('select');
                cons[this.id].style.display = 'block';
            }
            //新增一个tab,去除前面的选状态
            if (i < tits.length - 1) {
                $(tits[i]).removeClass('select');
                $(cons[i]).removeClass('select');
                cons[i].style.display = 'none';
            }
        }

    }

    focus(autoFocus?: boolean) {
        //重新選擇
        var tits = $('.widget-fullpanel-tit-li');
        var cons = $('.widget-fullpanel-con-div');
        var id = this.domObj[0].id;
        for (var j = 0; j < tits.length; j++) {

            if (j == parseInt(id)) {
                $(tits[j]).addClass('select');
                $(cons[j]).addClass('select');
                cons[j].style.display = 'block';

            } else {
                $(tits[j]).removeClass('select');
                $(cons[j]).removeClass('select');
                cons[j].style.display = 'none';

            }

        }


        // $(this).addClass('select');
        // $(cons[this.id]).addClass('select');
        // cons[this.id].style.display = 'block';

        // var len = this.panelContainerWidget.children().length;
        // if (len > 1) {
        //     this.panelContainerWidget.addClass('focus');
        //     if (autoFocus === undefined || autoFocus !== true) {
        //         if (this.domObj.index() < len - 1) {
        //             this.panelContainerWidget.append(this.domObj);
        //         }
        //     }
        // } else {
        //     this.panelContainerWidget.removeClass('focus');
        // }
    }
    // 关闭面板
    public Close() {
        this.domObj.hide();
    }

    // 折叠面板
    fold() {
        this.Fold();
    }
    public Fold() {
        var fullpanel = $('.widget-fullpanel');
        var top = fullpanel.height() - 50;
        this.fulpanelheight = fullpanel.height();
        // fullpanel.css({ top: top + "px", height: '50px' });
        fullpanel.css({ top: top + "px" });

        this.isFold = true;

    }

    // 最大化面板
    unfold() {
        this.Unfold();
    }
    public Unfold() {
        var fullpanel = $('.widget-fullpanel');
        fullpanel.css({ top: "0", height: this.fulpanelheight });
        this.isFold = false;
    }


    destroy() {
        super.destroy();
        this.titles.forEach(element => {
            if (element == $(this.domObj[0]).find(".li_tit").data("text")) {
                this.titles.splice(element, 1);
            }

        });


        this.removeEvents();
        this.domObj.remove();
        this.widgetObj = null;


        this.focus(true);

        this.afterDestroy();
    }

    /*关闭fullpanel并清除资源（pensiveant）*/
    destroyWidget() {
        if (this.widgetObj) {
            this.widgetObj.destroy.bind(this.widgetObj)();
        }
        else {
            this.destroy();
        }
        this.panelContainerWidget.remove();
    }



}