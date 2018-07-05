import BaseWidget = require('core/BaseWidget.class');
import Functions = require('core/Functions.module');


export = RightPanel;

class RightPanel extends BaseWidget {
    baseClass = "widgets-rightpanel";
    panels: Array<any> = new Array();
    fullpanels: Array<any> = new Array();
    halfpanels: Array<any> = new Array();
    panelTitle: string;
    panelUniqClassName: string;
    innerWidgetPath: string;
    innerWidgetMain: string;
    mainContainer: JQuery;
    debug = false;
    toast: any;
    widgetObj: any;

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


    // 此函数在系统初始化完成后会自动调用
    //  所有业务逻辑从此函数开始
    startup() {
        // 异步获取 config
        // 可以在此做权限控制
        // (function (that) {
        //     $.ajax("//test.com", function (data) {
        //         that.start.apply(that,data);
        //     });
        // })(this);

        this.start();
    }

    start(config?) {
        this.addToDom({
            root: this.widgetPath,
            media: {
                foldImageURL: this.widgetPath + '/images/fold.png',
                closeImageURL: this.widgetPath + '/images/close.png',
            },
            menuListData: this.config.menuListData || this.AppX.appConfig.menuBarWidgets
        });

        this.toast = this.AppX.runtimeConfig.toast;
        this.mainContainer = $(this.AppX.appConfig.mainContainer);

        // 初始化事件监听
        this.initDomListen();
        this.ready();
    }


    initDomListen() {
        this.domObj.find(".accordion").accordion({
            collapsible: true,
            active: false,
            heightStyle: "content",
            animate: 150,
            icons: {
                header: "glyphicon glyphicon-chevron-left",
                activeHeader: "glyphicon glyphicon-chevron-down"
            }
        });

        this.domObj.on('click', '.fire-on', (e) => {
            this.itemOnClick(e);
        });

        this.domObj.on('click', '.widgets-rightpanel-footer-foldable-icon',
            (e) => {
                this.foldable(e);
            });

        this.domObj.find('.widgets-rightpanel-footer-foldable-icon').on('click', function () {
            if (this.widgetObj) {
                this.widgetObj.destroy.bind(this.widgetObj)();
            } else {
                this.destroy();
            }
        }.bind(this));

    }

    // 可折叠
    foldable(e) {
        var currentTarget = $(e.currentTarget);
        var isFold = currentTarget.data('isfold');
        if (isFold === true) {
            // 切换为展开
            this.domObj.removeClass('widgets-rightpanel-sidebar-small');

            this.mainContainer.css({
                width: 'calc(100% - 250px)',
                left: '250px'
            });
        } else {
            // 切换为折叠
            this.domObj.addClass('widgets-rightpanel-sidebar-small');

            this.mainContainer.css({
                width: 'calc(100% - 50px)',
                left: '50px'
            });
        }

        currentTarget.data('isfold', !isFold);
    }

    itemOnClick(e?) {
        var target = $(e.currentTarget);
        var panel = this.panels[target.data('id')];
        var fullpanel = this.fullpanels[target.data('id')];
        var halfpanel = this.halfpanels[target.data('id')];
        if (panel) {
            //*存在fullpanel，则关闭 */
            for (var p in this.fullpanels) {
                if (this.fullpanels[p] != null) {
                    this.fullpanels[p].destroyWidget();
                }
            }
            this.toast.Show('模块[' + target.data('label') + ']正在使用当中!');
            if (panel.focus) {
                panel.focus();
            }


            // //存在fullpanel,則全部收縮
            // for (var p in this.fullpanels) {
            //     if (this.fullpanels[p] != null) {
            //         if (this.fullpanels[p].isFold == true) {
            //             //已经收缩则不再收缩
            //             return;
            //         }
            //         this.fullpanels[p].Fold();
            //     }
            // }
            return;
        }
        if (fullpanel) {
            this.toast.Show('模块[' + target.data('label') + ']正在使用当中!');
            if (fullpanel.focus) {
                fullpanel.focus();
            }
            // //存在fullpanel,則全部收縮
            // for (var p in this.fullpanels) {
            //     if (this.fullpanels[p] != null) {
            //         if (this.fullpanels[p].isFold == true) {
            //             //已经收缩则不展开
            //             this.fullpanels[p].Fold();
            //             this.fullpanels[p].isFold = false;
            //         }
            //     }
            // }
            return;
        }

        if (halfpanel) {
            //*存在fullpanel，则关闭 */
            for (var p in this.fullpanels) {
                if (this.fullpanels[p] != null) {
                    this.fullpanels[p].destroyWidget();
                }
            }
            this.toast.Show('模块[' + target.data('label') + ']正在使用当中!');
            if (halfpanel.focus) {
                halfpanel.focus();
            }
            return;
        }

        this.loadWidget(target);
    }

    loadWidget(target) {






    }

    destroyWidget(widgetID) {
        this.panels[widgetID] = null;
        this.fullpanels[widgetID] = null;
        this.halfpanels[widgetID] = null;
        this.log('已销毁对象:ID = ' + widgetID);
    }

    addToDom(data) {
        var htmlString = _.template(this.template)(data);
        this.setHtml(htmlString, '.body');
    }

    destroy() {
        super.destroy();

        // this.removeEvents();
        this.domObj.remove();
        this.widgetObj = null;

        // this.focus(true);

        this.afterDestroy();
    }
}